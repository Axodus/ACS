import {
  validateGovernedRoleRevisionV2,
  NativeGovernedRoleHistoryError,
  type GovernedRoleRevisionV2,
} from "../governed-role-history.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import {
  ACS_NATIVE_SCHEMA_VERSION,
  NativeContractValidationError,
  sha256Hex,
  stableStringify,
  validateIdempotency,
  validateRevisionRef,
  type Idempotency,
} from "../../native-core/primitives.js";
import {
  validateAgentDefinitionV2,
  validateAgentRevisionV2,
  type AgentDefinitionV2,
  type AgentRevisionV2,
} from "../../native-core/agent.js";
import {
  assertIntegrationLifecycleTransition,
  validateIntegrationChannelDefinitionV1,
  validateIntegrationChannelRevisionV1,
  validateIntegrationConnectionDefinitionV1,
  validateIntegrationConnectionRevisionV1,
  type IntegrationChannelDefinitionV1,
  type IntegrationChannelRevisionV1,
  type IntegrationConnectionDefinitionV1,
  type IntegrationConnectionRevisionV1,
} from "../../native-core/integration.js";
import {
  validateAuthenticatedIntegrationIngressReferenceV1,
  type AuthenticatedIntegrationIngressReferenceV1,
} from "../../native-core/integration-ingress.js";
import {
  validateMemoryPolicyHeadV1,
  validateMemoryPolicyRevisionV1,
  validateMemoryRecordV1,
  validateMemoryTombstoneV1,
  type MemoryPolicyHeadV1,
  type MemoryPolicyRevisionV1,
  type MemoryRecordV1,
  type MemoryTombstoneV1,
} from "../../native-core/memory.js";
import {
  assertDelegationAuthorityAttenuationV1,
  DelegationResolutionError,
  validateDelegationGrantHeadV1,
  validateDelegationGrantRevisionV1,
  validateDelegationGrantRevocationV1,
  type DelegationGrantHeadV1,
  type DelegationGrantRevisionV1,
  type DelegationGrantRevocationV1,
} from "../../native-core/delegation.js";
import {
  memoryEncryptionContextDigestV1,
  MemoryCryptoUnavailableError,
  type MemoryCryptoProviderV1,
} from "../../native-core/memory-crypto.js";
import {
  validateWorkforceDefinitionV2,
  validateWorkforceRevisionV2,
  type WorkforceDefinitionV2,
  type WorkforceRevisionV2,
} from "../../native-core/workforce.js";
import {
  validateCheckpointV2,
  validateEventEnvelopeV2,
  type CheckpointV2,
  type EventEnvelopeV2,
} from "../../native-core/runtime.js";
import {
  createWorkforceRunMembershipV2,
  validateWorkforceRunAdmissionRequest,
  validateWorkforceRunMembershipV2,
  type WorkforceRunAdmissionRequest,
  type WorkforceRunAdmissionResult,
  type WorkforceRunMembershipV2,
} from "../../native-core/workforce-run-membership.js";
import {
  validateCoordinationDecisionV2,
  validateCoordinationProposalV2,
  validateTaskAssignmentV2,
  type CoordinationDecisionV2,
  type CoordinationProposalV2,
  type TaskAssignmentV2,
} from "../../native-core/coordination.js";
import {
  createRuntimeExecutionIntentV2,
  validateRuntimeCompilationRequest,
  validateRuntimeExecutionIntentV2,
  type RuntimeCompilationRequest,
  type RuntimeCompilationResult,
  type RuntimeExecutionIntentV2,
} from "../../native-core/runtime-compilation.js";
import { createAgentEffectiveConfigurationSnapshotV1 } from "../../native-core/effective-configuration.js";
import { createTaskAttemptV2, validateTaskAttemptV2, type TaskAttemptV2 } from "../../native-core/runtime.js";
import { validateRunV2, validateTaskV2, type RunV2, type TaskV2 } from "../../native-core/runtime.js";
import {
  validateEvidenceRecordV2,
  type EvidenceRecordV2,
} from "../../native-core/evidence.js";
import {
  validateCostRecordV2,
  validateUsageRecordV2,
  type CostRecordV2,
  type UsageRecordV2,
} from "../../native-core/accounting.js";
import type { DurableJobAssignment, RuntimeOwnershipInput } from "../../workers/durable-runtime-state.js";
import {
  RevisionConflictError,
  TransactionFailedError,
} from "./contracts.js";

export type NativeCoreQueryable = Pick<Pool | PoolClient, "query">;

export type NativeOutboxStatus = "pending" | "leased" | "delivered" | "retryable" | "dead_lettered";

export interface NativeDurableEvent {
  readonly streamScope: string;
  readonly event: EventEnvelopeV2;
}

export interface NativeOutboxRecord {
  readonly outboxId: string;
  readonly eventId: string;
  readonly deliveryKind: string;
  readonly status: NativeOutboxStatus;
  readonly availableAt: number;
  readonly attemptCount: number;
  readonly createdAt: number;
  readonly leaseOwner?: string;
  readonly leaseExpiresAt?: number;
  readonly deliveredAt?: number;
  readonly lastFailure?: string;
}

export interface NativeIdempotencyResult<T = unknown> {
  readonly scope: string;
  readonly key: string;
  readonly requestHash: string;
  readonly operation: string;
  readonly status: "succeeded";
  readonly result: T;
  readonly createdAt: number;
  readonly completedAt: number;
}

export interface NativeAgentLineage {
  readonly definition: AgentDefinitionV2;
  readonly revisions: readonly AgentRevisionV2[];
}

