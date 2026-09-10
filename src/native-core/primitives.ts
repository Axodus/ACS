import { createHash } from "node:crypto";

export const ACS_NATIVE_SCHEMA_VERSION = "1.0" as const;
export const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type NativeSchemaVersion = `${number}.${number}`;

export interface EntityRef {
  readonly kind: string;
  readonly id: string;
  readonly revision?: number;
}

export interface Scope {
  readonly organization_id: string;
  readonly product_domain: string;
  readonly tenant_id?: string;
  readonly owner_ref: string;
  readonly authority_scope_ref: string;
  readonly knowledge_scope_refs: readonly string[];
  readonly budget_scope_ref?: string;
  readonly credential_scope_ref?: string;
}

export interface RevisionRef {
  readonly entity_kind: "agent" | "workforce" | "workflow" | "policy" | "resource" | "schema";
  readonly entity_id: string;
  readonly revision: number;
  readonly fingerprint: string;
}

export interface PolicySnapshotRef {
  readonly policy_id: string;
  readonly revision: number;
  readonly fingerprint: string;
  readonly decision_context_hash: string;
}

export interface Idempotency {
  readonly key: string;
  readonly scope: string;
  readonly request_hash: string;
}

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export class NativeContractValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(message: string, issues: readonly ValidationIssue[]) {
    super(message);
    this.name = "NativeContractValidationError";
    this.issues = issues;
  }
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function serializeNative(value: unknown): string {
  return stableStringify(value);
}

export function deserializeNative<T>(serialized: string, validate: (value: unknown) => T): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new NativeContractValidationError("native contract serialization is invalid", [{
      path: "$",
      code: "INVALID_JSON",
      message: "Payload is not valid JSON",
    }]);
  }
  return validate(parsed);
}

export function assertValid<T>(value: T, issues: readonly ValidationIssue[]): T {
  if (issues.length > 0) throw new NativeContractValidationError("native contract validation failed", issues);
  return value;
}

export function requireString(value: unknown, path: string, issues: ValidationIssue[]): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, code: "REQUIRED_STRING", message: "A non-empty string is required" });
  }
}

export function requireSafeInteger(value: unknown, path: string, issues: ValidationIssue[], minimum = 0): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    issues.push({ path, code: "INVALID_INTEGER", message: `A safe integer >= ${minimum} is required` });
  }
}

export function requireSha256(value: unknown, path: string, issues: ValidationIssue[]): asserts value is string {
  requireString(value, path, issues);
  if (typeof value === "string" && !SHA256_PATTERN.test(value)) {
    issues.push({ path, code: "INVALID_SHA256", message: "A lowercase SHA-256 hex digest is required" });
  }
}

export function validateEntityRef(value: unknown, path = "entity_ref"): EntityRef {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, code: "INVALID_ENTITY_REF", message: "EntityRef must be an object" });
    throw new NativeContractValidationError("invalid entity reference", issues);
  }
  const ref = value as Partial<EntityRef>;
  requireString(ref.kind, `${path}.kind`, issues);
  requireString(ref.id, `${path}.id`, issues);
  if (ref.revision !== undefined) requireSafeInteger(ref.revision, `${path}.revision`, issues, 1);
  return assertValid({ ...ref } as EntityRef, issues);
}

export function validateRevisionRef(value: unknown, path = "revision_ref"): RevisionRef {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, code: "INVALID_REVISION_REF", message: "RevisionRef must be an object" });
    throw new NativeContractValidationError("invalid revision reference", issues);
  }
  const ref = value as Partial<RevisionRef>;
  if (!["agent", "workforce", "workflow", "policy", "resource", "schema"].includes(ref.entity_kind ?? "")) {
    issues.push({ path: `${path}.entity_kind`, code: "INVALID_ENUM", message: "Unsupported revision entity kind" });
  }
  requireString(ref.entity_id, `${path}.entity_id`, issues);
  requireSafeInteger(ref.revision, `${path}.revision`, issues, 1);
  requireSha256(ref.fingerprint, `${path}.fingerprint`, issues);
  return assertValid({ ...ref } as RevisionRef, issues);
}

export function validatePolicySnapshotRef(value: unknown, path = "policy_snapshot_ref"): PolicySnapshotRef {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, code: "INVALID_POLICY_SNAPSHOT_REF", message: "PolicySnapshotRef must be an object" });
    throw new NativeContractValidationError("invalid policy snapshot reference", issues);
  }
  const ref = value as Partial<PolicySnapshotRef>;
  requireString(ref.policy_id, `${path}.policy_id`, issues);
  requireSafeInteger(ref.revision, `${path}.revision`, issues, 1);
  requireSha256(ref.fingerprint, `${path}.fingerprint`, issues);
  requireSha256(ref.decision_context_hash, `${path}.decision_context_hash`, issues);
  return assertValid({ ...ref } as PolicySnapshotRef, issues);
}

export function validateScope(value: unknown, path = "scope"): Scope {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, code: "INVALID_SCOPE", message: "Scope must be an object" });
    throw new NativeContractValidationError("invalid scope", issues);
  }
  const scope = value as Partial<Scope>;
  requireString(scope.organization_id, `${path}.organization_id`, issues);
  requireString(scope.product_domain, `${path}.product_domain`, issues);
  requireString(scope.owner_ref, `${path}.owner_ref`, issues);
  requireString(scope.authority_scope_ref, `${path}.authority_scope_ref`, issues);
  if (!Array.isArray(scope.knowledge_scope_refs)
    || scope.knowledge_scope_refs.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    issues.push({ path: `${path}.knowledge_scope_refs`, code: "INVALID_STRING_LIST", message: "Knowledge scopes must be non-empty strings" });
  }
  for (const [key, entry] of Object.entries(scope)) {
    if (["tenant_id", "budget_scope_ref", "credential_scope_ref"].includes(key) && entry !== undefined) {
      requireString(entry, `${path}.${key}`, issues);
    }
  }
  return assertValid({ ...scope } as Scope, issues);
}

export function validateIdempotency(value: unknown, path = "idempotency"): Idempotency {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, code: "INVALID_IDEMPOTENCY", message: "Idempotency must be an object" });
    throw new NativeContractValidationError("invalid idempotency", issues);
  }
  const idempotency = value as Partial<Idempotency>;
  requireString(idempotency.key, `${path}.key`, issues);
  requireString(idempotency.scope, `${path}.scope`, issues);
  requireSha256(idempotency.request_hash, `${path}.request_hash`, issues);
  return assertValid({ ...idempotency } as Idempotency, issues);
}

export function assertNoSecretMaterial(value: unknown, path = "payload"): void {
  const forbidden = new Set([
    "apiKey", "api_key", "secret", "secretKey", "secret_key", "accessToken", "access_token",
    "refreshToken", "refresh_token", "privateKey", "private_key", "oauthToken", "oauth_token",
    "password", "credential", "credentials",
  ]);
  const issues: ValidationIssue[] = [];
  const visit = (entry: unknown, currentPath: string): void => {
    if (!entry || typeof entry !== "object") return;
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(entry)) {
      if (forbidden.has(key)) issues.push({ path: `${currentPath}.${key}`, code: "SECRET_MATERIAL_FORBIDDEN", message: "Canonical contracts contain references, not secret material" });
      visit(child, `${currentPath}.${key}`);
    }
  };
  visit(value, path);
  assertValid(value, issues);
}

export function freezeNative<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    value.forEach((item) => freezeNative(item));
  } else {
    Object.values(value as Record<string, unknown>).forEach((item) => freezeNative(item));
  }
  return Object.freeze(value);
}
