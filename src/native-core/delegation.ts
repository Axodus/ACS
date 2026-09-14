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

export type DelegationGrantLifecycleV1 = "active" | "revoked" | "superseded";
export type DelegationMemoryOperationV1 = "read" | "search" | "write" | "correct" | "forget" | "expire";

export type DelegationFailureCode =
  | "TENANT_MISMATCH"
  | "AUTHORITY_ATTENUATION_DENIED"
  | "INVALID_DELEGATION_CHAIN"
  | "DELEGATION_DEPTH_OR_ONWARD_DENIED"
  | "GRANT_NOT_USABLE"
  | "AUTHORITY_REFERENCE_UNRESOLVED"
  | "MULTIPLE_AUTHORITY_BASES_FORBIDDEN";

export class DelegationResolutionError extends Error {
  constructor(readonly code: DelegationFailureCode, message: string) {
    super(message);
    this.name = "DelegationResolutionError";
  }
}

export interface DelegationGrantRevisionRefV1 {
  readonly grant_id: string;
  readonly tenant_id: string;
  readonly revision: number;
  readonly fingerprint: string;
}

export interface DelegationAgentRefV1 {
  readonly agent_id: string;
  readonly tenant_id: string;
  readonly revision_ref: RevisionRef;
}

export interface DelegationAuthorityBoundsV1 {
  readonly actions: readonly string[];
  readonly capability_refs: readonly EntityRef[];
  readonly resource_refs: readonly RevisionRef[];
  readonly tool_refs: readonly RevisionRef[];
  readonly model_refs: readonly EntityRef[];
  readonly connection_refs: readonly EntityRef[];
  readonly credential_purposes: readonly string[];
  readonly memory_scope_refs: readonly string[];
  readonly memory_operations: readonly DelegationMemoryOperationV1[];
}

export interface DelegationGrantRevisionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ref: DelegationGrantRevisionRefV1;
  readonly delegator: DelegationAgentRefV1;
  readonly delegate: DelegationAgentRefV1;
  readonly authority_bounds: DelegationAuthorityBoundsV1;
  readonly valid_from: number;
  readonly expires_at: number;
  readonly onward_delegation_allowed: boolean;
  readonly max_delegation_depth: number;
  readonly parent_grant_ref?: DelegationGrantRevisionRefV1;
  readonly ancestry_grant_refs: readonly DelegationGrantRevisionRefV1[];
  readonly depth: number;
  readonly governing_authority_refs: readonly EntityRef[];
  readonly governing_policy_refs: readonly RevisionRef[];
  readonly approval_refs: readonly EntityRef[];
  readonly provenance_refs: readonly EntityRef[];
  readonly issued_by: string;
  readonly issued_at: number;
  readonly reason: string;
}

export interface DelegationGrantHeadV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly grant_id: string;
  readonly tenant_id: string;
  readonly current_revision: number;
  readonly current_fingerprint: string;
  readonly lifecycle: DelegationGrantLifecycleV1;
  readonly valid_from: number;
  readonly expires_at: number;
  readonly revoked_at?: number;
  readonly revocation_reason?: string;
  readonly created_at: number;
  readonly updated_at: number;
}

/**
 * An immutable governance fact.  It never changes a historical grant
 * revision; the durable head records the resulting current usability.
 */
export interface DelegationGrantRevocationV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly revocation_id: string;
  readonly grant_ref: DelegationGrantRevisionRefV1;
  readonly revoked_at: number;
  readonly revoked_by: string;
  readonly reason: string;
  readonly governing_authority_refs: readonly EntityRef[];
  readonly approval_refs: readonly EntityRef[];
  readonly provenance_refs: readonly EntityRef[];
}

export interface DelegationAuthoritySourceV1 {
  readonly tenant_id: string;
  readonly authority_bounds: DelegationAuthorityBoundsV1;
  readonly valid_from: number;
  readonly expires_at: number;
  readonly onward_delegation_allowed: boolean;
  readonly max_delegation_depth: number;
  readonly governing_authority_refs: readonly EntityRef[];
  readonly governing_policy_refs: readonly RevisionRef[];
}

export interface DelegationAuthorityResolverV1 {
  resolveDelegatorAuthority(input: {
    readonly tenant_id: string;
    readonly delegator: DelegationAgentRefV1;
    readonly at: number;
    readonly governing_authority_refs: readonly EntityRef[];
    readonly governing_policy_refs: readonly RevisionRef[];
  }): Promise<DelegationAuthoritySourceV1>;
}

