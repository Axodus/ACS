import type { EnvironmentTopology } from "./environment-topology.js";
import type { EconomicAdapterDescriptor, SettlementProvider } from "./neurons-economic-contract.js";
import type { SecretStore } from "../intelligence/secret-store.js";
import type { TelemetryExporterHealth } from "./operational-telemetry.js";
import type { SharedStateHealth } from "./shared-state/contracts.js";

export type ProviderBoundaryReadinessState = "READY" | "DEGRADED" | "UNAVAILABLE" | "NOT_CONFIGURED" | "UNSUPPORTED";
export type ProviderCapabilityScope = "global" | "tenant";
export type ProviderBoundaryType = "openclaw_worker" | "settlement" | "persistence" | "secret" | "telemetry";

export interface ProviderCapabilityProjection {
  readonly capability: string;
  readonly scope: ProviderCapabilityScope;
  readonly available: boolean;
  readonly readiness: ProviderBoundaryReadinessState;
  readonly reasonCode?: string;
  readonly evidence: readonly string[];
}

export interface ProviderProjection {
  readonly providerId: string;
  readonly providerType: ProviderBoundaryType;
  readonly providerMode: string;
  readonly environment: EnvironmentTopology["environment"];
  readonly scope: ProviderCapabilityScope;
  readonly configured: boolean;
  readonly reachable: boolean;
  readonly capabilities: readonly ProviderCapabilityProjection[];
  readonly readiness: ProviderBoundaryReadinessState;
  readonly productionEligible: boolean;
  readonly degraded: boolean;
  readonly reasonCode?: string;
  readonly credentialPresent?: boolean;
  readonly lastCheckedAt: number;
  readonly evidence: readonly string[];
  readonly provenance: {
    readonly configuration: readonly string[];
    readonly health: readonly string[];
  };
}

export interface ProviderBoundaryReadinessDimension {
  readonly status: ProviderBoundaryReadinessState;
  readonly checkedAt: number;
  readonly reasonCodes: readonly string[];
}

export interface ProviderBoundaryReadiness {
  readonly http: ProviderBoundaryReadinessDimension;
  readonly execution: ProviderBoundaryReadinessDimension;
  readonly financialOperation: ProviderBoundaryReadinessDimension;
  readonly productionEligibility: ProviderBoundaryReadinessDimension;
}

export interface ProviderBoundaryProjection {
  readonly environment: EnvironmentTopology["environment"];
  readonly updatedAt: number;
  readonly providers: readonly ProviderProjection[];
  readonly readiness: ProviderBoundaryReadiness;
}

export interface ProviderBoundaryInput {
  readonly environmentTopology: EnvironmentTopology;
  readonly profile: "development" | "production";
  readonly runtimeMode: "local" | "remote";
  readonly localWorkerConfigured: boolean;
  readonly checkedAt?: number;
  readonly runtimeCoordinatorHealth?: { readonly configured: boolean; readonly reachable: boolean };
  readonly sharedStateHealth?: SharedStateHealth;
  readonly secretStore: SecretStore;
  readonly secretHealth: Awaited<ReturnType<SecretStore["health"]>>;
  readonly economicStore: EconomicAdapterDescriptor;
  readonly settlementProvider: SettlementProvider["descriptor"];
  readonly settlementHealth: { readonly reachable: boolean };
  readonly administrativeState: { readonly mode: "memory" | "filesystem"; readonly durability: "process_local" | "single_node_durable"; readonly filePath?: string };
  readonly telemetryHealth: TelemetryExporterHealth;
  readonly persistencePaths: {
    readonly administrativeStatePath?: string;
    readonly economicStatePath?: string;
    readonly settlementStatePath?: string;
    readonly secretCatalogPath?: string;
    readonly runtimeStatePath?: string;
    readonly rateLimitDatabasePath?: string;
  };
}

