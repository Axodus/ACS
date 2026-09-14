import assert from "node:assert/strict";
import test from "node:test";

const api = await import("../dist/index.js");
const hash = (char = "a") => char.repeat(64);

const policyRevision = api.createMemoryPolicyRevisionV1({
  memory_policy_id:"policy-a",revision:1,tenant_id:"tenant-a",lifecycle:"active",
  allowed_memory_types:["agent","knowledge_backed"],allowed_scope_kinds:["agent","knowledge_backed"],allowed_operations:["read","write","expire"],max_retrieval_results:5,
  retention:{max_age_ms:1000,deletion_action:"tombstone",retain_content_digest:true},provenance_required:true,evidence_required:true,created_by:"governance",created_at:1,change_reason:"test",
});
const policyHead = api.validateMemoryPolicyHeadV1({schema_version:api.ACS_NATIVE_SCHEMA_VERSION,memory_policy_id:"policy-a",tenant_id:"tenant-a",current_revision:1,current_fingerprint:policyRevision.ref.fingerprint,lifecycle:"active",created_at:1,updated_at:2});
const record = api.createMemoryRecordV1({
  memory_id:"memory-a",tenant_id:"tenant-a",memory_type:"agent",
  scope:{tenant_id:"tenant-a",kind:"agent",agent_ref:{tenant_id:"tenant-a",ref:{kind:"agent",id:"agent-a"}}},
  policy_ref:{tenant_id:"tenant-a",ref:policyRevision.ref},content:{content_ref:"memory-content:memory-a",content_digest:api.sha256Hex("restricted content"),media_type:"text/plain"},
  provenance_refs:[{kind:"decision",id:"decision-a"}],sensitivity:"restricted",created_by:"test",created_at:10,
});
const successor = api.createMemoryRecordV1({
  memory_id:"memory-b",tenant_id:"tenant-a",memory_type:"knowledge_backed",
  scope:{tenant_id:"tenant-a",kind:"knowledge_backed",knowledge_ref:{tenant_id:"tenant-a",ref:{kind:"knowledge",id:"knowledge-a",revision:3}},knowledge_fingerprint:hash("b")},
  policy_ref:{tenant_id:"tenant-a",ref:policyRevision.ref},content:{content_ref:"memory-content:memory-b",content_digest:api.sha256Hex("deleted content"),media_type:"text/plain"},predecessor_ref:record.ref,
  provenance_refs:[{kind:"decision",id:"decision-b"}],sensitivity:"internal",created_by:"test",created_at:11,
});
const tombstone = api.createMemoryTombstoneV1({memory_ref:successor.ref,memory_type:successor.memory_type,scope:successor.scope,policy_ref:successor.policy_ref,deleted_at:20,deletion_reason:"retention_expired",digest_retention:"policy_permitted",retained_content_digest:successor.content.content_digest,provenance_refs:[{kind:"decision",id:"decision-b"}]});
const metadata = (value) => { const { content, ...safe } = value; return safe; };
const activeState = {metadata:metadata(record),record};
const tombstonedState = {metadata:metadata(successor),tombstone};
const core = {
  async listMemoryPolicyHeads({tenantId}) { return tenantId === "tenant-a" ? [policyHead] : []; },
  async getMemoryPolicyLineage(id) { if (id !== "policy-a") throw new Error("not found"); return {head:policyHead,revisions:[policyRevision]}; },
  async listMemoryRecordStates({tenantId}) { return tenantId === "tenant-a" ? [activeState,tombstonedState] : []; },
  async getMemoryRecordState(id) { if (id === "memory-a") return activeState; if (id === "memory-b") return tombstonedState; return undefined; },
};

