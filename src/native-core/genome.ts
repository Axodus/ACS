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
import { ArtifactReferenceV2, SourceReferenceV2, validateArtifactReferenceV2, validateSourceReferenceV2 } from "./evidence.js";

export type TraitValueKindV1 = "string" | "number" | "boolean" | "json";
export type TraitAssertionStateV1 = "active" | "superseded" | "retracted";
export type TraitVerificationStatusV1 = "unverified" | "verified" | "stale" | "disputed" | "revoked" | "unavailable";

export interface CurrentGenomeAgentSubjectV1 {
  readonly addressing: "CURRENT";
  readonly agent_ref: EntityRef;
}

export interface ExactGenomeAgentRevisionSubjectV1 {
  readonly addressing: "EXACT";
  readonly agent_revision_ref: RevisionRef;
}

export type GenomeSubjectV1 = CurrentGenomeAgentSubjectV1 | ExactGenomeAgentRevisionSubjectV1;

export interface GenomeHistoricalSubjectGapV1 {
  readonly status: "gap";
  readonly requested_subject: ExactGenomeAgentRevisionSubjectV1;
  readonly reason_code: "GENOME_EXACT_SUBJECT_UNAVAILABLE";
}

export interface GenomeHistoricalSubjectResolvedV1 {
  readonly status: "resolved";
  readonly subject: ExactGenomeAgentRevisionSubjectV1;
}

export type GenomeHistoricalSubjectResolutionV1 = GenomeHistoricalSubjectResolvedV1 | GenomeHistoricalSubjectGapV1;

export interface TraitDefinitionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly namespace: string;
  readonly name: string;
  readonly version: number;
  readonly digest: string;
  readonly value_kind: TraitValueKindV1;
  readonly allowed_subject_addressing: readonly GenomeSubjectV1["addressing"][];
}

export interface TraitDefinitionReferenceV1 {
  readonly namespace: string;
  readonly name: string;
  readonly version: number;
  readonly digest: string;
}

export interface TraitAssertionReferenceV1 {
  readonly assertion_id: string;
  readonly digest: string;
}

export interface TraitVerificationReferenceV1 {
  readonly verification_ref: EntityRef;
  readonly assertion_ref: TraitAssertionReferenceV1;
  readonly status: TraitVerificationStatusV1;
  readonly evidence_refs: readonly EntityRef[];
  readonly decision_ref?: EntityRef;
}

export type PresentationAssetAvailabilityV1 = "available" | "unavailable";
export type PresentationAssetGapCodeV1 = "PRESENTATION_REFERENCE_UNAVAILABLE" | "PRESENTATION_REPRESENTATION_UNAVAILABLE";

export interface PresentationAssetReferenceV1 {
  readonly artifact_ref: ArtifactReferenceV2;
  readonly availability: PresentationAssetAvailabilityV1;
  readonly gap_code?: PresentationAssetGapCodeV1;
}

export interface PresentationAssetAssociationV1 {
  readonly subject: GenomeSubjectV1;
  readonly assertion_ref: TraitAssertionReferenceV1;
  readonly presentation_role: string;
  readonly asset_ref: PresentationAssetReferenceV1;
  readonly provenance_refs: readonly SourceReferenceV2[];
  readonly evidence_refs: readonly EntityRef[];
}

export interface TraitAssertionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly assertion_id: string;
  readonly digest: string;
  readonly subject: GenomeSubjectV1;
  readonly definition_ref: TraitDefinitionReferenceV1;
  readonly value: string | number | boolean | Readonly<Record<string, unknown>> | readonly unknown[];
  readonly value_kind: TraitValueKindV1;
  readonly provenance_refs: readonly SourceReferenceV2[];
  readonly evidence_refs: readonly EntityRef[];
  readonly verification_refs: readonly TraitVerificationReferenceV1[];
  readonly state: TraitAssertionStateV1;
  readonly observed_at: number;
}

function invalidObject(name: string): never {
  throw new NativeContractValidationError(`invalid ${name}`, [{ path: "$", code: "INVALID_OBJECT", message: `${name} must be an object` }]);
}

function validateEntityRefList(value: unknown, path: string, issues: ValidationIssue[]): readonly EntityRef[] {
  if (!Array.isArray(value)) {
    issues.push({ path, code: "INVALID_LIST", message: "An array is required" });
    return [];
  }
  return value.map((entry, index) => {
    try { return validateEntityRef(entry, `${path}[${index}]`); }
    catch (error) {
      if (error instanceof NativeContractValidationError) issues.push(...error.issues);
      return entry as EntityRef;
    }
  });
}

