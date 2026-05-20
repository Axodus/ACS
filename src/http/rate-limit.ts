export interface AcsRateLimitContext {
  readonly enabled: boolean;
  readonly key?: string;
  readonly limit?: number;
  readonly remaining?: number;
  readonly resetAt?: string;
  readonly exceeded: boolean;
  readonly warnings: readonly string[];
}

export interface CreateAcsRateLimitContextInput {
  readonly enabled?: boolean;
  readonly key?: string;
  readonly limit?: number;
  readonly remaining?: number;
  readonly resetAt?: string;
  readonly exceeded?: boolean;
}

export function createAcsRateLimitContext(input: CreateAcsRateLimitContextInput = {}): AcsRateLimitContext {
  const enabled = input.enabled ?? false;
  const exceeded = input.exceeded ?? false;

  return {
    enabled,
    ...(input.key ? { key: input.key } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.remaining !== undefined ? { remaining: input.remaining } : {}),
    ...(input.resetAt ? { resetAt: input.resetAt } : {}),
    exceeded,
    warnings: [
      ...(!enabled ? ["ACS HTTP rate limiting is disabled in the current inspection MVP."] : []),
      ...(enabled ? ["ACS HTTP rate limiting is mock-only in this phase."] : []),
      ...(exceeded ? ["Mock rate limit exceeded for this request."] : []),
    ],
  };
}

export function parseMockRateLimitContext(headers: Readonly<Record<string, string | undefined>>): AcsRateLimitContext {
  const mode = headers["x-acs-rate-limit-mode"];
  if (mode === "mock-exceeded") {
    return createAcsRateLimitContext({
      enabled: true,
      key: headers["x-acs-rate-limit-key"] ?? "mock",
      limit: 1,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
      exceeded: true,
    });
  }

  if (mode === "mock") {
    return createAcsRateLimitContext({
      enabled: true,
      key: headers["x-acs-rate-limit-key"] ?? "mock",
      limit: 60,
      remaining: 59,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
      exceeded: false,
    });
  }

  return createAcsRateLimitContext();
}
