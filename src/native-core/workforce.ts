import { randomUUID } from "node:crypto";
import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  deserializeNative,
  type EntityRef,
  freezeNative,
  NativeContractValidationError,
  type RevisionRef,
  type Scope,
  serializeNative,
  sha256Hex,
  stableStringify,
  validateEntityRef,
  validateRevisionRef,
  validateScope,
  type ValidationIssue,
} from "./primitives.js";

export type WorkforceLifecycleStatus = "draft" | "active" | "disabled" | "archived";
export type WorkforceMemberSelectorMode = "pinned" | "current_head_at_admission";

export interface WorkforceDefinitionV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly workforce_id: string;
  readonly scope: Scope;
  readonly current_status: WorkforceLifecycleStatus;
  readonly current_revision: number;
  readonly ownership_ref: string;
  readonly created_at: number;
  readonly updated_at: number;
}

export interface PinnedAgentSelectorV2 {
  readonly mode: "pinned";
  readonly agent_id: string;
  readonly pinned_revision_ref: RevisionRef;
}

export interface CurrentHeadAtAdmissionAgentSelectorV2 {
  readonly mode: "current_head_at_admission";
  readonly agent_id: string;
}

export type WorkforceMemberAgentSelectorV2 =
  | PinnedAgentSelectorV2
  | CurrentHeadAtAdmissionAgentSelectorV2;

export interface WorkforceMemberV2 {
  readonly slot_id: string;
  readonly agent_selector: WorkforceMemberAgentSelectorV2;
  readonly role_ref?: RevisionRef;
  readonly responsibilities: readonly string[];
  readonly capability_requirement_refs: readonly EntityRef[];
  readonly authority_constraint_refs: readonly EntityRef[];
  readonly participation_constraint_refs: readonly EntityRef[];
}

export interface WorkforceRevisionV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ref: RevisionRef;
  readonly supersedes_revision?: number;
  readonly display_name: string;
  readonly purpose: string;
  readonly lifecycle_status: WorkforceLifecycleStatus;
  readonly members: readonly WorkforceMemberV2[];
  readonly composition_constraints: readonly EntityRef[];
  readonly governance: {
    readonly authority_refs: readonly EntityRef[];
    readonly membership_policy_ref: RevisionRef;
  };
  readonly evidence: {
    readonly audit_policy_ref: RevisionRef;
  };
  readonly commit: {
    readonly created_by: string;
    readonly committed_at: number;
    readonly change_reason: string;
  };
}

function collect(error: unknown, issues: ValidationIssue[], path: string, code: string, message: string): void {
  if (error instanceof NativeContractValidationError) issues.push(...error.issues);
  else issues.push({ path, code, message });
}

function requireText(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, code: "REQUIRED_STRING", message: "A non-empty string is required" });
  }
}

function requireTimestamp(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    issues.push({ path, code: "INVALID_TIMESTAMP", message: "A non-negative safe integer is required" });
  }
}

function requireRevision(value: unknown, path: string, issues: ValidationIssue[], minimum = 1): void {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    issues.push({ path, code: "INVALID_INTEGER", message: `A safe integer >= ${minimum} is required` });
  }
}

function rejectUnexpectedKeys(value: unknown, allowed: readonly string[], path: string, issues: ValidationIssue[]): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (!allowed.includes(key)) {
      issues.push({
        path: `${path}.${key}`,
        code: "UNSUPPORTED_FIELD",
        message: "Workforce Core does not accept provider, runtime, task, workflow, queue, credential, or coordination fields",
      });
    }
  }
}

function validateRefList(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, code: "INVALID_LIST", message: "An array is required" });
    return;
  }
  value.forEach((entry, index) => {
    try {
      validateEntityRef(entry, `${path}[${index}]`);
    } catch (error) {
      collect(error, issues, `${path}[${index}]`, "INVALID_REFERENCE", "Invalid reference");
    }
  });
}

function validateResponsibilities(value: unknown, path: string, issues: ValidationIssue[]): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ path, code: "INVALID_RESPONSIBILITIES", message: "At least one normalized responsibility is required" });
    return [];
  }
  const normalized = value as readonly unknown[];
  const seen = new Set<string>();
  normalized.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      issues.push({ path: `${path}[${index}]`, code: "REQUIRED_STRING", message: "A non-empty responsibility is required" });
      return;
    }
    if (entry !== entry.trim()) {
      issues.push({ path: `${path}[${index}]`, code: "NOT_NORMALIZED", message: "Responsibilities must be trimmed canonical strings" });
    }
    if (seen.has(entry)) {
      issues.push({ path: `${path}[${index}]`, code: "DUPLICATE_RESPONSIBILITY", message: "Responsibilities must be unique per slot" });
    }
    seen.add(entry);
  });
  return normalized as readonly string[];
}

