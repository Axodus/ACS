export const ACS_HTTP_VERSION = "0.1.0";

export interface AcsHttpEnvelope<T> {
  readonly success: boolean;
  readonly timestamp: string;
  readonly version: string;
  readonly data: T;
  readonly warnings?: readonly string[];
  readonly blockedReason?: string;
}

export function ok<T>(data: T, warnings: readonly string[] = []): AcsHttpEnvelope<T> {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    version: ACS_HTTP_VERSION,
    data,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export function fail(message: string, status = 400): { readonly status: number; readonly body: AcsHttpEnvelope<null> } {
  return {
    status,
    body: {
      success: false,
      timestamp: new Date().toISOString(),
      version: ACS_HTTP_VERSION,
      data: null,
      blockedReason: message,
      warnings: [message],
    },
  };
}

