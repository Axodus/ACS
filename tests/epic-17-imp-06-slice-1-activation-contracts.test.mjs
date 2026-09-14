import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const api = await import(distRoot + "/index.js");
const digest = (char = "a") => char.repeat(64);
const revisionRef = (entity_kind, entity_id, revision = 1, fingerprint = digest("a")) => ({ entity_kind, entity_id, revision, fingerprint });
const entityRef = (kind, id) => ({ kind, id });

const automation = () => api.createAutomationRevisionV1({
  automation_id: "automation-1",
  tenant_id: "tenant-1",
  revision: 3,
  predecessor_ref: { automation_id: "automation-1", tenant_id: "tenant-1", revision: 2, fingerprint: digest("b") },
  purpose: "governed review",
  target_mode: "PINNED",
  pinned_target: { target_ref: revisionRef("workflow", "workflow-1", 4, digest("c")) },
  resolution_policy: undefined,
  definitions: [{ kind: "trigger", definition_key: "channel.received", configuration: { source: "channel" }, governed_refs: [] }],
  external_refs: { agent_refs: [], workforce_refs: [], workflow_refs: [revisionRef("workflow", "workflow-1", 4, digest("c"))], resource_refs: [], executor_refs: [] },
  delegation_requirement_refs: [],
  governing_refs: [],
  authored_configuration: { mode: "review" },
  authored_by: "principal:author",
  authored_at: 100,
  change_reason: "revision",
  provenance_refs: [],
});

const eventSource = (overrides = {}) => ({ kind: "event", issuer: "provider:events", namespace: "orders", event_id: "event-100", payload_digest: digest("d"), ...overrides });
const identity = (overrides = {}) => api.createActivationCausalIdentityV1({ tenant_id: "tenant-1", automation_ref: automation().ref, source: eventSource(), ...overrides });
const initialFact = (activation = identity(), overrides = {}) => api.validateActivationStateEventV1({
  schema_version: api.ACS_NATIVE_SCHEMA_VERSION,
  activation_state_event_id: "activation-state-1",
  activation_id: activation.activation_id,
  tenant_id: activation.tenant_id,
  sequence: 1,
  from_state: undefined,
  to_state: "observed",
  cause_digest: activation.source.payload_digest,
  observed_automation_lifecycle: "enabled",
  occurred_at: 100,
  provenance_refs: [entityRef("evidence", "source-evidence-1")],
  ...overrides,
});

const head = () => {
  const activation = identity();
  return api.createActivationHeadV1(activation, initialFact(activation));
};

test("IMP-06 Slice 1 derives deterministic causal identity from Tenant, exact Automation revision, and source-specific occurrence", () => {
  const first = identity();
  const replay = identity();
  const changedEvent = identity({ source: eventSource({ event_id: "event-101" }) });
  const nextRevision = api.createAutomationRevisionV1({ ...automation(), automation_id: "automation-1", tenant_id: "tenant-1", revision: 4, predecessor_ref: automation().ref, authored_at: 101, change_reason: "next" });
  const changedRevision = api.createActivationCausalIdentityV1({ tenant_id: "tenant-1", automation_ref: nextRevision.ref, source: eventSource() });

  assert.equal(first.activation_id, replay.activation_id);
  assert.notEqual(first.activation_id, changedEvent.activation_id);
  assert.notEqual(first.activation_id, changedRevision.activation_id);
  assert.equal(Object.isFrozen(first), true);
  assert.throws(() => api.validateActivationCausalIdentityV1({ ...first, activation_id: "activation:wrong" }), api.NativeContractValidationError);
});

test("IMP-06 Slice 1 keeps source classes explicit and excludes retry, claim, attempt, and executor metadata from causal identity", () => {
  const event = identity();
  const channel = identity({ source: { kind: "channel", channel_ref: entityRef("channel", "channel-1"), connection_ref: entityRef("integration_connection", "connection-1"), delivery_id: "delivery-1", logical_event_id: "message-1", payload_digest: digest("e") } });
  const schedule = identity({ source: { kind: "schedule", schedule_key: "daily", schedule_digest: digest("f"), intended_at: 86_400, timezone: "UTC" } });
  const manual = identity({ source: { kind: "manual", actor_ref: entityRef("principal", "operator-1"), idempotency_key: "manual-key-1", requested_at: 200, purpose: "operator review" } });
  const system = identity({ source: { kind: "system", system_id: "recovery", occurrence_key: "reconcile-1", purpose: "bounded recovery" } });

  assert.equal(new Set([event.activation_id, channel.activation_id, schedule.activation_id, manual.activation_id, system.activation_id]).size, 5);
  const claim = api.validateActivationClaimV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, claim_id: "claim-1", activation_id: event.activation_id, tenant_id: "tenant-1", claimant_id: "worker-a", fencing_token: 7, acquired_at: 100, expires_at: 200 });
  const attempt = api.validateActivationAttemptV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, attempt_id: "attempt-1", activation_id: event.activation_id, tenant_id: "tenant-1", attempt_sequence: 1, claim_id: claim.claim_id, fencing_token: claim.fencing_token, status: "claimed", started_at: 100 });
  assert.equal(event.activation_id, identity().activation_id);
  assert.notEqual(claim.claim_id, event.activation_id);
  assert.notEqual(attempt.attempt_id, event.activation_id);
});

