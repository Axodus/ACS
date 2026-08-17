import type { HttpIdentityValidator } from "../http/auth.js";
import type { HttpEdgePolicy } from "../http/edge.js";
import type { SecretStore } from "../intelligence/secret-store.js";
import type { ExecutionTargetService } from "../targets/execution-target-service.js";
import { ExecutionTargetRegistry } from "../targets/execution-target-registry.js";
import type { DurableRuntimeCoordinator, RuntimeRecoveryCoordinator } from "../workers/durable-runtime-state.js";
import type { WorkerServiceIdentityValidator } from "../workers/worker-service-auth.js";
import type { EconomicStateStore, SettlementProvider } from "./neurons-economic-contract.js";
import type { OperationalTelemetryProvider } from "./operational-telemetry.js";
import type { SharedStateHealth } from "./shared-state/contracts.js";

export type ProductionReadinessCheckRequirement =
  | "HARD_BLOCKER"
  | "REQUIRED"
  | "DEGRADED_ALLOWED"
  | "INFORMATIONAL";

export type ProductionReadinessCheckStatus = "PASS" | "BLOCKED" | "DEGRADED";

export interface ProductionReadinessCheck {
  readonly code: string;
  readonly category: string;
  readonly requirement: ProductionReadinessCheckRequirement;
  readonly status: ProductionReadinessCheckStatus;
  readonly reason: string;
  readonly requiredAction?: string;
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface ProductionGovernanceEvidence {
  readonly allowed: boolean;
  readonly action: "deployment.production";
  readonly decision: "allow" | "deny";
  readonly basis: string;
  readonly policyId?: string;
  readonly matchedRuleId?: string;
  readonly revision: number;
}

export interface ProductionReadinessDecision {
  readonly decisionId: string;
  readonly allowed: boolean;
  readonly level: "PRODUCTION_LIKE_SINGLE_HOST" | "SHARED_MULTI_INSTANCE" | "BLOCKED";
  readonly topology: "PRODUCTION_LIKE_SINGLE_HOST" | "SHARED_MULTI_INSTANCE";
  readonly tenantId: string;
  readonly agentId: string;
  readonly agentRevision: number;
  readonly targetId: string;
  readonly deploymentMode: "live";
  readonly checkedAt: number;
  readonly expiresAt: number;
  readonly checks: readonly ProductionReadinessCheck[];
  readonly blockers: readonly ProductionReadinessCheck[];
  readonly degradations: readonly ProductionReadinessCheck[];
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface ProductionDeploymentReadinessEvaluatorOptions {
  readonly targetService: ExecutionTargetService;
  readonly engineId: string;
  readonly identityValidator: HttpIdentityValidator;
  readonly edgePolicy: HttpEdgePolicy;
  readonly secretStore: SecretStore;
  readonly economicStore: EconomicStateStore;
  readonly settlementProvider: SettlementProvider;
  readonly runtimeCoordinator: DurableRuntimeCoordinator | null;
  readonly recoveryCoordinator: RuntimeRecoveryCoordinator | null;
  readonly workerIdentityValidator: WorkerServiceIdentityValidator;
  readonly telemetry: OperationalTelemetryProvider;
  readonly adapterProfile: "development" | "production";
  readonly administrativeStateHealth: () => { readonly configured: boolean; readonly reachable: boolean; readonly durable: boolean };
  readonly agentStateHealth: () => { readonly configured: boolean; readonly reachable: boolean; readonly productionOriented: boolean; readonly adapter: string };
  readonly deploymentStateHealth: () => { readonly configured: boolean; readonly reachable: boolean; readonly productionOriented: boolean; readonly adapter: string };
  readonly topology?: "PRODUCTION_LIKE_SINGLE_HOST" | "SHARED_MULTI_INSTANCE";
  readonly sharedStateHealth?: () => Promise<SharedStateHealth>;
  readonly ttlMs?: number;
}

export class ProductionReadinessBlockedError extends Error {
  constructor(readonly decision: ProductionReadinessDecision) {
    super(`production deployment readiness blocked: ${decision.blockers.map((entry) => entry.code).join(", ")}`);
    this.name = "ProductionReadinessBlockedError";
  }
}

export class ProductionDeploymentReadinessEvaluator {
  readonly #options: ProductionDeploymentReadinessEvaluatorOptions;
  readonly #ttlMs: number;

