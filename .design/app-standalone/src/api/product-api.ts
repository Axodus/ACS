const API_BASE_URL = import.meta.env.VITE_ACS_API_BASE_URL ?? "http://127.0.0.1:8788/api/v1";

export type ProductApiHealth = {
  service: string;
  status: "ok";
  mode: string;
  automation: string;
};

export type GovernedAgentStatus = "draft" | "active" | "disabled" | "archived";
export type AgentEnvironment = "sandbox";

export type AgentCompositionSummary = {
  ready: boolean;
  errorCount: number;
  warningCount: number;
};

export type AgentReadinessSummary = {
  state: "ready" | "partial" | "blocked" | "unavailable";
  blockerCount: number;
  warningCount: number;
};

export type AgentDeploymentSummary = {
  state: "none" | "deployed" | "failed" | "rejected";
  count: number;
};

export type AgentRuntimeSummary = {
  state: "none" | "running" | "stopped" | "failed" | "other";
  count: number;
};

export type AgentModelReference = {
  providerId: string;
  modelId: string;
  credentialConnectionId?: string;
};

export type AgentModelStrategy = {
  primary: AgentModelReference;
  fallbacks: AgentModelReference[];
  runnerId?: string;
  requiredCapabilities?: string[];
};

export type AgentDefinition = {
  agentId: string;
  name: string;
  status: GovernedAgentStatus;
  roleId?: string;
  roleRevision?: number;
  profileId?: string;
  profileRevision?: number;
  capabilityIds: string[];
  skillIds: string[];
  toolIds: string[];
  modelStrategy?: AgentModelStrategy;
  credentialConnectionIds: string[];
  runnerPreferences: string[];
  executionPolicyId?: string;
  metadata?: Record<string, unknown>;
};

export type AgentRevision = {
  agentId: string;
  revision: number;
  fingerprint: string;
  definition: AgentDefinition;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
};

export type CompositionFinding = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type AgentComposition = {
  agentId: string;
  revision: number;
  fingerprint: string;
  requested: {
    roleId?: string;
    profileId?: string;
    capabilityIds: string[];
    skillIds: string[];
    toolIds: string[];
    runnerPreferences: string[];
    credentialConnectionIds: string[];
  };
  effective: {
    roleId?: string;
    roleRevision?: number;
    profileId?: string;
    profileRevision?: number;
    capabilityIds: string[];
    skillIds: string[];
    toolIds: string[];
    runnerPreferences: string[];
    credentialConnectionIds: string[];
    modelStrategy?: AgentModelStrategy;
  };
  findings: CompositionFinding[];
  ready: boolean;
  materialization?: {
    artifactType: "openclaw-compatible";
    artifactFingerprint: string;
  };
};

export type AgentAuditEvent = {
  eventId: string;
  eventType: string;
  timestamp: number;
  correlationId: string;
  tenantId?: string;
  workloadId?: string;
  agentId?: string;
  revision?: number;
  deploymentId?: string;
  runtimeInstanceId?: string;
  executionRunId?: string;
  actor?: string;
  decision?: "allowed" | "denied" | "passed" | "failed";
  result?: "success" | "failure" | "pending";
  metadata?: Record<string, unknown>;
};

export type AgentListItem = {
  agentId: string;
  name: string;
  status: GovernedAgentStatus;
  environment: AgentEnvironment;
  currentRevisionId: number;
  compositionSummary: AgentCompositionSummary;
  readinessSummary: AgentReadinessSummary;
  deploymentSummary: AgentDeploymentSummary;
  runtimeSummary: AgentRuntimeSummary;
  archived: boolean;
  updatedAt: number;
  checkedAt: number;
};

export type AgentAuditSummary = {
  total: number;
  success: number;
  failure: number;
  pending: number;
  recent: AgentAuditEvent[];
};

export type AgentEconomicSummary = {
  state: "unavailable";
  message: string;
};

export type AgentSurfaceGuardrails = {
  inspectionMode: true;
  sandboxOnly: true;
  readOnly: false;
  mutableOperations: true;
  mutationScope: "agent-lifecycle";
  productionReady: false;
  sourceOfTruth: "product-api";
};

export type AgentLifecycleActionName =
  | "update"
  | "createRevision"
  | "adoptRevision"
  | "restoreRevision"
  | "duplicate"
  | "archive"
  | "restore"
  | "delete";

export type AgentLifecycleActionView = {
  action: AgentLifecycleActionName;
  label: string;
  available: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
};

