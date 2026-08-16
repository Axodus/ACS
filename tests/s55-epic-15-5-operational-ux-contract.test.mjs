import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const distRoot = resolve(process.env.ACS_TEST_DIST_ROOT ?? "dist");
const { createAcsHttpServer } = await import(new URL("index.js", pathToFileURL(`${distRoot}/`)).href);

function createEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() { return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] }; },
    async version() { return { identity: this.identity, sourceRevision: "f01", supportedProtocols: ["acs-engine/1"] }; },
    async capabilities() { return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: [], engineCapabilities: [], deploymentModes: ["sandbox"] }; },
    async listExecutionTargets() { return [await this.inspectExecutionTarget("local-wsl")]; },
    async inspectExecutionTarget(targetId) { return { id: targetId, type: "local-wsl", environment: "sandbox", engineId: "openclaw", status: "ready", health: { status: "ready", observedAt: Date.now(), checks: [], findings: [] }, capabilities: [], deploymentModes: ["sandbox"], schedulingEligible: true, schedulingReasons: [], supportedRunners: ["opencode"], supportedProviders: ["axodus-managed"], isolationModes: ["sandbox"] }; },
    async close() {},
  };
}

async function call(baseUrl, path, { method = "GET", body } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: { "content-type": "application/json", "x-acs-actor-id": "system", "x-acs-actor-type": "system" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

test("F01/F02 exposes write-only credential lifecycle and durable job cancellation to the operational UX", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-f-operational-contract-"));
  const secretValue = "f02-secret-value-that-must-never-return";
  const rotatedValue = "f02-rotated-value-that-must-never-return";
  const { server, context } = await createAcsHttpServer({
    engine: createEngine(),
    startLocalWorker: false,
    runtimeMode: "remote",
    runtimeStatePath: join(root, "runtime.sqlite"),
    runtimeRoot: root,
    stateRoot: join(root, "state"),
    configRoot: join(root, "config"),
    artifactsRoot: join(root, "artifacts"),
    workspaceRoot: join(root, "workspace"),
    administrativeStatePath: join(root, "admin.json"),
    secretCatalogPath: join(root, "secrets.sqlite"),
    economicStatePath: join(root, "economic.sqlite"),
    rateLimitDatabasePath: join(root, "rate-limit.sqlite"),
  });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    assert.equal(typeof address, "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const created = await call(baseUrl, "/api/v1/credentials", {
      method: "POST",
      body: { credentialId: "cred-f02", providerId: "openai", type: "api-key", purpose: "model:inference", scopes: ["model:inference"], secretValue },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.credentialId, "cred-f02");
    assert.equal(created.body.data.secret.status, "active");
    assert.equal(JSON.stringify(created.body).includes(secretValue), false);

    const listed = await call(baseUrl, "/api/v1/credentials");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data.some((entry) => entry.credentialId === "cred-f02"), true);
    assert.equal(JSON.stringify(listed.body).includes(secretValue), false);

    const rotated = await call(baseUrl, "/api/v1/credentials/cred-f02/rotate", { method: "PUT", body: { secretValue: rotatedValue } });
    assert.equal(rotated.status, 200);
    assert.equal(rotated.body.data.secret.version, "2");
    assert.equal(JSON.stringify(rotated.body).includes(rotatedValue), false);

    const revoked = await call(baseUrl, "/api/v1/credentials/cred-f02/revoke", { method: "POST" });
    assert.equal(revoked.status, 200);
    assert.equal(revoked.body.data.status, "revoked");
    const secretAudit = context.auditService.queryEvents({ tenantId: "tenant-dev" }).filter((event) => event.eventType.startsWith("secret."));
    assert.deepEqual(secretAudit.map((event) => event.eventType), ["secret.created", "secret.rotated", "secret.revoked"]);
    assert.equal(JSON.stringify(secretAudit).includes(secretValue), false);
    assert.equal(JSON.stringify(secretAudit).includes(rotatedValue), false);

    const agentId = "agent-f01-missing-model";
    const agent = await call(baseUrl, "/api/v1/agents", {
      method: "POST",
      body: {
        definition: {
          agentId,
          name: "F01 missing model strategy",
          status: "draft",
          capabilityIds: [],
          skillIds: [],
          toolIds: [],
          credentialConnectionIds: [],
          runnerPreferences: [],
        },
      },
    });
    assert.equal(agent.status, 201, JSON.stringify(agent.body));
    const readiness = await call(baseUrl, `/api/v1/agents/${agentId}/readiness`);
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.data.ready, false);
    assert.equal(readiness.body.data.status, "blocked");
    assert.equal(readiness.body.data.blockers.some((finding) => finding.code === "AGENT_MODEL_STRATEGY_REQUIRED"), true);
    const deploymentPlan = await call(baseUrl, `/api/v1/agents/${agentId}/deployment-plan`);
    assert.equal(deploymentPlan.status, 200);
    assert.equal(deploymentPlan.body.data.eligible, false);
    assert.equal(deploymentPlan.body.data.blockers.some((finding) => finding.code === "AGENT_MODEL_STRATEGY_REQUIRED"), true);

    const administration = await call(baseUrl, "/api/v1/system/administration");
    assert.equal(administration.status, 200);
    assert.equal(administration.body.data.status, "available");
    assert.equal(administration.body.data.scope, "tenant_administration");
    assert.equal(administration.body.data.route, "/admin/tenants");

    const job = context.runtimeCoordinator.createRuntimeStartJob({ tenantId: "tenant-dev", runtimeInstanceId: "runtime-f02", deploymentId: "deployment-f02", targetId: "local-wsl", correlationId: "corr-f02" });
    const cancelled = await call(baseUrl, `/api/v1/runtime/jobs/${job.jobId}/cancel`, { method: "POST" });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, "cancelled");
    const detail = await call(baseUrl, `/api/v1/runtime/jobs/${job.jobId}`);
    assert.equal(detail.body.data.status, "cancelled");

    const foreign = context.runtimeCoordinator.createRuntimeStartJob({ tenantId: "tenant-b", runtimeInstanceId: "runtime-b", deploymentId: "deployment-b", targetId: "local-wsl", correlationId: "corr-b" });
    const hidden = await call(baseUrl, `/api/v1/runtime/jobs/${foreign.jobId}/cancel`, { method: "POST" });
    assert.equal(hidden.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await context.close();
    await rm(root, { recursive: true, force: true });
  }
});
