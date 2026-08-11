import {
  ExecutionPlan,
  AgentRevision,
  AgentComposition,
  DeploymentMode,
} from "./unified-agent-model.js";
import { ExecutionTargetService } from "../targets/execution-target-service.js";
import { ExecutionTargetRegistry } from "../targets/execution-target-registry.js";
import { ModelProviderRegistry } from "../intelligence/model-provider-registry.js";
import { CredentialConnectionRegistry } from "../intelligence/credential-registry.js";
import { AgentRunnerRegistry } from "../intelligence/agent-runner-registry.js";
import { EngineRegistry } from "../engines/engine-registry.js";
import type { IsolationScope } from "./isolation.js";
import { createHash } from "node:crypto";

export interface PlanResolutionRequest {
  readonly agentRevision: AgentRevision;
  readonly composition: AgentComposition;
  readonly engineId: string;
  readonly targetId: string;
  readonly deploymentMode: DeploymentMode;
  readonly correlationId: string;
  readonly scope?: IsolationScope;
}

export class ExecutionPlanResolver {
  readonly #targetService: ExecutionTargetService;
  readonly #providers: ModelProviderRegistry;
  readonly #credentials: CredentialConnectionRegistry;
  readonly #runners: AgentRunnerRegistry;
  readonly #engines: EngineRegistry;

  constructor(input: {
    targetService: ExecutionTargetService;
    providers: ModelProviderRegistry;
    credentials: CredentialConnectionRegistry;
    runners: AgentRunnerRegistry;
    engines: EngineRegistry;
  }) {
    this.#targetService = input.targetService;
    this.#providers = input.providers;
    this.#credentials = input.credentials;
    this.#runners = input.runners;
    this.#engines = input.engines;
  }

  async resolve(request: PlanResolutionRequest): Promise<ExecutionPlan> {
    const { agentRevision, composition, engineId, targetId, deploymentMode, correlationId, scope } = request;

    // 1. Validate Engine Existence
    const engine = this.#engines.get(engineId);
    const canonicalTargetId = ExecutionTargetRegistry.canonicalId(engineId, targetId);

    // 2. Validate Target Eligibility (canonical identity: engineId/targetId)
    const eligibility = this.#targetService.evaluateEligibility(canonicalTargetId, {
      deploymentMode,
      engineId,
    });

    if (!eligibility.eligible) {
      const reason = eligibility.reasons.map((r) => r.message).join("; ");
      throw new Error(
        `Execution target ${canonicalTargetId} is not eligible for ${deploymentMode} deployment: ${reason}`,
      );
    }

    // 3. Resolve Model and Credential
    const strategy = composition.effective.modelStrategy;
    if (!strategy) {
      throw new Error("Agent composition lacks a model strategy; cannot resolve execution plan");
    }

    const primary = strategy.primary;
    this.#providers.get(primary.providerId);

    if (primary.credentialConnectionId) {
      this.#credentials.get(primary.credentialConnectionId);
    }

    // 4. Resolve Runner (if any)
    let resolvedRunnerId: string | undefined;
    if (strategy.runnerId) {
      this.#runners.get(strategy.runnerId);
      resolvedRunnerId = strategy.runnerId;
    } else if (composition.effective.runnerPreferences.length > 0) {
      // Simple first-available preference logic
      for (const pref of composition.effective.runnerPreferences) {
        try {
          this.#runners.get(pref);
          resolvedRunnerId = pref;
          break;
        } catch {
          continue;
        }
      }
    }

    // Engine revision is optional revision metadata, never logical identity.
    const engineVersion = await engine.version().catch(() => undefined);
    const engineRevision = engineVersion?.sourceRevision ?? engineVersion?.packageVersion;
    const digest = createHash("sha256").update(correlationId).digest("hex").slice(0, 12);

     return {
       planId: `plan_${agentRevision.agentId}_r${agentRevision.revision}_${digest}`,
       agentId: agentRevision.agentId,
       agentRevision: agentRevision.revision,
       compositionFingerprint: composition.fingerprint,
       ...(scope?.tenantId ? { tenantId: scope.tenantId } : {}),
       ...(scope?.workloadId ? { workloadId: scope.workloadId } : {}),
       engineId,
       ...(engineRevision ? { engineRevision } : {}),
       executionTargetId: targetId,
       ...(resolvedRunnerId !== undefined ? { runnerId: resolvedRunnerId } : {}),
       providerId: primary.providerId,
       modelId: primary.modelId,
       ...(primary.credentialConnectionId !== undefined ? { credentialConnectionId: primary.credentialConnectionId } : {}),
       governancePolicyId: "default-sandbox-policy",
      economicPolicyId: "default-dev-policy",
      isolationMode: "sandbox",
      deploymentMode,
      createdAt: Date.now(),
      correlationId,
    };
  }
}
