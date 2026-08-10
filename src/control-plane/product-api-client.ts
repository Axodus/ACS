import type { AgentService } from "./agent-service.js";
import type { AgentRevision } from "./unified-agent-model.js";
import type { DeploymentService, DeploymentRecord, DeploymentRequest } from "./deployment-service.js";
import type { RuntimeLifecycleService, RuntimeInstanceRecord, StartRuntimeServiceRequest } from "./runtime-lifecycle-service.js";
import type { AuditService, AuditEvent, AuditQueryFilter } from "./audit-service.js";
import type { ExecutionTargetService } from "../targets/execution-target-service.js";
import type { ModelProviderService } from "../intelligence/model-provider-service.js";
import type { AgentRunnerService } from "../intelligence/agent-runner-service.js";
import { EngineSandboxOnlyError } from "../engines/engine-errors.js";

export interface ProductApiClientOptions {
  readonly agentService?: AgentService;
  readonly deploymentService?: DeploymentService;
  readonly runtimeService?: RuntimeLifecycleService;
  readonly auditService?: AuditService;
  readonly targetService?: ExecutionTargetService;
  readonly providerService?: ModelProviderService;
  readonly runnerService?: AgentRunnerService;
  readonly baseUrl?: string;
}

export class ProductApiClient {
  readonly #agentService: AgentService | undefined;
  readonly #deploymentService: DeploymentService | undefined;
  readonly #runtimeService: RuntimeLifecycleService | undefined;
  readonly #auditService: AuditService | undefined;
  readonly #targetService: ExecutionTargetService | undefined;
  readonly #providerService: ModelProviderService | undefined;
  readonly #runnerService: AgentRunnerService | undefined;
  readonly #baseUrl: string | undefined;

  constructor(options: ProductApiClientOptions = {}) {
    this.#agentService = options.agentService;
    this.#deploymentService = options.deploymentService;
    this.#runtimeService = options.runtimeService;
    this.#auditService = options.auditService;
    this.#targetService = options.targetService;
    this.#providerService = options.providerService;
    this.#runnerService = options.runnerService;
    this.#baseUrl = options.baseUrl;
  }

  async listAgents(): Promise<readonly AgentRevision[]> {
    if (this.#agentService) {
      return this.#agentService.list();
    }
    return [];
  }

  async getAgent(id: string): Promise<AgentRevision | undefined> {
    if (this.#agentService) {
      try {
        return this.#agentService.get(id);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  async listTargets(): Promise<readonly unknown[]> {
    if (this.#targetService) {
      return this.#targetService.list();
    }
    return [];
  }

  async listProviders(): Promise<readonly unknown[]> {
    if (this.#providerService) {
      return this.#providerService.listProviders();
    }
    return [];
  }

  async listRunners(): Promise<readonly unknown[]> {
    if (this.#runnerService) {
      return this.#runnerService.listRunners();
    }
    return [];
  }

  async deployAgent(request: DeploymentRequest): Promise<DeploymentRecord> {
    if (request.deploymentMode !== "sandbox") {
      throw new EngineSandboxOnlyError(`Only sandbox deployment mode is supported, got: ${request.deploymentMode}`, {
        code: "ACS_ENGINE_SANDBOX_ONLY",
        details: { deploymentMode: request.deploymentMode },
      });
    }

    if (this.#deploymentService) {
      return this.#deploymentService.deploy(request);
    }

    throw new Error("DeploymentService not configured");
  }

  async listDeployments(): Promise<readonly DeploymentRecord[]> {
    if (this.#deploymentService) {
      return this.#deploymentService.listDeployments();
    }
    return [];
  }

  async startRuntime(request: StartRuntimeServiceRequest): Promise<RuntimeInstanceRecord> {
    const mode = request.deploymentMode ?? "sandbox";
    if (mode !== "sandbox") {
      throw new EngineSandboxOnlyError(`Only sandbox runtime execution is supported, got: ${mode}`, {
        code: "ACS_ENGINE_SANDBOX_ONLY",
        details: { deploymentMode: mode },
      });
    }

    if (this.#runtimeService) {
      return this.#runtimeService.start(request);
    }

    throw new Error("RuntimeLifecycleService not configured");
  }

  async stopRuntime(runtimeInstanceId: string): Promise<RuntimeInstanceRecord> {
    if (this.#runtimeService) {
      return this.#runtimeService.stop(runtimeInstanceId);
    }

    throw new Error("RuntimeLifecycleService not configured");
  }

  async listRuntimes(): Promise<readonly RuntimeInstanceRecord[]> {
    if (this.#runtimeService) {
      return this.#runtimeService.listRuntimes();
    }
    return [];
  }

  async queryAuditEvents(filter: AuditQueryFilter): Promise<readonly AuditEvent[]> {
    if (this.#auditService) {
      return this.#auditService.queryEvents(filter);
    }
    return [];
  }
}
