export type AgentId = string;
export type ProviderId = string;
export type WorkflowId = string;
export type WorkflowRunId = string;
export type ExecutionId = string;
export type TelemetryId = string;

export type AgentStatus = "active" | "disabled";
export type AgentClass = "axodus_core" | "owner_product" | "client_product" | "unknown";
export type AgentAudience = "axodus_ecosystem" | "owner_private" | "client_dedicated" | "unknown";
export type ProviderStatus = "available" | "degraded" | "disabled";
export type WorkflowStatus = "accepted" | "rejected" | "running" | "completed" | "failed";
export type TelemetryEventType =
  | "agent.registered"
  | "provider.registered"
  | "workflow.accepted"
  | "workflow.rejected"
  | "workflow.started"
  | "workflow.completed"
  | "workflow.failed"
  | "redhat.task.planned"
  | "redhat.task.blocked";

export interface PermissionScope {
  readonly name: string;
  readonly description?: string;
}

export interface AgentDefinition {
  readonly id: AgentId;
  readonly sourceIds?: readonly string[];
  readonly name: string;
  readonly role: string;
  readonly agentClass?: AgentClass;
  readonly audience?: AgentAudience;
  readonly exclusiveTo?: string;
  readonly canSpawnSubAgents?: boolean;
  readonly subAgentScope?: string;
  readonly status: AgentStatus;
  readonly permissions: readonly PermissionScope[];
  readonly telemetryEnabled: boolean;
}

export interface ProviderCapability {
  readonly name: string;
  readonly description?: string;
}

export interface ProviderPricing {
  readonly unit: "token" | "execution" | "minute";
  readonly currency: string;
  readonly amount: number;
}

export interface ProviderDefinition {
  readonly id: ProviderId;
  readonly name: string;
  readonly status: ProviderStatus;
  readonly capabilities: readonly ProviderCapability[];
  readonly pricing?: ProviderPricing;
}

export interface WorkflowStep {
  readonly id: string;
  readonly agentId: AgentId;
  readonly action: string;
  readonly requiredPermissions: readonly string[];
  readonly providerCapability?: string;
  readonly input?: unknown;
}

export interface WorkflowDefinition {
  readonly id: WorkflowId;
  readonly workflowRunId?: WorkflowRunId;
  readonly name: string;
  readonly createdBy: string;
  readonly steps: readonly WorkflowStep[];
  readonly governancePolicyRef?: string;
}

export interface WorkflowStepReceipt {
  readonly stepId: string;
  readonly agentId: AgentId;
  readonly status: "completed";
  readonly providerId?: ProviderId;
}

export interface ExecutionReceipt {
  readonly id: ExecutionId;
  readonly workflowId: WorkflowId;
  readonly workflowRunId: WorkflowRunId;
  readonly status: WorkflowStatus;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly steps: readonly WorkflowStepReceipt[];
  readonly telemetryIds: readonly TelemetryId[];
  readonly rejectionReason?: string;
}

export interface TelemetryEvent {
  readonly id: TelemetryId;
  readonly type: TelemetryEventType;
  readonly timestamp: string;
  readonly subjectId: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly reason?: string;
}
