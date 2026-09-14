import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";

const api = await import(`${process.env.ACS_TEST_DIST_ROOT ?? "../dist"}/index.js`);
const hash = (char = "a") => char.repeat(64);

async function isolated(run) {
  const schema = `e17i03b_${Date.now()}_${process.pid}`;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const url = new URL(process.env.ACS_SH_DATABASE_URL); url.searchParams.set("options", `-c search_path=${schema}`);
  const state = new api.PostgresSharedAuthoritativeState({ connectionString: url.toString(), memoryCryptoProvider: new api.DeterministicTestMemoryCryptoProviderV1() });
  const noCrypto = new api.PostgresSharedAuthoritativeState({ connectionString: url.toString() });
  const pool = new Pool({ connectionString: url.toString() });
  try { await admin.query(`CREATE SCHEMA "${schema}"`); await state.migrate(); await pool.query("INSERT INTO acs_tenants (tenant_id, revision, payload) VALUES ('tenant-m', 1, '{}'::jsonb), ('tenant-other', 1, '{}'::jsonb)"); await run(state, noCrypto, pool); }
  finally { await state.close().catch(() => undefined); await noCrypto.close().catch(() => undefined); await pool.end().catch(() => undefined); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.end(); }
}
function policy(revision = 1) { return api.createMemoryPolicyRevisionV1({ memory_policy_id:"policy-a",revision,...(revision>1?{supersedes_revision:revision-1}:{}),tenant_id:"tenant-m",lifecycle:"active",allowed_memory_types:["agent"],allowed_scope_kinds:["agent"],allowed_operations:["read","write","forget","expire"],max_retrieval_results:2,retention:{max_age_ms:1000,deletion_action:"tombstone",retain_content_digest:true},provenance_required:true,evidence_required:true,created_by:"governance",created_at:revision,change_reason:"test" }); }
function head(revision) { const r=policy(revision); return api.validateMemoryPolicyHeadV1({schema_version:api.ACS_NATIVE_SCHEMA_VERSION,memory_policy_id:"policy-a",tenant_id:"tenant-m",current_revision:revision,current_fingerprint:r.ref.fingerprint,lifecycle:"active",created_at:1,updated_at:revision}); }
function event(id,seq,subject,idSubject,payload) { return api.createEventEnvelopeV2({event_id:id,event_type:`memory.${subject}.changed`,timestamp:seq,sequence:seq,organization_id:"org",product_domain:"acs",tenant_id:"tenant-m",subject_type:subject,subject_id:idSubject,actor:{kind:"service",ref:"test"},source:"acs",correlation_id:id,idempotency_key:id,payload}); }
function policyCommand(revision,key) { const r=policy(revision); return {head:head(revision),revision:r,expectedHead:revision-1,idempotency:{scope:"memory.policy:policy-a",key,request_hash:hash()},event:{...event(`policy-${key}`,revision,"memory_policy","policy-a",{revision,fingerprint:r.ref.fingerprint}),idempotency_key:key},outboxId:`outbox-policy-${key}`}; }
function record(id, predecessor_ref = undefined) { const p=policy(); return api.createMemoryRecordV1({memory_id:id,tenant_id:"tenant-m",memory_type:"agent",scope:{tenant_id:"tenant-m",kind:"agent",agent_ref:{tenant_id:"tenant-m",ref:{kind:"agent",id:"agent-a"}}},policy_ref:{tenant_id:"tenant-m",ref:p.ref},content:{content_ref:`memory-content:${id}`,content_digest:api.sha256Hex(`content:${id}`),media_type:"text/plain"},...(predecessor_ref?{predecessor_ref}:{}),provenance_refs:[],sensitivity:"restricted",created_by:"test",created_at:10}); }
function recordCommand(value,key,seq=10) { return {record:value,plaintext:`content:${value.ref.memory_id}`,idempotency:{scope:`memory.record:${value.ref.memory_id}`,key,request_hash:hash("b")},event:{...event(`record-${key}`,seq,"memory_record",value.ref.memory_id,{fingerprint:value.ref.fingerprint,policy_fingerprint:value.policy_ref.ref.fingerprint}),idempotency_key:key},outboxId:`outbox-record-${key}`}; }

