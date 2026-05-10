import { homedir } from "node:os";
import { join } from "node:path";
import { AgentRegistry } from "./agents.js";
import { AcsOrchestrator } from "./orchestrator.js";
import { discoverOpenClawAgents } from "./openclaw.js";
import { BoundedGovernancePolicy, type GovernancePolicy } from "./policy.js";
import { ProviderRegistry } from "./providers.js";
import { JsonlReceiptStore, type ReceiptStore } from "./receipts.js";
import { JsonlTelemetrySink, type TelemetrySink } from "./telemetry.js";
import type { AgentDefinition, ExecutionReceipt, ProviderDefinition, WorkflowDefinition } from "./types.js";
import { createDevelopmentCoordinationWorkflow } from "./workflows/index.js";

export interface AcsRuntimeOptions {
  readonly workspaceRoot?: string;
  readonly openClawRoot?: string;
  readonly receiptPath?: string;
  readonly telemetryPath?: string;
  readonly policy?: GovernancePolicy;
  readonly telemetry?: TelemetrySink;
  readonly receipts?: ReceiptStore;
  readonly providers?: readonly ProviderDefinition[];
}

export interface AcsRuntime {
  readonly workspaceRoot: string;
  readonly openClawRoot: string;
  readonly receiptPath: string;
  readonly telemetryPath: string;
  readonly agents: AgentRegistry;
  readonly providers: ProviderRegistry;
  readonly telemetry: TelemetrySink;
  readonly receipts: ReceiptStore;
  readonly orchestrator: AcsOrchestrator;
  execute(workflow: WorkflowDefinition, options?: AcsRuntimeExecuteOptions): ExecutionReceipt;
}

export interface AcsRuntimeExecuteOptions {
  readonly force?: boolean;
}

const DEFAULT_BLOCKED_ACTIONS = [
  "treasury.transfer",
  "wallet.sign",
  "provider.execute.production",
  "permissions.escalate",
];

export function createAcsRuntime(options: AcsRuntimeOptions = {}): AcsRuntime {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const openClawRoot = options.openClawRoot ?? join(homedir(), ".openclaw", "agents");
  const receiptPath = options.receiptPath ?? join(workspaceRoot, ".acs", "receipts", "execution.jsonl");
  const telemetryPath = options.telemetryPath ?? join(workspaceRoot, ".acs", "telemetry", "events.jsonl");

  const agents = new AgentRegistry();
  const providers = new ProviderRegistry();
  const telemetry = options.telemetry ?? new JsonlTelemetrySink(telemetryPath);
  const receipts = options.receipts ?? new JsonlReceiptStore(receiptPath);
  const policy = options.policy ?? new BoundedGovernancePolicy(DEFAULT_BLOCKED_ACTIONS, 20);

  for (const agent of discoverOpenClawAgents({ rootPath: openClawRoot })) {
    agents.register(agent);
    telemetry.record("agent.registered", agent.id, {
      name: agent.name,
      sourceIds: agent.sourceIds ?? [agent.id],
      agentClass: agent.agentClass,
      audience: agent.audience,
      exclusiveTo: agent.exclusiveTo,
      canSpawnSubAgents: agent.canSpawnSubAgents,
      subAgentScope: agent.subAgentScope,
      permissions: agent.permissions.map((permission) => permission.name),
    });
  }

  for (const provider of options.providers ?? createDefaultLocalProviders()) {
    providers.register(provider);
    telemetry.record("provider.registered", provider.id, {
      capabilities: provider.capabilities.map((capability) => capability.name),
      status: provider.status,
    });
  }

  const orchestrator = new AcsOrchestrator({ agents, providers, policy, telemetry, receipts });

  return {
    workspaceRoot,
    openClawRoot,
    receiptPath,
    telemetryPath,
    agents,
    providers,
    telemetry,
    receipts,
    orchestrator,
    execute: (workflow: WorkflowDefinition, executeOptions: AcsRuntimeExecuteOptions = {}) => {
      const workflowRunId = workflow.workflowRunId ?? workflow.id;
      const existingReceipt = receipts.findByWorkflowRunId(workflowRunId);

      if (existingReceipt && executeOptions.force !== true) {
        telemetry.record("workflow.rejected", workflow.id, {
          reason: "duplicate workflow run",
          workflowRunId,
          existingExecutionId: existingReceipt.id,
        });
        return existingReceipt;
      }

      return orchestrator.execute({
        ...workflow,
        workflowRunId,
      });
    },
  };
}

export function createDefaultLocalProviders(): readonly ProviderDefinition[] {
  return [
    {
      id: "local-acs-coordination",
      name: "Local ACS Coordination Provider",
      status: "available",
      capabilities: [
        { name: "coordination", description: "Local workflow coordination without external execution." },
        { name: "development-orchestration", description: "Local development planning and validation routing." },
        { name: "validation", description: "Local review and validation coordination." },
      ],
      pricing: { unit: "execution", currency: "USD", amount: 0 },
    },
  ];
}

export { createDevelopmentCoordinationWorkflow };

export function assertRequiredAgents(agents: readonly AgentDefinition[], requiredAgentIds: readonly string[]): void {
  const registered = new Set(agents.map((agent) => agent.id));
  const missing = requiredAgentIds.filter((agentId) => !registered.has(agentId));

  if (missing.length > 0) {
    throw new Error(`missing required OpenClaw agents: ${missing.join(", ")}`);
  }
}
