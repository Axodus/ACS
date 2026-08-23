import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { AgentEngine } from "../engines/agent-engine.js";
import { EngineRegistry } from "../engines/engine-registry.js";
import { EngineService } from "../engines/engine-service.js";
import { createOpenClawEngineFromManifest } from "../engines/openclaw-bootstrap.js";
import { HttpProductionTargetEngine } from "../engines/http-production-target-engine.js";
import { ExecutionTargetService } from "../targets/execution-target-service.js";
import { resolveEnvironmentTopology } from "../control-plane/environment-topology.js";
import { AgentService, type AgentRepository } from "../control-plane/agent-service.js";
import { SqliteAgentRepository } from "../control-plane/durable-agent-state.js";
import { CompositionResourceService } from "../control-plane/composition-resources.js";
import { DeploymentService, type DeploymentRepository } from "../control-plane/deployment-service.js";
import { SqliteDeploymentRepository } from "../control-plane/durable-deployment-state.js";
import { ProductionDeploymentReadinessEvaluator } from "../control-plane/production-deployment-readiness.js";
import { RuntimeLifecycleService } from "../control-plane/runtime-lifecycle-service.js";
import { AuditService } from "../control-plane/audit-service.js";
import { DurableAdministrativeState } from "../control-plane/durable-administrative-state.js";
import { ExecutionPlanResolver } from "../control-plane/execution-plan-resolver.js";
import {
  EconomicService,
  EconomicAdapterConfigurationError,
  InMemoryEconomicStateStore,
  InMemorySettlementProvider,
  type EconomicStateStore,
  type SettlementProvider,
} from "../control-plane/neurons-economic-contract.js";
import { SqliteEconomicStateStore, SqliteSettlementProvider } from "../control-plane/durable-economic-state.js";
import {
  TenantLifecycleService,
  InMemoryTenantRepository,
  TenantNotFoundError,
  type TenantRepository,
} from "../control-plane/tenant-domain.js";
import {
  InMemoryTenantMembershipRepository,
  TenantMembershipService,
  type AdministrativeAuthority,
  type TenantMembershipRepository,
} from "../control-plane/tenant-membership.js";
import {
  InMemoryTenantGovernanceRepository,
  TenantGovernanceService,
  TenantGovernanceStateNotFoundError,
  type TenantGovernanceRepository,
} from "../control-plane/tenant-governance.js";
import { ModelProviderRegistry } from "../intelligence/model-provider-registry.js";
import { ModelProviderService } from "../intelligence/model-provider-service.js";
import { AgentRunnerRegistry } from "../intelligence/agent-runner-registry.js";
import { AgentRunnerService } from "../intelligence/agent-runner-service.js";
import {
  CredentialConnectionRegistry,
  type CredentialConnectionStore,
} from "../intelligence/credential-registry.js";
import {
  InMemorySecretStore,
  SecretProviderConfigurationError,
  type SecretStore,
} from "../intelligence/secret-store.js";
import {
  SqliteSecretCatalog,
  VaultSecretProvider,
  type SecretMetadataStore,
  type VaultSecretTransport,
} from "../intelligence/vault-secret-provider.js";
import { RegistryBackedCredentialProvider } from "../intelligence/credential-provider.js";
import { AxodusManagedModelProvider } from "../intelligence/axodus-managed-provider.js";
import { StaticAxodusModelGateway } from "../intelligence/axodus-model-gateway.js";
import { OpenAiByokModelProvider } from "../intelligence/openai-byok-provider.js";
import { FetchProviderHttpTransport } from "../intelligence/byok-http-transport.js";
import { OpenCodeRunner } from "../intelligence/opencode-runner.js";
import { FetchOpenCodeTransport } from "../intelligence/opencode-transport.js";
import { ExecutionWorkerRegistry } from "../workers/worker-registry.js";
import { WorkerAssignmentService } from "../workers/worker-assignment-service.js";
import { LocalExecutionWorker } from "../workers/local-worker.js";
import {
  DurableRuntimeCoordinator,
  RuntimeRecoveryCoordinator,
  SqliteDurableRuntimeState,
} from "../workers/durable-runtime-state.js";
import {
  DevelopmentWorkerIdentityValidator,
  SignedWorkerIdentityValidator,
  WorkerIdentityConfigurationError,
  type WorkerServiceIdentityValidator,
} from "../workers/worker-service-auth.js";
import type { BillingPolicy } from "../control-plane/neurons-economic-contract.js";
import type { AgentDefinition } from "../control-plane/unified-agent-model.js";
import {
  normalizeIsolationRoots,
  normalizeIsolationScope,
  type ControlPlaneIsolation,
  type IsolationRoots,
  type IsolationScope,
} from "../control-plane/isolation.js";
import {
  DevelopmentHeaderIdentityValidator,
  HttpIdentityConfigurationError,
  OidcJwtIdentityValidator,
  type HttpIdentityValidator,
  type JwksProvider,
} from "./auth.js";
import {
  FixedWindowRateLimiter,
  InMemoryRateLimitStore,
  RateLimitConfigurationError,
  SqliteRateLimitStore,
  type RateLimiter,
} from "./rate-limit.js";
import { HttpEdgePolicy } from "./edge.js";
import {
  assertProductionTelemetryConfiguration,
  createOperationalTelemetryFromEnvironment,
  type OperationalTelemetryProvider,
} from "../control-plane/operational-telemetry.js";
import { OperationalDiagnosticsService } from "../control-plane/operational-diagnostics.js";
import {
  AccountIdentityService,
  InMemoryAccountIdentityStore,
  type AccountIdentityStore,
} from "../control-plane/account-identity.js";
import { LazyPostgresAccountIdentityStore } from "../control-plane/shared-state/lazy-postgres-account-identity-store.js";
import { SiwxSessionIdentityValidator } from "./siwx-session-auth.js";
import {
  UnavailableSiwxArtifactVerifier,
  type SiwxAuthenticatedArtifactVerifier,
} from "./siwx-artifact.js";
import { ViemSiwxArtifactVerifier } from "./viem-siwx-artifact-verifier.js";
import { resolveSiwxRpcUrls } from "./siwx-rpc-configuration.js";

