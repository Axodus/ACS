import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  deserializeNative,
  freezeNative,
  NativeContractValidationError,
  requireSafeInteger,
  requireSha256,
  requireString,
  serializeNative,
  sha256Hex,
  stableStringify,
  ValidationIssue,
} from "./primitives.js";

export type IntegrationConnectionLifecycle = "draft" | "active" | "disabled" | "revoked" | "archived";
export type IntegrationChannelLifecycle = "draft" | "active" | "disabled" | "revoked" | "archived";
export type IntegrationChannelDirection = "ingress" | "egress" | "bidirectional";

export class IntegrationLifecycleTransitionError extends Error {
  readonly code = "ACS_INTEGRATION_LIFECYCLE_TRANSITION";
  constructor(readonly aggregate: "connection" | "channel", readonly from: string, readonly to: string) {
    super(`invalid ${aggregate} lifecycle transition: ${from} -> ${to}`);
    this.name = "IntegrationLifecycleTransitionError";
  }
}

export function assertIntegrationLifecycleTransition(
  aggregate: "connection" | "channel",
  from: IntegrationConnectionLifecycle | IntegrationChannelLifecycle,
  to: IntegrationConnectionLifecycle | IntegrationChannelLifecycle,
): void {
  if (from === to) return;
  const allowed = new Set([
    "draft->active", "draft->archived", "draft->disabled",
    "active->disabled", "active->revoked", "active->archived",
    "disabled->active", "disabled->revoked", "disabled->archived",
    "revoked->archived", "archived->disabled",
  ]);
  if (!allowed.has(`${from}->${to}`)) throw new IntegrationLifecycleTransitionError(aggregate, from, to);
}

export interface IntegrationRevisionRef {
  readonly entity_kind: "integration_connection" | "integration_channel";
  readonly entity_id: string;
  readonly revision: number;
  readonly fingerprint: string;
}

export interface OpaqueCredentialRef {
  readonly credential_ref: string;
  readonly credential_version?: string;
  readonly secret_store_ref: string;
}

export interface IntegrationConnectionDefinitionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly connection_id: string;
  readonly tenant_id: string;
  readonly connector_definition_ref: string;
  readonly lifecycle: IntegrationConnectionLifecycle;
  readonly current_revision: number;
  readonly created_at: number;
  readonly updated_at: number;
}

export interface IntegrationConnectionRevisionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ref: IntegrationRevisionRef;
  readonly supersedes_revision?: number;
  readonly connector_definition_ref: string;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly credential_ref?: OpaqueCredentialRef;
  readonly lifecycle: IntegrationConnectionLifecycle;
  readonly commit: {
    readonly created_by: string;
    readonly committed_at: number;
    readonly change_reason: string;
  };
}

export interface IntegrationChannelDefinitionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly channel_id: string;
  readonly tenant_id: string;
  readonly lifecycle: IntegrationChannelLifecycle;
  readonly current_revision: number;
  readonly created_at: number;
  readonly updated_at: number;
}

export interface IntegrationChannelRevisionV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ref: IntegrationRevisionRef;
  readonly supersedes_revision?: number;
  readonly connection_revision_ref: IntegrationRevisionRef;
  readonly direction: IntegrationChannelDirection;
  readonly endpoint: {
    readonly kind: string;
    readonly uri: string;
  };
  readonly admission_policy_ref?: string;
  readonly lifecycle: IntegrationChannelLifecycle;
  readonly commit: {
    readonly created_by: string;
    readonly committed_at: number;
    readonly change_reason: string;
  };
}

function object(value: unknown, path: string, issues: ValidationIssue[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, code: "INVALID_OBJECT", message: "An object is required" });
    return {};
  }
  return value as Record<string, unknown>;
}

function lifecycle(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!["draft", "active", "disabled", "revoked", "archived"].includes(value as string)) {
    issues.push({ path, code: "INVALID_ENUM", message: "Invalid integration lifecycle" });
  }
}

