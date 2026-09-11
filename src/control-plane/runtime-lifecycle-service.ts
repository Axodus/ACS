import type { AgentEngine, RuntimeInstanceResult } from "../engines/agent-engine.js";
import { EngineRuntimeNotFoundError } from "../engines/engine-errors.js";
import type { AuditService } from "./audit-service.js";
import { assertSameIsolationScope, type IsolationScope } from "./isolation.js";
import type { DurableRuntimeCoordinator, ExecutionJob } from "../workers/durable-runtime-state.js";
import type { TraceContext } from "./operational-telemetry.js";

export type RuntimeState =
  | "pending"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "failed"
  | "terminated";

export interface StartRuntimeServiceRequest {
  readonly deploymentId: string;
  readonly agentId?: string;
  readonly deploymentMode?: string;
  readonly targetId?: string;
  readonly correlationId?: string;
  readonly actor?: string;
  readonly scope?: IsolationScope;
  readonly runtimeInstanceId?: string;
  readonly idempotencyKey?: string;
  readonly traceContext?: TraceContext;
  readonly maxAttempts?: number;
}

export interface RuntimeInstanceRecord {
  readonly jobId?: string;
  readonly runtimeInstanceId: string;
  readonly deploymentId: string;
  readonly agentId?: string;
  readonly targetId: string;
  readonly deploymentMode: string;
  readonly status: RuntimeState;
  readonly startedAt: number;
  readonly stoppedAt?: number;
  readonly terminatedAt?: number;
  readonly updatedAt: number;
  readonly revision?: number;
  readonly scope?: IsolationScope;
}

export interface CreateExecutionRunRequest {
  readonly runtimeInstanceId: string;
  readonly agentId: string;
  readonly executionPlanId: string;
  readonly correlationId?: string;
  readonly actor?: string;
  readonly scope?: IsolationScope;
}

export interface ExecutionRunRecord {
  readonly runId: string;
  readonly runtimeInstanceId: string;
  readonly agentId: string;
  readonly executionPlanId: string;
  readonly status: "pending" | "running" | "completed" | "failed" | "cancelled";
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly scope?: IsolationScope;
}

export interface ExecutionRunPageQuery {
  readonly limit: number;
  readonly offset: number;
}

export interface DeploymentLookupRecord {
  readonly targetId?: string;
  readonly deploymentMode?: string;
  readonly status?: string;
}

const VALID_TRANSITIONS: Record<RuntimeState, readonly RuntimeState[]> = {
  pending: ["starting", "failed"],
  starting: ["running", "failed"],
  running: ["stopping", "failed", "terminated"],
  stopping: ["stopped", "failed", "terminated"],
  stopped: ["terminated"],
  failed: ["terminated"],
  terminated: [],
};

export class RuntimeLifecycleService {
  readonly #engine: AgentEngine;
  readonly #deploymentLookup: ((deploymentId: string) => DeploymentLookupRecord | undefined) | undefined;
  readonly #auditService: AuditService | undefined;
  readonly #defaultScope: IsolationScope | undefined;
  readonly #runtimeCoordinator: DurableRuntimeCoordinator | null;
  readonly #runtimeMode: "local" | "remote";
  readonly #runtimes = new Map<string, RuntimeInstanceRecord>();
  readonly #executionRuns = new Map<string, ExecutionRunRecord>();

  constructor(options: {
    engine: AgentEngine;
    deploymentLookup?: (deploymentId: string) => DeploymentLookupRecord | undefined;
    auditService?: AuditService;
    scope?: IsolationScope;
    runtimeCoordinator?: DurableRuntimeCoordinator | null;
    runtimeMode?: "local" | "remote";
  }) {
    this.#engine = options.engine;
    this.#deploymentLookup = options.deploymentLookup;
    this.#auditService = options.auditService;
    this.#defaultScope = options.scope;
    this.#runtimeCoordinator = options.runtimeCoordinator ?? null;
    this.#runtimeMode = options.runtimeMode ?? "local";
  }

  validateStateTransition(current: RuntimeState, next: RuntimeState): boolean {
    if (current === next) return true;
    const allowed = VALID_TRANSITIONS[current];
    return allowed ? allowed.includes(next) : false;
  }

