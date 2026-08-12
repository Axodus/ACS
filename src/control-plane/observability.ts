import type { AuditEntry, DiagnosticReport, EntityReference, EvidenceGuardrails, EvidenceRecord, EventSeverity, EvidenceKind, EventSummary, EventSource, LogAvailability } from "./operational-evidence-service.js";

// --- Observability types ---

export type CorrelationSource =
  | "control_plane_assertion"
  | "runtime_observation"
  | "external_execution_target"
  | "audit_entry"
  | "evidence_record"
  | "diagnostic_report"
  | "log_summary"
  | "event_summary"
  | "manual_caveat";

export type CorrelationAvailability = "available" | "partial" | "planned" | "unavailable" | "unknown";

export interface CorrelationModelItem {
  readonly dimension: string;
  readonly label: string;
  readonly source: CorrelationSource;
  readonly availability: CorrelationAvailability;
  readonly evidence: readonly string[];
}

export type EvidenceSourceType =
  | "control_plane_assertion"
  | "product_api_projection"
  | "runtime_observation"
  | "worker_signal"
  | "audit_entry"
  | "diagnostic"
  | "log_summary"
  | "event_summary"
  | "evidence_record"
  | "economic_evidence"
  | "browser_evidence"
  | "manual_caveat";

export type EvidenceAuthorityLevel = "authoritative" | "observed" | "derived" | "reported" | "manual" | "unknown";

export type EvidencePersistenceType =
  | "durable"
  | "ephemeral"
  | "computed"
  | "seeded"
  | "mocked"
  | "read_only_projection"
  | "external_observed"
  | "unknown";

export type EvidenceFreshness = "live" | "cached" | "stale" | "unknown";

export interface EvidenceSourceItem {
  readonly name: string;
  readonly type: EvidenceSourceType;
  readonly domain: string;
  readonly authorityLevel: EvidenceAuthorityLevel;
  readonly persistenceType: EvidencePersistenceType;
  readonly freshness: EvidenceFreshness;
  readonly retentionAssumption: string;
  readonly secretExposureRisk: "none" | "redacted" | "mitigated" | "unknown";
  readonly correlationCapability: CorrelationAvailability;
  readonly supportsReadinessClaim: boolean;
  readonly caveats: readonly string[];
  readonly deferredImprovements: readonly string[];
}

export type DiagnosticCategory =
  | "readiness"
  | "governance"
  | "access"
  | "environment"
  | "persistence"
  | "secrets"
  | "operation"
  | "runtime"
  | "worker"
  | "deployment"
  | "execution_run"
  | "evidence"
  | "economics"
  | "browser_acceptance"
  | "system";

export interface DiagnosticTimelineItem {
  readonly itemId: string;
  readonly timestamp: string;
  readonly severity: "critical" | "high" | "medium" | "low" | "info";
  readonly category: DiagnosticCategory;
  readonly domain: string;
  readonly component: string;
  readonly message: string;
  readonly relatedEntities: readonly EntityReference[];
  readonly correlationRefs: readonly string[];
  readonly source: string;
  readonly actionability: "actionable" | "informational" | "deferred" | "unknown";
  readonly caveats: readonly string[];
  readonly noSecretStatus: boolean;
}

export interface ObservabilityFinding {
  readonly code: string;
  readonly severity: "critical" | "high" | "medium" | "low" | "info";
  readonly message: string;
  readonly responsibleDomain: string;
  readonly dependsOnFutureMilestone?: string;
  readonly evidence?: string;
}

export type ObservabilityDepthStatus = "supported" | "partial" | "projected" | "unavailable" | "deferred" | "out_of_scope";

export interface ObservabilityDepthItem {
  readonly dimension: string;
  readonly label: string;
  readonly status: ObservabilityDepthStatus;
  readonly reason: string;
  readonly evidence: readonly string[];
}

export interface HealthIndicatorItem {
  readonly name: string;
  readonly description: string;
  readonly state: "healthy" | "degraded" | "unavailable" | "unknown";
  readonly confidence: "high" | "medium" | "low" | "unknown";
  readonly evidence: readonly string[];
}

