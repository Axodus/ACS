import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  freezeNative,
  NativeContractValidationError,
  requireSafeInteger,
  requireSha256,
  requireString,
  sha256Hex,
  stableStringify,
  validateEntityRef,
  type EntityRef,
  type ValidationIssue,
} from "./primitives.js";
import { createActivationCausalIdentityV1, type ActivationSourceIdentityV1 } from "./activation.js";
import { validateAutomationRevisionRefV1, type AutomationRevisionRefV1 } from "./automation.js";

export type ExternalObservationSourceClassV1 = "trigger" | "channel" | "manual";

export interface NormalizedExternalObservationV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly observation_id: string;
  readonly tenant_id: string;
  readonly automation_ref: AutomationRevisionRefV1;
  readonly source_class: ExternalObservationSourceClassV1;
  /** Canonical causal material; adapter/provider identifiers are deliberately absent. */
  readonly source: ActivationSourceIdentityV1;
  readonly adapter_ref: EntityRef;
  readonly provider_ref?: EntityRef;
  readonly external_reference_digest: string;
  readonly occurred_at: number;
  readonly evidence_refs: readonly EntityRef[];
}

export class ExternalObservationContractError extends Error {
  constructor(readonly code: "TENANT_MISMATCH" | "SOURCE_CLASS_MISMATCH" | "UNSAFE_OBSERVATION", message: string) {
    super(message);
    this.name = "ExternalObservationContractError";
  }
}

function issue(path: string, code: string, message: string): ValidationIssue { return { path, code, message }; }
function object(value: unknown, path: string, issues: ValidationIssue[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) { issues.push(issue(path, "INVALID_OBJECT", "An object is required")); return {}; }
  return value as Record<string, unknown>;
}
function refs(value: unknown, path: string, issues: ValidationIssue[]): readonly EntityRef[] {
  if (!Array.isArray(value)) { issues.push(issue(path, "INVALID_LIST", "An array is required")); return []; }
  return value.map((entry, index) => { try { return validateEntityRef(entry, `${path}[${index}]`); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return {} as EntityRef; } });
}

export function createNormalizedExternalObservationV1(input: Omit<NormalizedExternalObservationV1, "schema_version" | "observation_id">): NormalizedExternalObservationV1 {
  const observation_id = `external-observation:${sha256Hex(stableStringify(input))}`;
  return validateNormalizedExternalObservationV1({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION, observation_id });
}

export function validateNormalizedExternalObservationV1(value: unknown): NormalizedExternalObservationV1 {
  const issues: ValidationIssue[] = [];
  const observation = object(value, "$", issues) as Partial<NormalizedExternalObservationV1>;
  if (observation.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  requireString(observation.tenant_id, "tenant_id", issues);
  let automation: AutomationRevisionRefV1 | undefined;
  let source: ActivationSourceIdentityV1 | undefined;
  try { automation = validateAutomationRevisionRefV1(observation.automation_ref); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (typeof observation.tenant_id === "string" && automation) {
    try { source = createActivationCausalIdentityV1({ tenant_id: observation.tenant_id, automation_ref: automation, source: observation.source as ActivationSourceIdentityV1 }).source; }
    catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  if (observation.source_class !== "trigger" && observation.source_class !== "channel" && observation.source_class !== "manual") issues.push(issue("source_class", "INVALID_ENUM", "Source class must be trigger, channel or manual"));
  if (observation.source_class === "trigger" && source?.kind !== "event") issues.push(issue("source", "SOURCE_CLASS_MISMATCH", "Trigger observations require event causal material"));
  if (observation.source_class === "channel" && source?.kind !== "channel") issues.push(issue("source", "SOURCE_CLASS_MISMATCH", "Channel observations require channel causal material"));
  if (observation.source_class === "manual" && source?.kind !== "manual") issues.push(issue("source", "SOURCE_CLASS_MISMATCH", "Manual observations require manual causal material"));
  let adapter: EntityRef | undefined; let provider: EntityRef | undefined;
  try { adapter = validateEntityRef(observation.adapter_ref, "adapter_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (observation.provider_ref !== undefined) try { provider = validateEntityRef(observation.provider_ref, "provider_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  requireSha256(observation.external_reference_digest, "external_reference_digest", issues);
  requireSafeInteger(observation.occurred_at, "occurred_at", issues, 0);
  const evidence = refs(observation.evidence_refs, "evidence_refs", issues);
  if (automation && observation.tenant_id !== automation.tenant_id) issues.push(issue("tenant_id", "TENANT_MISMATCH", "Observation and exact Automation revision must share Tenant"));
  const candidate = { tenant_id: observation.tenant_id, automation_ref: automation, source_class: observation.source_class, source, adapter_ref: adapter, ...(provider ? { provider_ref: provider } : {}), external_reference_digest: observation.external_reference_digest, occurred_at: observation.occurred_at, evidence_refs: evidence };
  if (issues.length === 0) {
    const expected = `external-observation:${sha256Hex(stableStringify(candidate))}`;
    if (observation.observation_id !== expected) issues.push(issue("observation_id", "IDENTITY_MISMATCH", "Observation identity must derive only from normalized safe material"));
  } else requireString(observation.observation_id, "observation_id", issues);
  assertNoSecretMaterial(value);
  return freezeNative(assertValid({ ...candidate, schema_version: ACS_NATIVE_SCHEMA_VERSION, observation_id: observation.observation_id } as NormalizedExternalObservationV1, issues));
}
