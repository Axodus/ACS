import {
  assertRequiredAgents,
  createAcsRuntime,
  createWorkflowByName,
  inspectCapabilities,
  inspectAuditReceipts,
  inspectEmergencyStops,
  inspectObservabilityStatus,
  inspectPerformanceRecords,
  inspectPolicyCheck,
  inspectPolicyMatrix,
  inspectProductAccess,
  inspectSecretStorageStatus,
  inspectTenantServices,
  inspectUserStatus,
  listWorkflows,
  RedHatMcpAdapter,
} from "../dist/index.js";

const args = process.argv.slice(2);
const command = args[0] ?? "help";
let runtime;

try {
  switch (command) {
    case "capabilities":
      printJson(inspectCapabilities({ level: readOption(args.slice(1), "--level") }));
      break;

    case "tenant-services":
      printJson(inspectTenantServices({ tenantId: readOption(args.slice(1), "--tenant") }));
      break;

    case "product-access":
      printJson(inspectProductAccess({
        walletAddress: readOption(args.slice(1), "--wallet"),
        productId: readOption(args.slice(1), "--product"),
      }));
      break;

    case "policy-matrix":
      printJson(inspectPolicyMatrix());
      break;

    case "policy-check":
      printJson(inspectPolicyCheck({
        capabilityId: requiredOption(args.slice(1), "--capability"),
        tenantId: readOption(args.slice(1), "--tenant"),
        wallet: readOption(args.slice(1), "--wallet"),
      }));
      break;

    case "user-status":
      printJson(inspectUserStatus({
        wallet: requiredOption(args.slice(1), "--wallet"),
        tenantId: readOption(args.slice(1), "--tenant"),
        productId: readOption(args.slice(1), "--product"),
      }));
      break;

    case "performance-records":
      printJson(inspectPerformanceRecords());
      break;

    case "audit-receipts":
      printJson(inspectAuditReceipts());
      break;

    case "emergency-stops":
      printJson(inspectEmergencyStops());
      break;

    case "secret-storage-status":
      printJson(inspectSecretStorageStatus());
      break;

    case "observability-status":
      printJson(inspectObservabilityStatus());
      break;

    case "agents":
      printJson({
        agents: getRuntime().agents.list().map((agent) => ({
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
        providers: getRuntime().providers.list().map((provider) => ({
          id: provider.id,
          name: provider.name,
          status: provider.status,
          capabilities: provider.capabilities.map((capability) => capability.name),
        })),
      });
      break;

    case "receipts":
      printJson({
        receiptPath: getRuntime().receiptPath,
        receipts: getRuntime().receipts.query(parseReceiptFilter(args.slice(1))).map(toReceiptSummary),
      });
      break;

    case "telemetry":
      printJson({
        telemetryPath: getRuntime().telemetryPath,
        events: getRuntime().telemetry.list(),
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
  const runtime = getRuntime();
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

  const runtime = getRuntime();
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

function getRuntime() {
  runtime ??= createAcsRuntime({ workspaceRoot: process.cwd() });
  return runtime;
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

function requiredOption(values, optionName) {
  const value = readOption(values, optionName);
  if (!value) {
    throw new Error(`${optionName} is required`);
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
  capabilities [--level level]   Inspect ACS capabilities
  user-status --wallet wallet    Inspect summarized user/product status
  performance-records            Inspect mock/internal-validation performance records
  audit-receipts                  Inspect ACS policy/status audit receipt previews
  emergency-stops                 Inspect active mock emergency stop records
  secret-storage-status           Inspect secret storage contract status
  observability-status            Inspect HTTP/runtime observability contract status
  tenant-services [filters]      Inspect tenant service access
  product-access [filters]       Inspect product access rules
  policy-matrix                  Inspect ACS policy matrix
  policy-check --capability id   Inspect a capability policy decision
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

Inspection filters:
  capabilities --level <core|service|product>
  tenant-services --tenant <tenantId>
  product-access --wallet <walletAddress>
  product-access --product <productId>
  policy-check --capability <capabilityId> [--tenant <tenantId>] [--wallet <walletAddress>]
  user-status --wallet <walletAddress> [--tenant <tenantId>] [--product <productId>]
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
