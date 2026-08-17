import assert from "node:assert/strict";
import test from "node:test";
import { ProductApiClient } from "../dist/control-plane/product-api-client.js";

const HISTORICAL_BLOCKER_TEXT = [
  "in-memory or filesystem secret storage",
  "process-local structures",
  "HTTP auth is disabled or mock-only",
  "external exporters as disabled",
  "worker implementation is local-only",
  "current governance policy only allows sandbox deployments",
];

function productionClient() {
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
  const recovery = { health: () => ({ healthy: true, lastScanAt: Date.now() }) };
  const engine = { identity: { id: "remote", provider: "http" }, health: async () => ({ status: "ready" }) };
  const targetService = {
    refresh: async () => ({ failures: [] }),
    list: () => [{ status: "ready", stale: false }],
  };
  const secretStore = {
    descriptor: { provider: "vault-kv-v2", productionOriented: true },
    health: async () => ({ reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true }),
  };
  const identityValidator = {
    descriptor: { mode: "oidc", provider: "oidc_jwt_jwks", productionOriented: true },
    health: async () => ({ configured: true, reachable: true, detail: "ok" }),
  };
  const edgePolicy = {
    readiness: async () => ({ rateLimiter: { configured: true, reachable: true, productionGrade: true }, cors: { configured: true, explicitProductionAllowlist: true } }),
  };
  const telemetry = { descriptor: { adapter: "otlp-http-json", external: true, productionGrade: true } };
  const economicService = { settlementProviderDescriptor: { productionOriented: true } };
  return new ProductApiClient({
    runtimeCoordinator,
    runtimeRecoveryCoordinator: recovery,
    engineService: { listEngines: () => [engine] },
    targetService,
    secretStore,
    identityValidator,
    edgePolicy,
    telemetry,
    economicService,
    readinessSignals: { liveDeploymentEnabled: true },
  });
}

test("AEES-RP dashboard does not project historical A01 blockers for certified topology", async () => {
  const client = productionClient();
  const dashboard = await client.getDashboardSummary();
  const serialized = JSON.stringify(dashboard);

  for (const text of HISTORICAL_BLOCKER_TEXT) {
    assert.equal(serialized.includes(text), false, text);
  }

  assert.equal(dashboard.readiness.blockerCount, 0);
  assert.equal(dashboard.readiness.state, "partial");
  assert.ok(dashboard.warnings.some((warning) => warning.code === "GLOBAL_MULTI_HOST_NOT_CERTIFIED"));
});

test("AEES-RP preserves real dependency blockers", async () => {
  const client = new ProductApiClient({
    readinessSignals: {
      authMode: "disabled",
      secretBackend: "memory",
      persistenceBackend: "memory",
      settlementBackend: "memory",
      observabilityExporterEnabled: false,
      remoteWorkerSupported: false,
      liveDeploymentEnabled: false,
    },
  });
  const dashboard = await client.getDashboardSummary();

  assert.ok(dashboard.readiness.blockerCount > 0);
  assert.ok(dashboard.blockers.some((finding) => finding.message.includes("HTTP auth is disabled or mock-only")));
});
