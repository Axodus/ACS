import type { AgentEngine, EngineStatus, ExecutionTargetInfo } from "../engines/agent-engine.js";
import { EngineError } from "../engines/engine-errors.js";
import { EngineRegistry } from "../engines/engine-registry.js";

export interface RegisteredExecutionTarget extends ExecutionTargetInfo {
  readonly canonicalId: string;
  readonly discoveredAt: number;
  readonly lastSeenAt: number;
  readonly refreshedAt: number;
  readonly stale: boolean;
}

export interface ExecutionTargetRequirements {
  readonly engineId?: string;
  readonly deploymentMode?: string;
  readonly requiredCapabilities?: readonly string[];
  readonly targetType?: string;
  readonly environment?: string;
}

export interface TargetEligibilityReason {
  readonly code: string;
  readonly message: string;
}

export interface TargetEligibilityDecision {
  readonly eligible: boolean;
  readonly reasons: readonly TargetEligibilityReason[];
}

export interface ExecutionTargetRefreshEngineFailure {
  readonly engineId: string;
  readonly code: string;
  readonly message: string;
}

export interface ExecutionTargetRefreshReport {
  readonly refreshedAt: number;
  readonly enginesInspected: readonly string[];
  readonly targetsDiscovered: readonly string[];
  readonly targetsUpdated: readonly string[];
  readonly targetsMarkedStale: readonly string[];
  readonly failures: readonly ExecutionTargetRefreshEngineFailure[];
}

export class ExecutionTargetRegistryNotFoundError extends EngineError {}
export class ExecutionTargetRegistryOwnershipError extends EngineError {}

export class ExecutionTargetRegistry {
  readonly #targets = new Map<string, RegisteredExecutionTarget>();

  static canonicalId(engineId: string, targetId: string): string {
    return targetId.startsWith(engineId + "/") ? targetId : engineId + "/" + targetId;
  }

  static engineLocalId(engineId: string, targetId: string): string {
    const prefix = engineId + "/";
    return targetId.startsWith(prefix) ? targetId.slice(prefix.length) : targetId;
  }

  register(target: ExecutionTargetInfo, observedAt = Date.now()): RegisteredExecutionTarget {
    return this.upsert(target, observedAt);
  }

  upsert(target: ExecutionTargetInfo, observedAt = Date.now()): RegisteredExecutionTarget {
    const canonicalId = ExecutionTargetRegistry.canonicalId(target.engineId, target.id);
    const existing = this.#targets.get(canonicalId);
    if (existing && existing.engineId !== target.engineId) {
      throw new ExecutionTargetRegistryOwnershipError("target ownership mismatch for " + canonicalId);
    }
    const record: RegisteredExecutionTarget = {
      ...target,
      canonicalId,
      discoveredAt: existing?.discoveredAt ?? observedAt,
      lastSeenAt: observedAt,
      refreshedAt: observedAt,
      stale: false,
    };
    this.#targets.set(canonicalId, record);
    return record;
  }

  markEngineTargetsStale(engineId: string, refreshedAt: number, seenCanonicalIds: ReadonlySet<string>): readonly RegisteredExecutionTarget[] {
    const stale: RegisteredExecutionTarget[] = [];
    for (const target of this.#targets.values()) {
      if (target.engineId !== engineId) continue;
      if (seenCanonicalIds.has(target.canonicalId)) continue;
      const updated = { ...target, refreshedAt, stale: true };
      this.#targets.set(target.canonicalId, updated);
      stale.push(updated);
    }
    return this.#sort(stale);
  }

  markEngineTargetsUnchanged(engineId: string, refreshedAt: number): void {
    for (const target of this.#targets.values()) {
      if (target.engineId !== engineId) continue;
      this.#targets.set(target.canonicalId, { ...target, refreshedAt, stale: target.stale });
    }
  }

  get(canonicalId: string): RegisteredExecutionTarget {
    const target = this.#targets.get(canonicalId);
    if (!target) {
      throw new ExecutionTargetRegistryNotFoundError("unknown execution target: " + canonicalId);
    }
    return target;
  }

  list(): readonly RegisteredExecutionTarget[] {
    return this.#sort([...this.#targets.values()]);
  }

  listByEngine(engineId: string): readonly RegisteredExecutionTarget[] {
    return this.#sort([...this.#targets.values()].filter((target) => target.engineId === engineId));
  }

