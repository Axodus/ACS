import type { AgentEngine, RuntimeInstanceResult } from "../engines/agent-engine.js";
import { EngineSandboxOnlyError, EngineRuntimeNotFoundError } from "../engines/engine-errors.js";
import type { AuditService } from "./audit-service.js";
import { assertSameIsolationScope, type IsolationScope } from "./isolation.js";

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
}

export interface RuntimeInstanceRecord {
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

export interface DeploymentLookupRecord {
  readonly targetId?: string;
  readonly deploymentMode?: string;
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
  readonly #runtimes = new Map<string, RuntimeInstanceRecord>();
  readonly #executionRuns = new Map<string, ExecutionRunRecord>();

  constructor(options: {
    engine: AgentEngine;
    deploymentLookup?: (deploymentId: string) => DeploymentLookupRecord | undefined;
    auditService?: AuditService;
    scope?: IsolationScope;
  }) {
    this.#engine = options.engine;
    this.#deploymentLookup = options.deploymentLookup;
    this.#auditService = options.auditService;
    this.#defaultScope = options.scope;
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
      if (mode !== "sandbox") {
        throw new EngineSandboxOnlyError(`Only sandbox runtime execution is supported, got: ${mode}`, {
          code: "ACS_ENGINE_SANDBOX_ONLY",
          details: { deploymentMode: mode },
        });
      }

      if (!this.#engine.startRuntime) {
        throw new Error("Engine does not support startRuntime");
      }

      const targetId = request.targetId ?? deployment?.targetId;
      if (!targetId) {
        throw new Error(
          "targetId is required for runtime start; provide it explicitly or record it on the deployment",
        );
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
}
