import type { AgentRevision } from "../unified-agent-model.js";
import type { AuditEvent } from "../audit-service.js";
import type { DeploymentRecord } from "../deployment-service.js";
import type {
  TenantGovernanceState,
} from "../tenant-governance.js";
import type {
  TenantMembership,
  TenantMembershipRepositoryUpdate,
} from "../tenant-membership.js";
import type { Tenant } from "../tenant-domain.js";
import type { SecretMetadata } from "../../intelligence/secret-store.js";
import type {
  DurableExecutionError,
  DurableExecutionResult,
  DurableJobAssignment,
  DurableWorkerRegistration,
  ExecutionJob,
  ExecutionJobStatus,
  ExecutionJobWorkload,
  RuntimeClaim,
  RuntimeOwnershipInput,
  RuntimeRecoveryResult,
  RuntimeStateEvent,
} from "../../workers/durable-runtime-state.js";
import type { WorkerCapability, WorkerEligibilityRequirements } from "../../workers/worker-types.js";
import type { TraceContext } from "../operational-telemetry.js";

export type SharedStateTopology = "shared_network_database";

export interface SharedStateDescriptor {
  readonly adapter: string;
  readonly productionOriented: true;
  readonly networkIoCapable: true;
  readonly transactional: true;
  readonly durability: "shared_durable";
  readonly multiInstance: "shared_database";
  readonly topology: SharedStateTopology;
}

export interface SharedStateHealth {
  readonly configured: true;
  readonly reachable: boolean;
  readonly writable: boolean;
  readonly schemaCurrent: boolean;
  readonly adapter: string;
  readonly schemaVersion?: number;
  readonly reasonCode?:
    | "SHARED_STATE_UNAVAILABLE"
    | "SHARED_STATE_SCHEMA_MISMATCH"
    | "SHARED_STATE_READ_ONLY";
  readonly latencyMs?: number;
  readonly lastErrorAt?: number;
}

export class RepositoryUnavailableError extends Error {
  readonly code = "ACS_REPOSITORY_UNAVAILABLE";
  constructor(readonly operation: string) {
    super("shared authoritative repository is unavailable");
    this.name = "RepositoryUnavailableError";
  }
}

export class RepositoryTimeoutError extends Error {
  readonly code = "ACS_REPOSITORY_TIMEOUT";
  constructor(readonly operation: string) {
    super("shared authoritative repository operation timed out");
    this.name = "RepositoryTimeoutError";
  }
}

export class RevisionConflictError extends Error {
  readonly code = "ACS_REPOSITORY_REVISION_CONFLICT";
  constructor(
    readonly resource: string,
    readonly expectedRevision: number,
    readonly currentRevision?: number,
  ) {
    super(
      `${resource} revision conflict: expected ${expectedRevision}`
      + (currentRevision === undefined ? "" : ` but found ${currentRevision}`),
    );
    this.name = "RevisionConflictError";
  }
}

export class TransactionFailedError extends Error {
  readonly code = "ACS_REPOSITORY_TRANSACTION_FAILED";
  constructor(readonly operation: string, options: { readonly cause?: unknown } = {}) {
    super("shared authoritative transaction failed", options);
    this.name = "TransactionFailedError";
  }
}

export class SharedStateSchemaMismatchError extends Error {
  readonly code = "ACS_SHARED_STATE_SCHEMA_MISMATCH";
  constructor(readonly expectedVersion: number, readonly currentVersion: number) {
    super(`shared state schema mismatch: expected ${expectedVersion} but found ${currentVersion}`);
    this.name = "SharedStateSchemaMismatchError";
  }
}

export interface AsyncTenantRepository {
  create(tenant: Tenant): Promise<Tenant>;
  get(tenantId: string): Promise<Tenant>;
  list(): Promise<readonly Tenant[]>;
  save(tenant: Tenant, expectedRevision: number): Promise<Tenant>;
  history(tenantId: string): Promise<readonly Tenant[]>;
}

export interface AsyncTenantMembershipRepository {
  create(membership: TenantMembership): Promise<TenantMembership>;
  get(tenantId: string, principalId: string): Promise<TenantMembership>;
  list(): Promise<readonly TenantMembership[]>;
  listByTenant(tenantId: string): Promise<readonly TenantMembership[]>;
  save(membership: TenantMembership, expectedRevision: number): Promise<TenantMembership>;
  saveMany(updates: readonly TenantMembershipRepositoryUpdate[]): Promise<readonly TenantMembership[]>;
  history(tenantId: string, principalId: string): Promise<readonly TenantMembership[]>;
}

export interface AsyncTenantGovernanceRepository {
  get(tenantId: string): Promise<TenantGovernanceState>;
  save(state: TenantGovernanceState, expectedRevision: number): Promise<TenantGovernanceState>;
  list(): Promise<readonly TenantGovernanceState[]>;
  history(tenantId: string): Promise<readonly TenantGovernanceState[]>;
}

export interface AsyncAuditEventStore {
  append(event: AuditEvent): Promise<AuditEvent>;
  list(filter?: { readonly tenantId?: string; readonly correlationId?: string }): Promise<readonly AuditEvent[]>;
}

export interface AsyncAgentRepository {
  create(revision: AgentRevision): Promise<AgentRevision>;
  get(agentId: string): Promise<AgentRevision>;
  list(): Promise<readonly AgentRevision[]>;
  save(revision: AgentRevision, expectedRevision: number): Promise<AgentRevision>;
  history(agentId: string): Promise<readonly AgentRevision[]>;
  remove(agentId: string, expectedRevision: number): Promise<AgentRevision>;
}

