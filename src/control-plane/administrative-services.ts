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
import type { EntityRef } from "../native-core/primitives.js";
import { sha256Hex, stableStringify } from "../native-core/primitives.js";
import type { GenomeSubjectV1, PresentationAssetAssociationV1, TraitAssertionV1 } from "../native-core/genome.js";

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

/**
 * Read port supplied by the existing canonical Genome owner. It neither owns
 * storage nor creates a Genome repository; S4 only projects supplied S1/S2
 * source contracts through the established administrative seam.
 */
export interface GenomeAdministrativeReadSourceV1 {
  getGenomeSubject(input: { readonly tenant_id: string; readonly subject: GenomeSubjectV1 }): Promise<GenomeAdministrativeSubjectSnapshotV1 | undefined>;
}

export interface GenomeAdministrativeSubjectSnapshotV1 {
  readonly subject: GenomeSubjectV1;
  readonly trait_assertions: readonly TraitAssertionV1[];
  readonly presentation_associations: readonly PresentationAssetAssociationV1[];
  readonly canonical_owner: string;
  readonly projected_at: number;
  readonly reconstruction_state: "COMPLETE" | "GAP";
}

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

function genomeSubjectFor(reference: AdministrativeResourceRefV1, lineage: Awaited<ReturnType<AsyncNativeCoreRepository["getAgentLineage"]>>): GenomeSubjectV1 {
  if (reference.addressing === "OBSERVED") throw new AdministrativeQueryError("UNSUPPORTED_ADDRESSING", "Genome does not support observed addressing");
  if (lineage.definition.scope.tenant_id !== reference.tenant_id) return notFound();
  if (reference.addressing === "CURRENT") {
    return { addressing: "CURRENT", agent_ref: { kind: "agent", id: lineage.definition.agent_id } } as GenomeSubjectV1;
  }
  const exact = lineage.revisions.find((entry) => entry.ref.revision === reference.revision);
  if (!exact) return { addressing: "EXACT", agent_revision_ref: { entity_kind: "agent", entity_id: lineage.definition.agent_id, revision: reference.revision, fingerprint: reference.fingerprint } };
  if (exact.ref.fingerprint !== reference.fingerprint) throw new AdministrativeQueryError("FINGERPRINT_MISMATCH", "requested Agent fingerprint does not match the exact revision");
  return { addressing: "EXACT", agent_revision_ref: exact.ref } as GenomeSubjectV1;
}

function sameGenomeSubject(left: GenomeSubjectV1, right: GenomeSubjectV1): boolean {
  if (left.addressing !== right.addressing) return false;
  return left.addressing === "CURRENT"
    ? left.agent_ref.kind === (right as Extract<GenomeSubjectV1, { addressing: "CURRENT" }>).agent_ref.kind && left.agent_ref.id === (right as Extract<GenomeSubjectV1, { addressing: "CURRENT" }>).agent_ref.id
    : left.agent_revision_ref.entity_kind === (right as Extract<GenomeSubjectV1, { addressing: "EXACT" }>).agent_revision_ref.entity_kind
      && left.agent_revision_ref.entity_id === (right as Extract<GenomeSubjectV1, { addressing: "EXACT" }>).agent_revision_ref.entity_id
      && left.agent_revision_ref.revision === (right as Extract<GenomeSubjectV1, { addressing: "EXACT" }>).agent_revision_ref.revision
      && left.agent_revision_ref.fingerprint === (right as Extract<GenomeSubjectV1, { addressing: "EXACT" }>).agent_revision_ref.fingerprint;
}

function referenceKey(prefix: string, index: number): string { return `${prefix}_${index + 1}`; }

