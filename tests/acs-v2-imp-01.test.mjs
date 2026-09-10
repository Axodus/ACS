import assert from "node:assert/strict";
import test from "node:test";
import {
  NativeContractValidationError,
  NativeEventLedger,
  NativeEvidenceLedger,
  assertCurrentFencingToken,
  createAgentDefinitionV2,
  createAgentRevisionV2,
  createCostRecordV2,
  createCheckpointV2,
  createEventEnvelopeV2,
  createExecutionContextV2,
  createExecutionPolicyV2,
  createExecutionRequestV2,
  createExecutionResultV2,
  createExecutionBindingV2,
  createEvidenceRecordV2,
  createRunV2,
  createTaskAttemptV2,
  createTaskV2,
  createUsageRecordV2,
  deserializeAgentDefinitionV2,
  deserializeAgentRevisionV2,
  deserializeRuntimeContract,
  serializeAgentDefinitionV2,
  serializeAgentRevisionV2,
  serializeRuntimeContract,
  taskAttemptFromDurableAssignment,
  transitionRunV2,
  transitionTaskV2,
  validateExecutionRequestV2,
  validateCostRecordV2,
  validateUsageRecordV2,
} from "../dist/index.js";

const digest = "a".repeat(64);
const ref = (kind, id, revision) => ({ kind, id, ...(revision === undefined ? {} : { revision }) });
const revisionRef = (entity_id, revision = 1) => ({ entity_kind: "policy", entity_id, revision, fingerprint: digest });

function scope() {
  return {
    organization_id: "org-1",
    product_domain: "acs",
    tenant_id: "tenant-1",
    owner_ref: "owner:acs",
    authority_scope_ref: "authority:acs",
    knowledge_scope_refs: ["knowledge:default"],
  };
}

function agentRevisionInput() {
  return {
    agent_id: "agent-native-1",
    revision: 1,
    supersedes_revision: undefined,
    instructions: "Execute the admitted task within the supplied policy.",
    capability_requirements: [ref("capability", "reasoning")],
    constraints: [ref("constraint", "safe-output")],
    knowledge: {
      allowed_scope_refs: ["knowledge:default"],
      denied_scope_refs: [],
      context_policy_ref: revisionRef("context-policy"),
      memory_policy_ref: revisionRef("memory-policy"),
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
      permission_policy_ref: revisionRef("permission-policy"),
      approval_policy_ref: revisionRef("approval-policy"),
    },
    economics: {
      cost_policy_ref: revisionRef("cost-policy"),
      budget_policy_ref: revisionRef("budget-policy"),
    },
    evidence: {
      audit_policy_ref: revisionRef("audit-policy"),
      evaluation_refs: [ref("evaluation", "eval:baseline")],
    },
    commit: {
      created_by: "system",
      committed_at: 100,
      change_reason: "initial native contract revision",
    },
  };
}

function idempotency(key = "request-1") {
  return { key, scope: "run", request_hash: digest };
}

test("Agent identity, immutable revision fingerprint and deterministic round trip are provider independent", () => {
  const definition = createAgentDefinitionV2({
    agent_id: "agent-native-1",
    scope: scope(),
    name: "Native Agent",
    status: "active",
    current_revision: 1,
    ownership_ref: "owner:acs",
    sharing_mode: "private",
    created_at: 10,
    updated_at: 10,
  });
  const revision = createAgentRevisionV2(agentRevisionInput());
  assert.equal(revision.ref.entity_id, definition.agent_id);
  assert.equal("provider_id" in definition, false);
  assert.equal(serializeAgentDefinitionV2(definition), serializeAgentDefinitionV2({ ...definition, scope: { ...definition.scope, knowledge_scope_refs: [...definition.scope.knowledge_scope_refs] } }));
  assert.deepEqual(deserializeAgentDefinitionV2(serializeAgentDefinitionV2(definition)), definition);
  assert.deepEqual(deserializeAgentRevisionV2(serializeAgentRevisionV2(revision)), revision);
  assert.throws(() => createAgentDefinitionV2({ ...definition, agent_id: "" }), NativeContractValidationError);
  assert.throws(() => createAgentDefinitionV2({ ...definition, metadata: { apiKey: "secret" } }), NativeContractValidationError);
});