function validateDigestReference(value: unknown, path: string, issues: ValidationIssue[]): TraitAssertionReferenceV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, code: "INVALID_OBJECT", message: "A reference object is required" });
    return value as TraitAssertionReferenceV1;
  }
  const reference = value as Partial<TraitAssertionReferenceV1>;
  requireString(reference.assertion_id, `${path}.assertion_id`, issues);
  requireSha256(reference.digest, `${path}.digest`, issues);
  return reference as TraitAssertionReferenceV1;
}

export function validateGenomeSubjectV1(value: unknown, path = "subject"): GenomeSubjectV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("GenomeSubject");
  const subject = value as Partial<GenomeSubjectV1>;
  if (subject.addressing === "CURRENT") {
    const agent = validateEntityRef(subject.agent_ref, `${path}.agent_ref`);
    if (agent.kind !== "agent" || agent.revision !== undefined) {
      throw new NativeContractValidationError("invalid current Genome subject", [{ path: `${path}.agent_ref`, code: "CURRENT_AGENT_REFERENCE_REQUIRED", message: "Current Genome subjects reference an unrevised canonical Agent" }]);
    }
    return freezeNative({ addressing: "CURRENT", agent_ref: agent });
  }
  if (subject.addressing === "EXACT") {
    const agentRevision = validateRevisionRef(subject.agent_revision_ref, `${path}.agent_revision_ref`);
    if (agentRevision.entity_kind !== "agent") {
      throw new NativeContractValidationError("invalid exact Genome subject", [{ path: `${path}.agent_revision_ref.entity_kind`, code: "EXACT_AGENT_REVISION_REQUIRED", message: "Historical Genome subjects require an exact canonical Agent revision" }]);
    }
    return freezeNative({ addressing: "EXACT", agent_revision_ref: agentRevision });
  }
  throw new NativeContractValidationError("invalid Genome subject", [{ path: `${path}.addressing`, code: "INVALID_ENUM", message: "Genome subject addressing must be CURRENT or EXACT" }]);
}

export function createGenomeCurrentAgentSubjectV1(agent_ref: EntityRef): CurrentGenomeAgentSubjectV1 {
  return validateGenomeSubjectV1({ addressing: "CURRENT", agent_ref }) as CurrentGenomeAgentSubjectV1;
}

export function createGenomeExactAgentRevisionSubjectV1(agent_revision_ref: RevisionRef): ExactGenomeAgentRevisionSubjectV1 {
  return validateGenomeSubjectV1({ addressing: "EXACT", agent_revision_ref }) as ExactGenomeAgentRevisionSubjectV1;
}

export function resolveGenomeHistoricalSubjectV1(
  subject: ExactGenomeAgentRevisionSubjectV1,
  hasExactRevision: (reference: RevisionRef) => boolean,
): GenomeHistoricalSubjectResolutionV1 {
  const exact = createGenomeExactAgentRevisionSubjectV1(subject.agent_revision_ref);
  return hasExactRevision(exact.agent_revision_ref)
    ? freezeNative({ status: "resolved", subject: exact })
    : freezeNative({ status: "gap", requested_subject: exact, reason_code: "GENOME_EXACT_SUBJECT_UNAVAILABLE" });
}

export function fingerprintTraitDefinitionV1(input: Omit<TraitDefinitionV1, "schema_version" | "digest">): string {
  return sha256Hex(stableStringify(input));
}

export function validateTraitDefinitionV1(value: unknown): TraitDefinitionV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("TraitDefinition");
  const definition = value as Partial<TraitDefinitionV1>;
  const issues: ValidationIssue[] = [];
  if (definition.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  requireString(definition.namespace, "namespace", issues);
  requireString(definition.name, "name", issues);
  requireSafeInteger(definition.version, "version", issues, 1);
  requireSha256(definition.digest, "digest", issues);
  if (!["string", "number", "boolean", "json"].includes(definition.value_kind ?? "")) issues.push({ path: "value_kind", code: "INVALID_ENUM", message: "Invalid trait value kind" });
  if (!Array.isArray(definition.allowed_subject_addressing) || definition.allowed_subject_addressing.length === 0 || definition.allowed_subject_addressing.some((entry) => entry !== "CURRENT" && entry !== "EXACT")) {
    issues.push({ path: "allowed_subject_addressing", code: "INVALID_SUBJECT_ADDRESSING", message: "At least one supported subject addressing mode is required" });
  }
  assertNoSecretMaterial(value);
  return assertValid(freezeNative({ ...definition, allowed_subject_addressing: [...(definition.allowed_subject_addressing ?? [])] } as TraitDefinitionV1), issues);
}

