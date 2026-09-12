import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  ACS_NATIVE_SCHEMA_VERSION,
  NativeContractValidationError,
  createRuntimeExecutionIntentV2,
  createTaskAttemptV2,
  validateRuntimeRecoveryView,
  SHARED_STATE_MIGRATIONS,
  SHARED_STATE_SCHEMA_VERSION,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const revision = (entity_kind, entity_id, revisionNumber) => ({ entity_kind, entity_id, revision: revisionNumber, fingerprint: digest });

function intent(overrides = {}) {
  return createRuntimeExecutionIntentV2({
    intent_id: "intent-a1",
    run_id: "run-1",
    task_id: "task-1",
    assignment_id: "assignment-a1",
    assignment_generation: 1,
    member_slot_id: "member-1",
    agent_id: "agent-1",
    agent_revision_ref: revision("agent", "agent-1", 7),
    workforce_revision_ref: revision("workforce", "workforce-1", 2),
    runtime_configuration: { runtime_preferences: { mode: "strict" } },
    status: "compiled",
    compiled_at: 100,
    provenance: { assignment_id: "assignment-a1", assignment_generation: 1 },
    ...overrides,
  });
}

function attempt(overrides = {}) {
  return createTaskAttemptV2({
    attempt_id: "attempt-a1",
    task_run_id: "task-1",
    attempt: 1,
    dispatch_key: "task-1:assignment-a1:1",
    execution_id: "intent-a1",
    execution_intent_id: "intent-a1",
    assignment_id: "assignment-a1",
    assignment_generation: 1,
    member_slot_id: "member-1",
    agent_id: "agent-1",
    agent_revision_ref: revision("agent", "agent-1", 7),
    workforce_revision_ref: revision("workforce", "workforce-1", 2),
    status: "queued",
    ...overrides,
  });
}

test("IMP-03D execution intent preserves canonical assignment, member, and immutable revisions", () => {
  const value = intent();
  assert.equal(value.schema_version, ACS_NATIVE_SCHEMA_VERSION);
  assert.equal(value.assignment_id, "assignment-a1");
  assert.equal(value.assignment_generation, 1);
  assert.equal(value.member_slot_id, "member-1");
  assert.equal(value.agent_revision_ref.revision, 7);
  assert.equal(value.workforce_revision_ref.revision, 2);
  assert.equal(Object.isFrozen(value), true);
});

test("IMP-03D recovery validation rejects an Attempt that was rebound to a newer assignment", () => {
  assert.throws(() => validateRuntimeRecoveryView({
    intent: intent(),
    attempt: attempt({ assignment_id: "assignment-a2", assignment_generation: 2, dispatch_key: "task-1:assignment-a2:2" }),
    assignment_current: false,
    classification: "superseded_assignment",
  }), NativeContractValidationError);
});

test("IMP-03D recovery validation preserves historical identity after reassignment", () => {
  const recovered = validateRuntimeRecoveryView({
    intent: intent(),
    attempt: attempt(),
    assignment_current: false,
    classification: "superseded_assignment",
  });
  assert.equal(recovered.intent.assignment_id, "assignment-a1");
  assert.equal(recovered.attempt.assignment_generation, 1);
});

test("IMP-03D migration is additive and separates assignment generation from runtime state", () => {
  assert.equal(SHARED_STATE_SCHEMA_VERSION, 7);
  const migration = SHARED_STATE_MIGRATIONS.find((entry) => entry.version === 7);
  assert.ok(migration);
  const sql = migration.statements.join("\n");
  assert.match(sql, /acs_runtime_execution_intents/);
  assert.match(sql, /acs_runtime_attempts/);
  assert.match(sql, /assignment_generation/);
  assert.match(sql, /UNIQUE \(intent_id\)/);
  assert.doesNotMatch(sql, /DROP TABLE|DELETE FROM|TRUNCATE/i);
});

test("IMP-03D implementation remains provider neutral and does not introduce external coordination authority", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/native-core/runtime-compilation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/control-plane/shared-state/native-core-durable.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /camel|eigent|openclaw|scheduler|supervisor/i);
});

