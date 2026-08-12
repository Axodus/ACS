import type { DeploymentRecord } from "./deployment-service.js";
import type { ExecutionRunRecord, RuntimeInstanceRecord } from "./runtime-lifecycle-service.js";
import type { RegisteredWorker } from "../workers/worker-registry.js";
import type { ExecutionAssignment } from "../workers/worker-types.js";
import type { RegisteredExecutionTarget } from "../targets/execution-target-registry.js";

export type OperationState =
  | "queued"
  | "pending"
  | "running"
  | "waiting"
  | "recovering"
  | "retrying"
  | "succeeded"
  | "failed"
  | "blocked"
  | "cancelled"
  | "stale"
  | "unknown"
  | "unsupported"
  | "unavailable"
  | "deferred";

export type OperationType =
  | "agent_lifecycle"
  | "composition_validation"
  | "readiness_check"
  | "deployment_plan"
  | "deploy"
  | "runtime_start"
  | "runtime_stop"
  | "execution_run"
  | "worker_assignment"
  | "worker_recovery"
  | "evidence_collection"
  | "economic_reservation";

export type ReliabilitySeverity = "critical" | "high" | "medium" | "low" | "informational";

export type ReliabilityTruthLayer =
  | "control_plane_assertion"
  | "runtime_observation"
  | "external_execution_target";

export interface ReliabilityFinding {
  readonly code: string;
  readonly severity: ReliabilitySeverity;
  readonly message: string;
  readonly responsibleDomain: string;
  readonly dependsOnFutureMilestone?: string;
  readonly evidence?: string;
}

export interface OperationStateModelItem {
  readonly type: OperationType;
  readonly label: string;
  readonly state: "supported" | "unsupported" | "unavailable" | "deferred" | "not_applicable";
  readonly reason: string;
  readonly evidence: readonly string[];
}

export interface LongRunningOperation {
  readonly id: string;
  readonly type: OperationType;
  readonly targetEntity: string;
  readonly state: OperationState;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly updatedAt: number;
  readonly completedAt?: number;
  readonly progress?: string;
  readonly retryAvailability: "available" | "unavailable" | "unsupported" | "planned";
  readonly cancellationAvailability: "available" | "unavailable" | "unsupported" | "planned";
  readonly recoveryAvailability: "available" | "unavailable" | "unsupported" | "planned";
  readonly evidence: readonly string[];
  readonly runtimeDependency: string;
  readonly workerDependency: string;
  readonly stale: boolean;
  readonly caveats: readonly string[];
  readonly reason?: string;
}

export interface OperationResult {
  readonly id: string;
  readonly operationId: string;
  readonly outcome: "succeeded" | "failed" | "blocked" | "cancelled" | "pending" | "unknown";
  readonly failureCategory?: string;
  readonly failureReason?: string;
  readonly retryable: boolean;
  readonly recoveryStatus: "not_required" | "available" | "in_progress" | "succeeded" | "failed" | "blocked" | "unsupported" | "unavailable" | "planned" | "unknown";
  readonly nextAction?: string;
  readonly evidence: readonly string[];
  readonly correlationId?: string;
}

export type RuntimeConfidenceState =
  | "ready"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "degraded"
  | "failed"
  | "recovering"
  | "stale"
  | "unknown"
  | "unsupported"
  | "unavailable";

export type WorkerConfidenceState =
  | "available"
  | "busy"
  | "assigned"
  | "idle"
  | "degraded"
  | "failed"
  | "recovering"
  | "stale"
  | "offline"
  | "unknown"
  | "unsupported"
  | "unavailable";

export type ConfidenceLevel = "high" | "medium" | "low" | "none" | "unknown";

export interface RuntimeConfidenceItem {
  readonly id: string;
  readonly state: RuntimeConfidenceState;
  readonly healthState: "healthy" | "degraded" | "unavailable" | "unknown";
  readonly confidenceLevel: ConfidenceLevel;
  readonly lastObservedTime: string;
  readonly sourceOfObservation: ReliabilityTruthLayer;
  readonly sourceEvidence: readonly string[];
  readonly executionTargetDependency: string;
  readonly stale: boolean;
  readonly activeOperations: number;
  readonly failedOperations: number;
  readonly recoveringOperations: number;
  readonly caveats: readonly string[];
  readonly unsupportedControls: readonly string[];
}

export interface WorkerConfidenceItem {
  readonly id: string;
  readonly state: WorkerConfidenceState;
  readonly workloadState: "idle" | "busy" | "unknown";
  readonly assignmentStatus: string;
  readonly targetDependency: string;
  readonly healthState: "healthy" | "degraded" | "unavailable" | "unknown";
  readonly confidenceLevel: ConfidenceLevel;
  readonly lastHeartbeatAt?: string;
  readonly lastObservedTime: string;
  readonly stale: boolean;
  readonly activeWorkload: number;
  readonly failedWorkload: number;
  readonly recoverySupport: "available" | "unavailable" | "unsupported" | "planned";
  readonly capacitySummary: string;
  readonly caveats: readonly string[];
  readonly unsupportedOperations: readonly string[];
}

export interface DistributedScenarioResult {
  readonly id: string;
  readonly label: string;
  readonly status: "supported" | "partial" | "unsupported" | "unavailable" | "deferred";
  readonly reason: string;
  readonly evidence: readonly string[];
}

