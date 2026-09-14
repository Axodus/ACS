import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import * as api from "../dist/native-core/index.js";
import { PostgresSharedAuthoritativeState } from "../dist/control-plane/shared-state/postgres-shared-state.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");

test("Slice 5 PostgreSQL lists only Tenant-bound Delegation Grant heads", {skip:process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured"}, async () => {
  const schema = `e17i04s5_${Date.now()}_${process.pid}`;
  const admin = new Pool({connectionString:process.env.ACS_SH_DATABASE_URL});
  const url = new URL(process.env.ACS_SH_DATABASE_URL); url.searchParams.set("options", `-c search_path=${schema}`);
  const state = new PostgresSharedAuthoritativeState({connectionString:url.toString()});
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`); await state.migrate();
    await admin.query(`INSERT INTO "${schema}".acs_tenants (tenant_id,revision,payload) VALUES ('tenant-a',1,'{}'::jsonb),('tenant-b',1,'{}'::jsonb)`);
    const revision = api.createDelegationGrantRevisionV1({grant_id:"grant-ab",tenant_id:"tenant-a",revision:1,delegator:{agent_id:"agent-a",tenant_id:"tenant-a",revision_ref:{entity_kind:"agent",entity_id:"agent-a",revision:1,fingerprint:hash("agent-a")}},delegate:{agent_id:"agent-b",tenant_id:"tenant-a",revision_ref:{entity_kind:"agent",entity_id:"agent-b",revision:1,fingerprint:hash("agent-b")}},authority_bounds:{actions:["read"],capability_refs:[],resource_refs:[],tool_refs:[],model_refs:[],connection_refs:[],credential_purposes:[],memory_scope_refs:[],memory_operations:[]},valid_from:1,expires_at:100,onward_delegation_allowed:false,max_delegation_depth:1,ancestry_grant_refs:[],depth:1,governing_authority_refs:[],governing_policy_refs:[],approval_refs:[],provenance_refs:[],issued_by:"governance",issued_at:1,reason:"test"});
    const head = api.validateDelegationGrantHeadV1({schema_version:api.ACS_NATIVE_SCHEMA_VERSION,grant_id:"grant-ab",tenant_id:"tenant-a",current_revision:1,current_fingerprint:revision.ref.fingerprint,lifecycle:"active",valid_from:1,expires_at:100,created_at:1,updated_at:1});
    const event = api.createEventEnvelopeV2({event_id:"grant-created",event_type:"delegation.grant.created",timestamp:1,sequence:1,organization_id:"org",product_domain:"acs",tenant_id:"tenant-a",subject_type:"delegation_grant",subject_id:"grant-ab",actor:{kind:"service",ref:"test"},source:"acs",correlation_id:"grant-created",idempotency_key:"grant-created",payload:{grant_id:"grant-ab"}});
    await state.nativeCore.advanceDelegationGrant({head,revision,expectedHead:0,idempotency:{scope:"delegation.grant:tenant-a:grant-ab",key:"grant-created",request_hash:hash("grant-created")},event,outboxId:"outbox-grant-created"});
    assert.deepEqual((await state.nativeCore.listDelegationGrantHeads({tenantId:"tenant-a"})).map((item) => item.grant_id), ["grant-ab"]);
    assert.deepEqual(await state.nativeCore.listDelegationGrantHeads({tenantId:"tenant-b"}), []);
  } finally { await state.close().catch(()=>undefined); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(()=>undefined); await admin.end(); }
});