function timestamp(value: unknown, path: string, issues: ValidationIssue[]): void {
  requireSafeInteger(value, path, issues, 0);
}

function commit(value: unknown, path: string, issues: ValidationIssue[]): void {
  const entry = object(value, path, issues);
  requireString(entry.created_by, `${path}.created_by`, issues);
  requireString(entry.change_reason, `${path}.change_reason`, issues);
  timestamp(entry.committed_at, `${path}.committed_at`, issues);
}

export function validateIntegrationRevisionRef(value: unknown, path = "ref"): IntegrationRevisionRef {
  const issues: ValidationIssue[] = [];
  const ref = object(value, path, issues) as Partial<IntegrationRevisionRef>;
  if (!["integration_connection", "integration_channel"].includes(ref.entity_kind ?? "")) {
    issues.push({ path: `${path}.entity_kind`, code: "INVALID_ENUM", message: "Invalid integration revision entity kind" });
  }
  requireString(ref.entity_id, `${path}.entity_id`, issues);
  requireSafeInteger(ref.revision, `${path}.revision`, issues, 1);
  requireSha256(ref.fingerprint, `${path}.fingerprint`, issues);
  return assertValid({ ...ref } as IntegrationRevisionRef, issues);
}

function validateOpaqueCredentialRef(value: unknown, path: string, issues: ValidationIssue[]): OpaqueCredentialRef | undefined {
  if (value === undefined) return undefined;
  const ref = object(value, path, issues) as Partial<OpaqueCredentialRef>;
  requireString(ref.credential_ref, `${path}.credential_ref`, issues);
  requireString(ref.secret_store_ref, `${path}.secret_store_ref`, issues);
  if (ref.credential_version !== undefined) requireString(ref.credential_version, `${path}.credential_version`, issues);
  return ref as OpaqueCredentialRef;
}

function validateEndpoint(value: unknown, path: string, issues: ValidationIssue[]): void {
  const endpoint = object(value, path, issues);
  requireString(endpoint.kind, `${path}.kind`, issues);
  requireString(endpoint.uri, `${path}.uri`, issues);
  if (typeof endpoint.uri === "string") {
    try {
      const parsed = new URL(endpoint.uri);
      if (!parsed.protocol || parsed.username || parsed.password) {
        issues.push({ path: `${path}.uri`, code: "UNSAFE_ENDPOINT_URI", message: "Endpoint URI cannot include user info" });
      }
    } catch {
      issues.push({ path: `${path}.uri`, code: "INVALID_ENDPOINT_URI", message: "Endpoint URI must be absolute" });
    }
  }
}

export function fingerprintIntegrationConnectionRevisionV1(revision: Omit<IntegrationConnectionRevisionV1, "ref">): string {
  const { commit: _commit, ...content } = revision;
  return sha256Hex(stableStringify(content));
}

export function fingerprintIntegrationChannelRevisionV1(revision: Omit<IntegrationChannelRevisionV1, "ref">): string {
  const { commit: _commit, ...content } = revision;
  return sha256Hex(stableStringify(content));
}

export function validateIntegrationConnectionDefinitionV1(value: unknown): IntegrationConnectionDefinitionV1 {
  const issues: ValidationIssue[] = [];
  const definition = object(value, "$", issues) as Partial<IntegrationConnectionDefinitionV1>;
  if (definition.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["connection_id", "tenant_id", "connector_definition_ref"] as const) requireString(definition[key], key, issues);
  lifecycle(definition.lifecycle, "lifecycle", issues);
  requireSafeInteger(definition.current_revision, "current_revision", issues, 1);
  timestamp(definition.created_at, "created_at", issues);
  timestamp(definition.updated_at, "updated_at", issues);
  if ((definition.updated_at ?? 0) < (definition.created_at ?? 0)) issues.push({ path: "updated_at", code: "TIMESTAMP_ORDER", message: "updated_at cannot precede created_at" });
  assertNoSecretMaterial(value);
  return assertValid(definition as IntegrationConnectionDefinitionV1, issues);
}

