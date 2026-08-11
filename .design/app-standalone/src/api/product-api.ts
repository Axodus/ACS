const API_BASE_URL = import.meta.env.VITE_ACS_API_BASE_URL ?? "http://127.0.0.1:8788/api/v1";

export type ProductApiHealth = {
  service: string;
  status: "ok";
  mode: string;
  automation: string;
};

export type ApiAgent = {
  agentId: string;
  name: string;
  status: string;
  definition: {
    roleId?: string;
    profileId?: string;
  };
  revision: number;
  createdAt: number;
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
    return request<ApiAgent[]>("/agents");
  },

  async getAgent(id: string) {
    return request<ApiAgent>(`/agents/${id}`);
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
