import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const api = await import(distRoot + "/index.js");
const digest = (char = "a") => char.repeat(64);
const revisionRef = (entity_kind, entity_id, revision = 1, fingerprint = digest("a")) => ({ entity_kind, entity_id, revision, fingerprint });
const entityRef = (kind, id) => ({ kind, id });
const refs = () => ({ agent_refs: [revisionRef("agent", "agent-1")], workforce_refs: [revisionRef("workforce", "workforce-1", 1, digest("b"))], workflow_refs: [revisionRef("workflow", "workflow-1", 1, digest("c"))], resource_refs: [revisionRef("resource", "resource-1", 1, digest("d"))], executor_refs: [entityRef("executor", "openclaw-adapter") ] });
const definitions = () => [{ kind: "trigger", definition_key: "event.received", configuration: { source: "channel" }, governed_refs: [entityRef("channel", "channel-1")] }, { kind: "schedule", definition_key: "daily", configuration: { timezone: "UTC", expression: "0 9 * * *" }, governed_refs: [] }];
const delegationRef = () => ({ grant_id: "grant-1", tenant_id: "tenant-1", revision: 1, fingerprint: digest("e") });
const revision = (revisionNumber = 1, overrides = {}) => api.createAutomationRevisionV1({
  automation_id: "automation-1", tenant_id: "tenant-1", revision: revisionNumber,
  predecessor_ref: revisionNumber === 1 ? undefined : overrides.predecessor_ref,
  purpose: "daily governed review", target_mode: "PINNED", pinned_target: { target_ref: revisionRef("workflow", "workflow-1", 4, digest("f")) }, resolution_policy: undefined,
  definitions: definitions(), external_refs: refs(), delegation_requirement_refs: [delegationRef()], governing_refs: [revisionRef("policy", "automation-policy", 2, digest("9"))], authored_configuration: { prompt: "review", labels: ["safe", "governed"] }, authored_by: "principal:author", authored_at: 100, change_reason: "initial configuration", provenance_refs: [entityRef("evidence", "evidence-1")], ...overrides,
});

test("IMP-05 Slice 1 creates stable Automation identity with immutable semantic revisions and deterministic fingerprints", () => {
  const first = revision();
  const sameSemantic = revision(1, { authored_by: "principal:other", authored_at: 999, change_reason: "metadata-only", provenance_refs: [entityRef("evidence", "other")], definitions: [...definitions()].reverse(), external_refs: { ...refs(), executor_refs: [...refs().executor_refs].reverse() } });
  assert.equal(first.ref.automation_id, "automation-1");
  assert.equal(first.ref.tenant_id, "tenant-1");
  assert.equal(first.ref.fingerprint, sameSemantic.ref.fingerprint);
  assert.equal(Object.isFrozen(first), true);
  const changed = revision(1, { authored_configuration: { prompt: "different", labels: ["safe", "governed"] } });
  assert.notEqual(first.ref.fingerprint, changed.ref.fingerprint);
  assert.throws(() => api.validateAutomationRevisionV1({ ...first, ref: { ...first.ref, fingerprint: digest("0") } }), api.NativeContractValidationError);
});

test("IMP-05 Slice 1 validates CAS head advance without mutating prior revision", () => {
  const first = revision();
  const head = api.createAutomationHeadV1(first, 100);
  const second = revision(2, { predecessor_ref: first.ref, authored_configuration: { prompt: "revised", labels: ["safe", "governed"] }, authored_at: 200, change_reason: "new semantics" });
  const advanced = api.assertAutomationHeadAdvanceV1(head, second, { current_revision: 1, current_fingerprint: first.ref.fingerprint });
  assert.equal(advanced.current_revision, 2);
  assert.equal(advanced.lifecycle, "draft");
  assert.equal(first.ref.fingerprint, revision().ref.fingerprint);
  assert.throws(() => api.assertAutomationHeadAdvanceV1(head, second, { current_revision: 1, current_fingerprint: digest("0") }), api.NativeContractValidationError);
});

