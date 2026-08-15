import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createAnonymousAuthContext, HttpAuthenticationError } from "./auth.js";
import { parseMockRateLimitContext } from "./rate-limit.js";
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
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": SUPPORTED_HTTP_METHODS.join(", ") + ", OPTIONS",
        "access-control-allow-headers": "content-type, x-correlation-id, x-request-id, authorization",
      });
      response.end();
      return;
    }

    if (!request.method || !SUPPORTED_HTTP_METHODS.includes(request.method as typeof SUPPORTED_HTTP_METHODS[number])) {
      const correlationId = readCorrelationId(request);
      writeJson(response, 405, fail(
        "method not allowed",
        405,
        "method_not_allowed",
        correlationId,
        { allowedMethods: [...SUPPORTED_HTTP_METHODS] },
      ).body, { allow: SUPPORTED_HTTP_METHODS.join(", ") });
      return;
    }

    const correlationId = readCorrelationId(request);
    const headers = readHeaders(request);
    const rateLimit = parseMockRateLimitContext(headers);
    const requestUrl = request.url ?? "/";

    try {
      const publicRoute = isPublicRoute(requestUrl);
      const hasCredential = Boolean(headers.authorization)
        || (context.identityValidator.descriptor.mode === "development" && Boolean(headers["x-acs-actor-id"]));
      const auth = publicRoute && !hasCredential
        ? createAnonymousAuthContext(context.identityValidator.descriptor.mode)
        : await context.identityValidator.authenticate(headers);
      if (requestUrl.startsWith("/api/v1")) {
        const result = await routeProductApiRequest(request, requestUrl, context, {
          ...(correlationId ? { correlationId } : {}),
          auth,
          rateLimit,
          method: request.method,
        });
        writeJson(response, result.status, result.body);
      } else {
        const result = routeAcsRequest(requestUrl, {
          ...(correlationId ? { correlationId } : {}),
          auth,
          rateLimit,
          method: request.method,
        });
        writeJson(response, result.status, result.body);
      }
    } catch (error) {
      if (error instanceof HttpAuthenticationError) {
        const result = fail(
          error.message,
          401,
          "authentication_failed",
          correlationId,
          { category: error.code },
          undefined,
          error.code,
          { retryable: error.code === "identity_provider_unavailable", severity: "warning" },
        );
        writeJson(response, result.status, result.body, { "www-authenticate": "Bearer" });
        return;
      }
      writeJson(response, 500, fail(
        error instanceof Error ? error.message : "unexpected server error",
        500,
        "internal_error",
        correlationId,
        undefined,
      ).body);
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
  });
  const server = createServer(createAcsHttpHandler(context));

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

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Readonly<Record<string, string>> = {},
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function readCorrelationId(request: IncomingMessage): string | undefined {
  const value = request.headers["x-correlation-id"] ?? request.headers["x-request-id"];
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