export function createTraitDefinitionV1(input: Omit<TraitDefinitionV1, "schema_version" | "digest">): TraitDefinitionV1 {
  return validateTraitDefinitionV1(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION, digest: fingerprintTraitDefinitionV1(input) }));
}

export function createTraitDefinitionReferenceV1(definition: TraitDefinitionV1): TraitDefinitionReferenceV1 {
  return freezeNative({ namespace: definition.namespace, name: definition.name, version: definition.version, digest: definition.digest });
}

export function validateTraitVerificationReferenceV1(value: unknown, path = "verification_ref"): TraitVerificationReferenceV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("TraitVerificationReference");
  const verification = value as Partial<TraitVerificationReferenceV1>;
  const issues: ValidationIssue[] = [];
  try { validateEntityRef(verification.verification_ref, `${path}.verification_ref`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  const assertionRef = validateDigestReference(verification.assertion_ref, `${path}.assertion_ref`, issues);
  if (!["unverified", "verified", "stale", "disputed", "revoked", "unavailable"].includes(verification.status ?? "")) issues.push({ path: `${path}.status`, code: "INVALID_ENUM", message: "Invalid verification status" });
  const evidenceRefs = validateEntityRefList(verification.evidence_refs, `${path}.evidence_refs`, issues);
  if (verification.decision_ref !== undefined) try { validateEntityRef(verification.decision_ref, `${path}.decision_ref`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  assertNoSecretMaterial(value);
  return assertValid(freezeNative({ ...verification, assertion_ref: assertionRef, evidence_refs: evidenceRefs } as TraitVerificationReferenceV1), issues);
}

export function validatePresentationAssetReferenceV1(value: unknown, path = "asset_ref"): PresentationAssetReferenceV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("PresentationAssetReference");
  const reference = value as Partial<PresentationAssetReferenceV1>;
  const issues: ValidationIssue[] = [];
  let artifactRef: ArtifactReferenceV2 | undefined;
  try { artifactRef = validateArtifactReferenceV2(reference.artifact_ref); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (!["available", "unavailable"].includes(reference.availability ?? "")) issues.push({ path: `${path}.availability`, code: "INVALID_ENUM", message: "Invalid presentation asset availability" });
  if (reference.availability === "unavailable" && !["PRESENTATION_REFERENCE_UNAVAILABLE", "PRESENTATION_REPRESENTATION_UNAVAILABLE"].includes(reference.gap_code ?? "")) {
    issues.push({ path: `${path}.gap_code`, code: "PRESENTATION_GAP_CODE_REQUIRED", message: "Unavailable presentation assets require an explicit gap code" });
  }
  if (reference.availability === "available" && reference.gap_code !== undefined) issues.push({ path: `${path}.gap_code`, code: "PRESENTATION_GAP_CODE_FORBIDDEN", message: "Available presentation assets cannot carry a gap code" });
  assertNoSecretMaterial(value);
  return assertValid(freezeNative({ ...reference, ...(artifactRef ? { artifact_ref: artifactRef } : {}) } as PresentationAssetReferenceV1), issues);
}

export function createPresentationAssetReferenceV1(input: PresentationAssetReferenceV1): PresentationAssetReferenceV1 {
  return validatePresentationAssetReferenceV1(freezeNative(input));
}

export function validatePresentationAssetAssociationV1(value: unknown): PresentationAssetAssociationV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("PresentationAssetAssociation");
  const association = value as Partial<PresentationAssetAssociationV1>;
  const issues: ValidationIssue[] = [];
  let subject: GenomeSubjectV1 | undefined;
  try { subject = validateGenomeSubjectV1(association.subject); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  const assertionRef = validateDigestReference(association.assertion_ref, "assertion_ref", issues);
  requireString(association.presentation_role, "presentation_role", issues);
  let assetRef: PresentationAssetReferenceV1 | undefined;
  try { assetRef = validatePresentationAssetReferenceV1(association.asset_ref); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  const provenanceRefs = !Array.isArray(association.provenance_refs) ? (issues.push({ path: "provenance_refs", code: "INVALID_LIST", message: "An array is required" }), []) : association.provenance_refs.map((entry, index) => {
    try { return validateSourceReferenceV2(entry); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues.map((issue) => ({ ...issue, path: `provenance_refs[${index}].${issue.path}` }))); return entry as SourceReferenceV2; }
  });
  const evidenceRefs = validateEntityRefList(association.evidence_refs, "evidence_refs", issues);
  assertNoSecretMaterial(value);
  return assertValid(freezeNative({ ...association, ...(subject ? { subject } : {}), assertion_ref: assertionRef, ...(assetRef ? { asset_ref: assetRef } : {}), provenance_refs: provenanceRefs, evidence_refs: evidenceRefs } as PresentationAssetAssociationV1), issues);
}

export function createPresentationAssetAssociationV1(input: PresentationAssetAssociationV1): PresentationAssetAssociationV1 {
  return validatePresentationAssetAssociationV1(freezeNative(input));
}

function validateDefinitionReference(value: unknown, path: string, issues: ValidationIssue[]): TraitDefinitionReferenceV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, code: "INVALID_OBJECT", message: "A definition reference object is required" });
    return value as TraitDefinitionReferenceV1;
  }
  const reference = value as Partial<TraitDefinitionReferenceV1>;
  requireString(reference.namespace, `${path}.namespace`, issues);
  requireString(reference.name, `${path}.name`, issues);
  requireSafeInteger(reference.version, `${path}.version`, issues, 1);
  requireSha256(reference.digest, `${path}.digest`, issues);
  return reference as TraitDefinitionReferenceV1;
}

