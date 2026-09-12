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
  createSharedControlPlaneContextFromEnvironment,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const policyRef = (entityId) => ({ entity_kind: "policy", entity_id: entityId, revision: 1, fingerprint: digest });

function nativeScope() {
  return {
    organization_id: "org-imp-03f-fix-02",
    product_domain: "acs",
    tenant_id: "tenant-imp-03f-fix-02",
    owner_ref: "owner:acs",
    authority_scope_ref: "authority:acs",
    knowledge_scope_refs: ["knowledge:default"],
  };
}

function agentRevision(agentId) {
  return createAgentRevisionV2({
    agent_id: agentId,
    revision: 1,
    instructions: "Canonical Agent fixture for initial Workforce creation.",
    capability_requirements: [],
    constraints: [],
    knowledge: { allowed_scope_refs: ["knowledge:default"], denied_scope_refs: [], context_policy_ref: policyRef("context-policy"), memory_policy_ref: policyRef("memory-policy") },
    resources: { skill_refs: [], tool_refs: [], mcp_server_refs: [] },
    runtime_preferences: { provider_routes: [], model_requirements: [], harness_preferences: [], executor_preferences: [] },
    governance: { authority_refs: [], permission_policy_ref: policyRef("permission-policy"), approval_policy_ref: policyRef("approval-policy") },
    economics: { cost_policy_ref: policyRef("cost-policy"), budget_policy_ref: policyRef("budget-policy") },
    evidence: { audit_policy_ref: policyRef("audit-policy"), evaluation_refs: [] },
    commit: { created_by: "test:imp-03f-fix-02", committed_at: 10, change_reason: "acceptance fixture" },
  });
}

async function openHost(shared, root) {
  const { server, context } = await createAcsHttpServer({
    sharedControlPlaneContext: shared,
    tenantId: nativeScope().tenant_id,
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
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    server,
    context,
    request: async (path, options = {}) => {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        headers: { "x-acs-actor-id": "system", "x-acs-actor-type": "system", ...(options.headers ?? {}) },
        ...options,
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

test("IMP-03F-FIX-02 canonical host persists initial Workforce creation across restart", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  const schema = `imp03f_fix02_${Date.now()}_${process.pid}`;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const url = new URL(process.env.ACS_SH_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  const environment = {
    ...process.env,
    ACS_STATE_BACKEND: "shared",
    ACS_SHARED_DATABASE_URL: url.toString(),
    ACS_SH_DATABASE_URL: url.toString(),
  };
  const root = await mkdtemp(join(tmpdir(), "acs-imp-03f-fix-02-"));
  let shared;
  let host;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    shared = await createSharedControlPlaneContextFromEnvironment({ instanceId: "imp-03f-fix-02-first", environment });
    const scope = nativeScope();
    const agentId = "agent-imp-03f-fix-02";
    const revision = agentRevision(agentId);
    await shared.state.nativeCore.advanceAgentLineage({
      definition: createAgentDefinitionV2({ agent_id: agentId, scope, name: "Initial Workforce member", status: "active", current_revision: 1, ownership_ref: scope.owner_ref, sharing_mode: "private", created_at: 10, updated_at: 10 }),
      revision,
      expectedHead: 0,
      idempotency: { key: "seed-agent", scope: `agent:${agentId}`, request_hash: digest },
      event: createEventEnvelopeV2({ event_id: "seed-agent-created", event_type: "agent.revision.created", timestamp: 10, sequence: 1, organization_id: scope.organization_id, product_domain: scope.product_domain, tenant_id: scope.tenant_id, agent_id: agentId, actor: { kind: "service", ref: "test:imp-03f-fix-02" }, source: "acs", correlation_id: "seed-agent", idempotency_key: "seed-agent", payload: { agent_revision: 1 } }),
      outboxId: "outbox-seed-agent-created",
      deliveryKind: "agent.revision.created",
    });

    host = await openHost(shared, root);
    const empty = await host.request("/api/v1/workforces");
    assert.equal(empty.status, 200, JSON.stringify(empty.body));
    assert.deepEqual(empty.body.data, []);

    const input = {
      workforceId: "workforce-imp-03f-fix-02",
      displayName: "First Workforce Acceptance",
      purpose: "Canonical initial Workforce creation acceptance.",
      ownershipRef: scope.owner_ref,
      slotId: "primary",
      agentId,
      responsibilities: ["coordinate"],
      membershipPolicyRef: revision.governance.approval_policy_ref,
      auditPolicyRef: revision.evidence.audit_policy_ref,
      changeReason: "Initial Workforce creation acceptance",
      idempotencyKey: "create-first-workforce",
      requestedAt: 100,
    };
    const created = await host.request("/api/v1/workforces", { method: "POST", headers: { "content-type": "application/json", "x-acs-correlation-id": "create-first" }, body: JSON.stringify(input) });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.identity.current_status, "draft");
    assert.equal(created.body.data.currentRevision.ref.revision, 1);
    assert.equal(created.body.data.currentRevision.members[0].agent_selector.agent_id, agentId);

    const retried = await host.request("/api/v1/workforces", { method: "POST", headers: { "content-type": "application/json", "x-acs-correlation-id": "create-first-retry" }, body: JSON.stringify(input) });
    assert.equal(retried.status, 201, JSON.stringify(retried.body));
    assert.equal(retried.body.data.currentRevision.ref.fingerprint, created.body.data.currentRevision.ref.fingerprint);
    await closeHost(host);
    host = undefined;
    await shared.close();
    shared = await createSharedControlPlaneContextFromEnvironment({ instanceId: "imp-03f-fix-02-reload", environment });
    host = await openHost(shared, root);

    const list = await host.request("/api/v1/workforces");
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.deepEqual(list.body.data.map((entry) => entry.workforceId), [input.workforceId]);
    const detail = await host.request(`/api/v1/workforces/${input.workforceId}`);
    assert.equal(detail.status, 200, JSON.stringify(detail.body));
    assert.equal(detail.body.data.identity.workforce_id, input.workforceId);
    assert.equal(detail.body.data.currentRevision.ref.revision, 1);
  } finally {
    await closeHost(host).catch(() => undefined);
    await shared?.close().catch(() => undefined);
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.end();
  }
});