function projectGenomeSnapshot(snapshot: GenomeAdministrativeSubjectSnapshotV1, source: AdministrativeCurrentRefV1 | AdministrativeHistoricalRefV1): readonly AdministrativeProjectionV1[] {
  const associationsByAssertion = new Map<string, readonly PresentationAssetAssociationV1[]>();
  for (const association of snapshot.presentation_associations) {
    if (!sameGenomeSubject(association.subject, snapshot.subject)) continue;
    const existing = associationsByAssertion.get(association.assertion_ref.assertion_id) ?? [];
    associationsByAssertion.set(association.assertion_ref.assertion_id, [...existing, association]);
  }
  return snapshot.trait_assertions.map((assertion) => {
    if (!sameGenomeSubject(assertion.subject, snapshot.subject)) throw new AdministrativeQueryError("ADMINISTRATIVE_NOT_FOUND", "Genome source returned an assertion for a different subject");
    const associations = associationsByAssertion.get(assertion.assertion_id) ?? [];
    const references: Record<string, EntityRef | readonly EntityRef[]> = {
      evidence_refs: assertion.evidence_refs,
      verification_refs: assertion.verification_refs.map((entry) => entry.verification_ref),
      verification_evidence_refs: assertion.verification_refs.flatMap((entry) => entry.evidence_refs),
      presentation_artifact_refs: associations.map((entry) => ({ kind: "artifact", id: entry.asset_ref.artifact_ref.artifact_id })),
      presentation_evidence_refs: associations.flatMap((entry) => entry.evidence_refs),
    };
    for (const [index, entry] of assertion.verification_refs.entries()) if (entry.decision_ref) references[referenceKey("verification_decision", index)] = entry.decision_ref;
    return createAdministrativeProjectionV1({
      metadata: {
        contract_version: "1.0",
        source,
        canonical_owner: snapshot.canonical_owner,
        projected_at: snapshot.projected_at,
        freshness: snapshot.reconstruction_state === "GAP" ? "UNAVAILABLE" : source.addressing === "CURRENT" ? "CURRENT" : "HISTORICAL",
        compatibility: "CANONICAL",
        reconstruction_state: snapshot.reconstruction_state,
        redacted_fields: ["trait_value_json", "provenance_payload", "evidence_content", "artifact_content", "verification_decision_payload", "provider_payload", "credential_material", "runtime_state"],
      },
      fields: [
        { name: "trait_namespace", classification: "ADMIN_SAFE", value: assertion.definition_ref.namespace },
        { name: "trait_name", classification: "ADMIN_SAFE", value: assertion.definition_ref.name },
        { name: "trait_definition_version", classification: "ADMIN_SAFE", value: assertion.definition_ref.version },
        { name: "trait_definition_digest", classification: "ADMIN_SAFE", value: assertion.definition_ref.digest },
        { name: "trait_assertion_id", classification: "ADMIN_SAFE", value: assertion.assertion_id },
        { name: "trait_assertion_digest", classification: "ADMIN_SAFE", value: assertion.digest },
        { name: "trait_state", classification: "ADMIN_SAFE", value: assertion.state },
        { name: "trait_value_kind", classification: "ADMIN_SAFE", value: assertion.value_kind },
        { name: "trait_value", classification: "ADMIN_SAFE", value: assertion.value_kind === "json" ? "REDACTED_JSON_VALUE" : assertion.value as string | number | boolean },
        { name: "observed_at", classification: "ADMIN_SAFE", value: assertion.observed_at },
        { name: "provenance_reference_count", classification: "ADMIN_SAFE", value: assertion.provenance_refs.length },
        { name: "evidence_reference_count", classification: "ADMIN_SAFE", value: assertion.evidence_refs.length },
        { name: "verification_statuses", classification: "ADMIN_SAFE", value: assertion.verification_refs.map((entry) => entry.status) },
        { name: "presentation_reference_count", classification: "ADMIN_SAFE", value: associations.length },
        { name: "presentation_availability", classification: "ADMIN_SAFE", value: associations.map((entry) => entry.asset_ref.availability) },
        { name: "presentation_gap_codes", classification: "ADMIN_SAFE", value: associations.map((entry) => entry.asset_ref.gap_code ?? null) },
      ],
      references,
    });
  });
}

function projectGenomeHistoricalGap(source: AdministrativeHistoricalRefV1, projectedAt: number): readonly AdministrativeProjectionV1[] {
  return [createAdministrativeProjectionV1({
    metadata: {
      contract_version: "1.0",
      source,
      canonical_owner: "native-agent",
      projected_at: projectedAt,
      freshness: "UNAVAILABLE",
      compatibility: "CANONICAL",
      reconstruction_state: "GAP",
      redacted_fields: ["trait_assertions", "provenance_payload", "evidence_content", "artifact_content", "verification_payload", "runtime_state"],
    },
    fields: [
      { name: "historical_subject_status", classification: "ADMIN_SAFE", value: "gap" },
      { name: "historical_gap_code", classification: "ADMIN_SAFE", value: "GENOME_EXACT_SUBJECT_UNAVAILABLE" },
      { name: "trait_assertion_count", classification: "ADMIN_SAFE", value: 0 },
    ],
  })];
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
    "getAutomationLineage" | "listAutomationHeads" | "getDelegationGrantLineage" | "listDelegationGrantHeads" | "getActivationLineage" | "getAgentLineage">,
    private readonly genomeSource?: GenomeAdministrativeReadSourceV1) {}

  async getGenome(tenantId: string, reference: AdministrativeResourceRefV1): Promise<readonly AdministrativeProjectionV1[]> {
    assertKind(reference, "agent", "agent_revision");
    assertTenant(tenantId, reference.tenant_id);
    if (!this.genomeSource) return notFound();
    let lineage: Awaited<ReturnType<AsyncNativeCoreRepository["getAgentLineage"]>>;
    try { lineage = await this.store.getAgentLineage(reference.stable_id); } catch { return notFound(); }
    if (lineage.definition.scope.tenant_id !== tenantId) return notFound();
    const subject = genomeSubjectFor(reference, lineage);
    const source = subject.addressing === "CURRENT"
      ? createAdministrativeCurrentRefV1({ resource_kind: "agent", stable_id: lineage.definition.agent_id, tenant_id: tenantId })
      : createAdministrativeHistoricalRefV1({ resource_kind: "agent_revision", stable_id: lineage.definition.agent_id, tenant_id: tenantId, revision: subject.agent_revision_ref.revision, fingerprint: subject.agent_revision_ref.fingerprint });
    if (subject.addressing === "EXACT" && !lineage.revisions.some((entry) => entry.ref.revision === subject.agent_revision_ref.revision)) {
      return projectGenomeHistoricalGap(createAdministrativeHistoricalRefV1({ resource_kind: "agent_revision", stable_id: lineage.definition.agent_id, tenant_id: tenantId, revision: subject.agent_revision_ref.revision, fingerprint: subject.agent_revision_ref.fingerprint }), lineage.definition.updated_at);
    }
    const snapshot = await this.genomeSource.getGenomeSubject({ tenant_id: tenantId, subject });
    if (!snapshot) return notFound();
    if (!sameGenomeSubject(snapshot.subject, subject)) return notFound();
    return projectGenomeSnapshot(snapshot, source);
  }

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