export interface DiagnosticSummaryItem {
  readonly diagnosticId: string;
  readonly status: "ready" | "partial" | "blocked" | "error";
  readonly summary: string;
  readonly severity: "critical" | "high" | "medium" | "low" | "info";
  readonly source: string;
  readonly correlationRefs: readonly string[];
  readonly noSecretStatus: boolean;
}

export interface ObservabilityReport {
  readonly checkedAt: string;
  readonly observabilityReady: false;
  readonly productionReady: false;
  readonly claim: "not_claimed";
  readonly summary: {
    readonly correlationModelItems: number;
    readonly evidenceSources: number;
    readonly timelineItems: number;
    readonly unsupportedSignals: number;
    readonly deferredSignals: number;
    readonly criticalFindings: number;
    readonly warnings: number;
  };
  readonly correlationModel: readonly CorrelationModelItem[];
  readonly evidenceSources: readonly EvidenceSourceItem[];
  readonly diagnosticTimeline: readonly DiagnosticTimelineItem[];
  readonly healthDiagnosticsCorrelation: {
    readonly healthIndicators: readonly HealthIndicatorItem[];
    readonly diagnosticSummaries: readonly DiagnosticSummaryItem[];
    readonly logAvailability: LogAvailability;
    readonly auditAvailability: "available" | "partial" | "unavailable";
    readonly correlationStatus: "available" | "partial" | "unavailable" | "planned";
    readonly caveats: readonly string[];
  };
  readonly observabilityDepth: readonly ObservabilityDepthItem[];
  readonly unsupportedSignals: readonly ObservabilityFinding[];
  readonly blockers: readonly ObservabilityFinding[];
  readonly warnings: readonly ObservabilityFinding[];
  readonly caveats: readonly ObservabilityFinding[];
  readonly deferredItems: readonly ObservabilityFinding[];
  readonly readinessGateDependencies: readonly string[];
  readonly sourceEvidence: readonly string[];
  readonly claimDiscipline: {
    readonly productionReadyClaimAllowed: false;
    readonly observabilityReadyClaimAllowed: false;
    readonly sloSlaClaimAllowed: false;
    readonly incidentPlatformClaimAllowed: false;
    readonly reason: string;
  };
}

export interface ObservabilitySignals {
  readonly events: readonly EventSummary[];
  readonly auditEntries: readonly AuditEntry[];
  readonly evidence: readonly EvidenceRecord[];
  readonly diagnostics: readonly DiagnosticReport[];
  readonly logAvailability: LogAvailability;
}

const OPERATIONAL_GUARDRAILS: EvidenceGuardrails = {
  inspectionMode: true,
  sandboxOnly: true,
  readOnly: true,
  productionReady: false,
  sourceOfTruth: "product-api",
  noSecretLeakage: true,
  notBilling: true,
};

const DIAGNOSTIC_CATEGORIES: readonly { category: DiagnosticCategory; label: string }[] = [
  { category: "readiness", label: "Readiness" },
  { category: "governance", label: "Governance" },
  { category: "access", label: "Access control" },
  { category: "environment", label: "Environment" },
  { category: "persistence", label: "Persistence" },
  { category: "secrets", label: "Secrets" },
  { category: "operation", label: "Operations" },
  { category: "runtime", label: "Runtime" },
  { category: "worker", label: "Worker" },
  { category: "deployment", label: "Deployment" },
  { category: "execution_run", label: "Execution run" },
  { category: "evidence", label: "Evidence" },
  { category: "economics", label: "Economics" },
  { category: "browser_acceptance", label: "Browser acceptance" },
  { category: "system", label: "System" },
];

