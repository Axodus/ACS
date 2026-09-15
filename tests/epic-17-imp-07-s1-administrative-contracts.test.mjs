import assert from "node:assert/strict";
import test from "node:test";
import * as api from "../dist/index.js";

const hash = (value) => api.sha256Hex(value);

function metadata(source) {
  return {
    contract_version: "1.0",
    source,
    canonical_owner: "native-automation",
    projected_at: 100,
    freshness: source.addressing === "CURRENT" ? "CURRENT" : source.addressing === "EXACT" ? "HISTORICAL" : "OBSERVED",
    compatibility: "CANONICAL",
    reconstruction_state: "COMPLETE",
    redacted_fields: ["credential_material", "provider_payload", "memory_content"],
  };
}

test("S1 distinguishes current, exact historical, and observed administrative references", () => {
  const current = api.createAdministrativeCurrentRefV1({ resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-a" });
  const exact = api.createAdministrativeHistoricalRefV1({ resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-a", revision: 2, fingerprint: hash("automation-a@2") });
  const observed = api.createAdministrativeObservationRefV1({ resource_kind: "activation", stable_id: "activation-a", tenant_id: "tenant-a", observation_digest: hash("observed") });

  assert.equal(current.addressing, "CURRENT");
  assert.equal(exact.addressing, "EXACT");
  assert.equal(exact.revision, 2);
  assert.equal(observed.addressing, "OBSERVED");
  assert.throws(() => api.createAdministrativeHistoricalRefV1({ resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-a", revision: 0, fingerprint: hash("automation-a@0") }), (error) => error instanceof api.AdministrativeContractError && error.code === "INVALID_RESOURCE_REFERENCE");
  assert.throws(() => api.validateAdministrativeResourceRefV1({ addressing: "EXACT", resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-a", revision: 2 }), (error) => error instanceof api.AdministrativeContractError && error.code === "INVALID_RESOURCE_REFERENCE");
});

test("S1 safe administrative projections are explicit allowlists", () => {
  const source = api.createAdministrativeHistoricalRefV1({ resource_kind: "automation", stable_id: "automation-a", tenant_id: "tenant-a", revision: 2, fingerprint: hash("automation-a@2") });
  const projection = api.createAdministrativeProjectionV1({
    metadata: metadata(source),
    fields: [
      { name: "lifecycle", classification: "PUBLIC_APPLICATION", value: "enabled" },
      { name: "target_mode", classification: "ADMIN_SAFE", value: "RESOLVED_AT_ACTIVATION" },
    ],
    references: { automation_owner: { kind: "agent", id: "agent-a", revision: 4 } },
  });

  assert.deepEqual(projection.fields, { lifecycle: "enabled", target_mode: "RESOLVED_AT_ACTIVATION" });
  assert.equal(projection.references.automation_owner.id, "agent-a");
  const serialized = JSON.stringify(projection);
  for (const forbidden of ["super-secret", "provider-delivery-raw", "raw-memory-content", "access_token", "private_key"]) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("S1 rejects secret, internal, sensitive-reference, and structurally unsafe fields", () => {
  const source = api.createAdministrativeCurrentRefV1({ resource_kind: "agent", stable_id: "agent-a", tenant_id: "tenant-a" });
  for (const classification of ["SENSITIVE_REFERENCE_ONLY", "INTERNAL_ONLY", "SECRET"]) {
    assert.throws(() => api.createAdministrativeProjectionV1({ metadata: metadata(source), fields: [{ name: "blocked", classification, value: "opaque" }] }), (error) => error instanceof api.AdministrativeContractError && error.code === "NON_PROJECTABLE_FIELD");
  }
  assert.throws(() => api.createAdministrativeProjectionV1({ metadata: metadata(source), fields: [{ name: "configuration", classification: "ADMIN_SAFE", value: { api_key: "not-allowed" } }] }), (error) => error instanceof api.AdministrativeContractError && error.code === "UNSAFE_PROJECTION_VALUE");
  assert.throws(() => api.createAdministrativeProjectionV1({ metadata: metadata(source), fields: [{ name: "secret", classification: "ADMIN_SAFE", value: "not-allowed" }] }), (error) => error instanceof api.AdministrativeContractError && error.code === "UNSAFE_PROJECTION_VALUE");
  assert.throws(() => api.createAdministrativeProjectionV1({ metadata: metadata(source), fields: [{ name: "nested", classification: "ADMIN_SAFE", value: { invalid: { nested: true } } }] }), (error) => error instanceof api.AdministrativeContractError && error.code === "UNSAFE_PROJECTION_VALUE");
});

test("S1 prevents duplicate fields and Tenant-incompatible references", () => {
  const source = api.createAdministrativeCurrentRefV1({ resource_kind: "delegation", stable_id: "grant-a", tenant_id: "tenant-a" });
  assert.throws(() => api.createAdministrativeProjectionV1({ metadata: metadata(source), fields: [
    { name: "lifecycle", classification: "ADMIN_SAFE", value: "active" },
    { name: "lifecycle", classification: "ADMIN_SAFE", value: "revoked" },
  ] }), (error) => error instanceof api.AdministrativeContractError && error.code === "DUPLICATE_PROJECTION_FIELD");
  assert.throws(() => api.createAdministrativeProjectionV1({ metadata: metadata(source), fields: [], references: {
    foreign: { kind: "credential", id: "credential-b", tenant_id: "tenant-b" },
  } }), (error) => error instanceof api.AdministrativeContractError && error.code === "TENANT_MISMATCH");
});
