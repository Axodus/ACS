import {
  createAdministrativeCurrentRefV1,
  createAdministrativeHistoricalRefV1,
  createAdministrativeObservationRefV1,
  createAdministrativeProjectionV1,
  type AdministrativeCurrentRefV1,
  type AdministrativeHistoricalRefV1,
  type AdministrativeObservationRefV1,
  type AdministrativeProjectionV1,
  type AdministrativeResourceRefV1,
} from "./administrative-contracts.js";
import { GovernedAutomationService } from "./automation-service.js";
import type {
  AsyncNativeCoreRepository,
  NativeActivationLineage,
  NativeAutomationLineage,
  NativeDelegationGrantLineage,
} from "./shared-state/native-core-durable.js";
import { sha256Hex, stableStringify } from "../native-core/primitives.js";

export type AdministrativeQueryErrorCode =
  | "ADMINISTRATIVE_NOT_FOUND"
  | "TENANT_MISMATCH"
  | "REVISION_MISMATCH"
  | "FINGERPRINT_MISMATCH"
  | "OBSERVATION_MISMATCH"
  | "UNSUPPORTED_ADDRESSING";

export class AdministrativeQueryError extends Error {
  constructor(readonly code: AdministrativeQueryErrorCode, message: string) {
    super(message);
    this.name = "AdministrativeQueryError";
  }
}

export type AdministrativeAutomationCreateCommandV1 = Parameters<GovernedAutomationService["create"]>[0];
export type AdministrativeAutomationRevisionCommandV1 = Parameters<GovernedAutomationService["revise"]>[0];
export type AdministrativeAutomationLifecycleCommandV1 = Parameters<GovernedAutomationService["transition"]>[0];

function notFound(): never {
  throw new AdministrativeQueryError("ADMINISTRATIVE_NOT_FOUND", "administrative resource not found");
}

function assertTenant(requestTenantId: string, referenceTenantId: string): void {
  if (requestTenantId !== referenceTenantId) {
    throw new AdministrativeQueryError("TENANT_MISMATCH", "administrative reference is outside the current Tenant scope");
  }
}

function assertKind(reference: AdministrativeResourceRefV1, ...allowed: readonly string[]): void {
  if (!allowed.includes(reference.resource_kind)) {
    throw new AdministrativeQueryError("UNSUPPORTED_ADDRESSING", "administrative reference kind is not supported by this query");
  }
}

function sourceForAutomation(reference: AdministrativeResourceRefV1, lineage: NativeAutomationLineage) {
  const revision = lineage.revisions.at(-1);
  if (!revision) notFound();
  if (reference.addressing === "CURRENT") {
    return createAdministrativeCurrentRefV1({ resource_kind: "automation", stable_id: lineage.head.automation_id, tenant_id: lineage.head.tenant_id });
  }
  if (reference.addressing === "OBSERVED") {
    throw new AdministrativeQueryError("UNSUPPORTED_ADDRESSING", "Automation does not support observed addressing");
  }
  const exact = lineage.revisions.find((entry) => entry.ref.revision === reference.revision);
  if (!exact) throw new AdministrativeQueryError("REVISION_MISMATCH", "requested Automation revision is unavailable");
  if (exact.ref.fingerprint !== reference.fingerprint) throw new AdministrativeQueryError("FINGERPRINT_MISMATCH", "requested Automation fingerprint does not match the exact revision");
  return createAdministrativeHistoricalRefV1({ resource_kind: "automation", stable_id: exact.ref.automation_id, tenant_id: exact.ref.tenant_id, revision: exact.ref.revision, fingerprint: exact.ref.fingerprint });
}

function projectAutomation(lineage: NativeAutomationLineage, source: AdministrativeCurrentRefV1 | AdministrativeHistoricalRefV1): AdministrativeProjectionV1 {
  const revision = source.addressing === "EXACT"
    ? lineage.revisions.find((entry) => entry.ref.revision === source.revision && entry.ref.fingerprint === source.fingerprint)
    : lineage.revisions.at(-1);
  if (!revision) notFound();
  return createAdministrativeProjectionV1({
    metadata: {
      contract_version: "1.0",
      source,
      canonical_owner: "native-automation",
      projected_at: lineage.head.updated_at,
      freshness: source.addressing === "CURRENT" ? "CURRENT" : "HISTORICAL",
      compatibility: "CANONICAL",
      reconstruction_state: "COMPLETE",
      redacted_fields: ["authored_configuration", "governing_refs", "provenance_refs", "credential_material"],
    },
    fields: [
      { name: "lifecycle", classification: "ADMIN_SAFE", value: lineage.head.lifecycle },
      { name: "current_revision", classification: "ADMIN_SAFE", value: lineage.head.current_revision },
      { name: "target_mode", classification: "ADMIN_SAFE", value: revision.target_mode },
      { name: "definition_count", classification: "ADMIN_SAFE", value: revision.definitions.length },
      { name: "delegation_requirement_count", classification: "ADMIN_SAFE", value: revision.delegation_requirement_refs.length },
      { name: "lifecycle_event_count", classification: "ADMIN_SAFE", value: lineage.lifecycleEvents.length },
    ],
  });
}