  constructor(options: ProductionDeploymentReadinessEvaluatorOptions) {
    this.#options = options;
    this.#ttlMs = options.ttlMs ?? 30_000;
  }

  async evaluate(input: {
    readonly tenantId: string;
    readonly agentId: string;
    readonly agentRevision: number;
    readonly targetId: string;
    readonly governance: ProductionGovernanceEvidence;
    readonly checkedAt?: number;
  }): Promise<ProductionReadinessDecision> {
    const checkedAt = input.checkedAt ?? Date.now();
    await this.#options.targetService.refresh();
    const canonicalTargetId = ExecutionTargetRegistry.canonicalId(this.#options.engineId, input.targetId);
    let target;
    try { target = this.#options.targetService.get(canonicalTargetId); } catch { target = undefined; }
    const [identity, edge, secrets, telemetry, sharedState] = await Promise.all([
      this.#options.identityValidator.health().catch(() => ({ configured: false, reachable: false, mode: this.#options.identityValidator.descriptor.mode })),
      this.#options.edgePolicy.readiness().catch(() => undefined),
      this.#options.secretStore.health().catch(() => ({ configured: true, reachable: false, productionGrade: this.#options.secretStore.descriptor.productionOriented, adapter: this.#options.secretStore.descriptor.provider })),
      this.#options.telemetry.health().catch(() => ({ configured: true, external: this.#options.telemetry.descriptor.external, reachable: false, degraded: true, adapter: this.#options.telemetry.descriptor.adapter })),
      this.#options.sharedStateHealth?.().catch(() => ({
        configured: true as const,
        reachable: false,
        writable: false,
        schemaCurrent: false,
        adapter: "shared-state",
        reasonCode: "SHARED_STATE_UNAVAILABLE" as const,
      })),
    ]);
    const administrative = this.#options.administrativeStateHealth();
    const agentState = this.#options.agentStateHealth();
    const deploymentState = this.#options.deploymentStateHealth();
    const runtimeHealth = this.#options.runtimeCoordinator?.health();
    const recoveryHealth = this.#options.recoveryCoordinator?.health();
    const now = checkedAt;
    const workers = this.#options.runtimeCoordinator?.listWorkers() ?? [];
    const eligibleWorkers = workers.filter((worker) =>
      (worker.status === "available" || worker.status === "busy")
      && (!worker.expiresAt || worker.expiresAt >= now)
      && worker.capabilities.engineId === this.#options.engineId
      && worker.capabilities.supportedDeploymentModes.includes("live")
      && worker.capabilities.supportedTargetIds?.includes(input.targetId));

