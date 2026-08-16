import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AuditService } from "../control-plane/audit-service.js";
import type { WorkerCapability, WorkerEligibilityRequirements } from "./worker-types.js";
import type { OperationalTelemetryProvider, TraceContext } from "../control-plane/operational-telemetry.js";

export type ExecutionJobStatus =
  | "queued"
  | "assigned"
  | "running"
  | "succeeded"
  | "failed"
  | "cancel_requested"
  | "cancelled";

export type DurableWorkerStatus = "registered" | "available" | "busy" | "draining" | "offline";
export type DurableAssignmentStatus = "active" | "completed" | "failed" | "cancelled" | "expired";

export interface RuntimeStartWorkload {
  readonly type: "runtime.start";
  readonly deploymentId: string;
  readonly agentId?: string;
  readonly deploymentMode: "sandbox";
  readonly targetId: string;
}

export type ExecutionJobWorkload = RuntimeStartWorkload;

export interface DurableExecutionResult {
  readonly status: "success";
  readonly output: Readonly<Record<string, unknown>>;
  readonly evidenceRefs: readonly string[];
  readonly usageRecords: readonly {
    readonly dimension: string;
    readonly quantity: string;
    readonly unit: string;
    readonly startTime: number;
    readonly endTime: number;
    readonly source: "worker" | "engine" | "runner" | "provider";
    readonly confidence: "estimated" | "final";
  }[];
  readonly completedAt: number;
}

export interface DurableExecutionError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface ExecutionJob {
  readonly jobId: string;
  readonly tenantId: string;
  readonly runtimeInstanceId: string;
  readonly deploymentId: string;
  readonly agentId?: string;
  readonly workloadType: ExecutionJobWorkload["type"];
  readonly workload: ExecutionJobWorkload;
  readonly requirements: WorkerEligibilityRequirements;
  readonly status: ExecutionJobStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly correlationId: string;
  readonly traceContext?: TraceContext;
  readonly idempotencyKey?: string;
  readonly result?: DurableExecutionResult;
  readonly error?: DurableExecutionError;
  readonly cancellationRequestedAt?: number;
}

export interface DurableWorkerRegistration {
  readonly workerId: string;
  readonly instanceId: string;
  readonly servicePrincipalId: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: WorkerCapability;
  readonly status: DurableWorkerStatus;
  readonly registeredAt: number;
  readonly lastHeartbeatAt?: number;
  readonly expiresAt?: number;
  readonly revision: number;
  readonly activeRuns: number;
}

export interface DurableJobAssignment {
  readonly assignmentId: string;
  readonly jobId: string;
  readonly workerId: string;
  readonly workerInstanceId: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly assignedAt: number;
  readonly leaseExpiresAt: number;
  readonly attempt: number;
  readonly status: DurableAssignmentStatus;
  readonly revision: number;
}

export interface RuntimeClaim {
  readonly job: ExecutionJob;
  readonly assignment: DurableJobAssignment;
}

export interface RuntimeRecoveryResult {
  readonly scannedAt: number;
  readonly workersMarkedOffline: number;
  readonly assignmentsExpired: number;
  readonly jobsRequeued: number;
  readonly jobsCancelled: number;
  readonly jobsFailed: number;
}

export interface RuntimeStateEvent {
  readonly eventId: string;
  readonly tenantId?: string;
  readonly jobId?: string;
  readonly assignmentId?: string;
  readonly workerId?: string;
  readonly category: string;
  readonly outcome: "allowed" | "succeeded" | "denied" | "failed";
  readonly reason?: string;
  readonly correlationId?: string;
  readonly timestamp: number;
  readonly revision?: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RuntimeStateStoreDescriptor {
  readonly adapter: string;
  readonly productionOriented: boolean;
  readonly durability: "single_node_durable";
  readonly multiInstance: "shared_database";
  readonly multiHost: "not_proven";
}

export class RuntimeStateError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "RuntimeStateError";
  }
}

export class RuntimeStateConflictError extends RuntimeStateError {
  constructor(message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message, "ACS_RUNTIME_STATE_CONFLICT", details);
    this.name = "RuntimeStateConflictError";
  }
}

export class RuntimeStaleOwnerError extends RuntimeStateError {
  constructor(jobId: string, assignmentId: string, fencingToken: number) {
    super("stale worker ownership cannot mutate the job", "ACS_RUNTIME_STALE_OWNER", {
      jobId,
      assignmentId,
      fencingToken,
    });
    this.name = "RuntimeStaleOwnerError";
  }
}

export class RuntimePersistenceError extends RuntimeStateError {
  constructor(operation: string) {
    super("durable runtime persistence failed", "ACS_RUNTIME_PERSISTENCE_FAILED", { operation });
    this.name = "RuntimePersistenceError";
  }
}

export class RuntimeWorkerIdentityError extends RuntimeStateError {
  constructor(workerId: string, instanceId: string) {
    super("worker identity does not own this registration", "ACS_RUNTIME_WORKER_IDENTITY_MISMATCH", {
      workerId,
      instanceId,
    });
    this.name = "RuntimeWorkerIdentityError";
  }
}

interface JobRow { readonly payload_json: string; }
interface WorkerRow { readonly payload_json: string; }
interface AssignmentRow { readonly payload_json: string; }
interface EventRow { readonly payload_json: string; }

function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => typeof nested === "bigint" ? nested.toString() : nested);
}

function parsePayload<T>(payload: string, kind: string): T {
  try {
    const value = JSON.parse(payload) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid shape");
    return value as T;
  } catch {
    throw new RuntimePersistenceError("decode " + kind);
  }
}

function assertIdentifier(value: string, label: string): void {
  if (!value.trim()) throw new RuntimeStateError(label + " is required", "ACS_RUNTIME_INVALID_INPUT", { field: label });
}

function terminal(status: ExecutionJobStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled";
}

export function isWorkerEligibleForRequirements(
  capabilities: WorkerCapability,
  requirements: WorkerEligibilityRequirements,
): boolean {
  if (requirements.engineId && capabilities.engineId !== requirements.engineId) return false;
  if (requirements.engineRevision && capabilities.engineRevision !== requirements.engineRevision) return false;
  if (requirements.requiredRunners?.some((item) => !capabilities.supportedRunners.includes(item))) return false;
  if (requirements.requiredProviders?.some((item) => !capabilities.supportedProviders.includes(item))) return false;
  if (requirements.requiredIsolationMode && !capabilities.supportedIsolationModes.includes(requirements.requiredIsolationMode)) return false;
  if (requirements.requiredDeploymentMode && !capabilities.supportedDeploymentModes.includes(requirements.requiredDeploymentMode)) return false;
  if (requirements.targetId && !capabilities.supportedTargetIds?.includes(requirements.targetId)) return false;
  return true;
}

