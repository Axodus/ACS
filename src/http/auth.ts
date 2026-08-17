import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

export type AcsAuthMode = "disabled" | "mock" | "required" | "development" | "oidc";
export type AcsAuthActorType = "system" | "agent" | "tenant-admin" | "user" | "governance";
export type AuthenticationMethod = "development_headers" | "oidc_bearer";

export interface AuthenticatedPrincipal {
  readonly principalId: string;
  readonly issuer: string;
  readonly subject: string;
  readonly authenticationMethod: AuthenticationMethod;
}

export interface AcsAuthContext {
  readonly mode: AcsAuthMode;
  readonly actorType?: AcsAuthActorType;
  readonly actorId?: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly scopes: readonly string[];
  readonly authenticated: boolean;
  readonly trusted: boolean;
  readonly platformAdmin: boolean;
  readonly principal?: AuthenticatedPrincipal;
  readonly warnings: readonly string[];
}

export interface CreateAcsAuthContextInput {
  readonly mode?: AcsAuthMode;
  readonly actorType?: AcsAuthActorType;
  readonly actorId?: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly scopes?: readonly string[];
  readonly authenticated?: boolean;
  readonly trusted?: boolean;
  readonly platformAdmin?: boolean;
  readonly principal?: AuthenticatedPrincipal;
}

export type HttpAuthenticationFailureCode =
  | "missing_credentials"
  | "malformed_token"
  | "invalid_signature"
  | "expired_token"
  | "token_not_active"
  | "invalid_issuer"
  | "invalid_audience"
  | "missing_subject"
  | "unsupported_algorithm"
  | "unknown_signing_key"
  | "identity_provider_unavailable";

export class HttpAuthenticationError extends Error {
  readonly code: HttpAuthenticationFailureCode;

  constructor(code: HttpAuthenticationFailureCode, message: string) {
    super(message);
    this.name = "HttpAuthenticationError";
    this.code = code;
  }
}

export class HttpIdentityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpIdentityConfigurationError";
  }
}

export interface HttpIdentityValidatorDescriptor {
  readonly mode: "development" | "oidc";
  readonly provider: string;
  readonly productionOriented: boolean;
  readonly issuer?: string;
  readonly audience?: string;
}

export interface HttpIdentityValidatorHealth {
  readonly configured: boolean;
  readonly reachable: boolean;
  readonly detail: string;
}

export interface HttpIdentityValidator {
  readonly descriptor: HttpIdentityValidatorDescriptor;
  authenticate(headers: Readonly<Record<string, string | undefined>>): Promise<AcsAuthContext>;
  health(): Promise<HttpIdentityValidatorHealth>;
}

export interface JwksProvider {
  getKey(kid: string, forceRefresh?: boolean): Promise<Readonly<Record<string, unknown>> | undefined>;
  health(): Promise<HttpIdentityValidatorHealth>;
}

const ACTOR_TYPES: readonly AcsAuthActorType[] = ["system", "agent", "tenant-admin", "user", "governance"];

/**
 * Explicit test/DEV context factory. Production HTTP requests are created only
 * by an HttpIdentityValidator and never by this helper.
 */
export function createAcsAuthContext(input: CreateAcsAuthContextInput = {}): AcsAuthContext {
  const mode = input.mode ?? "disabled";
  const authenticated = input.authenticated ?? mode === "disabled";
  const trusted = input.trusted ?? (authenticated && (mode === "disabled" || mode === "mock" || mode === "development"));
  const platformAdmin = input.platformAdmin ?? (trusted && input.actorType === "system");
  const warnings = [
    ...(mode === "disabled" ? ["ACS HTTP auth enforcement is disabled in this direct DEV/test context."] : []),
    ...(mode === "mock" || mode === "development" ? ["ACS HTTP identity uses the explicit development adapter; no production credential validation was performed."] : []),
    ...(mode === "required" && !authenticated ? ["ACS HTTP authentication is required."] : []),
  ];

  return {
    mode,
    ...(input.actorType ? { actorType: input.actorType } : {}),
    ...(input.actorId ? { actorId: input.actorId } : {}),
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.wallet ? { wallet: input.wallet } : {}),
    scopes: input.scopes ?? [],
    authenticated,
    trusted,
    platformAdmin,
    ...(input.principal ? { principal: input.principal } : {}),
    warnings,
  };
}

export function createAnonymousAuthContext(mode: AcsAuthMode): AcsAuthContext {
  return createAcsAuthContext({ mode, authenticated: false, trusted: false, platformAdmin: false });
}

