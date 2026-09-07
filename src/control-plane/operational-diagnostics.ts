import type { HttpIdentityValidator } from "../http/auth.js";
import type { HttpEdgePolicy } from "../http/edge.js";
import type { SecretStore } from "../intelligence/secret-store.js";
import type {
  DurableJobAssignment,
  DurableRuntimeCoordinator,
  DurableWorkerRegistration,
  ExecutionJob,
  RuntimeRecoveryCoordinator,
  RuntimeStateEvent,
} from "../workers/durable-runtime-state.js";
import { isWorkerEligibleForRequirements } from "../workers/durable-runtime-state.js";
import type { EconomicStateStore, SettlementProvider } from "./neurons-economic-contract.js";
import type { OperationalTelemetryProvider, TelemetryExporterHealth } from "./operational-telemetry.js";
import type { SharedStateHealth } from "./shared-state/contracts.js";
import type { ManagedProviderComposition, ManagedProviderName, ManagedProviderReasonCode } from "./managed-provider-composition.js";

export type OperationalReadinessState = "READY" | "DEGRADED" | "BLOCKED" | "UNKNOWN";
export type OperationalDependencyCategory = "identity" | "secrets" | "edge" | "persistence" | "economics" | "runtime" | "telemetry";

export type OperationalReasonCode =
  | "AUTH_PROVIDER_UNREACHABLE"
  | "SECRET_PROVIDER_UNREACHABLE"
  | "RATE_LIMITER_UNAVAILABLE"
  | "ADMIN_STATE_UNAVAILABLE"
  | "ECONOMIC_STORE_UNAVAILABLE"
  | "SETTLEMENT_PROVIDER_UNAVAILABLE"
  | "RUNTIME_STORE_UNAVAILABLE"
  | "REMOTE_DISPATCH_UNAVAILABLE"
  | "NO_ELIGIBLE_WORKERS"
  | "RECOVERY_COORDINATOR_UNHEALTHY"
  | "TELEMETRY_EXPORTER_DEGRADED"
  | "TELEMETRY_EXPORTER_DISABLED"
  | "SHARED_STATE_UNAVAILABLE"
  | "SHARED_STATE_SCHEMA_MISMATCH"
  | "SHARED_STATE_READ_ONLY"
  | ManagedProviderReasonCode;

export interface OperationalDependency {
  readonly name: string;
  readonly category: OperationalDependencyCategory;
  readonly required: boolean;
  readonly configured: boolean;
  readonly reachable: boolean;
  readonly status: OperationalReadinessState;
  readonly lastCheckedAt: number;
  readonly latencyMs: number;
  readonly reasonCode?: OperationalReasonCode;
  readonly summary: string;
  readonly recommendedAction?: string;
}

export interface WorkerDiagnostic {
  readonly workerId: string;
  readonly instanceId: string;
  readonly status: DurableWorkerRegistration["status"];
  readonly name: string;
  readonly version: string;
  readonly lastHeartbeatAt?: number;
  readonly heartbeatAgeMs?: number;
  readonly expiresAt?: number;
  readonly capabilities: DurableWorkerRegistration["capabilities"];
  readonly activeRuns: number;
  readonly currentAssignments: readonly {
    readonly assignmentId: string;
    readonly jobId: string;
    readonly leaseExpiresAt: number;
    readonly fencingToken: number;
    readonly attempt: number;
  }[];
}

export interface JobDiagnostic {
  readonly jobId: string;
  readonly tenantId: string;
  readonly status: ExecutionJob["status"];
  readonly workloadType: ExecutionJob["workloadType"];
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly correlationId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly workerId?: string;
  readonly assignmentId?: string;
  readonly leaseId?: string;
  readonly leaseExpiresAt?: number;
  readonly fencingToken?: number;
  readonly failureCode?: string;
  readonly failureSummary?: string;
  readonly recoveryCount: number;
  readonly lastRecoveryReason?: string;
  readonly reasonCode?: string;
  readonly recommendedAction?: string;
  readonly history: readonly RuntimeStateEvent[];
}