export function buildProviderBoundary(input: ProviderBoundaryInput): ProviderBoundaryProjection {
  const checkedAt = input.checkedAt ?? Date.now();
  const providers = [
    buildOpenClawWorkerProvider(input, checkedAt),
    buildSettlementProvider(input, checkedAt),
    buildPersistenceProvider(input, checkedAt),
    buildSecretProvider(input, checkedAt),
    buildTelemetryProvider(input, checkedAt),
  ];
  return {
    environment: input.environmentTopology.environment,
    updatedAt: checkedAt,
    providers,
    readiness: {
      http: dimension("READY", checkedAt, []),
      execution: readinessFromProviders(providers, ["openclaw-worker"], checkedAt),
      financialOperation: readinessFromProviders(providers, ["settlement-provider", "shared-state-provider", "secret-provider"], checkedAt),
      productionEligibility: readinessFromProviders(providers, ["openclaw-worker", "settlement-provider", "shared-state-provider", "secret-provider", "telemetry-exporter"], checkedAt, true),
    },
  };
}

function buildOpenClawWorkerProvider(input: ProviderBoundaryInput, checkedAt: number): ProviderProjection {
  const mode = input.environmentTopology.workerMode;
  const configured = mode !== "disabled";
  const reachable = mode === "local" ? input.localWorkerConfigured : input.runtimeCoordinatorHealth?.reachable === true;
  const productionEligible = mode === "remote" && input.runtimeCoordinatorHealth?.configured === true && reachable;
  const readiness = !configured ? "NOT_CONFIGURED" : reachable ? "READY" : "UNAVAILABLE";
  const reasonCode = !configured
    ? "OPENCLAW_WORKER_DISABLED"
    : mode === "remote" && input.runtimeCoordinatorHealth?.configured !== true
      ? "REMOTE_DISPATCH_UNAVAILABLE"
      : !reachable
        ? "OPENCLAW_WORKER_UNAVAILABLE"
        : undefined;
  const capabilityReadiness = readiness === "READY" ? "READY" : readiness;
  return {
    providerId: "openclaw-worker",
    providerType: "openclaw_worker",
    providerMode: mode,
    environment: input.environmentTopology.environment,
    scope: "global",
    configured,
    reachable,
    capabilities: [
      capability("workload.execute", "global", readiness === "READY", capabilityReadiness, reasonCode, [
        "ACS_ENVIRONMENT=" + input.environmentTopology.environment,
        "ACS_DISPATCH_MODE=" + input.environmentTopology.dispatchMode,
        "ACS_OPENCLAW_WORKER_MODE=" + mode,
      ]),
      capability("workload.inspect", "global", readiness === "READY", capabilityReadiness, reasonCode, [
        "ACS_ENVIRONMENT=" + input.environmentTopology.environment,
        "ACS_OPENCLAW_WORKER_MODE=" + mode,
      ]),
      capability("workload.cancel", "global", readiness === "READY", capabilityReadiness, reasonCode, [
        "ACS_ENVIRONMENT=" + input.environmentTopology.environment,
        "ACS_OPENCLAW_WORKER_MODE=" + mode,
      ]),
    ],
    readiness,
    productionEligible,
    degraded: readiness !== "READY" || !productionEligible,
    ...(reasonCode ? { reasonCode } : {}),
    lastCheckedAt: checkedAt,
    evidence: [
      "ACS_ENVIRONMENT=" + input.environmentTopology.environment,
      "ACS_DISPATCH_MODE=" + input.environmentTopology.dispatchMode,
      "ACS_OPENCLAW_WORKER_MODE=" + mode,
    ],
    provenance: {
      configuration: [
        "environment=" + input.environmentTopology.environment,
        "dispatchMode=" + input.environmentTopology.dispatchMode,
        "workerMode=" + mode,
      ],
      health: [
        "configured=" + configured,
        "reachable=" + reachable,
        "localWorkerConfigured=" + input.localWorkerConfigured,
        "runtimeCoordinatorConfigured=" + (input.runtimeCoordinatorHealth?.configured === true),
      ],
    },
  };
}