  evaluateEligibility(target: RegisteredExecutionTarget, requirements: ExecutionTargetRequirements): TargetEligibilityDecision {
    const reasons: TargetEligibilityReason[] = [];
    reasons.push(...this.#evaluateStatus(target.status, target.schedulingEligible));

    if (requirements.engineId && target.engineId !== requirements.engineId) {
      reasons.push({ code: "TARGET_ENGINE_MISMATCH", message: "Target engine " + target.engineId + " does not match required engine " + requirements.engineId });
    }
    if (requirements.deploymentMode && !target.deploymentModes.includes(requirements.deploymentMode)) {
      reasons.push({ code: "TARGET_DEPLOYMENT_MODE_UNSUPPORTED", message: "Target does not support deployment mode " + requirements.deploymentMode });
    }
    if (requirements.targetType && target.type !== requirements.targetType) {
      reasons.push({ code: "TARGET_TYPE_MISMATCH", message: "Target type " + target.type + " does not match required type " + requirements.targetType });
    }
    if (requirements.environment && target.environment !== requirements.environment) {
      reasons.push({ code: "TARGET_ENVIRONMENT_MISMATCH", message: "Target environment " + target.environment + " does not match required environment " + requirements.environment });
    }
    if (requirements.requiredCapabilities) {
      for (const capability of requirements.requiredCapabilities) {
        if (!target.capabilities.includes(capability)) {
          reasons.push({ code: "TARGET_CAPABILITY_MISSING", message: "Target is missing required capability " + capability });
        }
      }
    }
    if (!target.schedulingEligible) {
      reasons.push({ code: "TARGET_SCHEDULING_INELIGIBLE", message: target.schedulingReasons[0] ?? "Target is marked scheduling-ineligible" });
    }
    if (target.stale) {
      reasons.push({ code: "TARGET_STALE", message: "Target information is stale" });
    }

    return { eligible: reasons.length === 0, reasons };
  }

  findEligible(requirements: ExecutionTargetRequirements): readonly RegisteredExecutionTarget[] {
    return this.list().filter((target) => this.evaluateEligibility(target, requirements).eligible);
  }

  async refreshFromEngine(engine: AgentEngine, refreshedAt = Date.now()): Promise<ExecutionTargetRefreshReport> {
    const seen = new Set<string>();
    const discovered: string[] = [];
    const updated: string[] = [];
    try {
      const targets = await engine.listExecutionTargets();
      for (const target of targets) {
        const canonicalId = ExecutionTargetRegistry.canonicalId(target.engineId, target.id);
        seen.add(canonicalId);
        const existed = this.#targets.has(canonicalId);
        this.upsert(target, refreshedAt);
        (existed ? updated : discovered).push(canonicalId);
      }
      const stale = this.markEngineTargetsStale(engine.identity.id, refreshedAt, seen).map((target) => target.canonicalId);
      return {
        refreshedAt,
        enginesInspected: [engine.identity.id],
        targetsDiscovered: discovered.sort(),
        targetsUpdated: updated.sort(),
        targetsMarkedStale: stale,
        failures: [],
      };
    } catch (error) {
      this.markEngineTargetsUnchanged(engine.identity.id, refreshedAt);
      return {
        refreshedAt,
        enginesInspected: [engine.identity.id],
        targetsDiscovered: [],
        targetsUpdated: [],
        targetsMarkedStale: [],
        failures: [this.#mapFailure(engine.identity.id, error)],
      };
    }
  }

  async refreshFromEngines(engineRegistry: EngineRegistry, refreshedAt = Date.now()): Promise<ExecutionTargetRefreshReport> {
    const engines = this.#sortEngines(engineRegistry.list());
    const enginesInspected: string[] = [];
    const targetsDiscovered: string[] = [];
    const targetsUpdated: string[] = [];
    const targetsMarkedStale: string[] = [];
    const failures: ExecutionTargetRefreshEngineFailure[] = [];

    for (const engine of engines) {
      const report = await this.refreshFromEngine(engine, refreshedAt);
      enginesInspected.push(...report.enginesInspected);
      targetsDiscovered.push(...report.targetsDiscovered);
      targetsUpdated.push(...report.targetsUpdated);
      targetsMarkedStale.push(...report.targetsMarkedStale);
      failures.push(...report.failures);
    }

    return {
      refreshedAt,
      enginesInspected,
      targetsDiscovered: targetsDiscovered.sort(),
      targetsUpdated: targetsUpdated.sort(),
      targetsMarkedStale: targetsMarkedStale.sort(),
      failures,
    };
  }

  #evaluateStatus(status: EngineStatus, schedulingEligible: boolean): TargetEligibilityReason[] {
    if (status === "misconfigured") {
      return [{ code: "TARGET_STATUS_MISCONFIGURED", message: "Target is misconfigured" }];
    }
    if (status === "unavailable") {
      return [{ code: "TARGET_STATUS_UNAVAILABLE", message: "Target is unavailable" }];
    }
    if (status === "degraded" && !schedulingEligible) {
      return [{ code: "TARGET_STATUS_DEGRADED", message: "Target is degraded and not scheduling-eligible" }];
    }
    return [];
  }

  #mapFailure(engineId: string, error: unknown): ExecutionTargetRefreshEngineFailure {
    if (error instanceof EngineError) {
      return {
        engineId,
        code: error.code ?? error.name,
        message: error.message,
      };
    }
    if (error instanceof Error) {
      return {
        engineId,
        code: error.name || "Error",
        message: error.message,
      };
    }
    return {
      engineId,
      code: "UnknownError",
      message: "Unknown engine refresh failure",
    };
  }

  #sort(targets: RegisteredExecutionTarget[]): readonly RegisteredExecutionTarget[] {
    return [...targets].sort((left, right) => left.canonicalId.localeCompare(right.canonicalId));
  }

  #sortEngines(engines: readonly AgentEngine[]): readonly AgentEngine[] {
    return [...engines].sort((left, right) => left.identity.id.localeCompare(right.identity.id));
  }
}