export interface OperationalStatus {
  readonly overall: OperationalReadinessState;
  readonly liveness: { readonly status: "LIVE"; readonly checkedAt: number };
  readonly readiness: {
    readonly status: OperationalReadinessState;
    readonly reasonCodes: readonly OperationalReasonCode[];
    readonly checkedAt: number;
  };
  readonly dependencies: readonly OperationalDependency[];
  readonly workers: {
    readonly total: number;
    readonly active: number;
    readonly busy: number;
    readonly draining: number;
    readonly offline: number;
    readonly entries: readonly WorkerDiagnostic[];
  };
  readonly jobs: {
    readonly total: number;
    readonly queued: number;
    readonly running: number;
    readonly failed: number;
    readonly entries: readonly JobDiagnostic[];
  };
  readonly recovery: {
    readonly healthy: boolean;
    readonly lastScanAt?: number;
    readonly lastErrorAt?: number;
  };
  readonly telemetry: TelemetryExporterHealth;
  readonly updatedAt: number;
}

export interface OperationalDiagnosticsOptions {
  readonly profile: "development" | "production";
  readonly identityValidator: HttpIdentityValidator;
  readonly edgePolicy: HttpEdgePolicy;
  readonly secretStore: SecretStore;
  readonly economicStore: EconomicStateStore;
  readonly settlementProvider: SettlementProvider;
  readonly administrativeState: { readonly mode: "memory" | "filesystem"; readonly durability: "process_local" | "single_node_durable" };
  readonly administrativeStateHealth?: () => { readonly configured: boolean; readonly reachable: boolean };
  readonly runtimeMode: "local" | "remote";
  readonly runtimeCoordinator: DurableRuntimeCoordinator | null;
  readonly recoveryCoordinator: RuntimeRecoveryCoordinator | null;
  readonly telemetry: OperationalTelemetryProvider;
  readonly sharedStateHealth?: () => Promise<SharedStateHealth>;
  readonly managedProviderComposition?: ManagedProviderComposition;
  readonly checkTimeoutMs?: number;
  readonly cacheTtlMs?: number;
}

export class OperationalDiagnosticsService {
  readonly #options: OperationalDiagnosticsOptions;
  readonly #checkTimeoutMs: number;
  readonly #cacheTtlMs: number;
  #cached: { readonly expiresAt: number; readonly value: OperationalStatus } | undefined;
  #lastOverall: OperationalReadinessState | undefined;

  constructor(options: OperationalDiagnosticsOptions) {
    this.#options = options;
    this.#checkTimeoutMs = options.checkTimeoutMs ?? 2_000;
    this.#cacheTtlMs = options.cacheTtlMs ?? 1_000;
  }

  liveness(): { readonly status: "LIVE"; readonly checkedAt: number } {
    return { status: "LIVE", checkedAt: Date.now() };
  }

  async publicReadiness(): Promise<OperationalStatus["readiness"]> {
    const status = await this.status();
    return status.readiness;
  }