export interface RecoverySemanticsItem {
  readonly id: string;
  readonly label: string;
  readonly state: "available" | "partial" | "unavailable" | "unsupported" | "planned" | "deferred";
  readonly reason: string;
  readonly evidence: readonly string[];
}

export interface OperationalReliabilityReport {
  readonly checkedAt: string;
  readonly operationalReliabilityReady: false;
  readonly productionReady: false;
  readonly claim: "not_claimed";
  readonly summary: {
    readonly operationsTracked: number;
    readonly running: number;
    readonly succeeded: number;
    readonly failed: number;
    readonly blocked: number;
    readonly stale: number;
    readonly recovering: number;
    readonly unsupported: number;
    readonly unavailable: number;
  };
  readonly operationStateModel: readonly OperationStateModelItem[];
  readonly longRunningOperations: readonly LongRunningOperation[];
  readonly operationResults: readonly OperationResult[];
  readonly runtimeConfidence: readonly RuntimeConfidenceItem[];
  readonly workerConfidence: readonly WorkerConfidenceItem[];
  readonly distributedOperations: {
    readonly status: "supported" | "partial" | "unsupported" | "unavailable" | "deferred";
    readonly scenarios: readonly DistributedScenarioResult[];
    readonly caveats: readonly string[];
  };
  readonly recoverySemantics: readonly RecoverySemanticsItem[];
  readonly blockers: readonly ReliabilityFinding[];
  readonly warnings: readonly ReliabilityFinding[];
  readonly caveats: readonly ReliabilityFinding[];
  readonly deferredItems: readonly ReliabilityFinding[];
  readonly readinessGateDependencies: readonly string[];
  readonly sourceEvidence: readonly string[];
  readonly claimDiscipline: {
    readonly productionReadyClaimAllowed: false;
    readonly operationalReliabilityReadyClaimAllowed: false;
    readonly reason: string;
  };
}

export interface OperationalReliabilitySignals {
  readonly deployments?: readonly DeploymentRecord[];
  readonly runtimes?: readonly RuntimeInstanceRecord[];
  readonly executionRuns?: readonly ExecutionRunRecord[];
  readonly workers?: readonly RegisteredWorker[];
  readonly assignments?: readonly ExecutionAssignment[];
  readonly targets?: readonly RegisteredExecutionTarget[];
  readonly runtimeServiceAvailable?: boolean;
  readonly workerRegistryAvailable?: boolean;
  readonly workerAssignmentServiceAvailable?: boolean;
  readonly targetServiceAvailable?: boolean;
  readonly auditAvailable?: boolean;
}

const OPERATION_TYPES: readonly {
  readonly type: OperationType;
  readonly label: string;
  readonly state: OperationStateModelItem["state"];
  readonly reason: string;
  readonly evidence: readonly string[];
}[] = [
  {
    type: "agent_lifecycle",
    label: "Agent lifecycle",
    state: "unsupported",
    reason: "Agent lifecycle records exist as agent state, but long-running agent lifecycle operations are not tracked in this milestone.",
    evidence: ["src/control-plane/agent-service.ts"],
  },
  {
    type: "composition_validation",
    label: "Composition validation",
    state: "unsupported",
    reason: "Composition validation is synchronous and is not exposed as a long-running operation.",
    evidence: ["src/control-plane/composition-resources.ts"],
  },
  {
    type: "readiness_check",
    label: "Readiness check",
    state: "not_applicable",
    reason: "Readiness is represented by the production readiness projection and is not a long-running operation.",
    evidence: ["src/control-plane/production-readiness.ts"],
  },
  {
    type: "deployment_plan",
    label: "Deployment plan",
    state: "unavailable",
    reason: "Deployment planning records are not separately retained by this surface.",
    evidence: ["src/control-plane/deployment-service.ts"],
  },
  {
    type: "deploy",
    label: "Deploy",
    state: "supported",
    reason: "Deployment records are tracked with deployed, failed, and rejected states.",
    evidence: ["src/control-plane/deployment-service.ts"],
  },
  {
    type: "runtime_start",
    label: "Runtime start",
    state: "supported",
    reason: "Runtime instance records expose pending, starting, running, stopping, stopped, failed, and terminated states.",
    evidence: ["src/control-plane/runtime-lifecycle-service.ts"],
  },
  {
    type: "runtime_stop",
    label: "Runtime stop",
    state: "supported",
    reason: "Stopped and terminated runtime states are observed through runtime lifecycle records.",
    evidence: ["src/control-plane/runtime-lifecycle-service.ts"],
  },
  {
    type: "execution_run",
    label: "Execution run",
    state: "supported",
    reason: "Execution runs expose pending, running, completed, failed, and cancelled states.",
    evidence: ["src/control-plane/runtime-lifecycle-service.ts"],
  },
  {
    type: "worker_assignment",
    label: "Worker assignment",
    state: "supported",
    reason: "Worker assignments expose assigned, accepted, running, completed, failed, and cancelled states.",
    evidence: ["src/workers/worker-assignment-service.ts"],
  },
  {
    type: "worker_recovery",
    label: "Worker recovery",
    state: "unsupported",
    reason: "Worker recovery is not exposed as an operation in this milestone.",
    evidence: ["src/workers/worker-registry.ts"],
  },
  {
    type: "evidence_collection",
    label: "Evidence collection",
    state: "unavailable",
    reason: "Evidence records are represented by the operational evidence service; no long-running collection operation is exposed.",
    evidence: ["src/control-plane/operational-evidence-service.ts"],
  },
  {
    type: "economic_reservation",
    label: "Economic reservation",
    state: "unavailable",
    reason: "Economic reservation is represented by economics evidence; no long-running reservation operation is exposed.",
    evidence: ["src/control-plane/neurons-economic-contract.ts"],
  },
];

