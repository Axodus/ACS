import {
  createMemoryTombstoneV1,
  validateMemoryPolicyAccessDecisionV1,
  type MemoryPolicyAccessDecisionV1,
  type MemoryRecordV1,
} from "../native-core/memory.js";
import { createEvidenceRecordV2 } from "../native-core/evidence.js";
import { stableStringify, type Idempotency } from "../native-core/primitives.js";
import type { EventEnvelopeV2 } from "../native-core/runtime.js";
import type {
  AsyncNativeCoreRepository,
  NativeMemoryContentRead,
  NativeMemoryRecordCommand,
  NativeMemoryRecordCommandResult,
  NativeMemoryTombstoneCommandResult,
} from "./shared-state/native-core-durable.js";

export class GovernedMemoryAccessError extends Error {
  readonly code = "ACS_MEMORY_GOVERNED_ACCESS_REJECTED";
  constructor(readonly detail: string) { super(`governed Memory access rejected: ${detail}`); this.name = "GovernedMemoryAccessError"; }
}

/** Canonical-owner validation port. A missing owner boundary fails closed. */
export interface MemoryReferenceAuthority {
  validate(input: { readonly tenantId: string; readonly scope: MemoryRecordV1["scope"] }): Promise<void>;
}

function assertDecision(decisionInput: MemoryPolicyAccessDecisionV1, record: MemoryRecordV1, operation: "write" | "read" | "expire" | "forget"): MemoryPolicyAccessDecisionV1 {
  const decision = validateMemoryPolicyAccessDecisionV1(decisionInput);
  if (decision.outcome !== "allowed" || decision.operation !== operation || decision.tenant_id !== record.ref.tenant_id
    || decision.memory_type !== record.memory_type || stableStringify(decision.scope) !== stableStringify(record.scope)
    || stableStringify(decision.policy_ref) !== stableStringify(record.policy_ref)) throw new GovernedMemoryAccessError("decision, Tenant, scope, type, operation, or exact Policy reference does not match");
  return decision;
}

function assertSafeRetentionEvent(event: EventEnvelopeV2, record: MemoryRecordV1, idempotency: Idempotency): void {
  const allowedPayloadKeys = new Set(["fingerprint", "policy_fingerprint", "assurance"]);
  if (event.event_type !== "memory.record.retention_expired"
    || event.tenant_id !== record.ref.tenant_id || event.subject_type !== "memory_record" || event.subject_id !== record.ref.memory_id
    || event.idempotency_key !== idempotency.key || event.payload.fingerprint !== record.ref.fingerprint
    || event.payload.policy_fingerprint !== record.policy_ref.ref.fingerprint || event.payload.assurance !== "ACTIVE_STORE_DELETED"
    || Object.keys(event.payload).some((key) => !allowedPayloadKeys.has(key))) {
    throw new GovernedMemoryAccessError("retention Event does not represent the exact safe deletion fact");
  }
}

export class GovernedMemoryService {
  constructor(private readonly store: AsyncNativeCoreRepository, private readonly references: MemoryReferenceAuthority) {}

  async write(input: { readonly command: NativeMemoryRecordCommand; readonly decision: MemoryPolicyAccessDecisionV1 }): Promise<NativeMemoryRecordCommandResult> {
    const record = input.command.record;
    assertDecision(input.decision, record, "write");
    await this.references.validate({ tenantId: record.ref.tenant_id, scope: record.scope });
    return this.store.createMemoryRecord(input.command);
  }

