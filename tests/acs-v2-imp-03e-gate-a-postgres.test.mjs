import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  createAgentDefinitionV2,
  createAgentRevisionV2,
  createEventEnvelopeV2,
  createRunV2,
  createTaskAssignmentV2,
  createTaskV2,
  createWorkforceDefinitionV2,
  createWorkforceRevisionV2,
  createWorkforceRunMembershipV2,
  createCoordinationProposalV2,
  createCoordinationDecisionV2,
  createSharedControlPlaneContextFromEnvironment,
  createAcsHttpServer,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const ref = (entity_kind, entity_id, revision) => ({ entity_kind, entity_id, revision, fingerprint: digest });
const scope = { organization_id: "org-imp-03e-gate-a", product_domain: "acs", tenant_id: "tenant-imp-03e-gate-a", owner_ref: "owner:acs", authority_scope_ref: "authority:acs", knowledge_scope_refs: [] };

function agentRevision(agentId, revision = 5) {
  return createAgentRevisionV2({
    agent_id: agentId, revision, ...(revision > 1 ? { supersedes_revision: revision - 1 } : {}),
    instructions: "Gate A PostgreSQL Agent revision", capability_requirements: [], constraints: [],
    knowledge: { allowed_scope_refs: [], denied_scope_refs: [], context_policy_ref: ref("policy", "context", 1), memory_policy_ref: ref("policy", "memory", 1) },
    resources: { skill_refs: [], tool_refs: [], mcp_server_refs: [] },
    runtime_preferences: { provider_routes: [], model_requirements: [], harness_preferences: [], executor_preferences: [] },
    governance: { authority_refs: [], permission_policy_ref: ref("policy", "permission", 1), approval_policy_ref: ref("policy", "approval", 1) },
    economics: { cost_policy_ref: ref("policy", "cost", 1), budget_policy_ref: ref("policy", "budget", 1) },
    evidence: { audit_policy_ref: ref("policy", "audit", 1), evaluation_refs: [] },
    commit: { created_by: "test:imp-03e-gate-a", committed_at: revision, change_reason: "Gate A" },
  });
}

