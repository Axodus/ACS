import {
  ACS_NATIVE_SCHEMA_VERSION, assertNoSecretMaterial, NativeContractValidationError,
  sha256Hex, stableStringify, validateRevisionRef, freezeNative,
} from "../native-core/primitives.js";
import type { GovernedRoleResource } from "./composition-resources.js";

export type GovernedRoleStatus = "active" | "deprecated" | "experimental";

export interface GovernedRoleRevisionV2 {
  readonly schema_version: "1.0";
  readonly ref: {
    readonly entity_kind: "resource";
    readonly entity_id: string;
    readonly revision: number;
    readonly fingerprint: string;
  };
  readonly supersedes_revision?: number;
  readonly display_name: string;
  readonly status: GovernedRoleStatus;
  readonly capability_ids: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly commit: {
    readonly created_by: string;
    readonly committed_at: number;
    readonly change_reason: string;
  };
}

export class NativeGovernedRoleHistoryError extends Error {
  readonly code = "ACS_NATIVE_GOVERNED_ROLE_HISTORY";
  constructor(readonly roleId: string, detail: string) {
    super(`native governed role history failure for ${roleId}: ${detail}`);
    this.name = "NativeGovernedRoleHistoryError";
  }
}

export function fingerprintGovernedRoleRevisionV2(role: Omit<GovernedRoleRevisionV2, "ref">): string {
  return sha256Hex(stableStringify({
    schema_version: role.schema_version,
    supersedes_revision: role.supersedes_revision,
    display_name: role.display_name,
    status: role.status,
    capability_ids: role.capability_ids,
    metadata: role.metadata,
  }));
}

export function validateGovernedRoleRevisionV2(value: unknown): GovernedRoleRevisionV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NativeContractValidationError("invalid governed role revision", [{ path: "$", code: "INVALID_OBJECT", message: "Governed role revision must be an object" }]);
  }
  const role = value as Partial<GovernedRoleRevisionV2>;
  const issues: { path: string; code: string; message: string }[] = [];
  if (role.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  try {
    const ref = validateRevisionRef(role.ref, "ref");
    if (ref.entity_kind !== "resource") issues.push({ path: "ref.entity_kind", code: "INVALID_ENTITY_KIND", message: "Governed roles are resource revisions" });
  } catch (error) {
    if (error instanceof NativeContractValidationError) issues.push(...error.issues);
    else issues.push({ path: "ref", code: "INVALID_REVISION_REF", message: "Invalid role revision reference" });
  }
  if (role.supersedes_revision !== undefined && (!Number.isSafeInteger(role.supersedes_revision) || role.supersedes_revision < 1)) issues.push({ path: "supersedes_revision", code: "INVALID_INTEGER", message: "supersedes_revision must be >= 1" });
  if (typeof role.display_name !== "string" || role.display_name.trim().length === 0) issues.push({ path: "display_name", code: "REQUIRED_STRING", message: "display_name is required" });
  if (!["active", "deprecated", "experimental"].includes(role.status ?? "")) issues.push({ path: "status", code: "INVALID_ENUM", message: "Invalid governed role status" });
  if (!Array.isArray(role.capability_ids) || role.capability_ids.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    issues.push({ path: "capability_ids", code: "INVALID_STRING_LIST", message: "capability_ids must be non-empty strings" });
  } else if (new Set(role.capability_ids).size !== role.capability_ids.length) {
    issues.push({ path: "capability_ids", code: "DUPLICATE_CAPABILITY", message: "capability_ids must be unique" });
  }
  if (role.metadata !== undefined && (!role.metadata || typeof role.metadata !== "object" || Array.isArray(role.metadata))) issues.push({ path: "metadata", code: "INVALID_OBJECT", message: "metadata must be an object" });
  if (!role.commit || typeof role.commit !== "object" || Array.isArray(role.commit)) {
    issues.push({ path: "commit", code: "REQUIRED_OBJECT", message: "commit is required" });
  } else {
    for (const key of ["created_by", "change_reason"] as const) if (typeof role.commit[key] !== "string" || role.commit[key].trim().length === 0) issues.push({ path: `commit.${key}`, code: "REQUIRED_STRING", message: "A non-empty string is required" });
    if (!Number.isSafeInteger(role.commit.committed_at) || role.commit.committed_at < 0) issues.push({ path: "commit.committed_at", code: "INVALID_TIMESTAMP", message: "committed_at must be non-negative" });
  }
  assertNoSecretMaterial(value);
  if (role.ref?.fingerprint) {
    const { ref, ...body } = role as GovernedRoleRevisionV2;
    if (fingerprintGovernedRoleRevisionV2(body) !== ref.fingerprint) issues.push({ path: "ref.fingerprint", code: "FINGERPRINT_MISMATCH", message: "Role fingerprint does not match canonical content" });
  }
  if (issues.length > 0) throw new NativeContractValidationError("governed role revision validation failed", issues);
  return role as GovernedRoleRevisionV2;
}

export function createGovernedRoleRevisionV2(input: Omit<GovernedRoleRevisionV2, "schema_version" | "ref"> & { readonly role_id: string; readonly revision: number }): GovernedRoleRevisionV2 {
  const { role_id, revision, ...body } = input;
  const content = { ...body, schema_version: ACS_NATIVE_SCHEMA_VERSION } as Omit<GovernedRoleRevisionV2, "ref">;
  return freezeNative(validateGovernedRoleRevisionV2({
    ...content,
    ref: { entity_kind: "resource", entity_id: role_id, revision, fingerprint: fingerprintGovernedRoleRevisionV2(content) },
  }));
}

// Snapshot the existing governed resource without inventing missing history.
export function governedRoleRevisionFromResource(
  resource: GovernedRoleResource,
  commit: GovernedRoleRevisionV2["commit"],
  supersedes_revision?: number,
): GovernedRoleRevisionV2 {
  if (resource.kind !== "role") throw new NativeGovernedRoleHistoryError(resource.id, "expected governed role resource");
  return createGovernedRoleRevisionV2({
    role_id: resource.id, revision: resource.revision,
    display_name: resource.displayName, status: resource.status,
    capability_ids: [...resource.capabilityIds],
    ...(resource.metadata ? { metadata: resource.metadata } : {}),
    ...(supersedes_revision === undefined ? {} : { supersedes_revision }), commit,
  });
}
