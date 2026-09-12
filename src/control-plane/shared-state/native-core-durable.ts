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
import { validateRunV2, type RunV2 } from "../../native-core/runtime.js";
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

export interface AsyncNativeCoreRepository {
  advanceAgentLineage(input: NativeAgentLineageCommand): Promise<NativeAgentLineageCommandResult>;
  getAgentLineage(agentId: string): Promise<NativeAgentLineage>;
  advanceWorkforceLineage(input: NativeWorkforceLineageCommand): Promise<NativeWorkforceLineageCommandResult>;
  getWorkforceLineage(workforceId: string): Promise<NativeWorkforceLineage>;
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
  getRunMembership(runId: string): Promise<readonly WorkforceRunMembershipV2[]>;
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
      || error instanceof NativeWorkforceLineageIntegrityError
      || error instanceof NativeWorkforceReferenceError
      || error instanceof NativeGovernedRoleHistoryError
      || error instanceof NativeFencingError
      || error instanceof NativeOutboxLeaseError
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

function streamScope(event: EventEnvelopeV2): string {
  if (event.workforce_id && !event.run_id && !event.task_id) return `workforce:${event.workforce_id}`;
  if (event.agent_id) return `agent:${event.agent_id}`;
  if (event.run_id) return `run:${event.run_id}`;
  if (event.task_id) return `task:${event.task_id}`;
  throw new NativeContractValidationError("native event requires a stream subject", [{
    path: "event",
    code: "MISSING_STREAM_SUBJECT",
    message: "Canonical event must identify Agent, Workforce, Run, or Task ownership",
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
  constructor(private readonly db: NativeCoreQueryable) {}

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

  async getRunMembership(runId: string): Promise<readonly WorkforceRunMembershipV2[]> {
    const result = await query<PayloadRow>(this.db, "get Workforce Run membership snapshot", `
      SELECT member.payload
      FROM acs_workforce_run_membership_members member
      JOIN acs_workforce_run_membership_snapshots snapshot ON snapshot.snapshot_id = member.snapshot_id
      WHERE snapshot.run_id = $1 ORDER BY member.slot_id
    `, [runId]);
    return result.rows.map((row) => validateWorkforceRunMembershipV2(decode<WorkforceRunMembershipV2>(row.payload)));
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
        correlation_id, causation_id, idempotency_key, actor, source, payload
      ) VALUES (
        $1, $2, $3, $4, $5, to_timestamp($6 / 1000.0),
        $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18::jsonb, $19, $20::jsonb
      )
    `, [
      event.event_id, scope, event.sequence, event.event_type, event.schema_version, event.timestamp,
      event.organization_id, event.product_domain, event.tenant_id ?? null, event.agent_id ?? null,
      event.workforce_id ?? null, event.run_id ?? null, event.task_id ?? null, event.attempt ?? null, event.correlation_id,
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