export function validateWorkforceDefinitionV2(value: unknown): WorkforceDefinitionV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NativeContractValidationError("invalid WorkforceDefinition", [{ path: "$", code: "INVALID_OBJECT", message: "WorkforceDefinition must be an object" }]);
  }
  const definition = value as Partial<WorkforceDefinitionV2>;
  const issues: ValidationIssue[] = [];
  rejectUnexpectedKeys(value, ["schema_version", "workforce_id", "scope", "current_status", "current_revision", "ownership_ref", "created_at", "updated_at"], "$", issues);
  if (definition.schema_version !== ACS_NATIVE_SCHEMA_VERSION) {
    issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  }
  for (const key of ["workforce_id", "ownership_ref"] as const) requireText(definition[key], key, issues);
  try { validateScope(definition.scope, "scope"); } catch (error) { collect(error, issues, "scope", "INVALID_SCOPE", "Invalid scope"); }
  if (!["draft", "active", "disabled", "archived"].includes(definition.current_status ?? "")) {
    issues.push({ path: "current_status", code: "INVALID_ENUM", message: "Invalid Workforce lifecycle status" });
  }
  requireRevision(definition.current_revision, "current_revision", issues);
  requireTimestamp(definition.created_at, "created_at", issues);
  requireTimestamp(definition.updated_at, "updated_at", issues);
  if ((definition.updated_at ?? 0) < (definition.created_at ?? 0)) {
    issues.push({ path: "updated_at", code: "TIMESTAMP_ORDER", message: "updated_at cannot precede created_at" });
  }
  assertNoSecretMaterial(value);
  return assertValid(definition as WorkforceDefinitionV2, issues);
}

export function createWorkforceDefinitionV2(input: Omit<WorkforceDefinitionV2, "schema_version">): WorkforceDefinitionV2 {
  return validateWorkforceDefinitionV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function createWorkforceId(): string {
  return `workforce_${randomUUID()}`;
}

export function validateWorkforceMemberV2(value: unknown, path = "member"): WorkforceMemberV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NativeContractValidationError("invalid WorkforceMember", [{ path, code: "INVALID_OBJECT", message: "WorkforceMember must be an object" }]);
  }
  const member = value as Partial<WorkforceMemberV2>;
  const issues: ValidationIssue[] = [];
  rejectUnexpectedKeys(value, [
    "slot_id",
    "agent_selector",
    "role_ref",
    "responsibilities",
    "capability_requirement_refs",
    "authority_constraint_refs",
    "participation_constraint_refs",
  ], path, issues);
  requireText(member.slot_id, `${path}.slot_id`, issues);
  const selector = member.agent_selector as Partial<WorkforceMemberAgentSelectorV2> | undefined;
  if (!selector || typeof selector !== "object" || Array.isArray(selector)) {
    issues.push({ path: `${path}.agent_selector`, code: "INVALID_OBJECT", message: "agent_selector is required" });
  } else if (selector.mode === "pinned") {
    rejectUnexpectedKeys(selector, ["mode", "agent_id", "pinned_revision_ref"], `${path}.agent_selector`, issues);
    requireText(selector.agent_id, `${path}.agent_selector.agent_id`, issues);
    try {
      const ref = validateRevisionRef(selector.pinned_revision_ref, `${path}.agent_selector.pinned_revision_ref`);
      if (ref.entity_kind !== "agent") issues.push({ path: `${path}.agent_selector.pinned_revision_ref.entity_kind`, code: "INVALID_ENTITY_KIND", message: "Pinned selectors require an Agent revision reference" });
      if (typeof selector.agent_id === "string" && ref.entity_id !== selector.agent_id) issues.push({ path: `${path}.agent_selector.pinned_revision_ref.entity_id`, code: "AGENT_REFERENCE_MISMATCH", message: "Pinned revision must match selector agent_id" });
    } catch (error) {
      collect(error, issues, `${path}.agent_selector.pinned_revision_ref`, "INVALID_REVISION_REF", "Pinned selector requires a valid Agent revision");
    }
  } else if (selector.mode === "current_head_at_admission") {
    rejectUnexpectedKeys(selector, ["mode", "agent_id"], `${path}.agent_selector`, issues);
    requireText(selector.agent_id, `${path}.agent_selector.agent_id`, issues);
  } else {
    issues.push({ path: `${path}.agent_selector.mode`, code: "INVALID_ENUM", message: "Selector mode must be pinned or current_head_at_admission" });
  }
  if (member.role_ref !== undefined) {
    try {
      const roleRef = validateRevisionRef(member.role_ref, `${path}.role_ref`);
      if (roleRef.entity_kind !== "resource") issues.push({ path: `${path}.role_ref.entity_kind`, code: "INVALID_ENTITY_KIND", message: "role_ref must identify a governed resource revision" });
    } catch (error) {
      collect(error, issues, `${path}.role_ref`, "INVALID_ROLE_REFERENCE", "Invalid governed role reference");
    }
  }
  validateResponsibilities(member.responsibilities, `${path}.responsibilities`, issues);
  validateRefList(member.capability_requirement_refs, `${path}.capability_requirement_refs`, issues);
  validateRefList(member.authority_constraint_refs, `${path}.authority_constraint_refs`, issues);
  validateRefList(member.participation_constraint_refs, `${path}.participation_constraint_refs`, issues);
  assertNoSecretMaterial(value);
  return assertValid(member as WorkforceMemberV2, issues);
}