export interface ControlPlaneContext {
  readonly engineRegistry: EngineRegistry;
  readonly engineService: EngineService;
  readonly targetService: ExecutionTargetService;
  readonly agentService: AgentService;
  readonly compositionResources: CompositionResourceService;
  readonly deploymentService: DeploymentService;
  readonly runtimeService: RuntimeLifecycleService;
  readonly auditService: AuditService;
  readonly tenantRepository: TenantRepository;
  readonly tenantMembershipRepository: TenantMembershipRepository;
  readonly tenantGovernanceRepository: TenantGovernanceRepository;
  readonly tenantService: TenantLifecycleService;
  readonly tenantMembershipService: TenantMembershipService;
  readonly tenantGovernanceService: TenantGovernanceService;
  readonly accountIdentity: AccountIdentityService;
  readonly siwxArtifactVerifier: SiwxAuthenticatedArtifactVerifier;
  readonly providerService: ModelProviderService;
  readonly runnerService: AgentRunnerService;
  readonly credentials: CredentialConnectionRegistry;
  readonly secretStore: SecretStore;
  readonly economicService: EconomicService;
  readonly workerRegistry: ExecutionWorkerRegistry;
  readonly workerAssignmentService: WorkerAssignmentService;
  readonly localWorker: LocalExecutionWorker | null;
  readonly runtimeCoordinator: DurableRuntimeCoordinator | null;
  readonly runtimeRecoveryCoordinator: RuntimeRecoveryCoordinator | null;
  readonly workerIdentityValidator: WorkerServiceIdentityValidator;
  readonly environmentTopology: ReturnType<typeof resolveEnvironmentTopology>;
  readonly runtimeMode: "local" | "remote";
  readonly identityValidator: HttpIdentityValidator;
  readonly rateLimiter: RateLimiter;
  readonly edgePolicy: HttpEdgePolicy;
  readonly telemetry: OperationalTelemetryProvider;
  readonly operationalDiagnostics: OperationalDiagnosticsService;
  readonly productionDeploymentReadiness: ProductionDeploymentReadinessEvaluator;
  readonly isolation: ControlPlaneIsolation;
  readonly administrativeState: {
    readonly mode: "memory" | "filesystem";
    readonly durability: "process_local" | "single_node_durable";
    readonly filePath?: string;
    readonly multiInstance: "not_applicable" | "not_proven";
  };
  readonly productionAdapters: {
    readonly profile: "development" | "production";
    readonly secretProvider: SecretStore["descriptor"];
    readonly economicStore: EconomicStateStore["descriptor"];
    readonly settlementProvider: SettlementProvider["descriptor"];
    readonly identityValidator: HttpIdentityValidator["descriptor"];
    readonly rateLimiter: RateLimiter["descriptor"];
    readonly runtime: {
      readonly mode: "local" | "remote";
      readonly adapter: string;
      readonly productionOriented: boolean;
      readonly multiInstance: "not_applicable" | "shared_database";
      readonly multiHost: "not_applicable" | "not_proven";
    };
    readonly workerIdentity: WorkerServiceIdentityValidator["descriptor"];
    readonly telemetry: {
      readonly adapter: string;
      readonly external: boolean;
      readonly productionOriented: boolean;
    };
    readonly agentState: {
      readonly adapter: string;
      readonly productionOriented: boolean;
      readonly multiInstance: string;
      readonly multiHost: string;
    };
    readonly deploymentState: DeploymentRepository["descriptor"];
    readonly deploymentTarget: {
      readonly adapter: string;
      readonly productionOriented: boolean;
      readonly topology: "production_like_single_host" | "development_local";
      readonly multiHost: "not_proven" | "not_applicable";
    };
  };
  close(): Promise<void>;
}

/**
 * DEV-only pricing policy. Prices are expressed in integer $Neurons base
 * units and are NOT final pricing. This policy is explicit so that governed
 * sandbox flows can quote/reserve/settle deterministically without any real
 * economic infrastructure.
 */
const DEV_BILLING_POLICY: BillingPolicy = {
  policyId: "policy_dev_epic10",
  revision: 1,
  pricing: {
    "llm.inference": 0n,
    "agent.runtime": 0n,
    compute: 0n,
    memory: 0n,
    storage: 0n,
    tools: 0n,
    network: 0n,
    "premium.capability": 0n,
    "scheduled.execution": 0n,
    "autonomous.duration": 0n,
  },
};

export interface ControlPlaneContextOptions {
  readonly acsRoot?: string;
  readonly engine?: AgentEngine;
  readonly deploymentEngine?: "openclaw" | "production-http";
  readonly productionTargetUrl?: string;
  readonly productionTargetToken?: string;
  readonly productionTargetTimeoutMs?: number;
  readonly runtimeRoot?: string;
  readonly stateRoot?: string;
  readonly configRoot?: string;
  readonly artifactsRoot?: string;
  readonly workspaceRoot?: string;
  readonly tenantId?: string;
  readonly workloadId?: string;
  readonly pythonCommand?: string;
  readonly timeoutMs?: number;
  readonly startLocalWorker?: boolean;
  readonly runtimeMode?: "local" | "remote";
  readonly useDurableRuntimeState?: boolean;
  readonly runtimeStatePath?: string;
  readonly runtimeCoordinator?: DurableRuntimeCoordinator;
  readonly runtimeLeaseTtlMs?: number;
  readonly runtimeWorkerStaleAfterMs?: number;
  readonly runtimeRecoveryScanIntervalMs?: number;
  readonly workerIdentityValidator?: WorkerServiceIdentityValidator;
  readonly workerAuthMode?: "development" | "signed_jwt";
  readonly workerTokenIssuer?: string;
  readonly workerTokenAudience?: string;
  readonly workerTokenSigningKey?: string;
  readonly useDurableAdministrativeState?: boolean;
  readonly administrativeStatePath?: string;
  readonly agentRepository?: AgentRepository;
  readonly useDurableAgentState?: boolean;
  readonly agentStatePath?: string;
  readonly deploymentRepository?: DeploymentRepository;
  readonly useDurableDeploymentState?: boolean;
  readonly deploymentStatePath?: string;
  readonly adapterProfile?: "development" | "production";
  readonly secretProvider?: "memory" | "vault";
  readonly secretStore?: SecretStore;
  readonly secretMetadataStore?: SecretMetadataStore;
  readonly credentialConnectionStore?: CredentialConnectionStore;
  readonly useDurableSecretCatalog?: boolean;
  readonly secretCatalogPath?: string;
  readonly vaultTransport?: VaultSecretTransport;
  readonly vaultAddress?: string;
  readonly vaultToken?: string;
  readonly vaultNamespace?: string;
  readonly vaultMount?: string;
  readonly economicStateStore?: EconomicStateStore;
  readonly settlementProvider?: SettlementProvider;
  readonly useDurableEconomicState?: boolean;
  readonly economicStatePath?: string;
  readonly identityValidator?: HttpIdentityValidator;
  readonly authMode?: "development" | "oidc" | "siwx";
  readonly accountIdentityStore?: AccountIdentityStore;
  readonly accountIdentityService?: AccountIdentityService;
  readonly siwxArtifactVerifier?: SiwxAuthenticatedArtifactVerifier;
  readonly siwxVerifierEnabled?: boolean;
  readonly siwxAllowedOrigins?: readonly string[];
  readonly siwxRpcUrls?: Readonly<Record<number, string | undefined>>;
  readonly siwxRpcTimeoutMs?: number;
  readonly accountSessionTtlMs?: number;
  readonly siwxNonceTtlMs?: number;
  readonly oidcIssuer?: string;
  readonly oidcAudience?: string;
  readonly oidcJwksUri?: string;
  readonly oidcJwksProvider?: JwksProvider;
  readonly oidcTenantClaim?: string;
  readonly oidcPlatformAdminClaim?: string;
  readonly oidcPlatformAdminValue?: string;
  readonly rateLimiter?: RateLimiter;
  readonly rateLimitProvider?: "memory" | "sqlite";
  readonly useDurableRateLimitStore?: boolean;
  readonly rateLimitDatabasePath?: string;
  readonly rateLimitWindowMs?: number;
  readonly publicRequestsPerWindow?: number;
  readonly authenticatedReadsPerWindow?: number;
  readonly administrativeMutationsPerWindow?: number;
  readonly executionStartsPerWindow?: number;
  readonly systemAdminRequestsPerWindow?: number;
  readonly runtimeWorkerRequestsPerWindow?: number;
  readonly allowedOrigins?: readonly string[];
  readonly trustedProxyCidrs?: readonly string[];
  readonly maxBodyBytes?: number;
  readonly maxHeaderBytes?: number;
  readonly maxHeadersCount?: number;
  readonly headersTimeoutMs?: number;
  readonly requestTimeoutMs?: number;
  readonly keepAliveTimeoutMs?: number;
  readonly maxRequestsPerSocket?: number;
  readonly enableHsts?: boolean;
  readonly telemetry?: OperationalTelemetryProvider;
  readonly telemetryEnvironment?: NodeJS.ProcessEnv;
  readonly telemetryServiceName?: string;
  readonly dependencyCheckTimeoutMs?: number;
  readonly dependencyCacheTtlMs?: number;
}