test("ExecutionBinding, Run and Task preserve explicit state-machine guards", () => {
  const binding = createExecutionBindingV2({
    binding_id: "binding-1",
    status: "admitted",
    plan_fingerprint: digest,
    agent_revision_ref: { entity_kind: "agent", entity_id: "agent-native-1", revision: 1, fingerprint: digest },
    provider_ref: ref("provider", "provider-1"),
    model_ref: ref("model", "model-1"),
    credential_reference: ref("connection", "connection-ref-1"),
    harness_ref: ref("harness", "harness-1"),
    executor_ref: ref("executor", "executor-1"),
    capability_evidence_refs: [ref("capability-evidence", "capability-evidence-1")],
    policy_snapshot_refs: [{ policy_id: "policy-1", revision: 1, fingerprint: digest, decision_context_hash: digest }],
    economic_snapshot_refs: [],
  });
  const run = createRunV2({
    run_id: "run-1",
    kind: "agent",
    scope: scope(),
    definition_refs: { agent_revision_ref: binding.agent_revision_ref },
    status: "created",
    idempotency: idempotency(),
    execution_binding_refs: [ref("execution-binding", binding.binding_id)],
    created_at: 100,
  });
  assert.throws(() => transitionRunV2(run, "queued"), NativeContractValidationError);
  const queued = transitionRunV2(run, "queued", {
    admission_decision_ref: ref("decision", "decision-1"),
    binding_ref: ref("execution-binding", binding.binding_id),
    policy_snapshot_ref: binding.policy_snapshot_refs[0],
    idempotency_recorded: true,
  });
  const running = transitionRunV2(queued, "running", { lease_ref: ref("lease", "lease-1"), fencing_token: "1" });
  assert.equal(running.status, "running");
  assert.throws(() => transitionRunV2(running, "completed"), NativeContractValidationError);
  const completed = transitionRunV2(running, "completed", { terminal_result: true });
  assert.equal(completed.status, "completed");
  assert.throws(() => transitionRunV2(completed, "running"), NativeContractValidationError);

  const task = createTaskV2({ task_run_id: "task-run-1", run_id: run.run_id, node_id: "node-1", status: "planned", logical_idempotency_key: "task-key", current_attempt: 1 });
  const ready = transitionTaskV2(task, "ready", { dependency_satisfied: true });
  const leased = transitionTaskV2(ready, "leased", { assignment_ref: ref("assignment", "assignment-1"), lease_ref: ref("lease", "lease-1"), fencing_token: "1" });
  const taskRunning = transitionTaskV2(leased, "running", { worker_started: true });
  const succeeded = transitionTaskV2(taskRunning, "succeeded", { terminal_result: true });
  assert.equal(succeeded.status, "succeeded");
});

test("Native event ledger enforces immutable identity and monotonic ordering", () => {
  const ledger = new NativeEventLedger();
  const event = (event_id, sequence) => createEventEnvelopeV2({
    event_id,
    event_type: sequence === 1 ? "run.created" : "run.started",
    timestamp: sequence,
    sequence,
    organization_id: "org-1",
    product_domain: "acs",
    run_id: "run-1",
    actor: { kind: "system", ref: "acs" },
    source: "acs",
    correlation_id: "corr-1",
    payload: { status: sequence === 1 ? "created" : "running" },
  });
  ledger.append(event("event-1", 1));
  ledger.append(event("event-2", 2));
  assert.equal(ledger.cursor(), "event-2");
  assert.throws(() => ledger.append(event("event-2", 3)), NativeContractValidationError);
  assert.throws(() => ledger.append(event("event-3", 4)), NativeContractValidationError);
});

test("Evidence is ACS-owned, append oriented and correction aware", () => {
  const ledger = new NativeEvidenceLedger();
  const base = createEvidenceRecordV2({
    evidence_id: "evidence-1",
    kind: "execution",
    subject_ref: ref("execution", "execution-1"),
    run_id: "run-1",
    event_ref: ref("event", "event-2"),
    actor_ref: ref("executor", "executor-1"),
    source: "executor",
    classification: "internal",
    payload_digest: digest,
    created_at: 2,
  });
  ledger.append(base);
  const correction = ledger.correct({ record: { ...base, evidence_id: "evidence-2", payload_digest: "b".repeat(64), created_at: 3 }, supersedes_evidence_id: base.evidence_id });
  assert.equal(correction.correction_of, base.evidence_id);
  assert.equal(ledger.list().length, 2);
  assert.throws(() => ledger.append({ ...base, evidence_id: "evidence-3", payload_digest: "bad" }), NativeContractValidationError);
});