const OBSERVABILITY_DEPTH: readonly {
  dimension: string;
  label: string;
  status: ObservabilityDepthStatus;
  reason: string;
  evidence: readonly string[];
}[] = [
  {
    dimension: "logs",
    label: "Logs",
    status: "unavailable",
    reason: "Raw log access is not exposed through the Product API; audit events and evidence summaries are available instead.",
    evidence: ["src/control-plane/operational-evidence-service.ts"],
  },
  {
    dimension: "diagnostics",
    label: "Diagnostics",
    status: "supported",
    reason: "Diagnostics are derived from audit events with findings; supported when audit service is available.",
    evidence: ["src/control-plane/operational-evidence-service.ts"],
  },
  {
    dimension: "health",
    label: "Health",
    status: "projected",
    reason: "Health indicators are projected from runtime/worker confidence and system guardrails; live probing is not implemented in this milestone.",
    evidence: ["src/control-plane/operational-reliability.ts"],
  },
  {
    dimension: "audit",
    label: "Audit",
    status: "supported",
    reason: "Audit entries are available through the OperationalEvidenceService when an audit service is configured.",
    evidence: ["src/control-plane/operational-evidence-service.ts", "src/control-plane/audit-service.ts"],
  },
  {
    dimension: "evidence",
    label: "Evidence",
    status: "supported",
    reason: "Evidence records are derived from audit events with findings; supported when audit service is available.",
    evidence: ["src/control-plane/operational-evidence-service.ts"],
  },
  {
    dimension: "traces",
    label: "Traces",
    status: "deferred",
    reason: "Distributed tracing backend is deferred to EPIC-13+.",
    evidence: ["docs/epics/epic-12/EPIC-12_Executive_Plan.md"],
  },
  {
    dimension: "alerts",
    label: "Alerts",
    status: "deferred",
    reason: "Alert automation platform is deferred to EPIC-13+.",
    evidence: ["docs/epics/epic-12/EPIC-12_Executive_Plan.md"],
  },
  {
    dimension: "thresholds",
    label: "Thresholds",
    status: "unavailable",
    reason: "Automated threshold monitoring is not implemented in this milestone.",
    evidence: ["docs/epics/epic-12/EPIC-12_Executive_Plan.md"],
  },
  {
    dimension: "incident_views",
    label: "Incident-oriented views",
    status: "deferred",
    reason: "Full incident management platform is deferred to EPIC-13+.",
    evidence: ["docs/epics/epic-12/EPIC-12_Executive_Plan.md"],
  },
  {
    dimension: "retention",
    label: "Retention",
    status: "unavailable",
    reason: "No explicit log/evidence retention policy is enforced beyond in-memory session scope.",
    evidence: ["src/control-plane/operational-evidence-service.ts"],
  },
  {
    dimension: "correlation_ids",
    label: "Correlation IDs",
    status: "partial",
    reason: "Correlation IDs are carried on audit events and evidence records where present, but are not guaranteed to be stable or universally present.",
    evidence: ["src/control-plane/audit-service.ts", "src/control-plane/operational-evidence-service.ts"],
  },
];

function categoryFromEvidenceKind(kind: EvidenceKind): DiagnosticCategory {
  switch (kind) {
    case "readiness": return "readiness";
    case "deployment": return "deployment";
    case "runtime": return "runtime";
    case "worker": return "worker";
    case "execution-run": return "execution_run";
    case "policy": return "governance";
    case "sandbox": return "environment";
    case "isolation": return "environment";
    case "credential": return "secrets";
    case "economic": return "economics";
    default: return "system";
  }
}

function categoryFromEventSource(source: EventSource): DiagnosticCategory {
  switch (source) {
    case "agent": return "system";
    case "deployment": return "deployment";
    case "runtime": return "runtime";
    case "worker": return "worker";
    case "execution-run": return "execution_run";
    case "economic": return "economics";
    case "audit": return "system";
    case "system": return "system";
    default: return "system";
  }
}

function severityFromAuditStatus(status: AuditEntry["status"]): "critical" | "high" | "medium" | "low" | "info" {
  return status === "failure" ? "high" : status === "pending" ? "info" : "low";
}

function severityFromEventSeverity(severity: EventSeverity): "critical" | "high" | "medium" | "low" | "info" {
  return severity === "error" ? "high" : severity === "warning" ? "medium" : severity <= "debug" ? "low" : "low";
}

