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
  Scope,
  sha256Hex,
  stableStringify,
  validateEntityRef,
  validateRevisionRef,
  validateScope,
  ValidationIssue,
} from "./primitives.js";
import type { AgentRevisionV2 } from "./agent.js";

export const EFFECTIVE_CONFIGURATION_RESOLVER_VERSION = "acs.effective-configuration.v1" as const;

export type EffectiveConfigurationClass =
  | "presentation" | "model_preference" | "capability_requirements" | "skill_tool_binding"
  | "credential_binding" | "security_constraints" | "governance_policies" | "runtime_constraints"
  | "memory_policy" | "evidence_policy" | "cost_budget";

export type EffectiveConfigurationStatus = "resolved" | "not_applicable" | "unavailable";

export interface GovernedResourceObservationV1 {
  readonly kind: "skill" | "tool" | "capability" | "legacy_capability_requirement_preset" | "provider_model";
  readonly resource_id: string;
  readonly revision: number;
  readonly observed_at: number;
  readonly content: Readonly<Record<string, unknown>>;
  readonly content_fingerprint: string;
}

export type EffectiveConfigurationDecision = "selected" | "attenuated" | "rejected" | "unavailable" | "not_applicable";

export interface EffectiveConfigurationDecisionProvenanceV1 {
  readonly decision: EffectiveConfigurationDecision;
  readonly considered_refs: readonly EntityRef[];
  readonly selected_refs: readonly EntityRef[];
  readonly authority_refs: readonly EntityRef[];
  readonly attenuated_refs: readonly EntityRef[];
  readonly rejected_refs: readonly EntityRef[];
  readonly unavailable_refs: readonly EntityRef[];
  readonly reason_code: string;
  readonly observation_fingerprints: readonly string[];
}

export interface EffectiveConfigurationClassResolutionV1 {
  readonly configuration_class: EffectiveConfigurationClass;
  readonly rule: string;
  readonly status: EffectiveConfigurationStatus;
  readonly source_refs: readonly EntityRef[];
  readonly source_revision_refs: readonly RevisionRef[];
  readonly resolved_refs: readonly EntityRef[];
  readonly resolved_revision_refs: readonly RevisionRef[];
  readonly provenance: EffectiveConfigurationDecisionProvenanceV1;
}

export interface EffectiveConfigurationSnapshotV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly snapshot_id: string;
  readonly resolver_version: typeof EFFECTIVE_CONFIGURATION_RESOLVER_VERSION;
  readonly run_id: string;
  readonly task_id: string;
  readonly assignment_id: string;
  readonly assignment_generation: number;
  readonly scope: Scope;
  readonly agent_revision_ref: RevisionRef;
  readonly workforce_revision_ref: RevisionRef;
  readonly resolved_at: number;
  readonly classes: readonly EffectiveConfigurationClassResolutionV1[];
  readonly resource_observations: readonly GovernedResourceObservationV1[];
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
    scope: snapshot.scope,
    agent_revision_ref: snapshot.agent_revision_ref,
    workforce_revision_ref: snapshot.workforce_revision_ref,
    predecessor_snapshot_id: snapshot.predecessor_snapshot_id,
    resource_observations: snapshot.resource_observations,
    classes: snapshot.classes.map((entry) => ({
      configuration_class: entry.configuration_class,
      rule: entry.rule,
      status: entry.status,
      source_refs: entry.source_refs,
      source_revision_refs: entry.source_revision_refs,
      provenance: entry.provenance,
    })),
  };
}

function effectiveMaterial(snapshot: EffectiveConfigurationSnapshotV1): unknown {
  const { snapshot_id, input_fingerprint, effective_fingerprint, ...content } = snapshot;
  return content;
}

