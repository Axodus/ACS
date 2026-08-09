export const ACS_ENGINE_PROTOCOL = "acs-engine/1";

export type EngineRequest = {
  protocol: typeof ACS_ENGINE_PROTOCOL;
  id: string | null;
  operation: string;
  params: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type EngineErrorPayload = {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

export type EngineSuccessResponse = {
  protocol: typeof ACS_ENGINE_PROTOCOL;
  id: string | null;
  success: true;
  result: Record<string, unknown>;
};

export type EngineErrorResponse = {
  protocol: typeof ACS_ENGINE_PROTOCOL;
  id: string | null;
  success: false;
  error: EngineErrorPayload;
};

export type EngineResponse = EngineSuccessResponse | EngineErrorResponse;

export interface EngineTransport {
  request(message: EngineRequest, timeoutMs?: number): Promise<EngineResponse>;
  close(): Promise<void>;
}
