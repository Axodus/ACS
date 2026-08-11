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

export type DashboardSummary = {
  system: {
    service: string;
    status: "ok";
    mode: string;
    automation: string;
    readOnly: true;
    generatedAt: number;
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
