import type { AgentEngine, DeploymentResult } from "../engines/agent-engine.js";
import { EngineSandboxOnlyError } from "../engines/engine-errors.js";
import type { ExecutionTargetService } from "../targets/execution-target-service.js";
import type { EconomicService, UsageReservation } from "./neurons-economic-contract.js";

export interface DeploymentRequest {
  readonly agentId: string;
  readonly revision: number;
  readonly composition: Record<string, unknown>;
  readonly deploymentMode: "sandbox" | "staged" | "live" | string;
  readonly targetId: string;
  readonly accountId?: string;
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
  readonly #deployments = new Map<string, DeploymentRecord>();

  constructor(options: {
    engine: AgentEngine;
    targetService?: ExecutionTargetService;
    economicService?: EconomicService;
  }) {
    this.#engine = options.engine;
    this.#targetService = options.targetService;
    this.#economicService = options.economicService;
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
    const gov = this.evaluateGovernance(request.deploymentMode);
    if (!gov.allowed) {
      throw new EngineSandboxOnlyError(gov.reason, {
        code: "ACS_ENGINE_SANDBOX_ONLY",
        details: { deploymentMode: request.deploymentMode },
      });
    }

    if (this.#targetService) {
      const eligibility = await this.#targetService.evaluateEligibility(request.targetId, {
        deploymentMode: request.deploymentMode,
        engineId: this.#engine.identity.id,
      });
      if (!eligibility.eligible) {
        const reason = eligibility.reasons.map((r) => r.message).join("; ");
        throw new Error(`Target ${request.targetId} is not eligible: ${reason}`);
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
      reservation = this.#economicService.reserve({
        reservationId: `res_${quote.quoteId}`,
        quoteId: quote.quoteId,
        idempotencyKey: `idemp_${quote.quoteId}`,
        expiresAt: Date.now() + 3600000,
      });
    }

    try {
      const result: DeploymentResult = await this.#engine.deployAgent({
        agentId: request.agentId,
        revision: request.revision,
        composition: request.composition,
        deploymentMode: request.deploymentMode,
        targetId: request.targetId,
        executionPlanId: `plan_${request.agentId}_r${request.revision}`,
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
      return record;
    } catch (error) {
      if (reservation && this.#economicService) {
        this.#economicService.release({
          reservationId: reservation.reservationId,
          reason: "deployment_failed",
        });
      }
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
