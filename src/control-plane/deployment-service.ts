import { randomUUID } from "node:crypto";
import type { AgentEngine, DeploymentInspectionResult, DeploymentResult } from "../engines/agent-engine.js";
import type { ExecutionTargetService } from "../targets/execution-target-service.js";
import { ExecutionTargetRegistry } from "../targets/execution-target-registry.js";
import { PolicyRejectedError } from "../errors.js";
import type { EconomicService, UsageReservation } from "./neurons-economic-contract.js";
import type { AgentService } from "./agent-service.js";
import { ExecutionPlanResolver } from "./execution-plan-resolver.js";
import type { DeploymentMode } from "./unified-agent-model.js";
import type { AuditService } from "./audit-service.js";
import { assertSameIsolationScope, type IsolationScope } from "./isolation.js";
import {
  ProductionReadinessBlockedError,
  type ProductionDeploymentReadinessEvaluator,
  type ProductionGovernanceEvidence,
  type ProductionReadinessDecision,
} from "./production-deployment-readiness.js";

export type DeploymentLifecycleStatus =
  | "pending"
  | "validating"
  | "deploying"
  | "deployed"
  | "active"
  | "degraded"
  | "failed"
  | "rejected"
  | "rolling_back"
  | "rolled_back"
  | "rollback_failed"
  | "stopped";

export interface DeploymentRequest {
  readonly agentId: string;
  readonly revision: number;
  readonly composition: Record<string, unknown>;
  readonly deploymentMode: "sandbox" | "staged" | "live" | string;
  readonly targetId: string;
  readonly accountId?: string;
  readonly actor?: string;
  readonly correlationId?: string;
  readonly scope?: IsolationScope;
  readonly productionGovernance?: ProductionGovernanceEvidence;
}

export interface DeploymentEvidenceSnapshot {
  readonly agentFingerprint: string;
  readonly compositionFingerprint: string;
  readonly executionPlanId: string;
  readonly credentialReferenceIds: readonly string[];
  readonly productionReadiness?: ProductionReadinessDecision;
}

export interface DeploymentRecord {
  readonly deploymentId: string;
  readonly agentId: string;
  readonly revision: number;
  readonly recordRevision: number;
  readonly targetId: string;
  readonly deploymentMode: string;
  readonly status: DeploymentLifecycleStatus;
  readonly artifactPath?: string;
  readonly reservationId?: string;
  readonly predecessorDeploymentId?: string;
  readonly health?: "ready" | "degraded" | "unavailable";
  readonly reasonCode?: string;
  readonly evidence?: DeploymentEvidenceSnapshot;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly scope?: IsolationScope;
}

export interface GovernanceDecision {
  readonly allowed: boolean;
  readonly decision: "allowed" | "denied";
  readonly reason: string;
}

export interface DeploymentRepositoryDescriptor {
  readonly adapter: string;
  readonly productionOriented: boolean;
  readonly durability: "process_local" | "single_node_durable";
  readonly multiInstance: "not_applicable" | "shared_database";
  readonly multiHost: "not_applicable" | "not_proven";
}

export interface DeploymentRepository {
  readonly descriptor: DeploymentRepositoryDescriptor;
  create(record: DeploymentRecord): DeploymentRecord;
  get(deploymentId: string): DeploymentRecord | undefined;
  list(): readonly DeploymentRecord[];
  save(record: DeploymentRecord, expectedRecordRevision: number): DeploymentRecord;
  health(): { readonly configured: boolean; readonly reachable: boolean; readonly productionOriented: boolean; readonly adapter: string };
  close?(): void;
}

export class DeploymentRevisionConflictError extends Error {
  constructor(message = "deployment revision conflict") {
    super(message);
    this.name = "DeploymentRevisionConflictError";
  }
}

export class InMemoryDeploymentRepository implements DeploymentRepository {
  readonly descriptor: DeploymentRepositoryDescriptor = {
    adapter: "in-memory-deployment-state",
    productionOriented: false,
    durability: "process_local",
    multiInstance: "not_applicable",
    multiHost: "not_applicable",
  };
  readonly #records = new Map<string, DeploymentRecord>();

