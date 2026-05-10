import { PolicyRejectedError } from "./errors.js";
import type { AgentRegistry } from "./agents.js";
import type { ProviderRegistry } from "./providers.js";
import type { GovernancePolicy } from "./policy.js";
import type { ReceiptStore } from "./receipts.js";
import type { TelemetrySink } from "./telemetry.js";
import type { ExecutionId, ExecutionReceipt, TelemetryId, WorkflowDefinition, WorkflowStepReceipt } from "./types.js";

export interface OrchestratorOptions {
  readonly agents: AgentRegistry;
  readonly providers: ProviderRegistry;
  readonly policy: GovernancePolicy;
  readonly telemetry: TelemetrySink;
  readonly receipts?: ReceiptStore;
}

export class AcsOrchestrator {
  readonly #agents: AgentRegistry;
  readonly #providers: ProviderRegistry;
  readonly #policy: GovernancePolicy;
  readonly #telemetry: TelemetrySink;
  readonly #receipts: ReceiptStore | undefined;
  #sequence = 0;

  constructor(options: OrchestratorOptions) {
    this.#agents = options.agents;
    this.#providers = options.providers;
    this.#policy = options.policy;
    this.#telemetry = options.telemetry;
    this.#receipts = options.receipts;
  }

  execute(workflow: WorkflowDefinition): ExecutionReceipt {
    const telemetryIds: TelemetryId[] = [];
    const workflowRunId = workflow.workflowRunId ?? workflow.id;
    const accepted = this.#policy.evaluateWorkflow(workflow);

    if (!accepted.allowed) {
      const event = this.#telemetry.record("workflow.rejected", workflow.id, { reason: accepted.reason });
      return this.#saveReceipt({
        id: this.#nextExecutionId(),
        workflowId: workflow.id,
        workflowRunId,
        status: "rejected",
        startedAt: event.timestamp,
        steps: [],
        telemetryIds: [event.id],
        rejectionReason: accepted.reason ?? "workflow rejected by policy",
      });
    }

    telemetryIds.push(this.#telemetry.record("workflow.accepted", workflow.id).id);
    const started = this.#telemetry.record("workflow.started", workflow.id);
    telemetryIds.push(started.id);

    const stepReceipts: WorkflowStepReceipt[] = [];

    try {
      for (const step of workflow.steps) {
        const agent = this.#agents.require(step.agentId);
        const stepDecision = this.#policy.evaluateStep(workflow, step, agent);
        if (!stepDecision.allowed) {
          throw new PolicyRejectedError(stepDecision.reason ?? "workflow step rejected by policy");
        }

        const provider = step.providerCapability
          ? this.#providers.findAvailableByCapability(step.providerCapability)
          : undefined;

        if (step.providerCapability && !provider) {
          throw new PolicyRejectedError(`no available provider for capability: ${step.providerCapability}`);
        }

        stepReceipts.push({
          stepId: step.id,
          agentId: step.agentId,
          status: "completed",
          ...(provider ? { providerId: provider.id } : {}),
        });
      }

      const completed = this.#telemetry.record("workflow.completed", workflow.id, { steps: stepReceipts.length });
      telemetryIds.push(completed.id);

      return this.#saveReceipt({
        id: this.#nextExecutionId(),
        workflowId: workflow.id,
        workflowRunId,
        status: "completed",
        startedAt: started.timestamp,
        completedAt: completed.timestamp,
        steps: stepReceipts,
        telemetryIds,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown workflow failure";
      const failed = this.#telemetry.record("workflow.failed", workflow.id, { reason });
      telemetryIds.push(failed.id);

      return this.#saveReceipt({
        id: this.#nextExecutionId(),
        workflowId: workflow.id,
        workflowRunId,
        status: "failed",
        startedAt: started.timestamp,
        completedAt: failed.timestamp,
        steps: stepReceipts,
        telemetryIds,
        rejectionReason: reason,
      });
    }
  }

  #saveReceipt(receipt: ExecutionReceipt): ExecutionReceipt {
    this.#receipts?.save(receipt);
    return receipt;
  }

  #nextExecutionId(): ExecutionId {
    this.#sequence += 1;
    return `exec_${this.#sequence.toString().padStart(6, "0")}`;
  }
}
