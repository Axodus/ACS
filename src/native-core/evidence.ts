import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  EntityRef,
  freezeNative,
  NativeContractValidationError,
  PolicySnapshotRef,
  RevisionRef,
  serializeNative,
  validateEntityRef,
  validatePolicySnapshotRef,
  validateRevisionRef,
  ValidationIssue,
  requireSafeInteger,
  requireSha256,
  requireString,
} from "./primitives.js";

export type EvidenceKind = "lifecycle" | "decision" | "approval" | "execution" | "tool" | "artifact" | "usage" | "cost" | "error" | "governance";
export type EvidenceSource = "acs" | "executor" | "provider" | "planner" | "tool" | "human";
export type EvidenceClassification = "public" | "internal" | "restricted" | "secret_redacted";

export interface EvidenceRecordV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly evidence_id: string;
  readonly kind: EvidenceKind;
  readonly subject_ref: EntityRef;
  readonly run_id?: string;
  readonly task_id?: string;
  readonly event_ref: EntityRef;
  readonly actor_ref?: EntityRef;
  readonly source: EvidenceSource;
  readonly classification: EvidenceClassification;
  readonly payload_digest: string;
  readonly created_at: number;
  readonly correction_of?: string;
}

export interface SourceReferenceV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly source_id: string;
  readonly source_kind: "repository" | "provider" | "executor" | "tool" | "document" | "human" | "event";
  readonly locator: string;
  readonly observed_at: number;
  readonly digest?: string;
}

export interface ArtifactReferenceV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly artifact_id: string;
  readonly media_type: string;
  readonly storage_ref: string;
  readonly digest: string;
  readonly size_bytes?: number;
  readonly sensitivity: EvidenceClassification;
}

export interface DecisionReferenceV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly decision_id: string;
  readonly decision_kind: "policy" | "routing" | "branch" | "retry" | "recovery" | "governance";
  readonly policy_snapshot_ref: PolicySnapshotRef;
  readonly inputs: readonly EntityRef[];
  readonly outcome: "allowed" | "denied" | "approval_required" | "selected" | "rejected";
}

export interface ApprovalRecordV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly approval_id: string;
  readonly request_ref: EntityRef;
  readonly authority_scope_ref: string;
  readonly requested_by: string;
  readonly decided_by?: string;
  readonly decision: "pending" | "approved" | "rejected" | "expired" | "revoked";
  readonly decided_at?: number;
}

export interface ExecutionTraceReferenceV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly trace_id: string;
  readonly executor_ref: EntityRef;
  readonly external_trace_id?: string;
  readonly cursor?: string;
  readonly observation_refs: readonly EntityRef[];
}

function invalidObject(name: string): never {
  throw new NativeContractValidationError(`invalid ${name}`, [{ path: "$", code: "INVALID_OBJECT", message: `${name} must be an object` }]);
}

function validateRefList(value: unknown, path: string): readonly EntityRef[] {
  if (!Array.isArray(value)) throw new NativeContractValidationError("invalid reference list", [{ path, code: "INVALID_LIST", message: "An array is required" }]);
  return value.map((entry, index) => validateEntityRef(entry, `${path}[${index}]`));
}

export function validateEvidenceRecordV2(value: unknown): EvidenceRecordV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("EvidenceRecord");
  const evidence = value as Partial<EvidenceRecordV2>;
  const issues: ValidationIssue[] = [];
  if (evidence.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["evidence_id", "payload_digest"] as const) if (typeof evidence[key] !== "string" || evidence[key].trim().length === 0) issues.push({ path: key, code: "REQUIRED_STRING", message: "A non-empty string is required" });
  if (!["lifecycle", "decision", "approval", "execution", "tool", "artifact", "usage", "cost", "error", "governance"].includes(evidence.kind ?? "")) issues.push({ path: "kind", code: "INVALID_ENUM", message: "Invalid evidence kind" });
  if (!["acs", "executor", "provider", "planner", "tool", "human"].includes(evidence.source ?? "")) issues.push({ path: "source", code: "INVALID_ENUM", message: "Invalid evidence source" });
  if (!["public", "internal", "restricted", "secret_redacted"].includes(evidence.classification ?? "")) issues.push({ path: "classification", code: "INVALID_ENUM", message: "Invalid evidence classification" });
  for (const key of ["subject_ref", "event_ref", "actor_ref"] as const) if (evidence[key] !== undefined) try { validateEntityRef(evidence[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!evidence.subject_ref) issues.push({ path: "subject_ref", code: "REQUIRED_REFERENCE", message: "subject_ref is required" });
  if (!evidence.event_ref) issues.push({ path: "event_ref", code: "REQUIRED_REFERENCE", message: "event_ref is required" });
  requireSha256(evidence.payload_digest, "payload_digest", issues);
  requireSafeInteger(evidence.created_at, "created_at", issues, 0);
  for (const key of ["run_id", "task_id", "correction_of"] as const) if (evidence[key] !== undefined) requireString(evidence[key], key, issues);
  assertNoSecretMaterial(value);
  return assertValid(evidence as EvidenceRecordV2, issues);
}

export function createEvidenceRecordV2(input: Omit<EvidenceRecordV2, "schema_version">): EvidenceRecordV2 {
  return validateEvidenceRecordV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateSourceReferenceV2(value: unknown): SourceReferenceV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("SourceReference");
  const source = value as Partial<SourceReferenceV2>;
  const issues: ValidationIssue[] = [];
  if (source.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["source_id", "locator"] as const) if (typeof source[key] !== "string" || source[key].trim().length === 0) issues.push({ path: key, code: "REQUIRED_STRING", message: "A non-empty string is required" });
  if (!["repository", "provider", "executor", "tool", "document", "human", "event"].includes(source.source_kind ?? "")) issues.push({ path: "source_kind", code: "INVALID_ENUM", message: "Invalid source kind" });
  requireSafeInteger(source.observed_at, "observed_at", issues, 0);
  if (source.digest !== undefined) requireSha256(source.digest, "digest", issues);
  assertNoSecretMaterial(value);
  return assertValid(source as SourceReferenceV2, issues);
}

export function validateArtifactReferenceV2(value: unknown): ArtifactReferenceV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("ArtifactReference");
  const artifact = value as Partial<ArtifactReferenceV2>;
  const issues: ValidationIssue[] = [];
  if (artifact.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["artifact_id", "media_type", "storage_ref"] as const) if (typeof artifact[key] !== "string" || artifact[key].trim().length === 0) issues.push({ path: key, code: "REQUIRED_STRING", message: "A non-empty string is required" });
  requireSha256(artifact.digest, "digest", issues);
  if (artifact.size_bytes !== undefined) requireSafeInteger(artifact.size_bytes, "size_bytes", issues, 0);
  if (!["public", "internal", "restricted", "secret_redacted"].includes(artifact.sensitivity ?? "")) issues.push({ path: "sensitivity", code: "INVALID_ENUM", message: "Invalid artifact sensitivity" });
  assertNoSecretMaterial(value);
  return assertValid(artifact as ArtifactReferenceV2, issues);
}

