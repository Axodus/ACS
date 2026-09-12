import type { DurableJobAssignment } from "../workers/durable-runtime-state.js";
import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  deserializeNative,
  EntityRef,
  freezeNative,
  Idempotency,
  NativeContractValidationError,
  PolicySnapshotRef,
  RevisionRef,
  Scope,
  serializeNative,
  validateEntityRef,
  validateIdempotency,
  validatePolicySnapshotRef,
  validateRevisionRef,
  validateScope,
  ValidationIssue,
  requireSafeInteger,
  requireSha256,
  requireString,
} from "./primitives.js";

export type ExecutionBindingStatus = "proposed" | "admitted" | "rejected" | "superseded";
export type RunStatus = "created" | "queued" | "running" | "waiting" | "waiting_approval" | "retrying" | "completed" | "failed" | "cancelled" | "timed_out" | "unknown";
export type TaskStatus = "planned" | "blocked" | "ready" | "leased" | "running" | "waiting_approval" | "succeeded" | "failed_retryable" | "failed_terminal" | "cancelled" | "compensating" | "compensated" | "unknown";
export type TaskAttemptStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "timed_out" | "unknown";

export interface ExecutionBindingV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly binding_id: string;
  readonly status: ExecutionBindingStatus;
  readonly plan_fingerprint: string;
  readonly agent_revision_ref?: RevisionRef;
  readonly provider_ref?: EntityRef;
  readonly model_ref?: EntityRef;
  readonly credential_reference?: EntityRef;
  readonly harness_ref: EntityRef;
  readonly executor_ref: EntityRef;
  readonly engine_ref?: EntityRef;
  readonly target_ref?: EntityRef;
  readonly capability_evidence_refs: readonly EntityRef[];
  readonly policy_snapshot_refs: readonly PolicySnapshotRef[];
  readonly economic_snapshot_refs: readonly EntityRef[];
  readonly admission_event_ref?: EntityRef;
}

export interface ExecutionContextV2 {
  readonly execution_id: string;
  readonly run_id: string;
  readonly task_id: string;
  readonly attempt: number;
  readonly organization_id: string;
  readonly product_domain: string;
  readonly agent_revision_ref?: RevisionRef;
  readonly workforce_revision_ref?: RevisionRef;
  readonly workflow_revision_ref?: RevisionRef;
  readonly input_refs: readonly EntityRef[];
  readonly context_artifact_refs: readonly EntityRef[];
  readonly allowed_resource_refs: readonly RevisionRef[];
  readonly policy_snapshot_refs: readonly PolicySnapshotRef[];
  readonly authority_context: EntityRef;
  readonly deadline?: number;
  readonly checkpoint_ref?: EntityRef;
}

export interface ExecutionPolicyV2 {
  readonly execution_mode: "synchronous" | "asynchronous";
  readonly timeout_ms?: number;
  readonly cancellation_mode: "cooperative" | "forced" | "unsupported";
  readonly retry_policy_ref: RevisionRef;
  readonly approval_policy_ref: RevisionRef;
  readonly evidence_policy_ref: RevisionRef;
  readonly resource_limits: EntityRef;
  readonly allowed_operations: readonly string[];
}

export interface ExecutionRequestV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly request_id: string;
  readonly idempotency: Idempotency;
  readonly correlation_id: string;
  readonly kind: "agent" | "task" | "workflow" | "workforce";
  readonly target_ref: RevisionRef | EntityRef;
  readonly run_id?: string;
  readonly task_id?: string;
  readonly attempt: number;
  readonly execution_context: ExecutionContextV2;
  readonly execution_policy: ExecutionPolicyV2;
  readonly execution_binding_ref: EntityRef;
  readonly required_evidence: readonly EntityRef[];
}

export interface ExecutionResultV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly execution_id: string;
  readonly request_id: string;
  readonly status: "accepted" | "running" | "succeeded" | "failed" | "cancelled" | "timed_out" | "unknown";
  readonly output_refs: readonly EntityRef[];
  readonly artifact_refs: readonly EntityRef[];
  readonly usage_record_refs: readonly EntityRef[];
  readonly event_cursor?: string;
  readonly error?: EntityRef;
  readonly completed_at?: number;
}

