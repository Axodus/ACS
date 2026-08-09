import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentRunnerRegistry,
  AgentService,
  AxodusManagedModelProvider,
  CompositionResourceService,
  CredentialConnectionRegistry,
  InMemoryAgentRepository,
  ModelProviderRegistry,
  StaticAxodusModelGateway,
  createAgentRevision,
  InMemorySecretStore,
  RegistryBackedCredentialProvider,
} from "../dist/index.js";

function makeDefinition(overrides = {}) {
  return {
    agentId: "agent_mazikeen",
    name: "Mazikeen",
    status: "draft",
    roleId: "role.executor",
    roleRevision: 2,
    profileId: "profile.default",
    profileRevision: 3,
    capabilityIds: ["agent.inspect"],
    skillIds: ["skill.analysis"],
    toolIds: ["tool.registry"],
    modelStrategy: {
      primary: { providerId: "axodus", modelId: "managed-default", credentialConnectionId: "cred_axodus_managed" },
      fallbacks: [],
      runnerId: "opencode",
    },
    credentialConnectionIds: ["cred_axodus_managed"],
    runnerPreferences: ["opencode"],
    executionPolicyId: "policy.default",
    ...overrides,
  };
}

function createService() {
  const providers = new ModelProviderRegistry();
  providers.register(new AxodusManagedModelProvider({
    gateway: new StaticAxodusModelGateway({
      models: [{
        modelId: "managed-default",
        displayName: "Axodus Managed Default",
        availability: "available",
        capabilities: {
          supports: ["text", "reasoning"],
          inputModalities: ["text"],
          outputModalities: ["text"],
          toolUse: false,
          reasoning: true,
          coding: false,
          streaming: true,
          structuredOutput: true,
          vision: false,
        },
      }],
    }),
  }));

  const credentials = new CredentialConnectionRegistry();
  credentials.register({
    id: "cred_axodus_managed",
    providerId: "axodus",
    type: "managed",
    status: "active",
    owner: { tenantId: "tenant-alpha" },
    scopes: ["managed-routing"],
    createdAt: 1,
    updatedAt: 1,
  });

  const runners = new AgentRunnerRegistry();
  runners.register({
    id: "opencode",
    displayName: "OpenCode",
    async health() { return { runnerId: "opencode", status: "unavailable", observedAt: 1, findings: [] }; },
    async capabilities() { return { runnerId: "opencode", supportedConnectionTypes: ["local-runner"], supportedProviders: [], supportsExecution: false, supportsInspection: false, supportsCancellation: false, environmentScope: "local-only" }; },
    async execute() { throw new Error("unsupported"); },
    async inspect(executionId) { return { executionId, status: "unsupported" }; },
    async cancel() { throw new Error("unsupported"); },
  });

  return new AgentService({
    repository: new InMemoryAgentRepository(),
    resources: new CompositionResourceService(),
    providers,
    credentials,
    runners,
  });
}

test("agent service create/get/list works with revisioned definitions", () => {
  const service = createService();
  const revision = service.create({ definition: makeDefinition(), createdAt: 1, createdBy: "user_1" });
  assert.equal(revision.revision, 1);
  assert.equal(service.get("agent_mazikeen").fingerprint, revision.fingerprint);
  assert.deepEqual(service.list().map((item) => item.agentId), ["agent_mazikeen"]);
});

test("agent service update enforces expected revision and no-op stability", () => {
  const service = createService();
  service.create({ definition: makeDefinition(), createdAt: 1 });
  const noOp = service.update("agent_mazikeen", {
    definition: makeDefinition(),
    expectedRevision: 1,
    updatedAt: 2,
  });
  assert.equal(noOp.revision, 1);

  const updated = service.update("agent_mazikeen", {
    definition: makeDefinition({ capabilityIds: ["agent.inspect", "deployment.sandbox"] }),
    expectedRevision: 1,
    updatedAt: 3,
  });
  assert.equal(updated.revision, 2);

  assert.throws(() => service.update("agent_mazikeen", {
    definition: makeDefinition({ capabilityIds: ["runtime.inspect"] }),
    expectedRevision: 1,
    updatedAt: 4,
  }), /revision conflict/i);
});

test("agent validation catches invalid resource, provider, credential, and runner references", () => {
  const service = createService();
  const findings = service.validateDefinition(makeDefinition({
    roleId: "missing-role",
    credentialConnectionIds: ["missing-cred"],
    runnerPreferences: ["missing-runner"],
    modelStrategy: {
      primary: { providerId: "missing-provider", modelId: "x", credentialConnectionId: "missing-cred" },
      fallbacks: [],
    },
  }));
  assert.equal(findings.some((finding) => finding.code === "RESOURCE_NOT_FOUND"), true);
  assert.equal(findings.some((finding) => finding.code === "AGENT_CREDENTIAL_REFERENCE_UNKNOWN"), true);
  assert.equal(findings.some((finding) => finding.code === "AGENT_RUNNER_REFERENCE_UNKNOWN"), true);
  assert.equal(findings.some((finding) => finding.code === "AGENT_PROVIDER_REFERENCE_UNKNOWN"), true);
});

test("agent composition resolves effective capabilities and keeps secret-free logical references", () => {
  const service = createService();
  service.create({ definition: makeDefinition(), createdAt: 1 });
  const { composition } = service.compose("agent_mazikeen");
  assert.equal(composition.effective.capabilityIds.includes("deployment.sandbox"), true);
  const serialized = JSON.stringify(composition);
  assert.equal(serialized.includes("cred_axodus_managed"), true);
  assert.equal(serialized.includes("sk-"), false);
});