function validateHistoricalResourceCoverage(snapshot: Partial<EffectiveConfigurationSnapshotV1>, issues: ValidationIssue[]): void {
  if (!Array.isArray(snapshot.resource_observations) || !Array.isArray(snapshot.classes)) return;
  const hasObservation = (kinds: readonly GovernedResourceObservationV1["kind"][], resourceId: string, revision?: number): boolean => snapshot.resource_observations!.some((observation) => observation
    && typeof observation === "object"
    && kinds.includes((observation as GovernedResourceObservationV1).kind)
    && (observation as GovernedResourceObservationV1).resource_id === resourceId
    && (revision === undefined || (observation as GovernedResourceObservationV1).revision === revision));
  const capabilities = snapshot.classes.find((entry) => entry?.configuration_class === "capability_requirements");
  if (capabilities?.status === "resolved" && Array.isArray(capabilities.source_refs)) {
    capabilities.source_refs.forEach((requirement: EntityRef, index: number) => {
      if (requirement?.kind === "capability" && !hasObservation(["capability"], requirement.id, requirement.revision)) {
        issues.push(issue(`classes.capability_requirements.source_refs[${index}]`, "HISTORICAL_OBSERVATION_MISSING", "A resolved Capability Requirement needs immutable admission evidence"));
      }
    });
  }
  const bindings = snapshot.classes.find((entry) => entry?.configuration_class === "skill_tool_binding");
  if (bindings?.status === "resolved" && Array.isArray(bindings.resolved_revision_refs)) {
    bindings.resolved_revision_refs.forEach((resource: RevisionRef, index: number) => {
      if (resource?.entity_kind === "resource" && !hasObservation(["skill", "tool"], resource.entity_id, resource.revision)) {
        issues.push(issue(`classes.skill_tool_binding.resolved_revision_refs[${index}]`, "HISTORICAL_OBSERVATION_MISSING", "A resolved Skill or Tool binding needs immutable admission evidence"));
      }
    });
  }
  const model = snapshot.classes.find((entry) => entry?.configuration_class === "model_preference");
  if (model?.status === "resolved" && Array.isArray(model.provenance?.selected_refs)) {
    const providerIds = model.provenance.selected_refs.filter((ref: EntityRef) => ref?.kind === "provider").map((ref: EntityRef) => ref.id);
    const modelIds = model.provenance.selected_refs.filter((ref: EntityRef) => ref?.kind === "model").map((ref: EntityRef) => ref.id);
    if (providerIds.length > 0 && modelIds.length > 0) {
      const hasExactPair = providerIds.some((providerId: string) => modelIds.some((modelId: string) => snapshot.resource_observations!.some((observation) => observation.kind === "provider_model" && observation.resource_id === `${providerId}/${modelId}`)));
      if (!hasExactPair) issues.push(issue("classes.model_preference.provenance", "HISTORICAL_OBSERVATION_MISSING", "A resolved provider/model selection needs exact immutable admission evidence"));
    }
  }
}

