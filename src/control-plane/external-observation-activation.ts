import { createActivationCausalIdentityV1, validateActivationStateEventV1 } from "../native-core/activation.js";
import { createEvidenceRecordV2 } from "../native-core/evidence.js";
import { createNormalizedExternalObservationV1, validateNormalizedExternalObservationV1, type NormalizedExternalObservationV1 } from "../native-core/external-observation.js";
import { sha256Hex, stableStringify, type EntityRef } from "../native-core/primitives.js";
import { createEventEnvelopeV2 } from "../native-core/runtime.js";
import type { AsyncNativeCoreRepository, NativeActivationLineage } from "./shared-state/native-core-durable.js";

export interface ExternalObservationAdapterV1 {
  normalize(input: { readonly tenantId: string; readonly automationRef: NormalizedExternalObservationV1["automation_ref"]; readonly sourceClass: NormalizedExternalObservationV1["source_class"]; readonly providerRef?: EntityRef; readonly externalObservation: unknown; readonly occurredAt: number }): Promise<NormalizedExternalObservationV1>;
}

export interface ActivationExternalObservationProjectionV1 {
  readonly activation_id: string;
  readonly tenant_id: string;
  readonly automation_ref: NormalizedExternalObservationV1["automation_ref"];
  readonly source_class: NormalizedExternalObservationV1["source_class"];
  readonly observation_id: string;
  readonly adapter_ref: EntityRef;
  readonly provider_ref?: EntityRef;
  readonly external_reference_digest: string;
  readonly occurred_at: number;
}

export function projectActivationExternalObservationV1(input: { readonly activation: NativeActivationLineage; readonly observation: NormalizedExternalObservationV1 }): ActivationExternalObservationProjectionV1 {
  const identity = input.activation.head.identity;
  if (identity.tenant_id !== input.observation.tenant_id || identity.activation_id !== createActivationCausalIdentityV1({ tenant_id: input.observation.tenant_id, automation_ref: input.observation.automation_ref, source: input.observation.source }).activation_id) throw new Error("EXTERNAL_OBSERVATION_PROJECTION_MISMATCH");
  return { activation_id: identity.activation_id, tenant_id: identity.tenant_id, automation_ref: input.observation.automation_ref, source_class: input.observation.source_class, observation_id: input.observation.observation_id, adapter_ref: input.observation.adapter_ref, ...(input.observation.provider_ref ? { provider_ref: input.observation.provider_ref } : {}), external_reference_digest: input.observation.external_reference_digest, occurred_at: input.observation.occurred_at };
}

/** Composition-only ingress. Normalizers own source adaptation; nativeCore owns durable Activation creation. */
export class ExternalObservationActivationIngressV1 {
  constructor(private readonly nativeCore: AsyncNativeCoreRepository) {}
  async ingest(input: { readonly organizationId: string; readonly observation: NormalizedExternalObservationV1 }): Promise<{ readonly lineage: NativeActivationLineage; readonly projection: ActivationExternalObservationProjectionV1 }> {
    const observation = validateNormalizedExternalObservationV1(input.observation);
    const identity = createActivationCausalIdentityV1({ tenant_id: observation.tenant_id, automation_ref: observation.automation_ref, source: observation.source });
    const initial = validateActivationStateEventV1({ schema_version: "1.0", activation_state_event_id: `activation-observed:${identity.activation_id}`, activation_id: identity.activation_id, tenant_id: identity.tenant_id, sequence: 1, to_state: "observed", cause_digest: sha256Hex(stableStringify({ observation_id: observation.observation_id, source: observation.source })), observed_automation_lifecycle: "enabled", occurred_at: observation.occurred_at, provenance_refs: observation.evidence_refs });
    const sourceScope = observation.source.kind === "event"
      ? `${observation.source.issuer}:${observation.source.namespace}`
      : observation.source.kind === "channel"
        ? `${observation.source.channel_ref.kind}:${observation.source.channel_ref.id}:${observation.source.connection_ref.kind}:${observation.source.connection_ref.id}`
        : observation.source.kind === "manual"
          ? `${observation.source.actor_ref.kind}:${observation.source.actor_ref.id}`
          : (() => { throw new Error("EXTERNAL_OBSERVATION_SOURCE_UNSUPPORTED"); })();
    const eventId = `activation-created:${identity.activation_id}`;
    const lineage = await this.nativeCore.createActivation({
      identity, initialStateEvent: initial,
      idempotency: { scope: `activation.create:${identity.tenant_id}:${identity.automation_ref.automation_id}:${identity.automation_ref.revision}:${sourceScope}`, key: observation.observation_id, request_hash: sha256Hex(stableStringify(observation)) },
      event: createEventEnvelopeV2({ event_id: eventId, event_type: "activation.created", timestamp: observation.occurred_at, sequence: 1, organization_id: input.organizationId, product_domain: "acs", tenant_id: identity.tenant_id, subject_type: "activation", subject_id: identity.activation_id, actor: { kind: "service", ref: observation.adapter_ref.id }, source: "acs", correlation_id: observation.observation_id, idempotency_key: observation.observation_id, payload: { activation_id: identity.activation_id, observation_id: observation.observation_id, source_class: observation.source_class, external_reference_digest: observation.external_reference_digest } }),
      evidence: createEvidenceRecordV2({ evidence_id: `activation-observation:${identity.activation_id}`, kind: "governance", subject_ref: { kind: "activation", id: identity.activation_id }, event_ref: { kind: "event", id: eventId }, source: "acs", classification: "internal", payload_digest: observation.external_reference_digest, created_at: observation.occurred_at, provenance: { adapter_ref: observation.adapter_ref, ...(observation.provider_ref ? { provider_ref: observation.provider_ref } : {}), evidence_refs: observation.evidence_refs } }),
      outboxId: `outbox:activation-created:${identity.activation_id}`,
    });
    return { lineage, projection: projectActivationExternalObservationV1({ activation: lineage, observation }) };
  }
}

export async function normalizeAndIngestExternalObservationV1(input: { readonly adapter: ExternalObservationAdapterV1; readonly ingress: ExternalObservationActivationIngressV1; readonly organizationId: string; readonly tenantId: string; readonly automationRef: NormalizedExternalObservationV1["automation_ref"]; readonly sourceClass: NormalizedExternalObservationV1["source_class"]; readonly providerRef?: EntityRef; readonly externalObservation: unknown; readonly occurredAt: number }) {
  const normalized = await input.adapter.normalize({ tenantId: input.tenantId, automationRef: input.automationRef, sourceClass: input.sourceClass, ...(input.providerRef ? { providerRef: input.providerRef } : {}), externalObservation: input.externalObservation, occurredAt: input.occurredAt });
  return input.ingress.ingest({ organizationId: input.organizationId, observation: normalized });
}

export { createNormalizedExternalObservationV1 };