export type AgentLifecycleStateView = {
  agentId: string;
  currentRevision: number;
  status: GovernedAgentStatus;
  archived: boolean;
  protected: boolean;
  archivedAt?: number;
  restoredAt?: number;
};

export type AgentDetail = {
  agentId: string;
  agentDefinition: AgentDefinition;
  currentRevision: AgentRevision;
  composition?: AgentComposition;
  compositionUnavailableReason?: string;
  readinessSummary: AgentReadinessSummary;
  deploymentSummary: AgentDeploymentSummary;
  runtimeSummary: AgentRuntimeSummary;
  economicSummary: AgentEconomicSummary;
  auditSummary: AgentAuditSummary;
  lifecycleState: AgentLifecycleStateView;
  availableActions: AgentLifecycleActionView[];
  guardrails: AgentSurfaceGuardrails;
  checkedAt: number;
  stale: boolean;
};

export type AgentRevisionSummary = {
  revisionId: string;
  revisionNumber: number;
  status: "current" | "adopted" | "historical";
  createdAt: number;
  adoptedAt: number;
  restoredFrom?: number;
  compositionHash?: string;
  changeSummary?: string;
  availableActions: {
    action: "adopt" | "restore";
    available: boolean;
    reason?: string;
  }[];
};

export type AgentOperationResult = {
  ok: boolean;
  operation: string;
  entityType: "agent";
  entityId: string;
  status: string;
  message: string;
  warnings: string[];
  errors: string[];
  auditRef?: string;
  checkedAt: number;
};

export type AgentCreateInput = {
  definition: AgentDefinition;
  createdBy?: string;
};

export type UpdateAgentInput = {
  definition: AgentDefinition;
  expectedRevision: number;
  updatedBy?: string;
};

export type AgentCreateRevisionInput = {
  definition: AgentDefinition;
  expectedRevision: number;
  actor?: string;
};

export type AgentDuplicateInput = {
  newAgentId: string;
  name?: string;
  actor?: string;
};

export type DashboardFinding = {
  code: string;
  severity: "error" | "warning";
  domain: string;
  message: string;
};

export type ProductApiOperationalGuardrails = {
  inspectionMode: true;
  sandboxOnly: true;
  readOnly: true;
  mutableOperations: false;
};

export type ProductApiReadinessLink = {
  state: "ready" | "partial" | "blocked" | "unverified";
  blockerCount: number;
  warningCount: number;
  evidenceCount: number;
  checkedAt: number;
};

export type DashboardSummary = {
  system: {
    service: string;
    status: "ok";
    mode: string;
    automation: string;
    readOnly: true;
    generatedAt: number;
    checkedAt: number;
    stale: boolean;
    refreshWindowMs: number;
    stateAgeMs: number;
    guardrails: ProductApiOperationalGuardrails;
  };
  agents: {
    total: number;
    draft: number;
    active: number;
    disabled: number;
    archived: number;
  };
  deployments: {
    total: number;
    deployed: number;
    failed: number;
    rejected: number;
  };
  runtimes: {
    total: number;
    pending: number;
    starting: number;
    running: number;
    stopping: number;
    stopped: number;
    failed: number;
    terminated: number;
  };
  workers: {
    total: number;
    registered: number;
    available: number;
    degraded: number;
    unavailable: number;
    stale: number;
    activeAssignments: number;
    availableSlots: number;
  };
  executionRuns: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    recent: {
      runId: string;
      runtimeInstanceId: string;
      agentId: string;
      executionPlanId: string;
      status: "pending" | "running" | "completed" | "failed" | "cancelled";
      startedAt: number;
      completedAt?: number;
    }[];
  };
  blockers: DashboardFinding[];
  warnings: DashboardFinding[];
  readiness: ProductApiReadinessLink;
  runtime: {
    connectivity: ProductApiRuntimeConnectivity;
    checkedAt: number;
  };
};

export type ProductApiRuntimeConnectivity = "connected" | "degraded" | "unavailable" | "unverified";

export type ProductApiHealthStatus = "ok" | "degraded" | "unavailable" | "unverified";

export type ProductApiReadinessFlagStatus = "ready" | "partial" | "blocked" | "unverified";

export type ReadinessFinding = {
  domain: string;
  component: string;
  severity: "info" | "warning" | "error";
  currentState: string;
  requiredState: string;
  reason: string;
  recommendedRemediation: string;
  blocksProduction: boolean;
};

