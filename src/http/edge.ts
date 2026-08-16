import { BlockList, isIP } from "node:net";
import type { IncomingMessage } from "node:http";
import type { AcsAuthContext } from "./auth.js";
import {
  RateLimitBackendError,
  RateLimitConfigurationError,
  type RateLimitDecision,
  type RateLimiter,
  type RateLimitPolicy,
} from "./rate-limit.js";

export type HttpRouteClass =
  | "public_health"
  | "authenticated_read"
  | "administrative_mutation"
  | "execution_start"
  | "system_admin"
  | "runtime_worker";

export interface HttpEdgeLimits {
  readonly maxBodyBytes: number;
  readonly maxHeaderBytes: number;
  readonly maxHeadersCount: number;
  readonly headersTimeoutMs: number;
  readonly requestTimeoutMs: number;
  readonly keepAliveTimeoutMs: number;
  readonly maxRequestsPerSocket: number;
}

export interface CorsDecision {
  readonly allowed: boolean;
  readonly headers: Readonly<Record<string, string>>;
  readonly reason?: "origin_not_allowed" | "method_not_allowed" | "header_not_allowed";
}

export interface HttpEdgePolicyOptions {
  readonly profile: "development" | "production";
  readonly rateLimiter: RateLimiter;
  readonly allowedOrigins?: readonly string[];
  readonly trustedProxyCidrs?: readonly string[];
  readonly rateLimitWindowMs?: number;
  readonly publicRequestsPerWindow?: number;
  readonly authenticatedReadsPerWindow?: number;
  readonly administrativeMutationsPerWindow?: number;
  readonly executionStartsPerWindow?: number;
  readonly systemAdminRequestsPerWindow?: number;
  readonly runtimeWorkerRequestsPerWindow?: number;
  readonly maxBodyBytes?: number;
  readonly maxHeaderBytes?: number;
  readonly maxHeadersCount?: number;
  readonly headersTimeoutMs?: number;
  readonly requestTimeoutMs?: number;
  readonly keepAliveTimeoutMs?: number;
  readonly maxRequestsPerSocket?: number;
  readonly enableHsts?: boolean;
}

const SUPPORTED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
const PRODUCTION_ALLOWED_HEADERS = ["authorization", "content-type", "x-correlation-id", "x-request-id"] as const;
const DEVELOPMENT_ALLOWED_HEADERS = [
  ...PRODUCTION_ALLOWED_HEADERS,
  "x-acs-actor-id",
  "x-acs-actor-type",
  "x-acs-auth-mode",
  "x-acs-authenticated",
  "x-acs-platform-admin",
  "x-acs-scopes",
  "x-acs-tenant-id",
  "x-acs-wallet",
] as const;

export class ClientAddressResolver {
  readonly #trustedProxies = new BlockList();

  constructor(cidrs: readonly string[] = []) {
    for (const cidr of cidrs) addTrustedEntry(this.#trustedProxies, cidr);
  }

  resolve(request: IncomingMessage): string {
    const peer = normalizeAddress(request.socket?.remoteAddress);
    if (peer === "unknown" || !this.#isTrusted(peer)) return peer;

    const forwarded = headerValue(request, "x-forwarded-for");
    const realIp = headerValue(request, "x-real-ip");
    const candidates = forwarded
      ? forwarded.split(",").map((value) => normalizeAddress(value.trim()))
      : realIp
        ? [normalizeAddress(realIp.trim())]
        : [];
    if (candidates.length === 0 || candidates.some((candidate) => candidate === "unknown")) return peer;

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const candidate = candidates[index];
      if (candidate && !this.#isTrusted(candidate)) return candidate;
    }
    return candidates[0] ?? peer;
  }

  #isTrusted(address: string): boolean {
    const family = isIP(address);
    return family !== 0 && this.#trustedProxies.check(address, family === 4 ? "ipv4" : "ipv6");
  }
}

export class HttpEdgePolicy {
  readonly profile: "development" | "production";
  readonly rateLimiter: RateLimiter;
  readonly clientAddressResolver: ClientAddressResolver;
  readonly limits: HttpEdgeLimits;
  readonly #allowedOrigins: ReadonlySet<string>;
  readonly #allowAnyOrigin: boolean;
  readonly #allowedHeaders: ReadonlySet<string>;
  readonly #policies: Readonly<Record<HttpRouteClass, RateLimitPolicy>>;
  readonly #securityHeaders: Readonly<Record<string, string>>;

