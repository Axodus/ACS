import { randomUUID } from "node:crypto";
import type { AgentRevision } from "../unified-agent-model.js";
import { redactValue, type AuditEvent } from "../audit-service.js";
import type { DeploymentRecord } from "../deployment-service.js";
import type { Tenant } from "../tenant-domain.js";
import type {
  TenantMembership,
  TenantMembershipRepositoryUpdate,
} from "../tenant-membership.js";
import type { TenantGovernanceState } from "../tenant-governance.js";
import type { SecretMetadata } from "../../intelligence/secret-store.js";
import type {
  DurableExecutionError,
  DurableExecutionResult,
  DurableJobAssignment,
  DurableWorkerRegistration,
  ExecutionJob,
  RuntimeClaim,
  RuntimeOwnershipInput,
  RuntimeRecoveryResult,
} from "../../workers/durable-runtime-state.js";
import type { WorkerCapability, WorkerEligibilityRequirements } from "../../workers/worker-types.js";
import type { TraceContext } from "../operational-telemetry.js";
import type {
  SharedAuthoritativeState,
  SharedAuthoritativeStateSession,
  SharedEconomicRecord,
} from "./contracts.js";

export interface SharedAuthorityMutationContext {
  readonly actor: string;
  readonly correlationId: string;
  readonly timestamp?: number;
  readonly reason?: string;
}

function event(input: {
  readonly eventType: string;
  readonly context: SharedAuthorityMutationContext;
  readonly tenantId?: string;
  readonly agentId?: string;
  readonly revision?: number;
  readonly deploymentId?: string;
  readonly result?: "success" | "failure" | "pending";
  readonly metadata?: Readonly<Record<string, unknown>>;
}): AuditEvent {
  return {
    eventId: `evt_shared_${randomUUID()}`,
    eventType: input.eventType,
    timestamp: input.context.timestamp ?? Date.now(),
    correlationId: input.context.correlationId,
    actor: input.context.actor,
    result: input.result ?? "success",
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.agentId ? { agentId: input.agentId } : {}),
    ...(input.revision !== undefined ? { revision: input.revision } : {}),
    ...(input.deploymentId ? { deploymentId: input.deploymentId } : {}),
    ...(input.metadata ? { metadata: redactValue(input.metadata) as Readonly<Record<string, unknown>> } : {}),
  };
}

/**
 * Async application boundary for the shared-authority profile.
 *
 * Domain decisions remain represented by the existing Tenant, Agent,
 * Deployment, Secret, Economic and Runtime models. This service only owns the
 * network-I/O orchestration: transaction lifetime, CAS commit and atomic audit
 * append. It never reports success before the authoritative commit completes.
 */
export class SharedAuthorityService {
  constructor(readonly state: SharedAuthoritativeState) {}

  async createTenant(input: {
    readonly tenant: Tenant;
    readonly owner?: TenantMembership;
    readonly governance?: TenantGovernanceState;
    readonly context: SharedAuthorityMutationContext;
  }): Promise<Tenant> {
    return this.state.withTransaction("create tenant authority", async (tx) => {
      const tenant = await tx.tenants.create(input.tenant);
      if (input.owner) await tx.memberships.create(input.owner);
      if (input.governance) await tx.governance.save(input.governance, 1);
      await tx.audit.append(event({
        eventType: "tenant.lifecycle",
        context: input.context,
        tenantId: tenant.tenantId,
        revision: tenant.revision,
        metadata: { operation: "create", status: tenant.status, reason: input.context.reason },
      }));
      return tenant;
    });
  }

  async saveTenant(tenant: Tenant, expectedRevision: number, context: SharedAuthorityMutationContext): Promise<Tenant> {
    return this.state.withTransaction("save tenant authority", async (tx) => {
      const saved = await tx.tenants.save(tenant, expectedRevision);
      await tx.audit.append(event({
        eventType: "tenant.lifecycle",
        context,
        tenantId: tenant.tenantId,
        revision: tenant.revision,
        metadata: { operation: "update", status: tenant.status, reason: context.reason },
      }));
      return saved;
    });
  }

  async createMembership(membership: TenantMembership, context: SharedAuthorityMutationContext): Promise<TenantMembership> {
    return this.state.withTransaction("create tenant membership", async (tx) => {
      const saved = await tx.memberships.create(membership);
      await tx.audit.append(event({
        eventType: "tenant.membership",
        context,
        tenantId: membership.tenantId,
        revision: membership.revision,
        metadata: { principalId: membership.principalId, role: membership.role, status: membership.status },
      }));
      return saved;
    });
  }