  async status(options: { readonly force?: boolean } = {}): Promise<OperationalStatus> {
    const now = Date.now();
    if (!options.force && this.#cached && this.#cached.expiresAt > now) return this.#cached.value;
    const [identity, edge, secrets, administrative, economics, settlement, runtime, telemetry, sharedState] = await Promise.all([
      this.#dependency("identity-provider", "identity", true, async () => {
        const health = await this.#options.identityValidator.health();
        return {
          configured: health.configured,
          reachable: health.reachable,
          status: health.reachable ? "READY" as const : "BLOCKED" as const,
          reasonCode: health.reachable ? undefined : "AUTH_PROVIDER_UNREACHABLE" as const,
          summary: health.reachable ? "Authenticated identity validation is available." : "The configured identity validator is unavailable.",
          recommendedAction: "Restore the configured identity provider or signing-key source.",
        };
      }),
      this.#dependency("http-edge", "edge", true, async () => {
        const health = await this.#options.edgePolicy.readiness();
        const reachable = health.rateLimiter.reachable && (this.#options.profile !== "production" || health.cors.configured);
        return {
          configured: health.rateLimiter.configured,
          reachable,
          status: reachable ? "READY" as const : "BLOCKED" as const,
          reasonCode: reachable ? undefined : "RATE_LIMITER_UNAVAILABLE" as const,
          summary: reachable ? "Rate limiting and edge policy are operational." : "The rate-limit backend or required edge policy is unavailable.",
          recommendedAction: "Restore the shared rate-limit store and verify the production origin policy.",
        };
      }),
      this.#dependency("secret-provider", "secrets", this.#options.profile === "production", async () => {
        const health = await this.#options.secretStore.health();
        const status: OperationalReadinessState = health.reachable ? "READY" : this.#options.profile === "production" ? "BLOCKED" : "DEGRADED";
        return {
          configured: true,
          reachable: health.reachable,
          status,
          reasonCode: health.reachable ? undefined : "SECRET_PROVIDER_UNREACHABLE" as const,
          summary: health.reachable ? "Secret resolution provider is reachable." : "Secret resolution provider is unavailable.",
          recommendedAction: "Restore Vault/provider connectivity before running secret-dependent workloads.",
        };
      }),
      this.#dependency("administrative-state", "persistence", true, async () => {
        const health = this.#options.administrativeStateHealth?.() ?? {
          configured: this.#options.administrativeState.mode === "filesystem",
          reachable: this.#options.administrativeState.durability === "single_node_durable",
        };
        return {
          configured: health.configured,
          reachable: health.reachable,
          status: health.reachable ? "READY" as const : "BLOCKED" as const,
          reasonCode: health.reachable ? undefined : "ADMIN_STATE_UNAVAILABLE" as const,
          summary: health.reachable ? "Durable administrative state is readable." : "Authoritative administrative state is unavailable or process-local.",
          recommendedAction: "Restore the configured durable administrative state before accepting administrative mutations.",
        };
      }),
      this.#dependency("economic-store", "economics", true, async () => {
        this.#options.economicStore.listReservations();
        return {
          configured: true,
          reachable: true,
          status: "READY" as const,
          summary: "Economic state store accepted a read probe.",
          recommendedAction: "Restore the configured economic state store.",
        };
      }, "ECONOMIC_STORE_UNAVAILABLE"),
      this.#dependency("settlement-provider", "economics", true, async () => {
        await this.#options.settlementProvider.listSettlements();
        return {
          configured: true,
          reachable: true,
          status: "READY" as const,
          summary: "Settlement provider accepted a read probe.",
          recommendedAction: "Restore the configured settlement provider and reconcile pending settlements.",
        };
      }, "SETTLEMENT_PROVIDER_UNAVAILABLE"),
      this.#runtimeDependencies(),
      this.#dependency("telemetry-exporter", "telemetry", false, async () => {
        const health = await this.#options.telemetry.health();
        const ready = health.configured && health.external && health.reachable;
        return {
          configured: health.configured,
          reachable: health.reachable,
          status: ready ? "READY" as const : "DEGRADED" as const,
          reasonCode: ready ? undefined : health.configured ? "TELEMETRY_EXPORTER_DEGRADED" as const : "TELEMETRY_EXPORTER_DISABLED" as const,
          summary: ready ? "External telemetry exporter is operational." : "External telemetry evidence is unavailable or degraded.",
          recommendedAction: "Restore the configured external telemetry receiver; domain operations remain authoritative.",
        };
      }),
      this.#options.sharedStateHealth
        ? this.#dependency("shared-authoritative-state", "persistence", true, async () => {
            const health = await this.#options.sharedStateHealth!();
            const ready = health.reachable && health.writable && health.schemaCurrent;
            return {
              configured: health.configured,
              reachable: health.reachable,
              status: ready ? "READY" as const : "BLOCKED" as const,
              reasonCode: ready ? undefined : health.reasonCode ?? "SHARED_STATE_UNAVAILABLE" as const,
              summary: ready
                ? "Shared authoritative state is reachable, writable, and schema-compatible."
                : "Shared authoritative state cannot safely accept authoritative mutations.",
              recommendedAction: "Restore database connectivity, writer access, or the expected schema version.",
            };
          })
        : Promise.resolve(undefined),
    ]);
    const managedProviderHealth = this.#options.managedProviderComposition
      ? await this.#options.managedProviderComposition.health().catch(() => undefined)
      : undefined;
    const managedProviderDependencies: OperationalDependency[] = managedProviderHealth?.statuses.map((provider) => ({
      name: `managed-provider:${provider.name}`,
      category: providerCategory(provider.name),
      required: true,
      configured: provider.configured,
      reachable: provider.reachable,
      status: provider.ready ? "READY" : "BLOCKED",
      lastCheckedAt: provider.checkedAt,
      latencyMs: 0,
      ...(provider.reasonCode ? { reasonCode: provider.reasonCode } : {}),
      summary: provider.detail,
      ...(!provider.ready ? { recommendedAction: `Restore the ${provider.name.replaceAll("_", " ")} production provider boundary.` } : {}),
    })) ?? [];
    const dependencies = [identity, edge, secrets, administrative, economics, settlement, ...runtime, telemetry, ...(sharedState ? [sharedState] : []), ...managedProviderDependencies];
    const workers = this.workerDiagnostics();
    const jobs = this.#options.runtimeCoordinator?.listJobs().map((job) => this.jobDiagnostic(job)) ?? [];
    const recovery = this.#options.recoveryCoordinator?.health() ?? { healthy: this.#options.runtimeMode === "local" };
    const telemetryHealth = await this.#options.telemetry.health();
    const overall: OperationalReadinessState = dependencies.some((item) => item.required && item.status === "BLOCKED")
      ? "BLOCKED"
      : dependencies.some((item) => item.status === "DEGRADED" || item.status === "UNKNOWN")
        ? "DEGRADED"
        : "READY";
    const value: OperationalStatus = {
      overall,
      liveness: this.liveness(),
      readiness: {
        status: overall,
        reasonCodes: dependencies.flatMap((item) => item.reasonCode ? [item.reasonCode] : []),
        checkedAt: now,
      },
      dependencies,
      workers: {
        total: workers.length,
        active: workers.filter((worker) => worker.status === "available").length,
        busy: workers.filter((worker) => worker.status === "busy").length,
        draining: workers.filter((worker) => worker.status === "draining").length,
        offline: workers.filter((worker) => worker.status === "offline").length,
        entries: workers,
      },
      jobs: {
        total: jobs.length,
        queued: jobs.filter((job) => job.status === "queued").length,
        running: jobs.filter((job) => job.status === "running" || job.status === "assigned").length,
        failed: jobs.filter((job) => job.status === "failed").length,
        entries: jobs.slice(-100),
      },
      recovery,
      telemetry: telemetryHealth,
      updatedAt: now,
    };
    this.#options.telemetry.metric({ name: "acs.runtime.jobs.queued", kind: "gauge", value: value.jobs.queued });
    this.#options.telemetry.metric({ name: "acs.runtime.jobs.running", kind: "gauge", value: value.jobs.running });
    this.#options.telemetry.metric({ name: "acs.runtime.jobs.failed", kind: "gauge", value: value.jobs.failed });
    this.#options.telemetry.metric({ name: "acs.runtime.workers.registered", kind: "gauge", value: value.workers.total });
    this.#options.telemetry.metric({ name: "acs.runtime.workers.active", kind: "gauge", value: value.workers.active + value.workers.busy });
    this.#options.telemetry.metric({ name: "acs.runtime.workers.offline", kind: "gauge", value: value.workers.offline });
    if (this.#lastOverall !== overall) {
      this.#options.telemetry.log({
        level: overall === "BLOCKED" ? "error" : overall === "DEGRADED" ? "warn" : "info",
        component: "operational-readiness",
        event: "readiness.state_changed",
        message: `Operational readiness changed to ${overall}`,
        attributes: { previous: this.#lastOverall ?? "UNKNOWN", current: overall, reasonCodes: value.readiness.reasonCodes },
      });
      this.#options.telemetry.metric({ name: "acs.readiness.state", kind: "gauge", value: overall === "READY" ? 1 : overall === "DEGRADED" ? 0.5 : 0 });
      this.#lastOverall = overall;
    }
    this.#cached = { expiresAt: now + this.#cacheTtlMs, value };
    return value;
  }

  workerDiagnostics(now = Date.now()): readonly WorkerDiagnostic[] {
    const runtime = this.#options.runtimeCoordinator;
    if (!runtime) return [];
    const assignments = runtime.listAssignments().filter((entry) => entry.status === "active");
    return runtime.listWorkers().map((worker) => ({
      workerId: worker.workerId,
      instanceId: worker.instanceId,
      status: worker.status,
      name: worker.name,
      version: worker.version,
      ...(worker.lastHeartbeatAt !== undefined ? { lastHeartbeatAt: worker.lastHeartbeatAt, heartbeatAgeMs: Math.max(0, now - worker.lastHeartbeatAt) } : {}),
      ...(worker.expiresAt !== undefined ? { expiresAt: worker.expiresAt } : {}),
      capabilities: worker.capabilities,
      activeRuns: worker.activeRuns,
      currentAssignments: assignments.filter((entry) => entry.workerId === worker.workerId).map(assignmentSummary),
    }));
  }

  jobDiagnostic(job: ExecutionJob): JobDiagnostic {
    const runtime = this.#options.runtimeCoordinator;
    const assignments = runtime?.listAssignments({ jobId: job.jobId }) ?? [];
    const events = runtime?.listEvents({ tenantId: job.tenantId, jobId: job.jobId }) ?? [];
    const current = [...assignments].reverse().find((entry) => entry.status === "active") ?? assignments.at(-1);
    const recoveries = events.filter((event) => event.category.includes("recover") || event.category.includes("requeue"));
    const reason = diagnoseJob(job, current, events, this.workerDiagnostics());
    return {
      jobId: job.jobId,
      tenantId: job.tenantId,
      status: job.status,
      workloadType: job.workloadType,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      correlationId: job.correlationId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      ...(current ? {
        workerId: current.workerId,
        assignmentId: current.assignmentId,
        leaseId: current.leaseId,
        leaseExpiresAt: current.leaseExpiresAt,
        fencingToken: current.fencingToken,
      } : {}),
      ...(job.error ? { failureCode: job.error.code, failureSummary: job.error.message } : {}),
      recoveryCount: recoveries.length,
      ...(recoveries.at(-1)?.reason ? { lastRecoveryReason: recoveries.at(-1)?.reason } : {}),
      ...(reason ? reason : {}),
      history: events,
    };
  }

  async #runtimeDependencies(): Promise<readonly OperationalDependency[]> {
    const runtimeRequired = this.#options.runtimeMode === "remote";
    const store = await this.#dependency("runtime-store", "runtime", runtimeRequired, async () => {
      const health = this.#options.runtimeCoordinator?.health();
      return {
        configured: Boolean(health),
        reachable: health?.reachable === true,
        status: health?.reachable ? "READY" as const : runtimeRequired ? "BLOCKED" as const : "DEGRADED" as const,
        reasonCode: health?.reachable ? undefined : "RUNTIME_STORE_UNAVAILABLE" as const,
        summary: health?.reachable ? "Durable runtime state is reachable." : "Durable runtime state is not reachable.",
        recommendedAction: "Restore the configured runtime database before accepting remote jobs.",
      };
    });
    const recovery = await this.#dependency("recovery-coordinator", "runtime", runtimeRequired, async () => {
      const health = this.#options.recoveryCoordinator?.health();
      return {
        configured: Boolean(health),
        reachable: health?.healthy === true,
        status: health?.healthy ? "READY" as const : runtimeRequired ? "BLOCKED" as const : "DEGRADED" as const,
        reasonCode: health?.healthy ? undefined : "RECOVERY_COORDINATOR_UNHEALTHY" as const,
        summary: health?.healthy ? "Runtime recovery coordinator is healthy." : "Runtime recovery coordinator is not healthy.",
        recommendedAction: "Restore recovery scanning before accepting remotely owned jobs.",
      };
    });
    const activeWorkers = this.workerDiagnostics().filter((worker) => worker.status === "available" || worker.status === "busy");
    const workers: OperationalDependency = {
      name: "remote-dispatch-workers",
      category: "runtime",
      required: runtimeRequired,
      configured: Boolean(this.#options.runtimeCoordinator),
      reachable: activeWorkers.length > 0,
      status: activeWorkers.length > 0 ? "READY" : runtimeRequired ? "BLOCKED" : "DEGRADED",
      lastCheckedAt: Date.now(),
      latencyMs: 0,
      ...(activeWorkers.length ? {} : { reasonCode: "NO_ELIGIBLE_WORKERS" as const }),
      summary: activeWorkers.length ? `${activeWorkers.length} active remote worker(s) are visible.` : "No active remote worker is currently eligible.",
      ...(activeWorkers.length ? {} : { recommendedAction: "Provision or start a worker with capabilities compatible with the queued workload." }),
    };
    return [store, recovery, workers];
  }

  async #dependency(
    name: string,
    category: OperationalDependencyCategory,
    required: boolean,
    probe: () => Promise<{
      readonly configured: boolean;
      readonly reachable: boolean;
      readonly status: OperationalReadinessState;
      readonly reasonCode?: OperationalReasonCode;
      readonly summary: string;
      readonly recommendedAction?: string;
    }>,
    failureCode?: OperationalReasonCode,
  ): Promise<OperationalDependency> {
    const startedAt = Date.now();
    try {
      const result = await Promise.race([
        probe(),
        delay(this.#checkTimeoutMs).then(() => { throw new Error("dependency check timed out"); }),
      ]);
      return { name, category, required, lastCheckedAt: Date.now(), latencyMs: Date.now() - startedAt, ...result };
    } catch {
      const reasonCode = failureCode ?? defaultFailureCode(category);
      return {
        name,
        category,
        required,
        configured: true,
        reachable: false,
        status: required ? "BLOCKED" : "DEGRADED",
        lastCheckedAt: Date.now(),
        latencyMs: Date.now() - startedAt,
        reasonCode,
        summary: `${name} dependency check failed or timed out.`,
        recommendedAction: `Restore ${name} and re-run readiness diagnostics.`,
      };
    }
  }
}