export function validateEffectiveConfigurationSnapshotV1(value: unknown): EffectiveConfigurationSnapshotV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NativeContractValidationError("invalid EffectiveConfigurationSnapshot", [issue("$", "INVALID_OBJECT", "An object is required")]);
  const snapshot = value as Partial<EffectiveConfigurationSnapshotV1>;
  const issues: ValidationIssue[] = [];
  if (snapshot.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", `Expected ${ACS_NATIVE_SCHEMA_VERSION}`));
  if (snapshot.resolver_version !== EFFECTIVE_CONFIGURATION_RESOLVER_VERSION) issues.push(issue("resolver_version", "UNSUPPORTED_RESOLVER_VERSION", `Expected ${EFFECTIVE_CONFIGURATION_RESOLVER_VERSION}`));
  for (const key of ["snapshot_id", "run_id", "task_id", "assignment_id"] as const) requireString(snapshot[key], key, issues);
  requireSafeInteger(snapshot.assignment_generation, "assignment_generation", issues, 1);
  try { validateScope(snapshot.scope, "scope"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireSafeInteger(snapshot.resolved_at, "resolved_at", issues, 0);
  if (snapshot.predecessor_snapshot_id !== undefined) requireString(snapshot.predecessor_snapshot_id, "predecessor_snapshot_id", issues);
  if (!Array.isArray(snapshot.resource_observations)) issues.push(issue("resource_observations", "INVALID_LIST", "An array is required"));
  else {
    const observedResources = new Set<string>();
    snapshot.resource_observations.forEach((observation, index) => {
      try {
        const validated = validateGovernedResourceObservationV1(observation);
        const key = `${validated.kind}:${validated.resource_id}:${validated.revision}`;
        if (observedResources.has(key)) issues.push(issue(`resource_observations[${index}]`, "DUPLICATE_OBSERVATION", "Each observed resource revision may appear once"));
        observedResources.add(key);
      } catch (error) {
        if (error instanceof NativeContractValidationError) issues.push(...error.issues.map((entry) => ({ ...entry, path: `resource_observations[${index}].${entry.path}` })));
      }
    });
  }
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
      const provenance = entry.provenance;
      if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) issues.push(issue(`${path}.provenance`, "INVALID_OBJECT", "A provenance object is required"));
      else {
        if (!["selected", "attenuated", "rejected", "unavailable", "not_applicable"].includes(provenance.decision)) issues.push(issue(`${path}.provenance.decision`, "INVALID_ENUM", "Unsupported provenance decision"));
        for (const key of ["considered_refs", "selected_refs", "authority_refs", "attenuated_refs", "rejected_refs", "unavailable_refs", "observation_fingerprints"] as const) {
          if (!Array.isArray(provenance[key])) issues.push(issue(`${path}.provenance.${key}`, "INVALID_LIST", "An array is required"));
        }
        validateRefList(provenance.considered_refs, `${path}.provenance.considered_refs`, validateEntityRef, issues);
        validateRefList(provenance.selected_refs, `${path}.provenance.selected_refs`, validateEntityRef, issues);
        validateRefList(provenance.authority_refs, `${path}.provenance.authority_refs`, validateEntityRef, issues);
        validateRefList(provenance.attenuated_refs, `${path}.provenance.attenuated_refs`, validateEntityRef, issues);
        validateRefList(provenance.rejected_refs, `${path}.provenance.rejected_refs`, validateEntityRef, issues);
        validateRefList(provenance.unavailable_refs, `${path}.provenance.unavailable_refs`, validateEntityRef, issues);
        (provenance.observation_fingerprints ?? []).forEach((fingerprint: unknown, fingerprintIndex: number) => requireSha256(fingerprint, `${path}.provenance.observation_fingerprints[${fingerprintIndex}]`, issues));
        requireString(provenance.reason_code, `${path}.provenance.reason_code`, issues);
      }
    });
    for (const configurationClass of CLASSES) if (!seen.has(configurationClass)) issues.push(issue("classes", "MISSING_CLASS", `Missing ${configurationClass}`));
  }
  validateHistoricalResourceCoverage(snapshot, issues);
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

export function validateGovernedResourceObservationV1(value: unknown): GovernedResourceObservationV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NativeContractValidationError("invalid governed resource observation", [issue("$", "INVALID_OBJECT", "An object is required")]);
  const observation = value as Partial<GovernedResourceObservationV1>;
  const issues: ValidationIssue[] = [];
  if (!["skill", "tool", "capability", "legacy_capability_requirement_preset", "provider_model"].includes(observation.kind ?? "")) issues.push(issue("kind", "INVALID_ENUM", "Unsupported governed resource observation kind"));
  requireString(observation.resource_id, "resource_id", issues);
  requireSafeInteger(observation.revision, "revision", issues, 1);
  requireSafeInteger(observation.observed_at, "observed_at", issues, 0);
  if (!observation.content || typeof observation.content !== "object" || Array.isArray(observation.content)) issues.push(issue("content", "INVALID_OBJECT", "An object is required"));
  if (observation.kind === "provider_model" && observation.content && typeof observation.content === "object" && !Array.isArray(observation.content)) {
    const content = observation.content as Record<string, unknown>;
    requireString(content.provider_id, "content.provider_id", issues);
    requireString(content.model_id, "content.model_id", issues);
    if (!["available", "preview", "deprecated", "unavailable"].includes(String(content.availability))) issues.push(issue("content.availability", "INVALID_ENUM", "Unsupported provider/model availability"));
    if (content.authority_grant !== false) issues.push(issue("content.authority_grant", "AUTHORITY_FORBIDDEN", "Provider/model observations cannot grant authority"));
    if (typeof observation.resource_id === "string" && typeof content.provider_id === "string" && typeof content.model_id === "string" && observation.resource_id !== `${content.provider_id}/${content.model_id}`) issues.push(issue("resource_id", "RESOURCE_ID_MISMATCH", "Provider/model resource_id must be provider_id/model_id"));
  }
  requireSha256(observation.content_fingerprint, "content_fingerprint", issues);
  assertNoSecretMaterial(value);
  if (!issues.length && observation.content_fingerprint !== sha256Hex(stableStringify({ kind: observation.kind, resource_id: observation.resource_id, revision: observation.revision, content: observation.content }))) issues.push(issue("content_fingerprint", "FINGERPRINT_MISMATCH", "Observation fingerprint does not match immutable resource content"));
  return assertValid(observation as GovernedResourceObservationV1, issues);
}

