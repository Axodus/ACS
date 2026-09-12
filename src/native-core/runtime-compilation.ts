import {
  ACS_NATIVE_SCHEMA_VERSION,
  EntityRef,
  freezeNative,
  Idempotency,
  NativeContractValidationError,
  RevisionRef,
  assertNoSecretMaterial,
  assertValid,
  requireSafeInteger,
  requireString,
  validateEntityRef,
  validateIdempotency,
  validateRevisionRef,
  ValidationIssue,
} from "./primitives.js";
import { validateTaskAttemptV2, type TaskAttemptV2 } from "./runtime.js";

export type RuntimeExecutionIntentStatus = "compiled" | "started" | "completed" | "rejected";

export interface RuntimeExecutionIntentV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly intent_id: string;
  readonly run_id: string;
  readonly task_id: string;
  readonly assignment_id: string;
  readonly assignment_generation: number;
  readonly member_slot_id: string;
  readonly agent_id: string;
  readonly agent_revision_ref: RevisionRef;
  readonly workforce_revision_ref: RevisionRef;
  readonly runtime_configuration: Readonly<Record<string, unknown>>;
  readonly status: RuntimeExecutionIntentStatus;
  readonly compiled_at: number;
  readonly provenance: Readonly<Record<string, unknown>>;
}

export interface RuntimeCompilationRequest {
  readonly run_id: string;
  readonly task_id: string;
  readonly assignment_id: string;
  readonly expected_assignment_id?: string;
  readonly expected_assignment_generation?: number;
  readonly idempotency: Idempotency;
  readonly intent_id?: string;
  readonly attempt_id?: string;
  readonly compiled_at?: number;
  readonly correlation_id?: string;
}

export interface RuntimeCompilationResult {
  readonly intent: RuntimeExecutionIntentV2;
  readonly attempt: TaskAttemptV2;
  readonly event_id: string;
}

function issue(path: string, code: string, message: string): ValidationIssue { return { path, code, message }; }

export function validateRuntimeExecutionIntentV2(value: unknown): RuntimeExecutionIntentV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NativeContractValidationError("invalid RuntimeExecutionIntentV2", [issue("$", "INVALID_OBJECT", "An object is required")]);
  const intent = value as Partial<RuntimeExecutionIntentV2>;
  const issues: ValidationIssue[] = [];
  if (intent.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  for (const key of ["intent_id", "run_id", "task_id", "assignment_id", "member_slot_id", "agent_id"] as const) requireString(intent[key], key, issues);
  requireSafeInteger(intent.assignment_generation, "assignment_generation", issues, 1);
  try { validateRevisionRef(intent.agent_revision_ref, "agent_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateRevisionRef(intent.workforce_revision_ref, "workforce_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!intent.runtime_configuration || typeof intent.runtime_configuration !== "object" || Array.isArray(intent.runtime_configuration)) issues.push(issue("runtime_configuration", "INVALID_OBJECT", "runtime_configuration must be an object"));
  if (!["compiled", "started", "completed", "rejected"].includes(intent.status ?? "")) issues.push(issue("status", "INVALID_ENUM", "Invalid execution intent status"));
  requireSafeInteger(intent.compiled_at, "compiled_at", issues, 0);
  if (!intent.provenance || typeof intent.provenance !== "object" || Array.isArray(intent.provenance)) issues.push(issue("provenance", "INVALID_OBJECT", "provenance must be an object"));
  assertNoSecretMaterial(value);
  return assertValid(intent as RuntimeExecutionIntentV2, issues);
}

export function createRuntimeExecutionIntentV2(input: Omit<RuntimeExecutionIntentV2, "schema_version">): RuntimeExecutionIntentV2 {
  return validateRuntimeExecutionIntentV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateRuntimeCompilationRequest(input: RuntimeCompilationRequest): void {
  const issues: ValidationIssue[] = [];
  for (const key of ["run_id", "task_id", "assignment_id"] as const) requireString(input[key], key, issues);
  if (input.expected_assignment_id !== undefined) requireString(input.expected_assignment_id, "expected_assignment_id", issues);
  if (input.expected_assignment_generation !== undefined) requireSafeInteger(input.expected_assignment_generation, "expected_assignment_generation", issues, 1);
  if (input.intent_id !== undefined) requireString(input.intent_id, "intent_id", issues);
  if (input.attempt_id !== undefined) requireString(input.attempt_id, "attempt_id", issues);
  if (input.compiled_at !== undefined) requireSafeInteger(input.compiled_at, "compiled_at", issues, 0);
  if (input.correlation_id !== undefined) requireString(input.correlation_id, "correlation_id", issues);
  try { validateIdempotency(input.idempotency); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (issues.length) throw new NativeContractValidationError("invalid runtime compilation request", issues);
}

export interface RuntimeRecoveryView {
  readonly intent: RuntimeExecutionIntentV2;
  readonly attempt: TaskAttemptV2;
  readonly assignment_current: boolean;
  readonly classification: "resumable" | "superseded_assignment" | "completed" | "invalid_binding";
}

export function validateRuntimeRecoveryView(value: RuntimeRecoveryView): RuntimeRecoveryView {
  validateRuntimeExecutionIntentV2(value.intent);
  validateTaskAttemptV2(value.attempt);
  if (typeof value.assignment_current !== "boolean") {
    throw new NativeContractValidationError("invalid RuntimeRecoveryView", [issue("assignment_current", "INVALID_BOOLEAN", "assignment_current must be a boolean")]);
  }
  if (!["resumable", "superseded_assignment", "completed", "invalid_binding"].includes(value.classification)) {
    throw new NativeContractValidationError("invalid RuntimeRecoveryView", [issue("classification", "INVALID_ENUM", "Invalid recovery classification")]);
  }
  if (value.attempt.execution_intent_id !== value.intent.intent_id
    || value.attempt.assignment_id !== value.intent.assignment_id
    || value.attempt.assignment_generation !== value.intent.assignment_generation
    || value.attempt.member_slot_id !== value.intent.member_slot_id
    || value.attempt.agent_id !== value.intent.agent_id
    || value.attempt.agent_revision_ref?.revision !== value.intent.agent_revision_ref.revision) {
    throw new NativeContractValidationError("invalid RuntimeRecoveryView", [issue("attempt", "BINDING_MISMATCH", "Attempt does not preserve the execution intent binding")]);
  }
  return value;
}
