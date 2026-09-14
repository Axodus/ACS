import assert from "node:assert/strict";
import test from "node:test";

const api = await import(`${process.env.ACS_TEST_DIST_ROOT ?? "../dist"}/index.js`);
const digest = (char = "a") => char.repeat(64);
const policy = api.createMemoryPolicyRevisionV1({memory_policy_id:"policy-3",revision:1,tenant_id:"tenant-3",lifecycle:"active",allowed_memory_types:["agent"],allowed_scope_kinds:["agent"],allowed_operations:["read","write"],max_retrieval_results:1,retention:{max_age_ms:1000,deletion_action:"tombstone",retain_content_digest:true},provenance_required:true,evidence_required:false,created_by:"governance",created_at:1,change_reason:"test"});
const policyRef = {tenant_id:"tenant-3",ref:policy.ref};
const scope = {tenant_id:"tenant-3",kind:"agent",agent_ref:{tenant_id:"tenant-3",ref:{kind:"agent",id:"agent-3"}}};
const record = api.createMemoryRecordV1({memory_id:"memory-3",tenant_id:"tenant-3",memory_type:"agent",scope,policy_ref:policyRef,content:{content_ref:"memory-content:memory-3",content_digest:api.sha256Hex("safe memory"),media_type:"text/plain"},provenance_refs:[],sensitivity:"restricted",created_by:"test",created_at:2});
const decision = (operation = "read", overrides = {}) => api.createMemoryPolicyAccessDecisionV1({decision_id:`decision-${operation}`,tenant_id:"tenant-3",policy_ref:policyRef,memory_type:"agent",scope,operation,purpose:"bounded-context",outcome:"allowed",authority_basis_refs:[{kind:"authority",id:"basis"}],provenance_refs:[],decided_at:3,...overrides});

function fixture({referenceFailure = false} = {}) {
  const calls = {writes:0, reads:0};
  const store = {
    async createMemoryRecord(command) { calls.writes++; return {record:command.record,event:{},outbox:{}}; },
    async getMemoryPolicyLineage() { return {head:{},revisions:[policy]}; },
    async listMemoryRecords() { return [record]; },
    async readMemoryRecordContent() { calls.reads++; return {record,plaintext:"safe memory"}; },
  };
  const references = { async validate() { if (referenceFailure) throw new Error("owner unavailable"); } };
  return {service:new api.GovernedMemoryService(store,references),calls};
}

test("Slice 3 governs writes and bounded retrieval without granting authority", async () => {
  const {service,calls}=fixture();
  const event=api.createEventEnvelopeV2({event_id:"memory-write",event_type:"memory.record.created",timestamp:2,sequence:1,organization_id:"org",product_domain:"acs",tenant_id:"tenant-3",subject_type:"memory_record",subject_id:"memory-3",actor:{kind:"service",ref:"test"},source:"acs",correlation_id:"memory-write",idempotency_key:"write",payload:{fingerprint:record.ref.fingerprint,policy_fingerprint:policy.ref.fingerprint}});
  await service.write({command:{record,plaintext:"safe memory",idempotency:{scope:"memory.record:memory-3",key:"write",request_hash:digest()},event},decision:decision("write")});
  const found=await service.retrieve({decision:decision("read"),memoryType:"agent",scope,policyRef,limit:1});
  assert.equal(calls.writes,1); assert.equal(calls.reads,1); assert.equal(found[0].plaintext,"safe memory");
});

test("Slice 3 fails closed for mismatched policy, over-limit retrieval, owner failure, and User Context", async () => {
  const {service,calls}=fixture();
  await assert.rejects(()=>service.retrieve({decision:decision("read"),memoryType:"agent",scope,policyRef,limit:2}),api.GovernedMemoryAccessError);
  assert.throws(()=>decision("read",{tenant_id:"tenant-other"}),api.NativeContractValidationError);
  const unavailable=fixture({referenceFailure:true});
  await assert.rejects(()=>unavailable.service.retrieve({decision:decision("read"),memoryType:"agent",scope,policyRef,limit:1}));
  assert.equal(calls.reads,0);
  assert.throws(()=>api.createMemoryPolicyAccessDecisionV1({...decision("read"),memory_type:"user_context",scope:{tenant_id:"tenant-3",kind:"user_context"}}),api.NativeContractValidationError);
});