export function createObservabilityReport(
  signals: ObservabilitySignals,
): ObservabilityReport {
  const checkedAt = new Date().toISOString();
  const events = signals.events ?? [];
  const auditEntries = signals.auditEntries ?? [];
  const evidence = signals.evidence ?? [];
  const diagnostics = signals.diagnostics ?? [];
  const logAvailability = signals.logAvailability;

  const auditAvailable = auditEntries.length > 0 || events.length > 0;

  // --- Correlation model ---
  const correlationModel: CorrelationModelItem[] = [
    {
      dimension: "actor",
      label: "Actor",
      source: auditAvailable ? "audit_entry" : "manual_caveat",
      availability: auditAvailable ? "available" : "planned",
      evidence: ["src/control-plane/audit-service.ts"],
    },
    {
      dimension: "request",
      label: "Request",
      source: "control_plane_assertion",
      availability: "partial",
      evidence: ["src/control-plane/audit-service.ts"],
    },
    {
      dimension: "entity",
      label: "Entity reference",
      source: auditAvailable ? "evidence_record" : "manual_caveat",
      availability: auditAvailable ? "available" : "planned",
      evidence: ["src/control-plane/operational-evidence-service.ts"],
    },
    {
      dimension: "operation",
      label: "Operation",
      source: "control_plane_assertion",
      availability: "partial",
      evidence: ["src/control-plane/operational-reliability.ts"],
    },
    {
      dimension: "result",
      label: "Result",
      source: auditAvailable ? "audit_entry" : "manual_caveat",
      availability: auditAvailable ? "available" : "planned",
      evidence: ["src/control-plane/operational-evidence-service.ts"],
    },
    {
      dimension: "time",
      label: "Time",
      source: "control_plane_assertion",
      availability: "available",
      evidence: ["src/control-plane/operational-evidence-service.ts"],
    },
  ];

  // --- Evidence source inventory ---
  const evidenceSources: EvidenceSourceItem[] = [
    {
      name: "runtime confidence",
      type: "runtime_observation",
      domain: "runtime-confidence",
      authorityLevel: "observed",
      persistenceType: "computed",
      freshness: "live",
      retentionAssumption: "session-scoped in-memory; not persisted across restarts",
      secretExposureRisk: "none",
      correlationCapability: "partial",
      supportsReadinessClaim: false,
      caveats: ["Runtime confidence is a control-plane lifecycle assertion; engine-level observation is not proven."],
      deferredImprovements: ["live runtime observation"],
    },
    {
      name: "worker confidence",
      type: "worker_signal",
      domain: "worker-confidence",
      authorityLevel: "observed",
      persistenceType: "ephemeral",
      freshness: "stale",
      retentionAssumption: "registry heartbeat-based; stale workers are flagged",
      secretExposureRisk: "none",
      correlationCapability: "partial",
      supportsReadinessClaim: false,
      caveats: ["Worker confidence is a local registry observation; production fleet readiness is not claimed."],
      deferredImprovements: ["worker fleet observation"],
    },
    {
      name: "operational evidence",
      type: "evidence_record",
      domain: "operational-evidence",
      authorityLevel: "derived",
      persistenceType: "read_only_projection",
      freshness: "unknown",
      retentionAssumption: "derived from audit service; retention not configured",
      secretExposureRisk: "mitigated",
      correlationCapability: "partial",
      supportsReadinessClaim: true,
      caveats: ["Evidence records are derived from audit events; retention and completeness are not guaranteed."],
      deferredImprovements: ["log retention platform", "audit correlation depth"],
    },
    {
      name: "audit entries",
      type: "audit_entry",
      domain: "audit",
      authorityLevel: auditAvailable ? "authoritative" : "unknown",
      persistenceType: auditAvailable ? "durable" : "unknown",
      freshness: auditAvailable ? "live" : "unknown",
      retentionAssumption: "session-scoped unless audit service is configured",
      secretExposureRisk: "mitigated",
      correlationCapability: auditAvailable ? "available" : "unavailable",
      supportsReadinessClaim: true,
      caveats: ["No audit service is configured in this projection."],
      deferredImprovements: [],
    },
    {
      name: "diagnostics",
      type: "diagnostic",
      domain: "diagnostics",
      authorityLevel: "derived",
      persistenceType: "computed",
      freshness: "live",
      retentionAssumption: "computed from audit on demand",
      secretExposureRisk: "mitigated",
      correlationCapability: auditAvailable ? "available" : "unavailable",
      supportsReadinessClaim: true,
      caveats: ["Diagnostics are derived from audit events with findings; support is contingent on audit service availability."],
      deferredImprovements: [],
    },
    {
      name: "browser acceptance evidence",
      type: "browser_evidence",
      domain: "browser-acceptance",
      authorityLevel: "reported",
      persistenceType: "ephemeral",
      freshness: "stale",
      retentionAssumption: "browser harness artifacts are temporary; M03 formalizes browser acceptance",
      secretExposureRisk: "none",
      correlationCapability: "unavailable",
      supportsReadinessClaim: false,
      caveats: ["Browser visual acceptance remains pending for M03.", "Browser evidence is not correlated through correlation IDs in this milestone."],
      deferredImprovements: ["browser acceptance harness", "visual evidence correlation"],
    },
    {
      name: "economic evidence",
      type: "economic_evidence",
      domain: "economics",
      authorityLevel: "derived",
      persistenceType: "read_only_projection",
      freshness: "unknown",
      retentionAssumption: "projection from economics service; not settled billing",
      secretExposureRisk: "mitigated",
      correlationCapability: "partial",
      supportsReadinessClaim: false,
      caveats: ["Economics is operational evidence; billing, invoices, and payment rails are not claimed."],
      deferredImprovements: ["billing boundary proof"],
    },
    {
      name: "control-plane projections",
      type: "product_api_projection",
      domain: "system",
      authorityLevel: "authoritative",
      persistenceType: "computed",
      freshness: "live",
      retentionAssumption: "computed on demand from control-plane state",
      secretExposureRisk: "mitigated",
      correlationCapability: "partial",
      supportsReadinessClaim: true,
      caveats: ["Projections are computed on demand and reflect control-plane state, not runtime execution."],
      deferredImprovements: [],
    },
    {
      name: "manual caveats",
      type: "manual_caveat",
      domain: "governance",
      authorityLevel: "manual",
      persistenceType: "computed",
      freshness: "stale",
      retentionAssumption: "documented in EPIC-12 plans; not runtime evidence",
      secretExposureRisk: "none",
      correlationCapability: "unavailable",
      supportsReadinessClaim: false,
      caveats: ["Governance data is manually curated from EPIC-12 plans and not derived from runtime evidence."],
      deferredImprovements: [],
    },
  ];

  // --- Diagnostic timeline ---
  const timeline: DiagnosticTimelineItem[] = [];

  for (const event of events) {
    timeline.push({
      itemId: `event:${event.eventId}`,
      timestamp: new Date(event.createdAt).toISOString(),
      severity: severityFromEventSeverity(event.severity),
      category: categoryFromEventSource(event.source),
      domain: event.source,
      component: event.source,
      message: event.message,
      relatedEntities: event.entityRefs ?? [],
      correlationRefs: event.correlationId ? [event.correlationId] : [],
      source: "event_summary",
      actionability: "informational",
      caveats: [],
      noSecretStatus: true,
    });
  }

  for (const audit of auditEntries.slice(0, 100)) {
    const exists = timeline.some((item) => item.itemId === `audit:${audit.auditId}`);
    if (!exists) {
      timeline.push({
        itemId: `audit:${audit.auditId}`,
        timestamp: new Date(audit.createdAt).toISOString(),
        severity: severityFromAuditStatus(audit.status),
        category: "system",
        domain: audit.entityType,
        component: audit.entityType,
        message: audit.message,
        relatedEntities: audit.entityRefs ?? [],
        correlationRefs: audit.correlationId ? [audit.correlationId] : [],
        source: "audit_entry",
        actionability: "informational",
        caveats: [],
        noSecretStatus: true,
      });
    }
  }

  for (const ev of evidence.slice(0, 100)) {
    const exists = timeline.some((item) => item.itemId === `evidence:${ev.evidenceId}`);
    if (!exists) {
      timeline.push({
        itemId: `evidence:${ev.evidenceId}`,
        timestamp: new Date(ev.createdAt).toISOString(),
        severity: "info",
        category: categoryFromEvidenceKind(ev.kind),
        domain: ev.kind,
        component: ev.source,
        message: ev.title,
        relatedEntities: ev.entityRefs ?? [],
        correlationRefs: ev.correlationId ? [ev.correlationId] : [],
        source: "evidence_record",
        actionability: "informational",
        caveats: [],
        noSecretStatus: true,
      });
    }
  }

  timeline.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

  // --- Health & diagnostics correlation ---
  const healthIndicators: HealthIndicatorItem[] = [
    {
      name: "runtime-health",
      description: "Runtime confidence aggregated from lifecycle records",
      state: "unavailable",
      confidence: "unknown",
      evidence: ["src/control-plane/operational-reliability.ts"],
    },
    {
      name: "worker-health",
      description: "Worker confidence aggregated from registry signals",
      state: "unavailable",
      confidence: "unknown",
      evidence: ["src/control-plane/operational-reliability.ts"],
    },
    {
      name: "control-plane-health",
      description: "Control plane guardrails and readiness state",
      state: auditAvailable ? "healthy" : "degraded",
      confidence: auditAvailable ? "high" : "medium",
      evidence: ["src/gates.ts", "src/readiness.ts"],
    },
  ];

  const diagnosticSummaries: DiagnosticSummaryItem[] = diagnostics.map((diag) => ({
    diagnosticId: diag.diagnosticId,
    status: diag.status,
    summary: diag.summary,
    severity: "medium",
    source: "diagnostic_report",
    correlationRefs: diag.correlationId ? [diag.correlationId] : [],
    noSecretStatus: true,
  }));

  // --- Observability depth ---
  const observabilityDepth: readonly ObservabilityDepthItem[] = OBSERVABILITY_DEPTH.map((entry) => ({
    dimension: entry.dimension,
    label: entry.label,
    status: entry.status,
    reason: entry.reason,
    evidence: entry.evidence,
  }));

  // --- Unsupported / deferred signals ---
  const unsupportedSignals: ObservabilityFinding[] = [
    {
      code: "OBS-LOGS-UNSUPPORTED",
      severity: "low",
      message: "Raw log access is not exposed through the Product API.",
      responsibleDomain: "logs",
      evidence: "src/control-plane/operational-evidence-service.ts",
    },
    {
      code: "OBS-TRACES-DEFERRED",
      severity: "medium",
      message: "Distributed tracing backend is deferred.",
      responsibleDomain: "traces",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OBS-ALERTS-DEFERRED",
      severity: "medium",
      message: "Alert automation platform is deferred.",
      responsibleDomain: "alerts",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OBS-INCIDENT-DEFERRED",
      severity: "medium",
      message: "Full incident management platform is deferred.",
      responsibleDomain: "incident-management",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
  ];

  const deferredItems: ObservabilityFinding[] = [
    {
      code: "OBS-DEFER-TRACING",
      severity: "medium",
      message: "Distributed tracing backend remains deferred to EPIC-13+.",
      responsibleDomain: "traces",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OBS-DEFER-ALERTS",
      severity: "medium",
      message: "Alert automation platform remains deferred to EPIC-13+.",
      responsibleDomain: "alerts",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OBS-DEFER-INCIDENT",
      severity: "medium",
      message: "Incident response suite remains deferred to EPIC-13+.",
      responsibleDomain: "incident-management",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OBS-DEFER-SLO",
      severity: "medium",
      message: "SLO/SLA management remains deferred to EPIC-13+.",
      responsibleDomain: "slo-sla",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
    {
      code: "OBS-DEFER-LOG-RETENTION",
      severity: "medium",
      message: "Log retention platform remains deferred.",
      responsibleDomain: "retention",
      dependsOnFutureMilestone: "EPIC-13+",
      evidence: "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    },
  ];

  // --- Blockers and warnings ---
  const blockers: ObservabilityFinding[] = [];
  const warnings: ObservabilityFinding[] = [];

  if (!auditAvailable) {
    warnings.push({
      code: "OBS-NO-AUDIT",
      severity: "high",
      message: "No audit service is configured; correlation evidence is limited.",
      responsibleDomain: "audit",
      evidence: "src/control-plane/operational-evidence-service.ts",
    });
  }

  const highSeverityCount = timeline.filter((item) => item.severity === "critical" || item.severity === "high").length;
  if (highSeverityCount > 0) {
    warnings.push({
      code: "OBS-HIGH-SEVERITY-EVENTS",
      severity: "high",
      message: `${highSeverityCount} high-severity events are present in the diagnostic timeline.`,
      responsibleDomain: "diagnostics",
      evidence: "src/control-plane/operational-evidence-service.ts",
    });
  }

  const caveats: ObservabilityFinding[] = [
    {
      code: "OBS-CAVEAT-PROJECTION",
      severity: "info",
      message: "Health indicators are projected from control-plane state, not live engine probing.",
      responsibleDomain: "health",
      dependsOnFutureMilestone: "M05",
      evidence: "src/control-plane/operational-reliability.ts",
    },
    {
      code: "OBS-CAVEAT-LOGS",
      severity: "info",
      message: "Raw logs are unavailable; only audit events and evidence summaries are available.",
      responsibleDomain: "logs",
      evidence: "src/control-plane/operational-evidence-service.ts",
    },
    {
      code: "OBS-CAVEAT-BROWSER",
      severity: "info",
      message: "Browser visual acceptance remains pending for M03.",
      responsibleDomain: "browser-acceptance",
      dependsOnFutureMilestone: "M03",
      evidence: "docs/epics/epic-12/milestones/M03-ux-and-browser-acceptance-hardening.md",
    },
    {
      code: "OBS-CAVEAT-TRUTH-LAYERS",
      severity: "info",
      message: "Control-plane assertion, runtime observation, and external execution target state are reported separately.",
      responsibleDomain: "operational-reliability",
      evidence: "src/control-plane/operational-reliability.ts",
    },
  ];

  const sourceEvidence: readonly string[] = [
    "src/control-plane/observability.ts",
    "src/control-plane/operational-evidence-service.ts",
    "src/control-plane/operational-reliability.ts",
    "src/control-plane/audit-service.ts",
    "docs/epics/epic-12/EPIC-12_Executive_Plan.md",
    "docs/epics/epic-12/milestones/M05-observability-and-evidence-expansion.md",
  ];

  const summary = {
    correlationModelItems: correlationModel.length,
    evidenceSources: evidenceSources.length,
    timelineItems: timeline.length,
    unsupportedSignals: unsupportedSignals.length,
    deferredSignals: deferredItems.length,
    criticalFindings: blockers.filter((b) => b.severity === "critical").length,
    warnings: warnings.length,
  };

  return {
    checkedAt,
    observabilityReady: false as const,
    productionReady: false as const,
    claim: "not_claimed" as const,
    summary,
    correlationModel,
    evidenceSources,
    diagnosticTimeline: timeline,
    healthDiagnosticsCorrelation: {
      healthIndicators,
      diagnosticSummaries,
      logAvailability,
      auditAvailability: auditAvailable ? ("available" as const) : ("unavailable" as const),
      correlationStatus: auditAvailable ? ("partial" as const) : ("unavailable" as const),
      caveats: [
        "Health indicators are projected from control-plane state, not live engine probing.",
        "Log correlation is unavailable where raw logs are not exposed.",
      ],
    },
    observabilityDepth,
    unsupportedSignals,
    blockers,
    warnings,
    caveats,
    deferredItems,
    readinessGateDependencies: ["G06", "G07", "G08", "G09", "G13"],
    sourceEvidence,
    claimDiscipline: {
      productionReadyClaimAllowed: false,
      observabilityReadyClaimAllowed: false,
      sloSlaClaimAllowed: false,
      incidentPlatformClaimAllowed: false,
      reason: "Correlation-first observability is evidence-bounded; full tracing, alerting, SLO/SLA, and incident platforms remain deferred.",
    },
  };
}

// Re-export types for convenience
export type { EventSeverity, EvidenceKind };
export type { OPERATIONAL_GUARDRAILS };
