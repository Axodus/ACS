import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type RateLimitKeyScope = "network" | "principal" | "tenant_principal";

export interface RateLimitPolicy {
  readonly policyId: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly keyScope: RateLimitKeyScope;
  readonly failClosed: boolean;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: string;
  readonly retryAfterSeconds?: number;
  readonly policy: string;
  readonly keyScope: RateLimitKeyScope;
}

export interface RateLimitStoreDescriptor {
  readonly adapter: string;
  readonly productionOriented: boolean;
  readonly durability: "process_local" | "single_node_durable" | "shared_durable";
  readonly multiInstance: "not_applicable" | "shared_database" | "not_proven";
  readonly multiHost?: "capable_not_topology_proof" | "proven";
}

export interface RateLimitStoreHealth {
  readonly configured: boolean;
  readonly reachable: boolean;
  readonly productionGrade: boolean;
  readonly adapter: string;
}

export interface RateLimitConsumeInput {
  readonly key: string;
  readonly cost?: number;
  readonly policy: RateLimitPolicy;
  readonly timestamp?: number;
}

export interface StoreConsumeInput {
  readonly keyHash: string;
  readonly policyId: string;
  readonly windowStart: number;
  readonly windowMs: number;
  readonly cost: number;
}

export interface StoreConsumeResult {
  readonly consumed: number;
}

export interface RateLimitStore {
  readonly descriptor: RateLimitStoreDescriptor;
  consume(input: StoreConsumeInput): StoreConsumeResult;
  health(): RateLimitStoreHealth;
  close?(): void;
}

export interface RateLimiter {
  readonly descriptor: RateLimitStoreDescriptor;
  consume(input: RateLimitConsumeInput): Promise<RateLimitDecision>;
  health(): Promise<RateLimitStoreHealth>;
  close?(): void;
}

export class RateLimitConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigurationError";
  }
}

export class RateLimitBackendError extends Error {
  constructor(message = "rate-limit backend unavailable") {
    super(message);
    this.name = "RateLimitBackendError";
  }
}

export class FixedWindowRateLimiter implements RateLimiter {
  readonly descriptor: RateLimitStoreDescriptor;
  readonly #store: RateLimitStore;

  constructor(store: RateLimitStore) {
    this.#store = store;
    this.descriptor = store.descriptor;
  }

  async consume(input: RateLimitConsumeInput): Promise<RateLimitDecision> {
    validatePolicy(input.policy);
    const cost = input.cost ?? 1;
    if (!Number.isSafeInteger(cost) || cost <= 0) {
      throw new RateLimitConfigurationError("rate-limit cost must be a positive safe integer");
    }
    if (!input.key.trim()) {
      throw new RateLimitConfigurationError("rate-limit key is required");
    }

    const timestamp = input.timestamp ?? Date.now();
    const windowStart = Math.floor(timestamp / input.policy.windowMs) * input.policy.windowMs;
    const resetAtMs = windowStart + input.policy.windowMs;
    try {
      const result = this.#store.consume({
        keyHash: createHash("sha256").update(input.key).digest("hex"),
        policyId: input.policy.policyId,
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
      if (error instanceof RateLimitConfigurationError || error instanceof RateLimitBackendError) throw error;
      throw new RateLimitBackendError();
    }
  }

  async health(): Promise<RateLimitStoreHealth> {
    try {
      return this.#store.health();
    } catch {
      return {
        configured: true,
        reachable: false,
        productionGrade: this.descriptor.productionOriented,
        adapter: this.descriptor.adapter,
      };
    }
  }

  close(): void {
    this.#store.close?.();
  }
}

export class InMemoryRateLimitStore implements RateLimitStore {
  readonly descriptor: RateLimitStoreDescriptor = {
    adapter: "memory-fixed-window",
    productionOriented: false,
    durability: "process_local",
    multiInstance: "not_applicable",
  };
  readonly #buckets = new Map<string, { consumed: number; windowStart: number }>();

  consume(input: StoreConsumeInput): StoreConsumeResult {
    const bucketId = input.policyId + ":" + input.keyHash;
    const existing = this.#buckets.get(bucketId);
    const consumed = existing?.windowStart === input.windowStart ? existing.consumed + input.cost : input.cost;
    this.#buckets.set(bucketId, { consumed, windowStart: input.windowStart });
    return { consumed };
  }

  health(): RateLimitStoreHealth {
    return { configured: true, reachable: true, productionGrade: false, adapter: this.descriptor.adapter };
  }
}

interface SqliteCounterRow {
  readonly consumed: number;
}