export function createGovernedResourceObservationV1(input: Omit<GovernedResourceObservationV1, "content_fingerprint">): GovernedResourceObservationV1 {
  const content_fingerprint = sha256Hex(stableStringify({ kind: input.kind, resource_id: input.resource_id, revision: input.revision, content: input.content }));
  return freezeNative(validateGovernedResourceObservationV1({ ...input, content_fingerprint }));
}

function resolution(configuration_class: EffectiveConfigurationClass, rule: string, status: EffectiveConfigurationStatus, source_refs: readonly EntityRef[] = [], source_revision_refs: readonly RevisionRef[] = [], resolved_refs: readonly EntityRef[] = [], resolved_revision_refs: readonly RevisionRef[] = [], options: { readonly authority_refs?: readonly EntityRef[]; readonly attenuated_refs?: readonly EntityRef[]; readonly rejected_refs?: readonly EntityRef[]; readonly unavailable_refs?: readonly EntityRef[]; readonly observation_fingerprints?: readonly string[]; readonly reason_code?: string } = {}): EffectiveConfigurationClassResolutionV1 {
  const decision: EffectiveConfigurationDecision = status === "resolved" ? (options.attenuated_refs?.length ? "attenuated" : "selected") : status === "unavailable" ? "unavailable" : "not_applicable";
  return { configuration_class, rule, status, source_refs, source_revision_refs, resolved_refs, resolved_revision_refs, provenance: {
    decision,
    considered_refs: source_refs,
    selected_refs: resolved_refs,
    authority_refs: options.authority_refs ?? [],
    attenuated_refs: options.attenuated_refs ?? [],
    rejected_refs: options.rejected_refs ?? [],
    unavailable_refs: options.unavailable_refs ?? (status === "unavailable" ? source_refs : []),
    reason_code: options.reason_code ?? (status === "resolved" ? (decision === "attenuated" ? "attenuated_by_policy" : "selected") : status === "unavailable" ? "historical_observation_unavailable" : "projection_only"),
    observation_fingerprints: options.observation_fingerprints ?? [],
  } };
}

function hasObservation(observations: readonly GovernedResourceObservationV1[], kind: GovernedResourceObservationV1["kind"], resourceId: string, revision?: number): boolean {
  return observations.some((observation) => observation.kind === kind
    && observation.resource_id === resourceId
    && (revision === undefined || observation.revision === revision));
}

