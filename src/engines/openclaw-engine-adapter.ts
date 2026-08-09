import { EngineProtocolClient } from "./protocol/client.js";
import { EngineProtocolError, EngineTimeoutError, EngineTransportError } from "./protocol/errors.js";
import type {
  AgentEngine,
  DeployAgentRequest,
  DeploymentResult,
  EngineCapabilities,
  EngineHealth,
  EngineIdentity,
  EngineFinding,
  EngineVersion,
  ExecutionTargetHealth,
  ExecutionTargetHealthCheck,
  ExecutionTargetInfo,
  ExecutionTargetOperatorMetadata,
  RuntimeInstanceResult,
  StartRuntimeRequest,
} from "./agent-engine.js";
import {
  EngineInvalidResponseError,
  EngineProtocolFailureError,
  EngineRuntimeNotFoundError,
  EngineSandboxOnlyError,
  EngineTargetNotFoundError,
  EngineTimeoutDomainError,
  EngineUnavailableError,
  EngineUnsupportedOperationError,
} from "./engine-errors.js";

export interface EngineProtocolInvoker {
  request(operation: string, params?: Record<string, unknown>, options?: { id?: string | null; timeoutMs?: number }): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

export class OpenClawEngineAdapter implements AgentEngine {
  readonly identity: EngineIdentity = { id: "openclaw", provider: "agentsai" };
  readonly #client: EngineProtocolInvoker;

  constructor(client: EngineProtocolInvoker) {
    this.#client = client;
  }

  async health(): Promise<EngineHealth> {
    const result = await this.#invoke("engine.health");
    const engine = this.#readString(result, "engine");
    this.#assertEngine(engine, result);
    return {
      identity: this.identity,
      status: this.#readStatus(result, "status"),
      supportedProtocols: this.#readStringArray(result, "protocols"),
      operations: this.#readStringArray(result, "operations"),
    };
  }

  async version(): Promise<EngineVersion> {
    const result = await this.#invoke("engine.version");
    const engine = this.#readString(result, "engine");
    this.#assertEngine(engine, result);
    const packageVersion = this.#readOptionalString(result, "package_version");
    const sourceRevision = this.#readOptionalString(result, "source_revision");
    return {
      identity: this.identity,
      ...(packageVersion ? { packageVersion } : {}),
      ...(sourceRevision ? { sourceRevision } : {}),
      supportedProtocols: [this.#readString(result, "protocol")],
    };
  }

  async capabilities(): Promise<EngineCapabilities> {
    const result = await this.#invoke("engine.capabilities");
    const engine = this.#readString(result, "engine");
    this.#assertEngine(engine, result);
    return {
      identity: this.identity,
      supportedProtocols: this.#readStringArray(result, "protocols"),
      operations: this.#readStringArray(result, "operations"),
      engineCapabilities: this.#readStringArray(result, "engine_capabilities"),
      deploymentModes: this.#readStringArray(result, "deployment_modes"),
    };
  }

  async listExecutionTargets(): Promise<readonly ExecutionTargetInfo[]> {
    const result = await this.#invoke("target.list");
    const targets = result.targets;
    if (!Array.isArray(targets)) {
      throw new EngineInvalidResponseError("target.list returned invalid targets payload", { details: { result } });
    }
    return targets.map((target) => this.#mapTarget(target));
  }

  async inspectExecutionTarget(targetId: string): Promise<ExecutionTargetInfo> {
    const result = await this.#invoke("target.inspect", { target_id: targetId });
    return this.#mapTarget(result.target);
  }

  async deployAgent(request: DeployAgentRequest): Promise<DeploymentResult> {
    if (request.deploymentMode !== "sandbox") {
      throw new EngineSandboxOnlyError(`Only sandbox deployment mode is supported, got: ${request.deploymentMode}`, {
        code: "ACS_ENGINE_SANDBOX_ONLY",
        details: { deploymentMode: request.deploymentMode },
      });
    }
    const result = await this.#invoke("agent.deploy", {
      agent_id: request.agentId,
      revision: request.revision,
      composition: request.composition,
      deployment_mode: request.deploymentMode,
      target_id: request.targetId,
      ...(request.executionPlanId ? { execution_plan_id: request.executionPlanId } : {}),
    });

    const executionPlanId = this.#readOptionalString(result, "execution_plan_id");
    const artifactPath = this.#readOptionalString(result, "artifact_path");

    return {
      deploymentId: this.#readString(result, "deployment_id"),
      agentId: this.#readString(result, "agent_id"),
      revision: this.#readNumber(result, "revision"),
      targetId: this.#readString(result, "target_id"),
      deploymentMode: this.#readString(result, "deployment_mode"),
      status: this.#readString(result, "status"),
      timestamp: this.#readNumber(result, "timestamp"),
      ...(executionPlanId ? { executionPlanId } : {}),
      ...(artifactPath ? { artifactPath } : {}),
    };
  }

