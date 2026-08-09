import type {
  AgentRunner,
  RunnerCapabilities,
  RunnerExecutionRequest,
  RunnerExecutionResult,
  RunnerExecutionStatus,
  RunnerHealth,
} from "./agent-runner.js";
import { AgentRunnerRegistry } from "./agent-runner-registry.js";

export class AgentRunnerService {
  readonly #registry: AgentRunnerRegistry;

  constructor(registry: AgentRunnerRegistry) {
    this.#registry = registry;
  }

  listRunners(): readonly AgentRunner[] {
    return this.#registry.list();
  }

  getRunner(id: string): AgentRunner {
    return this.#registry.get(id);
  }

  health(id: string): Promise<RunnerHealth> {
    return this.getRunner(id).health();
  }

  capabilities(id: string): Promise<RunnerCapabilities> {
    return this.getRunner(id).capabilities();
  }

  execute(id: string, request: RunnerExecutionRequest): Promise<RunnerExecutionResult> {
    return this.getRunner(id).execute(request);
  }

  inspect(id: string, executionId: string): Promise<RunnerExecutionStatus> {
    return this.getRunner(id).inspect(executionId);
  }

  cancel(id: string, executionId: string): Promise<void> {
    return this.getRunner(id).cancel(executionId);
  }
}
