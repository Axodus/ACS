import { ExecutionWorkerRegistry, RegisteredWorker } from "./worker-registry.js";
import {
  ExecutionAssignment,
  WorkerEligibilityRequirements,
  WorkerEligibilityDecision,
  WorkerDispatchLease,
  WorkerExecutionResult,
  WorkerExecutionError,
  WorkerIneligibleError,
  WorkerAssignmentError,
  WorkerLeaseError,
  WorkerLeaseExpiredError,
  WorkerLeaseReplayError,
} from "./worker-types.js";
import type { ExecutionPlan } from "../control-plane/unified-agent-model.js";
import { createHash } from "node:crypto";

export interface AssignmentContext {
  readonly assignmentId: string;
  readonly executionPlan: ExecutionPlan;
  readonly deploymentId: string;
  readonly runtimeInstanceId: string;
  readonly correlationId: string;
  readonly assignedAt: number;
}

export interface WorkerAssignmentServiceOptions {
  readonly workerRegistry: ExecutionWorkerRegistry;
  readonly leaseSigningKey?: string;
  readonly defaultLeaseTtlMs?: number;
}

export class WorkerAssignmentService {
  readonly #workerRegistry: ExecutionWorkerRegistry;
  readonly #assignments = new Map<string, ExecutionAssignment>();
  readonly #leases = new Map<string, WorkerDispatchLease>();
  readonly #leaseSigningKey: string;
  readonly #defaultLeaseTtlMs: number;

  constructor(options: WorkerAssignmentServiceOptions) {
    this.#workerRegistry = options.workerRegistry;
    this.#leaseSigningKey = options.leaseSigningKey ?? "dev-lease-signing-key";
    this.#defaultLeaseTtlMs = options.defaultLeaseTtlMs ?? 5 * 60 * 1000; // 5 minutes
  }