    const checks: ProductionReadinessCheck[] = [
      check("PRODUCTION_PROFILE_ACTIVE", "platform", "HARD_BLOCKER", this.#options.adapterProfile === "production",
        "Production adapter profile is active.", "Activate the production adapter profile; development composition cannot deploy live workloads.", { profile: this.#options.adapterProfile }),
      check("TRUSTED_IDENTITY_ACTIVE", "identity", "HARD_BLOCKER",
        this.#options.identityValidator.descriptor.productionOriented && identity.configured && identity.reachable,
        "Production identity validation is configured and reachable.", "Restore the production identity validator and signing-key source.", { descriptor: this.#options.identityValidator.descriptor, health: identity }),
      check("PRODUCTION_EDGE_ACTIVE", "security-edge", "HARD_BLOCKER",
        Boolean(this.#options.edgePolicy.profile === "production" && this.#options.edgePolicy.rateLimiter.descriptor.productionOriented && edge?.rateLimiter.configured && edge.rateLimiter.productionGrade && edge.rateLimiter.reachable && edge.cors.configured),
        "Production HTTP edge controls are active.", "Restore the shared limiter and configure an explicit production origin policy.", { profile: this.#options.edgePolicy.profile, rateLimiter: this.#options.edgePolicy.rateLimiter.descriptor, health: edge }),
      check("PRODUCTION_SECRET_PROVIDER_ACTIVE", "secrets", "HARD_BLOCKER",
        this.#options.secretStore.descriptor.productionOriented && secrets.reachable,
        "Production secret provider is active and reachable.", "Restore the configured production secret provider before deployment.", { descriptor: this.#options.secretStore.descriptor, health: secrets }),
      check("ADMINISTRATIVE_STATE_DURABLE", "persistence", "REQUIRED",
        administrative.configured && administrative.reachable && administrative.durable,
        "Administrative state required by production governance is durable.", "Restore durable administrative state before deployment.", administrative),
      check("AGENT_STATE_DURABLE", "persistence", "HARD_BLOCKER",
        agentState.configured && agentState.reachable && agentState.productionOriented,
        "Agent revisions are stored durably.", "Configure the durable Agent repository before deployment.", agentState),
      check("DEPLOYMENT_STATE_DURABLE", "persistence", "HARD_BLOCKER",
        deploymentState.configured && deploymentState.reachable && deploymentState.productionOriented,
        "Deployment lifecycle and readiness evidence are durable.", "Configure the durable deployment repository before deployment.", deploymentState),
      ...(this.#options.topology === "SHARED_MULTI_INSTANCE" ? [
        check("SHARED_AUTHORITATIVE_STATE_READY", "persistence", "HARD_BLOCKER",
          Boolean(sharedState?.reachable && sharedState.writable && sharedState.schemaCurrent),
          "Shared authoritative state is reachable, writable, and schema-compatible.",
          "Restore the shared database, writer access, or compatible schema before multi-instance production deployment.",
          sharedState ? { ...sharedState } : { configured: false, reachable: false, writable: false, schemaCurrent: false }),
      ] : []),
      check("ECONOMIC_STATE_DURABLE", "economics", "REQUIRED",
        this.#options.economicStore.descriptor.productionOriented && this.#options.settlementProvider.descriptor.productionOriented,
        "Economic and settlement adapters are production-oriented.", "Configure durable economics and settlement adapters.", { economicStore: this.#options.economicStore.descriptor, settlementProvider: this.#options.settlementProvider.descriptor }),
      check("REMOTE_RUNTIME_ACTIVE", "runtime", "HARD_BLOCKER",
        Boolean(this.#options.runtimeCoordinator?.descriptor.productionOriented && runtimeHealth?.reachable),
        "Durable remote runtime is active.", "Restore the durable runtime store and remote dispatch boundary.", { descriptor: this.#options.runtimeCoordinator?.descriptor, health: runtimeHealth }),
      check("RECOVERY_COORDINATOR_HEALTHY", "recovery", "REQUIRED",
        Boolean(this.#options.recoveryCoordinator && recoveryHealth?.healthy),
        "Runtime recovery coordinator is healthy.", "Restore the recovery coordinator before production deployment.", { health: recoveryHealth }),
      check("WORKER_SERVICE_IDENTITY_TRUSTED", "runtime-security", "HARD_BLOCKER",
        this.#options.workerIdentityValidator.descriptor.productionOriented,
        "Remote workers use production-oriented service identity.", "Configure signed workload identity for remote workers.", { ...this.#options.workerIdentityValidator.descriptor }),
      check("ELIGIBLE_REMOTE_WORKER_AVAILABLE", "runtime", "REQUIRED", eligibleWorkers.length > 0,
        "At least one compatible authenticated remote worker is active.", "Start or restore a compatible production worker.", { eligibleWorkerIds: eligibleWorkers.map((worker) => worker.workerId), activeWorkerCount: eligibleWorkers.length }),
      check("EXTERNAL_TELEMETRY_ACTIVE", "observability", "REQUIRED",
        this.#options.telemetry.descriptor.external && this.#options.telemetry.descriptor.productionGrade && telemetry.reachable,
        "External production telemetry is reachable.", "Restore the external telemetry exporter before production deployment.", { descriptor: this.#options.telemetry.descriptor, health: telemetry }),
      check("PRODUCTION_TARGET_ELIGIBLE", "target", "HARD_BLOCKER",
        Boolean(target
          && target.environment === "production"
          && target.deploymentModes.includes("live")
          && target.schedulingEligible
          && target.status === "ready"),
        "Target is explicitly production-eligible and healthy.", "Select or restore a production-eligible target.", { target }),
      check("PRODUCTION_TARGET_CAPABILITIES", "target", "HARD_BLOCKER",
        Boolean(target && REQUIRED_TARGET_CAPABILITIES.every((capability) => target.capabilities.includes(capability))),
        "Target declares durable state, health, rollback, secrets, telemetry, and remote runtime capabilities.", "Use a target that implements every required production capability.", { required: REQUIRED_TARGET_CAPABILITIES, actual: target?.capabilities ?? [] }),
      check("TENANT_POLICY_ALLOWS_PRODUCTION", "governance", "HARD_BLOCKER",
        input.governance.allowed && input.governance.decision === "allow" && Boolean(input.governance.matchedRuleId),
        "Tenant governance explicitly allows production deployment.", "Add an explicit deployment.production allow rule through governed Tenant Administration.", { ...input.governance }),
    ];

    const blockers = checks.filter((entry) => entry.status === "BLOCKED" && (entry.requirement === "HARD_BLOCKER" || entry.requirement === "REQUIRED"));
    const degradations = checks.filter((entry) => entry.status === "DEGRADED");
    const allowed = blockers.length === 0;
    return {
      decisionId: `prod-ready-${input.agentId}-r${input.agentRevision}-${checkedAt}`,
      allowed,
      level: allowed ? (this.#options.topology ?? "PRODUCTION_LIKE_SINGLE_HOST") : "BLOCKED",
      topology: this.#options.topology ?? "PRODUCTION_LIKE_SINGLE_HOST",
      tenantId: input.tenantId,
      agentId: input.agentId,
      agentRevision: input.agentRevision,
      targetId: input.targetId,
      deploymentMode: "live",
      checkedAt,
      expiresAt: checkedAt + this.#ttlMs,
      checks,
      blockers,
      degradations,
      evidence: {
        canonicalTargetId,
        governanceRevision: input.governance.revision,
        productionProfile: this.#options.adapterProfile,
        multiHost: this.#options.topology === "SHARED_MULTI_INSTANCE" ? "shared_state_ready_topology_proof_required" : "not_proven",
      },
    };
  }

  assertAllowed(decision: ProductionReadinessDecision, now = Date.now()): void {
    if (!decision.allowed || decision.expiresAt < now) throw new ProductionReadinessBlockedError(decision);
  }
}

const REQUIRED_TARGET_CAPABILITIES = [
  "deployment.live",
  "deployment.health",
  "deployment.rollback",
  "runtime.remote",
  "state.durable",
  "telemetry.external",
  "secrets.references",
] as const;

function check(
  code: string,
  category: string,
  requirement: ProductionReadinessCheckRequirement,
  passed: boolean,
  reason: string,
  requiredAction: string,
  evidence: Readonly<Record<string, unknown>>,
): ProductionReadinessCheck {
  return {
    code,
    category,
    requirement,
    status: passed ? "PASS" : requirement === "DEGRADED_ALLOWED" ? "DEGRADED" : "BLOCKED",
    reason: passed ? reason : requiredAction,
    ...(!passed ? { requiredAction } : {}),
    evidence,
  };
}
