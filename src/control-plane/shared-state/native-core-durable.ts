import { randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import {
  NativeContractValidationError,
  stableStringify,
  validateIdempotency,
  type Idempotency,
} from "../../native-core/primitives.js";
import {
  validateAgentDefinitionV2,
  validateAgentRevisionV2,
  type AgentDefinitionV2,
  type AgentRevisionV2,
} from "../../native-core/agent.js";
import {
  validateCheckpointV2,
  validateEventEnvelopeV2,
  type CheckpointV2,
  type EventEnvelopeV2,
} from "../../native-core/runtime.js";
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
  if (event.agent_id) return `agent:${event.agent_id}`;
  if (event.run_id) return `run:${event.run_id}`;
  if (event.task_id) return `task:${event.task_id}`;
  throw new NativeContractValidationError("native event requires a stream subject", [{
    path: "event",
    code: "MISSING_STREAM_SUBJECT",
    message: "Canonical event must identify Agent, Run, or Task ownership",
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
      WHERE agent_id = $1 AND record_kind = 'native_v2'
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
        organization_id, product_domain, tenant_id, agent_id, run_id, task_id, attempt,
        correlation_id, causation_id, idempotency_key, actor, source, payload
      ) VALUES (
        $1, $2, $3, $4, $5, to_timestamp($6 / 1000.0),
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17::jsonb, $18, $19::jsonb
      )
    `, [
      event.event_id, scope, event.sequence, event.event_type, event.schema_version, event.timestamp,
      event.organization_id, event.product_domain, event.tenant_id ?? null, event.agent_id ?? null,
      event.run_id ?? null, event.task_id ?? null, event.attempt ?? null, event.correlation_id,
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
}
