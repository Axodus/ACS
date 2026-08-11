import type { AgentService } from "./agent-service.js";
import type { AgentRevision } from "./unified-agent-model.js";
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
