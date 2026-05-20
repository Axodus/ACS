import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { routeAcsRequest } from "./routes/acs-routes.js";

export function createAcsHttpHandler() {
  return (request: IncomingMessage, response: ServerResponse): void => {
    if (request.method !== "GET") {
      writeJson(response, 405, {
        success: false,
        timestamp: new Date().toISOString(),
        version: "0.1.0",
        data: null,
        blockedReason: "method not allowed",
        warnings: ["ACS HTTP inspection API is read-only and only supports GET"],
      });
      return;
    }

    const result = routeAcsRequest(request.url ?? "/");
    writeJson(response, result.status, result.body);
  };
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

