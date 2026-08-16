export type EngineStatus = "ready" | "degraded" | "unavailable" | "misconfigured";
export type EngineFindingSeverity = "info" | "warning" | "error";

export interface EngineIdentity {
  readonly id: string;
  readonly provider: string;
}

export interface EngineFinding {
  readonly code: string;
  readonly severity: EngineFindingSeverity;
  readonly message: string;
}

export interface ExecutionTargetHealthCheck {
  readonly name: string;
  readonly status: "pass" | "warning" | "fail";
  readonly message: string;
}

export interface ExecutionTargetHealth {
  readonly status: EngineStatus;
  readonly observedAt: number;
  readonly checks: readonly ExecutionTargetHealthCheck[];
  readonly findings: readonly EngineFinding[];
}

export interface ExecutionTargetOperatorMetadata {
  readonly classification: "operator-only";
  readonly sourceRoot?: string;
  readonly runtimeRoot?: string;
  readonly stateRoot?: string;
  readonly configRoot?: string;
  readonly artifactsRoot?: string;
  readonly workspaceRoot?: string;
  readonly sourceRuntimeOverlap: boolean;
}

export interface ExecutionTargetInfo {
  readonly id: string;
  readonly type: string;
  readonly environment: string;
  readonly engineId: string;
  readonly status: EngineStatus;
  readonly health: ExecutionTargetHealth;
  readonly capabilities: readonly string[];
  readonly deploymentModes: readonly string[];
  readonly schedulingEligible: boolean;
  readonly schedulingReasons: readonly string[];
  readonly supportedRunners: readonly string[];
  readonly supportedProviders: readonly string[];
  readonly isolationModes: readonly string[];
  readonly region?: string;
  readonly sourceRevision?: string;
  readonly engineVersion?: string;
  readonly operatorMetadata?: ExecutionTargetOperatorMetadata;
}

export interface EngineHealth {
  readonly identity: EngineIdentity;
  readonly status: EngineStatus;
  readonly supportedProtocols: readonly string[];
  readonly operations: readonly string[];
}

export interface EngineVersion {
  readonly identity: EngineIdentity;
  readonly packageVersion?: string;
  readonly sourceRevision?: string;
  readonly supportedProtocols: readonly string[];
}

export interface EngineCapabilities {
  readonly identity: EngineIdentity;
  readonly supportedProtocols: readonly string[];
  readonly operations: readonly string[];
  readonly engineCapabilities: readonly string[];
  readonly deploymentModes: readonly string[];
}

export interface DeployAgentRequest {
  readonly deploymentId?: string;
  readonly agentId: string;
  readonly revision: number;
  readonly composition: Record<string, unknown>;
  readonly deploymentMode: string;
  readonly targetId: string;
  readonly executionPlanId?: string;
}

export interface DeploymentResult {
  readonly deploymentId: string;
  readonly agentId: string;
  readonly revision: number;
  readonly targetId: string;
  readonly deploymentMode: string;
  readonly executionPlanId?: string;
  readonly status: string;
  readonly artifactPath?: string;
  readonly timestamp: number;
}

export interface DeploymentInspectionResult {
  readonly deploymentId: string;
  readonly status: "active" | "degraded" | "failed" | "stopped";
  readonly health: "ready" | "degraded" | "unavailable";
  readonly targetId: string;
  readonly deployedRevision: number;
  readonly observedAt: number;
  readonly reasonCode?: string;
}

export interface RollbackDeploymentRequest {
  readonly deploymentId: string;
  readonly predecessorDeploymentId: string;
  readonly targetId: string;
  readonly expectedRevision: number;
}

export interface StartRuntimeRequest {
  readonly deploymentId: string;
  readonly agentId?: string;
  readonly deploymentMode?: string;
  readonly targetId?: string;
}

export interface RuntimeInstanceResult {
  readonly runtimeInstanceId: string;
  readonly deploymentId: string;
  readonly agentId?: string;
  readonly status: string;
  readonly startedAt: number;
  readonly stoppedAt?: number;
  readonly terminatedAt?: number;
  readonly timestamp: number;
}

export interface AgentEngine {
  readonly identity: EngineIdentity;

  health(): Promise<EngineHealth>;
  version(): Promise<EngineVersion>;
  capabilities(): Promise<EngineCapabilities>;
  listExecutionTargets(): Promise<readonly ExecutionTargetInfo[]>;
  inspectExecutionTarget(targetId: string): Promise<ExecutionTargetInfo>;
  deployAgent(request: DeployAgentRequest): Promise<DeploymentResult>;
  inspectDeployment?(deploymentId: string): Promise<DeploymentInspectionResult>;
  rollbackDeployment?(request: RollbackDeploymentRequest): Promise<DeploymentResult>;
  startRuntime?(request: StartRuntimeRequest): Promise<RuntimeInstanceResult>;
  inspectRuntime?(runtimeInstanceId: string): Promise<RuntimeInstanceResult>;
  stopRuntime?(runtimeInstanceId: string): Promise<RuntimeInstanceResult>;
  terminateRuntime?(runtimeInstanceId: string): Promise<RuntimeInstanceResult>;
  close(): Promise<void>;
}