  async start(request: StartRuntimeServiceRequest): Promise<RuntimeInstanceRecord> {
    const deployment = this.#deploymentLookup?.(request.deploymentId);
    const mode = request.deploymentMode ?? deployment?.deploymentMode ?? "sandbox";
    const correlationId = request.correlationId ?? `runtime_${request.deploymentId}_${Date.now()}`;
    const actor = request.actor;
    const agentId = request.agentId;
    const scope = request.scope ?? this.#defaultScope;

    try {
      if (mode === "live" && deployment?.status !== "active") {
        throw new Error("live runtime requires an active, health-verified production deployment");
      }

      const targetId = request.targetId ?? deployment?.targetId;
      if (!targetId) {
        throw new Error(
          "targetId is required for runtime start; provide it explicitly or record it on the deployment",
        );
      }

      if (this.#runtimeMode === "remote") {
        if (!this.#runtimeCoordinator) throw new Error("durable remote runtime coordinator is not configured");
        const runtimeInstanceId = request.runtimeInstanceId ?? `runtime_${request.deploymentId}_${Date.now()}`;
        const job = this.#runtimeCoordinator.createRuntimeStartJob({
          tenantId: scope?.tenantId ?? "",
          runtimeInstanceId,
          deploymentId: request.deploymentId,
          ...(agentId ? { agentId } : {}),
          targetId,
          deploymentMode: deploymentModeValue(mode),
          engineId: this.#engine.identity.id,
          isolationMode: mode === "live" ? "tenant-scoped" : "sandbox",
          correlationId,
          idempotencyKey: request.idempotencyKey ?? `runtime.start:${runtimeInstanceId}`,
          traceContext: request.traceContext,
          maxAttempts: request.maxAttempts,
        });
        const record = this.#jobRuntimeRecord(job, scope);
        this.#runtimes.set(record.runtimeInstanceId, record);
        return record;
      }

      if (!this.#engine.startRuntime) {
        throw new Error("Engine does not support startRuntime");
      }

      const result: RuntimeInstanceResult = await this.#engine.startRuntime({
        deploymentId: request.deploymentId,
        deploymentMode: mode,
        targetId,
        ...(agentId ? { agentId } : {}),
      });

      const resultAgentId = result.agentId ?? agentId;
      const record: RuntimeInstanceRecord = {
        runtimeInstanceId: result.runtimeInstanceId,
        deploymentId: result.deploymentId,
        targetId,
        deploymentMode: mode,
        status: "running",
        startedAt: result.startedAt,
        updatedAt: result.timestamp,
        ...(scope ? { scope } : {}),
        ...(resultAgentId ? { agentId: resultAgentId } : {}),
      };

      this.#runtimes.set(record.runtimeInstanceId, record);

      this.#auditService?.recordEvent({
        eventType: "runtime.started",
        correlationId,
        runtimeInstanceId: record.runtimeInstanceId,
        deploymentId: record.deploymentId,
        ...(record.agentId ? { agentId: record.agentId } : {}),
        ...(actor ? { actor } : {}),
        decision: "allowed",
        result: "success",
        metadata: { targetId: record.targetId, deploymentMode: record.deploymentMode },
      });

      return record;
    } catch (error) {
      this.#auditService?.recordEvent({
        eventType: "runtime.failed",
        correlationId,
        deploymentId: request.deploymentId,
        ...(agentId ? { agentId } : {}),
        ...(actor ? { actor } : {}),
        decision: "denied",
        result: "failure",
        metadata: { phase: "start", error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  }

  async inspect(runtimeInstanceId: string, scope?: IsolationScope): Promise<RuntimeInstanceRecord> {
    return this.inspectWithScope(runtimeInstanceId, scope ?? this.#defaultScope);
  }

  async inspectWithScope(runtimeInstanceId: string, scope?: IsolationScope): Promise<RuntimeInstanceRecord> {
    if (this.#runtimeMode === "remote" && this.#runtimeCoordinator) {
      const job = this.#runtimeCoordinator.listJobs({ tenantId: (scope ?? this.#defaultScope)?.tenantId })
        .find((entry) => entry.runtimeInstanceId === runtimeInstanceId);
      if (!job) {
        throw new EngineRuntimeNotFoundError(`Runtime instance ${runtimeInstanceId} not found`, {
          code: "ACS_ENGINE_RUNTIME_NOT_FOUND",
          details: { runtimeInstanceId },
        });
      }
      return this.#jobRuntimeRecord(job, scope ?? this.#defaultScope);
    }
    const local = this.#runtimes.get(runtimeInstanceId);
    assertSameIsolationScope(scope ?? this.#defaultScope, local?.scope);
    if (this.#engine.inspectRuntime) {
      try {
        const result = await this.#engine.inspectRuntime(runtimeInstanceId);
        const agentId = result.agentId ?? local?.agentId;
        const stoppedAt = result.stoppedAt;
        const terminatedAt = result.terminatedAt;
        const deploymentId = result.deploymentId || local?.deploymentId || "";
        const deployment = deploymentId ? this.#deploymentLookup?.(deploymentId) : undefined;
        const targetId = local?.targetId ?? deployment?.targetId;
        const deploymentMode = local?.deploymentMode ?? deployment?.deploymentMode ?? "sandbox";
        if (!targetId) {
          throw new Error(`cannot resolve targetId for runtime ${runtimeInstanceId}`);
        }
        const effectiveScope = scope ?? local?.scope;
        const updated: RuntimeInstanceRecord = {
          runtimeInstanceId: result.runtimeInstanceId,
          deploymentId,
          targetId,
          deploymentMode,
          status: (result.status as RuntimeState) || "running",
          startedAt: result.startedAt || local?.startedAt || Date.now(),
          updatedAt: result.timestamp,
          ...(effectiveScope ? { scope: effectiveScope } : {}),
          ...(agentId ? { agentId } : {}),
          ...(stoppedAt !== undefined ? { stoppedAt } : {}),
          ...(terminatedAt !== undefined ? { terminatedAt } : {}),
        };
        this.#runtimes.set(runtimeInstanceId, updated);
        return updated;
      } catch (err) {
        if (local) return local;
        throw err;
      }
    }

    if (!local) {
      throw new EngineRuntimeNotFoundError(`Runtime instance ${runtimeInstanceId} not found`, {
        code: "ACS_ENGINE_RUNTIME_NOT_FOUND",
        details: { runtimeInstanceId },
      });
    }
    return local;
  }

  async stop(runtimeInstanceId: string, scope?: IsolationScope): Promise<RuntimeInstanceRecord> {
    if (this.#runtimeMode === "remote" && this.#runtimeCoordinator) {
      const current = await this.inspectWithScope(runtimeInstanceId, scope ?? this.#defaultScope);
      const job = this.#runtimeCoordinator.listJobs({ tenantId: (scope ?? this.#defaultScope)?.tenantId })
        .find((entry) => entry.runtimeInstanceId === runtimeInstanceId);
      if (!job) throw new EngineRuntimeNotFoundError(`Runtime instance ${runtimeInstanceId} not found`);
      const cancelled = this.#runtimeCoordinator.requestCancellation(job.jobId, job.tenantId);
      return this.#jobRuntimeRecord(cancelled, current.scope);
    }
    const current = await this.inspectWithScope(runtimeInstanceId, scope ?? this.#defaultScope);
    if (!this.validateStateTransition(current.status, "stopping")) {
      throw new Error(`Invalid runtime state transition from ${current.status} to stopping`);
    }

    if (!this.#engine.stopRuntime) {
      throw new Error("Engine does not support stopRuntime");
    }

    const correlationId = `runtime_stop_${runtimeInstanceId}_${Date.now()}`;
    try {
      const result = await this.#engine.stopRuntime(runtimeInstanceId);
      const stoppedAt = result.stoppedAt ?? Date.now();
      const updated: RuntimeInstanceRecord = {
        ...current,
        status: "stopped",
        stoppedAt,
        updatedAt: result.timestamp,
      };
      this.#runtimes.set(runtimeInstanceId, updated);

      this.#auditService?.recordEvent({
        eventType: "runtime.stopped",
        correlationId,
        runtimeInstanceId,
        deploymentId: updated.deploymentId,
        ...(updated.agentId ? { agentId: updated.agentId } : {}),
        decision: "allowed",
        result: "success",
        metadata: { targetId: updated.targetId, status: "stopped" },
      });
      return updated;
    } catch (error) {
      this.#auditService?.recordEvent({
        eventType: "runtime.failed",
        correlationId,
        runtimeInstanceId,
        decision: "denied",
        result: "failure",
        metadata: { phase: "stop", error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  }

  async terminate(runtimeInstanceId: string, scope?: IsolationScope): Promise<RuntimeInstanceRecord> {
    const current = await this.inspectWithScope(runtimeInstanceId, scope ?? this.#defaultScope);
    if (!this.validateStateTransition(current.status, "terminated")) {
      throw new Error(`Invalid runtime state transition from ${current.status} to terminated`);
    }

    if (!this.#engine.terminateRuntime) {
      throw new Error("Engine does not support terminateRuntime");
    }

    const correlationId = `runtime_terminate_${runtimeInstanceId}_${Date.now()}`;
    try {
      const result = await this.#engine.terminateRuntime(runtimeInstanceId);
      const terminatedAt = result.terminatedAt ?? Date.now();
      const updated: RuntimeInstanceRecord = {
        ...current,
        status: "terminated",
        terminatedAt,
        updatedAt: result.timestamp,
      };
      this.#runtimes.set(runtimeInstanceId, updated);

      this.#auditService?.recordEvent({
        eventType: "runtime.terminated",
        correlationId,
        runtimeInstanceId,
        deploymentId: updated.deploymentId,
        ...(updated.agentId ? { agentId: updated.agentId } : {}),
        decision: "allowed",
        result: "success",
        metadata: { targetId: updated.targetId, status: "terminated" },
      });
      return updated;
    } catch (error) {
      this.#auditService?.recordEvent({
        eventType: "runtime.failed",
        correlationId,
        runtimeInstanceId,
        decision: "denied",
        result: "failure",
        metadata: {
          phase: "terminate",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  createExecutionRun(request: CreateExecutionRunRequest): ExecutionRunRecord {
    const runId = `run_exec_${request.agentId}_${Date.now()}`;
    const scope = request.scope ?? this.#defaultScope;
    const record: ExecutionRunRecord = {
      runId,
      runtimeInstanceId: request.runtimeInstanceId,
      agentId: request.agentId,
      executionPlanId: request.executionPlanId,
      status: "running",
      startedAt: Date.now(),
      ...(scope ? { scope } : {}),
    };
    this.#executionRuns.set(runId, record);

    this.#auditService?.recordEvent({
      eventType: "execution.run_created",
      correlationId: request.correlationId ?? runId,
      agentId: request.agentId,
      executionRunId: runId,
      runtimeInstanceId: request.runtimeInstanceId,
      ...(request.actor ? { actor: request.actor } : {}),
      decision: "passed",
      result: "success",
      metadata: { executionPlanId: request.executionPlanId },
    });
    return record;
  }

  getExecutionRun(runId: string, scope?: IsolationScope): ExecutionRunRecord | undefined {
    const run = this.#executionRuns.get(runId);
    if (!run) return undefined;
    assertSameIsolationScope(scope ?? this.#defaultScope, run.scope);
    return run;
  }

  listRuntimes(scope?: IsolationScope): readonly RuntimeInstanceRecord[] {
    if (this.#runtimeMode === "remote" && this.#runtimeCoordinator) {
      const effectiveScope = scope ?? this.#defaultScope;
      return this.#runtimeCoordinator.listJobs({ tenantId: effectiveScope?.tenantId })
        .map((job) => this.#jobRuntimeRecord(job, effectiveScope));
    }
    const effectiveScope = scope ?? this.#defaultScope;
    return Array.from(this.#runtimes.values()).filter((record) => {
      try {
        assertSameIsolationScope(effectiveScope, record.scope);
        return true;
      } catch {
        return false;
      }
    });
  }

  listExecutionRuns(scope?: IsolationScope): readonly ExecutionRunRecord[] {
    const effectiveScope = scope ?? this.#defaultScope;
    return Array.from(this.#executionRuns.values()).filter((record) => {
      try {
        assertSameIsolationScope(effectiveScope, record.scope);
        return true;
      } catch {
        return false;
      }
    });
  }

  listAgentExecutionRuns(agentId: string, query: ExecutionRunPageQuery, scope?: IsolationScope): readonly ExecutionRunRecord[] {
    const effectiveScope = scope ?? this.#defaultScope;
    const capacity = query.offset + query.limit;
    const selected: ExecutionRunRecord[] = [];

    for (const record of this.#executionRuns.values()) {
      try {
        assertSameIsolationScope(effectiveScope, record.scope);
      } catch {
        continue;
      }
      if (record.agentId !== agentId) continue;
      insertRunInDescendingOrder(selected, record);
      if (selected.length > capacity) selected.pop();
    }

    return selected.slice(query.offset);
  }

  #jobRuntimeRecord(job: ExecutionJob, scope?: IsolationScope): RuntimeInstanceRecord {
    const status: RuntimeState = job.status === "queued" ? "pending"
      : job.status === "assigned" || job.status === "running" ? "starting"
        : job.status === "succeeded" ? "running"
          : job.status === "cancel_requested" ? "stopping"
            : job.status === "cancelled" ? "stopped"
              : "failed";
    return {
      jobId: job.jobId,
      runtimeInstanceId: job.runtimeInstanceId,
      deploymentId: job.deploymentId,
      ...(job.agentId ? { agentId: job.agentId } : {}),
      targetId: job.workload.targetId,
      deploymentMode: job.workload.deploymentMode,
      status,
      startedAt: job.createdAt,
      updatedAt: job.updatedAt,
      revision: job.revision,
      ...(status === "stopped" ? { stoppedAt: job.updatedAt } : {}),
      ...(scope ? { scope } : {}),
    };
  }
}

function insertRunInDescendingOrder(records: ExecutionRunRecord[], candidate: ExecutionRunRecord): void {
  const index = records.findIndex((record) => compareExecutionRuns(candidate, record) < 0);
  if (index === -1) records.push(candidate);
  else records.splice(index, 0, candidate);
}

function compareExecutionRuns(left: ExecutionRunRecord, right: ExecutionRunRecord): number {
  if (left.startedAt !== right.startedAt) return right.startedAt - left.startedAt;
  return right.runId.localeCompare(left.runId);
}

function deploymentModeValue(mode: string): "sandbox" | "staged" | "live" {
  if (mode === "sandbox" || mode === "staged" || mode === "live") return mode;
  throw new Error(`unsupported deployment mode: ${mode}`);
}