test("Usage and Cost records validate normalized accounting without provider authority", () => {
  const usage = createUsageRecordV2({
    usage_id: "usage-1",
    run_id: "run-1",
    task_id: "task-run-1",
    product_domain: "acs",
    agent_revision_ref: { entity_kind: "agent", entity_id: "agent-native-1", revision: 1, fingerprint: digest },
    provider_id: "provider-observation-1",
    model_id: "model-observation-1",
    executor_id: "executor-observation-1",
    measured: { input_tokens: "10.5", output_tokens: "2", tool_calls: 1 },
    measurement_source: "provider",
    observed_at: 10,
    evidence_ref: ref("evidence", "evidence-1"),
  });
  const cost = createCostRecordV2({
    cost_id: "cost-1",
    usage_ref: ref("usage", usage.usage_id),
    cost_center_path: { axodus: "axodus", product: "acs", provider: "provider-observation-1" },
    components: { provider_cost: "0.25", allocation_cost: "0.05" },
    currency: "USD",
    calculation_policy_ref: revisionRef("cost-policy"),
    status: "measured",
    created_at: 11,
  });
  assert.equal(usage.usage_id, "usage-1");
  assert.equal(cost.currency, "USD");
  assert.equal("settlement" in cost, false);
  assert.throws(() => validateUsageRecordV2({ ...usage, measured: { input_tokens: "-1" } }), NativeContractValidationError);
  assert.throws(() => validateCostRecordV2({ ...cost, components: { provider_cost: "1.2.3" } }), NativeContractValidationError);
});

test("Native runtime maps the existing durable assignment and rejects stale fencing", () => {
  const attempt = taskAttemptFromDurableAssignment({
    assignment: {
      assignmentId: "assignment-1",
      jobId: "job-1",
      workerId: "worker-1",
      workerInstanceId: "instance-1",
      leaseId: "lease-1",
      fencingToken: 7,
      assignedAt: 100,
      leaseExpiresAt: 200,
      attempt: 1,
      status: "active",
      revision: 1,
    },
  });
  assert.equal(attempt.status, "running");
  assert.equal(attempt.fencing_token, "7");
  assert.doesNotThrow(() => assertCurrentFencingToken("7", "7"));
  assert.throws(() => assertCurrentFencingToken("7", "6"), NativeContractValidationError);
  assert.equal(createTaskAttemptV2(attempt).schema_version, "1.0");
});

test("Runtime request, result and checkpoint contracts validate and round trip deterministically", () => {
  const policy = createExecutionPolicyV2({
    execution_mode: "asynchronous",
    timeout_ms: 5000,
    cancellation_mode: "cooperative",
    retry_policy_ref: revisionRef("retry-policy"),
    approval_policy_ref: revisionRef("approval-policy"),
    evidence_policy_ref: revisionRef("evidence-policy"),
    resource_limits: ref("resource-limit", "standard"),
    allowed_operations: ["execute"],
  });
  const context = createExecutionContextV2({
    execution_id: "execution-1",
    run_id: "run-1",
    task_id: "task-run-1",
    attempt: 1,
    organization_id: "org-1",
    product_domain: "acs",
    input_refs: [],
    context_artifact_refs: [],
    allowed_resource_refs: [revisionRef("resource")],
    policy_snapshot_refs: [{ policy_id: "policy-1", revision: 1, fingerprint: digest, decision_context_hash: digest }],
    authority_context: ref("authority", "authority:acs"),
  });
  const request = createExecutionRequestV2({
    request_id: "request-1",
    idempotency: idempotency("request-1"),
    correlation_id: "corr-1",
    kind: "task",
    target_ref: ref("task", "task-run-1"),
    run_id: "run-1",
    task_id: "task-run-1",
    attempt: 1,
    execution_context: context,
    execution_policy: policy,
    execution_binding_ref: ref("execution-binding", "binding-1"),
    required_evidence: [],
  });
  const result = createExecutionResultV2({
    execution_id: "execution-1",
    request_id: request.request_id,
    status: "succeeded",
    output_refs: [ref("artifact", "artifact-1")],
    artifact_refs: [],
    usage_record_refs: [],
    event_cursor: "event-2",
    completed_at: 20,
  });
  const checkpoint = createCheckpointV2({
    checkpoint_id: "checkpoint-1",
    run_id: "run-1",
    task_id: "task-run-1",
    attempt: 1,
    policy_snapshot_refs: [],
    pending_approval_refs: [],
    artifact_refs: [],
    evidence_gap_refs: [],
    created_at: 10,
  });
  const serialized = serializeRuntimeContract(request);
  assert.deepEqual(deserializeRuntimeContract(serialized, validateExecutionRequestV2), request);
  assert.equal(result.status, "succeeded");
  assert.equal(checkpoint.checkpoint_id, "checkpoint-1");
  assert.throws(() => createExecutionResultV2({ ...result, status: "invalid" }), NativeContractValidationError);
});
