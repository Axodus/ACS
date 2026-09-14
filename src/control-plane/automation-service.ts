import {
  applyAutomationLifecycleEventV1,
  assertAutomationHeadAdvanceV1,
  createAutomationHeadV1,
  createAutomationLifecycleEventV1,
  validateAutomationRevisionV1,
  type AutomationLifecycleEventV1,
  type AutomationLifecycleV1,
  type AutomationRevisionRefV1,
  type AutomationRevisionV1,
} from "../native-core/automation.js";
import { createEvidenceRecordV2 } from "../native-core/evidence.js";
import { sha256Hex, stableStringify, type EntityRef, type Idempotency } from "../native-core/primitives.js";
import { validateEventEnvelopeV2, type EventEnvelopeV2 } from "../native-core/runtime.js";
import type {
  AsyncNativeCoreRepository,
  NativeAutomationCommandResult,
} from "./shared-state/native-core-durable.js";

export class GovernedAutomationServiceError extends Error {
  readonly code = "ACS_GOVERNED_AUTOMATION_REJECTED";
  constructor(readonly detail: string) {
    super("governed Automation service rejected: " + detail);
    this.name = "GovernedAutomationServiceError";
  }
}

type EventInput = EventEnvelopeV2;
type CommandInput = { readonly idempotency: Idempotency; readonly event: EventInput; readonly evidenceId: string; readonly outboxId?: string; readonly deliveryKind?: string };

function semanticHash(value: unknown): string {
  return sha256Hex(stableStringify(value));
}

function assertIdempotency(idempotency: Idempotency, scope: string, semantic: unknown): void {
  if (idempotency.scope !== scope) throw new GovernedAutomationServiceError("idempotency scope is not Tenant-qualified for this Automation");
  if (idempotency.request_hash !== semanticHash(semantic)) throw new GovernedAutomationServiceError("idempotency request hash does not match the effective command");
}

function assertEvent(eventInput: EventInput, revision: AutomationRevisionV1, type: string, idempotency: Idempotency, lifecycle?: AutomationLifecycleV1): EventEnvelopeV2 {
  const event = validateEventEnvelopeV2(eventInput);
  const allowed = new Set(["automation_id", "revision", "fingerprint", ...(lifecycle ? ["lifecycle"] : [])]);
  if (event.event_type !== type || event.tenant_id !== revision.ref.tenant_id || event.subject_type !== "automation"
    || event.subject_id !== revision.ref.automation_id || event.idempotency_key !== idempotency.key
    || event.run_id !== undefined || event.task_id !== undefined || event.workforce_id !== undefined
    || event.payload.automation_id !== revision.ref.automation_id || event.payload.revision !== revision.ref.revision
    || event.payload.fingerprint !== revision.ref.fingerprint || (lifecycle && event.payload.lifecycle !== lifecycle)
    || Object.keys(event.payload).some((key) => !allowed.has(key))) {
    throw new GovernedAutomationServiceError("Event does not describe the exact non-executing Automation command");
  }
  return event;
}

function evidence(input: { readonly evidenceId: string; readonly event: EventEnvelopeV2; readonly revision: AutomationRevisionV1; readonly at: number; readonly lifecycle?: AutomationLifecycleV1 }) {
  return createEvidenceRecordV2({
    evidence_id: input.evidenceId,
    kind: "governance",
    subject_ref: { kind: "automation", id: input.revision.ref.automation_id },
    event_ref: { kind: "event", id: input.event.event_id },
    source: "acs",
    classification: "internal",
    payload_digest: input.revision.ref.fingerprint,
    created_at: input.at,
    provenance: { revision: input.revision.ref.revision, fingerprint: input.revision.ref.fingerprint, ...(input.lifecycle ? { lifecycle: input.lifecycle } : {}) },
  });
}

export class GovernedAutomationService {
  constructor(private readonly store: AsyncNativeCoreRepository) {}

