import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  ACS_NATIVE_SCHEMA_VERSION,
  NativeContractValidationError,
  createCoordinationDecisionV2,
  createCoordinationProposalV2,
  createTaskAssignmentV2,
  validateCoordinationDecisionV2,
  validateTaskAssignmentV2,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const revision = (entity_kind, entity_id, rev) => ({ entity_kind, entity_id, revision: rev, fingerprint: digest });
const idempotency = (key, hash = digest) => ({ key, scope: "coordination:test", request_hash: hash });

test("IMP-03C proposal is advisory and preserves source provenance", () => {
  const proposal = createCoordinationProposalV2({
    proposal_id: "proposal-1", run_id: "run-1", task_id: "task-1", proposal_kind: "assignment",
    target_member_slot_id: "slot-1", source: "adapter", source_ref: { kind: "adapter", id: "adapter-1" },
    reason: "deterministic candidate", metadata: { policy: "p1" }, created_at: 10,
    correlation_id: "corr-1", idempotency: idempotency("proposal-1"),
  });
  assert.equal(proposal.schema_version, ACS_NATIVE_SCHEMA_VERSION);
  assert.equal(proposal.source, "adapter");
  assert.equal(proposal.target_member_slot_id, "slot-1");
});

test("IMP-03C decision is separate from proposal and assignment targets admitted revision", () => {
  const decision = createCoordinationDecisionV2({
    decision_id: "decision-1", run_id: "run-1", task_id: "task-1", status: "accepted",
    proposal_id: "proposal-1", selected_member_slot_id: "slot-1", reason: "validated",
    authority_ref: { kind: "authority-decision", id: "authority-1" }, source: "acs", decided_at: 20,
    correlation_id: "corr-1", idempotency: idempotency("decision-1"),
  });
  const assignment = createTaskAssignmentV2({
    assignment_id: "assignment-1", run_id: "run-1", task_id: "task-1", member_slot_id: "slot-1",
    workforce_revision_ref: revision("workforce", "wf-1", 3),
    resolved_agent_revision_ref: revision("agent", "agent-1", 5), agent_id: "agent-1",
    decision_id: decision.decision_id, generation: 1, created_at: 20,
    provenance: { proposal_id: "proposal-1", authority_ref: decision.authority_ref },
  });
  assert.equal(decision.proposal_id, "proposal-1");
  assert.equal(assignment.resolved_agent_revision_ref.revision, 5);
  assert.equal(assignment.member_slot_id, "slot-1");
});

test("IMP-03C reassignment remains append-only and stale expected state is representable", () => {
  const prior = createTaskAssignmentV2({
    assignment_id: "assignment-1", run_id: "run-1", task_id: "task-1", member_slot_id: "slot-1",
    workforce_revision_ref: revision("workforce", "wf-1", 3), resolved_agent_revision_ref: revision("agent", "agent-1", 5), agent_id: "agent-1",
    decision_id: "decision-1", generation: 1, created_at: 20, provenance: { reason: "initial" },
  });
  const nextDecision = createCoordinationDecisionV2({
    decision_id: "decision-2", run_id: "run-1", task_id: "task-1", status: "accepted",
    proposal_id: "proposal-2", selected_member_slot_id: "slot-2", prior_assignment_id: prior.assignment_id,
    expected_assignment_id: prior.assignment_id, reason: "operator reassignment",
    authority_ref: { kind: "authority-decision", id: "authority-2" }, source: "human", decided_at: 30,
    correlation_id: "corr-2", idempotency: idempotency("decision-2"),
  });
  const next = createTaskAssignmentV2({
    assignment_id: "assignment-2", run_id: "run-1", task_id: "task-1", member_slot_id: "slot-2",
    workforce_revision_ref: revision("workforce", "wf-1", 3), resolved_agent_revision_ref: revision("agent", "agent-2", 2), agent_id: "agent-2",
    decision_id: nextDecision.decision_id, generation: 2, created_at: 30, supersedes_assignment_id: prior.assignment_id,
    provenance: { prior_assignment_id: prior.assignment_id, reason: nextDecision.reason },
  });
  assert.equal(next.generation, prior.generation + 1);
  assert.equal(next.supersedes_assignment_id, prior.assignment_id);
  assert.equal(nextDecision.expected_assignment_id, prior.assignment_id);
});

test("IMP-03C rejects assignment without exact revision references", () => {
  assert.throws(() => validateTaskAssignmentV2({
    schema_version: ACS_NATIVE_SCHEMA_VERSION, assignment_id: "a", run_id: "r", task_id: "t", member_slot_id: "s",
    workforce_revision_ref: revision("workforce", "wf", 1), resolved_agent_revision_ref: { entity_kind: "agent", entity_id: "a", revision: 1, fingerprint: "bad" },
    agent_id: "a", decision_id: "d", generation: 1, created_at: 1, provenance: {},
  }), NativeContractValidationError);
});

test("IMP-03C implementation has no CAMEL or Eigent dependency", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/native-core/coordination.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/control-plane/shared-state/native-core-durable.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /eigent|camel|openclaw/i);
});
