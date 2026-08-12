import type {
  AgentLifecycleActionAvailability,
  AgentLifecycleActionName,
  AgentLifecycleState,
  AgentRevisionHistoryRecord,
  AgentCompositionResult,
  AgentService,
} from "./agent-service.js";
import { AgentLifecycleGuardError } from "./agent-service.js";
import type {
  AgentComposition,
  AgentDefinition,
  AgentRevision,
  CompositionFinding,
  GovernedAgentStatus,
} from "./unified-agent-model.js";
import type { DeploymentService, DeploymentRecord, DeploymentRequest } from "./deployment-service.js";
import type { ExecutionRunRecord, RuntimeLifecycleService, RuntimeInstanceRecord, StartRuntimeServiceRequest } from "./runtime-lifecycle-service.js";
import type { AuditService, AuditEvent, AuditQueryFilter } from "./audit-service.js";
import type { ExecutionTargetService } from "../targets/execution-target-service.js";
import type { EconomicService } from "./neurons-economic-contract.js";
import { OperationalEvidenceService } from "./operational-evidence-service.js";
import type {
  AgentEconomicConsumption,
  AuditEntry,
  DiagnosticReport,
  EconomicQuery,
  EconomicSummary,
  EvidenceQuery,
  EvidenceRecord,
  EventSummary,
  LogAvailability,
  LogSummary,
  MeteringQuery,
  MeteringRecord,
  Quote,
  QuoteQuery,
  Receipt,
  ReceiptQuery,
  Reservation,
  ReservationQuery,
  Settlement,
  SettlementQuery,
  EventsQuery,
  AuditQuery,
 } from "./operational-evidence-service.js";

import type { ModelProviderService } from "../intelligence/model-provider-service.js";
import type {
  ModelDefinition,
  ModelProvider,
  ModelProviderCapabilities,
} from "../intelligence/model-provider.js";
import { createCanonicalModelId } from "../intelligence/model-provider.js";
import type { AgentRunnerService } from "../intelligence/agent-runner-service.js";
import type { CredentialConnectionRegistry } from "../intelligence/credential-registry.js";
import { EngineSandboxOnlyError } from "../engines/engine-errors.js";
import type { EngineService } from "../engines/engine-service.js";
import type { AgentEngine, EngineCapabilities } from "../engines/agent-engine.js";
import { NotFoundError } from "../errors.js";
import { getEpic11AcceptanceReport, type Epic11AcceptanceReport } from "./epic-11-acceptance.js";
import type {
  CompositionResourceService,
  GovernedCapabilityResource,
  GovernedProfileResource,
  GovernedRoleResource,
  GovernedSkillResource,
  GovernedToolResource,
} from "./composition-resources.js";
import type { ExecutionWorkerRegistry } from "../workers/worker-registry.js";
import type { WorkerAssignmentService } from "../workers/worker-assignment-service.js";
import type { CredentialConnection, CredentialConnectionStatus, CredentialConnectionType } from "../intelligence/credential-connection.js";
import {
  createEpic10ReadinessReport,
  type Epic10ReadinessDomainReport,
  type Epic10ReadinessFinding,
  type Epic10ReadinessSignals,
  type Epic10ReadinessStatus,
} from "./epic-10-readiness.js";

export interface ProductApiClientOptions {
  readonly agentService?: AgentService;
  readonly deploymentService?: DeploymentService;
  readonly runtimeService?: RuntimeLifecycleService;
  readonly auditService?: AuditService;
  readonly targetService?: ExecutionTargetService;
  readonly economicService?: EconomicService;
  readonly providerService?: ModelProviderService;
  readonly runnerService?: AgentRunnerService;
  readonly workerRegistry?: ExecutionWorkerRegistry;
  readonly workerAssignmentService?: WorkerAssignmentService;
  readonly engineService?: EngineService;
  readonly compositionResources?: CompositionResourceService;
  readonly credentialRegistry?: CredentialConnectionRegistry;
  readonly baseUrl?: string;
}

export interface DashboardFinding {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly domain: string;
  readonly message: string;
}

export type ProductApiRuntimeConnectivity = "connected" | "degraded" | "unavailable" | "unverified";

export type ProductApiHealthStatus = "ok" | "degraded" | "unavailable" | "unverified";

export type ProductApiReadinessFlagStatus = "ready" | "partial" | "blocked" | "unverified";

export interface ProductApiOperationalGuardrails {
  readonly inspectionMode: true;
  readonly sandboxOnly: true;
  readonly readOnly: true;
  readonly mutableOperations: false;
}

export interface ProductApiReadinessLink {
  readonly state: ProductApiReadinessFlagStatus;
  readonly blockerCount: number;
  readonly warningCount: number;
  readonly evidenceCount: number;
  readonly checkedAt: number;
}

const OPERATIONAL_REFRESH_WINDOW_MS = 30_000;

const OPERATIONAL_GUARDRAILS: ProductApiOperationalGuardrails = {
  inspectionMode: true,
  sandboxOnly: true,
  readOnly: true,
  mutableOperations: false,
};

const COMPOSITION_MUTATION_UNSUPPORTED_REASON =
  "Governed by Product API — composition mutations are not supported in this milestone.";

function unsupportedCompositionAction(action: CompositionActionName, label: string): CompositionActionView {
  return { action, label, available: false, reason: COMPOSITION_MUTATION_UNSUPPORTED_REASON };
}

const COMPOSITION_ACTIONS: readonly CompositionActionView[] = [
  unsupportedCompositionAction("assignRole", "Assign role"),
  unsupportedCompositionAction("adoptRole", "Adopt role revision"),
  unsupportedCompositionAction("assignProfile", "Assign profile"),
  unsupportedCompositionAction("adoptProfile", "Adopt profile revision"),
  unsupportedCompositionAction("assignSkill", "Assign skill"),
  unsupportedCompositionAction("unassignSkill", "Unassign skill"),
  unsupportedCompositionAction("installSkill", "Install skill"),
  unsupportedCompositionAction("removeSkill", "Remove skill"),
  unsupportedCompositionAction("assignTool", "Assign tool"),
  unsupportedCompositionAction("unassignTool", "Unassign tool"),
  unsupportedCompositionAction("installPlugin", "Install plugin"),
  unsupportedCompositionAction("removePlugin", "Remove plugin"),
  unsupportedCompositionAction("selectEngine", "Select engine"),
  unsupportedCompositionAction("selectProvider", "Select provider"),
  unsupportedCompositionAction("selectModel", "Select model"),
];

export type AgentEnvironment = "sandbox";