  async create(input: CommandInput & { readonly revision: AutomationRevisionV1; readonly lifecycleEventId: string; readonly createdAt: number; readonly createdBy: string; readonly reason: string; readonly governingAuthorityRefs: readonly EntityRef[]; readonly approvalRefs: readonly EntityRef[]; readonly provenanceRefs: readonly EntityRef[] }): Promise<NativeAutomationCommandResult> {
    const revision = validateAutomationRevisionV1(input.revision);
    if (revision.ref.revision !== 1 || revision.predecessor_ref !== undefined) throw new GovernedAutomationServiceError("create requires the first immutable revision");
    assertIdempotency(input.idempotency, "automation:" + revision.ref.tenant_id + ":" + revision.ref.automation_id, { action: "create", revision: revision.ref });
    const event = assertEvent(input.event, revision, "automation.created", input.idempotency);
    const head = createAutomationHeadV1(revision, input.createdAt);
    const fact = {
      schema_version: head.schema_version,
      lifecycle_event_id: input.lifecycleEventId,
      automation_ref: revision.ref,
      sequence: 1,
      to_lifecycle: "draft" as const,
      transitioned_by: input.createdBy,
      transitioned_at: input.createdAt,
      reason: input.reason,
      governing_authority_refs: input.governingAuthorityRefs,
      approval_refs: input.approvalRefs,
      provenance_refs: input.provenanceRefs,
    } as AutomationLifecycleEventV1;
    return this.store.advanceAutomationRevision({ head, revision, initialLifecycleEvent: fact, expectedHead: 0, idempotency: input.idempotency, event, evidence: evidence({ evidenceId: input.evidenceId, event, revision, at: input.createdAt }), outboxId: input.outboxId, deliveryKind: input.deliveryKind });
  }

  async revise(input: CommandInput & { readonly revision: AutomationRevisionV1; readonly expectedRef: AutomationRevisionRefV1 }): Promise<NativeAutomationCommandResult> {
    const revision = validateAutomationRevisionV1(input.revision);
    const lineage = await this.store.getAutomationLineage(revision.ref.automation_id);
    if (lineage.head.tenant_id !== revision.ref.tenant_id || lineage.head.current_revision !== input.expectedRef.revision || lineage.head.current_fingerprint !== input.expectedRef.fingerprint) throw new GovernedAutomationServiceError("exact expected Automation head is unavailable");
    assertIdempotency(input.idempotency, "automation:" + revision.ref.tenant_id + ":" + revision.ref.automation_id, { action: "revise", expected: input.expectedRef, revision: revision.ref });
    const event = assertEvent(input.event, revision, "automation.revised", input.idempotency);
    const head = assertAutomationHeadAdvanceV1(lineage.head, revision, { current_revision: input.expectedRef.revision, current_fingerprint: input.expectedRef.fingerprint });
    return this.store.advanceAutomationRevision({ head, revision, expectedHead: input.expectedRef.revision, expectedFingerprint: input.expectedRef.fingerprint, idempotency: input.idempotency, event, evidence: evidence({ evidenceId: input.evidenceId, event, revision, at: revision.authored_at }), outboxId: input.outboxId, deliveryKind: input.deliveryKind });
  }

  async transition(input: CommandInput & { readonly automationId: string; readonly tenantId: string; readonly toLifecycle: AutomationLifecycleV1; readonly lifecycleEventId: string; readonly transitionedBy: string; readonly transitionedAt: number; readonly reason: string; readonly governingAuthorityRefs: readonly EntityRef[]; readonly approvalRefs: readonly EntityRef[]; readonly provenanceRefs: readonly EntityRef[] }): Promise<NativeAutomationCommandResult> {
    const lineage = await this.store.getAutomationLineage(input.automationId);
    const revision = lineage.revisions.at(-1);
    if (!revision || lineage.head.tenant_id !== input.tenantId) throw new GovernedAutomationServiceError("exact Tenant Automation head is unavailable");
    assertIdempotency(input.idempotency, "automation.lifecycle:" + input.tenantId + ":" + input.automationId, { action: "lifecycle", revision: revision.ref, from: lineage.head.lifecycle, to: input.toLifecycle });
    const type = "automation." + input.toLifecycle;
    const event = assertEvent(input.event, revision, type, input.idempotency, input.toLifecycle);
    const fact = createAutomationLifecycleEventV1({ lifecycle_event_id: input.lifecycleEventId, head: lineage.head, revision, to_lifecycle: input.toLifecycle, transitioned_by: input.transitionedBy, transitioned_at: input.transitionedAt, reason: input.reason, governing_authority_refs: input.governingAuthorityRefs, approval_refs: input.approvalRefs, provenance_refs: input.provenanceRefs });
    const head = applyAutomationLifecycleEventV1(lineage.head, fact);
    return this.store.transitionAutomationLifecycle({ head, eventFact: fact, expectedSequence: lineage.head.lifecycle_sequence, idempotency: input.idempotency, event, evidence: evidence({ evidenceId: input.evidenceId, event, revision, at: input.transitionedAt, lifecycle: input.toLifecycle }), outboxId: input.outboxId, deliveryKind: input.deliveryKind });
  }

  getLineage(automationId: string) {
    return this.store.getAutomationLineage(automationId);
  }
}