function iso(timestamp: number | undefined): string {
  return timestamp === undefined ? "unknown" : new Date(timestamp).toISOString();
}

function runtimeOperationState(status: RuntimeInstanceRecord["status"]): OperationState {
  switch (status) {
    case "pending": return "pending";
    case "starting": return "waiting";
    case "running": return "running";
    case "stopping": return "waiting";
    case "stopped": return "succeeded";
    case "failed": return "failed";
    case "terminated": return "cancelled";
    default: return "unknown";
  }
}

function executionOperationState(status: ExecutionRunRecord["status"]): OperationState {
  switch (status) {
    case "pending": return "pending";
    case "running": return "running";
    case "completed": return "succeeded";
    case "failed": return "failed";
    case "cancelled": return "cancelled";
    default: return "unknown";
  }
}

function assignmentOperationState(status: ExecutionAssignment["status"]): OperationState {
  switch (status) {
    case "assigned": return "waiting";
    case "accepted": return "waiting";
    case "running": return "running";
    case "completed": return "succeeded";
    case "failed": return "failed";
    case "cancelled": return "cancelled";
    default: return "unknown";
  }
}

function resultFromOperation(operation: LongRunningOperation): OperationResult {
  const outcome: OperationResult["outcome"] =
    operation.state === "succeeded" ? "succeeded"
      : operation.state === "failed" ? "failed"
        : operation.state === "blocked" ? "blocked"
          : operation.state === "cancelled" ? "cancelled"
            : operation.state === "pending" || operation.state === "running" || operation.state === "waiting" ? "pending"
              : "unknown";
  const failureCategory =
    operation.state === "failed" ? "runtime_unavailable"
      : operation.state === "blocked" ? "readiness_blocker"
        : undefined;
  return {
    id: `result:${operation.id}`,
    operationId: operation.id,
    outcome,
    ...(failureCategory ? { failureCategory } : {}),
    ...(operation.reason ? { failureReason: operation.reason } : {}),
    retryable: operation.retryAvailability === "available",
    recoveryStatus:
      operation.state === "succeeded" ? "not_required"
        : operation.recoveryAvailability === "available" ? "available"
          : operation.recoveryAvailability === "planned" ? "planned"
            : operation.recoveryAvailability === "unsupported" ? "unsupported"
              : "unavailable",
    ...(operation.state === "failed" && operation.recoveryAvailability === "planned"
      ? { nextAction: "Recovery is planned but not automated in this milestone." }
      : {}),
    evidence: operation.evidence,
  };
}

function deploymentOperation(deployment: DeploymentRecord): LongRunningOperation {
  const state: OperationState =
    deployment.status === "deployed" ? "succeeded"
      : deployment.status === "failed" ? "failed"
        : "blocked";
  return {
    id: `deploy:${deployment.deploymentId}`,
    type: "deploy",
    targetEntity: `deployment:${deployment.deploymentId}`,
    state,
    createdAt: deployment.createdAt,
    updatedAt: deployment.createdAt,
    progress: deployment.status === "deployed" ? "complete" : deployment.status === "failed" ? "failed" : "blocked",
    retryAvailability: "unavailable",
    cancellationAvailability: "unsupported",
    recoveryAvailability: "planned",
    evidence: [`deployment:${deployment.deploymentId}:${deployment.status}`],
    runtimeDependency: `target:${deployment.targetId}`,
    workerDependency: "unknown",
    stale: false,
    caveats: deployment.deploymentMode !== "sandbox"
      ? [`Deployment mode ${deployment.deploymentMode} is not a sandbox execution mode.`]
      : ["Sandbox deployment record; production deployment is not claimed."],
    ...(deployment.status === "rejected"
      ? { reason: "Deployment was rejected by governance." }
      : deployment.status === "failed"
        ? { reason: "Deployment failed before a successful runtime start." }
        : {}),
  };
}

function runtimeOperation(runtime: RuntimeInstanceRecord): LongRunningOperation {
  const state = runtimeOperationState(runtime.status);
  return {
    id: `runtime:${runtime.runtimeInstanceId}`,
    type: runtime.status === "stopped" || runtime.status === "terminated" || runtime.status === "failed"
      ? "runtime_stop"
      : "runtime_start",
    targetEntity: `runtime:${runtime.runtimeInstanceId}`,
    state,
    createdAt: runtime.startedAt,
    updatedAt: runtime.updatedAt,
    ...(runtime.stoppedAt ?? runtime.terminatedAt
      ? { completedAt: runtime.stoppedAt ?? runtime.terminatedAt }
      : {}),
    progress: state === "running" ? "running" : state === "succeeded" ? "complete" : state,
    retryAvailability: "unavailable",
    cancellationAvailability: runtime.status === "running" ? "planned" : "unsupported",
    recoveryAvailability: "planned",
    evidence: [`runtime:${runtime.runtimeInstanceId}:${runtime.status}`],
    runtimeDependency: `target:${runtime.targetId}`,
    workerDependency: "unknown",
    stale: false,
    caveats: [
      "Runtime record is a control-plane lifecycle assertion; engine-level runtime observation is not proven.",
    ],
    ...(runtime.status === "failed"
      ? { reason: "Runtime failed before reaching a stable running state." }
      : {}),
  };
}