export interface AgentCompositionSummary {
  readonly ready: boolean;
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface AgentReadinessSummary {
  readonly state: "ready" | "partial" | "blocked" | "unavailable";
  readonly blockerCount: number;
  readonly warningCount: number;
}

export interface AgentDeploymentSummary {
  readonly state: "none" | "deployed" | "failed" | "rejected";
  readonly count: number;
}

export interface AgentRuntimeSummary {
  readonly state: "none" | "running" | "stopped" | "failed" | "other";
  readonly count: number;
}

export interface AgentListItem {
  readonly agentId: string;
  readonly name: string;
  readonly status: GovernedAgentStatus;
  readonly environment: AgentEnvironment;
  readonly currentRevisionId: number;
  readonly compositionSummary: AgentCompositionSummary;
  readonly readinessSummary: AgentReadinessSummary;
  readonly deploymentSummary: AgentDeploymentSummary;
  readonly runtimeSummary: AgentRuntimeSummary;
  readonly archived: boolean;
  readonly updatedAt: number;
  readonly checkedAt: number;
}

export interface AgentAuditSummary {
  readonly total: number;
  readonly success: number;
  readonly failure: number;
  readonly pending: number;
  readonly recent: readonly AuditEvent[];
}

export interface AgentEconomicSummary {
  readonly state: "unavailable";
  readonly message: string;
}

export interface AgentSurfaceGuardrails {
  readonly inspectionMode: true;
  readonly sandboxOnly: true;
  readonly readOnly: false;
  readonly mutableOperations: true;
  readonly mutationScope: "agent-lifecycle";
  readonly productionReady: false;
  readonly sourceOfTruth: "product-api";
}

export interface SystemGuardrailsView {
  readonly inspectionMode: true;
  readonly sandboxOnly: true;
  readonly readOnly: true;
  readonly mutableOperations: false;
  readonly productionReady: false;
  readonly sourceOfTruth: "product-api";
  readonly futureScope: readonly string[];
  readonly administration: { readonly status: "unavailable"; readonly scope: "future"; readonly reason: string };
  readonly tenants: { readonly status: "future_scope"; readonly reason: string };
}

export interface SystemConfigurationView {
  readonly mode: "inspection";
  readonly automation: "disabled";
  readonly readOnly: true;
  readonly persistenceBackend: "memory";
  readonly secretBackend: "memory";
  readonly settlementBackend: "memory";
  readonly refreshWindowMs: number;
  readonly notices: readonly string[];
}

export interface SystemPolicyVisibility {
  readonly id: string;
  readonly label: string;
  readonly availability: "read_only" | "governed_by_product_api" | "unavailable";
  readonly note: string;
}

export interface SystemAdministrationView {
  readonly status: "unavailable";
  readonly scope: "future";
  readonly reason: string;
  readonly notes: readonly string[];
}

export interface SystemTenantsView {
  readonly status: "future_scope";
  readonly reason: string;
  readonly isolationVisibility: readonly {
    readonly workerId: string;
    readonly declaredIsolationModes: readonly string[];
    readonly tenantIsolation: boolean;
    readonly workloadIsolation: boolean;
  }[];
  readonly notes: readonly string[];
}

export interface AgentLifecycleActionView {
  readonly action: AgentLifecycleActionName;
  readonly label: string;
  readonly available: boolean;
  readonly reason?: string;
  readonly requiresConfirmation?: boolean;
}

export interface AgentLifecycleStateView {
  readonly agentId: string;
  readonly currentRevision: number;
  readonly status: GovernedAgentStatus;
  readonly archived: boolean;
  readonly protected: boolean;
  readonly archivedAt?: number;
  readonly restoredAt?: number;
}

export interface AgentDetail {
  readonly agentId: string;
  readonly agentDefinition: AgentDefinition;
  readonly currentRevision: AgentRevision;
  readonly composition?: AgentComposition;
  readonly compositionUnavailableReason?: string;
  readonly readinessSummary: AgentReadinessSummary;
  readonly deploymentSummary: AgentDeploymentSummary;
  readonly runtimeSummary: AgentRuntimeSummary;
  readonly economicSummary: AgentEconomicSummary;
  readonly auditSummary: AgentAuditSummary;
  readonly lifecycleState: AgentLifecycleStateView;
  readonly availableActions: readonly AgentLifecycleActionView[];
  readonly guardrails: AgentSurfaceGuardrails;
  readonly checkedAt: number;
  readonly stale: boolean;
}

export interface AgentRevisionSummary {
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly status: "current" | "adopted" | "historical";
  readonly createdAt: number;
  readonly adoptedAt: number;
  readonly restoredFrom?: number;
  readonly compositionHash?: string;
  readonly changeSummary?: string;
  readonly availableActions: readonly {
    readonly action: "adopt" | "restore";
    readonly available: boolean;
    readonly reason?: string;
  }[];
}

export interface AgentOperationResult {
  readonly ok: boolean;
  readonly operation: string;
  readonly entityType: "agent";
  readonly entityId: string;
  readonly status: string;
  readonly message: string;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly auditRef?: string;
  readonly checkedAt: number;
}

export interface OperationalFinding {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly domain: string;
  readonly component: string;
  readonly message: string;
  readonly recommendedRemediation?: string;
}

export interface OperationalEvidence {
  readonly domain: string;
  readonly component: string;
  readonly status: "ready" | "partial" | "blocked";
  readonly currentState: string;
  readonly requiredState: string;
  readonly evidenceRefs: readonly string[];
}

export interface OperationActionView {
  readonly action: string;
  readonly label: string;
  readonly available: boolean;
  readonly reason?: string;
  readonly requiresConfirmation?: boolean;
  readonly destructive?: boolean;
}

export interface CredentialSummary {
  readonly credentialId: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly status: CredentialConnectionStatus;
  readonly usageCount: number;
  readonly secretRefRedacted: string;
  readonly validated: boolean;
  readonly lastValidatedAt?: number;
  readonly availableActions: readonly OperationActionView[];
  readonly guardrails: ProductApiOperationalGuardrails;
}

export interface ProviderConnectionSummary {
  readonly connectionId: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly credentialId: string;
  readonly health: "healthy" | "degraded" | "unavailable" | "unverified";
  readonly authState: CredentialConnectionStatus;
  readonly availability: "available" | "pending" | "unavailable";
  readonly lastCheckedAt: number;
  readonly errors: readonly string[];
  readonly availableActions: readonly OperationActionView[];
  readonly guardrails: ProductApiOperationalGuardrails;
}

export interface ReadinessCategory {
  readonly id: string;
  readonly label: string;
  readonly status: "ready" | "partial" | "blocked" | "unavailable";
  readonly blockerCount: number;
  readonly warningCount: number;
  readonly findings: readonly OperationalFinding[];
}

export interface AgentReadinessDetail {
  readonly agentId: string;
  readonly agentName: string;
  readonly currentRevisionId: number;
  readonly ready: boolean;
  readonly status: "ready" | "partial" | "blocked" | "unavailable";
  readonly categories: readonly ReadinessCategory[];
  readonly blockers: readonly OperationalFinding[];
  readonly warnings: readonly OperationalFinding[];
  readonly evidence: readonly OperationalEvidence[];
  readonly economicReadinessSummary: AgentEconomicSummary;
  readonly availableActions: readonly OperationActionView[];
  readonly guardrails: AgentSurfaceGuardrails;
  readonly checkedAt: number;
  readonly stale: boolean;
}

export interface DeploymentPlan {
  readonly planId: string;
  readonly agentId: string;
  readonly revisionId: number;
  readonly target: string;
  readonly engine: string;
  readonly provider: string;
  readonly workerRequirements: readonly string[];
  readonly credentialRequirements: readonly string[];
  readonly policyEvaluation: readonly string[];
  readonly sandboxConstraints: readonly string[];
  readonly economicReadinessSummary: AgentEconomicSummary;
  readonly eligible: boolean;
  readonly blockers: readonly OperationalFinding[];
  readonly warnings: readonly OperationalFinding[];
  readonly evidence: readonly OperationalEvidence[];
  readonly availableActions: readonly OperationActionView[];
  readonly createdAt: number;
  readonly expiresAt?: number;
}

export interface ExecutionPlan extends DeploymentPlan {}

export interface DeploymentSummary {
  readonly deploymentId: string;
  readonly agentId: string;
  readonly revisionId: number;
  readonly status: "deployed" | "failed" | "rejected" | "pending" | "stopped";
  readonly target: string;
  readonly engine: string;
  readonly workerId?: string;
  readonly runtimeId?: string;
  readonly active: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastOperation?: string;
  readonly errors: readonly string[];
  readonly availableActions: readonly OperationActionView[];
  readonly guardrails: ProductApiOperationalGuardrails;
}

export interface RuntimeSummary {
  readonly runtimeId: string;
  readonly deploymentId: string;
  readonly agentId: string;
  readonly workerId: string;
  readonly target: string;
  readonly engine: string;
  readonly status: "pending" | "starting" | "running" | "stopping" | "stopped" | "failed" | "terminated";
  readonly health: "healthy" | "degraded" | "unhealthy" | "unknown";
  readonly ageMs: number;
  readonly lastActivityAt?: number;
  readonly isolationState: "isolated" | "shared" | "unknown";
  readonly driftState: "none" | "drifted" | "unknown";
  readonly reconciliationState: "none" | "pending" | "reconciling" | "reconciled" | "failed";
  readonly failureState: "none" | "failed" | "recovering";
  readonly availableActions: readonly OperationActionView[];
  readonly guardrails: ProductApiOperationalGuardrails;
}

export interface ExecutionRunSummary {
  readonly runId: string;
  readonly runtimeId: string;
  readonly deploymentId: string;
  readonly agentId: string;
  readonly revisionId: number;
  readonly workerId: string;
  readonly target: string;
  readonly status: "pending" | "running" | "completed" | "failed" | "cancelled";
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly durationMs?: number;
  readonly resultSummary?: string;
  readonly failureReason?: string;
  readonly availableActions: readonly OperationActionView[];
  readonly guardrails: ProductApiOperationalGuardrails;
}

export interface WorkerSummary {
  readonly workerId: string;
  readonly status: "registered" | "available" | "unavailable" | "degraded" | "stale";
  readonly health: "healthy" | "degraded" | "unhealthy" | "unknown";
  readonly environment: string;
  readonly capabilities: readonly string[];
  readonly capacity: number;
  readonly availableCapacity: number;
  readonly workloadCount: number;
  readonly targetSupport: readonly string[];
  readonly tenantIsolation: boolean;
  readonly workloadIsolation: boolean;
  readonly failureState: "none" | "failed" | "recovering";
  readonly reconciliationState: "none" | "pending" | "reconciling" | "reconciled" | "failed";
  readonly availableActions: readonly OperationActionView[];
  readonly guardrails: ProductApiOperationalGuardrails;
}

export interface WorkerWorkload {
  readonly assignmentId: string;
  readonly executionPlanId: string;
  readonly deploymentId: string;
  readonly runtimeInstanceId: string;
  readonly status: "assigned" | "accepted" | "running" | "completed" | "failed" | "cancelled";
  readonly startedAt: number;
}

export type CompositionActionName =
  | "assignRole"
  | "adoptRole"
  | "assignProfile"
  | "adoptProfile"
  | "assignSkill"
  | "unassignSkill"
  | "installSkill"
  | "removeSkill"
  | "assignTool"
  | "unassignTool"
  | "installPlugin"
  | "removePlugin"
  | "selectEngine"
  | "selectProvider"
  | "selectModel";

export interface CompositionActionView {
  readonly action: CompositionActionName;
  readonly label: string;
  readonly available: false;
  readonly reason: string;
  readonly requiresConfirmation?: boolean;
}

export interface CompositionSummary {
  readonly checkedAt: number;
  readonly stale: false;
  readonly guardrails: ProductApiOperationalGuardrails;
  readonly roleCount: number;
  readonly profileCount: number;
  readonly capabilityCount: number;
  readonly skillCount: number;
  readonly toolCount: number;
  readonly pluginCount: number;
  readonly engineCount: number;
  readonly providerCount: number;
  readonly modelCount?: number;
  readonly warningCount: number;
  readonly missingRequirementCount: number;
  readonly conflictCount: number;
}

export interface RoleSummary {
  readonly roleId: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly revision: number;
  readonly usageCount: number;
  readonly status: string;
  readonly availableActions: readonly CompositionActionView[];
}

export interface ProfileSummary {
  readonly profileId: string;
  readonly name: string;
  readonly description: string;
  readonly openClawCompatible: boolean;
  readonly legacyProfileVisible: boolean;
  readonly sections: readonly string[];
  readonly revision: number;
  readonly usageCount: number;
  readonly status: string;
  readonly availableActions: readonly CompositionActionView[];
}

export interface CapabilitySummary {
  readonly capabilityId: string;
  readonly name: string;
  readonly source: string;
  readonly type: string;
  readonly level?: string;
  readonly requirements: readonly string[];
  readonly conflicts: readonly string[];
  readonly usageCount: number;
  readonly status: string;
}

export interface SkillSummary {
  readonly skillId: string;
  readonly name: string;
  readonly description: string;
  readonly installed: boolean;
  readonly assigned: boolean;
  readonly capabilities: readonly string[];
  readonly requirements: readonly string[];
  readonly compatibility: "compatible" | "unverified" | "unavailable";
  readonly usageCount: number;
  readonly availableActions: readonly CompositionActionView[];
}

export interface ToolSummary {
  readonly toolId: string;
  readonly name: string;
  readonly description: string;
  readonly assigned: boolean;
  readonly capabilities: readonly string[];
  readonly requirements: readonly string[];
  readonly availability: "available" | "unavailable";
  readonly usageCount: number;
  readonly availableActions: readonly CompositionActionView[];
}

export interface PluginSummary {
  readonly pluginId: string;
  readonly packageId: string;
  readonly name: string;
  readonly source: string;
  readonly installed: boolean;
  readonly dependencies: readonly string[];
  readonly compatibility: "compatible" | "unverified" | "unavailable";
  readonly failureState: "none" | "unavailable";
  readonly availableActions: readonly CompositionActionView[];
}

export interface PluginPackage {
  readonly packageId: string;
  readonly name: string;
  readonly source: string;
  readonly version?: string;
  readonly status: "available" | "unavailable";
}

export interface PackageSource {
  readonly sourceId: string;
  readonly name: string;
  readonly type: string;
  readonly status: "available" | "unavailable";
}

export interface EngineSummary {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly capabilities: readonly string[];
  readonly deploymentModes: readonly string[];
  readonly availability: "ready" | "degraded" | "unavailable" | "misconfigured" | "unverified";
  readonly credentialRequired: false;
  readonly compatibility: "compatible" | "unverified";
  readonly usageCount: number;
  readonly availableActions: readonly CompositionActionView[];
}

export interface ProviderSummary {
  readonly id: string;
  readonly name: string;
  readonly type: readonly string[];
  readonly capabilities: readonly string[];
  readonly availability: "available" | "pending" | "unavailable";
  readonly credentialRequired: boolean;
  readonly compatibility: "compatible" | "pending" | "not-configured";
  readonly usageCount: number;
  readonly availableActions: readonly CompositionActionView[];
}

export interface ModelSummary {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly capabilities: readonly string[];
  readonly availability: "available" | "preview" | "deprecated" | "unavailable";
  readonly credentialRequired: boolean;
  readonly compatibility: "compatible" | "pending" | "not-configured";
  readonly usageCount: number;
  readonly availableActions: readonly CompositionActionView[];
}

export interface CapabilitySourceEntry {
  readonly capabilityId: string;
  readonly name: string;
  readonly sources: readonly string[];
  readonly status: string;
}

export interface EffectiveCapabilities {
  readonly agentId: string;
  readonly capabilityIds: readonly string[];
  readonly sources: readonly CapabilitySourceEntry[];
  readonly checkedAt: number;
}

export interface CompatibilityReport {
  readonly agentId: string;
  readonly missingRequirements: readonly CompositionFinding[];
  readonly conflicts: readonly CompositionFinding[];
  readonly warnings: readonly CompositionFinding[];
  readonly ready: boolean;
  readonly checkedAt: number;
}

export interface AgentCompositionDetail {
  readonly agentId: string;
  readonly agentName: string;
  readonly currentRevisionId: number;
  readonly roleSummary?: RoleSummary;
  readonly profileSummary?: ProfileSummary;
  readonly effectiveCapabilities: readonly CapabilitySourceEntry[];
  readonly skills: readonly SkillSummary[];
  readonly tools: readonly ToolSummary[];
  readonly plugins: readonly PluginSummary[];
  readonly engine?: EngineSummary;
  readonly provider?: ProviderSummary;
  readonly model?: ModelSummary;
  readonly compatibilitySummary: CompatibilityReport;
  readonly missingRequirements: readonly CompositionFinding[];
  readonly conflicts: readonly CompositionFinding[];
  readonly readinessSummary: AgentReadinessSummary;
  readonly availableActions: readonly CompositionActionView[];
  readonly guardrails: ProductApiOperationalGuardrails;
  readonly checkedAt: number;
  readonly stale: false;
}

export interface CompositionOperationResult {
  readonly ok: boolean;
  readonly operation: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly status: string;
  readonly message: string;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly auditRef?: string;
  readonly completedAt: number;
}

export interface AgentCreateInput {
  readonly definition: AgentDefinition;
  readonly createdBy?: string;
}

export interface UpdateAgentInput {
  readonly definition: AgentDefinition;
  readonly expectedRevision: number;
  readonly updatedBy?: string;
}

export interface AgentCreateRevisionInput {
  readonly definition: AgentDefinition;
  readonly expectedRevision: number;
  readonly actor?: string;
}

export interface AgentDuplicateInput {
  readonly newAgentId: string;
  readonly name?: string;
  readonly actor?: string;
}

const AGENT_SURFACE_GUARDRAILS: AgentSurfaceGuardrails = {
  inspectionMode: true,
  sandboxOnly: true,
  readOnly: false,
  mutableOperations: true,
  mutationScope: "agent-lifecycle",
  productionReady: false,
  sourceOfTruth: "product-api",
};

const AGENT_ACTION_LABELS: Record<AgentLifecycleActionName, string> = {
  update: "Edit agent",
  createRevision: "Create revision",
  adoptRevision: "Adopt revision",
  restoreRevision: "Restore revision",
  duplicate: "Duplicate agent",
  archive: "Archive agent",
  restore: "Restore agent",
  delete: "Delete agent",
};

const AGENT_OPERATION_MESSAGES: Record<string, string> = {
  create: "Agent created.",
  update: "Agent updated.",
  create_revision: "Revision created.",
  adopt_revision: "Revision adopted.",
  restore_revision: "Revision restored.",
  duplicate: "Agent duplicated.",
  archive: "Agent archived.",
  restore: "Agent restored.",
  delete: "Agent deleted.",
};

function parseRevisionId(value: string): number {
  const match = /^(?:r)?(\d+)$/.exec(value.trim());
  if (!match) {
    throw new AgentLifecycleGuardError(`invalid revision id: ${value}`, {
      code: "INVALID_REVISION_ID",
      reason: "revision id must be a revision number such as r3 or 3",
    });
  }
  const revisionNumber = Number.parseInt(match[1]!, 10);
  if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
    throw new AgentLifecycleGuardError(`invalid revision id: ${value}`, {
      code: "INVALID_REVISION_ID",
      reason: "revision id must be a positive revision number",
    });
  }
  return revisionNumber;
}