export interface NativeAgentLineageCommand {
  readonly definition: AgentDefinitionV2;
  readonly revision: AgentRevisionV2;
  readonly expectedHead: number;
  readonly idempotency: Idempotency;
  readonly event: EventEnvelopeV2;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface NativeAgentLineageCommandResult {
  readonly lineage: NativeAgentLineage;
  readonly event: NativeDurableEvent;
  readonly outbox: NativeOutboxRecord;
}

export interface NativeWorkforceLineage {
  readonly definition: WorkforceDefinitionV2;
  readonly revisions: readonly WorkforceRevisionV2[];
}

export interface NativeWorkforceLineageCommand {
  readonly definition: WorkforceDefinitionV2;
  readonly revision: WorkforceRevisionV2;
  readonly expectedHead: number;
  readonly idempotency: Idempotency;
  readonly event: EventEnvelopeV2;
  readonly authority: WorkforceMutationAuthority;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface WorkforceMutationAuthority {
  readonly decision_ref: string;
  readonly decision: "allowed";
  readonly authority_scope_ref: string;
  readonly evaluated_at: number;
}

export interface NativeWorkforceLineageCommandResult {
  readonly lineage: NativeWorkforceLineage;
  readonly event: NativeDurableEvent;
  readonly outbox: NativeOutboxRecord;
}

export interface NativeIntegrationConnectionLineage {
  readonly definition: IntegrationConnectionDefinitionV1;
  readonly revisions: readonly IntegrationConnectionRevisionV1[];
}

export interface NativeIntegrationChannelLineage {
  readonly definition: IntegrationChannelDefinitionV1;
  readonly revisions: readonly IntegrationChannelRevisionV1[];
}

export interface NativeIntegrationConnectionLineageCommand {
  readonly definition: IntegrationConnectionDefinitionV1;
  readonly revision: IntegrationConnectionRevisionV1;
  readonly expectedHead: number;
  readonly idempotency: Idempotency;
  readonly event: EventEnvelopeV2;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface NativeIntegrationChannelLineageCommand {
  readonly definition: IntegrationChannelDefinitionV1;
  readonly revision: IntegrationChannelRevisionV1;
  readonly expectedHead: number;
  readonly idempotency: Idempotency;
  readonly event: EventEnvelopeV2;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface NativeIntegrationLineageCommandResult<T> {
  readonly lineage: T;
  readonly event: NativeDurableEvent;
  readonly outbox: NativeOutboxRecord;
}

export interface NativeMemoryPolicyLineage { readonly head: MemoryPolicyHeadV1; readonly revisions: readonly MemoryPolicyRevisionV1[]; }
export interface NativeMemoryPolicyCommand { readonly head: MemoryPolicyHeadV1; readonly revision: MemoryPolicyRevisionV1; readonly expectedHead: number; readonly idempotency: Idempotency; readonly event: EventEnvelopeV2; readonly outboxId?: string; readonly deliveryKind?: string; }
export interface NativeMemoryPolicyCommandResult { readonly lineage: NativeMemoryPolicyLineage; readonly event: NativeDurableEvent; readonly outbox: NativeOutboxRecord; }
export interface NativeDelegationGrantLineage { readonly head: DelegationGrantHeadV1; readonly revisions: readonly DelegationGrantRevisionV1[]; readonly revocations: readonly DelegationGrantRevocationV1[]; }
export interface NativeDelegationGrantCommand { readonly head: DelegationGrantHeadV1; readonly revision: DelegationGrantRevisionV1; readonly expectedHead: number; readonly expectedFingerprint?: string; readonly idempotency: Idempotency; readonly event: EventEnvelopeV2; readonly evidence?: EvidenceRecordV2; readonly outboxId?: string; readonly deliveryKind?: string; }
export interface NativeDelegationGrantRevocationCommand { readonly head: DelegationGrantHeadV1; readonly revocation: DelegationGrantRevocationV1; readonly expectedHead: number; readonly expectedFingerprint: string; readonly idempotency: Idempotency; readonly event: EventEnvelopeV2; readonly evidence?: EvidenceRecordV2; readonly outboxId?: string; readonly deliveryKind?: string; }
export interface NativeDelegationGrantCommandResult { readonly lineage: NativeDelegationGrantLineage; readonly event: NativeDurableEvent; readonly evidence?: EvidenceRecordV2; readonly outbox: NativeOutboxRecord; }
export interface NativeMemoryRecordCommand { readonly record: MemoryRecordV1; readonly plaintext: string; readonly idempotency: Idempotency; readonly event: EventEnvelopeV2; readonly outboxId?: string; readonly deliveryKind?: string; }
export interface NativeMemoryRecordCommandResult { readonly record: MemoryRecordV1; readonly event: NativeDurableEvent; readonly outbox: NativeOutboxRecord; }
export interface NativeMemoryTombstoneCommand { readonly tombstone: MemoryTombstoneV1; readonly idempotency: Idempotency; readonly event: EventEnvelopeV2; readonly evidence?: EvidenceRecordV2; readonly outboxId?: string; readonly deliveryKind?: string; }
export interface NativeMemoryTombstoneCommandResult { readonly tombstone: MemoryTombstoneV1; readonly event: NativeDurableEvent; readonly evidence?: EvidenceRecordV2; readonly outbox: NativeOutboxRecord; }
/** Content-free canonical metadata used for safe application projections. */
export interface NativeMemoryRecordMetadata extends Omit<MemoryRecordV1, "content"> {}
export interface NativeMemoryRecordState { readonly metadata: NativeMemoryRecordMetadata; readonly record?: MemoryRecordV1; readonly tombstone?: MemoryTombstoneV1; }
export interface NativeMemoryContentRead { readonly record: MemoryRecordV1; readonly plaintext: string; }
export interface NativeMemoryRecordQuery { readonly tenantId: string; readonly policyRef: MemoryRecordV1["policy_ref"]; readonly scope: MemoryRecordV1["scope"]; readonly limit: number; }

export interface NativeAuthenticatedIntegrationIngressCommand {
  readonly reference: AuthenticatedIntegrationIngressReferenceV1;
  readonly event: EventEnvelopeV2;
  readonly evidence: EvidenceRecordV2;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface NativeAuthenticatedIntegrationIngressResult {
  readonly reference: AuthenticatedIntegrationIngressReferenceV1;
  readonly event: NativeDurableEvent;
  readonly evidence: EvidenceRecordV2;
  readonly outbox: NativeOutboxRecord;
}

export interface NativeWorkforceRunSummary {
  readonly run: RunV2;
  readonly membership_snapshot_id?: string;
  readonly admitted_at?: number;
}

export interface NativeFencedCheckpointCommand {
  readonly ownership: RuntimeOwnershipInput;
  readonly checkpoint: CheckpointV2;
  readonly idempotency: Idempotency;
  readonly event: EventEnvelopeV2;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface NativeFencedCheckpointCommandResult {
  readonly checkpoint: CheckpointV2;
  readonly event: NativeDurableEvent;
  readonly outbox: NativeOutboxRecord;
}

export interface NativeAccountingCommand {
  readonly usage: UsageRecordV2;
  readonly cost?: CostRecordV2;
  readonly idempotency: Idempotency;
  readonly event: EventEnvelopeV2;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface NativeAccountingCommandResult {
  readonly usage: UsageRecordV2;
  readonly cost?: CostRecordV2;
  readonly event: NativeDurableEvent;
  readonly outbox: NativeOutboxRecord;
}

export interface CoordinationProposalCommand {
  readonly proposal: CoordinationProposalV2;
  readonly task: TaskV2;
  readonly event: EventEnvelopeV2;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface CoordinationProposalCommandResult {
  readonly proposal: CoordinationProposalV2;
  readonly event: NativeDurableEvent;
  readonly outbox: NativeOutboxRecord;
}

export interface CoordinationDecisionCommand {
  readonly decision: CoordinationDecisionV2;
  readonly task: TaskV2;
  readonly proposal?: CoordinationProposalV2;
  readonly event: EventEnvelopeV2;
  readonly outboxId?: string;
  readonly deliveryKind?: string;
}

export interface CoordinationDecisionCommandResult {
  readonly decision: CoordinationDecisionV2;
  readonly assignment?: TaskAssignmentV2;
  readonly event: NativeDurableEvent;
  readonly outbox: NativeOutboxRecord;
}

export interface AsyncNativeCoreRepository {
  advanceAgentLineage(input: NativeAgentLineageCommand): Promise<NativeAgentLineageCommandResult>;
  getAgentLineage(agentId: string): Promise<NativeAgentLineage>;
  listAgentDefinitions(input?: { readonly tenantId?: string }): Promise<readonly AgentDefinitionV2[]>;
  advanceIntegrationConnectionLineage(input: NativeIntegrationConnectionLineageCommand): Promise<NativeIntegrationLineageCommandResult<NativeIntegrationConnectionLineage>>;
  getIntegrationConnectionLineage(connectionId: string): Promise<NativeIntegrationConnectionLineage>;
  listIntegrationConnectionDefinitions(input: { readonly tenantId: string }): Promise<readonly IntegrationConnectionDefinitionV1[]>;
  advanceIntegrationChannelLineage(input: NativeIntegrationChannelLineageCommand): Promise<NativeIntegrationLineageCommandResult<NativeIntegrationChannelLineage>>;
  getIntegrationChannelLineage(channelId: string): Promise<NativeIntegrationChannelLineage>;
  listIntegrationChannelDefinitions(input: { readonly tenantId: string }): Promise<readonly IntegrationChannelDefinitionV1[]>;
  recordAuthenticatedIntegrationIngress(input: NativeAuthenticatedIntegrationIngressCommand): Promise<NativeAuthenticatedIntegrationIngressResult>;
  advanceMemoryPolicy(input: NativeMemoryPolicyCommand): Promise<NativeMemoryPolicyCommandResult>;
  advanceDelegationGrant(input: NativeDelegationGrantCommand): Promise<NativeDelegationGrantCommandResult>;
  revokeDelegationGrant(input: NativeDelegationGrantRevocationCommand): Promise<NativeDelegationGrantCommandResult>;
  getDelegationGrantLineage(grantId: string): Promise<NativeDelegationGrantLineage>;
  assertDelegationGrantPathUsable(input: { readonly grantRef: DelegationGrantRevisionV1["ref"]; readonly at: number }): Promise<void>;
  getMemoryPolicyLineage(memoryPolicyId: string): Promise<NativeMemoryPolicyLineage>;
  listMemoryPolicyHeads(input: { readonly tenantId: string }): Promise<readonly MemoryPolicyHeadV1[]>;
  createMemoryRecord(input: NativeMemoryRecordCommand): Promise<NativeMemoryRecordCommandResult>;
  getMemoryRecordState(memoryId: string): Promise<NativeMemoryRecordState | undefined>;
  listMemoryRecordStates(input: { readonly tenantId: string }): Promise<readonly NativeMemoryRecordState[]>;
  listMemoryRecords(input: NativeMemoryRecordQuery): Promise<readonly MemoryRecordV1[]>;
  readMemoryRecordContent(input: { readonly memoryRef: MemoryRecordV1["ref"]; readonly policyRef: MemoryRecordV1["policy_ref"] }): Promise<NativeMemoryContentRead>;
  tombstoneMemoryRecord(input: NativeMemoryTombstoneCommand): Promise<NativeMemoryTombstoneCommandResult>;
  advanceWorkforceLineage(input: NativeWorkforceLineageCommand): Promise<NativeWorkforceLineageCommandResult>;
  getWorkforceLineage(workforceId: string): Promise<NativeWorkforceLineage>;
  listWorkforceDefinitions(): Promise<readonly WorkforceDefinitionV2[]>;
  getWorkforceRevision(workforceId: string, revision: number): Promise<WorkforceRevisionV2 | undefined>;
  listWorkforceRevisions(workforceId: string): Promise<readonly WorkforceRevisionV2[]>;
  recordGovernedRoleRevision(role: GovernedRoleRevisionV2, expectedHead: number): Promise<GovernedRoleRevisionV2>;
  getGovernedRoleRevision(roleRef: WorkforceRevisionV2["members"][number]["role_ref"]): Promise<GovernedRoleRevisionV2 | undefined>;
  getEvent(eventId: string): Promise<NativeDurableEvent | undefined>;
  replayEvents(input?: { readonly streamScope?: string; readonly afterSequence?: number }): Promise<readonly NativeDurableEvent[]>;
  listOutbox(input?: { readonly status?: NativeOutboxStatus; readonly recoverableAt?: number }): Promise<readonly NativeOutboxRecord[]>;
  claimNextOutbox(input: { readonly dispatcherId: string; readonly leaseTtlMs: number; readonly at?: number }): Promise<NativeOutboxRecord | undefined>;
  acknowledgeOutbox(input: { readonly outboxId: string; readonly dispatcherId: string; readonly at?: number }): Promise<NativeOutboxRecord>;
  retryOutbox(input: { readonly outboxId: string; readonly dispatcherId: string; readonly availableAt: number; readonly failure: string }): Promise<NativeOutboxRecord>;
  recordFencedCheckpoint(input: NativeFencedCheckpointCommand): Promise<NativeFencedCheckpointCommandResult>;
  getCheckpoint(checkpointId: string): Promise<CheckpointV2 | undefined>;
  recordEvidence(record: EvidenceRecordV2): Promise<EvidenceRecordV2>;
  listEvidence(input?: { readonly eventId?: string; readonly subjectId?: string }): Promise<readonly EvidenceRecordV2[]>;
  recordAccounting(input: NativeAccountingCommand): Promise<NativeAccountingCommandResult>;
  listUsage(runId?: string): Promise<readonly UsageRecordV2[]>;
  listCosts(usageId?: string): Promise<readonly CostRecordV2[]>;
  admitWorkforceRun(input: WorkforceRunAdmissionRequest): Promise<WorkforceRunAdmissionResult>;
  getRun(runId: string): Promise<RunV2 | undefined>;
  listWorkforceRuns(workforceId: string): Promise<readonly NativeWorkforceRunSummary[]>;
  getRunMembership(runId: string): Promise<readonly WorkforceRunMembershipV2[]>;
  listCoordinationProposals(runId: string, taskId?: string): Promise<readonly CoordinationProposalV2[]>;
  listCoordinationDecisions(runId: string, taskId?: string): Promise<readonly CoordinationDecisionV2[]>;
  recordCoordinationProposal(input: CoordinationProposalCommand): Promise<CoordinationProposalCommandResult>;
  recordCoordinationDecision(input: CoordinationDecisionCommand): Promise<CoordinationDecisionCommandResult>;
  getCurrentTaskAssignment(runId: string, taskId: string): Promise<TaskAssignmentV2 | undefined>;
  listTaskAssignments(runId: string, taskId: string): Promise<readonly TaskAssignmentV2[]>;
  compileTaskExecution(input: RuntimeCompilationRequest): Promise<RuntimeCompilationResult>;
  getExecutionIntent(intentId: string): Promise<RuntimeExecutionIntentV2 | undefined>;
  getAttempt(attemptId: string): Promise<TaskAttemptV2 | undefined>;
  listExecutionIntents(runId: string, taskId?: string): Promise<readonly RuntimeExecutionIntentV2[]>;
  listAttempts(runId: string, taskId?: string): Promise<readonly TaskAttemptV2[]>;
}

export class NativeIdempotencyConflictError extends Error {
  readonly code = "ACS_NATIVE_IDEMPOTENCY_CONFLICT";
  constructor(readonly scope: string, readonly key: string) {
    super(`native idempotency conflict for ${scope}/${key}`);
    this.name = "NativeIdempotencyConflictError";
  }
}

export class NativeLineageIntegrityError extends Error {
  readonly code = "ACS_NATIVE_LINEAGE_INTEGRITY";
  constructor(readonly agentId: string, detail: string) {
    super(`native agent lineage integrity failure for ${agentId}: ${detail}`);
    this.name = "NativeLineageIntegrityError";
  }
}

export class NativeIntegrationLineageIntegrityError extends Error {
  readonly code = "ACS_NATIVE_INTEGRATION_LINEAGE_INTEGRITY";
  constructor(readonly entityId: string, detail: string) {
    super(`native integration lineage integrity failure for ${entityId}: ${detail}`);
    this.name = "NativeIntegrationLineageIntegrityError";
  }
}

export class NativeMemoryPolicyIntegrityError extends Error {
  readonly code = "ACS_NATIVE_MEMORY_POLICY_INTEGRITY";
  constructor(readonly memoryPolicyId: string, detail: string) {
    super(`native Memory Policy integrity failure for ${memoryPolicyId}: ${detail}`);
    this.name = "NativeMemoryPolicyIntegrityError";
  }
}

export class NativeMemoryRecordIntegrityError extends Error {
  readonly code = "ACS_NATIVE_MEMORY_RECORD_INTEGRITY";
  constructor(readonly memoryId: string, detail: string) {
    super(`native Memory Record integrity failure for ${memoryId}: ${detail}`);
    this.name = "NativeMemoryRecordIntegrityError";
  }
}

export class NativeDelegationGrantIntegrityError extends Error {
  readonly code = "ACS_NATIVE_DELEGATION_GRANT_INTEGRITY";
  constructor(readonly grantId: string, detail: string) {
    super(`native Delegation Grant integrity failure for ${grantId}: ${detail}`);
    this.name = "NativeDelegationGrantIntegrityError";
  }
}

export class NativeWorkforceLineageIntegrityError extends Error {
  readonly code = "ACS_NATIVE_WORKFORCE_LINEAGE_INTEGRITY";
  constructor(readonly workforceId: string, detail: string) {
    super(`native workforce lineage integrity failure for ${workforceId}: ${detail}`);
    this.name = "NativeWorkforceLineageIntegrityError";
  }
}

export class NativeWorkforceNotFoundError extends Error {
  readonly code = "ACS_NATIVE_WORKFORCE_NOT_FOUND";
  constructor(readonly workforceId: string) {
    super(`native Workforce was not found: ${workforceId}`);
    this.name = "NativeWorkforceNotFoundError";
  }
}

export class NativeWorkforceReferenceError extends Error {
  readonly code = "ACS_NATIVE_WORKFORCE_REFERENCE_INVALID";
  constructor(readonly workforceId: string, readonly reference: string, readonly detail: string, options?: ErrorOptions) {
    super(`native workforce reference is invalid for ${workforceId}/${reference}: ${detail}`, options);
    this.name = "NativeWorkforceReferenceError";
  }
}

export class NativeRunAdmissionError extends Error {
  readonly code = "ACS_NATIVE_RUN_ADMISSION_REJECTED";
  constructor(readonly runId: string, readonly detail: string, options?: ErrorOptions) {
    super(`native Workforce Run admission rejected for ${runId}: ${detail}`, options);
    this.name = "NativeRunAdmissionError";
  }
}

export class NativeRunNotFoundError extends Error {
  readonly code = "ACS_NATIVE_RUN_NOT_FOUND";
  constructor(readonly runId: string) {
    super(`native Run was not found: ${runId}`);
    this.name = "NativeRunNotFoundError";
  }
}

export class NativeCoordinationConflictError extends Error {
  readonly code = "ACS_NATIVE_COORDINATION_CONFLICT";
  constructor(readonly runId: string, readonly taskId: string, detail: string) {
    super(`native coordination conflict for ${runId}/${taskId}: ${detail}`);
    this.name = "NativeCoordinationConflictError";
  }
}

export class NativeMemberSlotNotFoundError extends Error {
  readonly code = "ACS_NATIVE_MEMBER_SLOT_NOT_FOUND";
  constructor(readonly runId: string, readonly slotId: string) {
    super(`admitted Workforce member slot was not found: ${runId}/${slotId}`);
    this.name = "NativeMemberSlotNotFoundError";
  }
}

export class NativeStaleAssignmentError extends Error {
  readonly code = "ACS_NATIVE_STALE_ASSIGNMENT";
  constructor(readonly runId: string, readonly taskId: string, readonly assignmentId: string) {
    super(`native runtime compilation rejected stale assignment for ${runId}/${taskId}/${assignmentId}`);
    this.name = "NativeStaleAssignmentError";
  }
}

export class NativeRuntimeBindingCorruptionError extends Error {
  readonly code = "ACS_NATIVE_RUNTIME_BINDING_CORRUPTION";
  constructor(readonly attemptId: string, detail: string) {
    super(`native runtime binding is corrupt for ${attemptId}: ${detail}`);
    this.name = "NativeRuntimeBindingCorruptionError";
  }
}


export class NativeFencingError extends Error {
  readonly code = "ACS_NATIVE_FENCING_REJECTED";
  constructor(readonly jobId: string, readonly assignmentId: string, readonly fencingToken: number) {
    super(`native canonical write rejected for stale runtime ownership: ${jobId}/${assignmentId}/${fencingToken}`);
    this.name = "NativeFencingError";
  }
}

export class NativeOutboxLeaseError extends Error {
  readonly code = "ACS_NATIVE_OUTBOX_LEASE_CONFLICT";
  constructor(readonly outboxId: string, readonly dispatcherId: string) {
    super(`native outbox lease conflict for ${outboxId}/${dispatcherId}`);
    this.name = "NativeOutboxLeaseError";
  }
}

interface PayloadRow extends QueryResultRow { readonly payload: unknown; }
interface EventRow extends QueryResultRow { readonly stream_scope: string; readonly payload: unknown; }
interface IdempotencyRow extends QueryResultRow {
  readonly request_hash: string;
  readonly operation: string;
  readonly status: "succeeded";
  readonly result: unknown;
  readonly created_at: unknown;
  readonly completed_at: unknown;
}
interface HeadRow extends QueryResultRow {
  readonly revision: string | number;
  readonly native_fingerprint: string;
  readonly payload: unknown;
}
interface OutboxRow extends QueryResultRow {
  readonly outbox_id: string;
  readonly event_id: string;
  readonly delivery_kind: string;
  readonly status: NativeOutboxStatus;
  readonly available_at: unknown;
  readonly attempt_count: string | number;
  readonly created_at: unknown;
  readonly lease_owner: string | null;
  readonly lease_expires_at: unknown;
  readonly delivered_at: unknown;
  readonly last_failure: string | null;
}

function serialize(value: unknown): string {
  return stableStringify(value);
}

function decode<T>(value: unknown): T {
  return typeof value === "string" ? JSON.parse(value) as T : value as T;
}

function containsUnsafeMemoryProof(value: unknown): boolean {
  const forbidden = new Set(["plaintext", "ciphertext", "content", "raw_content", "secret", "token", "authorization", "signature", "credential", "key_material", "key_ref"]);
  if (Array.isArray(value)) return value.some((item) => containsUnsafeMemoryProof(item));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => forbidden.has(key.toLowerCase()) || containsUnsafeMemoryProof(nested));
}

function asMillis(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(String(value)).getTime();
}

function equal(left: unknown, right: unknown): boolean {
  return serialize(left) === serialize(right);
}

async function query<R extends QueryResultRow = QueryResultRow>(
  db: NativeCoreQueryable,
  operation: string,
  text: string,
  values: readonly unknown[] = [],
): Promise<QueryResult<R>> {
  try {
    return await db.query<R>(text, [...values]);
  } catch (error) {
    if (error instanceof NativeIdempotencyConflictError
      || error instanceof NativeLineageIntegrityError
      || error instanceof NativeIntegrationLineageIntegrityError
      || error instanceof NativeMemoryPolicyIntegrityError
      || error instanceof NativeMemoryRecordIntegrityError
      || error instanceof NativeDelegationGrantIntegrityError
      || error instanceof DelegationResolutionError
      || error instanceof MemoryCryptoUnavailableError
      || error instanceof NativeWorkforceLineageIntegrityError
      || error instanceof NativeWorkforceReferenceError
      || error instanceof NativeGovernedRoleHistoryError
      || error instanceof NativeFencingError
      || error instanceof NativeOutboxLeaseError
      || error instanceof NativeCoordinationConflictError
      || error instanceof NativeMemberSlotNotFoundError
      || error instanceof NativeStaleAssignmentError
      || error instanceof NativeRuntimeBindingCorruptionError
      || error instanceof RevisionConflictError
      || error instanceof NativeContractValidationError) throw error;
    throw new TransactionFailedError(operation, { cause: error });
  }
}

function requireText(value: string, field: string): void {
  if (!value.trim()) {
    throw new NativeContractValidationError("native durable command validation failed", [{
      path: field,
      code: "REQUIRED_STRING",
      message: "A non-empty string is required",
    }]);
  }
}

function requireOutboxFailureCode(value: string): void {
  if (!/^[A-Z][A-Z0-9_:-]{0,127}$/.test(value)) {
    throw new NativeContractValidationError("native outbox retry validation failed", [{
      path: "failure",
      code: "INVALID_FAILURE_CODE",
      message: "Outbox failures must be bounded non-secret reason codes",
    }]);
  }
}

function memoryScopeColumns(record: MemoryRecordV1): { readonly ownerId: string; readonly ownerRevision: number | null; readonly ownerFingerprint: string | null; readonly runId: string | null } {
  const scope = record.scope;
  if (scope.kind === "working" && scope.run_ref) return { ownerId: scope.run_ref.ref.id, ownerRevision: null, ownerFingerprint: null, runId: scope.run_ref.ref.id };
  if (scope.kind === "agent" && scope.agent_ref) return { ownerId: scope.agent_ref.ref.id, ownerRevision: null, ownerFingerprint: null, runId: null };
  if (scope.kind === "workforce_shared" && scope.workforce_revision_ref) return { ownerId: scope.workforce_revision_ref.ref.entity_id, ownerRevision: scope.workforce_revision_ref.ref.revision, ownerFingerprint: scope.workforce_revision_ref.ref.fingerprint, runId: null };
  if (scope.kind === "knowledge_backed" && scope.knowledge_ref?.ref.revision !== undefined && scope.knowledge_fingerprint) return { ownerId: scope.knowledge_ref.ref.id, ownerRevision: scope.knowledge_ref.ref.revision, ownerFingerprint: scope.knowledge_fingerprint, runId: null };
  throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "scope cannot be represented by the closed durable scope columns");
}

type EventStreamIdentity = Pick<EventEnvelopeV2, "event_type" | "agent_id" | "workforce_id" | "run_id" | "task_id" | "subject_type" | "subject_id">;

function streamScope(event: EventStreamIdentity): string {
  if (event.subject_type === "integration_connection" && event.subject_id) return `integration-connection:${event.subject_id}`;
  if (event.subject_type === "integration_channel" && event.subject_id) return `integration-channel:${event.subject_id}`;
  if (event.subject_type === "memory_policy" && event.subject_id) return `memory-policy:${event.subject_id}`;
  if (event.subject_type === "memory_record" && event.subject_id) return `memory-record:${event.subject_id}`;
  if (event.subject_type === "delegation_grant" && event.subject_id) return `delegation-grant:${event.subject_id}`;
  if (event.workforce_id && !event.run_id && !event.task_id) return `workforce:${event.workforce_id}`;
  if (event.event_type === "execution.intent_compiled" && event.run_id) return `run:${event.run_id}`;
  if (event.agent_id) return `agent:${event.agent_id}`;
  if (event.run_id) return `run:${event.run_id}`;
  if (event.task_id) return `task:${event.task_id}`;
  throw new NativeContractValidationError("native event requires a stream subject", [{
    path: "event",
    code: "MISSING_STREAM_SUBJECT",
    message: "Canonical event must identify Agent, Workforce, Run, Task, Integration, or Memory ownership",
  }]);
}

function outboxFromRow(row: OutboxRow): NativeOutboxRecord {
  return {
    outboxId: row.outbox_id,
    eventId: row.event_id,
    deliveryKind: row.delivery_kind,
    status: row.status,
    availableAt: asMillis(row.available_at) ?? 0,
    attemptCount: Number(row.attempt_count),
    createdAt: asMillis(row.created_at) ?? 0,
    ...(row.lease_owner ? { leaseOwner: row.lease_owner } : {}),
    ...(asMillis(row.lease_expires_at) !== undefined ? { leaseExpiresAt: asMillis(row.lease_expires_at) } : {}),
    ...(asMillis(row.delivered_at) !== undefined ? { deliveredAt: asMillis(row.delivered_at) } : {}),
    ...(row.last_failure ? { lastFailure: row.last_failure } : {}),
  };
}

export function validateNativeAgentLineageCommand(input: NativeAgentLineageCommand): void {
  const definition = validateAgentDefinitionV2(input.definition);
  const revision = validateAgentRevisionV2(input.revision);
  const event = validateEventEnvelopeV2(input.event);
  validateIdempotency(input.idempotency);
  if (!Number.isSafeInteger(input.expectedHead) || input.expectedHead < 0) {
    throw new NativeContractValidationError("native agent lineage command validation failed", [{ path: "expectedHead", code: "INVALID_INTEGER", message: "expectedHead must be a non-negative safe integer" }]);
  }
  if (revision.ref.entity_id !== definition.agent_id || revision.ref.revision !== definition.current_revision) {
    throw new NativeContractValidationError("native agent lineage command validation failed", [{ path: "revision.ref", code: "AGENT_HEAD_MISMATCH", message: "Revision reference must match the canonical Agent head" }]);
  }
  if (input.expectedHead === 0) {
    if (revision.ref.revision !== 1 || revision.supersedes_revision !== undefined) {
      throw new NativeContractValidationError("native agent lineage command validation failed", [{ path: "revision", code: "INVALID_ROOT_REVISION", message: "Root revision must be revision 1 without a predecessor" }]);
    }
  } else if (revision.ref.revision !== input.expectedHead + 1 || revision.supersedes_revision !== input.expectedHead) {
    throw new NativeContractValidationError("native agent lineage command validation failed", [{ path: "revision", code: "INVALID_LINEAGE_ADVANCE", message: "Revision must advance exactly one expected canonical head" }]);
  }
  if (event.agent_id !== definition.agent_id || event.sequence !== revision.ref.revision || event.organization_id !== definition.scope.organization_id || event.product_domain !== definition.scope.product_domain) {
    throw new NativeContractValidationError("native agent lineage command validation failed", [{ path: "event", code: "EVENT_LINEAGE_MISMATCH", message: "Canonical Event must describe the committed Agent revision" }]);
  }
  if (event.idempotency_key !== input.idempotency.key) {
    throw new NativeContractValidationError("native agent lineage command validation failed", [{ path: "event.idempotency_key", code: "IDEMPOTENCY_MISMATCH", message: "Event and command idempotency keys must match" }]);
  }
}

export function validateNativeWorkforceLineageCommand(input: NativeWorkforceLineageCommand): void {
  const definition = validateWorkforceDefinitionV2(input.definition);
  const revision = validateWorkforceRevisionV2(input.revision);
  const event = validateEventEnvelopeV2(input.event);
  validateIdempotency(input.idempotency);
  if (!input.authority || input.authority.decision !== "allowed"
    || typeof input.authority.decision_ref !== "string" || !input.authority.decision_ref.trim()
    || typeof input.authority.authority_scope_ref !== "string" || !input.authority.authority_scope_ref.trim()
    || !Number.isSafeInteger(input.authority.evaluated_at) || input.authority.evaluated_at < 0) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "authority", code: "AUTHORITY_REQUIRED", message: "An explicit allowed ACS authority decision is required" }]);
  }
  if (input.authority.authority_scope_ref !== definition.scope.authority_scope_ref) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "authority.authority_scope_ref", code: "AUTHORITY_SCOPE_MISMATCH", message: "Authority decision must match the Workforce scope" }]);
  }
  if (!Number.isSafeInteger(input.expectedHead) || input.expectedHead < 0) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "expectedHead", code: "INVALID_INTEGER", message: "expectedHead must be a non-negative safe integer" }]);
  }
  if (revision.ref.entity_id !== definition.workforce_id || revision.ref.revision !== definition.current_revision || revision.lifecycle_status !== definition.current_status) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "revision", code: "WORKFORCE_HEAD_MISMATCH", message: "Revision must match the canonical Workforce head and current status projection" }]);
  }
  if (input.expectedHead === 0) {
    if (revision.ref.revision !== 1 || revision.supersedes_revision !== undefined || revision.lifecycle_status !== "draft") {
      throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "revision", code: "INVALID_ROOT_REVISION", message: "Root Workforce revision must be draft revision 1 without a predecessor" }]);
    }
    if (event.event_type !== "workforce.created") {
      throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "event.event_type", code: "INVALID_EVENT_TYPE", message: "Root Workforce revision requires workforce.created" }]);
    }
  } else {
    if (revision.ref.revision !== input.expectedHead + 1 || revision.supersedes_revision !== input.expectedHead) {
      throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "revision", code: "INVALID_LINEAGE_ADVANCE", message: "Revision must advance exactly one expected Workforce head" }]);
    }
    if (!["workforce.revision.created", "workforce.lifecycle.changed"].includes(event.event_type)) {
      throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "event.event_type", code: "INVALID_EVENT_TYPE", message: "A Workforce successor requires workforce.revision.created or workforce.lifecycle.changed" }]);
    }
  }
  if (event.workforce_id !== definition.workforce_id || event.sequence !== revision.ref.revision || event.organization_id !== definition.scope.organization_id || event.product_domain !== definition.scope.product_domain) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "event", code: "EVENT_LINEAGE_MISMATCH", message: "Canonical Event must describe the committed Workforce revision" }]);
  }
  if (event.tenant_id !== definition.scope.tenant_id || event.idempotency_key !== input.idempotency.key) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "event", code: "EVENT_CONTEXT_MISMATCH", message: "Canonical Event tenant and idempotency must match the Workforce command" }]);
  }
  if (event.source !== "acs" || event.run_id !== undefined || event.task_id !== undefined
    || event.agent_id !== undefined || event.attempt !== undefined || event.workflow_id !== undefined) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "event", code: "EVENT_OWNERSHIP_MISMATCH", message: "Workforce mutation events must be ACS-owned Workforce facts without execution subjects" }]);
  }
  if (definition.updated_at !== revision.commit.committed_at || event.timestamp !== revision.commit.committed_at) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "event.timestamp", code: "COMMIT_TIMESTAMP_MISMATCH", message: "Definition, revision, and event must describe the same commit timestamp" }]);
  }
  if (event.payload.workforce_revision !== revision.ref.revision
    || event.payload.workforce_fingerprint !== revision.ref.fingerprint
    || event.payload.lifecycle_status !== revision.lifecycle_status
    || event.payload.authority_decision_ref !== input.authority.decision_ref) {
    throw new NativeContractValidationError("native workforce lineage command validation failed", [{ path: "event.payload", code: "EVENT_PAYLOAD_MISMATCH", message: "Canonical Event payload must identify the committed Workforce revision, status, and authority decision" }]);
  }
}

export function validateNativeFencedCheckpointCommand(input: NativeFencedCheckpointCommand): void {
  const checkpoint = validateCheckpointV2(input.checkpoint);
  const event = validateEventEnvelopeV2(input.event);
  validateIdempotency(input.idempotency);
  if (checkpoint.run_id !== event.run_id || checkpoint.attempt !== event.attempt) {
    throw new NativeContractValidationError("native checkpoint command validation failed", [{ path: "event", code: "CHECKPOINT_EVENT_MISMATCH", message: "Canonical Event must describe the checkpoint Run and Attempt" }]);
  }
  if (checkpoint.fencing_token !== String(input.ownership.fencingToken)
    || checkpoint.assignment_ref?.id !== input.ownership.assignmentId
    || checkpoint.lease_ref?.id !== input.ownership.leaseId) {
    throw new NativeContractValidationError("native checkpoint command validation failed", [{ path: "checkpoint", code: "CHECKPOINT_FENCING_MISMATCH", message: "Checkpoint ownership must match the fenced runtime assignment" }]);
  }
  if (event.idempotency_key !== input.idempotency.key) {
    throw new NativeContractValidationError("native checkpoint command validation failed", [{ path: "event.idempotency_key", code: "IDEMPOTENCY_MISMATCH", message: "Event and command idempotency keys must match" }]);
  }
}

