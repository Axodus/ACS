import type { AgentEngine, RuntimeInstanceResult } from "../engines/agent-engine.js";
import { EngineSandboxOnlyError } from "../engines/engine-errors.js";
import type { AuditService } from "../control-plane/audit-service.js";
import type { ExecutionPlan } from "../control-plane/unified-agent-model.js";
import type {
  ExecutionAssignment,
  WorkerExecutionError,
  WorkerExecutionResult,
  WorkerHealth,
  WorkerHealthCheck,
  WorkerHealthFinding,
  WorkerHeartbeatInput,
  WorkerStatus,
  WorkerTargetCompatibility,
} from "./worker-types.js";
import type { ExecutionWorkerRegistry } from "./worker-registry.js";
import type { WorkerAssignmentService } from "./worker-assignment-service.js";

export interface LocalWorkerOptions {
  readonly workerRegistry: ExecutionWorkerRegistry;
  readonly assignmentService: WorkerAssignmentService;
  readonly engine: AgentEngine;
  readonly targetId: string;
  readonly workerId: string;
  readonly workerName: string;
  readonly workerVersion: string;
  readonly auditService?: AuditService;
  readonly heartbeatIntervalMs?: number;
  readonly maxConcurrentRuns?: number;
  readonly supportedRunners?: readonly string[];
  readonly supportedProviders?: readonly string[];
  readonly supportedIsolationModes?: readonly string[];
}

function mapTargetType(type: string): WorkerTargetCompatibility["executionTargetType"] {
  if (type.includes("local")) return "local";
  if (type.includes("worker")) return "cloud-worker";
  return "remote";
}

function mapEngineStatusToWorkerStatus(status: "ready" | "degraded" | "unavailable" | "misconfigured", capacityAvailable: boolean): WorkerStatus {
  if (status === "ready" && capacityAvailable) return "available";
  if (status === "ready") return "degraded";
  if (status === "degraded" && capacityAvailable) return "degraded";
  if (status === "degraded") return "degraded";
  return "unavailable";
}

export class LocalExecutionWorker {
  readonly #workerRegistry: ExecutionWorkerRegistry;
  readonly #assignmentService: WorkerAssignmentService;
  readonly #engine: AgentEngine;
  readonly #targetId: string;
  readonly #workerId: string;
  readonly #auditService: AuditService | undefined;
  readonly #heartbeatIntervalMs: number;
  readonly #maxConcurrentRuns: number;
  readonly #supportedRunners: readonly string[];
  readonly #supportedProviders: readonly string[];
  readonly #supportedIsolationModes: readonly string[];
  #heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  #running = false;