  evaluateEligibility(requirements: WorkerEligibilityRequirements): readonly WorkerEligibilityDecision[] {
    return this.#workerRegistry.list().map((worker) =>
      this.#workerRegistry.evaluateEligibility(worker, requirements)
    );
  }

  findEligibleWorker(requirements: WorkerEligibilityRequirements): RegisteredWorker | undefined {
    const eligible = this.#workerRegistry.findEligible(requirements);
    if (eligible.length === 0) return undefined;

    // Sort by available slots (most available first) then by last heartbeat (most recent first)
    return [...eligible].sort((a, b) => {
      if (b.capacity.availableSlots !== a.capacity.availableSlots) {
        return b.capacity.availableSlots - a.capacity.availableSlots;
      }
      return (b.identity.lastHeartbeatAt ?? 0) - (a.identity.lastHeartbeatAt ?? 0);
    })[0];
  }

  async assignWorker(requirements: WorkerEligibilityRequirements, context: AssignmentContext): Promise<ExecutionAssignment> {
    const worker = this.findEligibleWorker(requirements);
    if (!worker) {
      const decisions = this.evaluateEligibility(requirements);
      const allReasons = decisions.flatMap((d) => d.reasons);
      throw new WorkerIneligibleError(requirements.targetId ?? "unknown", allReasons);
    }

    // Reserve capacity
    this.#workerRegistry.assignRun(worker.identity.id);

    let assignment: ExecutionAssignment = {
      assignmentId: context.assignmentId,
      workerId: worker.identity.id,
      executionPlanId: context.executionPlan.planId,
      deploymentId: context.deploymentId,
      runtimeInstanceId: context.runtimeInstanceId,
      correlationId: context.correlationId,
      assignedAt: context.assignedAt,
      status: "assigned",
    };

    // Create dispatch lease
    const lease = this.createLease(assignment, context.executionPlan);
    assignment = {
      ...assignment,
      leaseId: lease.leaseId,
      planFingerprint: lease.planFingerprint,
    };
    this.#assignments.set(assignment.assignmentId, assignment);
    this.#leases.set(lease.leaseId, lease);

    return assignment;
  }

  acceptAssignment(assignmentId: string): ExecutionAssignment {
    const assignment = this.#assignments.get(assignmentId);
    if (!assignment) {
      throw new WorkerAssignmentError(`Assignment not found: ${assignmentId}`, { assignmentId });
    }

    const updated: ExecutionAssignment = {
      ...assignment,
      status: "accepted",
    };

    this.#assignments.set(assignmentId, updated);
    return updated;
  }

  startAssignment(assignmentId: string): ExecutionAssignment {
    const assignment = this.#assignments.get(assignmentId);
    if (!assignment) {
      throw new WorkerAssignmentError(`Assignment not found: ${assignmentId}`, { assignmentId });
    }

    if (assignment.status !== "accepted" && assignment.status !== "assigned") {
      throw new WorkerAssignmentError(`Cannot start assignment in status: ${assignment.status}`, { assignmentId, status: assignment.status });
    }

    const updated: ExecutionAssignment = {
      ...assignment,
      status: "running",
    };

    this.#assignments.set(assignmentId, updated);
    return updated;
  }

  completeAssignment(assignmentId: string, result: WorkerExecutionResult): ExecutionAssignment {
    const assignment = this.#assignments.get(assignmentId);
    if (!assignment) {
      throw new WorkerAssignmentError(`Assignment not found: ${assignmentId}`, { assignmentId });
    }

    // Release capacity
    this.#workerRegistry.releaseRun(assignment.workerId);

    const updated: ExecutionAssignment = {
      ...assignment,
      status: "completed",
      result,
    };

    this.#assignments.set(assignmentId, updated);
    return updated;
  }

  failAssignment(assignmentId: string, error: WorkerExecutionError): ExecutionAssignment {
    const assignment = this.#assignments.get(assignmentId);
    if (!assignment) {
      throw new WorkerAssignmentError(`Assignment not found: ${assignmentId}`, { assignmentId });
    }

    // Release capacity
    this.#workerRegistry.releaseRun(assignment.workerId);

    const updated: ExecutionAssignment = {
      ...assignment,
      status: "failed",
      error,
    };

    this.#assignments.set(assignmentId, updated);
    return updated;
  }

  cancelAssignment(assignmentId: string): ExecutionAssignment {
    const assignment = this.#assignments.get(assignmentId);
    if (!assignment) {
      throw new WorkerAssignmentError(`Assignment not found: ${assignmentId}`, { assignmentId });
    }

    // Release capacity
    this.#workerRegistry.releaseRun(assignment.workerId);

    const updated: ExecutionAssignment = {
      ...assignment,
      status: "cancelled",
    };

    this.#assignments.set(assignmentId, updated);
    return updated;
  }

  getAssignment(assignmentId: string): ExecutionAssignment | undefined {
    return this.#assignments.get(assignmentId);
  }

  listAssignments(): readonly ExecutionAssignment[] {
    return [...this.#assignments.values()].sort((a, b) => a.assignedAt - b.assignedAt);
  }

  createLease(assignment: ExecutionAssignment, executionPlan: ExecutionPlan): WorkerDispatchLease {
    const leaseId = `lease_${assignment.assignmentId}_${Date.now()}`;
    const expiresAt = Date.now() + this.#defaultLeaseTtlMs;
    const planFingerprint = this.computePlanFingerprint(executionPlan);
    const signature = this.signLease(leaseId, assignment.assignmentId, assignment.workerId, planFingerprint, expiresAt);

    const lease: WorkerDispatchLease = {
      leaseId,
      assignmentId: assignment.assignmentId,
      workerId: assignment.workerId,
      planFingerprint,
      expiresAt,
      signature,
    };

    return lease;
  }

  validateLease(leaseId: string, assignmentId: string, workerId: string, executionPlan: ExecutionPlan): WorkerDispatchLease {
    const lease = this.#leases.get(leaseId);
    if (!lease) {
      throw new WorkerLeaseError(`Lease not found: ${leaseId}`, { leaseId });
    }

    if (lease.assignmentId !== assignmentId) {
      throw new WorkerLeaseError(`Lease assignment mismatch`, { leaseId, expectedAssignmentId: assignmentId, actualAssignmentId: lease.assignmentId });
    }

    if (lease.workerId !== workerId) {
      throw new WorkerLeaseError(`Lease worker mismatch`, { leaseId, expectedWorkerId: workerId, actualWorkerId: lease.workerId });
    }

    if (Date.now() > lease.expiresAt) {
      throw new WorkerLeaseExpiredError(leaseId);
    }

    const expectedSignature = this.signLease(leaseId, assignmentId, workerId, lease.planFingerprint, lease.expiresAt);
    if (lease.signature !== expectedSignature) {
      throw new WorkerLeaseReplayError(leaseId);
    }

    const planFingerprint = this.computePlanFingerprint(executionPlan);
    if (planFingerprint !== lease.planFingerprint) {
      throw new WorkerLeaseError(`Lease plan fingerprint mismatch`, { leaseId, expected: planFingerprint, actual: lease.planFingerprint });
    }

    return lease;
  }

  revokeLease(leaseId: string): void {
    this.#leases.delete(leaseId);
  }

  private computePlanFingerprint(plan: ExecutionPlan): string {
    const components = [
      plan.planId,
      plan.agentId,
      String(plan.agentRevision),
      plan.compositionFingerprint,
      plan.engineId,
      plan.engineRevision ?? "",
      plan.executionTargetId,
      plan.runnerId ?? "",
      plan.providerId ?? "",
      plan.modelId ?? "",
      plan.credentialConnectionId ?? "",
      plan.governancePolicyId ?? "",
      plan.economicPolicyId ?? "",
      plan.isolationMode ?? "",
      plan.deploymentMode,
      plan.correlationId,
    ].join("|");

    return `fp_${createHash("sha256").update(components).digest("hex").slice(0, 24)}`;
  }

  private signLease(leaseId: string, assignmentId: string, workerId: string, planFingerprint: string, expiresAt: number): string {
    const payload = `${leaseId}|${assignmentId}|${workerId}|${planFingerprint}|${expiresAt}|${this.#leaseSigningKey}`;
    return `sig_${createHash("sha256").update(payload).digest("hex").slice(0, 24)}`;
  }
}
