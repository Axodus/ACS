import assert from "node:assert/strict";
import test from "node:test";

const api = await import("../dist/index.js");
const credentialRef = { credential_ref: "credential-a", credential_version: "v1", secret_store_ref: "secret-store-a" };
const connectionRevision = api.createIntegrationConnectionRevisionV1({ connection_id:"connection-a",revision:1,connector_definition_ref:"resource:mcp",configuration:{transport:"https"},credential_ref:credentialRef,lifecycle:"active",commit:{created_by:"test",committed_at:1,change_reason:"test"} });
const channelRevision = api.createIntegrationChannelRevisionV1({ channel_id:"channel-a",revision:1,connection_revision_ref:connectionRevision.ref,direction:"ingress",endpoint:{kind:"webhook",uri:"https://provider.test/ingress"},lifecycle:"active",commit:{created_by:"test",committed_at:1,change_reason:"test"} });
const connection = { definition:api.createIntegrationConnectionDefinitionV1({connection_id:"connection-a",tenant_id:"tenant-a",connector_definition_ref:"resource:mcp",lifecycle:"active",current_revision:1,created_at:1,updated_at:1}), revisions:[connectionRevision] };
const channel = { definition:api.createIntegrationChannelDefinitionV1({channel_id:"channel-a",tenant_id:"tenant-a",lifecycle:"active",current_revision:1,created_at:1,updated_at:1}), revisions:[channelRevision] };
function resolver(overrides={}) { return new api.AuthenticatedChannelIngressResolver({ nativeCore:{ getIntegrationChannelLineage:async()=>channel, getIntegrationConnectionLineage:async()=>connection }, credentials:{ resolve:async()=>({connectionId:"credential-a",providerId:"provider",type:"api-key",purpose:"integration:channel-ingress-auth",tenantId:"tenant-a",secretRef:{id:"secret-a",backend:"vault",tenantId:"tenant-a",createdAt:1},expiresAt:2}) }, authenticator:{ authenticate:async()=>({authentication_method:"hmac-sha256",authenticated_at:3,provider_event_id:"provider-event-a"}) }, ...overrides }); }
const input={ingressRef:"ingress-a",tenantId:"tenant-a",channelId:"channel-a",payload:new TextEncoder().encode("untrusted-payload"),headers:{"x-provider-signature":"redacted"},correlationId:"correlation-a"};

test("Slice 3 authenticates exact active Channel/Connection references without retaining secrets or execution authority", async () => {
  const reference=await resolver().authenticate(input);
  assert.equal(reference.channel_revision_ref.fingerprint,channelRevision.ref.fingerprint);
  assert.equal(reference.connection_revision_ref.fingerprint,connectionRevision.ref.fingerprint);
  assert.equal(reference.credential_ref,"credential-a");
  assert.equal(reference.payload_digest.length,64);
  assert.equal("secretRef" in reference,false);
  assert.equal("run_id" in reference,false);
  assert.equal("activation_id" in reference,false);
});

test("Slice 3 fails closed for Tenant substitution, disabled Channels, stale Connections, unavailable credentials, and bad authentication", async () => {
  await assert.rejects(()=>resolver().authenticate({...input,tenantId:"tenant-b"}),error=>error.code==="CHANNEL_UNAVAILABLE");
  await assert.rejects(()=>resolver({nativeCore:{getIntegrationChannelLineage:async()=>({...channel,definition:{...channel.definition,lifecycle:"disabled"}}),getIntegrationConnectionLineage:async()=>connection}}).authenticate(input),error=>error.code==="CHANNEL_UNAVAILABLE");
  await assert.rejects(()=>resolver({nativeCore:{getIntegrationChannelLineage:async()=>channel,getIntegrationConnectionLineage:async()=>({...connection,revisions:[{...connectionRevision,ref:{...connectionRevision.ref,revision:2}}]})}}).authenticate(input),error=>error.code==="CONNECTION_STALE");
  await assert.rejects(()=>resolver({credentials:{resolve:async()=>{throw new Error("missing");}}}).authenticate(input),error=>error.code==="CREDENTIAL_UNAVAILABLE");
  await assert.rejects(()=>resolver({authenticator:{authenticate:async()=>{throw new Error("invalid");}}}).authenticate(input),error=>error.code==="AUTHENTICATION_FAILED");
  assert.throws(()=>api.createIntegrationChannelRevisionV1({channel_id:"unsafe",revision:1,connection_revision_ref:connectionRevision.ref,direction:"ingress",endpoint:{kind:"webhook",uri:"https://provider.test/ingress?token=secret"},lifecycle:"active",commit:{created_by:"test",committed_at:1,change_reason:"test"}}),api.NativeContractValidationError);
});
