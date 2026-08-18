import { createServer } from "node:http";

const [cliDistRoot, cliPort, cliHost, cliBrowserOrigin] = process.argv.slice(2);
const distRoot = cliDistRoot ?? process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const { ProductApiClient } = await import(`${distRoot}/control-plane/product-api-client.js`);

const port = Number(cliPort ?? process.env.ACS_RP_PORT ?? 0);
if (!Number.isSafeInteger(port) || port <= 0) throw new Error("ACS_RP_PORT is required");

const runtimeCoordinator = {
  descriptor: {
    adapter: "postgres-runtime-state",
    productionOriented: true,
    durability: "single_node_durable",
    multiInstance: "shared_database",
    multiHost: "not_proven",
  },
  listWorkers: () => [{ status: "available", expiresAt: Date.now() + 60_000 }],
  health: () => ({ reachable: true }),
};
const client = new ProductApiClient({
  runtimeCoordinator,
  runtimeRecoveryCoordinator: { health: () => ({ healthy: true, lastScanAt: Date.now() }) },
  engineService: { listEngines: () => [{ identity: { id: "remote-runtime", provider: "http" }, health: async () => ({ status: "ready" }) }] },
  targetService: { refresh: async () => ({ failures: [] }), list: () => [{ status: "ready", stale: false }] },
  secretStore: {
    descriptor: { provider: "vault-kv-v2", productionOriented: true, materialStorage: "external_managed", metadataDurability: "shared_durable", multiInstance: "external_provider_managed" },
    health: async () => ({ reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true }),
  },
  identityValidator: {
    descriptor: { mode: "oidc", provider: "oidc-jwks", productionOriented: true },
    health: async () => ({ configured: true, reachable: true, detail: "external OIDC ready" }),
  },
  edgePolicy: {
    readiness: async () => ({ rateLimiter: { configured: true, reachable: true, productionGrade: true }, cors: { configured: true, explicitProductionAllowlist: true } }),
  },
  telemetry: { descriptor: { adapter: "otlp-http-json", external: true, productionGrade: true } },
  economicService: { settlementProviderDescriptor: { productionOriented: true } },
  readinessSignals: { liveDeploymentEnabled: true },
});

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/v1/dashboard") {
    const data = await client.getDashboardSummary();
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders() });
    response.end(JSON.stringify({ success: true, data }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json; charset=utf-8", ...corsHeaders() });
  response.end(JSON.stringify({ success: false, error: { code: "not_found" } }));
});

function corsHeaders() {
  return {
    "access-control-allow-origin": cliBrowserOrigin ?? process.env.ACS_RP_BROWSER_ORIGIN ?? "http://127.0.0.1",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-correlation-id",
  };
}

const host = cliHost ?? process.env.ACS_RP_HOST ?? "127.0.0.1";
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, host, resolve);
});
process.stdout.write(JSON.stringify({ ready: true, port, host, pid: process.pid }) + "\n");

async function shutdown() {
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}
process.once("SIGTERM", () => { void shutdown(); });
process.once("SIGINT", () => { void shutdown(); });
