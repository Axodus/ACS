import type { AgentEngine, EngineCapabilities, EngineHealth, EngineVersion, ExecutionTargetInfo } from "./agent-engine.js";
import { EngineRegistry } from "./engine-registry.js";

export class EngineService {
  readonly #registry: EngineRegistry;

  constructor(registry: EngineRegistry) {
    this.#registry = registry;
  }

  listEngines(): readonly AgentEngine[] {
    return this.#registry.list();
  }

  getEngine(id: string): AgentEngine {
    return this.#registry.get(id);
  }

  health(id: string): Promise<EngineHealth> {
    return this.getEngine(id).health();
  }

  version(id: string): Promise<EngineVersion> {
    return this.getEngine(id).version();
  }

  capabilities(id: string): Promise<EngineCapabilities> {
    return this.getEngine(id).capabilities();
  }

  listExecutionTargets(id: string): Promise<readonly ExecutionTargetInfo[]> {
    return this.getEngine(id).listExecutionTargets();
  }

  inspectExecutionTarget(id: string, targetId: string): Promise<ExecutionTargetInfo> {
    return this.getEngine(id).inspectExecutionTarget(targetId);
  }
}