export interface AsyncDeploymentRepository {
  create(record: DeploymentRecord): Promise<DeploymentRecord>;
  get(deploymentId: string): Promise<DeploymentRecord | undefined>;
  list(): Promise<readonly DeploymentRecord[]>;
  save(record: DeploymentRecord, expectedRecordRevision: number): Promise<DeploymentRecord>;
}

export interface AsyncSecretMetadataRepository {
  create(metadata: SecretMetadata): Promise<SecretMetadata>;
  get(secretId: string): Promise<SecretMetadata | undefined>;
  list(tenantId?: string): Promise<readonly SecretMetadata[]>;
  save(metadata: SecretMetadata, expectedVersion: number): Promise<SecretMetadata>;
}

export type SharedEconomicRecordKind = "quote" | "reservation" | "usage" | "settlement" | "receipt";

export interface SharedEconomicRecord<T = unknown> {
  readonly kind: SharedEconomicRecordKind;
  readonly recordId: string;
  readonly tenantId?: string;
  readonly idempotencyKey?: string;
  readonly revision: number;
  readonly payload: T;
}

export interface AsyncEconomicRepository {
  get<T = unknown>(kind: SharedEconomicRecordKind, recordId: string): Promise<SharedEconomicRecord<T> | undefined>;
  list<T = unknown>(kind: SharedEconomicRecordKind, tenantId?: string): Promise<readonly SharedEconomicRecord<T>[]>;
  save<T = unknown>(record: SharedEconomicRecord<T>, expectedRevision?: number): Promise<SharedEconomicRecord<T>>;
  commitSettlement(input: {
    readonly settlement: SharedEconomicRecord;
    readonly reservation: SharedEconomicRecord;
    readonly receipt: SharedEconomicRecord;
  }): Promise<{ readonly settlement: SharedEconomicRecord; readonly reservation: SharedEconomicRecord; readonly receipt: SharedEconomicRecord }>;
}

export interface AsyncRuntimeRepository {
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
  }): Promise<ExecutionJob>;
  getJob(jobId: string): Promise<ExecutionJob | undefined>;
  listJobs(filter?: { readonly tenantId?: string; readonly status?: ExecutionJobStatus }): Promise<readonly ExecutionJob[]>;
  registerWorker(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly name: string;
    readonly version: string;
    readonly capabilities: WorkerCapability;
    readonly registeredAt?: number;
  }): Promise<DurableWorkerRegistration>;
  heartbeat(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly status?: "available" | "busy" | "draining";
    readonly capabilities?: WorkerCapability;
    readonly at?: number;
    readonly staleAfterMs: number;
  }): Promise<DurableWorkerRegistration>;
  getWorker(workerId: string): Promise<DurableWorkerRegistration | undefined>;
  listWorkers(): Promise<readonly DurableWorkerRegistration[]>;
  claimNext(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly at?: number;
    readonly leaseTtlMs: number;
  }): Promise<RuntimeClaim | undefined>;
  renewLease(input: RuntimeOwnershipInput & { readonly leaseTtlMs: number }): Promise<DurableJobAssignment>;
  markRunning(input: RuntimeOwnershipInput): Promise<ExecutionJob>;
  completeJob(input: RuntimeOwnershipInput & { readonly result: DurableExecutionResult }): Promise<ExecutionJob>;
  failJob(input: RuntimeOwnershipInput & { readonly error: DurableExecutionError }): Promise<ExecutionJob>;
  recoverExpired(input?: { readonly at?: number; readonly workerStaleAfterMs?: number }): Promise<RuntimeRecoveryResult>;
  getAssignment(assignmentId: string): Promise<DurableJobAssignment | undefined>;
  listAssignments(filter?: { readonly jobId?: string; readonly workerId?: string }): Promise<readonly DurableJobAssignment[]>;
  listEvents(filter?: { readonly tenantId?: string; readonly jobId?: string; readonly workerId?: string }): Promise<readonly RuntimeStateEvent[]>;
}

export interface AsyncRateLimitRepository {
  consume(input: {
    readonly policyId: string;
    readonly keyHash: string;
    readonly windowStart: number;
    readonly windowMs: number;
    readonly cost: number;
  }): Promise<{ readonly consumed: number }>;
}

export interface SharedAuthoritativeStateSession {
  readonly tenants: AsyncTenantRepository;
  readonly memberships: AsyncTenantMembershipRepository;
  readonly governance: AsyncTenantGovernanceRepository;
  readonly audit: AsyncAuditEventStore;
  readonly agents: AsyncAgentRepository;
  readonly deployments: AsyncDeploymentRepository;
  readonly secretMetadata: AsyncSecretMetadataRepository;
  readonly economics: AsyncEconomicRepository;
  readonly runtime: AsyncRuntimeRepository;
  readonly rateLimits: AsyncRateLimitRepository;
}

export interface SharedAuthoritativeState extends SharedAuthoritativeStateSession {
  readonly descriptor: SharedStateDescriptor;
  migrate(): Promise<number>;
  schemaVersion(): Promise<number>;
  health(): Promise<SharedStateHealth>;
  withTransaction<T>(operation: string, fn: (session: SharedAuthoritativeStateSession) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
