import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const api = await import(distRoot + "/index.js");
const digest = (char = "a") => char.repeat(64);

const revisionRef = (entity_kind, entity_id, revision = 1, fingerprint = digest("a")) => ({ entity_kind, entity_id, revision, fingerprint });
const entityRef = (kind, id) => ({ kind, id });
const agent = (agent_id, revision = 1) => ({ agent_id, tenant_id: "tenant-1", revision_ref: revisionRef("agent", agent_id, revision, digest(agent_id === "agent-a" ? "a" : agent_id === "agent-b" ? "b" : "c")) });

const bounds = (overrides = {}) => ({
  actions: ["read", "write"],
  capability_refs: [entityRef("capability", "capability-1")],
  resource_refs: [revisionRef("resource", "resource-1")],
  tool_refs: [revisionRef("resource", "tool-1", 1, digest("d"))],
  model_refs: [entityRef("model", "model-1")],
  connection_refs: [entityRef("integration_connection", "connection-1")],
  credential_purposes: ["bounded-read"],
  memory_scope_refs: ["memory:agent-1"],
  memory_operations: ["read", "write"],
  ...overrides,
});

const grant = (grant_id, delegator, delegate, revision = 1, overrides = {}) => api.createDelegationGrantRevisionV1({
  grant_id,
  tenant_id: "tenant-1",
  revision,
  delegator,
  delegate,
  authority_bounds: bounds(),
  valid_from: 100,
  expires_at: 1_000,
  onward_delegation_allowed: false,
  max_delegation_depth: 1,
  parent_grant_ref: undefined,
  ancestry_grant_refs: [],
  depth: 1,
  governing_authority_refs: [entityRef("authority", "governance-1")],
  governing_policy_refs: [revisionRef("policy", "permission-policy-1")],
  approval_refs: [entityRef("approval", "approval-1")],
  provenance_refs: [entityRef("evidence", "evidence-1")],
  issued_by: "principal:governance",
  issued_at: 100,
  reason: "bounded delegation",
  ...overrides,
});

const head = (revision, overrides = {}) => api.validateDelegationGrantHeadV1({
  schema_version: api.ACS_NATIVE_SCHEMA_VERSION,
  grant_id: revision.ref.grant_id,
  tenant_id: revision.ref.tenant_id,
  current_revision: revision.ref.revision,
  current_fingerprint: revision.ref.fingerprint,
  lifecycle: "active",
  valid_from: revision.valid_from,
  expires_at: revision.expires_at,
  created_at: 100,
  updated_at: 100,
  ...overrides,
});

const source = (overrides = {}) => ({
  tenant_id: "tenant-1",
  authority_bounds: bounds(),
  valid_from: 50,
  expires_at: 1_500,
  onward_delegation_allowed: true,
  max_delegation_depth: 2,
  governing_authority_refs: [entityRef("authority", "governance-1")],
  governing_policy_refs: [revisionRef("policy", "permission-policy-1")],
  ...overrides,
});

test("IMP-04 Slice 1 creates immutable Tenant-bound Grant revisions and a separate current head", () => {
  const revision = grant("grant-ab", agent("agent-a"), agent("agent-b"));
  const current = head(revision);
  assert.equal(revision.ref.grant_id, "grant-ab");
  assert.equal(revision.ref.tenant_id, "tenant-1");
  assert.equal(revision.depth, 1);
  assert.equal(current.current_fingerprint, revision.ref.fingerprint);
  assert.equal(Object.isFrozen(revision), true);
  assert.throws(() => grant("grant-self", agent("agent-a"), agent("agent-a")), api.NativeContractValidationError);
  assert.throws(() => grant("grant-cross", agent("agent-a"), { ...agent("agent-b"), tenant_id: "tenant-2" }), api.NativeContractValidationError);
});

test("IMP-04 Slice 1 accepts only intersection-only authority attenuation", () => {
  const revision = grant("grant-ab", agent("agent-a"), agent("agent-b"));
  assert.equal(api.assertDelegationGrantAttenuatesSourceV1(revision, source()), revision);

  assert.throws(
    () => api.assertDelegationGrantAttenuatesSourceV1(
      grant("grant-expand-action", agent("agent-a"), agent("agent-b"), 1, { authority_bounds: bounds({ actions: ["read", "delete"] }) }),
      source(),
    ),
    (error) => error instanceof api.DelegationResolutionError && error.code === "AUTHORITY_ATTENUATION_DENIED",
  );
  assert.throws(
    () => api.assertDelegationGrantAttenuatesSourceV1(
      grant("grant-expand-memory", agent("agent-a"), agent("agent-b"), 1, { authority_bounds: bounds({ memory_scope_refs: ["memory:agent-1", "memory:agent-2"] }) }),
      source(),
    ),
    (error) => error instanceof api.DelegationResolutionError && error.code === "AUTHORITY_ATTENUATION_DENIED",
  );
  assert.throws(
    () => api.assertDelegationGrantAttenuatesSourceV1(
      grant("grant-expand-time", agent("agent-a"), agent("agent-b"), 1, { expires_at: 2_000 }),
      source(),
    ),
    (error) => error instanceof api.DelegationResolutionError && error.code === "AUTHORITY_ATTENUATION_DENIED",
  );
});

