import {
  validateMemoryPolicyAccessDecisionV1,
  type MemoryPolicyAccessDecisionV1,
  type MemoryRecordV1,
} from "../native-core/memory.js";
import type {
  AsyncNativeCoreRepository,
  NativeMemoryContentRead,
  NativeMemoryRecordCommand,
  NativeMemoryRecordCommandResult,
} from "./shared-state/native-core-durable.js";

export class GovernedMemoryAccessError extends Error {
  readonly code = "ACS_MEMORY_GOVERNED_ACCESS_REJECTED";
  constructor(readonly detail: string) { super(`governed Memory access rejected: ${detail}`); this.name = "GovernedMemoryAccessError"; }
}

/** Canonical-owner validation port. A missing owner boundary fails closed. */
export interface MemoryReferenceAuthority {
  validate(input: { readonly tenantId: string; readonly scope: MemoryRecordV1["scope"] }): Promise<void>;
}

function assertDecision(decisionInput: MemoryPolicyAccessDecisionV1, record: MemoryRecordV1, operation: "write" | "read"): MemoryPolicyAccessDecisionV1 {
  const decision = validateMemoryPolicyAccessDecisionV1(decisionInput);
  if (decision.outcome !== "allowed" || decision.operation !== operation || decision.tenant_id !== record.ref.tenant_id
    || decision.memory_type !== record.memory_type || JSON.stringify(decision.scope) !== JSON.stringify(record.scope)
    || JSON.stringify(decision.policy_ref) !== JSON.stringify(record.policy_ref)) throw new GovernedMemoryAccessError("decision, Tenant, scope, type, operation, or exact Policy reference does not match");
  return decision;
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
}
