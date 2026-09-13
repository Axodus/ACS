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
import type { AgentRevisionV2 } from "./agent.js";

export const EFFECTIVE_CONFIGURATION_RESOLVER_VERSION = "acs.effective-configuration.v1" as const;

export type EffectiveConfigurationClass =
  | "presentation" | "model_preference" | "capability_requirements" | "skill_tool_binding"
  | "credential_binding" | "security_constraints" | "governance_policies" | "runtime_constraints"
  | "memory_policy" | "evidence_policy" | "cost_budget";

export type EffectiveConfigurationStatus = "resolved" | "not_applicable" | "unavailable";

export interface EffectiveConfigurationClassResolutionV1 {
  readonly configuration_class: EffectiveConfigurationClass;
  readonly rule: string;
  readonly status: EffectiveConfigurationStatus;
  readonly source_refs: readonly EntityRef[];
  readonly source_revision_refs: readonly RevisionRef[];
  readonly resolved_refs: readonly EntityRef[];
  readonly resolved_revision_refs: readonly RevisionRef[];
}

export interface EffectiveConfigurationSnapshotV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly snapshot_id: string;
  readonly resolver_version: typeof EFFECTIVE_CONFIGURATION_RESOLVER_VERSION;
  readonly run_id: string;
  readonly task_id: string;
  readonly assignment_id: string;
  readonly assignment_generation: number;
  readonly agent_revision_ref: RevisionRef;
  readonly workforce_revision_ref: RevisionRef;
  readonly resolved_at: number;
  readonly classes: readonly EffectiveConfigurationClassResolutionV1[];
  readonly input_fingerprint: string;
  readonly effective_fingerprint: string;
  readonly predecessor_snapshot_id?: string;
}

const CLASSES: readonly EffectiveConfigurationClass[] = [
  "presentation", "model_preference", "capability_requirements", "skill_tool_binding",
  "credential_binding", "security_constraints", "governance_policies", "runtime_constraints",
  "memory_policy", "evidence_policy", "cost_budget",
];

function issue(path: string, code: string, message: string): ValidationIssue { return { path, code, message }; }

function validateRefList(value: unknown, path: string, validator: (entry: unknown, entryPath: string) => unknown, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) { issues.push(issue(path, "INVALID_LIST", "An array is required")); return; }
  value.forEach((entry, index) => { try { validator(entry, `${path}[${index}]`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); } });
}

function inputMaterial(snapshot: EffectiveConfigurationSnapshotV1): unknown {
  return {
    schema_version: snapshot.schema_version,
    resolver_version: snapshot.resolver_version,
    run_id: snapshot.run_id,
    task_id: snapshot.task_id,
    assignment_id: snapshot.assignment_id,
    assignment_generation: snapshot.assignment_generation,
    agent_revision_ref: snapshot.agent_revision_ref,
    workforce_revision_ref: snapshot.workforce_revision_ref,
    predecessor_snapshot_id: snapshot.predecessor_snapshot_id,
    classes: snapshot.classes.map((entry) => ({
      configuration_class: entry.configuration_class,
      rule: entry.rule,
      status: entry.status,
      source_refs: entry.source_refs,
      source_revision_refs: entry.source_revision_refs,
    })),
  };
}

function effectiveMaterial(snapshot: EffectiveConfigurationSnapshotV1): unknown {
  const { snapshot_id, input_fingerprint, effective_fingerprint, ...content } = snapshot;
  return content;
}