export interface RunV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly run_id: string;
  readonly kind: "agent" | "task" | "workflow" | "workforce";
  readonly scope: Scope;
  readonly definition_refs: {
    readonly agent_revision_ref?: RevisionRef;
    readonly workforce_revision_ref?: RevisionRef;
    readonly workflow_revision_ref?: RevisionRef;
  };
  readonly status: RunStatus;
  readonly idempotency: Idempotency;
  readonly execution_binding_refs: readonly EntityRef[];
  readonly checkpoint_ref?: EntityRef;
  readonly lease_ref?: EntityRef;
  readonly fencing_token?: string;
  readonly created_at: number;
  readonly started_at?: number;
  readonly completed_at?: number;
}

export interface TaskV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly task_run_id: string;
  readonly run_id: string;
  readonly node_id: string;
  readonly status: TaskStatus;
  readonly logical_idempotency_key: string;
  readonly current_attempt: number;
  readonly checkpoint_ref?: EntityRef;
}

export interface TaskAttemptV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly attempt_id: string;
  readonly task_run_id: string;
  readonly attempt: number;
  readonly dispatch_key: string;
  readonly execution_id?: string;
  readonly execution_intent_id?: string;
  readonly assignment_id?: string;
  readonly assignment_generation?: number;
  readonly member_slot_id?: string;
  readonly agent_id?: string;
  readonly agent_revision_ref?: RevisionRef;
  readonly workforce_revision_ref?: RevisionRef;
  readonly lease_ref?: EntityRef;
  readonly fencing_token?: string;
  readonly status: TaskAttemptStatus;
  readonly started_at?: number;
  readonly completed_at?: number;
}

export interface CheckpointV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly checkpoint_id: string;
  readonly run_id: string;
  readonly task_id?: string;
  readonly workflow_revision_ref?: RevisionRef;
  readonly graph_fingerprint?: string;
  readonly attempt: number;
  readonly assignment_ref?: EntityRef;
  readonly lease_ref?: EntityRef;
  readonly fencing_token?: string;
  readonly executor_handle_ref?: EntityRef;
  readonly policy_snapshot_refs: readonly PolicySnapshotRef[];
  readonly pending_approval_refs: readonly EntityRef[];
  readonly artifact_refs: readonly EntityRef[];
  readonly evidence_gap_refs: readonly EntityRef[];
  readonly created_at: number;
}

export interface EventEnvelopeV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly event_id: string;
  readonly event_type: string;
  readonly timestamp: number;
  readonly sequence: number;
  readonly organization_id: string;
  readonly product_domain: string;
  readonly tenant_id?: string;
  readonly run_id?: string;
  readonly task_id?: string;
  readonly attempt?: number;
  readonly agent_id?: string;
  readonly workforce_id?: string;
  readonly workflow_id?: string;
  readonly actor: {
    readonly kind: "system" | "human" | "service" | "executor" | "provider" | "planner" | "tool";
    readonly ref?: string;
  };
  readonly source: "acs" | "executor" | "provider" | "planner" | "tool" | "product" | "human";
  readonly correlation_id: string;
  readonly causation_id?: string;
  readonly idempotency_key?: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface RunTransitionContext {
  readonly admission_decision_ref?: EntityRef;
  readonly binding_ref?: EntityRef;
  readonly policy_snapshot_ref?: PolicySnapshotRef;
  readonly idempotency_recorded?: boolean;
  readonly lease_ref?: EntityRef;
  readonly fencing_token?: string;
  readonly checkpoint_ref?: EntityRef;
  readonly external_wait_ref?: EntityRef;
  readonly retryable_failure?: boolean;
  readonly remaining_deadline?: boolean;
  readonly terminal_result?: boolean;
  readonly failure_ref?: EntityRef;
  readonly cancellation_authorized?: boolean;
  readonly approval_decision_ref?: EntityRef;
  readonly retry_admitted?: boolean;
  readonly reconciliation_complete?: boolean;
}

export interface TaskTransitionContext {
  readonly dependency_satisfied?: boolean;
  readonly assignment_ref?: EntityRef;
  readonly lease_ref?: EntityRef;
  readonly fencing_token?: string;
  readonly worker_started?: boolean;
  readonly approval_decision_ref?: EntityRef;
  readonly terminal_result?: boolean;
  readonly retryable_failure?: boolean;
  readonly retry_admitted?: boolean;
  readonly compensation_authorized?: boolean;
  readonly compensation_succeeded?: boolean;
}

