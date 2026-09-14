import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const api = await import(`${distRoot}/index.js`);
const digest = (char = "a") => char.repeat(64);

const policy = (revision = 1, overrides = {}) => api.createMemoryPolicyRevisionV1({
  memory_policy_id: "memory-policy-1",
  revision,
  ...(revision > 1 ? { supersedes_revision: revision - 1 } : {}),
  tenant_id: "tenant-1",
  lifecycle: "active",
  allowed_memory_types: ["working", "agent", "workforce_shared", "knowledge_backed"],
  allowed_scope_kinds: ["working", "agent", "workforce_shared", "knowledge_backed"],
  allowed_operations: ["read", "search", "write", "correct", "forget", "expire"],
  max_retrieval_results: 10,
  retention: { max_age_ms: 86_400_000, deletion_action: "tombstone", retain_content_digest: true },
  provenance_required: true,
  evidence_required: true,
  created_by: "principal:governance",
  created_at: 100,
  change_reason: "initial policy",
  ...overrides,
});

const boundEntity = (kind, id, revision = undefined, tenant_id = "tenant-1") => ({ tenant_id, ref: { kind, id, ...(revision === undefined ? {} : { revision }) } });
const policyRef = () => ({ tenant_id: "tenant-1", ref: policy().ref });
const agentScope = () => ({ tenant_id: "tenant-1", kind: "agent", agent_ref: boundEntity("agent", "agent-1") });
const workingScope = () => ({ tenant_id: "tenant-1", kind: "working", run_ref: boundEntity("run", "run-1"), task_ref: boundEntity("task", "task-1") });
const workforceScope = () => ({ tenant_id: "tenant-1", kind: "workforce_shared", run_ref: boundEntity("run", "run-1"), workforce_revision_ref: { tenant_id: "tenant-1", ref: { entity_kind: "workforce", entity_id: "workforce-1", revision: 2, fingerprint: digest("b") } } });
const knowledgeScope = () => ({ tenant_id: "tenant-1", kind: "knowledge_backed", knowledge_ref: boundEntity("knowledge", "knowledge-1", 3), knowledge_fingerprint: digest("c") });

const record = (memory_id = "memory-1", scope = agentScope(), overrides = {}) => api.createMemoryRecordV1({
  memory_id,
  tenant_id: "tenant-1",
  memory_type: scope.kind,
  scope,
  policy_ref: policyRef(),
  content: { content_ref: `content:${memory_id}`, content_digest: digest("d"), media_type: "text/plain" },
  provenance_refs: [{ kind: "evidence", id: "evidence-1" }],
  sensitivity: "restricted",
  created_by: "principal:agent",
  created_at: 200,
  ...overrides,
});

test("IMP-03B Memory Policy preserves an exact immutable policy revision and head contract", () => {
  const first = policy();
  const successor = policy(2, { change_reason: "narrow retrieval" });
  const head = api.validateMemoryPolicyHeadV1({
    schema_version: api.ACS_NATIVE_SCHEMA_VERSION,
    memory_policy_id: "memory-policy-1",
    tenant_id: "tenant-1",
    current_revision: successor.ref.revision,
    current_fingerprint: successor.ref.fingerprint,
    lifecycle: "active",
    created_at: 100,
    updated_at: 200,
  });
  assert.equal(first.ref.entity_kind, "policy");
  assert.equal(successor.supersedes_revision, 1);
  assert.notEqual(first.ref.fingerprint, successor.ref.fingerprint);
  assert.equal(head.current_fingerprint, successor.ref.fingerprint);
  assert.equal(Object.isFrozen(first), true);
});

test("IMP-03B Memory Records are immutable content-bearing identities with successor provenance", () => {
  const original = record();
  const successor = record("memory-2", agentScope(), { predecessor_ref: original.ref, content: { content_ref: "content:memory-2", content_digest: digest("e"), media_type: "text/plain" } });
  assert.equal(original.ref.memory_id, "memory-1");
  assert.equal(successor.predecessor_ref.memory_id, original.ref.memory_id);
  assert.notEqual(successor.ref.memory_id, original.ref.memory_id);
  assert.notEqual(successor.ref.fingerprint, original.ref.fingerprint);
  assert.equal(Object.isFrozen(successor), true);
});

