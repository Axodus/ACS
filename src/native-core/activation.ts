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
import { validateAutomationRevisionRefV1, type AutomationRevisionRefV1 } from "./automation.js";

export type ActivationSourceKindV1 = "event" | "channel" | "schedule" | "manual" | "system";
export type ActivationStateV1 = "observed" | "claimed" | "resolving" | "prepared" | "handoff_pending" | "admitted" | "rejected" | "cancelled" | "expired" | "skipped" | "coalesced" | "failed";
export type ActivationAttemptStatusV1 = "claimed" | "released" | "expired" | "completed" | "failed" | "superseded";
export type ActivationHandoffStatusV1 = "prepared" | "submitted" | "unknown" | "reconciled";

export type ActivationSourceIdentityV1 =
  | { readonly kind: "event"; readonly issuer: string; readonly namespace: string; readonly event_id: string; readonly payload_digest: string }
  | { readonly kind: "channel"; readonly channel_ref: EntityRef; readonly connection_ref: EntityRef; readonly delivery_id: string; readonly logical_event_id: string; readonly payload_digest: string }
  | { readonly kind: "schedule"; readonly schedule_key: string; readonly schedule_digest: string; readonly intended_at: number; readonly timezone: string; readonly calendar_digest?: string }
  | { readonly kind: "manual"; readonly actor_ref: EntityRef; readonly idempotency_key: string; readonly requested_at: number; readonly purpose: string }
  | { readonly kind: "system"; readonly system_id: string; readonly occurrence_key: string; readonly purpose: string };

export interface ActivationCausalIdentityV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly activation_id: string;
  readonly tenant_id: string;
  readonly automation_ref: AutomationRevisionRefV1;
  readonly source: ActivationSourceIdentityV1;
}

export interface ActivationHeadV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly identity: ActivationCausalIdentityV1;
  readonly current_state: ActivationStateV1;
  readonly state_sequence: number;
  readonly current_state_fingerprint: string;
  readonly created_at: number;
  readonly updated_at: number;
}

export interface ActivationResolutionContextV1 {
  readonly target_mode: "PINNED" | "RESOLVED_AT_ACTIVATION";
  readonly exact_target_ref: RevisionRef;
  readonly effective_configuration_ref?: RevisionRef;
  readonly resolution_policy_ref?: RevisionRef;
}

export interface ActivationAuthorityContextV1 {
  readonly governing_refs: readonly (EntityRef | RevisionRef)[];
  readonly delegation_requirement_refs: readonly EntityRef[];
  readonly policy_decision_refs: readonly EntityRef[];
}

export interface ActivationStateEventV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly activation_state_event_id: string;
  readonly activation_id: string;
  readonly tenant_id: string;
  readonly sequence: number;
  readonly from_state?: ActivationStateV1;
  readonly to_state: ActivationStateV1;
  readonly cause_digest: string;
  readonly observed_automation_lifecycle: "draft" | "enabled" | "disabled" | "archived";
  readonly resolution_context?: ActivationResolutionContextV1;
  readonly authority_context?: ActivationAuthorityContextV1;
  readonly handoff_ref?: EntityRef;
  readonly outcome_code?: string;
  readonly reason_code?: string;
  readonly occurred_at: number;
  readonly provenance_refs: readonly EntityRef[];
}

export interface ActivationClaimV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly claim_id: string;
  readonly activation_id: string;
  readonly tenant_id: string;
  readonly claimant_id: string;
  readonly fencing_token: number;
  readonly acquired_at: number;
  readonly expires_at: number;
}

export interface ActivationAttemptV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly attempt_id: string;
  readonly activation_id: string;
  readonly tenant_id: string;
  readonly attempt_sequence: number;
  readonly claim_id: string;
  readonly fencing_token: number;
  readonly status: ActivationAttemptStatusV1;
  readonly started_at: number;
  readonly finished_at?: number;
  readonly failure_code?: string;
}

