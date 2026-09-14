import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import * as api from "../dist/index.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const ref = (entity_kind, entity_id, revision = 1) => ({ entity_kind, entity_id, revision, fingerprint: hash(`${entity_kind}:${entity_id}:${revision}`) });

test("Slice 3 target seam preserves PINNED and delegates exact policy resolution", async () => {
  const automationRef = { automation_id: "automation-a", tenant_id: "tenant-a", revision: 1, fingerprint: hash("automation") };
  const pinned = ref("workflow", "workflow-a", 2);
  const adapter = new api.ActivationTargetResolutionAdapterV1();
  assert.deepEqual(await adapter.resolve({ tenantId: "tenant-a", automationRef, activationId: "activation-a", targetMode: "PINNED", pinnedTarget: pinned }), { target_ref: pinned, resolver_ref: pinned, resolver_fingerprint: pinned.fingerprint });
  await assert.rejects(() => adapter.resolve({ tenantId: "tenant-a", automationRef, activationId: "activation-a", targetMode: "RESOLVED_AT_ACTIVATION" }), /UNAVAILABLE/);
  const resolved = ref("workflow", "workflow-b", 4);
  const delegated = new api.ActivationTargetResolutionAdapterV1({ async resolve(input) { assert.equal(input.automationRef.fingerprint, automationRef.fingerprint); return { target_ref: resolved, resolver_ref: ref("policy", "policy-a"), resolver_fingerprint: hash("resolver") }; } });
  assert.equal((await delegated.resolve({ tenantId: "tenant-a", automationRef, activationId: "activation-a", targetMode: "RESOLVED_AT_ACTIVATION", resolutionPolicy: { policy_ref: ref("policy", "policy-a"), selector: "exact", parameters: {} } })).target_ref.fingerprint, resolved.fingerprint);
});

test("Slice 3 authority seam fails closed before canonical Delegation resolution on cross-Tenant input", async () => {
  const adapter = new api.ActivationAuthorityResolutionAdapterV1({ async getDelegationGrantLineage() { throw new Error("must not load"); } }, { async resolveDelegatorAuthority() { throw new Error("must not resolve"); } });
  await assert.rejects(() => adapter.resolve({ tenantId: "tenant-a", activationId: "activation-a", at: 10, delegationRequirementRefs: [{ grant_id: "grant-a", tenant_id: "tenant-b", revision: 1, fingerprint: hash("grant") }] }), /TENANT_MISMATCH/);
});

test("Slice 3 authority seam propagates canonical revoked and expired Grant rejection", async () => {
  const grant = (id, expires_at = 100) => api.createDelegationGrantRevisionV1({ grant_id: id, tenant_id: "tenant-a", revision: 1, delegator: { agent_id: "agent-a", tenant_id: "tenant-a", revision_ref: ref("agent", "agent-a") }, delegate: { agent_id: "agent-b", tenant_id: "tenant-a", revision_ref: ref("agent", "agent-b") }, authority_bounds: { actions: ["read"], capability_refs: [], resource_refs: [], tool_refs: [], model_refs: [], connection_refs: [], credential_purposes: [], memory_scope_refs: [], memory_operations: [] }, valid_from: 1, expires_at, onward_delegation_allowed: false, max_delegation_depth: 1, ancestry_grant_refs: [], depth: 1, governing_authority_refs: [], governing_policy_refs: [], approval_refs: [], provenance_refs: [], issued_by: "test", issued_at: 1, reason: "test" });
  const g = grant("grant-a", 10);
  const head = (lifecycle, expires_at = 10) => api.validateDelegationGrantHeadV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, grant_id: g.ref.grant_id, tenant_id: "tenant-a", current_revision: 1, current_fingerprint: g.ref.fingerprint, lifecycle, valid_from: 1, expires_at, created_at: 1, updated_at: 1, ...(lifecycle === "revoked" ? { revoked_at: 2, revocation_reason: "test" } : {}) });
  const owner = { async resolveDelegatorAuthority() { return { tenant_id: "tenant-a", authority_bounds: g.authority_bounds, valid_from: 1, expires_at: 100, onward_delegation_allowed: true, max_delegation_depth: 1, governing_authority_refs: [], governing_policy_refs: [] }; } };
  for (const lineageHead of [head("revoked"), head("active", 10)]) {
    const adapter = new api.ActivationAuthorityResolutionAdapterV1({ async getDelegationGrantLineage() { return { head: lineageHead, revisions: [g], revocations: [] }; } }, owner);
    await assert.rejects(() => adapter.resolve({ tenantId: "tenant-a", activationId: "activation-a", at: 20, delegationRequirementRefs: [g.ref] }), api.DelegationResolutionError);
  }
});

