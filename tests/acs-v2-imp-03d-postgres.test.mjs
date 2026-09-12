import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  NativeIdempotencyConflictError,
  NativeStaleAssignmentError,
  PostgresSharedAuthoritativeState,
  SHARED_STATE_MIGRATIONS,
  SHARED_STATE_SCHEMA_VERSION,
  createAgentDefinitionV2,
  createAgentRevisionV2,
  createEventEnvelopeV2,
  createRunV2,
  createTaskAssignmentV2,
  createTaskV2,
  createWorkforceDefinitionV2,
  createWorkforceRevisionV2,
  createWorkforceRunMembershipV2,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const ref = (entity_kind, entity_id, revision) => ({ entity_kind, entity_id, revision, fingerprint: digest });

async function isolatedDatabase(run) {
  const schema = `imp03d_${Date.now()}_${process.pid}`;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const url = new URL(process.env.ACS_SH_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  const state = new PostgresSharedAuthoritativeState({ connectionString: url.toString() });
  const pool = new Pool({ connectionString: url.toString() });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await run({ state, pool, connectionString: url.toString() });
  } finally {
    await state.close().catch(() => undefined);
    await pool.end().catch(() => undefined);
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
}

function agentRevision(agentId, revision) {
  return createAgentRevisionV2({
    agent_id: agentId,
    revision,
    ...(revision > 1 ? { supersedes_revision: revision - 1 } : {}),
    instructions: `durable Agent revision ${revision}`,
    capability_requirements: [],
    constraints: [],
    knowledge: { allowed_scope_refs: [], denied_scope_refs: [], context_policy_ref: ref("policy", "context", 1), memory_policy_ref: ref("policy", "memory", 1) },
    resources: { skill_refs: [], tool_refs: [], mcp_server_refs: [] },
    runtime_preferences: { provider_routes: [], model_requirements: [], harness_preferences: [], executor_preferences: [] },
    governance: { authority_refs: [], permission_policy_ref: ref("policy", "permission", 1), approval_policy_ref: ref("policy", "approval", 1) },
    economics: { cost_policy_ref: ref("policy", "cost", 1), budget_policy_ref: ref("policy", "budget", 1) },
    evidence: { audit_policy_ref: ref("policy", "audit", 1), evaluation_refs: [] },
    commit: { created_by: "test:imp-03d-postgres", committed_at: revision, change_reason: `revision ${revision}` },
  });
}

function scope() {
  return { organization_id: "org-imp-03d", product_domain: "acs", tenant_id: "tenant-imp-03d", owner_ref: "owner:acs", authority_scope_ref: "authority:acs", knowledge_scope_refs: [] };
}

function event(eventId, type, runId, taskId, key, sequence = 1) {
  return createEventEnvelopeV2({
    event_id: eventId, event_type: type, timestamp: 100 + sequence, sequence,
    organization_id: scope().organization_id, product_domain: "acs", tenant_id: scope().tenant_id,
    run_id: runId, task_id: taskId, actor: { kind: "service", ref: "test:imp-03d" }, source: "acs",
    correlation_id: key, idempotency_key: key, payload: { sequence },
  });
}

async function seedCanonical(pool, { run, task, assignment, member, agent, workforce }) {
  const agentDefinition = createAgentDefinitionV2({ agent_id: agent.ref.entity_id, scope: scope(), name: "Durable Agent", status: "active", current_revision: 1, ownership_ref: "owner:acs", sharing_mode: "private", created_at: 1, updated_at: 1 });
  const agentPayload = JSON.stringify(agent);
  await pool.query("INSERT INTO acs_agents (agent_id, revision, tenant_id, payload, record_kind, native_fingerprint) VALUES ($1, $2, $3, $4::jsonb, 'native_v2', $5)", [agent.ref.entity_id, agent.ref.revision, scope().tenant_id, JSON.stringify(agentDefinition), agent.ref.fingerprint]);
  await pool.query("INSERT INTO acs_agent_history (agent_id, revision, payload, record_kind, native_fingerprint, supersedes_revision, created_by, committed_at, change_reason, correlation_id, event_id) VALUES ($1, $2, $3::jsonb, 'native_v2', $4, NULL, 'test:imp-03d', to_timestamp(1), 'seed', 'seed', 'seed-agent-event')", [agent.ref.entity_id, agent.ref.revision, agentPayload, agent.ref.fingerprint]);
  await pool.query("BEGIN");
  try {
    await pool.query("SET CONSTRAINTS ALL DEFERRED");
    for (const [seedEvent, sequence] of [["seed-workforce-event-1", 1], ["seed-workforce-event", 2]]) {
      await pool.query("INSERT INTO acs_native_events (event_id, stream_scope, sequence, event_type, schema_version, occurred_at, organization_id, product_domain, tenant_id, correlation_id, actor, source, payload) VALUES ($1, 'seed', $2, 'seed', 'acs-native-v2', to_timestamp(1), $3, 'acs', $4, 'seed', '{}'::jsonb, 'acs', '{}'::jsonb)", [seedEvent, sequence, scope().organization_id, scope().tenant_id]);
    }
    await pool.query("INSERT INTO acs_workforces (workforce_id, current_revision, current_status, tenant_id, payload, native_fingerprint) VALUES ($1, 2, 'active', $2, $3::jsonb, $4)", [workforce.workforce_id, scope().tenant_id, JSON.stringify({ ...workforce.definition, current_revision: 2, updated_at: 2 }), workforce.revision.ref.fingerprint]);
    await pool.query("INSERT INTO acs_workforce_revisions (workforce_id, revision, native_fingerprint, lifecycle_status, payload, created_by, committed_at, change_reason, correlation_id, event_id) VALUES ($1, 1, $2, 'active', '{}'::jsonb, 'test:imp-03d', to_timestamp(1), 'seed', 'seed', 'seed-workforce-event-1')", [workforce.workforce_id, "b".repeat(64)]);
    await pool.query("INSERT INTO acs_workforce_revisions (workforce_id, revision, native_fingerprint, supersedes_revision, lifecycle_status, payload, created_by, committed_at, change_reason, correlation_id, event_id) VALUES ($1, 2, $2, 1, 'active', $3::jsonb, 'test:imp-03d', to_timestamp(2), 'seed', 'seed', 'seed-workforce-event')", [workforce.workforce_id, workforce.revision.ref.fingerprint, JSON.stringify(workforce.revision)]);
    await pool.query("INSERT INTO acs_native_runs (run_id, workforce_id, workforce_revision, payload, created_at) VALUES ($1, $2, 2, $3::jsonb, to_timestamp(1))", [run.run_id, workforce.workforce_id, JSON.stringify(run)]);
    await pool.query("INSERT INTO acs_workforce_run_membership_snapshots (snapshot_id, run_id, workforce_id, workforce_revision, admitted_at, member_count) VALUES ($1, $2, $3, 2, to_timestamp(1), 1)", [`snapshot-${run.run_id}`, run.run_id, workforce.workforce_id]);
    await pool.query("INSERT INTO acs_workforce_run_membership_members (snapshot_id, slot_id, payload) VALUES ($1, $2, $3::jsonb)", [`snapshot-${run.run_id}`, member.slot_id, JSON.stringify(member)]);
    await pool.query("INSERT INTO acs_coordination_decisions (decision_id, run_id, task_id, status, payload, created_at) VALUES ($1, $2, $3, 'accepted', '{}'::jsonb, to_timestamp(1))", [assignment.decision_id, run.run_id, task.task_run_id]);
    await pool.query("INSERT INTO acs_task_assignments (assignment_id, run_id, task_id, member_slot_id, decision_id, generation, payload, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, to_timestamp(1))", [assignment.assignment_id, run.run_id, task.task_run_id, assignment.member_slot_id, assignment.decision_id, assignment.generation, JSON.stringify(assignment)]);
    await pool.query("COMMIT");
  } catch (error) { await pool.query("ROLLBACK"); throw error; }
}

function fixtures() {
  const agentId = "agent-imp-03d-pg";
  const workforceId = "workforce-imp-03d-pg";
  const runId = "run-imp-03d-pg";
  const taskId = "task-imp-03d-pg";
  const agent = agentRevision(agentId, 5);
  const member = createWorkforceRunMembershipV2({ snapshot_id: `snapshot-${runId}`, run_id: runId, workforce_revision_ref: ref("workforce", workforceId, 2), slot_id: "member-m3", resolved_agent_revision_ref: { ...agent.ref, revision: 5 }, agent_id: agentId, resolution_mode: "pinned", resolved_at: 1 });
  const workforceRevision = createWorkforceRevisionV2({ workforce_id: workforceId, revision: 2, supersedes_revision: 1, display_name: "Workforce 2", purpose: "runtime test", lifecycle_status: "active", members: [{ slot_id: member.slot_id, agent_selector: { mode: "pinned", agent_id: agentId, pinned_revision_ref: agent.ref }, responsibilities: ["execute"], capability_requirement_refs: [], authority_constraint_refs: [], participation_constraint_refs: [] }], composition_constraints: [], governance: { authority_refs: [], membership_policy_ref: ref("policy", "membership", 1) }, evidence: { audit_policy_ref: ref("policy", "audit", 1) }, commit: { created_by: "test", committed_at: 2, change_reason: "test" } });
  const workforce = { workforce_id: workforceId, definition: createWorkforceDefinitionV2({ workforce_id: workforceId, scope: scope(), current_status: "active", current_revision: 1, ownership_ref: "owner:acs", created_at: 1, updated_at: 1 }), revision: workforceRevision };
  const run = createRunV2({ run_id: runId, kind: "workforce", scope: scope(), definition_refs: { workforce_revision_ref: ref("workforce", workforceId, 2) }, status: "created", idempotency: { key: "run-key", scope: `run:${runId}`, request_hash: digest }, execution_binding_refs: [], created_at: 1 });
  const task = createTaskV2({ task_run_id: taskId, run_id: runId, node_id: "node-1", logical_idempotency_key: "task-key", status: "ready", current_attempt: 1 });
  const assignment = createTaskAssignmentV2({ assignment_id: "assignment-a1", run_id: runId, task_id: taskId, member_slot_id: member.slot_id, workforce_revision_ref: member.workforce_revision_ref, resolved_agent_revision_ref: member.resolved_agent_revision_ref, agent_id: agentId, decision_id: "decision-a1", generation: 1, created_at: 1, provenance: { source: "test" } });
  return { run, task, assignment, member, agent, workforce };
}

test("IMP-03D PostgreSQL clean migration creates v7 runtime schema", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  await isolatedDatabase(async ({ state, pool }) => {
    assert.equal(await state.migrate(), SHARED_STATE_SCHEMA_VERSION);
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('acs_runtime_execution_intents', 'acs_runtime_attempts') ORDER BY table_name");
    assert.deepEqual(tables.rows.map((row) => row.table_name), ["acs_runtime_attempts", "acs_runtime_execution_intents"]);
    const constraints = await pool.query("SELECT conname FROM pg_constraint WHERE conrelid IN ('acs_runtime_execution_intents'::regclass, 'acs_runtime_attempts'::regclass) ORDER BY conname");
    assert.ok(constraints.rows.some((row) => row.conname.includes("assignment")));
    assert.ok(constraints.rows.some((row) => row.conname.includes("intent")));
  });
});

