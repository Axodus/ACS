import {
  assertNoSecretMaterial,
  EntityRef,
  NativeContractValidationError,
  requireSafeInteger,
  requireSha256,
  requireString,
  validateEntityRef,
  type ValidationIssue,
} from "../native-core/primitives.js";

export type AdministrativeResourceKindV1 =
  | "agent"
  | "agent_revision"
  | "profile"
  | "persona"
  | "effective_configuration"
  | "governed_resource"
  | "capability"
  | "connector"
  | "connection"
  | "credential"
  | "channel"
  | "memory_policy"
  | "memory_metadata"
  | "delegation"
  | "automation"
  | "automation_revision"
  | "activation"
  | "schedule"
  | "external_observation"
  | "event"
  | "evidence"
  | "settings";

export type AdministrativeAddressingV1 = "CURRENT" | "EXACT" | "OBSERVED";
export type AdministrativeFieldClassificationV1 =
  | "PUBLIC_APPLICATION"
  | "ADMIN_SAFE"
  | "SENSITIVE_REFERENCE_ONLY"
  | "INTERNAL_ONLY"
  | "SECRET";
export type AdministrativeProjectionFreshnessV1 = "CURRENT" | "HISTORICAL" | "OBSERVED" | "UNAVAILABLE" | "PARTIAL";
export type AdministrativeCompatibilityV1 = "CANONICAL" | "COMPATIBILITY" | "LOSSY";

export interface AdministrativeCurrentRefV1 {
  readonly addressing: "CURRENT";
  readonly resource_kind: AdministrativeResourceKindV1;
  readonly stable_id: string;
  readonly tenant_id: string;
}

export interface AdministrativeHistoricalRefV1 {
  readonly addressing: "EXACT";
  readonly resource_kind: AdministrativeResourceKindV1;
  readonly stable_id: string;
  readonly tenant_id: string;
  readonly revision: number;
  readonly fingerprint: string;
}

export interface AdministrativeObservationRefV1 {
  readonly addressing: "OBSERVED";
  readonly resource_kind: AdministrativeResourceKindV1;
  readonly stable_id: string;
  readonly tenant_id: string;
  readonly observation_digest: string;
}

export type AdministrativeResourceRefV1 =
  | AdministrativeCurrentRefV1
  | AdministrativeHistoricalRefV1
  | AdministrativeObservationRefV1;

export interface AdministrativeProjectionMetadataV1 {
  readonly contract_version: "1.0";
  readonly source: AdministrativeResourceRefV1;
  readonly canonical_owner: string;
  readonly projected_at: number;
  readonly freshness: AdministrativeProjectionFreshnessV1;
  readonly compatibility: AdministrativeCompatibilityV1;
  readonly reconstruction_state: "COMPLETE" | "GAP" | "NOT_APPLICABLE";
  readonly redacted_fields: readonly string[];
}

export interface AdministrativeProjectionFieldV1 {
  readonly name: string;
  readonly classification: AdministrativeFieldClassificationV1;
  readonly value: AdministrativeSafeValueV1;
}

export type AdministrativeSafeScalarV1 = string | number | boolean | null;
export type AdministrativeSafeValueV1 =
  | AdministrativeSafeScalarV1
  | readonly AdministrativeSafeScalarV1[]
  | Readonly<Record<string, AdministrativeSafeScalarV1 | readonly AdministrativeSafeScalarV1[]>>;

export interface AdministrativeProjectionInputV1 {
  readonly metadata: AdministrativeProjectionMetadataV1;
  readonly fields: readonly AdministrativeProjectionFieldV1[];
  readonly references?: Readonly<Record<string, EntityRef | readonly EntityRef[]>>;
}

export interface AdministrativeProjectionV1 {
  readonly metadata: AdministrativeProjectionMetadataV1;
  readonly fields: Readonly<Record<string, AdministrativeSafeValueV1>>;
  readonly references: Readonly<Record<string, EntityRef | readonly EntityRef[]>>;
}