  async retrieve(input: { readonly decision: MemoryPolicyAccessDecisionV1; readonly memoryType: MemoryRecordV1["memory_type"]; readonly scope: MemoryRecordV1["scope"]; readonly policyRef: MemoryRecordV1["policy_ref"]; readonly limit: number }): Promise<readonly NativeMemoryContentRead[]> {
    const probe = { ref:{memory_id:"governed-retrieval",tenant_id:input.scope.tenant_id,fingerprint:"0".repeat(64)}, memory_type:input.memoryType, scope:input.scope, policy_ref:input.policyRef } as MemoryRecordV1;
    const decision = assertDecision(input.decision, probe, "read");
    await this.references.validate({ tenantId: decision.tenant_id, scope: input.scope });
    const lineage = await this.store.getMemoryPolicyLineage(input.policyRef.ref.entity_id);
    const exact = lineage.revisions.find((revision) => revision.ref.revision === input.policyRef.ref.revision && revision.ref.fingerprint === input.policyRef.ref.fingerprint);
    if (!exact || exact.lifecycle !== "active" || !exact.allowed_operations.includes("read") || !exact.allowed_memory_types.includes(input.memoryType) || !exact.allowed_scope_kinds.includes(input.scope.kind as Exclude<typeof input.scope.kind, "user_context">)) throw new GovernedMemoryAccessError("exact Policy does not permit bounded retrieval");
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > exact.max_retrieval_results) throw new GovernedMemoryAccessError("requested retrieval limit exceeds exact Policy");
    const records = await this.store.listMemoryRecords({ tenantId:decision.tenant_id,policyRef:input.policyRef,scope:input.scope,limit:input.limit });
    return Promise.all(records.map((record) => this.store.readMemoryRecordContent({ memoryRef:record.ref, policyRef:input.policyRef })));
  }

  async applyRetention(input: { readonly memoryRef: MemoryRecordV1["ref"]; readonly decision: MemoryPolicyAccessDecisionV1; readonly at: number; readonly idempotency: Idempotency; readonly event: EventEnvelopeV2; readonly evidenceId: string; readonly outboxId?: string }): Promise<NativeMemoryTombstoneCommandResult> {
    const state = await this.store.getMemoryRecordState(input.memoryRef.memory_id);
    const target = state?.record ?? (state?.tombstone ? {
      ref: state.tombstone.memory_ref,
      memory_type: state.tombstone.memory_type,
      scope: state.tombstone.scope,
      policy_ref: state.tombstone.policy_ref,
    } as MemoryRecordV1 : undefined);
    if (!target || target.ref.tenant_id !== input.memoryRef.tenant_id || target.ref.fingerprint !== input.memoryRef.fingerprint) throw new GovernedMemoryAccessError("exact Memory Record is unavailable");
    const decision = assertDecision(input.decision, target, "expire");
    await this.references.validate({ tenantId: target.ref.tenant_id, scope: target.scope });
    const lineage = await this.store.getMemoryPolicyLineage(target.policy_ref.ref.entity_id);
    const policy = lineage.revisions.find((revision) => revision.ref.revision === target.policy_ref.ref.revision && revision.ref.fingerprint === target.policy_ref.ref.fingerprint);
    if (!policy || policy.lifecycle !== "active" || !policy.allowed_operations.includes("expire")) throw new GovernedMemoryAccessError("exact Policy does not permit retention deletion");
    if (input.idempotency.scope !== `memory.retention:${target.ref.memory_id}`) throw new GovernedMemoryAccessError("retention idempotency scope does not match the Record");
    assertSafeRetentionEvent(input.event, target, input.idempotency);
    if (state?.record && input.at < state.record.created_at + policy.retention.max_age_ms) throw new GovernedMemoryAccessError("Record is not eligible for retention deletion under its exact Policy");
    const tombstone = state?.tombstone ?? createMemoryTombstoneV1({memory_ref:target.ref,memory_type:target.memory_type,scope:target.scope,policy_ref:target.policy_ref,deleted_at:input.at,deletion_reason:"retention_expired",digest_retention:policy.retention.retain_content_digest?"policy_permitted":"not_retained",...(policy.retention.retain_content_digest?{retained_content_digest:state!.record!.content.content_digest}:{}),provenance_refs:[{kind:"decision",id:decision.decision_id}]});
    const evidence = createEvidenceRecordV2({evidence_id:input.evidenceId,kind:"decision",subject_ref:{kind:"memory_record",id:target.ref.memory_id},event_ref:{kind:"event",id:input.event.event_id},source:"acs",classification:"restricted",payload_digest:tombstone.retained_content_digest ?? tombstone.memory_ref.fingerprint,provenance:{decision_id:decision.decision_id,policy_ref:target.policy_ref,assurance:"ACTIVE_STORE_DELETED",content_digest_retained:tombstone.digest_retention==="policy_permitted"},created_at:input.at});
    return this.store.tombstoneMemoryRecord({tombstone,idempotency:input.idempotency,event:input.event,evidence,outboxId:input.outboxId});
  }
}
