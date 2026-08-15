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
import { ExecutionPlanResolver } from "../control-plane/execution-plan-resolver.js";
import { EconomicService } from "../control-plane/neurons-economic-contract.js";
import { TenantLifecycleService, InMemoryTenantRepository } from "../control-plane/tenant-domain.js";
import {
  TenantMembershipService,
  type AdministrativeAuthority,
} from "../control-plane/tenant-membership.js";
import { TenantGovernanceService } from "../control-plane/tenant-governance.js";
import { ModelProviderRegistry } from "../intelligence/model-provider-registry.js";
import { ModelProviderService } from "../intelligence/model-provider-service.js";
import { AgentRunnerRegistry } from "../intelligence/agent-runner-registry.js";
import { AgentRunnerService } from "../intelligence/agent-runner-service.js";
import { CredentialConnectionRegistry } from "../intelligence/credential-registry.js";
import { InMemorySecretStore } from "../intelligence/secret-store.js";
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
  readonly tenantRepository: InMemoryTenantRepository;
  readonly tenantService: TenantLifecycleService;
  readonly tenantMembershipService: TenantMembershipService;
  readonly tenantGovernanceService: TenantGovernanceService;
  readonly providerService: ModelProviderService;
  readonly runnerService: AgentRunnerService;
  readonly credentials: CredentialConnectionRegistry;
  readonly economicService: EconomicService;
  readonly workerRegistry: ExecutionWorkerRegistry;
  readonly workerAssignmentService: WorkerAssignmentService;
  readonly localWorker: LocalExecutionWorker | null;
  readonly isolation: ControlPlaneIsolation;
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

  const credentials = new CredentialConnectionRegistry();
  const secretStore = new InMemorySecretStore();
  const credentialProvider = new RegistryBackedCredentialProvider({ connections: credentials, secretStore });

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

  const compositionResources = new CompositionResourceService();
  const auditService = new AuditService();

  const tenantRepository = new InMemoryTenantRepository();
  const tenantService = new TenantLifecycleService({ repository: tenantRepository, auditService });
  const tenantMembershipService = new TenantMembershipService({ tenantRepository, auditService });
  const tenantGovernanceService = new TenantGovernanceService({
    tenantRepository,
    membershipService: tenantMembershipService,
    auditService,
  });

  const bootstrapTenantId = isolation.scope.tenantId;
  const bootstrapAt = Date.now();
  const bootstrapAuthority: AdministrativeAuthority = { kind: "platform_admin", principalId: "system" };

  try {
    tenantService.createTenant({
      tenantId: bootstrapTenantId,
      displayName: "DEV Tenant",
      createdBy: "system",
      actor: "system",
      reason: "dev bootstrap tenant",
      at: bootstrapAt,
    });
  } catch {
    // context-local bootstrap is best-effort and idempotent for inspection flows
  }

  try {
    tenantService.activateTenant(bootstrapTenantId, {
      actor: "system",
      reason: "dev bootstrap tenant",
      at: bootstrapAt + 1,
    });
  } catch {
    // ignore duplicate activation when a caller reuses an existing tenant fixture
  }

  try {
    tenantMembershipService.bootstrapTenantOwner({
      tenantId: bootstrapTenantId,
      principalId: "dev-operator",
      authority: bootstrapAuthority,
      actor: "system",
      reason: "dev bootstrap owner",
      at: bootstrapAt + 2,
    });
  } catch {
    // keep the fixture resilient if the tenant already has an owner
  }

  try {
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
      at: bootstrapAt + 3,
    });
  } catch {
    // keep dev routes functional even if a caller already seeded governance
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

  const economicService = new EconomicService({ policy: DEV_BILLING_POLICY });
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
    tenantService,
    tenantMembershipService,
    tenantGovernanceService,
    providerService: new ModelProviderService(modelProviderRegistry),
    runnerService: new AgentRunnerService(runnerRegistry),
    credentials,
    economicService,
    workerRegistry,
    workerAssignmentService,
    localWorker,
    isolation,
    async close(): Promise<void> {
      if (localWorker) {
        await localWorker.stop();
      }
      await engine.close();
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
