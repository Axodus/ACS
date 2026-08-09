import type { AgentEngine, RuntimeInstanceResult } from "../engines/agent-engine.js";
import { EngineSandboxOnlyError, EngineRuntimeNotFoundError } from "../engines/engine-errors.js";

export type RuntimeState = "pending" | "starting" | "running" | "stopping" | "stopped" | "failed" | "terminated";

export interface StartRuntimeServiceRequest {
  readonly deploymentId: string;
  readonly agentId?: string;
  readonly deploymentMode?: string;
  readonly targetId?: string;
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
}

export interface CreateExecutionRunRequest {
  readonly runtimeInstanceId: string;
  readonly agentId: string;
  readonly executionPlanId: string;
}

export interface ExecutionRunRecord {
  readonly runId: string;
  readonly runtimeInstanceId: string;
  readonly agentId: string;
  readonly executionPlanId: string;
  readonly status: "pending" | "running" | "completed" | "failed" | "cancelled";
  readonly startedAt: number;
  readonly completedAt?: number;
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
  readonly #runtimes = new Map<string, RuntimeInstanceRecord>();
  readonly #executionRuns = new Map<string, ExecutionRunRecord>();

  constructor(options: { engine: AgentEngine }) {
    this.#engine = options.engine;
  }

  validateStateTransition(current: RuntimeState, next: RuntimeState): boolean {
    if (current === next) return true;
    const allowed = VALID_TRANSITIONS[current];
    return allowed ? allowed.includes(next) : false;
  }

  async start(request: StartRuntimeServiceRequest): Promise<RuntimeInstanceRecord> {
    const mode = request.deploymentMode ?? "sandbox";
    if (mode !== "sandbox") {
      throw new EngineSandboxOnlyError(`Only sandbox runtime execution is supported, got: ${mode}`, {
        code: "ACS_ENGINE_SANDBOX_ONLY",
        details: { deploymentMode: mode },
      });
    }

    if (!this.#engine.startRuntime) {
      throw new Error("Engine does not support startRuntime");
    }

    const result: RuntimeInstanceResult = await this.#engine.startRuntime({
      deploymentId: request.deploymentId,
      deploymentMode: mode,
      targetId: request.targetId ?? "local-wsl",
      ...(request.agentId ? { agentId: request.agentId } : {}),
    });

    const agentId = result.agentId;
    const record: RuntimeInstanceRecord = {
      runtimeInstanceId: result.runtimeInstanceId,
      deploymentId: result.deploymentId,
      targetId: request.targetId ?? "local-wsl",
      deploymentMode: mode,
      status: "running",
      startedAt: result.startedAt,
      updatedAt: result.timestamp,
      ...(agentId ? { agentId } : {}),
    };

    this.#runtimes.set(record.runtimeInstanceId, record);
    return record;
  }

  async inspect(runtimeInstanceId: string): Promise<RuntimeInstanceRecord> {
    const local = this.#runtimes.get(runtimeInstanceId);
    if (this.#engine.inspectRuntime) {
      try {
        const result = await this.#engine.inspectRuntime(runtimeInstanceId);
        const agentId = result.agentId ?? local?.agentId;
        const stoppedAt = result.stoppedAt;
        const terminatedAt = result.terminatedAt;
        const updated: RuntimeInstanceRecord = {
          runtimeInstanceId: result.runtimeInstanceId,
          deploymentId: result.deploymentId || local?.deploymentId || "",
          targetId: local?.targetId ?? "local-wsl",
          deploymentMode: local?.deploymentMode ?? "sandbox",
          status: (result.status as RuntimeState) || "running",
          startedAt: result.startedAt || local?.startedAt || Date.now(),
          updatedAt: result.timestamp,
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

  async stop(runtimeInstanceId: string): Promise<RuntimeInstanceRecord> {
    const current = await this.inspect(runtimeInstanceId);
    if (!this.validateStateTransition(current.status, "stopping")) {
      throw new Error(`Invalid runtime state transition from ${current.status} to stopping`);
    }

    if (!this.#engine.stopRuntime) {
      throw new Error("Engine does not support stopRuntime");
    }

    const result = await this.#engine.stopRuntime(runtimeInstanceId);
    const stoppedAt = result.stoppedAt ?? Date.now();
    const updated: RuntimeInstanceRecord = {
      ...current,
      status: "stopped",
      stoppedAt,
      updatedAt: result.timestamp,
    };
    this.#runtimes.set(runtimeInstanceId, updated);
    return updated;
  }

  async terminate(runtimeInstanceId: string): Promise<RuntimeInstanceRecord> {
    const current = await this.inspect(runtimeInstanceId);
    if (!this.validateStateTransition(current.status, "terminated")) {
      throw new Error(`Invalid runtime state transition from ${current.status} to terminated`);
    }

    if (!this.#engine.terminateRuntime) {
      throw new Error("Engine does not support terminateRuntime");
    }

    const result = await this.#engine.terminateRuntime(runtimeInstanceId);
    const terminatedAt = result.terminatedAt ?? Date.now();
    const updated: RuntimeInstanceRecord = {
      ...current,
      status: "terminated",
      terminatedAt,
      updatedAt: result.timestamp,
    };
    this.#runtimes.set(runtimeInstanceId, updated);
    return updated;
  }

  createExecutionRun(request: CreateExecutionRunRequest): ExecutionRunRecord {
    const runId = `run_exec_${request.agentId}_${Date.now()}`;
    const record: ExecutionRunRecord = {
      runId,
      runtimeInstanceId: request.runtimeInstanceId,
      agentId: request.agentId,
      executionPlanId: request.executionPlanId,
      status: "running",
      startedAt: Date.now(),
    };
    this.#executionRuns.set(runId, record);
    return record;
  }

  getExecutionRun(runId: string): ExecutionRunRecord | undefined {
    return this.#executionRuns.get(runId);
  }

  listRuntimes(): readonly RuntimeInstanceRecord[] {
    return Array.from(this.#runtimes.values());
  }

  listExecutionRuns(): readonly ExecutionRunRecord[] {
    return Array.from(this.#executionRuns.values());
  }
}
