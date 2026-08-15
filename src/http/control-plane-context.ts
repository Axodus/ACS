import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { AgentEngine } from "../engines/agent-engine.js";
import { EngineRegistry } from "../engines/engine-registry.js";
import { EngineService } from "../engines/engine-service.js";
import { createOpenClawEngineFromManifest } from "../engines/openclaw-bootstrap.js";
import { ExecutionTargetService } from "../targets/execution-target-service.js";
import { AgentService } from "../control-plane/agent-service.js";
import { CompositionResourceService } from "../control-plane/composition-resources.js";
import { DeploymentService } from "../control-plane/deployment-service.js";
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
import type { BillingPolicy } from "../control-plane/neurons-economic-contract.js";
import type { AgentDefinition } from "../control-plane/unified-agent-model.js";
import {
  normalizeIsolationRoots,
  normalizeIsolationScope,
  type ControlPlaneIsolation,
  type IsolationRoots,
  type IsolationScope,
} from "../control-plane/isolation.js";

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
  readonly providerService: ModelProviderService;
  readonly runnerService: AgentRunnerService;
  readonly credentials: CredentialConnectionRegistry;
  readonly secretStore: SecretStore;
  readonly economicService: EconomicService;
  readonly workerRegistry: ExecutionWorkerRegistry;
  readonly workerAssignmentService: WorkerAssignmentService;
  readonly localWorker: LocalExecutionWorker | null;
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
  readonly useDurableAdministrativeState?: boolean;
  readonly administrativeStatePath?: string;
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
  const engineRegistry = new EngineRegistry();
  const engine = options.engine ?? createOpenClawEngineFromManifest({
    acsRoot: defaultRoots.acsRoot,
    runtimeRoot: roots.runtimeRoot,
    stateRoot: roots.stateRoot,
    configRoot: roots.configRoot,
    artifactsRoot: roots.artifactsRoot,
    workspaceRoot: roots.workspaceRoot,
    ...(options.pythonCommand !== undefined ? { pythonCommand: options.pythonCommand } : {}),
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
  });
  engineRegistry.register(engine);

  const targetService = new ExecutionTargetService(engineRegistry);
  const adapterProfile = options.adapterProfile
    ?? (process.env.ACS_ENVIRONMENT === "production" ? "production" : "development");
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

  const agentService = new AgentService({
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
  agentService.create({ definition: devAgentDefinition, createdAt: Date.now() });

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
  const deploymentService = new DeploymentService({
    engine,
    targetService,
    economicService,
    agentService,
    resolver: planResolver,
    auditService,
    scope: isolation.scope,
  });
  const runtimeService = new RuntimeLifecycleService({
    engine,
    deploymentLookup: (deploymentId) => deploymentService.getDeployment(deploymentId),
    auditService,
    scope: isolation.scope,
  });

  // Worker infrastructure
  const workerRegistry = new ExecutionWorkerRegistry();
  const workerAssignmentService = new WorkerAssignmentService({
    workerRegistry,
    leaseSigningKey: "dev-lease-signing-key",
    defaultLeaseTtlMs: 5 * 60 * 1000,
  });

  let localWorker: LocalExecutionWorker | null = null;
  if (options.startLocalWorker !== false) {
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
    providerService: new ModelProviderService(modelProviderRegistry),
    runnerService: new AgentRunnerService(runnerRegistry),
    credentials,
    secretStore,
    economicService,
    workerRegistry,
    workerAssignmentService,
    localWorker,
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
    },
    async close(): Promise<void> {
      if (localWorker) {
        await localWorker.stop();
      }
      await engine.close();
      sqliteEconomicStore?.close();
      sqliteSettlementProvider?.close();
      sqliteSecretCatalog?.close();
    },
  };
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
