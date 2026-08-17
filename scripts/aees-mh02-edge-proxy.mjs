import { request as httpRequest } from "node:http";
import { createServer } from "node:https";
import { readFileSync } from "node:fs";

const host = process.env.ACS_MH02_EDGE_HOST ?? "127.0.0.1";
const port = Number(process.env.ACS_MH02_EDGE_PORT ?? 0);
const upstreams = JSON.parse(process.env.ACS_MH02_EDGE_UPSTREAMS ?? "[]").map((value) => new URL(value));
const certificatePath = process.env.ACS_MH02_TLS_CERT_PATH ?? "";
const keyPath = process.env.ACS_MH02_TLS_KEY_PATH ?? "";
const probeToken = process.env.ACS_MH02_EDGE_PROBE_TOKEN ?? "";
const attestationToken = process.env.ACS_MH02_EDGE_ATTESTATION_TOKEN ?? "";
const upstreamLocalAddress = process.env.ACS_MH02_EDGE_UPSTREAM_LOCAL_ADDRESS ?? "127.0.0.2";
if (!certificatePath || !keyPath || !probeToken || !attestationToken || upstreams.length < 2 || !Number.isSafeInteger(port) || port <= 0) {
  throw new Error("trusted edge acceptance configuration is incomplete");
}
let cursor = 0;

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("edge request too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function forward(request, response, body, upstream, allowRetry) {
  const headers = { ...request.headers };
  delete headers["x-forwarded-for"];
  delete headers["x-real-ip"];
  delete headers["x-forwarded-proto"];
  delete headers["x-acs-edge-attestation"];
  headers.host = upstream.host;
  headers["x-forwarded-for"] = request.socket.remoteAddress ?? "unknown";
  headers["x-real-ip"] = request.socket.remoteAddress ?? "unknown";
  headers["x-forwarded-proto"] = "https";
  headers["x-acs-edge-attestation"] = attestationToken;
  headers["content-length"] = String(body.length);
  const proxy = httpRequest({
    hostname: upstream.hostname,
    port: Number(upstream.port),
    method: request.method,
    path: request.url,
    headers,
    localAddress: upstreamLocalAddress,
    timeout: 12_000,
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  proxy.once("timeout", () => proxy.destroy(new Error("upstream timeout")));
  proxy.once("error", () => {
    if (allowRetry && !response.headersSent) {
      const alternate = upstreams.find((candidate) => candidate.href !== upstream.href);
      if (alternate) return forward(request, response, body, alternate, false);
    }
    if (!response.headersSent) response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { code: "edge_upstream_unavailable" } }));
  });
  proxy.end(body);
}

const server = createServer({ cert: readFileSync(certificatePath), key: readFileSync(keyPath) }, async (request, response) => {
  if (request.method === "GET" && request.url === "/edge/health") {
    if (request.headers.authorization !== `Bearer ${probeToken}`) {
      response.writeHead(401, { "content-type": "application/json" });
      return response.end(JSON.stringify({ error: { code: "unauthorized" } }));
    }
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return response.end(JSON.stringify({ status: "ready", transport: "https", upstreams: upstreams.length, pid: process.pid }));
  }
  try {
    const body = await readBody(request);
    const upstream = upstreams[cursor++ % upstreams.length];
    forward(request, response, body, upstream, true);
  } catch {
    response.writeHead(413, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { code: "request_too_large" } }));
  }
});
server.headersTimeout = 10_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;
await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(port, host, resolveListen); });
process.stdout.write(JSON.stringify({ ready: true, service: "trusted-edge-proxy", pid: process.pid, host, port, upstreams: upstreams.length, upstreamLocalAddress }) + "\n");
async function shutdown() { await new Promise((resolveClose) => server.close(resolveClose)); process.exit(0); }
process.once("SIGTERM", () => { void shutdown(); });
process.once("SIGINT", () => { void shutdown(); });