export class DevelopmentHeaderIdentityValidator implements HttpIdentityValidator {
  readonly descriptor: HttpIdentityValidatorDescriptor = {
    mode: "development",
    provider: "development_headers",
    productionOriented: false,
  };

  readonly #defaultPrincipalId: string;
  readonly #defaultPlatformAdmin: boolean;

  constructor(options: { readonly defaultPrincipalId?: string; readonly defaultPlatformAdmin?: boolean } = {}) {
    this.#defaultPrincipalId = options.defaultPrincipalId ?? "system";
    this.#defaultPlatformAdmin = options.defaultPlatformAdmin ?? true;
  }

  async authenticate(headers: Readonly<Record<string, string | undefined>>): Promise<AcsAuthContext> {
    const actorType = parseActorType(headers["x-acs-actor-type"]) ?? "system";
    const actorId = headers["x-acs-actor-id"]?.trim() || this.#defaultPrincipalId;
    const authenticated = headers["x-acs-authenticated"] !== "false";
    const scopes = parseScopes(headers["x-acs-scopes"]);
    const platformAdmin = authenticated
      && actorType === "system"
      && this.#defaultPlatformAdmin;
    return createAcsAuthContext({
      mode: "development",
      actorType,
      actorId,
      ...(headers["x-acs-tenant-id"] ? { tenantId: headers["x-acs-tenant-id"] } : {}),
      ...(headers["x-acs-wallet"] ? { wallet: headers["x-acs-wallet"] } : {}),
      scopes,
      authenticated,
      trusted: authenticated,
      platformAdmin,
      ...(authenticated ? {
        principal: {
          principalId: actorId,
          issuer: "acs-development",
          subject: actorId,
          authenticationMethod: "development_headers",
        },
      } : {}),
    });
  }

  async health(): Promise<HttpIdentityValidatorHealth> {
    return {
      configured: true,
      reachable: true,
      detail: "development header identity adapter is active and is not production-oriented",
    };
  }
}

export class RemoteJwksProvider implements JwksProvider {
  readonly #jwksUri: string;
  readonly #cacheTtlMs: number;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  #keys = new Map<string, Readonly<Record<string, unknown>>>();
  #expiresAt = 0;

  constructor(options: {
    readonly jwksUri: string;
    readonly cacheTtlMs?: number;
    readonly timeoutMs?: number;
    readonly fetch?: typeof fetch;
  }) {
    if (!options.jwksUri.trim()) throw new HttpIdentityConfigurationError("OIDC JWKS URI is required");
    let jwksUrl: URL;
    try {
      jwksUrl = new URL(options.jwksUri);
    } catch {
      throw new HttpIdentityConfigurationError("OIDC JWKS URI must be an absolute HTTPS URL");
    }
    if (jwksUrl.protocol !== "https:") {
      throw new HttpIdentityConfigurationError("OIDC JWKS URI must use HTTPS");
    }
    this.#jwksUri = jwksUrl.toString();
    this.#cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000;
    this.#timeoutMs = positiveIdentityDuration(options.timeoutMs ?? 5_000, "OIDC JWKS timeout");
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async getKey(kid: string, forceRefresh = false): Promise<Readonly<Record<string, unknown>> | undefined> {
    if (forceRefresh || Date.now() >= this.#expiresAt) {
      await this.#refresh();
    }
    return this.#keys.get(kid);
  }

  async health(): Promise<HttpIdentityValidatorHealth> {
    try {
      await this.#refresh();
      return this.#keys.size > 0
        ? { configured: true, reachable: true, detail: `JWKS contains ${this.#keys.size} signing key(s)` }
        : { configured: true, reachable: false, detail: "OIDC JWKS endpoint returned no usable RSA signing keys" };
    } catch {
      return { configured: true, reachable: false, detail: "OIDC JWKS endpoint is unavailable or invalid" };
    }
  }

  async #refresh(): Promise<void> {
    let response: Response;
    try {
      response = await this.#fetch(this.#jwksUri, {
        headers: { accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      throw new HttpAuthenticationError("identity_provider_unavailable", "identity provider signing keys are unavailable");
    }
    if (!response.ok) {
      throw new HttpAuthenticationError("identity_provider_unavailable", "identity provider signing keys are unavailable");
    }
    const document = await response.json() as { readonly keys?: readonly Readonly<Record<string, unknown>>[] };
    if (!Array.isArray(document.keys)) {
      throw new HttpAuthenticationError("identity_provider_unavailable", "identity provider returned an invalid JWKS document");
    }
    const next = new Map<string, Readonly<Record<string, unknown>>>();
    for (const key of document.keys) {
      if (typeof key.kid === "string" && key.kty === "RSA") next.set(key.kid, key);
    }
    this.#keys = next;
    this.#expiresAt = Date.now() + this.#cacheTtlMs;
  }
}

function positiveIdentityDuration(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new HttpIdentityConfigurationError(`${label} must be a positive safe integer`);
  return value;
}

export interface OidcJwtIdentityValidatorOptions {
  readonly issuer: string;
  readonly audience: string;
  readonly jwksUri?: string;
  readonly jwksProvider?: JwksProvider;
  readonly tenantClaim?: string;
  readonly platformAdminClaim?: string;
  readonly platformAdminValue?: string;
  readonly clock?: () => number;
  readonly clockToleranceSeconds?: number;
}

export class OidcJwtIdentityValidator implements HttpIdentityValidator {
  readonly descriptor: HttpIdentityValidatorDescriptor;
  readonly #issuer: string;
  readonly #audience: string;
  readonly #jwksProvider: JwksProvider;
  readonly #tenantClaim: string;
  readonly #platformAdminClaim?: string;
  readonly #platformAdminValue?: string;
  readonly #clock: () => number;
  readonly #clockToleranceSeconds: number;

