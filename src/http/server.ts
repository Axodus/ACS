import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { parseMockAuthContext } from "./auth.js";
import { parseMockRateLimitContext } from "./rate-limit.js";
import { fail } from "./responses.js";
import { routeAcsRequest } from "./routes/acs-routes.js";
import { routeProductApiRequest } from "./routes/product-api-routes.js";
import { createControlPlaneContext, type ControlPlaneContext } from "./control-plane-context.js";

export function createAcsHttpHandler(context: ControlPlaneContext) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type, x-correlation-id, x-request-id, authorization",
      });
      response.end();
      return;
    }

    if (request.method !== "GET" && request.method !== "POST") {
      const correlationId = readCorrelationId(request);
      writeJson(response, 405, fail(
        "method not allowed",
        405,
        "method_not_allowed",
        correlationId,
        { allowedMethods: ["GET", "POST"] },
      ).body);
      return;
    }

    const correlationId = readCorrelationId(request);
    const auth = parseMockAuthContext(readHeaders(request));
    const rateLimit = parseMockRateLimitContext(readHeaders(request));
    const requestUrl = request.url ?? "/";

    try {
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

function readHeaders(request: IncomingMessage): Readonly<Record<string, string | undefined>> {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    headers[key] = Array.isArray(value) ? value[0] : value;
  }

  return headers;
}

export async function createAcsHttpServer() {
  const context = createControlPlaneContext();
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

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
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