test("Slice 2 PostgreSQL encrypts Memory content, preserves policy history, successors, tombstones, and atomicity", {skip:process.env.ACS_SH_DATABASE_URL?false:"ACS_SH_DATABASE_URL is not configured"}, async () => {
  await isolated(async(state,noCrypto,pool) => {
    const first=await state.nativeCore.advanceMemoryPolicy(policyCommand(1,"create"));
    const second=await state.nativeCore.advanceMemoryPolicy(policyCommand(2,"revise"));
    await assert.rejects(() => state.nativeCore.advanceMemoryPolicy(policyCommand(2,"stale")),api.RevisionConflictError);
    assert.equal(first.lineage.revisions[0].ref.revision,1); assert.equal(second.lineage.revisions[1].ref.revision,2);
    const original=record("memory-a");
    await assert.rejects(() => noCrypto.nativeCore.createMemoryRecord(recordCommand(original,"no-provider")),api.MemoryCryptoUnavailableError);
    const created=await state.nativeCore.createMemoryRecord(recordCommand(original,"create",1));
    const row=await pool.query("SELECT content_ciphertext,encryption_backend,encryption_key_ref,encryption_key_version,cipher_suite,encryption_context_digest FROM acs_memory_contents WHERE memory_id='memory-a'");
    assert.equal(row.rowCount,1); assert.notEqual(Buffer.from(row.rows[0].content_ciphertext).toString("utf8"),"content:memory-a"); assert.ok(row.rows[0].encryption_backend && row.rows[0].encryption_key_ref && row.rows[0].encryption_key_version && row.rows[0].cipher_suite && row.rows[0].encryption_context_digest);
    const successor=record("memory-b",original.ref); await state.nativeCore.createMemoryRecord(recordCommand(successor,"successor",1));
    await assert.rejects(() => pool.query("INSERT INTO acs_memory_records (memory_id,tenant_id,fingerprint,memory_type,scope_kind,scope_owner_id,scope_owner_revision,scope_owner_fingerprint,scope_run_id,policy_id,policy_revision,policy_fingerprint,predecessor_memory_id,predecessor_tenant_id,predecessor_fingerprint,payload,created_by,created_at) VALUES ('memory-cross','tenant-m',$1,'agent','agent','agent-a',NULL,NULL,NULL,'policy-a',1,$2,'memory-a','tenant-other',$3,'{}'::jsonb,'test',clock_timestamp())", [hash("e"), policy().ref.fingerprint, original.ref.fingerprint]));
    const tombstone=api.createMemoryTombstoneV1({memory_ref:original.ref,memory_type:"agent",scope:original.scope,policy_ref:original.policy_ref,deleted_at:20,deletion_reason:"policy_forget",digest_retention:"policy_permitted",retained_content_digest:original.content.content_digest,provenance_refs:[]});
    const deletion={tombstone,idempotency:{scope:"memory.retention:memory-a",key:"delete",request_hash:hash("c")},event:{...event("record-delete",2,"memory_record","memory-a",{fingerprint:original.ref.fingerprint,assurance:"ACTIVE_STORE_DELETED"}),idempotency_key:"delete"},outboxId:"outbox-delete"};
    const removed=await state.nativeCore.tombstoneMemoryRecord(deletion); assert.equal(removed.tombstone.memory_ref.memory_id,"memory-a");
    const stateAfter=await state.nativeCore.getMemoryRecordState("memory-a"); assert.equal(stateAfter.tombstone.digest_retention,"policy_permitted"); assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_memory_contents WHERE memory_id='memory-a'")).rows[0].count,0);
    const before=await pool.query("SELECT (SELECT count(*) FROM acs_memory_tombstones)::int AS tombstones,(SELECT count(*) FROM acs_native_events)::int AS events,(SELECT count(*) FROM acs_native_outbox)::int AS outbox");
    await assert.rejects(() => state.nativeCore.tombstoneMemoryRecord({...deletion,idempotency:{...deletion.idempotency,key:"rollback",request_hash:hash("d")},event:{...deletion.event,event_id:"record-delete-rollback",correlation_id:"record-delete-rollback",idempotency_key:"rollback"},outboxId:"outbox-delete"}));
    const after=await pool.query("SELECT (SELECT count(*) FROM acs_memory_tombstones)::int AS tombstones,(SELECT count(*) FROM acs_native_events)::int AS events,(SELECT count(*) FROM acs_native_outbox)::int AS outbox"); assert.deepEqual(after.rows[0],before.rows[0]);
    await assert.rejects(() => pool.query("UPDATE acs_memory_records SET created_by='x' WHERE memory_id='memory-b'"));
    await assert.rejects(() => pool.query("DELETE FROM acs_memory_policy_revisions WHERE memory_policy_id='policy-a' AND revision=1"));
  });
});

