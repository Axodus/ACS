import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  EntityRef,
  freezeNative,
  NativeContractValidationError,
  deserializeNative,
  RevisionRef,
  Scope,
  serializeNative,
  sha256Hex,
  stableStringify,
  validateEntityRef,
  validateRevisionRef,
  validateScope,
  ValidationIssue,
} from "./primitives.js";

export type NativeAgentStatus = "draft" | "active" | "disabled" | "archived";
export type AgentSharingMode = "private" | "domain_shared" | "explicitly_shared";

export interface AgentDefinitionV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly agent_id: string;
  readonly scope: Scope;
  readonly name: string;
  readonly status: NativeAgentStatus;
  readonly current_revision: number;
  readonly ownership_ref: string;
  readonly sharing_mode: AgentSharingMode;
  readonly created_at: number;
  readonly updated_at: number;
}

export interface AgentRevisionV2 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ref: RevisionRef;
  readonly supersedes_revision?: number;
  readonly role_ref?: EntityRef;
  readonly instructions: string;
  readonly capability_requirements: readonly EntityRef[];
  readonly constraints: readonly EntityRef[];
  readonly knowledge: {
    readonly allowed_scope_refs: readonly string[];
    readonly denied_scope_refs: readonly string[];
    readonly context_policy_ref: RevisionRef;
    readonly memory_policy_ref: RevisionRef;
  };
  readonly resources: {
    readonly skill_refs: readonly RevisionRef[];
    readonly tool_refs: readonly RevisionRef[];
    readonly mcp_server_refs: readonly RevisionRef[];
  };
  readonly runtime_preferences: {
    readonly provider_routes: readonly EntityRef[];
    readonly model_requirements: readonly EntityRef[];
    readonly harness_preferences: readonly EntityRef[];
    readonly executor_preferences: readonly EntityRef[];
  };
  readonly governance: {
    readonly authority_refs: readonly EntityRef[];
    readonly permission_policy_ref: RevisionRef;
    readonly approval_policy_ref: RevisionRef;
  };
  readonly economics: {
    readonly cost_policy_ref: RevisionRef;
    readonly budget_policy_ref: RevisionRef;
    readonly settlement_policy_ref?: RevisionRef;
  };
  readonly evidence: {
    readonly audit_policy_ref: RevisionRef;
    readonly evaluation_refs: readonly EntityRef[];
  };
  readonly commit: {
    readonly created_by: string;
    readonly committed_at: number;
    readonly change_reason: string;
  };
}

function listOf<T>(value: unknown, path: string, validator: (entry: unknown, entryPath: string) => T, issues: ValidationIssue[]): readonly T[] {
  if (!Array.isArray(value)) {
    issues.push({ path, code: "INVALID_LIST", message: "An array is required" });
    return [];
  }
  return value.map((entry, index) => {
    try {
      return validator(entry, `${path}[${index}]`);
    } catch (error) {
      if (error instanceof NativeContractValidationError) issues.push(...error.issues);
      else issues.push({ path: `${path}[${index}]`, code: "INVALID_ENTRY", message: "Invalid list entry" });
      return entry as T;
    }
  });
}

function validateStringList(value: unknown, path: string, issues: ValidationIssue[]): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    issues.push({ path, code: "INVALID_STRING_LIST", message: "A list of non-empty strings is required" });
    return [];
  }
  return value as readonly string[];
}

function validatePolicyField(value: unknown, path: string, issues: ValidationIssue[]): RevisionRef {
  try {
    return validateRevisionRef(value, path);
  } catch (error) {
    if (error instanceof NativeContractValidationError) issues.push(...error.issues);
    else issues.push({ path, code: "INVALID_REVISION_REF", message: "Invalid revision reference" });
    return value as RevisionRef;
  }
}

