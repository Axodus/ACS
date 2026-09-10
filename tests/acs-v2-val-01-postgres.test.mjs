import assert from "node:assert/strict";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  NativeFencingError,
  NativeIdempotencyConflictError,
  NativeLineageIntegrityError,
  PostgresSharedAuthoritativeState,
  RevisionConflictError,
  SHARED_STATE_SCHEMA_VERSION,
  createAgentDefinitionV2,
  createAgentRevisionV2,
  createCheckpointV2,
  createCostRecordV2,
  createEventEnvelopeV2,
  createEvidenceRecordV2,
  createUsageRecordV2,
} = await import(`${distRoot}/index.js`);

const digest = "a".repeat(64);
const ref = (kind, id, revision) => ({ kind, id, ...(revision === undefined ? {} : { revision }) });
const policyRef = (entityId) => ({ entity_kind: "policy", entity_id: entityId, revision: 1, fingerprint: digest });

function scope() {
  return {
    organization_id: "org-val-01",
    product_domain: "acs",
    tenant_id: "tenant-val-01",
    owner_ref: "owner:acs",
    authority_scope_ref: "authority:acs",
    knowledge_scope_refs: ["knowledge:default"],
  };
}

function revisionInput(agentId, revision, supersedesRevision, committedAt, instructions = `VAL-01 revision ${revision}.`) {
  return {
    agent_id: agentId,
    revision,
    ...(supersedesRevision === undefined ? {} : { supersedes_revision: supersedesRevision }),
    instructions,
    capability_requirements: [ref("capability", "reasoning")],
    constraints: [ref("constraint", "safe-output")],
    knowledge: {
      allowed_scope_refs: ["knowledge:default"], denied_scope_refs: [],
      context_policy_ref: policyRef("context-policy"), memory_policy_ref: policyRef("memory-policy"),
    },
    resources: {
      skill_refs: [{ entity_kind: "resource", entity_id: "skill:core", revision: 1, fingerprint: digest }],
      tool_refs: [{ entity_kind: "resource", entity_id: "tool:read", revision: 1, fingerprint: digest }], mcp_server_refs: [],
    },
    runtime_preferences: {
      provider_routes: [ref("provider", "provider-preference")], model_requirements: [ref("model", "model-preference")],
      harness_preferences: [ref("harness", "harness-preference")], executor_preferences: [ref("executor", "executor-preference")],
    },
    governance: {
      authority_refs: [ref("authority", "authority:acs")], permission_policy_ref: policyRef("permission-policy"), approval_policy_ref: policyRef("approval-policy"),
    },
    economics: { cost_policy_ref: policyRef("cost-policy"), budget_policy_ref: policyRef("budget-policy") },
    evidence: { audit_policy_ref: policyRef("audit-policy"), evaluation_refs: [ref("evaluation", "baseline")] },
    commit: { created_by: "acs-control-plane", committed_at: committedAt, change_reason: `commit revision ${revision}` },
  };
}

function agentDefinition(agentId, revision, timestamp) {
  return createAgentDefinitionV2({
    agent_id: agentId, scope: scope(), name: "VAL-01 Durable Agent", status: "active", current_revision: revision,
    ownership_ref: "owner:acs", sharing_mode: "private", created_at: timestamp, updated_at: timestamp,
  });
}

function event(input) {
  return createEventEnvelopeV2({
    event_id: input.eventId, event_type: input.eventType, timestamp: input.timestamp, sequence: input.sequence,
    organization_id: "org-val-01", product_domain: "acs", tenant_id: "tenant-val-01",
    ...(input.agentId ? { agent_id: input.agentId } : {}), ...(input.runId ? { run_id: input.runId } : {}),
    ...(input.attempt ? { attempt: input.attempt } : {}),
    actor: { kind: "service", ref: "acs-control-plane" }, source: "acs", correlation_id: input.correlationId,
    idempotency_key: input.idempotencyKey, payload: { operation: input.eventType, synthetic: true },
  });
}

function lineageCommand({ agentId, revision, expectedHead, suffix, instructions }) {
  const revisionValue = createAgentRevisionV2(revisionInput(agentId, revision, expectedHead || undefined, revision * 10, instructions));
  return {
    definition: agentDefinition(agentId, revision, revision * 10), revision: revisionValue, expectedHead,
    idempotency: { key: `agent-${revision}-${suffix}`, scope: `agent:${agentId}`, request_hash: String(revision).repeat(64) },
    event: event({ eventId: `event-agent-${revision}-${suffix}`, eventType: "agent.revision.created", timestamp: revision * 10, sequence: revision, agentId, correlationId: `corr-agent-${revision}-${suffix}`, idempotencyKey: `agent-${revision}-${suffix}` }),
  };
}

