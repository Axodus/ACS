import {
  createActivationCausalIdentityV1,
  validateActivationStateEventV1,
} from "../native-core/activation.js";
import { createEventEnvelopeV2 } from "../native-core/runtime.js";
import {
  createScheduleOccurrenceV1,
  type ScheduleDefinitionV1,
  type ScheduleOccurrenceV1,
  ScheduleContractError,
  validateScheduleDefinitionV1,
} from "../native-core/schedule.js";
import { sha256Hex, stableStringify } from "../native-core/primitives.js";
import type { AutomationRevisionV1 } from "../native-core/automation.js";
import type { AsyncNativeCoreRepository, NativeActivationLineage, NativeScheduleWatermarkV1 } from "./shared-state/native-core-durable.js";

export interface ScheduleSpecificationEvaluatorV1 {
  readonly kind: string;
  readonly version: string;
  evaluate(input: { readonly definition: ScheduleDefinitionV1; readonly fromExclusive: number; readonly through: number }): readonly number[];
}

export class ScheduleSpecificationRegistryV1 {
  readonly #evaluators = new Map<string, ScheduleSpecificationEvaluatorV1>();
  constructor(evaluators: readonly ScheduleSpecificationEvaluatorV1[]) { for (const evaluator of evaluators) this.#evaluators.set(`${evaluator.kind}@${evaluator.version}`, evaluator); }
  evaluate(input: { readonly definition: ScheduleDefinitionV1; readonly fromExclusive: number; readonly through: number }): readonly number[] {
    const evaluator = this.#evaluators.get(`${input.definition.specification.kind}@${input.definition.specification.version}`);
    if (!evaluator) throw new ScheduleContractError("SCHEDULE_FORMAT_UNAVAILABLE", `No canonical evaluator is available for ${input.definition.specification.kind}@${input.definition.specification.version}`);
    const slots = evaluator.evaluate(input);
    let previous = input.fromExclusive;
    for (const slot of slots) {
      if (!Number.isSafeInteger(slot) || slot <= previous || slot > input.through) throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", "Schedule evaluator returned unordered, duplicate, or out-of-window logical slots");
      previous = slot;
    }
    return slots;
  }
}

/** Composition seam: it delegates durable causal identity and creation to the native Activation repository. */
export class ScheduleOccurrenceActivationIngressV1 {
  constructor(private readonly nativeCore: AsyncNativeCoreRepository) {}
  async create(input: { readonly occurrence: ScheduleOccurrenceV1; readonly organizationId: string; readonly observedLifecycle: "draft" | "enabled" | "disabled" | "archived"; readonly at: number }): Promise<NativeActivationLineage> {
    const source = input.occurrence.kind === "SLOT"
      ? { kind: "schedule" as const, schedule_key: input.occurrence.schedule_key, schedule_digest: input.occurrence.schedule_digest, intended_at: input.occurrence.slot_at!, timezone: input.occurrence.timezone }
      : { kind: "system" as const, system_id: "schedule-recovery", occurrence_key: input.occurrence.occurrence_id, purpose: "coalesced-schedule-recovery" };
    const identity = createActivationCausalIdentityV1({ tenant_id: input.occurrence.tenant_id, automation_ref: input.occurrence.automation_ref, source });
    const initial = validateActivationStateEventV1({ schema_version: "1.0", activation_state_event_id: `activation-observed:${identity.activation_id}`, activation_id: identity.activation_id, tenant_id: identity.tenant_id, sequence: 1, to_state: "observed", cause_digest: sha256Hex(stableStringify(input.occurrence)), observed_automation_lifecycle: input.observedLifecycle, occurred_at: input.at, provenance_refs: [] });
    const sourceScope = input.occurrence.kind === "SLOT" ? input.occurrence.schedule_key : "schedule-recovery";
    const scope = `activation.create:${identity.tenant_id}:${identity.automation_ref.automation_id}:${identity.automation_ref.revision}:${sourceScope}`;
    return this.nativeCore.createActivation({
      identity, initialStateEvent: initial,
      idempotency: { scope, key: input.occurrence.occurrence_id, request_hash: sha256Hex(stableStringify(input.occurrence)) },
      event: createEventEnvelopeV2({ event_id: `activation-created:${identity.activation_id}`, event_type: "activation.created", timestamp: input.at, sequence: 1, organization_id: input.organizationId, product_domain: "acs", tenant_id: identity.tenant_id, subject_type: "activation", subject_id: identity.activation_id, actor: { kind: "service", ref: "schedule-recovery" }, source: "acs", correlation_id: input.occurrence.occurrence_id, idempotency_key: input.occurrence.occurrence_id, payload: { activation_id: identity.activation_id, schedule_occurrence_id: input.occurrence.occurrence_id, schedule_key: input.occurrence.schedule_key } }),
      outboxId: `outbox:activation-created:${identity.activation_id}`,
    });
  }
}

export interface ScheduleRecoveryResultV1 { readonly occurrences: readonly ScheduleOccurrenceV1[]; readonly activations: readonly NativeActivationLineage[]; readonly watermark: NativeScheduleWatermarkV1; }

/** Explicitly invoked deterministic recovery; it is not a scheduler loop or worker. */
export class ScheduleRecoveryServiceV1 {
  constructor(private readonly nativeCore: AsyncNativeCoreRepository, private readonly specifications: ScheduleSpecificationRegistryV1, private readonly ingress = new ScheduleOccurrenceActivationIngressV1(nativeCore)) {}

