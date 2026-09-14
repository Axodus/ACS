import type { AutomationResolutionPolicyV1, AutomationRevisionRefV1 } from "../native-core/automation.js";
import type { DelegationAuthorityResolverV1, DelegationGrantRevisionRefV1 } from "../native-core/delegation.js";
import type { RevisionRef } from "../native-core/primitives.js";
import { createActivationStateEventV1, type ActivationAdmissionHandoffV1, type ActivationClaimV1, type ActivationHeadV1 } from "../native-core/activation.js";
import type { EvidenceRecordV2 } from "../native-core/evidence.js";
import type { EventEnvelopeV2 } from "../native-core/runtime.js";
import type { Idempotency } from "../native-core/primitives.js";
import { DurableDelegationAuthorityResolverV1, type EffectiveDelegatedAuthorityV1 } from "./delegation-authority-resolver.js";
import type { AsyncNativeCoreRepository } from "./shared-state/native-core-durable.js";

export interface ExactResolvedTargetSnapshotV1 {
  readonly target_ref: RevisionRef;
  readonly effective_configuration_ref?: RevisionRef;
  readonly resolver_ref: RevisionRef;
  readonly resolver_fingerprint: string;
}

export interface AutomationTargetResolverV1 {
  resolve(input: { readonly tenantId: string; readonly automationRef: AutomationRevisionRefV1; readonly resolutionPolicy: AutomationResolutionPolicyV1; readonly activationId: string }): Promise<ExactResolvedTargetSnapshotV1>;
}

/** Composition adapter only. PINNED remains the exact Automation revision fact. */
export class ActivationTargetResolutionAdapterV1 {
  constructor(private readonly resolver?: AutomationTargetResolverV1) {}

  async resolve(input: { readonly tenantId: string; readonly automationRef: AutomationRevisionRefV1; readonly activationId: string; readonly targetMode: "PINNED" | "RESOLVED_AT_ACTIVATION"; readonly pinnedTarget?: RevisionRef; readonly resolutionPolicy?: AutomationResolutionPolicyV1 }): Promise<ExactResolvedTargetSnapshotV1> {
    if (input.tenantId !== input.automationRef.tenant_id) throw new Error("ACTIVATION_TARGET_TENANT_MISMATCH");
    if (input.targetMode === "PINNED") {
      if (!input.pinnedTarget) throw new Error("ACTIVATION_PINNED_TARGET_MISSING");
      return { target_ref: input.pinnedTarget, resolver_ref: input.pinnedTarget, resolver_fingerprint: input.pinnedTarget.fingerprint };
    }
    if (!input.resolutionPolicy || !this.resolver) throw new Error("ACTIVATION_TARGET_RESOLVER_UNAVAILABLE");
    const snapshot = await this.resolver.resolve({ tenantId: input.tenantId, automationRef: input.automationRef, resolutionPolicy: input.resolutionPolicy, activationId: input.activationId });
    if (!snapshot.target_ref || !snapshot.resolver_fingerprint) throw new Error("ACTIVATION_TARGET_RESOLUTION_INVALID");
    return snapshot;
  }
}

export interface EffectiveAuthorityContextV1 {
  readonly delegation_refs: readonly DelegationGrantRevisionRefV1[];
  readonly resolved: readonly EffectiveDelegatedAuthorityV1[];
}

export class ActivationPreparationConflictError extends Error {
  readonly code = "ACTIVATION_PREPARATION_CONFLICT";
  constructor(readonly activationId: string) {
    super(`Activation ${activationId} already has a different prepared handoff`);
    this.name = "ActivationPreparationConflictError";
  }
}

/** Composition seam over the canonical durable Delegation engine. */
export class ActivationAuthorityResolutionAdapterV1 {
  readonly #resolver: DurableDelegationAuthorityResolverV1;
  constructor(nativeCore: AsyncNativeCoreRepository, ownerResolver: DelegationAuthorityResolverV1) {
    this.#resolver = new DurableDelegationAuthorityResolverV1(nativeCore, ownerResolver);
  }
  async resolve(input: { readonly tenantId: string; readonly activationId: string; readonly delegationRequirementRefs: readonly DelegationGrantRevisionRefV1[]; readonly at: number }): Promise<EffectiveAuthorityContextV1> {
    const resolved = await Promise.all(input.delegationRequirementRefs.map(async (grant_ref) => {
      if (grant_ref.tenant_id !== input.tenantId) throw new Error("ACTIVATION_AUTHORITY_TENANT_MISMATCH");
      return this.#resolver.resolve({ grant_ref, at: input.at });
    }));
    return { delegation_refs: input.delegationRequirementRefs, resolved };
  }
}

