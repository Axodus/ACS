import {
  assertRequiredAgents,
  createAcsRuntime,
  createDevelopmentCoordinationWorkflow,
} from "../dist/index.js";

const runtime = createAcsRuntime({ workspaceRoot: process.cwd() });
const agents = runtime.agents.list();

assertRequiredAgents(agents, ["redhat", "morpheus", "agentsmith"]);

const receipt = runtime.execute(createDevelopmentCoordinationWorkflow("smoke:runtime"));

console.log(JSON.stringify({
  receiptPath: runtime.receiptPath,
  status: receipt.status,
  workflowId: receipt.workflowId,
  workflowRunId: receipt.workflowRunId,
  executionId: receipt.id,
  steps: receipt.steps,
  telemetryEvents: runtime.telemetry.list().length,
}, null, 2));

if (receipt.status !== "completed") {
  process.exitCode = 1;
}
