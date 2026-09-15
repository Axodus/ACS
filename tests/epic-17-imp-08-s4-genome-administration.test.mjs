import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../dist/index.js";

const digest = "a".repeat(64);
const policy = (id) => ({ entity_kind: "policy", entity_id: id, revision: 1, fingerprint: digest });
const scope = { organization_id: "org-a", product_domain: "acs", tenant_id: "tenant-a", owner_ref: "owner:a", authority_scope_ref: "authority:a", knowledge_scope_refs: [] };
const definition = api.createAgentDefinitionV2({ agent_id: "agent-a", scope, name: "Agent A", status: "active", current_revision: 2, ownership_ref: "owner:a", sharing_mode: "private", created_at: 1, updated_at: 2 });
const agentRevision = (revision) => api.createAgentRevisionV2({ agent_id: "agent-a", revision, instructions: "canonical agent", capability_requirements: [], constraints: [], knowledge: { allowed_scope_refs: [], denied_scope_refs: [], context_policy_ref: policy("context"), memory_policy_ref: policy("memory") }, resources: { skill_refs: [], tool_refs: [], mcp_server_refs: [] }, runtime_preferences: { provider_routes: [], model_requirements: [], harness_preferences: [], executor_preferences: [] }, governance: { authority_refs: [], permission_policy_ref: policy("permission"), approval_policy_ref: policy("approval") }, economics: { cost_policy_ref: policy("cost"), budget_policy_ref: policy("budget") }, evidence: { audit_policy_ref: policy("audit"), evaluation_refs: [] }, commit: { created_by: "test", committed_at: revision, change_reason: "fixture" } });
const revisions = [agentRevision(1), agentRevision(2)];
const core = {
  async getAgentLineage(agentId) { if (agentId !== "agent-a") throw new Error("missing"); return { definition, revisions }; },
  async listAutomationHeads() { return []; }, async getAutomationLineage() { throw new Error("missing"); },
  async listDelegationGrantHeads() { return []; }, async getDelegationGrantLineage() { throw new Error("missing"); },
  async getActivationLineage() { throw new Error("missing"); },
};
const provenance = () => ({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, source_id: "source-a", source_kind: "document", locator: "document:source-a", observed_at: 7, digest });
const source = {
  async getGenomeSubject({ tenant_id, subject }) {
    if (tenant_id !== "tenant-a") return undefined;
    const trait = api.createTraitDefinitionV1({ namespace: "org.axodus.presentation", name: "style", version: 1, value_kind: "json", allowed_subject_addressing: ["CURRENT", "EXACT"] });
    const assertion = api.createTraitAssertionV1({ assertion_id: "trait-a", subject, definition_ref: api.createTraitDefinitionReferenceV1(trait), value: { safe: "value" }, value_kind: "json", provenance_refs: [provenance()], evidence_refs: [{ kind: "evidence", id: "evidence-a" }], verification_refs: [{ verification_ref: { kind: "verification", id: "verification-a" }, assertion_ref: { assertion_id: "trait-a", digest }, status: "unavailable", evidence_refs: [{ kind: "evidence", id: "evidence-a" }] }], state: "active", observed_at: 10 });
    const presentation = api.createPresentationAssetAssociationV1({ subject, assertion_ref: { assertion_id: assertion.assertion_id, digest: assertion.digest }, presentation_role: "avatar", asset_ref: { artifact_ref: { schema_version: api.ACS_NATIVE_SCHEMA_VERSION, artifact_id: "artifact-a", media_type: "image/png", storage_ref: "private:artifact-a", digest, sensitivity: "internal" }, availability: "unavailable", gap_code: "PRESENTATION_REPRESENTATION_UNAVAILABLE" }, provenance_refs: [provenance()], evidence_refs: [{ kind: "evidence", id: "evidence-a" }] });
    return { subject, trait_assertions: [assertion], presentation_associations: [presentation], canonical_owner: "canonical-genome-owner", projected_at: 10, reconstruction_state: "COMPLETE" };
  },
};
const auth = (tenantId = "tenant-a") => api.createAcsAuthContext({ mode: "mock", actorType: "user", actorId: "member", tenantId, authenticated: true, trusted: true, platformAdmin: true });
const request = (context, path, identity = auth()) => api.routeProductApiRequest({ method: "GET", url: path, headers: {} }, path, context, { auth: identity, correlationId: "imp-08-s4" });
function context(tenantId = "tenant-a") { return api.createControlPlaneContext({ nativeCore: core, genomeAdministrativeSource: source, tenantId, tenantMemberships: [{ tenantId, subjectId: "member", status: "active" }] }); }