test("Slice 3 PostgreSQL governed Memory retrieval enforces exact Tenant, scope, Policy, bound, and tombstone behavior", {skip:process.env.ACS_SH_DATABASE_URL?false:"ACS_SH_DATABASE_URL is not configured"}, async () => {
  await isolated(async(state,_noCrypto) => {
    await state.nativeCore.advanceMemoryPolicy(policyCommand(1,"governed-policy"));
    const original=record("memory-governed");
    const service=new api.GovernedMemoryService(state.nativeCore,{async validate({tenantId,scope}) { if (tenantId!=="tenant-m" || scope.kind!=="agent" || scope.agent_ref?.ref.id!=="agent-a") throw new Error("canonical owner mismatch"); }});
    const writeDecision=api.createMemoryPolicyAccessDecisionV1({decision_id:"write-governed",tenant_id:"tenant-m",policy_ref:original.policy_ref,memory_type:"agent",scope:original.scope,operation:"write",purpose:"test",outcome:"allowed",authority_basis_refs:[],provenance_refs:[],decided_at:1});
    await service.write({command:recordCommand(original,"governed-write",1),decision:writeDecision});
    const readDecision=api.createMemoryPolicyAccessDecisionV1({...writeDecision,decision_id:"read-governed",operation:"read"});
    const found=await service.retrieve({decision:readDecision,memoryType:"agent",scope:original.scope,policyRef:original.policy_ref,limit:1});
    assert.equal(found.length,1); assert.equal(found[0].plaintext,"content:memory-governed");
    await assert.rejects(()=>service.retrieve({decision:readDecision,memoryType:"agent",scope:original.scope,policyRef:original.policy_ref,limit:3}),api.GovernedMemoryAccessError);
    const tombstone=api.createMemoryTombstoneV1({memory_ref:original.ref,memory_type:"agent",scope:original.scope,policy_ref:original.policy_ref,deleted_at:3,deletion_reason:"policy_forget",digest_retention:"policy_permitted",retained_content_digest:original.content.content_digest,provenance_refs:[]});
    await state.nativeCore.tombstoneMemoryRecord({tombstone,idempotency:{scope:"memory.retention:memory-governed",key:"governed-delete",request_hash:hash("f")},event:{...event("governed-delete",2,"memory_record","memory-governed",{fingerprint:original.ref.fingerprint,assurance:"ACTIVE_STORE_DELETED"}),idempotency_key:"governed-delete"},outboxId:"outbox-governed-delete"});
    assert.deepEqual(await service.retrieve({decision:readDecision,memoryType:"agent",scope:original.scope,policyRef:original.policy_ref,limit:1}),[]);
  });
});

