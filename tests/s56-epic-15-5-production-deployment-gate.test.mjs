import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  FixedWindowRateLimiter,
  HttpProductionTargetEngine,
  OtlpHttpTelemetryExporter,
  OperationalTelemetryProvider,
  ProductionReadinessBlockedError,
  SignedWorkerIdentityValidator,
  SqliteDeploymentRepository,
  SqliteRateLimitStore,
  createProductionTargetServer,
} = await import(`${distRoot}/index.js`);
const { createControlPlaneContext } = await import(`${distRoot}/http/control-plane-context.js`);

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.equal(typeof address, "object");
  return `http://127.0.0.1:${address.port}`;
}

async function startOtlpReceiver() {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    requests.push({ path: request.url, body: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") });
    response.writeHead(200, { "content-type": "application/json" });
    response.end("{}");
  });
  const endpoint = await listen(server);
  return { endpoint, requests, close: () => new Promise((resolve) => server.close(resolve)) };
}

const identityValidator = {
  descriptor: { mode: "oidc", provider: "test-oidc", productionOriented: true, issuer: "https://identity.test", audience: "acs" },
  async authenticate() {
    return {
      mode: "oidc", actorType: "system", actorId: "platform-operator", scopes: [], authenticated: true,
      trusted: true, platformAdmin: true, warnings: [],
      principal: { principalId: "platform-operator", issuer: "https://identity.test", subject: "platform-operator", authenticationMethod: "oidc_bearer" },
    };
  },
  async health() { return { configured: true, reachable: true, detail: "test production identity" }; },
};

const vaultTransport = {
  async request(input) {
    if (input.path === "/v1/sys/health") return { status: 200, body: {} };
    return { status: 404, body: {} };
  },
};

function governanceEvidence(context, allowed) {
  const decision = context.tenantGovernanceService.evaluateGovernedAction({
    tenantId: "tenant-dev",
    action: "deployment.production",
    at: Date.now(),
    actor: "platform-operator",
  });
  return {
    allowed: allowed && decision.decision === "allow",
    action: "deployment.production",
    decision: decision.decision,
    basis: decision.basis,
    ...(decision.policyId ? { policyId: decision.policyId } : {}),
    ...(decision.matchedRuleId ? { matchedRuleId: decision.matchedRuleId } : {}),
    revision: decision.revision,
  };
}

function registerProductionWorker(context, at = Date.now()) {
  const capabilities = {
    engineId: "acs-production-target",
    supportedRunners: ["opencode"],
    supportedProviders: ["axodus-managed"],
    supportedIsolationModes: ["tenant-scoped"],
    supportedDeploymentModes: ["live"],
    supportedTargetIds: ["production-single-host"],
    maxConcurrentRuns: 1,
  };
  context.runtimeCoordinator.registerWorker({
    workerId: "worker-production-1",
    instanceId: "worker-production-instance-1",
    servicePrincipalId: "service:worker-production-1",
    name: "Production-like worker",
    version: "1.0.0",
    capabilities,
    registeredAt: at,
  });
  context.runtimeCoordinator.heartbeat({
    workerId: "worker-production-1",
    instanceId: "worker-production-instance-1",
    servicePrincipalId: "service:worker-production-1",
    status: "available",
    capabilities,
    at: at + 1,
  });
}

async function createProductionContext(root, targetBaseUrl, token, telemetry) {
  const rateLimiter = new FixedWindowRateLimiter(new SqliteRateLimitStore({ filePath: join(root, "rate-limit.sqlite") }));
  const context = await createControlPlaneContext({
    adapterProfile: "production",
    engine: new HttpProductionTargetEngine({ baseUrl: targetBaseUrl, token }),
    runtimeMode: "remote",
    runtimeStatePath: join(root, "runtime.sqlite"),
    administrativeStatePath: join(root, "administrative.json"),
    agentStatePath: join(root, "agents.sqlite"),
    deploymentStatePath: join(root, "deployments.sqlite"),
    secretProvider: "vault",
    secretCatalogPath: join(root, "secrets.sqlite"),
    vaultTransport,
    vaultAddress: "http://vault.test",
    vaultToken: "test-vault-token-not-exported",
    economicStatePath: join(root, "economic.sqlite"),
    identityValidator,
    rateLimiter,
    allowedOrigins: ["https://control-plane.test"],
    workerIdentityValidator: new SignedWorkerIdentityValidator({
      issuer: "https://workers.test",
      audience: "acs-runtime",
      signingKey: "production-worker-signing-key-with-at-least-thirty-two-bytes",
    }),
    telemetry,
    startLocalWorker: false,
  });
  telemetry.log({ component: "acceptance", event: "production.telemetry.probe", message: "External exporter probe." });
  await telemetry.flush();
  return context;
}

