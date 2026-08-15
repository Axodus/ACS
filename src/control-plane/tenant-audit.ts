import type { AuditEvent } from "./audit-service.js";

export type AdministrativeAuditCategory =
  | "tenant.lifecycle"
  | "tenant.membership"
  | "tenant.ownership"
  | "tenant.governance"
  | "tenant.entitlement"
  | "tenant.limit"
  | "tenant.enforcement"
  | "tenant.unknown";

export type AdministrativeAuditOutcome = "succeeded" | "denied" | "failed" | "allowed";

export interface TenantAdministrativeAuditEntry {
  readonly eventId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly category: AdministrativeAuditCategory;
  readonly eventType: string;
  readonly action: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly actor?: string;
  readonly authorityBasis?: string;
  readonly authorityKind?: string;
  readonly authorityPrincipalId?: string;
  readonly deniedLayer?: string;
  readonly previousState?: string;
  readonly nextState?: string;
  readonly governanceDecision?: string;
  readonly entitlementDecision?: string;
  readonly limitDecision?: string;
  readonly outcome: AdministrativeAuditOutcome;
  readonly reason?: string;
  readonly timestamp: number;
  readonly revision?: number;
  readonly summary: string;
}

export interface TenantAdministrativeAuditFilter {
  readonly category?: AdministrativeAuditCategory;
  readonly outcome?: AdministrativeAuditOutcome;
  readonly actor?: string;
  readonly correlationId?: string;
  readonly eventType?: string;
}

const ADMIN_CATEGORIES = new Set<AdministrativeAuditCategory>([
  "tenant.lifecycle",
  "tenant.membership",
  "tenant.ownership",
  "tenant.governance",
  "tenant.entitlement",
  "tenant.limit",
  "tenant.enforcement",
]);

export function classifyAdministrativeAuditCategory(eventType: string): AdministrativeAuditCategory {
  const category = eventType.startsWith("tenant.") ? (eventType.slice(0, eventType.indexOf(".", 7) > 0 ? eventType.indexOf(".", 7) : eventType.length) as AdministrativeAuditCategory) : "tenant.unknown";
  return ADMIN_CATEGORIES.has(category) ? category : "tenant.unknown";
}

export function deriveAdministrativeAuditOutcome(event: Pick<AuditEvent, "decision" | "result">): AdministrativeAuditOutcome {
  if (event.decision === "allowed" || event.result === "success") return "succeeded";
  if (event.decision === "denied") return "denied";
  if (event.result === "failure" || event.decision === "failed") return "failed";
  return "allowed";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pickText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return undefined;
}

function stringifyAction(value: unknown, fallback: string): string {
  const text = pickText(value);
  return text ?? fallback;
}

export function projectAdministrativeAuditEntry(event: AuditEvent): TenantAdministrativeAuditEntry {
  const metadata = event.metadata ?? {};
  const category = classifyAdministrativeAuditCategory(event.eventType);
  const action = stringifyAction(metadata.operation ?? metadata.action ?? event.eventType, event.eventType);
  const targetType = stringValue(metadata.targetType);
  const targetId = stringValue(metadata.targetId);
  const reason = stringValue(metadata.reason);
  const authorityBasis = stringValue(metadata.authorityBasis);
  const authorityKind = stringValue(metadata.authorityKind);
  const authorityPrincipalId = stringValue(metadata.authorityPrincipalId);
  const deniedLayer = stringValue(metadata.deniedLayer);
  const previousState = stringValue(metadata.previousState);
  const nextState = stringValue(metadata.nextState);
  const governanceDecision = stringValue(metadata.governanceDecision);
  const entitlementDecision = stringValue(metadata.entitlementDecision);
  const limitDecision = stringValue(metadata.limitDecision);
  const outcome = deriveAdministrativeAuditOutcome(event);
  const summaryParts = [
    category,
    action,
    outcome,
    targetType && targetId ? targetType + ":" + targetId : undefined,
    reason ? "reason=" + reason : undefined,
  ].filter((part): part is string => Boolean(part));

  return {
    eventId: event.eventId,
    correlationId: event.correlationId,
    tenantId: event.tenantId ?? String(metadata.tenantId ?? "unknown"),
    category,
    eventType: event.eventType,
    action,
    targetType,
    targetId,
    actor: event.actor,
    authorityBasis,
    authorityKind,
    authorityPrincipalId,
    deniedLayer,
    previousState,
    nextState,
    governanceDecision,
    entitlementDecision,
    limitDecision,
    outcome,
    reason,
    timestamp: event.timestamp,
    revision: event.revision,
    summary: summaryParts.join(" · "),
  };
}

export function projectAdministrativeAuditEntries(events: readonly AuditEvent[], filter: TenantAdministrativeAuditFilter = {}): readonly TenantAdministrativeAuditEntry[] {
  return events
    .map(projectAdministrativeAuditEntry)
    .filter((entry) => {
      if (filter.category && entry.category !== filter.category) return false;
      if (filter.outcome && entry.outcome !== filter.outcome) return false;
      if (filter.actor && entry.actor !== filter.actor) return false;
      if (filter.correlationId && entry.correlationId !== filter.correlationId) return false;
      if (filter.eventType && entry.eventType !== filter.eventType) return false;
      return true;
    })
    .sort((left, right) => right.timestamp - left.timestamp || right.eventId.localeCompare(left.eventId));
}