export function validateEffectiveConfigurationSnapshotV1(value: unknown): EffectiveConfigurationSnapshotV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NativeContractValidationError("invalid EffectiveConfigurationSnapshot", [issue("$", "INVALID_OBJECT", "An object is required")]);
  const snapshot = value as Partial<EffectiveConfigurationSnapshotV1>;
  const issues: ValidationIssue[] = [];
  if (snapshot.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  if (snapshot.resolver_version !== EFFECTIVE_CONFIGURATION_RESOLVER_VERSION) issues.push(issue("resolver_version", "UNSUPPORTED_RESOLVER_VERSION", `Expected ${EFFECTIVE_CONFIGURATION_RESOLVER_VERSION}`));
  for (const key of ["snapshot_id", "run_id", "task_id", "assignment_id"] as const) requireString(snapshot[key], key, issues);
  requireSafeInteger(snapshot.assignment_generation, "assignment_generation", issues, 1);
  requireSafeInteger(snapshot.resolved_at, "resolved_at", issues, 0);
  if (snapshot.predecessor_snapshot_id !== undefined) requireString(snapshot.predecessor_snapshot_id, "predecessor_snapshot_id", issues);
  try { validateRevisionRef(snapshot.agent_revision_ref, "agent_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { validateRevisionRef(snapshot.workforce_revision_ref, "workforce_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!Array.isArray(snapshot.classes) || snapshot.classes.length !== CLASSES.length) {
    issues.push(issue("classes", "INVALID_CLASS_SET", "Every configuration class must be represented exactly once"));
  } else {
    const seen = new Set<string>();
    snapshot.classes.forEach((entry, index) => {
      const path = `classes[${index}]`;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) { issues.push(issue(path, "INVALID_OBJECT", "An object is required")); return; }
      if (!CLASSES.includes(entry.configuration_class)) issues.push(issue(`${path}.configuration_class`, "INVALID_ENUM", "Unsupported configuration class"));
      if (seen.has(entry.configuration_class)) issues.push(issue(`${path}.configuration_class`, "DUPLICATE_CLASS", "Configuration class must occur once"));
      seen.add(entry.configuration_class);
      requireString(entry.rule, `${path}.rule`, issues);
      if (!["resolved", "not_applicable", "unavailable"].includes(entry.status)) issues.push(issue(`${path}.status`, "INVALID_ENUM", "Unsupported resolution status"));
      validateRefList(entry.source_refs, `${path}.source_refs`, validateEntityRef, issues);
      validateRefList(entry.source_revision_refs, `${path}.source_revision_refs`, validateRevisionRef, issues);
      validateRefList(entry.resolved_refs, `${path}.resolved_refs`, validateEntityRef, issues);
      validateRefList(entry.resolved_revision_refs, `${path}.resolved_revision_refs`, validateRevisionRef, issues);
    });
    for (const configurationClass of CLASSES) if (!seen.has(configurationClass)) issues.push(issue("classes", "MISSING_CLASS", `Missing ${configurationClass}`));
  }
  requireSha256(snapshot.input_fingerprint, "input_fingerprint", issues);
  requireSha256(snapshot.effective_fingerprint, "effective_fingerprint", issues);
  assertNoSecretMaterial(value);
  if (!issues.length) {
    const typed = snapshot as EffectiveConfigurationSnapshotV1;
    if (typed.input_fingerprint !== sha256Hex(stableStringify(inputMaterial(typed)))) issues.push(issue("input_fingerprint", "FINGERPRINT_MISMATCH", "Input fingerprint does not match exact sources and rules"));
    if (typed.effective_fingerprint !== sha256Hex(stableStringify(effectiveMaterial(typed)))) issues.push(issue("effective_fingerprint", "FINGERPRINT_MISMATCH", "Effective fingerprint does not match resolved snapshot"));
  }
  return assertValid(snapshot as EffectiveConfigurationSnapshotV1, issues);
}

export function createEffectiveConfigurationSnapshotV1(input: Omit<EffectiveConfigurationSnapshotV1, "schema_version" | "resolver_version" | "input_fingerprint" | "effective_fingerprint">): EffectiveConfigurationSnapshotV1 {
  const base = { ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION, resolver_version: EFFECTIVE_CONFIGURATION_RESOLVER_VERSION } as Omit<EffectiveConfigurationSnapshotV1, "input_fingerprint" | "effective_fingerprint">;
  const input_fingerprint = sha256Hex(stableStringify(inputMaterial(base as EffectiveConfigurationSnapshotV1)));
  const effective_fingerprint = sha256Hex(stableStringify(effectiveMaterial({ ...base, input_fingerprint, effective_fingerprint: "" } as EffectiveConfigurationSnapshotV1)));
  return validateEffectiveConfigurationSnapshotV1(freezeNative({ ...base, input_fingerprint, effective_fingerprint }));
}

