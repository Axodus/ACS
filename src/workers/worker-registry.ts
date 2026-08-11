import {
  ExecutionWorker,
  WorkerRegistrationInput,
  WorkerHeartbeatInput,
  WorkerEligibilityRequirements,
  WorkerEligibilityDecision,
  WorkerEligibilityReason,
  WorkerNotFoundError,
  WorkerDuplicateError,
  WorkerUnavailableError,
  WorkerIneligibleError,
  WorkerError,
} from "./worker-types.js";

export interface RegisteredWorker extends ExecutionWorker {
  readonly canonicalId: string;
  readonly discoveredAt: number;
  readonly lastSeenAt: number;
  readonly refreshedAt: number;
  readonly stale: boolean;
}

export class ExecutionWorkerRegistry {
  readonly #workers = new Map<string, RegisteredWorker>();

  static canonicalId(workerId: string): string {
    return workerId;
  }

  register(input: WorkerRegistrationInput, discoveredAt = Date.now()): RegisteredWorker {
    const canonicalId = ExecutionWorkerRegistry.canonicalId(input.id);
    if (this.#workers.has(canonicalId)) {
      throw new WorkerDuplicateError(input.id);
    }

    const identity = {
      id: input.id,
      name: input.name,
      version: input.version,
      registeredAt: discoveredAt,
      lastHeartbeatAt: null,
    };

    const capabilities = {
      engineId: input.engineId,
      ...(input.engineRevision !== undefined ? { engineRevision: input.engineRevision } : {}),
      supportedRunners: input.supportedRunners,
      supportedProviders: input.supportedProviders,
      supportedIsolationModes: input.supportedIsolationModes,
      supportedDeploymentModes: input.supportedDeploymentModes,
      maxConcurrentRuns: input.maxConcurrentRuns,
    };

    const record: RegisteredWorker = {
      identity,
      status: "registered",
      capabilities,
      targetCompatibility: input.targetCompatibility,
      health: {
        status: "unavailable",
        observedAt: discoveredAt,
        checks: [],
        findings: [{ code: "NO_HEARTBEAT", severity: "warning", message: "Worker has not sent a heartbeat yet" }],
      },
      capacity: {
        maxConcurrentRuns: input.maxConcurrentRuns,
        activeRuns: 0,
        availableSlots: input.maxConcurrentRuns,
      },
      canonicalId,
      discoveredAt,
      lastSeenAt: discoveredAt,
      refreshedAt: discoveredAt,
      stale: false,
    };

    this.#workers.set(canonicalId, record);
    return record;
  }

  upsert(input: WorkerRegistrationInput, discoveredAt = Date.now()): RegisteredWorker {
    const canonicalId = ExecutionWorkerRegistry.canonicalId(input.id);
    const existing = this.#workers.get(canonicalId);

    const identity = {
      id: input.id,
      name: input.name,
      version: input.version,
      registeredAt: existing?.identity.registeredAt ?? discoveredAt,
      lastHeartbeatAt: existing?.identity.lastHeartbeatAt ?? null,
    };

    const capabilities = {
      engineId: input.engineId,
      ...(input.engineRevision !== undefined ? { engineRevision: input.engineRevision } : {}),
      supportedRunners: input.supportedRunners,
      supportedProviders: input.supportedProviders,
      supportedIsolationModes: input.supportedIsolationModes,
      supportedDeploymentModes: input.supportedDeploymentModes,
      maxConcurrentRuns: input.maxConcurrentRuns,
    };

    const record: RegisteredWorker = {
      identity,
      status: existing?.status ?? "registered",
      capabilities,
      targetCompatibility: input.targetCompatibility,
      health: existing?.health ?? {
        status: "unavailable",
        observedAt: discoveredAt,
        checks: [],
        findings: [{ code: "NO_HEARTBEAT", severity: "warning", message: "Worker has not sent a heartbeat yet" }],
      },
      capacity: existing?.capacity ?? {
        maxConcurrentRuns: input.maxConcurrentRuns,
        activeRuns: 0,
        availableSlots: input.maxConcurrentRuns,
      },
      canonicalId,
      discoveredAt: existing?.discoveredAt ?? discoveredAt,
      lastSeenAt: discoveredAt,
      refreshedAt: discoveredAt,
      stale: false,
    };

    this.#workers.set(canonicalId, record);
    return record;
  }