test("Slice 5 Product API projections are Tenant-scoped, metadata-only, and preserve exact Memory provenance", async () => {
  const product = new api.ProductApiClient({nativeCore:core});
  assert.deepEqual(await product.listMemoryPolicies("tenant-b"),[]);
  assert.deepEqual(await product.listMemoryRecordMetadata("tenant-b"),[]);
  assert.equal(await product.getMemoryPolicy("policy-a","tenant-b"),undefined);
  assert.equal(await product.getMemoryRecordMetadata("memory-a","tenant-b"),undefined);
  assert.equal(await product.getMemoryRecordMetadata("missing","tenant-a"),undefined);

  const policy = await product.getMemoryPolicy("policy-a","tenant-a");
  const records = await product.listMemoryRecordMetadata("tenant-a");
  const active = records.find((item) => item.memoryId === "memory-a");
  const deleted = records.find((item) => item.memoryId === "memory-b");
  assert.equal(policy.currentRevision,1); assert.equal(policy.fingerprint,policyRevision.ref.fingerprint);
  assert.equal(active.lifecycle,"active"); assert.equal(active.scope.agentRef.id,"agent-a");
  assert.equal(deleted.lifecycle,"tombstoned"); assert.equal(deleted.predecessorRef.memoryId,"memory-a");
  assert.equal(deleted.knowledgeRef.fingerprint,hash("b"));
  assert.equal(deleted.tombstone.deletionGuarantee,"ACTIVE_STORE_DELETED");
  const serialized = JSON.stringify({policy,records});
  for (const forbidden of ["restricted content","deleted content","content_ref","contentDigest","ciphertext","encryption_key_ref","encryptionKeyRef","authorization","token","secret"]) assert.equal(serialized.includes(forbidden),false,forbidden);
});

test("Slice 5 HTTP routes are read-only, Tenant-scoped projections with typed indistinguishable not-found", async () => {
  const context = api.createControlPlaneContext({nativeCore:core,tenantId:"tenant-a",startLocalWorker:false});
  const foreign = api.createControlPlaneContext({nativeCore:core,tenantId:"tenant-b",startLocalWorker:false});
  const auth = api.createAcsAuthContext({mode:"mock",actorType:"system",actorId:"operator",tenantId:"tenant-a",authenticated:true,trusted:true,platformAdmin:true});
  const foreignAuth = api.createAcsAuthContext({mode:"mock",actorType:"system",actorId:"other",tenantId:"tenant-b",authenticated:true,trusted:true,platformAdmin:true});
  try {
    const policies = await api.routeProductApiRequest({method:"GET",url:"/api/v1/memory/policies",headers:{}},"/api/v1/memory/policies",context,{auth,correlationId:"memory-policies"});
    const recordDetail = await api.routeProductApiRequest({method:"GET",url:"/api/v1/memory/records/memory-b",headers:{}},"/api/v1/memory/records/memory-b",context,{auth,correlationId:"memory-record"});
    const foreignDetail = await api.routeProductApiRequest({method:"GET",url:"/api/v1/memory/records/memory-a",headers:{}},"/api/v1/memory/records/memory-a",foreign,{auth:foreignAuth,correlationId:"memory-foreign"});
    const missingDetail = await api.routeProductApiRequest({method:"GET",url:"/api/v1/memory/records/missing",headers:{}},"/api/v1/memory/records/missing",context,{auth,correlationId:"memory-missing"});
    const mutation = await api.routeProductApiRequest({method:"POST",url:"/api/v1/memory/records",headers:{}},"/api/v1/memory/records",context,{auth,correlationId:"memory-mutation"});
    assert.equal(policies.status,200); assert.equal(policies.body.data.length,1);
    assert.equal(recordDetail.status,200); assert.equal(recordDetail.body.data.tombstone.deletionGuarantee,"ACTIVE_STORE_DELETED");
    assert.equal(foreignDetail.status,404); assert.equal(missingDetail.status,404);
    assert.equal(foreignDetail.body.error.reason,"memory_record_not_found"); assert.equal(missingDetail.body.error.reason,"memory_record_not_found");
    assert.equal(mutation.status,405); assert.equal(mutation.body.error.code,"method_not_allowed");
    assert.equal(JSON.stringify(recordDetail.body).includes("deleted content"),false);
  } finally { await context.close(); await foreign.close(); }
});
