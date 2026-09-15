import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const api = await import(`${distRoot}/native-core/index.js`);
const digest = "a".repeat(64);
const exactAgent = () => ({ entity_kind: "agent", entity_id: "agent-1", revision: 3, fingerprint: digest });
const source = () => ({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, source_id: "source-1", source_kind: "document", locator: "document:source-1", observed_at: 100, digest });
const artifact = () => ({ schema_version: api.ACS_NATIVE_SCHEMA_VERSION, artifact_id: "artifact-1", media_type: "image/png", storage_ref: "artifact-store:artifact-1", digest, sensitivity: "internal" });
const assertionRef = () => ({ assertion_id: "assertion-1", digest: "b".repeat(64) });
const assertIssue = (operation, code) => assert.throws(operation, (error) => error instanceof api.NativeContractValidationError && error.issues.some((issue) => issue.code === code));

test("IMP-08 S2 associates a presentation reference with current and exact canonical subjects", () => {
  const current = api.createPresentationAssetAssociationV1({
    subject: api.createGenomeCurrentAgentSubjectV1({ kind: "agent", id: "agent-1" }),
    assertion_ref: assertionRef(),
    presentation_role: "avatar",
    asset_ref: { artifact_ref: artifact(), availability: "available" },
    provenance_refs: [source()],
    evidence_refs: [{ kind: "evidence", id: "evidence-1" }],
  });
  const historical = api.createPresentationAssetAssociationV1({ ...current, subject: api.createGenomeExactAgentRevisionSubjectV1(exactAgent()) });

  assert.equal(current.subject.addressing, "CURRENT");
  assert.deepEqual(historical.subject, { addressing: "EXACT", agent_revision_ref: exactAgent() });
  assert.deepEqual(current.asset_ref.artifact_ref, artifact());
  assert.deepEqual(current.provenance_refs, [source()]);
  assert.deepEqual(current.evidence_refs, [{ kind: "evidence", id: "evidence-1" }]);
});

test("IMP-08 S2 reports unavailable presentation references without invalidating the Trait assertion", () => {
  const unavailable = api.createPresentationAssetAssociationV1({
    subject: api.createGenomeExactAgentRevisionSubjectV1(exactAgent()),
    assertion_ref: assertionRef(),
    presentation_role: "banner",
    asset_ref: { artifact_ref: artifact(), availability: "unavailable", gap_code: "PRESENTATION_REPRESENTATION_UNAVAILABLE" },
    provenance_refs: [source()],
    evidence_refs: [],
  });

  assert.equal(unavailable.asset_ref.availability, "unavailable");
  assert.equal(unavailable.asset_ref.gap_code, "PRESENTATION_REPRESENTATION_UNAVAILABLE");
  assert.deepEqual(unavailable.assertion_ref, assertionRef());
  assertIssue(() => api.createPresentationAssetReferenceV1({ artifact_ref: artifact(), availability: "unavailable" }), "PRESENTATION_GAP_CODE_REQUIRED");
});

test("IMP-08 S2 keeps verification descriptive and historical resolution exact", () => {
  const verification = api.validateTraitVerificationReferenceV1({
    verification_ref: { kind: "verification", id: "verification-1" },
    assertion_ref: assertionRef(),
    status: "unavailable",
    evidence_refs: [{ kind: "evidence", id: "evidence-1" }],
  });
  const historical = api.createGenomeExactAgentRevisionSubjectV1(exactAgent());
  const gap = api.resolveGenomeHistoricalSubjectV1(historical, () => false);

  assert.equal(verification.status, "unavailable");
  assert.deepEqual(gap, { status: "gap", requested_subject: historical, reason_code: "GENOME_EXACT_SUBJECT_UNAVAILABLE" });
  assert.equal(JSON.stringify(gap).includes("CURRENT"), false);
});

test("IMP-08 S2 contains no bytes, catalog, persistence, API, runtime, or verification authority implementation", async () => {
  const sourceText = await readFile(new URL("../src/native-core/genome.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sourceText, /postgres|migration|shared-state|product-api|http\/routes|runtime|admission/i);
  assert.doesNotMatch(sourceText, /blob|upload|download|repository|catalog|permission|authority|credential|economic|nft/i);
  assert.match(sourceText, /ArtifactReferenceV2/);
  assert.match(sourceText, /TraitVerificationReferenceV1/);
});