export class SqliteDurableRuntimeState {
  readonly descriptor: RuntimeStateStoreDescriptor = {
    adapter: "sqlite-durable-runtime",
    productionOriented: true,
    durability: "single_node_durable",
    multiInstance: "shared_database",
    multiHost: "not_proven",
  };
  readonly #database: DatabaseSync;

  constructor(options: { readonly filePath: string }) {
    assertIdentifier(options.filePath, "runtime database path");
    mkdirSync(dirname(options.filePath), { recursive: true, mode: 0o700 });
    try {
      this.#database = new DatabaseSync(options.filePath);
      this.#database.exec("PRAGMA journal_mode = WAL");
      this.#database.exec("PRAGMA foreign_keys = ON");
      this.#database.exec("PRAGMA busy_timeout = 5000");
      this.#database.exec(`
        CREATE TABLE IF NOT EXISTS runtime_jobs (
          job_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          status TEXT NOT NULL,
          revision INTEGER NOT NULL,
          attempt INTEGER NOT NULL,
          max_attempts INTEGER NOT NULL,
          correlation_id TEXT NOT NULL,
          idempotency_key TEXT,
          next_fencing_token INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          payload_json TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS runtime_jobs_idempotency_idx
          ON runtime_jobs (tenant_id, idempotency_key)
          WHERE idempotency_key IS NOT NULL;
        CREATE INDEX IF NOT EXISTS runtime_jobs_queue_idx
          ON runtime_jobs (status, created_at, job_id);

        CREATE TABLE IF NOT EXISTS runtime_workers (
          worker_id TEXT PRIMARY KEY,
          instance_id TEXT NOT NULL,
          service_principal_id TEXT NOT NULL,
          status TEXT NOT NULL,
          expires_at INTEGER,
          revision INTEGER NOT NULL,
          active_runs INTEGER NOT NULL,
          payload_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS runtime_workers_expiry_idx
          ON runtime_workers (status, expires_at);

        CREATE TABLE IF NOT EXISTS runtime_assignments (
          assignment_id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES runtime_jobs(job_id),
          worker_id TEXT NOT NULL REFERENCES runtime_workers(worker_id),
          lease_id TEXT NOT NULL UNIQUE,
          fencing_token INTEGER NOT NULL,
          lease_expires_at INTEGER NOT NULL,
          status TEXT NOT NULL,
          revision INTEGER NOT NULL,
          payload_json TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS runtime_assignments_active_job_idx
          ON runtime_assignments (job_id)
          WHERE status = 'active';
        CREATE INDEX IF NOT EXISTS runtime_assignments_expiry_idx
          ON runtime_assignments (status, lease_expires_at);

        CREATE TABLE IF NOT EXISTS runtime_events (
          event_id TEXT PRIMARY KEY,
          tenant_id TEXT,
          job_id TEXT,
          worker_id TEXT,
          timestamp INTEGER NOT NULL,
          payload_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS runtime_events_job_idx
          ON runtime_events (job_id, timestamp, event_id);
      `);
    } catch {
      throw new RuntimePersistenceError("open runtime database");
    }
  }

  createJob(input: {
    readonly jobId?: string;
    readonly tenantId: string;
    readonly runtimeInstanceId: string;
    readonly workload: ExecutionJobWorkload;
    readonly requirements: WorkerEligibilityRequirements;
    readonly correlationId: string;
    readonly idempotencyKey?: string;
    readonly maxAttempts?: number;
    readonly createdAt?: number;
    readonly traceContext?: TraceContext;
  }): ExecutionJob {
    assertIdentifier(input.tenantId, "tenantId");
    assertIdentifier(input.runtimeInstanceId, "runtimeInstanceId");
    assertIdentifier(input.correlationId, "correlationId");
    const createdAt = input.createdAt ?? Date.now();
    const maxAttempts = input.maxAttempts ?? 3;
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts <= 0) {
      throw new RuntimeStateError("maxAttempts must be a positive integer", "ACS_RUNTIME_INVALID_INPUT", { field: "maxAttempts" });
    }
    const jobId = input.jobId ?? `job_${randomUUID()}`;
    const existing = input.idempotencyKey
      ? this.#findJobByIdempotency(input.tenantId, input.idempotencyKey)
      : undefined;
    if (existing) {
      if (existing.workloadType !== input.workload.type
        || existing.runtimeInstanceId !== input.runtimeInstanceId
        || serialize(existing.workload) !== serialize(input.workload)) {
        throw new RuntimeStateConflictError("runtime idempotency key was reused for a different job", {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
          existingJobId: existing.jobId,
        });
      }
      return existing;
    }
    const job: ExecutionJob = {
      jobId,
      tenantId: input.tenantId,
      runtimeInstanceId: input.runtimeInstanceId,
      deploymentId: input.workload.deploymentId,
      ...(input.workload.agentId ? { agentId: input.workload.agentId } : {}),
      workloadType: input.workload.type,
      workload: input.workload,
      requirements: input.requirements,
      status: "queued",
      createdAt,
      updatedAt: createdAt,
      revision: 1,
      attempt: 0,
      maxAttempts,
      correlationId: input.correlationId,
      ...(input.traceContext ? { traceContext: input.traceContext } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    };
    this.#transaction("create job", () => {
      this.#database.prepare(`
        INSERT INTO runtime_jobs (
          job_id, tenant_id, status, revision, attempt, max_attempts,
          correlation_id, idempotency_key, next_fencing_token, created_at, updated_at, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).run(
        job.jobId,
        job.tenantId,
        job.status,
        job.revision,
        job.attempt,
        job.maxAttempts,
        job.correlationId,
        job.idempotencyKey ?? null,
        job.createdAt,
        job.updatedAt,
        serialize(job),
      );
      this.#appendEvent({
        tenantId: job.tenantId,
        jobId: job.jobId,
        category: "runtime.job.queued",
        outcome: "succeeded",
        correlationId: job.correlationId,
        timestamp: createdAt,
        revision: job.revision,
        metadata: { workloadType: job.workloadType, maxAttempts },
      });
    });
    return job;
  }

  getJob(jobId: string): ExecutionJob | undefined {
    const row = this.#database.prepare("SELECT payload_json FROM runtime_jobs WHERE job_id = ?")
      .get(jobId) as unknown as JobRow | undefined;
    return row ? parsePayload<ExecutionJob>(row.payload_json, "job") : undefined;
  }

  listJobs(filter: { readonly tenantId?: string; readonly status?: ExecutionJobStatus } = {}): readonly ExecutionJob[] {
    const clauses: string[] = [];
    const values: (string | number)[] = [];
    if (filter.tenantId) { clauses.push("tenant_id = ?"); values.push(filter.tenantId); }
    if (filter.status) { clauses.push("status = ?"); values.push(filter.status); }
    const sql = "SELECT payload_json FROM runtime_jobs"
      + (clauses.length ? " WHERE " + clauses.join(" AND ") : "")
      + " ORDER BY created_at, job_id";
    const rows = this.#database.prepare(sql).all(...values) as unknown as JobRow[];
    return rows.map((row) => parsePayload<ExecutionJob>(row.payload_json, "job"));
  }

  registerWorker(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly name: string;
    readonly version: string;
    readonly capabilities: WorkerCapability;
    readonly registeredAt?: number;
  }): DurableWorkerRegistration {
    assertIdentifier(input.workerId, "workerId");
    assertIdentifier(input.instanceId, "instanceId");
    assertIdentifier(input.servicePrincipalId, "servicePrincipalId");
    const at = input.registeredAt ?? Date.now();
    return this.#transaction("register worker", () => {
      const existing = this.getWorker(input.workerId);
      if (existing && existing.servicePrincipalId !== input.servicePrincipalId) {
        throw new RuntimeWorkerIdentityError(input.workerId, input.instanceId);
      }
      if (existing && existing.instanceId !== input.instanceId && existing.status !== "offline") {
        throw new RuntimeStateConflictError("worker already has a live instance", {
          workerId: input.workerId,
          currentInstanceId: existing.instanceId,
          requestedInstanceId: input.instanceId,
        });
      }
      const worker: DurableWorkerRegistration = {
        workerId: input.workerId,
        instanceId: input.instanceId,
        servicePrincipalId: input.servicePrincipalId,
        name: input.name,
        version: input.version,
        capabilities: input.capabilities,
        status: "registered",
        registeredAt: existing?.registeredAt ?? at,
        revision: (existing?.revision ?? 0) + 1,
        activeRuns: existing?.instanceId === input.instanceId ? existing.activeRuns : 0,
      };
      this.#saveWorker(worker);
      this.#appendEvent({
        workerId: worker.workerId,
        category: "runtime.worker.registered",
        outcome: "succeeded",
        timestamp: at,
        revision: worker.revision,
        metadata: { instanceId: worker.instanceId, engineId: worker.capabilities.engineId },
      });
      return worker;
    });
  }

  heartbeat(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly status?: "available" | "busy" | "draining";
    readonly capabilities?: WorkerCapability;
    readonly at?: number;
    readonly staleAfterMs: number;
  }): DurableWorkerRegistration {
    const at = input.at ?? Date.now();
    return this.#transaction("worker heartbeat", () => {
      const worker = this.#requireWorkerIdentity(input.workerId, input.instanceId, input.servicePrincipalId);
      const requestedStatus = input.status ?? (worker.activeRuns >= worker.capabilities.maxConcurrentRuns ? "busy" : "available");
      const updated: DurableWorkerRegistration = {
        ...worker,
        status: requestedStatus,
        capabilities: input.capabilities ?? worker.capabilities,
        lastHeartbeatAt: at,
        expiresAt: at + input.staleAfterMs,
        revision: worker.revision + 1,
      };
      this.#saveWorker(updated);
      return updated;
    });
  }

  getWorker(workerId: string): DurableWorkerRegistration | undefined {
    const row = this.#database.prepare("SELECT payload_json FROM runtime_workers WHERE worker_id = ?")
      .get(workerId) as unknown as WorkerRow | undefined;
    return row ? parsePayload<DurableWorkerRegistration>(row.payload_json, "worker") : undefined;
  }

  listWorkers(): readonly DurableWorkerRegistration[] {
    const rows = this.#database.prepare("SELECT payload_json FROM runtime_workers ORDER BY worker_id")
      .all() as unknown as WorkerRow[];
    return rows.map((row) => parsePayload<DurableWorkerRegistration>(row.payload_json, "worker"));
  }

  claimNext(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly at?: number;
    readonly leaseTtlMs: number;
  }): RuntimeClaim | undefined {
    const at = input.at ?? Date.now();
    // Avoid taking SQLite's single writer lock for an empty poll. The worker and
    // queue are revalidated inside the transaction, so this is only a cheap
    // contention guard and never grants ownership by itself.
    const observedWorker = this.#requireWorkerIdentity(input.workerId, input.instanceId, input.servicePrincipalId);
    if ((observedWorker.status !== "available" && observedWorker.status !== "busy")
      || observedWorker.expiresAt === undefined
      || observedWorker.expiresAt < at
      || observedWorker.activeRuns >= observedWorker.capabilities.maxConcurrentRuns
      || !this.listJobs({ status: "queued" }).some((candidate) => isWorkerEligibleForRequirements(observedWorker.capabilities, candidate.requirements))) {
      return undefined;
    }
    return this.#transaction("claim job", () => {
      const worker = this.#requireWorkerIdentity(input.workerId, input.instanceId, input.servicePrincipalId);
      if (worker.status !== "available" && worker.status !== "busy") return undefined;
      if (worker.expiresAt === undefined || worker.expiresAt < at) return undefined;
      if (worker.activeRuns >= worker.capabilities.maxConcurrentRuns) return undefined;

      const candidates = this.listJobs({ status: "queued" });
      const job = candidates.find((candidate) => isWorkerEligibleForRequirements(worker.capabilities, candidate.requirements));
      if (!job) return undefined;

      const tokenRow = this.#database.prepare(
        "SELECT next_fencing_token FROM runtime_jobs WHERE job_id = ? AND status = 'queued' AND revision = ?",
      ).get(job.jobId, job.revision) as unknown as { next_fencing_token: number } | undefined;
      if (!tokenRow) return undefined;
      const fencingToken = tokenRow.next_fencing_token + 1;
      const assignment: DurableJobAssignment = {
        assignmentId: `assign_${randomUUID()}`,
        jobId: job.jobId,
        workerId: worker.workerId,
        workerInstanceId: worker.instanceId,
        leaseId: `lease_${randomUUID()}`,
        fencingToken,
        assignedAt: at,
        leaseExpiresAt: at + input.leaseTtlMs,
        attempt: job.attempt + 1,
        status: "active",
        revision: 1,
      };
      const updatedJob: ExecutionJob = {
        ...job,
        status: "assigned",
        updatedAt: at,
        revision: job.revision + 1,
        attempt: job.attempt + 1,
      };
      const updatedWorker: DurableWorkerRegistration = {
        ...worker,
        activeRuns: worker.activeRuns + 1,
        status: worker.activeRuns + 1 >= worker.capabilities.maxConcurrentRuns ? "busy" : worker.status,
        revision: worker.revision + 1,
      };
      const change = this.#database.prepare(`
        UPDATE runtime_jobs
        SET status = ?, revision = ?, attempt = ?, next_fencing_token = ?, updated_at = ?, payload_json = ?
        WHERE job_id = ? AND status = 'queued' AND revision = ?
      `).run(
        updatedJob.status,
        updatedJob.revision,
        updatedJob.attempt,
        fencingToken,
        updatedJob.updatedAt,
        serialize(updatedJob),
        job.jobId,
        job.revision,
      );
      if (Number(change.changes) !== 1) throw new RuntimeStateConflictError("job claim lost a concurrency race", { jobId: job.jobId });
      this.#saveAssignment(assignment);
      this.#saveWorker(updatedWorker);
      this.#appendEvent({
        tenantId: job.tenantId,
        jobId: job.jobId,
        assignmentId: assignment.assignmentId,
        workerId: worker.workerId,
        category: "runtime.job.assigned",
        outcome: "succeeded",
        correlationId: job.correlationId,
        timestamp: at,
        revision: updatedJob.revision,
        metadata: { fencingToken, leaseExpiresAt: assignment.leaseExpiresAt, attempt: assignment.attempt },
      });
      return { job: updatedJob, assignment };
    });
  }

  markRunning(input: RuntimeOwnershipInput): ExecutionJob {
    const at = input.at ?? Date.now();
    return this.#transaction("mark job running", () => {
      const { job, assignment } = this.#requireOwnership(input, at);
      if (job.status === "running") return job;
      if (job.status !== "assigned") throw new RuntimeStateConflictError("job cannot start from current status", { jobId: job.jobId, status: job.status });
      const updated: ExecutionJob = { ...job, status: "running", updatedAt: at, revision: job.revision + 1 };
      this.#saveJobCas(updated, job.revision, "assigned");
      this.#appendEvent({
        tenantId: job.tenantId,
        jobId: job.jobId,
        assignmentId: assignment.assignmentId,
        workerId: assignment.workerId,
        category: "runtime.job.running",
        outcome: "succeeded",
        correlationId: job.correlationId,
        timestamp: at,
        revision: updated.revision,
        metadata: { fencingToken: assignment.fencingToken, attempt: assignment.attempt },
      });
      return updated;
    });
  }

  renewLease(input: RuntimeOwnershipInput & { readonly leaseTtlMs: number }): DurableJobAssignment {
    const at = input.at ?? Date.now();
    return this.#transaction("renew lease", () => {
      const { assignment } = this.#requireOwnership(input, at);
      const updated: DurableJobAssignment = {
        ...assignment,
        leaseExpiresAt: at + input.leaseTtlMs,
        revision: assignment.revision + 1,
      };
      this.#saveAssignmentCas(updated, assignment.revision);
      return updated;
    });
  }

  completeJob(input: RuntimeOwnershipInput & {
    readonly result: DurableExecutionResult;
    readonly resultIdempotencyKey: string;
  }): ExecutionJob {
    const at = input.at ?? Date.now();
    return this.#transaction("complete job", () => {
      const existing = this.getJob(input.jobId);
      if (existing?.status === "succeeded") {
        const terminalAssignment = this.getAssignment(input.assignmentId);
        if (!terminalAssignment
          || terminalAssignment.jobId !== input.jobId
          || terminalAssignment.workerId !== input.workerId
          || terminalAssignment.workerInstanceId !== input.instanceId
          || terminalAssignment.leaseId !== input.leaseId
          || terminalAssignment.fencingToken !== input.fencingToken
          || terminalAssignment.status !== "completed") {
          throw new RuntimeStaleOwnerError(input.jobId, input.assignmentId, input.fencingToken);
        }
        const storedKey = existing.result && typeof existing.result.output.__resultIdempotencyKey === "string"
          ? existing.result.output.__resultIdempotencyKey
          : undefined;
        if (storedKey === input.resultIdempotencyKey) return existing;
        throw new RuntimeStateConflictError("job already has a different terminal result", { jobId: input.jobId });
      }
      const { job, assignment, worker } = this.#requireOwnership(input, at);
      if (job.status === "cancel_requested") {
        return this.#cancelOwnedJob(job, assignment, worker, at, "cancellation won before result commit");
      }
      if (job.status !== "running" && job.status !== "assigned") {
        throw new RuntimeStateConflictError("job cannot complete from current status", { jobId: job.jobId, status: job.status });
      }
      const result: DurableExecutionResult = {
        ...input.result,
        output: { ...input.result.output, __resultIdempotencyKey: input.resultIdempotencyKey },
      };
      const updated: ExecutionJob = {
        ...job,
        status: "succeeded",
        result,
        updatedAt: at,
        revision: job.revision + 1,
      };
      this.#saveJobCas(updated, job.revision, job.status);
      this.#closeAssignmentAndReleaseWorker(assignment, worker, "completed");
      this.#appendEvent({
        tenantId: job.tenantId,
        jobId: job.jobId,
        assignmentId: assignment.assignmentId,
        workerId: assignment.workerId,
        category: "runtime.job.completed",
        outcome: "succeeded",
        correlationId: job.correlationId,
        timestamp: at,
        revision: updated.revision,
        metadata: { fencingToken: assignment.fencingToken, attempt: assignment.attempt },
      });
      return updated;
    });
  }

  failJob(input: RuntimeOwnershipInput & { readonly error: DurableExecutionError }): ExecutionJob {
    const at = input.at ?? Date.now();
    return this.#transaction("fail job", () => {
      const { job, assignment, worker } = this.#requireOwnership(input, at);
      if (job.status === "cancel_requested") {
        return this.#cancelOwnedJob(job, assignment, worker, at, "worker observed cancellation");
      }
      if (job.status !== "running" && job.status !== "assigned") {
        throw new RuntimeStateConflictError("job cannot fail from current status", { jobId: job.jobId, status: job.status });
      }
      const retry = input.error.retryable && job.attempt < job.maxAttempts;
      const updated: ExecutionJob = {
        ...job,
        status: retry ? "queued" : "failed",
        error: input.error,
        updatedAt: at,
        revision: job.revision + 1,
      };
      this.#saveJobCas(updated, job.revision, job.status);
      this.#closeAssignmentAndReleaseWorker(assignment, worker, "failed");
      this.#appendEvent({
        tenantId: job.tenantId,
        jobId: job.jobId,
        assignmentId: assignment.assignmentId,
        workerId: assignment.workerId,
        category: retry ? "runtime.job.requeued" : "runtime.job.failed",
        outcome: retry ? "allowed" : "failed",
        reason: input.error.code,
        correlationId: job.correlationId,
        timestamp: at,
        revision: updated.revision,
        metadata: { fencingToken: assignment.fencingToken, attempt: assignment.attempt, retryable: input.error.retryable },
      });
      return updated;
    });
  }

  requestCancellation(jobId: string, tenantId: string, at = Date.now()): ExecutionJob {
    return this.#transaction("request cancellation", () => {
      const job = this.#requireJob(jobId);
      if (job.tenantId !== tenantId) throw new RuntimeStateError("job tenant mismatch", "ACS_RUNTIME_TENANT_MISMATCH", { jobId });
      if (job.status === "cancel_requested" || job.status === "cancelled") return job;
      if (terminal(job.status)) throw new RuntimeStateConflictError("terminal job cannot be cancelled", { jobId, status: job.status });
      const status: ExecutionJobStatus = job.status === "queued" ? "cancelled" : "cancel_requested";
      const updated: ExecutionJob = {
        ...job,
        status,
        cancellationRequestedAt: at,
        updatedAt: at,
        revision: job.revision + 1,
      };
      this.#saveJobCas(updated, job.revision, job.status);
      this.#appendEvent({
        tenantId,
        jobId,
        category: status === "cancelled" ? "runtime.job.cancelled" : "runtime.job.cancel_requested",
        outcome: "succeeded",
        correlationId: job.correlationId,
        timestamp: at,
        revision: updated.revision,
        metadata: { previousStatus: job.status },
      });
      return updated;
    });
  }

  recoverExpired(input: { readonly at?: number; readonly workerStaleAfterMs?: number } = {}): RuntimeRecoveryResult {
    const at = input.at ?? Date.now();
    return this.#transaction("recover expired runtime state", () => {
      let workersMarkedOffline = 0;
      let assignmentsExpired = 0;
      let jobsRequeued = 0;
      let jobsCancelled = 0;
      let jobsFailed = 0;

      for (const worker of this.listWorkers()) {
        if (worker.status !== "offline" && worker.expiresAt !== undefined && worker.expiresAt < at) {
          this.#saveWorker({ ...worker, status: "offline", revision: worker.revision + 1 });
          workersMarkedOffline += 1;
        }
      }

      const rows = this.#database.prepare(
        "SELECT payload_json FROM runtime_assignments WHERE status = 'active' ORDER BY lease_expires_at, assignment_id",
      ).all() as unknown as AssignmentRow[];
      for (const row of rows) {
        const assignment = parsePayload<DurableJobAssignment>(row.payload_json, "assignment");
        const worker = this.getWorker(assignment.workerId);
        if (assignment.leaseExpiresAt >= at && worker?.status !== "offline") continue;
        const job = this.#requireJob(assignment.jobId);
        if (terminal(job.status)) {
          this.#saveAssignmentCas({ ...assignment, status: "expired", revision: assignment.revision + 1 }, assignment.revision);
          assignmentsExpired += 1;
          continue;
        }
        const status: ExecutionJobStatus = job.status === "cancel_requested"
          ? "cancelled"
          : job.attempt >= job.maxAttempts
            ? "failed"
            : "queued";
        const recovered: ExecutionJob = {
          ...job,
          status,
          updatedAt: at,
          revision: job.revision + 1,
          ...(status === "failed" ? { error: { code: "ACS_RUNTIME_RETRY_EXHAUSTED", message: "runtime retry attempts exhausted", retryable: false } } : {}),
        };
        this.#saveJobCas(recovered, job.revision, job.status);
        this.#saveAssignmentCas({ ...assignment, status: "expired", revision: assignment.revision + 1 }, assignment.revision);
        if (worker && worker.activeRuns > 0) {
          this.#saveWorker({ ...worker, activeRuns: worker.activeRuns - 1, revision: worker.revision + 1 });
        }
        assignmentsExpired += 1;
        if (status === "queued") jobsRequeued += 1;
        if (status === "cancelled") jobsCancelled += 1;
        if (status === "failed") jobsFailed += 1;
        this.#appendEvent({
          tenantId: job.tenantId,
          jobId: job.jobId,
          assignmentId: assignment.assignmentId,
          workerId: assignment.workerId,
          category: status === "queued" ? "runtime.job.recovered" : `runtime.job.${status}`,
          outcome: status === "failed" ? "failed" : "succeeded",
          reason: worker?.status === "offline" ? "worker_offline" : "lease_expired",
          correlationId: job.correlationId,
          timestamp: at,
          revision: recovered.revision,
          metadata: { previousFencingToken: assignment.fencingToken, attempt: assignment.attempt },
        });
      }
      return { scannedAt: at, workersMarkedOffline, assignmentsExpired, jobsRequeued, jobsCancelled, jobsFailed };
    });
  }

  getAssignment(assignmentId: string): DurableJobAssignment | undefined {
    const row = this.#database.prepare("SELECT payload_json FROM runtime_assignments WHERE assignment_id = ?")
      .get(assignmentId) as unknown as AssignmentRow | undefined;
    return row ? parsePayload<DurableJobAssignment>(row.payload_json, "assignment") : undefined;
  }

  listAssignments(filter: { readonly jobId?: string; readonly workerId?: string } = {}): readonly DurableJobAssignment[] {
    const clauses: string[] = [];
    const values: string[] = [];
    if (filter.jobId) { clauses.push("job_id = ?"); values.push(filter.jobId); }
    if (filter.workerId) { clauses.push("worker_id = ?"); values.push(filter.workerId); }
    const sql = "SELECT payload_json FROM runtime_assignments"
      + (clauses.length ? " WHERE " + clauses.join(" AND ") : "")
      + " ORDER BY rowid";
    const rows = this.#database.prepare(sql).all(...values) as unknown as AssignmentRow[];
    return rows.map((row) => parsePayload<DurableJobAssignment>(row.payload_json, "assignment"));
  }

  listEvents(filter: { readonly tenantId?: string; readonly jobId?: string; readonly workerId?: string } = {}): readonly RuntimeStateEvent[] {
    const clauses: string[] = [];
    const values: string[] = [];
    if (filter.tenantId) { clauses.push("tenant_id = ?"); values.push(filter.tenantId); }
    if (filter.jobId) { clauses.push("job_id = ?"); values.push(filter.jobId); }
    if (filter.workerId) { clauses.push("worker_id = ?"); values.push(filter.workerId); }
    const sql = "SELECT payload_json FROM runtime_events"
      + (clauses.length ? " WHERE " + clauses.join(" AND ") : "")
      + " ORDER BY timestamp, event_id";
    const rows = this.#database.prepare(sql).all(...values) as unknown as EventRow[];
    return rows.map((row) => parsePayload<RuntimeStateEvent>(row.payload_json, "event"));
  }

  health(): { readonly configured: true; readonly reachable: boolean; readonly productionGrade: true; readonly adapter: string } {
    try {
      this.#database.prepare("SELECT 1 AS ok").get();
      return { configured: true, reachable: true, productionGrade: true, adapter: this.descriptor.adapter };
    } catch {
      return { configured: true, reachable: false, productionGrade: true, adapter: this.descriptor.adapter };
    }
  }

  close(): void { this.#database.close(); }

  #findJobByIdempotency(tenantId: string, idempotencyKey: string): ExecutionJob | undefined {
    const row = this.#database.prepare(
      "SELECT payload_json FROM runtime_jobs WHERE tenant_id = ? AND idempotency_key = ?",
    ).get(tenantId, idempotencyKey) as unknown as JobRow | undefined;
    return row ? parsePayload<ExecutionJob>(row.payload_json, "job") : undefined;
  }

  #requireJob(jobId: string): ExecutionJob {
    const job = this.getJob(jobId);
    if (!job) throw new RuntimeStateError("runtime job not found", "ACS_RUNTIME_JOB_NOT_FOUND", { jobId });
    return job;
  }

  #requireWorkerIdentity(workerId: string, instanceId: string, servicePrincipalId: string): DurableWorkerRegistration {
    const worker = this.getWorker(workerId);
    if (!worker || worker.instanceId !== instanceId || worker.servicePrincipalId !== servicePrincipalId) {
      throw new RuntimeWorkerIdentityError(workerId, instanceId);
    }
    return worker;
  }

  #requireOwnership(input: RuntimeOwnershipInput, at: number): {
    readonly job: ExecutionJob;
    readonly assignment: DurableJobAssignment;
    readonly worker: DurableWorkerRegistration;
  } {
    const job = this.#requireJob(input.jobId);
    const assignment = this.getAssignment(input.assignmentId);
    if (!assignment
      || assignment.jobId !== input.jobId
      || assignment.workerId !== input.workerId
      || assignment.workerInstanceId !== input.instanceId
      || assignment.leaseId !== input.leaseId
      || assignment.fencingToken !== input.fencingToken
      || assignment.status !== "active"
      || assignment.leaseExpiresAt < at) {
      throw new RuntimeStaleOwnerError(input.jobId, input.assignmentId, input.fencingToken);
    }
    const worker = this.#requireWorkerIdentity(input.workerId, input.instanceId, input.servicePrincipalId);
    return { job, assignment, worker };
  }

  #cancelOwnedJob(
    job: ExecutionJob,
    assignment: DurableJobAssignment,
    worker: DurableWorkerRegistration,
    at: number,
    reason: string,
  ): ExecutionJob {
    const updated: ExecutionJob = { ...job, status: "cancelled", updatedAt: at, revision: job.revision + 1 };
    this.#saveJobCas(updated, job.revision, job.status);
    this.#closeAssignmentAndReleaseWorker(assignment, worker, "cancelled");
    this.#appendEvent({
      tenantId: job.tenantId,
      jobId: job.jobId,
      assignmentId: assignment.assignmentId,
      workerId: assignment.workerId,
      category: "runtime.job.cancelled",
      outcome: "succeeded",
      reason,
      correlationId: job.correlationId,
      timestamp: at,
      revision: updated.revision,
      metadata: { fencingToken: assignment.fencingToken },
    });
    return updated;
  }

  #closeAssignmentAndReleaseWorker(
    assignment: DurableJobAssignment,
    worker: DurableWorkerRegistration,
    status: Exclude<DurableAssignmentStatus, "active" | "expired">,
  ): void {
    this.#saveAssignmentCas({ ...assignment, status, revision: assignment.revision + 1 }, assignment.revision);
    const activeRuns = Math.max(0, worker.activeRuns - 1);
    this.#saveWorker({
      ...worker,
      activeRuns,
      status: worker.status === "draining" ? "draining" : "available",
      revision: worker.revision + 1,
    });
  }

  #saveJobCas(job: ExecutionJob, expectedRevision: number, expectedStatus: ExecutionJobStatus): void {
    const change = this.#database.prepare(`
      UPDATE runtime_jobs
      SET status = ?, revision = ?, attempt = ?, updated_at = ?, payload_json = ?
      WHERE job_id = ? AND revision = ? AND status = ?
    `).run(job.status, job.revision, job.attempt, job.updatedAt, serialize(job), job.jobId, expectedRevision, expectedStatus);
    if (Number(change.changes) !== 1) {
      throw new RuntimeStateConflictError("runtime job revision changed", { jobId: job.jobId, expectedRevision });
    }
  }

  #saveWorker(worker: DurableWorkerRegistration): void {
    this.#database.prepare(`
      INSERT INTO runtime_workers (
        worker_id, instance_id, service_principal_id, status, expires_at, revision, active_runs, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(worker_id) DO UPDATE SET
        instance_id = excluded.instance_id,
        service_principal_id = excluded.service_principal_id,
        status = excluded.status,
        expires_at = excluded.expires_at,
        revision = excluded.revision,
        active_runs = excluded.active_runs,
        payload_json = excluded.payload_json
    `).run(
      worker.workerId,
      worker.instanceId,
      worker.servicePrincipalId,
      worker.status,
      worker.expiresAt ?? null,
      worker.revision,
      worker.activeRuns,
      serialize(worker),
    );
  }

  #saveAssignment(assignment: DurableJobAssignment): void {
    this.#database.prepare(`
      INSERT INTO runtime_assignments (
        assignment_id, job_id, worker_id, lease_id, fencing_token, lease_expires_at, status, revision, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assignment.assignmentId,
      assignment.jobId,
      assignment.workerId,
      assignment.leaseId,
      assignment.fencingToken,
      assignment.leaseExpiresAt,
      assignment.status,
      assignment.revision,
      serialize(assignment),
    );
  }

  #saveAssignmentCas(assignment: DurableJobAssignment, expectedRevision: number): void {
    const change = this.#database.prepare(`
      UPDATE runtime_assignments
      SET lease_expires_at = ?, status = ?, revision = ?, payload_json = ?
      WHERE assignment_id = ? AND revision = ?
    `).run(
      assignment.leaseExpiresAt,
      assignment.status,
      assignment.revision,
      serialize(assignment),
      assignment.assignmentId,
      expectedRevision,
    );
    if (Number(change.changes) !== 1) {
      throw new RuntimeStateConflictError("runtime assignment revision changed", {
        assignmentId: assignment.assignmentId,
        expectedRevision,
      });
    }
  }

  #appendEvent(input: Omit<RuntimeStateEvent, "eventId">): RuntimeStateEvent {
    const event: RuntimeStateEvent = { eventId: `rte_${randomUUID()}`, ...input };
    this.#database.prepare(`
      INSERT INTO runtime_events (event_id, tenant_id, job_id, worker_id, timestamp, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      event.eventId,
      event.tenantId ?? null,
      event.jobId ?? null,
      event.workerId ?? null,
      event.timestamp,
      serialize(event),
    );
    return event;
  }

  #transaction<T>(operation: string, action: () => T): T {
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const result = action();
      this.#database.exec("COMMIT");
      return result;
    } catch (error) {
      try { this.#database.exec("ROLLBACK"); } catch { /* no active transaction */ }
      if (error instanceof RuntimeStaleOwnerError) {
        try {
          const jobId = String(error.details.jobId ?? "");
          const job = jobId ? this.getJob(jobId) : undefined;
          this.#appendEvent({
            ...(job ? { tenantId: job.tenantId, correlationId: job.correlationId, revision: job.revision } : {}),
            ...(jobId ? { jobId } : {}),
            ...(typeof error.details.assignmentId === "string" ? { assignmentId: error.details.assignmentId } : {}),
            category: "runtime.result.stale_rejected",
            outcome: "denied",
            reason: "stale_or_expired_ownership",
            timestamp: Date.now(),
            metadata: { fencingToken: error.details.fencingToken },
          });
        } catch { /* rejection remains fail-closed if evidence append also fails */ }
      }
      if (error instanceof RuntimeStateError) throw error;
      throw new RuntimePersistenceError(operation);
    }
  }
}

