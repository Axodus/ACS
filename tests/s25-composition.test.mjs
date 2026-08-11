import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import {
  AgentService,
  InMemoryAgentRepository,
  createAgentRevision,
  ProductApiClient,
  CompositionResourceService,
  ModelProviderRegistry,
  CredentialConnectionRegistry,
  AgentRunnerRegistry,
} from "../dist/index.js";

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

async function get(context, url, correlationId) {
  return routeProductApiRequest(
    { method: "GET", url, headers: {} },
    url,
    context,
    { correlationId },
  );
}

function jsonBodyRequest(payload) {
  const serialized = JSON.stringify(payload);
  return {
    method: "POST",
    url: "",
    headers: { "content-type": "application/json" },
    on(event, cb) {
      if (event === "data") {
        cb(serialized);
      }
      if (event === "end") {
        cb();
      }
    },
  };
}

function minimalAgentDefinition(agentId, overrides = {}) {
  return {
    agentId,
    name: `Test Agent ${agentId}`,
    status: "draft",
    capabilityIds: [],
    skillIds: [],
    toolIds: [],
    credentialConnectionIds: [],
    runnerPreferences: [],
    ...overrides,
  };
}

async function createAgentViaApi(context, agentId, overrides = {}) {
  const request = jsonBodyRequest({ definition: minimalAgentDefinition(agentId, overrides) });
  return routeProductApiRequest(
    request,
    "/api/v1/agents",
    context,
    { correlationId: `create_${agentId}` },
  );
}

test("GET /api/v1/composition returns the operational composition summary", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const result = await get(context, "/api/v1/composition", "test_composition_summary");
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    const data = result.body.data;
    assert.equal(typeof data.checkedAt, "number");
    assert.equal(data.stale, false);
    assert.deepEqual(data.guardrails, {
      inspectionMode: true,
      sandboxOnly: true,
      readOnly: true,
      mutableOperations: false,
    });
    assert.equal(data.roleCount, 2);
    assert.equal(data.profileCount, 1);
    assert.equal(data.capabilityCount, 9);
    assert.equal(data.skillCount, 1);
    assert.equal(data.toolCount, 1);
    assert.equal(data.pluginCount, 0);
    assert.equal(data.engineCount, 1);
    assert.ok(data.providerCount >= 2);
    assert.ok(data.modelCount >= 3);
    assert.equal(data.warningCount, 0);
    assert.equal(data.missingRequirementCount, 0);
    assert.equal(data.conflictCount, 0);

    const summaryResult = await get(context, "/api/v1/composition/summary", "test_composition_summary_alias");
    assert.equal(summaryResult.status, 200);
    const { checkedAt: summaryCheckedAt, ...summaryRest } = summaryResult.body.data;
    const { checkedAt: _checkedAt, ...dataRest } = data;
    assert.equal(typeof summaryCheckedAt, "number");
    assert.deepEqual(summaryRest, dataRest);
  } finally {
    await context.close();
  }
});

test("GET /api/v1/roles and /api/v1/roles/:roleId expose the role catalog", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const listResult = await get(context, "/api/v1/roles", "test_roles");
    assert.equal(listResult.status, 200);
    const roles = listResult.body.data;
    assert.ok(Array.isArray(roles));
    assert.equal(roles.length, 2);
    const executor = roles.find((role) => role.roleId === "role.executor");
    assert.ok(executor);
    assert.equal(executor.name, "Executor");
    assert.ok(executor.capabilities.includes("agent.inspect"));
    assert.equal(executor.revision, 2);
    assert.equal(executor.status, "active");
    assert.ok(Array.isArray(executor.availableActions));

    const detailResult = await get(context, "/api/v1/roles/role.executor", "test_role_detail");
    assert.equal(detailResult.status, 200);
    assert.equal(detailResult.body.data.roleId, "role.executor");
    assert.ok(detailResult.body.data.usageCount >= 0);

    const missingResult = await get(context, "/api/v1/roles/role.ghost", "test_role_missing");
    assert.equal(missingResult.status, 404);
    assert.equal(missingResult.body.error.code, "not_found");
  } finally {
    await context.close();
  }
});