function sourceForDelegation(reference: AdministrativeResourceRefV1, lineage: NativeDelegationGrantLineage) {
  if (reference.addressing === "CURRENT") {
    return createAdministrativeCurrentRefV1({ resource_kind: "delegation", stable_id: lineage.head.grant_id, tenant_id: lineage.head.tenant_id });
  }
  if (reference.addressing === "OBSERVED") {
    throw new AdministrativeQueryError("UNSUPPORTED_ADDRESSING", "Delegation does not support observed addressing");
  }
  const exact = lineage.revisions.find((entry) => entry.ref.revision === reference.revision);
  if (!exact) throw new AdministrativeQueryError("REVISION_MISMATCH", "requested Delegation revision is unavailable");
  if (exact.ref.fingerprint !== reference.fingerprint) throw new AdministrativeQueryError("FINGERPRINT_MISMATCH", "requested Delegation fingerprint does not match the exact revision");
  return createAdministrativeHistoricalRefV1({ resource_kind: "delegation", stable_id: exact.ref.grant_id, tenant_id: exact.ref.tenant_id, revision: exact.ref.revision, fingerprint: exact.ref.fingerprint });
}

function projectDelegation(lineage: NativeDelegationGrantLineage, source: AdministrativeCurrentRefV1 | AdministrativeHistoricalRefV1): AdministrativeProjectionV1 {
  const revision = source.addressing === "EXACT"
    ? lineage.revisions.find((entry) => entry.ref.revision === source.revision && entry.ref.fingerprint === source.fingerprint)
    : lineage.revisions.at(-1);
  if (!revision) notFound();
  return createAdministrativeProjectionV1({
    metadata: {
      contract_version: "1.0",
      source,
      canonical_owner: "native-delegation",
      projected_at: lineage.head.updated_at,
      freshness: source.addressing === "CURRENT" ? "CURRENT" : "HISTORICAL",
      compatibility: "CANONICAL",
      reconstruction_state: "COMPLETE",
      redacted_fields: ["issued_by", "reason", "revocation_reason", "governing_authority_refs", "credential_material", "memory_content"],
    },
    fields: [
      { name: "lifecycle", classification: "ADMIN_SAFE", value: lineage.head.lifecycle },
      { name: "current_revision", classification: "ADMIN_SAFE", value: lineage.head.current_revision },
      { name: "valid_from", classification: "ADMIN_SAFE", value: revision.valid_from },
      { name: "expires_at", classification: "ADMIN_SAFE", value: revision.expires_at },
      { name: "depth", classification: "ADMIN_SAFE", value: revision.depth },
      { name: "action_count", classification: "ADMIN_SAFE", value: revision.authority_bounds.actions.length },
      { name: "revocation_count", classification: "ADMIN_SAFE", value: lineage.revocations.length },
    ],
  });
}

function observationDigest(lineage: NativeActivationLineage): string {
  const initial = lineage.stateEvents.find((event) => event.sequence === 1);
  if (!initial) notFound();
  return initial.cause_digest;
}

function sourceForActivation(reference: AdministrativeResourceRefV1, lineage: NativeActivationLineage): AdministrativeCurrentRefV1 | AdministrativeObservationRefV1 {
  if (reference.addressing === "EXACT") {
    throw new AdministrativeQueryError("UNSUPPORTED_ADDRESSING", "Activation has no revision-addressed historical representation");
  }
  if (reference.addressing === "CURRENT") {
    return createAdministrativeCurrentRefV1({ resource_kind: "activation", stable_id: lineage.head.identity.activation_id, tenant_id: lineage.head.identity.tenant_id });
  }
  const digest = observationDigest(lineage);
  if (reference.observation_digest !== digest) {
    throw new AdministrativeQueryError("OBSERVATION_MISMATCH", "requested Activation observation does not match the canonical causal observation");
  }
  return createAdministrativeObservationRefV1({ resource_kind: "activation", stable_id: lineage.head.identity.activation_id, tenant_id: lineage.head.identity.tenant_id, observation_digest: digest });
}

function projectActivation(lineage: NativeActivationLineage, source: AdministrativeCurrentRefV1 | AdministrativeObservationRefV1): AdministrativeProjectionV1 {
  const handoff = lineage.handoff;
  return createAdministrativeProjectionV1({
    metadata: {
      contract_version: "1.0",
      source,
      canonical_owner: "native-activation",
      projected_at: lineage.head.updated_at,
      freshness: source.addressing === "CURRENT" ? "CURRENT" : "OBSERVED",
      compatibility: "CANONICAL",
      reconstruction_state: "COMPLETE",
      redacted_fields: ["authority_context", "raw_provider_payload", "credential_material", "handoff_idempotency", "lease_details"],
    },
    fields: [
      { name: "state", classification: "ADMIN_SAFE", value: lineage.head.current_state },
      { name: "state_sequence", classification: "ADMIN_SAFE", value: lineage.head.state_sequence },
      { name: "automation_revision", classification: "ADMIN_SAFE", value: lineage.head.identity.automation_ref.revision },
      { name: "state_event_count", classification: "ADMIN_SAFE", value: lineage.stateEvents.length },
      { name: "attempt_count", classification: "ADMIN_SAFE", value: lineage.attempts.length },
      { name: "handoff_status", classification: "ADMIN_SAFE", value: handoff?.status ?? null },
    ],
  });
}