export type AdministrativeContractErrorCode =
  | "INVALID_RESOURCE_REFERENCE"
  | "INVALID_PROJECTION_METADATA"
  | "INVALID_PROJECTION_FIELD"
  | "DUPLICATE_PROJECTION_FIELD"
  | "NON_PROJECTABLE_FIELD"
  | "UNSAFE_PROJECTION_VALUE"
  | "TENANT_MISMATCH";

export class AdministrativeContractError extends Error {
  readonly code: AdministrativeContractErrorCode;
  readonly issues: readonly ValidationIssue[];

  constructor(code: AdministrativeContractErrorCode, message: string, issues: readonly ValidationIssue[]) {
    super(message);
    this.name = "AdministrativeContractError";
    this.code = code;
    this.issues = issues;
  }
}

const RESOURCE_KINDS: readonly AdministrativeResourceKindV1[] = [
  "agent", "agent_revision", "profile", "persona", "effective_configuration", "governed_resource", "capability",
  "connector", "connection", "credential", "channel", "memory_policy", "memory_metadata", "delegation",
  "automation", "automation_revision", "activation", "schedule", "external_observation", "event", "evidence", "settings",
];
const FIELD_CLASSIFICATIONS: readonly AdministrativeFieldClassificationV1[] = [
  "PUBLIC_APPLICATION", "ADMIN_SAFE", "SENSITIVE_REFERENCE_ONLY", "INTERNAL_ONLY", "SECRET",
];
const FRESHNESS_STATES: readonly AdministrativeProjectionFreshnessV1[] = ["CURRENT", "HISTORICAL", "OBSERVED", "UNAVAILABLE", "PARTIAL"];
const COMPATIBILITY_STATES: readonly AdministrativeCompatibilityV1[] = ["CANONICAL", "COMPATIBILITY", "LOSSY"];
const RECONSTRUCTION_STATES = ["COMPLETE", "GAP", "NOT_APPLICABLE"] as const;

function issue(path: string, code: AdministrativeContractErrorCode, message: string): ValidationIssue {
  return { path, code, message };
}

function fail(code: AdministrativeContractErrorCode, message: string, issues: readonly ValidationIssue[]): never {
  throw new AdministrativeContractError(code, message, issues);
}

function object(value: unknown, path: string, issues: ValidationIssue[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(issue(path, "INVALID_PROJECTION_FIELD", "An object is required"));
    return {};
  }
  return value as Record<string, unknown>;
}

function validateResourceKind(value: unknown, path: string, issues: ValidationIssue[]): value is AdministrativeResourceKindV1 {
  if (!RESOURCE_KINDS.includes(value as AdministrativeResourceKindV1)) {
    issues.push(issue(path, "INVALID_RESOURCE_REFERENCE", "Unsupported administrative resource kind"));
    return false;
  }
  return true;
}

