import assert from "node:assert/strict";
import test from "node:test";

const api = await import("../dist/index.js");
const hash = (char = "a") => char.repeat(64);
const agent = (id) => ({ agent_id:id, tenant_id:"tenant-a", revision_ref:{ entity_kind:"agent", entity_id:id, revision:1, fingerprint:hash(id.at(-1)) } });
const bounds = {
  actions:["read"], capability_refs:[{kind:"capability",id:"capability-a"}], resource_refs:[{entity_kind:"resource",entity_id:"resource-a",revision:2,fingerprint:hash("d")}], tool_refs:[{entity_kind:"resource",entity_id:"tool-a",revision:3,fingerprint:hash("e")}], model_refs:[{kind:"model",id:"model-a"}], connection_refs:[{kind:"connection",id:"connection-a"}], credential_purposes:["read_only"], memory_scope_refs:["memory-scope-a"], memory_operations:["read","search"],
};
const parentRef = {grant_id:"grant-ab",tenant_id:"tenant-a",revision:2,fingerprint:hash("b")};
const revision = api.createDelegationGrantRevisionV1({
  grant_id:"grant-bc",tenant_id:"tenant-a",revision:1,delegator:agent("agent-b"),delegate:agent("agent-c"),authority_bounds:bounds,valid_from:10,expires_at:100,onward_delegation_allowed:false,max_delegation_depth:2,parent_grant_ref:parentRef,ancestry_grant_refs:[parentRef],depth:2,
  governing_authority_refs:[{kind:"governance",id:"governance-a"}],governing_policy_refs:[{entity_kind:"policy",entity_id:"policy-a",revision:4,fingerprint:hash("c")}],approval_refs:[{kind:"approval",id:"approval-a"}],provenance_refs:[{kind:"evidence",id:"evidence-a"}],issued_by:"operator-a",issued_at:10,reason:"raw authority-provider payload secret-token memory content",
});
const head = api.validateDelegationGrantHeadV1({schema_version:api.ACS_NATIVE_SCHEMA_VERSION,grant_id:"grant-bc",tenant_id:"tenant-a",current_revision:1,current_fingerprint:revision.ref.fingerprint,lifecycle:"revoked",valid_from:10,expires_at:100,revoked_at:30,revocation_reason:"secret-token",created_at:10,updated_at:30});
const revocation = api.createDelegationGrantRevocationV1({revocation_id:"revoke-bc",grant_ref:revision.ref,revoked_at:30,revoked_by:"operator-a",reason:"raw credential material",governing_authority_refs:[{kind:"governance",id:"governance-a"}],approval_refs:[],provenance_refs:[{kind:"evidence",id:"evidence-a"}]});
const lineage = {head,revisions:[revision],revocations:[revocation]};
const core = {
  async listDelegationGrantHeads({tenantId}) { return tenantId === "tenant-a" ? [head] : []; },
  async getDelegationGrantLineage(grantId) { if (grantId !== "grant-bc") throw new Error("not found"); return lineage; },
};

test("Slice 5 Product API projects Delegation Grant lineage as Tenant-scoped, redacted administration metadata", async () => {
  const product = new api.ProductApiClient({nativeCore:core});
  assert.deepEqual(await product.listDelegationGrants("tenant-b"), []);
  assert.equal(await product.getDelegationGrant("grant-bc", "tenant-b"), undefined);
  assert.equal(await product.getDelegationGrant("missing", "tenant-a"), undefined);

  const grants = await product.listDelegationGrants("tenant-a");
  const grant = grants[0];
  assert.equal(grant.grantId, "grant-bc"); assert.equal(grant.lifecycle, "revoked"); assert.equal(grant.currentRevision, 1);
  assert.equal(grant.delegator.agentId, "agent-b"); assert.equal(grant.delegate.agentId, "agent-c");
  assert.equal(grant.parentGrantRef.grantId, "grant-ab"); assert.equal(grant.ancestryGrantRefs[0].fingerprint, hash("b")); assert.equal(grant.depth, 2);
  assert.deepEqual(grant.authorityBounds.actions, ["read"]); assert.equal(grant.authorityBounds.credentialPurposes[0], "read_only"); assert.deepEqual(grant.authorityBounds.memoryOperations, ["read", "search"]);
  assert.equal(grant.governingAuthorityRefs[0].id, "governance-a"); assert.equal(grant.governingPolicyRefs[0].fingerprint, hash("c")); assert.equal(grant.revocationCount, 1); assert.equal(grant.revokedAt, 30);
  const serialized = JSON.stringify(grant);
  for (const forbidden of ["secret-token", "raw credential material", "raw authority-provider payload", "memory content", "issued_by", "issuedBy", "reason", "revokedBy", "credential_ref", "plaintext", "ciphertext"]) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("Slice 5 Delegation routes are GET-only and return Tenant-indistinguishable not-found", async () => {
  const context = api.createControlPlaneContext({nativeCore:core,tenantId:"tenant-a",startLocalWorker:false});
  const foreign = api.createControlPlaneContext({nativeCore:core,tenantId:"tenant-b",startLocalWorker:false});
  const auth = api.createAcsAuthContext({mode:"mock",actorType:"system",actorId:"operator",tenantId:"tenant-a",authenticated:true,trusted:true,platformAdmin:true});
  const foreignAuth = api.createAcsAuthContext({mode:"mock",actorType:"system",actorId:"other",tenantId:"tenant-b",authenticated:true,trusted:true,platformAdmin:true});
  try {
    const listed = await api.routeProductApiRequest({method:"GET",url:"/api/v1/delegation/grants",headers:{}}, "/api/v1/delegation/grants", context, {auth,correlationId:"delegation-list"});
    const detail = await api.routeProductApiRequest({method:"GET",url:"/api/v1/delegation/grants/grant-bc",headers:{}}, "/api/v1/delegation/grants/grant-bc", context, {auth,correlationId:"delegation-detail"});
    const foreignDetail = await api.routeProductApiRequest({method:"GET",url:"/api/v1/delegation/grants/grant-bc",headers:{}}, "/api/v1/delegation/grants/grant-bc", foreign, {auth:foreignAuth,correlationId:"delegation-foreign"});
    const missing = await api.routeProductApiRequest({method:"GET",url:"/api/v1/delegation/grants/missing",headers:{}}, "/api/v1/delegation/grants/missing", context, {auth,correlationId:"delegation-missing"});
    const mutation = await api.routeProductApiRequest({method:"POST",url:"/api/v1/delegation/grants",headers:{}}, "/api/v1/delegation/grants", context, {auth,correlationId:"delegation-mutation"});
    assert.equal(listed.status, 200); assert.equal(listed.body.data.length, 1); assert.equal(detail.status, 200); assert.equal(detail.body.data.grantId, "grant-bc");
    assert.equal(foreignDetail.status, 404); assert.equal(missing.status, 404); assert.equal(foreignDetail.body.error.reason, "delegation_grant_not_found"); assert.equal(missing.body.error.reason, "delegation_grant_not_found");
    assert.equal(mutation.status, 405); assert.equal(mutation.body.error.code, "method_not_allowed"); assert.equal(JSON.stringify(detail.body).includes("secret-token"), false);
  } finally { await context.close(); await foreign.close(); }
});