test("IMP-08 S4 projects current and exact Genome contracts through the existing administrative Product API chain", async () => {
  const ctx = context();
  try {
    const current = await request(ctx, "/api/v1/genomes/agents/agent-a");
    const exact = await request(ctx, `/api/v1/genomes/agents/agent-a?revision=1&fingerprint=${revisions[0].ref.fingerprint}`);
    assert.equal(current.status, 200); assert.equal(exact.status, 200);
    assert.equal(current.body.data[0].metadata.source.addressing, "CURRENT");
    assert.equal(exact.body.data[0].metadata.source.addressing, "EXACT");
    assert.equal(exact.body.data[0].metadata.source.revision, 1);
    assert.equal(exact.body.data[0].metadata.reconstruction_state, "COMPLETE");
    assert.equal(current.body.data[0].fields.trait_value, "REDACTED_JSON_VALUE");
    assert.deepEqual(current.body.data[0].fields.verification_statuses, ["unavailable"]);
    assert.deepEqual(current.body.data[0].fields.presentation_availability, ["unavailable"]);
    assert.deepEqual(current.body.data[0].fields.presentation_gap_codes, ["PRESENTATION_REPRESENTATION_UNAVAILABLE"]);
    assert.deepEqual(current.body.data[0].references.evidence_refs, [{ kind: "evidence", id: "evidence-a" }]);
    assert.deepEqual(current.body.data[0].references.presentation_artifact_refs, [{ kind: "artifact", id: "artifact-a" }]);
    const wire = JSON.stringify(current.body);
    assert.equal(wire.includes("private:artifact-a"), false); assert.equal(wire.includes("safe\":\"value"), false); assert.equal(wire.includes("document:source-a"), false);
  } finally { await ctx.close(); }
});

test("IMP-08 S4 rejects foreign and invalid exact addressing without fallback", async () => {
  const service = new api.AdministrativeQueryService(core, source);
  await assert.rejects(() => service.getGenome("tenant-a", api.createAdministrativeCurrentRefV1({ resource_kind: "agent", stable_id: "agent-a", tenant_id: "tenant-b" })), (error) => error.code === "TENANT_MISMATCH");
  const ctx = context(); const foreign = context("tenant-b");
  try {
    const fingerprintMismatch = await request(ctx, "/api/v1/genomes/agents/agent-a?revision=1&fingerprint=" + "b".repeat(64));
    const missingRevision = await request(ctx, "/api/v1/genomes/agents/agent-a?revision=99&fingerprint=" + digest);
    const crossTenant = await request(foreign, "/api/v1/genomes/agents/agent-a", auth("tenant-b"));
    const mutation = await api.routeProductApiRequest({ method: "POST", url: "/api/v1/genomes/agents/agent-a", headers: {} }, "/api/v1/genomes/agents/agent-a", ctx, { auth: auth(), correlationId: "imp-08-s4-write" });
    assert.equal(fingerprintMismatch.status, 409); assert.equal(missingRevision.status, 200); assert.equal(missingRevision.body.data[0].fields.historical_gap_code, "GENOME_EXACT_SUBJECT_UNAVAILABLE"); assert.equal(missingRevision.body.data[0].metadata.reconstruction_state, "GAP"); assert.equal(crossTenant.status, 404); assert.equal(mutation.status, 405);
  } finally { await ctx.close(); await foreign.close(); }
});

test("IMP-08 S4 does not add a Genome persistence owner, verification authority, or runtime behavior", async () => {
  const [{ readFile }, serviceText, routeText] = await Promise.all([
    import("node:fs/promises"),
    import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/control-plane/administrative-services.ts", import.meta.url), "utf8")),
    import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/http/routes/product-api-routes.ts", import.meta.url), "utf8")),
  ]);
  assert.equal(typeof readFile, "function");
  assert.match(serviceText, /GenomeAdministrativeReadSourceV1/);
  assert.doesNotMatch(serviceText, /advanceGenome|createGenome.*Store|genome.*migration/i);
  assert.doesNotMatch(routeText, /genomes.*POST|genomes.*PUT|genomes.*PATCH/i);
});
