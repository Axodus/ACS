const API_BASE_URL = import.meta.env.VITE_ACS_API_BASE_URL ?? "http://127.0.0.1:8788/api/v1";

export type ProductApiHealth = {
  service: string;
  status: "ok";
  mode: string;
  automation: string;
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

  async listAgents() {
    return request<any[]>("/agents");
  },

  async getAgent(id: string) {
    return request<any>(`/agents/${id}`);
  },

  async listTargets() {
    return request<any[]>("/targets");
  },

  async listProviders() {
    return request<any[]>("/providers");
  },

  async listRunners() {
    return request<any[]>("/runners");
  },

  async deployAgent(agentId: string, data: { revision: number; composition: any; targetId: string }) {
    return request<any>(`/agents/${agentId}/deploy`, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        mode: "sandbox",
      }),
    });
  },

  async startRuntime(runtimeInstanceId: string) {
    return request<any>(`/runtimes/${runtimeInstanceId}/start`, {
      method: "POST",
    });
  },

  async stopRuntime(runtimeInstanceId: string) {
    return request<any>(`/runtimes/${runtimeInstanceId}/stop`, {
      method: "POST",
    });
  },

  async queryAudit() {
    return request<any[]>("/audit");
  },
};
