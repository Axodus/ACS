import type { AcsAuthMode } from "../http/auth.js";
import type { RuntimeState } from "./runtime-lifecycle-service.js";

export type Epic10ReadinessStatus = "ready" | "partial" | "blocked";

export type Epic10ProductionState = "no" | "dev-only" | "blocked";

export interface Epic10ReadinessFinding {
  readonly domain: string;
  readonly component: string;
  readonly severity: "info" | "warning" | "error";
  readonly currentState: string;
  readonly requiredState: string;
  readonly reason: string;
  readonly recommendedRemediation: string;
  readonly blocksProduction: boolean;
}

export interface Epic10ReadinessDomainReport {
  readonly domain: string;
  readonly status: Epic10ReadinessStatus;
  readonly currentState: string;
  readonly requiredState: string;
  readonly evidence: readonly string[];
  readonly findings: readonly Epic10ReadinessFinding[];
}

export interface Epic10ReadinessSignals {
  readonly workerStatus: "registered" | "available" | "unavailable" | "degraded" | "stale";
  readonly targetStatus: "ready" | "degraded" | "unavailable" | "misconfigured";
  readonly runtimeStatus: RuntimeState;
  readonly authMode: AcsAuthMode;
  readonly rateLimitEnabled: boolean;
  readonly observabilityExporterEnabled: boolean;
  readonly persistenceBackend: "memory" | "filesystem" | "database";
  readonly secretBackend: "memory" | "filesystem" | "vault" | "kms";
  readonly settlementBackend: "memory" | "production";
  readonly remoteWorkerSupported: boolean;
  readonly liveDeploymentEnabled: boolean;
}

export interface Epic10ReadinessReport {
  readonly generatedAt: number;
  readonly devReady: true;
  readonly distributedArchitectureReady: true;
  readonly productionReady: false;
  readonly productionState: Epic10ProductionState;
  readonly topology: {
    readonly controlPlane: string;
    readonly workers: readonly {
      readonly workerId: string;
      readonly workload: string;
      readonly target: string;
      readonly engine: string;
    }[];
  };
  readonly domains: readonly Epic10ReadinessDomainReport[];
  readonly findings: readonly Epic10ReadinessFinding[];
  readonly blockers: readonly Epic10ReadinessFinding[];
  readonly summary: {
    readonly devReady: true;
    readonly distributedArchitectureReady: true;
    readonly productionReady: false;
    readonly blockerCount: number;
  };
}

export interface Epic10ReadinessInspectionInput extends Partial<Epic10ReadinessSignals> {}

const DEFAULT_SIGNALS: Epic10ReadinessSignals = {
  workerStatus: "registered",
  targetStatus: "ready",
  runtimeStatus: "running",
  authMode: "disabled",
  rateLimitEnabled: false,
  observabilityExporterEnabled: false,
  persistenceBackend: "memory",
  secretBackend: "memory",
  settlementBackend: "memory",
  remoteWorkerSupported: false,
  liveDeploymentEnabled: false,
};

export function createEpic10ReadinessReport(input: Epic10ReadinessInspectionInput = {}): Epic10ReadinessReport {
  const signals = { ...DEFAULT_SIGNALS, ...input };

  const domains = buildDomainReports(signals);
  const findings = domains.flatMap((domain) => domain.findings);
  const blockers = findings.filter((finding) => finding.blocksProduction);

  return {
    generatedAt: Date.now(),
    devReady: true,
    distributedArchitectureReady: true,
    productionReady: false,
    productionState: blockers.length > 0 ? "blocked" : "dev-only",
    topology: {
      controlPlane: "ACS Control Plane",
      workers: [
        {
          workerId: "ExecutionWorker A",
          workload: "tenant/workload isolated workload A",
          target: "ExecutionTarget A",
          engine: "OpenClaw",
        },
        {
          workerId: "ExecutionWorker B",
          workload: "tenant/workload isolated workload B",
          target: "ExecutionTarget B",
          engine: "OpenClaw",
        },
      ],
    },
    domains,
    findings,
    blockers,
    summary: {
      devReady: true,
      distributedArchitectureReady: true,
      productionReady: false,
      blockerCount: blockers.length,
    },
  };
}

