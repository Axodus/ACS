import assert from "node:assert/strict";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const { NativeContractValidationError, CompositionResourceRegistry, CompositionResourceService, createAgentEffectiveConfigurationSnapshotV1, createAgentRevisionV2, reconstructEffectiveConfigurationSnapshotV1, createRuntimeExecutionIntentV2, createGovernedResourceObservationV1 } = await import(`${distRoot}/index.js`);
const { ProductApiClient } = await import(`${distRoot}/control-plane/product-api-client.js`);
const digest = "a".repeat(64);
const ref = (kind, id) => ({ kind, id });
const revision = (entity_kind, entity_id, revisionNumber) => ({ entity_kind, entity_id, revision: revisionNumber, fingerprint: digest });

function agentRevision() {
  return createAgentRevisionV2({
    agent_id: "agent-imp-02", revision: 3, supersedes_revision: 2, instructions: "Use exact admitted configuration only.",
    capability_requirements: [ref("capability", "agent.inspect")], constraints: [ref("constraint", "safe-output")],
    knowledge: { allowed_scope_refs: ["knowledge:default"], denied_scope_refs: [], context_policy_ref: revision("policy", "context", 1), memory_policy_ref: revision("policy", "memory", 1) },
    resources: { skill_refs: [revision("resource", "skill.analysis", 1)], tool_refs: [revision("resource", "tool.registry", 1)], mcp_server_refs: [] },
    runtime_preferences: { provider_routes: [ref("provider", "provider-a")], model_requirements: [ref("model", "model-a")], harness_preferences: [ref("harness", "harness-a")], executor_preferences: [ref("executor", "executor-a")] },
    governance: { authority_refs: [ref("authority", "tenant:authority")], permission_policy_ref: revision("policy", "permission", 1), approval_policy_ref: revision("policy", "approval", 1) },
    economics: { cost_policy_ref: revision("policy", "cost", 1), budget_policy_ref: revision("policy", "budget", 1) },
    evidence: { audit_policy_ref: revision("policy", "audit", 1), evaluation_refs: [ref("evaluation", "eval-a")] },
    commit: { created_by: "test", committed_at: 100, change_reason: "IMP-02 fixture" },
  });
}

const scope = { organization_id: "org-1", product_domain: "acs", tenant_id: "tenant-1", owner_ref: "owner:acs", authority_scope_ref: "authority:tenant-1", knowledge_scope_refs: ["knowledge:default"] };

function snapshot(overrides = {}) {
  const resources = new CompositionResourceService();
  const resource_observations = [
    resources.observeResource("capability", "agent.inspect", 200),
    resources.observeResource("skill", "skill.analysis", 200),
    resources.observeResource("tool", "tool.registry", 200),
  ];
  return createAgentEffectiveConfigurationSnapshotV1({ snapshot_id: "effective-configuration-intent-1", run_id: "run-1", task_id: "task-1", assignment_id: "assignment-1", assignment_generation: 1, scope, agent_revision: agentRevision(), workforce_revision_ref: revision("workforce", "workforce-1", 2), resolved_at: 200, resource_observations, ...overrides });
}

test("IMP-02 freezes class-specific configuration without a universal override chain", () => {
  const value = snapshot();
  assert.equal(value.classes.length, 11);
  assert.equal(value.classes.find((entry) => entry.configuration_class === "capability_requirements").rule, "requirements_union");
  assert.equal(value.classes.find((entry) => entry.configuration_class === "capability_requirements").status, "resolved");
  assert.equal(value.classes.find((entry) => entry.configuration_class === "skill_tool_binding").status, "resolved");
  assert.equal(value.classes.find((entry) => entry.configuration_class === "governance_policies").rule, "policy_kind_semantics");
  assert.equal(value.classes.find((entry) => entry.configuration_class === "memory_policy").status, "unavailable");
  assert.equal(value.scope.tenant_id, "tenant-1");
});

test("IMP-02 reconstructs only from an immutable verified snapshot", () => {
  const value = snapshot();
  assert.deepEqual(reconstructEffectiveConfigurationSnapshotV1(value), value);
  assert.throws(() => reconstructEffectiveConfigurationSnapshotV1({ ...value, classes: value.classes.map((entry) => entry.configuration_class === "capability_requirements" ? { ...entry, resolved_refs: [] } : entry) }), NativeContractValidationError);
  assert.throws(() => reconstructEffectiveConfigurationSnapshotV1({ ...value, resource_observations: [] }), NativeContractValidationError);
});

test("IMP-02 keeps Profile, credentials and presentation out of effective authority", () => {
  const value = snapshot();
  assert.doesNotMatch(JSON.stringify(value), /profileId|profileRevision|permissionGrant|presentationMetadata/i);
  assert.equal(value.classes.find((entry) => entry.configuration_class === "presentation").status, "not_applicable");
  assert.deepEqual(value.classes.find((entry) => entry.configuration_class === "credential_binding").resolved_refs, []);
});

