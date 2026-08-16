import type { AgentEngine } from "../engines/agent-engine.js";
import type {
  DurableExecutionError,
  DurableExecutionResult,
  RuntimeClaim,
} from "./durable-runtime-state.js";
import type { WorkerCapability } from "./worker-types.js";
import {
  formatTraceparent,
  type OperationalTelemetryProvider,
  type TraceContext,
} from "../control-plane/operational-telemetry.js";

export interface RemoteWorkerTransport {
  post(path: string, body: Readonly<Record<string, unknown>>, traceContext?: TraceContext): Promise<{ readonly status: number; readonly data?: unknown; readonly error?: unknown }>;
}

export class FetchRemoteWorkerTransport implements RemoteWorkerTransport {
  readonly #baseUrl: string;
  readonly #token: string;
  readonly #fetch: typeof fetch;
  readonly #requestTimeoutMs: number;

  constructor(options: { readonly baseUrl: string; readonly token: string; readonly fetchImpl?: typeof fetch; readonly requestTimeoutMs?: number }) {
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#token = options.token;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
  }

  async post(path: string, body: Readonly<Record<string, unknown>>, traceContext?: TraceContext): Promise<{ readonly status: number; readonly data?: unknown; readonly error?: unknown }> {
    const response = await this.#fetch(this.#baseUrl + path, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.#token}`,
        "content-type": "application/json",
        ...(traceContext ? { traceparent: formatTraceparent(traceContext) } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.#requestTimeoutMs),
    });
    if (response.status === 204) return { status: 204 };
    const payload = await response.json() as { data?: unknown; error?: unknown };
    return { status: response.status, ...(payload.data !== undefined ? { data: payload.data } : {}), ...(payload.error !== undefined ? { error: payload.error } : {}) };
  }
}

export class RemoteWorkerProtocolError extends Error {
  constructor(message: string, readonly status: number, readonly response?: unknown) {
    super(message);
    this.name = "RemoteWorkerProtocolError";
  }
}

export interface RemoteExecutionWorkerOptions {
  readonly transport: RemoteWorkerTransport;
  readonly engine: AgentEngine;
  readonly workerId: string;
  readonly instanceId: string;
  readonly workerName: string;
  readonly workerVersion: string;
  readonly targetId: string;
  readonly heartbeatIntervalMs?: number;
  readonly pollIntervalMs?: number;
  readonly leaseRenewIntervalMs?: number;
  readonly executionDelayMs?: number;
  readonly maxConcurrentRuns?: number;
  readonly supportedRunners?: readonly string[];
  readonly supportedProviders?: readonly string[];
  readonly supportedIsolationModes?: readonly string[];
  readonly onError?: (error: unknown) => void;
  readonly onEvent?: (event: { readonly category: string; readonly jobId?: string; readonly assignmentId?: string }) => void;
  readonly telemetry?: OperationalTelemetryProvider;
}

export class RemoteExecutionWorker {
  readonly #transport: RemoteWorkerTransport;
  readonly #engine: AgentEngine;
  readonly #workerId: string;
  readonly #instanceId: string;
  readonly #workerName: string;
  readonly #workerVersion: string;
  readonly #targetId: string;
  readonly #heartbeatIntervalMs: number;
  readonly #pollIntervalMs: number;
  readonly #leaseRenewIntervalMs: number;
  readonly #executionDelayMs: number;
  readonly #maxConcurrentRuns: number;
  readonly #supportedRunners: readonly string[];
  readonly #supportedProviders: readonly string[];
  readonly #supportedIsolationModes: readonly string[];
  readonly #onError: ((error: unknown) => void) | undefined;
  readonly #onEvent: RemoteExecutionWorkerOptions["onEvent"];
  readonly #telemetry: OperationalTelemetryProvider | undefined;
  #running = false;
  #draining = false;
  #loopPromise: Promise<void> | undefined;
  #heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  #activeRuns = 0;
  #lastError: string | undefined;