  constructor(options: HttpEdgePolicyOptions) {
    this.profile = options.profile;
    this.rateLimiter = options.rateLimiter;
    if (options.profile === "production" && !options.rateLimiter.descriptor.productionOriented) {
      throw new RateLimitConfigurationError(
        "production mode requires a production-oriented rate limiter; disabled/mock/process-local fallback is prohibited",
      );
    }

    const origins = normalizeOrigins(options.allowedOrigins ?? (options.profile === "development" ? ["*"] : []));
    if (options.profile === "production" && (origins.length === 0 || origins.includes("*"))) {
      throw new RateLimitConfigurationError("production mode requires an explicit non-wildcard CORS origin allowlist");
    }
    this.#allowAnyOrigin = origins.includes("*");
    this.#allowedOrigins = new Set(origins);
    this.#allowedHeaders = new Set(options.profile === "production" ? PRODUCTION_ALLOWED_HEADERS : DEVELOPMENT_ALLOWED_HEADERS);
    this.clientAddressResolver = new ClientAddressResolver(options.trustedProxyCidrs);

    const windowMs = positiveInteger(options.rateLimitWindowMs ?? 60_000, "rate-limit window");
    this.#policies = {
      public_health: policy("http.public_health", options.publicRequestsPerWindow ?? 120, windowMs, "network", false),
      authenticated_read: policy("http.authenticated_read", options.authenticatedReadsPerWindow ?? 600, windowMs, "principal", true),
      administrative_mutation: policy("http.administrative_mutation", options.administrativeMutationsPerWindow ?? 120, windowMs, "tenant_principal", true),
      execution_start: policy("http.execution_start", options.executionStartsPerWindow ?? 60, windowMs, "tenant_principal", true),
      system_admin: policy("http.system_admin", options.systemAdminRequestsPerWindow ?? 120, windowMs, "principal", true),
      runtime_worker: policy("http.runtime_worker", options.runtimeWorkerRequestsPerWindow ?? 6_000, windowMs, "principal", true),
    };
    this.limits = {
      maxBodyBytes: positiveInteger(options.maxBodyBytes ?? 1_048_576, "maximum request body bytes"),
      maxHeaderBytes: positiveInteger(options.maxHeaderBytes ?? 16_384, "maximum header bytes"),
      maxHeadersCount: positiveInteger(options.maxHeadersCount ?? 100, "maximum header count"),
      headersTimeoutMs: positiveInteger(options.headersTimeoutMs ?? 10_000, "headers timeout"),
      requestTimeoutMs: positiveInteger(options.requestTimeoutMs ?? 30_000, "request timeout"),
      keepAliveTimeoutMs: positiveInteger(options.keepAliveTimeoutMs ?? 5_000, "keep-alive timeout"),
      maxRequestsPerSocket: positiveInteger(options.maxRequestsPerSocket ?? 1_000, "maximum requests per socket"),
    };
    if (this.limits.headersTimeoutMs > this.limits.requestTimeoutMs) {
      throw new RateLimitConfigurationError("headers timeout cannot exceed request timeout");
    }