/** Application coordinator. It owns neither target truth, authority truth, nor durable mutation mechanics. */
export class ActivationPreparationServiceV1 {
  constructor(
    private readonly nativeCore: AsyncNativeCoreRepository,
    private readonly targets: ActivationTargetResolutionAdapterV1,
    private readonly authority: ActivationAuthorityResolutionAdapterV1,
  ) {}

  async prepare(input: {
    readonly activationId: string;
    readonly tenantId: string;
    readonly claim: ActivationClaimV1;
    readonly at: number;
    readonly handoff: ActivationAdmissionHandoffV1;
    readonly event: EventEnvelopeV2;
    readonly idempotency: Idempotency;
    readonly evidence?: EvidenceRecordV2;
    readonly outboxId?: string;
    readonly deliveryKind?: string;
  }) {
    const lineage = await this.nativeCore.getActivationLineage(input.activationId, input.tenantId);
    if (lineage.head.current_state === "prepared") {
      if (lineage.handoff?.handoff_id === input.handoff.handoff_id
        && lineage.handoff.request_fingerprint === input.handoff.request_fingerprint
        && lineage.handoff.idempotency_scope === input.handoff.idempotency_scope
        && lineage.handoff.idempotency_key === input.handoff.idempotency_key) return lineage;
      throw new ActivationPreparationConflictError(input.activationId);
    }
    if (lineage.head.current_state !== "resolving") throw new Error("ACTIVATION_PREPARATION_STATE_INVALID");
    const exact = await this.exactAutomationRevision(lineage.head);
    const target = await this.targets.resolve({
      tenantId: input.tenantId, automationRef: exact.ref, activationId: input.activationId,
      targetMode: exact.target_mode, pinnedTarget: exact.pinned_target?.target_ref, resolutionPolicy: exact.resolution_policy,
    });
    const authority = await this.authority.resolve({ tenantId: input.tenantId, activationId: input.activationId, delegationRequirementRefs: exact.delegation_requirement_refs, at: input.at });
    const preparedStateEvent = createActivationStateEventV1({
      head: lineage.head, activation_state_event_id: `activation-prepared:${input.handoff.handoff_id}`, to_state: "prepared",
      cause_digest: lineage.stateEvents.at(-1)!.cause_digest, observed_automation_lifecycle: (await this.nativeCore.getAutomationLineage(exact.ref.automation_id)).head.lifecycle,
      resolution_context: { target_mode: exact.target_mode, exact_target_ref: target.target_ref, ...(target.effective_configuration_ref ? { effective_configuration_ref: target.effective_configuration_ref } : {}), ...(exact.resolution_policy ? { resolution_policy_ref: exact.resolution_policy.policy_ref } : {}) },
      authority_context: { governing_refs: exact.governing_refs, delegation_requirement_refs: authority.delegation_refs.map((ref) => ({ kind: "delegation_grant", id: ref.grant_id })), policy_decision_refs: [] },
      handoff_ref: { kind: "activation_handoff", id: input.handoff.handoff_id }, occurred_at: input.at, provenance_refs: [],
    });
    return this.nativeCore.prepareActivationHandoff({ ...input, preparedStateEvent, expectedSequence: lineage.head.state_sequence });
  }

  private async exactAutomationRevision(head: ActivationHeadV1) {
    const lineage = await this.nativeCore.getAutomationLineage(head.identity.automation_ref.automation_id);
    const exact = lineage.revisions.find((revision) => revision.ref.tenant_id === head.identity.tenant_id && revision.ref.revision === head.identity.automation_ref.revision && revision.ref.fingerprint === head.identity.automation_ref.fingerprint);
    if (!exact) throw new Error("ACTIVATION_AUTOMATION_REVISION_UNAVAILABLE");
    return exact;
  }
}