export function createAgentEffectiveConfigurationSnapshotV1(input: {
  readonly snapshot_id: string;
  readonly run_id: string;
  readonly task_id: string;
  readonly assignment_id: string;
  readonly assignment_generation: number;
  readonly scope: Scope;
  readonly agent_revision: AgentRevisionV2;
  readonly workforce_revision_ref: RevisionRef;
  readonly resolved_at: number;
  readonly resource_observations?: readonly GovernedResourceObservationV1[];
  readonly provider_model_observations?: readonly GovernedResourceObservationV1[];
  readonly predecessor_snapshot_id?: string;
}): EffectiveConfigurationSnapshotV1 {
  const revision = input.agent_revision;
  const policyRefs = [revision.governance.permission_policy_ref, revision.governance.approval_policy_ref];
  const observations = input.resource_observations ?? [];
  const modelObservations = input.provider_model_observations ?? observations.filter((observation) => observation.kind === "provider_model");
  const modelRefs = revision.runtime_preferences.provider_routes.concat(revision.runtime_preferences.model_requirements);
  const providerIds = revision.runtime_preferences.provider_routes.map((ref) => ref.id);
  const modelIds = revision.runtime_preferences.model_requirements.map((ref) => ref.id);
  const modelHistoryAvailable = modelRefs.length === 0 || (providerIds.length > 0 && modelIds.length > 0 && modelObservations.some((observation) => providerIds.some((providerId) => modelIds.some((modelId) => observation.resource_id === `${providerId}/${modelId}`))));
  const modelObservationFingerprints = modelObservations.filter((observation) => providerIds.some((providerId) => modelIds.some((modelId) => observation.resource_id === `${providerId}/${modelId}`))).map((observation) => observation.content_fingerprint);
  const capabilityHistoryAvailable = revision.capability_requirements.every((requirement) => hasObservation(observations, "capability", requirement.id, requirement.revision));
  const resourceHistoryAvailable = revision.resources.skill_refs.every((resource) => hasObservation(observations, "skill", resource.entity_id, resource.revision))
    && revision.resources.tool_refs.every((resource) => hasObservation(observations, "tool", resource.entity_id, resource.revision));
  return createEffectiveConfigurationSnapshotV1({
    snapshot_id: input.snapshot_id, run_id: input.run_id, task_id: input.task_id, assignment_id: input.assignment_id,
    assignment_generation: input.assignment_generation, scope: input.scope, agent_revision_ref: revision.ref, workforce_revision_ref: input.workforce_revision_ref, resource_observations: [...observations, ...modelObservations.filter((observation) => !observations.some((existing) => existing.kind === observation.kind && existing.resource_id === observation.resource_id && existing.revision === observation.revision))],
    resolved_at: input.resolved_at, ...(input.predecessor_snapshot_id ? { predecessor_snapshot_id: input.predecessor_snapshot_id } : {}),
    classes: [
      resolution("presentation", "projection_only", "not_applicable", [], [revision.ref]),
      resolution("model_preference", "eligible_selection", modelHistoryAvailable ? "resolved" : "unavailable", modelRefs, [revision.ref], modelHistoryAvailable ? modelRefs : [], [], { observation_fingerprints: modelObservationFingerprints, reason_code: modelHistoryAvailable ? "provider_model_observation" : "provider_model_observation_unavailable" }),
      resolution("capability_requirements", "requirements_union", capabilityHistoryAvailable ? "resolved" : "unavailable", revision.capability_requirements, [revision.ref], capabilityHistoryAvailable ? revision.capability_requirements : [], [], { authority_refs: revision.governance.authority_refs, observation_fingerprints: observations.filter((observation) => observation.kind === "capability").map((observation) => observation.content_fingerprint) }),
      resolution("skill_tool_binding", "bound_resource_subset", resourceHistoryAvailable ? "resolved" : "unavailable", [], [revision.ref, ...revision.resources.skill_refs, ...revision.resources.tool_refs], [], resourceHistoryAvailable ? [...revision.resources.skill_refs, ...revision.resources.tool_refs] : [], { observation_fingerprints: observations.filter((observation) => observation.kind === "skill" || observation.kind === "tool").map((observation) => observation.content_fingerprint) }),
      resolution("credential_binding", "opaque_authorized_selection", "not_applicable", [], [revision.ref]),
      resolution("security_constraints", "strictest_constraint", "resolved", revision.constraints.concat(revision.governance.authority_refs), [revision.ref], revision.constraints, [], { authority_refs: revision.governance.authority_refs }),
      resolution("governance_policies", "policy_kind_semantics", "resolved", revision.governance.authority_refs, [revision.ref, ...policyRefs], revision.governance.authority_refs, policyRefs, { authority_refs: revision.governance.authority_refs }),
      resolution("runtime_constraints", "eligible_selection", "resolved", revision.runtime_preferences.harness_preferences.concat(revision.runtime_preferences.executor_preferences), [revision.ref], revision.runtime_preferences.harness_preferences.concat(revision.runtime_preferences.executor_preferences)),
      resolution("memory_policy", "owner_required", "unavailable", [], [revision.ref, revision.knowledge.memory_policy_ref]),
      resolution("evidence_policy", "mandatory_accumulation", "resolved", revision.evidence.evaluation_refs, [revision.ref, revision.evidence.audit_policy_ref], revision.evidence.evaluation_refs, [revision.evidence.audit_policy_ref]),
      resolution("cost_budget", "attenuating_budget", "resolved", [], [revision.ref, revision.economics.cost_policy_ref, revision.economics.budget_policy_ref].concat(revision.economics.settlement_policy_ref ? [revision.economics.settlement_policy_ref] : []), [], [revision.economics.cost_policy_ref, revision.economics.budget_policy_ref].concat(revision.economics.settlement_policy_ref ? [revision.economics.settlement_policy_ref] : []), { reason_code: "budget_attenuation" }),
    ],
  });
}

export function reconstructEffectiveConfigurationSnapshotV1(snapshot: EffectiveConfigurationSnapshotV1): EffectiveConfigurationSnapshotV1 {
  return validateEffectiveConfigurationSnapshotV1(snapshot);
}
