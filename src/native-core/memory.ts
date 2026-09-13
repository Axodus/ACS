import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  EntityRef,
  freezeNative,
  NativeContractValidationError,
  requireSafeInteger,
  requireSha256,
  requireString,
  RevisionRef,
  sha256Hex,
  stableStringify,
  validateEntityRef,
  validateRevisionRef,
  ValidationIssue,
} from "./primitives.js";

export type MemoryType = "working" | "agent" | "workforce_shared" | "knowledge_backed" | "user_context";
export type MemoryScopeKind = "working" | "agent" | "workforce_shared" | "knowledge_backed" | "user_context";
export type MemoryPolicyLifecycle = "draft" | "active" | "disabled" | "archived";
export type MemoryOperation = "read" | "search" | "write" | "correct" | "forget" | "expire" | "export" | "admin_policy";
export type MemoryDecisionOutcome = "allowed" | "denied" | "approval_required";
export type MemoryDeletionReason = "retention_expired" | "policy_forget" | "administrative_deletion" | "consent_withdrawn";

export interface TenantBoundEntityRefV1 {
  readonly tenant_id: string;
  readonly ref: EntityRef;
}

export interface TenantBoundRevisionRefV1 {
  readonly tenant_id: string;
  readonly ref: RevisionRef;
}

/** Exact, immutable policy identity using the existing generic policy RevisionRef seam. */
export type MemoryPolicyRevisionRefV1 = TenantBoundRevisionRefV1;

export interface MemoryPolicyHeadV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly memory_policy_id: string;
  readonly tenant_id: string;
  readonly current_revision: number;
  readonly current_fingerprint: string;
  readonly lifecycle: MemoryPolicyLifecycle;
  readonly created_at: number;
  readonly updated_at: number;
}

export interface MemoryRetentionPolicyV1 {
  readonly max_age_ms: number;
  readonly deletion_action: "tombstone";
  readonly retain_content_digest: boolean;
}

export interface MemoryPolicyRevisionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ref: RevisionRef;
  readonly tenant_id: string;
  readonly supersedes_revision?: number;
  readonly lifecycle: MemoryPolicyLifecycle;
  readonly allowed_memory_types: readonly Exclude<MemoryType, "user_context">[];
  readonly allowed_scope_kinds: readonly Exclude<MemoryScopeKind, "user_context">[];
  readonly allowed_operations: readonly MemoryOperation[];
  readonly max_retrieval_results: number;
  readonly retention: MemoryRetentionPolicyV1;
  readonly provenance_required: boolean;
  readonly evidence_required: boolean;
  readonly created_by: string;
  readonly created_at: number;
  readonly change_reason: string;
}

export interface MemoryScopeV1 {
  readonly tenant_id: string;
  readonly kind: MemoryScopeKind;
  readonly run_ref?: TenantBoundEntityRefV1;
  readonly task_ref?: TenantBoundEntityRefV1;
  readonly attempt_ref?: TenantBoundEntityRefV1;
  readonly agent_ref?: TenantBoundEntityRefV1;
  readonly workforce_revision_ref?: TenantBoundRevisionRefV1;
  readonly knowledge_ref?: TenantBoundEntityRefV1;
  readonly knowledge_fingerprint?: string;
}

export interface MemoryContentReferenceV1 {
  readonly content_ref: string;
  readonly content_digest: string;
  readonly media_type: string;
}

export interface MemoryRecordRefV1 {
  readonly memory_id: string;
  readonly tenant_id: string;
  readonly fingerprint: string;
}

export interface MemoryRecordV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ref: MemoryRecordRefV1;
  readonly memory_type: Exclude<MemoryType, "user_context">;
  readonly scope: MemoryScopeV1;
  readonly policy_ref: MemoryPolicyRevisionRefV1;
  readonly content: MemoryContentReferenceV1;
  readonly predecessor_ref?: MemoryRecordRefV1;
  readonly provenance_refs: readonly EntityRef[];
  readonly sensitivity: "internal" | "restricted";
  readonly created_by: string;
  readonly created_at: number;
}

export interface MemoryTombstoneV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly memory_ref: MemoryRecordRefV1;
  readonly memory_type: Exclude<MemoryType, "user_context">;
  readonly scope: MemoryScopeV1;
  readonly policy_ref: MemoryPolicyRevisionRefV1;
  readonly deleted_at: number;
  readonly deletion_reason: MemoryDeletionReason;
  readonly digest_retention: "not_retained" | "policy_permitted";
  readonly retained_content_digest?: string;
  readonly provenance_refs: readonly EntityRef[];
}

export interface MemoryPolicyAccessDecisionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly decision_id: string;
  readonly tenant_id: string;
  readonly policy_ref: MemoryPolicyRevisionRefV1;
  readonly memory_type: Exclude<MemoryType, "user_context">;
  readonly scope: MemoryScopeV1;
  readonly operation: MemoryOperation;
  readonly purpose: string;
  readonly outcome: MemoryDecisionOutcome;
  readonly authority_basis_refs: readonly EntityRef[];
  readonly provenance_refs: readonly EntityRef[];
  readonly decided_at: number;
}

function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

function object(value: unknown, path: string, issues: ValidationIssue[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(issue(path, "INVALID_OBJECT", "An object is required"));
    return {};
  }
  return value as Record<string, unknown>;
}

function validateEntityList(value: unknown, path: string, issues: ValidationIssue[]): readonly EntityRef[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    try {
      return validateEntityRef(entry, `${path}[${index}]`);
    } catch (error) {
      if (error instanceof NativeContractValidationError) issues.push(...error.issues);
      return {} as EntityRef;
    }
  });
}

function requireEnum(value: unknown, values: readonly string[], path: string, issues: ValidationIssue[], message: string): void {
  if (!values.includes(value as string)) issues.push(issue(path, "INVALID_ENUM", message));
}

