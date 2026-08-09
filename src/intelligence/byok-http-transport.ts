export interface ProviderHttpResponse {
  readonly status: number;
  readonly json?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface ProviderHttpTransport {
  request(input: {
    method: "GET" | "POST";
    url: string;
    headers: Readonly<Record<string, string>>;
    body?: string;
    timeoutMs?: number;
  }): Promise<ProviderHttpResponse>;
}

export class FetchProviderHttpTransport implements ProviderHttpTransport {
  async request(input: {
    method: "GET" | "POST";
    url: string;
    headers: Readonly<Record<string, string>>;
    body?: string;
    timeoutMs?: number;
  }): Promise<ProviderHttpResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs ?? 10000);
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        ...(input.body ? { body: input.body } : {}),
        signal: controller.signal,
      });
      const text = await response.text();
      return {
        status: response.status,
        json: text ? JSON.parse(text) : undefined,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
