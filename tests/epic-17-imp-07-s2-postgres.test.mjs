import assert from "node:assert/strict";
import { Pool } from "pg";
import test from "node:test";
import * as api from "../dist/index.js";

const hash = (value) => api.sha256Hex(api.stableStringify(value));
const ref = (entity_kind, entity_id) => ({ entity_kind, entity_id, revision: 1, fingerprint: hash({ entity_kind, entity_id }) });

async function isolated(run) {
  const schema = `e17i07s2_${Date.now()}_${process.pid}`;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const url = new URL(process.env.ACS_SH_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  const state = new api.PostgresSharedAuthoritativeState({ connectionString: url.toString() });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await state.migrate();
    await admin.query(`INSERT INTO "${schema}".acs_tenants (tenant_id,revision,payload) VALUES ('tenant-a',1,'{}'::jsonb)`);
    await run(state);
  } finally {
    await state.close().catch(() => undefined);
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.end().catch(() => undefined);
  }
}

function revision(number, predecessor_ref) {
  return api.createAutomationRevisionV1({ automation_id: "automation-s2", tenant_id: "tenant-a", revision: number, ...(predecessor_ref ? { predecessor_ref } : {}), purpose: "S2 durable command", target_mode: "PINNED", pinned_target: { target_ref: ref("workflow", "workflow-a") }, definitions: [], external_refs: { agent_refs: [], workforce_refs: [], workflow_refs: [], resource_refs: [], executor_refs: [] }, delegation_requirement_refs: [], governing_refs: [], authored_configuration: {}, authored_by: "governance", authored_at: number, change_reason: "S2", provenance_refs: [] });
}

function event(id, type, revisionValue, lifecycle, sequence = revisionValue.ref.revision) {
  return api.createEventEnvelopeV2({ event_id: id, event_type: type, timestamp: revisionValue.authored_at, sequence, organization_id: "org", product_domain: "acs", tenant_id: "tenant-a", subject_type: "automation", subject_id: revisionValue.ref.automation_id, actor: { kind: "service", ref: "s2" }, source: "acs", correlation_id: id, idempotency_key: id, payload: { automation_id: revisionValue.ref.automation_id, revision: revisionValue.ref.revision, fingerprint: revisionValue.ref.fingerprint, ...(lifecycle ? { lifecycle } : {}) } });
}

test("S2 PostgreSQL coordinator delegates Automation create, exact revision, retry, and lifecycle to the canonical owner", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  await isolated(async (state) => {
    const owner = new api.GovernedAutomationService(state.nativeCore);
    const service = new api.AdministrativeAutomationCommandService(owner);
    const first = revision(1);
    const create = { revision: first, lifecycleEventId: "automation-s2-draft", createdAt: 1, createdBy: "governance", reason: "create", governingAuthorityRefs: [], approvalRefs: [], provenanceRefs: [], evidenceId: "e-create", idempotency: { scope: "automation:tenant-a:automation-s2", key: "create", request_hash: hash({ action: "create", revision: first.ref }) }, event: event("create", "automation.created", first) };
    const created = await service.create("tenant-a", create);
    const retry = await service.create("tenant-a", create);
    assert.equal(created.metadata.source.addressing, "CURRENT");
    assert.deepEqual(retry, created);

    const second = revision(2, first.ref);
    const revised = await service.revise("tenant-a", { revision: second, expectedRef: first.ref, evidenceId: "e-revise", idempotency: { scope: "automation:tenant-a:automation-s2", key: "revise", request_hash: hash({ action: "revise", expected: first.ref, revision: second.ref }) }, event: event("revise", "automation.revised", second) });
    assert.equal(revised.metadata.source.addressing, "EXACT");
    assert.equal(revised.metadata.source.revision, 2);

    const enabled = await service.transition("tenant-a", { automationId: "automation-s2", tenantId: "tenant-a", toLifecycle: "enabled", lifecycleEventId: "automation-s2-enabled", transitionedBy: "governance", transitionedAt: 3, reason: "enable", governingAuthorityRefs: [], approvalRefs: [], provenanceRefs: [], evidenceId: "e-enabled", idempotency: { scope: "automation.lifecycle:tenant-a:automation-s2", key: "enable", request_hash: hash({ action: "lifecycle", revision: second.ref, from: "draft", to: "enabled" }) }, event: event("enable", "automation.enabled", second, "enabled", 3) });
    assert.equal(enabled.fields.lifecycle, "enabled");
    await assert.rejects(() => service.transition("tenant-b", { automationId: "automation-s2", tenantId: "tenant-a", toLifecycle: "disabled" }), (error) => error instanceof api.AdministrativeQueryError && error.code === "TENANT_MISMATCH");
  });
});
