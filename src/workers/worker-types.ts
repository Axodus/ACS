/**
 * Execution Worker domain types and interfaces.
 * 
 * Workers are execution boundaries responsible for carrying out
 * already-governed assignments. They do not make governance decisions.
 */

export type WorkerStatus =
  | "registered"
  | "available"
  | "unavailable"
  | "degraded"
  | "stale";

export type WorkerHealthStatus =
  | "healthy"
  | "degraded"
  | "unavailable";

export interface WorkerIdentity {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly registeredAt: number;
  readonly lastHeartbeatAt: number | null;
}

export interface WorkerCapability {
  readonly engineId: string;
  readonly engineRevision?: string;
  readonly supportedRunners: readonly string[];
  readonly supportedProviders: readonly string[];
  readonly supportedIsolationModes: readonly string[];
  readonly supportedDeploymentModes: readonly string[];
  readonly maxConcurrentRuns: number;
}

export interface WorkerTargetCompatibility {
  readonly executionTargetId: string;
  readonly executionTargetType: "local" | "cloud-worker" | "remote";
  readonly engineId: string;
  readonly healthStatus: WorkerHealthStatus;
  readonly observedAt: number;
}

export interface WorkerHealth {
  readonly status: WorkerHealthStatus;
  readonly observedAt: number;
  readonly checks: readonly WorkerHealthCheck[];
  readonly findings: readonly WorkerHealthFinding[];
}

export interface WorkerHealthCheck {
  readonly name: string;
  readonly status: "pass" | "warning" | "fail";
  readonly message: string;
}

export interface WorkerHealthFinding {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

export interface WorkerCapacity {
  readonly maxConcurrentRuns: number;
  readonly activeRuns: number;
  readonly availableSlots: number;
}

export interface ExecutionWorker {
  readonly identity: WorkerIdentity;
  readonly status: WorkerStatus;
  readonly capabilities: WorkerCapability;
  readonly targetCompatibility: readonly WorkerTargetCompatibility[];
  readonly health: WorkerHealth;
  readonly capacity: WorkerCapacity;
}

export interface WorkerRegistrationInput {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly engineId: string;
  readonly engineRevision?: string;
  readonly supportedRunners: readonly string[];
  readonly supportedProviders: readonly string[];
  readonly supportedIsolationModes: readonly string[];
  readonly supportedDeploymentModes: readonly string[];
  readonly maxConcurrentRuns: number;
  readonly targetCompatibility: readonly WorkerTargetCompatibility[];
}

export interface WorkerHeartbeatInput {
  readonly workerId: string;
  readonly status: WorkerStatus;
  readonly health: WorkerHealth;
  readonly capacity: WorkerCapacity;
  readonly capabilities?: WorkerCapability;
  readonly targetCompatibility?: readonly WorkerTargetCompatibility[];
}

export interface ExecutionAssignment {
  readonly assignmentId: string;
  readonly workerId: string;
  readonly executionPlanId: string;
  readonly deploymentId: string;
  readonly runtimeInstanceId: string;
  readonly correlationId: string;
  readonly assignedAt: number;
  readonly status: "assigned" | "accepted" | "running" | "completed" | "failed" | "cancelled";
  readonly leaseId?: string;
  readonly planFingerprint?: string;
  readonly result?: WorkerExecutionResult;
  readonly error?: WorkerExecutionError;
}

export interface WorkerExecutionResult {
  readonly status: "success";
  readonly output: Record<string, unknown>;
  readonly evidenceRefs: readonly string[];
  readonly usageRecords: readonly WorkerUsageRecord[];
  readonly completedAt: number;
}

export interface WorkerExecutionError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
}

export interface WorkerUsageRecord {
  readonly dimension: string;
  readonly quantity: bigint;
  readonly unit: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly source: "worker" | "engine" | "runner" | "provider";
  readonly confidence: "estimated" | "final";
}

export interface WorkerEligibilityRequirements {
  readonly engineId?: string;
  readonly engineRevision?: string;
  readonly requiredRunners?: readonly string[];
  readonly requiredProviders?: readonly string[];
  readonly requiredIsolationMode?: string;
  readonly requiredDeploymentMode?: string;
  readonly minAvailableSlots?: number;
  readonly targetId?: string;
}

export interface WorkerEligibilityDecision {
  readonly eligible: boolean;
  readonly workerId: string;
  readonly reasons: readonly WorkerEligibilityReason[];
}

export interface WorkerEligibilityReason {
  readonly code: string;
  readonly message: string;
}

export interface WorkerDispatchLease {
  readonly leaseId: string;
  readonly assignmentId: string;
  readonly workerId: string;
  readonly planFingerprint: string;
  readonly expiresAt: number;
  readonly signature: string;
}

export class WorkerError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "WorkerError";
  }
}

export class WorkerNotFoundError extends WorkerError {
  constructor(workerId: string) {
    super(`Worker not found: ${workerId}`, "WORKER_NOT_FOUND", { workerId });
    this.name = "WorkerNotFoundError";
  }
}

export class WorkerRegistrationError extends WorkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "WORKER_REGISTRATION_FAILED", details);
    this.name = "WorkerRegistrationError";
  }
}

export class WorkerDuplicateError extends WorkerError {
  constructor(workerId: string) {
    super(`Worker already registered: ${workerId}`, "WORKER_DUPLICATE", { workerId });
    this.name = "WorkerDuplicateError";
  }
}

export class WorkerUnavailableError extends WorkerError {
  constructor(workerId: string, reason: string) {
    super(`Worker unavailable: ${workerId} - ${reason}`, "WORKER_UNAVAILABLE", { workerId, reason });
    this.name = "WorkerUnavailableError";
  }
}

export class WorkerIneligibleError extends WorkerError {
  constructor(workerId: string, reasons: readonly WorkerEligibilityReason[]) {
    super(
      `Worker ineligible: ${workerId} - ${reasons.map(r => r.message).join("; ")}`,
      "WORKER_INELIGIBLE",
      { workerId, reasons }
    );
    this.name = "WorkerIneligibleError";
  }
}

export class WorkerAssignmentError extends WorkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "WORKER_ASSIGNMENT_FAILED", details);
    this.name = "WorkerAssignmentError";
  }
}

export class WorkerExecutionFailedError extends WorkerError {
  constructor(assignmentId: string, error: WorkerExecutionError) {
    super(
      `Worker execution failed: ${assignmentId} - ${error.message}`,
      "WORKER_EXECUTION_FAILED",
      { assignmentId, ...error }
    );
    this.name = "WorkerExecutionFailedError";
  }
}

export class WorkerLeaseError extends WorkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "WORKER_LEASE_FAILED", details);
    this.name = "WorkerLeaseError";
  }
}

export class WorkerLeaseExpiredError extends WorkerLeaseError {
  constructor(leaseId: string) {
    super(`Lease expired: ${leaseId}`, { leaseId });
    this.name = "WorkerLeaseExpiredError";
  }
}

export class WorkerLeaseReplayError extends WorkerLeaseError {
  constructor(leaseId: string) {
    super(`Lease replay detected: ${leaseId}`, { leaseId });
    this.name = "WorkerLeaseReplayError";
  }
}
