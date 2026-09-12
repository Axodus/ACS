import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  EntityRef,
  freezeNative,
  Idempotency,
  NativeContractValidationError,
  RevisionRef,
  requireSafeInteger,
  requireString,
  validateEntityRef,
  validateIdempotency,
  validateRevisionRef,
  ValidationIssue,
} from "./primitives.js";

export type CoordinationProposalKind = "assignment" | "reassignment";
export type CoordinationProposalSource = "acs" | "human" | "adapter" | "policy" | "other";
export type CoordinationDecisionStatus = "accepted" | "rejected" | "approval_required";

export interface CoordinationProposalV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly proposal_id: string;
  readonly run_id: string;
  readonly task_id: string;
  readonly proposal_kind: CoordinationProposalKind;
  readonly target_member_slot_id: string;
  readonly source: CoordinationProposalSource;
  readonly source_ref?: EntityRef;
  readonly reason: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly created_at: number;
  readonly correlation_id: string;
  readonly idempotency: Idempotency;
}

export interface CoordinationDecisionV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly decision_id: string;
  readonly run_id: string;
  readonly task_id: string;
  readonly status: CoordinationDecisionStatus;
  readonly proposal_id?: string;
  readonly selected_member_slot_id?: string;
  readonly reason: string;
  readonly authority_ref: EntityRef;
  readonly source: CoordinationProposalSource;
  readonly prior_assignment_id?: string;
  readonly expected_assignment_id?: string;
  readonly decided_at: number;
  readonly correlation_id: string;
  readonly idempotency: Idempotency;
}

export interface TaskAssignmentV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly assignment_id: string;
  readonly run_id: string;
  readonly task_id: string;
  readonly member_slot_id: string;
  readonly workforce_revision_ref: RevisionRef;
  readonly resolved_agent_revision_ref: RevisionRef;
  readonly agent_id: string;
  readonly decision_id: string;
  readonly generation: number;
  readonly created_at: number;
  readonly supersedes_assignment_id?: string;
  readonly provenance: Readonly<Record<string, unknown>>;
}

export interface CoordinationRecordResult {
  readonly proposal: CoordinationProposalV2;
  readonly decision?: CoordinationDecisionV2;
  readonly assignment?: TaskAssignmentV2;
  readonly event_id?: string;
}

function issue(path: string, code: string, message: string): ValidationIssue { return { path, code, message }; }

function validateBase(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NativeContractValidationError(`invalid ${name}`, [issue("$", "INVALID_OBJECT", "An object is required")]);
  }
  return value as Record<string, unknown>;
}

export function validateCoordinationProposalV2(value: unknown): CoordinationProposalV2 {
  const proposal = validateBase(value, "CoordinationProposalV2") as Partial<CoordinationProposalV2>;
  const issues: ValidationIssue[] = [];
  if (proposal.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  for (const key of ["proposal_id", "run_id", "task_id", "target_member_slot_id", "reason", "correlation_id"] as const) if (typeof proposal[key] !== "string" || !proposal[key]!.trim()) issues.push(issue(key, "REQUIRED_STRING", "A non-empty string is required"));
  if (!["assignment", "reassignment"].includes(proposal.proposal_kind ?? "")) issues.push(issue("proposal_kind", "INVALID_ENUM", "Invalid proposal kind"));
  if (!["acs", "human", "adapter", "policy", "other"].includes(proposal.source ?? "")) issues.push(issue("source", "INVALID_ENUM", "Invalid proposal source"));
  if (proposal.source_ref !== undefined) try { validateEntityRef(proposal.source_ref, "source_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!Number.isSafeInteger(proposal.created_at) || (proposal.created_at ?? 0) < 0) issues.push(issue("created_at", "INVALID_TIMESTAMP", "created_at must be non-negative"));
  try { validateIdempotency(proposal.idempotency); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  assertNoSecretMaterial(value);
  return assertValid(proposal as CoordinationProposalV2, issues);
}

export function validateCoordinationDecisionV2(value: unknown): CoordinationDecisionV2 {
  const decision = validateBase(value, "CoordinationDecisionV2") as Partial<CoordinationDecisionV2>;
  const issues: ValidationIssue[] = [];
  if (decision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  for (const key of ["decision_id", "run_id", "task_id", "reason", "correlation_id"] as const) if (typeof decision[key] !== "string" || !decision[key]!.trim()) issues.push(issue(key, "REQUIRED_STRING", "A non-empty string is required"));
  if (!["accepted", "rejected", "approval_required"].includes(decision.status ?? "")) issues.push(issue("status", "INVALID_ENUM", "Invalid decision status"));
  if (decision.proposal_id !== undefined) requireString(decision.proposal_id, "proposal_id", issues);
  if (decision.selected_member_slot_id !== undefined) requireString(decision.selected_member_slot_id, "selected_member_slot_id", issues);
  if (decision.prior_assignment_id !== undefined) requireString(decision.prior_assignment_id, "prior_assignment_id", issues);
  if (decision.expected_assignment_id !== undefined) requireString(decision.expected_assignment_id, "expected_assignment_id", issues);
  try { validateEntityRef(decision.authority_ref, "authority_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!["acs", "human", "adapter", "policy", "other"].includes(decision.source ?? "")) issues.push(issue("source", "INVALID_ENUM", "Invalid decision source"));
  if (!Number.isSafeInteger(decision.decided_at) || (decision.decided_at ?? 0) < 0) issues.push(issue("decided_at", "INVALID_TIMESTAMP", "decided_at must be non-negative"));
  try { validateIdempotency(decision.idempotency); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  assertNoSecretMaterial(value);
  return assertValid(decision as CoordinationDecisionV2, issues);
}

export function validateTaskAssignmentV2(value: unknown): TaskAssignmentV2 {
  const assignment = validateBase(value, "TaskAssignmentV2") as Partial<TaskAssignmentV2>;
  const issues: ValidationIssue[] = [];
  if (assignment.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  for (const key of ["assignment_id", "run_id", "task_id", "member_slot_id", "agent_id", "decision_id"] as const) if (typeof assignment[key] !== "string" || !assignment[key]!.trim()) issues.push(issue(key, "REQUIRED_STRING", "A non-empty string is required"));
  try { validateRevisionRef(assignment.workforce_revision_ref, "workforce_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateRevisionRef(assignment.resolved_agent_revision_ref, "resolved_agent_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireSafeInteger(assignment.generation, "generation", issues, 1);
  if (!Number.isSafeInteger(assignment.created_at) || (assignment.created_at ?? 0) < 0) issues.push(issue("created_at", "INVALID_TIMESTAMP", "created_at must be non-negative"));
  if (assignment.supersedes_assignment_id !== undefined) requireString(assignment.supersedes_assignment_id, "supersedes_assignment_id", issues);
  if (!assignment.provenance || typeof assignment.provenance !== "object" || Array.isArray(assignment.provenance)) issues.push(issue("provenance", "INVALID_OBJECT", "provenance must be an object"));
  assertNoSecretMaterial(value);
  return assertValid(assignment as TaskAssignmentV2, issues);
}

export const createCoordinationProposalV2 = (input: Omit<CoordinationProposalV2, "schema_version">) => validateCoordinationProposalV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
export const createCoordinationDecisionV2 = (input: Omit<CoordinationDecisionV2, "schema_version">) => validateCoordinationDecisionV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
export const createTaskAssignmentV2 = (input: Omit<TaskAssignmentV2, "schema_version">) => validateTaskAssignmentV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