function buildSettlementProvider(input: ProviderBoundaryInput, checkedAt: number): ProviderProjection {
  const providerMode = input.settlementProvider.adapter;
  const configured = true;
  const reachable = input.settlementHealth.reachable;
  const productionEligible = input.settlementProvider.productionOriented && reachable && !isEphemeralPath(input.persistencePaths.settlementStatePath);
  const readiness = reachable ? "READY" : "UNAVAILABLE";
  const reasonCode = reachable ? undefined : "SETTLEMENT_PROVIDER_UNAVAILABLE";
  const capabilityReadiness = readiness === "READY" ? "READY" : readiness;
  return {
    providerId: "settlement-provider",
    providerType: "settlement",
    providerMode,
    environment: input.environmentTopology.environment,
    scope: "tenant",
    configured,
    reachable,
    capabilities: [
      capability("settlement.execute", "tenant", reachable, capabilityReadiness, reasonCode, [
        "adapter=" + providerMode,
        "productionOriented=" + input.settlementProvider.productionOriented,
      ]),
      capability("settlement.retry", "tenant", reachable, capabilityReadiness, reasonCode, ["adapter=" + providerMode]),
      capability("settlement.receipt", "tenant", reachable, capabilityReadiness, reasonCode, ["adapter=" + providerMode]),
      capability("reconciliation.evidence", "tenant", reachable, capabilityReadiness, reasonCode, ["adapter=" + providerMode]),
    ],
    readiness,
    productionEligible,
    degraded: readiness !== "READY" || !productionEligible,
    ...(reasonCode ? { reasonCode } : {}),
    lastCheckedAt: checkedAt,
    evidence: [
      "adapter=" + providerMode,
      "productionOriented=" + input.settlementProvider.productionOriented,
      "durability=" + input.settlementProvider.durability,
      "multiInstance=" + input.settlementProvider.multiInstance,
    ],
    provenance: {
      configuration: [
        "adapter=" + providerMode,
        "durability=" + input.settlementProvider.durability,
        "multiInstance=" + input.settlementProvider.multiInstance,
      ],
      health: ["reachable=" + reachable],
    },
  };
}

function buildPersistenceProvider(input: ProviderBoundaryInput, checkedAt: number): ProviderProjection {
  const shared = input.sharedStateHealth;
  const providerMode = shared?.adapter ?? (input.administrativeState.durability === "single_node_durable" ? "sqlite" : "memory");
  const configured = shared ? shared.configured : true;
  const reachable = shared ? shared.reachable : input.administrativeState.durability === "single_node_durable";
  const writable = shared ? shared.writable : input.administrativeState.durability === "single_node_durable";
  const schemaCurrent = shared ? shared.schemaCurrent : input.administrativeState.durability === "single_node_durable";
  const productionEligible = Boolean(
    (shared ? shared.configured && reachable && writable && schemaCurrent : input.administrativeState.durability === "single_node_durable")
     && !isEphemeralPath(input.persistencePaths.economicStatePath)
     && !isEphemeralPath(input.persistencePaths.settlementStatePath)
     && !isEphemeralPath(input.persistencePaths.administrativeStatePath)
     && !isEphemeralPath(input.persistencePaths.runtimeStatePath)
     && !isEphemeralPath(input.persistencePaths.rateLimitDatabasePath),
  );
  const readiness = !configured
    ? "NOT_CONFIGURED"
    : !reachable || !writable || !schemaCurrent
      ? "UNAVAILABLE"
      : "READY";
  const reasonCode = !configured
    ? "PERSISTENCE_PROVIDER_NOT_CONFIGURED"
    : !reachable
      ? "PERSISTENCE_PROVIDER_UNAVAILABLE"
      : !writable
        ? "PERSISTENCE_PROVIDER_READ_ONLY"
        : !schemaCurrent
          ? "PERSISTENCE_PROVIDER_SCHEMA_MISMATCH"
          : undefined;
  const capabilityReadiness = readiness === "READY" ? "READY" : readiness;
  const evidence = [
    (shared ? "adapter=" + shared.adapter : "administrativeState=" + input.administrativeState.mode),
    "durability=" + input.administrativeState.durability,
    "economicStore=" + input.economicStore.adapter,
    "settlementProvider=" + input.settlementProvider.adapter,
  ];
  return {
    providerId: "shared-state-provider",
    providerType: "persistence",
    providerMode,
    environment: input.environmentTopology.environment,
    scope: shared ? "global" : "tenant",
    configured,
    reachable,
    capabilities: [
      capability("shared_state.read", shared ? "global" : "tenant", reachable && writable && schemaCurrent, capabilityReadiness, reasonCode, evidence),
      capability("shared_state.write", shared ? "global" : "tenant", reachable && writable && schemaCurrent, capabilityReadiness, reasonCode, evidence),
      capability("transaction", shared ? "global" : "tenant", reachable && writable && schemaCurrent, capabilityReadiness, reasonCode, evidence),
      capability("idempotency", "tenant", reachable && writable, capabilityReadiness, reasonCode, evidence),
      capability("durable_evidence", "tenant", reachable && writable && schemaCurrent, capabilityReadiness, reasonCode, evidence),
    ],
    readiness,
    productionEligible,
    degraded: readiness !== "READY" || !productionEligible,
    ...(reasonCode ? { reasonCode } : {}),
    lastCheckedAt: checkedAt,
    evidence,
    provenance: {
      configuration: evidence,
      health: [
        "configured=" + configured,
        "reachable=" + reachable,
        "writable=" + writable,
        "schemaCurrent=" + schemaCurrent,
      ],
    },
  };
}

