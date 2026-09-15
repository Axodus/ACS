import {
  assertNoSecretMaterial,
  assertValid,
  freezeNative,
  requireSafeInteger,
  requireSha256,
  requireString,
  sha256Hex,
  stableStringify,
  type ValidationIssue,
} from "./primitives.js";
import type { AutomationRevisionRefV1 } from "./automation.js";

export type ScheduleMissedWorkPolicyV1 = "SKIP" | "COALESCE" | "CATCH_UP";

export interface ScheduleDefinitionV1 {
  readonly definition_key: string;
  readonly specification: { readonly kind: string; readonly version: string; readonly normalized: Readonly<Record<string, unknown>>; readonly digest: string };
  readonly time_basis: { readonly timezone: string; readonly timezone_rules_version: string; readonly ambiguous_local_time: "REJECT" | "EARLIER" | "LATER"; readonly nonexistent_local_time: "REJECT" | "NEXT_VALID" };
  readonly missed_work: { readonly policy: ScheduleMissedWorkPolicyV1; readonly max_occurrences_per_recovery: number; readonly max_lookback_ms: number };
  readonly semantic_digest: string;
}

export class ScheduleContractError extends Error {
  constructor(readonly code: "SCHEDULE_FORMAT_UNAVAILABLE" | "SCHEDULE_VERSION_UNAVAILABLE" | "SCHEDULE_RECOVERY_BOUND_INVALID" | "SCHEDULE_EVALUATION_INVALID", message: string) {
    super(message);
    this.name = "ScheduleContractError";
  }
}

function issue(path: string, code: string, message: string): ValidationIssue { return { path, code, message }; }
function object(value: unknown, path: string, issues: ValidationIssue[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) { issues.push(issue(path, "INVALID_OBJECT", "An object is required")); return {}; }
  return value as Record<string, unknown>;
}

export function normalizeScheduleTimeZoneV1(timezone: string): string {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: timezone }).resolvedOptions().timeZone; }
  catch { throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", `Unsupported IANA timezone: ${timezone}`); }
}

export function createScheduleDefinitionV1(input: Omit<ScheduleDefinitionV1, "semantic_digest">): ScheduleDefinitionV1 {
  const normalized = { ...input, time_basis: { ...input.time_basis, timezone: normalizeScheduleTimeZoneV1(input.time_basis.timezone) } };
  const semantic_digest = sha256Hex(stableStringify(normalized));
  return validateScheduleDefinitionV1({ ...normalized, semantic_digest });
}

export function validateScheduleDefinitionV1(value: unknown): ScheduleDefinitionV1 {
  const issues: ValidationIssue[] = [];
  const definition = object(value, "$", issues);
  requireString(definition.definition_key, "definition_key", issues);
  const specification = object(definition.specification, "specification", issues);
  requireString(specification.kind, "specification.kind", issues);
  requireString(specification.version, "specification.version", issues);
  const normalized = object(specification.normalized, "specification.normalized", issues);
  requireSha256(specification.digest, "specification.digest", issues);
  const time = object(definition.time_basis, "time_basis", issues);
  requireString(time.timezone, "time_basis.timezone", issues);
  requireString(time.timezone_rules_version, "time_basis.timezone_rules_version", issues);
  if (time.ambiguous_local_time !== "REJECT" && time.ambiguous_local_time !== "EARLIER" && time.ambiguous_local_time !== "LATER") issues.push(issue("time_basis.ambiguous_local_time", "INVALID_ENUM", "An explicit ambiguous-local-time policy is required"));
  if (time.nonexistent_local_time !== "REJECT" && time.nonexistent_local_time !== "NEXT_VALID") issues.push(issue("time_basis.nonexistent_local_time", "INVALID_ENUM", "An explicit nonexistent-local-time policy is required"));
  const missed = object(definition.missed_work, "missed_work", issues);
  if (missed.policy !== "SKIP" && missed.policy !== "COALESCE" && missed.policy !== "CATCH_UP") issues.push(issue("missed_work.policy", "INVALID_ENUM", "Missed-work policy must be SKIP, COALESCE or CATCH_UP"));
  requireSafeInteger(missed.max_occurrences_per_recovery, "missed_work.max_occurrences_per_recovery", issues, 1);
  requireSafeInteger(missed.max_lookback_ms, "missed_work.max_lookback_ms", issues, 1);
  requireSha256(definition.semantic_digest, "semantic_digest", issues);
  let timezone = "";
  if (typeof time.timezone === "string") try { timezone = normalizeScheduleTimeZoneV1(time.timezone); } catch (error) { issues.push(issue("time_basis.timezone", "UNSUPPORTED_TIMEZONE", error instanceof Error ? error.message : "Unsupported timezone")); }
  const candidate = {
    definition_key: definition.definition_key,
    specification: { kind: specification.kind, version: specification.version, normalized, digest: specification.digest },
    time_basis: { timezone, timezone_rules_version: time.timezone_rules_version, ambiguous_local_time: time.ambiguous_local_time, nonexistent_local_time: time.nonexistent_local_time },
    missed_work: { policy: missed.policy, max_occurrences_per_recovery: missed.max_occurrences_per_recovery, max_lookback_ms: missed.max_lookback_ms },
  };
  if (issues.length === 0 && definition.semantic_digest !== sha256Hex(stableStringify(candidate))) issues.push(issue("semantic_digest", "SEMANTIC_DIGEST_MISMATCH", "Schedule semantic digest must derive from the normalized governed definition"));
  assertNoSecretMaterial(value);
  return freezeNative(assertValid({ ...candidate, semantic_digest: definition.semantic_digest } as ScheduleDefinitionV1, issues));
}

export interface ScheduleOccurrenceV1 {
  readonly occurrence_id: string;
  readonly tenant_id: string;
  readonly automation_ref: AutomationRevisionRefV1;
  readonly schedule_key: string;
  readonly schedule_digest: string;
  readonly timezone: string;
  readonly kind: "SLOT" | "COALESCED_INTERVAL";
  readonly slot_at?: number;
  readonly interval_from_exclusive?: number;
  readonly interval_through?: number;
}

export function createScheduleOccurrenceV1(input: Omit<ScheduleOccurrenceV1, "occurrence_id">): ScheduleOccurrenceV1 {
  const identity = { ...input };
  if (identity.tenant_id !== identity.automation_ref.tenant_id) throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", "Schedule occurrence and Automation revision must share Tenant");
  if (identity.kind === "SLOT") {
    if (!Number.isSafeInteger(identity.slot_at) || identity.slot_at! < 0 || identity.interval_from_exclusive !== undefined || identity.interval_through !== undefined) throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", "A slot occurrence requires exactly one logical slot");
  } else if (!Number.isSafeInteger(identity.interval_from_exclusive) || !Number.isSafeInteger(identity.interval_through) || identity.interval_through! <= identity.interval_from_exclusive! || identity.slot_at !== undefined) {
    throw new ScheduleContractError("SCHEDULE_EVALUATION_INVALID", "A coalesced occurrence requires one non-empty logical interval");
  }
  const occurrence_id = `schedule-occurrence:${sha256Hex(stableStringify(identity))}`;
  return freezeNative({ ...identity, occurrence_id });
}