  async reconcile(input: { readonly tenantId: string; readonly organizationId: string; readonly automationRef: AutomationRevisionV1["ref"]; readonly scheduleKey: string; readonly through: number; readonly at: number }): Promise<ScheduleRecoveryResultV1> {
    if (input.tenantId !== input.automationRef.tenant_id) throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", "Tenant must match the exact Automation revision");
    const revision = await this.exactRevision(input.automationRef);
    const definition = this.scheduleDefinition(revision, input.scheduleKey);
    const prior = await this.nativeCore.getScheduleRecoveryWatermark({ tenantId: input.tenantId, automationRef: input.automationRef, scheduleKey: input.scheduleKey });
    const fromExclusive = prior?.covered_through ?? Math.max(0, input.through - definition.missed_work.max_lookback_ms);
    if (!Number.isSafeInteger(input.through) || input.through <= fromExclusive) throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", "Recovery cutoff must advance the durable coverage interval");
    if (input.through - fromExclusive > definition.missed_work.max_lookback_ms) throw new ScheduleContractError("SCHEDULE_RECOVERY_BOUND_INVALID", "Recovery cutoff exceeds the governed lookback bound");
    const slots = this.specifications.evaluate({ definition, fromExclusive, through: input.through });
    const selected = definition.missed_work.policy === "SKIP" ? []
      : definition.missed_work.policy === "COALESCE" ? (slots.length ? [createScheduleOccurrenceV1({ tenant_id: input.tenantId, automation_ref: input.automationRef, schedule_key: input.scheduleKey, schedule_digest: definition.semantic_digest, timezone: definition.time_basis.timezone, kind: "COALESCED_INTERVAL", interval_from_exclusive: fromExclusive, interval_through: input.through })] : [])
      : slots.map((slot) => createScheduleOccurrenceV1({ tenant_id: input.tenantId, automation_ref: input.automationRef, schedule_key: input.scheduleKey, schedule_digest: definition.semantic_digest, timezone: definition.time_basis.timezone, kind: "SLOT", slot_at: slot }));
    if (selected.length > definition.missed_work.max_occurrences_per_recovery) throw new ScheduleContractError("SCHEDULE_RECOVERY_BOUND_INVALID", "Eligible recovery materialization exceeds the governed occurrence bound");
    const activations: NativeActivationLineage[] = [];
    for (const occurrence of selected) activations.push(await this.ingress.create({ occurrence, organizationId: input.organizationId, observedLifecycle: (await this.nativeCore.getAutomationLineage(input.automationRef.automation_id)).head.lifecycle, at: input.at }));
    const nextGeneration = (prior?.recovery_generation ?? 0) + 1;
    const watermark: NativeScheduleWatermarkV1 = { schedule_watermark_id: `schedule-watermark:${sha256Hex(stableStringify({ tenant: input.tenantId, ref: input.automationRef, key: input.scheduleKey }))}`, tenant_id: input.tenantId, automation_ref: input.automationRef, schedule_key: input.scheduleKey, schedule_digest: definition.semantic_digest, time_basis: { timezone: definition.time_basis.timezone, timezone_rules_version: definition.time_basis.timezone_rules_version, policy: definition.missed_work.policy, materialized_occurrence_ids: selected.map((entry) => entry.occurrence_id), evaluated_slot_count: slots.length }, covered_through: input.through, recovery_generation: nextGeneration, state_fingerprint: sha256Hex(stableStringify({ prior: prior?.state_fingerprint, through: input.through, occurrences: selected.map((entry) => entry.occurrence_id) })), updated_at: input.at };
    const saved = await this.nativeCore.saveScheduleRecoveryWatermark({ watermark, expectedGeneration: prior?.recovery_generation ?? 0, idempotency: { scope: `activation.schedule.recover:${input.tenantId}:${input.automationRef.automation_id}:${input.automationRef.revision}:${input.scheduleKey}`, key: `schedule-recovery:${watermark.schedule_watermark_id}:${nextGeneration}`, request_hash: watermark.state_fingerprint } });
    return { occurrences: selected, activations, watermark: saved };
  }

  private async exactRevision(ref: AutomationRevisionV1["ref"]): Promise<AutomationRevisionV1> {
    const lineage = await this.nativeCore.getAutomationLineage(ref.automation_id);
    const exact = lineage.revisions.find((revision) => revision.ref.tenant_id === ref.tenant_id && revision.ref.revision === ref.revision && revision.ref.fingerprint === ref.fingerprint);
    if (!exact) throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", "Exact Automation revision is unavailable");
    return exact;
  }
  private scheduleDefinition(revision: AutomationRevisionV1, key: string): ScheduleDefinitionV1 {
    const definition = revision.definitions.find((entry) => entry.kind === "schedule" && entry.definition_key === key);
    if (!definition) throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", "Schedule definition is unavailable in the exact Automation revision");
    return validateScheduleDefinitionV1({ definition_key: definition.definition_key, ...definition.configuration });
  }
}
