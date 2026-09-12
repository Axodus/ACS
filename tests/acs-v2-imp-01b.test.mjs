import assert from "node:assert/strict";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  NativeContractValidationError,
  PostgresSharedAuthoritativeState,
  RevisionConflictError,
  SHARED_STATE_MIGRATIONS,
  SHARED_STATE_SCHEMA_VERSION,
  createAgentDefinitionV2,
  createAgentRevisionV2,
  createCostRecordV2,
  createEventEnvelopeV2,
  createEvidenceRecordV2,
  createUsageRecordV2,
  validateNativeAccountingCommand,
  validateNativeAgentLineageCommand,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const ref = (kind, id, revision) => ({ kind, id, ...(revision === undefined ? {} : { revision }) });
const policyRef = (entityId) => ({ entity_kind: "policy", entity_id: entityId, revision: 1, fingerprint: digest });

function scope() {
  return {
    organization_id: "org-imp-01b",
    product_domain: "acs",
    tenant_id: "tenant-imp-01b",
    owner_ref: "owner:acs",
    authority_scope_ref: "authority:acs",
    knowledge_scope_refs: ["knowledge:default"],
  };
}

function revisionInput(agentId, revision, supersedesRevision, committedAt) {
  return {
    agent_id: agentId,
    revision,
    ...(supersedesRevision === undefined ? {} : { supersedes_revision: supersedesRevision }),
    instructions: `Native durable revision ${revision}.`,
    capability_requirements: [ref("capability", "reasoning")],
    constraints: [ref("constraint", "safe-output")],
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
      provider_routes: [ref("provider", "provider-preference")],
      model_requirements: [ref("model", "model-preference")],
      harness_preferences: [ref("harness", "harness-preference")],
      executor_preferences: [ref("executor", "executor-preference")],
    },
    governance: {
      authority_refs: [ref("authority", "authority:acs")],
      permission_policy_ref: policyRef("permission-policy"),
      approval_policy_ref: policyRef("approval-policy"),
    },
    economics: {
      cost_policy_ref: policyRef("cost-policy"),
      budget_policy_ref: policyRef("budget-policy"),
    },
    evidence: {
      audit_policy_ref: policyRef("audit-policy"),
      evaluation_refs: [ref("evaluation", "baseline")],
    },
    commit: {
      created_by: "acs-control-plane",
      committed_at: committedAt,
      change_reason: `commit revision ${revision}`,
    },
  };
}

function event(input) {
  return createEventEnvelopeV2({
    event_id: input.eventId,
    event_type: input.eventType,
    timestamp: input.timestamp,
    sequence: input.sequence,
    organization_id: "org-imp-01b",
    product_domain: "acs",
    tenant_id: "tenant-imp-01b",
    ...(input.agentId ? { agent_id: input.agentId } : {}),
    ...(input.runId ? { run_id: input.runId } : {}),
    actor: { kind: "service", ref: "acs-control-plane" },
    source: "acs",
    correlation_id: input.correlationId,
    idempotency_key: input.idempotencyKey,
    payload: { operation: input.eventType, revision: input.sequence },
  });
}