function resolveDefaultOperationalRoots(options: ControlPlaneContextOptions): {
  acsRoot: string;
  runtimeRoot: string;
  stateRoot: string;
  configRoot: string;
  artifactsRoot: string;
  workspaceRoot: string;
} {
  const acsRoot = options.acsRoot ?? process.env.ACS_ROOT ?? process.cwd();
  const runtimeRoot = options.runtimeRoot ?? process.env.ACS_RUNTIME_ROOT ?? join(homedir(), ".openclaw");
  return {
    acsRoot,
    runtimeRoot,
    stateRoot: options.stateRoot ?? process.env.ACS_STATE_ROOT ?? join(runtimeRoot, ".acs", "state"),
    configRoot: options.configRoot ?? process.env.ACS_CONFIG_ROOT ?? join(runtimeRoot, ".acs", "config"),
    artifactsRoot: options.artifactsRoot ?? process.env.ACS_ARTIFACTS_ROOT ?? join(runtimeRoot, ".acs", "artifacts"),
    workspaceRoot: options.workspaceRoot ?? process.env.ACS_WORKSPACE_ROOT ?? join(runtimeRoot, ".acs", "workspace"),
  };
}

export function createControlPlaneContext(options: ControlPlaneContextOptions = {}): ControlPlaneContext {
  const defaultRoots = resolveDefaultOperationalRoots(options);
  const roots = normalizeIsolationRoots({
    sourceRoot: resolve(defaultRoots.acsRoot, "engines", "agentsai"),
    runtimeRoot: defaultRoots.runtimeRoot,
    stateRoot: defaultRoots.stateRoot,
    configRoot: defaultRoots.configRoot,
    artifactsRoot: defaultRoots.artifactsRoot,
    workspaceRoot: defaultRoots.workspaceRoot,
  });
  const isolation: ControlPlaneIsolation = {
    scope: normalizeIsolationScope({
      tenantId: options.tenantId ?? "tenant-dev",
      workloadId: options.workloadId ?? "workload-dev",
    }),
    roots,
  };
  const environmentTopology = resolveEnvironmentTopology(process.env);
  const adapterProfile = options.adapterProfile ?? environmentTopology.adapterProfile;
  const deploymentEngine = options.deploymentEngine ?? process.env.ACS_DEPLOYMENT_ENGINE ?? "openclaw";
  if (deploymentEngine !== "openclaw" && deploymentEngine !== "production-http") {
    throw new Error("ACS_DEPLOYMENT_ENGINE must be openclaw or production-http");
  }
  const engineRegistry = new EngineRegistry();
  const engine = options.engine ?? (deploymentEngine === "production-http"
    ? new HttpProductionTargetEngine({
        baseUrl: options.productionTargetUrl ?? process.env.ACS_PRODUCTION_TARGET_URL ?? "",
        token: options.productionTargetToken ?? process.env.ACS_PRODUCTION_TARGET_TOKEN ?? "",
        requestTimeoutMs: options.productionTargetTimeoutMs ?? readPositiveEnvironmentInteger("ACS_PRODUCTION_TARGET_TIMEOUT_MS"),
      })
    : createOpenClawEngineFromManifest({
        acsRoot: defaultRoots.acsRoot,
        runtimeRoot: roots.runtimeRoot,
        stateRoot: roots.stateRoot,
        configRoot: roots.configRoot,
        artifactsRoot: roots.artifactsRoot,
        workspaceRoot: roots.workspaceRoot,
        ...(options.pythonCommand !== undefined ? { pythonCommand: options.pythonCommand } : {}),
        ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      }));
  engineRegistry.register(engine);

  const targetService = new ExecutionTargetService(engineRegistry);
  const telemetry = options.telemetry ?? createOperationalTelemetryFromEnvironment({
    environment: options.telemetryEnvironment ?? process.env,
    serviceName: options.telemetryServiceName ?? "acs-control-plane",
  });
  const configuredRateLimitProvider = options.rateLimitProvider ?? process.env.ACS_RATE_LIMIT_PROVIDER;
  if (configuredRateLimitProvider !== undefined
    && configuredRateLimitProvider !== "memory"
    && configuredRateLimitProvider !== "sqlite") {
    throw new RateLimitConfigurationError("ACS_RATE_LIMIT_PROVIDER must be memory or sqlite");
  }
  const rateLimitProvider = configuredRateLimitProvider
    ?? (options.useDurableRateLimitStore === true || adapterProfile === "production" ? "sqlite" : "memory");
  const rateLimitDatabasePath = options.rateLimitDatabasePath
    ?? process.env.ACS_RATE_LIMIT_DATABASE_PATH
    ?? join(roots.stateRoot, "control-plane", "http-rate-limit.sqlite");
  const sqliteRateLimitStore = !options.rateLimiter && rateLimitProvider === "sqlite"
    ? new SqliteRateLimitStore({ filePath: rateLimitDatabasePath })
    : undefined;
  const rateLimiter = options.rateLimiter ?? new FixedWindowRateLimiter(
    sqliteRateLimitStore ?? new InMemoryRateLimitStore(),
  );
  const edgePolicy = new HttpEdgePolicy({
    profile: adapterProfile,
    rateLimiter,
    allowedOrigins: options.allowedOrigins ?? splitEnvironmentList(process.env.ACS_ALLOWED_ORIGINS),
    trustedProxyCidrs: options.trustedProxyCidrs ?? splitEnvironmentList(process.env.ACS_TRUSTED_PROXY_CIDRS),
    rateLimitWindowMs: options.rateLimitWindowMs ?? readPositiveEnvironmentInteger("ACS_RATE_LIMIT_WINDOW_MS"),
    publicRequestsPerWindow: options.publicRequestsPerWindow ?? readPositiveEnvironmentInteger("ACS_RATE_LIMIT_PUBLIC_PER_WINDOW"),
    authenticatedReadsPerWindow: options.authenticatedReadsPerWindow ?? readPositiveEnvironmentInteger("ACS_RATE_LIMIT_PRINCIPAL_PER_WINDOW"),
    administrativeMutationsPerWindow: options.administrativeMutationsPerWindow ?? readPositiveEnvironmentInteger("ACS_RATE_LIMIT_ADMIN_MUTATION_PER_WINDOW"),
    executionStartsPerWindow: options.executionStartsPerWindow ?? readPositiveEnvironmentInteger("ACS_RATE_LIMIT_EXECUTION_START_PER_WINDOW"),
    systemAdminRequestsPerWindow: options.systemAdminRequestsPerWindow ?? readPositiveEnvironmentInteger("ACS_RATE_LIMIT_SYSTEM_ADMIN_PER_WINDOW"),
    runtimeWorkerRequestsPerWindow: options.runtimeWorkerRequestsPerWindow ?? readPositiveEnvironmentInteger("ACS_RATE_LIMIT_RUNTIME_WORKER_PER_WINDOW"),
    maxBodyBytes: options.maxBodyBytes ?? readPositiveEnvironmentInteger("ACS_HTTP_MAX_BODY_BYTES"),
    maxHeaderBytes: options.maxHeaderBytes ?? readPositiveEnvironmentInteger("ACS_HTTP_MAX_HEADER_BYTES"),
    maxHeadersCount: options.maxHeadersCount ?? readPositiveEnvironmentInteger("ACS_HTTP_MAX_HEADERS_COUNT"),
    headersTimeoutMs: options.headersTimeoutMs ?? readPositiveEnvironmentInteger("ACS_HTTP_HEADERS_TIMEOUT_MS"),
    requestTimeoutMs: options.requestTimeoutMs ?? readPositiveEnvironmentInteger("ACS_HTTP_REQUEST_TIMEOUT_MS"),
    keepAliveTimeoutMs: options.keepAliveTimeoutMs ?? readPositiveEnvironmentInteger("ACS_HTTP_KEEP_ALIVE_TIMEOUT_MS"),
    maxRequestsPerSocket: options.maxRequestsPerSocket ?? readPositiveEnvironmentInteger("ACS_HTTP_MAX_REQUESTS_PER_SOCKET"),
    enableHsts: options.enableHsts ?? process.env.ACS_HTTP_HSTS === "true",
  });
  const compositionResources = new CompositionResourceService();
  const useDurableAdministrativeState = options.useDurableAdministrativeState === true
    || options.administrativeStatePath !== undefined;
  const administrativeStatePath = options.administrativeStatePath
    ?? join(roots.stateRoot, "control-plane", "administrative-state.json");
  const durableAdministrativeState = useDurableAdministrativeState
    ? new DurableAdministrativeState({ filePath: administrativeStatePath })
    : undefined;
  const auditService = new AuditService({ store: durableAdministrativeState?.auditStore });

  const selectedSecretProvider = options.secretProvider
    ?? (process.env.ACS_SECRET_PROVIDER === "vault" ? "vault" : "memory");
  const useDurableSecretCatalog = options.useDurableSecretCatalog === true
    || options.secretCatalogPath !== undefined
    || selectedSecretProvider === "vault";
  const secretCatalogPath = options.secretCatalogPath
    ?? process.env.ACS_SECRET_CATALOG_PATH
    ?? join(roots.stateRoot, "control-plane", "secret-catalog.sqlite");
  const sqliteSecretCatalog = useDurableSecretCatalog
    ? new SqliteSecretCatalog({ filePath: secretCatalogPath })
    : undefined;
  const secretMetadataStore = options.secretMetadataStore ?? sqliteSecretCatalog;
  const secretStore = options.secretStore ?? (selectedSecretProvider === "vault"
    ? new VaultSecretProvider({
        metadataStore: secretMetadataStore ?? (() => { throw new SecretProviderConfigurationError("durable secret metadata store is required for Vault"); })(),
        ...(options.vaultTransport ? { transport: options.vaultTransport } : {}),
        baseUrl: options.vaultAddress ?? process.env.ACS_VAULT_ADDR,
        token: options.vaultToken ?? process.env.ACS_VAULT_TOKEN,
        namespace: options.vaultNamespace ?? process.env.ACS_VAULT_NAMESPACE,
        mount: options.vaultMount ?? process.env.ACS_VAULT_MOUNT,
        auditService,
      })
    : new InMemorySecretStore());
  if (adapterProfile === "production" && !secretStore.descriptor.productionOriented) {
    throw new SecretProviderConfigurationError(
      "production mode requires a production-oriented secret provider; memory/filesystem fallback is disabled",
    );
  }

  const credentials = new CredentialConnectionRegistry({
    store: options.credentialConnectionStore ?? sqliteSecretCatalog,
  });
  const credentialProvider = new RegistryBackedCredentialProvider({ connections: credentials, secretStore });

  if (!credentials.list().some((connection) => connection.id === "cred_dev_axodus_managed")) {
    credentials.register({
      id: "cred_dev_axodus_managed",
      providerId: "axodus",
      type: "managed",
      status: "configured",
      owner: { userId: "system" },
      scopes: ["model:inference"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  if (!credentials.list().some((connection) => connection.id === "cred_dev_openai_byok")) {
    credentials.register({
      id: "cred_dev_openai_byok",
      providerId: "openai",
      type: "api-key",
      status: "pending",
      owner: { userId: "dev-operator" },
      scopes: ["model:inference"],
      metadata: { note: "DEV placeholder; configure a real API key through the secret store" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  const modelProviderRegistry = new ModelProviderRegistry();
  modelProviderRegistry.register(new AxodusManagedModelProvider({
    gateway: new StaticAxodusModelGateway({
      models: [
        {
          modelId: "axodus-multi",
          displayName: "Axodus Multi",
          availability: "available",
          capabilities: {
            supports: ["text", "reasoning", "tool-use", "structured-output"],
            inputModalities: ["text"],
            outputModalities: ["text"],
            toolUse: true,
            reasoning: true,
            coding: true,
            streaming: true,
            structuredOutput: true,
            vision: false,
          },
          metadata: { contextWindow: 128000 },
        },
        {
          modelId: "axodus-reason",
          displayName: "Axodus Reasoning",
          availability: "preview",
          capabilities: {
            supports: ["text", "reasoning", "tool-use"],
            inputModalities: ["text"],
            outputModalities: ["text"],
            toolUse: true,
            reasoning: true,
            coding: true,
            streaming: true,
            structuredOutput: false,
            vision: false,
          },
          metadata: { contextWindow: 200000 },
        },
        {
          modelId: "axodus-fast",
          displayName: "Axodus Fast",
          availability: "available",
          capabilities: {
            supports: ["text", "streaming"],
            inputModalities: ["text"],
            outputModalities: ["text"],
            toolUse: false,
            reasoning: false,
            coding: false,
            streaming: true,
            structuredOutput: false,
            vision: false,
          },
          metadata: { contextWindow: 32000 },
        },
      ],
    }),
    managedConnection: credentials.get("cred_dev_axodus_managed"),
  }));
  modelProviderRegistry.register(new OpenAiByokModelProvider({
    transport: new FetchProviderHttpTransport(),
    credentialProvider,
    secretStore,
    connectionId: "cred_dev_openai_byok",
    catalog: [
      {
        modelId: "gpt-5.5",
        displayName: "GPT-5.5",
        availability: "preview",
        capabilities: {
          supports: ["text", "reasoning", "tool-use", "structured-output"],
          inputModalities: ["text"],
          outputModalities: ["text"],
          toolUse: true,
          reasoning: true,
          coding: true,
          streaming: true,
          structuredOutput: true,
          vision: false,
        },
      },
    ],
  }));

  const runnerRegistry = new AgentRunnerRegistry();
  runnerRegistry.register(new OpenCodeRunner({
    endpoint: process.env.ACS_OPENCODE_ENDPOINT ?? "http://127.0.0.1:4096",
    transport: new FetchOpenCodeTransport(process.env.ACS_OPENCODE_ENDPOINT ?? "http://127.0.0.1:4096"),
  }));

  const tenantRepository = durableAdministrativeState?.tenantRepository ?? new InMemoryTenantRepository();
  const tenantMembershipRepository = durableAdministrativeState?.membershipRepository
    ?? new InMemoryTenantMembershipRepository();
  const tenantGovernanceRepository = durableAdministrativeState?.governanceRepository
    ?? new InMemoryTenantGovernanceRepository();
  const tenantService = new TenantLifecycleService({ repository: tenantRepository, auditService });
  const tenantMembershipService = new TenantMembershipService({
    tenantRepository,
    repository: tenantMembershipRepository,
    auditService,
  });
  const tenantGovernanceService = new TenantGovernanceService({
    tenantRepository,
    membershipService: tenantMembershipService,
    repository: tenantGovernanceRepository,
    auditService,
  });

  const bootstrapTenantId = isolation.scope.tenantId;
  const bootstrapAt = Date.now();
  const bootstrapAuthority: AdministrativeAuthority = { kind: "platform_admin", principalId: "system" };

  let bootstrapTenant;
  try {
    bootstrapTenant = tenantService.getTenant(bootstrapTenantId);
  } catch (error) {
    if (!(error instanceof TenantNotFoundError)) throw error;
    bootstrapTenant = tenantService.createTenant({
      tenantId: bootstrapTenantId,
      displayName: "DEV Tenant",
      createdBy: "system",
      actor: "system",
      reason: "dev bootstrap tenant",
      at: bootstrapAt,
    }).tenant;
  }

  if (bootstrapTenant.status === "provisioning" && tenantMembershipService.listMemberships(bootstrapTenantId).length === 0) {
    tenantMembershipService.bootstrapTenantOwner({
      tenantId: bootstrapTenantId,
      principalId: "dev-operator",
      authority: bootstrapAuthority,
      actor: "system",
      reason: "dev bootstrap owner",
      at: bootstrapAt + 1,
    });
  }

  try {
    tenantGovernanceRepository.get(bootstrapTenantId);
  } catch (error) {
    if (!(error instanceof TenantGovernanceStateNotFoundError)) throw error;
    tenantGovernanceService.replacePolicy({
      tenantId: bootstrapTenantId,
      authority: bootstrapAuthority,
      policyId: "policy_dev_epic15",
      defaultEffect: "deny",
      rules: [
        { ruleId: "allow_agent_create", action: "agent.create", effect: "allow", priority: 100, reason: "dev bootstrap allow" },
        { ruleId: "allow_agent_configure", action: "agent.configure", effect: "allow", priority: 100, reason: "dev bootstrap allow" },
        { ruleId: "allow_deployment_create", action: "deployment.create", effect: "allow", priority: 100, reason: "dev bootstrap allow" },
        { ruleId: "allow_execution_start", action: "execution.start", effect: "allow", priority: 100, reason: "dev bootstrap allow" },
      ],
      actor: "system",
      reason: "dev bootstrap policy",
      at: bootstrapAt + 2,
    });
  }

  if (bootstrapTenant.status === "provisioning") {
    bootstrapTenant = tenantService.activateTenant(bootstrapTenantId, {
      actor: "system",
      reason: "dev bootstrap tenant",
      at: bootstrapAt + 3,
    }).tenant;
  }

  const useDurableAgentState = options.useDurableAgentState === true
    || options.agentStatePath !== undefined
    || process.env.ACS_AGENT_STORE === "sqlite"
    || adapterProfile === "production";
  const agentStatePath = options.agentStatePath
    ?? process.env.ACS_AGENT_DATABASE_PATH
    ?? join(roots.stateRoot, "control-plane", "agent-state.sqlite");
  const sqliteAgentRepository = !options.agentRepository && useDurableAgentState
    ? new SqliteAgentRepository({ filePath: agentStatePath })
    : undefined;
  const agentRepository = options.agentRepository ?? sqliteAgentRepository;
  const agentService = new AgentService({
    ...(agentRepository ? { repository: agentRepository } : {}),
    providers: modelProviderRegistry,
    credentials,
    runners: runnerRegistry,
    resources: compositionResources,
  });

  // DEV-only fixture agent for Product API integration
  const devAgentDefinition: AgentDefinition = {
    agentId: "dev-agent-sandbox",
    name: "DEV Sandbox Agent",
    status: "draft",
    capabilityIds: ["deployment.sandbox"],
    skillIds: [],
    toolIds: [],
    credentialConnectionIds: ["cred_dev_axodus_managed"],
    runnerPreferences: [],
    modelStrategy: { primary: { providerId: "axodus", modelId: "axodus-multi" }, fallbacks: [] },
  };
  if (!agentService.list().some((agent) => agent.agentId === devAgentDefinition.agentId)) {
    agentService.create({ definition: devAgentDefinition, createdAt: Date.now() });
  }

  const useDurableEconomicState = options.useDurableEconomicState === true
    || options.economicStatePath !== undefined
    || process.env.ACS_ECONOMIC_STORE === "sqlite"
    || process.env.ACS_SETTLEMENT_PROVIDER === "sqlite"
    || adapterProfile === "production";
  const economicStatePath = options.economicStatePath
    ?? process.env.ACS_ECONOMIC_DATABASE_PATH
    ?? join(roots.stateRoot, "control-plane", "economic-state.sqlite");
  const sqliteEconomicStore = !options.economicStateStore && useDurableEconomicState
    ? new SqliteEconomicStateStore({ filePath: economicStatePath })
    : undefined;
  const sqliteSettlementProvider = !options.settlementProvider && useDurableEconomicState
    ? new SqliteSettlementProvider({ filePath: economicStatePath })
    : undefined;
  const economicStateStore = options.economicStateStore
    ?? sqliteEconomicStore
    ?? new InMemoryEconomicStateStore();
  const settlementProvider = options.settlementProvider
    ?? sqliteSettlementProvider
    ?? new InMemorySettlementProvider();
  if (adapterProfile === "production"
    && (!economicStateStore.descriptor.productionOriented || !settlementProvider.descriptor.productionOriented)) {
    throw new EconomicAdapterConfigurationError(
      "production mode requires durable economic state and settlement providers; in-memory fallback is disabled",
    );
  }
  const configuredAuthMode = options.authMode ?? process.env.ACS_AUTH_MODE;
  if (configuredAuthMode !== undefined
    && configuredAuthMode !== "development"
    && configuredAuthMode !== "oidc"
    && configuredAuthMode !== "siwx") {
    throw new HttpIdentityConfigurationError("ACS_AUTH_MODE must be development, oidc, or siwx");
  }
  const authMode = configuredAuthMode ?? "development";
  const accountIdentity = options.accountIdentityService ?? new AccountIdentityService({
    store: options.accountIdentityStore ?? (authMode === "siwx" && environmentTopology.environment !== "local"
      ? new LazyPostgresAccountIdentityStore({
          connectionString: process.env.ACS_SHARED_DATABASE_URL
            ?? (() => { throw new HttpIdentityConfigurationError("ACS_SHARED_DATABASE_URL is required for SIWX outside LOCAL"); })(),
          tls: process.env.ACS_SHARED_DATABASE_TLS !== "false",
        })
      : new InMemoryAccountIdentityStore()),
    sessionTtlMs: options.accountSessionTtlMs,
    nonceTtlMs: options.siwxNonceTtlMs,
  });
  const siwxVerifierEnabled = options.siwxVerifierEnabled ?? process.env.ACS_SIWX_VERIFIER_ENABLED === "true";
  const siwxRpcUrls = options.siwxRpcUrls ?? resolveSiwxRpcUrls(process.env);
  const siwxArtifactVerifier = options.siwxArtifactVerifier
    ?? (authMode === "siwx" && siwxVerifierEnabled
      ? new ViemSiwxArtifactVerifier({
          accountIdentity,
          allowedOrigins: options.siwxAllowedOrigins ?? splitEnvironmentList(process.env.ACS_SIWX_ALLOWED_ORIGINS) ?? [],
          chains: [
            ...(siwxRpcUrls[84532]
              ? [{ chainId: 84532, name: "Base Sepolia", rpcUrl: siwxRpcUrls[84532] }]
              : []),
            ...(siwxRpcUrls[11155111]
              ? [{ chainId: 11155111, name: "Ethereum Sepolia", rpcUrl: siwxRpcUrls[11155111] }]
              : []),
          ],
          rpcTimeoutMs: options.siwxRpcTimeoutMs ?? readPositiveEnvironmentInteger("ACS_SIWX_RPC_TIMEOUT_MS"),
          productionOriented: false,
        })
      : new UnavailableSiwxArtifactVerifier());
  const identityValidator = options.identityValidator ?? (authMode === "oidc"
    ? new OidcJwtIdentityValidator({
        issuer: options.oidcIssuer ?? process.env.ACS_OIDC_ISSUER ?? "",
        audience: options.oidcAudience ?? process.env.ACS_OIDC_AUDIENCE ?? "",
        jwksUri: options.oidcJwksUri ?? process.env.ACS_OIDC_JWKS_URI,
        jwksProvider: options.oidcJwksProvider,
        tenantClaim: options.oidcTenantClaim ?? process.env.ACS_OIDC_TENANT_CLAIM,
        platformAdminClaim: options.oidcPlatformAdminClaim ?? process.env.ACS_OIDC_PLATFORM_ADMIN_CLAIM,
        platformAdminValue: options.oidcPlatformAdminValue ?? process.env.ACS_OIDC_PLATFORM_ADMIN_VALUE,
      })
    : authMode === "siwx"
      ? new SiwxSessionIdentityValidator(accountIdentity)
      : new DevelopmentHeaderIdentityValidator());
  if (adapterProfile === "production" && !identityValidator.descriptor.productionOriented) {
    throw new HttpIdentityConfigurationError(
      "production mode requires a production-oriented HTTP identity validator; disabled/mock/development fallback is prohibited",
    );
  }
  const economicService = new EconomicService({
    policy: DEV_BILLING_POLICY,
    store: economicStateStore,
    settlementProvider,
    tenantId: isolation.scope.tenantId,
    auditService,
  });
  const planResolver = new ExecutionPlanResolver({
    targetService,
    providers: modelProviderRegistry,
    credentials,
    runners: runnerRegistry,
    engines: engineRegistry,
  });
  const configuredRuntimeMode = options.runtimeMode ?? process.env.ACS_DISPATCH_MODE ?? environmentTopology.dispatchMode;
  if (configuredRuntimeMode !== undefined && configuredRuntimeMode !== "local" && configuredRuntimeMode !== "remote") {
    throw new WorkerIdentityConfigurationError("ACS_DISPATCH_MODE must be local or remote");
  }
  const runtimeMode = configuredRuntimeMode;
  const runtimeStatePath = options.runtimeStatePath
    ?? process.env.ACS_RUNTIME_DATABASE_PATH
    ?? join(roots.stateRoot, "control-plane", "runtime.sqlite");
  const sqliteRuntimeState = !options.runtimeCoordinator
    && (options.useDurableRuntimeState === true || runtimeMode === "remote")
    ? new SqliteDurableRuntimeState({ filePath: runtimeStatePath })
    : undefined;
  const runtimeCoordinator = options.runtimeCoordinator
    ?? (sqliteRuntimeState
      ? new DurableRuntimeCoordinator({
          store: sqliteRuntimeState,
          auditService,
          telemetry,
          leaseTtlMs: options.runtimeLeaseTtlMs ?? readPositiveEnvironmentInteger("ACS_WORKER_LEASE_TTL_MS"),
          workerStaleAfterMs: options.runtimeWorkerStaleAfterMs ?? readPositiveEnvironmentInteger("ACS_WORKER_STALE_AFTER_MS"),
        })
      : null);
  const configuredWorkerAuthMode = options.workerAuthMode ?? process.env.ACS_WORKER_IDENTITY_MODE;
  if (configuredWorkerAuthMode !== undefined
    && configuredWorkerAuthMode !== "development"
    && configuredWorkerAuthMode !== "signed_jwt") {
    throw new WorkerIdentityConfigurationError("ACS_WORKER_IDENTITY_MODE must be development or signed_jwt");
  }
  const workerAuthMode = configuredWorkerAuthMode ?? (adapterProfile === "production" ? "signed_jwt" : "development");
  const workerIdentityValidator = options.workerIdentityValidator ?? (workerAuthMode === "signed_jwt"
    ? new SignedWorkerIdentityValidator({
        issuer: options.workerTokenIssuer ?? process.env.ACS_WORKER_TOKEN_ISSUER ?? "",
        audience: options.workerTokenAudience ?? process.env.ACS_WORKER_TOKEN_AUDIENCE ?? "",
        signingKey: options.workerTokenSigningKey ?? process.env.ACS_WORKER_TOKEN_SIGNING_KEY ?? "",
      })
    : new DevelopmentWorkerIdentityValidator());
  if (adapterProfile === "production") {
    if (runtimeMode !== "remote" || !runtimeCoordinator?.descriptor.productionOriented) {
      throw new WorkerIdentityConfigurationError(
        "production mode requires durable remote runtime; local/process-memory fallback is prohibited",
      );
    }
    if (!workerIdentityValidator.descriptor.productionOriented) {
      throw new WorkerIdentityConfigurationError(
        "production mode requires production-oriented worker service identity",
      );
    }
  }
  assertProductionTelemetryConfiguration(adapterProfile, telemetry);
  const runtimeRecoveryCoordinator = runtimeCoordinator
    ? new RuntimeRecoveryCoordinator({
        runtime: runtimeCoordinator,
        scanIntervalMs: options.runtimeRecoveryScanIntervalMs
          ?? readPositiveEnvironmentInteger("ACS_RUNTIME_RECOVERY_SCAN_INTERVAL_MS"),
      })
    : null;
  runtimeRecoveryCoordinator?.start();
  const useDurableDeploymentState = options.useDurableDeploymentState === true
    || options.deploymentStatePath !== undefined
    || process.env.ACS_DEPLOYMENT_STORE === "sqlite"
    || adapterProfile === "production";
  const deploymentStatePath = options.deploymentStatePath
    ?? process.env.ACS_DEPLOYMENT_DATABASE_PATH
    ?? join(roots.stateRoot, "control-plane", "deployment-state.sqlite");
  const sqliteDeploymentRepository = !options.deploymentRepository && useDurableDeploymentState
    ? new SqliteDeploymentRepository({ filePath: deploymentStatePath })
    : undefined;
  const deploymentRepository = options.deploymentRepository ?? sqliteDeploymentRepository;
  const productionDeploymentReadiness = new ProductionDeploymentReadinessEvaluator({
    targetService,
    engineId: engine.identity.id,
    identityValidator,
    edgePolicy,
    secretStore,
    economicStore: economicStateStore,
    settlementProvider,
    runtimeCoordinator,
    recoveryCoordinator: runtimeRecoveryCoordinator,
    workerIdentityValidator,
    telemetry,
    adapterProfile,
    administrativeStateHealth: () => {
      const health = durableAdministrativeState?.health();
      return {
        configured: Boolean(durableAdministrativeState),
        reachable: health?.reachable ?? false,
        durable: Boolean(durableAdministrativeState),
      };
    },
    agentStateHealth: () => sqliteAgentRepository?.health()
      ?? (options.agentRepository && "health" in options.agentRepository && typeof options.agentRepository.health === "function"
        ? (options.agentRepository.health as () => { configured: boolean; reachable: boolean; productionOriented: boolean; adapter: string })()
        : { configured: Boolean(agentRepository), reachable: Boolean(agentRepository), productionOriented: false, adapter: "in-memory-agent-state" }),
    deploymentStateHealth: () => deploymentRepository?.health()
      ?? { configured: false, reachable: false, productionOriented: false, adapter: "in-memory-deployment-state" },
  });
  const deploymentService = new DeploymentService({
    engine,
    targetService,
    economicService,
    agentService,
    resolver: planResolver,
    auditService,
    scope: isolation.scope,
    ...(deploymentRepository ? { repository: deploymentRepository } : {}),
    productionReadinessEvaluator: productionDeploymentReadiness,
  });
  const runtimeService = new RuntimeLifecycleService({
    engine,
    deploymentLookup: (deploymentId) => deploymentService.getDeployment(deploymentId),
    auditService,
    scope: isolation.scope,
    runtimeCoordinator,
    runtimeMode,
  });

  // Worker infrastructure
  const workerRegistry = new ExecutionWorkerRegistry();
  const workerAssignmentService = new WorkerAssignmentService({
    workerRegistry,
    leaseSigningKey: "dev-lease-signing-key",
    defaultLeaseTtlMs: 5 * 60 * 1000,
  });

  let localWorker: LocalExecutionWorker | null = null;
  if (runtimeMode === "local" && options.startLocalWorker === true) {
    localWorker = new LocalExecutionWorker({
      workerRegistry,
      assignmentService: workerAssignmentService,
      engine,
      targetId: "local-wsl",
      workerId: "local-worker-01",
      workerName: "Local DEV Worker",
      workerVersion: "0.1.0",
      auditService,
      heartbeatIntervalMs: 30000,
      maxConcurrentRuns: 2,
    });
  }

  const operationalDiagnostics = new OperationalDiagnosticsService({
    profile: adapterProfile,
    environmentTopology,
    identityValidator,
    edgePolicy,
    secretStore,
    economicStore: economicStateStore,
    settlementProvider,
    administrativeState: durableAdministrativeState
      ? { mode: "filesystem", durability: "single_node_durable" }
      : { mode: "memory", durability: "process_local" },
    administrativeStateHealth: durableAdministrativeState
      ? () => durableAdministrativeState.health()
      : () => ({ configured: false, reachable: false }),
    runtimeMode,
    localWorkerConfigured: options.startLocalWorker === true,
    runtimeCoordinator,
    recoveryCoordinator: runtimeRecoveryCoordinator,
    telemetry,
    runtimeStatePath,
    administrativeStatePath: durableAdministrativeState ? administrativeStatePath : undefined,
    secretCatalogPath: useDurableSecretCatalog ? secretCatalogPath : undefined,
    economicStatePath: useDurableEconomicState ? economicStatePath : undefined,
    settlementStatePath: useDurableEconomicState ? economicStatePath : undefined,
    rateLimitDatabasePath: rateLimitProvider === "sqlite" ? rateLimitDatabasePath : undefined,
    checkTimeoutMs: options.dependencyCheckTimeoutMs,
    cacheTtlMs: options.dependencyCacheTtlMs,
  });

  return {
    engineRegistry,
    engineService: new EngineService(engineRegistry),
    targetService,
    agentService,
    compositionResources,
    deploymentService,
    runtimeService,
    auditService,
    tenantRepository,
    tenantMembershipRepository,
    tenantGovernanceRepository,
    tenantService,
    tenantMembershipService,
    tenantGovernanceService,
    accountIdentity,
    siwxArtifactVerifier,
    providerService: new ModelProviderService(modelProviderRegistry),
    runnerService: new AgentRunnerService(runnerRegistry),
    credentials,
    secretStore,
    economicService,
    workerRegistry,
    workerAssignmentService,
    localWorker,
    runtimeCoordinator,
    runtimeRecoveryCoordinator,
    workerIdentityValidator,
    environmentTopology,
    runtimeMode,
    identityValidator,
    rateLimiter,
    edgePolicy,
    telemetry,
    operationalDiagnostics,
    productionDeploymentReadiness,
    isolation,
    administrativeState: durableAdministrativeState
      ? {
          mode: "filesystem",
          durability: "single_node_durable",
          filePath: administrativeStatePath,
          multiInstance: "not_proven",
        }
      : {
          mode: "memory",
          durability: "process_local",
          multiInstance: "not_applicable",
        },
    productionAdapters: {
      profile: adapterProfile,
      secretProvider: secretStore.descriptor,
      economicStore: economicStateStore.descriptor,
      settlementProvider: settlementProvider.descriptor,
      identityValidator: identityValidator.descriptor,
      rateLimiter: rateLimiter.descriptor,
      runtime: runtimeCoordinator
        ? {
            mode: runtimeMode,
            adapter: runtimeCoordinator.descriptor.adapter,
            productionOriented: runtimeCoordinator.descriptor.productionOriented,
            multiInstance: runtimeCoordinator.descriptor.multiInstance,
            multiHost: runtimeCoordinator.descriptor.multiHost,
          }
        : {
            mode: runtimeMode,
            adapter: "local-process-runtime",
            productionOriented: false,
            multiInstance: "not_applicable",
            multiHost: "not_applicable",
          },
      workerIdentity: workerIdentityValidator.descriptor,
      telemetry: {
        adapter: telemetry.descriptor.adapter,
        external: telemetry.descriptor.external,
        productionOriented: telemetry.descriptor.productionGrade,
      },
      agentState: sqliteAgentRepository
        ? {
            adapter: sqliteAgentRepository.descriptor.adapter,
            productionOriented: sqliteAgentRepository.descriptor.productionOriented,
            multiInstance: sqliteAgentRepository.descriptor.multiInstance,
            multiHost: sqliteAgentRepository.descriptor.multiHost,
          }
        : {
            adapter: "in-memory-agent-state",
            productionOriented: false,
            multiInstance: "not_applicable",
            multiHost: "not_applicable",
          },
      deploymentState: deploymentService.descriptor,
      deploymentTarget: engine instanceof HttpProductionTargetEngine
        ? engine.descriptor
        : {
            adapter: "openclaw-local-target",
            productionOriented: false,
            topology: "development_local",
            multiHost: "not_applicable",
          },
    },
    async close(): Promise<void> {
      runtimeRecoveryCoordinator?.stop();
      if (localWorker) {
        await localWorker.stop();
      }
      await engine.close();
      sqliteEconomicStore?.close();
      sqliteSettlementProvider?.close();
      sqliteSecretCatalog?.close();
      rateLimiter.close?.();
      await accountIdentity.store.close?.();
      runtimeCoordinator?.close();
      deploymentService.close();
      sqliteAgentRepository?.close();
      await telemetry.close();
    },
  };
}

function splitEnvironmentList(value: string | undefined): readonly string[] | undefined {
  if (value === undefined) return undefined;
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function readPositiveEnvironmentInteger(name: string): number | undefined {
  const value = process.env[name];
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(name + " must be a positive safe integer");
  }
  return parsed;
}

export function resolveOperationalRoots(options: ControlPlaneContextOptions = {}): {
  readonly sourceRoot: string;
  readonly runtimeRoot: string;
  readonly stateRoot: string;
  readonly configRoot: string;
  readonly artifactsRoot: string;
  readonly workspaceRoot: string;
} {
  const roots = resolveDefaultOperationalRoots(options);
  return normalizeIsolationRoots({
    sourceRoot: resolve(roots.acsRoot, "engines", "agentsai"),
    runtimeRoot: resolve(roots.runtimeRoot),
    stateRoot: resolve(roots.stateRoot),
    configRoot: resolve(roots.configRoot),
    artifactsRoot: resolve(roots.artifactsRoot),
    workspaceRoot: resolve(roots.workspaceRoot),
  });
}