test("G01 durable Agent and deployment state survive restart with revision-safe lifecycle evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-g01-durable-"));
  const storePath = join(root, "deployments.sqlite");
  try {
    const first = new SqliteDeploymentRepository({ filePath: storePath });
    const created = first.create({
      deploymentId: "deployment-g01",
      agentId: "agent-g01",
      revision: 3,
      recordRevision: 1,
      targetId: "production-single-host",
      deploymentMode: "live",
      status: "validating",
      createdAt: 10,
      updatedAt: 10,
      evidence: {
        agentFingerprint: "agent-fingerprint",
        compositionFingerprint: "composition-fingerprint",
        executionPlanId: "plan-g01",
        credentialReferenceIds: ["credential-reference-only"],
      },
    });
    first.close();
    const second = new SqliteDeploymentRepository({ filePath: storePath });
    const reloaded = second.get(created.deploymentId);
    assert.equal(reloaded.recordRevision, 1);
    assert.equal(reloaded.evidence.executionPlanId, "plan-g01");
    assert.equal(JSON.stringify(reloaded).includes("secret plaintext"), false);
    const active = second.save({ ...reloaded, status: "active", recordRevision: 2, updatedAt: 11 }, 1);
    assert.equal(active.status, "active");
    assert.throws(() => second.save({ ...active, status: "degraded", recordRevision: 3 }, 1), /revision conflict/);
    second.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("G02/G03 aggregate gate denies blanket production, permits explicit governed readiness, verifies health and rolls back", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-g02-g03-"));
  const token = "production-target-test-token";
  const target = createProductionTargetServer({
    token,
    databasePath: join(root, "target.sqlite"),
    allowTestControl: true,
  });
  const targetBaseUrl = await listen(target.server);
  const receiver = await startOtlpReceiver();
  const telemetry = new OperationalTelemetryProvider({
    exporter: new OtlpHttpTelemetryExporter({ endpoint: receiver.endpoint, serviceName: "acs-g-test" }),
    serviceName: "acs-g-test",
    exportIntervalMs: 60_000,
  });
  const context = await createProductionContext(root, targetBaseUrl, token, telemetry);
  try {
    registerProductionWorker(context);
    const agent = context.agentService.get("dev-agent-sandbox");
    const deniedGovernance = governanceEvidence(context, false);
    const denied = await context.deploymentService.evaluateProductionReadiness({
      agentId: agent.agentId,
      revision: agent.revision,
      targetId: "production-single-host",
      governance: deniedGovernance,
    });
    assert.equal(denied.allowed, false);
    assert.ok(denied.blockers.some((entry) => entry.code === "TENANT_POLICY_ALLOWS_PRODUCTION"));
    assert.equal(context.deploymentService.listDeployments().length, 0);

    const current = context.tenantGovernanceService.readGovernanceState("tenant-dev", { kind: "platform_admin", principalId: "platform-operator" });
    context.tenantGovernanceService.replacePolicy({
      tenantId: "tenant-dev",
      authority: { kind: "platform_admin", principalId: "platform-operator" },
      policyId: current.policy.policyId,
      defaultEffect: current.policy.defaultEffect,
      rules: [...current.policy.rules, {
        ruleId: "allow_production_deployment",
        action: "deployment.production",
        effect: "allow",
        priority: 200,
        reason: "G02 explicit certified-topology production allow",
      }],
      actor: "platform-operator",
      reason: "G02 acceptance",
      at: Date.now(),
    });
    const allowedGovernance = governanceEvidence(context, true);
    const allowed = await context.deploymentService.evaluateProductionReadiness({
      agentId: agent.agentId,
      revision: agent.revision,
      targetId: "production-single-host",
      governance: allowedGovernance,
    });
    assert.equal(allowed.allowed, true, JSON.stringify(allowed, null, 2));
    assert.equal(allowed.level, "PRODUCTION_LIKE_SINGLE_HOST");
    assert.equal(allowed.blockers.length, 0);

    const composition = context.agentService.compose(agent.agentId).composition;
    const first = await context.deploymentService.deploy({
      agentId: agent.agentId,
      revision: agent.revision,
      composition: composition.effective,
      deploymentMode: "live",
      targetId: "production-single-host",
      productionGovernance: allowedGovernance,
      actor: "platform-operator",
      correlationId: "g03-deploy-a",
      scope: context.isolation.scope,
    });
    assert.equal(first.status, "active");
    assert.equal(first.health, "ready");
    assert.equal(first.evidence.productionReadiness.allowed, true);

    const secondRevision = context.agentService.update(agent.agentId, {
      definition: { ...agent.definition, name: "DEV Sandbox Agent revision B" },
      expectedRevision: agent.revision,
      updatedAt: Date.now(),
      updatedBy: "platform-operator",
    });
    const secondComposition = context.agentService.compose(agent.agentId).composition;
    const secondGovernance = governanceEvidence(context, true);
    const second = await context.deploymentService.deploy({
      agentId: secondRevision.agentId,
      revision: secondRevision.revision,
      composition: secondComposition.effective,
      deploymentMode: "live",
      targetId: "production-single-host",
      productionGovernance: secondGovernance,
      actor: "platform-operator",
      correlationId: "g03-deploy-b",
      scope: context.isolation.scope,
    });
    assert.equal(second.status, "active");
    assert.equal(second.predecessorDeploymentId, first.deploymentId);

    const degradedResponse = await fetch(`${targetBaseUrl}/test/deployments/${second.deploymentId}/health`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ health: "degraded", reasonCode: "TARGET_HEALTH_CHECK_FAILED" }),
    });
    assert.equal(degradedResponse.status, 200);
    const degraded = await context.deploymentService.inspectDeployment(second.deploymentId);
    assert.equal(degraded.status, "degraded");
    assert.equal(degraded.reasonCode, "TARGET_HEALTH_CHECK_FAILED");

    const rolledBack = await context.deploymentService.rollback({
      deploymentId: second.deploymentId,
      expectedRecordRevision: degraded.recordRevision,
      productionGovernance: governanceEvidence(context, true),
      actor: "platform-operator",
      correlationId: "g03-rollback",
    });
    assert.equal(rolledBack.status, "rolled_back");
    const repeated = await context.deploymentService.rollback({
      deploymentId: second.deploymentId,
      expectedRecordRevision: rolledBack.recordRevision,
      productionGovernance: governanceEvidence(context, true),
    });
    assert.equal(repeated.recordRevision, rolledBack.recordRevision);
    assert.equal(context.deploymentService.getDeployment(first.deploymentId).status, "active");

    await telemetry.flush();
    const auditTypes = context.auditService.listEvents().map((event) => event.eventType);
    assert.ok(auditTypes.includes("deployment.production_readiness_evaluated"));
    assert.ok(auditTypes.includes("deployment.completed"));
    assert.ok(auditTypes.includes("deployment.rolled_back"));
    assert.ok(receiver.requests.length > 0);
    const serialized = JSON.stringify({ deployments: context.deploymentService.listDeployments(), telemetry: receiver.requests });
    assert.equal(serialized.includes("test-vault-token-not-exported"), false);
  } finally {
    await context.close();
    await receiver.close();
    await target.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("production deploy does not return false success when aggregate readiness is blocked", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-g02-denial-"));
  const token = "production-target-denial-token";
  const target = createProductionTargetServer({ token, databasePath: join(root, "target.sqlite") });
  const targetBaseUrl = await listen(target.server);
  const receiver = await startOtlpReceiver();
  const telemetry = new OperationalTelemetryProvider({
    exporter: new OtlpHttpTelemetryExporter({ endpoint: receiver.endpoint, serviceName: "acs-g-denial" }),
    serviceName: "acs-g-denial",
  });
  const context = await createProductionContext(root, targetBaseUrl, token, telemetry);
  try {
    const agent = context.agentService.get("dev-agent-sandbox");
    await assert.rejects(() => context.deploymentService.deploy({
      agentId: agent.agentId,
      revision: agent.revision,
      composition: context.agentService.compose(agent.agentId).composition.effective,
      deploymentMode: "live",
      targetId: "production-single-host",
      productionGovernance: governanceEvidence(context, false),
    }), (error) => !(error instanceof ProductionReadinessBlockedError) && /explicit deployment\.production/.test(error.message));
    assert.equal(context.deploymentService.listDeployments().length, 0);
  } finally {
    await context.close();
    await receiver.close();
    await target.close();
    await rm(root, { recursive: true, force: true });
  }
});