    this.#securityHeaders = {
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      "x-frame-options": "DENY",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-resource-policy": "same-origin",
      ...(options.enableHsts ? { "strict-transport-security": "max-age=31536000; includeSubDomains" } : {}),
    };
  }

  routeClass(requestUrl: string, method = "GET"): HttpRouteClass {
    const path = new URL(requestUrl, "http://localhost").pathname.replace(/\/+$/, "") || "/";
    if (path === "/api/v1/health" || path === "/acs/health" || path === "/acs/version") return "public_health";
    if (path.startsWith("/api/v1/internal/runtime/")) return "runtime_worker";
    if (path.startsWith("/api/v1/system/")) return "system_admin";
    if ((path.endsWith("/runtime/start") || path.endsWith("/runtime/stop") || path.endsWith("/execute")) && method !== "GET") {
      return "execution_start";
    }
    if (method !== "GET" && method !== "OPTIONS") return "administrative_mutation";
    return "authenticated_read";
  }

  async consumeNetwork(request: IncomingMessage, requestUrl: string, timestamp = Date.now()): Promise<RateLimitDecision> {
    const routeClass = this.routeClass(requestUrl, request.method);
    const base = routeClass === "runtime_worker" ? this.#policies.runtime_worker : this.#policies.public_health;
    const networkPolicy: RateLimitPolicy = {
      ...base,
      policyId: "http.network." + routeClass,
      keyScope: "network",
      failClosed: routeClass !== "public_health",
    };
    return this.rateLimiter.consume({
      key: "network:" + this.clientAddressResolver.resolve(request),
      policy: networkPolicy,
      timestamp,
    });
  }

  async consumeAuthenticated(
    requestUrl: string,
    method: string | undefined,
    auth: AcsAuthContext,
    defaultTenantId: string,
    timestamp = Date.now(),
  ): Promise<RateLimitDecision | undefined> {
    if (!auth.authenticated || !auth.actorId) return undefined;
    const routeClass = this.routeClass(requestUrl, method);
    if (routeClass === "public_health") return undefined;
    const base = this.#policies[routeClass];
    const tenantId = extractTenantId(requestUrl) ?? auth.tenantId ?? defaultTenantId;
    const key = base.keyScope === "tenant_principal"
      ? "tenant:" + tenantId + ":principal:" + auth.actorId
      : "principal:" + auth.actorId;
    return this.rateLimiter.consume({ key, policy: base, timestamp });
  }

  cors(request: IncomingMessage): CorsDecision {
    const origin = headerValue(request, "origin");
    const baseHeaders: Record<string, string> = {
      vary: "Origin",
      "access-control-allow-methods": SUPPORTED_METHODS.join(", "),
      "access-control-allow-headers": [...this.#allowedHeaders].join(", "),
      "access-control-max-age": "600",
    };
    if (!origin) return { allowed: true, headers: baseHeaders };
    if (!this.#allowAnyOrigin && !this.#allowedOrigins.has(origin)) {
      return { allowed: false, headers: baseHeaders, reason: "origin_not_allowed" };
    }
    const headers = { ...baseHeaders, "access-control-allow-origin": this.#allowAnyOrigin ? "*" : origin };
    if (request.method !== "OPTIONS") return { allowed: true, headers };

    const requestedMethod = headerValue(request, "access-control-request-method")?.toUpperCase();
    if (requestedMethod && !SUPPORTED_METHODS.includes(requestedMethod as typeof SUPPORTED_METHODS[number])) {
      return { allowed: false, headers, reason: "method_not_allowed" };
    }
    const requestedHeaders = (headerValue(request, "access-control-request-headers") ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (requestedHeaders.some((header) => !this.#allowedHeaders.has(header))) {
      return { allowed: false, headers, reason: "header_not_allowed" };
    }
    return { allowed: true, headers };
  }

  responseHeaders(corsHeaders: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> {
    const corsApproved = typeof corsHeaders["access-control-allow-origin"] === "string";
    return {
      ...this.#securityHeaders,
      ...(corsApproved ? { "cross-origin-resource-policy": "cross-origin" } : {}),
      ...corsHeaders,
    };
  }

  async readiness(): Promise<{
    readonly rateLimiter: { readonly configured: boolean; readonly reachable: boolean; readonly productionGrade: boolean; readonly adapter: string };
    readonly cors: { readonly configured: boolean; readonly explicitProductionAllowlist: boolean };
  }> {
    const health = await this.rateLimiter.health();
    return {
      rateLimiter: health,
      cors: {
        configured: this.#allowAnyOrigin || this.#allowedOrigins.size > 0,
        explicitProductionAllowlist: this.profile !== "production" || (!this.#allowAnyOrigin && this.#allowedOrigins.size > 0),
      },
    };
  }
}

export function isRateLimitBackendError(error: unknown): error is RateLimitBackendError {
  return error instanceof RateLimitBackendError;
}

function policy(
  policyId: string,
  limit: number,
  windowMs: number,
  keyScope: RateLimitPolicy["keyScope"],
  failClosed: boolean,
): RateLimitPolicy {
  return { policyId, limit: positiveInteger(limit, policyId + " limit"), windowMs, keyScope, failClosed };
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RateLimitConfigurationError(label + " must be a positive safe integer");
  return value;
}

function normalizeOrigins(origins: readonly string[]): readonly string[] {
  const normalized = origins.map((origin) => origin.trim()).filter(Boolean);
  for (const origin of normalized) {
    if (origin === "*") continue;
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new RateLimitConfigurationError("CORS origins must be exact http(s) origins");
    }
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
      throw new RateLimitConfigurationError("CORS origins must be exact http(s) origins");
    }
  }
  return [...new Set(normalized)];
}

function normalizeAddress(value: string | undefined): string {
  if (!value) return "unknown";
  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  const mapped = trimmed.toLowerCase().startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
  return isIP(mapped) === 0 ? "unknown" : mapped;
}

function addTrustedEntry(blockList: BlockList, entry: string): void {
  const trimmed = entry.trim();
  if (!trimmed) return;
  const slash = trimmed.lastIndexOf("/");
  const address = normalizeAddress(slash >= 0 ? trimmed.slice(0, slash) : trimmed);
  const family = isIP(address);
  if (family === 0) throw new RateLimitConfigurationError("invalid trusted proxy address: " + entry);
  const type = family === 4 ? "ipv4" : "ipv6";
  if (slash < 0) {
    blockList.addAddress(address, type);
    return;
  }
  const prefix = Number(trimmed.slice(slash + 1));
  const maximum = family === 4 ? 32 : 128;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > maximum) {
    throw new RateLimitConfigurationError("invalid trusted proxy CIDR: " + entry);
  }
  blockList.addSubnet(address, prefix, type);
}

function headerValue(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value.join(",") : value;
}

function extractTenantId(requestUrl: string): string | undefined {
  const segments = new URL(requestUrl, "http://localhost").pathname.split("/").filter(Boolean);
  return segments[0] === "api" && segments[1] === "v1" && segments[2] === "admin" && segments[3] === "tenants"
    ? segments[4]
    : undefined;
}