export function validateNativeAccountingCommand(input: NativeAccountingCommand): void {
  const usage = validateUsageRecordV2(input.usage);
  const event = validateEventEnvelopeV2(input.event);
  validateIdempotency(input.idempotency);
  if (event.run_id !== usage.run_id || event.idempotency_key !== input.idempotency.key) {
    throw new NativeContractValidationError("native accounting command validation failed", [{ path: "event", code: "ACCOUNTING_EVENT_MISMATCH", message: "Canonical Event must describe the Usage Run and command idempotency" }]);
  }
  if (input.cost) {
    const cost = validateCostRecordV2(input.cost);
    if (cost.usage_ref.id !== usage.usage_id) {
      throw new NativeContractValidationError("native accounting command validation failed", [{ path: "cost.usage_ref", code: "USAGE_REFERENCE_MISMATCH", message: "Cost record must reference the persisted Usage record" }]);
    }
  }
}

export class PostgresNativeCoreRepository implements AsyncNativeCoreRepository {
  constructor(private readonly db: NativeCoreQueryable, private readonly options: { readonly memoryCryptoProvider?: MemoryCryptoProviderV1 } = {}) {}

  async advanceAgentLineage(input: NativeAgentLineageCommand): Promise<NativeAgentLineageCommandResult> {
    validateNativeAgentLineageCommand(input);
    return this.idempotent(input.idempotency, "native.agent.lineage.advance", async () => {
      if (input.expectedHead === 0) {
        const created = await query(this.db, "create native agent head", `
          INSERT INTO acs_agents (agent_id, revision, tenant_id, payload, record_kind, native_fingerprint)
          VALUES ($1, $2, $3, $4::jsonb, 'native_v2', $5)
          ON CONFLICT (agent_id) DO NOTHING
          RETURNING agent_id
        `, [input.definition.agent_id, input.revision.ref.revision, input.definition.scope.tenant_id ?? null, serialize(input.definition), input.revision.ref.fingerprint]);
        if ((created.rowCount ?? 0) !== 1) {
          const existing = await query<HeadRow>(this.db, "read conflicting native agent head", "SELECT revision, native_fingerprint, payload FROM acs_agents WHERE agent_id = $1", [input.definition.agent_id]);
          throw new RevisionConflictError(`native-agent:${input.definition.agent_id}`, input.expectedHead, existing.rows[0] ? Number(existing.rows[0].revision) : undefined);
        }
      } else {
        const updated = await query(this.db, "advance native agent head", `
          UPDATE acs_agents SET
            revision = $2,
            tenant_id = $3,
            payload = $4::jsonb,
            native_fingerprint = $5,
            updated_at = clock_timestamp()
          WHERE agent_id = $1 AND record_kind = 'native_v2' AND revision = $6
          RETURNING agent_id
        `, [input.definition.agent_id, input.revision.ref.revision, input.definition.scope.tenant_id ?? null, serialize(input.definition), input.revision.ref.fingerprint, input.expectedHead]);
        if ((updated.rowCount ?? 0) !== 1) {
          const existing = await query<HeadRow>(this.db, "read native agent head", "SELECT revision, native_fingerprint, payload FROM acs_agents WHERE agent_id = $1 AND record_kind = 'native_v2'", [input.definition.agent_id]);
          throw new RevisionConflictError(`native-agent:${input.definition.agent_id}`, input.expectedHead, existing.rows[0] ? Number(existing.rows[0].revision) : undefined);
        }
      }

      await query(this.db, "append immutable native agent revision", `
        INSERT INTO acs_agent_history (
          agent_id, revision, payload, record_kind, native_fingerprint, supersedes_revision,
          created_by, committed_at, change_reason, correlation_id, event_id
        ) VALUES ($1, $2, $3::jsonb, 'native_v2', $4, $5, $6, to_timestamp($7 / 1000.0), $8, $9, $10)
      `, [
        input.definition.agent_id,
        input.revision.ref.revision,
        serialize(input.revision),
        input.revision.ref.fingerprint,
        input.revision.supersedes_revision ?? null,
        input.revision.commit.created_by,
        input.revision.commit.committed_at,
        input.revision.commit.change_reason,
        input.event.correlation_id,
        input.event.event_id,
      ]);
      const event = await this.appendEvent(input.event);
      const outbox = await this.insertOutbox(event.event.event_id, input.outboxId, input.deliveryKind, input.event.timestamp);
      const lineage = await this.getAgentLineage(input.definition.agent_id);
      return { lineage, event, outbox };
    });
  }

  async getAgentLineage(agentId: string): Promise<NativeAgentLineage> {
    const head = await query<HeadRow>(this.db, "get native agent head", `
      SELECT revision, native_fingerprint, payload FROM acs_agents
      WHERE agent_id = $1 AND record_kind = 'native_v2' FOR SHARE
    `, [agentId]);
    if (!head.rows[0]) throw new NativeLineageIntegrityError(agentId, "canonical head is missing");
    const history = await query<PayloadRow>(this.db, "get native agent history", `
      SELECT payload FROM acs_agent_history
      WHERE agent_id = $1 AND record_kind = 'native_v2'
      ORDER BY revision
    `, [agentId]);
    const definition = validateAgentDefinitionV2(decode<AgentDefinitionV2>(head.rows[0].payload));
    const revisions = history.rows.map((row) => validateAgentRevisionV2(decode<AgentRevisionV2>(row.payload)));
    if (definition.agent_id !== agentId || definition.current_revision !== Number(head.rows[0].revision)) {
      throw new NativeLineageIntegrityError(agentId, "head payload and head revision diverge");
    }
    if (revisions.length !== definition.current_revision) throw new NativeLineageIntegrityError(agentId, "revision history is not contiguous");
    revisions.forEach((revision, index) => {
      const expectedRevision = index + 1;
      if (revision.ref.entity_id !== agentId || revision.ref.revision !== expectedRevision) {
        throw new NativeLineageIntegrityError(agentId, `invalid revision at position ${expectedRevision}`);
      }
      if (expectedRevision === 1 && revision.supersedes_revision !== undefined) {
        throw new NativeLineageIntegrityError(agentId, "root revision has a predecessor");
      }
      if (expectedRevision > 1 && revision.supersedes_revision !== expectedRevision - 1) {
        throw new NativeLineageIntegrityError(agentId, `revision ${expectedRevision} has an invalid predecessor`);
      }
    });
    const current = revisions.at(-1);
    if (!current || current.ref.fingerprint !== head.rows[0].native_fingerprint) {
      throw new NativeLineageIntegrityError(agentId, "head fingerprint diverges from immutable history");
    }
    return { definition, revisions };
  }

  async listAgentDefinitions(input: { readonly tenantId?: string } = {}): Promise<readonly AgentDefinitionV2[]> {
    const result = await query<PayloadRow>(this.db, "list native agent definitions", `
      SELECT payload FROM acs_agents
      WHERE record_kind = 'native_v2'
        AND ($1::text IS NULL OR tenant_id = $1)
      ORDER BY agent_id
    `, [input.tenantId ?? null]);
    return result.rows.map((row) => validateAgentDefinitionV2(decode<AgentDefinitionV2>(row.payload)));
  }