test("Slice 4 PostgreSQL retention is governed, idempotent, content-free, and atomic", {skip:process.env.ACS_SH_DATABASE_URL?false:"ACS_SH_DATABASE_URL is not configured"}, async () => {
  await isolated(async(state,_noCrypto,pool) => {
    await state.nativeCore.advanceMemoryPolicy(policyCommand(1,"retention-policy"));
    const service=new api.GovernedMemoryService(state.nativeCore,{async validate({tenantId,scope}) { if (tenantId!=="tenant-m" || scope.kind!=="agent" || scope.agent_ref?.ref.id!=="agent-a") throw new Error("canonical owner mismatch"); }});
    const original=record("memory-retention");
    const writeDecision=api.createMemoryPolicyAccessDecisionV1({decision_id:"write-retention",tenant_id:"tenant-m",policy_ref:original.policy_ref,memory_type:"agent",scope:original.scope,operation:"write",purpose:"test",outcome:"allowed",authority_basis_refs:[],provenance_refs:[],decided_at:1});
    await service.write({command:recordCommand(original,"retention-write",1),decision:writeDecision});
    const expireDecision=api.createMemoryPolicyAccessDecisionV1({...writeDecision,decision_id:"expire-retention",operation:"expire"});
    const dueEvent={...event("retention-due",2,"memory_record",original.ref.memory_id,{fingerprint:original.ref.fingerprint,policy_fingerprint:original.policy_ref.ref.fingerprint,assurance:"ACTIVE_STORE_DELETED"}),event_type:"memory.record.retention_expired",idempotency_key:"retention-due"};
    const earlyEvent={...dueEvent,event_id:"retention-early",correlation_id:"retention-early",idempotency_key:"retention-early"};
    const before=await pool.query("SELECT (SELECT count(*) FROM acs_memory_tombstones)::int AS tombstones,(SELECT count(*) FROM acs_native_events)::int AS events,(SELECT count(*) FROM acs_native_outbox)::int AS outbox");
    await assert.rejects(() => service.applyRetention({memoryRef:original.ref,decision:expireDecision,at:1009,idempotency:{scope:"memory.retention:memory-retention",key:"retention-early",request_hash:hash("a")},event:earlyEvent,evidenceId:"evidence-early",outboxId:"outbox-retention-early"}),api.GovernedMemoryAccessError);
    const afterEarly=await pool.query("SELECT (SELECT count(*) FROM acs_memory_tombstones)::int AS tombstones,(SELECT count(*) FROM acs_native_events)::int AS events,(SELECT count(*) FROM acs_native_outbox)::int AS outbox");
    assert.deepEqual(afterEarly.rows[0],before.rows[0]);
    const command={memoryRef:original.ref,decision:expireDecision,at:1010,idempotency:{scope:"memory.retention:memory-retention",key:"retention-due",request_hash:hash("b")},event:dueEvent,evidenceId:"evidence-retention",outboxId:"outbox-retention-due"};
    const deleted=await service.applyRetention(command);
    const replay=await service.applyRetention(command);
    assert.equal(deleted.tombstone.deletion_reason,"retention_expired"); assert.equal(replay.tombstone.memory_ref.memory_id,original.ref.memory_id);
    await assert.rejects(() => service.applyRetention({...command,idempotency:{scope:"memory.retention:memory-retention",key:"retention-new",request_hash:hash("c")},event:{...dueEvent,event_id:"retention-new",correlation_id:"retention-new",idempotency_key:"retention-new"},evidenceId:"evidence-retention-new",outboxId:"outbox-retention-new"}),api.NativeMemoryRecordIntegrityError);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_memory_contents WHERE memory_id='memory-retention'")).rows[0].count,0);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_memory_tombstones WHERE memory_id='memory-retention'")).rows[0].count,1);
    const persisted=await pool.query("SELECT payload::text AS payload FROM acs_native_events UNION ALL SELECT payload::text AS payload FROM acs_native_evidence");
    for (const row of persisted.rows) assert.doesNotMatch(row.payload,/content:memory-retention/);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_native_outbox WHERE event_id='retention-due'")).rows[0].count,1);
    const readDecision=api.createMemoryPolicyAccessDecisionV1({...writeDecision,decision_id:"read-retention",operation:"read"});
    assert.deepEqual(await service.retrieve({decision:readDecision,memoryType:"agent",scope:original.scope,policyRef:original.policy_ref,limit:1}),[]);
    await assert.rejects(() => service.applyRetention({...command,memoryRef:{...original.ref,tenant_id:"tenant-other"}}),api.GovernedMemoryAccessError);
    const workforceScope={tenant_id:"tenant-m",kind:"workforce_shared",run_ref:{tenant_id:"tenant-m",ref:{kind:"run",id:"run-a"}},workforce_revision_ref:{tenant_id:"tenant-m",ref:{entity_kind:"workforce",entity_id:"workforce-a",revision:1,fingerprint:hash("d")}}};
    const substituted=api.createMemoryPolicyAccessDecisionV1({...expireDecision,decision_id:"expire-substituted",memory_type:"workforce_shared",scope:workforceScope});
    await assert.rejects(() => service.applyRetention({...command,decision:substituted}),api.GovernedMemoryAccessError);

    const rollback=record("memory-retention-rollback");
    await service.write({command:recordCommand(rollback,"retention-rollback-write",1),decision:api.createMemoryPolicyAccessDecisionV1({...writeDecision,decision_id:"write-retention-rollback"})});
    const rollbackDecision=api.createMemoryPolicyAccessDecisionV1({...expireDecision,decision_id:"expire-retention-rollback"});
    const rollbackEvent={...event("retention-rollback",2,"memory_record",rollback.ref.memory_id,{fingerprint:rollback.ref.fingerprint,policy_fingerprint:rollback.policy_ref.ref.fingerprint,assurance:"ACTIVE_STORE_DELETED"}),event_type:"memory.record.retention_expired",idempotency_key:"retention-rollback"};
    await assert.rejects(() => service.applyRetention({memoryRef:rollback.ref,decision:rollbackDecision,at:1010,idempotency:{scope:"memory.retention:memory-retention-rollback",key:"retention-rollback",request_hash:hash("c")},event:rollbackEvent,evidenceId:"evidence-retention-rollback",outboxId:"outbox-retention-due"}));
    const rollbackState=await state.nativeCore.getMemoryRecordState(rollback.ref.memory_id);
    assert.equal(rollbackState.record?.ref.memory_id,rollback.ref.memory_id);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_memory_contents WHERE memory_id='memory-retention-rollback'")).rows[0].count,1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM acs_memory_tombstones WHERE memory_id='memory-retention-rollback'")).rows[0].count,0);
  });
});