export function validateAgentDefinitionV2(value: unknown): AgentDefinitionV2 {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NativeContractValidationError("invalid AgentDefinition", [{ path: "$", code: "INVALID_OBJECT", message: "AgentDefinition must be an object" }]);
  }
  const definition = value as Partial<AgentDefinitionV2>;
  if (definition.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const [key, entry] of [["agent_id", definition.agent_id], ["name", definition.name], ["ownership_ref", definition.ownership_ref]] as const) {
    if (typeof entry !== "string" || entry.trim().length === 0) issues.push({ path: key, code: "REQUIRED_STRING", message: "A non-empty string is required" });
  }
  try { validateScope(definition.scope, "scope"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!["draft", "active", "disabled", "archived"].includes(definition.status ?? "")) issues.push({ path: "status", code: "INVALID_ENUM", message: "Invalid Agent status" });
  if (!["private", "domain_shared", "explicitly_shared"].includes(definition.sharing_mode ?? "")) issues.push({ path: "sharing_mode", code: "INVALID_ENUM", message: "Invalid sharing mode" });
  if (!Number.isSafeInteger(definition.current_revision) || (definition.current_revision ?? 0) < 1) issues.push({ path: "current_revision", code: "INVALID_INTEGER", message: "current_revision must be >= 1" });
  for (const key of ["created_at", "updated_at"] as const) {
    if (!Number.isSafeInteger(definition[key]) || (definition[key] ?? 0) < 0) issues.push({ path: key, code: "INVALID_TIMESTAMP", message: "Timestamp must be a non-negative safe integer" });
  }
  if ((definition.updated_at ?? 0) < (definition.created_at ?? 0)) issues.push({ path: "updated_at", code: "TIMESTAMP_ORDER", message: "updated_at cannot precede created_at" });
  assertNoSecretMaterial(value);
  return assertValid(definition as AgentDefinitionV2, issues);
}