  constructor(options: RemoteExecutionWorkerOptions) {
    this.#transport = options.transport;
    this.#engine = options.engine;
    this.#workerId = options.workerId;
    this.#instanceId = options.instanceId;
    this.#workerName = options.workerName;
    this.#workerVersion = options.workerVersion;
    this.#targetId = options.targetId;
    this.#heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5_000;
    this.#pollIntervalMs = options.pollIntervalMs ?? 250;
    this.#leaseRenewIntervalMs = options.leaseRenewIntervalMs ?? 3_000;
    this.#executionDelayMs = options.executionDelayMs ?? 0;
    this.#maxConcurrentRuns = options.maxConcurrentRuns ?? 1;
    this.#supportedRunners = options.supportedRunners ?? ["opencode"];
    this.#supportedProviders = options.supportedProviders ?? ["axodus-managed"];
    this.#supportedIsolationModes = options.supportedIsolationModes ?? ["sandbox"];
    this.#onError = options.onError;
    this.#onEvent = options.onEvent;
    this.#telemetry = options.telemetry;
  }

  async start(): Promise<void> {
    if (this.#running) return;
    const capabilities = await this.#capabilities();
    await this.#postRequired("/api/v1/internal/runtime/workers/register", {
      name: this.#workerName,
      version: this.#workerVersion,
      targetId: this.#targetId,
      capabilities,
    });
    this.#running = true;
    await this.heartbeat();
    this.#heartbeatTimer = setInterval(() => {
      void this.heartbeat().catch((error) => {
        this.#lastError = error instanceof Error ? error.message : String(error);
        this.#onError?.(error);
      });
    }, this.#heartbeatIntervalMs);
    this.#loopPromise = this.#pollLoop();
  }

  async stop(options: { readonly drain?: boolean } = {}): Promise<void> {
    if (!this.#running) return;
    this.#draining = options.drain ?? true;
    this.#running = false;
    if (this.#heartbeatTimer) clearInterval(this.#heartbeatTimer);
    if (this.#draining) await this.heartbeat().catch(() => undefined);
    await this.#loopPromise;
    await this.#engine.close();
    await this.#telemetry?.close();
  }

  async heartbeat(): Promise<void> {
    await this.#postRequired("/api/v1/internal/runtime/workers/heartbeat", {
      status: this.#draining ? "draining" : this.#activeRuns >= this.#maxConcurrentRuns ? "busy" : "available",
    });
  }

  async runOnce(): Promise<boolean> {
    if (this.#draining || this.#activeRuns >= this.#maxConcurrentRuns) return false;
    const response = await this.#transport.post("/api/v1/internal/runtime/jobs/claim", {});
    if (response.status === 204) return false;
    if (response.status < 200 || response.status >= 300) {
      throw new RemoteWorkerProtocolError("worker claim failed", response.status, response.error);
    }
    const claim = response.data as RuntimeClaim;
    this.#telemetry?.log({ component: "remote-worker", event: "runtime.worker.claimed", message: "Worker claimed a durable runtime job", context: { correlationId: claim.job.correlationId, traceId: claim.job.traceContext?.traceId, spanId: claim.job.traceContext?.spanId, tenantId: claim.job.tenantId, jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId, workerId: this.#workerId }, attributes: { fencingToken: claim.assignment.fencingToken, attempt: claim.assignment.attempt } });
    this.#onEvent?.({ category: "runtime.worker.claimed", jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId });
    this.#activeRuns += 1;
    try {
      await this.#executeClaim(claim);
    } finally {
      this.#activeRuns = Math.max(0, this.#activeRuns - 1);
    }
    return true;
  }

  isRunning(): boolean { return this.#running; }
  get workerId(): string { return this.#workerId; }
  get instanceId(): string { return this.#instanceId; }
  get lastError(): string | undefined { return this.#lastError; }

  async #pollLoop(): Promise<void> {
    while (this.#running) {
      try {
        const claimed = await this.runOnce();
        if (!claimed) await delay(this.#pollIntervalMs);
      } catch (error) {
        this.#lastError = error instanceof Error ? error.message : String(error);
        this.#onError?.(error);
        await delay(this.#pollIntervalMs);
      }
    }
  }

  async #executeClaim(claim: RuntimeClaim): Promise<void> {
    const executionSpan = this.#telemetry?.startSpan("job.execute", {
      parent: claim.job.traceContext,
      context: { correlationId: claim.job.correlationId, tenantId: claim.job.tenantId, jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId, workerId: this.#workerId },
      attributes: { workloadType: claim.job.workloadType, attempt: claim.assignment.attempt, fencingToken: claim.assignment.fencingToken },
    });
    const workerTrace = executionSpan?.context ?? claim.job.traceContext;
    const ownership = {
      assignmentId: claim.assignment.assignmentId,
      leaseId: claim.assignment.leaseId,
      fencingToken: claim.assignment.fencingToken,
    };
    await this.#postRequired(`/api/v1/internal/runtime/jobs/${encodeURIComponent(claim.job.jobId)}/running`, ownership, workerTrace);
    this.#onEvent?.({ category: "runtime.worker.running", jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId });
    const startedAt = Date.now();
    const renewTimer = setInterval(() => {
      void this.#postRequired(`/api/v1/internal/runtime/jobs/${encodeURIComponent(claim.job.jobId)}/renew`, ownership, workerTrace).catch(() => undefined);
    }, this.#leaseRenewIntervalMs);
    let executionCompleted = false;
    try {
      if (claim.job.workload.type !== "runtime.start") throw new Error("unsupported remote workload type");
      if (!this.#engine.startRuntime) throw new Error("worker engine does not support runtime.start");
      if (this.#executionDelayMs > 0) await delay(this.#executionDelayMs);
      this.#onEvent?.({ category: "runtime.worker.execution_started", jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId });
      const runtime = await this.#engine.startRuntime({
        deploymentId: claim.job.workload.deploymentId,
        ...(claim.job.workload.agentId ? { agentId: claim.job.workload.agentId } : {}),
        deploymentMode: claim.job.workload.deploymentMode,
        targetId: claim.job.workload.targetId,
      });
      const completedAt = Date.now();
      executionCompleted = true;
      this.#onEvent?.({ category: "runtime.worker.execution_completed", jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId });
      this.#telemetry?.log({ component: "remote-worker", event: "runtime.worker.execution_completed", message: "Worker execution completed", context: { correlationId: claim.job.correlationId, traceId: workerTrace?.traceId, spanId: workerTrace?.spanId, tenantId: claim.job.tenantId, jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId, workerId: this.#workerId }, attributes: { durationMs: completedAt - startedAt } });
      this.#telemetry?.metric({ name: "acs.worker.job.duration", kind: "histogram", value: completedAt - startedAt, unit: "ms", attributes: { workloadType: claim.job.workloadType } });
      const result: DurableExecutionResult = {
        status: "success",
        output: {
          runtimeInstanceId: runtime.runtimeInstanceId,
          deploymentId: runtime.deploymentId,
          status: runtime.status,
          workerId: this.#workerId,
          workerInstanceId: this.#instanceId,
          workerProcessId: process.pid,
        },
        evidenceRefs: [
          `runtime-job:${claim.job.jobId}`,
          `assignment:${claim.assignment.assignmentId}`,
          `worker:${this.#workerId}:${this.#instanceId}`,
        ],
        usageRecords: [{
          dimension: "agent.runtime",
          quantity: "1",
          unit: "run",
          startTime: startedAt,
          endTime: completedAt,
          source: "worker",
          confidence: "final",
        }],
        completedAt,
      };
      const response = await this.#postResultWithRetry(`/api/v1/internal/runtime/jobs/${encodeURIComponent(claim.job.jobId)}/result`, {
        ...ownership,
        result,
        resultIdempotencyKey: `${claim.assignment.assignmentId}:${claim.assignment.fencingToken}`,
      }, 3, workerTrace);
      if (response.status !== 200 && response.status !== 409) {
        throw new RemoteWorkerProtocolError("worker result submission failed", response.status, response.error);
      }
      this.#onEvent?.({ category: response.status === 200 ? "runtime.worker.result_committed" : "runtime.worker.result_rejected", jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId });
      executionSpan?.end(response.status === 200 || response.status === 409 ? "ok" : "error", { resultStatus: response.status });
    } catch (error) {
      // Once physical execution has completed, a lost HTTP response leaves the
      // commit outcome uncertain. Never reinterpret that as an execution
      // failure: the idempotent result submission is retried, and durable lease
      // recovery remains the final authority if the transport stays down.
      if (executionCompleted) {
        executionSpan?.end("error", { failureCode: error instanceof Error ? error.name : "RESULT_SUBMISSION_FAILED" });
        throw error;
      }
      const executionError: DurableExecutionError = {
        code: error instanceof Error ? error.name : "RemoteWorkerExecutionError",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
        details: {
          workerId: this.#workerId,
          workerInstanceId: this.#instanceId,
          processId: process.pid,
        },
      };
      const response = await this.#transport.post(`/api/v1/internal/runtime/jobs/${encodeURIComponent(claim.job.jobId)}/failure`, {
        ...ownership,
        error: executionError,
      }, workerTrace);
      if (response.status < 200 || response.status >= 300) {
        throw new RemoteWorkerProtocolError("worker failure submission failed", response.status, response.error);
      }
      this.#onEvent?.({ category: "runtime.worker.failure_committed", jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId });
      this.#telemetry?.log({ level: "error", component: "remote-worker", event: "runtime.worker.execution_failed", message: "Worker execution failed", context: { correlationId: claim.job.correlationId, traceId: workerTrace?.traceId, spanId: workerTrace?.spanId, tenantId: claim.job.tenantId, jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId, workerId: this.#workerId }, attributes: { failureCode: executionError.code, retryable: executionError.retryable } });
      executionSpan?.end("error", { failureCode: executionError.code });
    } finally {
      clearInterval(renewTimer);
    }
  }

  async #capabilities(): Promise<WorkerCapability> {
    const [version, capabilities, target] = await Promise.all([
      this.#engine.version(),
      this.#engine.capabilities(),
      this.#engine.inspectExecutionTarget(this.#targetId),
    ]);
    if (target.health.status !== "ready" || !target.schedulingEligible) {
      throw new Error(`execution target ${this.#targetId} is not scheduling eligible`);
    }
    return {
      engineId: this.#engine.identity.id,
      ...(version.sourceRevision ?? version.packageVersion ? { engineRevision: version.sourceRevision ?? version.packageVersion } : {}),
      supportedRunners: this.#supportedRunners,
      supportedProviders: this.#supportedProviders,
      supportedIsolationModes: this.#supportedIsolationModes,
      supportedDeploymentModes: capabilities.deploymentModes,
      supportedTargetIds: [this.#targetId],
      maxConcurrentRuns: this.#maxConcurrentRuns,
    };
  }

  async #postRequired(path: string, body: Readonly<Record<string, unknown>>, traceContext?: TraceContext): Promise<unknown> {
    const response = await this.#transport.post(path, body, traceContext);
    if (response.status < 200 || response.status >= 300) {
      const errorCode = response.error && typeof response.error === "object" && "code" in response.error
        ? String((response.error as { readonly code?: unknown }).code ?? "unknown")
        : "unknown";
      throw new RemoteWorkerProtocolError(
        `worker request failed: ${path} (status ${response.status}, code ${errorCode})`,
        response.status,
        response.error,
      );
    }
    return response.data;
  }

  async #postResultWithRetry(
    path: string,
    body: Readonly<Record<string, unknown>>,
    attempts = 3,
    traceContext?: TraceContext,
  ): Promise<{ readonly status: number; readonly data?: unknown; readonly error?: unknown }> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.#transport.post(path, body, traceContext);
        if (response.status === 200 || response.status === 409) return response;
        if (response.status < 500 && response.status !== 429) return response;
        lastError = new RemoteWorkerProtocolError("worker result submission temporarily unavailable", response.status, response.error);
      } catch (error) {
        lastError = error;
      }
      if (attempt < attempts) await delay(Math.min(1_000, 100 * (2 ** (attempt - 1))));
    }
    throw lastError ?? new Error("worker result submission failed without a response");
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