export function fingerprintWorkforceRevisionV2(revision: Omit<WorkforceRevisionV2, "ref">): string {
  const content = {
    schema_version: revision.schema_version,
    supersedes_revision: revision.supersedes_revision,
    display_name: revision.display_name,
    purpose: revision.purpose,
    lifecycle_status: revision.lifecycle_status,
    members: revision.members,
    composition_constraints: revision.composition_constraints,
    governance: revision.governance,
    evidence: revision.evidence,
  };
  return sha256Hex(stableStringify(content));
}

export function validateWorkforceRevisionV2(value: unknown): WorkforceRevisionV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NativeContractValidationError("invalid WorkforceRevision", [{ path: "$", code: "INVALID_OBJECT", message: "WorkforceRevision must be an object" }]);
  }
  const revision = value as Partial<WorkforceRevisionV2>;
  const issues: ValidationIssue[] = [];
  rejectUnexpectedKeys(value, [
    "schema_version",
    "ref",
    "supersedes_revision",
    "display_name",
    "purpose",
    "lifecycle_status",
    "members",
    "composition_constraints",
    "governance",
    "evidence",
    "commit",
  ], "$", issues);
  if (revision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) {
    issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  }
  try {
    const ref = validateRevisionRef(revision.ref, "ref");
    if (ref.entity_kind !== "workforce") issues.push({ path: "ref.entity_kind", code: "INVALID_ENTITY_KIND", message: "Workforce revisions must use entity_kind workforce" });
  } catch (error) {
    collect(error, issues, "ref", "INVALID_REVISION_REF", "Invalid Workforce revision reference");
  }
  if (revision.supersedes_revision !== undefined) requireRevision(revision.supersedes_revision, "supersedes_revision", issues);
  for (const key of ["display_name", "purpose"] as const) requireText(revision[key], key, issues);
  if (!["draft", "active", "disabled", "archived"].includes(revision.lifecycle_status ?? "")) {
    issues.push({ path: "lifecycle_status", code: "INVALID_ENUM", message: "Invalid Workforce lifecycle status" });
  }
  if (!Array.isArray(revision.members) || revision.members.length === 0) {
    issues.push({ path: "members", code: "EMPTY_MEMBERS", message: "A Workforce revision requires at least one member slot" });
  } else {
    const slots = new Set<string>();
    const memberSemanticsByAgent = new Map<string, Set<string>>();
    revision.members.forEach((member, index) => {
      try {
        const validated = validateWorkforceMemberV2(member, `members[${index}]`);
        if (slots.has(validated.slot_id)) {
          issues.push({ path: `members[${index}].slot_id`, code: "DUPLICATE_SLOT_ID", message: "slot_id must be unique within a Workforce revision" });
        }
        slots.add(validated.slot_id);
        const agentId = validated.agent_selector.agent_id;
        const semantic = stableStringify({
          responsibilities: [...validated.responsibilities].sort(),
          capability_requirement_refs: validated.capability_requirement_refs.map(stableStringify).sort(),
          authority_constraint_refs: validated.authority_constraint_refs.map(stableStringify).sort(),
          participation_constraint_refs: validated.participation_constraint_refs.map(stableStringify).sort(),
        });
        const existing = memberSemanticsByAgent.get(agentId) ?? new Set<string>();
        if (existing.has(semantic)) {
          issues.push({ path: `members[${index}]`, code: "INDISTINGUISHABLE_DUPLICATE_MEMBER", message: "The same Agent may occupy multiple slots only with distinguishable responsibilities or constraints" });
        }
        existing.add(semantic);
        memberSemanticsByAgent.set(agentId, existing);
      } catch (error) {
        collect(error, issues, `members[${index}]`, "INVALID_MEMBER", "Invalid Workforce member");
      }
    });
  }
  validateRefList(revision.composition_constraints, "composition_constraints", issues);
  if (!revision.governance || typeof revision.governance !== "object" || Array.isArray(revision.governance)) {
    issues.push({ path: "governance", code: "REQUIRED_OBJECT", message: "governance is required" });
  } else {
    rejectUnexpectedKeys(revision.governance, ["authority_refs", "membership_policy_ref"], "governance", issues);
    validateRefList(revision.governance.authority_refs, "governance.authority_refs", issues);
    try { validateRevisionRef(revision.governance.membership_policy_ref, "governance.membership_policy_ref"); } catch (error) { collect(error, issues, "governance.membership_policy_ref", "INVALID_POLICY_REFERENCE", "Invalid membership policy reference"); }
  }
  if (!revision.evidence || typeof revision.evidence !== "object" || Array.isArray(revision.evidence)) {
    issues.push({ path: "evidence", code: "REQUIRED_OBJECT", message: "evidence is required" });
  } else {
    rejectUnexpectedKeys(revision.evidence, ["audit_policy_ref"], "evidence", issues);
    try { validateRevisionRef(revision.evidence.audit_policy_ref, "evidence.audit_policy_ref"); } catch (error) { collect(error, issues, "evidence.audit_policy_ref", "INVALID_POLICY_REFERENCE", "Invalid audit policy reference"); }
  }
  if (!revision.commit || typeof revision.commit !== "object" || Array.isArray(revision.commit)) {
    issues.push({ path: "commit", code: "REQUIRED_OBJECT", message: "commit is required" });
  } else {
    rejectUnexpectedKeys(revision.commit, ["created_by", "committed_at", "change_reason"], "commit", issues);
    requireText(revision.commit.created_by, "commit.created_by", issues);
    requireText(revision.commit.change_reason, "commit.change_reason", issues);
    requireTimestamp(revision.commit.committed_at, "commit.committed_at", issues);
  }
  assertNoSecretMaterial(value);
  if (revision.ref?.fingerprint) {
    const { ref, ...withoutRef } = revision as WorkforceRevisionV2;
    const expected = fingerprintWorkforceRevisionV2(withoutRef);
    if (expected !== ref.fingerprint) {
      issues.push({ path: "ref.fingerprint", code: "FINGERPRINT_MISMATCH", message: "Revision fingerprint does not match canonical Workforce composition" });
    }
  }
  return assertValid(revision as WorkforceRevisionV2, issues);
}