function executionOperation(run: ExecutionRunRecord): LongRunningOperation {
  const state = executionOperationState(run.status);
  return {
    id: `execution:${run.runId}`,
    type: "execution_run",
    targetEntity: `execution:${run.runId}`,
    state,
    createdAt: run.startedAt,
    updatedAt: run.startedAt,
    ...(run.completedAt !== undefined ? { completedAt: run.completedAt } : {}),
    progress: state === "running" ? "running" : state === "succeeded" ? "complete" : state,
    retryAvailability: "unavailable",
    cancellationAvailability: run.status === "running" ? "planned" : "unsupported",
    recoveryAvailability: "planned",
    evidence: [`execution:${run.runId}:${run.status}`],
    runtimeDependency: `runtime:${run.runtimeInstanceId}`,
    workerDependency: "unknown",
    stale: false,
    caveats: ["Execution run state is a control-plane projection; external execution target observation is not proven."],
    ...(run.status === "failed" ? { reason: "Execution run failed before completion." } : {}),
  };
}

function assignmentOperation(assignment: ExecutionAssignment): LongRunningOperation {
  const state = assignmentOperationState(assignment.status);
  return {
    id: `assignment:${assignment.assignmentId}`,
    type: "worker_assignment",
    targetEntity: `assignment:${assignment.assignmentId}`,
    state,
    createdAt: assignment.assignedAt,
    updatedAt: assignment.assignedAt,
    ...(assignment.result?.completedAt !== undefined
      ? { completedAt: assignment.result.completedAt }
      : assignment.error
        ? { completedAt: assignment.assignedAt }
        : {}),
    retryAvailability: assignment.error?.retryable ? "planned" : "unavailable",
    cancellationAvailability: "unsupported",
    recoveryAvailability: "planned",
    evidence: [
      `assignment:${assignment.assignmentId}:${assignment.status}`,
      ...(assignment.result?.evidenceRefs ?? []),
    ],
    runtimeDependency: `runtime:${assignment.runtimeInstanceId}`,
    workerDependency: `worker:${assignment.workerId}`,
    stale: false,
    caveats: ["Worker assignment state is a control-plane projection; worker heartbeat evidence is reported separately."],
    ...(assignment.error
      ? { reason: `Worker assignment failed with code ${assignment.error.code}.` }
      : {}),
  };
}

function runtimeConfidenceState(status: RuntimeInstanceRecord["status"]): RuntimeConfidenceState {
  switch (status) {
    case "pending": return "starting";
    case "starting": return "starting";
    case "running": return "running";
    case "stopping": return "stopping";
    case "stopped": return "stopped";
    case "failed": return "failed";
    case "terminated": return "stopped";
    default: return "unknown";
  }
}

function runtimeConfidenceItems(
  runtimes: readonly RuntimeInstanceRecord[],
  targets: readonly RegisteredExecutionTarget[],
  checkedAt: string,
): readonly RuntimeConfidenceItem[] {
  const items: RuntimeConfidenceItem[] = runtimes.map((runtime) => {
    const state = runtimeConfidenceState(runtime.status);
    const healthy = state === "running";
    const failed = state === "failed";
    return {
      id: `runtime:${runtime.runtimeInstanceId}`,
      state,
      healthState: healthy ? "healthy" : failed ? "unavailable" : "unknown",
      confidenceLevel: healthy ? "high" : failed ? "low" : "unknown",
      lastObservedTime: iso(runtime.updatedAt),
      sourceOfObservation: "control_plane_assertion",
      sourceEvidence: [`runtime:${runtime.runtimeInstanceId}:${runtime.status}`],
      executionTargetDependency: runtime.targetId,
      stale: false,
      activeOperations: healthy ? 1 : 0,
      failedOperations: failed ? 1 : 0,
      recoveringOperations: 0,
      caveats: ["Runtime confidence is derived from lifecycle records, not from a live engine observation."],
      unsupportedControls: ["runtime orchestration automation", "advanced fleet management", "autoscaling"],
    };
  });

  for (const target of targets) {
    const state: RuntimeConfidenceState =
      target.status === "ready" ? "ready"
        : target.status === "degraded" ? "degraded"
          : target.stale ? "stale"
            : "unavailable";
    const healthy = target.status === "ready" && !target.stale;
    items.push({
      id: `target:${target.canonicalId}`,
      state,
      healthState: target.status === "ready" ? "healthy" : target.status === "degraded" ? "degraded" : "unavailable",
      confidenceLevel: healthy ? "medium" : target.stale ? "none" : "low",
      lastObservedTime: iso(target.lastSeenAt),
      sourceOfObservation: "external_execution_target",
      sourceEvidence: [`target:${target.canonicalId}:${target.status}`],
      executionTargetDependency: target.canonicalId,
      stale: target.stale,
      activeOperations: 0,
      failedOperations: target.status === "unavailable" || target.status === "misconfigured" ? 1 : 0,
      recoveringOperations: 0,
      caveats: ["Target status is an external execution target observation; it is not a runtime orchestration claim."],
      unsupportedControls: ["target provisioning", "target lifecycle mutation", "autoscaling"],
    });
  }

  if (items.length === 0) {
    items.push({
      id: "runtime-observations",
      state: "unavailable",
      healthState: "unknown",
      confidenceLevel: "none",
      lastObservedTime: checkedAt,
      sourceOfObservation: "control_plane_assertion",
      sourceEvidence: ["No runtime or execution target records are available to the Product API projection."],
      executionTargetDependency: "unknown",
      stale: true,
      activeOperations: 0,
      failedOperations: 0,
      recoveringOperations: 0,
      caveats: ["No runtime or execution target data is currently available; confidence cannot be proven."],
      unsupportedControls: ["runtime orchestration automation", "advanced fleet management", "autoscaling"],
    });
  }

  return items;
}

