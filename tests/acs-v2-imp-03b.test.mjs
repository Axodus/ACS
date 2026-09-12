import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  ACS_NATIVE_SCHEMA_VERSION,
  NativeContractValidationError,
  SHARED_STATE_MIGRATIONS,
  SHARED_STATE_SCHEMA_VERSION,
  createWorkforceRunMembershipV2,
  validateWorkforceRunMembershipV2,
} = await import(`${distRoot}/index.js`);

const ref = (entity_kind, entity_id, revision = 1) => ({ entity_kind, entity_id, revision, fingerprint: "a".repeat(64) });

test("IMP-03B membership snapshot preserves slot, exact Agent revision, and resolution provenance", () => {
  const member = createWorkforceRunMembershipV2({
    snapshot_id: "snapshot-run-1",
    run_id: "run-1",
    workforce_revision_ref: ref("workforce", "wf-1", 2),
    slot_id: "primary",
    resolved_agent_revision_ref: ref("agent", "agent-1", 5),
    agent_id: "agent-1",
    role_ref: ref("resource", "role-1", 3),
    resolution_mode: "current_head_at_admission",
    resolved_at: 100,
  });
  assert.equal(member.slot_id, "primary");
  assert.equal(member.resolved_agent_revision_ref.revision, 5);
  assert.equal(member.resolution_mode, "current_head_at_admission");
  assert.equal(Object.isFrozen(member), true);
});

test("IMP-03B rejects unresolved or malformed snapshot semantics", () => {
  assert.throws(() => validateWorkforceRunMembershipV2({
    schema_version: ACS_NATIVE_SCHEMA_VERSION,
    snapshot_id: "snapshot-run-1",
    run_id: "run-1",
    workforce_revision_ref: ref("workforce", "wf-1"),
    slot_id: "primary",
    resolved_agent_revision_ref: ref("agent", "agent-1"),
    agent_id: "agent-1",
    resolution_mode: "unresolved",
    resolved_at: 100,
  }), NativeContractValidationError);
});

test("IMP-03B migration adds immutable Run binding and snapshot tables", () => {
  assert.equal(SHARED_STATE_SCHEMA_VERSION, 6);
  const migration = SHARED_STATE_MIGRATIONS.find((entry) => entry.version === 5);
  assert.ok(migration);
  const schema = migration.statements.join("\n");
  for (const table of ["acs_native_runs", "acs_workforce_run_membership_snapshots", "acs_workforce_run_membership_members"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.doesNotMatch(schema, /DROP TABLE|DELETE FROM|TRUNCATE/i);
  const coordination = SHARED_STATE_MIGRATIONS.find((entry) => entry.version === 6);
  assert.ok(coordination);
  const coordinationSchema = coordination.statements.join("\n");
  for (const table of ["acs_coordination_proposals", "acs_coordination_decisions", "acs_task_assignments"]) {
    assert.match(coordinationSchema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.doesNotMatch(coordinationSchema, /DROP TABLE|DELETE FROM|TRUNCATE/i);
});

test("IMP-03B implementation has no external runtime dependency", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/native-core/workforce-run-membership.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/control-plane/shared-state/native-core-durable.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /eigent|camel|openclaw/i);
});
