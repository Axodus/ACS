import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  NativeContractValidationError,
  NativeIdempotencyConflictError,
  NativeWorkforceReferenceError,
  PostgresNativeCoreRepository,
  PostgresSharedAuthoritativeState,
  RevisionConflictError,
  SHARED_STATE_MIGRATIONS,
  SHARED_STATE_SCHEMA_VERSION,
  createAgentDefinitionV2,
  createAgentRevisionV2,
  createEventEnvelopeV2,
  createGovernedRoleRevisionV2,
  createWorkforceDefinitionV2,
  createWorkforceRevisionV2,
  createWorkforceId,
  deserializeWorkforceDefinitionV2,
  deserializeWorkforceRevisionV2,
  serializeWorkforceDefinitionV2,
  serializeWorkforceRevisionV2,
  validateNativeWorkforceLineageCommand,
  validateWorkforceRevisionV2,
  governedRoleRevisionFromResource,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const entityRef = (kind, id, revision) => ({ kind, id, ...(revision === undefined ? {} : { revision }) });
const policyRef = (entityId) => ({ entity_kind: "policy", entity_id: entityId, revision: 1, fingerprint: digest });

async function isolatedDatabase(run) {
  const schema = `imp03a_${Date.now()}_${process.pid}`;
  const admin = new Pool({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const url = new URL(process.env.ACS_SH_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  const pool = new Pool({ connectionString: url.toString() });
  const state = new PostgresSharedAuthoritativeState({ connectionString: url.toString() });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await run({ pool, state, connectionString: url.toString() });
  } finally {
    await state.close();
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
}

function scope(suffix = "core") {
  return {
    organization_id: `org-imp-03a-${suffix}`,
    product_domain: "acs",
    tenant_id: `tenant-imp-03a-${suffix}`,
    owner_ref: "owner:acs",
    authority_scope_ref: "authority:acs",
    knowledge_scope_refs: ["knowledge:default"],
  };
}

function authority(at = 10) {
  return {
    decision_ref: "decision:workforce-authorized",
    decision: "allowed",
    authority_scope_ref: "authority:acs",
    evaluated_at: at,
  };
}

function agentRevisionInput(agentId, revision, supersedesRevision, committedAt) {
  return {
    agent_id: agentId,
    revision,
    ...(supersedesRevision === undefined ? {} : { supersedes_revision: supersedesRevision }),
    instructions: `Agent revision ${revision}.`,
    capability_requirements: [entityRef("capability", "agent.inspect")],
    constraints: [entityRef("constraint", "safe-output")],
    knowledge: {
      allowed_scope_refs: ["knowledge:default"],
      denied_scope_refs: [],
      context_policy_ref: policyRef("context-policy"),
      memory_policy_ref: policyRef("memory-policy"),
    },
    resources: {
      skill_refs: [{ entity_kind: "resource", entity_id: "skill:core", revision: 1, fingerprint: digest }],
      tool_refs: [{ entity_kind: "resource", entity_id: "tool:read", revision: 1, fingerprint: digest }],
      mcp_server_refs: [],
    },
    runtime_preferences: {
      provider_routes: [],
      model_requirements: [],
      harness_preferences: [],
      executor_preferences: [],
    },
    governance: {
      authority_refs: [entityRef("authority", "authority:acs")],
      permission_policy_ref: policyRef("permission-policy"),
      approval_policy_ref: policyRef("approval-policy"),
    },
    economics: {
      cost_policy_ref: policyRef("cost-policy"),
      budget_policy_ref: policyRef("budget-policy"),
    },
    evidence: {
      audit_policy_ref: policyRef("audit-policy"),
      evaluation_refs: [],
    },
    commit: {
      created_by: "test:imp-03a",
      committed_at: committedAt,
      change_reason: `agent revision ${revision}`,
    },
  };
}

function roleInput(roleId, revision, supersedesRevision, status, committedAt) {
  return createGovernedRoleRevisionV2({
    role_id: roleId,
    revision,
    ...(supersedesRevision === undefined ? {} : { supersedes_revision: supersedesRevision }),
    display_name: `Role ${revision}`,
    status,
    capability_ids: ["agent.inspect"],
    metadata: { responsibility_class: "operational" },
    commit: {
      created_by: "test:imp-03a",
      committed_at: committedAt,
      change_reason: `role revision ${revision}`,
    },
  });
}

function member(agentId, roleRef, mode = "pinned", pinnedRevisionRef) {
  return {
    slot_id: `${agentId}-slot-${mode}`,
    agent_selector: mode === "pinned"
      ? { mode, agent_id: agentId, pinned_revision_ref: pinnedRevisionRef }
      : { mode, agent_id: agentId },
    ...(roleRef ? { role_ref: roleRef } : {}),
    responsibilities: [mode === "pinned" ? "perform durable analysis" : "review admitted composition"],
    capability_requirement_refs: [entityRef("capability", "agent.inspect")],
    authority_constraint_refs: [entityRef("constraint", "authority:acs")],
    participation_constraint_refs: [entityRef("constraint", "participation:required")],
  };
}

function workforceRevisionInput({ workforceId, revision, supersedesRevision, status, members, committedAt, purpose = "Durable Workforce composition" }) {
  return createWorkforceRevisionV2({
    workforce_id: workforceId,
    revision,
    ...(supersedesRevision === undefined ? {} : { supersedes_revision: supersedesRevision }),
    display_name: `Workforce ${revision}`,
    purpose,
    lifecycle_status: status,
    members,
    composition_constraints: [entityRef("constraint", "composition:durable")],
    governance: {
      authority_refs: [entityRef("authority", "authority:acs")],
      membership_policy_ref: policyRef("membership-policy"),
    },
    evidence: { audit_policy_ref: policyRef("audit-policy") },
    commit: {
      created_by: "test:imp-03a",
      committed_at: committedAt,
      change_reason: `workforce revision ${revision}`,
    },
  });
}

function workforceEvent({ workforceId, revision, status, fingerprint, eventType, timestamp, idempotencyKey, previousStatus }) {
  return createEventEnvelopeV2({
    event_id: `event-${workforceId}-${revision}-${idempotencyKey}`,
    event_type: eventType,
    timestamp,
    sequence: revision,
    organization_id: scope("shared").organization_id,
    product_domain: "acs",
    tenant_id: scope("shared").tenant_id,
    workforce_id: workforceId,
    actor: { kind: "service", ref: "test:imp-03a" },
    source: "acs",
    correlation_id: `corr-${workforceId}-${revision}`,
    idempotency_key: idempotencyKey,
    payload: {
      workforce_revision: revision,
      workforce_fingerprint: fingerprint,
      lifecycle_status: status,
      ...(previousStatus ? { previous_status: previousStatus } : {}),
      authority_decision_ref: authority(timestamp).decision_ref,
    },
  });
}

function workforceCommand({ definition, revision, expectedHead, idempotencyKey, eventType, previousStatus }) {
  return {
    definition,
    revision,
    expectedHead,
    idempotency: {
      key: idempotencyKey,
      scope: `workforce:${definition.workforce_id}`,
      request_hash: digest,
    },
    authority: authority(revision.commit.committed_at),
    event: workforceEvent({
      workforceId: definition.workforce_id,
      revision: revision.ref.revision,
      status: revision.lifecycle_status,
      fingerprint: revision.ref.fingerprint,
      eventType,
      timestamp: revision.commit.committed_at,
      idempotencyKey,
      previousStatus,
    }),
  };
}

async function createNativeAgent(state, suffix) {
  const agentId = `agent-imp-03a-${suffix}`;
  const agentScope = scope("shared");
  const definition = createAgentDefinitionV2({
    agent_id: agentId,
    scope: agentScope,
    name: "Workforce member Agent",
    status: "active",
    current_revision: 1,
    ownership_ref: "owner:acs",
    sharing_mode: "private",
    created_at: 1,
    updated_at: 1,
  });
  const revision = createAgentRevisionV2(agentRevisionInput(agentId, 1, undefined, 1));
  await state.nativeCore.advanceAgentLineage({
    definition,
    revision,
    expectedHead: 0,
    idempotency: { key: `agent-create-${suffix}`, scope: `agent:${agentId}`, request_hash: digest },
    event: createEventEnvelopeV2({
      event_id: `event-agent-create-${suffix}`,
      event_type: "agent.revision.created",
      timestamp: 1,
      sequence: 1,
      organization_id: agentScope.organization_id,
      product_domain: agentScope.product_domain,
      tenant_id: agentScope.tenant_id,
      agent_id: agentId,
      actor: { kind: "service", ref: "test:imp-03a" },
      source: "acs",
      correlation_id: `corr-agent-create-${suffix}`,
      idempotency_key: `agent-create-${suffix}`,
      payload: { agent_revision: 1 },
    }),
  });
  return { definition, revision };
}

async function advanceNativeAgent(state, prior, status, revisionNumber, suffix) {
  const revision = createAgentRevisionV2(agentRevisionInput(prior.definition.agent_id, revisionNumber, revisionNumber - 1, revisionNumber));
  const definition = createAgentDefinitionV2({
    ...prior.definition,
    status,
    current_revision: revisionNumber,
    updated_at: revisionNumber,
  });
  await state.nativeCore.advanceAgentLineage({
    definition,
    revision,
    expectedHead: revisionNumber - 1,
    idempotency: { key: `agent-${status}-${suffix}`, scope: `agent:${definition.agent_id}`, request_hash: String(revisionNumber).repeat(64) },
    event: createEventEnvelopeV2({
      event_id: `event-agent-${status}-${suffix}`,
      event_type: "agent.revision.created",
      timestamp: revisionNumber,
      sequence: revisionNumber,
      organization_id: definition.scope.organization_id,
      product_domain: definition.scope.product_domain,
      tenant_id: definition.scope.tenant_id,
      agent_id: definition.agent_id,
      actor: { kind: "service", ref: "test:imp-03a" },
      source: "acs",
      correlation_id: `corr-agent-${status}-${suffix}`,
      idempotency_key: `agent-${status}-${suffix}`,
      payload: { agent_revision: revisionNumber },
    }),
  });
  return { definition, revision };
}

async function rejectInjectedWorkforceWrite(connectionString, command, sqlFragment) {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  let rolledBack = false;
  let injected = false;
  try {
    await client.query("BEGIN");
    const repository = new PostgresNativeCoreRepository({
      query: (...args) => {
        const sql = typeof args[0] === "string" ? args[0] : args[0].text;
        if (sql.includes(sqlFragment)) {
          injected = true;
          throw new Error(`IMP-03A injected failure at ${sqlFragment}`);
        }
        return client.query(...args);
      },
    });
    await assert.rejects(() => repository.advanceWorkforceLineage(command));
    assert.equal(injected, true, `must reach ${sqlFragment}`);
    await client.query("ROLLBACK");
    rolledBack = true;
  } finally {
    if (!rolledBack) await client.query("ROLLBACK").catch(() => undefined);
    client.release();
    await pool.end();
  }
}

test("IMP-03A Workforce contracts preserve identity, immutable composition, and unresolved admission selectors", () => {
  const workforceId = createWorkforceId();
  const definition = createWorkforceDefinitionV2({
    workforce_id: workforceId,
    scope: scope("shared"),
    current_status: "draft",
    current_revision: 1,
    ownership_ref: "owner:acs",
    created_at: 10,
    updated_at: 10,
  });
  const pinned = { entity_kind: "agent", entity_id: "agent-contract", revision: 1, fingerprint: digest };
  const role = { entity_kind: "resource", entity_id: "role.contract", revision: 1, fingerprint: digest };
  const governedRole = governedRoleRevisionFromResource({
    kind: "role",
    id: "role.contract",
    revision: 1,
    displayName: "Contract role",
    status: "active",
    capabilityIds: ["agent.inspect"],
  }, { created_by: "test", committed_at: 10, change_reason: "snapshot current governed resource" });
  assert.equal(governedRole.ref.entity_id, role.entity_id);
  assert.equal(governedRole.ref.revision, role.revision);
  const revision = workforceRevisionInput({
    workforceId,
    revision: 1,
    status: "draft",
    members: [member("agent-contract", role, "pinned", pinned)],
    committedAt: 10,
  });
  assert.notEqual(definition.workforce_id, revision.ref.entity_id + "-revision");
  assert.equal(revision.ref.entity_id, definition.workforce_id);
  assert.deepEqual(deserializeWorkforceDefinitionV2(serializeWorkforceDefinitionV2(definition)), definition);
  assert.deepEqual(deserializeWorkforceRevisionV2(serializeWorkforceRevisionV2(revision)), revision);

  const currentHead = workforceRevisionInput({
    workforceId,
    revision: 2,
    supersedesRevision: 1,
    status: "draft",
    members: [member("agent-contract", role, "current_head_at_admission")],
    committedAt: 20,
  });
  assert.equal(currentHead.members[0].agent_selector.mode, "current_head_at_admission");
  assert.equal("pinned_revision_ref" in currentHead.members[0].agent_selector, false);
  const duplicate = { ...revision.members[0], slot_id: "duplicated" };
  const buildMembers = (members) => workforceRevisionInput({ workforceId, revision: 1, status: "draft", members, committedAt: 10 });
  const issue = (code) => (error) => error instanceof NativeContractValidationError && error.issues.some((entry) => entry.code === code);
  assert.throws(() => buildMembers([revision.members[0], duplicate]), issue("INDISTINGUISHABLE_DUPLICATE_MEMBER"));
  assert.throws(() => buildMembers([revision.members[0], { ...duplicate, role_ref: { ...role, revision: 2 } }]), issue("INDISTINGUISHABLE_DUPLICATE_MEMBER"));
  assert.throws(() => buildMembers([revision.members[0], { ...duplicate, slot_id: revision.members[0].slot_id, responsibilities: ["review"] }]), issue("DUPLICATE_SLOT_ID"));
  assert.throws(() => buildMembers([]), issue("EMPTY_MEMBERS"));
  assert.throws(() => buildMembers([{ ...duplicate, agent_selector: { mode: "latest", agent_id: "agent-contract" } }]), issue("INVALID_ENUM"));
  assert.throws(() => buildMembers([{ ...duplicate, agent_selector: { mode: "current_head_at_admission", agent_id: "agent-contract", pinned_revision_ref: pinned } }]), issue("UNSUPPORTED_FIELD"));
  assert.throws(() => buildMembers([{ ...duplicate, agent_selector: { mode: "pinned", agent_id: "agent-contract" } }]), NativeContractValidationError);
  assert.throws(() => buildMembers([{ ...duplicate, role_ref: { ...role, entity_kind: "agent" } }]), issue("INVALID_ENTITY_KIND"));
  assert.throws(() => validateWorkforceRevisionV2({ ...revision, purpose: "tampered" }), issue("FINGERPRINT_MISMATCH"));
  const { ref: originalRef, schema_version, ...body } = revision;
  const rebuild = (changes) => createWorkforceRevisionV2({ ...body, workforce_id: workforceId, revision: 1, ...changes });
  assert.equal(rebuild({ commit: { ...revision.commit, committed_at: 99 } }).ref.fingerprint, originalRef.fingerprint);
  for (const changes of [{ display_name: "Renamed" }, { purpose: "New purpose" }, { lifecycle_status: "active" }, { members: [{ ...duplicate, responsibilities: ["new duty"] }] }]) {
    assert.notEqual(rebuild(changes).ref.fingerprint, originalRef.fingerprint);
  }
  assert.throws(() => { revision.members[0].responsibilities.push("mutation"); }, TypeError);
  assert.doesNotThrow(() => workforceRevisionInput({
    workforceId,
    revision: 1,
    status: "draft",
    members: [
      member("agent-contract", role, "pinned", pinned),
      {
        ...member("agent-contract", role, "pinned", pinned),
        slot_id: "agent-contract-review-slot",
        responsibilities: ["perform independent review"],
      },
    ],
    committedAt: 10,
  }));
  assert.throws(() => createWorkforceDefinitionV2({ ...definition, executor_id: "runtime-worker" }), NativeContractValidationError);
});

test("IMP-03A command boundary requires authoritative lifecycle, event, and idempotency context", () => {
  const workforceId = "workforce-command-contract";
  const role = { entity_kind: "resource", entity_id: "role.contract", revision: 1, fingerprint: digest };
  const pinned = { entity_kind: "agent", entity_id: "agent-contract", revision: 1, fingerprint: digest };
  const definition = createWorkforceDefinitionV2({
    workforce_id: workforceId,
    scope: scope("shared"),
    current_status: "draft",
    current_revision: 1,
    ownership_ref: "owner:acs",
    created_at: 10,
    updated_at: 10,
  });
  const revision = workforceRevisionInput({ workforceId, revision: 1, status: "draft", members: [member("agent-contract", role, "pinned", pinned)], committedAt: 10 });
  const command = workforceCommand({ definition, revision, expectedHead: 0, idempotencyKey: "contract-create", eventType: "workforce.created" });
  assert.doesNotThrow(() => validateNativeWorkforceLineageCommand(command));
  assert.throws(() => validateNativeWorkforceLineageCommand({ ...command, authority: { ...authority(), decision: "denied" } }), NativeContractValidationError);
  assert.throws(() => validateNativeWorkforceLineageCommand({ ...command, event: { ...command.event, workforce_id: "other" } }), NativeContractValidationError);
  assert.throws(() => validateNativeWorkforceLineageCommand({ ...command, event: { ...command.event, payload: {} } }), NativeContractValidationError);
});

test("IMP-03A schema remains additive after Workforce Run admission extensions", () => {
  const migration = SHARED_STATE_MIGRATIONS.find((entry) => entry.version === 4);
  assert.equal(SHARED_STATE_SCHEMA_VERSION, 7);
  assert.ok(migration);
  const schema = migration.statements.join("\n");
  for (const table of ["acs_workforces", "acs_workforce_revisions", "acs_governed_role_revisions"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(schema, /ALTER TABLE acs_native_events ADD COLUMN IF NOT EXISTS workforce_id/);
  assert.doesNotMatch(schema, /DROP TABLE|DELETE FROM|TRUNCATE/i);
});

test("IMP-03A contains no Eigent or CAMEL dependency", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/native-core/workforce.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/control-plane/shared-state/native-core-durable.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /eigent|camel/i);
});

test("IMP-03A PostgreSQL durable Workforce acceptance", {
  skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured",
}, async () => {
  const suffix = `${Date.now()}-${process.pid}`;
  const state = new PostgresSharedAuthoritativeState({ connectionString: process.env.ACS_SH_DATABASE_URL });
  const workforceId = `workforce-imp-03a-${suffix}`;
  try {
    assert.equal(await state.migrate(), SHARED_STATE_SCHEMA_VERSION);
    const { definition: agentDefinition, revision: agentRevision } = await createNativeAgent(state, suffix);
    const roleId = `role-imp-03a-${suffix}`;
    const roleV1 = roleInput(roleId, 1, undefined, "active", 10);
    await state.nativeCore.recordGovernedRoleRevision(roleV1, 0);

    const r1 = workforceRevisionInput({
      workforceId,
      revision: 1,
      status: "draft",
      members: [member(agentDefinition.agent_id, roleV1.ref, "pinned", agentRevision.ref)],
      committedAt: 10,
    });
    const d1 = createWorkforceDefinitionV2({
      workforce_id: workforceId,
      scope: scope("shared"),
      current_status: "draft",
      current_revision: 1,
      ownership_ref: "owner:acs",
      created_at: 10,
      updated_at: 10,
    });
    const c1 = workforceCommand({ definition: d1, revision: r1, expectedHead: 0, idempotencyKey: `workforce-create-${suffix}`, eventType: "workforce.created" });
    const created = await state.nativeCore.advanceWorkforceLineage(c1);
    assert.equal(created.lineage.definition.workforce_id, workforceId);
    assert.equal(created.lineage.revisions.length, 1);
    assert.equal(created.event.streamScope, `workforce:${workforceId}`);
    assert.equal((await state.nativeCore.advanceWorkforceLineage(c1)).lineage.revisions.length, 1);
    const conflictingR1 = workforceRevisionInput({ workforceId, revision: 1, status: "draft", members: r1.members, committedAt: 10, purpose: "Conflicting same-key request" });
    await assert.rejects(() => state.nativeCore.advanceWorkforceLineage(workforceCommand({ definition: d1, revision: conflictingR1, expectedHead: 0, idempotencyKey: c1.idempotency.key, eventType: "workforce.created" })), NativeIdempotencyConflictError);

    const roleV2 = roleInput(roleId, 2, 1, "active", 20);
    await state.nativeCore.recordGovernedRoleRevision(roleV2, 1);
    const r2 = workforceRevisionInput({
      workforceId,
      revision: 2,
      supersedesRevision: 1,
      status: "active",
      members: [member(agentDefinition.agent_id, roleV2.ref, "current_head_at_admission")],
      committedAt: 20,
      purpose: "Durable Workforce composition after governed role update",
    });
    const d2 = createWorkforceDefinitionV2({ ...d1, current_status: "active", current_revision: 2, updated_at: 20 });
    const c2 = workforceCommand({ definition: d2, revision: r2, expectedHead: 1, idempotencyKey: `workforce-activate-${suffix}`, eventType: "workforce.lifecycle.changed", previousStatus: "draft" });
    await state.nativeCore.advanceWorkforceLineage(c2);
    const deprecatedRoleId = `role-deprecated-imp-03a-${suffix}`;
    const deprecatedRoleV1 = roleInput(deprecatedRoleId, 1, undefined, "active", 21);
    const deprecatedRoleV2 = roleInput(deprecatedRoleId, 2, 1, "deprecated", 22);
    await state.nativeCore.recordGovernedRoleRevision(deprecatedRoleV1, 0);
    await state.nativeCore.recordGovernedRoleRevision(deprecatedRoleV2, 1);
    const rejectedDeprecated = workforceRevisionInput({
      workforceId: `${workforceId}-deprecated`,
      revision: 1,
      status: "draft",
      members: [member(agentDefinition.agent_id, deprecatedRoleV1.ref, "pinned", agentRevision.ref)],
      committedAt: 23,
    });
    const rejectedDeprecatedDefinition = createWorkforceDefinitionV2({
      workforce_id: `${workforceId}-deprecated`,
      scope: scope("shared"),
      current_status: "draft",
      current_revision: 1,
      ownership_ref: "owner:acs",
      created_at: 23,
      updated_at: 23,
    });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage(workforceCommand({
        definition: rejectedDeprecatedDefinition,
        revision: rejectedDeprecated,
        expectedHead: 0,
        idempotencyKey: `workforce-deprecated-role-${suffix}`,
        eventType: "workforce.created",
      })),
      (error) => error instanceof NativeWorkforceReferenceError,
    );
    const identityRevision = workforceRevisionInput({ workforceId, revision: 3, supersedesRevision: 2, status: "active", members: r2.members, committedAt: 25, purpose: "Invalid identity replacement" });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage({
        ...workforceCommand({
          definition: createWorkforceDefinitionV2({ ...d2, ownership_ref: "owner:changed", current_revision: 3, updated_at: 25 }),
          revision: identityRevision,
          expectedHead: 2,
          idempotencyKey: `workforce-identity-${suffix}`,
          eventType: "workforce.revision.created",
          previousStatus: "active",
        }),
      }),
      (error) => error instanceof NativeWorkforceReferenceError,
    );
    assert.deepEqual(await state.nativeCore.getGovernedRoleRevision(roleV1.ref), roleV1);
    assert.deepEqual(await state.nativeCore.getGovernedRoleRevision(roleV2.ref), roleV2);

    const firstHistory = await state.nativeCore.getWorkforceRevision(workforceId, 1);
    const secondHistory = await state.nativeCore.getWorkforceRevision(workforceId, 2);
    assert.equal(firstHistory.members[0].role_ref.revision, 1);
    assert.equal(secondHistory.members[0].role_ref.revision, 2);
    assert.equal(secondHistory.members[0].agent_selector.mode, "current_head_at_admission");
    assert.equal("pinned_revision_ref" in secondHistory.members[0].agent_selector, false);

    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage({
        ...c2,
        idempotency: { ...c2.idempotency, request_hash: "b".repeat(64) },
      }),
      (error) => error instanceof NativeIdempotencyConflictError,
    );

    const r3a = workforceRevisionInput({ workforceId, revision: 3, supersedesRevision: 2, status: "active", members: r2.members, committedAt: 30, purpose: "Concurrent candidate A" });
    const r3b = workforceRevisionInput({ workforceId, revision: 3, supersedesRevision: 2, status: "active", members: r2.members, committedAt: 30, purpose: "Concurrent candidate B" });
    const d3 = createWorkforceDefinitionV2({ ...d2, current_revision: 3, updated_at: 30 });
    const c3a = workforceCommand({ definition: d3, revision: r3a, expectedHead: 2, idempotencyKey: `workforce-left-${suffix}`, eventType: "workforce.revision.created", previousStatus: "active" });
    const c3b = workforceCommand({ definition: d3, revision: r3b, expectedHead: 2, idempotencyKey: `workforce-right-${suffix}`, eventType: "workforce.revision.created", previousStatus: "active" });
    const concurrent = await Promise.allSettled([
      state.nativeCore.advanceWorkforceLineage(c3a),
      state.nativeCore.advanceWorkforceLineage(c3b),
    ]);
    assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(concurrent.filter((result) => result.status === "rejected" && result.reason instanceof RevisionConflictError).length, 1);
    assert.equal((await state.nativeCore.getWorkforceLineage(workforceId)).definition.current_revision, 3);
    const staleCandidate = concurrent[0].status === "rejected" ? c3a : c3b;
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage(staleCandidate),
      (error) => error instanceof RevisionConflictError,
    );

    const r4 = workforceRevisionInput({ workforceId, revision: 4, supersedesRevision: 3, status: "disabled", members: r2.members, committedAt: 40, purpose: "Disabled composition" });
    const d4 = createWorkforceDefinitionV2({ ...d2, current_status: "disabled", current_revision: 4, updated_at: 40 });
    const failedEvent = workforceCommand({ definition: d4, revision: r4, expectedHead: 3, idempotencyKey: `workforce-event-failure-${suffix}`, eventType: "workforce.lifecycle.changed", previousStatus: "active" });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage({
        ...failedEvent,
        event: { ...failedEvent.event, event_id: c2.event.event_id },
      }),
    );
    assert.equal((await state.nativeCore.getWorkforceLineage(workforceId)).definition.current_revision, 3);
    assert.equal(await state.nativeCore.getWorkforceRevision(workforceId, 4), undefined);
    assert.deepEqual(await state.nativeCore.getEvent(c2.event.event_id), { streamScope: `workforce:${workforceId}`, event: c2.event });

    const failedOutbox = workforceCommand({ definition: d4, revision: r4, expectedHead: 3, idempotencyKey: `workforce-failure-${suffix}`, eventType: "workforce.lifecycle.changed", previousStatus: "active" });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage({ ...failedOutbox, outboxId: created.outbox.outboxId }),
    );
    assert.equal((await state.nativeCore.getWorkforceLineage(workforceId)).definition.current_revision, 3);
    assert.equal(await state.nativeCore.getEvent(failedOutbox.event.event_id), undefined);
    assert.equal(await state.nativeCore.getWorkforceRevision(workforceId, 4), undefined);

    const committed = await state.nativeCore.advanceWorkforceLineage(failedOutbox);
    assert.equal(committed.lineage.definition.current_status, "disabled");
    assert.equal((await state.nativeCore.listOutbox()).filter((row) => row.eventId === failedOutbox.event.event_id).length, 1);

    const invalidLifecycleR5 = workforceRevisionInput({ workforceId, revision: 5, supersedesRevision: 4, status: "draft", members: r2.members, committedAt: 45, purpose: "Invalid disabled to draft transition" });
    const invalidLifecycleD5 = createWorkforceDefinitionV2({ ...d2, current_status: "draft", current_revision: 5, updated_at: 45 });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage(workforceCommand({
        definition: invalidLifecycleD5,
        revision: invalidLifecycleR5,
        expectedHead: 4,
        idempotencyKey: `workforce-invalid-lifecycle-${suffix}`,
        eventType: "workforce.lifecycle.changed",
        previousStatus: "disabled",
      })),
      (error) => error instanceof NativeWorkforceReferenceError,
    );
    assert.equal((await state.nativeCore.getWorkforceLineage(workforceId)).definition.current_revision, 4);

    const roleV3 = roleInput(roleId, 3, 2, "active", 46);
    await state.nativeCore.recordGovernedRoleRevision(roleV3, 2);
    await assert.rejects(
      () => state.nativeCore.recordGovernedRoleRevision(roleInput(roleId, 3, 2, "active", 47), 2),
      (error) => error instanceof RevisionConflictError,
    );
    assert.deepEqual(await state.nativeCore.getGovernedRoleRevision(roleV3.ref), roleV3);

    const archivedR5 = workforceRevisionInput({ workforceId, revision: 5, supersedesRevision: 4, status: "archived", members: r2.members, committedAt: 50 });
    const archivedD5 = createWorkforceDefinitionV2({ ...d4, current_status: "archived", current_revision: 5, updated_at: 50 });
    const archive = workforceCommand({ definition: archivedD5, revision: archivedR5, expectedHead: 4, idempotencyKey: `archive-${suffix}`, eventType: "workforce.lifecycle.changed", previousStatus: "disabled" });
    for (const fragment of [
      "UPDATE acs_workforces SET",
      "INSERT INTO acs_workforce_revisions",
      "INSERT INTO acs_native_events",
      "INSERT INTO acs_native_outbox",
      "INSERT INTO acs_native_idempotency",
    ]) {
      await rejectInjectedWorkforceWrite(process.env.ACS_SH_DATABASE_URL, archive, fragment);
      assert.equal((await state.nativeCore.getWorkforceLineage(workforceId)).definition.current_revision, 4);
      assert.equal(await state.nativeCore.getWorkforceRevision(workforceId, 5), undefined);
      assert.equal(await state.nativeCore.getEvent(archive.event.event_id), undefined);
      assert.equal((await state.nativeCore.listOutbox()).some((entry) => entry.eventId === archive.event.event_id), false);
    }
    await state.nativeCore.advanceWorkforceLineage(archive);
    const unarchive = workforceRevisionInput({ workforceId, revision: 6, supersedesRevision: 5, status: "active", members: r2.members, committedAt: 60 });
    await assert.rejects(() => state.nativeCore.advanceWorkforceLineage(workforceCommand({ definition: createWorkforceDefinitionV2({ ...archivedD5, current_status: "active", current_revision: 6, updated_at: 60 }), revision: unarchive, expectedHead: 5, idempotencyKey: `unarchive-${suffix}`, eventType: "workforce.lifecycle.changed", previousStatus: "archived" })), NativeWorkforceReferenceError);
    await state.nativeCore.recordGovernedRoleRevision(roleInput(roleId, 4, 3, "deprecated", 61), 3);
    assert.deepEqual(await state.nativeCore.advanceWorkforceLineage(c1), created);
    assert.deepEqual((await state.nativeCore.replayEvents({ streamScope: `workforce:${workforceId}` })).map((row) => row.event.event_type), ["workforce.created", "workforce.lifecycle.changed", "workforce.revision.created", "workforce.lifecycle.changed", "workforce.lifecycle.changed"]);

    await state.close();
    const reloaded = new PostgresSharedAuthoritativeState({ connectionString: process.env.ACS_SH_DATABASE_URL });
    try {
      const restored = await reloaded.nativeCore.getWorkforceLineage(workforceId);
      assert.equal(restored.definition.current_revision, 5);
      assert.equal(restored.definition.current_status, "archived");
      assert.equal(restored.revisions.length, 5);
      assert.equal(restored.revisions[0].members[0].role_ref.revision, 1);
      assert.equal(restored.revisions[1].members[0].role_ref.revision, 2);
      assert.deepEqual(restored.revisions[0], r1);
      assert.deepEqual(restored.revisions[1], r2);
      assert.deepEqual(await reloaded.nativeCore.getGovernedRoleRevision(roleV1.ref), roleV1);
      assert.deepEqual(await reloaded.nativeCore.getGovernedRoleRevision(roleV2.ref), roleV2);
    } finally {
      await reloaded.close();
    }
  } finally {
    await state.close().catch(() => undefined);
  }
});