export function createAgentDefinitionV2(input: Omit<AgentDefinitionV2, "schema_version">): AgentDefinitionV2 {
  return validateAgentDefinitionV2(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function fingerprintAgentRevisionV2(revision: Omit<AgentRevisionV2, "ref">): string {
  const content = {
    schema_version: revision.schema_version,
    supersedes_revision: revision.supersedes_revision,
    role_ref: revision.role_ref,
    instructions: revision.instructions,
    capability_requirements: revision.capability_requirements,
    constraints: revision.constraints,
    knowledge: revision.knowledge,
    resources: revision.resources,
    runtime_preferences: revision.runtime_preferences,
    governance: revision.governance,
    economics: revision.economics,
    evidence: revision.evidence,
  };
  return sha256Hex(stableStringify(content));
}

export function validateAgentRevisionV2(value: unknown): AgentRevisionV2 {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NativeContractValidationError("invalid AgentRevision", [{ path: "$", code: "INVALID_OBJECT", message: "AgentRevision must be an object" }]);
  }
  const revision = value as Partial<AgentRevisionV2>;
  if (revision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  try { validateRevisionRef(revision.ref, "ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (revision.ref && revision.ref.entity_kind !== "agent") issues.push({ path: "ref.entity_kind", code: "INVALID_ENTITY_KIND", message: "Agent revisions must use entity_kind agent" });
  if (revision.supersedes_revision !== undefined && (!Number.isSafeInteger(revision.supersedes_revision) || revision.supersedes_revision < 1)) issues.push({ path: "supersedes_revision", code: "INVALID_INTEGER", message: "supersedes_revision must be >= 1" });
  if (typeof revision.instructions !== "string") issues.push({ path: "instructions", code: "REQUIRED_STRING", message: "instructions must be a string" });
  for (const [key, entry] of [["capability_requirements", revision.capability_requirements], ["constraints", revision.constraints], ["skill_refs", revision.resources?.skill_refs], ["tool_refs", revision.resources?.tool_refs], ["mcp_server_refs", revision.resources?.mcp_server_refs], ["provider_routes", revision.runtime_preferences?.provider_routes], ["model_requirements", revision.runtime_preferences?.model_requirements], ["harness_preferences", revision.runtime_preferences?.harness_preferences], ["executor_preferences", revision.runtime_preferences?.executor_preferences], ["authority_refs", revision.governance?.authority_refs], ["evaluation_refs", revision.evidence?.evaluation_refs]] as const) {
    listOf(entry, key, (item, itemPath) => key.endsWith("_refs") && !["capability_requirements", "constraints", "authority_refs", "evaluation_refs"].includes(key)
      ? validateRevisionRef(item, itemPath)
      : validateEntityRef(item, itemPath), issues);
  }
  const knowledge = revision.knowledge;
  if (!knowledge || typeof knowledge !== "object") issues.push({ path: "knowledge", code: "REQUIRED_OBJECT", message: "knowledge is required" });
  else {
    validateStringList(knowledge.allowed_scope_refs, "knowledge.allowed_scope_refs", issues);
    validateStringList(knowledge.denied_scope_refs, "knowledge.denied_scope_refs", issues);
    validatePolicyField(knowledge.context_policy_ref, "knowledge.context_policy_ref", issues);
    validatePolicyField(knowledge.memory_policy_ref, "knowledge.memory_policy_ref", issues);
  }
  const resources = revision.resources;
  if (!resources || typeof resources !== "object") issues.push({ path: "resources", code: "REQUIRED_OBJECT", message: "resources is required" });
  const preferences = revision.runtime_preferences;
  if (!preferences || typeof preferences !== "object") issues.push({ path: "runtime_preferences", code: "REQUIRED_OBJECT", message: "runtime_preferences is required" });
  const governance = revision.governance;
  if (!governance || typeof governance !== "object") issues.push({ path: "governance", code: "REQUIRED_OBJECT", message: "governance is required" });
  else {
    validatePolicyField(governance.permission_policy_ref, "governance.permission_policy_ref", issues);
    validatePolicyField(governance.approval_policy_ref, "governance.approval_policy_ref", issues);
  }
  const economics = revision.economics;
  if (!economics || typeof economics !== "object") issues.push({ path: "economics", code: "REQUIRED_OBJECT", message: "economics is required" });
  else {
    validatePolicyField(economics.cost_policy_ref, "economics.cost_policy_ref", issues);
    validatePolicyField(economics.budget_policy_ref, "economics.budget_policy_ref", issues);
    if (economics.settlement_policy_ref) validatePolicyField(economics.settlement_policy_ref, "economics.settlement_policy_ref", issues);
  }
  const evidence = revision.evidence;
  if (!evidence || typeof evidence !== "object") issues.push({ path: "evidence", code: "REQUIRED_OBJECT", message: "evidence is required" });
  else validatePolicyField(evidence.audit_policy_ref, "evidence.audit_policy_ref", issues);
  const commit = revision.commit;
  if (!commit || typeof commit !== "object") issues.push({ path: "commit", code: "REQUIRED_OBJECT", message: "commit is required" });
  else {
    for (const key of ["created_by", "change_reason"] as const) if (typeof commit[key] !== "string" || commit[key].trim().length === 0) issues.push({ path: `commit.${key}`, code: "REQUIRED_STRING", message: "A non-empty string is required" });
    if (!Number.isSafeInteger(commit.committed_at) || commit.committed_at < 0) issues.push({ path: "commit.committed_at", code: "INVALID_TIMESTAMP", message: "committed_at must be a non-negative safe integer" });
  }
  assertNoSecretMaterial(value);
  if (revision.ref && revision.ref.fingerprint) {
    const { ref, ...withoutRef } = revision as AgentRevisionV2;
    const expected = fingerprintAgentRevisionV2(withoutRef);
    if (expected !== revision.ref.fingerprint) issues.push({ path: "ref.fingerprint", code: "FINGERPRINT_MISMATCH", message: "Revision fingerprint does not match canonical content" });
  }
  return assertValid(revision as AgentRevisionV2, issues);
}

export function createAgentRevisionV2(input: Omit<AgentRevisionV2, "schema_version" | "ref"> & { readonly agent_id: string; readonly revision: number }): AgentRevisionV2 {
  const { agent_id, revision: revisionNumber, ...body } = input;
  const content = Object.fromEntries(
    Object.entries({ ...body, schema_version: ACS_NATIVE_SCHEMA_VERSION })
      .filter(([, value]) => value !== undefined),
  ) as Omit<AgentRevisionV2, "ref">;
  const fingerprint = fingerprintAgentRevisionV2(content);
  const result: AgentRevisionV2 = {
    ...content,
    ref: { entity_kind: "agent", entity_id: agent_id, revision: revisionNumber, fingerprint },
  } as AgentRevisionV2;
  return validateAgentRevisionV2(freezeNative(result));
}

export function serializeAgentDefinitionV2(value: AgentDefinitionV2): string {
  return serializeNative(validateAgentDefinitionV2(value));
}

export function deserializeAgentDefinitionV2(serialized: string): AgentDefinitionV2 {
  return deserializeNative(serialized, validateAgentDefinitionV2);
}

export function serializeAgentRevisionV2(value: AgentRevisionV2): string {
  return serializeNative(validateAgentRevisionV2(value));
}

export function deserializeAgentRevisionV2(serialized: string): AgentRevisionV2 {
  return deserializeNative(serialized, validateAgentRevisionV2);
}