function fixtures() {
  const agentId = "agent-imp-03e-gate-a";
  const workforceId = "workforce-imp-03e-gate-a";
  const runId = "run-imp-03e-gate-a";
  const taskId = "task-imp-03e-gate-a";
  const agent = agentRevision(agentId);
  const member = createWorkforceRunMembershipV2({
    snapshot_id: `snapshot-${runId}`, run_id: runId, workforce_revision_ref: ref("workforce", workforceId, 2),
    slot_id: "member-gate-a", resolved_agent_revision_ref: { ...agent.ref }, agent_id: agentId,
    resolution_mode: "pinned", resolved_at: 20,
  });
  const revision1 = createWorkforceRevisionV2({
    workforce_id: workforceId, revision: 1, display_name: "Gate A Workforce v1", purpose: "HTTP proof", lifecycle_status: "active",
    members: [{ slot_id: member.slot_id, agent_selector: { mode: "pinned", agent_id: agentId, pinned_revision_ref: agent.ref }, responsibilities: ["execute"], capability_requirement_refs: [], authority_constraint_refs: [], participation_constraint_refs: [] }],
    composition_constraints: [], governance: { authority_refs: [], membership_policy_ref: ref("policy", "membership", 1) }, evidence: { audit_policy_ref: ref("policy", "audit", 1) },
    commit: { created_by: "test:imp-03e-gate-a", committed_at: 10, change_reason: "Gate A baseline" },
  });
  const revision = createWorkforceRevisionV2({
    workforce_id: workforceId, revision: 2, supersedes_revision: 1, display_name: "Gate A Workforce", purpose: "HTTP proof", lifecycle_status: "active",
    members: [{ slot_id: member.slot_id, agent_selector: { mode: "pinned", agent_id: agentId, pinned_revision_ref: agent.ref }, responsibilities: ["execute"], capability_requirement_refs: [], authority_constraint_refs: [], participation_constraint_refs: [] }],
    composition_constraints: [], governance: { authority_refs: [], membership_policy_ref: ref("policy", "membership", 1) }, evidence: { audit_policy_ref: ref("policy", "audit", 1) },
    commit: { created_by: "test:imp-03e-gate-a", committed_at: 20, change_reason: "Gate A" },
  });
  const definition = createWorkforceDefinitionV2({ workforce_id: workforceId, scope, current_status: "active", current_revision: 2, ownership_ref: "owner:acs", created_at: 10, updated_at: 20 });
  const run = createRunV2({ run_id: runId, kind: "workforce", scope, definition_refs: { workforce_revision_ref: ref("workforce", workforceId, 2) }, status: "created", idempotency: { key: `run-key-${runId}`, scope: `run:${runId}`, request_hash: digest }, execution_binding_refs: [], created_at: 20 });
  const task = createTaskV2({ task_run_id: taskId, run_id: runId, node_id: "node-gate-a", logical_idempotency_key: `task-key-${taskId}`, status: "ready", current_attempt: 1 });
  const proposal = createCoordinationProposalV2({ proposal_id: `proposal-${taskId}`, run_id: runId, task_id: taskId, proposal_kind: "assignment", target_member_slot_id: member.slot_id, source: "adapter", reason: "Gate A candidate", created_at: 30, correlation_id: `corr-${taskId}`, idempotency: { key: `proposal-key-${taskId}`, scope: `coordination:${taskId}`, request_hash: digest } });
  const decision = createCoordinationDecisionV2({ decision_id: `decision-${taskId}`, run_id: runId, task_id: taskId, status: "accepted", proposal_id: proposal.proposal_id, selected_member_slot_id: member.slot_id, reason: "Gate A accepted", authority_ref: { kind: "authority-decision", id: "gate-a" }, source: "acs", decided_at: 40, correlation_id: `corr-${taskId}`, idempotency: { key: `decision-key-${taskId}`, scope: `coordination:${taskId}`, request_hash: digest } });
  const assignment = createTaskAssignmentV2({ assignment_id: `assignment-${taskId}`, run_id: runId, task_id: taskId, member_slot_id: member.slot_id, workforce_revision_ref: member.workforce_revision_ref, resolved_agent_revision_ref: member.resolved_agent_revision_ref, agent_id: agentId, decision_id: decision.decision_id, generation: 1, created_at: 40, provenance: { proposal_id: proposal.proposal_id, source: "acs" } });
  return { agent, agentId, workforceId, runId, taskId, member, revision1, revision, definition, run, task, proposal, decision, assignment };
}