test("IMP-02 binds a snapshot to one immutable execution intent generation", () => {
  const value = snapshot();
  const intent = createRuntimeExecutionIntentV2({ intent_id: "intent-1", run_id: "run-1", task_id: "task-1", assignment_id: "assignment-1", assignment_generation: 1, member_slot_id: "member-1", agent_id: "agent-imp-02", agent_revision_ref: value.agent_revision_ref, workforce_revision_ref: value.workforce_revision_ref, runtime_configuration: {}, effective_configuration_snapshot: value, status: "compiled", compiled_at: 200, provenance: {} });
  assert.equal(intent.effective_configuration_snapshot.effective_fingerprint, value.effective_fingerprint);
  assert.throws(() => createRuntimeExecutionIntentV2({ ...intent, assignment_generation: 2 }), NativeContractValidationError);
});

test("IMP-02 historical resource observations retain T0 content after a catalog changes", () => {
  const before = new CompositionResourceService(new CompositionResourceRegistry({ skills: [{ kind: "skill", id: "skill.x", revision: 1, displayName: "Skill X", status: "active", capabilityIds: ["agent.inspect"], source: "catalog-a", metadata: { content: "A" } }] }));
  const observationA = before.observeResource("skill", "skill.x", 200);
  const historical = snapshot({ resource_observations: [observationA] });
  const after = new CompositionResourceService(new CompositionResourceRegistry({ skills: [{ kind: "skill", id: "skill.x", revision: 1, displayName: "Skill X", status: "active", capabilityIds: ["agent.inspect"], source: "catalog-a", metadata: { content: "B" } }] }));
  const observationB = after.observeResource("skill", "skill.x", 300);
  assert.notEqual(observationA.content_fingerprint, observationB.content_fingerprint);
  assert.equal(reconstructEffectiveConfigurationSnapshotV1(historical).resource_observations[0].content.metadata.content, "A");
});

test("IMP-02 marks resource-dependent classes unavailable without historical evidence", () => {
  const value = snapshot({ resource_observations: [] });
  assert.equal(value.classes.find((entry) => entry.configuration_class === "capability_requirements").status, "unavailable");
  assert.equal(value.classes.find((entry) => entry.configuration_class === "skill_tool_binding").status, "unavailable");
});

test("IMP-02 exposes bounded decision provenance and immutable provider/model observations", () => {
  const providerModel = createGovernedResourceObservationV1({ kind: "provider_model", resource_id: "provider-a/model-a", revision: 1, observed_at: 200, content: { provider_id: "provider-a", model_id: "model-a", availability: "available", authority_grant: false } });
  const value = snapshot({ provider_model_observations: [providerModel] });
  const model = value.classes.find((entry) => entry.configuration_class === "model_preference");
  assert.equal(model.status, "resolved");
  assert.equal(model.provenance.decision, "selected");
  assert.deepEqual(model.provenance.selected_refs, [ref("provider", "provider-a"), ref("model", "model-a")]);
  assert.deepEqual(model.provenance.observation_fingerprints, [providerModel.content_fingerprint]);
  assert.equal(value.resource_observations.some((entry) => entry.kind === "provider_model"), true);
  assert.equal(model.provenance.authority_refs.length, 0);
});

test("IMP-02 fails closed when provider/model historical observation is unavailable", () => {
  const value = snapshot();
  const model = value.classes.find((entry) => entry.configuration_class === "model_preference");
  assert.equal(model.status, "unavailable");
  assert.equal(model.provenance.decision, "unavailable");
  assert.equal(model.provenance.reason_code, "provider_model_observation_unavailable");
});

test("IMP-02 exposes snapshot/history reads through the existing Product API boundary", async () => {
  const value = snapshot({ provider_model_observations: [createGovernedResourceObservationV1({ kind: "provider_model", resource_id: "provider-a/model-a", revision: 1, observed_at: 200, content: { provider_id: "provider-a", model_id: "model-a", availability: "available", authority_grant: false } })] });
  const intent = createRuntimeExecutionIntentV2({ intent_id: "intent-api-1", run_id: "run-1", task_id: "task-1", assignment_id: "assignment-1", assignment_generation: 1, member_slot_id: "member-api-1", agent_id: "agent-imp-02", agent_revision_ref: value.agent_revision_ref, workforce_revision_ref: value.workforce_revision_ref, runtime_configuration: {}, effective_configuration_snapshot: value, status: "compiled", compiled_at: 200, provenance: { source: "test" } });
  const api = new ProductApiClient({ nativeCore: { getExecutionIntent: async () => intent, listExecutionIntents: async () => [intent] } });
  assert.equal((await api.getExecutionIntent(intent.intent_id)).effective_configuration_snapshot.effective_fingerprint, value.effective_fingerprint);
  assert.deepEqual((await api.listExecutionIntents(intent.run_id)).map((entry) => entry.intent_id), [intent.intent_id]);
});

test("IMP-02 records a legacy preset as compatibility evidence without creating authority", () => {
  const resources = new CompositionResourceService();
  const preset = resources.observeResource("profile", "profile.default", 200);
  const value = snapshot({ resource_observations: [preset] });
  assert.equal(preset.kind, "legacy_capability_requirement_preset");
  assert.equal(preset.content.compatibility_only, true);
  assert.equal(value.classes.find((entry) => entry.configuration_class === "capability_requirements").status, "unavailable");
  assert.deepEqual(value.classes.find((entry) => entry.configuration_class === "capability_requirements").resolved_refs, []);
});
