import { DuplicateRegistrationError, NotFoundError } from "../errors.js";
import type { AgentRunner } from "./agent-runner.js";

export class AgentRunnerRegistry {
  readonly #runners = new Map<string, AgentRunner>();

  register(runner: AgentRunner): AgentRunner {
    if (this.#runners.has(runner.id)) {
      throw new DuplicateRegistrationError("agent-runner", runner.id);
    }
    this.#runners.set(runner.id, runner);
    return runner;
  }

  get(id: string): AgentRunner {
    const runner = this.#runners.get(id);
    if (!runner) {
      throw new NotFoundError("agent-runner", id);
    }
    return runner;
  }

  list(): readonly AgentRunner[] {
    return [...this.#runners.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}