export function validateDecisionReferenceV2(value: unknown): DecisionReferenceV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("DecisionReference");
  const decision = value as Partial<DecisionReferenceV2>;
  const issues: ValidationIssue[] = [];
  if (decision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  if (typeof decision.decision_id !== "string" || decision.decision_id.trim().length === 0) issues.push({ path: "decision_id", code: "REQUIRED_STRING", message: "decision_id is required" });
  if (!["policy", "routing", "branch", "retry", "recovery", "governance"].includes(decision.decision_kind ?? "")) issues.push({ path: "decision_kind", code: "INVALID_ENUM", message: "Invalid decision kind" });
  try { validatePolicySnapshotRef(decision.policy_snapshot_ref, "policy_snapshot_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateRefList(decision.inputs, "inputs"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!["allowed", "denied", "approval_required", "selected", "rejected"].includes(decision.outcome ?? "")) issues.push({ path: "outcome", code: "INVALID_ENUM", message: "Invalid decision outcome" });
  assertNoSecretMaterial(value);
  return assertValid(decision as DecisionReferenceV2, issues);
}

export function validateApprovalRecordV2(value: unknown): ApprovalRecordV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("ApprovalRecord");
  const approval = value as Partial<ApprovalRecordV2>;
  const issues: ValidationIssue[] = [];
  if (approval.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["approval_id", "authority_scope_ref", "requested_by"] as const) if (typeof approval[key] !== "string" || approval[key].trim().length === 0) issues.push({ path: key, code: "REQUIRED_STRING", message: "A non-empty string is required" });
  try { validateEntityRef(approval.request_ref, "request_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!["pending", "approved", "rejected", "expired", "revoked"].includes(approval.decision ?? "")) issues.push({ path: "decision", code: "INVALID_ENUM", message: "Invalid approval decision" });
  if (approval.decided_by !== undefined && typeof approval.decided_by !== "string") issues.push({ path: "decided_by", code: "INVALID_STRING", message: "decided_by must be a string" });
  if (approval.decided_at !== undefined) requireSafeInteger(approval.decided_at, "decided_at", issues, 0);
  if (approval.decision !== "pending" && approval.decided_at === undefined) issues.push({ path: "decided_at", code: "REQUIRED_TIMESTAMP", message: "A decided approval requires decided_at" });
  assertNoSecretMaterial(value);
  return assertValid(approval as ApprovalRecordV2, issues);
}

export function validateExecutionTraceReferenceV2(value: unknown): ExecutionTraceReferenceV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("ExecutionTraceReference");
  const trace = value as Partial<ExecutionTraceReferenceV2>;
  const issues: ValidationIssue[] = [];
  if (trace.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  if (typeof trace.trace_id !== "string" || trace.trace_id.trim().length === 0) issues.push({ path: "trace_id", code: "REQUIRED_STRING", message: "trace_id is required" });
  try { validateEntityRef(trace.executor_ref, "executor_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateRefList(trace.observation_refs, "observation_refs"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  assertNoSecretMaterial(value);
  return assertValid(trace as ExecutionTraceReferenceV2, issues);
}

export class NativeEvidenceLedger {
  readonly #records = new Map<string, EvidenceRecordV2>();

  append(record: EvidenceRecordV2): EvidenceRecordV2 {
    validateEvidenceRecordV2(record);
    if (this.#records.has(record.evidence_id)) throw new NativeContractValidationError("evidence id already exists", [{ path: "evidence_id", code: "DUPLICATE_EVIDENCE_ID", message: "Evidence records are append-only" }]);
    if (record.correction_of && !this.#records.has(record.correction_of)) throw new NativeContractValidationError("evidence correction target is missing", [{ path: "correction_of", code: "MISSING_CORRECTION_TARGET", message: "A correction must point to an existing evidence record" }]);
    this.#records.set(record.evidence_id, record);
    return record;
  }

  correct(input: { readonly record: Omit<EvidenceRecordV2, "schema_version" | "correction_of">; readonly supersedes_evidence_id: string }): EvidenceRecordV2 {
    return this.append(createEvidenceRecordV2({ ...input.record, correction_of: input.supersedes_evidence_id }));
  }

  get(evidenceId: string): EvidenceRecordV2 | undefined { return this.#records.get(evidenceId); }
  list(): readonly EvidenceRecordV2[] { return [...this.#records.values()]; }
}

export function serializeEvidence(value: unknown): string {
  return serializeNative(value);
}
