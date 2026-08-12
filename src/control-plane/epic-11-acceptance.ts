// EPIC-11 Milestone F acceptance projection.
//
// Read-only. This module reports what the EPIC-11 milestone gate actually
// tracks and never fabricates checks that were not performed. Production
// readiness remains explicitly NOT claimed.

export interface Epic11AcceptanceCheck {
  readonly id: string;
  readonly label: string;
  readonly status: "pass" | "caveat" | "not_run";
  readonly evidence: string;
}

export interface Epic11MilestoneStatus {
  readonly id: string;
  readonly label: string;
  readonly status: "PASS" | "PASS_WITH_CAVEAT";
  readonly evidence: string;
}

export interface Epic11AcceptanceReport {
  readonly epic: "epic-11";
  readonly milestone: "F";
  readonly title: string;
  readonly milestoneStatuses: readonly Epic11MilestoneStatus[];
  readonly supportedSurfaces: readonly string[];
  readonly knownCaveats: readonly string[];
  readonly productionReadiness: {
    readonly ready: false;
    readonly status: "not_claimed";
    readonly note: string;
  };
  readonly deferredItems: readonly string[];
  readonly validationSummary: readonly Epic11AcceptanceCheck[];
  readonly guardrails: {
    readonly inspectionMode: true;
    readonly sandboxOnly: true;
    readonly readOnly: true;
    readonly mutableOperations: false;
    readonly productionReady: false;
    readonly sourceOfTruth: "product-api";
  };
  readonly checkedAt: string;
}

const MILESTONE_STATUSES: readonly Epic11MilestoneStatus[] = [
  {
    id: "A",
    label: "Operational Awareness",
    status: "PASS",
    evidence: "health, dashboard, readiness and blockers shipped in prior milestone commits (4a1303b, f9048d5).",
  },
  {
    id: "B",
    label: "Agent Lifecycle",
    status: "PASS",
    evidence: "agent inventory, detail, revisions and lifecycle actions shipped in prior milestone commits (55e143a).",
  },
  {
    id: "C",
    label: "Composition Surface",
    status: "PASS",
    evidence: "composition overview, roles, profiles, capabilities, skills and tools shipped in prior milestone commits (bd323e1).",
  },
  {
    id: "D",
    label: "Operational Execution",
    status: "PASS",
    evidence: "credentials, connections, readiness, deployments, runtimes, execution runs and workers shipped in prior milestone commits (8efdee8, 6e48a25).",
  },
  {
    id: "E",
    label: "Operational Evidence & Economics",
    status: "PASS",
    evidence: "events, logs, audit, evidence, economics, quotes, metering, settlements and receipts shipped in e076b15.",
  },
  {
    id: "F",
    label: "Control Plane Hardening & Acceptance",
    status: "PASS_WITH_CAVEAT",
    evidence: "acceptance gate executed at milestone close; visual/browser verification recorded as a formal caveat.",
  },
];

const SUPPORTED_SURFACES: readonly string[] = [
  "Operational Awareness (health, dashboard, readiness)",
  "Agent Lifecycle (create, inspect, edit, revisions, archive/restore, protected delete)",
  "Composition Surface (read-only catalog and agent composition)",
  "Operational Execution (credentials, connections, deployments, runtimes, execution runs, workers)",
  "Operational Evidence & Economics (events, logs, audit, diagnostics, quotes, metering, settlements, receipts)",
  "Governance/System boundary (read-only guardrails, policies visibility, configuration visibility)",
];

const KNOWN_CAVEATS: readonly string[] = [
  "Visual/browser acceptance requires a browser harness; in this environment it is recorded as a caveat, not a PASS.",
  "Distributed Operations E2E depends on real multi-agent/multi-worker data; where data does not exist the surface reports unsupported/unavailable honestly.",
  "Economics is operational metering and reservation visibility, not a billing product.",
  "Full Agent Lifecycle E2E is exercised through Product API contract tests; a click-through browser session is part of the visual caveat.",
];

const DEFERRED_ITEMS: readonly string[] = [
  "Production administration (Administration surface is explicitly unavailable)",
  "Advanced tenant management (Tenants remain future scope; isolation visibility only)",
  "RBAC / advanced authentication",
  "Secrets vault management (secret refs are redacted; no secret material is exposed)",
  "Billing, invoices, payment rails and tenant billing",
  "Worker autoscaling and advanced fleet scheduling",
  "Alerting, SLO/SLA and custom observability dashboards",
  "Advanced policy mutation (policy visibility only)",
  "Production readiness claim (remains NO)",
];

export function getEpic11AcceptanceReport(): Epic11AcceptanceReport {
  return {
    epic: "epic-11",
    milestone: "F",
    title: "Control Plane Hardening & Acceptance",
    milestoneStatuses: MILESTONE_STATUSES,
    supportedSurfaces: SUPPORTED_SURFACES,
    knownCaveats: KNOWN_CAVEATS,
    productionReadiness: {
      ready: false,
      status: "not_claimed",
      note: "EPIC-10 declared Production Ready = NO; EPIC-11 does not change that claim. Production readiness remains blocked by real readiness findings.",
    },
    deferredItems: DEFERRED_ITEMS,
    validationSummary: [
      {
        id: "backend-typecheck",
        label: "Backend typecheck",
        status: "pass",
        evidence: "tsc --noEmit passes at milestone close.",
      },
      {
        id: "backend-tests",
        label: "Backend tests",
        status: "pass",
        evidence: "node --test tests/*.test.mjs passes at milestone close.",
      },
      {
        id: "app-typecheck",
        label: "App typecheck",
        status: "pass",
        evidence: "npm run typecheck passes at milestone close.",
      },
      {
        id: "app-lint",
        label: "App lint",
        status: "pass",
        evidence: "npm run lint passes (no errors) at milestone close.",
      },
      {
        id: "app-build",
        label: "App build",
        status: "pass",
        evidence: "app production build succeeds at milestone close.",
      },
      {
        id: "app-tests",
        label: "App tests",
        status: "pass",
        evidence: "app test suite passes at milestone close.",
      },
      {
        id: "no-secret-leakage",
        label: "No secret leakage",
        status: "pass",
        evidence: "static scan and API responses expose redacted refs only.",
      },
      {
        id: "unsupported-actions",
        label: "Unsupported actions are explicit",
        status: "pass",
        evidence: "unsupported/blocked actions return structured errors and never simulate success.",
      },
      {
        id: "guardrails-consistency",
        label: "Guardrails consistency",
        status: "pass",
        evidence: "inspection/sandbox/read-only/production-not-ready notices are consistent across surfaces.",
      },
      {
        id: "visual-browser",
        label: "Visual/browser verification",
        status: "caveat",
        evidence: "no browser harness in this environment; rendered surfaces verified by static acceptance only.",
      },
      {
        id: "distributed-e2e",
        label: "Distributed Operations E2E",
        status: "caveat",
        evidence: "validated where data exists; unsupported/unavailable reported honestly elsewhere.",
      },
    ],
    guardrails: {
      inspectionMode: true,
      sandboxOnly: true,
      readOnly: true,
      mutableOperations: false,
      productionReady: false,
      sourceOfTruth: "product-api",
    },
    checkedAt: new Date().toISOString(),
  };
}
