import {
  ENVIRONMENT_READINESS_INVENTORY,
  resolveCurrentEnvironment,
  type EnvironmentReadiness,
  type RecognizedEnvironment,
} from "./environment-readiness.js";
import { PERSISTENCE_READINESS_INVENTORY, type PersistenceReadinessItem } from "./persistence-readiness.js";
import { createSecretsBoundarySummary, type SecretBoundaryStorage, type SecretsBoundarySummary } from "./secrets-boundary.js";

export type ProductionReadinessGateStatus =
  | "pass"
  | "partial"
  | "blocked"
  | "not_started"
  | "deferred"
  | "not_applicable";

export type ProductionReadinessSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational";

export interface ReadinessFinding {
  readonly code: string;
  readonly gateId: string;
  readonly severity: ProductionReadinessSeverity;
  readonly message: string;
  readonly responsibleDomain: string;
  readonly dependsOnFutureMilestone?: string;
  readonly evidence?: string;
}

export interface ProductionReadinessGate {
  readonly id: string;
  readonly label: string;
  readonly status: ProductionReadinessGateStatus;
  readonly severity: ProductionReadinessSeverity;
  readonly evidence: readonly string[];
  readonly blockers: readonly ReadinessFinding[];
  readonly warnings: readonly ReadinessFinding[];
  readonly caveats: readonly ReadinessFinding[];
  readonly deferredItems: readonly ReadinessFinding[];
  readonly responsibleDomain: string;
  readonly dependencyOnFutureMilestones: readonly string[];
  readonly canPassInEpic12: boolean;
}

export interface ProductionReadinessReport {
  readonly checkedAt: string;
  readonly environment: {
    readonly current: RecognizedEnvironment;
    readonly recognized: readonly EnvironmentReadiness[];
  };
  readonly productionReady: false;
  readonly claim: "not_claimed";
  readonly status: "blocked" | "partial" | "not_started" | "deferred";
  readonly summary: {
    readonly totalGates: number;
    readonly passed: number;
    readonly partial: number;
    readonly blocked: number;
    readonly deferred: number;
    readonly notStarted: number;
  };
  readonly gates: readonly ProductionReadinessGate[];
  readonly blockers: readonly ReadinessFinding[];
  readonly warnings: readonly ReadinessFinding[];
  readonly caveats: readonly ReadinessFinding[];
  readonly deferredItems: readonly ReadinessFinding[];
  readonly persistenceInventory: readonly PersistenceReadinessItem[];
  readonly secretsBoundary: SecretsBoundarySummary;
  readonly claimDiscipline: {
    readonly productionReadyClaimAllowed: false;
    readonly billingReadyClaimAllowed: false;
    readonly administrationReadyClaimAllowed: false;
    readonly tenantGovernanceReadyClaimAllowed: false;
    readonly reason: string;
  };
  readonly nextMilestoneDependencies: readonly string[];
  readonly sourceEvidence: readonly string[];
}

export interface ProductionReadinessSignals {
  readonly environment?: RecognizedEnvironment;
  readonly runtimeConnectivity?: "connected" | "degraded" | "unavailable" | "unverified";
  readonly workerStatus?: "available" | "unavailable" | "stale" | "unverified";
  readonly targetStatus?: "ready" | "degraded" | "unavailable" | "unverified";
  readonly authMode?: string;
  readonly persistenceBackend?: "memory" | "filesystem" | "database";
  readonly secretBackend?: SecretBoundaryStorage;
  readonly settlementBackend?: "memory" | "production";
  readonly browserAcceptance?: "not_started" | "partial" | "deferred";
}

const DEFAULT_SIGNALS: Required<ProductionReadinessSignals> = {
  environment: "unknown",
  runtimeConnectivity: "unverified",
  workerStatus: "unavailable",
  targetStatus: "unavailable",
  authMode: "disabled",
  persistenceBackend: "memory",
  secretBackend: "memory",
  settlementBackend: "memory",
  browserAcceptance: "not_started",
};