  async startRuntime(request: StartRuntimeRequest): Promise<RuntimeInstanceResult> {
    const deploymentMode = request.deploymentMode ?? "sandbox";
    if (deploymentMode !== "sandbox") {
      throw new EngineSandboxOnlyError(`Only sandbox runtime execution is supported, got: ${deploymentMode}`, {
        code: "ACS_ENGINE_SANDBOX_ONLY",
        details: { deploymentMode },
      });
    }
    const result = await this.#invoke("runtime.start", {
      deployment_id: request.deploymentId,
      ...(request.agentId ? { agent_id: request.agentId } : {}),
      deployment_mode: deploymentMode,
      target_id: request.targetId ?? "local-wsl",
    });

    const agentId = this.#readOptionalString(result, "agent_id");

    return {
      runtimeInstanceId: this.#readString(result, "runtime_instance_id"),
      deploymentId: this.#readString(result, "deployment_id"),
      status: this.#readString(result, "status"),
      startedAt: this.#readNumber(result, "started_at"),
      timestamp: this.#readNumber(result, "timestamp"),
      ...(agentId ? { agentId } : {}),
    };
  }

  async inspectRuntime(runtimeInstanceId: string): Promise<RuntimeInstanceResult> {
    const result = await this.#invoke("runtime.inspect", { runtime_instance_id: runtimeInstanceId });
    const instance = result.runtime_instance as Record<string, unknown>;
    const agentId = this.#readOptionalString(instance, "agent_id");
    const stoppedAt = instance.stopped_at !== undefined ? this.#readNumber(instance, "stopped_at") : undefined;
    const terminatedAt = instance.terminated_at !== undefined ? this.#readNumber(instance, "terminated_at") : undefined;

    return {
      runtimeInstanceId: this.#readString(instance, "runtime_instance_id"),
      deploymentId: this.#readString(instance, "deployment_id"),
      status: this.#readString(instance, "status"),
      startedAt: this.#readNumber(instance, "started_at"),
      timestamp: this.#readNumber(result, "timestamp"),
      ...(agentId ? { agentId } : {}),
      ...(stoppedAt !== undefined ? { stoppedAt } : {}),
      ...(terminatedAt !== undefined ? { terminatedAt } : {}),
    };
  }

  async stopRuntime(runtimeInstanceId: string): Promise<RuntimeInstanceResult> {
    const result = await this.#invoke("runtime.stop", { runtime_instance_id: runtimeInstanceId });
    return {
      runtimeInstanceId: this.#readString(result, "runtime_instance_id"),
      deploymentId: "",
      status: this.#readString(result, "status"),
      startedAt: 0,
      stoppedAt: this.#readNumber(result, "stopped_at"),
      timestamp: this.#readNumber(result, "timestamp"),
    };
  }

  async terminateRuntime(runtimeInstanceId: string): Promise<RuntimeInstanceResult> {
    const result = await this.#invoke("runtime.terminate", { runtime_instance_id: runtimeInstanceId });
    return {
      runtimeInstanceId: this.#readString(result, "runtime_instance_id"),
      deploymentId: "",
      status: this.#readString(result, "status"),
      startedAt: 0,
      terminatedAt: this.#readNumber(result, "terminated_at"),
      timestamp: this.#readNumber(result, "timestamp"),
    };
  }

  close(): Promise<void> {
    return this.#client.close();
  }

  async #invoke(operation: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    try {
      return await this.#client.request(operation, params);
    } catch (error) {
      if (error instanceof EngineTimeoutError) {
        throw new EngineTimeoutDomainError(error.message);
      }
      if (error instanceof EngineTransportError) {
        throw new EngineUnavailableError(error.message);
      }
      if (error instanceof EngineProtocolError) {
        const options = { code: error.payload.code, retryable: error.payload.retryable, ...(error.payload.details ? { details: error.payload.details } : {}) };
        switch (error.payload.code) {
          case "ACS_ENGINE_UNSUPPORTED_OPERATION":
            throw new EngineUnsupportedOperationError(error.message, options);
          case "ACS_ENGINE_TARGET_NOT_FOUND":
            throw new EngineTargetNotFoundError(error.message, options);
          case "ACS_ENGINE_SANDBOX_ONLY":
            throw new EngineSandboxOnlyError(error.message, options);
          case "ACS_ENGINE_RUNTIME_NOT_FOUND":
            throw new EngineRuntimeNotFoundError(error.message, options);
          case "ACS_ENGINE_PROTOCOL_MISMATCH":
          case "ACS_ENGINE_CORRELATION_MISMATCH":
            throw new EngineInvalidResponseError(error.message, options);
          default:
            throw new EngineProtocolFailureError(error.message, options);
        }
      }
      throw error;
    }
  }

  #mapTarget(raw: unknown): ExecutionTargetInfo {
    if (!raw || typeof raw !== "object") {
      throw new EngineInvalidResponseError("execution target payload must be an object");
    }
    const target = raw as Record<string, unknown>;
    const engine = this.#readString(target, "engine");
    this.#assertEngine(engine, target);
    const region = this.#readOptionalString(target, "region");
    const sourceRevision = this.#readOptionalString(target, "source_revision");
    const engineVersion = this.#readOptionalString(target, "engine_version");
    const operatorMetadata = this.#mapOperatorMetadata(target.runtime);
    return {
      id: this.#readString(target, "id"),
      type: this.#readString(target, "type"),
      environment: this.#readString(target, "environment"),
      engineId: engine,
      status: this.#readStatus(target, "status"),
      health: this.#mapTargetHealth(target.health),
      capabilities: this.#readStringArray(target, "capabilities"),
      deploymentModes: this.#readStringArray(target, "deployment_modes"),
      schedulingEligible: this.#readBoolean(target, "scheduling_eligible"),
      schedulingReasons: this.#readStringArray(target, "scheduling_reasons"),
      supportedRunners: this.#readStringArray(target, "supported_runners"),
      supportedProviders: this.#readStringArray(target, "supported_providers"),
      isolationModes: this.#readStringArray(target, "isolation_modes"),
      ...(region ? { region } : {}),
      ...(sourceRevision ? { sourceRevision } : {}),
      ...(engineVersion ? { engineVersion } : {}),
      ...(operatorMetadata ? { operatorMetadata } : {}),
    };
  }

  #mapTargetHealth(raw: unknown): ExecutionTargetHealth {
    if (!raw || typeof raw !== "object") {
      throw new EngineInvalidResponseError("target health payload must be an object");
    }
    const health = raw as Record<string, unknown>;
    const checksRaw = health.checks;
    const findingsRaw = health.findings;
    if (!Array.isArray(checksRaw) || !Array.isArray(findingsRaw)) {
      throw new EngineInvalidResponseError("target health payload is missing checks/findings arrays");
    }
    const checks: ExecutionTargetHealthCheck[] = checksRaw.map((item) => {
      if (!item || typeof item !== "object") throw new EngineInvalidResponseError("target check must be an object");
      const value = item as Record<string, unknown>;
      return {
        name: this.#readString(value, "name"),
        status: this.#readCheckStatus(value, "status"),
        message: this.#readString(value, "message"),
      };
    });
    const findings: EngineFinding[] = findingsRaw.map((item) => {
      if (!item || typeof item !== "object") throw new EngineInvalidResponseError("target finding must be an object");
      const value = item as Record<string, unknown>;
      return {
        code: this.#readString(value, "code"),
        severity: this.#readSeverity(value, "severity"),
        message: this.#readString(value, "message"),
      };
    });
    return {
      status: this.#readStatus(health, "status"),
      observedAt: this.#readNumber(health, "observed_at"),
      checks,
      findings,
    };
  }

  #mapOperatorMetadata(raw: unknown): ExecutionTargetOperatorMetadata | undefined {
    if (!raw || typeof raw !== "object") return undefined;
    const runtime = raw as Record<string, unknown>;
    const sourceRoot = this.#readOptionalString(runtime, "source_root");
    const runtimeRoot = this.#readOptionalString(runtime, "runtime_root");
    const stateRoot = this.#readOptionalString(runtime, "state_root");
    const configRoot = this.#readOptionalString(runtime, "config_root");
    const artifactsRoot = this.#readOptionalString(runtime, "artifacts_root");
    const workspaceRoot = this.#readOptionalString(runtime, "workspace_root");
    return {
      classification: "operator-only",
      ...(sourceRoot ? { sourceRoot } : {}),
      ...(runtimeRoot ? { runtimeRoot } : {}),
      ...(stateRoot ? { stateRoot } : {}),
      ...(configRoot ? { configRoot } : {}),
      ...(artifactsRoot ? { artifactsRoot } : {}),
      ...(workspaceRoot ? { workspaceRoot } : {}),
      sourceRuntimeOverlap: this.#readBoolean(runtime, "source_runtime_overlap"),
    };
  }

  #assertEngine(actual: string, details: unknown): void {
    if (actual !== this.identity.id) {
      throw new EngineInvalidResponseError(`unexpected engine identity: ${actual}`, { details: { expected: this.identity.id, actual, payload: details } });
    }
  }

  #readString(source: Record<string, unknown>, key: string): string {
    const value = source[key];
    if (typeof value !== "string") throw new EngineInvalidResponseError(`expected string field: ${key}`);
    return value;
  }

  #readOptionalString(source: Record<string, unknown>, key: string): string | undefined {
    const value = source[key];
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "string") throw new EngineInvalidResponseError(`expected optional string field: ${key}`);
    return value;
  }

  #readStringArray(source: Record<string, unknown>, key: string): readonly string[] {
    const value = source[key];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
      throw new EngineInvalidResponseError(`expected string array field: ${key}`);
    }
    return value;
  }

  #readBoolean(source: Record<string, unknown>, key: string): boolean {
    const value = source[key];
    if (typeof value !== "boolean") throw new EngineInvalidResponseError(`expected boolean field: ${key}`);
    return value;
  }

  #readNumber(source: Record<string, unknown>, key: string): number {
    const value = source[key];
    if (typeof value !== "number") throw new EngineInvalidResponseError(`expected numeric field: ${key}`);
    return value;
  }

  #readStatus(source: Record<string, unknown>, key: string): EngineHealth["status"] {
    const value = this.#readString(source, key);
    if (value !== "ready" && value !== "degraded" && value !== "unavailable" && value !== "misconfigured") {
      throw new EngineInvalidResponseError(`unexpected status value: ${value}`);
    }
    return value;
  }

  #readCheckStatus(source: Record<string, unknown>, key: string): ExecutionTargetHealthCheck["status"] {
    const value = this.#readString(source, key);
    if (value !== "pass" && value !== "warning" && value !== "fail") {
      throw new EngineInvalidResponseError(`unexpected check status value: ${value}`);
    }
    return value;
  }

  #readSeverity(source: Record<string, unknown>, key: string): EngineFinding["severity"] {
    const value = this.#readString(source, key);
    if (value !== "info" && value !== "warning" && value !== "error") {
      throw new EngineInvalidResponseError(`unexpected finding severity value: ${value}`);
    }
    return value;
  }
}

export function createOpenClawEngineAdapter(client: EngineProtocolClient): OpenClawEngineAdapter {
  return new OpenClawEngineAdapter(client);
}