test("GET /api/v1/profiles exposes the profile catalog with OpenClaw state", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const listResult = await get(context, "/api/v1/profiles", "test_profiles");
    assert.equal(listResult.status, 200);
    const profiles = listResult.body.data;
    assert.equal(profiles.length, 1);
    const profile = profiles[0];
    assert.equal(profile.profileId, "profile.default");
    assert.equal(profile.name, "Default");
    assert.equal(profile.openClawCompatible, true);
    assert.equal(profile.legacyProfileVisible, false);
    assert.deepEqual(profile.sections, ["identity", "soul", "user", "memory", "heartbeat"]);

    const detailResult = await get(context, "/api/v1/profiles/profile.default", "test_profile_detail");
    assert.equal(detailResult.status, 200);
    assert.equal(detailResult.body.data.revision, 3);
  } finally {
    await context.close();
  }
});

test("GET /api/v1/capabilities exposes the capability registry", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const listResult = await get(context, "/api/v1/capabilities", "test_capabilities");
    assert.equal(listResult.status, 200);
    const capabilities = listResult.body.data;
    assert.ok(capabilities.length >= 9);
    const inspect = capabilities.find((capability) => capability.capabilityId === "agent.inspect");
    assert.ok(inspect);
    assert.equal(inspect.name, "Agent Inspect");
    assert.equal(inspect.status, "active");
    assert.ok(Array.isArray(inspect.requirements));
    assert.ok(Array.isArray(inspect.conflicts));

    const detailResult = await get(context, "/api/v1/capabilities/agent.inspect", "test_capability_detail");
    assert.equal(detailResult.status, 200);
    assert.equal(detailResult.body.data.type, "agent");
  } finally {
    await context.close();
  }
});

test("GET /api/v1/skills and /api/v1/tools expose read-only catalogs", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const skillsResult = await get(context, "/api/v1/skills", "test_skills");
    assert.equal(skillsResult.status, 200);
    const skill = skillsResult.body.data.find((entry) => entry.skillId === "skill.analysis");
    assert.ok(skill);
    assert.equal(skill.installed, false);
    assert.equal(skill.assigned, false);
    assert.ok(skill.capabilities.includes("agent.inspect"));
    assert.ok(Array.isArray(skill.availableActions));

    const skillDetail = await get(context, "/api/v1/skills/skill.analysis", "test_skill_detail");
    assert.equal(skillDetail.status, 200);
    assert.equal(skillDetail.body.data.compatibility, "unverified");

    const toolsResult = await get(context, "/api/v1/tools", "test_tools");
    assert.equal(toolsResult.status, 200);
    const tool = toolsResult.body.data.find((entry) => entry.toolId === "tool.registry");
    assert.ok(tool);
    assert.equal(tool.availability, "available");

    const toolDetail = await get(context, "/api/v1/tools/tool.registry", "test_tool_detail");
    assert.equal(toolDetail.status, 200);
    assert.equal(toolDetail.body.data.assigned, false);
  } finally {
    await context.close();
  }
});

test("plugin surfaces report unavailable/empty state without simulated support", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const pluginsResult = await get(context, "/api/v1/plugins", "test_plugins");
    assert.equal(pluginsResult.status, 200);
    assert.deepEqual(pluginsResult.body.data, []);

    const pluginDetail = await get(context, "/api/v1/plugins/plugin.ghost", "test_plugin_detail");
    assert.equal(pluginDetail.status, 404);

    const packagesResult = await get(context, "/api/v1/plugin-packages", "test_plugin_packages");
    assert.equal(packagesResult.status, 200);
    assert.deepEqual(packagesResult.body.data, []);

    const sourcesResult = await get(context, "/api/v1/package-sources", "test_package_sources");
    assert.equal(sourcesResult.status, 200);
    assert.deepEqual(sourcesResult.body.data, []);
  } finally {
    await context.close();
  }
});

