import assert from "node:assert/strict";
import test from "node:test";
import { createWorkflowByName, listWorkflows } from "../dist/index.js";

test("registers named versioned workflows", () => {
  const workflows = listWorkflows();

  assert.deepEqual(
    workflows.map((workflow) => workflow.name),
    ["dev-coordination", "security-review", "governance-alignment", "implementation-plan"],
  );
  assert.ok(workflows.every((workflow) => workflow.version === "1.0.0"));
});

test("creates implementation-plan workflow by name", () => {
  const workflow = createWorkflowByName("implementation-plan", "implementation-plan:test");

  assert.equal(workflow.id, "implementation-plan");
  assert.equal(workflow.workflowRunId, "implementation-plan:test");
  assert.equal(workflow.steps[0].agentId, "redhat");
});
