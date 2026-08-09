export interface OpenCodeHttpResponse {
  readonly status: number;
  readonly json?: unknown;
}

export interface OpenCodeTransport {
  get(path: string, input?: { headers?: Readonly<Record<string, string>>; timeoutMs?: number }): Promise<OpenCodeHttpResponse>;
}

export class FetchOpenCodeTransport implements OpenCodeTransport {
  readonly #baseUrl: string;

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl.replace(/\/$/, "");
  }

  async get(path: string, input: { headers?: Readonly<Record<string, string>>; timeoutMs?: number } = {}): Promise<OpenCodeHttpResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs ?? 10000);
    try {
      const init: RequestInit = {
        method: "GET",
        signal: controller.signal,
        ...(input.headers ? { headers: input.headers } : {}),
      };
      const response = await fetch(this.#baseUrl + path, init);
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
