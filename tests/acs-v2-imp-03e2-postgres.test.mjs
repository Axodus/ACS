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
  createAcsHttpServer,
  createEventEnvelopeV2,
  createRunV2,
  createSharedControlPlaneContextFromEnvironment,
  createWorkforceDefinitionV2,
  createWorkforceRevisionV2,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const policyRef = (id) => ({ entity_kind: "policy", entity_id: id, revision: 1, fingerprint: digest });
const agentRevisionRef = (agentId, revision = 1) => ({ entity_kind: "agent", entity_id: agentId, revision, fingerprint: digest });

function scope() {
  return {
    organization_id: "org-imp-03e2-pg",
    product_domain: "acs",
    tenant_id: "tenant-imp-03e2-pg",
    owner_ref: "owner:acs",
    authority_scope_ref: "authority:acs",
    knowledge_scope_refs: [],
  };
}

function agentRevision(agentId) {
  return createAgentRevisionV2({
    agent_id: agentId,
    revision: 1,
    instructions: "IMP-03E2 PostgreSQL fixture",
    capability_requirements: [],
    constraints: [],
    knowledge: { allowed_scope_refs: [], denied_scope_refs: [], context_policy_ref: policyRef("context"), memory_policy_ref: policyRef("memory") },
    resources: { skill_refs: [], tool_refs: [], mcp_server_refs: [] },
    runtime_preferences: { provider_routes: [], model_requirements: [], harness_preferences: [], executor_preferences: [] },
    governance: { authority_refs: [], permission_policy_ref: policyRef("permission"), approval_policy_ref: policyRef("approval") },
    economics: { cost_policy_ref: policyRef("cost"), budget_policy_ref: policyRef("budget") },
    evidence: { audit_policy_ref: policyRef("audit"), evaluation_refs: [] },
    commit: { created_by: "test:imp-03e2", committed_at: 900, change_reason: "fixture" },
  });
}

function workforceMember(agentId) {
  return {
    slot_id: "primary",
    agent_selector: { mode: "current_head_at_admission", agent_id: agentId },
    responsibilities: ["coordinate"],
    capability_requirement_refs: [],
    authority_constraint_refs: [],
    participation_constraint_refs: [],
  };
}

function lineageEvent({ workforceId, revision, status, fingerprint, eventType, key, timestamp, previousStatus }) {
  return createEventEnvelopeV2({
    event_id: `event-${key}`,
    event_type: eventType,
    timestamp,
    sequence: revision,
    organization_id: scope().organization_id,
    product_domain: "acs",
    tenant_id: scope().tenant_id,
    workforce_id: workforceId,
    actor: { kind: "service", ref: "test:imp-03e2" },
    source: "acs",
    correlation_id: key,
    idempotency_key: key,
    payload: {
      workforce_revision: revision,
      workforce_fingerprint: fingerprint,
      lifecycle_status: status,
      ...(previousStatus ? { previous_status: previousStatus } : {}),
      authority_decision_ref: `authority:${key}`,
    },
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
    request: async (path, options = {}) => {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        ...options,
        headers: { "x-acs-actor-id": "system", "x-acs-actor-type": "system", ...(options.headers ?? {}) },
      });
      return { status: response.status, body: await response.json() };
    },
  };
}