/** Structural pre-admission handoff intent. Admission retains the decision. */
export interface ActivationAdmissionHandoffV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly handoff_id: string;
  readonly activation_id: string;
  readonly tenant_id: string;
  readonly status: ActivationHandoffStatusV1;
  readonly idempotency_scope: string;
  readonly idempotency_key: string;
  readonly request_fingerprint: string;
  readonly prepared_at: number;
  readonly correlation_id: string;
}

export class ActivationContractError extends Error {
  constructor(readonly code: "CAUSAL_IDENTITY_CONFLICT" | "INVALID_STATE_TRANSITION" | "STALE_FENCE" | "HANDOFF_NOT_PREPARED", message: string) {
    super(message);
    this.name = "ActivationContractError";
  }
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

function entityRef(value: unknown, path: string, issues: ValidationIssue[]): EntityRef | undefined {
  try { return validateEntityRef(value, path); }
  catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return undefined; }
}

function revisionRef(value: unknown, path: string, issues: ValidationIssue[]): RevisionRef | undefined {
  try { return validateRevisionRef(value, path); }
  catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return undefined; }
}

function automationRef(value: unknown, path: string, issues: ValidationIssue[]): AutomationRevisionRefV1 | undefined {
  try { return validateAutomationRevisionRefV1(value, path); }
  catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); return undefined; }
}

function entityList(value: unknown, path: string, issues: ValidationIssue[]): readonly EntityRef[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => entityRef(entry, `${path}[${index}]`, issues) ?? {} as EntityRef);
}

function mixedRefList(value: unknown, path: string, issues: ValidationIssue[]): readonly (EntityRef | RevisionRef)[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "INVALID_LIST", "An array is required"));
    return [];
  }
  return value.map((entry, index) => {
    const item = object(entry, `${path}[${index}]`, issues);
    return "entity_kind" in item
      ? revisionRef(item, `${path}[${index}]`, issues) ?? {} as RevisionRef
      : entityRef(item, `${path}[${index}]`, issues) ?? {} as EntityRef;
  });
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical).sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, canonical(entry)]));
  return value;
}

function validateSource(value: unknown, path: string, issues: ValidationIssue[]): ActivationSourceIdentityV1 | undefined {
  const source = object(value, path, issues) as Partial<ActivationSourceIdentityV1>;
  switch (source.kind) {
    case "event": {
      requireString(source.issuer, `${path}.issuer`, issues);
      requireString(source.namespace, `${path}.namespace`, issues);
      requireString(source.event_id, `${path}.event_id`, issues);
      requireSha256(source.payload_digest, `${path}.payload_digest`, issues);
      return source.issuer && source.namespace && source.event_id && source.payload_digest ? { kind: "event", issuer: source.issuer, namespace: source.namespace, event_id: source.event_id, payload_digest: source.payload_digest } : undefined;
    }
    case "channel": {
      const channel = entityRef(source.channel_ref, `${path}.channel_ref`, issues);
      const connection = entityRef(source.connection_ref, `${path}.connection_ref`, issues);
      requireString(source.delivery_id, `${path}.delivery_id`, issues);
      requireString(source.logical_event_id, `${path}.logical_event_id`, issues);
      requireSha256(source.payload_digest, `${path}.payload_digest`, issues);
      return channel && connection && source.delivery_id && source.logical_event_id && source.payload_digest ? { kind: "channel", channel_ref: channel, connection_ref: connection, delivery_id: source.delivery_id, logical_event_id: source.logical_event_id, payload_digest: source.payload_digest } : undefined;
    }
    case "schedule": {
      requireString(source.schedule_key, `${path}.schedule_key`, issues);
      requireSha256(source.schedule_digest, `${path}.schedule_digest`, issues);
      requireSafeInteger(source.intended_at, `${path}.intended_at`, issues, 0);
      requireString(source.timezone, `${path}.timezone`, issues);
      if (source.calendar_digest !== undefined) requireSha256(source.calendar_digest, `${path}.calendar_digest`, issues);
      return source.schedule_key && source.schedule_digest && source.intended_at !== undefined && source.timezone ? { kind: "schedule", schedule_key: source.schedule_key, schedule_digest: source.schedule_digest, intended_at: source.intended_at, timezone: source.timezone, ...(source.calendar_digest ? { calendar_digest: source.calendar_digest } : {}) } : undefined;
    }
    case "manual": {
      const actor = entityRef(source.actor_ref, `${path}.actor_ref`, issues);
      requireString(source.idempotency_key, `${path}.idempotency_key`, issues);
      requireSafeInteger(source.requested_at, `${path}.requested_at`, issues, 0);
      requireString(source.purpose, `${path}.purpose`, issues);
      return actor && source.idempotency_key && source.requested_at !== undefined && source.purpose ? { kind: "manual", actor_ref: actor, idempotency_key: source.idempotency_key, requested_at: source.requested_at, purpose: source.purpose } : undefined;
    }
    case "system": {
      requireString(source.system_id, `${path}.system_id`, issues);
      requireString(source.occurrence_key, `${path}.occurrence_key`, issues);
      requireString(source.purpose, `${path}.purpose`, issues);
      return source.system_id && source.occurrence_key && source.purpose ? { kind: "system", system_id: source.system_id, occurrence_key: source.occurrence_key, purpose: source.purpose } : undefined;
    }
    default:
      issues.push(issue(`${path}.kind`, "INVALID_ENUM", "Source kind must be event, channel, schedule, manual or system"));
      return undefined;
  }
}

