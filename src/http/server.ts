import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createAnonymousAuthContext, HttpAuthenticationError } from "./auth.js";
import { createAcsRateLimitContext, rateLimitDecisionContext, type RateLimitDecision } from "./rate-limit.js";
import { declaredBodyExceedsLimit, PayloadTooLargeError } from "./request-body.js";
import { fail } from "./responses.js";
import { routeAcsRequest } from "./routes/acs-routes.js";
import { routeProductApiRequest } from "./routes/product-api-routes.js";
import {
  createControlPlaneContext,
  type ControlPlaneContext,
  type ControlPlaneContextOptions,
} from "./control-plane-context.js";

const SUPPORTED_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export function createAcsHttpHandler(context: ControlPlaneContext) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const correlationId = readCorrelationId(request);
    const requestUrl = request.url ?? "/";
    const cors = context.edgePolicy.cors(request);
    const edgeHeaders = context.edgePolicy.responseHeaders(cors.headers);

    if (!request.method || (request.method !== "OPTIONS" && !SUPPORTED_HTTP_METHODS.includes(request.method as typeof SUPPORTED_HTTP_METHODS[number]))) {
      writeJson(response, 405, fail(
        "method not allowed",
        405,
        "method_not_allowed",
        correlationId,
        { allowedMethods: [...SUPPORTED_HTTP_METHODS] },
      ).body, { ...edgeHeaders, allow: SUPPORTED_HTTP_METHODS.join(", ") });
      return;
    }

    if (declaredBodyExceedsLimit(request, context.edgePolicy.limits.maxBodyBytes)) {
      writePayloadTooLarge(response, correlationId, context.edgePolicy.limits.maxBodyBytes, edgeHeaders);
      return;
    }

    let networkDecision: RateLimitDecision | undefined;
    try {
      networkDecision = await context.edgePolicy.consumeNetwork(request, requestUrl);
    } catch (error) {
      if (!isPublicRoute(requestUrl)) {
        writeRateLimitBackendUnavailable(response, correlationId, edgeHeaders);
        return;
      }
    }
    if (networkDecision && !networkDecision.allowed) {
      writeRateLimitDenied(response, correlationId, networkDecision, edgeHeaders);
      return;
    }

    if (!cors.allowed) {
      const result = fail(
        "request origin is not allowed",
        403,
        "cors_origin_denied",
        correlationId,
        { reason: cors.reason },
        networkDecision ? { rateLimit: rateLimitDecisionContext(networkDecision) } : undefined,
        "edge_policy_denied",
        { retryable: false, severity: "warning" },
      );
      writeJson(response, result.status, result.body, { ...edgeHeaders, ...rateLimitHeaders(networkDecision) });
      return;
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204, { ...edgeHeaders, ...rateLimitHeaders(networkDecision) });
      response.end();
      return;
    }

    const headers = readHeaders(request);
    try {
      const publicRoute = isPublicRoute(requestUrl);
      const hasCredential = Boolean(headers.authorization)
        || (context.identityValidator.descriptor.mode === "development" && Boolean(headers["x-acs-actor-id"]));
      const auth = publicRoute && !hasCredential
        ? createAnonymousAuthContext(context.identityValidator.descriptor.mode)
        : await context.identityValidator.authenticate(headers);
      let authenticatedDecision: RateLimitDecision | undefined;
      try {
        authenticatedDecision = await context.edgePolicy.consumeAuthenticated(
          requestUrl,
          request.method,
          auth,
          context.isolation.scope.tenantId,
        );
      } catch (error) {
        writeRateLimitBackendUnavailable(response, correlationId, edgeHeaders);
        return;
      }
      if (authenticatedDecision && !authenticatedDecision.allowed) {
        writeRateLimitDenied(response, correlationId, authenticatedDecision, edgeHeaders);
        return;
      }
      const effectiveDecision = authenticatedDecision ?? networkDecision;
      const rateLimit = effectiveDecision
        ? rateLimitDecisionContext(effectiveDecision)
        : createAcsRateLimitContext();
      const responseHeaders = { ...edgeHeaders, ...rateLimitHeaders(effectiveDecision) };

      if (requestUrl.startsWith("/api/v1")) {
        const result = await routeProductApiRequest(request, requestUrl, context, {
          ...(correlationId ? { correlationId } : {}),
          auth,
          rateLimit,
          method: request.method,
        });
        writeJson(response, result.status, result.body, responseHeaders);
      } else {
        const result = routeAcsRequest(requestUrl, {
          ...(correlationId ? { correlationId } : {}),
          auth,
          rateLimit,
          method: request.method,
        });
        writeJson(response, result.status, result.body, responseHeaders);
      }
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        writePayloadTooLarge(response, correlationId, error.limit, edgeHeaders);
        return;
      }
      if (error instanceof HttpAuthenticationError) {
        const result = fail(
          error.message,
          401,
          "authentication_failed",
          correlationId,
          { category: error.code },
          networkDecision ? { rateLimit: rateLimitDecisionContext(networkDecision) } : undefined,
          error.code,
          { retryable: error.code === "identity_provider_unavailable", severity: "warning" },
        );
        writeJson(response, result.status, result.body, {
          ...edgeHeaders,
          ...rateLimitHeaders(networkDecision),
          "www-authenticate": "Bearer",
        });
        return;
      }
      writeJson(response, 500, fail(
        "unexpected server error",
        500,
        "internal_error",
        correlationId,
        undefined,
      ).body, edgeHeaders);
    }
  };
}