function buildDomainReports(signals: Epic10ReadinessSignals): readonly Epic10ReadinessDomainReport[] {
  return [
    readyDomain(
      "control-plane",
      "ACS control plane governs plans, evidence, and economics.",
      "Control plane remains authoritative for governance, planning, and evidence.",
      ["src/http/control-plane-context.ts", "src/control-plane/deployment-service.ts", "src/control-plane/runtime-lifecycle-service.ts"],
    ),
    readyDomain(
      "product-api",
      "Product API stays governed and read-only over /api/v1 and /acs inspection.",
      "Product API remains governed and read-only over the inspection surface.",
      ["src/http/routes/acs-routes.ts", "src/http/routes/product-api-routes.ts"],
    ),
    executionWorkerDomain(signals),
    executionTargetDomain(signals),
    readyDomain(
      "agent-engines",
      "OpenClaw engine integration exists and is isolated from ACS governance.",
      "Agent engine integration exists and can run in DEV with explicit roots.",
      ["src/engines/openclaw-bootstrap.ts", "src/engines/openclaw-engine-adapter.ts"],
    ),
    readyDomain(
      "providers",
      "Provider abstractions are separated from workers and credentials.",
      "Model provider, runner, and credential provider abstractions are in place.",
      ["src/intelligence/model-provider-registry.ts", "src/intelligence/agent-runner-registry.ts", "src/intelligence/credential-provider.ts"],
    ),
    credentialHandlingDomain(signals),
    readyDomain(
      "governance",
      "Governance and sandbox deployment gates are implemented.",
      "Sandbox governance and deployment approval remain authoritative.",
      ["src/control-plane/deployment-service.ts", "src/control-plane/execution-plan-resolver.ts"],
    ),
    economicLifecycleDomain(signals),
    readyDomain(
      "audit-evidence",
      "Audit and evidence capture are correlated and redacted.",
      "Audit events are correlated and redacted, but persistence is still in-process.",
      ["src/control-plane/audit-service.ts", "src/control-plane/runtime-lifecycle-service.ts"],
    ),
    readyDomain(
      "tenant-isolation",
      "Tenant ownership checks are explicit across deployments, runtimes, and credentials.",
      "Tenant ownership checks are enforced at the control-plane boundary.",
      ["src/control-plane/isolation.ts", "src/control-plane/deployment-service.ts", "src/control-plane/runtime-lifecycle-service.ts", "src/intelligence/credential-registry.ts"],
    ),
    readyDomain(
      "workload-isolation",
      "Workload-scoped state is carried through plans, deployments, runtimes, and receipts.",
      "Workload identity is explicit across the governed execution chain.",
      ["src/control-plane/isolation.ts", "src/control-plane/unified-agent-model.ts", "src/control-plane/neurons-economic-contract.ts"],
    ),
    persistenceDomain(signals),
    authDomain(signals),
    rateLimitDomain(signals),
    observabilityDomain(signals),
    failureRecoveryDomain(signals),
    remoteWorkerDomain(signals),
    secretBackendDomain(signals),
    deploymentEligibilityDomain(signals),
  ];
}

function executionWorkerDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const available = signals.workerStatus === "available";
  const findings: Epic10ReadinessFinding[] = [];

  if (!available) {
    findings.push({
      domain: "execution-workers",
      component: "worker readiness",
      severity: signals.workerStatus === "unavailable" || signals.workerStatus === "stale" ? "error" : "warning",
      currentState: `worker status is ${signals.workerStatus}`,
      requiredState: "worker is available with a truthful heartbeat and capacity",
      reason: "The control plane can register workers, but the current worker is not yet in a fully available state.",
      recommendedRemediation: "Start the local worker, ensure heartbeats remain truthful, and keep eligibility checks tied to actual capability and target compatibility.",
      blocksProduction: false,
    });
  }

  return {
    domain: "execution-workers",
    status: available && signals.remoteWorkerSupported ? "ready" : "partial",
    currentState: available
      ? "local worker is available in DEV"
      : `local worker is ${signals.workerStatus}`,
    requiredState: "available workers with authenticated leases and remote transport support",
    evidence: ["src/workers/local-worker.ts", "src/workers/worker-assignment-service.ts", "tests/s21-workers.test.mjs"],
    findings,
  };
}

function executionTargetDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = [];
  if (signals.targetStatus !== "ready") {
    findings.push({
      domain: "execution-targets",
      component: "target availability",
      severity: "error",
      currentState: `execution target status is ${signals.targetStatus}`,
      requiredState: "target is ready and eligible for worker assignment",
      reason: "A worker cannot safely accept an assignment if the target is unavailable or misconfigured.",
      recommendedRemediation: "Restore the execution target, validate its capability match, and refresh target discovery before dispatch.",
      blocksProduction: false,
    });
  }

  return {
    domain: "execution-targets",
    status: signals.targetStatus === "ready" ? "ready" : "partial",
    currentState: `execution target status is ${signals.targetStatus}`,
    requiredState: "distributed target discovery and eligibility checks are stable",
    evidence: ["src/targets/execution-target-service.ts", "src/targets/execution-target-registry.ts"],
    findings,
  };
}

function credentialHandlingDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.secretBackend === "vault" || signals.secretBackend === "kms"
    ? []
    : [{
      domain: "credential-handling",
      component: "secret backend",
      severity: "error",
      currentState: `secret backend is ${signals.secretBackend}`,
      requiredState: "production secret backend with reference-only serialization",
      reason: "The implementation still relies on in-memory or filesystem secret storage, which is not production-grade.",
      recommendedRemediation: "Integrate Vault/KMS or an equivalent managed secret backend and keep raw values out of plans, assignments, runs, and receipts.",
      blocksProduction: true,
    }];

  return {
    domain: "credential-handling",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: `secret backend is ${signals.secretBackend}`,
    requiredState: "production secret backend and logical credential references only",
    evidence: ["src/intelligence/secret-store.ts", "src/intelligence/credential-registry.ts"],
    findings,
  };
}

function economicLifecycleDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.settlementBackend === "production"
    ? []
    : [{
      domain: "economic-lifecycle",
      component: "settlement provider",
      severity: "error",
      currentState: `settlement backend is ${signals.settlementBackend}`,
      requiredState: "durable settlement provider with reconciliation and receipts",
      reason: "Economic authorization exists, but settlement still uses an in-memory provider.",
      recommendedRemediation: "Replace the in-memory settlement provider with a durable production settlement backend and reconcile reservations, usage, and receipts.",
      blocksProduction: true,
    }];

  return {
    domain: "economic-lifecycle",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: `settlement backend is ${signals.settlementBackend}`,
    requiredState: "durable quote/reserve/execute/meter/settle/receipt lifecycle",
    evidence: ["src/control-plane/neurons-economic-contract.ts", "src/control-plane/deployment-service.ts"],
    findings,
  };
}

function persistenceDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.persistenceBackend === "database"
    ? []
    : [{
      domain: "persistence",
      component: "durable state",
      severity: "error",
      currentState: `persistence backend is ${signals.persistenceBackend}`,
      requiredState: "durable production storage with crash recovery and retention policy",
      reason: "Deployment, runtime, audit, and economic state are still held in process-local structures.",
      recommendedRemediation: "Move authoritative state to durable storage and add recovery for outstanding deployments, runtimes, and reservations.",
      blocksProduction: true,
    }];

  return {
    domain: "persistence",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: `persistence backend is ${signals.persistenceBackend}`,
    requiredState: "durable production storage and recovery",
    evidence: ["src/control-plane/deployment-service.ts", "src/control-plane/runtime-lifecycle-service.ts", "src/control-plane/audit-service.ts"],
    findings,
  };
}

function authDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const trustedAuthenticationActive = signals.authMode === "required" || signals.authMode === "oidc";
  const findings: Epic10ReadinessFinding[] = trustedAuthenticationActive
    ? []
    : [{
      domain: "authentication-authorization",
      component: "HTTP auth boundary",
      severity: "error",
      currentState: `auth mode is ${signals.authMode}`,
      requiredState: "real authenticated and authorized requests with tenant/workload scoping",
      reason: "Current HTTP auth is disabled or mock-only and does not enforce production identity validation.",
      recommendedRemediation: "Integrate a real identity provider, validate tokens, and enforce tenant/workload authorization before dispatch.",
      blocksProduction: true,
    }];

  return {
    domain: "authentication-authorization",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: `auth mode is ${signals.authMode}`,
    requiredState: "production identity and authorization enforcement",
    evidence: ["src/http/auth.ts", "src/http/routes/acs-routes.ts"],
    findings,
  };
}

function rateLimitDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.rateLimitEnabled
    ? []
    : [{
      domain: "rate-limiting",
      component: "HTTP rate limit",
      severity: "error",
      currentState: "rate limiting is disabled or mock-only",
      requiredState: "durable production-enforced rate limits",
      reason: "The current HTTP layer only exposes contract/mock rate limiting.",
      recommendedRemediation: "Attach a real rate-limit backend and enforce tenant-scoped throttles before request handling.",
      blocksProduction: true,
    }];

  return {
    domain: "rate-limiting",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: signals.rateLimitEnabled ? "rate limiting is enabled" : "rate limiting is disabled or mock-only",
    requiredState: "production rate limiting with durable counters",
    evidence: ["src/http/rate-limit.ts", "src/http/routes/acs-routes.ts"],
    findings,
  };
}

function observabilityDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.observabilityExporterEnabled
    ? []
    : [{
      domain: "observability",
      component: "telemetry exporter",
      severity: "error",
      currentState: "HTTP and runtime observability are contract-only",
      requiredState: "logs, metrics, traces, and alerting exported from production",
      reason: "The implementation currently reports external exporters as disabled.",
      recommendedRemediation: "Wire production telemetry exporters and alerts into the control plane and worker runtime.",
      blocksProduction: true,
    }];

  return {
    domain: "observability",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: signals.observabilityExporterEnabled ? "external exporter enabled" : "HTTP and runtime observability are contract-only",
    requiredState: "production observability with external exporters",
    evidence: ["src/inspection.ts", "tests/http-auth-rate-limit.test.mjs"],
    findings,
  };
}

function failureRecoveryDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.runtimeStatus === "running"
    ? [{
      domain: "failure-recovery",
      component: "runtime recovery",
      severity: "warning",
      currentState: `runtime state is ${signals.runtimeStatus} and recovery is process-local`,
      requiredState: "durable orphan/retry/reconciliation recovery",
      reason: "The runtime service has state transitions and failure capture, but no production recovery loop.",
      recommendedRemediation: "Persist runtime and execution-run state and add reconciliation for expired, orphaned, or failed runs.",
      blocksProduction: false,
    }]
    : [{
      domain: "failure-recovery",
      component: "runtime recovery",
      severity: "error",
      currentState: `runtime state is ${signals.runtimeStatus}`,
      requiredState: "durable recovery and reconciliation",
      reason: "Runtime recovery has not been proven under a failing lifecycle state.",
      recommendedRemediation: "Persist runtime and run state and add repair/reconciliation jobs.",
      blocksProduction: false,
    }];

  return {
    domain: "failure-recovery",
    status: "partial",
    currentState: `runtime state is ${signals.runtimeStatus}`,
    requiredState: "durable reconciliation for runtimes and runs",
    evidence: ["src/control-plane/runtime-lifecycle-service.ts"],
    findings,
  };
}

function remoteWorkerDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.remoteWorkerSupported
    ? []
    : [{
      domain: "remote-worker-support",
      component: "worker transport",
      severity: "error",
      currentState: "only local DEV worker execution is implemented",
      requiredState: "authenticated remote worker support with the same canonical contracts",
      reason: "The current worker implementation is local-only and does not prove remote dispatch.",
      recommendedRemediation: "Add a remote worker transport and register it behind the same assignment and lease contracts.",
      blocksProduction: true,
    }];

  return {
    domain: "remote-worker-support",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: signals.remoteWorkerSupported ? "remote worker support is enabled" : "only local DEV worker execution is implemented",
    requiredState: "remote workers with canonical governed contracts",
    evidence: ["src/workers/local-worker.ts", "src/workers/worker-assignment-service.ts"],
    findings,
  };
}

function secretBackendDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.secretBackend === "vault" || signals.secretBackend === "kms"
    ? []
    : [{
      domain: "secret-backend",
      component: "secret storage",
      severity: "error",
      currentState: `secret backend is ${signals.secretBackend}`,
      requiredState: "managed secret backend with reference-only execution payloads",
      reason: "The current secret store is in-memory or filesystem based and not production-grade.",
      recommendedRemediation: "Move secrets to Vault/KMS and keep only logical references in plans, assignments, runs, and receipts.",
      blocksProduction: true,
    }];

  return {
    domain: "secret-backend",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: `secret backend is ${signals.secretBackend}`,
    requiredState: "managed secret backend and secret-free payloads",
    evidence: ["src/intelligence/secret-store.ts", "src/intelligence/credential-registry.ts"],
    findings,
  };
}

function deploymentEligibilityDomain(signals: Epic10ReadinessSignals): Epic10ReadinessDomainReport {
  const findings: Epic10ReadinessFinding[] = signals.liveDeploymentEnabled
    ? []
    : [{
      domain: "deployment-eligibility",
      component: "deployment governance",
      severity: "error",
      currentState: "live deployment is intentionally blocked",
      requiredState: "explicit staged/live deployment eligibility with production controls",
      reason: "The current governance policy only allows sandbox deployments.",
      recommendedRemediation: "Add staged/live eligibility gates and production controls only after the runtime blockers are removed.",
      blocksProduction: true,
    }];

  return {
    domain: "deployment-eligibility",
    status: findings.length === 0 ? "ready" : "blocked",
    currentState: signals.liveDeploymentEnabled ? "live deployment is enabled" : "live deployment is intentionally blocked",
    requiredState: "explicit staged/live deployment eligibility",
    evidence: ["src/control-plane/deployment-service.ts"],
    findings,
  };
}

function readyDomain(domain: string, currentState: string, requiredState: string, evidence: readonly string[]): Epic10ReadinessDomainReport {
  return {
    domain,
    status: "ready",
    currentState,
    requiredState,
    evidence,
    findings: [],
  };
}
