import assert from "node:assert/strict";
import test from "node:test";

const api = await import("../dist/index.js");
const connectionRevision = api.createIntegrationConnectionRevisionV1({ connection_id:"connection-a",revision:1,connector_definition_ref:"resource:mcp",configuration:{},credential_ref:{credential_ref:"credential-a",credential_version:"v1",secret_store_ref:"opaque-store-ref"},lifecycle:"disabled",commit:{created_by:"test",committed_at:1,change_reason:"test"} });
const connection = { definition:api.createIntegrationConnectionDefinitionV1({connection_id:"connection-a",tenant_id:"tenant-a",connector_definition_ref:"resource:mcp",lifecycle:"disabled",current_revision:1,created_at:1,updated_at:2}), revisions:[connectionRevision] };
const channelRevision = api.createIntegrationChannelRevisionV1({channel_id:"channel-a",revision:1,connection_revision_ref:connectionRevision.ref,direction:"ingress",endpoint:{kind:"webhook",uri:"https://provider.test/ingress"},lifecycle:"archived",commit:{created_by:"test",committed_at:1,change_reason:"test"}});
const channel = { definition:api.createIntegrationChannelDefinitionV1({channel_id:"channel-a",tenant_id:"tenant-a",lifecycle:"archived",current_revision:1,created_at:1,updated_at:2}), revisions:[channelRevision] };
const core = { listIntegrationConnectionDefinitions:async({tenantId})=>tenantId==="tenant-a"?[connection.definition]:[], getIntegrationConnectionLineage:async(id)=>{if(id!=="connection-a")throw new Error("not found");return connection;}, listIntegrationChannelDefinitions:async({tenantId})=>tenantId==="tenant-a"?[channel.definition]:[], getIntegrationChannelLineage:async(id)=>{if(id!=="channel-a")throw new Error("not found");return channel;} };
const product = new api.ProductApiClient({nativeCore:core});

test("Slice 4 Product API projections are Tenant-scoped heads with exact refs and no credential leakage", async () => {
  assert.equal((await product.listIntegrationConnections("tenant-b")).length,0);
  assert.equal(await product.getIntegrationConnection("connection-a","tenant-b"),undefined);
  assert.equal(await product.getIntegrationChannel("channel-a","tenant-b"),undefined);
  assert.equal(await product.getIntegrationConnection("missing","tenant-a"),undefined);
  const projectedConnection=await product.getIntegrationConnection("connection-a","tenant-a");
  const projectedChannel=await product.getIntegrationChannel("channel-a","tenant-a");
  assert.equal(projectedConnection.lifecycle,"disabled"); assert.equal(projectedChannel.lifecycle,"archived");
  assert.equal(projectedChannel.connectionRevisionRef.fingerprint,connectionRevision.ref.fingerprint);
  assert.equal(projectedConnection.credential.configured,true); assert.equal(projectedConnection.credential.version,"v1");
  assert.equal(JSON.stringify(projectedConnection).includes("credential-a"),false);
  assert.equal(JSON.stringify(projectedConnection).includes("token"),false);
  assert.equal("revisions" in projectedConnection,false);
});
