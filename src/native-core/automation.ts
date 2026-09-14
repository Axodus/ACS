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
import { validateDelegationGrantRevisionRefV1, type DelegationGrantRevisionRefV1 } from "./delegation.js";

export type AutomationLifecycleV1 = "draft" | "enabled" | "disabled" | "archived";
export type AutomationTargetModeV1 = "PINNED" | "RESOLVED_AT_ACTIVATION";
export type AutomationDefinitionKindV1 = "trigger" | "schedule";

export interface AutomationRevisionRefV1 {
  readonly automation_id: string;
  readonly tenant_id: string;
  readonly revision: number;
  readonly fingerprint: string;
}

export interface AutomationPinnedTargetV1 {
  readonly target_ref: RevisionRef;
}

export interface AutomationResolutionPolicyV1 {
  readonly policy_ref: RevisionRef;
  readonly selector: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface AutomationDefinitionV1 {
  readonly kind: AutomationDefinitionKindV1;
  readonly definition_key: string;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly governed_refs: readonly (EntityRef | RevisionRef)[];
}

export interface AutomationExternalRefsV1 {
  readonly agent_refs: readonly RevisionRef[];
  readonly workforce_refs: readonly RevisionRef[];
  readonly workflow_refs: readonly RevisionRef[];
  readonly resource_refs: readonly RevisionRef[];
  readonly executor_refs: readonly EntityRef[];
}

export interface AutomationRevisionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ref: AutomationRevisionRefV1;
  readonly predecessor_ref?: AutomationRevisionRefV1;
  readonly purpose: string;
  readonly target_mode: AutomationTargetModeV1;
  readonly pinned_target?: AutomationPinnedTargetV1;
  readonly resolution_policy?: AutomationResolutionPolicyV1;
  readonly definitions: readonly AutomationDefinitionV1[];
  readonly external_refs: AutomationExternalRefsV1;
  readonly delegation_requirement_refs: readonly DelegationGrantRevisionRefV1[];
  readonly governing_refs: readonly (EntityRef | RevisionRef)[];
  readonly authored_configuration: Readonly<Record<string, unknown>>;
  readonly authored_by: string;
  readonly authored_at: number;
  readonly change_reason: string;
  readonly provenance_refs: readonly EntityRef[];
}

export interface AutomationHeadV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly automation_id: string;
  readonly tenant_id: string;
  readonly current_revision: number;
  readonly current_fingerprint: string;
  readonly lifecycle: AutomationLifecycleV1;
  readonly lifecycle_sequence: number;
  readonly created_at: number;
  readonly updated_at: number;
}

export interface AutomationLifecycleEventV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly lifecycle_event_id: string;
  readonly automation_ref: AutomationRevisionRefV1;
  readonly sequence: number;
  readonly from_lifecycle?: AutomationLifecycleV1;
  readonly to_lifecycle: AutomationLifecycleV1;
  readonly transitioned_by: string;
  readonly transitioned_at: number;
  readonly reason: string;
  readonly governing_authority_refs: readonly EntityRef[];
  readonly approval_refs: readonly EntityRef[];
  readonly provenance_refs: readonly EntityRef[];
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

function record(value: unknown, path: string, issues: ValidationIssue[]): Readonly<Record<string, unknown>> {
  return object(value, path, issues);
}

function entityList(value: unknown, path: string, issues: ValidationIssue[]): readonly EntityRef[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    try { return validateEntityRef(entry, `${path}[${index}]`); }
    catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return {} as EntityRef; }
  });
}

function revisionList(value: unknown, path: string, issues: ValidationIssue[]): readonly RevisionRef[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    try { return validateRevisionRef(entry, `${path}[${index}]`); }
    catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return {} as RevisionRef; }
  });
}

function mixedRefList(value: unknown, path: string, issues: ValidationIssue[]): readonly (EntityRef | RevisionRef)[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    try {
      const candidate = object(entry, entryPath, issues);
      return "entity_kind" in candidate ? validateRevisionRef(candidate, entryPath) : validateEntityRef(candidate, entryPath);
    } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return {} as EntityRef; }
  });
}

