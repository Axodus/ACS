import type { AcsAuthContext } from "./auth.js";
import type { AcsRateLimitContext } from "./rate-limit.js";

export const ACS_HTTP_VERSION = "0.1.0";

export interface AcsHttpEnvelopeMeta {
  readonly auth?: AcsAuthContext;
  readonly rateLimit?: AcsRateLimitContext;
}

export type AcsHttpErrorSeverity = "info" | "warning" | "error";

export interface AcsHttpErrorBody {
  readonly code: string;
  readonly message: string;
  readonly reason?: string;
  readonly details?: unknown;
  readonly entityRefs?: readonly string[];
  readonly retryable?: boolean;
  readonly severity?: AcsHttpErrorSeverity;
  readonly guardrails?: readonly string[];
}

export interface AcsHttpEnvelope<T> {
  readonly success: boolean;
  readonly version: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly data?: T;
  readonly error?: AcsHttpErrorBody;
  readonly meta?: AcsHttpEnvelopeMeta;
  readonly warnings?: readonly string[];
  readonly blockedReason?: string;
}

export interface AcsHttpFailureOptions {
  readonly reason?: string;
  readonly entityRefs?: readonly string[];
  readonly retryable?: boolean;
  readonly severity?: AcsHttpErrorSeverity;
  readonly guardrails?: readonly string[];
}

export function ok<T>(
  data: T,
  warnings: readonly string[] = [],
  correlationId = createCorrelationId(),
  meta?: AcsHttpEnvelopeMeta,
): AcsHttpEnvelope<T> {
  return {
    success: true,
    version: ACS_HTTP_VERSION,
    correlationId,
    timestamp: new Date().toISOString(),
    data,
    ...(meta ? { meta } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export function fail(
  message: string,
  status = 400,
  code = status === 404 ? "not_found" : "bad_request",
  correlationId = createCorrelationId(),
  details?: unknown,
  meta?: AcsHttpEnvelopeMeta,
  reason?: string,
  options: AcsHttpFailureOptions = {},
): { readonly status: number; readonly body: AcsHttpEnvelope<null> } {
  const resolvedReason = reason ?? (code === "not_found" ? "not_found" : undefined);
  const resolvedRetryable = options.retryable ?? (code === "not_found" ? false : undefined);
  const resolvedSeverity = options.severity ?? (code === "not_found" ? "error" : undefined);
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
        ...(resolvedReason !== undefined ? { reason: resolvedReason } : {}),
        ...(options.entityRefs !== undefined ? { entityRefs: options.entityRefs } : {}),
        ...(resolvedRetryable !== undefined ? { retryable: resolvedRetryable } : {}),
        ...(resolvedSeverity !== undefined ? { severity: resolvedSeverity } : {}),
        ...(options.guardrails !== undefined ? { guardrails: options.guardrails } : {}),
      },
      ...(meta ? { meta } : {}),
      blockedReason: message,
      warnings: [message],
    },
  };
}

export function createCorrelationId(): string {
  return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