  async saveMemberships(
    updates: readonly TenantMembershipRepositoryUpdate[],
    context: SharedAuthorityMutationContext,
  ): Promise<readonly TenantMembership[]> {
    return this.state.withTransaction("save tenant memberships", async (tx) => {
      const saved = await tx.memberships.saveMany(updates);
      const tenantId = saved[0]?.tenantId;
      if (tenantId) {
        await tx.audit.append(event({
          eventType: saved.length > 1 ? "tenant.ownership" : "tenant.membership",
          context,
          tenantId,
          metadata: {
            principals: saved.map((membership) => ({
              principalId: membership.principalId,
              role: membership.role,
              status: membership.status,
              revision: membership.revision,
            })),
          },
        }));
      }
      return saved;
    });
  }

  async saveGovernance(
    governance: TenantGovernanceState,
    expectedRevision: number,
    context: SharedAuthorityMutationContext,
  ): Promise<TenantGovernanceState> {
    return this.state.withTransaction("save tenant governance", async (tx) => {
      const saved = await tx.governance.save(governance, expectedRevision);
      await tx.audit.append(event({
        eventType: "tenant.governance",
        context,
        tenantId: governance.tenantId,
        revision: governance.revision,
        metadata: { policyId: governance.policy?.policyId, reason: context.reason },
      }));
      return saved;
    });
  }

  async createAgent(revision: AgentRevision, context: SharedAuthorityMutationContext): Promise<AgentRevision> {
    return this.state.withTransaction("create agent authority", async (tx) => {
      const saved = await tx.agents.create(revision);
      await tx.audit.append(event({
        eventType: "agent.revision.created",
        context,
        agentId: revision.agentId,
        revision: revision.revision,
        metadata: { fingerprint: revision.fingerprint },
      }));
      return saved;
    });
  }

  async saveAgent(
    revision: AgentRevision,
    expectedRevision: number,
    context: SharedAuthorityMutationContext,
  ): Promise<AgentRevision> {
    return this.state.withTransaction("save agent authority", async (tx) => {
      const saved = await tx.agents.save(revision, expectedRevision);
      await tx.audit.append(event({
        eventType: "agent.revision.created",
        context,
        agentId: revision.agentId,
        revision: revision.revision,
        metadata: { fingerprint: revision.fingerprint },
      }));
      return saved;
    });
  }

  async createDeployment(record: DeploymentRecord, context: SharedAuthorityMutationContext): Promise<DeploymentRecord> {
    return this.state.withTransaction("create deployment authority", async (tx) => {
      const saved = await tx.deployments.create(record);
      await this.appendDeploymentAudit(tx, saved, context, "deployment.requested");
      return saved;
    });
  }

  async saveDeployment(
    record: DeploymentRecord,
    expectedRecordRevision: number,
    context: SharedAuthorityMutationContext,
  ): Promise<DeploymentRecord> {
    return this.state.withTransaction("save deployment authority", async (tx) => {
      const saved = await tx.deployments.save(record, expectedRecordRevision);
      await this.appendDeploymentAudit(
        tx,
        saved,
        context,
        record.status === "failed" || record.status === "rollback_failed"
          ? "deployment.failed"
          : "deployment.completed",
      );
      return saved;
    });
  }

  async createSecretMetadata(metadata: SecretMetadata, context: SharedAuthorityMutationContext): Promise<SecretMetadata> {
    return this.state.withTransaction("create secret metadata", async (tx) => {
      const saved = await tx.secretMetadata.create(metadata);
      await tx.audit.append(event({
        eventType: "secret.metadata.created",
        context,
        tenantId: metadata.tenantId,
        metadata: { secretId: metadata.secretId, providerId: metadata.providerId, version: metadata.version, status: metadata.status },
      }));
      return saved;
    });
  }

  async saveSecretMetadata(
    metadata: SecretMetadata,
    expectedVersion: number,
    context: SharedAuthorityMutationContext,
  ): Promise<SecretMetadata> {
    return this.state.withTransaction("save secret metadata", async (tx) => {
      const saved = await tx.secretMetadata.save(metadata, expectedVersion);
      await tx.audit.append(event({
        eventType: metadata.status === "revoked" ? "secret.metadata.revoked" : "secret.metadata.rotated",
        context,
        tenantId: metadata.tenantId,
        metadata: { secretId: metadata.secretId, providerId: metadata.providerId, version: metadata.version, status: metadata.status },
      }));
      return saved;
    });
  }