  constructor(options: OidcJwtIdentityValidatorOptions) {
    this.#issuer = options.issuer.trim();
    this.#audience = options.audience.trim();
    if (!this.#issuer || !this.#audience) {
      throw new HttpIdentityConfigurationError("OIDC issuer and audience are required");
    }
    if (Boolean(options.platformAdminClaim) !== Boolean(options.platformAdminValue)) {
      throw new HttpIdentityConfigurationError("platform admin claim and expected value must be configured together");
    }
    this.#jwksProvider = options.jwksProvider
      ?? new RemoteJwksProvider({ jwksUri: options.jwksUri ?? (() => { throw new HttpIdentityConfigurationError("OIDC JWKS URI is required"); })() });
    this.#tenantClaim = options.tenantClaim ?? "tenant_id";
    this.#platformAdminClaim = options.platformAdminClaim;
    this.#platformAdminValue = options.platformAdminValue;
    this.#clock = options.clock ?? (() => Date.now());
    this.#clockToleranceSeconds = options.clockToleranceSeconds ?? 30;
    this.descriptor = {
      mode: "oidc",
      provider: "oidc_jwt_jwks",
      productionOriented: true,
      issuer: this.#issuer,
      audience: this.#audience,
    };
  }

  async authenticate(headers: Readonly<Record<string, string | undefined>>): Promise<AcsAuthContext> {
    const authorization = headers.authorization?.trim();
    if (!authorization) throw new HttpAuthenticationError("missing_credentials", "Bearer credential is required");
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match) throw new HttpAuthenticationError("malformed_token", "Bearer credential is malformed");
    const token = match[1];
    if (!token) throw new HttpAuthenticationError("malformed_token", "Bearer credential is malformed");
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) {
      throw new HttpAuthenticationError("malformed_token", "Bearer credential is malformed");
    }
    const [encodedHeader, encodedClaims, encodedSignature] = parts as [string, string, string];
    const header = decodeJsonSegment(encodedHeader, "malformed_token");
    const claims = decodeJsonSegment(encodedClaims, "malformed_token");
    if (header.alg !== "RS256") {
      throw new HttpAuthenticationError("unsupported_algorithm", "Bearer credential uses an unsupported signing algorithm");
    }
    if (typeof header.kid !== "string" || !header.kid) {
      throw new HttpAuthenticationError("unknown_signing_key", "Bearer credential does not identify a trusted signing key");
    }
    let jwk = await this.#jwksProvider.getKey(header.kid);
    if (!jwk) jwk = await this.#jwksProvider.getKey(header.kid, true);
    if (!jwk || jwk.kty !== "RSA" || (jwk.alg !== undefined && jwk.alg !== "RS256") || (jwk.use !== undefined && jwk.use !== "sig")) {
      throw new HttpAuthenticationError("unknown_signing_key", "Bearer credential signing key is not trusted");
    }
    let signatureValid = false;
    try {
      signatureValid = verify(
        "RSA-SHA256",
        Buffer.from(`${encodedHeader}.${encodedClaims}`, "ascii"),
        createPublicKey({ key: jwk as JsonWebKey, format: "jwk" }),
        Buffer.from(encodedSignature, "base64url"),
      );
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) throw new HttpAuthenticationError("invalid_signature", "Bearer credential signature is invalid");