test("IMP-06 Slice 1 appends immutable state facts, accepts frozen transitions, and rejects invalid transitions", () => {
  const current = head();
  const claimed = api.createActivationStateEventV1({ head: current, activation_state_event_id: "state-claim", to_state: "claimed", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 110, provenance_refs: [] });
  const claimedHead = api.applyActivationStateEventV1(current, claimed);
  const resolving = api.createActivationStateEventV1({ head: claimedHead, activation_state_event_id: "state-resolve", to_state: "resolving", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 120, provenance_refs: [] });
  const resolvingHead = api.applyActivationStateEventV1(claimedHead, resolving);
  const prepared = api.createActivationStateEventV1({ head: resolvingHead, activation_state_event_id: "state-prepared", to_state: "prepared", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 130, provenance_refs: [] });
  const preparedHead = api.applyActivationStateEventV1(resolvingHead, prepared);
  const handoff = api.createActivationStateEventV1({ head: preparedHead, activation_state_event_id: "state-handoff", to_state: "handoff_pending", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 140, provenance_refs: [] });

  assert.equal(Object.isFrozen(claimed), true);
  assert.equal(handoff.from_state, "prepared");
  assert.equal(api.applyActivationStateEventV1(preparedHead, handoff).current_state, "handoff_pending");
  assert.throws(() => api.createActivationStateEventV1({ head: current, activation_state_event_id: "bad", to_state: "admitted", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 110, provenance_refs: [] }), (error) => error instanceof api.ActivationContractError && error.code === "INVALID_STATE_TRANSITION");
  assert.doesNotThrow(() => api.validateActivationStateEventV1(claimed));
});

test("IMP-06 Slice 1 represents bounded fencing and attempts without lease storage or worker recovery", () => {
  const activation = identity();
  const claim = api.validateActivationClaimV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, claim_id: "claim-1", activation_id: activation.activation_id, tenant_id: activation.tenant_id, claimant_id: "worker-a", fencing_token: 2, acquired_at: 100, expires_at: 200 });
  const attempt = api.validateActivationAttemptV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, attempt_id: "attempt-1", activation_id: activation.activation_id, tenant_id: activation.tenant_id, attempt_sequence: 1, claim_id: claim.claim_id, fencing_token: 2, status: "claimed", started_at: 110 });

  assert.equal(api.assertActivationClaimFencingV1(claim, activation.activation_id, activation.tenant_id, 2, 150), claim);
  assert.equal(attempt.fencing_token, claim.fencing_token);
  assert.throws(() => api.assertActivationClaimFencingV1(claim, activation.activation_id, activation.tenant_id, 1, 150), (error) => error instanceof api.ActivationContractError && error.code === "STALE_FENCE");
  assert.throws(() => api.assertActivationClaimFencingV1(claim, activation.activation_id, activation.tenant_id, 2, 200), (error) => error instanceof api.ActivationContractError && error.code === "STALE_FENCE");
});

test("IMP-06 Slice 1 keeps target, authority, and handoff contracts structural and metadata-safe", async () => {
  const activation = identity();
  const current = head();
  const claimed = api.applyActivationStateEventV1(current, api.createActivationStateEventV1({ head: current, activation_state_event_id: "claim", to_state: "claimed", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 110, provenance_refs: [] }));
  const resolving = api.applyActivationStateEventV1(claimed, api.createActivationStateEventV1({ head: claimed, activation_state_event_id: "resolve", to_state: "resolving", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 120, provenance_refs: [] }));
  const prepared = api.applyActivationStateEventV1(resolving, api.createActivationStateEventV1({ head: resolving, activation_state_event_id: "prepared", to_state: "prepared", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 130, provenance_refs: [] }));
  const handoff = api.validateActivationAdmissionHandoffV1({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, handoff_id: "handoff-1", activation_id: activation.activation_id, tenant_id: activation.tenant_id, status: "prepared", idempotency_scope: "admission:tenant-1", idempotency_key: "handoff-key", request_fingerprint: digest("9"), prepared_at: 130, correlation_id: "correlation-1" });

  assert.equal(api.assertActivationHandoffPreparedV1(prepared, handoff), handoff);
  assert.throws(() => api.validateActivationAdmissionHandoffV1({ ...handoff, status: "admitted" }), api.NativeContractValidationError);
  assert.doesNotThrow(() => api.validateActivationStateEventV1({ ...api.createActivationStateEventV1({ head: resolving, activation_state_event_id: "prepared-with-context", to_state: "prepared", cause_digest: digest("d"), observed_automation_lifecycle: "enabled", occurred_at: 130, provenance_refs: [] }), resolution_context: { target_mode: "RESOLVED_AT_ACTIVATION", exact_target_ref: revisionRef("workflow", "workflow-1", 4, digest("c")), resolution_policy_ref: revisionRef("policy", "target-policy", 1, digest("8")) }, authority_context: { governing_refs: [], delegation_requirement_refs: [entityRef("delegation_requirement", "grant-1")], policy_decision_refs: [] } }));
  assert.throws(() => api.createEventEnvelopeV2({ event_id: "event-activation-1", event_type: "activation.created", timestamp: 100, sequence: 1, organization_id: "org-1", product_domain: "domain-1", tenant_id: "tenant-1", subject_type: "activation", subject_id: activation.activation_id, actor: { kind: "service", ref: "test" }, source: "acs", correlation_id: "correlation-1", payload: { secret: "forbidden" } }), api.NativeContractValidationError);
  const event = api.createEventEnvelopeV2({ event_id: "event-activation-2", event_type: "activation.created", timestamp: 100, sequence: 1, organization_id: "org-1", product_domain: "domain-1", tenant_id: "tenant-1", subject_type: "activation", subject_id: activation.activation_id, actor: { kind: "service", ref: "test" }, source: "acs", correlation_id: "correlation-1", payload: { activation_id: activation.activation_id, automation_fingerprint: activation.automation_ref.fingerprint } });
  assert.equal(event.subject_type, "activation");
  const source = await readFile(new URL("../src/native-core/activation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /postgres|shared-state|product-api|openclaw-engine|worker runtime/i);
});