function workerConfidenceItems(
  workers: readonly RegisteredWorker[],
  assignments: readonly ExecutionAssignment[],
  checkedAt: string,
): readonly WorkerConfidenceItem[] {
  if (workers.length === 0) {
    return [{
      id: "worker-registry",
      state: "unavailable",
      workloadState: "unknown",
      assignmentStatus: "none",
      targetDependency: "unknown",
      healthState: "unknown",
      confidenceLevel: "none",
      lastObservedTime: checkedAt,
      stale: true,
      activeWorkload: 0,
      failedWorkload: 0,
      recoverySupport: "unsupported",
      capacitySummary: "0 workers observed",
      caveats: ["No worker records are available; worker confidence cannot be proven."],
      unsupportedOperations: ["worker autoscaling", "fleet management", "worker provisioning"],
    }];
  }

  return workers.map((worker) => {
    const state: WorkerConfidenceState =
      worker.stale ? "stale"
        : worker.status === "available" ? "available"
          : worker.status === "degraded" ? "degraded"
            : worker.status === "unavailable" ? "unavailable"
              : worker.capacity.activeRuns > 0 ? "busy"
                : "idle";
    const workerAssignments = assignments.filter((assignment) => assignment.workerId === worker.identity.id);
    const assignmentStatus = workerAssignments.at(-1)?.status ?? "none";
    return {
      id: `worker:${worker.canonicalId}`,
      state,
      workloadState: worker.capacity.activeRuns > 0 ? "busy" : "idle",
      assignmentStatus,
      targetDependency: worker.targetCompatibility.map((entry) => entry.executionTargetId).join(", ") || "unknown",
      healthState: worker.health.status === "healthy" ? "healthy" : worker.health.status === "degraded" ? "degraded" : "unavailable",
      confidenceLevel: worker.stale || worker.health.status === "unavailable" ? "none" : worker.status === "available" ? "medium" : "low",
      ...(worker.identity.lastHeartbeatAt
        ? { lastHeartbeatAt: iso(worker.identity.lastHeartbeatAt) }
        : {}),
      lastObservedTime: iso(worker.lastSeenAt),
      stale: worker.stale,
      activeWorkload: worker.capacity.activeRuns,
      failedWorkload: workerAssignments.filter((assignment) => assignment.status === "failed").length,
      recoverySupport: "unsupported",
      capacitySummary: `${worker.capacity.activeRuns}/${worker.capacity.maxConcurrentRuns} active slots`,
      caveats: worker.stale
        ? ["Worker is stale; confidence is not current."]
        : ["Worker confidence is a local registry observation; production fleet readiness is not claimed."],
      unsupportedOperations: ["worker autoscaling", "fleet management", "worker provisioning", "worker drain"],
    };
  });
}