  async advanceIntegrationConnectionLineage(input: NativeIntegrationConnectionLineageCommand): Promise<NativeIntegrationLineageCommandResult<NativeIntegrationConnectionLineage>> {
    const definition = validateIntegrationConnectionDefinitionV1(input.definition);
    const revision = validateIntegrationConnectionRevisionV1(input.revision);
    validateIdempotency(input.idempotency);
    const event = validateEventEnvelopeV2(input.event);
    if (definition.connection_id !== revision.ref.entity_id || definition.current_revision !== revision.ref.revision || definition.tenant_id !== event.tenant_id || event.subject_type !== "integration_connection" || event.subject_id !== definition.connection_id || event.payload.revision !== revision.ref.revision || event.payload.fingerprint !== revision.ref.fingerprint || input.expectedHead !== revision.ref.revision - 1) {
      throw new NativeIntegrationLineageIntegrityError(definition.connection_id, "command identity, tenant, or expected head is invalid");
    }
    if (input.idempotency.scope !== `integration.connection:${definition.connection_id}`) throw new NativeIntegrationLineageIntegrityError(definition.connection_id, "idempotency scope must be aggregate-specific");
    return this.idempotent(input.idempotency, "native.integration.connection.lineage.advance", async () => {
      await query(this.db, "lock integration connection lineage", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`integration-connection:${definition.connection_id}`]);
      const head = await query<HeadRow>(this.db, "read integration connection head", "SELECT current_revision AS revision, current_fingerprint AS native_fingerprint FROM acs_integration_connections WHERE connection_id = $1 FOR UPDATE", [definition.connection_id]);
      const current = head.rows[0] ? Number(head.rows[0].revision) : 0;
      if (current !== input.expectedHead) throw new RevisionConflictError(`integration-connection:${definition.connection_id}`, input.expectedHead, current);
      if (current > 0) {
        const prior = await this.getIntegrationConnectionLineage(definition.connection_id);
        assertIntegrationLifecycleTransition("connection", prior.definition.lifecycle, definition.lifecycle);
      }
      const durableEvent = await this.appendEvent(event);
      if (current === 0) {
        await query(this.db, "create integration connection head", `INSERT INTO acs_integration_connections (connection_id, tenant_id, current_revision, current_lifecycle, current_fingerprint, connector_definition_ref, payload, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,to_timestamp($8/1000.0),to_timestamp($9/1000.0))`, [definition.connection_id, definition.tenant_id, definition.current_revision, definition.lifecycle, revision.ref.fingerprint, definition.connector_definition_ref, serialize(definition), definition.created_at, definition.updated_at]);
      } else {
        await query(this.db, "advance integration connection head", `UPDATE acs_integration_connections SET current_revision=$2,current_lifecycle=$3,current_fingerprint=$4,connector_definition_ref=$5,payload=$6::jsonb,updated_at=to_timestamp($7/1000.0) WHERE connection_id=$1`, [definition.connection_id, definition.current_revision, definition.lifecycle, revision.ref.fingerprint, definition.connector_definition_ref, serialize(definition), definition.updated_at]);
      }
      await query(this.db, "append integration connection revision", `INSERT INTO acs_integration_connection_revisions (connection_id,tenant_id,revision,fingerprint,supersedes_revision,lifecycle,connector_definition_ref,credential_ref,credential_version,secret_store_ref,payload,created_by,committed_at,change_reason,correlation_id,event_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,to_timestamp($13/1000.0),$14,$15,$16)`, [definition.connection_id, definition.tenant_id, revision.ref.revision, revision.ref.fingerprint, revision.supersedes_revision ?? null, revision.lifecycle, revision.connector_definition_ref, revision.credential_ref?.credential_ref ?? null, revision.credential_ref?.credential_version ?? null, revision.credential_ref?.secret_store_ref ?? null, serialize(revision), revision.commit.created_by, revision.commit.committed_at, revision.commit.change_reason, event.correlation_id, event.event_id]);
      const outbox = await this.insertOutbox(durableEvent.event.event_id, input.outboxId, input.deliveryKind, event.timestamp);
      return { lineage: await this.getIntegrationConnectionLineage(definition.connection_id), event: durableEvent, outbox };
    });
  }

  async getIntegrationConnectionLineage(connectionId: string): Promise<NativeIntegrationConnectionLineage> {
    const head = await query<PayloadRow>(this.db, "get integration connection head", "SELECT payload FROM acs_integration_connections WHERE connection_id=$1", [connectionId]);
    const revisions = await query<PayloadRow>(this.db, "get integration connection history", "SELECT payload FROM acs_integration_connection_revisions WHERE connection_id=$1 ORDER BY revision", [connectionId]);
    if (!head.rows[0] || revisions.rows.length === 0) throw new NativeIntegrationLineageIntegrityError(connectionId, "canonical head or immutable history is missing");
    const definition = validateIntegrationConnectionDefinitionV1(decode(head.rows[0].payload));
    const history = revisions.rows.map((row) => validateIntegrationConnectionRevisionV1(decode(row.payload)));
    const current = history.at(-1);
    if (!current || definition.current_revision !== current.ref.revision || definition.connection_id !== current.ref.entity_id || definition.lifecycle !== current.lifecycle) throw new NativeIntegrationLineageIntegrityError(connectionId, "head and immutable history diverge");
    history.forEach((revision, index) => {
      if (revision.ref.entity_id !== connectionId || revision.ref.revision !== index + 1 || (index === 0 ? revision.supersedes_revision !== undefined : revision.supersedes_revision !== index)) throw new NativeIntegrationLineageIntegrityError(connectionId, "revision history is not contiguous");
    });
    return { definition, revisions: history };
  }

  async listIntegrationConnectionDefinitions(input: { readonly tenantId: string }): Promise<readonly IntegrationConnectionDefinitionV1[]> {
    const result = await query<PayloadRow>(this.db, "list integration Connection definitions", "SELECT payload FROM acs_integration_connections WHERE tenant_id=$1 ORDER BY connection_id", [input.tenantId]);
    return result.rows.map((row) => validateIntegrationConnectionDefinitionV1(decode(row.payload)));
  }

  async advanceIntegrationChannelLineage(input: NativeIntegrationChannelLineageCommand): Promise<NativeIntegrationLineageCommandResult<NativeIntegrationChannelLineage>> {
    const definition = validateIntegrationChannelDefinitionV1(input.definition);
    const revision = validateIntegrationChannelRevisionV1(input.revision);
    validateIdempotency(input.idempotency);
    const event = validateEventEnvelopeV2(input.event);
    if (definition.channel_id !== revision.ref.entity_id || definition.current_revision !== revision.ref.revision || definition.tenant_id !== event.tenant_id || event.subject_type !== "integration_channel" || event.subject_id !== definition.channel_id || event.payload.revision !== revision.ref.revision || event.payload.fingerprint !== revision.ref.fingerprint || input.expectedHead !== revision.ref.revision - 1 || event.run_id !== undefined) throw new NativeIntegrationLineageIntegrityError(definition.channel_id, "command identity, tenant, expected head, event ownership, provenance, or execution boundary is invalid");
    if (input.idempotency.scope !== `integration.channel:${definition.channel_id}`) throw new NativeIntegrationLineageIntegrityError(definition.channel_id, "idempotency scope must be aggregate-specific");
    return this.idempotent(input.idempotency, "native.integration.channel.lineage.advance", async () => {
      await query(this.db, "lock integration channel lineage", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`integration-channel:${definition.channel_id}`]);
      const connection = await query<{ readonly tenant_id: string; readonly fingerprint: string } & QueryResultRow>(this.db, "validate channel connection historical reference", "SELECT tenant_id, fingerprint FROM acs_integration_connection_revisions WHERE connection_id=$1 AND revision=$2 AND fingerprint=$3", [revision.connection_revision_ref.entity_id, revision.connection_revision_ref.revision, revision.connection_revision_ref.fingerprint]);
      if (!connection.rows[0] || connection.rows[0].tenant_id !== definition.tenant_id) throw new NativeIntegrationLineageIntegrityError(definition.channel_id, "referenced Connection revision is unavailable or cross-tenant");
      const head = await query<HeadRow>(this.db, "read integration channel head", "SELECT current_revision AS revision, current_fingerprint AS native_fingerprint FROM acs_integration_channels WHERE channel_id = $1 FOR UPDATE", [definition.channel_id]);
      const current = head.rows[0] ? Number(head.rows[0].revision) : 0;
      if (current !== input.expectedHead) throw new RevisionConflictError(`integration-channel:${definition.channel_id}`, input.expectedHead, current);
      if (current > 0) {
        const prior = await this.getIntegrationChannelLineage(definition.channel_id);
        assertIntegrationLifecycleTransition("channel", prior.definition.lifecycle, definition.lifecycle);
      }
      if (definition.lifecycle === "active") {
        const duplicate = await query<{ readonly channel_id: string } & QueryResultRow>(this.db, "check active Channel endpoint uniqueness", `
          SELECT h.channel_id
          FROM acs_integration_channels h
          JOIN acs_integration_channel_revisions r
            ON r.channel_id = h.channel_id AND r.revision = h.current_revision AND r.fingerprint = h.current_fingerprint
          WHERE h.tenant_id = $1 AND h.current_lifecycle = 'active'
            AND r.connection_id = $2 AND r.endpoint_kind = $3 AND r.endpoint_uri = $4 AND h.channel_id <> $5
          LIMIT 1
          FOR SHARE
        `, [definition.tenant_id, revision.connection_revision_ref.entity_id, revision.endpoint.kind, revision.endpoint.uri, definition.channel_id]);
        if (duplicate.rows[0]) throw new NativeIntegrationLineageIntegrityError(definition.channel_id, `active endpoint is already owned by Channel ${duplicate.rows[0].channel_id}`);
      }
      const durableEvent = await this.appendEvent(event);
      if (current === 0) await query(this.db, "create integration channel head", `INSERT INTO acs_integration_channels (channel_id,tenant_id,current_revision,current_lifecycle,current_fingerprint,payload,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,to_timestamp($7/1000.0),to_timestamp($8/1000.0))`, [definition.channel_id, definition.tenant_id, definition.current_revision, definition.lifecycle, revision.ref.fingerprint, serialize(definition), definition.created_at, definition.updated_at]);
      else await query(this.db, "advance integration channel head", `UPDATE acs_integration_channels SET current_revision=$2,current_lifecycle=$3,current_fingerprint=$4,payload=$5::jsonb,updated_at=to_timestamp($6/1000.0) WHERE channel_id=$1`, [definition.channel_id, definition.current_revision, definition.lifecycle, revision.ref.fingerprint, serialize(definition), definition.updated_at]);
      await query(this.db, "append integration channel revision", `INSERT INTO acs_integration_channel_revisions (channel_id,tenant_id,revision,fingerprint,supersedes_revision,lifecycle,connection_id,connection_revision,connection_fingerprint,direction,endpoint_kind,endpoint_uri,admission_policy_ref,payload,created_by,committed_at,change_reason,correlation_id,event_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,to_timestamp($16/1000.0),$17,$18,$19)`, [definition.channel_id, definition.tenant_id, revision.ref.revision, revision.ref.fingerprint, revision.supersedes_revision ?? null, revision.lifecycle, revision.connection_revision_ref.entity_id, revision.connection_revision_ref.revision, revision.connection_revision_ref.fingerprint, revision.direction, revision.endpoint.kind, revision.endpoint.uri, revision.admission_policy_ref ?? null, serialize(revision), revision.commit.created_by, revision.commit.committed_at, revision.commit.change_reason, event.correlation_id, event.event_id]);
      const outbox = await this.insertOutbox(durableEvent.event.event_id, input.outboxId, input.deliveryKind, event.timestamp);
      return { lineage: await this.getIntegrationChannelLineage(definition.channel_id), event: durableEvent, outbox };
    });
  }

  async getIntegrationChannelLineage(channelId: string): Promise<NativeIntegrationChannelLineage> {
    const head = await query<PayloadRow>(this.db, "get integration channel head", "SELECT payload FROM acs_integration_channels WHERE channel_id=$1", [channelId]);
    const revisions = await query<PayloadRow>(this.db, "get integration channel history", "SELECT payload FROM acs_integration_channel_revisions WHERE channel_id=$1 ORDER BY revision", [channelId]);
    if (!head.rows[0] || revisions.rows.length === 0) throw new NativeIntegrationLineageIntegrityError(channelId, "canonical head or immutable history is missing");
    const definition = validateIntegrationChannelDefinitionV1(decode(head.rows[0].payload));
    const history = revisions.rows.map((row) => validateIntegrationChannelRevisionV1(decode(row.payload)));
    const current = history.at(-1);
    if (!current || definition.current_revision !== current.ref.revision || definition.channel_id !== current.ref.entity_id || definition.lifecycle !== current.lifecycle) throw new NativeIntegrationLineageIntegrityError(channelId, "head and immutable history diverge");
    history.forEach((revision, index) => {
      if (revision.ref.entity_id !== channelId || revision.ref.revision !== index + 1 || (index === 0 ? revision.supersedes_revision !== undefined : revision.supersedes_revision !== index)) throw new NativeIntegrationLineageIntegrityError(channelId, "revision history is not contiguous");
    });
    return { definition, revisions: history };
  }

  async listIntegrationChannelDefinitions(input: { readonly tenantId: string }): Promise<readonly IntegrationChannelDefinitionV1[]> {
    const result = await query<PayloadRow>(this.db, "list integration Channel definitions", "SELECT payload FROM acs_integration_channels WHERE tenant_id=$1 ORDER BY channel_id", [input.tenantId]);
    return result.rows.map((row) => validateIntegrationChannelDefinitionV1(decode(row.payload)));
  }

  async recordAuthenticatedIntegrationIngress(input: NativeAuthenticatedIntegrationIngressCommand): Promise<NativeAuthenticatedIntegrationIngressResult> {
    const reference = validateAuthenticatedIntegrationIngressReferenceV1(input.reference);
    const event = validateEventEnvelopeV2(input.event);
    const evidence = validateEvidenceRecordV2(input.evidence);
    if (event.event_type !== "integration.channel.ingress_authenticated" || event.subject_type !== "integration_channel" || event.subject_id !== reference.channel_revision_ref.entity_id || event.tenant_id !== reference.tenant_id || event.run_id !== undefined || event.task_id !== undefined || event.agent_id !== undefined || event.workforce_id !== undefined) {
      throw new NativeContractValidationError("authenticated integration ingress command validation failed", [{ path: "event", code: "INGRESS_EVENT_BOUNDARY", message: "Ingress observation must be Channel-scoped and cannot carry an execution subject" }]);
    }
    if (event.payload.ingress_ref !== reference.ingress_ref || event.payload.channel_revision_ref !== serialize(reference.channel_revision_ref) || event.payload.connection_revision_ref !== serialize(reference.connection_revision_ref) || event.payload.payload_digest !== reference.payload_digest || event.payload.authentication_method !== reference.authentication_method) {
      throw new NativeContractValidationError("authenticated integration ingress command validation failed", [{ path: "event.payload", code: "INGRESS_PROVENANCE_MISMATCH", message: "Event must carry exact safe ingress provenance" }]);
    }
    if (evidence.event_ref.id !== event.event_id || evidence.subject_ref.kind !== "integration_channel" || evidence.subject_ref.id !== reference.channel_revision_ref.entity_id || evidence.payload_digest !== reference.payload_digest || evidence.run_id !== undefined || evidence.task_id !== undefined || evidence.provenance?.ingress_ref !== reference.ingress_ref || evidence.provenance?.authentication_method !== reference.authentication_method) {
      throw new NativeContractValidationError("authenticated integration ingress command validation failed", [{ path: "evidence", code: "INGRESS_EVIDENCE_MISMATCH", message: "Evidence must describe the same safe authenticated ingress observation" }]);
    }
    const durableEvent = await this.appendEvent(event);
    const persistedEvidence = await this.recordEvidence(evidence);
    const outbox = await this.insertOutbox(durableEvent.event.event_id, input.outboxId, input.deliveryKind, event.timestamp);
    return { reference, event: durableEvent, evidence: persistedEvidence, outbox };
  }

  async advanceMemoryPolicy(input: NativeMemoryPolicyCommand): Promise<NativeMemoryPolicyCommandResult> {
    const head = validateMemoryPolicyHeadV1(input.head);
    const revision = validateMemoryPolicyRevisionV1(input.revision);
    const event = validateEventEnvelopeV2(input.event);
    validateIdempotency(input.idempotency);
    if (head.memory_policy_id !== revision.ref.entity_id || head.tenant_id !== revision.tenant_id
      || head.current_revision !== revision.ref.revision || head.current_fingerprint !== revision.ref.fingerprint
      || head.lifecycle !== revision.lifecycle || input.expectedHead !== revision.ref.revision - 1
      || event.tenant_id !== head.tenant_id || event.subject_type !== "memory_policy" || event.subject_id !== head.memory_policy_id
      || event.idempotency_key !== input.idempotency.key || event.payload.revision !== revision.ref.revision || event.payload.fingerprint !== revision.ref.fingerprint) {
      throw new NativeMemoryPolicyIntegrityError(head.memory_policy_id, "head, revision, Event, Tenant, or expected CAS revision is invalid");
    }
    if (input.idempotency.scope !== `memory.policy:${head.memory_policy_id}`) throw new NativeMemoryPolicyIntegrityError(head.memory_policy_id, "idempotency scope must be policy-specific");
    return this.idempotent(input.idempotency, "native.memory.policy.advance", async () => {
      await query(this.db, "lock Memory Policy lineage", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`memory-policy:${head.memory_policy_id}`]);
      const existing = await query<HeadRow>(this.db, "read Memory Policy head", "SELECT current_revision AS revision, current_fingerprint AS native_fingerprint, payload FROM acs_memory_policies WHERE memory_policy_id=$1 FOR UPDATE", [head.memory_policy_id]);
      const current = existing.rows[0] ? Number(existing.rows[0].revision) : 0;
      if (current !== input.expectedHead) throw new RevisionConflictError(`memory-policy:${head.memory_policy_id}`, input.expectedHead, current);
      if (current === 0) {
        await query(this.db, "create Memory Policy head", `INSERT INTO acs_memory_policies (memory_policy_id,tenant_id,current_revision,current_fingerprint,current_lifecycle,payload,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,to_timestamp($7/1000.0),to_timestamp($8/1000.0))`, [head.memory_policy_id,head.tenant_id,head.current_revision,head.current_fingerprint,head.lifecycle,serialize(head),head.created_at,head.updated_at]);
      } else {
        await query(this.db, "advance Memory Policy head", `UPDATE acs_memory_policies SET current_revision=$2,current_fingerprint=$3,current_lifecycle=$4,payload=$5::jsonb,updated_at=to_timestamp($6/1000.0) WHERE memory_policy_id=$1`, [head.memory_policy_id,head.current_revision,head.current_fingerprint,head.lifecycle,serialize(head),head.updated_at]);
      }
      const durableEvent = await this.appendEvent(event);
      await query(this.db, "append immutable Memory Policy revision", `INSERT INTO acs_memory_policy_revisions (memory_policy_id,tenant_id,revision,fingerprint,supersedes_revision,lifecycle,policy_contract,payload,created_by,committed_at,change_reason,correlation_id,event_id) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,to_timestamp($10/1000.0),$11,$12,$13)`, [head.memory_policy_id,head.tenant_id,revision.ref.revision,revision.ref.fingerprint,revision.supersedes_revision ?? null,revision.lifecycle,serialize({allowed_memory_types:revision.allowed_memory_types,allowed_scope_kinds:revision.allowed_scope_kinds,allowed_operations:revision.allowed_operations,retention:revision.retention}),serialize(revision),revision.created_by,revision.created_at,revision.change_reason,event.correlation_id,event.event_id]);
      const outbox = await this.insertOutbox(durableEvent.event.event_id, input.outboxId, input.deliveryKind, event.timestamp);
      return { lineage: await this.getMemoryPolicyLineage(head.memory_policy_id), event: durableEvent, outbox };
    });
  }

  async advanceDelegationGrant(input: NativeDelegationGrantCommand): Promise<NativeDelegationGrantCommandResult> {
    const head = validateDelegationGrantHeadV1(input.head); const revision = validateDelegationGrantRevisionV1(input.revision); const event = validateEventEnvelopeV2(input.event); validateIdempotency(input.idempotency);
    if (head.grant_id !== revision.ref.grant_id || head.tenant_id !== revision.ref.tenant_id || head.current_revision !== revision.ref.revision || head.current_fingerprint !== revision.ref.fingerprint || head.lifecycle !== "active" || input.expectedHead !== revision.ref.revision - 1 || event.tenant_id !== head.tenant_id || event.subject_type !== "delegation_grant" || event.subject_id !== head.grant_id || event.idempotency_key !== input.idempotency.key || event.run_id !== undefined || event.task_id !== undefined || event.workforce_id !== undefined) throw new NativeDelegationGrantIntegrityError(head.grant_id, "head, revision, Event, Tenant, or execution boundary is invalid");
    if (input.idempotency.scope !== `delegation.grant:${head.tenant_id}:${head.grant_id}`) throw new NativeDelegationGrantIntegrityError(head.grant_id, "idempotency scope must be Tenant-qualified and aggregate-specific");
    return this.idempotent(input.idempotency, "native.delegation.grant.advance", async () => {
      await query(this.db, "lock Delegation Grant head", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`delegation-grant:${head.grant_id}`]);
      const existing = await query<HeadRow & QueryResultRow>(this.db, "read Delegation Grant head", "SELECT current_revision AS revision,current_fingerprint AS native_fingerprint,payload FROM acs_delegation_grants WHERE grant_id=$1 FOR UPDATE", [head.grant_id]);
      const current = existing.rows[0] ? Number(existing.rows[0].revision) : 0;
      if (current !== input.expectedHead || (current > 0 && existing.rows[0]?.native_fingerprint !== input.expectedFingerprint)) throw new RevisionConflictError(`delegation-grant:${head.grant_id}`, input.expectedHead, current);
      if (current > 0 && decode<DelegationGrantHeadV1>(existing.rows[0]!.payload).lifecycle !== "active") throw new NativeDelegationGrantIntegrityError(head.grant_id, "revoked or superseded Grant cannot receive a successor");
      if (revision.parent_grant_ref) await this.assertDelegationParentForNewRevision(revision);
      const durableEvent = await this.appendEvent(event);
      if (current === 0) await query(this.db, "create Delegation Grant head", `INSERT INTO acs_delegation_grants (grant_id,tenant_id,current_revision,current_fingerprint,lifecycle,valid_from,expires_at,payload,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,to_timestamp($6/1000.0),to_timestamp($7/1000.0),$8::jsonb,to_timestamp($9/1000.0),to_timestamp($10/1000.0))`, [head.grant_id,head.tenant_id,head.current_revision,head.current_fingerprint,head.lifecycle,head.valid_from,head.expires_at,serialize(head),head.created_at,head.updated_at]);
      else await query(this.db, "advance Delegation Grant head", `UPDATE acs_delegation_grants SET current_revision=$2,current_fingerprint=$3,lifecycle=$4,valid_from=to_timestamp($5/1000.0),expires_at=to_timestamp($6/1000.0),payload=$7::jsonb,updated_at=to_timestamp($8/1000.0) WHERE grant_id=$1`, [head.grant_id,head.current_revision,head.current_fingerprint,head.lifecycle,head.valid_from,head.expires_at,serialize(head),head.updated_at]);
      await query(this.db, "append immutable Delegation Grant revision", `INSERT INTO acs_delegation_grant_revisions (grant_id,tenant_id,revision,fingerprint,delegator_agent_id,delegator_agent_revision,delegator_agent_fingerprint,delegate_agent_id,delegate_agent_revision,delegate_agent_fingerprint,authority_bounds,governing_authority_refs,governing_policy_refs,approval_refs,provenance_refs,parent_grant_id,parent_tenant_id,parent_revision,parent_fingerprint,ancestry,ancestry_digest,depth,onward_delegation_allowed,max_delegation_depth,valid_from,expires_at,issued_by,issued_at,reason,correlation_id,event_id,payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$20::jsonb,$21,$22,$23,$24,to_timestamp($25/1000.0),to_timestamp($26/1000.0),$27,to_timestamp($28/1000.0),$29,$30,$31,$32::jsonb)`, [head.grant_id,head.tenant_id,revision.ref.revision,revision.ref.fingerprint,revision.delegator.agent_id,revision.delegator.revision_ref.revision,revision.delegator.revision_ref.fingerprint,revision.delegate.agent_id,revision.delegate.revision_ref.revision,revision.delegate.revision_ref.fingerprint,serialize(revision.authority_bounds),serialize(revision.governing_authority_refs),serialize(revision.governing_policy_refs),serialize(revision.approval_refs),serialize(revision.provenance_refs),revision.parent_grant_ref?.grant_id ?? null,revision.parent_grant_ref?.tenant_id ?? null,revision.parent_grant_ref?.revision ?? null,revision.parent_grant_ref?.fingerprint ?? null,serialize(revision.ancestry_grant_refs),sha256Hex(serialize(revision.ancestry_grant_refs)),revision.depth,revision.onward_delegation_allowed,revision.max_delegation_depth,revision.valid_from,revision.expires_at,revision.issued_by,revision.issued_at,revision.reason,event.correlation_id,event.event_id,serialize(revision)]);
      const evidence = input.evidence ? await this.recordEvidence(validateEvidenceRecordV2(input.evidence)) : undefined;
      const outbox = await this.insertOutbox(durableEvent.event.event_id,input.outboxId,input.deliveryKind,event.timestamp);
      return { lineage: await this.getDelegationGrantLineage(head.grant_id), event: durableEvent, ...(evidence ? { evidence } : {}), outbox };
    });
  }

  async revokeDelegationGrant(input: NativeDelegationGrantRevocationCommand): Promise<NativeDelegationGrantCommandResult> {
    const head=validateDelegationGrantHeadV1(input.head); const revocation=validateDelegationGrantRevocationV1(input.revocation); const event=validateEventEnvelopeV2(input.event); validateIdempotency(input.idempotency);
    if (head.lifecycle!=="revoked" || head.grant_id!==revocation.grant_ref.grant_id || head.tenant_id!==revocation.grant_ref.tenant_id || head.current_revision!==revocation.grant_ref.revision || head.current_fingerprint!==revocation.grant_ref.fingerprint || head.revoked_at!==revocation.revoked_at || event.subject_type!=="delegation_grant" || event.subject_id!==head.grant_id || event.tenant_id!==head.tenant_id || event.run_id!==undefined || event.task_id!==undefined || event.workforce_id!==undefined) throw new NativeDelegationGrantIntegrityError(head.grant_id,"revocation head, exact reference, Event, or execution boundary is invalid");
    if (input.idempotency.scope!==`delegation.grant.revoke:${head.tenant_id}:${head.grant_id}`) throw new NativeDelegationGrantIntegrityError(head.grant_id,"revocation idempotency scope must be Tenant-qualified and aggregate-specific");
    return this.idempotent(input.idempotency,"native.delegation.grant.revoke",async()=>{
      await query(this.db,"lock Delegation Grant revocation","SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",[`delegation-grant:${head.grant_id}`]);
      const existing=await query<HeadRow & QueryResultRow>(this.db,"read Delegation Grant revocation head","SELECT current_revision AS revision,current_fingerprint AS native_fingerprint,payload FROM acs_delegation_grants WHERE grant_id=$1 FOR UPDATE",[head.grant_id]);
      if (!existing.rows[0] || Number(existing.rows[0].revision)!==input.expectedHead || existing.rows[0].native_fingerprint!==input.expectedFingerprint) throw new RevisionConflictError(`delegation-grant:${head.grant_id}`,input.expectedHead,existing.rows[0]?Number(existing.rows[0].revision):0);
      const prior=validateDelegationGrantHeadV1(decode(existing.rows[0].payload)); if (prior.lifecycle!=="active") throw new NativeDelegationGrantIntegrityError(head.grant_id,"only an active Grant may be revoked");
      const durableEvent=await this.appendEvent(event);
      await query(this.db,"append Delegation Grant revocation",`INSERT INTO acs_delegation_grant_revocations (revocation_id,grant_id,tenant_id,revision,fingerprint,revoked_at,revoked_by,reason,governing_authority_refs,approval_refs,provenance_refs,correlation_id,event_id,payload) VALUES ($1,$2,$3,$4,$5,to_timestamp($6/1000.0),$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14::jsonb)`,[revocation.revocation_id,head.grant_id,head.tenant_id,revocation.grant_ref.revision,revocation.grant_ref.fingerprint,revocation.revoked_at,revocation.revoked_by,revocation.reason,serialize(revocation.governing_authority_refs),serialize(revocation.approval_refs),serialize(revocation.provenance_refs),event.correlation_id,event.event_id,serialize(revocation)]);
      await query(this.db,"revoke Delegation Grant head",`UPDATE acs_delegation_grants SET lifecycle='revoked',revoked_at=to_timestamp($2/1000.0),revocation_reason=$3,payload=$4::jsonb,updated_at=to_timestamp($5/1000.0) WHERE grant_id=$1`,[head.grant_id,head.revoked_at,head.revocation_reason,serialize(head),head.updated_at]);
      const evidence=input.evidence?await this.recordEvidence(validateEvidenceRecordV2(input.evidence)):undefined; const outbox=await this.insertOutbox(durableEvent.event.event_id,input.outboxId,input.deliveryKind,event.timestamp);
      return {lineage:await this.getDelegationGrantLineage(head.grant_id),event:durableEvent,...(evidence?{evidence}:{}),outbox};
    });
  }

  async getDelegationGrantLineage(grantId: string): Promise<NativeDelegationGrantLineage> {
    const h=await query<PayloadRow>(this.db,"get Delegation Grant head","SELECT payload FROM acs_delegation_grants WHERE grant_id=$1",[grantId]); const r=await query<PayloadRow>(this.db,"get Delegation Grant revisions","SELECT payload FROM acs_delegation_grant_revisions WHERE grant_id=$1 ORDER BY revision",[grantId]); const x=await query<PayloadRow>(this.db,"get Delegation Grant revocations","SELECT payload FROM acs_delegation_grant_revocations WHERE grant_id=$1 ORDER BY revoked_at",[grantId]);
    if(!h.rows[0]||r.rows.length===0) throw new NativeDelegationGrantIntegrityError(grantId,"canonical head or immutable history is missing"); const head=validateDelegationGrantHeadV1(decode(h.rows[0].payload)); const revisions=r.rows.map(row=>validateDelegationGrantRevisionV1(decode(row.payload))); const current=revisions.at(-1); if(!current||head.current_revision!==current.ref.revision||head.current_fingerprint!==current.ref.fingerprint) throw new NativeDelegationGrantIntegrityError(grantId,"head diverges from immutable revisions"); revisions.forEach((item,index)=>{if(item.ref.grant_id!==grantId||item.ref.revision!==index+1)throw new NativeDelegationGrantIntegrityError(grantId,"revision history is not contiguous");}); return {head,revisions,revocations:x.rows.map(row=>validateDelegationGrantRevocationV1(decode(row.payload)))};
  }

  async assertDelegationGrantPathUsable(input: { readonly grantRef: DelegationGrantRevisionV1["ref"]; readonly at: number }): Promise<void> {
    const seen=new Set<string>(); let ref=input.grantRef; while(true){ const row=await query<PayloadRow>(this.db,"read Delegation Grant path revision","SELECT payload FROM acs_delegation_grant_revisions WHERE grant_id=$1 AND tenant_id=$2 AND revision=$3 AND fingerprint=$4",[ref.grant_id,ref.tenant_id,ref.revision,ref.fingerprint]); if(!row.rows[0])throw new NativeDelegationGrantIntegrityError(ref.grant_id,"exact path revision is unavailable"); const revision=validateDelegationGrantRevisionV1(decode(row.rows[0].payload)); const head=await query<PayloadRow>(this.db,"read Delegation Grant path head","SELECT payload FROM acs_delegation_grants WHERE grant_id=$1",[ref.grant_id]); if(!head.rows[0])throw new NativeDelegationGrantIntegrityError(ref.grant_id,"path head is unavailable"); const current=validateDelegationGrantHeadV1(decode(head.rows[0].payload)); if(current.lifecycle!=="active"||current.current_revision!==ref.revision||current.current_fingerprint!==ref.fingerprint||input.at<revision.valid_from||input.at>=revision.expires_at)throw new NativeDelegationGrantIntegrityError(ref.grant_id,"path is not usable for a new authority use"); if(seen.has(revision.delegate.agent_id))throw new NativeDelegationGrantIntegrityError(ref.grant_id,"path repeats canonical Agent identity"); seen.add(revision.delegate.agent_id); if(!revision.parent_grant_ref)return; ref=revision.parent_grant_ref; }
  }

  private async assertDelegationParentForNewRevision(revision: DelegationGrantRevisionV1): Promise<void> {
    const parent=revision.parent_grant_ref!;
    await this.assertDelegationGrantPathUsable({grantRef:parent,at:revision.issued_at});
    const parentChain: DelegationGrantRevisionV1[]=[];
    let ref: DelegationGrantRevisionV1["ref"]|undefined=parent;
    while(ref){
      const row=await query<PayloadRow>(this.db,"read exact Delegation parent","SELECT payload FROM acs_delegation_grant_revisions WHERE grant_id=$1 AND tenant_id=$2 AND revision=$3 AND fingerprint=$4",[ref.grant_id,ref.tenant_id,ref.revision,ref.fingerprint]);
      if(!row.rows[0]) throw new NativeDelegationGrantIntegrityError(revision.ref.grant_id,"exact parent revision is unavailable");
      const parentRevision=validateDelegationGrantRevisionV1(decode(row.rows[0].payload)); parentChain.push(parentRevision); ref=parentRevision.parent_grant_ref;
    }
    const immediate=parentChain[0]!;
    if(revision.delegator.agent_id!==immediate.delegate.agent_id||!immediate.onward_delegation_allowed||revision.depth!==immediate.depth+1||revision.depth>immediate.max_delegation_depth||revision.ancestry_grant_refs.length!==immediate.ancestry_grant_refs.length+1)throw new NativeDelegationGrantIntegrityError(revision.ref.grant_id,"parent, depth, onward-delegation, or ancestry is invalid");
    if(revision.ancestry_grant_refs.some(entry=>entry.grant_id===revision.ref.grant_id)||revision.ancestry_grant_refs.some(entry=>entry.grant_id===immediate.ref.grant_id&&entry.revision!==immediate.ref.revision))throw new NativeDelegationGrantIntegrityError(revision.ref.grant_id,"Grant ancestry contains a cycle");
    const ordered=parentChain.reverse(); const agents=[ordered[0]!.delegator.agent_id,...ordered.map(item=>item.delegate.agent_id),revision.delegate.agent_id];
    if(new Set(agents).size!==agents.length) throw new NativeDelegationGrantIntegrityError(revision.ref.grant_id,"Delegation chain repeats a canonical Agent identity");
    assertDelegationAuthorityAttenuationV1(revision.authority_bounds,immediate.authority_bounds); if(revision.valid_from<immediate.valid_from||revision.expires_at>immediate.expires_at||revision.max_delegation_depth>immediate.max_delegation_depth)throw new NativeDelegationGrantIntegrityError(revision.ref.grant_id,"child expands parent validity or depth");
  }

  async getMemoryPolicyLineage(memoryPolicyId: string): Promise<NativeMemoryPolicyLineage> {
    const headResult = await query<PayloadRow>(this.db, "get Memory Policy head", "SELECT payload FROM acs_memory_policies WHERE memory_policy_id=$1", [memoryPolicyId]);
    const revisionResult = await query<PayloadRow>(this.db, "get Memory Policy revisions", "SELECT payload FROM acs_memory_policy_revisions WHERE memory_policy_id=$1 ORDER BY revision", [memoryPolicyId]);
    if (!headResult.rows[0] || revisionResult.rows.length === 0) throw new NativeMemoryPolicyIntegrityError(memoryPolicyId, "canonical head or immutable history is missing");
    const head = validateMemoryPolicyHeadV1(decode<MemoryPolicyHeadV1>(headResult.rows[0].payload));
    const revisions = revisionResult.rows.map((row) => validateMemoryPolicyRevisionV1(decode<MemoryPolicyRevisionV1>(row.payload)));
    const current = revisions.at(-1);
    if (!current || head.current_revision !== current.ref.revision || head.current_fingerprint !== current.ref.fingerprint || head.lifecycle !== current.lifecycle) throw new NativeMemoryPolicyIntegrityError(memoryPolicyId, "head diverges from immutable revisions");
    revisions.forEach((item, index) => { if (item.ref.entity_id !== memoryPolicyId || item.ref.revision !== index + 1 || (index === 0 ? item.supersedes_revision !== undefined : item.supersedes_revision !== index)) throw new NativeMemoryPolicyIntegrityError(memoryPolicyId, "revision history is not contiguous"); });
    return { head, revisions };
  }

  async listMemoryPolicyHeads(input: { readonly tenantId: string }): Promise<readonly MemoryPolicyHeadV1[]> {
    const result = await query<PayloadRow>(this.db, "list Memory Policy heads for Product API projection", "SELECT payload FROM acs_memory_policies WHERE tenant_id=$1 ORDER BY updated_at DESC, memory_policy_id", [input.tenantId]);
    return result.rows.map((row) => validateMemoryPolicyHeadV1(decode<MemoryPolicyHeadV1>(row.payload)));
  }

  async createMemoryRecord(input: NativeMemoryRecordCommand): Promise<NativeMemoryRecordCommandResult> {
    const record = validateMemoryRecordV1(input.record);
    const event = validateEventEnvelopeV2(input.event);
    validateIdempotency(input.idempotency);
    if (!this.options.memoryCryptoProvider) throw new MemoryCryptoUnavailableError();
    if (sha256Hex(input.plaintext) !== record.content.content_digest) throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "plaintext digest does not match immutable content reference");
    if (input.idempotency.scope !== `memory.record:${record.ref.memory_id}` || event.tenant_id !== record.ref.tenant_id || event.subject_type !== "memory_record" || event.subject_id !== record.ref.memory_id || event.idempotency_key !== input.idempotency.key || event.payload.fingerprint !== record.ref.fingerprint || event.payload.policy_fingerprint !== record.policy_ref.ref.fingerprint || JSON.stringify(event.payload).match(/plaintext|ciphertext|secret|token|key_ref|authorization/i)) throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "unsafe or inconsistent Record Event");
    return this.idempotent(input.idempotency, "native.memory.record.create", async () => {
      await query(this.db, "lock Memory Record", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`memory-record:${record.ref.memory_id}`]);
      const policy = await query<PayloadRow>(this.db, "validate exact Memory Policy reference", "SELECT payload FROM acs_memory_policy_revisions WHERE memory_policy_id=$1 AND tenant_id=$2 AND revision=$3 AND fingerprint=$4", [record.policy_ref.ref.entity_id,record.ref.tenant_id,record.policy_ref.ref.revision,record.policy_ref.ref.fingerprint]);
      if (!policy.rows[0]) throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "exact Memory Policy revision is unavailable or cross-tenant");
      const policyRevision = validateMemoryPolicyRevisionV1(decode<MemoryPolicyRevisionV1>(policy.rows[0].payload));
      if (policyRevision.lifecycle !== "active" || !policyRevision.allowed_memory_types.includes(record.memory_type) || !policyRevision.allowed_scope_kinds.includes(record.scope.kind as Exclude<typeof record.scope.kind, "user_context">) || !policyRevision.allowed_operations.includes("write")) throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "Memory Policy does not permit this durable write");
      if (record.predecessor_ref) {
        const predecessor = await query<{ readonly tenant_id: string } & QueryResultRow>(this.db, "validate Memory predecessor", "SELECT tenant_id FROM acs_memory_records WHERE memory_id=$1 AND tenant_id=$2 AND fingerprint=$3", [record.predecessor_ref.memory_id,record.predecessor_ref.tenant_id,record.predecessor_ref.fingerprint]);
        if (!predecessor.rows[0] || predecessor.rows[0].tenant_id !== record.ref.tenant_id) throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "predecessor is unavailable or cross-tenant");
      }
      const protectedContent = await this.options.memoryCryptoProvider!.protect({ plaintext: input.plaintext, context: { tenant_id:record.ref.tenant_id,memory_ref:record.ref,policy_ref:record.policy_ref,purpose:"acs.memory.content" } });
      if (protectedContent.encryption_context_digest !== memoryEncryptionContextDigestV1({tenant_id:record.ref.tenant_id,memory_ref:record.ref,policy_ref:record.policy_ref,purpose:"acs.memory.content"})) throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "crypto provider returned an invalid context binding");
      const durableEvent = await this.appendEvent(event);
      const scope = memoryScopeColumns(record);
      const metadata = { ...record, content: undefined };
      await query(this.db, "create immutable Memory Record", `INSERT INTO acs_memory_records (memory_id,tenant_id,fingerprint,memory_type,scope_kind,scope_owner_id,scope_owner_revision,scope_owner_fingerprint,scope_run_id,policy_id,policy_revision,policy_fingerprint,predecessor_memory_id,predecessor_tenant_id,predecessor_fingerprint,payload,created_by,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,to_timestamp($18/1000.0))`, [record.ref.memory_id,record.ref.tenant_id,record.ref.fingerprint,record.memory_type,record.scope.kind,scope.ownerId,scope.ownerRevision,scope.ownerFingerprint,scope.runId,record.policy_ref.ref.entity_id,record.policy_ref.ref.revision,record.policy_ref.ref.fingerprint,record.predecessor_ref?.memory_id ?? null,record.predecessor_ref?.tenant_id ?? null,record.predecessor_ref?.fingerprint ?? null,serialize(metadata),record.created_by,record.created_at]);
      await query(this.db, "persist encrypted Memory content", `INSERT INTO acs_memory_contents (content_id,memory_id,tenant_id,content_ciphertext,media_type,content_digest,encryption_backend,encryption_key_ref,encryption_key_version,cipher_suite,encryption_context_digest,created_at) VALUES ($1,$2,$3,$4::bytea,$5,$6,$7,$8,$9,$10,$11,to_timestamp($12/1000.0))`, [`memory-content:${record.ref.memory_id}`,record.ref.memory_id,record.ref.tenant_id,Buffer.from(protectedContent.ciphertext,"base64"),record.content.media_type,record.content.content_digest,protectedContent.encryption_backend,protectedContent.encryption_key_ref,protectedContent.encryption_key_version,protectedContent.cipher_suite,protectedContent.encryption_context_digest,record.created_at]);
      const outbox = await this.insertOutbox(durableEvent.event.event_id,input.outboxId,input.deliveryKind,event.timestamp);
      return { record, event:durableEvent, outbox };
    });
  }

  async getMemoryRecordState(memoryId: string): Promise<NativeMemoryRecordState | undefined> {
    const base = await query<PayloadRow>(this.db, "get Memory Record metadata", "SELECT payload FROM acs_memory_records WHERE memory_id=$1", [memoryId]);
    if (!base.rows[0]) return undefined;
    const decodedMetadata = decode<NativeMemoryRecordMetadata & { readonly content?: unknown }>(base.rows[0].payload);
    if (decodedMetadata.ref.memory_id !== memoryId || decodedMetadata.content !== undefined) throw new NativeMemoryRecordIntegrityError(memoryId, "content-free Record metadata is invalid");
    const { content: _content, ...metadata } = decodedMetadata;
    const tombstoneResult = await query<PayloadRow>(this.db, "get Memory tombstone", "SELECT payload FROM acs_memory_tombstones WHERE memory_id=$1", [memoryId]);
    const contentResult = await query<{ readonly content_digest: string; readonly media_type: string } & QueryResultRow>(this.db, "get Memory content metadata", "SELECT content_digest,media_type FROM acs_memory_contents WHERE memory_id=$1", [memoryId]);
    if (tombstoneResult.rows[0] && contentResult.rows[0]) throw new NativeMemoryRecordIntegrityError(memoryId, "content and tombstone coexist");
    if (tombstoneResult.rows[0]) return { metadata, tombstone: validateMemoryTombstoneV1(decode<MemoryTombstoneV1>(tombstoneResult.rows[0].payload)) };
    const content = contentResult.rows[0];
    if (!content) throw new NativeMemoryRecordIntegrityError(memoryId, "active Record has no encrypted content");
    return { metadata, record: validateMemoryRecordV1({ ...metadata, content: { content_ref:`memory-content:${memoryId}`,content_digest:content.content_digest,media_type:content.media_type } }) };
  }

  async listMemoryRecordStates(input: { readonly tenantId: string }): Promise<readonly NativeMemoryRecordState[]> {
    const result = await query<{ readonly memory_id: string } & QueryResultRow>(this.db, "list bounded Memory Record metadata for Product API projection", "SELECT memory_id FROM acs_memory_records WHERE tenant_id=$1 ORDER BY created_at DESC, memory_id LIMIT 1000", [input.tenantId]);
    const states = await Promise.all(result.rows.map((row) => this.getMemoryRecordState(row.memory_id)));
    return states.filter((state): state is NativeMemoryRecordState => state !== undefined);
  }

  async listMemoryRecords(input: NativeMemoryRecordQuery): Promise<readonly MemoryRecordV1[]> {
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 1000) throw new NativeContractValidationError("Memory query validation failed", [{ path:"limit",code:"INVALID_LIMIT",message:"Memory retrieval must have a bounded positive limit" }]);
    const scope = memoryScopeColumns({ ref:{memory_id:"memory-query",tenant_id:input.tenantId,fingerprint:"0".repeat(64)}, memory_type:"agent", scope:input.scope } as MemoryRecordV1);
    const result = await query<{ readonly memory_id: string } & QueryResultRow>(this.db, "list bounded Memory Records", `
      SELECT memory_id FROM acs_memory_records
      WHERE tenant_id=$1 AND policy_id=$2 AND policy_revision=$3 AND policy_fingerprint=$4
        AND scope_kind=$5 AND scope_owner_id=$6 AND scope_owner_revision IS NOT DISTINCT FROM $7
        AND scope_owner_fingerprint IS NOT DISTINCT FROM $8 AND scope_run_id IS NOT DISTINCT FROM $9
      ORDER BY created_at DESC, memory_id
      LIMIT $10
    `, [input.tenantId,input.policyRef.ref.entity_id,input.policyRef.ref.revision,input.policyRef.ref.fingerprint,input.scope.kind,scope.ownerId,scope.ownerRevision,scope.ownerFingerprint,scope.runId,input.limit]);
    const records: MemoryRecordV1[] = [];
    for (const row of result.rows) {
      const state = await this.getMemoryRecordState(row.memory_id);
      if (state?.record && serialize(state.record.scope) === serialize(input.scope)) records.push(state.record);
    }
    return records;
  }

  async readMemoryRecordContent(input: { readonly memoryRef: MemoryRecordV1["ref"]; readonly policyRef: MemoryRecordV1["policy_ref"] }): Promise<NativeMemoryContentRead> {
    if (!this.options.memoryCryptoProvider) throw new MemoryCryptoUnavailableError();
    const state = await this.getMemoryRecordState(input.memoryRef.memory_id);
    const record = state?.record;
    if (!record || record.ref.tenant_id !== input.memoryRef.tenant_id || record.ref.fingerprint !== input.memoryRef.fingerprint || serialize(record.policy_ref) !== serialize(input.policyRef)) throw new NativeMemoryRecordIntegrityError(input.memoryRef.memory_id, "exact active Record or Policy reference is unavailable");
    const encrypted = await query<{ readonly content_ciphertext: Buffer; readonly encryption_backend: string; readonly encryption_key_ref: string; readonly encryption_key_version: string; readonly cipher_suite: string; readonly encryption_context_digest: string } & QueryResultRow>(this.db, "read encrypted Memory content", "SELECT content_ciphertext,encryption_backend,encryption_key_ref,encryption_key_version,cipher_suite,encryption_context_digest FROM acs_memory_contents WHERE memory_id=$1 AND tenant_id=$2", [record.ref.memory_id,record.ref.tenant_id]);
    const row = encrypted.rows[0];
    if (!row) throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "active Record content is unavailable");
    const plaintext = await this.options.memoryCryptoProvider.unprotect({ protected:{ciphertext:Buffer.from(row.content_ciphertext).toString("base64"),encryption_backend:row.encryption_backend,encryption_key_ref:row.encryption_key_ref,encryption_key_version:row.encryption_key_version,cipher_suite:row.cipher_suite,encryption_context_digest:row.encryption_context_digest}, context:{tenant_id:record.ref.tenant_id,memory_ref:record.ref,policy_ref:record.policy_ref,purpose:"acs.memory.content"} });
    if (sha256Hex(plaintext) !== record.content.content_digest) throw new NativeMemoryRecordIntegrityError(record.ref.memory_id, "decrypted content digest does not match immutable Record metadata");
    return { record, plaintext };
  }

  async tombstoneMemoryRecord(input: NativeMemoryTombstoneCommand): Promise<NativeMemoryTombstoneCommandResult> {
    const tombstone = validateMemoryTombstoneV1(input.tombstone);
    const event = validateEventEnvelopeV2(input.event);
    const evidence = input.evidence ? validateEvidenceRecordV2(input.evidence) : undefined;
    validateIdempotency(input.idempotency);
    const memoryId = tombstone.memory_ref.memory_id;
    const allowedEventPayloadKeys = new Set(["fingerprint", "policy_fingerprint", "assurance", "deletion_reason"]);
    if (input.idempotency.scope !== `memory.retention:${memoryId}` || event.tenant_id !== tombstone.memory_ref.tenant_id || event.subject_type !== "memory_record" || event.subject_id !== memoryId || event.idempotency_key !== input.idempotency.key || event.payload.fingerprint !== tombstone.memory_ref.fingerprint || event.payload.assurance !== "ACTIVE_STORE_DELETED" || Object.keys(event.payload).some((key) => !allowedEventPayloadKeys.has(key))) throw new NativeMemoryRecordIntegrityError(memoryId, "unsafe or inconsistent tombstone Event");
    if (evidence && (evidence.event_ref.id !== event.event_id || evidence.subject_ref.kind !== "memory_record" || evidence.subject_ref.id !== memoryId || evidence.payload_digest !== (tombstone.retained_content_digest ?? tombstone.memory_ref.fingerprint) || containsUnsafeMemoryProof(evidence.provenance ?? {}))) throw new NativeMemoryRecordIntegrityError(memoryId, "unsafe or inconsistent tombstone Evidence");
    return this.idempotent(input.idempotency, "native.memory.record.tombstone", async () => {
      await query(this.db, "lock Memory tombstone", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`memory-record:${memoryId}`]);
      const state = await this.getMemoryRecordState(memoryId);
      if (!state?.record) throw new NativeMemoryRecordIntegrityError(memoryId, "only an active content-bearing Record can be tombstoned");
      if (state.record.ref.tenant_id !== tombstone.memory_ref.tenant_id || state.record.ref.fingerprint !== tombstone.memory_ref.fingerprint || state.record.memory_type !== tombstone.memory_type || serialize(state.record.scope) !== serialize(tombstone.scope)) throw new NativeMemoryRecordIntegrityError(memoryId, "tombstone does not match the active immutable Record");
      const policy = await query<PayloadRow>(this.db, "validate tombstone Policy", "SELECT payload FROM acs_memory_policy_revisions WHERE memory_policy_id=$1 AND tenant_id=$2 AND revision=$3 AND fingerprint=$4", [tombstone.policy_ref.ref.entity_id,tombstone.memory_ref.tenant_id,tombstone.policy_ref.ref.revision,tombstone.policy_ref.ref.fingerprint]);
      if (!policy.rows[0]) throw new NativeMemoryRecordIntegrityError(memoryId, "tombstone Policy revision is unavailable");
      const policyRevision = validateMemoryPolicyRevisionV1(decode<MemoryPolicyRevisionV1>(policy.rows[0].payload));
      if (!policyRevision.allowed_operations.includes(tombstone.deletion_reason === "retention_expired" ? "expire" : "forget") || (tombstone.digest_retention === "policy_permitted") !== policyRevision.retention.retain_content_digest) throw new NativeMemoryRecordIntegrityError(memoryId, "tombstone retention semantics are not permitted by the exact Policy");
      const durableEvent = await this.appendEvent(event);
      await query(this.db, "create content-free Memory tombstone", `INSERT INTO acs_memory_tombstones (memory_id,tenant_id,deleted_at,deletion_reason,policy_id,policy_revision,policy_fingerprint,digest_retention,retained_content_digest,payload,event_id) VALUES ($1,$2,to_timestamp($3/1000.0),$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`, [memoryId,tombstone.memory_ref.tenant_id,tombstone.deleted_at,tombstone.deletion_reason,tombstone.policy_ref.ref.entity_id,tombstone.policy_ref.ref.revision,tombstone.policy_ref.ref.fingerprint,tombstone.digest_retention,tombstone.retained_content_digest ?? null,serialize(tombstone),event.event_id]);
      await query(this.db, "physically delete encrypted Memory content", "DELETE FROM acs_memory_contents WHERE memory_id=$1 AND tenant_id=$2", [memoryId,tombstone.memory_ref.tenant_id]);
      const persistedEvidence = evidence ? await this.recordEvidence(evidence) : undefined;
      const outbox = await this.insertOutbox(durableEvent.event.event_id,input.outboxId,input.deliveryKind,event.timestamp);
      return { tombstone,event:durableEvent,...(persistedEvidence ? { evidence:persistedEvidence } : {}),outbox };
    });
  }

  async advanceWorkforceLineage(input: NativeWorkforceLineageCommand): Promise<NativeWorkforceLineageCommandResult> {
    validateNativeWorkforceLineageCommand(input);
    const idempotency = { ...input.idempotency, request_hash: sha256Hex(stableStringify({
      request_hash: input.idempotency.request_hash,
      definition: input.definition, revision: input.revision, expectedHead: input.expectedHead,
      authority: input.authority, event: input.event,
    })) };
    return this.idempotent(idempotency, "native.workforce.lineage.advance", async () => {
      await query(this.db, "lock native workforce lineage", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`native-workforce:${input.definition.workforce_id}`]);
      await this.assertWorkforceReferences(input.definition, input.revision);
      let prior: NativeWorkforceLineage | undefined;
      if (input.expectedHead > 0) {
        prior = await this.getWorkforceLineage(input.definition.workforce_id);
        if (prior.definition.current_revision !== input.expectedHead) {
          throw new RevisionConflictError(`native-workforce:${input.definition.workforce_id}`, input.expectedHead, prior.definition.current_revision);
        }
        if (input.definition.updated_at < prior.definition.updated_at) {
          throw new NativeWorkforceReferenceError(input.definition.workforce_id, "updated_at", "commit timestamp cannot move backwards");
        }
        this.assertLifecycleTransition(prior.revisions.at(-1)!.lifecycle_status, input.revision.lifecycle_status, input.event.event_type);
        if (input.event.payload.previous_status !== prior.definition.current_status) {
          throw new NativeWorkforceReferenceError(input.definition.workforce_id, "event.previous_status", "lifecycle event payload does not match the persisted previous status");
        }
        if (prior.definition.created_at !== input.definition.created_at
          || prior.definition.scope.organization_id !== input.definition.scope.organization_id
          || prior.definition.scope.product_domain !== input.definition.scope.product_domain
          || prior.definition.scope.tenant_id !== input.definition.scope.tenant_id
          || prior.definition.scope.owner_ref !== input.definition.scope.owner_ref
          || prior.definition.scope.authority_scope_ref !== input.definition.scope.authority_scope_ref
          || !equal(prior.definition.scope.knowledge_scope_refs, input.definition.scope.knowledge_scope_refs)
          || prior.definition.scope.budget_scope_ref !== input.definition.scope.budget_scope_ref
          || prior.definition.scope.credential_scope_ref !== input.definition.scope.credential_scope_ref
          || prior.definition.ownership_ref !== input.definition.ownership_ref) {
          throw new NativeWorkforceReferenceError(input.definition.workforce_id, "identity", "scope, ownership, and creation timestamp are immutable across Workforce revisions");
        }
      }

      if (input.expectedHead === 0) {
        const created = await query(this.db, "create native workforce head", `
          INSERT INTO acs_workforces (
            workforce_id, current_revision, current_status, tenant_id, payload, native_fingerprint
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
          ON CONFLICT (workforce_id) DO NOTHING
          RETURNING workforce_id
        `, [
          input.definition.workforce_id,
          input.definition.current_revision,
          input.definition.current_status,
          input.definition.scope.tenant_id ?? null,
          serialize(input.definition),
          input.revision.ref.fingerprint,
        ]);
        if ((created.rowCount ?? 0) !== 1) {
          const existing = await query<HeadRow>(this.db, "read conflicting native workforce head", "SELECT current_revision AS revision, native_fingerprint, payload FROM acs_workforces WHERE workforce_id = $1", [input.definition.workforce_id]);
          throw new RevisionConflictError(`native-workforce:${input.definition.workforce_id}`, 0, existing.rows[0] ? Number(existing.rows[0].revision) : undefined);
        }
      } else {
        const updated = await query(this.db, "advance native workforce head", `
          UPDATE acs_workforces SET
            current_revision = $2,
            current_status = $3,
            tenant_id = $4,
            payload = $5::jsonb,
            native_fingerprint = $6,
            updated_at = clock_timestamp()
          WHERE workforce_id = $1 AND current_revision = $7
          RETURNING workforce_id
        `, [
          input.definition.workforce_id,
          input.definition.current_revision,
          input.definition.current_status,
          input.definition.scope.tenant_id ?? null,
          serialize(input.definition),
          input.revision.ref.fingerprint,
          input.expectedHead,
        ]);
        if ((updated.rowCount ?? 0) !== 1) {
          const existing = await query<HeadRow>(this.db, "read native workforce head", "SELECT current_revision AS revision, native_fingerprint, payload FROM acs_workforces WHERE workforce_id = $1", [input.definition.workforce_id]);
          throw new RevisionConflictError(`native-workforce:${input.definition.workforce_id}`, input.expectedHead, existing.rows[0] ? Number(existing.rows[0].revision) : undefined);
        }
      }

      await query(this.db, "append immutable native workforce revision", `
        INSERT INTO acs_workforce_revisions (
          workforce_id, revision, native_fingerprint, supersedes_revision, lifecycle_status,
          payload, created_by, committed_at, change_reason, correlation_id, event_id
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, to_timestamp($8 / 1000.0), $9, $10, $11)
      `, [
        input.definition.workforce_id,
        input.revision.ref.revision,
        input.revision.ref.fingerprint,
        input.revision.supersedes_revision ?? null,
        input.revision.lifecycle_status,
        serialize(input.revision),
        input.revision.commit.created_by,
        input.revision.commit.committed_at,
        input.revision.commit.change_reason,
        input.event.correlation_id,
        input.event.event_id,
      ]);
      const event = await this.appendEvent(input.event);
      const outbox = await this.insertOutbox(event.event.event_id, input.outboxId, input.deliveryKind, input.event.timestamp);
      const lineage = await this.getWorkforceLineage(input.definition.workforce_id);
      return { lineage, event, outbox };
    });
  }

  async getWorkforceLineage(workforceId: string): Promise<NativeWorkforceLineage> {
    requireText(workforceId, "workforceId");
    const head = await query<HeadRow>(this.db, "get native workforce head", `
      SELECT current_revision AS revision, native_fingerprint, payload
      FROM acs_workforces WHERE workforce_id = $1 FOR SHARE
    `, [workforceId]);
    if (!head.rows[0]) throw new NativeWorkforceNotFoundError(workforceId);
    const revisions = await this.listWorkforceRevisions(workforceId);
    const definition = validateWorkforceDefinitionV2(decode<WorkforceDefinitionV2>(head.rows[0].payload));
    if (definition.workforce_id !== workforceId || definition.current_revision !== Number(head.rows[0].revision)) {
      throw new NativeWorkforceLineageIntegrityError(workforceId, "head payload and head revision diverge");
    }
    if (revisions.length !== definition.current_revision) throw new NativeWorkforceLineageIntegrityError(workforceId, "revision history is not contiguous");
    for (const [index, revision] of revisions.entries()) {
      const expected = index + 1;
      if (revision.ref.entity_id !== workforceId || revision.ref.revision !== expected) throw new NativeWorkforceLineageIntegrityError(workforceId, `invalid revision at position ${expected}`);
      if (expected === 1 && revision.supersedes_revision !== undefined) throw new NativeWorkforceLineageIntegrityError(workforceId, "root revision has a predecessor");
      if (expected > 1 && revision.supersedes_revision !== expected - 1) throw new NativeWorkforceLineageIntegrityError(workforceId, `revision ${expected} has an invalid predecessor`);
      for (const member of revision.members) {
        if (member.agent_selector.mode === "pinned") {
          const lineage = await this.getAgentLineage(member.agent_selector.agent_id);
          const pinnedRevisionRef = member.agent_selector.pinned_revision_ref;
          if (!lineage.revisions.some((candidate) => equal(candidate.ref, pinnedRevisionRef))) {
            throw new NativeWorkforceLineageIntegrityError(workforceId, `pinned Agent history is missing for ${member.agent_selector.agent_id}@${pinnedRevisionRef.revision}`);
          }
        }
        if (member.role_ref) {
          const role = await this.getGovernedRoleRevision(member.role_ref);
          if (!role) throw new NativeWorkforceLineageIntegrityError(workforceId, `role history is missing for ${member.role_ref.entity_id}@${member.role_ref.revision}`);
        }
      }
    }
    const current = revisions.at(-1);
    if (!current || current.ref.fingerprint !== head.rows[0].native_fingerprint || current.lifecycle_status !== definition.current_status) {
      throw new NativeWorkforceLineageIntegrityError(workforceId, "head projection diverges from immutable history");
    }
    return { definition, revisions };
  }

  async listWorkforceDefinitions(): Promise<readonly WorkforceDefinitionV2[]> {
    const result = await query<PayloadRow>(this.db, "list native workforce heads", `
      SELECT payload FROM acs_workforces ORDER BY updated_at DESC, workforce_id
    `);
    return result.rows.map((row) => validateWorkforceDefinitionV2(decode<WorkforceDefinitionV2>(row.payload)));
  }

  async getWorkforceRevision(workforceId: string, revision: number): Promise<WorkforceRevisionV2 | undefined> {
    requireText(workforceId, "workforceId");
    if (!Number.isSafeInteger(revision) || revision < 1) {
      throw new NativeContractValidationError("native workforce revision lookup validation failed", [{ path: "revision", code: "INVALID_INTEGER", message: "revision must be >= 1" }]);
    }
    const result = await query<PayloadRow>(this.db, "get native workforce revision", `
      SELECT payload FROM acs_workforce_revisions WHERE workforce_id = $1 AND revision = $2
    `, [workforceId, revision]);
    return result.rows[0] ? validateWorkforceRevisionV2(decode<WorkforceRevisionV2>(result.rows[0].payload)) : undefined;
  }

  async listWorkforceRevisions(workforceId: string): Promise<readonly WorkforceRevisionV2[]> {
    requireText(workforceId, "workforceId");
    const history = await query<PayloadRow>(this.db, "list native workforce history", `
      SELECT payload FROM acs_workforce_revisions WHERE workforce_id = $1 ORDER BY revision
    `, [workforceId]);
    return history.rows.map((row) => validateWorkforceRevisionV2(decode<WorkforceRevisionV2>(row.payload)));
  }

  async recordGovernedRoleRevision(roleInput: GovernedRoleRevisionV2, expectedHead: number): Promise<GovernedRoleRevisionV2> {
    const role = validateGovernedRoleRevisionV2(roleInput);
    if (!Number.isSafeInteger(expectedHead) || expectedHead < 0) {
      throw new NativeContractValidationError("governed role history validation failed", [{ path: "expectedHead", code: "INVALID_INTEGER", message: "expectedHead must be non-negative" }]);
    }
    if (expectedHead === 0) {
      if (role.supersedes_revision !== undefined) throw new NativeGovernedRoleHistoryError(role.ref.entity_id, "the first durable snapshot cannot claim an unavailable predecessor");
    } else if (role.ref.revision !== expectedHead + 1 || role.supersedes_revision !== expectedHead) {
      throw new NativeGovernedRoleHistoryError(role.ref.entity_id, "revision must advance exactly one expected head");
    }
    await query(this.db, "lock governed role history", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`governed-role:${role.ref.entity_id}`]);
    const inserted = await query(this.db, "append governed role revision", `
      INSERT INTO acs_governed_role_revisions (
        role_id, revision, native_fingerprint, supersedes_revision, status,
        payload, created_by, committed_at, change_reason
      ) SELECT $1, $2, $3, $4, $5, $6::jsonb, $7, to_timestamp($8 / 1000.0), $9
      WHERE COALESCE((SELECT MAX(revision) FROM acs_governed_role_revisions WHERE role_id = $1), 0) = $10
      ON CONFLICT DO NOTHING
      RETURNING role_id
    `, [
      role.ref.entity_id,
      role.ref.revision,
      role.ref.fingerprint,
      role.supersedes_revision ?? null,
      role.status,
      serialize(role),
      role.commit.created_by,
      role.commit.committed_at,
      role.commit.change_reason,
      expectedHead,
    ]);
    if ((inserted.rowCount ?? 0) !== 1) {
      const head = await query<{ readonly revision: string | number } & QueryResultRow>(this.db, "read governed role head", "SELECT COALESCE(MAX(revision), 0) AS revision FROM acs_governed_role_revisions WHERE role_id = $1", [role.ref.entity_id]);
      throw new RevisionConflictError(`governed-role:${role.ref.entity_id}`, expectedHead, Number(head.rows[0]?.revision ?? 0));
    }
    return role;
  }

  async getGovernedRoleRevision(roleRef: WorkforceRevisionV2["members"][number]["role_ref"]): Promise<GovernedRoleRevisionV2 | undefined> {
    if (!roleRef) return undefined;
    const ref = validateRevisionRef(roleRef, "roleRef");
    if (ref.entity_kind !== "resource") throw new NativeGovernedRoleHistoryError(ref.entity_id, "role reference must identify a resource revision");
    const result = await query<PayloadRow>(this.db, "get governed role revision", `
      SELECT payload FROM acs_governed_role_revisions
      WHERE role_id = $1 AND revision = $2 AND native_fingerprint = $3
    `, [ref.entity_id, ref.revision, ref.fingerprint]);
    return result.rows[0] ? validateGovernedRoleRevisionV2(decode<GovernedRoleRevisionV2>(result.rows[0].payload)) : undefined;
  }

  private async getGovernedRoleHead(roleId: string): Promise<GovernedRoleRevisionV2 | undefined> {
    const result = await query<PayloadRow>(this.db, "get governed role head", `
      SELECT payload FROM acs_governed_role_revisions
      WHERE role_id = $1 ORDER BY revision DESC LIMIT 1
    `, [roleId]);
    return result.rows[0] ? validateGovernedRoleRevisionV2(decode<GovernedRoleRevisionV2>(result.rows[0].payload)) : undefined;
  }

  async getEvent(eventId: string): Promise<NativeDurableEvent | undefined> {
    const result = await query<EventRow>(this.db, "get canonical native event", "SELECT stream_scope, payload FROM acs_native_events WHERE event_id = $1", [eventId]);
    const row = result.rows[0];
    return row ? { streamScope: row.stream_scope, event: validateEventEnvelopeV2(decode<EventEnvelopeV2>(row.payload)) } : undefined;
  }

  async replayEvents(input: { readonly streamScope?: string; readonly afterSequence?: number } = {}): Promise<readonly NativeDurableEvent[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (input.streamScope) { values.push(input.streamScope); clauses.push(`stream_scope = $${values.length}`); }
    if (input.afterSequence !== undefined) { values.push(input.afterSequence); clauses.push(`sequence > $${values.length}`); }
    const result = await query<EventRow>(this.db, "replay canonical native events", `
      SELECT stream_scope, payload FROM acs_native_events${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY stream_scope, sequence
    `, values);
    return result.rows.map((row) => ({ streamScope: row.stream_scope, event: validateEventEnvelopeV2(decode<EventEnvelopeV2>(row.payload)) }));
  }

  async listOutbox(input: { readonly status?: NativeOutboxStatus; readonly recoverableAt?: number } = {}): Promise<readonly NativeOutboxRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (input.status) { values.push(input.status); clauses.push(`status = $${values.length}`); }
    if (input.recoverableAt !== undefined) {
      values.push(input.recoverableAt);
      clauses.push(`((status IN ('pending', 'retryable') AND available_at <= to_timestamp($${values.length} / 1000.0)) OR (status = 'leased' AND lease_expires_at <= to_timestamp($${values.length} / 1000.0)))`);
    }
    const result = await query<OutboxRow>(this.db, "list native outbox", `
      SELECT outbox_id, event_id, delivery_kind, status, available_at, attempt_count,
        created_at, lease_owner, lease_expires_at, delivered_at, last_failure
      FROM acs_native_outbox${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY available_at, outbox_id
    `, values);
    return result.rows.map(outboxFromRow);
  }

  async claimNextOutbox(input: { readonly dispatcherId: string; readonly leaseTtlMs: number; readonly at?: number }): Promise<NativeOutboxRecord | undefined> {
    requireText(input.dispatcherId, "dispatcherId");
    if (!Number.isSafeInteger(input.leaseTtlMs) || input.leaseTtlMs < 1) throw new NativeContractValidationError("native outbox claim validation failed", [{ path: "leaseTtlMs", code: "INVALID_INTEGER", message: "leaseTtlMs must be positive" }]);
    const at = input.at ?? Date.now();
    const candidate = await query<OutboxRow>(this.db, "claim native outbox candidate", `
      SELECT outbox_id, event_id, delivery_kind, status, available_at, attempt_count,
        created_at, lease_owner, lease_expires_at, delivered_at, last_failure
      FROM acs_native_outbox
      WHERE (status IN ('pending', 'retryable') AND available_at <= to_timestamp($1 / 1000.0))
        OR (status = 'leased' AND lease_expires_at <= to_timestamp($1 / 1000.0))
      ORDER BY available_at, outbox_id
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `, [at]);
    const row = candidate.rows[0];
    if (!row) return undefined;
    const leaseExpiresAt = at + input.leaseTtlMs;
    const updated = await query<OutboxRow>(this.db, "lease native outbox", `
      UPDATE acs_native_outbox SET
        status = 'leased',
        attempt_count = attempt_count + 1,
        lease_owner = $2,
        lease_expires_at = to_timestamp($3 / 1000.0),
        last_failure = NULL
      WHERE outbox_id = $1
      RETURNING outbox_id, event_id, delivery_kind, status, available_at, attempt_count,
        created_at, lease_owner, lease_expires_at, delivered_at, last_failure
    `, [row.outbox_id, input.dispatcherId, leaseExpiresAt]);
    return updated.rows[0] ? outboxFromRow(updated.rows[0]) : undefined;
  }

  async acknowledgeOutbox(input: { readonly outboxId: string; readonly dispatcherId: string; readonly at?: number }): Promise<NativeOutboxRecord> {
    const at = input.at ?? Date.now();
    const updated = await query<OutboxRow>(this.db, "acknowledge native outbox", `
      UPDATE acs_native_outbox SET
        status = 'delivered',
        delivered_at = to_timestamp($3 / 1000.0),
        lease_owner = NULL,
        lease_expires_at = NULL
      WHERE outbox_id = $1 AND status = 'leased' AND lease_owner = $2
      RETURNING outbox_id, event_id, delivery_kind, status, available_at, attempt_count,
        created_at, lease_owner, lease_expires_at, delivered_at, last_failure
    `, [input.outboxId, input.dispatcherId, at]);
    if (!updated.rows[0]) throw new NativeOutboxLeaseError(input.outboxId, input.dispatcherId);
    return outboxFromRow(updated.rows[0]);
  }

  async retryOutbox(input: { readonly outboxId: string; readonly dispatcherId: string; readonly availableAt: number; readonly failure: string }): Promise<NativeOutboxRecord> {
    requireOutboxFailureCode(input.failure);
    const updated = await query<OutboxRow>(this.db, "retry native outbox", `
      UPDATE acs_native_outbox SET
        status = 'retryable',
        available_at = to_timestamp($3 / 1000.0),
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_failure = $4
      WHERE outbox_id = $1 AND status = 'leased' AND lease_owner = $2
      RETURNING outbox_id, event_id, delivery_kind, status, available_at, attempt_count,
        created_at, lease_owner, lease_expires_at, delivered_at, last_failure
    `, [input.outboxId, input.dispatcherId, input.availableAt, input.failure]);
    if (!updated.rows[0]) throw new NativeOutboxLeaseError(input.outboxId, input.dispatcherId);
    return outboxFromRow(updated.rows[0]);
  }

  async recordFencedCheckpoint(input: NativeFencedCheckpointCommand): Promise<NativeFencedCheckpointCommandResult> {
    validateNativeFencedCheckpointCommand(input);
    return this.idempotent(input.idempotency, "native.runtime.checkpoint.record", async () => {
      await this.assertRuntimeOwnership(input.ownership);
      const inserted = await query(this.db, "persist native checkpoint", `
        INSERT INTO acs_native_checkpoints (
          checkpoint_id, run_id, task_id, attempt, assignment_id, lease_id, fencing_token, payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        ON CONFLICT (checkpoint_id) DO NOTHING
        RETURNING checkpoint_id
      `, [
        input.checkpoint.checkpoint_id,
        input.checkpoint.run_id,
        input.checkpoint.task_id ?? null,
        input.checkpoint.attempt,
        input.ownership.assignmentId,
        input.ownership.leaseId,
        input.ownership.fencingToken,
        serialize(input.checkpoint),
      ]);
      if ((inserted.rowCount ?? 0) === 0) {
        const existing = await this.getCheckpoint(input.checkpoint.checkpoint_id);
        if (!existing || !equal(existing, input.checkpoint)) throw new NativeIdempotencyConflictError(input.idempotency.scope, input.idempotency.key);
      }
      const event = await this.appendEvent(input.event);
      const outbox = await this.insertOutbox(event.event.event_id, input.outboxId, input.deliveryKind, input.event.timestamp);
      return { checkpoint: input.checkpoint, event, outbox };
    });
  }

  async getCheckpoint(checkpointId: string): Promise<CheckpointV2 | undefined> {
    const result = await query<PayloadRow>(this.db, "get native checkpoint", "SELECT payload FROM acs_native_checkpoints WHERE checkpoint_id = $1", [checkpointId]);
    return result.rows[0] ? validateCheckpointV2(decode<CheckpointV2>(result.rows[0].payload)) : undefined;
  }

  async recordEvidence(record: EvidenceRecordV2): Promise<EvidenceRecordV2> {
    const evidence = validateEvidenceRecordV2(record);
    const inserted = await query(this.db, "persist native evidence", `
      INSERT INTO acs_native_evidence (evidence_id, event_id, subject_kind, subject_id, run_id, task_id, payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      ON CONFLICT (evidence_id) DO NOTHING
      RETURNING evidence_id
    `, [evidence.evidence_id, evidence.event_ref.id, evidence.subject_ref.kind, evidence.subject_ref.id, evidence.run_id ?? null, evidence.task_id ?? null, serialize(evidence)]);
    if ((inserted.rowCount ?? 0) === 1) return evidence;
    const existing = await query<PayloadRow>(this.db, "read existing native evidence", "SELECT payload FROM acs_native_evidence WHERE evidence_id = $1", [evidence.evidence_id]);
    const decoded = existing.rows[0] ? validateEvidenceRecordV2(decode<EvidenceRecordV2>(existing.rows[0].payload)) : undefined;
    if (!decoded || !equal(decoded, evidence)) throw new NativeIdempotencyConflictError("evidence", evidence.evidence_id);
    return decoded;
  }

  async listEvidence(input: { readonly eventId?: string; readonly subjectId?: string } = {}): Promise<readonly EvidenceRecordV2[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (input.eventId) { values.push(input.eventId); clauses.push(`event_id = $${values.length}`); }
    if (input.subjectId) { values.push(input.subjectId); clauses.push(`subject_id = $${values.length}`); }
    const result = await query<PayloadRow>(this.db, "list native evidence", `
      SELECT payload FROM acs_native_evidence${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY created_at, evidence_id
    `, values);
    return result.rows.map((row) => validateEvidenceRecordV2(decode<EvidenceRecordV2>(row.payload)));
  }

  async recordAccounting(input: NativeAccountingCommand): Promise<NativeAccountingCommandResult> {
    validateNativeAccountingCommand(input);
    return this.idempotent(input.idempotency, "native.accounting.record", async () => {
      await this.insertEconomicRecord("native_usage", input.usage.usage_id, input.event.tenant_id, input.idempotency.key, input.usage);
      if (input.cost) await this.insertEconomicRecord("native_cost", input.cost.cost_id, input.event.tenant_id, input.idempotency.key, input.cost);
      const event = await this.appendEvent(input.event);
      const outbox = await this.insertOutbox(event.event.event_id, input.outboxId, input.deliveryKind, input.event.timestamp);
      return { usage: input.usage, ...(input.cost ? { cost: input.cost } : {}), event, outbox };
    });
  }

  async listUsage(runId?: string): Promise<readonly UsageRecordV2[]> {
    const result = await query<PayloadRow>(this.db, "list native usage", `
      SELECT payload FROM acs_economic_records
      WHERE kind = 'native_usage'${runId ? " AND payload->'payload'->>'run_id' = $1" : ""}
      ORDER BY record_id
    `, runId ? [runId] : []);
    return result.rows.map((row) => validateUsageRecordV2(decode<{ readonly payload: UsageRecordV2 }>(row.payload).payload));
  }

  async listCosts(usageId?: string): Promise<readonly CostRecordV2[]> {
    const result = await query<PayloadRow>(this.db, "list native costs", `
      SELECT payload FROM acs_economic_records
      WHERE kind = 'native_cost'${usageId ? " AND payload->'payload'->'usage_ref'->>'id' = $1" : ""}
      ORDER BY record_id
    `, usageId ? [usageId] : []);
    return result.rows.map((row) => validateCostRecordV2(decode<{ readonly payload: CostRecordV2 }>(row.payload).payload));
  }

  async admitWorkforceRun(input: WorkforceRunAdmissionRequest): Promise<WorkforceRunAdmissionResult> {
    validateWorkforceRunAdmissionRequest(input);
    const requestHash = sha256Hex(stableStringify({
      workforce_id: input.workforce_id,
      workforce_revision: input.workforce_revision,
      run: input.run,
      authority_decision_ref: input.authority_decision_ref,
      delegated_authority_snapshot: input.delegated_authority_snapshot,
      admitted_at: input.admitted_at,
    }));
    const idempotency = { ...input.idempotency, request_hash: requestHash };
    return this.idempotent(idempotency, "native.workforce.run.admit", async () => {
      await query(this.db, "lock Workforce head for Run admission", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`native-workforce:${input.workforce_id}`]);
      const headResult = await query<HeadRow>(this.db, "read Workforce head for Run admission", `
        SELECT current_revision AS revision, native_fingerprint, payload
        FROM acs_workforces WHERE workforce_id = $1 FOR SHARE
      `, [input.workforce_id]);
      const head = headResult.rows[0];
      if (!head) throw new NativeWorkforceNotFoundError(input.workforce_id);
      const headDefinition = validateWorkforceDefinitionV2(decode<WorkforceDefinitionV2>(head.payload));
      const selectedRevision = input.workforce_revision ?? Number(head.revision);
      if (selectedRevision !== Number(head.revision)) {
        throw new NativeRunAdmissionError(input.run.run_id, "operational admission must bind the active current Workforce revision");
      }
      if (headDefinition.current_status !== "active") {
        throw new NativeRunAdmissionError(input.run.run_id, `Workforce revision is ${headDefinition.current_status}, not active`);
      }
      const workforceRevision = await this.getWorkforceRevision(input.workforce_id, selectedRevision);
      if (!workforceRevision) throw new NativeRunAdmissionError(input.run.run_id, "selected Workforce revision was not found");
      const snapshotId = `workforce_run_membership_${input.run.run_id}`;
      const run: RunV2 = validateRunV2({
        schema_version: ACS_NATIVE_SCHEMA_VERSION,
        run_id: input.run.run_id,
        kind: "workforce",
        scope: input.run.scope,
        definition_refs: { workforce_revision_ref: workforceRevision.ref },
        status: "created",
        idempotency: input.run.idempotency,
        execution_binding_refs: input.run.execution_binding_refs,
        ...(input.run.checkpoint_ref ? { checkpoint_ref: input.run.checkpoint_ref } : {}),
        ...(input.run.lease_ref ? { lease_ref: input.run.lease_ref } : {}),
        ...(input.run.fencing_token ? { fencing_token: input.run.fencing_token } : {}),
        created_at: input.run.created_at,
      });
      const members: WorkforceRunMembershipV2[] = [];
      for (const member of workforceRevision.members) {
        const selector = member.agent_selector;
        const lineage = await this.getAgentLineage(member.agent_selector.agent_id);
        if (lineage.definition.status === "archived" || lineage.definition.status === "disabled") {
          throw new NativeRunAdmissionError(input.run.run_id, `Agent ${member.agent_selector.agent_id} is ${lineage.definition.status}`);
        }
        const resolved = selector.mode === "pinned"
          ? lineage.revisions.find((revision) => revision.ref.revision === selector.pinned_revision_ref.revision
            && revision.ref.fingerprint === selector.pinned_revision_ref.fingerprint)
          : lineage.revisions.at(-1);
        if (!resolved) throw new NativeRunAdmissionError(input.run.run_id, `Agent revision is unavailable for ${member.agent_selector.agent_id}`);
        if (member.role_ref && !await this.getGovernedRoleRevision(member.role_ref)) {
          throw new NativeRunAdmissionError(input.run.run_id, `governed role revision is unavailable for ${member.role_ref.entity_id}@${member.role_ref.revision}`);
        }
        members.push(createWorkforceRunMembershipV2({
          snapshot_id: snapshotId,
          run_id: input.run.run_id,
          workforce_revision_ref: workforceRevision.ref,
          slot_id: member.slot_id,
          resolved_agent_revision_ref: resolved.ref,
          agent_id: member.agent_selector.agent_id,
          ...(member.role_ref ? { role_ref: member.role_ref } : {}),
          resolution_mode: member.agent_selector.mode,
          resolved_at: input.admitted_at,
          ...(input.authority_decision_ref ? { authority_decision_ref: input.authority_decision_ref } : {}),
        }));
      }
      await query(this.db, "persist admitted native Run", `
        INSERT INTO acs_native_runs (run_id, workforce_id, workforce_revision, payload, created_at)
        VALUES ($1, $2, $3, $4::jsonb, to_timestamp($5 / 1000.0))
      `, [input.run.run_id, input.workforce_id, selectedRevision, serialize(run), input.admitted_at]);
      await query(this.db, "persist Workforce Run membership snapshot", `
        INSERT INTO acs_workforce_run_membership_snapshots (snapshot_id, run_id, workforce_id, workforce_revision, admitted_at, member_count)
        VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6)
      `, [snapshotId, input.run.run_id, input.workforce_id, selectedRevision, input.admitted_at, members.length]);
      for (const member of members) {
        await query(this.db, "persist Workforce Run membership member", `
          INSERT INTO acs_workforce_run_membership_members (
            snapshot_id, slot_id, payload
          ) VALUES ($1, $2, $3::jsonb)
        `, [snapshotId, member.slot_id, serialize(member)]);
      }
      const event = validateEventEnvelopeV2({
        schema_version: ACS_NATIVE_SCHEMA_VERSION,
        event_id: `event_workforce_run_admitted_${input.run.run_id}`,
        event_type: "workforce.run.admitted",
        timestamp: input.admitted_at,
        sequence: 1,
        organization_id: input.run.scope.organization_id,
        product_domain: input.run.scope.product_domain,
        ...(input.run.scope.tenant_id ? { tenant_id: input.run.scope.tenant_id } : {}),
        run_id: input.run.run_id,
        workforce_id: input.workforce_id,
        actor: { kind: "service", ref: "acs:workforce-admission" },
        source: "acs",
        correlation_id: input.idempotency.key,
        idempotency_key: input.idempotency.key,
        payload: {
          workforce_revision: selectedRevision,
          workforce_revision_fingerprint: workforceRevision.ref.fingerprint,
          snapshot_id: snapshotId,
          member_count: members.length,
          ...(input.delegated_authority_snapshot ? { delegated_authority_snapshot: input.delegated_authority_snapshot } : {}),
        },
      });
      const durableEvent = await this.appendEvent(event);
      await this.insertOutbox(durableEvent.event.event_id, `outbox_workforce_run_admitted_${input.run.run_id}`);
      return { run, snapshot_id: snapshotId, members, event_id: durableEvent.event.event_id };
    });
  }

  async getRun(runId: string): Promise<RunV2 | undefined> {
    const result = await query<PayloadRow>(this.db, "get native Run", "SELECT payload FROM acs_native_runs WHERE run_id = $1", [runId]);
    return result.rows[0] ? validateRunV2(decode<RunV2>(result.rows[0].payload)) : undefined;
  }

  async listWorkforceRuns(workforceId: string): Promise<readonly NativeWorkforceRunSummary[]> {
    requireText(workforceId, "workforceId");
    const result = await query<{
      payload: unknown;
      snapshot_id: string | null;
      admitted_at: unknown;
      run_created_at: unknown;
    }>(this.db, "list native Workforce Runs", `
      SELECT
        run.payload,
        snapshot.snapshot_id,
        snapshot.admitted_at,
        run.created_at AS run_created_at
      FROM acs_native_runs run
      LEFT JOIN acs_workforce_run_membership_snapshots snapshot ON snapshot.run_id = run.run_id
      WHERE run.workforce_id = $1
      ORDER BY run.created_at ASC, run.run_id ASC
    `, [workforceId]);
    return result.rows.map((row) => {
      const run = validateRunV2(decode<RunV2>(row.payload));
      const admittedRef = run.definition_refs.workforce_revision_ref;
      if (!admittedRef || admittedRef.entity_id !== workforceId) {
        throw new NativeWorkforceLineageIntegrityError(workforceId, `Run ${run.run_id} does not preserve its canonical Workforce admission reference`);
      }
      const admittedAt = asMillis(row.admitted_at) ?? asMillis(row.run_created_at);
      return {
        run,
        ...(row.snapshot_id ? { membership_snapshot_id: row.snapshot_id } : {}),
        ...(admittedAt !== undefined ? { admitted_at: admittedAt } : {}),
      };
    });
  }

  async getRunMembership(runId: string): Promise<readonly WorkforceRunMembershipV2[]> {
    const result = await query<PayloadRow>(this.db, "get Workforce Run membership snapshot", `
      SELECT member.payload
      FROM acs_workforce_run_membership_members member
      JOIN acs_workforce_run_membership_snapshots snapshot ON snapshot.snapshot_id = member.snapshot_id
      WHERE snapshot.run_id = $1 ORDER BY member.slot_id
    `, [runId]);
    return result.rows.map((row) => validateWorkforceRunMembershipV2(decode<WorkforceRunMembershipV2>(row.payload)));
  }

  async listCoordinationProposals(runId: string, taskId?: string): Promise<readonly CoordinationProposalV2[]> {
    const result = await query<PayloadRow>(this.db, "list coordination proposals", `
      SELECT payload FROM acs_coordination_proposals
      WHERE run_id = $1 ${taskId === undefined ? "" : "AND task_id = $2"}
      ORDER BY created_at, proposal_id
    `, taskId === undefined ? [runId] : [runId, taskId]);
    return result.rows.map((row) => validateCoordinationProposalV2(decode<CoordinationProposalV2>(row.payload)));
  }

  async listCoordinationDecisions(runId: string, taskId?: string): Promise<readonly CoordinationDecisionV2[]> {
    const result = await query<PayloadRow>(this.db, "list coordination decisions", `
      SELECT payload FROM acs_coordination_decisions
      WHERE run_id = $1 ${taskId === undefined ? "" : "AND task_id = $2"}
      ORDER BY created_at, decision_id
    `, taskId === undefined ? [runId] : [runId, taskId]);
    return result.rows.map((row) => validateCoordinationDecisionV2(decode<CoordinationDecisionV2>(row.payload)));
  }

  async recordCoordinationProposal(input: CoordinationProposalCommand): Promise<CoordinationProposalCommandResult> {
    const proposal = validateCoordinationProposalV2(input.proposal);
    const task = validateTaskV2(input.task);
    const event = validateEventEnvelopeV2(input.event);
    if (proposal.run_id !== task.run_id || proposal.task_id !== task.task_run_id) throw new NativeCoordinationConflictError(proposal.run_id, proposal.task_id, "proposal and Task ownership do not match");
    if (event.run_id !== proposal.run_id || event.task_id !== proposal.task_id || event.idempotency_key !== proposal.idempotency.key) throw new NativeCoordinationConflictError(proposal.run_id, proposal.task_id, "proposal event does not match the command");
    validateIdempotency(proposal.idempotency);
    return this.idempotent(proposal.idempotency, "native.coordination.proposal.record", async () => {
      const run = await this.getRun(proposal.run_id);
      if (!run) throw new NativeRunNotFoundError(proposal.run_id);
      const member = (await this.getRunMembership(proposal.run_id)).find((candidate) => candidate.slot_id === proposal.target_member_slot_id);
      if (!member) throw new NativeMemberSlotNotFoundError(proposal.run_id, proposal.target_member_slot_id);
      await query(this.db, "persist coordination proposal", `
        INSERT INTO acs_coordination_proposals (proposal_id, run_id, task_id, payload, created_at)
        VALUES ($1, $2, $3, $4::jsonb, to_timestamp($5 / 1000.0))
        ON CONFLICT (proposal_id) DO NOTHING
      `, [proposal.proposal_id, proposal.run_id, proposal.task_id, serialize(proposal), proposal.created_at]);
      const durableEvent = await this.appendEvent(event);
      const outbox = await this.insertOutbox(durableEvent.event.event_id, input.outboxId, input.deliveryKind, event.timestamp);
      return { proposal, event: durableEvent, outbox };
    });
  }

  async recordCoordinationDecision(input: CoordinationDecisionCommand): Promise<CoordinationDecisionCommandResult> {
    const decision = validateCoordinationDecisionV2(input.decision);
    const task = validateTaskV2(input.task);
    const proposal = input.proposal ? validateCoordinationProposalV2(input.proposal) : undefined;
    const event = validateEventEnvelopeV2(input.event);
    if (decision.run_id !== task.run_id || decision.task_id !== task.task_run_id) throw new NativeCoordinationConflictError(decision.run_id, decision.task_id, "decision and Task ownership do not match");
    if (decision.proposal_id && (!proposal || decision.proposal_id !== proposal.proposal_id)) throw new NativeCoordinationConflictError(decision.run_id, decision.task_id, "decision proposal does not match the supplied proposal");
    if (proposal && (proposal.run_id !== decision.run_id || proposal.task_id !== decision.task_id)) throw new NativeCoordinationConflictError(decision.run_id, decision.task_id, "proposal and decision ownership do not match");
    if (event.run_id !== decision.run_id || event.task_id !== decision.task_id || event.idempotency_key !== decision.idempotency.key) throw new NativeCoordinationConflictError(decision.run_id, decision.task_id, "decision event does not match the command");
    return this.idempotent(decision.idempotency, "native.coordination.decision.record", async () => {
      const run = await this.getRun(decision.run_id);
      if (!run) throw new NativeRunNotFoundError(decision.run_id);
      if (proposal) {
        const persisted = await query<PayloadRow>(this.db, "read selected coordination proposal", "SELECT payload FROM acs_coordination_proposals WHERE proposal_id = $1 AND run_id = $2 AND task_id = $3", [proposal.proposal_id, decision.run_id, decision.task_id]);
        if (!persisted.rows[0]) throw new NativeCoordinationConflictError(decision.run_id, decision.task_id, "selected proposal is not durably recorded");
      }
      await query(this.db, "lock task coordination head", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`task-coordination:${decision.run_id}:${decision.task_id}`]);
      const membership = await this.getRunMembership(decision.run_id);
      const current = await this.getCurrentTaskAssignment(decision.run_id, decision.task_id);
      const expected = decision.expected_assignment_id;
      if (expected !== undefined && current?.assignment_id !== expected) throw new NativeCoordinationConflictError(decision.run_id, decision.task_id, "expected assignment is stale");
      if (decision.status === "accepted") {
        if (!decision.selected_member_slot_id) throw new NativeCoordinationConflictError(decision.run_id, decision.task_id, "accepted decision requires a member slot");
        const member = membership.find((candidate) => candidate.slot_id === decision.selected_member_slot_id);
        if (!member) throw new NativeMemberSlotNotFoundError(decision.run_id, decision.selected_member_slot_id);
        if (decision.prior_assignment_id !== undefined && current?.assignment_id !== decision.prior_assignment_id) throw new NativeCoordinationConflictError(decision.run_id, decision.task_id, "prior assignment is stale");
      }
      await query(this.db, "persist coordination decision", `
        INSERT INTO acs_coordination_decisions (decision_id, run_id, task_id, proposal_id, status, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, to_timestamp($7 / 1000.0))
      `, [decision.decision_id, decision.run_id, decision.task_id, decision.proposal_id ?? null, decision.status, serialize(decision), decision.decided_at]);
      let assignment: TaskAssignmentV2 | undefined;
      if (decision.status === "accepted") {
        const member = membership.find((candidate) => candidate.slot_id === decision.selected_member_slot_id)!;
        const generation = (current?.generation ?? 0) + 1;
        assignment = validateTaskAssignmentV2({
          schema_version: ACS_NATIVE_SCHEMA_VERSION,
          assignment_id: `assignment_${decision.decision_id}`,
          run_id: decision.run_id,
          task_id: decision.task_id,
          member_slot_id: member.slot_id,
          workforce_revision_ref: member.workforce_revision_ref,
          resolved_agent_revision_ref: member.resolved_agent_revision_ref,
          agent_id: member.agent_id,
          decision_id: decision.decision_id,
          generation,
          created_at: decision.decided_at,
          ...(current ? { supersedes_assignment_id: current.assignment_id } : {}),
          provenance: { source: decision.source, authority_ref: decision.authority_ref, reason: decision.reason, ...(proposal ? { proposal_id: proposal.proposal_id } : {}) },
        });
        await query(this.db, "persist task assignment", `
          INSERT INTO acs_task_assignments (assignment_id, run_id, task_id, member_slot_id, decision_id, generation, supersedes_assignment_id, payload, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, to_timestamp($9 / 1000.0))
        `, [assignment.assignment_id, assignment.run_id, assignment.task_id, assignment.member_slot_id, assignment.decision_id, assignment.generation, assignment.supersedes_assignment_id ?? null, serialize(assignment), assignment.created_at]);
      }
      const durableEvent = await this.appendEvent(event);
      const outbox = await this.insertOutbox(durableEvent.event.event_id, input.outboxId, input.deliveryKind, event.timestamp);
      return { decision, ...(assignment ? { assignment } : {}), event: durableEvent, outbox };
    });
  }

  async getCurrentTaskAssignment(runId: string, taskId: string): Promise<TaskAssignmentV2 | undefined> {
    const result = await query<PayloadRow>(this.db, "get current task assignment", `
      SELECT payload FROM acs_task_assignments WHERE run_id = $1 AND task_id = $2 ORDER BY generation DESC LIMIT 1
    `, [runId, taskId]);
    return result.rows[0] ? validateTaskAssignmentV2(decode<TaskAssignmentV2>(result.rows[0].payload)) : undefined;
  }

  async listTaskAssignments(runId: string, taskId: string): Promise<readonly TaskAssignmentV2[]> {
    const result = await query<PayloadRow>(this.db, "list task assignment history", `
      SELECT payload FROM acs_task_assignments WHERE run_id = $1 AND task_id = $2 ORDER BY generation
    `, [runId, taskId]);
    return result.rows.map((row) => validateTaskAssignmentV2(decode<TaskAssignmentV2>(row.payload)));
  }

  async compileTaskExecution(input: RuntimeCompilationRequest): Promise<RuntimeCompilationResult> {
    validateRuntimeCompilationRequest(input);
    const requestHash = sha256Hex(stableStringify(input));
    const idempotency = { ...input.idempotency, request_hash: requestHash };
    return this.idempotent(idempotency, "native.runtime.execution.compile", async () => {
      await query(this.db, "lock runtime compilation task", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`runtime-compilation:${input.run_id}:${input.task_id}`]);
      const run = await this.getRun(input.run_id);
      if (!run) throw new NativeRunNotFoundError(input.run_id);
      const assignmentResult = await query<PayloadRow>(this.db, "load canonical task assignment", `
        SELECT payload FROM acs_task_assignments
        WHERE assignment_id = $1 AND run_id = $2 AND task_id = $3
        FOR SHARE
      `, [input.assignment_id, input.run_id, input.task_id]);
      const assignment = assignmentResult.rows[0] ? validateTaskAssignmentV2(decode<TaskAssignmentV2>(assignmentResult.rows[0].payload)) : undefined;
      if (!assignment) throw new NativeCoordinationConflictError(input.run_id, input.task_id, "assignment was not found for the Run and Task");
      if (input.expected_assignment_id !== undefined && input.expected_assignment_id !== assignment.assignment_id) throw new NativeStaleAssignmentError(input.run_id, input.task_id, assignment.assignment_id);
      if (input.expected_assignment_generation !== undefined && input.expected_assignment_generation !== assignment.generation) throw new NativeStaleAssignmentError(input.run_id, input.task_id, assignment.assignment_id);
      const current = await this.getCurrentTaskAssignment(input.run_id, input.task_id);
      if (!current || current.assignment_id !== assignment.assignment_id || current.generation !== assignment.generation) throw new NativeStaleAssignmentError(input.run_id, input.task_id, assignment.assignment_id);
      const members = await this.getRunMembership(input.run_id);
      const member = members.find((candidate) => candidate.slot_id === assignment.member_slot_id);
      if (!member || member.agent_id !== assignment.agent_id
        || !equal(member.resolved_agent_revision_ref, assignment.resolved_agent_revision_ref)
        || !equal(member.workforce_revision_ref, assignment.workforce_revision_ref)) {
        throw new NativeRuntimeBindingCorruptionError(input.assignment_id, "assignment does not match the immutable Run membership snapshot");
      }
      const agentRevisionResult = await query<PayloadRow>(this.db, "load exact Agent revision for runtime compilation", `
        SELECT payload FROM acs_agent_history
        WHERE agent_id = $1 AND revision = $2 AND native_fingerprint = $3 AND record_kind = 'native_v2'
        FOR SHARE
      `, [assignment.agent_id, assignment.resolved_agent_revision_ref.revision, assignment.resolved_agent_revision_ref.fingerprint]);
      const agentRevision = agentRevisionResult.rows[0] ? validateAgentRevisionV2(decode<AgentRevisionV2>(agentRevisionResult.rows[0].payload)) : undefined;
      if (!agentRevision) throw new NativeRuntimeBindingCorruptionError(input.assignment_id, "exact Agent revision is missing");
      const compiledAt = input.compiled_at ?? Date.now();
      const intentId = input.intent_id ?? `execution_intent_${assignment.assignment_id}`;
      const attemptId = input.attempt_id ?? `attempt_${assignment.assignment_id}`;
      const effectiveConfigurationSnapshot = createAgentEffectiveConfigurationSnapshotV1({
        snapshot_id: `effective_configuration_${intentId}`,
        run_id: assignment.run_id,
        task_id: assignment.task_id,
        assignment_id: assignment.assignment_id,
        assignment_generation: assignment.generation,
        scope: run.scope,
        agent_revision: agentRevision,
        workforce_revision_ref: member.workforce_revision_ref,
        resolved_at: compiledAt,
        resource_observations: [...(input.resource_observations ?? []), ...(input.provider_model_observations ?? [])],
      });
      const intent = createRuntimeExecutionIntentV2({
        intent_id: intentId,
        run_id: assignment.run_id,
        task_id: assignment.task_id,
        assignment_id: assignment.assignment_id,
        assignment_generation: assignment.generation,
        member_slot_id: member.slot_id,
        agent_id: agentRevision.ref.entity_id,
        agent_revision_ref: agentRevision.ref,
        workforce_revision_ref: member.workforce_revision_ref,
        runtime_configuration: { runtime_preferences: agentRevision.runtime_preferences },
        effective_configuration_snapshot: effectiveConfigurationSnapshot,
        status: "compiled",
        compiled_at: compiledAt,
        provenance: {
          assignment_id: assignment.assignment_id,
          assignment_generation: assignment.generation,
          member_slot_id: member.slot_id,
          agent_revision: agentRevision.ref.revision,
          workforce_revision: member.workforce_revision_ref.revision,
        },
      });
      const attempt = createTaskAttemptV2({
        attempt_id: attemptId,
        task_run_id: assignment.task_id,
        attempt: 1,
        dispatch_key: `${assignment.task_id}:${assignment.assignment_id}:${assignment.generation}`,
        execution_id: intent.intent_id,
        execution_intent_id: intent.intent_id,
        assignment_id: assignment.assignment_id,
        assignment_generation: assignment.generation,
        member_slot_id: member.slot_id,
        agent_id: agentRevision.ref.entity_id,
        agent_revision_ref: agentRevision.ref,
        workforce_revision_ref: member.workforce_revision_ref,
        status: "queued",
      });
      await query(this.db, "persist runtime execution intent", `
        INSERT INTO acs_runtime_execution_intents (
          intent_id, run_id, task_id, assignment_id, assignment_generation, member_slot_id,
          agent_id, agent_revision, workforce_revision, status, payload, compiled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, to_timestamp($12 / 1000.0))
        ON CONFLICT (intent_id) DO NOTHING
      `, [intent.intent_id, intent.run_id, intent.task_id, intent.assignment_id, intent.assignment_generation, intent.member_slot_id, intent.agent_id, intent.agent_revision_ref.revision, intent.workforce_revision_ref.revision, intent.status, serialize(intent), intent.compiled_at]);
      await query(this.db, "persist runtime Attempt assignment binding", `
        INSERT INTO acs_runtime_attempts (
          attempt_id, run_id, task_id, intent_id, assignment_id, assignment_generation, payload, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, to_timestamp($8 / 1000.0))
        ON CONFLICT (attempt_id) DO NOTHING
      `, [attempt.attempt_id, intent.run_id, intent.task_id, intent.intent_id, intent.assignment_id, intent.assignment_generation, serialize(attempt), intent.compiled_at]);
      const eventInput: Omit<EventEnvelopeV2, "sequence"> = {
        schema_version: ACS_NATIVE_SCHEMA_VERSION,
        event_id: `event_${intent.intent_id}`,
        event_type: "execution.intent_compiled",
        timestamp: compiledAt,
        organization_id: run.scope.organization_id,
        product_domain: run.scope.product_domain,
        ...(run.scope.tenant_id ? { tenant_id: run.scope.tenant_id } : {}),
        run_id: intent.run_id,
        task_id: intent.task_id,
        attempt: attempt.attempt,
        agent_id: intent.agent_id,
        workforce_id: intent.workforce_revision_ref.entity_id,
        actor: { kind: "system", ref: "acs.runtime" },
        source: "acs",
        correlation_id: input.correlation_id ?? input.idempotency.key,
        idempotency_key: input.idempotency.key,
        payload: { intent_id: intent.intent_id, assignment_id: intent.assignment_id, assignment_generation: intent.assignment_generation, member_slot_id: intent.member_slot_id, agent_revision: intent.agent_revision_ref.revision, effective_configuration_snapshot_id: effectiveConfigurationSnapshot.snapshot_id, effective_configuration_fingerprint: effectiveConfigurationSnapshot.effective_fingerprint },
      };
      const event = await this.appendEvent({
        ...eventInput,
        sequence: await this.nextEventSequence(streamScope(eventInput)),
      });
      const outbox = await this.insertOutbox(event.event.event_id, `outbox_${intent.intent_id}`);
      void outbox;
      return { intent, attempt, event_id: event.event.event_id };
    });
  }

  async getExecutionIntent(intentId: string): Promise<RuntimeExecutionIntentV2 | undefined> {
    const result = await query<PayloadRow>(this.db, "get runtime execution intent", "SELECT payload FROM acs_runtime_execution_intents WHERE intent_id = $1", [intentId]);
    return result.rows[0] ? validateRuntimeExecutionIntentV2(decode<RuntimeExecutionIntentV2>(result.rows[0].payload)) : undefined;
  }

  async getAttempt(attemptId: string): Promise<TaskAttemptV2 | undefined> {
    const result = await query<PayloadRow>(this.db, "get runtime Attempt", "SELECT payload FROM acs_runtime_attempts WHERE attempt_id = $1", [attemptId]);
    return result.rows[0] ? validateTaskAttemptV2(decode<TaskAttemptV2>(result.rows[0].payload)) : undefined;
  }

  async listExecutionIntents(runId: string, taskId?: string): Promise<readonly RuntimeExecutionIntentV2[]> {
    const result = await query<PayloadRow>(this.db, "list runtime execution intents", `
      SELECT payload FROM acs_runtime_execution_intents
      WHERE run_id = $1 ${taskId === undefined ? "" : "AND task_id = $2"}
      ORDER BY compiled_at, intent_id
    `, taskId === undefined ? [runId] : [runId, taskId]);
    return result.rows.map((row) => validateRuntimeExecutionIntentV2(decode<RuntimeExecutionIntentV2>(row.payload)));
  }

  async listAttempts(runId: string, taskId?: string): Promise<readonly TaskAttemptV2[]> {
    const result = await query<PayloadRow>(this.db, "list runtime attempts", `
      SELECT payload FROM acs_runtime_attempts
      WHERE run_id = $1 ${taskId === undefined ? "" : "AND task_id = $2"}
      ORDER BY created_at, attempt_id
    `, taskId === undefined ? [runId] : [runId, taskId]);
    return result.rows.map((row) => validateTaskAttemptV2(decode<TaskAttemptV2>(row.payload)));
  }

  private async nextEventSequence(scope: string): Promise<number> {
    const result = await query<{ readonly sequence: string | number } & QueryResultRow>(this.db, "read next runtime event sequence", "SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM acs_native_events WHERE stream_scope = $1", [scope]);
    return Number(result.rows[0]?.sequence ?? 1);
  }

  private async idempotent<T>(idempotency: Idempotency, operation: string, fn: () => Promise<T>): Promise<T> {
    await query(this.db, "lock native idempotency", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${idempotency.scope}:${idempotency.key}`]);
    const existing = await query<IdempotencyRow>(this.db, "read native idempotency", `
      SELECT request_hash, operation, status, result, created_at, completed_at
      FROM acs_native_idempotency
      WHERE scope = $1 AND idempotency_key = $2
      FOR UPDATE
    `, [idempotency.scope, idempotency.key]);
    const prior = existing.rows[0];
    if (prior) {
      if (prior.request_hash !== idempotency.request_hash || prior.operation !== operation || prior.status !== "succeeded") {
        throw new NativeIdempotencyConflictError(idempotency.scope, idempotency.key);
      }
      return decode<T>(prior.result);
    }
    const result = await fn();
    const now = Date.now();
    await query(this.db, "record native idempotency", `
      INSERT INTO acs_native_idempotency (
        scope, idempotency_key, request_hash, operation, status, result, created_at, completed_at
      ) VALUES ($1, $2, $3, $4, 'succeeded', $5::jsonb, to_timestamp($6 / 1000.0), to_timestamp($6 / 1000.0))
    `, [idempotency.scope, idempotency.key, idempotency.request_hash, operation, serialize(result), now]);
    return result;
  }

  private async appendEvent(eventInput: EventEnvelopeV2): Promise<NativeDurableEvent> {
    const event = validateEventEnvelopeV2(eventInput);
    const scope = streamScope(event);
    await query(this.db, "lock native event stream", "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [scope]);
    const previous = await query<{ readonly sequence: string | number } & QueryResultRow>(this.db, "read native event stream head", `
      SELECT sequence FROM acs_native_events
      WHERE stream_scope = $1
      ORDER BY sequence DESC
      LIMIT 1
      FOR UPDATE
    `, [scope]);
    const expected = previous.rows[0] ? Number(previous.rows[0].sequence) + 1 : 1;
    if (event.sequence !== expected) {
      throw new RevisionConflictError(`native-event-stream:${scope}`, expected, previous.rows[0] ? Number(previous.rows[0].sequence) : 0);
    }
    await query(this.db, "append canonical native event", `
      INSERT INTO acs_native_events (
        event_id, stream_scope, sequence, event_type, schema_version, occurred_at,
        organization_id, product_domain, tenant_id, agent_id, workforce_id, run_id, task_id, attempt,
        subject_type, subject_id, correlation_id, causation_id, idempotency_key, actor, source, payload
      ) VALUES (
        $1, $2, $3, $4, $5, to_timestamp($6 / 1000.0),
        $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20::jsonb, $21, $22::jsonb
      )
    `, [
      event.event_id, scope, event.sequence, event.event_type, event.schema_version, event.timestamp,
      event.organization_id, event.product_domain, event.tenant_id ?? null, event.agent_id ?? null,
      event.workforce_id ?? null, event.run_id ?? null, event.task_id ?? null, event.attempt ?? null,
      event.subject_type ?? null, event.subject_id ?? null, event.correlation_id,
      event.causation_id ?? null, event.idempotency_key ?? null, serialize(event.actor), event.source,
      serialize(event),
    ]);
    return { streamScope: scope, event };
  }

  private async insertOutbox(eventId: string, outboxId = `outbox_${randomUUID()}`, deliveryKind = "canonical", availableAt = Date.now()): Promise<NativeOutboxRecord> {
    requireText(deliveryKind, "deliveryKind");
    const inserted = await query<OutboxRow>(this.db, "create native outbox record", `
      INSERT INTO acs_native_outbox (
        outbox_id, event_id, delivery_kind, status, available_at, attempt_count, created_at
      ) VALUES ($1, $2, $3, 'pending', to_timestamp($4 / 1000.0), 0, to_timestamp($4 / 1000.0))
      RETURNING outbox_id, event_id, delivery_kind, status, available_at, attempt_count,
        created_at, lease_owner, lease_expires_at, delivered_at, last_failure
    `, [outboxId, eventId, deliveryKind, availableAt]);
    if (!inserted.rows[0]) throw new TransactionFailedError("create native outbox record");
    return outboxFromRow(inserted.rows[0]);
  }

  private async assertRuntimeOwnership(input: RuntimeOwnershipInput): Promise<DurableJobAssignment> {
    const at = input.at ?? Date.now();
    const assignmentResult = await query<PayloadRow>(this.db, "validate native fenced assignment", `
      SELECT payload FROM acs_runtime_assignments WHERE assignment_id = $1 FOR UPDATE
    `, [input.assignmentId]);
    const assignment = assignmentResult.rows[0] ? decode<DurableJobAssignment>(assignmentResult.rows[0].payload) : undefined;
    if (!assignment
      || assignment.jobId !== input.jobId
      || assignment.workerId !== input.workerId
      || assignment.workerInstanceId !== input.instanceId
      || assignment.leaseId !== input.leaseId
      || assignment.fencingToken !== input.fencingToken
      || assignment.status !== "active"
      || assignment.leaseExpiresAt < at) {
      throw new NativeFencingError(input.jobId, input.assignmentId, input.fencingToken);
    }
    const worker = await query<PayloadRow>(this.db, "validate native fenced worker", "SELECT payload FROM acs_runtime_workers WHERE worker_id = $1 FOR UPDATE", [input.workerId]);
    const workerPayload = worker.rows[0] ? decode<{ readonly instanceId: string; readonly servicePrincipalId: string }>(worker.rows[0].payload) : undefined;
    if (!workerPayload || workerPayload.instanceId !== input.instanceId || workerPayload.servicePrincipalId !== input.servicePrincipalId) {
      throw new NativeFencingError(input.jobId, input.assignmentId, input.fencingToken);
    }
    return assignment;
  }

  private async insertEconomicRecord(kind: "native_usage" | "native_cost", recordId: string, tenantId: string | undefined, idempotencyKey: string, payload: UsageRecordV2 | CostRecordV2): Promise<void> {
    const record = { kind, recordId, ...(tenantId ? { tenantId } : {}), idempotencyKey, revision: 1, payload };
    const inserted = await query(this.db, "persist native accounting record", `
      INSERT INTO acs_economic_records (kind, record_id, tenant_id, idempotency_key, revision, payload)
      VALUES ($1, $2, $3, $4, 1, $5::jsonb)
      ON CONFLICT DO NOTHING
      RETURNING record_id
    `, [kind, recordId, tenantId ?? null, idempotencyKey, serialize(record)]);
    if ((inserted.rowCount ?? 0) === 1) return;
    const existing = await query<PayloadRow>(this.db, "read native accounting record", "SELECT payload FROM acs_economic_records WHERE kind = $1 AND record_id = $2", [kind, recordId]);
    if (!existing.rows[0] || !equal(decode(existing.rows[0].payload), record)) throw new NativeIdempotencyConflictError(`accounting:${kind}`, recordId);
  }

  private assertLifecycleTransition(
    from: WorkforceDefinitionV2["current_status"],
    to: WorkforceDefinitionV2["current_status"],
    eventType: string,
  ): void {
    if (from === "archived") throw new NativeWorkforceReferenceError("lifecycle", from, "archived Workforces cannot receive successors");
    const transition = `${from}->${to}`;
    const lifecycleTransitions = new Set(["draft->active", "disabled->active", "active->disabled", "draft->archived", "active->archived", "disabled->archived"]);
    if (from === to) {
      if (eventType !== "workforce.revision.created") throw new NativeWorkforceReferenceError("lifecycle", transition, "composition-only successors require workforce.revision.created");
      return;
    }
    if (!lifecycleTransitions.has(transition)) throw new NativeWorkforceReferenceError("lifecycle", transition, "unsupported Workforce lifecycle transition");
    if (eventType !== "workforce.lifecycle.changed") throw new NativeWorkforceReferenceError("lifecycle", transition, "lifecycle successors require workforce.lifecycle.changed");
  }

  private async assertWorkforceReferences(definition: WorkforceDefinitionV2, revision: WorkforceRevisionV2): Promise<void> {
    for (const member of revision.members) {
      const lineage = await this.getAgentLineage(member.agent_selector.agent_id).catch((error: unknown) => {
        if (error instanceof NativeLineageIntegrityError) {
          throw new NativeWorkforceReferenceError(definition.workforce_id, member.agent_selector.agent_id, "referenced Agent revision lineage is unavailable", { cause: error });
        }
        throw error;
      });
      if (lineage.definition.scope.organization_id !== definition.scope.organization_id
        || lineage.definition.scope.product_domain !== definition.scope.product_domain
        || lineage.definition.scope.tenant_id !== definition.scope.tenant_id) {
        throw new NativeWorkforceReferenceError(definition.workforce_id, member.agent_selector.agent_id, "Agent scope is not eligible and no explicit sharing path was supplied");
      }
      if (lineage.definition.status === "archived" || lineage.definition.status === "disabled") {
        throw new NativeWorkforceReferenceError(definition.workforce_id, member.agent_selector.agent_id, `Agent status ${lineage.definition.status} is not eligible for new Workforce membership`);
      }
      if (member.agent_selector.mode === "pinned") {
        const pinnedRevisionRef = member.agent_selector.pinned_revision_ref;
        const matched = lineage.revisions.find((candidate) => equal(candidate.ref, pinnedRevisionRef));
        if (!matched) throw new NativeWorkforceReferenceError(definition.workforce_id, member.agent_selector.agent_id, "pinned Agent revision does not exist with the requested fingerprint");
      }
      if (member.role_ref) {
        await query(this.db, "share lock governed role history", "SELECT pg_advisory_xact_lock_shared(hashtextextended($1, 0))", [`governed-role:${member.role_ref.entity_id}`]);
        const role = await this.getGovernedRoleRevision(member.role_ref);
        if (!role) throw new NativeWorkforceReferenceError(definition.workforce_id, member.role_ref.entity_id, "exact governed role revision is unavailable");
        if (role.status === "deprecated") {
          throw new NativeWorkforceReferenceError(definition.workforce_id, member.role_ref.entity_id, "referenced governed role revision is deprecated and cannot be used for a new Workforce revision");
        }
        const currentRole = await this.getGovernedRoleHead(member.role_ref.entity_id);
        if (!currentRole || currentRole.status === "deprecated") {
          throw new NativeWorkforceReferenceError(definition.workforce_id, member.role_ref.entity_id, `governed role is ${currentRole?.status ?? "unavailable"} and cannot be used for a new Workforce revision`);
        }
      }
    }
  }
}
