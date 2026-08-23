import assert from "node:assert/strict";
import test from "node:test";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { routeProductApiRequest } from "../dist/http/routes/product-api-routes.js";

const auth = {
  actorId: "platform-admin",
  actorType: "system",
  authenticated: true,
  trusted: true,
  platformAdmin: true,
  scopes: ["platform.system"],
  principal: {
    principalId: "platform-admin",
    issuer: "acs",
    subject: "platform-admin",
    authenticationMethod: "development_headers",
  },
};

async function createContext() {
  return createControlPlaneContext({
    engine: {
      identity: { id: "openclaw", provider: "agentsai" },
      async health() {
        return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] };
      },
      async listExecutionTargets() {
        return [];
      },
      async close() {},
    },
    startLocalWorker: false,
    runtimeMode: "local",
    useDurableRuntimeState: false,
    useDurableAdministrativeState: false,
    useDurableSecretCatalog: false,
    useDurableEconomicState: false,
    useDurableDeploymentState: false,
    rateLimitProvider: "memory",
  });
}

async function invoke(url, options = {}) {
  const context = await createContext();
  try {
    return await routeProductApiRequest(
      { method: options.method ?? "GET", url, headers: {} },
      url,
      context,
      { auth: options.auth ?? auth, correlationId: "s53" },
    );
  } finally {
    await context.close();
  }
}

test("E02 separates liveness from dependency-aware readiness", async () => {
  const live = await invoke("/api/v1/health");
  assert.equal(live.status, 200);
  assert.equal(live.body.data.status, "LIVE");
  assert.equal(typeof live.body.data.checkedAt, "number");

  const ready = await invoke("/api/v1/ready");
  assert.equal(ready.status, 503);
  assert.equal(ready.body.data.status, "BLOCKED");
  assert.equal(ready.body.data.reasonCodes.includes("NO_ELIGIBLE_WORKERS"), true);
  assert.equal("dependencies" in ready.body.data, false);
});

test("E02 exposes operational status without implying execution readiness", async () => {
  const status = await invoke("/api/v1/system/operational-status?force=true");
  assert.equal(status.status, 200);
  assert.equal(status.body.data.overall, "BLOCKED");
  assert.equal(status.body.data.dependencies.some((entry) => entry.reasonCode === "NO_ELIGIBLE_WORKERS"), true);
  assert.equal(status.body.data.dependencies.some((entry) => entry.reasonCode === "TELEMETRY_EXPORTER_DEGRADED"), true);
  assert.equal(status.body.data.liveness.status, "LIVE");
});

test("E02 keeps telemetry read-only and does not leak secret material", async () => {
  const telemetry = await invoke("/api/v1/system/telemetry");
  assert.equal(telemetry.status, 200);
  assert.equal(telemetry.body.data.health.external, false);
  assert.equal(Array.isArray(telemetry.body.data.recentLogs), true);
  assert.equal(JSON.stringify(telemetry.body).includes("Bearer "), false);
  assert.equal(JSON.stringify(telemetry.body).includes("password"), false);
  assert.equal(JSON.stringify(telemetry.body).includes("secret-value"), false);
});

test("E02 rejects non-admin access to system diagnostics", async () => {
  const result = await invoke("/api/v1/system/operational-status", {
    auth: { ...auth, platformAdmin: false },
  });

  assert.equal(result.status, 403);
});