function blocker(
  code: string,
  gateId: string,
  severity: ProductionReadinessSeverity,
  message: string,
  responsibleDomain: string,
  milestone?: string,
): ReadinessFinding {
  return {
    code,
    gateId,
    severity,
    message,
    responsibleDomain,
    ...(milestone ? { dependsOnFutureMilestone: milestone } : {}),
  };
}

function warning(
  code: string,
  gateId: string,
  severity: ProductionReadinessSeverity,
  message: string,
  responsibleDomain: string,
): ReadinessFinding {
  return { code, gateId, severity, message, responsibleDomain };
}

function caveat(
  code: string,
  gateId: string,
  severity: ProductionReadinessSeverity,
  message: string,
  responsibleDomain: string,
  milestone?: string,
): ReadinessFinding {
  return {
    code,
    gateId,
    severity,
    message,
    responsibleDomain,
    ...(milestone ? { dependsOnFutureMilestone: milestone } : {}),
  };
}

function deferred(
  code: string,
  gateId: string,
  severity: ProductionReadinessSeverity,
  message: string,
  responsibleDomain: string,
  milestone: string,
): ReadinessFinding {
  return { code, gateId, severity, message, responsibleDomain, dependsOnFutureMilestone: milestone };
}

function gate(
  id: string,
  label: string,
  status: ProductionReadinessGateStatus,
  severity: ProductionReadinessSeverity,
  responsibleDomain: string,
  dependencies: readonly string[],
  findings: {
    readonly blockers?: readonly ReadinessFinding[];
    readonly warnings?: readonly ReadinessFinding[];
    readonly caveats?: readonly ReadinessFinding[];
    readonly deferredItems?: readonly ReadinessFinding[];
  } = {},
): ProductionReadinessGate {
  return {
    id,
    label,
    status,
    severity,
    evidence: [
      "src/control-plane/production-readiness.ts",
    ],
    blockers: findings.blockers ?? [],
    warnings: findings.warnings ?? [],
    caveats: findings.caveats ?? [],
    deferredItems: findings.deferredItems ?? [],
    responsibleDomain,
    dependencyOnFutureMilestones: dependencies,
    canPassInEpic12: true,
  };
}

export function createProductionReadinessReport(
  input: ProductionReadinessSignals = {},
): ProductionReadinessReport {
  const signals = { ...DEFAULT_SIGNALS, ...input };
  const environment = resolveCurrentEnvironment(signals.environment);
  const secretsBoundary = createSecretsBoundarySummary(signals.secretBackend);
  const gates = buildGates(signals, environment);
  const blockers = gates.flatMap((entry) => entry.blockers);
  const warnings = gates.flatMap((entry) => entry.warnings);
  const caveats = gates.flatMap((entry) => entry.caveats);
  const deferredItems = gates.flatMap((entry) => entry.deferredItems);

  const summary = {
    totalGates: gates.length,
    passed: gates.filter((entry) => entry.status === "pass").length,
    partial: gates.filter((entry) => entry.status === "partial").length,
    blocked: gates.filter((entry) => entry.status === "blocked").length,
    deferred: gates.filter((entry) => entry.status === "deferred").length,
    notStarted: gates.filter((entry) => entry.status === "not_started").length,
  };

  const status: ProductionReadinessReport["status"] = blockers.length > 0
    ? "blocked"
    : summary.partial > 0
      ? "partial"
      : summary.deferred > 0
        ? "deferred"
        : "not_started";

  return {
    checkedAt: new Date().toISOString(),
    environment: {
      current: environment,
      recognized: ENVIRONMENT_READINESS_INVENTORY,
    },
    productionReady: false,
    claim: "not_claimed",
    status,
    summary,
    gates,
    blockers,
    warnings,
    caveats,
    deferredItems,
    persistenceInventory: PERSISTENCE_READINESS_INVENTORY,
    secretsBoundary,
    claimDiscipline: {
      productionReadyClaimAllowed: false,
      billingReadyClaimAllowed: false,
      administrationReadyClaimAllowed: false,
      tenantGovernanceReadyClaimAllowed: false,
      reason: "Production, billing, administration, and tenant governance readiness are not claimed until EPIC-12 gates provide evidence.",
    },
    nextMilestoneDependencies: [
      "M02 — Governance & Access Control Boundary",
      "M03 — Browser / UX Acceptance Hardening",
      "M04 — Operational Reliability & Runtime Confidence",
      "M05 — Observability & Evidence Correlation",
      "M06 — Economics Boundary Closure",
      "M07 — Final Hardening & Acceptance",
    ],
    sourceEvidence: [
      "src/control-plane/production-readiness.ts",
      "src/control-plane/environment-readiness.ts",
      "src/control-plane/persistence-readiness.ts",
      "src/control-plane/secrets-boundary.ts",
      "src/control-plane/epic-10-readiness.ts",
      "src/control-plane/epic-11-acceptance.ts",
      "tests/s29-production-readiness.test.mjs",
    ],
  };
}