test("IMP-03D PostgreSQL compiles, reloads, and preserves canonical assignment identity", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  await isolatedDatabase(async ({ state, pool, connectionString }) => {
    await state.migrate();
    const data = fixtures();
    await seedCanonical(pool, data);
    const input = { run_id: data.run.run_id, task_id: data.task.task_run_id, assignment_id: data.assignment.assignment_id, idempotency: { key: "compile-a1", scope: `runtime:${data.task.task_run_id}`, request_hash: digest }, compiled_at: 200 };
    const first = await state.nativeCore.compileTaskExecution(input);
    assert.equal(first.intent.assignment_id, "assignment-a1");
    assert.equal(first.intent.assignment_generation, 1);
    assert.equal(first.intent.member_slot_id, "member-m3");
    assert.equal(first.intent.agent_revision_ref.revision, 5);
    assert.equal(first.intent.workforce_revision_ref.revision, 2);
    assert.equal(first.attempt.execution_intent_id, first.intent.intent_id);
    const event = await state.nativeCore.getEvent(first.event_id);
    assert.equal(event.event.event_type, "execution.intent_compiled");
    assert.equal((await state.nativeCore.listOutbox()).filter((row) => row.eventId === first.event_id).length, 1);
    assert.deepEqual(await state.nativeCore.compileTaskExecution(input), first);
    await assert.rejects(() => state.nativeCore.compileTaskExecution({ ...input, idempotency: { ...input.idempotency, request_hash: "b".repeat(64) } }), NativeIdempotencyConflictError);
    await state.close();
    const reloaded = new PostgresSharedAuthoritativeState({ connectionString });
    try {
      const restoredIntent = await reloaded.nativeCore.getExecutionIntent(first.intent.intent_id);
      const restoredAttempt = await reloaded.nativeCore.getAttempt(first.attempt.attempt_id);
      assert.equal(restoredIntent.agent_revision_ref.revision, 5);
      assert.equal(restoredIntent.workforce_revision_ref.revision, 2);
      assert.equal(restoredAttempt.assignment_id, "assignment-a1");
      assert.equal(restoredAttempt.assignment_generation, 1);
    } finally { await reloaded.close(); }
  });
});