test("GET /api/v1/engines and /api/v1/providers expose availability without secrets", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const enginesResult = await get(context, "/api/v1/engines", "test_engines");
    assert.equal(enginesResult.status, 200);
    const engine = enginesResult.body.data.find((entry) => entry.id === "openclaw");
    assert.ok(engine);
    assert.equal(engine.type, "agentsai");
    assert.equal(engine.availability, "ready");
    assert.ok(Array.isArray(engine.capabilities));
    assert.ok(Array.isArray(engine.deploymentModes));

    const engineDetail = await get(context, "/api/v1/engines/openclaw", "test_engine_detail");
    assert.equal(engineDetail.status, 200);
    assert.equal(engineDetail.body.data.credentialRequired, false);

    const providersResult = await get(context, "/api/v1/providers", "test_providers");
    assert.equal(providersResult.status, 200);
    const providers = providersResult.body.data;
    const axodus = providers.find((provider) => provider.id === "axodus");
    assert.ok(axodus);
    assert.ok(axodus.type.includes("managed"));
    assert.equal(axodus.credentialRequired, true);
    assert.equal(axodus.compatibility, "compatible");

    const openai = providers.find((provider) => provider.id === "openai");
    assert.ok(openai);
    assert.equal(openai.credentialRequired, true);
    assert.equal(openai.compatibility, "pending");

    const providerDetail = await get(context, "/api/v1/providers/axodus", "test_provider_detail");
    assert.equal(providerDetail.status, 200);
    assert.equal(providerDetail.body.data.name, "Axodus Managed");
    assert.ok(!("secretRef" in providerDetail.body.data));
    assert.ok(!("owner" in providerDetail.body.data));
  } finally {
    await context.close();
  }
});

test("GET /api/v1/models exposes a flattened model catalog", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const result = await get(context, "/api/v1/models", "test_models");
    assert.equal(result.status, 200);
    const models = result.body.data;
    assert.ok(models.length >= 3);
    const multi = models.find((model) => model.id === "axodus/axodus-multi");
    assert.ok(multi);
    assert.equal(multi.type, "axodus");
    assert.equal(multi.availability, "available");
    assert.equal(multi.credentialRequired, true);
    assert.ok(multi.capabilities.includes("text"));
    assert.ok(Array.isArray(multi.availableActions));
    const preview = models.find((model) => model.id === "axodus/axodus-reason");
    assert.ok(preview);
    assert.equal(preview.availability, "preview");
    assert.equal(preview.compatibility, "pending");
  } finally {
    await context.close();
  }
});

test("GET /api/v1/agents/:agentId/composition returns the agent composition surface", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const result = await get(context, "/api/v1/agents/dev-agent-sandbox/composition", "test_agent_composition");
    assert.equal(result.status, 200);
    const data = result.body.data;
    assert.equal(data.agentId, "dev-agent-sandbox");
    assert.equal(data.agentName, "DEV Sandbox Agent");
    assert.equal(data.currentRevisionId, 1);
    assert.ok(!("roleSummary" in data));
    assert.ok(!("profileSummary" in data));

    const sandbox = data.effectiveCapabilities.find((entry) => entry.capabilityId === "deployment.sandbox");
    assert.ok(sandbox);
    assert.deepEqual(sandbox.sources, ["agent"]);
    assert.equal(sandbox.status, "active");

    assert.deepEqual(data.skills, []);
    assert.deepEqual(data.tools, []);
    assert.deepEqual(data.plugins, []);
    assert.equal(data.provider.id, "axodus");
    assert.equal(data.model.id, "axodus/axodus-multi");
    assert.ok(!("engine" in data));

    assert.equal(data.compatibilitySummary.ready, true);
    assert.deepEqual(data.compatibilitySummary.missingRequirements, []);
    assert.deepEqual(data.compatibilitySummary.conflicts, []);
    assert.deepEqual(data.compatibilitySummary.warnings, []);
    assert.equal(data.readinessSummary.state, "ready");

    assert.ok(data.availableActions.length >= 15);
    for (const action of data.availableActions) {
      assert.equal(action.available, false);
      assert.ok(action.reason.includes("Product API"));
    }
    assert.deepEqual(data.guardrails, {
      inspectionMode: true,
      sandboxOnly: true,
      readOnly: true,
      mutableOperations: false,
    });
    assert.equal(data.stale, false);
  } finally {
    await context.close();
  }
});