function buildGates(
  signals: Required<ProductionReadinessSignals>,
  environment: RecognizedEnvironment,
): readonly ProductionReadinessGate[] {
  const environmentUnknown = environment === "unknown";
  const environmentBlockers = environmentUnknown
    ? [
      blocker(
        "ENV_UNKNOWN",
        "G01",
        "critical",
        "Runtime environment is unknown; environment separation and production readiness cannot be claimed.",
        "environment-separation",
      ),
    ]
    : environment === "production"
      ? [
        blocker(
          "PRODUCTION_GATES_UNPROVEN",
          "G01",
          "critical",
          "Production environment is recognized, but production gates are not yet proven.",
          "environment-separation",
        ),
      ]
      : [
        blocker(
          "PRODUCTION_ENVIRONMENT_NOT_CONFIGURED",
          "G01",
          "high",
          `Current environment is ${environment}; production environment is not configured / not claimed.`,
          "environment-separation",
        ),
      ];

  const runtimeBlockers = signals.runtimeConnectivity === "connected"
    && signals.workerStatus === "available"
    && signals.targetStatus === "ready"
    ? []
    : [
      blocker(
        "RUNTIME_SIGNALS_UNPROVEN",
        "G08",
        "high",
        `Runtime connectivity is ${signals.runtimeConnectivity}, worker status is ${signals.workerStatus}, and target status is ${signals.targetStatus}.`,
        "runtime-worker-confidence",
        "M04 — Operational Reliability & Runtime Confidence",
      ),
    ];

  return [
    gate(
      "G01",
      "Environment Separation",
      environmentUnknown ? "blocked" : "partial",
      environmentUnknown ? "critical" : "high",
      "environment-separation",
      ["M02", "M07"],
      { blockers: environmentBlockers },
    ),
    gate(
      "G02",
      "Persistence Readiness",
      signals.persistenceBackend === "database" ? "partial" : "blocked",
      "critical",
      "persistence-readiness",
      ["M04", "M07"],
      {
        blockers: signals.persistenceBackend === "database"
          ? []
          : [
            blocker(
              "PERSISTENCE_BACKEND_NOT_PRODUCTION",
              "G02",
              "critical",
              `Persistence backend is ${signals.persistenceBackend}; durable production state is not proven.`,
              "persistence-readiness",
            ),
          ],
      },
    ),
    gate(
      "G03",
      "Secrets Boundary",
      signals.secretBackend === "memory" || signals.secretBackend === "filesystem" ? "blocked" : "partial",
      "critical",
      "secrets-boundary",
      ["M02", "M07"],
      {
        blockers: [
          blocker(
            "SECRETS_BOUNDARY_NOT_PRODUCTION",
            "G03",
            "critical",
            `Secret storage is ${signals.secretBackend}; managed references and production secret storage are not proven.`,
            "secrets-boundary",
          ),
        ],
        caveats: [
          caveat(
            "RAW_SECRETS_REDACTED",
            "G03",
            "low",
            "This projection never returns raw secrets; no-secret-leak validation is required in S02 tests.",
            "secrets-boundary",
          ),
        ],
      },
    ),
    gate(
      "G04",
      "Auth / Actor Boundary",
      signals.authMode === "disabled" ? "blocked" : "partial",
      "critical",
      "authentication",
      ["M02"],
      {
        blockers: [
          blocker(
            "AUTH_ACTOR_BOUNDARY_DISABLED",
            "G04",
            "critical",
            `Authentication mode is ${signals.authMode}; authenticated actor identity is not implemented.`,
            "authentication",
            "M02 — Governance & Access Control Boundary",
          ),
        ],
      },
    ),
    gate(
      "G05",
      "Authorization / RBAC Boundary",
      signals.authMode === "disabled" ? "blocked" : "partial",
      "critical",
      "authorization-rbac",
      ["M02"],
      {
        blockers: [
          blocker(
            "RBAC_BASELINE_NOT_IMPLEMENTED",
            "G05",
            "critical",
            "Authorization and RBAC baseline are not implemented; read vs mutate authority is not proven.",
            "authorization-rbac",
            "M02 — Governance & Access Control Boundary",
          ),
        ],
      },
    ),
    gate(
      "G06",
      "Product API Readiness",
      "partial",
      "high",
      "product-api",
      ["M02", "M05", "M07"],
      {
        warnings: [
          warning(
            "PRODUCT_API_PROJECTION_PRESENT",
            "G06",
            "medium",
            "The Product API exposes a read-only readiness projection, but production auth, persistence, and evidence gates remain unproven.",
            "product-api",
          ),
        ],
      },
    ),
    gate(
      "G07",
      "Control Plane Surface Readiness",
      "partial",
      "high",
      "control-plane-surface",
      ["M03", "M07"],
      {
        caveats: [
          caveat(
            "BROWSER_ACCEPTANCE_PENDING",
            "G07",
            "medium",
            "The standalone surface consumes the Product API projection, but browser visual acceptance remains pending for M03.",
            "control-plane-surface",
            "M03 — Browser / UX Acceptance Hardening",
          ),
        ],
      },
    ),
    gate(
      "G08",
      "Runtime / Worker Operational Confidence",
      runtimeBlockers.length > 0 ? "blocked" : "partial",
      "high",
      "runtime-worker-confidence",
      ["M04"],
      { blockers: runtimeBlockers },
    ),
    gate(
      "G09",
      "Observability / Evidence Correlation",
      "partial",
      "medium",
      "observability-evidence",
      ["M05"],
      {
        caveats: [
          caveat(
            "CORRELATION_EVIDENCE_NOT_DURABLE",
            "G09",
            "medium",
            "Correlation-first observability is planned, but durable evidence and incident-oriented correlation are not proven.",
            "observability-evidence",
            "M05 — Observability & Evidence Correlation",
          ),
        ],
      },
    ),
    gate(
      "G10",
      "Browser / UX Acceptance",
      signals.browserAcceptance === "deferred" ? "deferred" : "blocked",
      "high",
      "browser-ux-acceptance",
      ["M03"],
      {
        blockers: [
          blocker(
            "BROWSER_HARNESS_PENDING",
            "G10",
            "high",
            "Browser smoke, visual, responsive, and accessibility acceptance remains pending for M03.",
            "browser-ux-acceptance",
            "M03 — Browser / UX Acceptance Hardening",
          ),
        ],
      },
    ),
    gate(
      "G11",
      "Governance / Administration Boundary",
      "partial",
      "medium",
      "governance-administration",
      ["M02", "EPIC-13+"],
      {
        deferredItems: [
          deferred(
            "TENANT_ADMIN_FUTURE",
            "G11",
            "low",
            "Tenant-aware visibility is in scope; enterprise tenant administration is deferred beyond EPIC-12.",
            "governance-administration",
            "EPIC-13+",
          ),
        ],
      },
    ),
    gate(
      "G12",
      "Economics Boundary",
      "partial",
      "medium",
      "economics-boundary",
      ["M06", "EPIC-13+"],
      {
        caveats: [
          caveat(
            "ECONOMICS_OPERATIONAL_EVIDENCE_ONLY",
            "G12",
            "medium",
            "Economics remains operational evidence; billing, invoices, and payment rails are deferred.",
            "economics-boundary",
            "M06 — Economics Boundary Closure",
          ),
        ],
      },
    ),
    gate(
      "G13",
      "Production Claim Discipline",
      "pass",
      "informational",
      "claim-discipline",
      [],
    ),
  ];
}
