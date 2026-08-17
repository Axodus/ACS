import type { HttpIdentityValidator } from "../http/auth.js";
import type { HttpEdgePolicy } from "../http/edge.js";
import type { SecretStore } from "../intelligence/secret-store.js";
import type { WorkerServiceIdentityValidator } from "../workers/worker-service-auth.js";
import type { OperationalTelemetryProvider } from "./operational-telemetry.js";
import type { SharedStateHealth } from "./shared-state/contracts.js";

export type ManagedProviderClassification =
  | "MOCK_ONLY"
  | "LOCAL_FIXTURE"
  | "EXTERNAL_PROCESS_PROVEN"
  | "EXTERNAL_PROVIDER_PROVEN"
  | "MANAGED_PROVIDER_PROVEN"
  | "HA_PROVEN"
  | "NOT_AVAILABLE";

export type ManagedProviderName =
  | "identity"
  | "workload_identity"
  | "secrets"
  | "rate_limiter"
  | "edge"
  | "telemetry";

export type ManagedProviderReasonCode =
  | "AUTH_PROVIDER_UNREACHABLE"
  | "WORKLOAD_IDENTITY_PROVIDER_UNREACHABLE"
  | "SECRET_PROVIDER_UNREACHABLE"
  | "SECRET_PROVIDER_AUTHENTICATION_FAILED"
  | "RATE_LIMITER_UNAVAILABLE"
  | "TRUSTED_EDGE_UNAVAILABLE"
  | "PROVIDER_SECURE_TRANSPORT_REQUIRED"
  | "TELEMETRY_EXPORTER_DEGRADED";

export interface ManagedProviderStatus {
  readonly name: ManagedProviderName;
  readonly classification: ManagedProviderClassification;
  readonly configured: boolean;
  readonly reachable: boolean;
  readonly authenticated: boolean;
  readonly secureTransport: boolean;
  readonly ready: boolean;
  readonly degraded: boolean;
  readonly reasonCode?: ManagedProviderReasonCode;
  readonly checkedAt: number;
  readonly detail: string;
}

export interface ManagedProviderCompositionHealth {
  readonly profile: "distributed_production";
  readonly ready: boolean;
  readonly degraded: boolean;
  readonly checkedAt: number;
  readonly statuses: readonly ManagedProviderStatus[];
  readonly reasonCodes: readonly ManagedProviderReasonCode[];
}

export interface ManagedEdgeProbeHealth {
  readonly configured: boolean;
  readonly reachable: boolean;
  readonly authenticated: boolean;
  readonly secureTransport: boolean;
  readonly detail: string;
  readonly reasonCode?: ManagedProviderReasonCode;
}

export interface ManagedProviderCompositionOptions {
  readonly identityValidator: HttpIdentityValidator;
  readonly workerIdentityValidator: WorkerServiceIdentityValidator;
  readonly secretStore: SecretStore;
  readonly edgePolicy: HttpEdgePolicy;
  readonly telemetry: OperationalTelemetryProvider;
  readonly sharedStateHealth: () => Promise<SharedStateHealth>;
  readonly edgeProbe: () => Promise<ManagedEdgeProbeHealth>;
  readonly rateLimiterSecureTransport: boolean;
  readonly telemetrySecureTransport: boolean;
  readonly classifications: Readonly<Record<ManagedProviderName, ManagedProviderClassification>>;
}

export class ManagedProviderCompositionError extends Error {
  constructor(readonly findings: readonly string[]) {
    super(`distributed production provider composition is invalid: ${findings.join(", ")}`);
    this.name = "ManagedProviderCompositionError";
  }
}

/**
 * Central composition guard for MH02. This does not replace the G production
 * evaluator; it gives that evaluator and operational diagnostics one shared,
 * provider-specific health source.
 */
export class ManagedProviderComposition {
  readonly profile = "distributed_production" as const;
  readonly #options: ManagedProviderCompositionOptions;

  constructor(options: ManagedProviderCompositionOptions) {
    this.#options = options;
    const findings = validateComposition(options);
    if (findings.length) throw new ManagedProviderCompositionError(findings);
  }