export interface DelegationGrantAdmissionUseV1 {
  readonly revision: DelegationGrantRevisionV1;
  readonly head: DelegationGrantHeadV1;
}

/** Immutable, secret-free authority evidence captured at successful admission. */
export interface DelegatedAuthoritySnapshotV1 {
  readonly authority_basis_ref: DelegationGrantRevisionRefV1;
  readonly chain_refs: readonly DelegationGrantRevisionRefV1[];
  readonly effective_authority_bounds: DelegationAuthorityBoundsV1;
  readonly governing_authority_refs: readonly EntityRef[];
  readonly governing_policy_refs: readonly RevisionRef[];
  readonly admitted_at: number;
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

function stringList(value: unknown, path: string, issues: ValidationIssue[]): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    issues.push(issue(path, "INVALID_STRING_LIST", "A list of non-empty strings is required"));
    return [];
  }
  return value as readonly string[];
}

function entityList(value: unknown, path: string, issues: ValidationIssue[]): readonly EntityRef[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    try {
      return validateEntityRef(entry, path + "[" + index + "]");
    } catch (error) {
      if (error instanceof NativeContractValidationError) issues.push(...error.issues);
      return {} as EntityRef;
    }
  });
}

function revisionList(value: unknown, path: string, issues: ValidationIssue[]): readonly RevisionRef[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    try {
      return validateRevisionRef(entry, path + "[" + index + "]");
    } catch (error) {
      if (error instanceof NativeContractValidationError) issues.push(...error.issues);
      return {} as RevisionRef;
    }
  });
}

function validateAuthorityBounds(value: unknown, path: string, issues: ValidationIssue[]): DelegationAuthorityBoundsV1 {
  const bounds = object(value, path, issues) as Partial<DelegationAuthorityBoundsV1>;
  const actions = stringList(bounds.actions, path + ".actions", issues);
  const credentialPurposes = stringList(bounds.credential_purposes, path + ".credential_purposes", issues);
  const memoryScopeRefs = stringList(bounds.memory_scope_refs, path + ".memory_scope_refs", issues);
  const memoryOperations = stringList(bounds.memory_operations, path + ".memory_operations", issues);
  for (const operation of memoryOperations) {
    if (!["read", "search", "write", "correct", "forget", "expire"].includes(operation)) {
      issues.push(issue(path + ".memory_operations", "INVALID_ENUM", "Invalid Memory operation"));
    }
  }
  return {
    actions,
    capability_refs: entityList(bounds.capability_refs, path + ".capability_refs", issues),
    resource_refs: revisionList(bounds.resource_refs, path + ".resource_refs", issues),
    tool_refs: revisionList(bounds.tool_refs, path + ".tool_refs", issues),
    model_refs: entityList(bounds.model_refs, path + ".model_refs", issues),
    connection_refs: entityList(bounds.connection_refs, path + ".connection_refs", issues),
    credential_purposes: credentialPurposes,
    memory_scope_refs: memoryScopeRefs,
    memory_operations: memoryOperations as readonly DelegationMemoryOperationV1[],
  };
}

export function validateDelegationGrantRevisionRefV1(value: unknown, path = "grant_ref"): DelegationGrantRevisionRefV1 {
  const issues: ValidationIssue[] = [];
  const ref = object(value, path, issues) as Partial<DelegationGrantRevisionRefV1>;
  requireString(ref.grant_id, path + ".grant_id", issues);
  requireString(ref.tenant_id, path + ".tenant_id", issues);
  requireSafeInteger(ref.revision, path + ".revision", issues, 1);
  requireSha256(ref.fingerprint, path + ".fingerprint", issues);
  return assertValid(ref as DelegationGrantRevisionRefV1, issues);
}

function validateAgentRef(value: unknown, path: string, issues: ValidationIssue[]): DelegationAgentRefV1 | undefined {
  const ref = object(value, path, issues) as Partial<DelegationAgentRefV1>;
  requireString(ref.agent_id, path + ".agent_id", issues);
  requireString(ref.tenant_id, path + ".tenant_id", issues);
  let revision: RevisionRef | undefined;
  try {
    revision = validateRevisionRef(ref.revision_ref, path + ".revision_ref");
    if (revision.entity_kind !== "agent") issues.push(issue(path + ".revision_ref.entity_kind", "INVALID_AGENT_REF", "An Agent revision reference is required"));
    if (revision.entity_id !== ref.agent_id) issues.push(issue(path + ".revision_ref.entity_id", "AGENT_ID_MISMATCH", "Agent identity and revision reference must match"));
  } catch (error) {
    if (error instanceof NativeContractValidationError) issues.push(...error.issues);
  }
  return revision ? { agent_id: ref.agent_id as string, tenant_id: ref.tenant_id as string, revision_ref: revision } : undefined;
}

