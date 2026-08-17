import { request as httpRequest } from "node:http";
import { createServer } from "node:https";
import { readFileSync } from "node:fs";

const host = process.env.ACS_MH02_PROXY_HOST ?? "127.0.0.1";
const port = Number(process.env.ACS_MH02_PROXY_PORT ?? 0);
const upstream = new URL(process.env.ACS_MH02_PROXY_UPSTREAM ?? "");
const certificatePath = process.env.ACS_MH02_TLS_CERT_PATH ?? "";
const keyPath = process.env.ACS_MH02_TLS_KEY_PATH ?? "";
if (!certificatePath || !keyPath || upstream.protocol !== "http:" || !Number.isSafeInteger(port) || port <= 0) {
  throw new Error("TLS provider proxy configuration is incomplete");
}

const server = createServer({ cert: readFileSync(certificatePath), key: readFileSync(keyPath) }, (request, response) => {
  const upstreamRequest = httpRequest({
    hostname: upstream.hostname,
    port: Number(upstream.port),
    method: request.method,
    path: request.url,
    headers: { ...request.headers, host: upstream.host },
    timeout: 5_000,
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstreamRequest.once("timeout", () => upstreamRequest.destroy(new Error("upstream timeout")));
  upstreamRequest.once("error", () => {
    if (!response.headersSent) response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { code: "provider_unavailable" } }));
  });
  request.pipe(upstreamRequest);
});

await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(port, host, resolveListen); });
process.stdout.write(JSON.stringify({ ready: true, service: "tls-provider-proxy", pid: process.pid, host, port, upstreamClass: "external-process" }) + "\n");
async function shutdown() { await new Promise((resolveClose) => server.close(resolveClose)); process.exit(0); }
process.once("SIGTERM", () => { void shutdown(); });
process.once("SIGINT", () => { void shutdown(); });