export function fingerprintActivationCausalIdentityV1(input: Omit<ActivationCausalIdentityV1, "schema_version" | "activation_id">): string {
  return sha256Hex(stableStringify(canonical(input)));
}

export function createActivationCausalIdentityV1(input: Omit<ActivationCausalIdentityV1, "schema_version" | "activation_id">): ActivationCausalIdentityV1 {
  const fingerprint = fingerprintActivationCausalIdentityV1(input);
  return validateActivationCausalIdentityV1(freezeNative({ ...input, schema_version: ACS_NATIVE_SCHEMA_VERSION, activation_id: `activation:${fingerprint}` }));
}

export function validateActivationCausalIdentityV1(value: unknown): ActivationCausalIdentityV1 {
  const issues: ValidationIssue[] = [];
  const identity = object(value, "$", issues) as Partial<ActivationCausalIdentityV1>;
  if (identity.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  requireString(identity.tenant_id, "tenant_id", issues);
  const automation = automationRef(identity.automation_ref, "automation_ref", issues);
  const source = validateSource(identity.source, "source", issues);
  if (automation && identity.tenant_id !== automation.tenant_id) issues.push(issue("tenant_id", "TENANT_MISMATCH", "Activation and Automation revision must share Tenant"));
  if (identity.tenant_id && automation && source) {
    const expected = `activation:${fingerprintActivationCausalIdentityV1({ tenant_id: identity.tenant_id, automation_ref: automation, source })}`;
    if (identity.activation_id !== expected) issues.push(issue("activation_id", "CAUSAL_IDENTITY_MISMATCH", "activation_id must derive from Tenant, exact Automation revision and source identity"));
  } else requireString(identity.activation_id, "activation_id", issues);
  assertNoSecretMaterial(value);
  return freezeNative(assertValid({ ...identity, automation_ref: automation, source } as ActivationCausalIdentityV1, issues));
}

function validateResolutionContext(value: unknown, path: string, issues: ValidationIssue[]): ActivationResolutionContextV1 | undefined {
  const context = object(value, path, issues) as Partial<ActivationResolutionContextV1>;
  if (context.target_mode !== "PINNED" && context.target_mode !== "RESOLVED_AT_ACTIVATION") issues.push(issue(`${path}.target_mode`, "INVALID_ENUM", "Target mode must be PINNED or RESOLVED_AT_ACTIVATION"));
  const target = revisionRef(context.exact_target_ref, `${path}.exact_target_ref`, issues);
  const effective = context.effective_configuration_ref === undefined ? undefined : revisionRef(context.effective_configuration_ref, `${path}.effective_configuration_ref`, issues);
  const policy = context.resolution_policy_ref === undefined ? undefined : revisionRef(context.resolution_policy_ref, `${path}.resolution_policy_ref`, issues);
  if (context.target_mode === "PINNED" && policy) issues.push(issue(`${path}.resolution_policy_ref`, "FORBIDDEN_FOR_PINNED", "PINNED resolution does not carry a resolution policy reference"));
  if (context.target_mode === "RESOLVED_AT_ACTIVATION" && !policy) issues.push(issue(`${path}.resolution_policy_ref`, "REQUIRED_FOR_RESOLVED_TARGET", "RESOLVED_AT_ACTIVATION requires the deterministic policy reference"));
  return context.target_mode && target ? { target_mode: context.target_mode, exact_target_ref: target, ...(effective ? { effective_configuration_ref: effective } : {}), ...(policy ? { resolution_policy_ref: policy } : {}) } : undefined;
}

function validateAuthorityContext(value: unknown, path: string, issues: ValidationIssue[]): ActivationAuthorityContextV1 | undefined {
  const context = object(value, path, issues) as Partial<ActivationAuthorityContextV1>;
  return {
    governing_refs: mixedRefList(context.governing_refs, `${path}.governing_refs`, issues),
    delegation_requirement_refs: entityList(context.delegation_requirement_refs, `${path}.delegation_requirement_refs`, issues),
    policy_decision_refs: entityList(context.policy_decision_refs, `${path}.policy_decision_refs`, issues),
  };
}

function validateState(value: unknown, path: string, issues: ValidationIssue[]): ActivationStateV1 | undefined {
  const states: readonly ActivationStateV1[] = ["observed", "claimed", "resolving", "prepared", "handoff_pending", "admitted", "rejected", "cancelled", "expired", "skipped", "coalesced", "failed"];
  if (!states.includes(value as ActivationStateV1)) {
    issues.push(issue(path, "INVALID_ENUM", "Invalid Activation state"));
    return undefined;
  }
  return value as ActivationStateV1;
}

export function fingerprintActivationStateEventV1(event: Omit<ActivationStateEventV1, "schema_version">): string {
  return sha256Hex(stableStringify(canonical(event)));
}

export function validateActivationStateEventV1(value: unknown): ActivationStateEventV1 {
  const issues: ValidationIssue[] = [];
  const event = object(value, "$", issues) as Partial<ActivationStateEventV1>;
  if (event.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  requireString(event.activation_state_event_id, "activation_state_event_id", issues);
  requireString(event.activation_id, "activation_id", issues);
  requireString(event.tenant_id, "tenant_id", issues);
  requireSafeInteger(event.sequence, "sequence", issues, 1);
  const from = event.from_state === undefined ? undefined : validateState(event.from_state, "from_state", issues);
  const to = validateState(event.to_state, "to_state", issues);
  requireSha256(event.cause_digest, "cause_digest", issues);
  if (!["draft", "enabled", "disabled", "archived"].includes(event.observed_automation_lifecycle as string)) issues.push(issue("observed_automation_lifecycle", "INVALID_ENUM", "Invalid observed Automation lifecycle"));
  const resolution = event.resolution_context === undefined ? undefined : validateResolutionContext(event.resolution_context, "resolution_context", issues);
  const authority = event.authority_context === undefined ? undefined : validateAuthorityContext(event.authority_context, "authority_context", issues);
  const handoff = event.handoff_ref === undefined ? undefined : entityRef(event.handoff_ref, "handoff_ref", issues);
  if (event.outcome_code !== undefined) requireString(event.outcome_code, "outcome_code", issues);
  if (event.reason_code !== undefined) requireString(event.reason_code, "reason_code", issues);
  requireSafeInteger(event.occurred_at, "occurred_at", issues, 0);
  const provenance = entityList(event.provenance_refs, "provenance_refs", issues);
  if (event.sequence === 1 && (from !== undefined || to !== "observed")) issues.push(issue("sequence", "INVALID_INITIAL_STATE", "The first Activation state fact must be observed without a predecessor"));
  if (event.sequence > 1 && from === undefined) issues.push(issue("from_state", "REQUIRED_PREDECESSOR_STATE", "Later state facts require from_state"));
  assertNoSecretMaterial(value);
  return freezeNative(assertValid({ ...event, from_state: from, to_state: to, resolution_context: resolution, authority_context: authority, handoff_ref: handoff, provenance_refs: provenance } as ActivationStateEventV1, issues));
}

export function createActivationHeadV1(identity: ActivationCausalIdentityV1, initial: ActivationStateEventV1): ActivationHeadV1 {
  const validatedIdentity = validateActivationCausalIdentityV1(identity);
  const fact = validateActivationStateEventV1(initial);
  if (fact.activation_id !== validatedIdentity.activation_id || fact.tenant_id !== validatedIdentity.tenant_id || fact.sequence !== 1 || fact.to_state !== "observed") throw new NativeContractValidationError("invalid initial Activation state", [issue("initial", "INITIAL_STATE_MISMATCH", "Initial state must be observed for the exact Activation identity")]);
  return freezeNative({ schema_version: ACS_NATIVE_SCHEMA_VERSION, identity: validatedIdentity, current_state: fact.to_state, state_sequence: 1, current_state_fingerprint: fingerprintActivationStateEventV1(fact), created_at: fact.occurred_at, updated_at: fact.occurred_at });
}

function allowedTransition(from: ActivationStateV1, to: ActivationStateV1): boolean {
  return (from === "observed" && (to === "claimed" || to === "cancelled" || to === "expired" || to === "skipped" || to === "coalesced"))
    || (from === "claimed" && (to === "resolving" || to === "observed" || to === "cancelled" || to === "expired"))
    || (from === "resolving" && (to === "prepared" || to === "rejected" || to === "cancelled" || to === "expired" || to === "skipped" || to === "coalesced" || to === "failed"))
    || (from === "prepared" && (to === "handoff_pending" || to === "cancelled" || to === "expired" || to === "failed"))
    || (from === "handoff_pending" && (to === "admitted" || to === "rejected" || to === "failed"));
}

export function createActivationStateEventV1(input: Omit<ActivationStateEventV1, "schema_version" | "activation_id" | "tenant_id" | "sequence" | "from_state"> & { readonly head: ActivationHeadV1 }): ActivationStateEventV1 {
  const { head, to_state, ...content } = input;
  const current = head.current_state;
  if (!allowedTransition(current, to_state)) throw new ActivationContractError("INVALID_STATE_TRANSITION", `Activation cannot transition from ${current} to ${to_state}`);
  return validateActivationStateEventV1(freezeNative({ ...content, schema_version: ACS_NATIVE_SCHEMA_VERSION, activation_id: head.identity.activation_id, tenant_id: head.identity.tenant_id, sequence: head.state_sequence + 1, from_state: current, to_state }));
}

export function applyActivationStateEventV1(head: ActivationHeadV1, event: ActivationStateEventV1): ActivationHeadV1 {
  const fact = validateActivationStateEventV1(event);
  if (head.identity.activation_id !== fact.activation_id || head.identity.tenant_id !== fact.tenant_id || head.current_state !== fact.from_state || fact.sequence !== head.state_sequence + 1 || !allowedTransition(head.current_state, fact.to_state)) throw new ActivationContractError("INVALID_STATE_TRANSITION", "Activation state fact does not advance the exact current head");
  return freezeNative({ ...head, current_state: fact.to_state, state_sequence: fact.sequence, current_state_fingerprint: fingerprintActivationStateEventV1(fact), updated_at: fact.occurred_at });
}

export function validateActivationClaimV1(value: unknown): ActivationClaimV1 {
  const issues: ValidationIssue[] = [];
  const claim = object(value, "$", issues) as Partial<ActivationClaimV1>;
  if (claim.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  for (const key of ["claim_id", "activation_id", "tenant_id", "claimant_id"] as const) requireString(claim[key], key, issues);
  requireSafeInteger(claim.fencing_token, "fencing_token", issues, 1);
  requireSafeInteger(claim.acquired_at, "acquired_at", issues, 0);
  requireSafeInteger(claim.expires_at, "expires_at", issues, 1);
  if (typeof claim.acquired_at === "number" && typeof claim.expires_at === "number" && claim.expires_at <= claim.acquired_at) issues.push(issue("expires_at", "INVALID_LEASE_WINDOW", "Claim expiry must be after acquisition"));
  assertNoSecretMaterial(value);
  return freezeNative(assertValid(claim as ActivationClaimV1, issues));
}

export function assertActivationClaimFencingV1(claim: ActivationClaimV1, activationId: string, tenantId: string, fencingToken: number, at: number): ActivationClaimV1 {
  const validated = validateActivationClaimV1(claim);
  if (validated.activation_id !== activationId || validated.tenant_id !== tenantId || validated.fencing_token !== fencingToken || at >= validated.expires_at) throw new ActivationContractError("STALE_FENCE", "Activation claim is stale, expired or belongs to another Activation");
  return validated;
}

export function validateActivationAttemptV1(value: unknown): ActivationAttemptV1 {
  const issues: ValidationIssue[] = [];
  const attempt = object(value, "$", issues) as Partial<ActivationAttemptV1>;
  if (attempt.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  for (const key of ["attempt_id", "activation_id", "tenant_id", "claim_id"] as const) requireString(attempt[key], key, issues);
  requireSafeInteger(attempt.attempt_sequence, "attempt_sequence", issues, 1);
  requireSafeInteger(attempt.fencing_token, "fencing_token", issues, 1);
  if (!["claimed", "released", "expired", "completed", "failed", "superseded"].includes(attempt.status as string)) issues.push(issue("status", "INVALID_ENUM", "Invalid Activation attempt status"));
  requireSafeInteger(attempt.started_at, "started_at", issues, 0);
  if (attempt.finished_at !== undefined) requireSafeInteger(attempt.finished_at, "finished_at", issues, 0);
  if (typeof attempt.started_at === "number" && typeof attempt.finished_at === "number" && attempt.finished_at < attempt.started_at) issues.push(issue("finished_at", "INVALID_ATTEMPT_WINDOW", "Attempt completion cannot precede start"));
  if (attempt.failure_code !== undefined) requireString(attempt.failure_code, "failure_code", issues);
  assertNoSecretMaterial(value);
  return freezeNative(assertValid(attempt as ActivationAttemptV1, issues));
}

export function validateActivationAdmissionHandoffV1(value: unknown): ActivationAdmissionHandoffV1 {
  const issues: ValidationIssue[] = [];
  const handoff = object(value, "$", issues) as Partial<ActivationAdmissionHandoffV1>;
  if (handoff.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push(issue("schema_version", "UNSUPPORTED_SCHEMA_VERSION", "Unsupported native schema version"));
  for (const key of ["handoff_id", "activation_id", "tenant_id", "idempotency_scope", "idempotency_key", "correlation_id"] as const) requireString(handoff[key], key, issues);
  if (!["prepared", "submitted", "unknown", "reconciled"].includes(handoff.status as string)) issues.push(issue("status", "INVALID_ENUM", "Invalid handoff status"));
  requireSha256(handoff.request_fingerprint, "request_fingerprint", issues);
  requireSafeInteger(handoff.prepared_at, "prepared_at", issues, 0);
  assertNoSecretMaterial(value);
  return freezeNative(assertValid(handoff as ActivationAdmissionHandoffV1, issues));
}

export function assertActivationHandoffPreparedV1(head: ActivationHeadV1, handoff: ActivationAdmissionHandoffV1): ActivationAdmissionHandoffV1 {
  const validated = validateActivationAdmissionHandoffV1(handoff);
  if (head.identity.activation_id !== validated.activation_id || head.identity.tenant_id !== validated.tenant_id || head.current_state !== "prepared" || validated.status !== "prepared") throw new ActivationContractError("HANDOFF_NOT_PREPARED", "Activation handoff requires a prepared Activation and a prepared handoff intent");
  return validated;
}
