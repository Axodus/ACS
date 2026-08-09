export type RunnerHealthStatus =
  | "authenticated"
  | "not-authenticated"
  | "degraded"
  | "unavailable"
  | "unsupported-environment";

export interface RunnerFinding {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

export interface RunnerHealth {
  readonly runnerId: string;
  readonly status: RunnerHealthStatus;
  readonly observedAt: number;
  readonly findings: readonly RunnerFinding[];
}

export interface RunnerCapabilities {
  readonly runnerId: string;
  readonly supportedConnectionTypes: readonly string[];
  readonly supportedProviders: readonly string[];
  readonly supportsExecution: boolean;
  readonly supportsInspection: boolean;
  readonly supportsCancellation: boolean;
  readonly environmentScope: "local-only" | "cloud-compatible";
}

export interface RunnerExecutionRequest {
  readonly task: string;
  readonly connectionId?: string;
  readonly providerId?: string;
  readonly timeoutMs?: number;
}

export interface RunnerExecutionResult {
  readonly executionId: string;
  readonly status: "accepted" | "completed" | "unsupported";
  readonly output?: string;
}

export interface RunnerExecutionStatus {
  readonly executionId: string;
  readonly status: "running" | "completed" | "failed" | "cancelled" | "unsupported";
  readonly message?: string;
}

export interface AgentRunner {
  readonly id: string;
  readonly displayName: string;

  health(): Promise<RunnerHealth>;
  capabilities(): Promise<RunnerCapabilities>;
  execute(request: RunnerExecutionRequest): Promise<RunnerExecutionResult>;
  inspect(executionId: string): Promise<RunnerExecutionStatus>;
  cancel(executionId: string): Promise<void>;
}

export class AgentRunnerUnsupportedOperationError extends Error {
  constructor(message = "runner operation is unsupported") {
    super(message);
    this.name = "AgentRunnerUnsupportedOperationError";
  }
}