test("IMP-03D PostgreSQL rejects stale assignment without rewriting historical bindings", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  await isolatedDatabase(async ({ state, pool }) => {
    await state.migrate();
    const data = fixtures();
    await seedCanonical(pool, data);
    const input = { run_id: data.run.run_id, task_id: data.task.task_run_id, assignment_id: data.assignment.assignment_id, idempotency: { key: "compile-a1", scope: `runtime:${data.task.task_run_id}`, request_hash: digest }, compiled_at: 200 };
    const first = await state.nativeCore.compileTaskExecution(input);
    const a2 = createTaskAssignmentV2({ ...data.assignment, assignment_id: "assignment-a2", decision_id: "decision-a2", generation: 2, supersedes_assignment_id: "assignment-a1", created_at: 300 });
    await pool.query("INSERT INTO acs_coordination_decisions (decision_id, run_id, task_id, status, payload, created_at) VALUES ($1, $2, $3, 'accepted', '{}'::jsonb, to_timestamp(3))", [a2.decision_id, data.run.run_id, data.task.task_run_id]);
    await pool.query("INSERT INTO acs_task_assignments (assignment_id, run_id, task_id, member_slot_id, decision_id, generation, supersedes_assignment_id, payload, created_at) VALUES ($1, $2, $3, $4, $5, 2, $6, $7::jsonb, to_timestamp(3))", [a2.assignment_id, a2.run_id, a2.task_id, a2.member_slot_id, a2.decision_id, a2.supersedes_assignment_id, JSON.stringify(a2)]);
    await assert.rejects(() => state.nativeCore.compileTaskExecution({ ...input, idempotency: { ...input.idempotency, key: "compile-stale" } }), NativeStaleAssignmentError);
    assert.equal((await state.nativeCore.getAttempt(first.attempt.attempt_id)).assignment_id, "assignment-a1");
    assert.equal((await state.nativeCore.getCurrentTaskAssignment(data.run.run_id, data.task.task_run_id)).assignment_id, "assignment-a2");
  });
});
