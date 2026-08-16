import type {
  AgentEngine,
  DeployAgentRequest,
  DeploymentInspectionResult,
  DeploymentResult,
  EngineCapabilities,
  EngineHealth,
  EngineVersion,
  ExecutionTargetInfo,
  RollbackDeploymentRequest,
  RuntimeInstanceResult,
  StartRuntimeRequest,
} from "./agent-engine.js";

export interface ProductionTargetAdapterDescriptor {
  readonly adapter: string;
  readonly productionOriented: true;
  readonly topology: "production_like_single_host";
  readonly multiHost: "not_proven";
}

export class ProductionTargetConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionTargetConfigurationError";
  }
}

export class ProductionTargetUnavailableError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProductionTargetUnavailableError";
  }
}

export class HttpProductionTargetEngine implements AgentEngine {
  readonly identity = { id: "acs-production-target", provider: "acs-http-target" } as const;
  readonly descriptor: ProductionTargetAdapterDescriptor = {
    adapter: "http-production-target",
    productionOriented: true,
    topology: "production_like_single_host",
    multiHost: "not_proven",
  };
  readonly #baseUrl: string;
  readonly #token: string;
  readonly #fetch: typeof fetch;
  readonly #requestTimeoutMs: number;

  constructor(options: {
    readonly baseUrl: string;
    readonly token: string;
    readonly fetchImpl?: typeof fetch;
    readonly requestTimeoutMs?: number;
  }) {
    if (!options.baseUrl.trim()) throw new ProductionTargetConfigurationError("production target URL is required");
    if (!options.token.trim()) throw new ProductionTargetConfigurationError("production target service token is required");
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#token = options.token;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
  }

  async health(): Promise<EngineHealth> {
    try {
      const response = await this.#request<{ readonly status: string }>("GET", "/health");
      return {
        identity: this.identity,
        status: response.status === "ready" ? "ready" : "degraded",
        supportedProtocols: ["acs-production-target/1"],
        operations: ["deployment.deploy", "deployment.inspect", "deployment.rollback", "runtime.start"],
      };
    } catch {
      return {
        identity: this.identity,
        status: "unavailable",
        supportedProtocols: ["acs-production-target/1"],
        operations: ["deployment.deploy", "deployment.inspect", "deployment.rollback", "runtime.start"],
      };
    }
  }

  async version(): Promise<EngineVersion> {
    return {
      identity: this.identity,
      packageVersion: "1.0.0",
      supportedProtocols: ["acs-production-target/1"],
    };
  }

  async capabilities(): Promise<EngineCapabilities> {
    return {
      identity: this.identity,
      supportedProtocols: ["acs-production-target/1"],
      operations: ["deployment.deploy", "deployment.inspect", "deployment.rollback", "runtime.start"],
      engineCapabilities: [
        "deployment.live",
        "deployment.health",
        "deployment.rollback",
        "runtime.remote",
        "state.durable",
        "telemetry.external",
        "secrets.references",
      ],
      deploymentModes: ["live"],
    };
  }

  async listExecutionTargets(): Promise<readonly ExecutionTargetInfo[]> {
    return this.#request<readonly ExecutionTargetInfo[]>("GET", "/targets");
  }

  async inspectExecutionTarget(targetId: string): Promise<ExecutionTargetInfo> {
    return this.#request<ExecutionTargetInfo>("GET", `/targets/${encodeURIComponent(targetId)}`);
  }

  async deployAgent(request: DeployAgentRequest): Promise<DeploymentResult> {
    return this.#request<DeploymentResult>("POST", "/deployments", request);
  }

  async inspectDeployment(deploymentId: string): Promise<DeploymentInspectionResult> {
    return this.#request<DeploymentInspectionResult>("GET", `/deployments/${encodeURIComponent(deploymentId)}`);
  }

  async rollbackDeployment(request: RollbackDeploymentRequest): Promise<DeploymentResult> {
    return this.#request<DeploymentResult>(
      "POST",
      `/deployments/${encodeURIComponent(request.deploymentId)}/rollback`,
      request,
    );
  }

  async startRuntime(request: StartRuntimeRequest): Promise<RuntimeInstanceResult> {
    return this.#request<RuntimeInstanceResult>("POST", "/runtimes", request);
  }

  async inspectRuntime(runtimeInstanceId: string): Promise<RuntimeInstanceResult> {
    return this.#request<RuntimeInstanceResult>("GET", `/runtimes/${encodeURIComponent(runtimeInstanceId)}`);
  }

  async stopRuntime(runtimeInstanceId: string): Promise<RuntimeInstanceResult> {
    return this.#request<RuntimeInstanceResult>("POST", `/runtimes/${encodeURIComponent(runtimeInstanceId)}/stop`, {});
  }

  async close(): Promise<void> { /* stateless HTTP adapter */ }

  async #request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.#fetch(this.#baseUrl + path, {
        method,
        headers: {
          authorization: `Bearer ${this.#token}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(this.#requestTimeoutMs),
      });
    } catch (error) {
      throw new ProductionTargetUnavailableError(
        `production target request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined) as unknown;
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload
        ? String((payload as { readonly error?: unknown }).error)
        : `production target request failed with status ${response.status}`;
      throw new ProductionTargetUnavailableError(message, response.status);
    }
    return payload as T;
  }
}