function worker(workerId) {
  return {
    workerId, instanceId: `instance-${workerId}`, servicePrincipalId: `service:${workerId}`,
    name: workerId, version: "1.0.0",
    capabilities: {
      engineId: "openclaw", engineRevision: "rev-1", supportedRunners: ["opencode"], supportedProviders: ["axodus-managed"],
      supportedIsolationModes: ["sandbox"], supportedDeploymentModes: ["sandbox"], supportedTargetIds: ["local-wsl"], maxConcurrentRuns: 2,
    },
  };
}

function ownership(claim, workerValue, at) {
  return {
    jobId: claim.job.jobId, assignmentId: claim.assignment.assignmentId, leaseId: claim.assignment.leaseId,
    fencingToken: claim.assignment.fencingToken, workerId: workerValue.workerId, instanceId: workerValue.instanceId,
    servicePrincipalId: workerValue.servicePrincipalId, at,
  };
}

async function createRuntimeClaim(state, suffix, at) {
  const workerValue = worker(`worker-${suffix}`);
  await state.runtime.registerWorker({ ...workerValue, registeredAt: at });
  await state.runtime.heartbeat({ ...workerValue, status: "available", at, staleAfterMs: 60_000 });
  const job = await state.runtime.createJob({
    jobId: `job-${suffix}`, tenantId: "tenant-val-01", runtimeInstanceId: `runtime-${suffix}`,
    workload: { type: "runtime.start", deploymentId: `deployment-${suffix}`, agentId: `agent-${suffix}`, deploymentMode: "sandbox", targetId: "local-wsl" },
    requirements: { engineId: "openclaw", requiredRunners: ["opencode"], requiredProviders: ["axodus-managed"], requiredIsolationMode: "sandbox", requiredDeploymentMode: "sandbox", targetId: "local-wsl" },
    correlationId: `corr-runtime-${suffix}`, idempotencyKey: `runtime-${suffix}`, maxAttempts: 3, createdAt: at,
  });
  const claim = await state.runtime.claimNext({ ...workerValue, at: at + 1, leaseTtlMs: 20 });
  assert.ok(claim);
  assert.equal(claim.job.jobId, job.jobId);
  await state.runtime.markRunning(ownership(claim, workerValue, at + 2));
  return { workerValue, job, claim };
}