  async commitSettlement(input: {
    readonly settlement: SharedEconomicRecord;
    readonly reservation: SharedEconomicRecord;
    readonly receipt: SharedEconomicRecord;
    readonly context: SharedAuthorityMutationContext;
  }): Promise<{ readonly settlement: SharedEconomicRecord; readonly reservation: SharedEconomicRecord; readonly receipt: SharedEconomicRecord }> {
    return this.state.withTransaction("commit economic settlement authority", async (tx) => {
      const committed = await tx.economics.commitSettlement(input);
      await tx.audit.append(event({
        eventType: "economic.settled",
        context: input.context,
        tenantId: input.settlement.tenantId,
        metadata: {
          settlementId: input.settlement.recordId,
          reservationId: input.reservation.recordId,
          receiptId: input.receipt.recordId,
          idempotencyKey: input.settlement.idempotencyKey,
        },
      }));
      return committed;
    });
  }

  private async appendDeploymentAudit(
    tx: SharedAuthoritativeStateSession,
    record: DeploymentRecord,
    context: SharedAuthorityMutationContext,
    eventType: string,
  ): Promise<void> {
    await tx.audit.append(event({
      eventType,
      context,
      tenantId: record.scope?.tenantId,
      agentId: record.agentId,
      revision: record.revision,
      deploymentId: record.deploymentId,
      result: record.status === "failed" || record.status === "rollback_failed" ? "failure" : "success",
      metadata: {
        recordRevision: record.recordRevision,
        targetId: record.targetId,
        deploymentMode: record.deploymentMode,
        status: record.status,
        predecessorDeploymentId: record.predecessorDeploymentId,
      },
    }));
  }
}

export class SharedRuntimeCoordinator {
  readonly descriptor = {
    adapter: "postgres-shared-runtime",
    productionOriented: true,
    durability: "shared_durable" as const,
    multiInstance: "shared_database" as const,
    multiHost: "capable_not_topology_proof" as const,
  };
  readonly leaseTtlMs: number;
  readonly workerStaleAfterMs: number;

  constructor(
    readonly state: SharedAuthoritativeState,
    options: { readonly leaseTtlMs?: number; readonly workerStaleAfterMs?: number } = {},
  ) {
    this.leaseTtlMs = options.leaseTtlMs ?? 30_000;
    this.workerStaleAfterMs = options.workerStaleAfterMs ?? 45_000;
  }

  createJob(input: {
    readonly jobId?: string;
    readonly tenantId: string;
    readonly runtimeInstanceId: string;
    readonly workload: Parameters<SharedAuthoritativeState["runtime"]["createJob"]>[0]["workload"];
    readonly requirements: WorkerEligibilityRequirements;
    readonly correlationId: string;
    readonly idempotencyKey?: string;
    readonly maxAttempts?: number;
    readonly createdAt?: number;
    readonly traceContext?: TraceContext;
  }): Promise<ExecutionJob> { return this.state.runtime.createJob(input); }

  registerWorker(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly name: string;
    readonly version: string;
    readonly capabilities: WorkerCapability;
    readonly registeredAt?: number;
  }): Promise<DurableWorkerRegistration> { return this.state.runtime.registerWorker(input); }

  heartbeat(input: Omit<Parameters<SharedAuthoritativeState["runtime"]["heartbeat"]>[0], "staleAfterMs">): Promise<DurableWorkerRegistration> {
    return this.state.runtime.heartbeat({ ...input, staleAfterMs: this.workerStaleAfterMs });
  }

  claimNext(input: Omit<Parameters<SharedAuthoritativeState["runtime"]["claimNext"]>[0], "leaseTtlMs">): Promise<RuntimeClaim | undefined> {
    return this.state.runtime.claimNext({ ...input, leaseTtlMs: this.leaseTtlMs });
  }

  renewLease(input: RuntimeOwnershipInput): Promise<DurableJobAssignment> {
    return this.state.runtime.renewLease({ ...input, leaseTtlMs: this.leaseTtlMs });
  }

  markRunning(input: RuntimeOwnershipInput): Promise<ExecutionJob> { return this.state.runtime.markRunning(input); }
  completeJob(input: RuntimeOwnershipInput & { readonly result: DurableExecutionResult }): Promise<ExecutionJob> { return this.state.runtime.completeJob(input); }
  failJob(input: RuntimeOwnershipInput & { readonly error: DurableExecutionError }): Promise<ExecutionJob> { return this.state.runtime.failJob(input); }
  recoverExpired(at?: number): Promise<RuntimeRecoveryResult> { return this.state.runtime.recoverExpired({ at, workerStaleAfterMs: this.workerStaleAfterMs }); }
}