test("IMP-04 Slice 1 rejects authority union and selects exactly one Grant basis", () => {
  const first = { revision: grant("grant-ab", agent("agent-a"), agent("agent-b")), head: undefined };
  first.head = head(first.revision);
  const second = { revision: grant("grant-ac", agent("agent-a"), agent("agent-c")), head: undefined };
  second.head = head(second.revision);

  assert.equal(api.selectDelegationAuthorityBasisV1([first]), first);
  assert.throws(
    () => api.selectDelegationAuthorityBasisV1([first, second]),
    (error) => error instanceof api.DelegationResolutionError && error.code === "MULTIPLE_AUTHORITY_BASES_FORBIDDEN",
  );
});

test("IMP-04 Slice 1 validates an attenuated onward chain and rejects cycles and depth overflow", () => {
  const parent = grant("grant-ab", agent("agent-a"), agent("agent-b"), 1, {
    onward_delegation_allowed: true,
    max_delegation_depth: 2,
  });
  const child = grant("grant-bc", agent("agent-b"), agent("agent-c"), 1, {
    authority_bounds: bounds({ actions: ["read"], memory_operations: ["read"] }),
    onward_delegation_allowed: false,
    max_delegation_depth: 2,
    parent_grant_ref: parent.ref,
    ancestry_grant_refs: [parent.ref],
    depth: 2,
  });
  assert.deepEqual(api.validateDelegationAdmissionChainV1([
    { revision: parent, head: head(parent) },
    { revision: child, head: head(child) },
  ], 200), [
    { revision: parent, head: head(parent) },
    { revision: child, head: head(child) },
  ]);

  const cycle = grant("grant-ba", agent("agent-b"), agent("agent-a"), 1, {
    authority_bounds: bounds({ actions: ["read"], memory_operations: ["read"] }),
    onward_delegation_allowed: false,
    max_delegation_depth: 2,
    parent_grant_ref: parent.ref,
    ancestry_grant_refs: [parent.ref],
    depth: 2,
  });
  assert.throws(
    () => api.validateDelegationAdmissionChainV1([{ revision: parent, head: head(parent) }, { revision: cycle, head: head(cycle) }], 200),
    (error) => error instanceof api.DelegationResolutionError && error.code === "INVALID_DELEGATION_CHAIN",
  );
  assert.throws(
    () => grant("grant-depth", agent("agent-b"), agent("agent-c"), 1, {
      onward_delegation_allowed: true,
      max_delegation_depth: 2,
      parent_grant_ref: parent.ref,
      ancestry_grant_refs: [parent.ref],
      depth: 2,
    }),
    api.NativeContractValidationError,
  );
});

test("IMP-04 Slice 1 blocks revoked and expired Grants for new admission without changing historical revisions", () => {
  const revision = grant("grant-ab", agent("agent-a"), agent("agent-b"));
  assert.doesNotThrow(() => api.assertDelegationGrantUsableAtV1(head(revision), revision, 200));
  assert.throws(
    () => api.assertDelegationGrantUsableAtV1(head(revision, { lifecycle: "revoked", revoked_at: 250, revocation_reason: "governance withdrawal", updated_at: 250 }), revision, 300),
    (error) => error instanceof api.DelegationResolutionError && error.code === "GRANT_NOT_USABLE",
  );
  assert.throws(
    () => api.assertDelegationGrantUsableAtV1(head(revision), revision, 1_000),
    (error) => error instanceof api.DelegationResolutionError && error.code === "GRANT_NOT_USABLE",
  );
  assert.equal(revision.ref.fingerprint, grant("grant-ab", agent("agent-a"), agent("agent-b")).ref.fingerprint);
});

test("IMP-04 Slice 1 accepts the approved Event subject and remains free of persistence, admission, and Product API work", async () => {
  const event = api.createEventEnvelopeV2({
    event_id: "event-delegation-1",
    event_type: "delegation_grant.issued",
    timestamp: 100,
    sequence: 1,
    organization_id: "org-1",
    product_domain: "domain-1",
    tenant_id: "tenant-1",
    subject_type: "delegation_grant",
    subject_id: "grant-ab",
    actor: { kind: "service", ref: "governance" },
    source: "acs",
    correlation_id: "correlation-1",
    payload: { fingerprint: digest("f"), depth: 1 },
  });
  assert.equal(event.subject_type, "delegation_grant");

  const sourceText = await readFile(new URL("../src/native-core/delegation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sourceText, /postgres|shared-state|product-api|native-core-durable/i);
});