export function validateIntegrationConnectionRevisionV1(value: unknown): IntegrationConnectionRevisionV1 {
  const issues: ValidationIssue[] = [];
  const revision = object(value, "$", issues) as Partial<IntegrationConnectionRevisionV1>;
  if (revision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  let ref: IntegrationRevisionRef | undefined;
  try { ref = validateIntegrationRevisionRef(revision.ref, "ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (ref?.entity_kind !== "integration_connection") issues.push({ path: "ref.entity_kind", code: "INVALID_ENTITY_KIND", message: "Connection revision kind is required" });
  if (revision.supersedes_revision !== undefined) requireSafeInteger(revision.supersedes_revision, "supersedes_revision", issues, 1);
  requireString(revision.connector_definition_ref, "connector_definition_ref", issues);
  object(revision.configuration, "configuration", issues);
  validateOpaqueCredentialRef(revision.credential_ref, "credential_ref", issues);
  lifecycle(revision.lifecycle, "lifecycle", issues);
  commit(revision.commit, "commit", issues);
  assertNoSecretMaterial(value);
  if (ref) {
    const { ref: _ref, ...content } = revision as IntegrationConnectionRevisionV1;
    if (fingerprintIntegrationConnectionRevisionV1(content) !== ref.fingerprint) issues.push({ path: "ref.fingerprint", code: "FINGERPRINT_MISMATCH", message: "Revision fingerprint does not match canonical content" });
  }
  return assertValid(revision as IntegrationConnectionRevisionV1, issues);
}

export function validateIntegrationChannelDefinitionV1(value: unknown): IntegrationChannelDefinitionV1 {
  const issues: ValidationIssue[] = [];
  const definition = object(value, "$", issues) as Partial<IntegrationChannelDefinitionV1>;
  if (definition.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["channel_id", "tenant_id"] as const) requireString(definition[key], key, issues);
  lifecycle(definition.lifecycle, "lifecycle", issues);
  requireSafeInteger(definition.current_revision, "current_revision", issues, 1);
  timestamp(definition.created_at, "created_at", issues);
  timestamp(definition.updated_at, "updated_at", issues);
  if ((definition.updated_at ?? 0) < (definition.created_at ?? 0)) issues.push({ path: "updated_at", code: "TIMESTAMP_ORDER", message: "updated_at cannot precede created_at" });
  assertNoSecretMaterial(value);
  return assertValid(definition as IntegrationChannelDefinitionV1, issues);
}

export function validateIntegrationChannelRevisionV1(value: unknown): IntegrationChannelRevisionV1 {
  const issues: ValidationIssue[] = [];
  const revision = object(value, "$", issues) as Partial<IntegrationChannelRevisionV1>;
  if (revision.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  let ref: IntegrationRevisionRef | undefined;
  let connectionRef: IntegrationRevisionRef | undefined;
  try { ref = validateIntegrationRevisionRef(revision.ref, "ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  try { connectionRef = validateIntegrationRevisionRef(revision.connection_revision_ref, "connection_revision_ref"); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  if (ref?.entity_kind !== "integration_channel") issues.push({ path: "ref.entity_kind", code: "INVALID_ENTITY_KIND", message: "Channel revision kind is required" });
  if (connectionRef?.entity_kind !== "integration_connection") issues.push({ path: "connection_revision_ref.entity_kind", code: "INVALID_ENTITY_KIND", message: "Connection revision reference is required" });
  if (revision.supersedes_revision !== undefined) requireSafeInteger(revision.supersedes_revision, "supersedes_revision", issues, 1);
  if (!["ingress", "egress", "bidirectional"].includes(revision.direction ?? "")) issues.push({ path: "direction", code: "INVALID_ENUM", message: "Invalid channel direction" });
  validateEndpoint(revision.endpoint, "endpoint", issues);
  if (revision.admission_policy_ref !== undefined) requireString(revision.admission_policy_ref, "admission_policy_ref", issues);
  lifecycle(revision.lifecycle, "lifecycle", issues);
  commit(revision.commit, "commit", issues);
  assertNoSecretMaterial(value);
  if (ref) {
    const { ref: _ref, ...content } = revision as IntegrationChannelRevisionV1;
    if (fingerprintIntegrationChannelRevisionV1(content) !== ref.fingerprint) issues.push({ path: "ref.fingerprint", code: "FINGERPRINT_MISMATCH", message: "Revision fingerprint does not match canonical content" });
  }
  return assertValid(revision as IntegrationChannelRevisionV1, issues);
}

export function createIntegrationConnectionDefinitionV1(input: Omit<IntegrationConnectionDefinitionV1, "schema_version">): IntegrationConnectionDefinitionV1 {
  return validateIntegrationConnectionDefinitionV1(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function createIntegrationConnectionRevisionV1(input: Omit<IntegrationConnectionRevisionV1, "schema_version" | "ref"> & { readonly connection_id: string; readonly revision: number }): IntegrationConnectionRevisionV1 {
  const { connection_id, revision, ...body } = input;
  const content = { ...body, schema_version: ACS_NATIVE_SCHEMA_VERSION } as Omit<IntegrationConnectionRevisionV1, "ref">;
  return validateIntegrationConnectionRevisionV1(freezeNative({ ...content, ref: { entity_kind: "integration_connection", entity_id: connection_id, revision, fingerprint: fingerprintIntegrationConnectionRevisionV1(content) } }));
}

export function createIntegrationChannelDefinitionV1(input: Omit<IntegrationChannelDefinitionV1, "schema_version">): IntegrationChannelDefinitionV1 {
  return validateIntegrationChannelDefinitionV1(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION }));
}

export function createIntegrationChannelRevisionV1(input: Omit<IntegrationChannelRevisionV1, "schema_version" | "ref"> & { readonly channel_id: string; readonly revision: number }): IntegrationChannelRevisionV1 {
  const { channel_id, revision, ...body } = input;
  const content = { ...body, schema_version: ACS_NATIVE_SCHEMA_VERSION } as Omit<IntegrationChannelRevisionV1, "ref">;
  return validateIntegrationChannelRevisionV1(freezeNative({ ...content, ref: { entity_kind: "integration_channel", entity_id: channel_id, revision, fingerprint: fingerprintIntegrationChannelRevisionV1(content) } }));
}

export function serializeIntegrationConnectionDefinitionV1(value: IntegrationConnectionDefinitionV1): string { return serializeNative(validateIntegrationConnectionDefinitionV1(value)); }
export function deserializeIntegrationConnectionDefinitionV1(serialized: string): IntegrationConnectionDefinitionV1 { return deserializeNative(serialized, validateIntegrationConnectionDefinitionV1); }
export function serializeIntegrationConnectionRevisionV1(value: IntegrationConnectionRevisionV1): string { return serializeNative(validateIntegrationConnectionRevisionV1(value)); }
export function deserializeIntegrationConnectionRevisionV1(serialized: string): IntegrationConnectionRevisionV1 { return deserializeNative(serialized, validateIntegrationConnectionRevisionV1); }
export function serializeIntegrationChannelDefinitionV1(value: IntegrationChannelDefinitionV1): string { return serializeNative(validateIntegrationChannelDefinitionV1(value)); }
export function deserializeIntegrationChannelDefinitionV1(serialized: string): IntegrationChannelDefinitionV1 { return deserializeNative(serialized, validateIntegrationChannelDefinitionV1); }
export function serializeIntegrationChannelRevisionV1(value: IntegrationChannelRevisionV1): string { return serializeNative(validateIntegrationChannelRevisionV1(value)); }
export function deserializeIntegrationChannelRevisionV1(serialized: string): IntegrationChannelRevisionV1 { return deserializeNative(serialized, validateIntegrationChannelRevisionV1); }