  async health(): Promise<ManagedProviderCompositionHealth> {
    const checkedAt = Date.now();
    const [identity, workload, secrets, edge, sharedState, telemetry, edgeProbe] = await Promise.all([
      this.#options.identityValidator.health().catch(() => ({ configured: true, reachable: false, detail: "identity provider health probe failed" })),
      this.#options.workerIdentityValidator.health().catch(() => ({ configured: true, reachable: false, detail: "workload identity provider health probe failed" })),
      this.#options.secretStore.health().catch(() => ({
        reachable: false,
        authenticated: false,
        secureTransport: false,
        provider: this.#options.secretStore.descriptor.provider,
      })),
      this.#options.edgePolicy.readiness().catch(() => undefined),
      this.#options.sharedStateHealth().catch(() => ({ configured: true, reachable: false, writable: false, schemaCurrent: false, adapter: "shared-state" })),
      this.#options.telemetry.health().catch(() => ({
        configured: true,
        reachable: false,
        productionGrade: this.#options.telemetry.descriptor.productionGrade,
        state: "degraded" as const,
        adapter: this.#options.telemetry.descriptor.adapter,
        external: this.#options.telemetry.descriptor.external,
      })),
      this.#options.edgeProbe().catch(() => ({
        configured: true,
        reachable: false,
        authenticated: false,
        secureTransport: false,
        detail: "trusted edge health probe failed",
        reasonCode: "TRUSTED_EDGE_UNAVAILABLE" as const,
      })),
    ]);

    const identitySecure = this.#options.identityValidator.descriptor.issuer?.startsWith("https://") === true;
    const workloadSecure = this.#options.workerIdentityValidator.descriptor.issuer?.startsWith("https://") === true;
    const identityReady = identity.configured && identity.reachable && identitySecure;
    const workloadReady = workload.configured && workload.reachable && workloadSecure;
    const secretAuthenticated = secrets.authenticated !== false;
    const secretSecure = secrets.secureTransport === true;
    const secretsReady = secrets.reachable && secretAuthenticated && secretSecure;
    const limiterReady = Boolean(
      edge?.rateLimiter.configured
      && edge.rateLimiter.reachable
      && edge.rateLimiter.productionGrade
      && sharedState.reachable
      && sharedState.writable
      && sharedState.schemaCurrent,
    );
    const trustedEdgeReady = edgeProbe.configured
      && edgeProbe.reachable
      && edgeProbe.authenticated
      && edgeProbe.secureTransport
      && Boolean(edge?.proxyTrust.configured && edge.proxyTrust.explicitAllowlist && edge.cors.explicitProductionAllowlist);
    const telemetryReady = telemetry.configured
      && telemetry.reachable
      && telemetry.productionGrade
      && telemetry.external
      && this.#options.telemetrySecureTransport;

    const statuses: ManagedProviderStatus[] = [
      status("identity", this.#options.classifications.identity, identityReady, identity.configured, identity.reachable, true, identitySecure,
        identity.detail, identity.reachable ? "PROVIDER_SECURE_TRANSPORT_REQUIRED" : "AUTH_PROVIDER_UNREACHABLE", checkedAt),
      status("workload_identity", this.#options.classifications.workload_identity, workloadReady, workload.configured, workload.reachable, true, workloadSecure,
        workload.detail, workload.reachable ? "PROVIDER_SECURE_TRANSPORT_REQUIRED" : "WORKLOAD_IDENTITY_PROVIDER_UNREACHABLE", checkedAt),
      status("secrets", this.#options.classifications.secrets, secretsReady, true, secrets.reachable, secretAuthenticated, secretSecure,
        secretsReady ? "external secret provider is reachable and authenticated" : "external secret provider is not ready",
        !secrets.reachable ? "SECRET_PROVIDER_UNREACHABLE" : !secretAuthenticated ? "SECRET_PROVIDER_AUTHENTICATION_FAILED" : "PROVIDER_SECURE_TRANSPORT_REQUIRED", checkedAt),
      status("rate_limiter", this.#options.classifications.rate_limiter, limiterReady, Boolean(edge?.rateLimiter.configured), Boolean(edge?.rateLimiter.reachable), true, this.#options.rateLimiterSecureTransport,
        limiterReady ? "shared rate-limit authority is reachable" : "shared rate-limit authority is unavailable", "RATE_LIMITER_UNAVAILABLE", checkedAt),
      status("edge", this.#options.classifications.edge, trustedEdgeReady, edgeProbe.configured, edgeProbe.reachable, edgeProbe.authenticated, edgeProbe.secureTransport,
        edgeProbe.detail, edgeProbe.reasonCode ?? (edgeProbe.secureTransport ? "TRUSTED_EDGE_UNAVAILABLE" : "PROVIDER_SECURE_TRANSPORT_REQUIRED"), checkedAt),
      status("telemetry", this.#options.classifications.telemetry, telemetryReady, telemetry.configured, telemetry.reachable, true, this.#options.telemetrySecureTransport,
        telemetryReady ? "external OTLP exporter is reachable" : "external OTLP exporter is degraded", telemetry.reachable ? "PROVIDER_SECURE_TRANSPORT_REQUIRED" : "TELEMETRY_EXPORTER_DEGRADED", checkedAt),
    ];
    return {
      profile: this.profile,
      ready: statuses.every((entry) => entry.ready),
      degraded: statuses.some((entry) => entry.degraded),
      checkedAt,
      statuses,
      reasonCodes: statuses.flatMap((entry) => entry.reasonCode ? [entry.reasonCode] : []),
    };
  }
}