function distributedScenarios(
  runtimes: readonly RuntimeInstanceRecord[],
  workers: readonly RegisteredWorker[],
  executionRuns: readonly ExecutionRunRecord[],
  assignments: readonly ExecutionAssignment[],
  targets: readonly RegisteredExecutionTarget[],
): readonly DistributedScenarioResult[] {
  const agentIds = new Set([
    ...executionRuns.map((run) => run.agentId),
  ]);
  const workerIds = new Set(workers.map((worker) => worker.canonicalId));
  const observedExecution = executionRuns.length > 0 || assignments.length > 0;
  const observedAssignments = assignments.length > 0;
  const failedRuns = executionRuns.filter((run) => run.status === "failed").length;
  const failedAssignments = assignments.filter((assignment) => assignment.status === "failed").length;
  const staleWorkers = workers.filter((worker) => worker.stale).length;
  const unavailableWorkers = workers.filter((worker) => worker.status === "unavailable" || worker.status === "degraded").length;
  const failedRuntimes = runtimes.filter((runtime) => runtime.status === "failed").length;
  const unavailableTargets = targets.filter((target) => target.status === "unavailable" || target.stale).length;

  const scenario = (
    id: string,
    label: string,
    status: DistributedScenarioResult["status"],
    reason: string,
    evidence: readonly string[],
  ): DistributedScenarioResult => ({ id, label, status, reason, evidence });

  return [
    scenario(
      "single-agent-single-worker",
      "Single agent / single worker",
      agentIds.size === 1 && workerIds.size === 1
        ? observedExecution ? "supported" : "partial"
        : "unavailable",
      agentIds.size === 1 && workerIds.size === 1
        ? observedExecution
          ? "Single-agent execution with one worker is observable from existing records."
          : "A single agent and worker are present, but no execution evidence is available."
        : "This scenario cannot be proven from current records.",
      [`agents=${agentIds.size}`, `workers=${workerIds.size}`, `executions=${executionRuns.length}`],
    ),
    scenario(
      "multiple-agents-single-worker",
      "Multiple agents / single worker",
      agentIds.size > 1 && workerIds.size === 1
        ? observedExecution ? "supported" : "partial"
        : "unavailable",
      agentIds.size > 1 && workerIds.size === 1
        ? observedExecution
          ? "Multiple agents are observable against one worker."
          : "Multiple agents and one worker exist, but execution evidence is not yet available."
        : "This scenario cannot be proven from current records.",
      [`agents=${agentIds.size}`, `workers=${workerIds.size}`, `executions=${executionRuns.length}`],
    ),
    scenario(
      "single-agent-multiple-workers",
      "Single agent / multiple workers",
      agentIds.size === 1 && workerIds.size > 1
        ? observedAssignments ? "partial" : "unavailable"
        : "unavailable",
      agentIds.size === 1 && workerIds.size > 1
        ? observedAssignments
          ? "A single agent is visible across multiple workers, but multi-worker distribution remains unproven."
          : "Multiple workers exist, but no assignments prove single-agent multi-worker behavior."
        : "This scenario cannot be proven from current records.",
      [`agents=${agentIds.size}`, `workers=${workerIds.size}`, `assignments=${assignments.length}`],
    ),
    scenario(
      "multiple-agents-multiple-workers",
      "Multiple agents / multiple workers",
      agentIds.size > 1 && workerIds.size > 1
        ? observedAssignments ? "partial" : "unavailable"
        : "unavailable",
      agentIds.size > 1 && workerIds.size > 1
        ? observedAssignments
          ? "Multiple agents and workers are observable, but distributed multi-worker recovery is not proven."
          : "Multiple agents and workers exist, but no assignment evidence proves distributed behavior."
        : "This scenario cannot be proven from current records.",
      [`agents=${agentIds.size}`, `workers=${workerIds.size}`, `assignments=${assignments.length}`],
    ),
    scenario(
      "runtime-unavailable",
      "Runtime unavailable",
      runtimes.length === 0 ? "unavailable" : failedRuntimes > 0 ? "partial" : "unavailable",
      runtimes.length === 0
        ? "No runtime records exist, so runtime unavailability cannot be observed."
        : failedRuntimes > 0
          ? "Failed runtime records expose runtime unavailability as a control-plane assertion."
          : "No failed runtime records are available; the unavailable path is not exercised.",
      [`runtimes=${runtimes.length}`, `failed=${failedRuntimes}`],
    ),
    scenario(
      "worker-unavailable",
      "Worker unavailable",
      workers.length === 0 ? "unavailable" : unavailableWorkers > 0 ? "partial" : "unavailable",
      workers.length === 0
        ? "No workers are registered, so worker unavailability cannot be observed."
        : unavailableWorkers > 0
          ? "Registered workers include unavailable or degraded states."
          : "No unavailable worker records exist; the path is not exercised.",
      [`workers=${workers.length}`, `unavailable=${unavailableWorkers}`],
    ),
    scenario(
      "worker-stale",
      "Worker stale",
      workers.length === 0 ? "unavailable" : staleWorkers > 0 ? "partial" : "unavailable",
      workers.length === 0
        ? "No workers are registered, so stale detection cannot be observed."
        : staleWorkers > 0
          ? "Stale worker state is observable through the worker registry."
          : "No stale workers are currently reported.",
      [`workers=${workers.length}`, `stale=${staleWorkers}`],
    ),
    scenario(
      "operation-failed",
      "Operation failed",
      failedRuns > 0 || failedAssignments > 0 || failedRuntimes > 0 ? "partial" : "unavailable",
      failedRuns > 0 || failedAssignments > 0 || failedRuntimes > 0
        ? "Failed execution, assignment, and runtime states are observable from existing records."
        : "No failed operation records are available in the current projection.",
      [`runs=${failedRuns}`, `assignments=${failedAssignments}`, `runtimes=${failedRuntimes}`],
    ),
    scenario(
      "operation-recovering",
      "Operation recovering",
      "unsupported",
      "Recovery is planned but no long-running recovery operation is exposed in this milestone.",
      ["Recovery semantics are projected, not automated."],
    ),
    scenario(
      "external-target-unavailable",
      "External target unavailable",
      targets.length === 0 ? "unavailable" : unavailableTargets > 0 ? "partial" : "unavailable",
      targets.length === 0
        ? "No execution targets are registered, so external target unavailability cannot be observed."
        : unavailableTargets > 0
          ? "Unavailable or stale execution targets are observable."
          : "No unavailable target records exist; the path is not exercised.",
      [`targets=${targets.length}`, `unavailable=${unavailableTargets}`],
    ),
  ];
}