function automationRef(value: unknown, path: string, issues: ValidationIssue[]): AutomationRevisionRefV1 | undefined {
  const ref = object(value, path, issues) as Partial<AutomationRevisionRefV1>;
  requireString(ref.automation_id, `${path}.automation_id`, issues);
  requireString(ref.tenant_id, `${path}.tenant_id`, issues);
  requireSafeInteger(ref.revision, `${path}.revision`, issues, 1);
  requireSha256(ref.fingerprint, `${path}.fingerprint`, issues);
  return ref.automation_id && ref.tenant_id && ref.revision && ref.fingerprint ? ref as AutomationRevisionRefV1 : undefined;
}

export function validateAutomationRevisionRefV1(value: unknown, path = "automation_ref"): AutomationRevisionRefV1 {
  const issues: ValidationIssue[] = [];
  const ref = automationRef(value, path, issues);
  return assertValid(ref as AutomationRevisionRefV1, issues);
}

function validateDefinitions(value: unknown, path: string, issues: ValidationIssue[]): readonly AutomationDefinitionV1[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  const keys = new Set<string>();
  return value.map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const definition = object(entry, itemPath, issues) as Partial<AutomationDefinitionV1>;
    if (definition.kind !== "trigger" && definition.kind !== "schedule") issues.push(issue(`${itemPath}.kind`, "INVALID_ENUM", "Definition kind must be trigger or schedule"));
    requireString(definition.definition_key, `${itemPath}.definition_key`, issues);
    if (typeof definition.definition_key === "string") {
      if (keys.has(definition.definition_key)) issues.push(issue(`${itemPath}.definition_key`, "DUPLICATE_DEFINITION_KEY", "Definition keys must be unique within a revision"));
      keys.add(definition.definition_key);
    }
    const configuration = record(definition.configuration, `${itemPath}.configuration`, issues);
    const refs = mixedRefList(definition.governed_refs, `${itemPath}.governed_refs`, issues);
    return { kind: definition.kind as AutomationDefinitionKindV1, definition_key: definition.definition_key as string, configuration, governed_refs: refs };
  });
}

function validateExternalRefs(value: unknown, path: string, issues: ValidationIssue[]): AutomationExternalRefsV1 {
  const refs = object(value, path, issues) as Partial<AutomationExternalRefsV1>;
  const agents = revisionList(refs.agent_refs, `${path}.agent_refs`, issues);
  const workforces = revisionList(refs.workforce_refs, `${path}.workforce_refs`, issues);
  const workflows = revisionList(refs.workflow_refs, `${path}.workflow_refs`, issues);
  const resources = revisionList(refs.resource_refs, `${path}.resource_refs`, issues);
  for (const [kind, list] of [["agent", agents], ["workforce", workforces], ["workflow", workflows]] as const) {
    if (list.some((entry) => entry.entity_kind !== kind)) issues.push(issue(`${path}.${kind}_refs`, "INVALID_REFERENCE_KIND", `Only ${kind} revision references are allowed`));
  }
  if (resources.some((entry) => entry.entity_kind !== "resource")) issues.push(issue(`${path}.resource_refs`, "INVALID_REFERENCE_KIND", "Only resource revision references are allowed"));
  return { agent_refs: agents, workforce_refs: workforces, workflow_refs: workflows, resource_refs: resources, executor_refs: entityList(refs.executor_refs, `${path}.executor_refs`, issues) };
}

function validateDelegationRequirements(value: unknown, path: string, issues: ValidationIssue[]): readonly DelegationGrantRevisionRefV1[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    try { return validateDelegationGrantRevisionRefV1(entry, `${path}[${index}]`); }
    catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return {} as DelegationGrantRevisionRefV1; }
  });
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical).sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, canonical(entry)]));
  return value;
}

export function fingerprintAutomationRevisionV1(revision: Omit<AutomationRevisionV1, "ref" | "schema_version" | "authored_by" | "authored_at" | "change_reason" | "provenance_refs">): string {
  return sha256Hex(stableStringify(canonical(revision)));
}