test("IMP-03B scopes are explicit, tenant-bound, and preserve Agent, Workforce, Working, and Knowledge ownership boundaries", () => {
  for (const [scope, type] of [[workingScope(), "working"], [agentScope(), "agent"], [workforceScope(), "workforce_shared"], [knowledgeScope(), "knowledge_backed"]]) {
    const value = record(`memory-${type}`, scope, { memory_type: type });
    assert.equal(value.scope.kind, type);
    assert.equal(value.scope.tenant_id, "tenant-1");
  }
  const knowledge = record("memory-knowledge", knowledgeScope(), { memory_type: "knowledge_backed" });
  assert.equal(knowledge.scope.knowledge_ref.ref.id, "knowledge-1");
  assert.equal(knowledge.scope.knowledge_fingerprint, digest("c"));
});

test("IMP-03B rejects cross-Tenant references, invalid type/scope combinations, and unapproved User Context Memory", () => {
  assert.throws(() => record("memory-cross-tenant", { ...agentScope(), agent_ref: boundEntity("agent", "agent-2", undefined, "tenant-2") }), api.NativeContractValidationError);
  assert.throws(() => record("memory-type-scope", workingScope(), { memory_type: "agent" }), api.NativeContractValidationError);
  assert.throws(() => api.createMemoryRecordV1({
    memory_id: "memory-user-context",
    tenant_id: "tenant-1",
    memory_type: "user_context",
    scope: { tenant_id: "tenant-1", kind: "user_context" },
    policy_ref: policyRef(),
    content: { content_ref: "content:user", content_digest: digest("f"), media_type: "text/plain" },
    provenance_refs: [],
    sensitivity: "restricted",
    created_by: "principal:test",
    created_at: 1,
  }), api.NativeContractValidationError);
});

test("IMP-03B tombstones retain only policy-permitted content-free proof", () => {
  const original = record();
  const tombstone = api.createMemoryTombstoneV1({
    memory_ref: original.ref,
    memory_type: "agent",
    scope: agentScope(),
    policy_ref: policyRef(),
    deleted_at: 300,
    deletion_reason: "policy_forget",
    digest_retention: "policy_permitted",
    retained_content_digest: original.content.content_digest,
    provenance_refs: [{ kind: "decision", id: "forget-1" }],
  });
  assert.equal(tombstone.memory_ref.memory_id, original.ref.memory_id);
  assert.equal(tombstone.retained_content_digest, original.content.content_digest);
  assert.throws(() => api.validateMemoryTombstoneV1({ ...tombstone, content: original.content }), api.NativeContractValidationError);
  assert.throws(() => api.validateMemoryTombstoneV1({ ...tombstone, digest_retention: "not_retained", retained_content_digest: original.content.content_digest }), api.NativeContractValidationError);
});

test("IMP-03B policy/access decisions are provenance only and cannot grant capability, credential, delegation, or execution authority", () => {
  const decision = api.createMemoryPolicyAccessDecisionV1({
    decision_id: "decision-1",
    tenant_id: "tenant-1",
    policy_ref: policyRef(),
    memory_type: "agent",
    scope: agentScope(),
    operation: "read",
    purpose: "bounded-context",
    outcome: "allowed",
    authority_basis_refs: [{ kind: "authority", id: "authority-1" }],
    provenance_refs: [{ kind: "evidence", id: "evidence-1" }],
    decided_at: 400,
  });
  assert.equal(decision.outcome, "allowed");
  assert.throws(() => api.validateMemoryPolicyAccessDecisionV1({ ...decision, capability_ref: { kind: "capability", id: "forbidden" } }), api.NativeContractValidationError);
  assert.throws(() => api.validateMemoryPolicyAccessDecisionV1({ ...decision, credential_ref: "forbidden" }), api.NativeContractValidationError);
});

test("IMP-03B contracts remain isolated from runtime and Product API even when later authorized persistence exists", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/native-core/memory.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/native-core/runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/control-plane/shared-state/migrations.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources[0], /postgres|repository|shared-state|product-api|RuntimeExecutionIntentV2/i);
  assert.match(sources[1], /memory_policy|memory_record/);
  assert.match(sources[2], /acs_memory_/);
  assert.doesNotMatch(sources[0], /RuntimeExecutionIntentV2/i);
});