  constructor(options: LocalWorkerOptions) {
    this.#workerRegistry = options.workerRegistry;
    this.#assignmentService = options.assignmentService;
    this.#engine = options.engine;
    this.#targetId = options.targetId;
    this.#workerId = options.workerId;
    this.#auditService = options.auditService;
    this.#heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30000;
    this.#maxConcurrentRuns = options.maxConcurrentRuns ?? 2;
    this.#supportedRunners = options.supportedRunners ?? ["opencode"];
    this.#supportedProviders = options.supportedProviders ?? ["axodus-managed"];
    this.#supportedIsolationModes = options.supportedIsolationModes ?? ["sandbox"];

    this.#workerRegistry.register({
      id: options.workerId,
      name: options.workerName,
      version: options.workerVersion,
      engineId: this.#engine.identity.id,
      supportedRunners: this.#supportedRunners,
      supportedProviders: this.#supportedProviders,
      supportedIsolationModes: this.#supportedIsolationModes,
      supportedDeploymentModes: ["sandbox"],
      maxConcurrentRuns: this.#maxConcurrentRuns,
      targetCompatibility: [{
        executionTargetId: options.targetId,
        executionTargetType: "local",
        engineId: this.#engine.identity.id,
        healthStatus: "unavailable",
        observedAt: Date.now(),
      }],
    });
  }

  async start(): Promise<void> {
    if (this.#running) {
      return;
    }
    this.#running = true;
    await this.sendHeartbeat().catch(() => undefined);
    this.#heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat().catch((error) => {
        this.#auditService?.recordEvent({
          eventType: "worker.heartbeat_failed",
          correlationId: `worker_heartbeat_${this.#workerId}_${Date.now()}`,
          decision: "failed",
          result: "failure",
          metadata: {
            workerId: this.#workerId,
            targetId: this.#targetId,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      });
    }, this.#heartbeatIntervalMs);
    this.#auditService?.recordEvent({
      eventType: "worker.started",
      correlationId: `worker_start_${this.#workerId}_${Date.now()}`,
      decision: "allowed",
      result: "success",
      metadata: { workerId: this.#workerId, targetId: this.#targetId },
    });
  }

  async stop(): Promise<void> {
    if (!this.#running) {
      return;
    }
    this.#running = false;
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer);
      this.#heartbeatTimer = null;
    }
    this.#workerRegistry.markStale(this.#workerId);
    this.#auditService?.recordEvent({
      eventType: "worker.stopped",
      correlationId: `worker_stop_${this.#workerId}_${Date.now()}`,
      decision: "allowed",
      result: "success",
      metadata: { workerId: this.#workerId, targetId: this.#targetId },
    });
  }

  async sendHeartbeat(): Promise<void> {
    const worker = this.#workerRegistry.get(this.#workerId);
    try {
      const [engineHealth, engineVersion, engineCapabilities] = await Promise.all([
        this.#engine.health(),
        this.#engine.version(),
        this.#engine.capabilities(),
      ]);
      const targetInfo = await this.#engine.inspectExecutionTarget(this.#targetId);

      const targetHealthStatus = targetInfo.health.status === "ready" ? "healthy" : targetInfo.health.status === "degraded" ? "degraded" : "unavailable";
      const workerHealthStatus =
        engineHealth.status === "ready" && targetHealthStatus === "healthy"
          ? "healthy"
          : engineHealth.status === "degraded" || targetHealthStatus === "degraded"
            ? "degraded"
            : "unavailable";

      const checks: WorkerHealthCheck[] = [
        {
          name: "engine.health",
          status: engineHealth.status === "ready" ? "pass" : engineHealth.status === "degraded" ? "warning" : "fail",
          message: `Engine status: ${engineHealth.status}`,
        },
        {
          name: "target.health",
          status: targetHealthStatus === "healthy" ? "pass" : targetHealthStatus === "degraded" ? "warning" : "fail",
          message: `Target status: ${targetInfo.health.status}`,
        },
        {
          name: "capacity",
          status: worker.capacity.availableSlots > 0 ? "pass" : "warning",
          message: `${worker.capacity.availableSlots}/${worker.capacity.maxConcurrentRuns} slots available`,
        },
      ];

      const findings: WorkerHealthFinding[] = [];
      if (engineHealth.status !== "ready") {
        findings.push({
          code: "ENGINE_HEALTH_NON_READY",
          severity: engineHealth.status === "degraded" ? "warning" : "error",
          message: `Engine reported ${engineHealth.status}`,
        });
      }
      if (targetHealthStatus !== "healthy") {
        findings.push({
          code: "TARGET_HEALTH_NON_READY",
          severity: targetHealthStatus === "degraded" ? "warning" : "error",
          message: `Target reported ${targetInfo.health.status}`,
        });
      }
      if (worker.capacity.availableSlots <= 0) {
        findings.push({
          code: "WORKER_CAPACITY_EXHAUSTED",
          severity: "warning",
          message: "Worker has no available capacity",
        });
      }

      const health: WorkerHealth = {
        status: workerHealthStatus,
        observedAt: Date.now(),
        checks,
        findings,
      };

      const status = mapEngineStatusToWorkerStatus(engineHealth.status, worker.capacity.availableSlots > 0);
      const heartbeat: WorkerHeartbeatInput = {
        workerId: this.#workerId,
        status,
        health,
        capacity: {
          maxConcurrentRuns: worker.capacity.maxConcurrentRuns,
          activeRuns: worker.capacity.activeRuns,
          availableSlots: worker.capacity.availableSlots,
        },
        capabilities: {
          engineId: this.#engine.identity.id,
          supportedRunners: this.#supportedRunners,
          supportedProviders: this.#supportedProviders,
          supportedIsolationModes: this.#supportedIsolationModes,
          supportedDeploymentModes: engineCapabilities.deploymentModes,
          maxConcurrentRuns: this.#maxConcurrentRuns,
          ...(engineVersion.sourceRevision ?? engineVersion.packageVersion
            ? { engineRevision: engineVersion.sourceRevision ?? engineVersion.packageVersion }
            : {}),
        },
        targetCompatibility: [{
          executionTargetId: this.#targetId,
          executionTargetType: mapTargetType(targetInfo.type),
          engineId: this.#engine.identity.id,
          healthStatus: targetHealthStatus,
          observedAt: Date.now(),
        }],
      };

      this.#workerRegistry.receiveHeartbeat(heartbeat);
    } catch (error) {
      const health: WorkerHealth = {
        status: "unavailable",
        observedAt: Date.now(),
        checks: [{
          name: "heartbeat",
          status: "fail",
          message: `Heartbeat failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        findings: [{
          code: "HEARTBEAT_FAILED",
          severity: "error",
          message: error instanceof Error ? error.message : String(error),
        }],
      };

      this.#workerRegistry.receiveHeartbeat({
        workerId: this.#workerId,
        status: "unavailable",
        health,
        capacity: worker.capacity,
      });
      throw error;
    }
  }

  async executeAssignment(assignmentId: string, executionPlan: ExecutionPlan): Promise<WorkerExecutionResult> {
    const assignment = this.#assignmentService.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }
    if (assignment.workerId !== this.#workerId) {
      throw new Error(`Assignment ${assignmentId} is not assigned to worker ${this.#workerId}`);
    }

    this.#assignmentService.acceptAssignment(assignmentId);
    this.#assignmentService.startAssignment(assignmentId);

    const correlationId = assignment.correlationId;
    const startedAt = Date.now();

    try {
      if (!this.#engine.startRuntime) {
        throw new Error("Engine does not support startRuntime");
      }

      const runtimeResult: RuntimeInstanceResult = await this.#engine.startRuntime({
        deploymentId: assignment.deploymentId,
        agentId: executionPlan.agentId,
        deploymentMode: executionPlan.deploymentMode,
        targetId: this.#targetId,
      });

      const result: WorkerExecutionResult = {
        status: "success",
        output: {
          runtimeInstanceId: runtimeResult.runtimeInstanceId,
          deploymentId: runtimeResult.deploymentId,
          executionPlanId: executionPlan.planId,
        },
        evidenceRefs: [
          `worker:${assignmentId}:runtime-started`,
          `worker:${assignmentId}:runtime-completed`,
        ],
        usageRecords: [{
          dimension: "agent.runtime",
          quantity: 1n,
          unit: "run",
          startTime: startedAt,
          endTime: Date.now(),
          source: "worker",
          confidence: "final",
        }],
        completedAt: Date.now(),
      };

      this.#assignmentService.completeAssignment(assignmentId, result);
      this.#auditService?.recordEvent({
        eventType: "worker.assignment_completed",
        correlationId,
        decision: "allowed",
        result: "success",
        metadata: {
          workerId: this.#workerId,
          assignmentId,
          runtimeInstanceId: runtimeResult.runtimeInstanceId,
        },
      });
      return result;
    } catch (error) {
      const executionError: WorkerExecutionError = {
        code: error instanceof Error ? error.name : "WorkerExecutionError",
        message: error instanceof Error ? error.message : String(error),
        retryable: !(error instanceof EngineSandboxOnlyError),
        details: {
          workerId: this.#workerId,
          assignmentId,
          executionPlanId: executionPlan.planId,
        },
      };

      this.#assignmentService.failAssignment(assignmentId, executionError);
      this.#auditService?.recordEvent({
        eventType: "worker.assignment_failed",
        correlationId,
        decision: "failed",
        result: "failure",
        metadata: {
          workerId: this.#workerId,
          assignmentId,
          error: executionError.message,
        },
      });
      throw new Error(`Worker execution failed: ${assignmentId} - ${executionError.message}`);
    }
  }

  getWorkerId(): string {
    return this.#workerId;
  }

  getTargetId(): string {
    return this.#targetId;
  }

  isRunning(): boolean {
    return this.#running;
  }
}