function buildSecretProvider(input: ProviderBoundaryInput, checkedAt: number): ProviderProjection {
  const providerMode = input.secretStore.descriptor.provider;
  const configured = providerMode !== "disabled";
  const reachable = input.secretHealth.reachable;
  const productionEligible = input.secretStore.descriptor.productionOriented
    && reachable
    && (input.secretHealth.authenticated === true)
    && (input.secretHealth.secureTransport === true)
    && !isEphemeralPath(input.persistencePaths.secretCatalogPath)
    && providerMode !== "memory";
  const readiness = !configured ? "NOT_CONFIGURED" : reachable ? "READY" : "UNAVAILABLE";
  const reasonCode = !configured ? "SECRET_PROVIDER_NOT_CONFIGURED" : reachable ? undefined : "SECRET_PROVIDER_UNREACHABLE";
  const capabilityReadiness = readiness === "READY" ? "READY" : readiness;
  const credentialPresent = input.secretHealth.authenticated;
  const evidence = [
    "provider=" + providerMode,
    "productionOriented=" + input.secretStore.descriptor.productionOriented,
    "materialStorage=" + input.secretStore.descriptor.materialStorage,
    "metadataDurability=" + input.secretStore.descriptor.metadataDurability,
    "credentialPresent=" + (credentialPresent === true),
  ];
  return {
    providerId: "secret-provider",
    providerType: "secret",
    providerMode,
    environment: input.environmentTopology.environment,
    scope: "tenant",
    configured,
    reachable,
    capabilities: [
      capability("secret.read", "tenant", reachable, capabilityReadiness, reasonCode, evidence),
      capability("secret.write", "tenant", reachable, capabilityReadiness, reasonCode, evidence),
      capability("secret.rotate", "tenant", reachable, capabilityReadiness, reasonCode, evidence),
    ],
    readiness,
    productionEligible,
    degraded: readiness !== "READY" || !productionEligible,
    ...(reasonCode ? { reasonCode } : {}),
    ...(credentialPresent !== undefined ? { credentialPresent } : {}),
    lastCheckedAt: checkedAt,
    evidence,
    provenance: {
      configuration: evidence,
      health: [
        "configured=" + configured,
        "reachable=" + reachable,
        "authenticated=" + (input.secretHealth.authenticated === true),
        "secureTransport=" + (input.secretHealth.secureTransport === true),
      ],
    },
  };
}