function recoverySemantics(auditAvailable: boolean): readonly RecoverySemanticsItem[] {
  return [
    {
      id: "retry",
      label: "Retry availability",
      state: "planned",
      reason: "Retry availability is explicit for failed assignments, but no retry engine is implemented in this milestone.",
      evidence: ["src/workers/worker-types.ts", "src/workers/worker-assignment-service.ts"],
    },
    {
      id: "cancellation",
      label: "Cancellation availability",
      state: "unsupported",
      reason: "Cancellation status is observable, but no cancellation operation is exposed by this surface.",
      evidence: ["src/control-plane/runtime-lifecycle-service.ts"],
    },
    {
      id: "recovery",
      label: "Recovery automation",
      state: "planned",
      reason: "Recovery is planned for future milestones; visibility does not prove recovery automation.",
      evidence: ["docs/epics/epic-12/EPIC-12_Executive_Plan.md"],
    },
    {
      id: "stale-detection",
      label: "Stale detection",
      state: auditAvailable ? "available" : "partial",
      reason: auditAvailable
        ? "Stale worker and target state is tracked by registries and can be correlated with audit evidence."
        : "Stale state is tracked by registries, but audit correlation is not currently available.",
      evidence: ["src/workers/worker-registry.ts", "src/targets/execution-target-registry.ts"],
    },
    {
      id: "evidence-linkage",
      label: "Evidence linkage",
      state: auditAvailable ? "available" : "unavailable",
      reason: auditAvailable
        ? "Operation evidence references and audit events can be correlated when both exist."
        : "No audit service is configured in this projection; evidence correlation is unavailable.",
      evidence: ["src/control-plane/audit-service.ts", "src/control-plane/operational-evidence-service.ts"],
    },
  ];
}

