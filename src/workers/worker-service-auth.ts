import { createHmac, timingSafeEqual } from "node:crypto";

export interface WorkerServicePrincipal {
  readonly workerId: string;
  readonly instanceId: string;
  readonly subject: string;
  readonly issuer: string;
  readonly audience: string;
  readonly authenticationMethod: "development_headers" | "signed_worker_jwt";
  readonly permittedCapabilities: readonly string[];
}

export interface WorkerServiceIdentityDescriptor {
  readonly mode: "development" | "signed_jwt";
  readonly provider: string;
  readonly productionOriented: boolean;
  readonly issuer?: string;
  readonly audience?: string;
}

export interface WorkerServiceIdentityValidator {
  readonly descriptor: WorkerServiceIdentityDescriptor;
  authenticate(headers: Readonly<Record<string, string | undefined>>): Promise<WorkerServicePrincipal>;
  health(): Promise<{ readonly configured: boolean; readonly reachable: boolean; readonly detail: string }>;
}

export type WorkerAuthenticationFailureCode =
  | "missing_credentials"
  | "malformed_token"
  | "invalid_signature"
  | "expired_token"
  | "token_not_active"
  | "invalid_issuer"
  | "invalid_audience"
  | "missing_subject"
  | "missing_worker_instance"
  | "unsupported_algorithm";

export class WorkerAuthenticationError extends Error {
  constructor(readonly code: WorkerAuthenticationFailureCode, message: string) {
    super(message);
    this.name = "WorkerAuthenticationError";
  }
}

export class WorkerIdentityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerIdentityConfigurationError";
  }
}

export class DevelopmentWorkerIdentityValidator implements WorkerServiceIdentityValidator {
  readonly descriptor: WorkerServiceIdentityDescriptor = {
    mode: "development",
    provider: "development_worker_headers",
    productionOriented: false,
  };

  async authenticate(headers: Readonly<Record<string, string | undefined>>): Promise<WorkerServicePrincipal> {
    const workerId = headers["x-acs-worker-id"]?.trim();
    const instanceId = headers["x-acs-worker-instance-id"]?.trim();
    if (!workerId || !instanceId) throw new WorkerAuthenticationError("missing_credentials", "worker development identity is required");
    return {
      workerId,
      instanceId,
      subject: `development:${workerId}`,
      issuer: "acs-development",
      audience: "acs-runtime-worker",
      authenticationMethod: "development_headers",
      permittedCapabilities: ["*"],
    };
  }

  async health(): Promise<{ readonly configured: true; readonly reachable: true; readonly detail: string }> {
    return { configured: true, reachable: true, detail: "explicit development worker identity" };
  }
}

export interface SignedWorkerTokenClaims {
  readonly iss: string;
  readonly aud: string;
  readonly sub: string;
  readonly instance_id: string;
  readonly capabilities: readonly string[];
  readonly iat: number;
  readonly nbf?: number;
  readonly exp: number;
}

export interface SignedWorkerIdentityValidatorOptions {
  readonly issuer: string;
  readonly audience: string;
  readonly signingKey: string;
  readonly clockToleranceSeconds?: number;
  readonly now?: () => number;
}

export class SignedWorkerIdentityValidator implements WorkerServiceIdentityValidator {
  readonly descriptor: WorkerServiceIdentityDescriptor;
  readonly #issuer: string;
  readonly #audience: string;
  readonly #signingKey: string;
  readonly #clockToleranceSeconds: number;
  readonly #now: () => number;

  constructor(options: SignedWorkerIdentityValidatorOptions) {
    if (!options.issuer.trim()) throw new WorkerIdentityConfigurationError("worker token issuer is required");
    if (!options.audience.trim()) throw new WorkerIdentityConfigurationError("worker token audience is required");
    if (Buffer.byteLength(options.signingKey, "utf8") < 32) {
      throw new WorkerIdentityConfigurationError("worker token signing key must contain at least 32 bytes");
    }
    this.#issuer = options.issuer;
    this.#audience = options.audience;
    this.#signingKey = options.signingKey;
    this.#clockToleranceSeconds = options.clockToleranceSeconds ?? 5;
    this.#now = options.now ?? (() => Date.now());
    this.descriptor = {
      mode: "signed_jwt",
      provider: "hs256-signed-worker-credential",
      productionOriented: true,
      issuer: this.#issuer,
      audience: this.#audience,
    };
  }

