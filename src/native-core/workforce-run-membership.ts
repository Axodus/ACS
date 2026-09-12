import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  EntityRef,
  freezeNative,
  Idempotency,
  NativeContractValidationError,
  RevisionRef,
  Scope,
  validateEntityRef,
  validateIdempotency,
  validateRevisionRef,
  validateScope,
  ValidationIssue,
} from "./primitives.js";
import { validateRunV2, type RunV2 } from "./runtime.js";

export type WorkforceRunResolutionMode = "pinned" | "current_head_at_admission";

export interface WorkforceRunMembershipV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly snapshot_id: string;
  readonly run_id: string;
  readonly workforce_revision_ref: RevisionRef;
  readonly slot_id: string;
  readonly resolved_agent_revision_ref: RevisionRef;
  readonly agent_id: string;
  readonly role_ref?: RevisionRef;
  readonly resolution_mode: WorkforceRunResolutionMode;
  readonly resolved_at: number;
  readonly authority_decision_ref?: EntityRef;
}

export interface WorkforceRunAdmissionRequest {
  readonly run: Omit<RunV2, "schema_version" | "definition_refs" | "kind" | "status"> & {
    readonly scope: Scope;
    readonly idempotency: Idempotency;
  };
  readonly workforce_id: string;
  readonly workforce_revision?: number;
  readonly idempotency: Idempotency;
  readonly authority_decision_ref?: EntityRef;
  readonly admitted_at: number;
}

export interface WorkforceRunAdmissionResult {
  readonly run: RunV2;
  readonly snapshot_id: string;
  readonly members: readonly WorkforceRunMembershipV2[];
  readonly event_id: string;
}

function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

export function validateWorkforceRunMembershipV2(value: unknown): WorkforceRunMembershipV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NativeContractValidationError("invalid WorkforceRunMembershipV2", [issue("$", "INVALID_OBJECT", "An object is required")]);
  }
  const member = value as Partial<WorkforceRunMembershipV2>;
  const issues: ValidationIssue[] = [];
  if (member.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  for (const key of ["snapshot_id", "run_id", "slot_id", "agent_id"] as const) {
    if (typeof member[key] !== "string" || member[key]!.trim().length === 0) issues.push(issue(key, "REQUIRED_STRING", "A non-empty string is required"));
  }
  try { validateRevisionRef(member.workforce_revision_ref, "workforce_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateRevisionRef(member.resolved_agent_revision_ref, "resolved_agent_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (member.workforce_revision_ref?.entity_kind !== "workforce") issues.push(issue("workforce_revision_ref.entity_kind", "INVALID_ENTITY_KIND", "A Workforce revision is required"));
  if (member.resolved_agent_revision_ref?.entity_kind !== "agent") issues.push(issue("resolved_agent_revision_ref.entity_kind", "INVALID_ENTITY_KIND", "An Agent revision is required"));
  if (member.role_ref !== undefined) try { validateRevisionRef(member.role_ref, "role_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!["pinned", "current_head_at_admission"].includes(member.resolution_mode ?? "")) issues.push(issue("resolution_mode", "INVALID_ENUM", "Invalid resolution mode"));
  if (!Number.isSafeInteger(member.resolved_at) || (member.resolved_at ?? 0) < 0) issues.push(issue("resolved_at", "INVALID_TIMESTAMP", "resolved_at must be a non-negative safe integer"));
  if (member.authority_decision_ref !== undefined) try { validateEntityRef(member.authority_decision_ref, "authority_decision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  assertNoSecretMaterial(value);
  return assertValid(member as WorkforceRunMembershipV2, issues);
}

export function validateWorkforceRunAdmissionRequest(value: WorkforceRunAdmissionRequest): void {
  const issues: ValidationIssue[] = [];
  try { validateScope(value.run.scope, "run.scope"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateIdempotency(value.idempotency); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateIdempotency(value.run.idempotency); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (value.run.idempotency.key !== value.idempotency.key) issues.push(issue("run.idempotency.key", "IDEMPOTENCY_MISMATCH", "Run and admission idempotency keys must match"));
  if (typeof value.workforce_id !== "string" || value.workforce_id.trim().length === 0) issues.push(issue("workforce_id", "REQUIRED_STRING", "A Workforce id is required"));
  if (value.workforce_revision !== undefined && (!Number.isSafeInteger(value.workforce_revision) || value.workforce_revision < 1)) issues.push(issue("workforce_revision", "INVALID_INTEGER", "workforce_revision must be >= 1"));
  if (!Number.isSafeInteger(value.admitted_at) || value.admitted_at < 0) issues.push(issue("admitted_at", "INVALID_TIMESTAMP", "admitted_at must be a non-negative safe integer"));
  if (value.authority_decision_ref !== undefined) try { validateEntityRef(value.authority_decision_ref, "authority_decision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (issues.length) throw new NativeContractValidationError("invalid Workforce Run admission request", issues);
}

export function createWorkforceRunMembershipV2(input: Omit<WorkforceRunMembershipV2, "schema_version">): WorkforceRunMembershipV2 {
  return validateWorkforceRunMembershipV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}