export interface DashboardSummary {
  readonly system: {
    readonly service: string;
    readonly status: "ok";
    readonly mode: string;
    readonly automation: string;
    readonly readOnly: true;
    readonly generatedAt: number;
    readonly checkedAt: number;
    readonly stale: boolean;
    readonly refreshWindowMs: number;
    readonly stateAgeMs: number;
    readonly guardrails: ProductApiOperationalGuardrails;
  };
  readonly agents: {
    readonly total: number;
    readonly draft: number;
    readonly active: number;
    readonly disabled: number;
    readonly archived: number;
  };
  readonly deployments: {
    readonly total: number;
    readonly deployed: number;
    readonly failed: number;
    readonly rejected: number;
  };
  readonly runtimes: {
    readonly total: number;
    readonly pending: number;
    readonly starting: number;
    readonly running: number;
    readonly stopping: number;
    readonly stopped: number;
    readonly failed: number;
    readonly terminated: number;
  };
  readonly workers: {
    readonly total: number;
    readonly registered: number;
    readonly available: number;
    readonly degraded: number;
    readonly unavailable: number;
    readonly stale: number;
    readonly activeAssignments: number;
    readonly availableSlots: number;
  };
  readonly executionRuns: {
    readonly total: number;
    readonly pending: number;
    readonly running: number;
    readonly completed: number;
    readonly failed: number;
    readonly cancelled: number;
    readonly recent: readonly ExecutionRunRecord[];
  };
  readonly blockers: readonly DashboardFinding[];
  readonly warnings: readonly DashboardFinding[];
  readonly readiness: ProductApiReadinessLink;
  readonly runtime: {
    readonly connectivity: ProductApiRuntimeConnectivity;
    readonly checkedAt: number;
  };
}

export interface GlobalReadinessSummary {
  readonly generatedAt: number;
  readonly mode: "inspection";
  readonly readOnly: true;
  readonly stale: boolean;
  readonly refreshWindowMs: number;
  readonly stateAgeMs: number;
  readonly guardrails: ProductApiOperationalGuardrails;
  readonly productApi: {
    readonly service: string;
    readonly status: "ok";
    readonly mode: string;
    readonly automation: string;
    readonly checkedAt: number;
    readonly checkMode: "inspection-read-only";
  };
  readonly runtime: {
    readonly connectivity: ProductApiRuntimeConnectivity;
    readonly checkedAt: number;
    readonly engines: readonly {
      readonly id: string;
      readonly provider: string;
      readonly status: string;
    }[];
  };
  readonly healthIndicators: readonly {
    readonly id: string;
    readonly label: string;
    readonly status: ProductApiHealthStatus;
    readonly detail: string;
  }[];
  readonly readinessFlags: readonly {
    readonly id: string;
    readonly label: string;
    readonly status: ProductApiReadinessFlagStatus;
    readonly detail: string;
  }[];
  readonly readiness: {
    readonly devReady: boolean;
    readonly distributedRuntimeReady: boolean;
    readonly productionReady: boolean;
    readonly status: Epic10ReadinessStatus;
    readonly blockerCount: number;
    readonly warningCount: number;
    readonly evidenceCount: number;
    readonly refreshedAt: number;
  };
  readonly components: readonly {
    readonly domain: string;
    readonly status: Epic10ReadinessStatus;
    readonly currentState: string;
    readonly requiredState: string;
  }[];
  readonly blockers: readonly Epic10ReadinessFinding[];
  readonly warnings: readonly Epic10ReadinessFinding[];
  readonly evidence: readonly Epic10ReadinessDomainReport[];
}

export class ProductApiClient {
  readonly #agentService: AgentService | undefined;
  readonly #deploymentService: DeploymentService | undefined;
  readonly #runtimeService: RuntimeLifecycleService | undefined;
  readonly #auditService: AuditService | undefined;
  readonly #targetService: ExecutionTargetService | undefined;
  readonly #economicService: EconomicService | undefined;
  readonly #providerService: ModelProviderService | undefined;
  readonly #operationalEvidence: OperationalEvidenceService;
  readonly #runnerService: AgentRunnerService | undefined;
  readonly #workerRegistry: ExecutionWorkerRegistry | undefined;
  readonly #workerAssignmentService: WorkerAssignmentService | undefined;
  readonly #engineService: EngineService | undefined;
  readonly #compositionResources: CompositionResourceService | undefined;
  readonly #credentialRegistry: CredentialConnectionRegistry | undefined;
  readonly #baseUrl: string | undefined;