test("effective capabilities and compatibility endpoints derive from the Product API", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const capabilitiesResult = await get(context, "/api/v1/agents/dev-agent-sandbox/composition/capabilities", "test_effective_capabilities");
    assert.equal(capabilitiesResult.status, 200);
    const capabilities = capabilitiesResult.body.data;
    assert.equal(capabilities.agentId, "dev-agent-sandbox");
    assert.ok(capabilities.capabilityIds.includes("deployment.sandbox"));
    assert.ok(Array.isArray(capabilities.sources));
    assert.equal(typeof capabilities.checkedAt, "number");

    const compatibilityResult = await get(context, "/api/v1/agents/dev-agent-sandbox/composition/compatibility", "test_compatibility");
    assert.equal(compatibilityResult.status, 200);
    const compatibility = compatibilityResult.body.data;
    assert.equal(compatibility.agentId, "dev-agent-sandbox");
    assert.ok(Array.isArray(compatibility.missingRequirements));
    assert.ok(Array.isArray(compatibility.conflicts));
    assert.ok(Array.isArray(compatibility.warnings));
    assert.equal(compatibility.ready, true);

    const missingAgent = await get(context, "/api/v1/agents/ghost-agent/composition", "test_composition_missing_agent");
    assert.equal(missingAgent.status, 404);
    assert.equal(missingAgent.body.error.code, "not_found");
  } finally {
    await context.close();
  }
});

test("composition findings surface warnings for stale role references", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const created = await createAgentViaApi(context, "agent-stale-role", {
      roleId: "role.executor",
      roleRevision: 99,
    });
    assert.equal(created.status, 201);

    const result = await get(context, "/api/v1/agents/agent-stale-role/composition", "test_stale_agent");
    assert.equal(result.status, 200);
    const data = result.body.data;
    assert.equal(data.roleSummary.roleId, "role.executor");
    assert.ok(data.effectiveCapabilities.some((entry) => entry.sources.includes("role")));
    const warningCodes = data.compatibilitySummary.warnings.map((finding) => finding.code);
    assert.ok(warningCodes.includes("RESOURCE_REVISION_STALE"));
    assert.equal(data.compatibilitySummary.ready, true);
  } finally {
    await context.close();
  }
});

test("missing requirements come from the Product API and are never recomputed", async () => {
  const repository = new InMemoryAgentRepository();
  const resources = new CompositionResourceService();
  const agentService = new AgentService({
    repository,
    providers: new ModelProviderRegistry(),
    credentials: new CredentialConnectionRegistry(),
    runners: new AgentRunnerRegistry(),
    resources,
  });
  repository.create(createAgentRevision({
    definition: {
      agentId: "ghost-agent",
      name: "Ghost Agent",
      status: "draft",
      capabilityIds: ["unknown.cap"],
      skillIds: ["skill.ghost"],
      toolIds: [],
      credentialConnectionIds: [],
      runnerPreferences: [],
    },
    revision: 1,
    createdAt: Date.now(),
  }));

  const client = new ProductApiClient({ agentService, compositionResources: resources });
  const detail = await client.getAgentComposition("ghost-agent");
  assert.ok(detail);
  const codes = detail.missingRequirements.map((finding) => finding.code);
  assert.ok(codes.includes("RESOURCE_CAPABILITY_UNKNOWN"));
  assert.ok(codes.includes("RESOURCE_NOT_FOUND"));
  assert.equal(detail.compatibilitySummary.ready, false);
  assert.equal(detail.readinessSummary.state, "blocked");
  assert.equal(detail.effectiveCapabilities.find((entry) => entry.capabilityId === "unknown.cap").status, "unknown");
  const ghostSkill = detail.skills.find((skill) => skill.skillId === "skill.ghost");
  assert.ok(ghostSkill);
  assert.equal(ghostSkill.compatibility, "unavailable");

  const effective = await client.getAgentEffectiveCapabilities("ghost-agent");
  assert.ok(effective);
  assert.ok(effective.capabilityIds.includes("unknown.cap"));
});

