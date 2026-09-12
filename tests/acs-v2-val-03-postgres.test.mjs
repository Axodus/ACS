import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import net from "node:net";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import test from "node:test";

const appRequire = createRequire(new URL("../.design/app-standalone/package.json", import.meta.url));
const { chromium } = appRequire("@playwright/test");
const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  NativeRunAdmissionError,
  NativeStaleAssignmentError,
  createAgentDefinitionV2,
  createAgentRevisionV2,
  createAcsHttpServer,
  createCoordinationDecisionV2,
  createCoordinationProposalV2,
  createEventEnvelopeV2,
  createRunV2,
  createSharedControlPlaneContextFromEnvironment,
  createTaskV2,
  validateRuntimeRecoveryView,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const policyRef = (entityId) => ({ entity_kind: "policy", entity_id: entityId, revision: 1, fingerprint: digest });

function scope() {
  return {
    organization_id: "org-val-03",
    product_domain: "acs",
    tenant_id: "tenant-val-03",
    owner_ref: "owner:acs",
    authority_scope_ref: "authority:acs",
    knowledge_scope_refs: ["knowledge:val-03"],
  };
}

function agentRevision(agentId, revision, timestamp) {
  return createAgentRevisionV2({
    agent_id: agentId,
    revision,
    ...(revision > 1 ? { supersedes_revision: revision - 1 } : {}),
    instructions: `VAL-03 Agent ${agentId} revision ${revision}`,
    capability_requirements: [],
    constraints: [],
    knowledge: { allowed_scope_refs: ["knowledge:val-03"], denied_scope_refs: [], context_policy_ref: policyRef("context-policy"), memory_policy_ref: policyRef("memory-policy") },
    resources: { skill_refs: [], tool_refs: [], mcp_server_refs: [] },
    runtime_preferences: { provider_routes: [], model_requirements: [], harness_preferences: [], executor_preferences: [] },
    governance: { authority_refs: [], permission_policy_ref: policyRef("permission-policy"), approval_policy_ref: policyRef("approval-policy") },
    economics: { cost_policy_ref: policyRef("cost-policy"), budget_policy_ref: policyRef("budget-policy") },
    evidence: { audit_policy_ref: policyRef("audit-policy"), evaluation_refs: [] },
    commit: { created_by: "test:val-03", committed_at: timestamp, change_reason: `Agent ${revision}` },
  });
}

function event({ eventId, eventType, timestamp, sequence, workforceId, agentId, runId, taskId, key, payload = {} }) {
  const currentScope = scope();
  return createEventEnvelopeV2({
    event_id: eventId,
    event_type: eventType,
    timestamp,
    sequence,
    organization_id: currentScope.organization_id,
    product_domain: currentScope.product_domain,
    tenant_id: currentScope.tenant_id,
    ...(workforceId ? { workforce_id: workforceId } : {}),
    ...(agentId ? { agent_id: agentId } : {}),
    ...(runId ? { run_id: runId } : {}),
    ...(taskId ? { task_id: taskId } : {}),
    actor: { kind: "service", ref: "test:val-03" },
    source: "acs",
    correlation_id: key,
    idempotency_key: key,
    payload,
  });
}

async function openHost(shared, root) {
  const { server, context } = await createAcsHttpServer({
    sharedControlPlaneContext: shared,
    tenantId: scope().tenant_id,
    startLocalWorker: false,
    runtimeMode: "remote",
    runtimeStatePath: join(root, "runtime.sqlite"),
    runtimeRoot: root,
    stateRoot: join(root, "state"),
    configRoot: join(root, "config"),
    artifactsRoot: join(root, "artifacts"),
    workspaceRoot: join(root, "workspace"),
    administrativeStatePath: join(root, "admin.json"),
    secretCatalogPath: join(root, "secrets.sqlite"),
    economicStatePath: join(root, "economic.sqlite"),
    rateLimitDatabasePath: join(root, "rate-limit.sqlite"),
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  return {
    server,
    context,
    baseUrl: `http://127.0.0.1:${address.port}`,
    request: async (path, options = {}) => {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        ...options,
        headers: { "x-acs-actor-id": "system", "x-acs-actor-type": "system", ...(options.headers ?? {}) },
      });
      return { status: response.status, body: await response.json() };
    },
  };
}