test("IMP-05 Slice 1 enforces mutually exclusive fail-closed target modes", () => {
  assert.doesNotThrow(() => revision());
  assert.throws(() => revision(1, { pinned_target: undefined }), api.NativeContractValidationError);
  assert.throws(() => revision(1, { resolution_policy: { policy_ref: revisionRef("policy", "resolve", 1, digest("1")), selector: "eligible", parameters: {} } }), api.NativeContractValidationError);
  assert.doesNotThrow(() => revision(1, { target_mode: "RESOLVED_AT_ACTIVATION", pinned_target: undefined, resolution_policy: { policy_ref: revisionRef("policy", "resolve", 1, digest("1")), selector: "eligible-workflow", parameters: { region: "us" } } }));
  assert.throws(() => revision(1, { target_mode: "RESOLVED_AT_ACTIVATION", pinned_target: undefined, resolution_policy: undefined }), api.NativeContractValidationError);
});

test("IMP-05 Slice 1 records lifecycle facts separately and rejects invalid or terminal transitions", () => {
  const first = revision();
  const head = api.createAutomationHeadV1(first, 100);
  const enabled = api.createAutomationLifecycleEventV1({ lifecycle_event_id: "lifecycle-enable", head, revision: first, to_lifecycle: "enabled", transitioned_by: "principal:governance", transitioned_at: 110, reason: "approved", governing_authority_refs: [entityRef("authority", "authority-1")], approval_refs: [entityRef("approval", "approval-1")], provenance_refs: [] });
  const enabledHead = api.applyAutomationLifecycleEventV1(head, enabled);
  const disabled = api.createAutomationLifecycleEventV1({ lifecycle_event_id: "lifecycle-disable", head: enabledHead, revision: first, to_lifecycle: "disabled", transitioned_by: "principal:governance", transitioned_at: 120, reason: "paused", governing_authority_refs: [], approval_refs: [], provenance_refs: [] });
  const archivedHead = api.applyAutomationLifecycleEventV1(api.applyAutomationLifecycleEventV1(enabledHead, disabled), api.createAutomationLifecycleEventV1({ lifecycle_event_id: "lifecycle-archive", head: api.applyAutomationLifecycleEventV1(enabledHead, disabled), revision: first, to_lifecycle: "archived", transitioned_by: "principal:governance", transitioned_at: 130, reason: "retired", governing_authority_refs: [], approval_refs: [], provenance_refs: [] }));
  assert.equal(enabled.automation_ref.fingerprint, first.ref.fingerprint);
  assert.equal(archivedHead.lifecycle, "archived");
  assert.throws(() => api.createAutomationLifecycleEventV1({ lifecycle_event_id: "bad", head, revision: first, to_lifecycle: "disabled", transitioned_by: "principal:governance", transitioned_at: 120, reason: "bad", governing_authority_refs: [], approval_refs: [], provenance_refs: [] }), api.NativeContractValidationError);
  assert.throws(() => api.createAutomationLifecycleEventV1({ lifecycle_event_id: "unarchive", head: archivedHead, revision: first, to_lifecycle: "enabled", transitioned_by: "principal:governance", transitioned_at: 140, reason: "bad", governing_authority_refs: [], approval_refs: [], provenance_refs: [] }), api.NativeContractValidationError);
});

test("IMP-05 Slice 1 keeps external and Delegation references non-authoritative and grants no execution", async () => {
  const first = revision();
  assert.equal(first.delegation_requirement_refs[0].grant_id, "grant-1");
  assert.equal(first.external_refs.executor_refs[0].id, "openclaw-adapter");
  assert.throws(() => api.createAutomationRevisionV1({ ...first, automation_id: "automation-secret", revision: 1, authored_configuration: { secret: "forbidden" } }), api.NativeContractValidationError);
  const event = api.createEventEnvelopeV2({ event_id: "event-automation-1", event_type: "automation.created", timestamp: 100, sequence: 1, organization_id: "org-1", product_domain: "domain-1", tenant_id: "tenant-1", subject_type: "automation", subject_id: first.ref.automation_id, actor: { kind: "service", ref: "test" }, source: "acs", correlation_id: "correlation-1", payload: { automation_id: first.ref.automation_id, fingerprint: first.ref.fingerprint } });
  assert.equal(event.subject_type, "automation");
  const source = await readFile(new URL("../src/native-core/automation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /postgres|shared-state|product-api|admission|runtime|openclaw-engine/i);
});
