import assert from "node:assert/strict";
import test from "node:test";
import { createWorkforceProductApi } from "../dist/control-plane/product-api-workforce.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { routeProductApiRequest } from "../dist/http/routes/product-api-routes.js";

const revision = (n, name = `Workforce ${n}`) => ({ ref: { entity_id: "wf-1", revision: n, fingerprint: `fp-${n}` }, display_name: name, purpose: "test", lifecycle_status: "active", members: [{ slot_id: "slot-1" }], commit: { created_by: "test", committed_at: n, change_reason: "test" } });
const run = { run_id: "run-1", definition_refs: { workforce_revision_ref: { entity_id: "wf-1", revision: 1, fingerprint: "fp-1" } }, status: "running" };
const assignment1 = { assignment_id: "a-1", run_id: "run-1", task_id: "task-1", member_slot_id: "slot-1", generation: 1, agent_id: "agent-1", workforce_revision_ref: { entity_id: "wf-1", revision: 1 }, resolved_agent_revision_ref: { entity_id: "agent-1", revision: 2 }, decision_id: "d-1" };
const assignment2 = { ...assignment1, assignment_id: "a-2", generation: 2, decision_id: "d-2", supersedes_assignment_id: "a-1" };

function fakeCore() {
  const definitions = [{ workforce_id: "wf-1", current_revision: 2, current_status: "active", updated_at: 20 }];
  return {
    listWorkforceDefinitions: async () => definitions,
    listWorkforceRevisions: async () => [revision(1), revision(2)],
    getWorkforceLineage: async () => ({ definition: definitions[0], revisions: [revision(1), revision(2)] }),
    getRun: async (id) => id === "run-1" ? run : undefined,
    getRunMembership: async () => [{ snapshot_id: "snap-1", run_id: "run-1", workforce_id: "wf-1", workforce_revision: 1, slot_id: "slot-1", agent_id: "agent-1", agent_revision: 2 }],
    listCoordinationProposals: async () => [{ proposal_id: "p-1", run_id: "run-1", task_id: "task-1", source: "human" }],
    listCoordinationDecisions: async () => [{ decision_id: "d-2", run_id: "run-1", task_id: "task-1", status: "accepted" }],
    getCurrentTaskAssignment: async () => assignment2,
    listTaskAssignments: async () => [assignment1, assignment2],
    listExecutionIntents: async () => [{ intent_id: "i-2", run_id: "run-1", task_id: "task-1", assignment_id: "a-2", assignment_generation: 2 }],
    listAttempts: async () => [{ attempt_id: "attempt-2", task_run_id: "task-1", status: "running", execution_intent_id: "i-2", assignment_id: "a-2", assignment_generation: 2, agent_id: "agent-1", agent_revision_ref: { entity_id: "agent-1", revision: 2 }, workforce_revision_ref: { entity_id: "wf-1", revision: 1 } }],
  };
}

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async close() {},
  };
}

test("IMP-03E exposes immutable workforce and admitted membership references", async () => {
  const api = createWorkforceProductApi(fakeCore());
  const detail = await api.getWorkforce("wf-1");
  assert.equal(detail.currentRevision.ref.revision, 2);
  const runView = await api.getRunWorkforce("run-1");
  assert.equal(runView.workforce.admittedRevision, 1);
  assert.equal(runView.membership[0].agent_revision, 2);
});

test("IMP-03E keeps proposals advisory and assignment lineage canonical", async () => {
  const view = await createWorkforceProductApi(fakeCore()).getCoordination("run-1", "task-1");
  assert.equal(view.proposals[0].canonicalStatus, "advisory");
  assert.equal(view.decisions[0].canonicalStatus, "canonical");
  assert.equal(view.currentAssignment.assignment_id, "a-2");
  assert.deepEqual(view.assignmentHistory.map((entry) => entry.assignment_id), ["a-1", "a-2"]);
});

test("IMP-03E links runtime attempts to exact assignment and revision", async () => {
  const view = await createWorkforceProductApi(fakeCore()).getRuntime("run-1", "task-1");
  assert.equal(view.attempts[0].assignmentId, "a-2");
  assert.equal(view.attempts[0].agentRevisionRef.revision, 2);
  assert.equal(view.attempts[0].workforceRevisionRef.revision, 1);
  assert.equal(view.attempts[0].recoveryClassification, "resumable");
});

test("IMP-03E HTTP routes use the injected native core read boundary", async () => {
  const context = createControlPlaneContext({ nativeCore: fakeCore(), engine: createMockEngine(), startLocalWorker: false });
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/tasks/task-1/assignments?runId=run-1", headers: {} },
      "/api/v1/tasks/task-1/assignments?runId=run-1",
      context,
      { correlationId: "imp-03e-http" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.current.assignment_id, "a-2");
    assert.deepEqual(result.body.data.history.map((entry) => entry.assignment_id), ["a-1", "a-2"]);
  } finally {
    await context.close();
  }
});