function validateTraitValue(value: unknown, valueKind: unknown, path: string, issues: ValidationIssue[]): void {
  if (valueKind === "string" && typeof value !== "string") issues.push({ path, code: "VALUE_KIND_MISMATCH", message: "Trait value must be a string" });
  if (valueKind === "number" && (typeof value !== "number" || !Number.isFinite(value))) issues.push({ path, code: "VALUE_KIND_MISMATCH", message: "Trait value must be a finite number" });
  if (valueKind === "boolean" && typeof value !== "boolean") issues.push({ path, code: "VALUE_KIND_MISMATCH", message: "Trait value must be a boolean" });
  if (valueKind === "json" && (value === null || typeof value !== "object")) issues.push({ path, code: "VALUE_KIND_MISMATCH", message: "Trait value must be a JSON object or array" });
}

export function fingerprintTraitAssertionV1(input: Omit<TraitAssertionV1, "schema_version" | "digest">): string {
  return sha256Hex(stableStringify(input));
}

export function validateTraitAssertionV1(value: unknown): TraitAssertionV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidObject("TraitAssertion");
  const assertion = value as Partial<TraitAssertionV1>;
  const issues: ValidationIssue[] = [];
  if (assertion.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  requireString(assertion.assertion_id, "assertion_id", issues);
  requireSha256(assertion.digest, "digest", issues);
  let subject: GenomeSubjectV1 | undefined;
  try { subject = validateGenomeSubjectV1(assertion.subject); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  const definitionRef = validateDefinitionReference(assertion.definition_ref, "definition_ref", issues);
  if (!["string", "number", "boolean", "json"].includes(assertion.value_kind ?? "")) issues.push({ path: "value_kind", code: "INVALID_ENUM", message: "Invalid trait value kind" });
  validateTraitValue(assertion.value, assertion.value_kind, "value", issues);
  const provenanceRefs = !Array.isArray(assertion.provenance_refs) ? (issues.push({ path: "provenance_refs", code: "INVALID_LIST", message: "An array is required" }), []) : assertion.provenance_refs.map((entry, index) => {
    try { return validateSourceReferenceV2(entry); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues.map((issue) => ({ ...issue, path: `provenance_refs[${index}].${issue.path}` }))); return entry as SourceReferenceV2; }
  });
  const evidenceRefs = validateEntityRefList(assertion.evidence_refs, "evidence_refs", issues);
  const verificationRefs = !Array.isArray(assertion.verification_refs) ? (issues.push({ path: "verification_refs", code: "INVALID_LIST", message: "An array is required" }), []) : assertion.verification_refs.map((entry, index) => {
    try { return validateTraitVerificationReferenceV1(entry, `verification_refs[${index}]`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return entry as TraitVerificationReferenceV1; }
  });
  if (!["active", "superseded", "retracted"].includes(assertion.state ?? "")) issues.push({ path: "state", code: "INVALID_ENUM", message: "Invalid assertion state" });
  requireSafeInteger(assertion.observed_at, "observed_at", issues, 0);
  assertNoSecretMaterial(value);
  return assertValid(freezeNative({ ...assertion, ...(subject ? { subject } : {}), definition_ref: definitionRef, provenance_refs: provenanceRefs, evidence_refs: evidenceRefs, verification_refs: verificationRefs } as TraitAssertionV1), issues);
}

export function createTraitAssertionV1(input: Omit<TraitAssertionV1, "schema_version" | "digest">): TraitAssertionV1 {
  return validateTraitAssertionV1(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION, digest: fingerprintTraitAssertionV1(input) }));
}

export function createTraitAssertionReferenceV1(assertion: TraitAssertionV1): TraitAssertionReferenceV1 {
  return freezeNative({ assertion_id: assertion.assertion_id, digest: assertion.digest });
}