test("IMP-03A rejects missing Agent, revision, role, disabled, and archived membership references", {
  skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured",
}, async () => {
  const suffix = `invalid-${Date.now()}-${process.pid}`;
  const state = new PostgresSharedAuthoritativeState({ connectionString: process.env.ACS_SH_DATABASE_URL });
  try {
    await state.migrate();
    const existing = await createNativeAgent(state, suffix);
    const role = roleInput(`role-valid-${suffix}`, 1, undefined, "active", 10);
    await state.nativeCore.recordGovernedRoleRevision(role, 0);
    const workforceId = `workforce-invalid-${suffix}`;
    const missingAgent = { entity_kind: "agent", entity_id: `agent-missing-${suffix}`, revision: 1, fingerprint: digest };
    const missingRole = { entity_kind: "resource", entity_id: `role-missing-${suffix}`, revision: 1, fingerprint: digest };
    const revision = workforceRevisionInput({ workforceId, revision: 1, status: "draft", members: [member(missingAgent.entity_id, missingRole, "pinned", missingAgent)], committedAt: 10 });
    const definition = createWorkforceDefinitionV2({
      workforce_id: workforceId,
      scope: scope("shared"),
      current_status: "draft",
      current_revision: 1,
      ownership_ref: "owner:acs",
      created_at: 10,
      updated_at: 10,
    });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage(workforceCommand({ definition, revision, expectedHead: 0, idempotencyKey: `missing-${suffix}`, eventType: "workforce.created" })),
      (error) => error instanceof NativeWorkforceReferenceError,
    );
    const missingRoleWorkforceId = `workforce-missing-role-${suffix}`;
    const missingRoleDefinition = createWorkforceDefinitionV2({
      workforce_id: missingRoleWorkforceId,
      scope: scope("shared"), current_status: "draft", current_revision: 1,
      ownership_ref: "owner:acs", created_at: 10, updated_at: 10,
    });
    const missingRoleRevision = workforceRevisionInput({
      workforceId: missingRoleWorkforceId, revision: 1, status: "draft",
      members: [member(existing.definition.agent_id, missingRole, "pinned", existing.revision.ref)], committedAt: 10,
    });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage(workforceCommand({ definition: missingRoleDefinition, revision: missingRoleRevision, expectedHead: 0, idempotencyKey: `missing-role-${suffix}`, eventType: "workforce.created" })),
      NativeWorkforceReferenceError,
    );
    const missingRevisionWorkforceId = `workforce-missing-revision-${suffix}`;
    const missingRevisionDefinition = createWorkforceDefinitionV2({
      workforce_id: missingRevisionWorkforceId,
      scope: scope("shared"), current_status: "draft", current_revision: 1,
      ownership_ref: "owner:acs", created_at: 10, updated_at: 10,
    });
    const missingRevision = { ...existing.revision.ref, fingerprint: "b".repeat(64) };
    const missingRevisionWorkforce = workforceRevisionInput({
      workforceId: missingRevisionWorkforceId, revision: 1, status: "draft",
      members: [member(existing.definition.agent_id, role.ref, "pinned", missingRevision)], committedAt: 10,
    });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage(workforceCommand({ definition: missingRevisionDefinition, revision: missingRevisionWorkforce, expectedHead: 0, idempotencyKey: `missing-revision-${suffix}`, eventType: "workforce.created" })),
      NativeWorkforceReferenceError,
    );
    const disabled = await advanceNativeAgent(state, existing, "disabled", 2, suffix);
    const disabledWorkforceId = `workforce-disabled-agent-${suffix}`;
    const disabledDefinition = createWorkforceDefinitionV2({
      workforce_id: disabledWorkforceId,
      scope: scope("shared"), current_status: "draft", current_revision: 1,
      ownership_ref: "owner:acs", created_at: 10, updated_at: 10,
    });
    const disabledWorkforce = workforceRevisionInput({
      workforceId: disabledWorkforceId, revision: 1, status: "draft",
      members: [member(disabled.definition.agent_id, role.ref, "current_head_at_admission")], committedAt: 10,
    });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage(workforceCommand({ definition: disabledDefinition, revision: disabledWorkforce, expectedHead: 0, idempotencyKey: `disabled-agent-${suffix}`, eventType: "workforce.created" })),
      NativeWorkforceReferenceError,
    );
    const archived = await advanceNativeAgent(state, disabled, "archived", 3, suffix);
    const archivedWorkforceId = `workforce-archived-agent-${suffix}`;
    const archivedDefinition = createWorkforceDefinitionV2({
      workforce_id: archivedWorkforceId,
      scope: scope("shared"), current_status: "draft", current_revision: 1,
      ownership_ref: "owner:acs", created_at: 10, updated_at: 10,
    });
    const archivedWorkforce = workforceRevisionInput({
      workforceId: archivedWorkforceId, revision: 1, status: "draft",
      members: [member(archived.definition.agent_id, role.ref, "current_head_at_admission")], committedAt: 10,
    });
    await assert.rejects(
      () => state.nativeCore.advanceWorkforceLineage(workforceCommand({ definition: archivedDefinition, revision: archivedWorkforce, expectedHead: 0, idempotencyKey: `archived-agent-${suffix}`, eventType: "workforce.created" })),
      NativeWorkforceReferenceError,
    );
  } finally {
    await state.close();
  }
});

