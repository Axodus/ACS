import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { AcsError } from "../errors.js";

export type AcsAccountStatus = "active" | "suspended" | "disabled";
export type ExternalIdentityProvider = "reown_siwx";
export type ExternalIdentityType = "wallet";
export type ExternalIdentityNamespace = "eip155";
export type ExternalIdentityVerificationState = "verified";

export interface AcsAccount {
  readonly accountId: string;
  readonly status: AcsAccountStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastAuthenticatedAt?: number;
}

export interface ExternalIdentity {
  readonly identityId: string;
  readonly accountId: string;
  readonly provider: ExternalIdentityProvider;
  readonly identityType: ExternalIdentityType;
  readonly namespace: ExternalIdentityNamespace;
  readonly subject: string;
  readonly normalizedAddress: string;
  readonly caip10: string;
  readonly verificationState: ExternalIdentityVerificationState;
  readonly verifiedAt: number;
  readonly lastAuthenticatedAt: number;
}

export interface VerifiedWalletIdentity {
  readonly provider: ExternalIdentityProvider;
  readonly providerSubject: string;
  readonly providerSessionId: string;
  readonly namespace: ExternalIdentityNamespace;
  readonly normalizedAddress: string;
  readonly caip10: string;
  readonly chainId: number;
  readonly verifiedAt: number;
  readonly artifactExpiresAt?: number;
}

export interface AcsAuthSession {
  readonly sessionId: string;
  readonly accountId: string;
  readonly identityId: string;
  readonly providerSessionId: string;
  readonly tokenDigest: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly revokedAt?: number;
  readonly lastSeenAt?: number;
}

export type AcsAuthSessionReadModel = Omit<AcsAuthSession, "tokenDigest" | "providerSessionId">;

export interface SiwxNonceRecord {
  readonly nonceDigest: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly consumedAt?: number;
}

export interface AccountIdentityStoreDescriptor {
  readonly adapter: string;
  readonly productionOriented: boolean;
  readonly durability: "process_local" | "shared_durable";
  readonly multiInstance: "not_supported" | "shared_database";
}

export interface AccountIdentityStore {
  readonly descriptor: AccountIdentityStoreDescriptor;
  resolveOrCreateVerifiedIdentity(input: {
    readonly identity: VerifiedWalletIdentity;
    readonly accountId: string;
    readonly identityId: string;
  }): Promise<{ readonly account: AcsAccount; readonly identity: ExternalIdentity; readonly created: boolean }>;
  getAccount(accountId: string): Promise<AcsAccount | undefined>;
  saveAccount(account: AcsAccount): Promise<AcsAccount>;
  getIdentity(identityId: string): Promise<ExternalIdentity | undefined>;
  createSession(session: AcsAuthSession): Promise<AcsAuthSession>;
  getSession(sessionId: string): Promise<AcsAuthSession | undefined>;
  saveSession(session: AcsAuthSession): Promise<AcsAuthSession>;
  revokeSessionsByProviderSessionId(providerSessionId: string, revokedAt: number): Promise<number>;
  createNonce(record: SiwxNonceRecord): Promise<SiwxNonceRecord>;
  consumeNonce(nonceDigest: string, consumedAt: number): Promise<boolean>;
  close?(): Promise<void>;
}

export class AccountIdentityError extends AcsError {}

export class InvalidWalletIdentityError extends AccountIdentityError {
  constructor(message = "invalid wallet identity") {
    super(message, "ACS_ACCOUNT_WALLET_IDENTITY_INVALID");
  }
}

export class AccountNotFoundError extends AccountIdentityError {
  constructor(accountId: string) {
    super("account not found: " + accountId, "ACS_ACCOUNT_NOT_FOUND");
  }
}

export class AccountSuspendedError extends AccountIdentityError {
  constructor(readonly accountId: string) {
    super("account is suspended", "ACS_ACCOUNT_SUSPENDED");
  }
}

export class AccountDisabledError extends AccountIdentityError {
  constructor(readonly accountId: string) {
    super("account is disabled", "ACS_ACCOUNT_DISABLED");
  }
}

export class InvalidAcsSessionError extends AccountIdentityError {
  constructor(message = "ACS session is invalid") {
    super(message, "ACS_SESSION_INVALID");
  }
}

export class ExpiredAcsSessionError extends AccountIdentityError {
  constructor() {
    super("ACS session has expired", "ACS_SESSION_EXPIRED");
  }
}

export class RevokedAcsSessionError extends AccountIdentityError {
  constructor() {
    super("ACS session has been revoked", "ACS_SESSION_REVOKED");
  }
}