export interface RuntimeOwnershipInput {
  readonly jobId: string;
  readonly assignmentId: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly workerId: string;
  readonly instanceId: string;
  readonly servicePrincipalId: string;
  readonly at?: number;
}

export class DurableRuntimeCoordinator {
  readonly #store: SqliteDurableRuntimeState;
  readonly #auditService: AuditService | undefined;
  readonly #telemetry: OperationalTelemetryProvider | undefined;
  readonly leaseTtlMs: number;
  readonly workerStaleAfterMs: number;

  constructor(options: {
    readonly store: SqliteDurableRuntimeState;
    readonly auditService?: AuditService;
    readonly leaseTtlMs?: number;
    readonly workerStaleAfterMs?: number;
    readonly telemetry?: OperationalTelemetryProvider;
  }) {
    this.#store = options.store;
    this.#auditService = options.auditService;
    this.#telemetry = options.telemetry;
    this.leaseTtlMs = options.leaseTtlMs ?? 15_000;
    this.workerStaleAfterMs = options.workerStaleAfterMs ?? 30_000;
  }

  get descriptor(): RuntimeStateStoreDescriptor { return this.#store.descriptor; }
  get store(): SqliteDurableRuntimeState { return this.#store; }

  createRuntimeStartJob(input: {
    readonly tenantId: string;
    readonly runtimeInstanceId: string;
    readonly deploymentId: string;
    readonly agentId?: string;
    readonly targetId: string;
    readonly correlationId: string;
    readonly idempotencyKey?: string;
    readonly maxAttempts?: number;
    readonly traceContext?: TraceContext;
  }): ExecutionJob {
    const job = this.#store.createJob({
      tenantId: input.tenantId,
      runtimeInstanceId: input.runtimeInstanceId,
      workload: {
        type: "runtime.start",
        deploymentId: input.deploymentId,
        ...(input.agentId ? { agentId: input.agentId } : {}),
        deploymentMode: "sandbox",
        targetId: input.targetId,
      },
      requirements: {
        engineId: "openclaw",
        requiredIsolationMode: "sandbox",
        requiredDeploymentMode: "sandbox",
        targetId: input.targetId,
      },
      correlationId: input.correlationId,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      ...(input.maxAttempts ? { maxAttempts: input.maxAttempts } : {}),
      ...(input.traceContext ? { traceContext: input.traceContext } : {}),
    });
    this.#telemetry?.log({
      component: "runtime",
      event: "runtime.job.created",
      message: "Durable runtime job created",
      context: { correlationId: job.correlationId, traceId: job.traceContext?.traceId, spanId: job.traceContext?.spanId, tenantId: job.tenantId, jobId: job.jobId },
      attributes: { workloadType: job.workloadType, attempt: job.attempt, maxAttempts: job.maxAttempts },
    });
    this.#telemetry?.metric({ name: "acs.runtime.jobs.created", kind: "counter", value: 1, attributes: { workloadType: job.workloadType } });
    this.#auditService?.recordEvent({
      eventType: "runtime.job_queued",
      correlationId: job.correlationId,
      tenantId: job.tenantId,
      runtimeInstanceId: job.runtimeInstanceId,
      deploymentId: job.deploymentId,
      ...(job.agentId ? { agentId: job.agentId } : {}),
      decision: "allowed",
      result: "pending",
      revision: job.revision,
      metadata: { jobId: job.jobId, workloadType: job.workloadType },
    });
    return job;
  }

  registerWorker(input: Parameters<SqliteDurableRuntimeState["registerWorker"]>[0]): DurableWorkerRegistration {
    const worker = this.#store.registerWorker(input);
    this.#telemetry?.log({ component: "runtime", event: "runtime.worker.registered", message: "Remote worker registered", context: { workerId: worker.workerId }, attributes: { instanceId: worker.instanceId, status: worker.status } });
    return worker;
  }

  heartbeat(input: Omit<Parameters<SqliteDurableRuntimeState["heartbeat"]>[0], "staleAfterMs">): DurableWorkerRegistration {
    return this.#store.heartbeat({ ...input, staleAfterMs: this.workerStaleAfterMs });
  }

  claimNext(input: Omit<Parameters<SqliteDurableRuntimeState["claimNext"]>[0], "leaseTtlMs">): RuntimeClaim | undefined {
    const claim = this.#store.claimNext({ ...input, leaseTtlMs: this.leaseTtlMs });
    if (claim) {
      this.#telemetry?.log({ component: "runtime", event: "runtime.job.assigned", message: "Runtime job assigned", context: { correlationId: claim.job.correlationId, traceId: claim.job.traceContext?.traceId, spanId: claim.job.traceContext?.spanId, tenantId: claim.job.tenantId, jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId, workerId: claim.assignment.workerId }, attributes: { attempt: claim.assignment.attempt, fencingToken: claim.assignment.fencingToken, leaseExpiresAt: claim.assignment.leaseExpiresAt } });
      this.#telemetry?.metric({ name: "acs.runtime.assignments", kind: "counter", value: 1 });
    }
    return claim;
  }

  renewLease(input: RuntimeOwnershipInput): DurableJobAssignment {
    return this.#store.renewLease({ ...input, leaseTtlMs: this.leaseTtlMs });
  }

  markRunning(input: RuntimeOwnershipInput): ExecutionJob {
    const job = this.#store.markRunning(input);
    this.#telemetry?.log({ component: "runtime", event: "runtime.job.started", message: "Remote execution started", context: { correlationId: job.correlationId, traceId: job.traceContext?.traceId, spanId: job.traceContext?.spanId, tenantId: job.tenantId, jobId: job.jobId, assignmentId: input.assignmentId, workerId: input.workerId } });
    return job;
  }
  completeJob(input: Parameters<SqliteDurableRuntimeState["completeJob"]>[0]): ExecutionJob {
    try {
      const job = this.#store.completeJob(input);
      this.#telemetry?.log({ component: "runtime", event: "runtime.job.completed", message: "Remote execution completed", context: { correlationId: job.correlationId, traceId: job.traceContext?.traceId, spanId: job.traceContext?.spanId, tenantId: job.tenantId, jobId: job.jobId, assignmentId: input.assignmentId, workerId: input.workerId }, attributes: { status: job.status, attempt: job.attempt } });
      this.#telemetry?.metric({ name: "acs.runtime.jobs.completed", kind: "counter", value: 1, attributes: { status: job.status } });
      return job;
    } catch (error) {
      if (error instanceof RuntimeStaleOwnerError) {
        this.#telemetry?.log({ level: "warn", component: "runtime", event: "runtime.stale_result.rejected", message: "Stale worker result rejected", context: { jobId: input.jobId, assignmentId: input.assignmentId, workerId: input.workerId }, attributes: { fencingToken: input.fencingToken, reasonCode: "STALE_WORKER_OWNERSHIP" } });
        this.#telemetry?.metric({ name: "acs.runtime.stale_results", kind: "counter", value: 1 });
      }
      throw error;
    }
  }
  failJob(input: Parameters<SqliteDurableRuntimeState["failJob"]>[0]): ExecutionJob {
    const job = this.#store.failJob(input);
    this.#telemetry?.log({ level: "error", component: "runtime", event: "runtime.job.failed", message: "Remote execution attempt failed", context: { correlationId: job.correlationId, traceId: job.traceContext?.traceId, spanId: job.traceContext?.spanId, tenantId: job.tenantId, jobId: job.jobId, assignmentId: input.assignmentId, workerId: input.workerId }, attributes: { failureCode: input.error.code, retryable: input.error.retryable, status: job.status, attempt: job.attempt } });
    this.#telemetry?.metric({ name: "acs.runtime.jobs.failed", kind: "counter", value: 1, attributes: { retryable: input.error.retryable, terminal: job.status === "failed" } });
    return job;
  }
  requestCancellation(jobId: string, tenantId: string, at?: number): ExecutionJob {
    return this.#store.requestCancellation(jobId, tenantId, at);
  }
  recoverExpired(at?: number): RuntimeRecoveryResult {
    const result = this.#store.recoverExpired({ ...(at !== undefined ? { at } : {}) });
    if (result.assignmentsExpired || result.jobsRequeued || result.jobsFailed || result.workersMarkedOffline) {
      this.#telemetry?.log({ level: result.jobsFailed ? "error" : "warn", component: "runtime-recovery", event: "runtime.job.recovered", message: "Runtime recovery scan changed durable ownership state", attributes: { ...result } });
      if (result.assignmentsExpired) this.#telemetry?.metric({ name: "acs.runtime.lease_expirations", kind: "counter", value: result.assignmentsExpired });
      if (result.jobsRequeued) this.#telemetry?.metric({ name: "acs.runtime.recoveries", kind: "counter", value: result.jobsRequeued });
    }
    return result;
  }
  getJob(jobId: string): ExecutionJob | undefined { return this.#store.getJob(jobId); }
  listJobs(filter: Parameters<SqliteDurableRuntimeState["listJobs"]>[0] = {}): readonly ExecutionJob[] { return this.#store.listJobs(filter); }
  getWorker(workerId: string): DurableWorkerRegistration | undefined { return this.#store.getWorker(workerId); }
  listWorkers(): readonly DurableWorkerRegistration[] { return this.#store.listWorkers(); }
  listAssignments(filter: Parameters<SqliteDurableRuntimeState["listAssignments"]>[0] = {}): readonly DurableJobAssignment[] { return this.#store.listAssignments(filter); }
  listEvents(filter: Parameters<SqliteDurableRuntimeState["listEvents"]>[0] = {}): readonly RuntimeStateEvent[] { return this.#store.listEvents(filter); }
  health(): ReturnType<SqliteDurableRuntimeState["health"]> { return this.#store.health(); }
  close(): void { this.#store.close(); }
}

export class RuntimeRecoveryCoordinator {
  readonly #runtime: DurableRuntimeCoordinator;
  readonly #scanIntervalMs: number;
  #timer: ReturnType<typeof setInterval> | undefined;
  #lastScanAt: number | undefined;
  #lastErrorAt: number | undefined;

  constructor(options: { readonly runtime: DurableRuntimeCoordinator; readonly scanIntervalMs?: number }) {
    this.#runtime = options.runtime;
    this.#scanIntervalMs = options.scanIntervalMs ?? 5_000;
  }

  start(): void {
    if (this.#timer) return;
    this.#timer = setInterval(() => {
      try {
        this.scanNow();
      } catch {
        this.#lastErrorAt = Date.now();
      }
    }, this.#scanIntervalMs);
    this.#timer.unref?.();
  }

  stop(): void {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = undefined;
  }

  scanNow(at?: number): RuntimeRecoveryResult {
    const result = this.#runtime.recoverExpired(at);
    this.#lastScanAt = result.scannedAt;
    return result;
  }

  health(): { readonly healthy: boolean; readonly lastScanAt?: number; readonly lastErrorAt?: number } {
    return {
      healthy: this.#lastErrorAt === undefined || (this.#lastScanAt !== undefined && this.#lastScanAt > this.#lastErrorAt),
      ...(this.#lastScanAt !== undefined ? { lastScanAt: this.#lastScanAt } : {}),
      ...(this.#lastErrorAt !== undefined ? { lastErrorAt: this.#lastErrorAt } : {}),
    };
  }
}
