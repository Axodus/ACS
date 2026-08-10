import type { AgentEngine, DeploymentResult } from "../engines/agent-engine.js";
import { EngineSandboxOnlyError } from "../engines/engine-errors.js";
import type { ExecutionTargetService } from "../targets/execution-target-service.js";
import { ExecutionTargetRegistry } from "../targets/execution-target-registry.js";
import { PolicyRejectedError } from "../errors.js";
import type { EconomicService, UsageReservation } from "./neurons-economic-contract.js";
import type { AgentService } from "./agent-service.js";
import { ExecutionPlanResolver } from "./execution-plan-resolver.js";
import type { DeploymentMode } from "./unified-agent-model.js";
import type { AuditService } from "./audit-service.js";

export interface DeploymentRequest {
  readonly agentId: string;
  readonly revision: number;
  readonly composition: Record<string, unknown>;
  readonly deploymentMode: "sandbox" | "staged" | "live" | string;
  readonly targetId: string;
  readonly accountId?: string;
  readonly actor?: string;
  readonly correlationId?: string;
}

export interface DeploymentRecord {
  readonly deploymentId: string;
  readonly agentId: string;
  readonly revision: number;
  readonly targetId: string;
  readonly deploymentMode: string;
  readonly status: "deployed" | "failed" | "rejected";
  readonly artifactPath?: string;
  readonly reservationId?: string;
  readonly createdAt: number;
}

export interface GovernanceDecision {
  readonly allowed: boolean;
  readonly decision: "allowed" | "denied";
  readonly reason: string;
}