export class InvalidSiwxNonceError extends AccountIdentityError {
  constructor() {
    super("SIWX nonce is invalid, expired or already consumed", "ACS_SIWX_NONCE_INVALID");
  }
}

export class InMemoryAccountIdentityStore implements AccountIdentityStore {
  readonly descriptor: AccountIdentityStoreDescriptor = {
    adapter: "memory-account-identity",
    productionOriented: false,
    durability: "process_local",
    multiInstance: "not_supported",
  };

  readonly #accounts = new Map<string, AcsAccount>();
  readonly #identities = new Map<string, ExternalIdentity>();
  readonly #identityKeys = new Map<string, string>();
  readonly #sessions = new Map<string, AcsAuthSession>();
  readonly #nonces = new Map<string, SiwxNonceRecord>();

  async resolveOrCreateVerifiedIdentity(input: {
    readonly identity: VerifiedWalletIdentity;
    readonly accountId: string;
    readonly identityId: string;
  }): Promise<{ readonly account: AcsAccount; readonly identity: ExternalIdentity; readonly created: boolean }> {
    const key = identityKey(input.identity.provider, input.identity.namespace, input.identity.providerSubject);
    const existingIdentityId = this.#identityKeys.get(key);
    if (existingIdentityId) {
      const existingIdentity = this.#identities.get(existingIdentityId);
      if (!existingIdentity) throw new InvalidWalletIdentityError("identity index is inconsistent");
      const account = this.#accounts.get(existingIdentity.accountId);
      if (!account) throw new AccountNotFoundError(existingIdentity.accountId);
      assertAccountUsable(account);
      const nextIdentity: ExternalIdentity = {
        ...existingIdentity,
        caip10: input.identity.caip10,
        verifiedAt: input.identity.verifiedAt,
        lastAuthenticatedAt: input.identity.verifiedAt,
      };
      const nextAccount: AcsAccount = {
        ...account,
        updatedAt: input.identity.verifiedAt,
        lastAuthenticatedAt: input.identity.verifiedAt,
      };
      this.#identities.set(existingIdentityId, nextIdentity);
      this.#accounts.set(account.accountId, nextAccount);
      return { account: nextAccount, identity: nextIdentity, created: false };
    }

    const account: AcsAccount = {
      accountId: input.accountId,
      status: "active",
      createdAt: input.identity.verifiedAt,
      updatedAt: input.identity.verifiedAt,
      lastAuthenticatedAt: input.identity.verifiedAt,
    };
    const identity: ExternalIdentity = {
      identityId: input.identityId,
      accountId: input.accountId,
      provider: input.identity.provider,
      identityType: "wallet",
      namespace: input.identity.namespace,
      subject: input.identity.providerSubject,
      normalizedAddress: input.identity.normalizedAddress,
      caip10: input.identity.caip10,
      verificationState: "verified",
      verifiedAt: input.identity.verifiedAt,
      lastAuthenticatedAt: input.identity.verifiedAt,
    };
    this.#accounts.set(account.accountId, account);
    this.#identities.set(identity.identityId, identity);
    this.#identityKeys.set(key, identity.identityId);
    return { account, identity, created: true };
  }

  async getAccount(accountId: string): Promise<AcsAccount | undefined> {
    return this.#accounts.get(accountId);
  }

