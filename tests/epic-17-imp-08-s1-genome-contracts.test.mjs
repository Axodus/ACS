import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const api = await import(`${distRoot}/native-core/index.js`);
const digest = "a".repeat(64);

const exactAgent = () => ({ entity_kind: "agent", entity_id: "agent-1", revision: 3, fingerprint: digest });
const source = () => ({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, source_id: "source-1", source_kind: "document", locator: "document:source-1", observed_at: 100, digest });
const assertIssue = (operation, code) => assert.throws(operation, (error) => error instanceof api.NativeContractValidationError && error.issues.some((issue) => issue.code === code));

test("IMP-08 S1 keeps Genome subjects as descriptive references to canonical Agents", () => {
  const current = api.createGenomeCurrentAgentSubjectV1({ kind: "agent", id: "agent-1" });
  const historical = api.createGenomeExactAgentRevisionSubjectV1(exactAgent());

  assert.deepEqual(current, { addressing: "CURRENT", agent_ref: { kind: "agent", id: "agent-1" } });
  assert.deepEqual(historical, { addressing: "EXACT", agent_revision_ref: exactAgent() });
  assertIssue(() => api.createGenomeCurrentAgentSubjectV1({ kind: "agent", id: "agent-1", revision: 3 }), "CURRENT_AGENT_REFERENCE_REQUIRED");
  assertIssue(() => api.createGenomeExactAgentRevisionSubjectV1({ ...exactAgent(), entity_kind: "resource" }), "EXACT_AGENT_REVISION_REQUIRED");
});

test("IMP-08 S1 resolves only the exact historical Agent revision and reports an explicit gap", () => {
  const historical = api.createGenomeExactAgentRevisionSubjectV1(exactAgent());
  const resolved = api.resolveGenomeHistoricalSubjectV1(historical, (reference) => reference.revision === 3 && reference.fingerprint === digest);
  const gap = api.resolveGenomeHistoricalSubjectV1(historical, () => false);

  assert.deepEqual(resolved, { status: "resolved", subject: historical });
  assert.deepEqual(gap, { status: "gap", requested_subject: historical, reason_code: "GENOME_EXACT_SUBJECT_UNAVAILABLE" });
  assert.equal(JSON.stringify(gap).includes("CURRENT"), false);
});

test("IMP-08 S1 separates trait definition, assertion value, provenance, and verification references", () => {
  const definition = api.createTraitDefinitionV1({
    namespace: "org.axodus.presentation",
    name: "communication-style",
    version: 1,
    value_kind: "string",
    allowed_subject_addressing: ["CURRENT", "EXACT"],
  });
  const assertion = api.createTraitAssertionV1({
    assertion_id: "assertion-1",
    subject: api.createGenomeExactAgentRevisionSubjectV1(exactAgent()),
    definition_ref: api.createTraitDefinitionReferenceV1(definition),
    value: "concise",
    value_kind: "string",
    provenance_refs: [source()],
    evidence_refs: [{ kind: "evidence", id: "evidence-1" }],
    verification_refs: [{
      verification_ref: { kind: "verification", id: "verification-1" },
      assertion_ref: { assertion_id: "assertion-1", digest: "b".repeat(64) },
      status: "unavailable",
      evidence_refs: [{ kind: "evidence", id: "evidence-1" }],
      decision_ref: { kind: "governance-decision", id: "decision-1" },
    }],
    state: "active",
    observed_at: 100,
  });

  assert.equal(definition.digest.length, 64);
  assert.equal(assertion.digest.length, 64);
  assert.deepEqual(assertion.provenance_refs, [source()]);
  assert.deepEqual(assertion.evidence_refs, [{ kind: "evidence", id: "evidence-1" }]);
  assert.equal(assertion.verification_refs[0].status, "unavailable");
  assertIssue(() => api.createTraitAssertionV1({ ...assertion, assertion_id: "assertion-2", value: true }), "VALUE_KIND_MISMATCH");
});

test("IMP-08 S1 has no persistence, Product API, authority, capability, or permission implementation", async () => {
  const sourceText = await readFile(new URL("../src/native-core/genome.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sourceText, /postgres|migration|shared-state|product-api|http\/routes|runtime|admission/i);
  assert.doesNotMatch(sourceText, /capabilit(?:y|ies)|permission|authority|credential|economic|nft/i);
  assert.match(sourceText, /SourceReferenceV2/);
  assert.match(sourceText, /EntityRef/);
});