export class DeploymentService {
  readonly #engine: AgentEngine;
  readonly #targetService: ExecutionTargetService | undefined;
  readonly #economicService: EconomicService | undefined;
  readonly #agentService: AgentService;
  readonly #resolver: ExecutionPlanResolver;
  readonly #auditService: AuditService | undefined;
  readonly #deployments = new Map<string, DeploymentRecord>();

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
  }) {
    this.#engine = options.engine;
    this.#targetService = options.targetService;
    this.#economicService = options.economicService;
    this.#agentService = options.agentService;
    this.#resolver = options.resolver;
    this.#auditService = options.auditService;
  }

  evaluateGovernance(mode: string): GovernanceDecision {
    if (mode !== "sandbox") {
      return {
        allowed: false,
        decision: "denied",
        reason: `Deployment mode "${mode}" is prohibited. Only "sandbox" deployment mode is allowed.`,
      };
    }
    return {
      allowed: true,
      decision: "allowed",
      reason: "Sandbox deployment governance policy satisfied.",
    };
  }

  async deploy(request: DeploymentRequest): Promise<DeploymentRecord> {
    const correlationId =
      request.correlationId ?? `deploy_${request.agentId}_r${request.revision}_${Date.now()}`;
    const actor = request.actor;

    if (!DeploymentService.isDeploymentMode(request.deploymentMode)) {
      throw new PolicyRejectedError(`Invalid deployment mode: ${request.deploymentMode}`);
    }

    const gov = this.evaluateGovernance(request.deploymentMode);
    this.#auditService?.recordEvent({
      eventType: "governance.evaluated",
      correlationId,
      agentId: request.agentId,
      revision: request.revision,
      ...(actor ? { actor } : {}),
      decision: gov.allowed ? "allowed" : "denied",
      result: gov.allowed ? "success" : "failure",
      metadata: { deploymentMode: request.deploymentMode, reason: gov.reason },
    });
    if (!gov.allowed) {
      throw new EngineSandboxOnlyError(gov.reason, {
        code: "ACS_ENGINE_SANDBOX_ONLY",
        details: { deploymentMode: request.deploymentMode },
      });
    }

    if (this.#targetService) {
      const canonicalTargetId = ExecutionTargetRegistry.canonicalId(
        this.#engine.identity.id,
        request.targetId,
      );
      const eligibility = this.#targetService.evaluateEligibility(canonicalTargetId, {
        deploymentMode: request.deploymentMode,
        engineId: this.#engine.identity.id,
      });
      if (!eligibility.eligible) {
        const reason = eligibility.reasons.map((r) => r.message).join("; ");
        this.#auditService?.recordEvent({
          eventType: "deployment.failed",
          correlationId,
          agentId: request.agentId,
          revision: request.revision,
          ...(actor ? { actor } : {}),
          decision: "denied",
          result: "failure",
          metadata: { reason: `target_ineligible: ${reason}` },
        });
        throw new PolicyRejectedError(`Target ${canonicalTargetId} is not eligible: ${reason}`);
      }
    }

    let reservation: UsageReservation | undefined;
    if (this.#economicService && request.accountId) {
      const quote = this.#economicService.quote({
        quoteId: `quote_${request.agentId}_r${request.revision}_${Date.now()}`,
        account: {
          accountId: request.accountId,
          ownerId: request.accountId,
          mode: "byok",
          assetCode: "NEURONS",
        },
        planId: `plan_${request.agentId}_r${request.revision}`,
        estimatedUsage: { "agent.runtime": 100n },
        expiresAt: Date.now() + 3600000,
      });
      this.#auditService?.recordEvent({
        eventType: "economic.quoted",
        correlationId,
        agentId: request.agentId,
        revision: request.revision,
        ...(actor ? { actor } : {}),
        decision: "passed",
        result: "success",
        metadata: { quoteId: quote.quoteId, planId: quote.planId },
      });
      reservation = this.#economicService.reserve({
        reservationId: `res_${quote.quoteId}`,
        quoteId: quote.quoteId,
        idempotencyKey: `idemp_${quote.quoteId}`,
        expiresAt: Date.now() + 3600000,
      });
      this.#auditService?.recordEvent({
        eventType: "economic.reserved",
        correlationId,
        agentId: request.agentId,
        revision: request.revision,
        ...(actor ? { actor } : {}),
        decision: "passed",
        result: "success",
        metadata: { reservationId: reservation.reservationId, quoteId: quote.quoteId },
      });
    }

    try {
      const agentRevision = this.#agentService.get(request.agentId);
      const { revision, composition } = this.#agentService.compose(request.agentId);

      const executionPlan = await this.#resolver.resolve({
        agentRevision,
        composition,
        engineId: this.#engine.identity.id,
       targetId: request.targetId,
        deploymentMode: request.deploymentMode,
       correlationId,
      });

      this.#auditService?.recordEvent({
        eventType: "agent.plan_resolved",
        correlationId,
        agentId: agentRevision.agentId,
        revision: agentRevision.revision,
        ...(actor ? { actor } : {}),
        decision: "passed",
        result: "success",
        metadata: {
          planId: executionPlan.planId,
          engineId: executionPlan.engineId,
          executionTargetId: executionPlan.executionTargetId,
        },
      });

      this.#auditService?.recordEvent({
        eventType: "deployment.requested",
        correlationId,
        agentId: request.agentId,
        revision: request.revision,
        ...(actor ? { actor } : {}),
        decision: "passed",
        result: "pending",
        metadata: {
          executionPlanId: executionPlan.planId,
          deploymentMode: request.deploymentMode,
          targetId: request.targetId,
        },
      });

      const result: DeploymentResult = await this.#engine.deployAgent({
        agentId: request.agentId,
        revision: request.revision,
        composition: request.composition,
        deploymentMode: request.deploymentMode,
        targetId: request.targetId,
        executionPlanId: executionPlan.planId,
      });

      const artifactPath = result.artifactPath;
      const reservationId = reservation?.reservationId;

      const record: DeploymentRecord = {
        deploymentId: result.deploymentId,
        agentId: result.agentId,
        revision: result.revision,
        targetId: result.targetId,
        deploymentMode: result.deploymentMode,
        status: "deployed",
        createdAt: result.timestamp,
        ...(artifactPath ? { artifactPath } : {}),
        ...(reservationId ? { reservationId } : {}),
      };

      this.#deployments.set(record.deploymentId, record);

      this.#auditService?.recordEvent({
        eventType: "deployment.completed",
        correlationId,
        agentId: record.agentId,
        revision: record.revision,
        deploymentId: record.deploymentId,
        ...(actor ? { actor } : {}),
        decision: "allowed",
        result: "success",
        metadata: {
          executionPlanId: executionPlan.planId,
          targetId: record.targetId,
          deploymentMode: record.deploymentMode,
        },
      });

      return record;
    } catch (error) {
      if (reservation && this.#economicService) {
        this.#economicService.release({
          reservationId: reservation.reservationId,
          reason: "deployment_failed",
        });
        this.#auditService?.recordEvent({
          eventType: "economic.released",
          correlationId,
          agentId: request.agentId,
          revision: request.revision,
          ...(actor ? { actor } : {}),
          decision: "passed",
          result: "success",
          metadata: { reservationId: reservation.reservationId, reason: "deployment_failed" },
        });
      }
      this.#auditService?.recordEvent({
        eventType: "deployment.failed",
        correlationId,
        agentId: request.agentId,
        revision: request.revision,
        ...(actor ? { actor } : {}),
        decision: "denied",
        result: "failure",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  getDeployment(deploymentId: string): DeploymentRecord | undefined {
    return this.#deployments.get(deploymentId);
  }

  listDeployments(): readonly DeploymentRecord[] {
    return Array.from(this.#deployments.values());
  }
}