async function seed(pool, data) {
  await pool.query("BEGIN");
  try {
    await pool.query("SET CONSTRAINTS ALL DEFERRED");
    await pool.query("INSERT INTO acs_agents (agent_id, revision, tenant_id, payload, record_kind, native_fingerprint) VALUES ($1, 5, $2, $3::jsonb, 'native_v2', $4)", [data.agentId, scope.tenant_id, JSON.stringify(createAgentDefinitionV2({ agent_id: data.agentId, scope, name: "Gate A Agent", status: "active", current_revision: 5, ownership_ref: "owner:acs", sharing_mode: "private", created_at: 1, updated_at: 5 })), data.agent.ref.fingerprint]);
    for (let revision = 1; revision <= 5; revision += 1) {
      const historicalAgent = agentRevision(data.agentId, revision);
      await pool.query("INSERT INTO acs_agent_history (agent_id, revision, payload, record_kind, native_fingerprint, supersedes_revision, created_by, committed_at, change_reason, correlation_id, event_id) VALUES ($1, $2, $3::jsonb, 'native_v2', $4, $5, 'test:imp-03e-gate-a', to_timestamp($6::double precision), 'Gate A', 'gate-a', $7)", [data.agentId, revision, JSON.stringify(historicalAgent), historicalAgent.ref.fingerprint, revision > 1 ? revision - 1 : null, revision, `gate-a-agent-${revision}`]);
    }
    for (const [id, sequence] of [["gate-a-event-1", 1], ["gate-a-event-2", 2], ["gate-a-event-3", 3]]) {
      await pool.query("INSERT INTO acs_native_events (event_id, stream_scope, sequence, event_type, schema_version, occurred_at, organization_id, product_domain, tenant_id, correlation_id, actor, source, payload) VALUES ($1, 'seed', $2, 'seed', 'acs-native-v2', to_timestamp(1), $3, 'acs', $4, 'gate-a', '{}'::jsonb, 'acs', '{}'::jsonb)", [id, sequence, scope.organization_id, scope.tenant_id]);
    }
    await pool.query("INSERT INTO acs_workforces (workforce_id, current_revision, current_status, tenant_id, payload, native_fingerprint) VALUES ($1, 2, 'active', $2, $3::jsonb, $4)", [data.workforceId, scope.tenant_id, JSON.stringify(data.definition), data.revision.ref.fingerprint]);
    await pool.query("INSERT INTO acs_workforce_revisions (workforce_id, revision, native_fingerprint, lifecycle_status, payload, created_by, committed_at, change_reason, correlation_id, event_id) VALUES ($1, 1, $2, 'active', $3::jsonb, 'test:imp-03e-gate-a', to_timestamp(10), 'Gate A baseline', 'gate-a', 'gate-a-event-1')", [data.workforceId, data.revision1.ref.fingerprint, JSON.stringify(data.revision1)]);
    await pool.query("INSERT INTO acs_workforce_revisions (workforce_id, revision, native_fingerprint, supersedes_revision, lifecycle_status, payload, created_by, committed_at, change_reason, correlation_id, event_id) VALUES ($1, 2, $2, 1, 'active', $3::jsonb, 'test:imp-03e-gate-a', to_timestamp(20), 'Gate A', 'gate-a', 'gate-a-event-2')", [data.workforceId, data.revision.ref.fingerprint, JSON.stringify(data.revision)]);
    await pool.query("INSERT INTO acs_native_runs (run_id, workforce_id, workforce_revision, payload, created_at) VALUES ($1, $2, 2, $3::jsonb, to_timestamp(20))", [data.runId, data.workforceId, JSON.stringify(data.run)]);
    await pool.query("INSERT INTO acs_workforce_run_membership_snapshots (snapshot_id, run_id, workforce_id, workforce_revision, admitted_at, member_count) VALUES ($1, $2, $3, 2, to_timestamp(20), 1)", [data.member.snapshot_id, data.runId, data.workforceId]);
    await pool.query("INSERT INTO acs_workforce_run_membership_members (snapshot_id, slot_id, payload) VALUES ($1, $2, $3::jsonb)", [data.member.snapshot_id, data.member.slot_id, JSON.stringify(data.member)]);
    await pool.query("INSERT INTO acs_coordination_proposals (proposal_id, run_id, task_id, payload, created_at) VALUES ($1, $2, $3, $4::jsonb, to_timestamp(30))", [data.proposal.proposal_id, data.runId, data.taskId, JSON.stringify(data.proposal)]);
    await pool.query("INSERT INTO acs_coordination_decisions (decision_id, run_id, task_id, proposal_id, status, payload, created_at) VALUES ($1, $2, $3, $4, 'accepted', $5::jsonb, to_timestamp(40))", [data.decision.decision_id, data.runId, data.taskId, data.proposal.proposal_id, JSON.stringify(data.decision)]);
    await pool.query("INSERT INTO acs_task_assignments (assignment_id, run_id, task_id, member_slot_id, decision_id, generation, payload, created_at) VALUES ($1, $2, $3, $4, $5, 1, $6::jsonb, to_timestamp(40))", [data.assignment.assignment_id, data.runId, data.taskId, data.member.slot_id, data.decision.decision_id, JSON.stringify(data.assignment)]);
    await pool.query("COMMIT");
  } catch (error) { await pool.query("ROLLBACK"); throw error; }
}