    const nowSeconds = Math.floor(this.#clock() / 1000);
    if (claims.iss !== this.#issuer) throw new HttpAuthenticationError("invalid_issuer", "Bearer credential issuer is invalid");
    const audiences = typeof claims.aud === "string" ? [claims.aud] : Array.isArray(claims.aud) ? claims.aud : [];
    if (!audiences.includes(this.#audience)) throw new HttpAuthenticationError("invalid_audience", "Bearer credential audience is invalid");
    if (typeof claims.exp !== "number" || claims.exp + this.#clockToleranceSeconds < nowSeconds) {
      throw new HttpAuthenticationError("expired_token", "Bearer credential has expired");
    }
    if (typeof claims.nbf === "number" && claims.nbf - this.#clockToleranceSeconds > nowSeconds) {
      throw new HttpAuthenticationError("token_not_active", "Bearer credential is not active yet");
    }
    if (typeof claims.sub !== "string" || !claims.sub.trim()) {
      throw new HttpAuthenticationError("missing_subject", "Bearer credential subject is missing");
    }

    const principalId = claims.sub.trim();
    const tenantClaimValue = claims[this.#tenantClaim];
    const tenantId = typeof tenantClaimValue === "string" && tenantClaimValue.trim()
      ? tenantClaimValue.trim()
      : undefined;
    const platformAdmin = this.#platformAdminClaim !== undefined
      && claimContains(claims[this.#platformAdminClaim], this.#platformAdminValue as string);
    return createAcsAuthContext({
      mode: "oidc",
      actorType: "user",
      actorId: principalId,
      ...(tenantId ? { tenantId } : {}),
      scopes: readTokenScopes(claims),
      authenticated: true,
      trusted: true,
      platformAdmin,
      principal: {
        principalId,
        issuer: this.#issuer,
        subject: principalId,
        authenticationMethod: "oidc_bearer",
      },
    });
  }

  async health(): Promise<HttpIdentityValidatorHealth> {
    return this.#jwksProvider.health();
  }
}

/** @deprecated Use DevelopmentHeaderIdentityValidator explicitly. */
export function parseMockAuthContext(headers: Readonly<Record<string, string | undefined>>): AcsAuthContext {
  const actorType = parseActorType(headers["x-acs-actor-type"]);
  const mode = parseAuthMode(headers["x-acs-auth-mode"]);
  const actorId = headers["x-acs-actor-id"];
  return createAcsAuthContext({
    mode,
    ...(actorType ? { actorType } : {}),
    ...(actorId ? { actorId } : {}),
    ...(headers["x-acs-tenant-id"] ? { tenantId: headers["x-acs-tenant-id"] } : {}),
    ...(headers["x-acs-wallet"] ? { wallet: headers["x-acs-wallet"] } : {}),
    scopes: parseScopes(headers["x-acs-scopes"]),
    ...(headers["x-acs-authenticated"] ? { authenticated: headers["x-acs-authenticated"] === "true" } : {}),
  });
}

function parseAuthMode(value: string | undefined): AcsAuthMode {
  if (value === "mock" || value === "required" || value === "development" || value === "oidc") return value;
  return "disabled";
}

function parseActorType(value: string | undefined): AcsAuthActorType | undefined {
  return ACTOR_TYPES.find((candidate) => candidate === value);
}

function parseScopes(value: string | undefined): readonly string[] {
  return (value ?? "").split(",").map((scope) => scope.trim()).filter(Boolean);
}

function decodeJsonSegment(segment: string, code: HttpAuthenticationFailureCode): Readonly<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid JWT JSON");
    return parsed as Readonly<Record<string, unknown>>;
  } catch {
    throw new HttpAuthenticationError(code, "Bearer credential is malformed");
  }
}

function readTokenScopes(claims: Readonly<Record<string, unknown>>): readonly string[] {
  if (typeof claims.scope === "string") return claims.scope.split(/\s+/).filter(Boolean);
  if (Array.isArray(claims.scp)) return claims.scp.filter((value): value is string => typeof value === "string");
  return [];
}

function claimContains(value: unknown, expected: string): boolean {
  if (Array.isArray(value)) return value.some((entry) => String(entry) === expected);
  return value !== undefined && String(value) === expected;
}