function validateSafeValue(value: unknown, path: string, issues: ValidationIssue[]): value is AdministrativeSafeValueV1 {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) {
    if (value.every((entry) => entry === null || typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean")) return true;
    issues.push(issue(path, "UNSAFE_PROJECTION_VALUE", "Projection lists may contain only scalar values"));
    return false;
  }
  if (!value || typeof value !== "object") {
    issues.push(issue(path, "UNSAFE_PROJECTION_VALUE", "Projection values must be scalar, scalar list, or scalar record"));
    return false;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry !== null && typeof entry !== "string" && typeof entry !== "number" && typeof entry !== "boolean"
      && !(Array.isArray(entry) && entry.every((item) => item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean"))) {
      issues.push(issue(`${path}.${key}`, "UNSAFE_PROJECTION_VALUE", "Projection records may contain only scalar values or scalar lists"));
    }
  }
  return issues.every((entry) => !entry.path.startsWith(path));
}

export function validateAdministrativeResourceRefV1(value: unknown, path = "resource_ref"): AdministrativeResourceRefV1 {
  const issues: ValidationIssue[] = [];
  const ref = object(value, path, issues) as Partial<AdministrativeResourceRefV1>;
  const validKind = validateResourceKind(ref.resource_kind, `${path}.resource_kind`, issues);
  requireString(ref.stable_id, `${path}.stable_id`, issues);
  requireString(ref.tenant_id, `${path}.tenant_id`, issues);
  if (ref.addressing === "CURRENT") {
    if (issues.length > 0) return fail("INVALID_RESOURCE_REFERENCE", "invalid administrative resource reference", issues);
    return { addressing: "CURRENT", resource_kind: ref.resource_kind!, stable_id: ref.stable_id!, tenant_id: ref.tenant_id! };
  }
  if (ref.addressing === "EXACT") {
    requireSafeInteger(ref.revision, `${path}.revision`, issues, 1);
    requireSha256(ref.fingerprint, `${path}.fingerprint`, issues);
    if (issues.length > 0) return fail("INVALID_RESOURCE_REFERENCE", "invalid administrative resource reference", issues);
    return { addressing: "EXACT", resource_kind: ref.resource_kind!, stable_id: ref.stable_id!, tenant_id: ref.tenant_id!, revision: ref.revision!, fingerprint: ref.fingerprint! };
  }
  if (ref.addressing === "OBSERVED") {
    requireSha256(ref.observation_digest, `${path}.observation_digest`, issues);
    if (issues.length > 0) return fail("INVALID_RESOURCE_REFERENCE", "invalid administrative resource reference", issues);
    return { addressing: "OBSERVED", resource_kind: ref.resource_kind!, stable_id: ref.stable_id!, tenant_id: ref.tenant_id!, observation_digest: ref.observation_digest! };
  }
  if (validKind) issues.push(issue(`${path}.addressing`, "INVALID_RESOURCE_REFERENCE", "Addressing must be CURRENT, EXACT, or OBSERVED"));
  return fail("INVALID_RESOURCE_REFERENCE", "invalid administrative resource reference", issues);
}

export function createAdministrativeCurrentRefV1(input: Omit<AdministrativeCurrentRefV1, "addressing">): AdministrativeCurrentRefV1 {
  return validateAdministrativeResourceRefV1({ ...input, addressing: "CURRENT" }) as AdministrativeCurrentRefV1;
}

export function createAdministrativeHistoricalRefV1(input: Omit<AdministrativeHistoricalRefV1, "addressing">): AdministrativeHistoricalRefV1 {
  return validateAdministrativeResourceRefV1({ ...input, addressing: "EXACT" }) as AdministrativeHistoricalRefV1;
}

export function createAdministrativeObservationRefV1(input: Omit<AdministrativeObservationRefV1, "addressing">): AdministrativeObservationRefV1 {
  return validateAdministrativeResourceRefV1({ ...input, addressing: "OBSERVED" }) as AdministrativeObservationRefV1;
}

export function validateAdministrativeProjectionMetadataV1(value: unknown, path = "metadata"): AdministrativeProjectionMetadataV1 {
  const issues: ValidationIssue[] = [];
  const metadata = object(value, path, issues) as Partial<AdministrativeProjectionMetadataV1>;
  if (metadata.contract_version !== "1.0") issues.push(issue(`${path}.contract_version`, "INVALID_PROJECTION_METADATA", "Administrative projection contract version 1.0 is required"));
  let source: AdministrativeResourceRefV1 | undefined;
  try { source = validateAdministrativeResourceRefV1(metadata.source, `${path}.source`); }
  catch (error) { if (error instanceof AdministrativeContractError) issues.push(...error.issues); else throw error; }
  requireString(metadata.canonical_owner, `${path}.canonical_owner`, issues);
  requireSafeInteger(metadata.projected_at, `${path}.projected_at`, issues, 0);
  if (!FRESHNESS_STATES.includes(metadata.freshness as AdministrativeProjectionFreshnessV1)) issues.push(issue(`${path}.freshness`, "INVALID_PROJECTION_METADATA", "Unsupported projection freshness"));
  if (!COMPATIBILITY_STATES.includes(metadata.compatibility as AdministrativeCompatibilityV1)) issues.push(issue(`${path}.compatibility`, "INVALID_PROJECTION_METADATA", "Unsupported projection compatibility state"));
  if (!RECONSTRUCTION_STATES.includes(metadata.reconstruction_state as typeof RECONSTRUCTION_STATES[number])) issues.push(issue(`${path}.reconstruction_state`, "INVALID_PROJECTION_METADATA", "Unsupported reconstruction state"));
  if (!Array.isArray(metadata.redacted_fields) || metadata.redacted_fields.some((field) => typeof field !== "string" || field.trim().length === 0)) {
    issues.push(issue(`${path}.redacted_fields`, "INVALID_PROJECTION_METADATA", "Redacted fields must be non-empty strings"));
  }
  if (issues.length > 0) return fail("INVALID_PROJECTION_METADATA", "invalid administrative projection metadata", issues);
  return { ...metadata, source: source! } as AdministrativeProjectionMetadataV1;
}

export function createAdministrativeProjectionV1(input: AdministrativeProjectionInputV1): AdministrativeProjectionV1 {
  const metadata = validateAdministrativeProjectionMetadataV1(input.metadata);
  const fields: Record<string, AdministrativeSafeValueV1> = {};
  const names = new Set<string>();
  for (const [index, field] of input.fields.entries()) {
    const path = `fields[${index}]`;
    const issues: ValidationIssue[] = [];
    requireString(field.name, `${path}.name`, issues);
    if (names.has(field.name)) issues.push(issue(`${path}.name`, "DUPLICATE_PROJECTION_FIELD", "Projection field names must be unique"));
    if (!FIELD_CLASSIFICATIONS.includes(field.classification)) issues.push(issue(`${path}.classification`, "INVALID_PROJECTION_FIELD", "Unsupported field classification"));
    if (field.classification !== "PUBLIC_APPLICATION" && field.classification !== "ADMIN_SAFE") {
      issues.push(issue(`${path}.classification`, "NON_PROJECTABLE_FIELD", "Only PUBLIC_APPLICATION and ADMIN_SAFE fields may enter a Product projection"));
    }
    validateSafeValue(field.value, `${path}.value`, issues);
    try { assertNoSecretMaterial({ [field.name]: field.value }, path); }
    catch (error) {
      if (error instanceof NativeContractValidationError) issues.push(...error.issues.map((entry) => issue(entry.path, "UNSAFE_PROJECTION_VALUE", entry.message)));
      else throw error;
    }
    if (issues.length > 0) fail(issues[0]?.code as AdministrativeContractErrorCode, "invalid administrative projection field", issues);
    names.add(field.name);
    fields[field.name] = field.value;
  }
  const references: Record<string, EntityRef | readonly EntityRef[]> = {};
  for (const [name, reference] of Object.entries(input.references ?? {})) {
    const issues: ValidationIssue[] = [];
    requireString(name, `references.${name}`, issues);
    const entries = Array.isArray(reference) ? reference : [reference];
    const validated: EntityRef[] = [];
    for (const [index, entry] of entries.entries()) {
      try { validated.push(validateEntityRef(entry, `references.${name}${Array.isArray(reference) ? `[${index}]` : ""}`)); }
      catch (error) {
        if (error instanceof NativeContractValidationError) issues.push(...error.issues.map((detail) => issue(detail.path, "UNSAFE_PROJECTION_VALUE", detail.message)));
        else throw error;
      }
    }
    references[name] = Array.isArray(reference) ? Object.freeze(validated) : validated[0]!;
    if (issues.length > 0) fail("UNSAFE_PROJECTION_VALUE", "invalid administrative projection reference", issues);
  }
  for (const entry of Object.values(references)) {
    for (const reference of Array.isArray(entry) ? entry : [entry]) {
      if ("tenant_id" in reference && reference.tenant_id !== undefined && reference.tenant_id !== metadata.source.tenant_id) {
        fail("TENANT_MISMATCH", "administrative projection reference is outside the source Tenant", [issue("references", "TENANT_MISMATCH", "Projection references must remain Tenant-compatible")]);
      }
    }
  }
  return Object.freeze({ metadata: Object.freeze(metadata), fields: Object.freeze(fields), references: Object.freeze(references) });
}