/**
 * Read-only S2 coordinator. It uses the canonical Native Core read port and
 * turns exact lineages into S1 allowlisted administrative projections.
 */
export class AdministrativeQueryService {
  constructor(private readonly store: Pick<AsyncNativeCoreRepository,
    "getAutomationLineage" | "listAutomationHeads" | "getDelegationGrantLineage" | "listDelegationGrantHeads" | "getActivationLineage">) {}

  async listAutomations(tenantId: string): Promise<readonly AdministrativeProjectionV1[]> {
    const heads = await this.store.listAutomationHeads({ tenantId });
    const projections = await Promise.all(heads.map(async (head) => this.getAutomation(tenantId, createAdministrativeCurrentRefV1({ resource_kind: "automation", stable_id: head.automation_id, tenant_id: tenantId }))));
    return projections.sort((left, right) => left.metadata.source.stable_id.localeCompare(right.metadata.source.stable_id));
  }

  async getAutomation(tenantId: string, reference: AdministrativeResourceRefV1): Promise<AdministrativeProjectionV1> {
    assertKind(reference, "automation", "automation_revision");
    assertTenant(tenantId, reference.tenant_id);
    let lineage: NativeAutomationLineage;
    try { lineage = await this.store.getAutomationLineage(reference.stable_id); } catch { return notFound(); }
    if (lineage.head.tenant_id !== tenantId) return notFound();
    return projectAutomation(lineage, sourceForAutomation(reference, lineage));
  }

  async listDelegations(tenantId: string): Promise<readonly AdministrativeProjectionV1[]> {
    const heads = await this.store.listDelegationGrantHeads({ tenantId });
    const projections = await Promise.all(heads.map(async (head) => this.getDelegation(tenantId, createAdministrativeCurrentRefV1({ resource_kind: "delegation", stable_id: head.grant_id, tenant_id: tenantId }))));
    return projections.sort((left, right) => left.metadata.source.stable_id.localeCompare(right.metadata.source.stable_id));
  }

  async getDelegation(tenantId: string, reference: AdministrativeResourceRefV1): Promise<AdministrativeProjectionV1> {
    assertKind(reference, "delegation");
    assertTenant(tenantId, reference.tenant_id);
    let lineage: NativeDelegationGrantLineage;
    try { lineage = await this.store.getDelegationGrantLineage(reference.stable_id); } catch { return notFound(); }
    if (lineage.head.tenant_id !== tenantId) return notFound();
    return projectDelegation(lineage, sourceForDelegation(reference, lineage));
  }

  async getActivation(tenantId: string, reference: AdministrativeResourceRefV1): Promise<AdministrativeProjectionV1> {
    assertKind(reference, "activation");
    assertTenant(tenantId, reference.tenant_id);
    let lineage: NativeActivationLineage;
    try { lineage = await this.store.getActivationLineage(reference.stable_id, tenantId); } catch { return notFound(); }
    if (lineage.head.identity.tenant_id !== tenantId) return notFound();
    return projectActivation(lineage, sourceForActivation(reference, lineage));
  }
}

/**
 * Command-only S2 coordinator. It never receives a repository; it passes
 * Tenant-qualified commands to the canonical GovernedAutomationService.
 */
export class AdministrativeAutomationCommandService {
  constructor(private readonly owner: Pick<GovernedAutomationService, "create" | "revise" | "transition">) {}

  async create(tenantId: string, command: AdministrativeAutomationCreateCommandV1): Promise<AdministrativeProjectionV1> {
    assertTenant(tenantId, command.revision.ref.tenant_id);
    const result = await this.owner.create(command);
    return projectAutomation(result.lineage, createAdministrativeCurrentRefV1({ resource_kind: "automation", stable_id: result.lineage.head.automation_id, tenant_id: tenantId }));
  }

  async revise(tenantId: string, command: AdministrativeAutomationRevisionCommandV1): Promise<AdministrativeProjectionV1> {
    assertTenant(tenantId, command.revision.ref.tenant_id);
    assertTenant(tenantId, command.expectedRef.tenant_id);
    const result = await this.owner.revise(command);
    return projectAutomation(result.lineage, createAdministrativeHistoricalRefV1({ resource_kind: "automation", stable_id: command.revision.ref.automation_id, tenant_id: tenantId, revision: command.revision.ref.revision, fingerprint: command.revision.ref.fingerprint }));
  }

  async transition(tenantId: string, command: AdministrativeAutomationLifecycleCommandV1): Promise<AdministrativeProjectionV1> {
    assertTenant(tenantId, command.tenantId);
    const result = await this.owner.transition(command);
    return projectAutomation(result.lineage, createAdministrativeCurrentRefV1({ resource_kind: "automation", stable_id: result.lineage.head.automation_id, tenant_id: tenantId }));
  }
}

export function administrativeCommandDigest(value: unknown): string {
  return sha256Hex(stableStringify(value));
}