  constructor(options: ProductApiClientOptions = {}) {
    this.#agentService = options.agentService;
    this.#deploymentService = options.deploymentService;
    this.#runtimeService = options.runtimeService;
    this.#auditService = options.auditService;
    this.#targetService = options.targetService;
    this.#economicService = options.economicService;
    this.#providerService = options.providerService;
    this.#runnerService = options.runnerService;
    this.#workerRegistry = options.workerRegistry;
    this.#workerAssignmentService = options.workerAssignmentService;
    this.#engineService = options.engineService;
    this.#compositionResources = options.compositionResources;
    this.#credentialRegistry = options.credentialRegistry;
    this.#baseUrl = options.baseUrl;

    this.#operationalEvidence = new OperationalEvidenceService({
      ...(options.auditService ? { auditService: options.auditService } : {}),
      ...(options.economicService ? { economicService: options.economicService } : {}),
      deploymentService: {
        listDeployments: () => options.deploymentService?.listDeployments() ?? [],
      },
      runtimeService: {
        listRuntimes: () => options.runtimeService?.listRuntimes() ?? [],
        listExecutionRuns: () => options.runtimeService?.listExecutionRuns() ?? [],
      },
      agentService: {
        list: () => options.agentService?.list() ?? [],
      },
    });
  }

  async listAgents(): Promise<readonly AgentListItem[]> {
    if (!this.#agentService) {
      return [];
    }
    const checkedAt = Date.now();
    return this.#agentService.list().map((revision) => this.#listItem(revision, checkedAt));
  }

  async getAgent(id: string): Promise<AgentDetail | undefined> {
    if (!this.#agentService) {
      return undefined;
    }
    try {
      return this.#agentDetail(id);
    } catch {
      return undefined;
    }
  }

  async getAgentDetail(agentId: string): Promise<AgentDetail | undefined> {
    return this.getAgent(agentId);
  }

  async getAgentRevisions(agentId: string): Promise<readonly AgentRevisionSummary[]> {
    if (!this.#agentService) {
      return [];
    }
    const current = this.#agentService.get(agentId);
    const lifecycle = this.#agentService.getLifecycleState(agentId);
    return this.#agentService.getRevisionHistory(agentId)
      .map((record) => this.#revisionSummary(record, current.revision, lifecycle.archived));
  }

  async getAgentLifecycle(agentId: string): Promise<AgentLifecycleStateView | undefined> {
    if (!this.#agentService) {
      return undefined;
    }
    try {
      return this.#lifecycleView(this.#agentService.getLifecycleState(agentId));
    } catch {
      return undefined;
    }
  }

  async createAgent(input: AgentCreateInput): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("create", input.definition.agentId, "Agent creation is not supported by this Product API slice.");
    }
    const revision = this.#agentService.create({
      definition: input.definition,
      createdAt: Date.now(),
      ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    });
    return this.#okResult("create", revision);
  }

  async updateAgent(agentId: string, input: UpdateAgentInput): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("update", agentId, "Agent updates are not supported by this Product API slice.");
    }
    const revision = this.#agentService.update(agentId, {
      definition: input.definition,
      expectedRevision: input.expectedRevision,
      updatedAt: Date.now(),
      ...(input.updatedBy ? { updatedBy: input.updatedBy } : {}),
    });
    return this.#okResult("update", revision);
  }

  async createAgentRevision(agentId: string, input: AgentCreateRevisionInput): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("create_revision", agentId, "Revision creation is not supported by this Product API slice.");
    }
    const revision = this.#agentService.createRevision({
      agentId,
      definition: input.definition,
      expectedRevision: input.expectedRevision,
      ...(input.actor ? { actor: input.actor } : {}),
    });
    return this.#okResult("create_revision", revision);
  }

  async adoptAgentRevision(agentId: string, revisionId: string): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("adopt_revision", agentId, "Revision adoption is not supported by this Product API slice.");
    }
    const revision = this.#agentService.adoptRevision(agentId, parseRevisionId(revisionId));
    return this.#okResult("adopt_revision", revision);
  }

  async restoreAgentRevision(agentId: string, revisionId: string): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("restore_revision", agentId, "Revision restore is not supported by this Product API slice.");
    }
    const revision = this.#agentService.restoreRevision(agentId, parseRevisionId(revisionId));
    return this.#okResult("restore_revision", revision);
  }

  async duplicateAgent(agentId: string, input: AgentDuplicateInput): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("duplicate", agentId, "Agent duplication is not supported by this Product API slice.");
    }
    const revision = this.#agentService.duplicateAgent(agentId, input);
    return {
      ...this.#okResult("duplicate", revision),
      entityId: input.newAgentId,
      message: `Agent duplicated as ${input.newAgentId}.`,
    };
  }

  async archiveAgent(agentId: string): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("archive", agentId, "Agent archive is not supported by this Product API slice.");
    }
    const revision = this.#agentService.archiveAgent(agentId);
    return this.#okResult("archive", revision);
  }

  async restoreAgent(agentId: string): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("restore", agentId, "Agent restore is not supported by this Product API slice.");
    }
    const revision = this.#agentService.restoreAgent(agentId);
    return this.#okResult("restore", revision);
  }

  async deleteAgent(agentId: string): Promise<AgentOperationResult> {
    if (!this.#agentService) {
      return this.#unsupportedResult("delete", agentId, "Agent deletion is not supported by this Product API slice.");
    }
    const dependencies = this.#agentDependencies(agentId);
    if (dependencies.length > 0) {
      throw new AgentLifecycleGuardError(`cannot delete agent ${agentId}: referenced by ${dependencies.join(", ")}`, {
        code: "AGENT_DEPENDENCIES_PRESENT",
        reason: dependencies.join(", "),
      });
    }
    const deleted = this.#agentService.deleteAgent(agentId);
    return {
      ok: true,
      operation: "delete",
      entityType: "agent",
      entityId: agentId,
      status: "deleted",
      message: AGENT_OPERATION_MESSAGES.delete ?? "Agent deleted.",
      warnings: [],
      errors: [],
      checkedAt: deleted.deletedAt,
    };
  }

  async listTargets(): Promise<readonly unknown[]> {
    if (this.#targetService) {
      await this.#targetService.refresh();
      return this.#targetService.list();
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

  // --- Milestone E: Operational Evidence & Economics ---

  async listEvents(query?: EventsQuery): Promise<readonly EventSummary[]> {
    return this.#operationalEvidence.listEvents(query ?? {});
  }

  async getEventDetail(eventId: string): Promise<EventSummary | undefined> {
    return this.#operationalEvidence.getEventDetail(eventId);
  }

  async listLogs(query?: EventsQuery): Promise<readonly LogSummary[]> {
    return this.#operationalEvidence.listLogs(query ?? {});
  }

  async getLogAvailability(): Promise<LogAvailability> {
    return this.#operationalEvidence.getLogAvailability();
  }

  async listAuditEntries(query?: AuditQuery): Promise<readonly AuditEntry[]> {
    return this.#operationalEvidence.listAuditEntries(query ?? {});
  }

  async getAuditEntry(auditId: string): Promise<AuditEntry | undefined> {
    return this.#operationalEvidence.getAuditEntry(auditId);
  }

  async listEvidence(query?: EvidenceQuery): Promise<readonly EvidenceRecord[]> {
    return this.#operationalEvidence.listEvidence(query ?? {});
  }

  async getEvidenceDetail(evidenceId: string): Promise<EvidenceRecord | undefined> {
    return this.#operationalEvidence.getEvidenceDetail(evidenceId);
  }

  async listDiagnostics(query?: EvidenceQuery): Promise<readonly DiagnosticReport[]> {
    return this.#operationalEvidence.listDiagnostics(query);
  }

  async getDiagnosticDetail(diagnosticId: string): Promise<DiagnosticReport | undefined> {
    return this.#operationalEvidence.getDiagnosticDetail(diagnosticId);
  }

  async listAgentEvidence(agentId: string): Promise<readonly EvidenceRecord[]> {
    return this.#operationalEvidence.listEvidence({ agentId });
  }

  async listDeploymentEvidence(deploymentId: string): Promise<readonly EvidenceRecord[]> {
    return this.#operationalEvidence.listEvidence({ deploymentId });
  }

  async listRuntimeEvidence(runtimeId: string): Promise<readonly EvidenceRecord[]> {
    return this.#operationalEvidence.listEvidence({ runtimeId });
  }

  async listWorkerEvidence(workerId: string): Promise<readonly EvidenceRecord[]> {
    return this.#operationalEvidence.listEvidence({});
  }

  async listExecutionRunEvidence(runId: string): Promise<readonly EvidenceRecord[]> {
    return this.#operationalEvidence.listEvidence({ executionRunId: runId });
  }

  async listReadinessEvidence(): Promise<readonly EvidenceRecord[]> {
    return this.#operationalEvidence.listEvidence({ limit: 1000 });
  }

  // --- Entity-scoped events ---

  async listAgentEvents(agentId: string): Promise<readonly EventSummary[]> {
    return this.#operationalEvidence.listEvents({ agentId });
  }

  async listDeploymentEvents(deploymentId: string): Promise<readonly EventSummary[]> {
    return this.#operationalEvidence.listEvents({ deploymentId });
  }

  async listRuntimeEvents(runtimeId: string): Promise<readonly EventSummary[]> {
    return this.#operationalEvidence.listEvents({ runtimeId });
  }

  async listWorkerEvents(workerId: string): Promise<readonly EventSummary[]> {
    return this.#operationalEvidence.listEvents({ workerId });
  }

  async listExecutionRunEvents(runId: string): Promise<readonly EventSummary[]> {
    return this.#operationalEvidence.listEvents({ executionRunId: runId });
  }

  // --- Entity-scoped audit ---

  async listAgentAudit(agentId: string): Promise<readonly AuditEntry[]> {
    return this.#operationalEvidence.listAuditEntries({ agentId });
  }

  async listDeploymentAudit(deploymentId: string): Promise<readonly AuditEntry[]> {
    return this.#operationalEvidence.listAuditEntries({ deploymentId });
  }

  async listRuntimeAudit(runtimeId: string): Promise<readonly AuditEntry[]> {
    return this.#operationalEvidence.listAuditEntries({ runtimeId });
  }

  async listWorkerAudit(workerId: string): Promise<readonly AuditEntry[]> {
    return this.#operationalEvidence.listAuditEntries({ workerId });
  }

  async listExecutionRunAudit(runId: string): Promise<readonly AuditEntry[]> {
    return this.#operationalEvidence.listAuditEntries({ executionRunId: runId });
  }

  async listEconomicAudit(): Promise<readonly AuditEntry[]> {
    return this.#operationalEvidence.listEconomicAudit();
  }

  async getEconomicSummary(query?: EconomicQuery): Promise<EconomicSummary> {
    return this.#operationalEvidence.getEconomicSummary(query);
  }

  async getAgentEconomics(agentId: string): Promise<EconomicSummary> {
    return this.#operationalEvidence.getAgentEconomics(agentId);
  }

  async getDeploymentEconomics(deploymentId: string): Promise<EconomicSummary> {
    return this.#operationalEvidence.getDeploymentEconomics(deploymentId);
  }

  async getRuntimeEconomics(runtimeId: string): Promise<EconomicSummary> {
    return this.#operationalEvidence.getRuntimeEconomics(runtimeId);
  }

  async getExecutionRunEconomics(runId: string): Promise<EconomicSummary> {
    return this.#operationalEvidence.getExecutionRunEconomics(runId);
  }

  async listQuotes(query?: QuoteQuery): Promise<readonly Quote[]> {
    return this.#operationalEvidence.listQuotes(query);
  }

  async getQuoteDetail(quoteId: string): Promise<Quote | undefined> {
    return this.#operationalEvidence.getQuoteDetail(quoteId);
  }

  async listReservations(query?: ReservationQuery): Promise<readonly Reservation[]> {
    return this.#operationalEvidence.listReservations(query);
  }

  async getReservationDetail(reservationId: string): Promise<Reservation | undefined> {
    return this.#operationalEvidence.getReservationDetail(reservationId);
  }

  async listAgentQuotes(agentId: string): Promise<readonly Quote[]> {
    return this.#operationalEvidence.listAgentQuotes(agentId);
  }

  async getExecutionRunReservation(runId: string): Promise<Reservation | undefined> {
    return this.#operationalEvidence.getExecutionRunReservation(runId);
  }

  async listMeteringRecords(query?: MeteringQuery): Promise<readonly MeteringRecord[]> {
    return this.#operationalEvidence.listMeteringRecords(query);
  }

  async getMeteringRecord(meterId: string): Promise<MeteringRecord | undefined> {
    return this.#operationalEvidence.getMeteringRecord(meterId);
  }

  async listSettlements(query?: SettlementQuery): Promise<readonly Settlement[]> {
    return this.#operationalEvidence.listSettlements(query);
  }

  async getSettlementDetail(settlementId: string): Promise<Settlement | undefined> {
    return this.#operationalEvidence.getSettlementDetail(settlementId);
  }

  async listReceipts(query?: ReceiptQuery): Promise<readonly Receipt[]> {
    return this.#operationalEvidence.listReceipts(query);
  }

  async getReceiptDetail(receiptId: string): Promise<Receipt | undefined> {
    return this.#operationalEvidence.getReceiptDetail(receiptId);
  }

  async getExecutionRunMetering(runId: string): Promise<readonly MeteringRecord[]> {
    return this.#operationalEvidence.getExecutionRunMetering(runId);
  }

  async getExecutionRunSettlement(runId: string): Promise<Settlement | undefined> {
    return this.#operationalEvidence.getExecutionRunSettlement(runId);
  }

  async createAgentQuote(agentId: string): Promise<{ ok: boolean; operation: string; entityType: string; entityId: string; status: string; message: string }> {
    return this.#operationalEvidence.createAgentQuote(agentId, {});
  }

  async reserveQuote(quoteId: string): Promise<{ ok: boolean; operation: string; entityType: string; entityId: string; status: string; message: string }> {
    return this.#operationalEvidence.reserveQuote(quoteId);
  }

  async cancelReservation(reservationId: string): Promise<{ ok: boolean; operation: string; entityType: string; entityId: string; status: string; message: string }> {
    return this.#operationalEvidence.cancelReservation(reservationId);
  }

  async settleMeteringRecord(meterId: string): Promise<{ ok: boolean; operation: string; entityType: string; entityId: string; status: string; message: string }> {
    return this.#operationalEvidence.settleMeteringRecord(meterId);
  }

  async listCredentials(): Promise<readonly CredentialSummary[]> {
    const connections = this.#credentialRegistry?.list() ?? [];
    return connections.map((connection) => this.#credentialSummary(connection));
  }

  async getCredentialDetail(credentialId: string): Promise<CredentialSummary | undefined> {
    try {
      const connection = this.#credentialRegistry?.get(credentialId);
      return connection ? this.#credentialSummary(connection) : undefined;
    } catch {
      return undefined;
    }
  }

  async listProviderConnections(): Promise<readonly ProviderConnectionSummary[]> {
    const connections = this.#credentialRegistry?.list() ?? [];
    return connections.map((connection) => this.#providerConnectionSummary(connection));
  }

  async getProviderConnectionDetail(connectionId: string): Promise<ProviderConnectionSummary | undefined> {
    try {
      const connection = this.#credentialRegistry?.get(connectionId);
      return connection ? this.#providerConnectionSummary(connection) : undefined;
    } catch {
      return undefined;
    }
  }

  async getAgentReadiness(agentId: string): Promise<AgentReadinessDetail | undefined> {
    const detail = await this.getAgent(agentId);
    if (!detail) return undefined;
    return {
      agentId,
      agentName: detail.agentDefinition.name,
      currentRevisionId: detail.currentRevision.revision,
      ready: detail.readinessSummary.state === "ready",
      status: detail.readinessSummary.state,
      categories: [
        { id: "composition", label: "Composition", status: detail.composition ? "ready" : "unavailable", blockerCount: detail.composition?.findings.length ?? 0, warningCount: 0, findings: [] },
        { id: "policy", label: "Policy", status: "unavailable", blockerCount: 0, warningCount: 0, findings: [] },
      ],
      blockers: [],
      warnings: [],
      evidence: [],
      economicReadinessSummary: detail.economicSummary,
      availableActions: [{ action: "recheck", label: "Recheck readiness", available: false, reason: "Governed by Product API", requiresConfirmation: false }],
      guardrails: detail.guardrails,
      checkedAt: detail.checkedAt,
      stale: detail.stale,
    };
  }

  async getAgentDeploymentPlan(agentId: string): Promise<DeploymentPlan | undefined> {
    const detail = await this.getAgent(agentId);
    if (!detail) return undefined;
    return {
      planId: `plan-${agentId}`,
      agentId,
      revisionId: detail.currentRevision.revision,
      target: "sandbox-target",
      engine: "openclaw",
      provider: detail.agentDefinition.modelStrategy?.primary.providerId ?? "unknown",
      workerRequirements: ["sandbox worker"],
      credentialRequirements: detail.agentDefinition.credentialConnectionIds,
      policyEvaluation: ["governed by Product API"],
      sandboxConstraints: ["sandbox-only"],
      economicReadinessSummary: detail.economicSummary,
      eligible: detail.readinessSummary.state === "ready",
      blockers: [],
      warnings: [],
      evidence: [],
      availableActions: [],
      createdAt: detail.checkedAt,
    };
  }

  async getAgentExecutionPlan(agentId: string): Promise<ExecutionPlan | undefined> {
    return this.getAgentDeploymentPlan(agentId);
  }

  async listDeploymentSummaries(): Promise<readonly DeploymentSummary[]> {
    return (this.#deploymentService?.listDeployments() ?? []).map((deployment) => this.#deploymentRecordSummary(deployment));
  }

  async getDeploymentSummary(deploymentId: string): Promise<DeploymentSummary | undefined> {
    const deployment = this.#deploymentService?.getDeployment(deploymentId);
    return deployment ? this.#deploymentRecordSummary(deployment) : undefined;
  }

  async listAgentDeploymentSummaries(agentId: string): Promise<readonly DeploymentSummary[]> {
    return (this.#deploymentService?.listDeployments() ?? [])
      .filter((deployment) => deployment.agentId === agentId)
      .map((deployment) => this.#deploymentRecordSummary(deployment));
  }

  async listRuntimeSummaries(): Promise<readonly RuntimeSummary[]> {
    return (this.#runtimeService?.listRuntimes() ?? []).map((runtime) => this.#runtimeRecordSummary(runtime));
  }

  async getRuntimeSummary(runtimeId: string): Promise<RuntimeSummary | undefined> {
    const runtime = (this.#runtimeService?.listRuntimes() ?? []).find((entry) => entry.runtimeInstanceId === runtimeId);
    return runtime ? this.#runtimeRecordSummary(runtime) : undefined;
  }

  async listExecutionRunSummaries(): Promise<readonly ExecutionRunSummary[]> {
    return (this.#runtimeService?.listExecutionRuns() ?? []).map((run) => this.#executionRunRecordSummary(run));
  }

  async getExecutionRunSummary(runId: string): Promise<ExecutionRunSummary | undefined> {
    const run = (this.#runtimeService?.listExecutionRuns() ?? []).find((entry) => entry.runId === runId);
    return run ? this.#executionRunRecordSummary(run) : undefined;
  }

  async listAgentExecutionRunSummaries(agentId: string): Promise<readonly ExecutionRunSummary[]> {
    return (this.#runtimeService?.listExecutionRuns() ?? [])
      .filter((run) => run.agentId === agentId)
      .map((run) => this.#executionRunRecordSummary(run));
  }

  async listWorkerSummaries(): Promise<readonly WorkerSummary[]> {
    return (this.#workerRegistry?.list() ?? []).map((worker) => this.#workerRecordSummary(worker));
  }

  async getWorkerSummary(workerId: string): Promise<WorkerSummary | undefined> {
    try {
      const worker = this.#workerRegistry?.get(workerId);
      return worker ? this.#workerRecordSummary(worker) : undefined;
    } catch {
      return undefined;
    }
  }

  async listWorkerWorkloads(workerId: string): Promise<readonly WorkerWorkload[]> {
    return (this.#workerAssignmentService?.listAssignments() ?? [])
      .filter((assignment) => assignment.workerId === workerId)
      .map((assignment) => ({
        assignmentId: assignment.assignmentId,
        executionPlanId: assignment.executionPlanId,
        deploymentId: assignment.deploymentId,
        runtimeInstanceId: assignment.runtimeInstanceId,
        status: assignment.status,
        startedAt: assignment.assignedAt,
      }));
  }

  async getCompositionSummary(): Promise<CompositionSummary> {
    const checkedAt = Date.now();
    const models = await this.listModels();
    const roleCount = this.#compositionResources?.listRoles().length ?? 0;
    const profileCount = this.#compositionResources?.listProfiles().length ?? 0;
    const capabilityCount = this.#compositionResources?.listCapabilities().length ?? 0;
    const skillCount = this.#compositionResources?.listSkills().length ?? 0;
    const toolCount = this.#compositionResources?.listTools().length ?? 0;
    const engineCount = this.#engineService?.listEngines().length ?? 0;
    const providerCount = this.#providerService?.listProviders().length ?? 0;
    const findings = this.#compositionFindingsAggregate();
    return {
      checkedAt,
      stale: false,
      guardrails: OPERATIONAL_GUARDRAILS,
      roleCount,
      profileCount,
      capabilityCount,
      skillCount,
      toolCount,
      pluginCount: 0,
      engineCount,
      providerCount,
      ...(models.length > 0 ? { modelCount: models.length } : {}),
      warningCount: findings.warningCount,
      missingRequirementCount: findings.missingRequirementCount,
      conflictCount: findings.conflictCount,
    };
  }

  async listRoles(): Promise<readonly RoleSummary[]> {
    if (!this.#compositionResources) {
      return [];
    }
    return this.#compositionResources.listRoles().map((role) => this.#roleSummary(role));
  }

  async getRoleDetail(roleId: string): Promise<RoleSummary> {
    if (!this.#compositionResources) {
      throw new NotFoundError("role", roleId);
    }
    return this.#roleSummary(this.#compositionResources.getRole(roleId));
  }

  async listProfiles(): Promise<readonly ProfileSummary[]> {
    if (!this.#compositionResources) {
      return [];
    }
    return this.#compositionResources.listProfiles().map((profile) => this.#profileSummary(profile));
  }

  async getProfileDetail(profileId: string): Promise<ProfileSummary> {
    if (!this.#compositionResources) {
      throw new NotFoundError("profile", profileId);
    }
    return this.#profileSummary(this.#compositionResources.getProfile(profileId));
  }

  async listCapabilities(): Promise<readonly CapabilitySummary[]> {
    if (!this.#compositionResources) {
      return [];
    }
    return this.#compositionResources.listCapabilities().map((capability) => this.#capabilitySummary(capability));
  }

  async getCapabilityDetail(capabilityId: string): Promise<CapabilitySummary> {
    if (!this.#compositionResources) {
      throw new NotFoundError("capability", capabilityId);
    }
    return this.#capabilitySummary(this.#compositionResources.getCapability(capabilityId));
  }

  async listSkills(): Promise<readonly SkillSummary[]> {
    if (!this.#compositionResources) {
      return [];
    }
    return this.#compositionResources.listSkills().map((skill) => this.#skillSummary(skill, false));
  }

  async getSkillDetail(skillId: string): Promise<SkillSummary> {
    if (!this.#compositionResources) {
      throw new NotFoundError("skill", skillId);
    }
    return this.#skillSummary(this.#compositionResources.getSkill(skillId), false);
  }

  async listTools(): Promise<readonly ToolSummary[]> {
    if (!this.#compositionResources) {
      return [];
    }
    return this.#compositionResources.listTools().map((tool) => this.#toolSummary(tool, false));
  }

  async getToolDetail(toolId: string): Promise<ToolSummary> {
    if (!this.#compositionResources) {
      throw new NotFoundError("tool", toolId);
    }
    return this.#toolSummary(this.#compositionResources.getTool(toolId), false);
  }

  async listPlugins(): Promise<readonly PluginSummary[]> {
    return [];
  }

  async getPluginDetail(pluginId: string): Promise<PluginSummary> {
    throw new NotFoundError("plugin", pluginId);
  }

  async listPluginPackages(): Promise<readonly PluginPackage[]> {
    return [];
  }

  async listPackageSources(): Promise<readonly PackageSource[]> {
    return [];
  }

  async listEngines(): Promise<readonly EngineSummary[]> {
    if (!this.#engineService) {
      return [];
    }
    const summaries: EngineSummary[] = [];
    for (const engine of this.#engineService.listEngines()) {
      summaries.push(await this.#engineSummary(engine));
    }
    return summaries;
  }

  async getEngineDetail(engineId: string): Promise<EngineSummary> {
    if (!this.#engineService) {
      throw new NotFoundError("engine", engineId);
    }
    return this.#engineSummary(this.#engineService.getEngine(engineId));
  }

  async listProviders(): Promise<readonly ProviderSummary[]> {
    if (!this.#providerService) {
      return [];
    }
    const summaries: ProviderSummary[] = [];
    for (const provider of this.#providerService.listProviders()) {
      summaries.push(await this.#providerSummary(provider));
    }
    return summaries;
  }

  async getProviderDetail(providerId: string): Promise<ProviderSummary> {
    if (!this.#providerService) {
      throw new NotFoundError("provider", providerId);
    }
    return this.#providerSummary(this.#providerService.getProvider(providerId));
  }

  async listModels(): Promise<readonly ModelSummary[]> {
    if (!this.#providerService) {
      return [];
    }
    const models: ModelSummary[] = [];
    for (const provider of this.#providerService.listProviders()) {
      let definitions: readonly ModelDefinition[] = [];
      try {
        definitions = await this.#providerService.listModels(provider.id);
      } catch {
        // Provider model catalogs may be temporarily unresolvable (e.g. pending
        // credential). The Product API reports absence instead of fabricating
        // model support.
        definitions = [];
      }
      for (const definition of definitions) {
        models.push(this.#modelSummary(definition, provider.id));
      }
    }
    return models.sort((left, right) => left.id.localeCompare(right.id));
  }

  async getAgentComposition(agentId: string): Promise<AgentCompositionDetail | undefined> {
    if (!this.#agentService || !this.#compositionResources) {
      return undefined;
    }
    let result: AgentCompositionResult;
    try {
      result = this.#agentService.compose(agentId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return undefined;
      }
      throw error;
    }
    return this.#agentCompositionDetail(agentId, result);
  }

  async getAgentEffectiveCapabilities(agentId: string): Promise<EffectiveCapabilities | undefined> {
    const detail = await this.getAgentComposition(agentId);
    if (!detail) {
      return undefined;
    }
    return {
      agentId,
      capabilityIds: detail.effectiveCapabilities.map((entry) => entry.capabilityId),
      sources: detail.effectiveCapabilities,
      checkedAt: detail.checkedAt,
    };
  }

  async getAgentCompositionCompatibility(agentId: string): Promise<CompatibilityReport | undefined> {
    const detail = await this.getAgentComposition(agentId);
    return detail?.compatibilitySummary;
  }

  #listItem(revision: AgentRevision, checkedAt: number): AgentListItem {
    const composition = this.#compositionSummary(revision.agentId);
    return {
      agentId: revision.agentId,
      name: revision.definition.name,
      status: revision.definition.status,
      environment: "sandbox",
      currentRevisionId: revision.revision,
      compositionSummary: composition.summary,
      readinessSummary: composition.readiness,
      deploymentSummary: this.#deploymentSummary(revision.agentId),
      runtimeSummary: this.#runtimeSummary(revision.agentId),
      archived: revision.definition.status === "archived",
      updatedAt: revision.updatedAt,
      checkedAt,
    };
  }

  #agentDetail(agentId: string): AgentDetail {
    const service = this.#agentService;
    if (!service) {
      throw new Error("AgentService not configured");
    }
    const checkedAt = Date.now();
    const current = service.get(agentId);
    const lifecycle = service.getLifecycleState(agentId);
    const composition = this.#compositionSummary(agentId);
    return {
      agentId,
      agentDefinition: current.definition,
      currentRevision: current,
      ...(composition.composition ? { composition: composition.composition } : {}),
      ...(composition.unavailableReason ? { compositionUnavailableReason: composition.unavailableReason } : {}),
      readinessSummary: composition.readiness,
      deploymentSummary: this.#deploymentSummary(agentId),
      runtimeSummary: this.#runtimeSummary(agentId),
      economicSummary: {
        state: "unavailable",
        message: "Economic summaries are not exposed per agent in this slice.",
      },
      auditSummary: this.#auditSummary(agentId),
      lifecycleState: this.#lifecycleView(lifecycle),
      availableActions: this.#actionsWithDependencyReasons(lifecycle.availableActions, agentId),
      guardrails: AGENT_SURFACE_GUARDRAILS,
      checkedAt,
      stale: false,
    };
  }

  #compositionSummary(agentId: string): {
    readonly summary: AgentCompositionSummary;
    readonly readiness: AgentReadinessSummary;
    readonly composition?: AgentComposition;
    readonly unavailableReason?: string;
  } {
    try {
      const result = this.#agentService!.compose(agentId);
      const errorCount = result.composition.findings.filter((finding) => finding.severity === "error").length;
      const warningCount = result.composition.findings.filter((finding) => finding.severity === "warning").length;
      return {
        summary: { ready: result.composition.ready, errorCount, warningCount },
        readiness: {
          state: result.composition.ready ? "ready" : errorCount > 0 ? "blocked" : "partial",
          blockerCount: errorCount,
          warningCount,
        },
        composition: result.composition,
      };
    } catch {
      return {
        summary: { ready: false, errorCount: 1, warningCount: 0 },
        readiness: { state: "blocked", blockerCount: 1, warningCount: 0 },
        unavailableReason: "Composition could not be resolved by the Product API.",
      };
    }
  }

  #deploymentSummary(agentId: string): AgentDeploymentSummary {
    const deployments = (this.#deploymentService?.listDeployments() ?? []).filter((entry) => entry.agentId === agentId);
    const state: AgentDeploymentSummary["state"] = deployments.length === 0
      ? "none"
      : deployments.some((entry) => entry.status === "deployed")
        ? "deployed"
        : deployments.some((entry) => entry.status === "failed")
          ? "failed"
          : "rejected";
    return { state, count: deployments.length };
  }

  #runtimeSummary(agentId: string): AgentRuntimeSummary {
    const runtimes = (this.#runtimeService?.listRuntimes() ?? []).filter((entry) => entry.agentId === agentId);
    const state: AgentRuntimeSummary["state"] = runtimes.length === 0
      ? "none"
      : runtimes.some((entry) => entry.status === "running")
        ? "running"
        : runtimes.some((entry) => entry.status === "failed")
          ? "failed"
          : runtimes.some((entry) => entry.status === "stopped" || entry.status === "terminated")
            ? "stopped"
            : "other";
    return { state, count: runtimes.length };
  }

  #credentialSummary(connection: CredentialConnection): CredentialSummary {
    return {
      credentialId: connection.id,
      providerId: connection.providerId,
      providerName: connection.providerId,
      status: connection.status,
      usageCount: this.#credentialRegistry?.listByProvider(connection.providerId).length ?? 0,
      secretRefRedacted: connection.secretRef ? `redacted:${connection.secretRef.id}` : "redacted:unavailable",
      validated: connection.status === "valid" || connection.status === "active",
      ...(connection.lastVerifiedAt ? { lastValidatedAt: connection.lastVerifiedAt } : {}),
      availableActions: [],
      guardrails: OPERATIONAL_GUARDRAILS,
    };
  }

  #providerConnectionSummary(connection: CredentialConnection): ProviderConnectionSummary {
    const health = connection.status === "valid" || connection.status === "active"
      ? "healthy"
      : connection.status === "degraded"
        ? "degraded"
        : connection.status === "pending" || connection.status === "configured"
          ? "unverified"
          : "unavailable";
    return {
      connectionId: connection.id,
      providerId: connection.providerId,
      providerName: connection.providerId,
      credentialId: connection.id,
      health,
      authState: connection.status,
      availability: connection.status === "active" || connection.status === "valid" ? "available" : connection.status === "pending" ? "pending" : "unavailable",
      lastCheckedAt: connection.lastVerifiedAt ?? connection.updatedAt,
      errors: [],
      availableActions: [],
      guardrails: OPERATIONAL_GUARDRAILS,
    };
  }

  #deploymentRecordSummary(deployment: DeploymentRecord): DeploymentSummary {
    return {
      deploymentId: deployment.deploymentId,
      agentId: deployment.agentId,
      revisionId: deployment.revision,
      status: deployment.status,
      target: deployment.targetId,
      engine: "openclaw",
      active: deployment.status === "deployed",
      createdAt: deployment.createdAt,
      updatedAt: deployment.createdAt,
      errors: deployment.status === "failed" ? ["deployment failed"] : [],
      availableActions: [],
      guardrails: OPERATIONAL_GUARDRAILS,
      ...(deployment.reservationId ? { lastOperation: "reserved" } : {}),
    };
  }

  #runtimeRecordSummary(runtime: RuntimeInstanceRecord): RuntimeSummary {
    return {
      runtimeId: runtime.runtimeInstanceId,
      deploymentId: runtime.deploymentId,
      agentId: runtime.agentId ?? "unknown",
      workerId: "unknown",
      target: runtime.targetId,
      engine: "openclaw",
      status: runtime.status,
      health: runtime.status === "running" ? "healthy" : runtime.status === "failed" ? "unhealthy" : "unknown",
      ageMs: Math.max(0, Date.now() - runtime.updatedAt),
      lastActivityAt: runtime.updatedAt,
      isolationState: "unknown",
      driftState: "unknown",
      reconciliationState: runtime.status === "running" ? "reconciled" : "none",
      failureState: runtime.status === "failed" ? "failed" : "none",
      availableActions: [],
      guardrails: OPERATIONAL_GUARDRAILS,
    };
  }

  #executionRunRecordSummary(run: ExecutionRunRecord): ExecutionRunSummary {
    return {
      runId: run.runId,
      runtimeId: run.runtimeInstanceId,
      deploymentId: "unknown",
      agentId: run.agentId,
      revisionId: 0,
      workerId: "unknown",
      target: "unknown",
      status: run.status,
      startedAt: run.startedAt,
      ...(run.completedAt ? { endedAt: run.completedAt, durationMs: run.completedAt - run.startedAt } : {}),
      ...(run.status === "completed" ? { resultSummary: "completed" } : {}),
      ...(run.status === "failed" ? { failureReason: "execution failed" } : {}),
      availableActions: [],
      guardrails: OPERATIONAL_GUARDRAILS,
    };
  }

  #workerRecordSummary(worker: import("../workers/worker-registry.js").RegisteredWorker): WorkerSummary {
    return {
      workerId: worker.canonicalId,
      status: worker.status,
      health: worker.health.status === "healthy" ? "healthy" : worker.health.status === "degraded" ? "degraded" : "unhealthy",
      environment: "sandbox",
      capabilities: [worker.capabilities.engineId, ...worker.capabilities.supportedRunners],
      capacity: worker.capacity.maxConcurrentRuns,
      availableCapacity: worker.capacity.availableSlots,
      workloadCount: worker.capacity.activeRuns,
      targetSupport: worker.targetCompatibility.map((target) => target.executionTargetId),
      tenantIsolation: false,
      workloadIsolation: false,
      failureState: worker.health.status === "unavailable" ? "failed" : "none",
      reconciliationState: worker.stale ? "pending" : "reconciled",
      availableActions: [],
      guardrails: OPERATIONAL_GUARDRAILS,
    };
  }

  #auditSummary(agentId: string): AgentAuditSummary {
    const events = [...(this.#auditService?.queryEvents({ agentId }) ?? [])]
      .sort((left, right) => right.timestamp - left.timestamp);
    return {
      total: events.length,
      success: events.filter((event) => event.result === "success").length,
      failure: events.filter((event) => event.result === "failure").length,
      pending: events.filter((event) => event.result === "pending").length,
      recent: events.slice(0, 5),
    };
  }

  #revisionSummary(
    record: AgentRevisionHistoryRecord,
    currentRevision: number,
    archived: boolean,
  ): AgentRevisionSummary {
    const revisionNumber = record.revision.revision;
    const isCurrent = revisionNumber === currentRevision;
    const blockedReason = isCurrent
      ? "This is the current revision."
      : archived
        ? "Archived agents cannot change revisions."
        : undefined;
    return {
      revisionId: `r${revisionNumber}`,
      revisionNumber,
      status: isCurrent ? "current" : "adopted",
      createdAt: record.revision.createdAt,
      adoptedAt: record.adoptedAt,
      ...(record.restoredFrom !== undefined ? { restoredFrom: record.restoredFrom } : {}),
      compositionHash: record.revision.fingerprint,
      ...(record.changeSummary ? { changeSummary: record.changeSummary } : {}),
      availableActions: [
        {
          action: "adopt",
          available: !isCurrent && !archived,
          ...(blockedReason ? { reason: blockedReason } : {}),
        },
        {
          action: "restore",
          available: !isCurrent && !archived,
          ...(blockedReason ? { reason: blockedReason } : {}),
        },
      ],
    };
  }

  #lifecycleView(state: AgentLifecycleState): AgentLifecycleStateView {
    return {
      agentId: state.agentId,
      currentRevision: state.currentRevision,
      status: state.status,
      archived: state.archived,
      protected: state.protected,
      ...(state.archivedAt !== undefined ? { archivedAt: state.archivedAt } : {}),
      ...(state.restoredAt !== undefined ? { restoredAt: state.restoredAt } : {}),
    };
  }

  #actionsWithDependencyReasons(
    actions: readonly AgentLifecycleActionAvailability[],
    agentId: string,
  ): readonly AgentLifecycleActionView[] {
    const dependencies = this.#agentDependencies(agentId);
    return actions.map((entry) => {
      const label = AGENT_ACTION_LABELS[entry.action];
      if (entry.action === "delete" && entry.available && dependencies.length > 0) {
        return {
          ...entry,
          label,
          available: false,
          reason: `Cannot delete: referenced by ${dependencies.join(", ")}.`,
        };
      }
      return { ...entry, label };
    });
  }

  #agentDependencies(agentId: string): readonly string[] {
    const references: string[] = [];
    for (const deployment of this.#deploymentService?.listDeployments() ?? []) {
      if (deployment.agentId === agentId) {
        references.push(`deployment:${deployment.deploymentId}`);
      }
    }
    for (const runtime of this.#runtimeService?.listRuntimes() ?? []) {
      if (runtime.agentId === agentId) {
        references.push(`runtime:${runtime.runtimeInstanceId}`);
      }
    }
    return references;
  }

  #okResult(operation: string, revision: AgentRevision): AgentOperationResult {
    return {
      ok: true,
      operation,
      entityType: "agent",
      entityId: revision.agentId,
      status: revision.definition.status,
      message: AGENT_OPERATION_MESSAGES[operation] ?? `Operation ${operation} completed.`,
      warnings: [],
      errors: [],
      checkedAt: Date.now(),
    };
  }

  #unsupportedResult(operation: string, entityId: string, message: string): AgentOperationResult {
    return {
      ok: false,
      operation,
      entityType: "agent",
      entityId,
      status: "unsupported",
      message,
      warnings: ["Governed by Product API"],
      errors: [message],
      checkedAt: Date.now(),
    };
  }

  #compositionFindingsAggregate(): {
    readonly warningCount: number;
    readonly missingRequirementCount: number;
    readonly conflictCount: number;
  } {
    if (!this.#agentService) {
      return { warningCount: 0, missingRequirementCount: 0, conflictCount: 0 };
    }
    let warningCount = 0;
    let missingRequirementCount = 0;
    for (const revision of this.#agentService.list()) {
      try {
        const composition = this.#agentService.compose(revision.agentId).composition;
        warningCount += composition.findings.filter((finding) => finding.severity === "warning").length;
        missingRequirementCount += composition.findings.filter((finding) => finding.severity === "error").length;
      } catch {
        missingRequirementCount += 1;
      }
    }
    // Conflict findings are not produced by the composition domains in this
    // milestone; the Product API reports zero rather than inventing conflicts.
    return { warningCount, missingRequirementCount, conflictCount: 0 };
  }

  #usageCount(predicate: (definition: AgentDefinition) => boolean): number {
    if (!this.#agentService) {
      return 0;
    }
    return this.#agentService.list().filter((revision) => predicate(revision.definition)).length;
  }

  #roleUsageCount(roleId: string): number {
    return this.#usageCount((definition) => definition.roleId === roleId);
  }

  #profileUsageCount(profileId: string): number {
    return this.#usageCount((definition) => definition.profileId === profileId);
  }

  #capabilityUsageCount(capabilityId: string): number {
    if (!this.#agentService) {
      return 0;
    }
    let count = 0;
    for (const revision of this.#agentService.list()) {
      try {
        if (this.#agentService.compose(revision.agentId).composition.effective.capabilityIds.includes(capabilityId)) {
          count += 1;
        }
      } catch {
        // Unresolvable compositions surface through findings, not usage.
      }
    }
    return count;
  }

  #skillUsageCount(skillId: string): number {
    return this.#usageCount((definition) => definition.skillIds.includes(skillId));
  }

  #toolUsageCount(toolId: string): number {
    return this.#usageCount((definition) => definition.toolIds.includes(toolId));
  }

  #providerUsageCount(providerId: string): number {
    return this.#usageCount((definition) => {
      const strategy = definition.modelStrategy;
      if (!strategy) {
        return false;
      }
      return [strategy.primary, ...strategy.fallbacks].some((reference) => reference.providerId === providerId);
    });
  }

  #modelUsageCount(canonicalId: string): number {
    return this.#usageCount((definition) => {
      const strategy = definition.modelStrategy;
      if (!strategy) {
        return false;
      }
      return [strategy.primary, ...strategy.fallbacks].some(
        (reference) => createCanonicalModelId(reference.providerId, reference.modelId) === canonicalId,
      );
    });
  }

  #roleSummary(role: GovernedRoleResource): RoleSummary {
    return {
      roleId: role.id,
      name: role.displayName,
      description: "",
      capabilities: [...role.capabilityIds],
      revision: role.revision,
      usageCount: this.#roleUsageCount(role.id),
      status: role.status,
      availableActions: [],
    };
  }

  #profileSummary(profile: GovernedProfileResource): ProfileSummary {
    return {
      profileId: profile.id,
      name: profile.displayName,
      description: "",
      openClawCompatible: true,
      legacyProfileVisible: false,
      sections: ["identity", "soul", "user", "memory", "heartbeat"],
      revision: profile.revision,
      usageCount: this.#profileUsageCount(profile.id),
      status: profile.status,
      availableActions: [],
    };
  }

  #capabilitySummary(capability: GovernedCapabilityResource): CapabilitySummary {
    const level = typeof capability.metadata?.level === "string" ? capability.metadata.level : undefined;
    return {
      capabilityId: capability.id,
      name: capability.displayName,
      source: capability.category,
      type: capability.category,
      ...(level ? { level } : {}),
      requirements: [],
      conflicts: [],
      usageCount: this.#capabilityUsageCount(capability.id),
      status: capability.status,
    };
  }

  #skillSummary(skill: GovernedSkillResource, assigned: boolean): SkillSummary {
    return {
      skillId: skill.id,
      name: skill.displayName,
      description: "",
      installed: false,
      assigned,
      capabilities: [...skill.capabilityIds],
      requirements: [],
      compatibility: "unverified",
      usageCount: this.#skillUsageCount(skill.id),
      availableActions: [],
    };
  }

  #assignedSkillSummary(skillId: string): SkillSummary {
    if (!this.#compositionResources) {
      return {
        skillId,
        name: skillId,
        description: "",
        installed: false,
        assigned: true,
        capabilities: [],
        requirements: [],
        compatibility: "unavailable",
        usageCount: 0,
        availableActions: [],
      };
    }
    try {
      return this.#skillSummary(this.#compositionResources.getSkill(skillId), true);
    } catch {
      return {
        skillId,
        name: skillId,
        description: "",
        installed: false,
        assigned: true,
        capabilities: [],
        requirements: [],
        compatibility: "unavailable",
        usageCount: 0,
        availableActions: [],
      };
    }
  }

  #toolSummary(tool: GovernedToolResource, assigned: boolean): ToolSummary {
    return {
      toolId: tool.id,
      name: tool.displayName,
      description: "",
      assigned,
      capabilities: [...tool.capabilityIds],
      requirements: [],
      availability: "available",
      usageCount: this.#toolUsageCount(tool.id),
      availableActions: [],
    };
  }

  #assignedToolSummary(toolId: string): ToolSummary {
    if (!this.#compositionResources) {
      return {
        toolId,
        name: toolId,
        description: "",
        assigned: true,
        capabilities: [],
        requirements: [],
        availability: "unavailable",
        usageCount: 0,
        availableActions: [],
      };
    }
    try {
      return this.#toolSummary(this.#compositionResources.getTool(toolId), true);
    } catch {
      return {
        toolId,
        name: toolId,
        description: "",
        assigned: true,
        capabilities: [],
        requirements: [],
        availability: "unavailable",
        usageCount: 0,
        availableActions: [],
      };
    }
  }

  async #engineSummary(engine: AgentEngine): Promise<EngineSummary> {
    let availability: EngineSummary["availability"] = "unverified";
    let capabilities: readonly string[] = [];
    let deploymentModes: readonly string[] = [];
    if (this.#engineService) {
      try {
        availability = (await this.#engineService.health(engine.identity.id)).status;
      } catch {
        availability = "unavailable";
      }
      try {
        const engineCapabilities: EngineCapabilities = await this.#engineService.capabilities(engine.identity.id);
        capabilities = engineCapabilities.engineCapabilities;
        deploymentModes = engineCapabilities.deploymentModes;
      } catch {
        capabilities = [];
        deploymentModes = [];
      }
    }
    return {
      id: engine.identity.id,
      name: engine.identity.id,
      type: engine.identity.provider,
      capabilities: [...capabilities],
      deploymentModes: [...deploymentModes],
      availability,
      credentialRequired: false,
      compatibility: availability === "ready" ? "compatible" : "unverified",
      usageCount: 0,
      availableActions: [],
    };
  }

  async #providerSummary(provider: ModelProvider): Promise<ProviderSummary> {
    let providerCapabilities: ModelProviderCapabilities | undefined;
    if (this.#providerService) {
      try {
        providerCapabilities = await this.#providerService.capabilities(provider.id);
      } catch {
        providerCapabilities = undefined;
      }
    }
    const connections = this.#credentialRegistry?.listByProvider(provider.id) ?? [];
    const hasUsable = connections.some((connection) =>
      connection.status === "configured" || connection.status === "valid" || connection.status === "active");
    const hasPending = connections.some((connection) => connection.status === "pending");
    return {
      id: provider.id,
      name: provider.displayName,
      type: [...(providerCapabilities?.providerTypes ?? [])],
      capabilities: [...(providerCapabilities?.supportedModelCapabilities ?? [])],
      availability: hasUsable ? "available" : hasPending ? "pending" : "unavailable",
      credentialRequired: connections.length > 0,
      compatibility: hasUsable ? "compatible" : hasPending ? "pending" : "not-configured",
      usageCount: this.#providerUsageCount(provider.id),
      availableActions: [],
    };
  }

  #modelSummary(model: ModelDefinition, providerId: string): ModelSummary {
    const credentialRequired = (this.#credentialRegistry?.listByProvider(providerId).length ?? 0) > 0;
    const compatibility: ModelSummary["compatibility"] =
      model.availability === "available"
        ? "compatible"
        : model.availability === "preview"
          ? "pending"
          : "not-configured";
    return {
      id: model.canonicalId,
      name: model.displayName,
      type: providerId,
      capabilities: [...model.capabilities.supports],
      availability: model.availability,
      credentialRequired,
      compatibility,
      usageCount: this.#modelUsageCount(model.canonicalId),
      availableActions: [],
    };
  }

  async #agentCompositionDetail(agentId: string, result: AgentCompositionResult): Promise<AgentCompositionDetail> {
    const checkedAt = Date.now();
    const revision = result.revision;
    const composition = result.composition;
    const definition = revision.definition;
    const resources = this.#compositionResources;
    const role = definition.roleId && resources ? resources.getRole(definition.roleId) : undefined;
    const profile = definition.profileId && resources ? resources.getProfile(definition.profileId) : undefined;
    const directCapabilities = new Set(definition.capabilityIds);
    const roleCapabilities = new Set(role?.capabilityIds ?? []);
    const profileCapabilities = new Set(profile?.capabilityIds ?? []);
    const effectiveCapabilities: readonly CapabilitySourceEntry[] = composition.effective.capabilityIds.map((capabilityId) => {
      const sources: string[] = [];
      if (directCapabilities.has(capabilityId)) sources.push("agent");
      if (roleCapabilities.has(capabilityId)) sources.push("role");
      if (profileCapabilities.has(capabilityId)) sources.push("profile");
      let name = capabilityId;
      let status = "effective";
      if (resources) {
        try {
          const capability = resources.getCapability(capabilityId);
          name = capability.displayName;
          status = capability.status;
        } catch {
          status = "unknown";
        }
      }
      return { capabilityId, name, sources, status };
    });
    const skills = composition.effective.skillIds.map((skillId) => this.#assignedSkillSummary(skillId));
    const tools = composition.effective.toolIds.map((toolId) => this.#assignedToolSummary(toolId));
    const missingRequirements = composition.findings.filter((finding) => finding.severity === "error");
    const warnings = composition.findings.filter((finding) => finding.severity === "warning");
    const conflicts: readonly CompositionFinding[] = [];
    const readinessSummary: AgentReadinessSummary = {
      state: composition.ready ? "ready" : missingRequirements.length > 0 ? "blocked" : "partial",
      blockerCount: missingRequirements.length,
      warningCount: warnings.length,
    };
    const primary = composition.effective.modelStrategy?.primary;
    let provider: ProviderSummary | undefined;
    let model: ModelSummary | undefined;
    if (primary && this.#providerService) {
      try {
        provider = await this.#providerSummary(this.#providerService.getProvider(primary.providerId));
      } catch {
        provider = undefined;
      }
      if (provider) {
        try {
          const modelDefinition = await this.#providerService.getModel(primary.providerId, primary.modelId);
          model = this.#modelSummary(modelDefinition, primary.providerId);
        } catch {
          model = undefined;
        }
      }
    }
    return {
      agentId,
      agentName: definition.name,
      currentRevisionId: revision.revision,
      ...(role ? { roleSummary: this.#roleSummary(role) } : {}),
      ...(profile ? { profileSummary: this.#profileSummary(profile) } : {}),
      effectiveCapabilities,
      skills,
      tools,
      plugins: [],
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
      compatibilitySummary: {
        agentId,
        missingRequirements,
        conflicts,
        warnings,
        ready: composition.ready,
        checkedAt,
      },
      missingRequirements,
      conflicts,
      readinessSummary,
      availableActions: COMPOSITION_ACTIONS,
      guardrails: OPERATIONAL_GUARDRAILS,
      checkedAt,
      stale: false,
    };
  }

  async #probeRuntimeConnectivity(): Promise<{
    readonly connectivity: ProductApiRuntimeConnectivity;
    readonly checkedAt: number;
    readonly engines: readonly {
      readonly id: string;
      readonly provider: string;
      readonly status: string;
    }[];
  }> {
    const checkedAt = Date.now();
    const engineService = this.#engineService;
    if (!engineService) {
      return { connectivity: "unverified", checkedAt, engines: [] };
    }

    const engines = engineService.listEngines();
    const states = await Promise.all(engines.map(async (engine) => {
      try {
        const health = await engineService.health(engine.identity.id);
        return {
          id: engine.identity.id,
          provider: engine.identity.provider,
          status: health.status,
        };
      } catch {
        return {
          id: engine.identity.id,
          provider: engine.identity.provider,
          status: "unavailable",
        };
      }
    }));

    const connectivity: ProductApiRuntimeConnectivity = states.length === 0
      ? "unverified"
      : states.every((state) => state.status === "ready")
        ? "connected"
        : states.some((state) => state.status === "ready" || state.status === "degraded")
          ? "degraded"
          : "unavailable";

    return { connectivity, checkedAt, engines: states };
  }

  async getGlobalReadinessSummary(): Promise<GlobalReadinessSummary> {
    const generatedAt = Date.now();
    const workers = this.#workerRegistry?.list() ?? [];
    const workerStatus: Epic10ReadinessSignals["workerStatus"] = workers.some((worker) => worker.status === "available")
      ? "available"
      : workers[0]?.status ?? "unavailable";

    const targetRefresh = this.#targetService ? await this.#targetService.refresh() : undefined;
    const targets = this.#targetService?.list() ?? [];
    const targetStatus: Epic10ReadinessSignals["targetStatus"] = targetRefresh && targetRefresh.failures.length > 0
      ? "unavailable"
      : targets.length === 0
        ? "unavailable"
        : targets.every((target) => target.status === "ready" && !target.stale)
          ? "ready"
          : targets.some((target) => target.status === "ready" && !target.stale)
            ? "degraded"
            : "unavailable";

    const runtime = await this.#probeRuntimeConnectivity();
    const report = createEpic10ReadinessReport({
      workerStatus,
      targetStatus,
      runtimeStatus: runtime.connectivity === "connected" || runtime.connectivity === "degraded" ? "running" : "failed",
      authMode: "disabled",
      rateLimitEnabled: false,
      observabilityExporterEnabled: false,
      persistenceBackend: "memory",
      secretBackend: "memory",
      settlementBackend: "memory",
      remoteWorkerSupported: false,
      liveDeploymentEnabled: false,
    });

    const blockers = [...report.blockers];
    const warnings = report.findings.filter((finding) => !finding.blocksProduction);
    const distributedRuntimeReady = runtime.connectivity === "connected"
      && workerStatus === "available"
      && targetStatus === "ready";

    const distributedRuntimeDetail = runtime.connectivity === "connected"
      ? workerStatus === "available" && targetStatus === "ready"
        ? "Engine connectivity, worker and target checks passed."
        : `Engine connected, but worker is ${workerStatus} and target state is ${targetStatus}.`
      : `Engine connectivity is ${runtime.connectivity}; distributed execution is not proven.`;

    const readinessFlags: GlobalReadinessSummary["readinessFlags"] = [
      {
        id: "dev",
        label: "DEV readiness",
        status: report.devReady ? "ready" : "blocked",
        detail: "DEV workspace and sandbox operations are available through the control plane.",
      },
      {
        id: "distributed-runtime",
        label: "Distributed Runtime readiness",
        status: runtime.connectivity === "connected"
          ? workerStatus === "available" && targetStatus === "ready" ? "ready" : "partial"
          : runtime.connectivity === "degraded" ? "partial" : "blocked",
        detail: distributedRuntimeDetail,
      },
      {
        id: "production",
        label: "Production readiness",
        status: report.productionReady
          ? "ready"
          : report.blockers.length > 0
            ? "blocked"
            : "partial",
        detail: report.blockers.length > 0
          ? `Blocked by ${report.blockers.length} production finding(s).`
          : "Production readiness is not claimed in this inspection slice.",
      },
    ];

    const infrastructureStatus: ProductApiHealthStatus = runtime.connectivity === "unverified"
      ? "unverified"
      : runtime.connectivity === "connected" && workerStatus === "available" && targetStatus === "ready"
        ? "ok"
        : runtime.connectivity === "unavailable" || (workerStatus === "unavailable" && targetStatus === "unavailable")
          ? "unavailable"
          : "degraded";

    const healthIndicators: GlobalReadinessSummary["healthIndicators"] = [
      {
        id: "product-api",
        label: "Product API",
        status: "ok",
        detail: "inspection mode",
      },
      {
        id: "infrastructure",
        label: "Infrastructure",
        status: infrastructureStatus,
        detail: "engine, worker and target health",
      },
      {
        id: "runtime",
        label: "Runtime connectivity",
        status: runtime.connectivity === "connected"
          ? "ok"
          : runtime.connectivity === "degraded"
            ? "degraded"
            : runtime.connectivity === "unavailable"
              ? "unavailable"
              : "unverified",
        detail: `${runtime.engines.length} engine(s) probed`,
      },
      {
        id: "worker",
        label: "Execution worker",
        status: workerStatus === "available"
          ? "ok"
          : workerStatus === "degraded"
            ? "degraded"
            : workerStatus === "registered"
              ? "unverified"
              : "unavailable",
        detail: `${workers.length} worker(s) registered`,
      },
      {
        id: "target",
        label: "Execution target",
        status: targetStatus === "ready"
          ? "ok"
          : targetStatus === "degraded"
            ? "degraded"
            : "unavailable",
        detail: `${targets.length} target(s) discovered`,
      },
    ];

    const stateAgeMs = Math.max(0, Date.now() - generatedAt);
    const stale = workers.some((worker) => worker.stale) || targets.some((target) => target.stale);

    return {
      generatedAt,
      mode: "inspection",
      readOnly: true,
      stale,
      refreshWindowMs: OPERATIONAL_REFRESH_WINDOW_MS,
      stateAgeMs,
      guardrails: OPERATIONAL_GUARDRAILS,
      productApi: {
        service: "acs-product-api",
        status: "ok",
        mode: "inspection",
        automation: "disabled",
        checkedAt: generatedAt,
        checkMode: "inspection-read-only",
      },
      runtime,
      healthIndicators,
      readinessFlags,
      readiness: {
        devReady: report.summary.devReady,
        distributedRuntimeReady,
        productionReady: report.summary.productionReady,
        status: blockers.length > 0 ? "blocked" : "partial",
        blockerCount: blockers.length,
        warningCount: warnings.length,
        evidenceCount: report.domains.length,
        refreshedAt: generatedAt,
      },
      components: report.domains.map(({ domain, status, currentState, requiredState }) => ({
        domain,
        status,
        currentState,
        requiredState,
      })),
      blockers,
      warnings,
      evidence: report.domains,
    };
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const generatedAt = Date.now();
    const readinessSummary = await this.getGlobalReadinessSummary();
    const agents = this.#agentService?.list() ?? [];
    const deployments = this.#deploymentService?.listDeployments() ?? [];
    const runtimes = this.#runtimeService?.listRuntimes() ?? [];
    const executionRuns = this.#runtimeService?.listExecutionRuns() ?? [];
    const workers = this.#workerRegistry?.list() ?? [];
    const assignments = this.#workerAssignmentService?.listAssignments() ?? [];

    const agentCounts = {
      draft: 0,
      active: 0,
      disabled: 0,
      archived: 0,
    };
    for (const agent of agents) {
      if (agent.definition.status === "draft") agentCounts.draft += 1;
      if (agent.definition.status === "active") agentCounts.active += 1;
      if (agent.definition.status === "disabled") agentCounts.disabled += 1;
      if (agent.definition.status === "archived") agentCounts.archived += 1;
    }

    const deploymentCounts = {
      deployed: 0,
      failed: 0,
      rejected: 0,
    };
    for (const deployment of deployments) {
      if (deployment.status === "deployed") deploymentCounts.deployed += 1;
      if (deployment.status === "failed") deploymentCounts.failed += 1;
      if (deployment.status === "rejected") deploymentCounts.rejected += 1;
    }

    const runtimeCounts = {
      pending: 0,
      starting: 0,
      running: 0,
      stopping: 0,
      stopped: 0,
      failed: 0,
      terminated: 0,
    };
    for (const runtime of runtimes) {
      if (runtime.status === "pending") runtimeCounts.pending += 1;
      if (runtime.status === "starting") runtimeCounts.starting += 1;
      if (runtime.status === "running") runtimeCounts.running += 1;
      if (runtime.status === "stopping") runtimeCounts.stopping += 1;
      if (runtime.status === "stopped") runtimeCounts.stopped += 1;
      if (runtime.status === "failed") runtimeCounts.failed += 1;
      if (runtime.status === "terminated") runtimeCounts.terminated += 1;
    }

    const workerCounts = {
      registered: 0,
      available: 0,
      degraded: 0,
      unavailable: 0,
      stale: 0,
      activeAssignments: assignments.filter((assignment) => assignment.status === "running" || assignment.status === "accepted" || assignment.status === "assigned").length,
      availableSlots: 0,
    };
    for (const worker of workers) {
      if (worker.status === "registered") workerCounts.registered += 1;
      if (worker.status === "available") workerCounts.available += 1;
      if (worker.status === "degraded") workerCounts.degraded += 1;
      if (worker.status === "unavailable") workerCounts.unavailable += 1;
      if (worker.status === "stale") workerCounts.stale += 1;
      workerCounts.availableSlots += worker.capacity.availableSlots;
    }

    const executionRunCounts = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const run of executionRuns) {
      if (run.status === "pending") executionRunCounts.pending += 1;
      if (run.status === "running") executionRunCounts.running += 1;
      if (run.status === "completed") executionRunCounts.completed += 1;
      if (run.status === "failed") executionRunCounts.failed += 1;
      if (run.status === "cancelled") executionRunCounts.cancelled += 1;
    }

    const blockers: DashboardFinding[] = [];
    const warnings: DashboardFinding[] = [
      {
        code: "INSPECTION_MODE",
        severity: "warning",
        domain: "system",
        message: "Product API is in inspection mode; automation is disabled.",
      },
      {
        code: "EXECUTION_SANDBOX_ONLY",
        severity: "warning",
        domain: "execution",
        message: "Runtime and deployment operations are limited to sandbox mode in this slice.",
      },
    ];

    for (const deployment of deployments) {
      if (deployment.status === "failed" || deployment.status === "rejected") {
        blockers.push({
          code: `DEPLOYMENT_${deployment.status.toUpperCase()}`,
          severity: "error",
          domain: "deployment",
          message: `Deployment ${deployment.deploymentId} for agent ${deployment.agentId} is ${deployment.status}.`,
        });
      }
    }

    for (const run of executionRuns) {
      if (run.status === "failed") {
        blockers.push({
          code: "EXECUTION_RUN_FAILED",
          severity: "error",
          domain: "execution",
          message: `Execution run ${run.runId} for agent ${run.agentId} failed.`,
        });
      }
    }

    for (const worker of workers) {
      for (const finding of worker.health.findings) {
        if (finding.severity === "error") {
          blockers.push({
            code: finding.code,
            severity: "error",
            domain: "worker",
            message: `${worker.identity.name}: ${finding.message}`,
          });
        }
        if (finding.severity === "warning") {
          warnings.push({
            code: finding.code,
            severity: "warning",
            domain: "worker",
            message: `${worker.identity.name}: ${finding.message}`,
          });
        }
      }
    }

    for (const finding of readinessSummary.blockers) {
      blockers.push({
        code: `READINESS_BLOCKER_${finding.domain.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${finding.component.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
        severity: "error",
        domain: finding.domain,
        message: finding.reason,
      });
    }

    for (const finding of readinessSummary.warnings) {
      warnings.push({
        code: `READINESS_WARNING_${finding.domain.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${finding.component.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
        severity: "warning",
        domain: finding.domain,
        message: finding.reason,
      });
    }

    const stateAgeMs = Math.max(0, Date.now() - generatedAt);
    const stale = stateAgeMs > OPERATIONAL_REFRESH_WINDOW_MS
      || workers.some((worker) => worker.stale)
      || (this.#targetService?.list() ?? []).some((target) => target.stale);

    return {
      system: {
        service: "acs-product-api",
        status: "ok",
        mode: "inspection",
        automation: "disabled",
        readOnly: true,
        generatedAt,
        checkedAt: readinessSummary.runtime.checkedAt,
        stale,
        refreshWindowMs: OPERATIONAL_REFRESH_WINDOW_MS,
        stateAgeMs,
        guardrails: OPERATIONAL_GUARDRAILS,
      },
      agents: {
        total: agents.length,
        ...agentCounts,
      },
      deployments: {
        total: deployments.length,
        ...deploymentCounts,
      },
      runtimes: {
        total: runtimes.length,
        ...runtimeCounts,
      },
      workers: {
        total: workers.length,
        ...workerCounts,
      },
      executionRuns: {
        total: executionRuns.length,
        ...executionRunCounts,
        recent: [...executionRuns]
          .sort((left, right) => right.startedAt - left.startedAt)
          .slice(0, 5),
      },
      blockers,
      warnings,
      readiness: {
        state: readinessSummary.readiness.status,
        blockerCount: readinessSummary.readiness.blockerCount,
        warningCount: readinessSummary.readiness.warningCount,
        evidenceCount: readinessSummary.readiness.evidenceCount,
        checkedAt: readinessSummary.generatedAt,
      },
      runtime: {
        connectivity: readinessSummary.runtime.connectivity,
        checkedAt: readinessSummary.runtime.checkedAt,
      },
    };
  }

  // ---- Milestone F: Governance / System boundary (read-only) ----

  async getSystemGuardrails(): Promise<SystemGuardrailsView> {
    return {
      inspectionMode: true,
      sandboxOnly: true,
      readOnly: true,
      mutableOperations: false,
      productionReady: false,
      sourceOfTruth: "product-api",
      futureScope: [
        "Production administration",
        "Advanced tenant management",
        "RBAC / advanced authentication",
        "Secrets vault management",
        "Billing and payment rails",
        "Advanced policy mutation",
      ],
      administration: {
        status: "unavailable",
        scope: "future",
        reason: "Production administration is not part of EPIC-11; this surface shows the boundary without exposing mutations.",
      },
      tenants: {
        status: "future_scope",
        reason: "Advanced tenant management is future scope; only isolation visibility is exposed.",
      },
    };
  }

  async getSystemConfiguration(): Promise<SystemConfigurationView> {
    return {
      mode: "inspection",
      automation: "disabled",
      readOnly: true,
      persistenceBackend: "memory",
      secretBackend: "memory",
      settlementBackend: "memory",
      refreshWindowMs: OPERATIONAL_REFRESH_WINDOW_MS,
      notices: [
        "No secrets are stored or displayed by this surface.",
        "Economics is operational metering, not billing.",
        "Configuration is read-only in this milestone.",
      ],
    };
  }

  async getSystemPolicies(): Promise<readonly SystemPolicyVisibility[]> {
    return [
      {
        id: "lifecycle",
        label: "Agent lifecycle policy",
        availability: "read_only",
        note: "Lifecycle guards are enforced by the Product API and reported as blocked actions with a reason.",
      },
      {
        id: "composition",
        label: "Composition policy",
        availability: "read_only",
        note: "Composition is governed by the Product API; mutations are unsupported in this milestone.",
      },
      {
        id: "execution",
        label: "Execution policy",
        availability: "governed_by_product_api",
        note: "Execution governance is enforced by the Product API; the surface is read-only.",
      },
      {
        id: "credential",
        label: "Credential policy",
        availability: "governed_by_product_api",
        note: "Credential state is visible in redacted form; mutations are governed.",
      },
      {
        id: "economic",
        label: "Economic policy",
        availability: "governed_by_product_api",
        note: "Economics is operational metering, not billing; mutations are governed.",
      },
      {
        id: "mutation",
        label: "Policy mutation",
        availability: "unavailable",
        note: "Advanced policy mutation is deferred to a future EPIC.",
      },
    ];
  }

  async getSystemAdministration(): Promise<SystemAdministrationView> {
    return {
      status: "unavailable",
      scope: "future",
      reason: "Production administration is not part of EPIC-11; the boundary is visible without exposing mutations.",
      notes: [
        "No RBAC administration",
        "No tenant administration",
        "No secrets vault administration",
        "No production readiness claim",
      ],
    };
  }

  async getSystemTenants(): Promise<SystemTenantsView> {
    const workers = this.#workerRegistry?.list() ?? [];
    return {
      status: "future_scope",
      reason: "Advanced tenant management is future scope; only isolation visibility is exposed.",
      isolationVisibility: workers.map((worker) => {
        const modes = worker.capabilities.supportedIsolationModes;
        return {
          workerId: worker.canonicalId,
          declaredIsolationModes: modes,
          tenantIsolation: modes.some((mode) => mode === "tenant" || mode.includes("tenant")),
          workloadIsolation: modes.some((mode) => mode === "workload" || mode.includes("workload") || mode === "namespace"),
        };
      }),
      notes: [
        "Isolation state is reported by the Product API, not computed by the UI.",
        "Without real multi-tenant data the surface reports the declared modes of registered workers.",
      ],
    };
  }

  async getEpic11AcceptanceReport(): Promise<Epic11AcceptanceReport> {
    return getEpic11AcceptanceReport();
  }
}