function validateComposition(options: ManagedProviderCompositionOptions): string[] {
  const findings: string[] = [];
  if (!options.identityValidator.descriptor.productionOriented || options.identityValidator.descriptor.mode !== "oidc") findings.push("OIDC_IDENTITY_REQUIRED");
  if (!options.workerIdentityValidator.descriptor.productionOriented || options.workerIdentityValidator.descriptor.mode !== "oidc") findings.push("OIDC_WORKLOAD_IDENTITY_REQUIRED");
  if (!options.secretStore.descriptor.productionOriented || options.secretStore.descriptor.materialStorage !== "external_managed") findings.push("EXTERNAL_SECRET_PROVIDER_REQUIRED");
  if (options.secretStore.descriptor.metadataDurability !== "shared_durable" && options.secretStore.descriptor.metadataDurability !== "external_managed") findings.push("SHARED_SECRET_METADATA_REQUIRED");
  if (!options.edgePolicy.rateLimiter.descriptor.productionOriented
    || options.edgePolicy.rateLimiter.descriptor.durability !== "shared_durable"
    || options.edgePolicy.rateLimiter.descriptor.multiInstance !== "shared_database") findings.push("SHARED_RATE_LIMITER_REQUIRED");
  if (options.edgePolicy.profile !== "production") findings.push("PRODUCTION_EDGE_PROFILE_REQUIRED");
  if (!options.telemetry.descriptor.external || !options.telemetry.descriptor.productionGrade) findings.push("EXTERNAL_TELEMETRY_REQUIRED");
  for (const [name, classification] of Object.entries(options.classifications)) {
    if (classification === "MOCK_ONLY" || classification === "LOCAL_FIXTURE" || classification === "NOT_AVAILABLE") {
      findings.push(`${name.toUpperCase()}_EXTERNAL_PROVIDER_REQUIRED`);
    }
  }
  return findings;
}

function status(
  name: ManagedProviderName,
  classification: ManagedProviderClassification,
  ready: boolean,
  configured: boolean,
  reachable: boolean,
  authenticated: boolean,
  secureTransport: boolean,
  detail: string,
  reasonCode: ManagedProviderReasonCode,
  checkedAt: number,
): ManagedProviderStatus {
  return {
    name,
    classification,
    configured,
    reachable,
    authenticated,
    secureTransport,
    ready,
    degraded: !ready,
    ...(!ready ? { reasonCode } : {}),
    checkedAt,
    detail,
  };
}