  receiveHeartbeat(input: WorkerHeartbeatInput, receivedAt = Date.now()): RegisteredWorker {
    const canonicalId = ExecutionWorkerRegistry.canonicalId(input.workerId);
    const existing = this.#workers.get(canonicalId);
    if (!existing) {
      throw new WorkerNotFoundError(input.workerId);
    }

    const updated: RegisteredWorker = {
      ...existing,
      identity: {
        ...existing.identity,
        lastHeartbeatAt: receivedAt,
      },
      status: input.status,
      health: input.health,
      capacity: input.capacity,
      ...(input.capabilities ? { capabilities: input.capabilities } : {}),
      ...(input.targetCompatibility ? { targetCompatibility: input.targetCompatibility } : {}),
      lastSeenAt: receivedAt,
      refreshedAt: receivedAt,
      stale: false,
    };

    this.#workers.set(canonicalId, updated);
    return updated;
  }

  markStale(workerId: string, refreshedAt = Date.now()): RegisteredWorker {
    const canonicalId = ExecutionWorkerRegistry.canonicalId(workerId);
    const existing = this.#workers.get(canonicalId);
    if (!existing) {
      throw new WorkerNotFoundError(workerId);
    }

    const updated: RegisteredWorker = {
      ...existing,
      status: "stale",
      health: {
        ...existing.health,
        status: "unavailable",
        observedAt: refreshedAt,
        findings: [...existing.health.findings, { code: "STALE", severity: "error", message: "Worker heartbeat expired" }],
      },
      refreshedAt,
      stale: true,
    };

    this.#workers.set(canonicalId, updated);
    return updated;
  }

  get(canonicalId: string): RegisteredWorker {
    const worker = this.#workers.get(canonicalId);
    if (!worker) {
      throw new WorkerNotFoundError(canonicalId);
    }
    return worker;
  }