function assignmentSummary(assignment: DurableJobAssignment) {
  return {
    assignmentId: assignment.assignmentId,
    jobId: assignment.jobId,
    leaseExpiresAt: assignment.leaseExpiresAt,
    fencingToken: assignment.fencingToken,
    attempt: assignment.attempt,
  };
}

function diagnoseJob(
  job: ExecutionJob,
  assignment: DurableJobAssignment | undefined,
  events: readonly RuntimeStateEvent[],
  workers: readonly WorkerDiagnostic[],
): Pick<JobDiagnostic, "reasonCode" | "recommendedAction"> | undefined {
  const eligibleWorkers = workers.filter((worker) =>
    (worker.status === "available" || worker.status === "busy")
    && isWorkerEligibleForRequirements(worker.capabilities, job.requirements));
  if (job.status === "queued" && eligibleWorkers.length === 0) {
    return { reasonCode: "NO_ELIGIBLE_WORKERS", recommendedAction: "Provision or start a compatible worker." };
  }
  if ((job.status === "assigned" || job.status === "running") && assignment && assignment.leaseExpiresAt <= Date.now()) {
    return { reasonCode: "LEASE_EXPIRED", recommendedAction: "Allow the recovery coordinator to requeue or fail the orphaned job." };
  }
  if (job.status === "failed") {
    return {
      reasonCode: job.attempt >= job.maxAttempts ? "MAX_ATTEMPTS_EXHAUSTED" : job.error?.code ?? "APPLICATION_FAILURE",
      recommendedAction: job.attempt >= job.maxAttempts ? "Inspect the final failure and correct the workload before creating a new job." : "Inspect the failure code and retry policy.",
    };
  }
  if (events.some((event) => event.category.includes("stale") || event.reason?.includes("stale"))) {
    return { reasonCode: "STALE_WORKER_OWNERSHIP", recommendedAction: "Use only the current assignment and fencing token." };
  }
  return undefined;
}

function defaultFailureCode(category: OperationalDependencyCategory): OperationalReasonCode {
  if (category === "identity") return "AUTH_PROVIDER_UNREACHABLE";
  if (category === "secrets") return "SECRET_PROVIDER_UNREACHABLE";
  if (category === "edge") return "RATE_LIMITER_UNAVAILABLE";
  if (category === "economics") return "ECONOMIC_STORE_UNAVAILABLE";
  if (category === "runtime") return "RUNTIME_STORE_UNAVAILABLE";
  if (category === "telemetry") return "TELEMETRY_EXPORTER_DEGRADED";
  return "ADMIN_STATE_UNAVAILABLE";
}

function providerCategory(name: ManagedProviderName): OperationalDependencyCategory {
  if (name === "identity" || name === "workload_identity") return "identity";
  if (name === "secrets") return "secrets";
  if (name === "telemetry") return "telemetry";
  return "edge";
}

function delay(ms: number): Promise<void> { return new Promise((resolveDelay) => setTimeout(resolveDelay, ms)); }