const RUN_TRANSITIONS: Readonly<Record<RunStatus, readonly RunStatus[]>> = {
  created: ["queued", "waiting_approval", "failed", "unknown"],
  queued: ["running", "cancelled", "unknown"],
  running: ["waiting", "waiting_approval", "retrying", "completed", "failed", "cancelled", "timed_out", "unknown"],
  waiting: ["running", "cancelled", "unknown"],
  waiting_approval: ["running", "failed", "unknown"],
  retrying: ["queued", "failed", "unknown"],
  timed_out: ["retrying", "failed", "unknown"],
  completed: [],
  failed: [],
  cancelled: [],
  unknown: ["running", "failed", "cancelled", "retrying"],
};

const TASK_TRANSITIONS: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  planned: ["blocked", "ready", "unknown"],
  blocked: ["ready", "unknown"],
  ready: ["leased", "unknown"],
  leased: ["running", "ready", "unknown"],
  running: ["waiting_approval", "succeeded", "failed_retryable", "failed_terminal", "cancelled", "compensating", "unknown"],
  waiting_approval: ["running", "failed_terminal", "unknown"],
  failed_retryable: ["ready", "failed_terminal", "unknown"],
  compensating: ["compensated", "failed_terminal", "unknown"],
  succeeded: [],
  failed_terminal: [],
  cancelled: [],
  compensated: [],
  unknown: ["ready", "running", "failed_terminal", "cancelled"],
};

function invalidObject(name: string): never {
  throw new NativeContractValidationError(`invalid ${name}`, [{ path: "$", code: "INVALID_OBJECT", message: `${name} must be an object` }]);
}

function validateRefList(value: unknown, path: string): readonly EntityRef[] {
  if (!Array.isArray(value)) throw new NativeContractValidationError("invalid reference list", [{ path, code: "INVALID_LIST", message: "An array is required" }]);
  return value.map((entry, index) => validateEntityRef(entry, `${path}[${index}]`));
}

function validateRevisionRefList(value: unknown, path: string): readonly RevisionRef[] {
  if (!Array.isArray(value)) throw new NativeContractValidationError("invalid revision reference list", [{ path, code: "INVALID_LIST", message: "An array is required" }]);
  return value.map((entry, index) => validateRevisionRef(entry, `${path}[${index}]`));
}

function validateTimestampOrder(value: { readonly started_at?: number; readonly completed_at?: number }, issues: ValidationIssue[]): void {
  if (value.started_at !== undefined) requireSafeInteger(value.started_at, "started_at", issues, 0);
  if (value.completed_at !== undefined) requireSafeInteger(value.completed_at, "completed_at", issues, 0);
  if (value.started_at !== undefined && value.completed_at !== undefined && value.completed_at < value.started_at) {
    issues.push({ path: "completed_at", code: "TIMESTAMP_ORDER", message: "completed_at cannot precede started_at" });
  }
}

function validateKind(value: unknown, path: string, issues: ValidationIssue[]): asserts value is "agent" | "task" | "workflow" | "workforce" {
  if (!["agent", "task", "workflow", "workforce"].includes(value as string)) issues.push({ path, code: "INVALID_ENUM", message: "Invalid execution kind" });
}

function validateTargetRef(value: unknown, path: string): RevisionRef | EntityRef {
  if (value && typeof value === "object" && "entity_kind" in value) return validateRevisionRef(value, path);
  return validateEntityRef(value, path);
}