function grantRefList(value: unknown, path: string, issues: ValidationIssue[]): readonly DelegationGrantRevisionRefV1[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    try {
      return validateDelegationGrantRevisionRefV1(entry, path + "[" + index + "]");
    } catch (error) {
      if (error instanceof NativeContractValidationError) issues.push(...error.issues);
      return {} as DelegationGrantRevisionRefV1;
    }
  });
}

export function fingerprintDelegationGrantRevisionV1(revision: Omit<DelegationGrantRevisionV1, "ref">): string {
  return sha256Hex(stableStringify(revision));
}

export function validateDelegationGrantRevisionV1(value: unknown): DelegationGrantRevisionV1 {
  const issues: ValidationIssue[] = [];
  const revision = object(value, "$", issues) as Partial<DelegationGrantRevisionV1>;
  if (revision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  let ref: DelegationGrantRevisionRefV1 | undefined;
  try { ref = validateDelegationGrantRevisionRefV1(revision.ref, "ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  const delegator = validateAgentRef(revision.delegator, "delegator", issues);
  const delegate = validateAgentRef(revision.delegate, "delegate", issues);
  const bounds = validateAuthorityBounds(revision.authority_bounds, "authority_bounds", issues);
  requireSafeInteger(revision.valid_from, "valid_from", issues, 0);
  requireSafeInteger(revision.expires_at, "expires_at", issues, 1);
  if (typeof revision.valid_from === "number" && typeof revision.expires_at === "number" && revision.expires_at <= revision.valid_from) issues.push(issue("expires_at", "INVALID_VALIDITY_INTERVAL", "expires_at must be later than valid_from"));
  if (typeof revision.onward_delegation_allowed !== "boolean") issues.push(issue("onward_delegation_allowed", "INVALID_BOOLEAN", "Onward delegation must be explicit"));
  requireSafeInteger(revision.max_delegation_depth, "max_delegation_depth", issues, 1);
  requireSafeInteger(revision.depth, "depth", issues, 1);
  let parent: DelegationGrantRevisionRefV1 | undefined;
  if (revision.parent_grant_ref !== undefined) {
    try { parent = validateDelegationGrantRevisionRefV1(revision.parent_grant_ref, "parent_grant_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  const ancestry = grantRefList(revision.ancestry_grant_refs, "ancestry_grant_refs", issues);
  const governingAuthority = entityList(revision.governing_authority_refs, "governing_authority_refs", issues);
  const governingPolicies = revisionList(revision.governing_policy_refs, "governing_policy_refs", issues);
  const approvals = entityList(revision.approval_refs, "approval_refs", issues);
  const provenance = entityList(revision.provenance_refs, "provenance_refs", issues);
  requireString(revision.issued_by, "issued_by", issues);
  requireSafeInteger(revision.issued_at, "issued_at", issues, 0);
  requireString(revision.reason, "reason", issues);

  if (ref && delegator && delegate) {
    if (ref.tenant_id !== delegator.tenant_id || ref.tenant_id !== delegate.tenant_id) issues.push(issue("tenant_id", "TENANT_MISMATCH", "Grant and Agent endpoints must belong to one Tenant"));
    if (delegator.agent_id === delegate.agent_id) issues.push(issue("delegate.agent_id", "SELF_DELEGATION_FORBIDDEN", "Delegator and delegate must be different canonical Agents"));
  }
  if (ref && parent && parent.tenant_id !== ref.tenant_id) issues.push(issue("parent_grant_ref.tenant_id", "TENANT_MISMATCH", "Parent Grant must belong to the same Tenant"));
  if (ref && ancestry.some((entry) => entry.tenant_id !== ref.tenant_id)) issues.push(issue("ancestry_grant_refs", "TENANT_MISMATCH", "Ancestry Grants must belong to the same Tenant"));
  if (parent && (ancestry.length === 0 || ancestry[ancestry.length - 1]?.grant_id !== parent.grant_id || ancestry[ancestry.length - 1]?.revision !== parent.revision || ancestry[ancestry.length - 1]?.fingerprint !== parent.fingerprint)) issues.push(issue("ancestry_grant_refs", "INVALID_ANCESTRY", "Ancestry must end with the exact parent Grant reference"));
  if (!parent && ancestry.length !== 0) issues.push(issue("ancestry_grant_refs", "INVALID_ANCESTRY", "Direct Grants cannot carry parent ancestry"));
  if (parent && revision.depth !== ancestry.length + 1) issues.push(issue("depth", "INVALID_DEPTH", "Child depth must equal immutable ancestry length plus one"));
  if (!parent && revision.depth !== 1) issues.push(issue("depth", "INVALID_DEPTH", "Direct Grant depth must be one"));
  if (typeof revision.depth === "number" && typeof revision.max_delegation_depth === "number" && revision.depth > revision.max_delegation_depth) issues.push(issue("depth", "DEPTH_EXCEEDED", "Grant depth cannot exceed its maximum"));
  if (revision.onward_delegation_allowed === true && typeof revision.depth === "number" && typeof revision.max_delegation_depth === "number" && revision.depth >= revision.max_delegation_depth) issues.push(issue("onward_delegation_allowed", "INVALID_ONWARD_DELEGATION", "No onward delegation remains at maximum depth"));
  assertNoSecretMaterial(value);
  return assertValid(revision as DelegationGrantRevisionV1, issues);
}

export function createDelegationGrantRevisionV1(input: Omit<DelegationGrantRevisionV1, "schema_version" | "ref"> & { readonly grant_id: string; readonly tenant_id: string; readonly revision: number }): DelegationGrantRevisionV1 {
  const { grant_id, tenant_id, revision, ...content } = input;
  const candidate = { ...content, schema_version: ACS_NATIVE_SCHEMA_VERSION };
  return validateDelegationGrantRevisionV1(freezeNative({
    ...candidate,
    ref: { grant_id, tenant_id, revision, fingerprint: sha256Hex(stableStringify({ grant_id, tenant_id, revision, ...candidate })) },
  }));
}

export function validateDelegationGrantHeadV1(value: unknown): DelegationGrantHeadV1 {
  const issues: ValidationIssue[] = [];
  const head = object(value, "$", issues) as Partial<DelegationGrantHeadV1>;
  if (head.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  requireString(head.grant_id, "grant_id", issues);
  requireString(head.tenant_id, "tenant_id", issues);
  requireSafeInteger(head.current_revision, "current_revision", issues, 1);
  requireSha256(head.current_fingerprint, "current_fingerprint", issues);
  if (!["active", "revoked", "superseded"].includes(head.lifecycle as string)) issues.push(issue("lifecycle", "INVALID_ENUM", "Invalid Grant lifecycle"));
  requireSafeInteger(head.valid_from, "valid_from", issues, 0);
  requireSafeInteger(head.expires_at, "expires_at", issues, 1);
  if (typeof head.valid_from === "number" && typeof head.expires_at === "number" && head.expires_at <= head.valid_from) issues.push(issue("expires_at", "INVALID_VALIDITY_INTERVAL", "expires_at must be later than valid_from"));
  requireSafeInteger(head.created_at, "created_at", issues, 0);
  requireSafeInteger(head.updated_at, "updated_at", issues, 0);
  if (head.revoked_at !== undefined) requireSafeInteger(head.revoked_at, "revoked_at", issues, 0);
  if (head.lifecycle === "revoked" && head.revoked_at === undefined) issues.push(issue("revoked_at", "REQUIRED_REVOCATION_TIME", "Revoked Grants require revoked_at"));
  if (head.lifecycle !== "revoked" && (head.revoked_at !== undefined || head.revocation_reason !== undefined)) issues.push(issue("revocation_reason", "INVALID_REVOCATION_STATE", "Only revoked Grants carry revocation state"));
  if (head.revocation_reason !== undefined) requireString(head.revocation_reason, "revocation_reason", issues);
  assertNoSecretMaterial(value);
  return assertValid(head as DelegationGrantHeadV1, issues);
}

export function validateDelegatedAuthoritySnapshotV1(value: unknown): DelegatedAuthoritySnapshotV1 {
  const issues: ValidationIssue[] = [];
  const snapshot = object(value, "$", issues) as Partial<DelegatedAuthoritySnapshotV1>;
  let basis: DelegationGrantRevisionRefV1 | undefined;
  try { basis = validateDelegationGrantRevisionRefV1(snapshot.authority_basis_ref, "authority_basis_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  const chain = grantRefList(snapshot.chain_refs, "chain_refs", issues);
  const authority = validateAuthorityBounds(snapshot.effective_authority_bounds, "effective_authority_bounds", issues);
  const governingAuthority = entityList(snapshot.governing_authority_refs, "governing_authority_refs", issues);
  const governingPolicy = revisionList(snapshot.governing_policy_refs, "governing_policy_refs", issues);
  requireSafeInteger(snapshot.admitted_at, "admitted_at", issues, 0);
  if (!basis || chain.length === 0 || !chain.some((entry) => entry.grant_id === basis?.grant_id && entry.revision === basis?.revision && entry.fingerprint === basis?.fingerprint)) issues.push(issue("chain_refs", "INVALID_AUTHORITY_BASIS", "Snapshot chain must contain the exact authority basis"));
  assertNoSecretMaterial(value);
  return assertValid({ authority_basis_ref: basis, chain_refs: chain, effective_authority_bounds: authority, governing_authority_refs: governingAuthority, governing_policy_refs: governingPolicy, admitted_at: snapshot.admitted_at } as DelegatedAuthoritySnapshotV1, issues);
}

export function validateDelegationGrantRevocationV1(value: unknown): DelegationGrantRevocationV1 {
  const issues: ValidationIssue[] = [];
  const revocation = object(value, "$", issues) as Partial<DelegationGrantRevocationV1>;
  if (revocation.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  requireString(revocation.revocation_id, "revocation_id", issues);
  let grantRef: DelegationGrantRevisionRefV1 | undefined;
  try { grantRef = validateDelegationGrantRevisionRefV1(revocation.grant_ref, "grant_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireSafeInteger(revocation.revoked_at, "revoked_at", issues, 0);
  requireString(revocation.revoked_by, "revoked_by", issues);
  requireString(revocation.reason, "reason", issues);
  const authority = entityList(revocation.governing_authority_refs, "governing_authority_refs", issues);
  const approvals = entityList(revocation.approval_refs, "approval_refs", issues);
  const provenance = entityList(revocation.provenance_refs, "provenance_refs", issues);
  assertNoSecretMaterial(value);
  return assertValid({ ...revocation, grant_ref: grantRef, governing_authority_refs: authority, approval_refs: approvals, provenance_refs: provenance } as DelegationGrantRevocationV1, issues);
}

export function createDelegationGrantRevocationV1(input: Omit<DelegationGrantRevocationV1, "schema_version">): DelegationGrantRevocationV1 {
  return validateDelegationGrantRevocationV1(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

function key(value: EntityRef | RevisionRef): string {
  return "kind" in value
    ? value.kind + ":" + value.id + ":" + (value.revision ?? "")
    : value.entity_kind + ":" + value.entity_id + ":" + value.revision + ":" + value.fingerprint;
}

function subsetStrings(requested: readonly string[], source: readonly string[], dimension: string): void {
  if (requested.some((entry) => !source.includes(entry))) throw new DelegationResolutionError("AUTHORITY_ATTENUATION_DENIED", "Requested " + dimension + " expands governing authority");
}

function subsetRefs(requested: readonly (EntityRef | RevisionRef)[], source: readonly (EntityRef | RevisionRef)[], dimension: string): void {
  const allowed = new Set(source.map(key));
  if (requested.some((entry) => !allowed.has(key(entry)))) throw new DelegationResolutionError("AUTHORITY_ATTENUATION_DENIED", "Requested " + dimension + " expands governing authority");
}

export function assertDelegationAuthorityAttenuationV1(requested: DelegationAuthorityBoundsV1, source: DelegationAuthorityBoundsV1): DelegationAuthorityBoundsV1 {
  subsetStrings(requested.actions, source.actions, "actions");
  subsetRefs(requested.capability_refs, source.capability_refs, "capabilities");
  subsetRefs(requested.resource_refs, source.resource_refs, "resources");
  subsetRefs(requested.tool_refs, source.tool_refs, "tools");
  subsetRefs(requested.model_refs, source.model_refs, "models");
  subsetRefs(requested.connection_refs, source.connection_refs, "Connections");
  subsetStrings(requested.credential_purposes, source.credential_purposes, "credential purposes");
  subsetStrings(requested.memory_scope_refs, source.memory_scope_refs, "Memory scopes");
  subsetStrings(requested.memory_operations, source.memory_operations, "Memory operations");
  return requested;
}

export function assertDelegationGrantAttenuatesSourceV1(grant: DelegationGrantRevisionV1, source: DelegationAuthoritySourceV1): DelegationGrantRevisionV1 {
  if (grant.ref.tenant_id !== source.tenant_id || grant.delegator.tenant_id !== source.tenant_id) throw new DelegationResolutionError("TENANT_MISMATCH", "Grant and governing authority must belong to the same Tenant");
  if (grant.valid_from < source.valid_from || grant.expires_at > source.expires_at) throw new DelegationResolutionError("AUTHORITY_ATTENUATION_DENIED", "Grant validity expands governing authority");
  if (grant.max_delegation_depth > source.max_delegation_depth) throw new DelegationResolutionError("DELEGATION_DEPTH_OR_ONWARD_DENIED", "Grant maximum depth expands governing authority");
  if (grant.onward_delegation_allowed && !source.onward_delegation_allowed) throw new DelegationResolutionError("DELEGATION_DEPTH_OR_ONWARD_DENIED", "Onward delegation is not permitted by governing authority");
  assertDelegationAuthorityAttenuationV1(grant.authority_bounds, source.authority_bounds);
  return grant;
}

export function assertDelegationGrantUsableAtV1(head: DelegationGrantHeadV1, revision: DelegationGrantRevisionV1, at: number): void {
  if (head.grant_id !== revision.ref.grant_id || head.tenant_id !== revision.ref.tenant_id || head.current_revision !== revision.ref.revision || head.current_fingerprint !== revision.ref.fingerprint) throw new DelegationResolutionError("AUTHORITY_REFERENCE_UNRESOLVED", "Grant head does not resolve the exact Grant revision");
  if (head.lifecycle !== "active" || at < revision.valid_from || at >= revision.expires_at || at < head.valid_from || at >= head.expires_at || (head.revoked_at !== undefined && at >= head.revoked_at)) throw new DelegationResolutionError("GRANT_NOT_USABLE", "Grant is not usable at the requested admission time");
}

export function validateDelegationAdmissionChainV1(uses: readonly DelegationGrantAdmissionUseV1[], at: number): readonly DelegationGrantAdmissionUseV1[] {
  if (uses.length === 0) throw new DelegationResolutionError("INVALID_DELEGATION_CHAIN", "Delegation admission requires one Grant authority basis");
  const agents: string[] = [];
  for (let index = 0; index < uses.length; index += 1) {
    const current = uses[index]!;
    assertDelegationGrantUsableAtV1(current.head, current.revision, at);
    const parent = uses[index - 1];
    if (index === 0) {
      agents.push(current.revision.delegator.agent_id);
    } else if (!parent || current.revision.parent_grant_ref?.grant_id !== parent.revision.ref.grant_id || current.revision.parent_grant_ref?.revision !== parent.revision.ref.revision || current.revision.parent_grant_ref?.fingerprint !== parent.revision.ref.fingerprint || current.revision.delegator.agent_id !== parent.revision.delegate.agent_id) {
      throw new DelegationResolutionError("INVALID_DELEGATION_CHAIN", "Child Grant does not continue the exact parent delegation path");
    } else {
      if (!parent.revision.onward_delegation_allowed || current.revision.depth > parent.revision.max_delegation_depth) throw new DelegationResolutionError("DELEGATION_DEPTH_OR_ONWARD_DENIED", "Parent Grant does not permit this onward delegation");
      assertDelegationAuthorityAttenuationV1(current.revision.authority_bounds, parent.revision.authority_bounds);
      if (current.revision.valid_from < parent.revision.valid_from || current.revision.expires_at > parent.revision.expires_at || current.revision.max_delegation_depth > parent.revision.max_delegation_depth) throw new DelegationResolutionError("AUTHORITY_ATTENUATION_DENIED", "Child Grant expands parent authority");
    }
    if (agents.includes(current.revision.delegate.agent_id)) throw new DelegationResolutionError("INVALID_DELEGATION_CHAIN", "Delegation chain repeats a canonical Agent identity");
    agents.push(current.revision.delegate.agent_id);
  }
  return uses;
}

export function selectDelegationAuthorityBasisV1(grants: readonly DelegationGrantAdmissionUseV1[]): DelegationGrantAdmissionUseV1 {
  if (grants.length !== 1) throw new DelegationResolutionError("MULTIPLE_AUTHORITY_BASES_FORBIDDEN", "A delegated operation must select exactly one Grant authority basis");
  return grants[0]!;
}