  async saveAccount(account: AcsAccount): Promise<AcsAccount> {
    if (!this.#accounts.has(account.accountId)) throw new AccountNotFoundError(account.accountId);
    this.#accounts.set(account.accountId, account);
    return account;
  }

  async getIdentity(identityId: string): Promise<ExternalIdentity | undefined> {
    return this.#identities.get(identityId);
  }

  async createSession(session: AcsAuthSession): Promise<AcsAuthSession> {
    if (this.#sessions.has(session.sessionId)) throw new InvalidAcsSessionError("session identity already exists");
    this.#sessions.set(session.sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<AcsAuthSession | undefined> {
    return this.#sessions.get(sessionId);
  }

  async saveSession(session: AcsAuthSession): Promise<AcsAuthSession> {
    if (!this.#sessions.has(session.sessionId)) throw new InvalidAcsSessionError("session not found");
    this.#sessions.set(session.sessionId, session);
    return session;
  }

  async revokeSessionsByProviderSessionId(providerSessionId: string, revokedAt: number): Promise<number> {
    let revoked = 0;
    for (const [sessionId, session] of this.#sessions) {
      if (session.providerSessionId !== providerSessionId || session.revokedAt !== undefined) continue;
      this.#sessions.set(sessionId, { ...session, revokedAt });
      revoked += 1;
    }
    return revoked;
  }

  async createNonce(record: SiwxNonceRecord): Promise<SiwxNonceRecord> {
    this.#nonces.set(record.nonceDigest, record);
    return record;
  }

  async consumeNonce(nonceDigest: string, consumedAt: number): Promise<boolean> {
    const record = this.#nonces.get(nonceDigest);
    if (!record || record.consumedAt !== undefined || record.expiresAt <= consumedAt) return false;
    this.#nonces.set(nonceDigest, { ...record, consumedAt });
    return true;
  }
}

export interface AccountIdentityServiceOptions {
  readonly store?: AccountIdentityStore;
  readonly clock?: () => number;
  readonly sessionTtlMs?: number;
  readonly nonceTtlMs?: number;
  readonly randomSecret?: (bytes: number) => Buffer;
  readonly idFactory?: () => string;
}

export class AccountIdentityService {
  readonly store: AccountIdentityStore;
  readonly #clock: () => number;
  readonly #sessionTtlMs: number;
  readonly #nonceTtlMs: number;
  readonly #randomSecret: (bytes: number) => Buffer;
  readonly #idFactory: () => string;

  constructor(options: AccountIdentityServiceOptions = {}) {
    this.store = options.store ?? new InMemoryAccountIdentityStore();
    this.#clock = options.clock ?? (() => Date.now());
    this.#sessionTtlMs = positiveDuration(options.sessionTtlMs ?? 15 * 60 * 1000, "session TTL");
    this.#nonceTtlMs = positiveDuration(options.nonceTtlMs ?? 5 * 60 * 1000, "nonce TTL");
    this.#randomSecret = options.randomSecret ?? randomBytes;
    this.#idFactory = options.idFactory ?? randomUUID;
  }

  async createNonce(): Promise<{ readonly nonce: string; readonly expiresAt: number }> {
    // EIP-4361 requires an alphanumeric nonce. Hex preserves 128 bits of
    // entropy while remaining valid in the canonical SIWX/SIWE message.
    const nonce = this.#randomSecret(16).toString("hex");
    const createdAt = this.#clock();
    const expiresAt = createdAt + this.#nonceTtlMs;
    await this.store.createNonce({ nonceDigest: digest(nonce), createdAt, expiresAt });
    return { nonce, expiresAt };
  }

  async consumeNonce(nonce: string): Promise<void> {
    if (!nonce.trim() || !await this.store.consumeNonce(digest(nonce), this.#clock())) {
      throw new InvalidSiwxNonceError();
    }
  }

  async exchangeVerifiedIdentity(identity: VerifiedWalletIdentity): Promise<{
    readonly accessToken: string;
    readonly session: AcsAuthSessionReadModel;
    readonly account: AcsAccount;
    readonly externalIdentity: ExternalIdentity;
    readonly accountCreated: boolean;
  }> {
    validateVerifiedIdentity(identity);
    const resolved = await this.store.resolveOrCreateVerifiedIdentity({
      identity,
      accountId: "acct_" + this.#idFactory(),
      identityId: "identity_" + this.#idFactory(),
    });
    assertAccountUsable(resolved.account);
    const now = this.#clock();
    await this.store.revokeSessionsByProviderSessionId(identity.providerSessionId, now);
    const sessionId = "session_" + this.#idFactory();
    const secret = this.#randomSecret(32).toString("base64url");
    const session: AcsAuthSession = {
      sessionId,
      accountId: resolved.account.accountId,
      identityId: resolved.identity.identityId,
      providerSessionId: identity.providerSessionId,
      tokenDigest: digest(secret),
      createdAt: now,
      expiresAt: now + this.#sessionTtlMs,
    };
    await this.store.createSession(session);
    return {
      accessToken: sessionId + "." + secret,
      session: publicSession(session),
      account: resolved.account,
      externalIdentity: resolved.identity,
      accountCreated: resolved.created,
    };
  }

  async authenticateSessionToken(accessToken: string): Promise<{
    readonly account: AcsAccount;
    readonly identity: ExternalIdentity;
    readonly session: AcsAuthSession;
  }> {
    const parsed = parseSessionToken(accessToken);
    const session = await this.store.getSession(parsed.sessionId);
    if (!session || !secureDigestEqual(session.tokenDigest, digest(parsed.secret))) {
      throw new InvalidAcsSessionError();
    }
    const now = this.#clock();
    if (session.revokedAt !== undefined) throw new RevokedAcsSessionError();
    if (session.expiresAt <= now) throw new ExpiredAcsSessionError();
    const account = await this.store.getAccount(session.accountId);
    if (!account) throw new AccountNotFoundError(session.accountId);
    assertAccountUsable(account);
    const identity = await this.store.getIdentity(session.identityId);
    if (!identity) throw new InvalidWalletIdentityError("session identity not found");
    const touched = { ...session, lastSeenAt: now };
    await this.store.saveSession(touched);
    return { account, identity, session: touched };
  }

  async revokeSession(accessToken: string): Promise<void> {
    const parsed = parseSessionToken(accessToken);
    const session = await this.store.getSession(parsed.sessionId);
    if (!session || !secureDigestEqual(session.tokenDigest, digest(parsed.secret))) {
      throw new InvalidAcsSessionError();
    }
    if (session.revokedAt === undefined) {
      await this.store.saveSession({ ...session, revokedAt: this.#clock() });
    }
  }

  async getAccount(accountId: string): Promise<AcsAccount> {
    const account = await this.store.getAccount(accountId);
    if (!account) throw new AccountNotFoundError(accountId);
    return account;
  }

  async setAccountStatus(accountId: string, status: AcsAccountStatus): Promise<AcsAccount> {
    const account = await this.getAccount(accountId);
    const updatedAt = this.#clock();
    return this.store.saveAccount({ ...account, status, updatedAt });
  }
}

export function normalizeEvmAddress(address: string): string {
  const normalized = address.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) throw new InvalidWalletIdentityError("EVM address must be a 20-byte hexadecimal value");
  return normalized;
}

export function createEvmWalletIdentity(input: {
  readonly address: string;
  readonly chainId: number;
  readonly providerSessionId: string;
  readonly verifiedAt: number;
  readonly artifactExpiresAt?: number;
}): VerifiedWalletIdentity {
  if (!Number.isSafeInteger(input.chainId) || input.chainId <= 0) throw new InvalidWalletIdentityError("EVM chain id must be a positive safe integer");
  if (!input.providerSessionId.trim()) throw new InvalidWalletIdentityError("provider session identity is required");
  const normalizedAddress = normalizeEvmAddress(input.address);
  const providerSubject = "reown_siwx:eip155:" + normalizedAddress;
  return {
    provider: "reown_siwx",
    providerSubject,
    providerSessionId: input.providerSessionId,
    namespace: "eip155",
    normalizedAddress,
    caip10: "eip155:" + String(input.chainId) + ":" + normalizedAddress,
    chainId: input.chainId,
    verifiedAt: input.verifiedAt,
    ...(input.artifactExpiresAt !== undefined ? { artifactExpiresAt: input.artifactExpiresAt } : {}),
  };
}

function identityKey(provider: ExternalIdentityProvider, namespace: ExternalIdentityNamespace, subject: string): string {
  return provider + "::" + namespace + "::" + subject;
}

function validateVerifiedIdentity(identity: VerifiedWalletIdentity): void {
  const expected = createEvmWalletIdentity({
    address: identity.normalizedAddress,
    chainId: identity.chainId,
    providerSessionId: identity.providerSessionId,
    verifiedAt: identity.verifiedAt,
    ...(identity.artifactExpiresAt !== undefined ? { artifactExpiresAt: identity.artifactExpiresAt } : {}),
  });
  if (identity.provider !== expected.provider
    || identity.namespace !== expected.namespace
    || identity.providerSubject !== expected.providerSubject
    || identity.caip10 !== expected.caip10) {
    throw new InvalidWalletIdentityError("verified wallet identity is not canonical");
  }
}

function assertAccountUsable(account: AcsAccount): void {
  if (account.status === "suspended") throw new AccountSuspendedError(account.accountId);
  if (account.status === "disabled") throw new AccountDisabledError(account.accountId);
}

function parseSessionToken(accessToken: string): { readonly sessionId: string; readonly secret: string } {
  const separator = accessToken.indexOf(".");
  if (separator <= 0 || separator === accessToken.length - 1 || accessToken.indexOf(".", separator + 1) !== -1) {
    throw new InvalidAcsSessionError();
  }
  const sessionId = accessToken.slice(0, separator);
  const secret = accessToken.slice(separator + 1);
  if (!sessionId.startsWith("session_") || !secret) throw new InvalidAcsSessionError();
  return { sessionId, secret };
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function secureDigestEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "base64url");
  const rightBuffer = Buffer.from(right, "base64url");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function publicSession(session: AcsAuthSession): AcsAuthSessionReadModel {
  const { tokenDigest: _tokenDigest, providerSessionId: _providerSessionId, ...safe } = session;
  return safe;
}

function positiveDuration(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(label + " must be a positive safe integer");
  return value;
}