function assertNoForbiddenMemoryFields(value: unknown, path: string, issues: ValidationIssue[]): void {
  const forbidden = new Set([
    "capability_ref", "credential_ref", "delegation_ref", "execution_authority_ref",
    "authority_grant", "permission_grant", "embedding", "vector", "raw_content",
  ]);
  const visit = (entry: unknown, currentPath: string): void => {
    if (!entry || typeof entry !== "object") return;
    if (Array.isArray(entry)) {
      entry.forEach((child, index) => visit(child, `${currentPath}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(entry)) {
      if (forbidden.has(key)) issues.push(issue(`${currentPath}.${key}`, "MEMORY_AUTHORITY_OR_CONTENT_FORBIDDEN", "Memory contracts cannot carry authority grants, credentials, embeddings, or raw content"));
      visit(child, `${currentPath}.${key}`);
    }
  };
  visit(value, path);
}

export function validateTenantBoundEntityRefV1(value: unknown, path = "reference"): TenantBoundEntityRefV1 {
  const issues: ValidationIssue[] = [];
  const reference = object(value, path, issues) as Partial<TenantBoundEntityRefV1>;
  requireString(reference.tenant_id, `${path}.tenant_id`, issues);
  try { validateEntityRef(reference.ref, `${path}.ref`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  return assertValid(reference as TenantBoundEntityRefV1, issues);
}

export function validateTenantBoundRevisionRefV1(value: unknown, path = "reference"): TenantBoundRevisionRefV1 {
  const issues: ValidationIssue[] = [];
  const reference = object(value, path, issues) as Partial<TenantBoundRevisionRefV1>;
  requireString(reference.tenant_id, `${path}.tenant_id`, issues);
  try { validateRevisionRef(reference.ref, `${path}.ref`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  return assertValid(reference as TenantBoundRevisionRefV1, issues);
}

export function validateMemoryPolicyRevisionRefV1(value: unknown, path = "policy_ref"): MemoryPolicyRevisionRefV1 {
  const reference = validateTenantBoundRevisionRefV1(value, path);
  if (reference.ref.entity_kind !== "policy") {
    throw new NativeContractValidationError("invalid Memory Policy reference", [issue(`${path}.ref.entity_kind`, "INVALID_MEMORY_POLICY_REF", "A policy RevisionRef is required")]);
  }
  return reference;
}

export function validateMemoryRecordRefV1(value: unknown, path = "memory_ref"): MemoryRecordRefV1 {
  const issues: ValidationIssue[] = [];
  const reference = object(value, path, issues) as Partial<MemoryRecordRefV1>;
  requireString(reference.memory_id, `${path}.memory_id`, issues);
  requireString(reference.tenant_id, `${path}.tenant_id`, issues);
  requireSha256(reference.fingerprint, `${path}.fingerprint`, issues);
  return assertValid(reference as MemoryRecordRefV1, issues);
}

function validateRetention(value: unknown, path: string, issues: ValidationIssue[]): void {
  const retention = object(value, path, issues) as Partial<MemoryRetentionPolicyV1>;
  requireSafeInteger(retention.max_age_ms, `${path}.max_age_ms`, issues, 1);
  if (retention.deletion_action !== "tombstone") issues.push(issue(`${path}.deletion_action`, "INVALID_RETENTION_ACTION", "Memory deletion must retain a content-free tombstone"));
  if (typeof retention.retain_content_digest !== "boolean") issues.push(issue(`${path}.retain_content_digest`, "INVALID_BOOLEAN", "Digest retention must be explicit"));
}

function validateMemoryScope(value: unknown, path: string, issues: ValidationIssue[]): MemoryScopeV1 | undefined {
  const scope = object(value, path, issues) as Partial<MemoryScopeV1>;
  requireString(scope.tenant_id, `${path}.tenant_id`, issues);
  requireEnum(scope.kind, ["working", "agent", "workforce_shared", "knowledge_backed", "user_context"], `${path}.kind`, issues, "Invalid Memory scope kind");
  const entityRef = (key: "run_ref" | "task_ref" | "attempt_ref" | "agent_ref" | "knowledge_ref", expectedKind?: string): TenantBoundEntityRefV1 | undefined => {
    if (scope[key] === undefined) return undefined;
    try {
      const reference = validateTenantBoundEntityRefV1(scope[key], `${path}.${key}`);
      if (reference.tenant_id !== scope.tenant_id) issues.push(issue(`${path}.${key}.tenant_id`, "TENANT_MISMATCH", "Referenced entity must belong to the Memory scope Tenant"));
      if (expectedKind && reference.ref.kind !== expectedKind) issues.push(issue(`${path}.${key}.ref.kind`, "INVALID_SCOPE_REFERENCE", `Expected ${expectedKind} reference`));
      return reference;
    } catch (error) {
      if (error instanceof NativeContractValidationError) issues.push(...error.issues);
      return undefined;
    }
  };
  const run = entityRef("run_ref", "run");
  const task = entityRef("task_ref", "task");
  const attempt = entityRef("attempt_ref", "attempt");
  const agent = entityRef("agent_ref", "agent");
  const knowledge = entityRef("knowledge_ref", "knowledge");
  let workforce: TenantBoundRevisionRefV1 | undefined;
  if (scope.workforce_revision_ref !== undefined) {
    try {
      workforce = validateTenantBoundRevisionRefV1(scope.workforce_revision_ref, `${path}.workforce_revision_ref`);
      if (workforce.tenant_id !== scope.tenant_id) issues.push(issue(`${path}.workforce_revision_ref.tenant_id`, "TENANT_MISMATCH", "Workforce reference must belong to the Memory scope Tenant"));
      if (workforce.ref.entity_kind !== "workforce") issues.push(issue(`${path}.workforce_revision_ref.ref.entity_kind`, "INVALID_SCOPE_REFERENCE", "A Workforce revision reference is required"));
    } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  if (scope.knowledge_fingerprint !== undefined) requireSha256(scope.knowledge_fingerprint, `${path}.knowledge_fingerprint`, issues);
  const unexpected = (key: keyof MemoryScopeV1): void => { if (scope[key] !== undefined) issues.push(issue(`${path}.${key}`, "INVALID_SCOPE_COMBINATION", "Reference is not permitted for this Memory scope")); };
  switch (scope.kind) {
    case "working":
      if (!run) issues.push(issue(`${path}.run_ref`, "REQUIRED_SCOPE_REFERENCE", "Working Memory requires an exact Run reference"));
      unexpected("agent_ref"); unexpected("workforce_revision_ref"); unexpected("knowledge_ref"); unexpected("knowledge_fingerprint");
      break;
    case "agent":
      if (!agent) issues.push(issue(`${path}.agent_ref`, "REQUIRED_SCOPE_REFERENCE", "Agent Memory requires an exact Agent reference"));
      unexpected("run_ref"); unexpected("task_ref"); unexpected("attempt_ref"); unexpected("workforce_revision_ref"); unexpected("knowledge_ref"); unexpected("knowledge_fingerprint");
      break;
    case "workforce_shared":
      if (!workforce) issues.push(issue(`${path}.workforce_revision_ref`, "REQUIRED_SCOPE_REFERENCE", "Workforce Shared Memory requires an exact Workforce revision reference"));
      if (!run) issues.push(issue(`${path}.run_ref`, "REQUIRED_SCOPE_REFERENCE", "Workforce Shared Memory requires an admitted Run reference"));
      unexpected("agent_ref"); unexpected("knowledge_ref"); unexpected("knowledge_fingerprint");
      break;
    case "knowledge_backed":
      if (!knowledge) issues.push(issue(`${path}.knowledge_ref`, "REQUIRED_SCOPE_REFERENCE", "Knowledge-backed Memory requires a Knowledge reference"));
      if (knowledge && knowledge.ref.revision === undefined) issues.push(issue(`${path}.knowledge_ref.ref.revision`, "REQUIRED_KNOWLEDGE_REVISION", "Knowledge-backed Memory requires an exact Knowledge revision"));
      if (scope.knowledge_fingerprint === undefined) issues.push(issue(`${path}.knowledge_fingerprint`, "REQUIRED_KNOWLEDGE_FINGERPRINT", "Knowledge-backed Memory requires an exact Knowledge fingerprint"));
      unexpected("run_ref"); unexpected("task_ref"); unexpected("attempt_ref"); unexpected("agent_ref"); unexpected("workforce_revision_ref");
      break;
    case "user_context":
      issues.push(issue(`${path}.kind`, "USER_CONTEXT_MEMORY_DEFERRED", "User Context Memory requires a separately approved identity, consent, and privacy authority contract"));
      break;
  }
  return scope as MemoryScopeV1;
}

function validatePolicyRefForTenant(value: unknown, tenantId: unknown, path: string, issues: ValidationIssue[]): MemoryPolicyRevisionRefV1 | undefined {
  try {
    const reference = validateMemoryPolicyRevisionRefV1(value, path);
    if (reference.tenant_id !== tenantId) issues.push(issue(`${path}.tenant_id`, "TENANT_MISMATCH", "Policy reference must belong to the same Tenant"));
    return reference;
  } catch (error) {
    if (error instanceof NativeContractValidationError) issues.push(...error.issues);
    return undefined;
  }
}

function validateContentReference(value: unknown, path: string, issues: ValidationIssue[]): void {
  const content = object(value, path, issues) as Partial<MemoryContentReferenceV1>;
  requireString(content.content_ref, `${path}.content_ref`, issues);
  requireSha256(content.content_digest, `${path}.content_digest`, issues);
  requireString(content.media_type, `${path}.media_type`, issues);
}

export function fingerprintMemoryPolicyRevisionV1(revision: Omit<MemoryPolicyRevisionV1, "ref">): string {
  return sha256Hex(stableStringify(revision));
}

export function fingerprintMemoryRecordV1(record: Omit<MemoryRecordV1, "ref">): string {
  return sha256Hex(stableStringify(record));
}

export function validateMemoryPolicyHeadV1(value: unknown): MemoryPolicyHeadV1 {
  const issues: ValidationIssue[] = [];
  const head = object(value, "$", issues) as Partial<MemoryPolicyHeadV1>;
  if (head.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  requireString(head.memory_policy_id, "memory_policy_id", issues);
  requireString(head.tenant_id, "tenant_id", issues);
  requireSafeInteger(head.current_revision, "current_revision", issues, 1);
  requireSha256(head.current_fingerprint, "current_fingerprint", issues);
  requireEnum(head.lifecycle, ["draft", "active", "disabled", "archived"], "lifecycle", issues, "Invalid Memory Policy lifecycle");
  requireSafeInteger(head.created_at, "created_at", issues, 0);
  requireSafeInteger(head.updated_at, "updated_at", issues, 0);
  if ((head.updated_at ?? 0) < (head.created_at ?? 0)) issues.push(issue("updated_at", "TIMESTAMP_ORDER", "updated_at cannot precede created_at"));
  assertNoForbiddenMemoryFields(value, "payload", issues);
  assertNoSecretMaterial(value);
  return assertValid(head as MemoryPolicyHeadV1, issues);
}

export function validateMemoryPolicyRevisionV1(value: unknown): MemoryPolicyRevisionV1 {
  const issues: ValidationIssue[] = [];
  const revision = object(value, "$", issues) as Partial<MemoryPolicyRevisionV1>;
  if (revision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  let ref: RevisionRef | undefined;
  try { ref = validateRevisionRef(revision.ref, "ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (ref?.entity_kind !== "policy") issues.push(issue("ref.entity_kind", "INVALID_MEMORY_POLICY_REF", "Memory Policy must use a policy RevisionRef"));
  requireString(revision.tenant_id, "tenant_id", issues);
  if (revision.supersedes_revision !== undefined) requireSafeInteger(revision.supersedes_revision, "supersedes_revision", issues, 1);
  requireEnum(revision.lifecycle, ["draft", "active", "disabled", "archived"], "lifecycle", issues, "Invalid Memory Policy lifecycle");
  if (!Array.isArray(revision.allowed_memory_types) || revision.allowed_memory_types.length === 0) issues.push(issue("allowed_memory_types", "INVALID_LIST", "At least one implemented Memory type is required"));
  else revision.allowed_memory_types.forEach((type, index) => {
    if (!["working", "agent", "workforce_shared", "knowledge_backed"].includes(type)) issues.push(issue(`allowed_memory_types[${index}]`, type === "user_context" ? "USER_CONTEXT_MEMORY_DEFERRED" : "INVALID_MEMORY_TYPE", "Memory type is not available in Slice 1"));
  });
  if (!Array.isArray(revision.allowed_scope_kinds) || revision.allowed_scope_kinds.length === 0) issues.push(issue("allowed_scope_kinds", "INVALID_LIST", "At least one implemented Memory scope is required"));
  else revision.allowed_scope_kinds.forEach((kind, index) => {
    if (!["working", "agent", "workforce_shared", "knowledge_backed"].includes(kind)) issues.push(issue(`allowed_scope_kinds[${index}]`, kind === "user_context" ? "USER_CONTEXT_MEMORY_DEFERRED" : "INVALID_MEMORY_SCOPE", "Memory scope is not available in Slice 1"));
  });
  if (!Array.isArray(revision.allowed_operations) || revision.allowed_operations.length === 0) issues.push(issue("allowed_operations", "INVALID_LIST", "At least one operation is required"));
  else revision.allowed_operations.forEach((operation, index) => requireEnum(operation, ["read", "search", "write", "correct", "forget", "expire", "export", "admin_policy"], `allowed_operations[${index}]`, issues, "Invalid Memory operation"));
  requireSafeInteger(revision.max_retrieval_results, "max_retrieval_results", issues, 1);
  validateRetention(revision.retention, "retention", issues);
  if (typeof revision.provenance_required !== "boolean") issues.push(issue("provenance_required", "INVALID_BOOLEAN", "provenance_required must be boolean"));
  if (typeof revision.evidence_required !== "boolean") issues.push(issue("evidence_required", "INVALID_BOOLEAN", "evidence_required must be boolean"));
  for (const key of ["created_by", "change_reason"] as const) requireString(revision[key], key, issues);
  requireSafeInteger(revision.created_at, "created_at", issues, 0);
  if (ref) {
    const { ref: _ref, ...content } = revision as MemoryPolicyRevisionV1;
    if (fingerprintMemoryPolicyRevisionV1(content) !== ref.fingerprint) issues.push(issue("ref.fingerprint", "FINGERPRINT_MISMATCH", "Memory Policy fingerprint does not match immutable content"));
  }
  assertNoForbiddenMemoryFields(value, "payload", issues);
  assertNoSecretMaterial(value);
  return assertValid(revision as MemoryPolicyRevisionV1, issues);
}

export function createMemoryPolicyRevisionV1(input: Omit<MemoryPolicyRevisionV1, "schema_version" | "ref"> & { readonly memory_policy_id: string; readonly revision: number }): MemoryPolicyRevisionV1 {
  const { memory_policy_id, revision, ...content } = input;
  const candidate: Omit<MemoryPolicyRevisionV1, "ref"> = { ...content, schema_version: ACS_NATIVE_SCHEMA_VERSION };
  return validateMemoryPolicyRevisionV1(freezeNative({ ...candidate, ref: { entity_kind: "policy", entity_id: memory_policy_id, revision, fingerprint: fingerprintMemoryPolicyRevisionV1(candidate) } }));
}

export function validateMemoryRecordV1(value: unknown): MemoryRecordV1 {
  const issues: ValidationIssue[] = [];
  const record = object(value, "$", issues) as Partial<MemoryRecordV1>;
  if (record.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  let ref: MemoryRecordRefV1 | undefined;
  try { ref = validateMemoryRecordRefV1(record.ref, "ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  const requestedMemoryType = (record as { readonly memory_type?: MemoryType }).memory_type;
  requireEnum(requestedMemoryType, ["working", "agent", "workforce_shared", "knowledge_backed"], "memory_type", issues, requestedMemoryType === "user_context" ? "User Context Memory is deferred" : "Invalid Memory type");
  if (requestedMemoryType === "user_context") issues.push(issue("memory_type", "USER_CONTEXT_MEMORY_DEFERRED", "User Context Memory is not implemented without approved identity, consent, and privacy authority"));
  const scope = validateMemoryScope(record.scope, "scope", issues);
  if (scope && scope.tenant_id !== ref?.tenant_id) issues.push(issue("scope.tenant_id", "TENANT_MISMATCH", "Scope must belong to the Memory Record Tenant"));
  if (scope && record.memory_type !== scope.kind) issues.push(issue("scope.kind", "TYPE_SCOPE_MISMATCH", "Memory type and scope kind must match"));
  validatePolicyRefForTenant(record.policy_ref, ref?.tenant_id, "policy_ref", issues);
  validateContentReference(record.content, "content", issues);
  if (record.predecessor_ref !== undefined) {
    try {
      const predecessor = validateMemoryRecordRefV1(record.predecessor_ref, "predecessor_ref");
      if (ref && predecessor.tenant_id !== ref.tenant_id) issues.push(issue("predecessor_ref.tenant_id", "TENANT_MISMATCH", "Successor and predecessor must belong to one Tenant"));
      if (ref && predecessor.memory_id === ref.memory_id) issues.push(issue("predecessor_ref.memory_id", "INVALID_SUCCESSOR", "A successor Memory Record needs a different stable identity"));
    } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  validateEntityList(record.provenance_refs, "provenance_refs", issues);
  requireEnum(record.sensitivity, ["internal", "restricted"], "sensitivity", issues, "Invalid Memory sensitivity");
  requireString(record.created_by, "created_by", issues);
  requireSafeInteger(record.created_at, "created_at", issues, 0);
  if (ref) {
    const { ref: _ref, ...content } = record as MemoryRecordV1;
    if (fingerprintMemoryRecordV1(content) !== ref.fingerprint) issues.push(issue("ref.fingerprint", "FINGERPRINT_MISMATCH", "Memory Record fingerprint does not match immutable content"));
  }
  assertNoForbiddenMemoryFields(value, "payload", issues);
  assertNoSecretMaterial(value);
  return assertValid(record as MemoryRecordV1, issues);
}

export function createMemoryRecordV1(input: Omit<MemoryRecordV1, "schema_version" | "ref"> & { readonly memory_id: string; readonly tenant_id: string }): MemoryRecordV1 {
  const { memory_id, tenant_id, ...content } = input;
  const candidate: Omit<MemoryRecordV1, "ref"> = { ...content, schema_version: ACS_NATIVE_SCHEMA_VERSION };
  return validateMemoryRecordV1(freezeNative({ ...candidate, ref: { memory_id, tenant_id, fingerprint: fingerprintMemoryRecordV1(candidate) } }));
}

export function validateMemoryTombstoneV1(value: unknown): MemoryTombstoneV1 {
  const issues: ValidationIssue[] = [];
  const tombstone = object(value, "$", issues) as Partial<MemoryTombstoneV1>;
  if (tombstone.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  let memoryRef: MemoryRecordRefV1 | undefined;
  try { memoryRef = validateMemoryRecordRefV1(tombstone.memory_ref, "memory_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireEnum(tombstone.memory_type, ["working", "agent", "workforce_shared", "knowledge_backed"], "memory_type", issues, "Invalid tombstoned Memory type");
  const scope = validateMemoryScope(tombstone.scope, "scope", issues);
  if (scope && memoryRef && scope.tenant_id !== memoryRef.tenant_id) issues.push(issue("scope.tenant_id", "TENANT_MISMATCH", "Tombstone scope must belong to the Memory Record Tenant"));
  if (scope && tombstone.memory_type !== scope.kind) issues.push(issue("scope.kind", "TYPE_SCOPE_MISMATCH", "Memory type and scope kind must match"));
  validatePolicyRefForTenant(tombstone.policy_ref, memoryRef?.tenant_id, "policy_ref", issues);
  requireSafeInteger(tombstone.deleted_at, "deleted_at", issues, 0);
  requireEnum(tombstone.deletion_reason, ["retention_expired", "policy_forget", "administrative_deletion", "consent_withdrawn"], "deletion_reason", issues, "Invalid deletion reason");
  requireEnum(tombstone.digest_retention, ["not_retained", "policy_permitted"], "digest_retention", issues, "Invalid digest retention state");
  if (tombstone.digest_retention === "policy_permitted" && tombstone.retained_content_digest === undefined) issues.push(issue("retained_content_digest", "REQUIRED_DIGEST", "A policy-permitted tombstone digest is required"));
  if (tombstone.digest_retention === "not_retained" && tombstone.retained_content_digest !== undefined) issues.push(issue("retained_content_digest", "DIGEST_RETENTION_FORBIDDEN", "Digest retention must be explicitly policy-permitted"));
  if (tombstone.retained_content_digest !== undefined) requireSha256(tombstone.retained_content_digest, "retained_content_digest", issues);
  for (const key of ["content", "content_ref", "raw_content", "embedding", "vector"] as const) if (key in tombstone) issues.push(issue(key, "TOMBSTONE_CONTENT_FORBIDDEN", "A tombstone cannot retain deleted or reversible content"));
  validateEntityList(tombstone.provenance_refs, "provenance_refs", issues);
  assertNoForbiddenMemoryFields(value, "payload", issues);
  assertNoSecretMaterial(value);
  return assertValid(tombstone as MemoryTombstoneV1, issues);
}

export function createMemoryTombstoneV1(input: Omit<MemoryTombstoneV1, "schema_version">): MemoryTombstoneV1 {
  return validateMemoryTombstoneV1(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function validateMemoryPolicyAccessDecisionV1(value: unknown): MemoryPolicyAccessDecisionV1 {
  const issues: ValidationIssue[] = [];
  const decision = object(value, "$", issues) as Partial<MemoryPolicyAccessDecisionV1>;
  if (decision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  requireString(decision.decision_id, "decision_id", issues);
  requireString(decision.tenant_id, "tenant_id", issues);
  validatePolicyRefForTenant(decision.policy_ref, decision.tenant_id, "policy_ref", issues);
  const requestedMemoryType = (decision as { readonly memory_type?: MemoryType }).memory_type;
  requireEnum(requestedMemoryType, ["working", "agent", "workforce_shared", "knowledge_backed"], "memory_type", issues, requestedMemoryType === "user_context" ? "User Context Memory is deferred" : "Invalid Memory type");
  if (requestedMemoryType === "user_context") issues.push(issue("memory_type", "USER_CONTEXT_MEMORY_DEFERRED", "User Context Memory is not implemented without approved authority"));
  const scope = validateMemoryScope(decision.scope, "scope", issues);
  if (scope && scope.tenant_id !== decision.tenant_id) issues.push(issue("scope.tenant_id", "TENANT_MISMATCH", "Decision scope must belong to the decision Tenant"));
  if (scope && decision.memory_type !== scope.kind) issues.push(issue("scope.kind", "TYPE_SCOPE_MISMATCH", "Memory type and scope kind must match"));
  requireEnum(decision.operation, ["read", "search", "write", "correct", "forget", "expire", "export", "admin_policy"], "operation", issues, "Invalid Memory operation");
  requireString(decision.purpose, "purpose", issues);
  requireEnum(decision.outcome, ["allowed", "denied", "approval_required"], "outcome", issues, "Invalid policy decision outcome");
  validateEntityList(decision.authority_basis_refs, "authority_basis_refs", issues);
  validateEntityList(decision.provenance_refs, "provenance_refs", issues);
  requireSafeInteger(decision.decided_at, "decided_at", issues, 0);
  assertNoForbiddenMemoryFields(value, "payload", issues);
  assertNoSecretMaterial(value);
  return assertValid(decision as MemoryPolicyAccessDecisionV1, issues);
}

export function createMemoryPolicyAccessDecisionV1(input: Omit<MemoryPolicyAccessDecisionV1, "schema_version">): MemoryPolicyAccessDecisionV1 {
  return validateMemoryPolicyAccessDecisionV1(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}