async function closeHost(host) {
  if (!host) return;
  await new Promise((resolve) => host.server.close(resolve));
  await host.context.close();
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Unable to reserve a browser validation port"));
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForHttp(url, timeout = 30_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function openIntegratedApplication(productApiBaseUrl, tenantId) {
  const appRoot = join(process.cwd(), ".design", "app-standalone");
  const port = await freePort();
  const server = spawn(process.execPath, [join(appRoot, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: appRoot,
    env: {
      ...process.env,
      VITE_ACS_ENVIRONMENT: "local",
      VITE_ACS_API_BASE_URL: "/api/v1",
      VITE_ACS_API_PROXY_TARGET: productApiBaseUrl,
      VITE_ACS_TENANT_ID: tenantId,
    },
    stdio: "ignore",
  });
  const url = `http://127.0.0.1:${port}`;
  try {
    await waitForHttp(url);
  } catch (error) {
    server.kill("SIGTERM");
    throw error;
  }
  return { server, url };
}

async function closeIntegratedApplication(app) {
  if (!app || app.server.exitCode !== null || app.server.signalCode !== null) return;
  app.server.kill("SIGTERM");
  await new Promise((resolve) => app.server.once("exit", resolve));
}

async function advanceAgent(nativeCore, { agentId, revision, expectedHead, timestamp }) {
  const currentScope = scope();
  const created = agentRevision(agentId, revision, timestamp);
  const eventSequence = (await nativeCore.replayEvents({ streamScope: `agent:${agentId}` })).length + 1;
  const result = await nativeCore.advanceAgentLineage({
    definition: createAgentDefinitionV2({ agent_id: agentId, scope: currentScope, name: `VAL-03 ${agentId}`, status: "active", current_revision: revision, ownership_ref: currentScope.owner_ref, sharing_mode: "private", created_at: timestamp, updated_at: timestamp }),
    revision: created,
    expectedHead,
    idempotency: { key: `agent-${agentId}-${revision}`, scope: `agent:${agentId}`, request_hash: digest },
    event: event({ eventId: `event-agent-${agentId}-${revision}`, eventType: "agent.revision.created", timestamp, sequence: eventSequence, agentId, key: `agent-${agentId}-${revision}`, payload: { agent_revision: revision } }),
    outboxId: `outbox-agent-${agentId}-${revision}`,
    deliveryKind: "agent.revision.created",
  });
  return { result, revision: created };
}

function member({ slotId, agentId, mode, pinnedRevision, pinnedFingerprint = digest }) {
  return {
    slot_id: slotId,
    agent_selector: mode === "pinned"
      ? { mode, agent_id: agentId, pinned_revision_ref: { entity_kind: "agent", entity_id: agentId, revision: pinnedRevision, fingerprint: pinnedFingerprint } }
      : { mode, agent_id: agentId },
    responsibilities: [slotId],
    capability_requirement_refs: [],
    authority_constraint_refs: [],
    participation_constraint_refs: [],
  };
}

function revisionInput({ expectedRevision, members, displayName, idempotencyKey, requestedAt }) {
  return {
    expectedRevision,
    displayName,
    purpose: "VAL-03 integrated Workforce composition",
    members,
    compositionConstraints: [],
    authorityRefs: [],
    membershipPolicyRef: policyRef("membership-policy"),
    auditPolicyRef: policyRef("audit-policy"),
    changeReason: `Advance Workforce to ${displayName}`,
    idempotencyKey,
    requestedAt,
  };
}

test("VAL-03 preserves Workforce, Run, coordination, assignment and Attempt history across canonical PostgreSQL host recomposition", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  const schema = `val03_${Date.now()}_${process.pid}`;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const databaseUrl = new URL(process.env.ACS_SH_DATABASE_URL);
  databaseUrl.searchParams.set("options", `-c search_path=${schema}`);
  const environment = { ...process.env, ACS_STATE_BACKEND: "shared", ACS_SHARED_DATABASE_URL: databaseUrl.toString(), ACS_SH_DATABASE_URL: databaseUrl.toString() };
  const root = await mkdtemp(join(tmpdir(), "acs-val-03-"));
  const workforceId = "workforce-val-03";
  const agentA = "agent-a-val-03";
  const agentB = "agent-b-val-03";
  const runAId = "run-a-val-03";
  const runBId = "run-b-val-03";
  const taskId = "task-val-03";
  let shared;
  let host;
  let app;
  let browser;
  let page;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    shared = await createSharedControlPlaneContextFromEnvironment({ instanceId: "val-03-a", environment });
    const nativeCore = shared.state.nativeCore;
    const agentA1 = await advanceAgent(nativeCore, { agentId: agentA, revision: 1, expectedHead: 0, timestamp: 10 });
    await advanceAgent(nativeCore, { agentId: agentA, revision: 2, expectedHead: 1, timestamp: 20 });
    await advanceAgent(nativeCore, { agentId: agentB, revision: 1, expectedHead: 0, timestamp: 30 });
    host = await openHost(shared, root);
    app = await openIntegratedApplication(host.baseUrl, scope().tenant_id);
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${app.url}/workforces`, { waitUntil: "domcontentloaded" });
    await page.getByText("No Workforces exist.", { exact: false }).waitFor();

    const initial = {
      workforceId,
      displayName: "VAL-03 Workforce r1",
      purpose: "Integrated acceptance",
      ownershipRef: scope().owner_ref,
      slotId: "review",
      agentId: agentB,
      responsibilities: ["review"],
      membershipPolicyRef: policyRef("membership-policy"),
      auditPolicyRef: policyRef("audit-policy"),
      changeReason: "Create initial draft",
      idempotencyKey: "create-workforce-r1",
      requestedAt: 100,
    };
    const created = await host.request("/api/v1/workforces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(initial) });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.identity.current_status, "draft");
    assert.equal(created.body.data.currentRevision.ref.revision, 1);
    const duplicateCreate = await host.request("/api/v1/workforces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(initial) });
    assert.equal(duplicateCreate.status, 201, JSON.stringify(duplicateCreate.body));
    assert.equal(duplicateCreate.body.data.currentRevision.ref.fingerprint, created.body.data.currentRevision.ref.fingerprint);
    const conflictingCreate = await host.request("/api/v1/workforces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...initial, displayName: "different payload" }) });
    assert.equal(conflictingCreate.status, 409, JSON.stringify(conflictingCreate.body));

    const draftRun = createRunV2({ run_id: "run-draft-val-03", kind: "workforce", scope: scope(), definition_refs: {}, status: "created", idempotency: { key: "run-draft", scope: "run:run-draft", request_hash: digest }, execution_binding_refs: [], created_at: 110 });
    const draftPersistenceBefore = { events: (await nativeCore.replayEvents()).length, outbox: (await nativeCore.listOutbox()).length };
    await assert.rejects(
      () => nativeCore.admitWorkforceRun({ run: { run_id: draftRun.run_id, scope: draftRun.scope, idempotency: draftRun.idempotency, execution_binding_refs: [], created_at: draftRun.created_at }, workforce_id: workforceId, idempotency: draftRun.idempotency, admitted_at: 111 }),
      (error) => {
        assert.ok(error instanceof NativeRunAdmissionError);
        assert.equal(error.code, "ACS_NATIVE_RUN_ADMISSION_REJECTED");
        return true;
      },
    );
    assert.equal(await nativeCore.getRun(draftRun.run_id), undefined);
    assert.deepEqual({ events: (await nativeCore.replayEvents()).length, outbox: (await nativeCore.listOutbox()).length }, draftPersistenceBefore);

    const activated = await host.request(`/api/v1/workforces/${workforceId}/lifecycle`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: 1, targetStatus: "active", changeReason: "Activate Workforce", idempotencyKey: "activate-r2", requestedAt: 120 }) });
    assert.equal(activated.status, 200, JSON.stringify(activated.body));
    assert.equal(activated.body.data.identity.current_status, "active");
    assert.equal(activated.body.data.identity.current_revision, 2);

    const membersR3 = [
      member({ slotId: "research", agentId: agentA, mode: "pinned", pinnedRevision: 1, pinnedFingerprint: agentA1.revision.ref.fingerprint }),
      member({ slotId: "research-secondary", agentId: agentA, mode: "pinned", pinnedRevision: 1, pinnedFingerprint: agentA1.revision.ref.fingerprint }),
      member({ slotId: "review", agentId: agentB, mode: "current_head_at_admission" }),
    ];
    const r3 = await host.request(`/api/v1/workforces/${workforceId}/revisions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(revisionInput({ expectedRevision: 2, members: membersR3, displayName: "VAL-03 Workforce r3", idempotencyKey: "revision-r3", requestedAt: 130 })) });
    assert.equal(r3.status, 201, JSON.stringify(r3.body));
    assert.equal(r3.body.data.identity.current_revision, 3);
    const staleRevision = await host.request(`/api/v1/workforces/${workforceId}/revisions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(revisionInput({ expectedRevision: 2, members: membersR3, displayName: "stale", idempotencyKey: "revision-stale", requestedAt: 131 })) });
    assert.equal(staleRevision.status, 409, JSON.stringify(staleRevision.body));

    const runA = createRunV2({ run_id: runAId, kind: "workforce", scope: scope(), definition_refs: {}, status: "created", idempotency: { key: "run-a", scope: `run:${runAId}`, request_hash: digest }, execution_binding_refs: [], created_at: 140 });
    await nativeCore.admitWorkforceRun({ run: { run_id: runA.run_id, scope: runA.scope, idempotency: runA.idempotency, execution_binding_refs: [], created_at: runA.created_at }, workforce_id: workforceId, idempotency: runA.idempotency, admitted_at: 141 });
    const membershipA = await nativeCore.getRunMembership(runAId);
    assert.deepEqual(membershipA.map((entry) => [entry.slot_id, entry.agent_id, entry.resolved_agent_revision_ref.revision]), [["research", agentA, 1], ["research-secondary", agentA, 1], ["review", agentB, 1]]);

    const task = createTaskV2({ task_run_id: taskId, run_id: runAId, node_id: "node-val-03", logical_idempotency_key: "task-val-03", status: "ready", current_attempt: 1 });
    const proposalA = createCoordinationProposalV2({ proposal_id: "proposal-a-val-03", run_id: runAId, task_id: taskId, proposal_kind: "assignment", target_member_slot_id: "review", source: "adapter", reason: "Advisory candidate", created_at: 150, correlation_id: "proposal-a", idempotency: { key: "proposal-a", scope: `coordination:${taskId}`, request_hash: digest } });
    await nativeCore.recordCoordinationProposal({ proposal: proposalA, task, event: event({ eventId: "event-proposal-a", eventType: "coordination.proposed", timestamp: 150, sequence: 2, runId: runAId, taskId, key: "proposal-a" }), outboxId: "outbox-proposal-a", deliveryKind: "coordination.proposed" });
    assert.equal((await nativeCore.listExecutionIntents(runAId, taskId)).length, 0);
    const decisionA = createCoordinationDecisionV2({ decision_id: "decision-a-val-03", run_id: runAId, task_id: taskId, status: "accepted", proposal_id: proposalA.proposal_id, selected_member_slot_id: "review", reason: "Canonical acceptance", authority_ref: { kind: "authority-decision", id: "authority-val-03" }, source: "acs", decided_at: 160, correlation_id: "decision-a", idempotency: { key: "decision-a", scope: `coordination:${taskId}`, request_hash: digest } });
    const decisionAResult = await nativeCore.recordCoordinationDecision({ decision: decisionA, proposal: proposalA, task, event: event({ eventId: "event-decision-a", eventType: "coordination.decided", timestamp: 160, sequence: 3, runId: runAId, taskId, key: "decision-a" }), outboxId: "outbox-decision-a", deliveryKind: "coordination.decided" });
    assert.equal(decisionAResult.assignment.member_slot_id, "review");
    assert.equal(decisionAResult.assignment.resolved_agent_revision_ref.revision, 1);
    const compiledA = await nativeCore.compileTaskExecution({ run_id: runAId, task_id: taskId, assignment_id: decisionAResult.assignment.assignment_id, expected_assignment_id: decisionAResult.assignment.assignment_id, expected_assignment_generation: 1, idempotency: { key: "compile-a", scope: `runtime:${taskId}`, request_hash: digest }, compiled_at: 170 });
    assert.equal(compiledA.attempt.assignment_generation, 1);
    assert.equal(compiledA.attempt.agent_revision_ref.revision, 1);
    const compiledEventA = await nativeCore.getEvent(compiledA.event_id);
    assert.equal(compiledEventA?.streamScope, `run:${runAId}`);
    assert.equal(compiledEventA?.event.sequence, 4);
    assert.equal((await nativeCore.replayEvents({ streamScope: `agent:${agentB}` })).some((entry) => entry.event.event_id === compiledA.event_id), false);
    assert.equal((await nativeCore.listOutbox()).filter((entry) => entry.eventId === compiledA.event_id).length, 1);

    await advanceAgent(nativeCore, { agentId: agentA, revision: 3, expectedHead: 2, timestamp: 180 });
    await advanceAgent(nativeCore, { agentId: agentB, revision: 2, expectedHead: 1, timestamp: 190 });
    const r4 = await host.request(`/api/v1/workforces/${workforceId}/revisions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(revisionInput({ expectedRevision: 3, members: membersR3, displayName: "VAL-03 Workforce r4", idempotencyKey: "revision-r4", requestedAt: 200 })) });
    assert.equal(r4.status, 201, JSON.stringify(r4.body));
    assert.equal(r4.body.data.identity.current_revision, 4);
    assert.deepEqual((await nativeCore.getRunMembership(runAId)).map((entry) => [entry.slot_id, entry.resolved_agent_revision_ref.revision]), [["research", 1], ["research-secondary", 1], ["review", 1]]);
    assert.equal((await nativeCore.getAttempt(compiledA.attempt.attempt_id)).agent_revision_ref.revision, 1);
    assert.equal((await nativeCore.getAttempt(compiledA.attempt.attempt_id)).workforce_revision_ref.revision, 3);

    const runB = createRunV2({ run_id: runBId, kind: "workforce", scope: scope(), definition_refs: {}, status: "created", idempotency: { key: "run-b", scope: `run:${runBId}`, request_hash: digest }, execution_binding_refs: [], created_at: 210 });
    await nativeCore.admitWorkforceRun({ run: { run_id: runB.run_id, scope: runB.scope, idempotency: runB.idempotency, execution_binding_refs: [], created_at: runB.created_at }, workforce_id: workforceId, idempotency: runB.idempotency, admitted_at: 211 });
    assert.deepEqual((await nativeCore.getRunMembership(runBId)).map((entry) => [entry.slot_id, entry.resolved_agent_revision_ref.revision]), [["research", 1], ["research-secondary", 1], ["review", 2]]);

    const proposalB = createCoordinationProposalV2({ proposal_id: "proposal-b-val-03", run_id: runAId, task_id: taskId, proposal_kind: "assignment", target_member_slot_id: "research", source: "human", reason: "Reassign to pinned research slot", created_at: 220, correlation_id: "proposal-b", idempotency: { key: "proposal-b", scope: `coordination:${taskId}`, request_hash: digest } });
    await nativeCore.recordCoordinationProposal({ proposal: proposalB, task, event: event({ eventId: "event-proposal-b", eventType: "coordination.proposed", timestamp: 220, sequence: 5, runId: runAId, taskId, key: "proposal-b" }), outboxId: "outbox-proposal-b", deliveryKind: "coordination.proposed" });
    const decisionB = createCoordinationDecisionV2({ decision_id: "decision-b-val-03", run_id: runAId, task_id: taskId, status: "accepted", proposal_id: proposalB.proposal_id, selected_member_slot_id: "research", prior_assignment_id: decisionAResult.assignment.assignment_id, expected_assignment_id: decisionAResult.assignment.assignment_id, reason: "Canonical reassignment", authority_ref: { kind: "authority-decision", id: "authority-val-03" }, source: "human", decided_at: 230, correlation_id: "decision-b", idempotency: { key: "decision-b", scope: `coordination:${taskId}`, request_hash: digest } });
    const decisionBResult = await nativeCore.recordCoordinationDecision({ decision: decisionB, proposal: proposalB, task, event: event({ eventId: "event-decision-b", eventType: "coordination.decided", timestamp: 230, sequence: 6, runId: runAId, taskId, key: "decision-b" }), outboxId: "outbox-decision-b", deliveryKind: "coordination.decided" });
    assert.equal(decisionBResult.assignment.generation, 2);
    assert.equal(decisionBResult.assignment.supersedes_assignment_id, decisionAResult.assignment.assignment_id);
    await assert.rejects(() => nativeCore.compileTaskExecution({ run_id: runAId, task_id: taskId, assignment_id: decisionAResult.assignment.assignment_id, expected_assignment_generation: 1, idempotency: { key: "compile-stale", scope: `runtime:${taskId}`, request_hash: digest }, compiled_at: 231 }), NativeStaleAssignmentError);
    const compiledB = await nativeCore.compileTaskExecution({ run_id: runAId, task_id: taskId, assignment_id: decisionBResult.assignment.assignment_id, expected_assignment_id: decisionBResult.assignment.assignment_id, expected_assignment_generation: 2, idempotency: { key: "compile-b", scope: `runtime:${taskId}`, request_hash: digest }, compiled_at: 240 });
    assert.equal(compiledB.attempt.assignment_generation, 2);
    assert.equal(compiledB.attempt.agent_revision_ref.revision, 1);
    assert.deepEqual((await nativeCore.replayEvents({ streamScope: `run:${runAId}` })).map((entry) => entry.event.sequence), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual((await nativeCore.replayEvents({ streamScope: `run:${runBId}` })).map((entry) => entry.event.sequence), [1]);
    assert.equal((await nativeCore.listOutbox()).filter((entry) => entry.eventId === compiledB.event_id).length, 1);

    const countsBeforeInvalidLifecycle = { events: (await nativeCore.replayEvents()).length, outbox: (await nativeCore.listOutbox()).length };
    const archived = await host.request(`/api/v1/workforces/${workforceId}/lifecycle`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: 4, targetStatus: "archived", changeReason: "Terminal lifecycle validation", idempotencyKey: "archive-r5", requestedAt: 250 }) });
    assert.equal(archived.status, 200, JSON.stringify(archived.body));
    const invalidLifecycle = await host.request(`/api/v1/workforces/${workforceId}/lifecycle`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: 5, targetStatus: "active", changeReason: "Invalid terminal transition", idempotencyKey: "invalid-r6", requestedAt: 251 }) });
    assert.equal(invalidLifecycle.status, 400, JSON.stringify(invalidLifecycle.body));
    assert.equal(invalidLifecycle.body.error.code, "validation_error");
    assert.equal(invalidLifecycle.body.error.reason, "ACS_NATIVE_WORKFORCE_REFERENCE_INVALID");
    assert.deepEqual({ events: (await nativeCore.replayEvents()).length, outbox: (await nativeCore.listOutbox()).length }, { events: countsBeforeInvalidLifecycle.events + 1, outbox: countsBeforeInvalidLifecycle.outbox + 1 });

    await closeHost(host);
    host = undefined;
    await shared.close();
    shared = await createSharedControlPlaneContextFromEnvironment({ instanceId: "val-03-b", environment });
    host = await openHost(shared, root);
    await browser.close();
    browser = undefined;
    await closeIntegratedApplication(app);
    app = await openIntegratedApplication(host.baseUrl, scope().tenant_id);
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const [detail, revisions, runs, runWorkforce, membership, coordination, assignments, runtime] = await Promise.all([
      host.request(`/api/v1/workforces/${workforceId}`),
      host.request(`/api/v1/workforces/${workforceId}/revisions`),
      host.request(`/api/v1/workforces/${workforceId}/runs`),
      host.request(`/api/v1/runs/${runAId}/workforce`),
      host.request(`/api/v1/runs/${runAId}/membership`),
      host.request(`/api/v1/tasks/${taskId}/coordination?runId=${runAId}`),
      host.request(`/api/v1/tasks/${taskId}/assignments?runId=${runAId}`),
      host.request(`/api/v1/tasks/${taskId}/runtime?runId=${runAId}`),
    ]);
    for (const response of [detail, revisions, runs, runWorkforce, membership, coordination, assignments, runtime]) assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(detail.body.data.identity.current_revision, 5);
    assert.equal(detail.body.data.identity.current_status, "archived");
    assert.deepEqual(runs.body.data.map((item) => [item.runId, item.admittedWorkforceRevision]), [[runAId, 3], [runBId, 4]]);
    assert.deepEqual(membership.body.data.map((item) => [item.slot_id, item.resolved_agent_revision_ref.revision]), [["research", 1], ["research-secondary", 1], ["review", 1]]);
    assert.equal(runWorkforce.body.data.workforce.admittedRevision, 3);
    assert.equal(runWorkforce.body.data.workforce.currentHeadRevision, 5);
    assert.equal(coordination.body.data.proposals.length, 2);
    assert.equal(coordination.body.data.decisions.length, 2);
    assert.equal(assignments.body.data.current.generation, 2);
    assert.deepEqual(assignments.body.data.history.map((item) => item.generation), [1, 2]);
    assert.deepEqual(runtime.body.data.attempts.map((item) => [item.assignmentGeneration, item.agentRevisionRef.revision, item.workforceRevisionRef.revision]), [[1, 1, 3], [2, 1, 3]]);
    const [intentA, attemptA, intentB, attemptB] = await Promise.all([
      shared.state.nativeCore.getExecutionIntent(compiledA.intent.intent_id),
      shared.state.nativeCore.getAttempt(compiledA.attempt.attempt_id),
      shared.state.nativeCore.getExecutionIntent(compiledB.intent.intent_id),
      shared.state.nativeCore.getAttempt(compiledB.attempt.attempt_id),
    ]);
    assert.ok(intentA);
    assert.ok(attemptA);
    assert.ok(intentB);
    assert.ok(attemptB);
    assert.equal(attemptA.assignment_id, decisionAResult.assignment.assignment_id);
    assert.equal(attemptB.assignment_id, decisionBResult.assignment.assignment_id);
    const recoveredA = validateRuntimeRecoveryView({ intent: intentA, attempt: attemptA, assignment_current: false, classification: "superseded_assignment" });
    const recoveredB = validateRuntimeRecoveryView({ intent: intentB, attempt: attemptB, assignment_current: true, classification: "resumable" });
    assert.equal(recoveredA.attempt.assignment_generation, 1);
    assert.equal(recoveredB.attempt.assignment_generation, 2);

    await page.goto(`${app.url}/workforces`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Workforce Inventory" }).waitFor();
    assert.ok(await page.getByText(workforceId, { exact: true }).count());
    await page.getByRole("link", { name: "Create Workforce" }).first().click();
    await page.getByRole("heading", { name: "Create Workforce" }).waitFor();
    await page.getByLabel("Workforce ID").fill("workforce-browser-val-03");
    await page.getByLabel("Display name").fill("VAL-03 Browser Workforce");
    await page.getByLabel("Purpose").fill("Integrated browser creation acceptance");
    await page.getByLabel("Ownership reference").fill(scope().owner_ref);
    await page.getByLabel("Slot ID").fill("primary");
    await page.getByLabel("Agent ID").fill(agentB);
    await page.getByLabel("Responsibilities (comma separated)").fill("review");
    await page.getByLabel("Membership policy ID").fill("membership-policy");
    await page.getByLabel("Membership policy fingerprint").fill(digest);
    await page.getByLabel("Audit policy ID").fill("audit-policy");
    await page.getByLabel("Audit policy fingerprint").fill(digest);
    await page.getByRole("button", { name: "Create draft r1" }).click();
    await page.waitForURL(/\/workforces\/workforce-browser-val-03$/);
    await page.getByText("Current revision", { exact: true }).waitFor();
    assert.ok(await page.getByText("draft", { exact: true }).count());
    const lifecycleTargets = await page.locator("select").first().locator("option").evaluateAll((options) => options.map((option) => option.getAttribute("value")));
    assert.deepEqual(lifecycleTargets, ["active", "archived"]);

    const routeChecks = [
      ["", "VAL-03 Workforce r4"],
      ["members", "Workforce members"],
      ["revisions", "Workforce revisions"],
      ["revisions/new", "Create Workforce revision"],
      ["runs", "Workforce Runs"],
      ["operations", "Workforce operations"],
    ];
    for (const [suffix, heading] of routeChecks) {
      const path = suffix ? `/workforces/${workforceId}/${suffix}` : `/workforces/${workforceId}`;
      await page.goto(`${app.url}${path}`, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: heading }).waitFor();
      assert.equal(await page.getByRole("link", { name: "All Workforces" }).getAttribute("aria-current"), null);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: heading }).waitFor();
    }
    await page.goto(`${app.url}/workforces/${workforceId}/runs`, { waitUntil: "domcontentloaded" });
    await page.getByText(runAId, { exact: true }).waitFor();
    await page.getByText("Workforce revision r3", { exact: false }).waitFor();
    await page.getByText(runBId, { exact: true }).waitFor();
    await page.getByText("Workforce revision r4", { exact: false }).waitFor();
  } finally {
    await browser?.close().catch(() => undefined);
    await closeIntegratedApplication(app).catch(() => undefined);
    await closeHost(host).catch(() => undefined);
    await shared?.close().catch(() => undefined);
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.end();
  }
});
