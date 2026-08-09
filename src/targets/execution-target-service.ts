import { EngineRegistry } from "../engines/engine-registry.js";
import {
  type ExecutionTargetRefreshReport,
  type ExecutionTargetRequirements,
  type RegisteredExecutionTarget,
  type TargetEligibilityDecision,
  ExecutionTargetRegistry,
} from "./execution-target-registry.js";

export class ExecutionTargetService {
  readonly #engineRegistry: EngineRegistry;
  readonly #targetRegistry: ExecutionTargetRegistry;

  constructor(engineRegistry: EngineRegistry, targetRegistry = new ExecutionTargetRegistry()) {
    this.#engineRegistry = engineRegistry;
    this.#targetRegistry = targetRegistry;
  }

  get registry(): ExecutionTargetRegistry {
    return this.#targetRegistry;
  }

  refresh(): Promise<ExecutionTargetRefreshReport> {
    return this.#targetRegistry.refreshFromEngines(this.#engineRegistry);
  }

  list(): readonly RegisteredExecutionTarget[] {
    return this.#targetRegistry.list();
  }

  listByEngine(engineId: string): readonly RegisteredExecutionTarget[] {
    return this.#targetRegistry.listByEngine(engineId);
  }

  get(canonicalId: string): RegisteredExecutionTarget {
    return this.#targetRegistry.get(canonicalId);
  }

  evaluateEligibility(canonicalId: string, requirements: ExecutionTargetRequirements): TargetEligibilityDecision {
    return this.#targetRegistry.evaluateEligibility(this.get(canonicalId), requirements);
  }

  findEligible(requirements: ExecutionTargetRequirements): readonly RegisteredExecutionTarget[] {
    return this.#targetRegistry.findEligible(requirements);
  }
}
