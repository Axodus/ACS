import { EngineProtocolError } from "./errors.js";
import { ACS_ENGINE_PROTOCOL, type EngineRequest, type EngineResponse, type EngineTransport } from "./types.js";

export type EngineClientOptions = {
  timeoutMs?: number;
};

export class EngineProtocolClient {
  readonly #transport: EngineTransport;
  readonly #timeoutMs: number;

  constructor(transport: EngineTransport, options: EngineClientOptions = {}) {
    this.#transport = transport;
    this.#timeoutMs = options.timeoutMs ?? 5000;
  }

  async request(operation: string, params: Record<string, unknown> = {}, options: { id?: string | null; timeoutMs?: number } = {}): Promise<Record<string, unknown>> {
    const request: EngineRequest = {
      protocol: ACS_ENGINE_PROTOCOL,
      id: options.id ?? `${operation}:${Date.now().toString(36)}`,
      operation,
      params,
    };
    const response = await this.#transport.request(request, options.timeoutMs ?? this.#timeoutMs);
    if (response.protocol !== ACS_ENGINE_PROTOCOL) {
      throw new EngineProtocolError({ code: "ACS_ENGINE_PROTOCOL_MISMATCH", message: "protocol mismatch", retryable: false });
    }
    if (response.id !== request.id) {
      throw new EngineProtocolError({ code: "ACS_ENGINE_CORRELATION_MISMATCH", message: "response id mismatch", retryable: false, details: { expected: request.id, actual: response.id } });
    }
    if (!response.success) {
      throw new EngineProtocolError(response.error);
    }
    return response.result;
  }

  close(): Promise<void> {
    return this.#transport.close();
  }
}
