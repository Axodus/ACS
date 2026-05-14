import {
  assertRequiredAgents,
  createAcsRuntime,
  createWorkflowByName,
  listWorkflows,
  RedHatMcpAdapter,
} from "../dist/index.js";

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const runtime = createAcsRuntime({ workspaceRoot: process.cwd() });

try {
  switch (command) {
    case "agents":
      printJson({
        agents: runtime.agents.list().map((agent) => ({
          id: agent.id,
          sourceIds: agent.sourceIds,
          name: agent.name,
          role: agent.role,
          agentClass: agent.agentClass,
          audience: agent.audience,
          exclusiveTo: agent.exclusiveTo,
          canSpawnSubAgents: agent.canSpawnSubAgents,
          subAgentScope: agent.subAgentScope,
          status: agent.status,
          permissions: agent.permissions.map((permission) => permission.name),
        })),
      });
      break;

    case "providers":
      printJson({
        providers: runtime.providers.list().map((provider) => ({
          id: provider.id,
          name: provider.name,
          status: provider.status,
          capabilities: provider.capabilities.map((capability) => capability.name),
        })),
      });
      break;

    case "receipts":
      printJson({
        receiptPath: runtime.receiptPath,
        receipts: runtime.receipts.query(parseReceiptFilter(args.slice(1))).map(toReceiptSummary),
      });
      break;

    case "telemetry":
      printJson({
        telemetryPath: runtime.telemetryPath,
        events: runtime.telemetry.list(),
      });
      break;

    case "smoke":
      executeWorkflow("dev-coordination", ["--run-id", "smoke:dev-coordination", ...args.slice(1)]);
      break;

    case "workflow":
      executeWorkflow(args[1], args.slice(2));
      break;

    case "workflows":
      printJson({
        workflows: listWorkflows().map((workflow) => ({
          name: workflow.name,
          version: workflow.version,
          description: workflow.description,
        })),
      });
      break;

    case "redhat":
      runRedHatCommand(args.slice(1));
      break;

    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;

    default:
      throw new Error(`unknown command: ${command}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown ACS CLI failure";
  console.error(message);
  process.exitCode = 1;
}

function runRedHatCommand(redHatArgs) {
  const subcommand = redHatArgs[0] ?? "help";
  const openClawAgentsRoot = process.env.ACS_OPENCLAW_AGENTS_ROOT ?? runtime.openClawRoot;
  const adapter = new RedHatMcpAdapter({
    redHatRoot: `${openClawAgentsRoot}/redhat`,
    telemetry: runtime.telemetry,
  });

  switch (subcommand) {
    case "skills":
      printJson({ skills: adapter.listSkills() });
      break;

    case "describe":
      if (!redHatArgs[1]) {
        throw new Error("skill id is required");
      }
      printJson({ skill: adapter.describeSkill(redHatArgs[1]) });
      break;

    case "plan": {
      const task = redHatArgs.slice(1).join(" ").trim();
      if (!task) {
        throw new Error("task text is required");
      }
      printJson({ plan: adapter.planTask({ task }) });
      break;
    }

    case "guarded": {
      const task = redHatArgs.slice(1).join(" ").trim();
      if (!task) {
        throw new Error("task text is required");
      }
      printJson({ result: adapter.executeGuardedTask({ task }) });
      break;
    }

    case "help":
    case "--help":
    case "-h":
      printRedHatHelp();
      break;

    default:
      throw new Error(`unknown redhat command: ${subcommand}`);
  }
}

function executeWorkflow(name, workflowArgs) {
  if (!name) {
    throw new Error("workflow name is required");
  }

  assertRequiredAgents(runtime.agents.list(), ["redhat", "morpheus", "agentsmith"]);

  const workflowRunId = readOption(workflowArgs, "--run-id");
  const force = workflowArgs.includes("--force");
  const workflow = createWorkflowByName(name, workflowRunId);
  const receipt = runtime.execute(workflow, { force });

  printJson({
    receiptPath: runtime.receiptPath,
    workflow: name,
    forced: force,
    receipt: toReceiptSummary(receipt),
  });

  if (receipt.status !== "completed") {
    process.exitCode = 1;
  }
}

function parseReceiptFilter(receiptArgs) {
  return {
    ...(readOption(receiptArgs, "--workflow-run") ? { workflowRunId: readOption(receiptArgs, "--workflow-run") } : {}),
    ...(readOption(receiptArgs, "--workflow") ? { workflowId: readOption(receiptArgs, "--workflow") } : {}),
    ...(readOption(receiptArgs, "--agent") ? { agentId: readOption(receiptArgs, "--agent") } : {}),
    ...(readOption(receiptArgs, "--status") ? { status: readOption(receiptArgs, "--status") } : {}),
  };
}

function readOption(values, optionName) {
  const index = values.indexOf(optionName);
  if (index === -1) {
    return undefined;
  }

  const value = values[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`missing value for ${optionName}`);
  }

  return value;
}

function toReceiptSummary(receipt) {
  return {
    id: receipt.id,
    workflowId: receipt.workflowId,
    workflowRunId: receipt.workflowRunId,
    status: receipt.status,
    startedAt: receipt.startedAt,
    completedAt: receipt.completedAt,
    steps: receipt.steps,
    rejectionReason: receipt.rejectionReason,
  };
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`ACS local CLI

Commands:
  agents                         List discovered OpenClaw agents
  providers                      List local providers
  workflows                      List registered workflow names
  telemetry                      List persisted telemetry events
  smoke [--force]                Run the dev-coordination smoke workflow
  workflow <name> [--run-id id]  Run a named workflow
  receipts [filters]             List execution receipts
  redhat skills                  List RedHat Dev skills safely
  redhat describe <skillId>      Describe a RedHat Dev skill safely
  redhat plan <task>             Plan a task through the safe RedHat adapter
  redhat guarded <task>          Classify and block a guarded task contract

Receipt filters:
  --workflow-run <id>
  --workflow <id>
  --agent <id>
  --status <completed|failed|rejected>
`);
}

function printRedHatHelp() {
  console.log(`ACS RedHat safe adapter

Commands:
  redhat skills
  redhat describe <skillId>
  redhat plan <task>
  redhat guarded <task>

Boundary:
  Reads local RedHat Dev skill metadata only. Does not execute commands,
  mutate files, call MCP tools, or run OpenClaw agents.
`);
}