function resolution(configuration_class: EffectiveConfigurationClass, rule: string, status: EffectiveConfigurationStatus, source_refs: readonly EntityRef[] = [], source_revision_refs: readonly RevisionRef[] = [], resolved_refs: readonly EntityRef[] = [], resolved_revision_refs: readonly RevisionRef[] = []): EffectiveConfigurationClassResolutionV1 {
  return { configuration_class, rule, status, source_refs, source_revision_refs, resolved_refs, resolved_revision_refs };
}

export function createAgentEffectiveConfigurationSnapshotV1(input: {
  readonly snapshot_id: string;
  readonly run_id: string;
  readonly task_id: string;
  readonly assignment_id: string;
  readonly assignment_generation: number;
  readonly agent_revision: AgentRevisionV2;
  readonly workforce_revision_ref: RevisionRef;
  readonly resolved_at: number;
  readonly predecessor_snapshot_id?: string;
}): EffectiveConfigurationSnapshotV1 {
  const revision = input.agent_revision;
  const policyRefs = [revision.governance.permission_policy_ref, revision.governance.approval_policy_ref];
  return createEffectiveConfigurationSnapshotV1({
    snapshot_id: input.snapshot_id, run_id: input.run_id, task_id: input.task_id, assignment_id: input.assignment_id,
    assignment_generation: input.assignment_generation, agent_revision_ref: revision.ref, workforce_revision_ref: input.workforce_revision_ref,
    resolved_at: input.resolved_at, ...(input.predecessor_snapshot_id ? { predecessor_snapshot_id: input.predecessor_snapshot_id } : {}),
    classes: [
      resolution("presentation", "projection_only", "not_applicable", [], [revision.ref]),
      resolution("model_preference", "eligible_selection", "unavailable", revision.runtime_preferences.provider_routes.concat(revision.runtime_preferences.model_requirements), [revision.ref]),
      resolution("capability_requirements", "requirements_union", "resolved", revision.capability_requirements, [revision.ref], revision.capability_requirements),
      resolution("skill_tool_binding", "bound_resource_subset", "resolved", [], [revision.ref, ...revision.resources.skill_refs, ...revision.resources.tool_refs], [], [...revision.resources.skill_refs, ...revision.resources.tool_refs]),
      resolution("credential_binding", "opaque_authorized_selection", "not_applicable", [], [revision.ref]),
      resolution("security_constraints", "strictest_constraint", "resolved", revision.constraints.concat(revision.governance.authority_refs), [revision.ref], revision.constraints),
      resolution("governance_policies", "policy_kind_semantics", "resolved", revision.governance.authority_refs, [revision.ref, ...policyRefs], revision.governance.authority_refs, policyRefs),
      resolution("runtime_constraints", "eligible_selection", "resolved", revision.runtime_preferences.harness_preferences.concat(revision.runtime_preferences.executor_preferences), [revision.ref], revision.runtime_preferences.harness_preferences.concat(revision.runtime_preferences.executor_preferences)),
      resolution("memory_policy", "owner_required", "unavailable", [], [revision.ref, revision.knowledge.memory_policy_ref]),
      resolution("evidence_policy", "mandatory_accumulation", "resolved", revision.evidence.evaluation_refs, [revision.ref, revision.evidence.audit_policy_ref], revision.evidence.evaluation_refs, [revision.evidence.audit_policy_ref]),
      resolution("cost_budget", "attenuating_budget", "resolved", [], [revision.ref, revision.economics.cost_policy_ref, revision.economics.budget_policy_ref].concat(revision.economics.settlement_policy_ref ? [revision.economics.settlement_policy_ref] : []), [], [revision.economics.cost_policy_ref, revision.economics.budget_policy_ref].concat(revision.economics.settlement_policy_ref ? [revision.economics.settlement_policy_ref] : [])),
    ],
  });
}

export function reconstructEffectiveConfigurationSnapshotV1(snapshot: EffectiveConfigurationSnapshotV1): EffectiveConfigurationSnapshotV1 {
  return validateEffectiveConfigurationSnapshotV1(snapshot);
}
