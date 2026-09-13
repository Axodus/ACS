import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const api = await import(`${distRoot}/index.js`);
const digest = "a".repeat(64);

async function isolated(run) {
  const schema = `e17i03a_${Date.now()}_${process.pid}`;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const url = new URL(process.env.ACS_SH_DATABASE_URL); url.searchParams.set("options", `-c search_path=${schema}`);
  const state = new api.PostgresSharedAuthoritativeState({ connectionString: url.toString() });
  const pool = new Pool({ connectionString: url.toString() });
  try { await admin.query(`CREATE SCHEMA "${schema}"`); await state.migrate(); await pool.query("INSERT INTO acs_tenants (tenant_id, revision, payload) VALUES ('tenant-i', 1, '{}'::jsonb)"); await run(state, pool); }
  finally { await state.close().catch(() => undefined); await pool.end().catch(() => undefined); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.end(); }
}
function event(id, seq, revision, type = "integration.connection.revised") { return api.createEventEnvelopeV2({ event_id:id,event_type:type,timestamp:seq,sequence:seq,organization_id:"org",product_domain:"acs",tenant_id:"tenant-i",subject_type:"integration_connection",subject_id:"connection-a",actor:{kind:"service",ref:"test"},source:"acs",correlation_id:id,idempotency_key:id,payload:{id,revision:revision.ref.revision,fingerprint:revision.ref.fingerprint} }); }
function channelEvent(id, seq, revision) { return api.createEventEnvelopeV2({ event_id:id,event_type:"integration.channel.created",timestamp:seq,sequence:seq,organization_id:"org",product_domain:"acs",tenant_id:"tenant-i",subject_type:"integration_channel",subject_id:"channel-c",actor:{kind:"service",ref:"test"},source:"acs",correlation_id:id,idempotency_key:id,payload:{id,revision:revision.ref.revision,fingerprint:revision.ref.fingerprint,connection_revision_ref:revision.connection_revision_ref} }); }
function connection(revision, credentialVersion = "v1", lifecycle = "active") {
  const definition = api.createIntegrationConnectionDefinitionV1({ connection_id:"connection-a",tenant_id:"tenant-i",connector_definition_ref:"resource:mcp",lifecycle,current_revision:revision,created_at:1,updated_at:revision });
  const revisionValue = api.createIntegrationConnectionRevisionV1({ connection_id:"connection-a",revision,...(revision > 1 ? { supersedes_revision:revision-1 } : {}),connector_definition_ref:"resource:mcp",configuration:{transport:"https"},credential_ref:{credential_ref:"credential:x",credential_version:credentialVersion,secret_store_ref:"secret-store:x"},lifecycle,commit:{created_by:"test",committed_at:revision,change_reason:"test"} });
  return { definition, revision:revisionValue };
}
function command(revision, key, credentialVersion = "v1", lifecycle = "active") { const pair=connection(revision,credentialVersion,lifecycle); return { ...pair, expectedHead:revision-1,idempotency:{scope:"integration.connection:connection-a",key,request_hash:digest},event:event(`event-${key}`,revision,pair.revision,revision===1?"integration.connection.created":"integration.connection.revised"),outboxId:`outbox-${key}` }; }
function channel(revision, connectionRevisionRef, lifecycle = "active") {
  const definition = api.createIntegrationChannelDefinitionV1({ channel_id:"channel-c",tenant_id:"tenant-i",lifecycle,current_revision:revision,created_at:1,updated_at:revision });
  const revisionValue = api.createIntegrationChannelRevisionV1({ channel_id:"channel-c",revision,...(revision > 1 ? { supersedes_revision:revision-1 } : {}),connection_revision_ref:connectionRevisionRef,direction:"ingress",endpoint:{kind:"webhook",uri:"https://example.test/channel-c"},lifecycle,commit:{created_by:"test",committed_at:revision,change_reason:"test"} });
  return { definition, revision:revisionValue };
}
function channelCommand(revision, key, connectionRevisionRef) { const pair=channel(revision,connectionRevisionRef); return { ...pair, expectedHead:revision-1,idempotency:{scope:"integration.channel:channel-c",key,request_hash:digest},event:channelEvent(`channel-event-${key}`,revision,pair.revision),outboxId:`channel-outbox-${key}` }; }

test("Slice 2 PostgreSQL durable CAS, idempotency, atomicity, and historical reconstruction", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  await isolated(async (state, pool) => {
    const first = await state.nativeCore.advanceIntegrationConnectionLineage(command(1,"create","X"));
    const replay = await state.nativeCore.advanceIntegrationConnectionLineage(command(1,"create","X"));
    assert.deepEqual(replay.lineage, first.lineage);
    await assert.rejects(() => state.nativeCore.advanceIntegrationConnectionLineage({ ...command(1,"create","Y"), idempotency:{scope:"integration.connection:connection-a",key:"create",request_hash:"b".repeat(64)} }), api.NativeIdempotencyConflictError);
    const second = await state.nativeCore.advanceIntegrationConnectionLineage(command(2,"rotate","Y"));
    assert.equal(second.lineage.revisions[0].credential_ref.credential_version,"X"); assert.equal(second.lineage.revisions[1].credential_ref.credential_version,"Y");
    const channelFirst = await state.nativeCore.advanceIntegrationChannelLineage(channelCommand(1,"create",first.lineage.revisions[0].ref));
    assert.deepEqual(channelFirst.lineage.revisions[0].connection_revision_ref,first.lineage.revisions[0].ref);
    const before = await pool.query("SELECT (SELECT count(*) FROM acs_integration_connection_revisions)::int AS revisions, (SELECT count(*) FROM acs_native_events)::int AS events, (SELECT count(*) FROM acs_native_outbox)::int AS outbox");
    await assert.rejects(() => state.nativeCore.advanceIntegrationConnectionLineage(command(2,"stale","Y")), api.RevisionConflictError);
    const atomic = command(3,"atomic","Z");
    await assert.rejects(() => state.nativeCore.advanceIntegrationConnectionLineage({ ...atomic, event:{ ...atomic.event, event_id:"event-rotate", correlation_id:"event-rotate" } }));
    const after = await pool.query("SELECT (SELECT count(*) FROM acs_integration_connection_revisions)::int AS revisions, (SELECT count(*) FROM acs_native_events)::int AS events, (SELECT count(*) FROM acs_native_outbox)::int AS outbox");
    assert.deepEqual(after.rows[0],before.rows[0]);
    const connectionHistory = await state.nativeCore.getIntegrationConnectionLineage("connection-a");
    const channelHistory = await state.nativeCore.getIntegrationChannelLineage("channel-c");
    assert.equal(connectionHistory.revisions[0].credential_ref.credential_version,"X"); assert.equal(connectionHistory.revisions[1].credential_ref.credential_version,"Y");
    assert.deepEqual(channelHistory.revisions[0].connection_revision_ref,connectionHistory.revisions[0].ref);
  });
});