  async authenticate(headers: Readonly<Record<string, string | undefined>>): Promise<WorkerServicePrincipal> {
    const authorization = headers.authorization;
    if (!authorization?.startsWith("Bearer ")) throw new WorkerAuthenticationError("missing_credentials", "worker bearer credential is required");
    const token = authorization.slice("Bearer ".length).trim();
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) throw new WorkerAuthenticationError("malformed_token", "worker credential is malformed");
    const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
    const header = decodeObject(encodedHeader, "malformed_token");
    if (header.alg !== "HS256") throw new WorkerAuthenticationError("unsupported_algorithm", "worker credential algorithm is not allowed");
    const expected = createHmac("sha256", this.#signingKey).update(encodedHeader + "." + encodedPayload).digest();
    const actual = decodeBase64Url(encodedSignature, "malformed_token");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new WorkerAuthenticationError("invalid_signature", "worker credential signature is invalid");
    }
    const claims = decodeObject(encodedPayload, "malformed_token");
    if (claims.iss !== this.#issuer) throw new WorkerAuthenticationError("invalid_issuer", "worker credential issuer is invalid");
    if (claims.aud !== this.#audience) throw new WorkerAuthenticationError("invalid_audience", "worker credential audience is invalid");
    if (typeof claims.sub !== "string" || !claims.sub.trim()) throw new WorkerAuthenticationError("missing_subject", "worker credential subject is required");
    if (typeof claims.instance_id !== "string" || !claims.instance_id.trim()) {
      throw new WorkerAuthenticationError("missing_worker_instance", "worker credential instance is required");
    }
    if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp)) throw new WorkerAuthenticationError("malformed_token", "worker credential expiration is required");
    const nowSeconds = Math.floor(this.#now() / 1000);
    if (claims.exp + this.#clockToleranceSeconds < nowSeconds) throw new WorkerAuthenticationError("expired_token", "worker credential is expired");
    if (typeof claims.nbf === "number" && claims.nbf - this.#clockToleranceSeconds > nowSeconds) {
      throw new WorkerAuthenticationError("token_not_active", "worker credential is not active");
    }
    const capabilities = Array.isArray(claims.capabilities)
      ? claims.capabilities.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : [];
    return {
      workerId: claims.sub,
      instanceId: claims.instance_id,
      subject: claims.sub,
      issuer: claims.iss,
      audience: claims.aud,
      authenticationMethod: "signed_worker_jwt",
      permittedCapabilities: capabilities,
    };
  }

  async health(): Promise<{ readonly configured: true; readonly reachable: true; readonly detail: string }> {
    return { configured: true, reachable: true, detail: "signed worker credential validation is configured" };
  }
}

export function issueSignedWorkerToken(input: {
  readonly issuer: string;
  readonly audience: string;
  readonly signingKey: string;
  readonly workerId: string;
  readonly instanceId: string;
  readonly capabilities?: readonly string[];
  readonly issuedAt?: number;
  readonly expiresAt: number;
  readonly notBefore?: number;
}): string {
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const issuedAt = Math.floor((input.issuedAt ?? Date.now()) / 1000);
  const payload = encodeJson({
    iss: input.issuer,
    aud: input.audience,
    sub: input.workerId,
    instance_id: input.instanceId,
    capabilities: input.capabilities ?? [],
    iat: issuedAt,
    ...(input.notBefore !== undefined ? { nbf: Math.floor(input.notBefore / 1000) } : {}),
    exp: Math.floor(input.expiresAt / 1000),
  });
  const signature = createHmac("sha256", input.signingKey).update(header + "." + payload).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeObject(value: string, code: WorkerAuthenticationFailureCode): Record<string, unknown> {
  try {
    const parsed = JSON.parse(decodeBase64Url(value, code).toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof WorkerAuthenticationError) throw error;
    throw new WorkerAuthenticationError(code, "worker credential contains invalid JSON");
  }
}

function decodeBase64Url(value: string, code: WorkerAuthenticationFailureCode): Buffer {
  try {
    return Buffer.from(value, "base64url");
  } catch {
    throw new WorkerAuthenticationError(code, "worker credential encoding is invalid");
  }
}