test("VAL-01 PostgreSQL durable acceptance", { skip: process.env.ACS_SH_DATABASE_URL ? false : "ACS_SH_DATABASE_URL is not configured" }, async () => {
  const suffix = `${Date.now()}-${process.pid}`;
  const url = process.env.ACS_SH_DATABASE_URL;
  let state = new PostgresSharedAuthoritativeState({ connectionString: url });
  let second = new PostgresSharedAuthoritativeState({ connectionString: url });
  try {
    assert.equal(await state.migrate(), SHARED_STATE_SCHEMA_VERSION);
    assert.equal(await second.migrate(), SHARED_STATE_SCHEMA_VERSION);
    assert.equal(await state.schemaVersion(), 3);

    const rolledBackAgentId = `agent-rollback-${suffix}`;
    const rolledBack = lineageCommand({ agentId: rolledBackAgentId, revision: 1, expectedHead: 0, suffix: `rollback-${suffix}` });
    await assert.rejects(state.withTransaction("VAL-01 injected native rollback", async (tx) => {
      await tx.nativeCore.advanceAgentLineage(rolledBack);
      throw new Error("VAL-01 controlled rollback");
    }));
    await assert.rejects(() => state.nativeCore.getAgentLineage(rolledBackAgentId), NativeLineageIntegrityError);
    assert.equal(await state.nativeCore.getEvent(rolledBack.event.event_id), undefined);
    assert.equal((await state.nativeCore.listOutbox()).some((row) => row.eventId === rolledBack.event.event_id), false);

    const agentId = `agent-restart-${suffix}`;
    const create = lineageCommand({ agentId, revision: 1, expectedHead: 0, suffix });
    const created = await state.nativeCore.advanceAgentLineage(create);
    assert.equal(created.outbox.status, "pending");
    assert.equal((await state.nativeCore.advanceAgentLineage(create)).event.event.event_id, create.event.event_id);
    await state.close();
    state = new PostgresSharedAuthoritativeState({ connectionString: url });
    const reconstructed = await state.nativeCore.getAgentLineage(agentId);
    assert.deepEqual(reconstructed.revisions.map((value) => value.ref), [create.revision.ref]);
    await assert.rejects(() => state.agents.get(agentId));
    assert.equal((await state.nativeCore.advanceAgentLineage(create)).outbox.outboxId, created.outbox.outboxId);
    await assert.rejects(
      () => state.nativeCore.advanceAgentLineage({ ...create, idempotency: { ...create.idempotency, request_hash: "f".repeat(64) } }),
      (error) => error?.code === "ACS_REPOSITORY_TRANSACTION_FAILED" && error.cause instanceof NativeIdempotencyConflictError,
    );
    const pendingAfterRestart = (await state.nativeCore.listOutbox({ status: "pending" })).find((row) => row.outboxId === created.outbox.outboxId);
    assert.ok(pendingAfterRestart);
    const leased = await state.nativeCore.claimNextOutbox({ dispatcherId: `dispatcher-${suffix}`, leaseTtlMs: 1, at: Date.now() });
    assert.equal(leased?.outboxId, created.outbox.outboxId);
    await state.nativeCore.retryOutbox({ outboxId: created.outbox.outboxId, dispatcherId: `dispatcher-${suffix}`, availableAt: 0, failure: "DELIVERY_RETRY" });
    await state.close();
    state = new PostgresSharedAuthoritativeState({ connectionString: url });
    const requeued = (await state.nativeCore.listOutbox({ recoverableAt: Date.now() })).find((row) => row.outboxId === created.outbox.outboxId);
    assert.equal(requeued?.status, "retryable");
    const reclaimed = await state.nativeCore.claimNextOutbox({ dispatcherId: `dispatcher-restart-${suffix}`, leaseTtlMs: 20, at: Date.now() });
    assert.equal(reclaimed?.outboxId, created.outbox.outboxId);
    await state.nativeCore.acknowledgeOutbox({ outboxId: created.outbox.outboxId, dispatcherId: `dispatcher-restart-${suffix}`, at: Date.now() });

    for (let round = 0; round < 3; round += 1) {
      const concurrentAgentId = `agent-cas-${round}-${suffix}`;
      await state.nativeCore.advanceAgentLineage(lineageCommand({ agentId: concurrentAgentId, revision: 1, expectedHead: 0, suffix: `cas-root-${round}-${suffix}` }));
      const left = lineageCommand({ agentId: concurrentAgentId, revision: 2, expectedHead: 1, suffix: `cas-left-${round}-${suffix}`, instructions: "left" });
      const right = lineageCommand({ agentId: concurrentAgentId, revision: 2, expectedHead: 1, suffix: `cas-right-${round}-${suffix}`, instructions: "right" });
      const outcomes = await Promise.allSettled([state.nativeCore.advanceAgentLineage(left), second.nativeCore.advanceAgentLineage(right)]);
      assert.equal(outcomes.filter((entry) => entry.status === "fulfilled").length, 1);
      assert.equal(outcomes.filter((entry) => entry.status === "rejected" && entry.reason instanceof RevisionConflictError).length, 1);
      const lineage = await state.nativeCore.getAgentLineage(concurrentAgentId);
      assert.equal(lineage.definition.current_revision, 2);
      assert.equal(lineage.revisions.length, 2);
    }

    const evidence = createEvidenceRecordV2({
      evidence_id: `evidence-${suffix}`, kind: "lifecycle", subject_ref: ref("agent", agentId), event_ref: ref("event", create.event.event_id),
      source: "acs", classification: "internal", payload_digest: digest, created_at: 11,
    });
    await state.nativeCore.recordEvidence(evidence);
    const usage = createUsageRecordV2({
      usage_id: `usage-${suffix}`, run_id: `run-${suffix}`, product_domain: "acs", measured: { input_tokens: "10" }, measurement_source: "ACS",
      observed_at: 30, evidence_ref: ref("evidence", evidence.evidence_id),
    });
    const cost = createCostRecordV2({
      cost_id: `cost-${suffix}`, usage_ref: ref("usage", usage.usage_id), cost_center_path: { axodus: "axodus", product: "acs" },
      components: { infrastructure_cost: "0.01" }, currency: "USD", calculation_policy_ref: policyRef("cost-policy"), status: "measured", created_at: 30,
    });
    const accountingEvent = event({ eventId: `event-accounting-${suffix}`, eventType: "usage.recorded", timestamp: 30, sequence: 1, runId: usage.run_id, correlationId: `corr-accounting-${suffix}`, idempotencyKey: `accounting-${suffix}` });
    const accounting = { usage, cost, idempotency: { key: `accounting-${suffix}`, scope: `run:${usage.run_id}`, request_hash: "e".repeat(64) }, event: accountingEvent };
    await state.nativeCore.recordAccounting(accounting);
    await state.close();
    state = new PostgresSharedAuthoritativeState({ connectionString: url });
    assert.deepEqual(await state.nativeCore.listEvidence({ eventId: create.event.event_id }), [evidence]);
    assert.deepEqual(await state.nativeCore.listUsage(usage.run_id), [usage]);
    assert.deepEqual(await state.nativeCore.listCosts(usage.usage_id), [cost]);
    await state.nativeCore.recordAccounting(accounting);
    assert.equal((await state.nativeCore.listUsage(usage.run_id)).length, 1);
    assert.equal((await state.nativeCore.listCosts(usage.usage_id)).length, 1);
    assert.equal((await state.nativeCore.replayEvents({ streamScope: `agent:${agentId}` })).length, 1);

    const runtimeAt = Date.now();
    const first = await createRuntimeClaim(state, suffix, runtimeAt);
    const firstOwnership = ownership(first.claim, first.workerValue, runtimeAt + 3);
    const checkpoint = createCheckpointV2({
      checkpoint_id: `checkpoint-${suffix}`, run_id: first.job.jobId, attempt: first.claim.assignment.attempt,
      assignment_ref: ref("assignment", first.claim.assignment.assignmentId), lease_ref: ref("lease", first.claim.assignment.leaseId),
      fencing_token: String(first.claim.assignment.fencingToken), policy_snapshot_refs: [], pending_approval_refs: [], artifact_refs: [], evidence_gap_refs: [], created_at: runtimeAt + 3,
    });
    const checkpointEvent = event({ eventId: `event-checkpoint-${suffix}`, eventType: "runtime.checkpoint.recorded", timestamp: runtimeAt + 3, sequence: 1, runId: first.job.jobId, attempt: first.claim.assignment.attempt, correlationId: `corr-checkpoint-${suffix}`, idempotencyKey: `checkpoint-${suffix}` });
    await state.nativeCore.recordFencedCheckpoint({ ownership: firstOwnership, checkpoint, idempotency: { key: `checkpoint-${suffix}`, scope: `run:${first.job.jobId}`, request_hash: "c".repeat(64) }, event: checkpointEvent });
    assert.deepEqual(await state.nativeCore.getCheckpoint(checkpoint.checkpoint_id), checkpoint);
    const recovery = await state.runtime.recoverExpired({ at: runtimeAt + 30, workerStaleAfterMs: 60_000 });
    assert.equal(recovery.assignmentsExpired, 1);
    const workerB = worker(`worker-b-${suffix}`);
    await state.runtime.registerWorker({ ...workerB, registeredAt: runtimeAt + 30 });
    await state.runtime.heartbeat({ ...workerB, status: "available", at: runtimeAt + 30, staleAfterMs: 60_000 });
    const secondClaim = await state.runtime.claimNext({ ...workerB, at: runtimeAt + 31, leaseTtlMs: 100 });
    assert.ok(secondClaim);
    assert.equal(secondClaim.assignment.fencingToken, first.claim.assignment.fencingToken + 1);
    await assert.rejects(
      () => state.nativeCore.recordFencedCheckpoint({
        ownership: { ...firstOwnership, at: runtimeAt + 32 }, checkpoint: createCheckpointV2({ ...checkpoint, checkpoint_id: `checkpoint-stale-${suffix}`, created_at: runtimeAt + 32 }),
        idempotency: { key: `checkpoint-stale-${suffix}`, scope: `run:${first.job.jobId}`, request_hash: "d".repeat(64) },
        event: event({ eventId: `event-checkpoint-stale-${suffix}`, eventType: "runtime.checkpoint.recorded", timestamp: runtimeAt + 32, sequence: 2, runId: first.job.jobId, attempt: first.claim.assignment.attempt, correlationId: `corr-checkpoint-stale-${suffix}`, idempotencyKey: `checkpoint-stale-${suffix}` }),
      }),
      (error) => error?.code === "ACS_REPOSITORY_TRANSACTION_FAILED" && error.cause instanceof NativeFencingError,
    );
  } finally {
    await Promise.all([state.close(), second.close()]);
  }
});
