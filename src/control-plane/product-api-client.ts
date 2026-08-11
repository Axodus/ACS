import type {
  AgentLifecycleActionAvailability,
  AgentLifecycleActionName,
  AgentLifecycleState,
  AgentRevisionHistoryRecord,
  AgentService,
} from "./agent-service.js";
import { AgentLifecycleGuardError } from "./agent-service.js";
import type {
  AgentComposition,
  AgentDefinition,
  AgentRevision,
  GovernedAgentStatus,
} from "./unified-agent-model.js";
import type { DeploymentService, DeploymentRecord, DeploymentRequest } from "./deployment-service.js";
import type { ExecutionRunRecord, RuntimeLifecycleService, RuntimeInstanceRecord, StartRuntimeServiceRequest } from "./runtime-lifecycle-service.js";
import type { AuditService, AuditEvent, AuditQueryFilter } from "./audit-service.js";
import type { ExecutionTargetService } from "../targets/execution-target-service.js";
import type { ModelProviderService } from "../intelligence/model-provider-service.js";
import type { AgentRunnerService } from "../intelligence/agent-runner-service.js";
import { EngineSandboxOnlyError } from "../engines/engine-errors.js";
import type { EngineService } from "../engines/engine-service.js";
import type { ExecutionWorkerRegistry } from "../workers/worker-registry.js";
import type { WorkerAssignmentService } from "../workers/worker-assignment-service.js";
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
  readonly providerService?: ModelProviderService;
  readonly runnerService?: AgentRunnerService;
  readonly workerRegistry?: ExecutionWorkerRegistry;
  readonly workerAssignmentService?: WorkerAssignmentService;
  readonly engineService?: EngineService;
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
  readonly #providerService: ModelProviderService | undefined;
  readonly #runnerService: AgentRunnerService | undefined;
  readonly #workerRegistry: ExecutionWorkerRegistry | undefined;
  readonly #workerAssignmentService: WorkerAssignmentService | undefined;
  readonly #engineService: EngineService | undefined;
  readonly #baseUrl: string | undefined;

  constructor(options: ProductApiClientOptions = {}) {
    this.#agentService = options.agentService;
    this.#deploymentService = options.deploymentService;
    this.#runtimeService = options.runtimeService;
    this.#auditService = options.auditService;
    this.#targetService = options.targetService;
    this.#providerService = options.providerService;
    this.#runnerService = options.runnerService;
    this.#workerRegistry = options.workerRegistry;
    this.#workerAssignmentService = options.workerAssignmentService;
    this.#engineService = options.engineService;
    this.#baseUrl = options.baseUrl;
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
}