test("IMP-03E Gate A uses the canonical HTTP host with PostgreSQL nativeCore", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  const schema = `imp03e_gate_a_${Date.now()}_${process.pid}`;
  const baseUrl = new URL(process.env.ACS_SH_DATABASE_URL);
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  baseUrl.searchParams.set("options", `-c search_path=${schema}`);
  const pool = new Pool({ connectionString: baseUrl.toString() });
  const root = await mkdtemp(join(tmpdir(), "acs-imp-03e-gate-a-"));
  const data = fixtures();
  let shared;
  let server;
  let context;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    shared = await createSharedControlPlaneContextFromEnvironment({ instanceId: "imp-03e-gate-a", environment: { ...process.env, ACS_STATE_BACKEND: "shared", ACS_SHARED_DATABASE_URL: baseUrl.toString(), ACS_SH_DATABASE_URL: baseUrl.toString() } });
    await seed(pool, data);
    const compiled = await shared.state.nativeCore.compileTaskExecution({ run_id: data.runId, task_id: data.taskId, assignment_id: data.assignment.assignment_id, idempotency: { key: "compile-gate-a", scope: `runtime:${data.taskId}`, request_hash: digest }, compiled_at: 50 });
    assert.equal(compiled.intent.assignment_id, data.assignment.assignment_id);
    ({ server, context } = await createAcsHttpServer({ sharedControlPlaneContext: shared, startLocalWorker: false, runtimeMode: "remote", runtimeStatePath: join(root, "runtime.sqlite"), runtimeRoot: root, stateRoot: join(root, "state"), configRoot: join(root, "config"), artifactsRoot: join(root, "artifacts"), workspaceRoot: join(root, "workspace"), administrativeStatePath: join(root, "admin.json"), secretCatalogPath: join(root, "secrets.sqlite"), economicStatePath: join(root, "economic.sqlite"), rateLimitDatabasePath: join(root, "rate-limit.sqlite") }));
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    const request = async (path) => { const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { headers: { "x-acs-actor-id": "system", "x-acs-actor-type": "system" } }); const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return body.data; };
    const list = await request("/api/v1/workforces");
    const detail = await request(`/api/v1/workforces/${data.workforceId}`);
    const membership = await request(`/api/v1/runs/${data.runId}/membership`);
    const coordination = await request(`/api/v1/tasks/${data.taskId}/coordination?runId=${data.runId}`);
    const assignment = await request(`/api/v1/tasks/${data.taskId}/assignments?runId=${data.runId}`);
    const runtime = await request(`/api/v1/tasks/${data.taskId}/runtime?runId=${data.runId}`);
    assert.equal(list[0].currentRevision, 2);
    assert.equal(detail.currentRevision.ref.revision, 2);
    assert.equal(membership[0].resolved_agent_revision_ref.revision, 5);
    assert.equal(coordination.proposals[0].canonicalStatus, "advisory");
    assert.equal(coordination.decisions[0].canonicalStatus, "canonical");
    assert.equal(coordination.currentAssignment.assignment_id, data.assignment.assignment_id);
    assert.equal(assignment.current.assignment_id, data.assignment.assignment_id);
    assert.equal(runtime.intents[0].assignment_id, data.assignment.assignment_id);
    assert.equal(runtime.attempts[0].assignmentId, data.assignment.assignment_id);
    assert.equal(runtime.attempts[0].agentRevisionRef.revision, 5);
    assert.equal(runtime.attempts[0].workforceRevisionRef.revision, 2);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await context?.close().catch(() => undefined);
    await shared?.close().catch(() => undefined);
    await pool.end().catch(() => undefined);
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.end();
  }
});