export function validateExecutionBindingV2(value: unknown): ExecutionBindingV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("ExecutionBinding");
  const binding = value as Partial<ExecutionBindingV2>;
  const issues: ValidationIssue[] = [];
  if (binding.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  if (typeof binding.binding_id !== "string" || binding.binding_id.trim().length === 0) issues.push({ path: "binding_id", code: "REQUIRED_STRING", message: "A non-empty string is required" });
  requireSha256(binding.plan_fingerprint, "plan_fingerprint", issues);
  if (!["proposed", "admitted", "rejected", "superseded"].includes(binding.status ?? "")) issues.push({ path: "status", code: "INVALID_ENUM", message: "Invalid binding status" });
  for (const key of ["harness_ref", "executor_ref"] as const) try { validateEntityRef(binding[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  for (const key of ["provider_ref", "model_ref", "credential_reference", "engine_ref", "target_ref", "admission_event_ref"] as const) if (binding[key] !== undefined) try { validateEntityRef(binding[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (binding.agent_revision_ref) try { validateRevisionRef(binding.agent_revision_ref, "agent_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  for (const key of ["capability_evidence_refs", "economic_snapshot_refs"] as const) {
    try { validateRefList(binding[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  if (!Array.isArray(binding.policy_snapshot_refs)) issues.push({ path: "policy_snapshot_refs", code: "INVALID_LIST", message: "policy_snapshot_refs must be an array" });
  else binding.policy_snapshot_refs.forEach((entry, index) => { try { validatePolicySnapshotRef(entry, `policy_snapshot_refs[${index}]`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); } });
  assertNoSecretMaterial(value);
  return assertValid(binding as ExecutionBindingV2, issues);
}

export function createExecutionBindingV2(input: Omit<ExecutionBindingV2, "schema_version">): ExecutionBindingV2 {
  return validateExecutionBindingV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateExecutionContextV2(value: unknown): ExecutionContextV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("ExecutionContext");
  const context = value as Partial<ExecutionContextV2>;
  const issues: ValidationIssue[] = [];
  for (const key of ["execution_id", "run_id", "task_id", "organization_id", "product_domain"] as const) requireString(context[key], key, issues);
  requireSafeInteger(context.attempt, "attempt", issues, 1);
  for (const key of ["agent_revision_ref", "workforce_revision_ref", "workflow_revision_ref"] as const) if (context[key] !== undefined) {
    try { validateRevisionRef(context[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  for (const key of ["input_refs", "context_artifact_refs"] as const) {
    try { validateRefList(context[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  try { validateRevisionRefList(context.allowed_resource_refs, "allowed_resource_refs"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!Array.isArray(context.policy_snapshot_refs)) issues.push({ path: "policy_snapshot_refs", code: "INVALID_LIST", message: "policy_snapshot_refs must be an array" });
  else context.policy_snapshot_refs.forEach((entry, index) => { try { validatePolicySnapshotRef(entry, `policy_snapshot_refs[${index}]`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); } });
  try { validateEntityRef(context.authority_context, "authority_context"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (context.deadline !== undefined) requireSafeInteger(context.deadline, "deadline", issues, 0);
  if (context.checkpoint_ref !== undefined) try { validateEntityRef(context.checkpoint_ref, "checkpoint_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  assertNoSecretMaterial(value);
  return assertValid(context as ExecutionContextV2, issues);
}

export function createExecutionContextV2(input: ExecutionContextV2): ExecutionContextV2 {
  return validateExecutionContextV2(freezeNative(input));
}

export function validateExecutionPolicyV2(value: unknown): ExecutionPolicyV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("ExecutionPolicy");
  const policy = value as Partial<ExecutionPolicyV2>;
  const issues: ValidationIssue[] = [];
  if (!["synchronous", "asynchronous"].includes(policy.execution_mode ?? "")) issues.push({ path: "execution_mode", code: "INVALID_ENUM", message: "Invalid execution mode" });
  if (policy.timeout_ms !== undefined) requireSafeInteger(policy.timeout_ms, "timeout_ms", issues, 1);
  if (!["cooperative", "forced", "unsupported"].includes(policy.cancellation_mode ?? "")) issues.push({ path: "cancellation_mode", code: "INVALID_ENUM", message: "Invalid cancellation mode" });
  for (const key of ["retry_policy_ref", "approval_policy_ref", "evidence_policy_ref"] as const) try { validateRevisionRef(policy[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateEntityRef(policy.resource_limits, "resource_limits"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!Array.isArray(policy.allowed_operations) || policy.allowed_operations.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) issues.push({ path: "allowed_operations", code: "INVALID_STRING_LIST", message: "allowed_operations must contain non-empty strings" });
  assertNoSecretMaterial(value);
  return assertValid(policy as ExecutionPolicyV2, issues);
}

export function createExecutionPolicyV2(input: ExecutionPolicyV2): ExecutionPolicyV2 {
  return validateExecutionPolicyV2(freezeNative(input));
}

export function validateExecutionRequestV2(value: unknown): ExecutionRequestV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("ExecutionRequest");
  const request = value as Partial<ExecutionRequestV2>;
  const issues: ValidationIssue[] = [];
  if (request.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["request_id", "correlation_id"] as const) requireString(request[key], key, issues);
  try { validateIdempotency(request.idempotency, "idempotency"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  validateKind(request.kind, "kind", issues);
  try { validateTargetRef(request.target_ref, "target_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  for (const key of ["run_id", "task_id"] as const) if (request[key] !== undefined) requireString(request[key], key, issues);
  requireSafeInteger(request.attempt, "attempt", issues, 1);
  try { validateExecutionContextV2(request.execution_context); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateExecutionPolicyV2(request.execution_policy); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateEntityRef(request.execution_binding_ref, "execution_binding_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateRefList(request.required_evidence, "required_evidence"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  assertNoSecretMaterial(value);
  return assertValid(request as ExecutionRequestV2, issues);
}

export function createExecutionRequestV2(input: Omit<ExecutionRequestV2, "schema_version">): ExecutionRequestV2 {
  return validateExecutionRequestV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateExecutionResultV2(value: unknown): ExecutionResultV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("ExecutionResult");
  const result = value as Partial<ExecutionResultV2>;
  const issues: ValidationIssue[] = [];
  if (result.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["execution_id", "request_id"] as const) requireString(result[key], key, issues);
  if (!["accepted", "running", "succeeded", "failed", "cancelled", "timed_out", "unknown"].includes(result.status ?? "")) issues.push({ path: "status", code: "INVALID_ENUM", message: "Invalid execution result status" });
  for (const key of ["output_refs", "artifact_refs", "usage_record_refs"] as const) try { validateRefList(result[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (result.event_cursor !== undefined) requireString(result.event_cursor, "event_cursor", issues);
  if (result.error !== undefined) try { validateEntityRef(result.error, "error"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (result.completed_at !== undefined) requireSafeInteger(result.completed_at, "completed_at", issues, 0);
  assertNoSecretMaterial(value);
  return assertValid(result as ExecutionResultV2, issues);
}

export function createExecutionResultV2(input: Omit<ExecutionResultV2, "schema_version">): ExecutionResultV2 {
  return validateExecutionResultV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateRunV2(value: unknown): RunV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("Run");
  const run = value as Partial<RunV2>;
  const issues: ValidationIssue[] = [];
  if (run.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  requireString(run.run_id, "run_id", issues);
  validateKind(run.kind, "kind", issues);
  try { validateScope(run.scope, "scope"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!run.definition_refs || typeof run.definition_refs !== "object" || Array.isArray(run.definition_refs)) issues.push({ path: "definition_refs", code: "REQUIRED_OBJECT", message: "definition_refs is required" });
  else for (const key of ["agent_revision_ref", "workforce_revision_ref", "workflow_revision_ref"] as const) if (run.definition_refs[key] !== undefined) try { validateRevisionRef(run.definition_refs[key], `definition_refs.${key}`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!["created", "queued", "running", "waiting", "waiting_approval", "retrying", "completed", "failed", "cancelled", "timed_out", "unknown"].includes(run.status ?? "")) issues.push({ path: "status", code: "INVALID_ENUM", message: "Invalid Run status" });
  try { validateIdempotency(run.idempotency); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateRefList(run.execution_binding_refs, "execution_binding_refs"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  for (const key of ["checkpoint_ref", "lease_ref"] as const) if (run[key] !== undefined) try { validateEntityRef(run[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (run.fencing_token !== undefined) requireString(run.fencing_token, "fencing_token", issues);
  requireSafeInteger(run.created_at, "created_at", issues, 0);
  validateTimestampOrder(run, issues);
  assertNoSecretMaterial(value);
  return assertValid(run as RunV2, issues);
}

export function createRunV2(input: Omit<RunV2, "schema_version">): RunV2 {
  return validateRunV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateTaskV2(value: unknown): TaskV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("Task");
  const task = value as Partial<TaskV2>;
  const issues: ValidationIssue[] = [];
  if (task.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["task_run_id", "run_id", "node_id", "logical_idempotency_key"] as const) requireString(task[key], key, issues);
  if (!["planned", "blocked", "ready", "leased", "running", "waiting_approval", "succeeded", "failed_retryable", "failed_terminal", "cancelled", "compensating", "compensated", "unknown"].includes(task.status ?? "")) issues.push({ path: "status", code: "INVALID_ENUM", message: "Invalid Task status" });
  requireSafeInteger(task.current_attempt, "current_attempt", issues, 1);
  if (task.checkpoint_ref !== undefined) try { validateEntityRef(task.checkpoint_ref, "checkpoint_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  assertNoSecretMaterial(value);
  return assertValid(task as TaskV2, issues);
}

export function createTaskV2(input: Omit<TaskV2, "schema_version">): TaskV2 {
  return validateTaskV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateTaskAttemptV2(value: unknown): TaskAttemptV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("TaskAttempt");
  const attempt = value as Partial<TaskAttemptV2>;
  const issues: ValidationIssue[] = [];
  if (attempt.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["attempt_id", "task_run_id", "dispatch_key", "status"] as const) requireString(attempt[key], key, issues);
  requireSafeInteger(attempt.attempt, "attempt", issues, 1);
  if (attempt.execution_id !== undefined) requireString(attempt.execution_id, "execution_id", issues);
  if (attempt.execution_intent_id !== undefined) requireString(attempt.execution_intent_id, "execution_intent_id", issues);
  if (attempt.assignment_id !== undefined) requireString(attempt.assignment_id, "assignment_id", issues);
  if (attempt.assignment_generation !== undefined) requireSafeInteger(attempt.assignment_generation, "assignment_generation", issues, 1);
  for (const key of ["member_slot_id", "agent_id"] as const) if (attempt[key] !== undefined) requireString(attempt[key], key, issues);
  if (attempt.agent_revision_ref !== undefined) try { validateRevisionRef(attempt.agent_revision_ref, "agent_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (attempt.workforce_revision_ref !== undefined) try { validateRevisionRef(attempt.workforce_revision_ref, "workforce_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (attempt.lease_ref !== undefined) try { validateEntityRef(attempt.lease_ref, "lease_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (attempt.fencing_token !== undefined) requireString(attempt.fencing_token, "fencing_token", issues);
  if (!["queued", "running", "succeeded", "failed", "cancelled", "timed_out", "unknown"].includes(attempt.status ?? "")) issues.push({ path: "status", code: "INVALID_ENUM", message: "Invalid TaskAttempt status" });
  validateTimestampOrder(attempt, issues);
  assertNoSecretMaterial(value);
  return assertValid(attempt as TaskAttemptV2, issues);
}

export function createTaskAttemptV2(input: Omit<TaskAttemptV2, "schema_version">): TaskAttemptV2 {
  return validateTaskAttemptV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateCheckpointV2(value: unknown): CheckpointV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("Checkpoint");
  const checkpoint = value as Partial<CheckpointV2>;
  const issues: ValidationIssue[] = [];
  if (checkpoint.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["checkpoint_id", "run_id"] as const) requireString(checkpoint[key], key, issues);
  if (checkpoint.task_id !== undefined) requireString(checkpoint.task_id, "task_id", issues);
  if (checkpoint.workflow_revision_ref !== undefined) try { validateRevisionRef(checkpoint.workflow_revision_ref, "workflow_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (checkpoint.graph_fingerprint !== undefined) requireSha256(checkpoint.graph_fingerprint, "graph_fingerprint", issues);
  requireSafeInteger(checkpoint.attempt, "attempt", issues, 1);
  for (const key of ["assignment_ref", "lease_ref", "executor_handle_ref"] as const) if (checkpoint[key] !== undefined) try { validateEntityRef(checkpoint[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (checkpoint.fencing_token !== undefined) requireString(checkpoint.fencing_token, "fencing_token", issues);
  if (!Array.isArray(checkpoint.policy_snapshot_refs)) issues.push({ path: "policy_snapshot_refs", code: "INVALID_LIST", message: "policy_snapshot_refs must be an array" });
  else checkpoint.policy_snapshot_refs.forEach((entry, index) => { try { validatePolicySnapshotRef(entry, `policy_snapshot_refs[${index}]`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); } });
  for (const key of ["pending_approval_refs", "artifact_refs", "evidence_gap_refs"] as const) try { validateRefList(checkpoint[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireSafeInteger(checkpoint.created_at, "created_at", issues, 0);
  assertNoSecretMaterial(value);
  return assertValid(checkpoint as CheckpointV2, issues);
}

export function createCheckpointV2(input: Omit<CheckpointV2, "schema_version">): CheckpointV2 {
  return validateCheckpointV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function transitionRunV2(run: RunV2, next: RunStatus, context: RunTransitionContext = {}): RunV2 {
  if (!RUN_TRANSITIONS[run.status].includes(next)) throw new NativeContractValidationError("run transition is not allowed", [{ path: "status", code: "INVALID_TRANSITION", message: `${run.status} -> ${next} is forbidden` }]);
  const missing: string[] = [];
  if (run.status === "created" && next === "queued") {
    if (!context.admission_decision_ref) missing.push("admission_decision_ref");
    if (!context.binding_ref) missing.push("binding_ref");
    if (!context.policy_snapshot_ref) missing.push("policy_snapshot_ref");
    if (!context.idempotency_recorded) missing.push("idempotency_recorded");
  }
  if (run.status === "queued" && next === "running") {
    if (!context.lease_ref) missing.push("lease_ref");
    if (!context.fencing_token) missing.push("fencing_token");
  }
  if (run.status === "running" && next === "waiting" && !context.checkpoint_ref && !context.external_wait_ref) missing.push("checkpoint_ref or external_wait_ref");
  if (run.status === "running" && next === "retrying" && (!context.retryable_failure || context.remaining_deadline === false || context.reconciliation_complete === false)) missing.push("retryable_failure, remaining_deadline, reconciliation_complete");
  if (run.status === "running" && next === "completed" && !context.terminal_result) missing.push("terminal_result");
  if (run.status === "running" && next === "failed" && !context.failure_ref) missing.push("failure_ref");
  if (run.status === "running" && next === "cancelled" && !context.cancellation_authorized) missing.push("cancellation_authorized");
  if (run.status === "waiting" && next === "running" && !context.checkpoint_ref) missing.push("checkpoint_ref");
  if (run.status === "waiting_approval" && next === "running" && !context.approval_decision_ref) missing.push("approval_decision_ref");
  if ((run.status === "retrying" && next === "queued") || (run.status === "timed_out" && next === "retrying")) if (!context.retry_admitted) missing.push("retry_admitted");
  if (missing.length > 0) throw new NativeContractValidationError("run transition guard failed", missing.map((path) => ({ path, code: "MISSING_TRANSITION_GUARD", message: `Required guard ${path} was not supplied` })));
  const terminal = next === "completed" || next === "failed" || next === "cancelled";
  return freezeNative({ ...run, status: next, ...(next === "running" && !run.started_at ? { started_at: Date.now() } : {}), ...(terminal ? { completed_at: Date.now() } : {}) });
}

export function transitionTaskV2(task: TaskV2, next: TaskStatus, context: TaskTransitionContext = {}): TaskV2 {
  if (!TASK_TRANSITIONS[task.status].includes(next)) throw new NativeContractValidationError("task transition is not allowed", [{ path: "status", code: "INVALID_TRANSITION", message: `${task.status} -> ${next} is forbidden` }]);
  const missing: string[] = [];
  if (task.status === "planned" && next === "blocked" && context.dependency_satisfied) missing.push("dependency_satisfied=false");
  if (task.status === "planned" && next === "ready" && context.dependency_satisfied !== true) missing.push("dependency_satisfied");
  if (task.status === "ready" && next === "leased" && (!context.assignment_ref || !context.lease_ref || !context.fencing_token)) missing.push("assignment_ref, lease_ref, fencing_token");
  if (task.status === "leased" && next === "running" && !context.worker_started) missing.push("worker_started");
  if (task.status === "running" && next === "waiting_approval" && !context.approval_decision_ref) missing.push("approval_decision_ref");
  if (task.status === "running" && next === "succeeded" && !context.terminal_result) missing.push("terminal_result");
  if (task.status === "running" && next === "failed_retryable" && !context.retryable_failure) missing.push("retryable_failure");
  if (task.status === "failed_retryable" && next === "ready" && !context.retry_admitted) missing.push("retry_admitted");
  if (task.status === "compensating" && next === "compensated" && !context.compensation_succeeded) missing.push("compensation_succeeded");
  if (missing.length > 0) throw new NativeContractValidationError("task transition guard failed", missing.map((path) => ({ path, code: "MISSING_TRANSITION_GUARD", message: `Required guard ${path} was not supplied` })));
  return freezeNative({ ...task, status: next, ...(next === "ready" && task.status === "failed_retryable" ? { current_attempt: task.current_attempt + 1 } : {}) });
}

export function taskAttemptFromDurableAssignment(input: { readonly assignment: DurableJobAssignment; readonly execution_id?: string }): TaskAttemptV2 {
  const assignment = input.assignment;
  return createTaskAttemptV2({
    attempt_id: assignment.assignmentId,
    task_run_id: assignment.jobId,
    attempt: assignment.attempt,
    dispatch_key: `${assignment.jobId}:${assignment.attempt}`,
    ...(input.execution_id ? { execution_id: input.execution_id } : {}),
    lease_ref: { kind: "runtime-lease", id: assignment.leaseId },
    fencing_token: String(assignment.fencingToken),
    status: assignment.status === "active" ? "running" : assignment.status === "completed" ? "succeeded" : assignment.status === "cancelled" ? "cancelled" : assignment.status === "expired" ? "unknown" : "failed",
    started_at: assignment.assignedAt,
    ...(assignment.status !== "active" ? { completed_at: assignment.assignedAt } : {}),
  });
}

export function assertCurrentFencingToken(expected: string, observed: string): void {
  if (expected !== observed) throw new NativeContractValidationError("stale fencing token", [{ path: "fencing_token", code: "STALE_FENCING_TOKEN", message: "Mutation was rejected because the durable runtime fencing token is stale" }]);
}

export function validateEventEnvelopeV2(value: unknown): EventEnvelopeV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("EventEnvelope");
  const event = value as Partial<EventEnvelopeV2>;
  const issues: ValidationIssue[] = [];
  if (event.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["event_id", "event_type", "organization_id", "product_domain", "correlation_id"] as const) if (typeof event[key] !== "string" || event[key].trim().length === 0) issues.push({ path: key, code: "REQUIRED_STRING", message: "A non-empty string is required" });
  if (!Number.isSafeInteger(event.timestamp) || (event.timestamp ?? 0) < 0) issues.push({ path: "timestamp", code: "INVALID_TIMESTAMP", message: "timestamp must be non-negative" });
  if (!Number.isSafeInteger(event.sequence) || (event.sequence ?? 0) < 1) issues.push({ path: "sequence", code: "INVALID_SEQUENCE", message: "sequence must be >= 1" });
  if (!event.actor || typeof event.actor !== "object" || !["system", "human", "service", "executor", "provider", "planner", "tool"].includes(event.actor.kind ?? "")) issues.push({ path: "actor", code: "INVALID_ACTOR", message: "actor kind is invalid" });
  if (!["acs", "executor", "provider", "planner", "tool", "product", "human"].includes(event.source ?? "")) issues.push({ path: "source", code: "INVALID_ENUM", message: "Invalid event source" });
  if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) issues.push({ path: "payload", code: "INVALID_OBJECT", message: "payload must be an object" });
  if (event.attempt !== undefined && (!Number.isSafeInteger(event.attempt) || event.attempt < 1)) issues.push({ path: "attempt", code: "INVALID_INTEGER", message: "attempt must be >= 1" });
  assertNoSecretMaterial(value);
  return assertValid(event as EventEnvelopeV2, issues);
}

export function createEventEnvelopeV2(input: Omit<EventEnvelopeV2, "schema_version">): EventEnvelopeV2 {
  return validateEventEnvelopeV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export class NativeEventLedger {
  readonly #events: EventEnvelopeV2[] = [];
  readonly #eventIds = new Set<string>();

  append(event: EventEnvelopeV2): EventEnvelopeV2 {
    validateEventEnvelopeV2(event);
    if (this.#eventIds.has(event.event_id)) throw new NativeContractValidationError("event id already exists", [{ path: "event_id", code: "DUPLICATE_EVENT_ID", message: "Event identity is immutable and unique" }]);
    const previous = this.#events.at(-1);
    if (previous && event.sequence !== previous.sequence + 1) throw new NativeContractValidationError("event sequence is not monotonic", [{ path: "sequence", code: "NON_MONOTONIC_SEQUENCE", message: "Event sequence must increase by one in the ledger scope" }]);
    this.#events.push(event);
    this.#eventIds.add(event.event_id);
    return event;
  }

  list(): readonly EventEnvelopeV2[] { return [...this.#events]; }
  cursor(): string | undefined { return this.#events.at(-1)?.event_id; }
}

export function serializeRuntimeContract(value: unknown): string {
  return serializeNative(value);
}

export function deserializeRuntimeContract<T>(serialized: string, validate: (value: unknown) => T): T {
  return deserializeNative(serialized, validate);
}
