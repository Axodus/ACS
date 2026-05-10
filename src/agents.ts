import { DuplicateRegistrationError, NotFoundError } from "./errors.js";
import type { AgentDefinition, AgentId } from "./types.js";

export class AgentRegistry {
  readonly #agents = new Map<AgentId, AgentDefinition>();

  register(agent: AgentDefinition): AgentDefinition {
    if (this.#agents.has(agent.id)) {
      throw new DuplicateRegistrationError("agent", agent.id);
    }

    this.#agents.set(agent.id, agent);
    return agent;
  }

  require(agentId: AgentId): AgentDefinition {
    const agent = this.#agents.get(agentId);
    if (!agent) {
      throw new NotFoundError("agent", agentId);
    }

    return agent;
  }

  list(): readonly AgentDefinition[] {
    return [...this.#agents.values()];
  }
}