  create(record: DeploymentRecord): DeploymentRecord {
    if (this.#records.has(record.deploymentId)) throw new DeploymentRevisionConflictError("deployment already exists");
    this.#records.set(record.deploymentId, structuredClone(record));
    return record;
  }
  get(deploymentId: string): DeploymentRecord | undefined {
    const record = this.#records.get(deploymentId);
    return record ? structuredClone(record) : undefined;
  }
  list(): readonly DeploymentRecord[] {
    return [...this.#records.values()].map((record) => structuredClone(record));
  }
  save(record: DeploymentRecord, expectedRecordRevision: number): DeploymentRecord {
    const current = this.#records.get(record.deploymentId);
    if (!current || current.recordRevision !== expectedRecordRevision) throw new DeploymentRevisionConflictError();
    this.#records.set(record.deploymentId, structuredClone(record));
    return record;
  }
  health() { return { configured: true, reachable: true, productionOriented: false, adapter: this.descriptor.adapter }; }
}

const TRANSITIONS: Readonly<Record<DeploymentLifecycleStatus, readonly DeploymentLifecycleStatus[]>> = {
  pending: ["validating", "failed", "rejected"],
  validating: ["deploying", "failed", "rejected"],
  deploying: ["deployed", "active", "degraded", "failed"],
  deployed: ["stopped", "failed"],
  active: ["degraded", "failed", "rolling_back", "stopped"],
  degraded: ["active", "failed", "rolling_back", "stopped"],
  failed: ["rolling_back"],
  rejected: [],
  rolling_back: ["rolled_back", "rollback_failed"],
  rolled_back: [],
  rollback_failed: ["rolling_back"],
  stopped: [],
};

export class DeploymentService {
  readonly #engine: AgentEngine;
  readonly #targetService: ExecutionTargetService | undefined;
  readonly #economicService: EconomicService | undefined;
  readonly #agentService: AgentService;
  readonly #resolver: ExecutionPlanResolver;
  readonly #auditService: AuditService | undefined;
  readonly #defaultScope: IsolationScope | undefined;
  readonly #repository: DeploymentRepository;
  readonly #productionReadinessEvaluator: ProductionDeploymentReadinessEvaluator | undefined;

  static isDeploymentMode(value: string): value is DeploymentMode {
    return value === "sandbox" || value === "staged" || value === "live";
  }

  constructor(options: {
    engine: AgentEngine;
    targetService?: ExecutionTargetService;
    economicService?: EconomicService;
    agentService: AgentService;
    resolver: ExecutionPlanResolver;
    auditService?: AuditService;
    scope?: IsolationScope;
    repository?: DeploymentRepository;
    productionReadinessEvaluator?: ProductionDeploymentReadinessEvaluator;
  }) {
    this.#engine = options.engine;
    this.#targetService = options.targetService;
    this.#economicService = options.economicService;
    this.#agentService = options.agentService;
    this.#resolver = options.resolver;
    this.#auditService = options.auditService;
    this.#defaultScope = options.scope;
    this.#repository = options.repository ?? new InMemoryDeploymentRepository();
    this.#productionReadinessEvaluator = options.productionReadinessEvaluator;
  }

  get descriptor(): DeploymentRepositoryDescriptor { return this.#repository.descriptor; }

  evaluateGovernance(mode: string, production?: ProductionGovernanceEvidence): GovernanceDecision {
    if (mode === "sandbox") return { allowed: true, decision: "allowed", reason: "Sandbox deployment governance policy satisfied." };
    if (mode === "live" && production?.allowed && production.decision === "allow" && production.matchedRuleId) {
      return { allowed: true, decision: "allowed", reason: "Explicit tenant production deployment policy satisfied." };
    }
    return {
      allowed: false,
      decision: "denied",
      reason: mode === "live"
        ? "Production deployment requires an explicit deployment.production allow rule."
        : `Deployment mode "${mode}" is not enabled by the certified deployment policy.`,
    };
  }

  async evaluateProductionReadiness(input: {
    readonly agentId: string;
    readonly revision: number;
    readonly targetId: string;
    readonly scope?: IsolationScope;
    readonly governance: ProductionGovernanceEvidence;
  }): Promise<ProductionReadinessDecision> {
    if (!this.#productionReadinessEvaluator) {
      throw new PolicyRejectedError("production deployment readiness evaluator is not configured");
    }
    return this.#productionReadinessEvaluator.evaluate({
      tenantId: (input.scope ?? this.#defaultScope)?.tenantId ?? "",
      agentId: input.agentId,
      agentRevision: input.revision,
      targetId: input.targetId,
      governance: input.governance,
    });
  }

  async deploy(request: DeploymentRequest): Promise<DeploymentRecord> {
    const correlationId = request.correlationId ?? `deploy_${request.agentId}_r${request.revision}_${Date.now()}`;
    const scope = request.scope ?? this.#defaultScope;
    if (!DeploymentService.isDeploymentMode(request.deploymentMode)) {
      throw new PolicyRejectedError(`Invalid deployment mode: ${request.deploymentMode}`);
    }
    const gov = this.evaluateGovernance(request.deploymentMode, request.productionGovernance);
    this.#recordGovernance(request, correlationId, gov);
    if (!gov.allowed) throw new PolicyRejectedError(gov.reason);

    const agentRevision = this.#agentService.get(request.agentId);
    if (agentRevision.revision !== request.revision) {
      throw new PolicyRejectedError(`agent revision changed: requested ${request.revision}, current ${agentRevision.revision}`);
    }

    let productionReadiness: ProductionReadinessDecision | undefined;
    if (request.deploymentMode === "live") {
      if (!request.productionGovernance) throw new PolicyRejectedError("production governance evidence is required");
      productionReadiness = await this.evaluateProductionReadiness({
        agentId: request.agentId,
        revision: request.revision,
        targetId: request.targetId,
        scope,
        governance: request.productionGovernance,
      });
      this.#productionReadinessEvaluator?.assertAllowed(productionReadiness);
      this.#auditService?.recordEvent({
        eventType: "deployment.production_readiness_evaluated",
        correlationId,
        agentId: request.agentId,
        revision: request.revision,
        tenantId: scope?.tenantId,
        actor: request.actor,
        decision: productionReadiness.allowed ? "allowed" : "denied",
        result: productionReadiness.allowed ? "success" : "failure",
        metadata: { decisionId: productionReadiness.decisionId, targetId: request.targetId, blockers: productionReadiness.blockers.map((item) => item.code) },
      });
    }

    await this.#assertTargetEligible(request, correlationId);
    const reservation = this.#reserveEconomics(request, correlationId, scope);
    const deploymentId = `deployment_${randomUUID()}`;
    const predecessor = this.#latestActive(request.agentId, request.targetId, scope);
    let current = this.#repository.create({
      deploymentId,
      agentId: request.agentId,
      revision: request.revision,
      recordRevision: 1,
      targetId: request.targetId,
      deploymentMode: request.deploymentMode,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(scope ? { scope } : {}),
      ...(reservation ? { reservationId: reservation.reservationId } : {}),
      ...(predecessor ? { predecessorDeploymentId: predecessor.deploymentId } : {}),
    });

    try {
      current = this.#transition(current, "validating");
      const { revision, composition } = this.#agentService.compose(request.agentId);
      const executionPlan = await this.#resolver.resolve({
        agentRevision,
        composition,
        engineId: this.#engine.identity.id,
        targetId: request.targetId,
        deploymentMode: request.deploymentMode,
        correlationId,
        ...(scope ? { scope } : {}),
      });
      current = this.#replaceEvidence(current, {
        agentFingerprint: revision.fingerprint,
        compositionFingerprint: composition.fingerprint,
        executionPlanId: executionPlan.planId,
        credentialReferenceIds: [...revision.definition.credentialConnectionIds],
        ...(productionReadiness ? { productionReadiness } : {}),
      });
      current = this.#transition(current, "deploying");
      this.#auditService?.recordEvent({
        eventType: "deployment.requested", correlationId, agentId: request.agentId, revision: request.revision,
        deploymentId, tenantId: scope?.tenantId, actor: request.actor, decision: "passed", result: "pending",
        metadata: { executionPlanId: executionPlan.planId, deploymentMode: request.deploymentMode, targetId: request.targetId },
      });
      const result: DeploymentResult = await this.#engine.deployAgent({
        deploymentId,
        agentId: request.agentId,
        revision: request.revision,
        composition: request.composition,
        deploymentMode: request.deploymentMode,
        targetId: request.targetId,
        executionPlanId: executionPlan.planId,
      });
      const artifact = result.artifactPath ? { artifactPath: result.artifactPath } : {};
      current = this.#save({ ...current, ...artifact }, current.recordRevision);
      if (request.deploymentMode === "live") {
        if (!this.#engine.inspectDeployment) throw new PolicyRejectedError("production target does not support post-deploy health inspection");
        const inspection = await this.#engine.inspectDeployment(deploymentId);
        if (inspection.health !== "ready" || inspection.status !== "active") {
          current = this.#transition({ ...current, health: inspection.health, reasonCode: inspection.reasonCode }, "degraded");
          throw new PolicyRejectedError(`production deployment health verification failed: ${inspection.reasonCode ?? inspection.health}`);
        }
        current = this.#transition({ ...current, health: "ready" }, "active");
      } else {
        current = this.#transition({ ...current, health: "ready" }, "deployed");
      }
      this.#auditService?.recordEvent({
        eventType: "deployment.completed", correlationId, agentId: current.agentId, revision: current.revision,
        deploymentId: current.deploymentId, tenantId: scope?.tenantId, actor: request.actor, decision: "allowed", result: "success",
        metadata: { targetId: current.targetId, deploymentMode: current.deploymentMode, status: current.status, readinessDecisionId: productionReadiness?.decisionId },
      });
      return current;
    } catch (error) {
      if (current.status !== "degraded" && current.status !== "failed") {
        try { current = this.#transition({ ...current, reasonCode: errorCode(error) }, "failed"); } catch { /* preserve original failure */ }
      }
      this.#releaseEconomics(reservation, request, correlationId);
      this.#auditService?.recordEvent({
        eventType: "deployment.failed", correlationId, agentId: request.agentId, revision: request.revision,
        deploymentId, tenantId: scope?.tenantId, actor: request.actor, decision: "denied", result: "failure",
        metadata: { error: error instanceof Error ? error.message : String(error), reasonCode: errorCode(error) },
      });
      throw error;
    }
  }

  async inspectDeployment(deploymentId: string, scope?: IsolationScope): Promise<DeploymentRecord | undefined> {
    let current = this.getDeployment(deploymentId, scope);
    if (!current || current.deploymentMode !== "live" || !this.#engine.inspectDeployment) return current;
    const inspection: DeploymentInspectionResult = await this.#engine.inspectDeployment(deploymentId);
    const nextStatus = inspection.status === "active" ? "active" : inspection.status === "degraded" ? "degraded" : inspection.status === "failed" ? "failed" : "stopped";
    if (current.status !== nextStatus || current.health !== inspection.health || current.reasonCode !== inspection.reasonCode) {
      if (TRANSITIONS[current.status].includes(nextStatus) || current.status === nextStatus) {
        current = this.#save({
          ...current,
          status: nextStatus,
          health: inspection.health,
          ...(inspection.reasonCode ? { reasonCode: inspection.reasonCode } : {}),
        }, current.recordRevision);
      }
    }
    return current;
  }

  async rollback(input: {
    readonly deploymentId: string;
    readonly expectedRecordRevision: number;
    readonly actor?: string;
    readonly correlationId?: string;
    readonly scope?: IsolationScope;
    readonly productionGovernance: ProductionGovernanceEvidence;
  }): Promise<DeploymentRecord> {
    const scope = input.scope ?? this.#defaultScope;
    let current = this.getDeployment(input.deploymentId, scope);
    if (!current) throw new PolicyRejectedError("deployment not found");
    if (current.status === "rolled_back") return current;
    if (current.recordRevision !== input.expectedRecordRevision) throw new DeploymentRevisionConflictError();
    if (!current.predecessorDeploymentId) throw new PolicyRejectedError("deployment has no rollback predecessor");
    const predecessorDeploymentId = current.predecessorDeploymentId;
    if (!this.#engine.rollbackDeployment) throw new PolicyRejectedError("target does not support rollback");
    const decision = await this.evaluateProductionReadiness({
      agentId: current.agentId, revision: current.revision, targetId: current.targetId, scope, governance: input.productionGovernance,
    });
    this.#productionReadinessEvaluator?.assertAllowed(decision);
    const correlationId = input.correlationId ?? `rollback_${current.deploymentId}_${Date.now()}`;
    try {
      current = this.#transition(current, "rolling_back");
      await this.#engine.rollbackDeployment({
        deploymentId: current.deploymentId,
        predecessorDeploymentId,
        targetId: current.targetId,
        expectedRevision: current.revision,
      });
      current = this.#transition({ ...current, health: "ready" }, "rolled_back");
      const predecessor = this.#repository.get(predecessorDeploymentId);
      if (predecessor && predecessor.status !== "active") {
        this.#save({ ...predecessor, status: "active", health: "ready" }, predecessor.recordRevision);
      }
      this.#auditService?.recordEvent({
        eventType: "deployment.rolled_back", correlationId, deploymentId: current.deploymentId,
        agentId: current.agentId, revision: current.revision, tenantId: scope?.tenantId, actor: input.actor,
        decision: "allowed", result: "success", metadata: { predecessorDeploymentId: current.predecessorDeploymentId, targetId: current.targetId },
      });
      return current;
    } catch (error) {
      try { current = this.#transition({ ...current, reasonCode: errorCode(error) }, "rollback_failed"); } catch { /* preserve original error */ }
      this.#auditService?.recordEvent({
        eventType: "deployment.rollback_failed", correlationId, deploymentId: current.deploymentId,
        agentId: current.agentId, revision: current.revision, tenantId: scope?.tenantId, actor: input.actor,
        decision: "denied", result: "failure", metadata: { reasonCode: errorCode(error) },
      });
      throw error;
    }
  }

  getDeployment(deploymentId: string, scope?: IsolationScope): DeploymentRecord | undefined {
    const deployment = this.#repository.get(deploymentId);
    if (!deployment) return undefined;
    assertSameIsolationScope(scope ?? this.#defaultScope, deployment.scope);
    return deployment;
  }

  listDeployments(scope?: IsolationScope): readonly DeploymentRecord[] {
    const effectiveScope = scope ?? this.#defaultScope;
    return this.#repository.list().filter((deployment) => {
      try { assertSameIsolationScope(effectiveScope, deployment.scope); return true; } catch { return false; }
    });
  }

  close(): void { this.#repository.close?.(); }

  #transition(current: DeploymentRecord, status: DeploymentLifecycleStatus): DeploymentRecord {
    if (current.status !== status && !TRANSITIONS[current.status].includes(status)) {
      throw new DeploymentRevisionConflictError(`invalid deployment transition ${current.status} -> ${status}`);
    }
    return this.#save({ ...current, status }, current.recordRevision);
  }

  #replaceEvidence(current: DeploymentRecord, evidence: DeploymentEvidenceSnapshot): DeploymentRecord {
    return this.#save({ ...current, evidence }, current.recordRevision);
  }

  #save(record: DeploymentRecord, expectedRevision: number): DeploymentRecord {
    return this.#repository.save({ ...record, recordRevision: expectedRevision + 1, updatedAt: Date.now() }, expectedRevision);
  }

  #latestActive(agentId: string, targetId: string, scope?: IsolationScope): DeploymentRecord | undefined {
    return this.listDeployments(scope)
      .filter((record) => record.agentId === agentId && record.targetId === targetId && ["active", "degraded", "deployed"].includes(record.status))
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  }

  async #assertTargetEligible(request: DeploymentRequest, correlationId: string): Promise<void> {
    if (!this.#targetService) return;
    await this.#targetService.refresh();
    const canonicalTargetId = ExecutionTargetRegistry.canonicalId(this.#engine.identity.id, request.targetId);
    const eligibility = this.#targetService.evaluateEligibility(canonicalTargetId, {
      deploymentMode: request.deploymentMode,
      engineId: this.#engine.identity.id,
      ...(request.deploymentMode === "live" ? { environment: "production", requiredCapabilities: ["deployment.live", "deployment.health", "deployment.rollback"] } : {}),
    });
    if (eligibility.eligible) return;
    const reason = eligibility.reasons.map((entry) => entry.message).join("; ");
    this.#auditService?.recordEvent({
      eventType: "deployment.failed", correlationId, agentId: request.agentId, revision: request.revision,
      actor: request.actor, decision: "denied", result: "failure", metadata: { reason: `target_ineligible: ${reason}` },
    });
    throw new PolicyRejectedError(`Target ${canonicalTargetId} is not eligible: ${reason}`);
  }

  #recordGovernance(request: DeploymentRequest, correlationId: string, decision: GovernanceDecision): void {
    this.#auditService?.recordEvent({
      eventType: "governance.evaluated", correlationId, agentId: request.agentId, revision: request.revision,
      actor: request.actor, decision: decision.allowed ? "allowed" : "denied", result: decision.allowed ? "success" : "failure",
      metadata: { deploymentMode: request.deploymentMode, reason: decision.reason, productionPolicyId: request.productionGovernance?.policyId },
    });
  }

  #reserveEconomics(request: DeploymentRequest, correlationId: string, scope?: IsolationScope): UsageReservation | undefined {
    if (!this.#economicService || !request.accountId) return undefined;
    const quote = this.#economicService.quote({
      quoteId: `quote_${request.agentId}_r${request.revision}_${Date.now()}`,
      account: { accountId: request.accountId, ownerId: request.accountId, mode: "byok", assetCode: "NEURONS", ...(scope?.tenantId ? { tenantId: scope.tenantId } : {}), ...(scope?.workloadId ? { workloadId: scope.workloadId } : {}) },
      planId: `plan_${request.agentId}_r${request.revision}`,
      estimatedUsage: { "agent.runtime": 100n },
      expiresAt: Date.now() + 3_600_000,
    });
    const reservation = this.#economicService.reserve({ reservationId: `res_${quote.quoteId}`, quoteId: quote.quoteId, idempotencyKey: `idemp_${quote.quoteId}`, expiresAt: Date.now() + 3_600_000 });
    this.#auditService?.recordEvent({ eventType: "economic.reserved", correlationId, agentId: request.agentId, revision: request.revision, actor: request.actor, decision: "passed", result: "success", metadata: { reservationId: reservation.reservationId, quoteId: quote.quoteId } });
    return reservation;
  }

  #releaseEconomics(reservation: UsageReservation | undefined, request: DeploymentRequest, correlationId: string): void {
    if (!reservation || !this.#economicService) return;
    this.#economicService.release({ reservationId: reservation.reservationId, reason: "deployment_failed" });
    this.#auditService?.recordEvent({ eventType: "economic.released", correlationId, agentId: request.agentId, revision: request.revision, actor: request.actor, decision: "passed", result: "success", metadata: { reservationId: reservation.reservationId, reason: "deployment_failed" } });
  }
}

function errorCode(error: unknown): string {
  if (error instanceof ProductionReadinessBlockedError) return "PRODUCTION_READINESS_BLOCKED";
  return error instanceof Error ? error.name || "DEPLOYMENT_FAILED" : "DEPLOYMENT_FAILED";
}
