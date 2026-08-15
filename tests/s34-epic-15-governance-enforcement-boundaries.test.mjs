import assert from "node:assert/strict";
import test from "node:test";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { routeProductApiRequest } from "../dist/http/routes/product-api-routes.js";

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() {
      return {
        identity: this.identity,
        status: "ready",
        supportedProtocols: ["acs-protocol"],
        operations: ["health"],
      };
    },
    async listExecutionTargets() {
      return [];
    },
    async close() {},
  };
}

function jsonBodyRequest(payload, method = "POST") {
  const serialized = JSON.stringify(payload);
  return {
    method,
    url: "",
    headers: { "content-type": "application/json" },
    on(event, cb) {
      if (event === "data") cb(serialized);
      if (event === "end") cb();
    },
  };
}

async function post(context, path, payload, correlationId) {
  return routeProductApiRequest(
    jsonBodyRequest(payload),
    path,
    context,
    { correlationId },
  );
}

function agentDefinition(agentId, overrides = {}) {
  return {
    agentId,
    name: "Agent " + agentId,
    status: "draft",
    capabilityIds: [],
    skillIds: [],
    toolIds: [],
    credentialConnectionIds: [],
    runnerPreferences: [],
    ...overrides,
  };
}

test("agent creation is denied by governance before side effects when policy denies agent.create", async () => {
  const context = createControlPlaneContext({
    tenantId: "tenant-c02-deny",
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const tenantId = "tenant-c02-deny";
    context.tenantGovernanceService.replacePolicy({
      tenantId,
      authority: { kind: "platform_admin", principalId: "system" },
      policyId: "policy-c02-deny",
      defaultEffect: "deny",
      rules: [
        { ruleId: "allow-configure", action: "agent.configure", effect: "allow", priority: 10 },
      ],
      at: 100,
      actor: "system",
      reason: "deny agent creation for regression",
      provenance: "test",
    });

    const beforeCount = context.agentService.list().length;
    const result = await post(context, "/api/v1/agents", { definition: agentDefinition("agent-c02-denied") }, "c02_agent_deny");

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error.code, "policy_rejected");
    assert.equal(result.body.error.reason, "blocked_by_governance");
    assert.equal(result.body.error.details.enforcement.deniedLayer, "governance");
    assert.equal(context.agentService.list().length, beforeCount);
    assert.equal(
      context.agentService.list().some((agent) => agent.agentId === "agent-c02-denied"),
      false,
    );
  } finally {
    await context.close();
  }
});

test("deployment creation is denied before dispatch when deployment.create is denied", async () => {
  const context = createControlPlaneContext({
    tenantId: "tenant-c02-deploy",
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const tenantId = "tenant-c02-deploy";
    context.tenantGovernanceService.replacePolicy({
      tenantId,
      authority: { kind: "platform_admin", principalId: "system" },
      policyId: "policy-c02-deploy-deny",
      defaultEffect: "deny",
      rules: [
        { ruleId: "allow-create", action: "agent.create", effect: "allow", priority: 10 },
        { ruleId: "allow-configure", action: "agent.configure", effect: "allow", priority: 10 },
      ],
      at: 100,
      actor: "system",
      reason: "deny deployment creation for regression",
      provenance: "test",
    });

    const beforeCount = context.deploymentService.listDeployments().length;
    const result = await post(
      context,
      "/api/v1/agents/dev-agent-sandbox/deploy",
      { mode: "sandbox", revision: 1, targetId: "local" },
      "c02_deploy_deny",
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error.code, "policy_rejected");
    assert.equal(result.body.error.details.enforcement.deniedLayer, "governance");
    assert.equal(context.deploymentService.listDeployments().length, beforeCount);
  } finally {
    await context.close();
  }
});

test("limit enforcement blocks agent creation when max_agents is exhausted", async () => {
  const context = createControlPlaneContext({
    tenantId: "tenant-c02-limit",
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const tenantId = "tenant-c02-limit";
    context.tenantGovernanceService.setLimit({
      tenantId,
      authority: { kind: "platform_admin", principalId: "system" },
      limitKey: "max_agents",
      value: 0,
      at: 100,
      actor: "system",
      reason: "cap agent count",
      provenance: "test",
    });

    const beforeCount = context.agentService.list().length;
    const result = await post(context, "/api/v1/agents", { definition: agentDefinition("agent-c02-limit") }, "c02_agent_limit");

    assert.equal(result.status, 429);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error.code, "limit_exceeded");
    assert.equal(result.body.error.reason, "blocked_by_limit");
    assert.equal(result.body.error.details.enforcement.deniedLayer, "limit");
    assert.equal(context.agentService.list().length, beforeCount);
    assert.equal(
      context.agentService.list().some((agent) => agent.agentId === "agent-c02-limit"),
      false,
    );
  } finally {
    await context.close();
  }
});

test("tenant-scoped enforcement decisions do not leak across tenants", async () => {
  const tenantA = createControlPlaneContext({
    tenantId: "tenant-c02-a",
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  const tenantB = createControlPlaneContext({
    tenantId: "tenant-c02-b",
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    tenantA.tenantGovernanceService.replacePolicy({
      tenantId: "tenant-c02-a",
      authority: { kind: "platform_admin", principalId: "system" },
      policyId: "policy-c02-a",
      defaultEffect: "deny",
      rules: [],
      at: 100,
      actor: "system",
      reason: "tenant A deny",
      provenance: "test",
    });

    tenantB.tenantGovernanceService.replacePolicy({
      tenantId: "tenant-c02-b",
      authority: { kind: "platform_admin", principalId: "system" },
      policyId: "policy-c02-b",
      defaultEffect: "allow",
      rules: [
        { ruleId: "allow-create", action: "agent.create", effect: "allow", priority: 10 },
      ],
      at: 100,
      actor: "system",
      reason: "tenant B allow",
      provenance: "test",
    });

    const denied = await post(tenantA, "/api/v1/agents", { definition: agentDefinition("agent-c02-a") }, "c02_tenant_a");
    const allowed = await post(tenantB, "/api/v1/agents", { definition: agentDefinition("agent-c02-b") }, "c02_tenant_b");

    assert.equal(denied.status, 403);
    assert.equal(denied.body.error.details.enforcement.deniedLayer, "governance");
    assert.equal(allowed.status, 201);
    assert.equal(allowed.body.success, true);
    assert.equal(
      tenantA.agentService.list().some((agent) => agent.agentId === "agent-c02-b"),
      false,
    );
    assert.equal(
      tenantB.agentService.list().some((agent) => agent.agentId === "agent-c02-b"),
      true,
    );
  } finally {
    await tenantA.close();
    await tenantB.close();
  }
});