test("Slice 3 preparation coordinator resolves exact history and delegates one atomic prepared handoff", async () => {
  const revision = api.createAutomationRevisionV1({ automation_id: "automation-a", tenant_id: "tenant-a", revision: 1, purpose: "test", target_mode: "PINNED", pinned_target: { target_ref: ref("workflow", "workflow-a", 2) }, definitions: [], external_refs: { agent_refs: [], workforce_refs: [], workflow_refs: [], resource_refs: [], executor_refs: [] }, delegation_requirement_refs: [], governing_refs: [], authored_configuration: {}, authored_by: "test", authored_at: 1, change_reason: "test", provenance_refs: [] });
  const currentRevision = api.createAutomationRevisionV1({ automation_id: "automation-a", tenant_id: "tenant-a", revision: 2, predecessor_ref: revision.ref, purpose: "test", target_mode: "PINNED", pinned_target: { target_ref: ref("workflow", "workflow-current", 3) }, definitions: [], external_refs: { agent_refs: [], workforce_refs: [], workflow_refs: [], resource_refs: [], executor_refs: [] }, delegation_requirement_refs: [], governing_refs: [], authored_configuration: {}, authored_by: "test", authored_at: 2, change_reason: "test", provenance_refs: [] });
  const automationRef = revision.ref;
  const identity = api.createActivationCausalIdentityV1({ tenant_id: "tenant-a", automation_ref: automationRef, source: { kind: "system", system_id: "test", occurrence_key: "one", purpose: "test" } });
  const observed = api.validateActivationStateEventV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, activation_state_event_id: "observed", activation_id: identity.activation_id, tenant_id: "tenant-a", sequence: 1, to_state: "observed", cause_digest: hash("cause"), observed_automation_lifecycle: "enabled", occurred_at: 1, provenance_refs: [] });
  const claimed = api.applyActivationStateEventV1(api.createActivationHeadV1(identity, observed), api.createActivationStateEventV1({ head: api.createActivationHeadV1(identity, observed), activation_state_event_id: "claimed", to_state: "claimed", cause_digest: hash("cause"), observed_automation_lifecycle: "enabled", occurred_at: 2, provenance_refs: [] }));
  const resolving = api.applyActivationStateEventV1(claimed, api.createActivationStateEventV1({ head: claimed, activation_state_event_id: "resolving", to_state: "resolving", cause_digest: hash("cause"), observed_automation_lifecycle: "enabled", occurred_at: 3, provenance_refs: [] }));
  let prepared;
  const core = {
    async getActivationLineage() { return { head: resolving, stateEvents: [observed], attempts: [] }; },
    async getAutomationLineage() { return { head: { ...api.createAutomationHeadV1(currentRevision, 1), lifecycle: "enabled" }, revisions: [revision, currentRevision], lifecycleEvents: [] }; },
    async prepareActivationHandoff(input) { prepared = input; return { head: { ...resolving, current_state: "prepared" }, stateEvents: [], attempts: [], handoff: input.handoff }; },
    async admitWorkforceRun() { throw new Error("admission must not be called"); },
  };
  const service = new api.ActivationPreparationServiceV1(core, new api.ActivationTargetResolutionAdapterV1(), { async resolve() { return { delegation_refs: [], resolved: [] }; } });
  const claim = { schema_version: api.ACS_NATIVE_SCHEMA_VERSION, claim_id: "claim", activation_id: identity.activation_id, tenant_id: "tenant-a", claimant_id: "worker", fencing_token: 1, acquired_at: 3, expires_at: 99 };
  const handoff = { schema_version: api.ACS_NATIVE_SCHEMA_VERSION, handoff_id: "handoff", activation_id: identity.activation_id, tenant_id: "tenant-a", status: "prepared", idempotency_scope: "activation.handoff:tenant-a", idempotency_key: "handoff", request_fingerprint: hash("handoff"), prepared_at: 4, correlation_id: "handoff" };
  await service.prepare({ activationId: identity.activation_id, tenantId: "tenant-a", claim, at: 4, handoff, idempotency: { scope: "activation.prepare:tenant-a", key: "prepare", request_hash: hash("prepare") }, event: api.createEventEnvelopeV2({ event_id: "prepared-event", event_type: "activation.prepared", timestamp: 4, sequence: 1, organization_id: "org", product_domain: "acs", tenant_id: "tenant-a", subject_type: "activation", subject_id: identity.activation_id, actor: { kind: "service", ref: "test" }, source: "acs", correlation_id: "handoff", idempotency_key: "prepare", payload: {} }) });
  assert.equal(prepared.preparedStateEvent.to_state, "prepared");
  assert.equal(prepared.preparedStateEvent.resolution_context.exact_target_ref.entity_id, "workflow-a");
});

test("Slice 3 preparation rejects an ineligible state and gives prepared replay a typed conflict", async () => {
  const input = {
    activationId: "activation-a", tenantId: "tenant-a", claim: {}, at: 1,
    handoff: { handoff_id: "handoff-a", request_fingerprint: hash("handoff-a"), idempotency_scope: "scope", idempotency_key: "key" },
    idempotency: { scope: "scope", key: "key", request_hash: hash("key") }, event: {},
  };
  const unsupported = new api.ActivationPreparationServiceV1({ async getActivationLineage() { return { head: { current_state: "observed" } }; } }, {}, {});
  await assert.rejects(() => unsupported.prepare(input), /ACTIVATION_PREPARATION_STATE_INVALID/);
  const replay = { head: { current_state: "prepared" }, handoff: input.handoff };
  const idempotent = new api.ActivationPreparationServiceV1({ async getActivationLineage() { return replay; } }, {}, {});
  assert.equal(await idempotent.prepare(input), replay);
  await assert.rejects(() => idempotent.prepare({ ...input, handoff: { ...input.handoff, handoff_id: "handoff-b" } }), api.ActivationPreparationConflictError);
});