export type ReadinessDomainReport = {
  domain: string;
  status: "ready" | "partial" | "blocked";
  currentState: string;
  requiredState: string;
  evidence: string[];
  findings: ReadinessFinding[];
};

export type GlobalReadinessSummary = {
  generatedAt: number;
  mode: "inspection";
  readOnly: true;
  stale: boolean;
  refreshWindowMs: number;
  stateAgeMs: number;
  guardrails: ProductApiOperationalGuardrails;
  productApi: {
    service: string;
    status: "ok";
    mode: string;
    automation: string;
    checkedAt: number;
    checkMode: "inspection-read-only";
  };
  runtime: {
    connectivity: ProductApiRuntimeConnectivity;
    checkedAt: number;
    engines: {
      id: string;
      provider: string;
      status: string;
    }[];
  };
  healthIndicators: {
    id: string;
    label: string;
    status: ProductApiHealthStatus;
    detail: string;
  }[];
  readinessFlags: {
    id: string;
    label: string;
    status: ProductApiReadinessFlagStatus;
    detail: string;
  }[];
  readiness: {
    devReady: boolean;
    distributedRuntimeReady: boolean;
    productionReady: boolean;
    status: "ready" | "partial" | "blocked";
    blockerCount: number;
    warningCount: number;
    evidenceCount: number;
    refreshedAt: number;
  };
  components: {
    domain: string;
    status: "ready" | "partial" | "blocked";
    currentState: string;
    requiredState: string;
  }[];
  blockers: ReadinessFinding[];
  warnings: ReadinessFinding[];
  evidence: ReadinessDomainReport[];
};

export const productApiConfig = {
  baseUrl: API_BASE_URL,
  environment: import.meta.env.VITE_ACS_ENVIRONMENT ?? "local",
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      error: json.error,
      message: json.error?.message ?? "An unexpected API error occurred",
    };
  }

  return json.data;
}

export const productApi = {
  async health() {
    return request<ProductApiHealth>("/health");
  },

  async getDashboardSummary() {
    return request<DashboardSummary>("/dashboard");
  },

  async getGlobalReadinessSummary() {
    return request<GlobalReadinessSummary>("/readiness");
  },

  async listAgents() {
    return request<AgentListItem[]>("/agents");
  },

  async getAgent(id: string) {
    return request<AgentDetail>(`/agents/${id}`);
  },

  async getAgentRevisions(id: string) {
    return request<AgentRevisionSummary[]>(`/agents/${id}/revisions`);
  },

  async getAgentLifecycle(id: string) {
    return request<AgentLifecycleStateView>(`/agents/${id}/lifecycle`);
  },

  async createAgent(input: AgentCreateInput) {
    return request<AgentOperationResult>("/agents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateAgent(agentId: string, input: UpdateAgentInput) {
    return request<AgentOperationResult>(`/agents/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async createAgentRevision(agentId: string, input: AgentCreateRevisionInput) {
    return request<AgentOperationResult>(`/agents/${agentId}/revisions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async adoptAgentRevision(agentId: string, revisionId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}/revisions/${revisionId}/adopt`, {
      method: "POST",
    });
  },

  async restoreAgentRevision(agentId: string, revisionId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}/revisions/${revisionId}/restore`, {
      method: "POST",
    });
  },

  async duplicateAgent(agentId: string, input: AgentDuplicateInput) {
    return request<AgentOperationResult>(`/agents/${agentId}/duplicate`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async archiveAgent(agentId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}/archive`, {
      method: "POST",
    });
  },

  async restoreAgent(agentId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}/restore`, {
      method: "POST",
    });
  },

  async deleteAgent(agentId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}`, {
      method: "DELETE",
    });
  },

  async listTargets() {
    return request<unknown[]>("/targets");
  },

  async listProviders() {
    return request<unknown[]>("/providers");
  },

  async listRunners() {
    return request<unknown[]>("/runners");
  },

  async deployAgent(agentId: string, data: { revision: number; composition: Record<string, unknown>; targetId: string }) {
    return request<unknown>(`/agents/${agentId}/deploy`, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        mode: "sandbox",
      }),
    });
  },

  async startRuntime(runtimeInstanceId: string) {
    return request<unknown>(`/runtimes/${runtimeInstanceId}/start`, {
      method: "POST",
    });
  },

  async stopRuntime(runtimeInstanceId: string) {
    return request<unknown>(`/runtimes/${runtimeInstanceId}/stop`, {
      method: "POST",
    });
  },

  async queryAudit() {
    return request<unknown[]>("/audit");
  },
};
