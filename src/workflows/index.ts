import { DEV_COORDINATION_WORKFLOW } from "./dev-coordination.js";
import { GOVERNANCE_ALIGNMENT_WORKFLOW } from "./governance-alignment.js";
import { IMPLEMENTATION_PLAN_WORKFLOW } from "./implementation-plan.js";
import { SECURITY_REVIEW_WORKFLOW } from "./security-review.js";
import type { RegisteredWorkflow } from "./types.js";

export { DEV_COORDINATION_WORKFLOW } from "./dev-coordination.js";
export { GOVERNANCE_ALIGNMENT_WORKFLOW } from "./governance-alignment.js";
export { IMPLEMENTATION_PLAN_WORKFLOW } from "./implementation-plan.js";
export { SECURITY_REVIEW_WORKFLOW } from "./security-review.js";
export type { RegisteredWorkflow, WorkflowFactoryOptions } from "./types.js";

const WORKFLOWS: readonly RegisteredWorkflow[] = [
  DEV_COORDINATION_WORKFLOW,
  SECURITY_REVIEW_WORKFLOW,
  GOVERNANCE_ALIGNMENT_WORKFLOW,
  IMPLEMENTATION_PLAN_WORKFLOW,
];

export function listWorkflows(): readonly RegisteredWorkflow[] {
  return [...WORKFLOWS];
}

export function listWorkflowNames(): readonly string[] {
  return WORKFLOWS.map((workflow) => workflow.name);
}

export function createWorkflowByName(name: string, workflowRunId?: string) {
  const workflow = WORKFLOWS.find((entry) => entry.name === name);
  if (!workflow) {
    throw new Error(`unknown ACS workflow: ${name}`);
  }

  return workflow.create({ workflowRunId });
}

export function createDevelopmentCoordinationWorkflow(workflowRunId = "dev-coordination:local") {
  return DEV_COORDINATION_WORKFLOW.create({ workflowRunId });
}