test("IMP-03A upgrades the accepted v3 schema additively and preserves legacy rows", {
  skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured",
}, async () => {
  await isolatedDatabase(async ({ pool, state }) => {
    const client = await pool.connect();
    let committed = false;
    try {
      await client.query("BEGIN");
      for (const migration of SHARED_STATE_MIGRATIONS.filter((entry) => entry.version <= 3)) {
        for (const statement of migration.statements) await client.query(statement);
        await client.query("INSERT INTO acs_schema_migrations (version, name) VALUES ($1, $2)", [migration.version, migration.name]);
      }
      await client.query("INSERT INTO acs_tenants (tenant_id, revision, payload) VALUES ($1, $2, $3::jsonb)", ["legacy-imp-03a", 1, JSON.stringify({ source: "v3" })]);
      await client.query("COMMIT");
      committed = true;
    } finally {
      if (!committed) await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
    assert.equal(await state.schemaVersion(), 3);
    assert.equal(await state.migrate(), SHARED_STATE_SCHEMA_VERSION);
    assert.equal(await state.migrate(), SHARED_STATE_SCHEMA_VERSION);
    const legacy = await pool.query("SELECT payload FROM acs_tenants WHERE tenant_id = $1", ["legacy-imp-03a"]);
    assert.deepEqual(legacy.rows[0].payload, { source: "v3" });
    const tables = await pool.query("SELECT to_regclass($1) AS relation", ["acs_workforces"]);
    assert.equal(tables.rows[0].relation, "acs_workforces");
    const admissionTables = await pool.query("SELECT to_regclass($1) AS relation", ["acs_workforce_run_membership_snapshots"]);
    assert.equal(admissionTables.rows[0].relation, "acs_workforce_run_membership_snapshots");
  });
});
