import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import * as api from "../dist/index.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const automationRef = { automation_id: "automation-s5", tenant_id: "tenant-a", revision: 1, fingerprint: hash("automation-s5") };
const providerA = { kind: "provider", id: "provider-a" }; const providerB = { kind: "provider", id: "provider-b" };

function normalized(adapterRef, providerRef, externalObservation) {
  return api.createNormalizedExternalObservationV1({
    tenant_id: "tenant-a", automation_ref: automationRef, source_class: "trigger",
    // The adapter converts provider delivery syntax into source-stable causal material.
    source: { kind: "event", issuer: "external-trigger", namespace: "customer-order", event_id: externalObservation.logicalOrder, payload_digest: hash(externalObservation.logicalOrder) },
    adapter_ref: adapterRef, provider_ref: providerRef, external_reference_digest: hash(externalObservation.delivery), occurred_at: 100, evidence_refs: [],
  });
}

function fixture() {
  const activations = new Map(); let admissionCalls = 0; let runCalls = 0;
  const core = {
    async createActivation(input) { const existing = activations.get(input.identity.activation_id); if (existing) return existing; const lineage = { head: api.createActivationHeadV1(input.identity, input.initialStateEvent), stateEvents: [input.initialStateEvent], attempts: [] }; activations.set(input.identity.activation_id, lineage); return lineage; },
    async admitWorkforceRun() { admissionCalls += 1; }, async createRun() { runCalls += 1; },
  };
  return { core, activations, counts: () => ({ admissionCalls, runCalls }) };
}

test("S5 normalizes provider observations through canonical Activation ingress without provider ownership", async (t) => {
  await t.test("two provider adapters yield one canonical Activation for one logical observation", async () => {
    const state = fixture(); const ingress = new api.ExternalObservationActivationIngressV1(state.core);
    const adapterA = { async normalize(input) { return normalized({ kind: "adapter", id: "adapter-a" }, input.providerRef, input.externalObservation); } };
    const adapterB = { async normalize(input) { return normalized({ kind: "adapter", id: "adapter-b" }, input.providerRef, input.externalObservation); } };
    const first = await api.normalizeAndIngestExternalObservationV1({ adapter: adapterA, ingress, organizationId: "org", tenantId: "tenant-a", automationRef, sourceClass: "trigger", providerRef: providerA, externalObservation: { delivery: "provider-a-redelivery-91", logicalOrder: "order-77", raw: "credential=never-persist" }, occurredAt: 100 });
    const second = await api.normalizeAndIngestExternalObservationV1({ adapter: adapterB, ingress, organizationId: "org", tenantId: "tenant-a", automationRef, sourceClass: "trigger", providerRef: providerB, externalObservation: { delivery: "provider-b-message-18", logicalOrder: "order-77", raw: "credential=never-persist" }, occurredAt: 100 });
    assert.equal(first.lineage.head.identity.activation_id, second.lineage.head.identity.activation_id);
    assert.equal(state.activations.size, 1); assert.notEqual(first.lineage.head.identity.activation_id, "provider-a-redelivery-91");
    assert.deepEqual(state.counts(), { admissionCalls: 0, runCalls: 0 });
  });
  await t.test("duplicate delivery and retry preserve the same Activation identity", async () => {
    const state = fixture(); const ingress = new api.ExternalObservationActivationIngressV1(state.core); const observation = normalized({ kind: "adapter", id: "adapter-a" }, providerA, { delivery: "delivery-1", logicalOrder: "order-1" });
    const first = await ingress.ingest({ organizationId: "org", observation }); const retry = await ingress.ingest({ organizationId: "org", observation });
    assert.equal(first.lineage.head.identity.activation_id, retry.lineage.head.identity.activation_id); assert.equal(state.activations.size, 1);
  });
  await t.test("cross-Tenant and source-class mismatch fail closed before ingress", async () => {
    assert.throws(() => api.createNormalizedExternalObservationV1({ tenant_id: "tenant-b", automation_ref: automationRef, source_class: "trigger", source: { kind: "event", issuer: "issuer", namespace: "ns", event_id: "id", payload_digest: hash("payload") }, adapter_ref: { kind: "adapter", id: "adapter" }, external_reference_digest: hash("ref"), occurred_at: 1, evidence_refs: [] }), api.NativeContractValidationError);
    assert.throws(() => api.createNormalizedExternalObservationV1({ tenant_id: "tenant-a", automation_ref: automationRef, source_class: "channel", source: { kind: "event", issuer: "issuer", namespace: "ns", event_id: "id", payload_digest: hash("payload") }, adapter_ref: { kind: "adapter", id: "adapter" }, external_reference_digest: hash("ref"), occurred_at: 1, evidence_refs: [] }), api.NativeContractValidationError);
  });
  await t.test("an unavailable adapter fails closed and cannot create an Activation", async () => {
    const state = fixture(); const ingress = new api.ExternalObservationActivationIngressV1(state.core);
    await assert.rejects(() => api.normalizeAndIngestExternalObservationV1({ adapter: { async normalize() { throw new Error("ADAPTER_CAPABILITY_UNAVAILABLE"); } }, ingress, organizationId: "org", tenantId: "tenant-a", automationRef, sourceClass: "trigger", providerRef: providerA, externalObservation: {}, occurredAt: 100 }), /ADAPTER_CAPABILITY_UNAVAILABLE/);
    assert.equal(state.activations.size, 0);
  });
  await t.test("safe Product projection excludes raw provider content, credentials and authority internals", async () => {
    const state = fixture(); const result = await new api.ExternalObservationActivationIngressV1(state.core).ingest({ organizationId: "org", observation: normalized({ kind: "adapter", id: "adapter-a" }, providerA, { delivery: "delivery-2", logicalOrder: "order-2" }) });
    const serialized = JSON.stringify(result.projection);
    assert.match(serialized, /external_reference_digest/); assert.doesNotMatch(serialized, /credential|secret|raw|authority|delivery-2/i);
    assert.equal(result.projection.source_class, "trigger");
  });
});