test("IMP-01B migration is additive and keeps native Event, Outbox, Evidence, and Audit distinct", () => {
  assert.equal(SHARED_STATE_SCHEMA_VERSION, SHARED_STATE_MIGRATIONS.at(-1).version);
  const migration = SHARED_STATE_MIGRATIONS.find((entry) => entry.version === 3);
  assert.ok(migration);
  const schema = migration.statements.join("\n");
  for (const table of ["acs_native_events", "acs_native_outbox", "acs_native_idempotency", "acs_native_checkpoints", "acs_native_evidence"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(schema, /UNIQUE \(stream_scope, sequence\)/);
  assert.match(schema, /REFERENCES acs_native_events\(event_id\)/);
  assert.match(schema, /record_kind TEXT NOT NULL DEFAULT 'legacy'/);
  assert.doesNotMatch(schema, /DROP TABLE|DELETE FROM|TRUNCATE/i);
});

test("IMP-01B command boundaries reject invalid lineage and accounting relationships before persistence", () => {
  const agentId = "agent-imp-01b-contract";
  const definition = createAgentDefinitionV2({
    agent_id: agentId,
    scope: scope(),
    name: "Durable Native Agent",
    status: "active",
    current_revision: 1,
    ownership_ref: "owner:acs",
    sharing_mode: "private",
    created_at: 10,
    updated_at: 10,
  });
  const revision = createAgentRevisionV2(revisionInput(agentId, 1, undefined, 10));
  const agentEvent = event({
    eventId: "event-imp-01b-agent-1",
    eventType: "agent.revision.created",
    timestamp: 10,
    sequence: 1,
    agentId,
    correlationId: "corr-agent-1",
    idempotencyKey: "agent-create-1",
  });
  const command = {
    definition,
    revision,
    expectedHead: 0,
    idempotency: { key: "agent-create-1", scope: `agent:${agentId}`, request_hash: digest },
    event: agentEvent,
  };
  assert.doesNotThrow(() => validateNativeAgentLineageCommand(command));
  assert.throws(() => validateNativeAgentLineageCommand({ ...command, expectedHead: 1 }), NativeContractValidationError);
  assert.throws(() => validateNativeAgentLineageCommand({ ...command, event: { ...agentEvent, sequence: 2 } }), NativeContractValidationError);

  const usage = createUsageRecordV2({
    usage_id: "usage-imp-01b-1",
    run_id: "run-imp-01b-1",
    product_domain: "acs",
    measured: { input_tokens: "10" },
    measurement_source: "ACS",
    observed_at: 20,
    evidence_ref: ref("evidence", "evidence-imp-01b-1"),
  });
  const cost = createCostRecordV2({
    cost_id: "cost-imp-01b-1",
    usage_ref: ref("usage", usage.usage_id),
    cost_center_path: { axodus: "axodus", product: "acs" },
    components: { infrastructure_cost: "0.01" },
    currency: "USD",
    calculation_policy_ref: policyRef("cost-policy"),
    status: "measured",
    created_at: 20,
  });
  const accounting = {
    usage,
    cost,
    idempotency: { key: "accounting-1", scope: "run:run-imp-01b-1", request_hash: "b".repeat(64) },
    event: event({
      eventId: "event-imp-01b-accounting-1",
      eventType: "usage.recorded",
      timestamp: 20,
      sequence: 1,
      runId: usage.run_id,
      correlationId: "corr-accounting-1",
      idempotencyKey: "accounting-1",
    }),
  };
  assert.doesNotThrow(() => validateNativeAccountingCommand(accounting));
  assert.throws(() => validateNativeAccountingCommand({ ...accounting, cost: { ...cost, usage_ref: ref("usage", "other") } }), NativeContractValidationError);
});

test("IMP-01B PostgreSQL lineage, outbox, idempotency, replay, evidence, and accounting survive restart", {
  skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured",
}, async () => {
  const suffix = `${Date.now()}-${process.pid}`;
  const agentId = `agent-imp-01b-${suffix}`;
  let state = new PostgresSharedAuthoritativeState({ connectionString: process.env.ACS_SH_DATABASE_URL });
  try {
    assert.equal(await state.migrate(), SHARED_STATE_SCHEMA_VERSION);
    const definition = createAgentDefinitionV2({
      agent_id: agentId,
      scope: scope(),
      name: "Durable Native Agent",
      status: "active",
      current_revision: 1,
      ownership_ref: "owner:acs",
      sharing_mode: "private",
      created_at: 10,
      updated_at: 10,
    });
    const revision = createAgentRevisionV2(revisionInput(agentId, 1, undefined, 10));
    const create = {
      definition,
      revision,
      expectedHead: 0,
      idempotency: { key: `agent-create-${suffix}`, scope: `agent:${agentId}`, request_hash: digest },
      event: event({ eventId: `event-agent-create-${suffix}`, eventType: "agent.revision.created", timestamp: 10, sequence: 1, agentId, correlationId: `corr-agent-${suffix}`, idempotencyKey: `agent-create-${suffix}` }),
    };
    const created = await state.nativeCore.advanceAgentLineage(create);
    assert.equal(created.lineage.revisions.length, 1);
    assert.equal((await state.nativeCore.advanceAgentLineage(create)).lineage.revisions[0].ref.fingerprint, revision.ref.fingerprint);

    const secondDefinition = createAgentDefinitionV2({ ...definition, current_revision: 2, updated_at: 20 });
    const secondRevision = createAgentRevisionV2(revisionInput(agentId, 2, 1, 20));
    await state.nativeCore.advanceAgentLineage({
      definition: secondDefinition,
      revision: secondRevision,
      expectedHead: 1,
      idempotency: { key: `agent-second-${suffix}`, scope: `agent:${agentId}`, request_hash: "b".repeat(64) },
      event: event({ eventId: `event-agent-second-${suffix}`, eventType: "agent.revision.created", timestamp: 20, sequence: 2, agentId, correlationId: `corr-second-${suffix}`, idempotencyKey: `agent-second-${suffix}` }),
    });

    const thirdDefinition = createAgentDefinitionV2({ ...definition, current_revision: 3, updated_at: 30 });
    const leftRevision = createAgentRevisionV2(revisionInput(agentId, 3, 2, 30));
    const rightRevision = createAgentRevisionV2({ ...revisionInput(agentId, 3, 2, 30), instructions: "Competing durable revision." });
    const attempts = await Promise.allSettled([
      state.nativeCore.advanceAgentLineage({
        definition: thirdDefinition,
        revision: leftRevision,
        expectedHead: 2,
        idempotency: { key: `agent-left-${suffix}`, scope: `agent:${agentId}`, request_hash: "c".repeat(64) },
        event: event({ eventId: `event-agent-left-${suffix}`, eventType: "agent.revision.created", timestamp: 30, sequence: 3, agentId, correlationId: `corr-left-${suffix}`, idempotencyKey: `agent-left-${suffix}` }),
      }),
      state.nativeCore.advanceAgentLineage({
        definition: thirdDefinition,
        revision: rightRevision,
        expectedHead: 2,
        idempotency: { key: `agent-right-${suffix}`, scope: `agent:${agentId}`, request_hash: "d".repeat(64) },
        event: event({ eventId: `event-agent-right-${suffix}`, eventType: "agent.revision.created", timestamp: 30, sequence: 3, agentId, correlationId: `corr-right-${suffix}`, idempotencyKey: `agent-right-${suffix}` }),
      }),
    ]);
    assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((attempt) => attempt.status === "rejected" && attempt.reason instanceof RevisionConflictError).length, 1);
    const successfulAdvance = attempts.find((attempt) => attempt.status === "fulfilled");
    assert.equal(successfulAdvance?.status, "fulfilled");

    const outbox = await state.nativeCore.claimNextOutbox({ dispatcherId: `dispatcher-${suffix}`, leaseTtlMs: 1, at: 100 });
    assert.ok(outbox);
    await state.nativeCore.retryOutbox({ outboxId: outbox.outboxId, dispatcherId: `dispatcher-${suffix}`, availableAt: 0, failure: "DELIVERY_RETRY" });
    const reclaimed = await state.nativeCore.claimNextOutbox({ dispatcherId: `dispatcher-${suffix}`, leaseTtlMs: 10, at: 101 });
    assert.equal(reclaimed?.outboxId, outbox.outboxId);
    await state.nativeCore.acknowledgeOutbox({ outboxId: outbox.outboxId, dispatcherId: `dispatcher-${suffix}`, at: 102 });

    const committedEvent = created.event.event;
    await state.nativeCore.recordEvidence(createEvidenceRecordV2({
      evidence_id: `evidence-${suffix}`,
      kind: "lifecycle",
      subject_ref: ref("agent", agentId),
      event_ref: ref("event", committedEvent.event_id),
      source: "acs",
      classification: "internal",
      payload_digest: digest,
      created_at: 11,
    }));
    const usage = createUsageRecordV2({
      usage_id: `usage-${suffix}`,
      run_id: `run-${suffix}`,
      product_domain: "acs",
      measured: { input_tokens: "10" },
      measurement_source: "ACS",
      observed_at: 30,
      evidence_ref: ref("evidence", `evidence-${suffix}`),
    });
    const cost = createCostRecordV2({
      cost_id: `cost-${suffix}`,
      usage_ref: ref("usage", usage.usage_id),
      cost_center_path: { axodus: "axodus", product: "acs" },
      components: { infrastructure_cost: "0.01" },
      currency: "USD",
      calculation_policy_ref: policyRef("cost-policy"),
      status: "measured",
      created_at: 30,
    });
    await state.nativeCore.recordAccounting({
      usage,
      cost,
      idempotency: { key: `accounting-${suffix}`, scope: `run:${usage.run_id}`, request_hash: "e".repeat(64) },
      event: event({ eventId: `event-accounting-${suffix}`, eventType: "usage.recorded", timestamp: 30, sequence: 1, runId: usage.run_id, correlationId: `corr-accounting-${suffix}`, idempotencyKey: `accounting-${suffix}` }),
    });
    assert.equal((await state.nativeCore.listUsage(usage.run_id)).length, 1);
    assert.equal((await state.nativeCore.listCosts(usage.usage_id)).length, 1);
    await state.close();
    state = new PostgresSharedAuthoritativeState({ connectionString: process.env.ACS_SH_DATABASE_URL });
    const reconstructed = await state.nativeCore.getAgentLineage(agentId);
    assert.equal(reconstructed.definition.current_revision, 3);
    assert.equal(reconstructed.revisions.length, 3);
    assert.deepEqual(reconstructed.revisions.map((entry) => entry.ref.fingerprint), [
      revision.ref.fingerprint,
      secondRevision.ref.fingerprint,
      successfulAdvance.value.lineage.revisions[2].ref.fingerprint,
    ]);
    assert.equal((await state.nativeCore.replayEvents({ streamScope: `agent:${agentId}` })).length, 3);
    assert.deepEqual(await state.nativeCore.getEvent(committedEvent.event_id), { streamScope: `agent:${agentId}`, event: committedEvent });
  } finally {
    await state.close();
  }
});
