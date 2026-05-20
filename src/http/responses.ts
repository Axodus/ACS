export const ACS_HTTP_VERSION = "0.1.0";

export interface AcsHttpEnvelope<T> {
  readonly success: boolean;
  readonly version: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly warnings?: readonly string[];
  readonly blockedReason?: string;
}

export function ok<T>(data: T, warnings: readonly string[] = [], correlationId = createCorrelationId()): AcsHttpEnvelope<T> {
  return {
    success: true,
    version: ACS_HTTP_VERSION,
    correlationId,
    timestamp: new Date().toISOString(),
    data,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export function fail(
  message: string,
  status = 400,
  code = status === 404 ? "not_found" : "bad_request",
  correlationId = createCorrelationId(),
  details?: unknown,
): { readonly status: number; readonly body: AcsHttpEnvelope<null> } {
  return {
    status,
    body: {
      success: false,
      version: ACS_HTTP_VERSION,
      correlationId,
      timestamp: new Date().toISOString(),
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      blockedReason: message,
      warnings: [message],
    },
  };
}

export function createCorrelationId(): string {
  return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