  list(): readonly RegisteredWorker[] {
    return [...this.#workers.values()].sort((left, right) => left.canonicalId.localeCompare(right.canonicalId));
  }

  listByEngine(engineId: string): readonly RegisteredWorker[] {
    return this.list().filter((worker) => worker.capabilities.engineId === engineId);
  }

  evaluateEligibility(worker: RegisteredWorker, requirements: WorkerEligibilityRequirements): WorkerEligibilityDecision {
    const reasons: WorkerEligibilityReason[] = [];

    // Status check
    if (worker.status !== "available") {
      reasons.push({ code: "WORKER_STATUS_UNAVAILABLE", message: `Worker status is ${worker.status}, not available` });
    }

    // Stale check
    if (worker.stale) {
      reasons.push({ code: "WORKER_STALE", message: "Worker information is stale" });
    }

    // Health check
    if (worker.health.status !== "healthy") {
      reasons.push({ code: "WORKER_HEALTH_DEGRADED", message: `Worker health is ${worker.health.status}` });
    }

    // Engine match
    if (requirements.engineId && worker.capabilities.engineId !== requirements.engineId) {
      reasons.push({ code: "WORKER_ENGINE_MISMATCH", message: `Worker engine ${worker.capabilities.engineId} does not match required engine ${requirements.engineId}` });
    }

    // Engine revision match
    if (requirements.engineRevision && worker.capabilities.engineRevision !== requirements.engineRevision) {
      reasons.push({ code: "WORKER_ENGINE_REVISION_MISMATCH", message: `Worker engine revision ${worker.capabilities.engineRevision} does not match required revision ${requirements.engineRevision}` });
    }

    // Required runners
    if (requirements.requiredRunners) {
      for (const runner of requirements.requiredRunners) {
        if (!worker.capabilities.supportedRunners.includes(runner)) {
          reasons.push({ code: "WORKER_RUNNER_MISSING", message: `Worker is missing required runner ${runner}` });
        }
      }
    }

    // Required providers
    if (requirements.requiredProviders) {
      for (const provider of requirements.requiredProviders) {
        if (!worker.capabilities.supportedProviders.includes(provider)) {
          reasons.push({ code: "WORKER_PROVIDER_MISSING", message: `Worker is missing required provider ${provider}` });
        }
      }
    }

    // Required isolation mode
    if (requirements.requiredIsolationMode && !worker.capabilities.supportedIsolationModes.includes(requirements.requiredIsolationMode)) {
      reasons.push({ code: "WORKER_ISOLATION_MODE_UNSUPPORTED", message: `Worker does not support isolation mode ${requirements.requiredIsolationMode}` });
    }

    // Required deployment mode
    if (requirements.requiredDeploymentMode && !worker.capabilities.supportedDeploymentModes.includes(requirements.requiredDeploymentMode)) {
      reasons.push({ code: "WORKER_DEPLOYMENT_MODE_UNSUPPORTED", message: `Worker does not support deployment mode ${requirements.requiredDeploymentMode}` });
    }

    // Capacity check
    const minSlots = requirements.minAvailableSlots ?? 1;
    if (worker.capacity.availableSlots < minSlots) {
      reasons.push({ code: "WORKER_CAPACITY_EXHAUSTED", message: `Worker has ${worker.capacity.availableSlots} available slots, minimum required: ${minSlots}` });
    }

    // Target compatibility
    if (requirements.targetId) {
      const compatible = worker.targetCompatibility.some(
        (tc) => tc.executionTargetId === requirements.targetId && tc.healthStatus === "healthy"
      );
      if (!compatible) {
        reasons.push({ code: "WORKER_TARGET_INCOMPATIBLE", message: `Worker is not compatible with target ${requirements.targetId}` });
      }
    }

    return { eligible: reasons.length === 0, workerId: worker.identity.id, reasons };
  }

  findEligible(requirements: WorkerEligibilityRequirements): readonly RegisteredWorker[] {
    return this.list().filter((worker) => this.evaluateEligibility(worker, requirements).eligible);
  }

  assignRun(workerId: string): RegisteredWorker {
    const canonicalId = ExecutionWorkerRegistry.canonicalId(workerId);
    const existing = this.#workers.get(canonicalId);
    if (!existing) {
      throw new WorkerNotFoundError(workerId);
    }

    if (existing.status === "registered") {
      throw new WorkerUnavailableError(workerId, "Worker has not reported availability yet");
    }
    if (existing.status === "unavailable" || existing.status === "stale") {
      throw new WorkerUnavailableError(workerId, `Worker status is ${existing.status}`);
    }
    if (existing.health.status === "unavailable") {
      throw new WorkerUnavailableError(workerId, "Worker health is unavailable");
    }
    if (existing.capacity.availableSlots <= 0) {
      throw new WorkerUnavailableError(workerId, "No available capacity slots");
    }

    if (existing.capacity.availableSlots <= 0) {
      throw new WorkerUnavailableError(workerId, "No available capacity slots");
    }

    const updated: RegisteredWorker = {
      ...existing,
      capacity: {
        ...existing.capacity,
        activeRuns: existing.capacity.activeRuns + 1,
        availableSlots: existing.capacity.availableSlots - 1,
      },
    };

    this.#workers.set(canonicalId, updated);
    return updated;
  }

  releaseRun(workerId: string): RegisteredWorker {
    const canonicalId = ExecutionWorkerRegistry.canonicalId(workerId);
    const existing = this.#workers.get(canonicalId);
    if (!existing) {
      throw new WorkerNotFoundError(workerId);
    }

    if (existing.capacity.activeRuns <= 0) {
      throw new WorkerError("Cannot release run: no active runs", "WORKER_CAPACITY_ERROR", { workerId });
    }

    const updated: RegisteredWorker = {
      ...existing,
      capacity: {
        ...existing.capacity,
        activeRuns: existing.capacity.activeRuns - 1,
        availableSlots: existing.capacity.availableSlots + 1,
      },
    };

    this.#workers.set(canonicalId, updated);
    return updated;
  }

  remove(workerId: string): void {
    const canonicalId = ExecutionWorkerRegistry.canonicalId(workerId);
    this.#workers.delete(canonicalId);
  }

  clear(): void {
    this.#workers.clear();
  }
}