test("IMP-03E2 canonical HTTP/PostgreSQL path preserves revisions, lifecycle, and historical Run admission", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  const schema = `imp03e2_${Date.now()}_${process.pid}`;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const databaseUrl = new URL(process.env.ACS_SH_DATABASE_URL);
  databaseUrl.searchParams.set("options", `-c search_path=${schema}`);
  const environment = { ...process.env, ACS_STATE_BACKEND: "shared", ACS_SHARED_DATABASE_URL: databaseUrl.toString(), ACS_SH_DATABASE_URL: databaseUrl.toString() };
  const root = await mkdtemp(join(tmpdir(), "acs-imp-03e2-"));
  let shared;
  let host;
  const workforceId = "workforce-imp-03e2-pg";
  const agentId = "agent-imp-03e2-pg";
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    shared = await createSharedControlPlaneContextFromEnvironment({ instanceId: "imp-03e2", environment });
    const workforceScope = scope();
    const agent = agentRevision(agentId);
    await shared.state.nativeCore.advanceAgentLineage({
      definition: createAgentDefinitionV2({ agent_id: agentId, scope: workforceScope, name: "IMP-03E2 Agent", status: "active", current_revision: 1, ownership_ref: workforceScope.owner_ref, sharing_mode: "private", created_at: 900, updated_at: 900 }),
      revision: agent,
      expectedHead: 0,
      idempotency: { key: "agent-create", scope: `agent:${agentId}`, request_hash: digest },
      event: createEventEnvelopeV2({ event_id: "event-agent-create", event_type: "agent.revision.created", timestamp: 900, sequence: 1, organization_id: workforceScope.organization_id, product_domain: "acs", tenant_id: workforceScope.tenant_id, agent_id: agentId, actor: { kind: "service", ref: "test:imp-03e2" }, source: "acs", correlation_id: "agent-create", idempotency_key: "agent-create", payload: { agent_revision: 1 } }),
      outboxId: "outbox-agent-create",
      deliveryKind: "agent.revision.created",
    });

    const revision1 = createWorkforceRevisionV2({ workforce_id: workforceId, revision: 1, display_name: "Workforce 1", purpose: "IMP-03E2 acceptance", lifecycle_status: "draft", members: [workforceMember(agentId)], composition_constraints: [], governance: { authority_refs: [], membership_policy_ref: policyRef("membership") }, evidence: { audit_policy_ref: policyRef("audit") }, commit: { created_by: "test:imp-03e2", committed_at: 1000, change_reason: "fixture" } });
    await shared.state.nativeCore.advanceWorkforceLineage({
      definition: createWorkforceDefinitionV2({ workforce_id: workforceId, scope: workforceScope, current_status: "draft", current_revision: 1, ownership_ref: workforceScope.owner_ref, created_at: 1000, updated_at: 1000 }),
      revision: revision1,
      expectedHead: 0,
      idempotency: { key: "workforce-create", scope: `workforce:${workforceId}`, request_hash: digest },
      authority: { decision_ref: "authority:workforce-create", decision: "allowed", authority_scope_ref: workforceScope.authority_scope_ref, evaluated_at: 1000 },
      event: lineageEvent({ workforceId, revision: 1, status: "draft", fingerprint: revision1.ref.fingerprint, eventType: "workforce.created", key: "workforce-create", timestamp: 1000 }),
      outboxId: "outbox-workforce-create",
      deliveryKind: "workforce.created",
    });

    host = await openHost(shared, root);
    const activationResponse = await host.request(`/api/v1/workforces/${workforceId}/lifecycle`, { method: "POST", body: JSON.stringify({ expectedRevision: 1, targetStatus: "active", changeReason: "Activate r2", idempotencyKey: "workforce-lifecycle-2", requestedAt: 1500 }), headers: { "content-type": "application/json" } });
    assert.equal(activationResponse.status, 200, JSON.stringify(activationResponse.body));
    assert.equal(activationResponse.body.data.identity.current_status, "active");

    const lineageAfterActivation = await shared.state.nativeCore.getWorkforceLineage(workforceId);
    const revision2 = lineageAfterActivation.revisions.at(-1);
    const runA = createRunV2({ run_id: "run-a", kind: "workforce", scope: workforceScope, definition_refs: { workforce_revision_ref: revision2.ref }, status: "created", idempotency: { key: "run-a", scope: "run:run-a", request_hash: digest }, execution_binding_refs: [], created_at: 1600 });
    await shared.state.nativeCore.admitWorkforceRun({ run: { run_id: runA.run_id, scope: runA.scope, idempotency: runA.idempotency, execution_binding_refs: runA.execution_binding_refs, created_at: runA.created_at }, workforce_id: workforceId, idempotency: runA.idempotency, admitted_at: 1700 });

    const revisionRequest = {
      expectedRevision: 2,
      displayName: "Workforce 3",
      purpose: "IMP-03E2 revised composition",
      members: [workforceMember(agentId)],
      compositionConstraints: [],
      authorityRefs: [],
      membershipPolicyRef: policyRef("membership"),
      auditPolicyRef: policyRef("audit"),
      changeReason: "Create r3",
      idempotencyKey: "workforce-revision-3",
      requestedAt: 2000,
    };
    const revisionResponse = await host.request(`/api/v1/workforces/${workforceId}/revisions`, { method: "POST", body: JSON.stringify(revisionRequest), headers: { "content-type": "application/json" } });
    assert.equal(revisionResponse.status, 201, JSON.stringify(revisionResponse.body));
    assert.equal(revisionResponse.body.data.currentRevision.ref.revision, 3);
    assert.equal(revisionResponse.body.data.currentRevision.members[0].agent_selector.mode, "current_head_at_admission");

    const lineageAfterRevision = await shared.state.nativeCore.getWorkforceLineage(workforceId);
    const revision3 = lineageAfterRevision.revisions.at(-1);
    const runB = createRunV2({ run_id: "run-b", kind: "workforce", scope: workforceScope, definition_refs: { workforce_revision_ref: revision3.ref }, status: "created", idempotency: { key: "run-b", scope: "run:run-b", request_hash: digest }, execution_binding_refs: [], created_at: 2100 });
    await shared.state.nativeCore.admitWorkforceRun({ run: { run_id: runB.run_id, scope: runB.scope, idempotency: runB.idempotency, execution_binding_refs: runB.execution_binding_refs, created_at: runB.created_at }, workforce_id: workforceId, idempotency: runB.idempotency, admitted_at: 2200 });

    const lifecycleResponse = await host.request(`/api/v1/workforces/${workforceId}/lifecycle`, { method: "POST", body: JSON.stringify({ expectedRevision: 3, targetStatus: "disabled", changeReason: "Disable r4", idempotencyKey: "workforce-lifecycle-4", requestedAt: 3000 }), headers: { "content-type": "application/json" } });
    assert.equal(lifecycleResponse.status, 200, JSON.stringify(lifecycleResponse.body));
    assert.equal(lifecycleResponse.body.data.identity.current_status, "disabled");

    const runsResponse = await host.request(`/api/v1/workforces/${workforceId}/runs`);
    assert.equal(runsResponse.status, 200, JSON.stringify(runsResponse.body));
    assert.deepEqual(runsResponse.body.data.map((run) => [run.runId, run.admittedWorkforceRevision, run.admittedAt]), [["run-a", 2, 1700], ["run-b", 3, 2200]]);
    assert.equal((await shared.state.nativeCore.getWorkforceLineage(workforceId)).revisions.find((revision) => revision.ref.revision === 1).display_name, "Workforce 1");
  } finally {
    if (host) await new Promise((resolve) => host.server.close(resolve));
    await host?.context.close().catch(() => undefined);
    await shared?.close().catch(() => undefined);
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.end();
  }
});