export function createWorkforceRevisionV2(
  input: Omit<WorkforceRevisionV2, "schema_version" | "ref"> & { readonly workforce_id: string; readonly revision: number },
): WorkforceRevisionV2 {
  const { workforce_id, revision: revisionNumber, ...body } = input;
  const content = Object.fromEntries(
    Object.entries({ ...body, schema_version: ACS_NATIVE_SCHEMA_VERSION }).filter(([, entry]) => entry !== undefined),
  ) as Omit<WorkforceRevisionV2, "ref">;
  const fingerprint = fingerprintWorkforceRevisionV2(content);
  return validateWorkforceRevisionV2(freezeNative({
    ...content,
    ref: { entity_kind: "workforce", entity_id: workforce_id, revision: revisionNumber, fingerprint },
  } as WorkforceRevisionV2));
}

export function serializeWorkforceDefinitionV2(value: WorkforceDefinitionV2): string {
  return serializeNative(validateWorkforceDefinitionV2(value));
}

export function deserializeWorkforceDefinitionV2(serialized: string): WorkforceDefinitionV2 {
  return deserializeNative(serialized, validateWorkforceDefinitionV2);
}

export function serializeWorkforceRevisionV2(value: WorkforceRevisionV2): string {
  return serializeNative(validateWorkforceRevisionV2(value));
}

export function deserializeWorkforceRevisionV2(serialized: string): WorkforceRevisionV2 {
  return deserializeNative(serialized, validateWorkforceRevisionV2);
}