function isPublicRoute(requestUrl: string): boolean {
  const path = new URL(requestUrl, "http://localhost").pathname.replace(/\/+$/, "") || "/";
  return path === "/api/v1/health" || path === "/acs/health" || path === "/acs/version";
}

function readHeaders(request: IncomingMessage): Readonly<Record<string, string | undefined>> {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    headers[key] = Array.isArray(value) ? value[0] : value;
  }
  return headers;
}

export async function createAcsHttpServer(options: ControlPlaneContextOptions = {}) {
  const context = createControlPlaneContext({
    ...options,
    useDurableAdministrativeState: options.useDurableAdministrativeState ?? true,
    useDurableSecretCatalog: options.useDurableSecretCatalog ?? true,
    useDurableEconomicState: options.useDurableEconomicState ?? true,
    useDurableRateLimitStore: options.useDurableRateLimitStore ?? true,
  });
  const server = createServer(
    { maxHeaderSize: context.edgePolicy.limits.maxHeaderBytes },
    createAcsHttpHandler(context),
  );
  server.maxHeadersCount = context.edgePolicy.limits.maxHeadersCount;
  server.headersTimeout = context.edgePolicy.limits.headersTimeoutMs;
  server.requestTimeout = context.edgePolicy.limits.requestTimeoutMs;
  server.keepAliveTimeout = context.edgePolicy.limits.keepAliveTimeoutMs;
  server.maxRequestsPerSocket = context.edgePolicy.limits.maxRequestsPerSocket;

  process.on("SIGINT", async () => {
    await context.close();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await context.close();
    process.exit(0);
  });
  return { server, context };
}

function writeRateLimitDenied(
  response: ServerResponse,
  correlationId: string | undefined,
  decision: RateLimitDecision,
  edgeHeaders: Readonly<Record<string, string>>,
): void {
  const result = fail(
    "rate limit exceeded",
    429,
    "rate_limit_exceeded",
    correlationId,
    {
      limit: decision.limit,
      remaining: decision.remaining,
      resetAt: decision.resetAt,
      retryAfterSeconds: decision.retryAfterSeconds,
      scope: decision.keyScope,
      policy: decision.policy,
    },
    { rateLimit: rateLimitDecisionContext(decision) },
    "rate_limit_exceeded",
    { retryable: true, severity: "warning" },
  );
  writeJson(response, result.status, result.body, { ...edgeHeaders, ...rateLimitHeaders(decision) });
}

function writeRateLimitBackendUnavailable(
  response: ServerResponse,
  correlationId: string | undefined,
  edgeHeaders: Readonly<Record<string, string>>,
): void {
  const result = fail(
    "edge rate-limit backend is unavailable",
    503,
    "rate_limit_backend_unavailable",
    correlationId,
    undefined,
    undefined,
    "edge_dependency_unavailable",
    { retryable: true, severity: "error" },
  );
  writeJson(response, result.status, result.body, edgeHeaders);
}

function writePayloadTooLarge(
  response: ServerResponse,
  correlationId: string | undefined,
  limit: number,
  edgeHeaders: Readonly<Record<string, string>>,
): void {
  const result = fail(
    "request payload is too large",
    413,
    "payload_too_large",
    correlationId,
    { maxBodyBytes: limit },
    undefined,
    "edge_payload_limit",
    { retryable: false, severity: "warning" },
  );
  writeJson(response, result.status, result.body, edgeHeaders);
}

function rateLimitHeaders(decision: RateLimitDecision | undefined): Readonly<Record<string, string>> {
  if (!decision) return {};
  return {
    "ratelimit-limit": String(decision.limit),
    "ratelimit-remaining": String(decision.remaining),
    "ratelimit-reset": String(Math.ceil(new Date(decision.resetAt).getTime() / 1000)),
    ...(decision.retryAfterSeconds !== undefined ? { "retry-after": String(decision.retryAfterSeconds) } : {}),
  };
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Readonly<Record<string, string>> = {},
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function readCorrelationId(request: IncomingMessage): string | undefined {
  const value = request.headers["x-correlation-id"] ?? request.headers["x-request-id"];
  return Array.isArray(value) ? value[0] : value;
}