test("unsupported composition mutations return structured errors", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const patchComposition = await routeProductApiRequest(
      { method: "PATCH", url: "/api/v1/agents/dev-agent-sandbox/composition", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/composition",
      context,
      { correlationId: "test_patch_composition" },
    );
    assert.equal(patchComposition.status, 405);
    assert.equal(patchComposition.body.error.code, "method_not_allowed");

    const postComposition = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/agents/dev-agent-sandbox/composition", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/composition",
      context,
      { correlationId: "test_post_composition" },
    );
    assert.equal(postComposition.status, 405);

    const installSkill = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/skills/skill.analysis/install", headers: {} },
      "/api/v1/skills/skill.analysis/install",
      context,
      { correlationId: "test_install_skill" },
    );
    assert.equal(installSkill.status, 405);
    assert.equal(installSkill.body.error.code, "unsupported_action");

    const assignSkill = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/agents/dev-agent-sandbox/skills/skill.analysis/assign", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/skills/skill.analysis/assign",
      context,
      { correlationId: "test_assign_skill" },
    );
    assert.equal(assignSkill.status, 405);
    assert.equal(assignSkill.body.error.code, "unsupported_action");

    const selectEngine = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/agents/dev-agent-sandbox/composition/engine", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/composition/engine",
      context,
      { correlationId: "test_select_engine" },
    );
    assert.equal(selectEngine.status, 405);
  } finally {
    await context.close();
  }
});

test("composition responses never leak credentials or secret material", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const urls = [
      "/api/v1/composition",
      "/api/v1/roles",
      "/api/v1/profiles",
      "/api/v1/capabilities",
      "/api/v1/skills",
      "/api/v1/tools",
      "/api/v1/plugins",
      "/api/v1/engines",
      "/api/v1/providers",
      "/api/v1/models",
      "/api/v1/agents/dev-agent-sandbox/composition",
      "/api/v1/agents/dev-agent-sandbox/composition/capabilities",
      "/api/v1/agents/dev-agent-sandbox/composition/compatibility",
    ];
    for (const [index, url] of urls.entries()) {
      const result = await get(context, url, `test_scan_${index}`);
      assert.equal(result.status, 200, `expected 200 for ${url}`);
      const serialized = JSON.stringify(result.body);
      // Match realistic secret-key shapes only; "sk-" as a substring of
      // legitimate identifiers (e.g. service.risk-analysis) is not a leak.
      const secretKeyPattern = /sk-(proj|ant|svc)-[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{16,}/;
      assert.equal(secretKeyPattern.test(serialized), false, `sk- key leak in ${url}`);
      assert.equal(serialized.includes("apiKey"), false, `apiKey leak in ${url}`);
      assert.equal(serialized.includes("secretRef"), false, `secretRef leak in ${url}`);
      assert.equal(serialized.includes("secret"), false, `secret leak in ${url}`);
    }
  } finally {
    await context.close();
  }
});

test("Milestones A and B surfaces remain green", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  try {
    const dashboardResult = await get(context, "/api/v1/dashboard", "test_dashboard_regression");
    assert.equal(dashboardResult.status, 200);
    assert.equal(dashboardResult.body.success, true);

    const agentResult = await get(context, "/api/v1/agents/dev-agent-sandbox", "test_agent_regression");
    assert.equal(agentResult.status, 200);
    assert.equal(agentResult.body.data.guardrails.mutationScope, "agent-lifecycle");
    assert.equal(agentResult.body.data.guardrails.productionReady, false);
    assert.equal(agentResult.body.data.guardrails.sourceOfTruth, "product-api");

    const readinessResult = await get(context, "/api/v1/readiness", "test_readiness_regression");
    assert.equal(readinessResult.status, 200);
  } finally {
    await context.close();
  }
});
