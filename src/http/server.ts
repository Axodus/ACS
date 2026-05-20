import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { parseMockAuthContext } from "./auth.js";
import { parseMockRateLimitContext } from "./rate-limit.js";
import { fail } from "./responses.js";
import { routeAcsRequest } from "./routes/acs-routes.js";

export function createAcsHttpHandler() {
  return (request: IncomingMessage, response: ServerResponse): void => {
    if (request.method !== "GET") {
      const correlationId = readCorrelationId(request);
      writeJson(response, 405, fail(
        "method not allowed",
        405,
        "method_not_allowed",
        correlationId,
        { allowedMethods: ["GET"] },
      ).body);
      return;
    }

    const correlationId = readCorrelationId(request);
    const auth = parseMockAuthContext(readHeaders(request));
    const rateLimit = parseMockRateLimitContext(readHeaders(request));
    const result = routeAcsRequest(request.url ?? "/", {
      ...(correlationId ? { correlationId } : {}),
      auth,
      rateLimit,
    });
    writeJson(response, result.status, result.body);
  };
}

function readHeaders(request: IncomingMessage): Readonly<Record<string, string | undefined>> {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    headers[key] = Array.isArray(value) ? value[0] : value;
  }

  return headers;
}

export function createAcsHttpServer() {
  return createServer(createAcsHttpHandler());
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