export function createOperationalReliabilityReport(
  input: OperationalReliabilitySignals = {},
): OperationalReliabilityReport {
  const checkedAt = new Date().toISOString();
  const deployments = input.deployments ?? [];
  const runtimes = input.runtimes ?? [];
  const executionRuns = input.executionRuns ?? [];
  const workers = input.workers ?? [];
  const assignments = input.assignments ?? [];
  const targets = input.targets ?? [];
  const auditAvailable = input.auditAvailable ?? false;

  const operations: LongRunningOperation[] = [
    ...deployments.map(deploymentOperation),
    ...runtimes.map(runtimeOperation),
    ...executionRuns.map(executionOperation),
    ...assignments.map(assignmentOperation),
  ];

  const operationStateModel = OPERATION_TYPES.map((entry) => ({
    type: entry.type,
    label: entry.label,
    state: entry.state,
    reason: entry.reason,
    evidence: entry.evidence,
  }));

  const unsupportedCount = operationStateModel.filter((entry) => entry.state === "unsupported").length;
  const unavailableCount = operationStateModel.filter((entry) => entry.state === "unavailable").length;

  const summary = {
    operationsTracked: operations.length + unsupportedCount + unavailableCount,
    running: operations.filter((operation) => operation.state === "running").length,
    succeeded: operations.filter((operation) => operation.state === "succeeded").length,
    failed: operations.filter((operation) => operation.state === "failed").length,
    blocked: operations.filter((operation) => operation.state === "blocked").length,
    stale: operations.filter((operation) => operation.stale).length,
    recovering: operations.filter((operation) => operation.state === "recovering" || operation.state === "retrying").length,
    unsupported: unsupportedCount,
    unavailable: unavailableCount,
  };

  const runtimeConfidence = runtimeConfidenceItems(runtimes, targets, checkedAt);
  const workerConfidence = workerConfidenceItems(workers, assignments, checkedAt);
  const scenarios = distributedScenarios(runtimes, workers, executionRuns, assignments, targets);
  const semantics = recoverySemantics(auditAvailable);

  const blockers: ReliabilityFinding[] = [
    {
      code: "OPR-RECOVERY-AUTOMATION",
      severity: "high",
      message: "Recovery is planned but not automated in this milestone.",
      responsibleDomain: "operational-reliability",
      dependsOnFutureMilestone: "M04/M05",
      evidence: "src/control-plane/operational-reliability.ts",
    },
    {
      code: "OPR-DISTRIBUTED-RECOVERY",
      severity: "high",
      message: "Distributed multi-worker recovery is not proven by current records.",
      responsibleDomain: "runtime-worker-confidence",
      dependsOnFutureMilestone: "M04/M05",
      evidence: "src/workers/worker-assignment-service.ts",
    },
    {
      code: "OPR-RUNTIME-OBSERVATION",
      severity: "high",
      message: "Runtime confidence is derived from control-plane lifecycle records, not live engine observation.",
      responsibleDomain: "runtime-confidence",
      dependsOnFutureMilestone: "M05",
      evidence: "src/control-plane/runtime-lifecycle-service.ts",
    },
  ];

  const warnings: ReliabilityFinding[] = [];
  if (runtimes.length === 0) {
    warnings.push({
      code: "OPR-NO-RUNTIME-RECORDS",
      severity: "medium",
      message: "No runtime records are available to the Product API projection.",
      responsibleDomain: "runtime-confidence",
      evidence: "src/control-plane/runtime-lifecycle-service.ts",
    });
  }
  if (workers.length === 0) {
    warnings.push({
      code: "OPR-NO-WORKER-RECORDS",
      severity: "medium",
      message: "No worker records are available to the Product API projection.",
      responsibleDomain: "worker-confidence",
      evidence: "src/workers/worker-registry.ts",
    });
  }
  if (targets.length === 0) {
    warnings.push({
      code: "OPR-NO-TARGET-RECORDS",
      severity: "medium",
      message: "No execution target records are available to the Product API projection.",
      responsibleDomain: "external-execution-target",
      evidence: "src/targets/execution-target-service.ts",
    });
  }
  if (operations.length === 0) {
    warnings.push({
      code: "OPR-NO-OPERATION-RECORDS",
      severity: "medium",
      message: "No long-running operation records are available; unsupported and unavailable states are projected explicitly.",
      responsibleDomain: "operational-reliability",
      evidence: "src/control-plane/operational-reliability.ts",
    });
  }

  const caveats: ReliabilityFinding[] = [
    {
      code: "OPR-SANDBOX-EVIDENCE",
      severity: "informational",
      message: "Runtime and worker evidence is local/sandbox; multi-worker distributed success is not claimed.",
      responsibleDomain: "operational-reliability",
      evidence: "src/control-plane/operational-reliability.ts",
    },
    {
      code: "OPR-RECOVERY-VISIBILITY",
      severity: "informational",
      message: "Recovery visibility does not prove recovery automation.",
      responsibleDomain: "operational-reliability",
      dependsOnFutureMilestone: "M04/M05",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OPR-BROWSER-CAVEAT",
      severity: "informational",
      message: "Browser visual acceptance remains pending for M03 and the S04 harness is BLOCKED_BY_ENVIRONMENT.",
      responsibleDomain: "browser-acceptance",
      dependsOnFutureMilestone: "M03",
      evidence: "tests/s31-browser-acceptance-harness.test.mjs",
    },
    {
      code: "OPR-TRUTH-LAYERS",
      severity: "informational",
      message: "Control-plane assertion, runtime observation, and external execution target state are reported separately.",
      responsibleDomain: "operational-reliability",
      evidence: "src/control-plane/operational-reliability.ts",
    },
  ];

  const deferredItems: ReliabilityFinding[] = [
    {
      code: "OPR-DEFER-AUTOSCALING",
      severity: "medium",
      message: "Worker autoscaling is deferred beyond EPIC-12.",
      responsibleDomain: "worker-confidence",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OPR-DEFER-FLEET-MANAGEMENT",
      severity: "medium",
      message: "Advanced worker fleet management is deferred beyond EPIC-12.",
      responsibleDomain: "worker-confidence",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OPR-DEFER-RETRY-CANCEL",
      severity: "medium",
      message: "Real retry and cancellation engines are deferred unless already supported by the runtime contract.",
      responsibleDomain: "operation-recovery",
      dependsOnFutureMilestone: "M04/M05",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OPR-DEFER-ORCHESTRATION",
      severity: "medium",
      message: "Runtime orchestration rewrite and scheduler rewrite are deferred.",
      responsibleDomain: "runtime-confidence",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OPR-DEFER-TRACING-INCIDENT-SLO",
      severity: "medium",
      message: "Distributed tracing backend, incident platform, and SLO/SLA management are deferred.",
      responsibleDomain: "observability",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
  ];

  const distributedStatus = scenarios.some((scenario) => scenario.status === "supported")
    ? "supported"
    : scenarios.some((scenario) => scenario.status === "partial")
      ? "partial"
      : scenarios.some((scenario) => scenario.status === "unavailable")
        ? "unavailable"
        : "deferred";

  return {
    checkedAt,
    operationalReliabilityReady: false,
    productionReady: false,
    claim: "not_claimed",
    summary,
    operationStateModel,
    longRunningOperations: operations,
    operationResults: operations.map(resultFromOperation),
    runtimeConfidence,
    workerConfidence,
    distributedOperations: {
      status: distributedStatus,
      scenarios,
      caveats: [
        "Multi-worker distributed success is not claimed without real multi-agent/worker assignment evidence.",
        "External target failure simulation remains deferred; unavailable states are reported from observed records.",
      ],
    },
    recoverySemantics: semantics,
    blockers,
    warnings,
    caveats,
    deferredItems,
    readinessGateDependencies: ["G06", "G07", "G08", "G09", "G13"],
    sourceEvidence: [
      "src/control-plane/operational-reliability.ts",
      "src/control-plane/product-api-client.ts",
      "src/control-plane/deployment-service.ts",
      "src/control-plane/runtime-lifecycle-service.ts",
      "src/workers/worker-registry.ts",
      "src/workers/worker-assignment-service.ts",
      "src/targets/execution-target-service.ts",
      "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
      "docs/epics/epic-12/milestones/M04-operational-reliability-and-visibility.md",
      "tests/s32-operational-reliability.test.mjs",
    ],
    claimDiscipline: {
      productionReadyClaimAllowed: false,
      operationalReliabilityReadyClaimAllowed: false,
      reason: "Operational reliability is evidence-bounded and not overclaimed until runtime, worker, recovery, and distributed operation gates are proven.",
    },
  };
}
