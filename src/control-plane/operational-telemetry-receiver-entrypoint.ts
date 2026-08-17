import { createServer } from "node:http";
import { createServer as createSecureServer } from "node:https";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface TelemetryReceiverSnapshot {
  readonly receivedAt: number;
  readonly logs: readonly unknown[];
  readonly metrics: readonly unknown[];
  readonly traces: readonly unknown[];
  readonly requests: readonly { readonly path: string; readonly receivedAt: number; readonly bytes: number }[];
}

export async function runOperationalTelemetryReceiverFromEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const host = environment.ACS_TELEMETRY_RECEIVER_HOST ?? "127.0.0.1";
  const port = optionalPort(environment.ACS_TELEMETRY_RECEIVER_PORT);
  const capacity = optionalPositiveInteger(environment.ACS_TELEMETRY_RECEIVER_CAPACITY) ?? 2_048;
  const certificatePath = environment.ACS_TELEMETRY_RECEIVER_TLS_CERT_PATH;
  const keyPath = environment.ACS_TELEMETRY_RECEIVER_TLS_KEY_PATH;
  const authenticationToken = environment.ACS_TELEMETRY_RECEIVER_AUTH_TOKEN;
  if (Boolean(certificatePath) !== Boolean(keyPath)) throw new Error("telemetry receiver TLS certificate and key must be configured together");
  const state = {
    logs: [] as unknown[],
    metrics: [] as unknown[],
    traces: [] as unknown[],
    requests: [] as { path: string; receivedAt: number; bytes: number }[],
  };
  const handler: import("node:http").RequestListener = async (request, response) => {
    const url = new URL(request.url ?? "/", certificatePath ? "https://localhost" : "http://localhost");
    if (request.method === "GET" && url.pathname === "/health") {
      return writeJson(response, 200, { status: "ready", processId: process.pid, transport: certificatePath ? "https" : "http" });
    }
    if (authenticationToken && request.headers.authorization !== `Bearer ${authenticationToken}`) {
      return writeJson(response, 401, { error: { code: "unauthorized", message: "receiver credential is required" } });
    }
    if (request.method === "GET" && url.pathname === "/snapshot") {
      const snapshot: TelemetryReceiverSnapshot = {
        receivedAt: Date.now(),
        logs: structuredClone(state.logs),
        metrics: structuredClone(state.metrics),
        traces: structuredClone(state.traces),
        requests: structuredClone(state.requests),
      };
      return writeJson(response, 200, snapshot);
    }
    const destination = url.pathname === "/v1/logs" ? state.logs
      : url.pathname === "/v1/metrics" ? state.metrics
        : url.pathname === "/v1/traces" ? state.traces
          : undefined;
    if (request.method === "POST" && destination) {
      try {
        const body = await readJson(request, 4 * 1024 * 1024);
        boundedPush(destination, body, capacity);
        boundedPush(state.requests, { path: url.pathname, receivedAt: Date.now(), bytes: Number(request.headers["content-length"] ?? 0) }, capacity);
        response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        response.end("{}\n");
      } catch {
        writeJson(response, 400, { error: { code: "invalid_otlp_payload", message: "request body must be bounded JSON" } });
      }
      return;
    }
    writeJson(response, 404, { error: { code: "not_found", message: "receiver route not found" } });
  };
  const server = certificatePath && keyPath
    ? createSecureServer({ cert: readFileSync(certificatePath), key: readFileSync(keyPath) }, handler)
    : createServer(handler);
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("telemetry receiver did not bind a TCP address");
  return {
    server,
    host,
    port: address.port,
    transport: certificatePath ? "https" as const : "http" as const,
    snapshot: (): TelemetryReceiverSnapshot => ({
      receivedAt: Date.now(),
      logs: structuredClone(state.logs),
      metrics: structuredClone(state.metrics),
      traces: structuredClone(state.traces),
      requests: structuredClone(state.requests),
    }),
    close: () => new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose())),
  };
}

async function main(): Promise<void> {
  const receiver = await runOperationalTelemetryReceiverFromEnvironment();
  process.stdout.write(JSON.stringify({
    success: true,
    service: "acs-operational-telemetry-receiver",
    host: receiver.host,
    port: receiver.port,
    transport: receiver.transport,
    processId: process.pid,
  }) + "\n");
  const stop = async () => { await receiver.close(); process.exit(0); };
  process.once("SIGINT", () => { void stop(); });
  process.once("SIGTERM", () => { void stop(); });
}

function writeJson(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage, limit: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) throw new Error("payload too large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function boundedPush<T>(target: T[], value: T, capacity: number): void {
  if (target.length >= capacity) target.shift();
  target.push(value);
}

function optionalPort(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 65_535) throw new Error("receiver port is invalid");
  return parsed;
}

function optionalPositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("receiver capacity must be a positive integer");
  return parsed;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  void main().catch((error) => {
    process.stderr.write(JSON.stringify({ success: false, service: "acs-operational-telemetry-receiver", error: error instanceof Error ? error.message : String(error) }) + "\n");
    process.exitCode = 1;
  });
}