export function validateAutomationRevisionV1(value: unknown): AutomationRevisionV1 {
  const issues: ValidationIssue[] = [];
  const revision = object(value, "$", issues) as Partial<AutomationRevisionV1>;
  if (revision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  const ref = automationRef(revision.ref, "ref", issues);
  let predecessor: AutomationRevisionRefV1 | undefined;
  if (revision.predecessor_ref !== undefined) predecessor = automationRef(revision.predecessor_ref, "predecessor_ref", issues);
  requireString(revision.purpose, "purpose", issues);
  if (revision.target_mode !== "PINNED" && revision.target_mode !== "RESOLVED_AT_ACTIVATION") issues.push(issue("target_mode", "INVALID_ENUM", "Target mode must be PINNED or RESOLVED_AT_ACTIVATION"));
  let pinned: AutomationPinnedTargetV1 | undefined;
  if (revision.pinned_target !== undefined) {
    const target = object(revision.pinned_target, "pinned_target", issues) as Partial<AutomationPinnedTargetV1>;
    try { pinned = { target_ref: validateRevisionRef(target.target_ref, "pinned_target.target_ref") }; }
    catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  let policy: AutomationResolutionPolicyV1 | undefined;
  if (revision.resolution_policy !== undefined) {
    const candidate = object(revision.resolution_policy, "resolution_policy", issues) as Partial<AutomationResolutionPolicyV1>;
    let policyRef: RevisionRef | undefined;
    try { policyRef = validateRevisionRef(candidate.policy_ref, "resolution_policy.policy_ref"); }
    catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
    requireString(candidate.selector, "resolution_policy.selector", issues);
    const parameters = record(candidate.parameters, "resolution_policy.parameters", issues);
    if (policyRef && candidate.selector) policy = { policy_ref: policyRef, selector: candidate.selector, parameters };
  }
  if (revision.target_mode === "PINNED" && (!pinned || policy)) issues.push(issue("target_mode", "INVALID_TARGET_MODE_SHAPE", "PINNED requires exact target_ref and forbids resolution_policy"));
  if (revision.target_mode === "RESOLVED_AT_ACTIVATION" && (!policy || pinned)) issues.push(issue("target_mode", "INVALID_TARGET_MODE_SHAPE", "RESOLVED_AT_ACTIVATION requires deterministic policy and forbids exact target"));
  const definitions = validateDefinitions(revision.definitions, "definitions", issues);
  const external = validateExternalRefs(revision.external_refs, "external_refs", issues);
  const delegation = validateDelegationRequirements(revision.delegation_requirement_refs, "delegation_requirement_refs", issues);
  if (ref && delegation.some((item) => item.tenant_id !== ref.tenant_id)) issues.push(issue("delegation_requirement_refs", "TENANT_MISMATCH", "Delegation requirements must belong to the Automation Tenant"));
  const governing = mixedRefList(revision.governing_refs, "governing_refs", issues);
  const authored = record(revision.authored_configuration, "authored_configuration", issues);
  requireString(revision.authored_by, "authored_by", issues);
  requireSafeInteger(revision.authored_at, "authored_at", issues, 0);
  requireString(revision.change_reason, "change_reason", issues);
  const provenance = entityList(revision.provenance_refs, "provenance_refs", issues);
  if (ref && ref.revision === 1 && predecessor) issues.push(issue("predecessor_ref", "UNEXPECTED_PREDECESSOR", "First revision cannot have a predecessor"));
  if (ref && ref.revision > 1 && (!predecessor || predecessor.automation_id !== ref.automation_id || predecessor.tenant_id !== ref.tenant_id || predecessor.revision !== ref.revision - 1)) issues.push(issue("predecessor_ref", "INVALID_PREDECESSOR", "Later revisions require the immediately preceding exact Automation revision"));
  if (ref) {
    const expected = fingerprintAutomationRevisionV1({ predecessor_ref: predecessor, purpose: revision.purpose as string, target_mode: revision.target_mode as AutomationTargetModeV1, pinned_target: pinned, resolution_policy: policy, definitions, external_refs: external, delegation_requirement_refs: delegation, governing_refs: governing, authored_configuration: authored });
    if (ref.fingerprint !== expected) issues.push(issue("ref.fingerprint", "FINGERPRINT_MISMATCH", "Fingerprint must derive from normalized semantic configuration"));
  }
  assertNoSecretMaterial(value);
  return freezeNative(assertValid({ ...revision, ref, predecessor_ref: predecessor, pinned_target: pinned, resolution_policy: policy, definitions, external_refs: external, delegation_requirement_refs: delegation, governing_refs: governing, authored_configuration: authored, provenance_refs: provenance } as AutomationRevisionV1, issues));
}

export function createAutomationRevisionV1(input: Omit<AutomationRevisionV1, "schema_version" | "ref"> & { readonly automation_id: string; readonly tenant_id: string; readonly revision: number }): AutomationRevisionV1 {
  const { automation_id, tenant_id, revision, ...content } = input;
  const semantic = { predecessor_ref: content.predecessor_ref, purpose: content.purpose, target_mode: content.target_mode, pinned_target: content.pinned_target, resolution_policy: content.resolution_policy, definitions: content.definitions, external_refs: content.external_refs, delegation_requirement_refs: content.delegation_requirement_refs, governing_refs: content.governing_refs, authored_configuration: content.authored_configuration };
  return validateAutomationRevisionV1(freezeNative({ ...content, schema_version: ACS_NATIVE_SCHEMA_VERSION, ref: { automation_id, tenant_id, revision, fingerprint: fingerprintAutomationRevisionV1(semantic) } }));
}

export function validateAutomationHeadV1(value: unknown): AutomationHeadV1 {
  const issues: ValidationIssue[] = [];
  const head = object(value, "$", issues) as Partial<AutomationHeadV1>;
  if (head.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  requireString(head.automation_id, "automation_id", issues);
  requireString(head.tenant_id, "tenant_id", issues);
  requireSafeInteger(head.current_revision, "current_revision", issues, 1);
  requireSha256(head.current_fingerprint, "current_fingerprint", issues);
  if (!["draft", "enabled", "disabled", "archived"].includes(head.lifecycle as string)) issues.push(issue("lifecycle", "INVALID_ENUM", "Invalid Automation lifecycle"));
  requireSafeInteger(head.lifecycle_sequence, "lifecycle_sequence", issues, 1);
  requireSafeInteger(head.created_at, "created_at", issues, 0);
  requireSafeInteger(head.updated_at, "updated_at", issues, 0);
  assertNoSecretMaterial(value);
  return assertValid(head as AutomationHeadV1, issues);
}

export function createAutomationHeadV1(revision: AutomationRevisionV1, at: number): AutomationHeadV1 {
  return validateAutomationHeadV1(freezeNative({ schema_version: ACS_NATIVE_SCHEMA_VERSION, automation_id: revision.ref.automation_id, tenant_id: revision.ref.tenant_id, current_revision: revision.ref.revision, current_fingerprint: revision.ref.fingerprint, lifecycle: "draft", lifecycle_sequence: 1, created_at: at, updated_at: at }));
}

export function assertAutomationHeadAdvanceV1(head: AutomationHeadV1, next: AutomationRevisionV1, expected: Pick<AutomationHeadV1, "current_revision" | "current_fingerprint">): AutomationHeadV1 {
  if (head.lifecycle === "archived") throw new NativeContractValidationError("Automation is archived", [issue("lifecycle", "ARCHIVED_TERMINAL", "Archived Automation cannot accept a new revision")]);
  if (head.current_revision !== expected.current_revision || head.current_fingerprint !== expected.current_fingerprint) throw new NativeContractValidationError("stale Automation head", [issue("expected", "STALE_HEAD", "Expected head revision/fingerprint does not match")]);
  if (head.automation_id !== next.ref.automation_id || head.tenant_id !== next.ref.tenant_id || next.ref.revision !== head.current_revision + 1 || next.predecessor_ref?.fingerprint !== head.current_fingerprint) throw new NativeContractValidationError("invalid Automation head advance", [issue("next", "HEAD_ADVANCE_MISMATCH", "Next revision must extend the exact current head")]);
  return validateAutomationHeadV1(freezeNative({ ...head, current_revision: next.ref.revision, current_fingerprint: next.ref.fingerprint, updated_at: next.authored_at }));
}

export function validateAutomationLifecycleEventV1(value: unknown): AutomationLifecycleEventV1 {
  const issues: ValidationIssue[] = [];
  const event = object(value, "$", issues) as Partial<AutomationLifecycleEventV1>;
  if (event.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  requireString(event.lifecycle_event_id, "lifecycle_event_id", issues);
  const ref = automationRef(event.automation_ref, "automation_ref", issues);
  requireSafeInteger(event.sequence, "sequence", issues, 1);
  if (event.from_lifecycle !== undefined && !["draft", "enabled", "disabled", "archived"].includes(event.from_lifecycle)) issues.push(issue("from_lifecycle", "INVALID_ENUM", "Invalid Automation lifecycle"));
  if (!["draft", "enabled", "disabled", "archived"].includes(event.to_lifecycle as string)) issues.push(issue("to_lifecycle", "INVALID_ENUM", "Invalid Automation lifecycle"));
  requireString(event.transitioned_by, "transitioned_by", issues);
  requireSafeInteger(event.transitioned_at, "transitioned_at", issues, 0);
  requireString(event.reason, "reason", issues);
  const authority = entityList(event.governing_authority_refs, "governing_authority_refs", issues);
  const approvals = entityList(event.approval_refs, "approval_refs", issues);
  const provenance = entityList(event.provenance_refs, "provenance_refs", issues);
  assertNoSecretMaterial(value);
  return assertValid({ ...event, automation_ref: ref, governing_authority_refs: authority, approval_refs: approvals, provenance_refs: provenance } as AutomationLifecycleEventV1, issues);
}

function allowedTransition(from: AutomationLifecycleV1, to: AutomationLifecycleV1): boolean {
  return (from === "draft" && to === "enabled")
    || (from === "enabled" && to === "disabled")
    || (from === "disabled" && to === "enabled")
    || (["draft", "enabled", "disabled"].includes(from) && to === "archived");
}

export function createAutomationLifecycleEventV1(input: Omit<AutomationLifecycleEventV1, "schema_version" | "from_lifecycle" | "to_lifecycle" | "sequence" | "automation_ref"> & { readonly head: AutomationHeadV1; readonly revision: AutomationRevisionV1; readonly to_lifecycle: AutomationLifecycleV1 }): AutomationLifecycleEventV1 {
  const { head, revision, to_lifecycle, ...content } = input;
  if (head.automation_id !== revision.ref.automation_id || head.tenant_id !== revision.ref.tenant_id || head.current_revision !== revision.ref.revision || head.current_fingerprint !== revision.ref.fingerprint) throw new NativeContractValidationError("lifecycle head does not select exact revision", [issue("head", "HEAD_REVISION_MISMATCH", "Lifecycle must observe the exact current Automation revision")]);
  if (!allowedTransition(head.lifecycle, to_lifecycle)) throw new NativeContractValidationError("invalid Automation lifecycle transition", [issue("to_lifecycle", "INVALID_LIFECYCLE_TRANSITION", "Lifecycle transition is not allowed")]);
  return validateAutomationLifecycleEventV1(freezeNative({ ...content, schema_version: ACS_NATIVE_SCHEMA_VERSION, automation_ref: revision.ref, sequence: head.lifecycle_sequence + 1, from_lifecycle: head.lifecycle, to_lifecycle }));
}

export function applyAutomationLifecycleEventV1(head: AutomationHeadV1, event: AutomationLifecycleEventV1): AutomationHeadV1 {
  if (head.automation_id !== event.automation_ref.automation_id || head.tenant_id !== event.automation_ref.tenant_id || head.current_revision !== event.automation_ref.revision || head.current_fingerprint !== event.automation_ref.fingerprint || head.lifecycle !== event.from_lifecycle || event.sequence !== head.lifecycle_sequence + 1) throw new NativeContractValidationError("lifecycle event does not advance current head", [issue("event", "LIFECYCLE_HEAD_MISMATCH", "Lifecycle event must advance the exact current head")]);
  return validateAutomationHeadV1(freezeNative({ ...head, lifecycle: event.to_lifecycle, lifecycle_sequence: event.sequence, updated_at: event.transitioned_at }));
}
