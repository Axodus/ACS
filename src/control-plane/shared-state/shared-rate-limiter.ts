import { createHash } from "node:crypto";
import {
  RateLimitBackendError,
  RateLimitConfigurationError,
  type RateLimitConsumeInput,
  type RateLimitDecision,
  type RateLimiter,
  type RateLimitStoreDescriptor,
  type RateLimitStoreHealth,
} from "../../http/rate-limit.js";
import type { AsyncRateLimitRepository } from "./contracts.js";

export class SharedDatabaseRateLimiter implements RateLimiter {
  readonly descriptor: RateLimitStoreDescriptor = {
    adapter: "postgres-shared-fixed-window",
    productionOriented: true,
    durability: "shared_durable",
    multiInstance: "shared_database",
    multiHost: "capable_not_topology_proof",
  };

  constructor(private readonly store: AsyncRateLimitRepository) {}

  async consume(input: RateLimitConsumeInput): Promise<RateLimitDecision> {
    if (!input.key.trim()) throw new RateLimitConfigurationError("rate-limit key is required");
    if (!Number.isSafeInteger(input.policy.limit) || input.policy.limit <= 0) throw new RateLimitConfigurationError("rate-limit limit must be positive");
    if (!Number.isSafeInteger(input.policy.windowMs) || input.policy.windowMs <= 0) throw new RateLimitConfigurationError("rate-limit window must be positive");
    const cost = input.cost ?? 1;
    const timestamp = input.timestamp ?? Date.now();
    const windowStart = Math.floor(timestamp / input.policy.windowMs) * input.policy.windowMs;
    const resetAtMs = windowStart + input.policy.windowMs;
    try {
      const result = await this.store.consume({
        policyId: input.policy.policyId,
        keyHash: createHash("sha256").update(input.key).digest("hex"),
        windowStart,
        windowMs: input.policy.windowMs,
        cost,
      });
      const allowed = result.consumed <= input.policy.limit;
      return {
        allowed,
        limit: input.policy.limit,
        remaining: Math.max(0, input.policy.limit - result.consumed),
        resetAt: new Date(resetAtMs).toISOString(),
        ...(!allowed ? { retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - timestamp) / 1000)) } : {}),
        policy: input.policy.policyId,
        keyScope: input.policy.keyScope,
      };
    } catch (error) {
      if (error instanceof RateLimitConfigurationError) throw error;
      throw new RateLimitBackendError();
    }
  }

  async health(): Promise<RateLimitStoreHealth> {
    return { configured: true, reachable: true, productionGrade: true, adapter: this.descriptor.adapter };
  }
}