export class SqliteRateLimitStore implements RateLimitStore {
  readonly descriptor: RateLimitStoreDescriptor = {
    adapter: "sqlite-fixed-window",
    productionOriented: true,
    durability: "single_node_durable",
    multiInstance: "shared_database",
  };
  readonly #database: DatabaseSync;

  constructor(options: { readonly filePath: string }) {
    if (!options.filePath.trim()) throw new RateLimitConfigurationError("rate-limit database path is required");
    mkdirSync(dirname(options.filePath), { recursive: true, mode: 0o700 });
    this.#database = new DatabaseSync(options.filePath);
    this.#database.exec("PRAGMA journal_mode = WAL");
    this.#database.exec("PRAGMA busy_timeout = 5000");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS http_rate_limit_buckets (
        policy_id TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        window_ms INTEGER NOT NULL,
        consumed INTEGER NOT NULL,
        PRIMARY KEY (policy_id, key_hash, window_start)
      );
      CREATE INDEX IF NOT EXISTS http_rate_limit_cleanup_idx
        ON http_rate_limit_buckets (window_start);
    `);
  }

  consume(input: StoreConsumeInput): StoreConsumeResult {
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const row = this.#database.prepare(`
        INSERT INTO http_rate_limit_buckets (policy_id, key_hash, window_start, window_ms, consumed)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(policy_id, key_hash, window_start)
        DO UPDATE SET consumed = consumed + excluded.consumed
        RETURNING consumed
      `).get(input.policyId, input.keyHash, input.windowStart, input.windowMs, input.cost) as unknown as SqliteCounterRow;
      this.#database.prepare(
        "DELETE FROM http_rate_limit_buckets WHERE window_start + window_ms < ?",
      ).run(input.windowStart - input.windowMs);
      this.#database.exec("COMMIT");
      return { consumed: row.consumed };
    } catch {
      try { this.#database.exec("ROLLBACK"); } catch { /* no active transaction */ }
      throw new RateLimitBackendError();
    }
  }

  health(): RateLimitStoreHealth {
    try {
      this.#database.prepare("SELECT 1 AS ok").get();
      return { configured: true, reachable: true, productionGrade: true, adapter: this.descriptor.adapter };
    } catch {
      return { configured: true, reachable: false, productionGrade: true, adapter: this.descriptor.adapter };
    }
  }

  close(): void {
    this.#database.close();
  }
}

function validatePolicy(policy: RateLimitPolicy): void {
  if (!policy.policyId.trim()) throw new RateLimitConfigurationError("rate-limit policy id is required");
  if (!Number.isSafeInteger(policy.limit) || policy.limit <= 0) {
    throw new RateLimitConfigurationError("rate-limit policy limit must be a positive safe integer");
  }
  if (!Number.isSafeInteger(policy.windowMs) || policy.windowMs <= 0) {
    throw new RateLimitConfigurationError("rate-limit policy window must be a positive safe integer");
  }
}

export interface AcsRateLimitContext {
  readonly enabled: boolean;
  readonly key?: string;
  readonly limit?: number;
  readonly remaining?: number;
  readonly resetAt?: string;
  readonly retryAfterSeconds?: number;
  readonly policy?: string;
  readonly keyScope?: RateLimitKeyScope;
  readonly exceeded: boolean;
  readonly warnings: readonly string[];
}

export interface CreateAcsRateLimitContextInput {
  readonly enabled?: boolean;
  readonly key?: string;
  readonly limit?: number;
  readonly remaining?: number;
  readonly resetAt?: string;
  readonly retryAfterSeconds?: number;
  readonly policy?: string;
  readonly keyScope?: RateLimitKeyScope;
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
    ...(input.retryAfterSeconds !== undefined ? { retryAfterSeconds: input.retryAfterSeconds } : {}),
    ...(input.policy ? { policy: input.policy } : {}),
    ...(input.keyScope ? { keyScope: input.keyScope } : {}),
    exceeded,
    warnings: [
      ...(!enabled ? ["ACS HTTP rate limiting is disabled in this direct route context."] : []),
      ...(exceeded ? ["Rate limit exceeded for this request."] : []),
    ],
  };
}

export function rateLimitDecisionContext(decision: RateLimitDecision): AcsRateLimitContext {
  return createAcsRateLimitContext({
    enabled: true,
    limit: decision.limit,
    remaining: decision.remaining,
    resetAt: decision.resetAt,
    retryAfterSeconds: decision.retryAfterSeconds,
    policy: decision.policy,
    keyScope: decision.keyScope,
    exceeded: !decision.allowed,
  });
}

/**
 * Legacy direct-router test helper. The real HTTP server never calls this
 * function and never trusts these headers for a rate-limit bucket.
 */
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
