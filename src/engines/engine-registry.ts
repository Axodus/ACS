import type { AgentEngine } from "./agent-engine.js";
import { EngineRegistryDuplicateError, EngineRegistryNotFoundError } from "./engine-errors.js";

export class EngineRegistry {
  readonly #engines = new Map<string, AgentEngine>();

  register(engine: AgentEngine): void {
    if (this.#engines.has(engine.identity.id)) {
      throw new EngineRegistryDuplicateError(`engine already registered: ${engine.identity.id}`);
    }
    this.#engines.set(engine.identity.id, engine);
  }

  get(id: string): AgentEngine {
    const engine = this.#engines.get(id);
    if (!engine) {
      throw new EngineRegistryNotFoundError(`unknown engine: ${id}`);
    }
    return engine;
  }

  list(): readonly AgentEngine[] {
    return [...this.#engines.values()];
  }
}