function buildTelemetryProvider(input: ProviderBoundaryInput, checkedAt: number): ProviderProjection {
  const providerMode = input.telemetryHealth.state === "disabled" ? "disabled" : input.telemetryHealth.external ? "otlp-http" : "in-memory";
  const configured = input.telemetryHealth.configured;
  const reachable = input.telemetryHealth.reachable;
  const productionEligible = input.telemetryHealth.productionGrade && input.telemetryHealth.external && configured && reachable;
  const readiness = !configured ? "NOT_CONFIGURED" : reachable ? "READY" : "DEGRADED";
  const reasonCode = !configured ? "TELEMETRY_EXPORTER_DISABLED" : reachable ? undefined : "TELEMETRY_EXPORTER_DEGRADED";
  const capabilityReadiness = readiness === "READY" ? "READY" : readiness;
  const evidence = [
    "adapter=" + input.telemetryHealth.adapter,
    "external=" + input.telemetryHealth.external,
    "productionGrade=" + input.telemetryHealth.productionGrade,
    "state=" + input.telemetryHealth.state,
  ];
  return {
    providerId: "telemetry-exporter",
    providerType: "telemetry",
    providerMode,
    environment: input.environmentTopology.environment,
    scope: "global",
    configured,
    reachable,
    capabilities: [
      capability("metrics.export", "global", reachable, capabilityReadiness, reasonCode, evidence),
      capability("traces.export", "global", reachable, capabilityReadiness, reasonCode, evidence),
      capability("logs.export", "global", reachable, capabilityReadiness, reasonCode, evidence),
    ],
    readiness,
    productionEligible,
    degraded: readiness !== "READY" || !productionEligible,
    ...(reasonCode ? { reasonCode } : {}),
    lastCheckedAt: checkedAt,
    evidence,
    provenance: {
      configuration: evidence,
      health: [
        "configured=" + configured,
        "reachable=" + reachable,
        "productionGrade=" + input.telemetryHealth.productionGrade,
      ],
    },
  };
}

function capability(
  capability: string,
  scope: ProviderCapabilityScope,
  available: boolean,
  readiness: ProviderBoundaryReadinessState,
  reasonCode: string | undefined,
  evidence: readonly string[],
): ProviderCapabilityProjection {
  return {
    capability,
    scope,
    available,
    readiness,
    ...(reasonCode ? { reasonCode } : {}),
    evidence,
  };
}

function readinessFromProviders(
  providers: readonly ProviderProjection[],
  providerIds: readonly string[],
  checkedAt: number,
  productionEligibilityOnly = false,
): ProviderBoundaryReadinessDimension {
  const selected = providers.filter((provider) => providerIds.includes(provider.providerId));
  const reasonCodes = selected.flatMap((provider) => provider.reasonCode ? [provider.reasonCode] : []);
  if (!selected.length) return dimension("UNSUPPORTED", checkedAt, ["PROVIDER_BOUNDARY_UNAVAILABLE"]);
  if (selected.some((provider) => provider.readiness === "NOT_CONFIGURED")) return dimension("NOT_CONFIGURED", checkedAt, reasonCodes);
  if (selected.some((provider) => provider.readiness === "UNAVAILABLE")) return dimension("UNAVAILABLE", checkedAt, reasonCodes);
  if (productionEligibilityOnly && selected.some((provider) => !provider.productionEligible)) return dimension("DEGRADED", checkedAt, reasonCodes.length ? reasonCodes : ["PRODUCTION_ELIGIBILITY_REJECTED"]);
  if (selected.some((provider) => provider.readiness === "DEGRADED")) return dimension("DEGRADED", checkedAt, reasonCodes);
  return dimension("READY", checkedAt, reasonCodes);
}

function dimension(status: ProviderBoundaryReadinessState, checkedAt: number, reasonCodes: readonly string[]): ProviderBoundaryReadinessDimension {
  return { status, checkedAt, reasonCodes };
}

function isEphemeralPath(path: string | undefined): boolean {
  if (!path) return false;
  const normalized = path.replace(/\\\\/g, "/").toLowerCase();
  return normalized.includes("/tmp/") || normalized.startsWith("tmp/") || (normalized.startsWith("c:/users/") && normalized.includes("/appdata/local/temp"));
}
