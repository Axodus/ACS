import assert from "node:assert/strict";
import test from "node:test";
import {
  createAgentComposition,
  createAgentRevision,
  fingerprintAgentDefinition,
  validateAgentDefinition,
} from "../dist/control-plane/unified-agent-model.js";

function definition(overrides = {}) {
  return {
    agentId: "agent_mazikeen",
    name: "Mazikeen",
    status: "draft",
    roleId: "role.executor",
    roleRevision: 2,
    profileId: "profile.default",
    profileRevision: 3,
    capabilityIds: ["agent.inspect", "deployment.sandbox"],
    skillIds: ["skill.analysis"],
    toolIds: ["tool.registry"],
    modelStrategy: {
      primary: {
        providerId: "axodus",
        modelId: "managed-default",
        credentialConnectionId: "cred_axodus_managed",
      },
      fallbacks: [
        {
          providerId: "openai",
          modelId: "gpt-5",
          credentialConnectionId: "cred_openai",
        },
      ],
      runnerId: "opencode",
      requiredCapabilities: ["reasoning", "coding"],
    },
    credentialConnectionIds: ["cred_axodus_managed", "cred_openai"],
    runnerPreferences: ["opencode"],
    executionPolicyId: "policy.default",
    metadata: { displayGroup: "core" },
    ...overrides,
  };
}

test("agent revisions are explicit and fingerprinted deterministically", () => {
  const first = createAgentRevision({ definition: definition(), revision: 1, createdAt: 1 });
  const second = createAgentRevision({ definition: definition(), revision: 1, createdAt: 1 });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.definition.agentId, "agent_mazikeen");
  assert.equal(first.revision, 1);
});

test("agent definition validation rejects secret-like fields", () => {
  const findings = validateAgentDefinition(definition({
    metadata: { apiKey: "sk-secret" },
  }));
  assert.equal(findings[0].code, "AGENT_SECRET_FIELD_FORBIDDEN");
});

test("agent composition separates requested and effective state", () => {
  const revision = createAgentRevision({ definition: definition(), revision: 2, createdAt: 10 });
  const composition = createAgentComposition({
    revision,
    effective: {
      capabilityIds: ["agent.inspect", "deployment.sandbox", "runtime.inspect"],
      runnerPreferences: ["opencode", "codex"],
    },
  });
  assert.deepEqual(composition.requested.capabilityIds, ["agent.inspect", "deployment.sandbox"]);
  assert.deepEqual(composition.effective.capabilityIds, ["agent.inspect", "deployment.sandbox", "runtime.inspect"]);
  assert.equal(composition.materialization?.artifactType, "openclaw-compatible");
});

test("model strategy and credential references remain logical and secret-free", () => {
  const revision = createAgentRevision({ definition: definition(), revision: 3, createdAt: 1 });
  const serialized = JSON.stringify(revision);
  assert.equal(serialized.includes("cred_axodus_managed"), true);
  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("secret"), false);
});

test("execution plan boundary fields can be represented without runtime mutation data", () => {
  const revision = createAgentRevision({ definition: definition(), revision: 4, createdAt: 1 });
  const composition = createAgentComposition({ revision });
  const plan = {
    planId: "plan_01",
    agentId: revision.agentId,
    agentRevision: revision.revision,
    compositionFingerprint: composition.fingerprint,
    engineId: "openclaw",
    engineRevision: "ce46bfff9f7d1b7dc6a7ced3f9790632cea79a3b",
    executionTargetId: "openclaw/local-wsl",
    runnerId: "opencode",
    providerId: "axodus",
    modelId: "managed-default",
    credentialConnectionId: "cred_axodus_managed",
    governancePolicyId: "governance.default",
    economicPolicyId: "economics.default",
    isolationMode: "sandbox",
    deploymentMode: "sandbox",
    createdAt: 1,
    correlationId: "corr_01",
  };
  const serialized = JSON.stringify(plan);
  assert.equal(serialized.includes("privateKey"), false);
  assert.equal(serialized.includes("openclaw.json"), false);
});

test("fingerprinting changes when governed intent changes", () => {
  const base = fingerprintAgentDefinition(definition());
  const changed = fingerprintAgentDefinition(definition({ runnerPreferences: ["codex"] }));
  assert.notEqual(base, changed);
});

test("model strategy credentials must be declared on the definition", () => {
  const findings = validateAgentDefinition(definition({
    credentialConnectionIds: ["cred_axodus_managed"],
  }));
  assert.equal(findings.some((finding) => finding.code === "AGENT_MODEL_STRATEGY_FALLBACK_CREDENTIAL_UNDECLARED"), true);
});
