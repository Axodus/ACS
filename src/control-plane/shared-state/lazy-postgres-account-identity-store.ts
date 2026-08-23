import type {
  AccountIdentityStore,
  AcsAccount,
  AcsAuthSession,
  ExternalIdentity,
  SiwxNonceRecord,
  VerifiedWalletIdentity,
} from "../account-identity.js";
import { PostgresSharedAuthoritativeState, type PostgresSharedAuthoritativeStateOptions } from "./postgres-shared-state.js";

export class LazyPostgresAccountIdentityStore implements AccountIdentityStore {
  readonly descriptor = {
    adapter: "postgres-shared-account-identity",
    productionOriented: true,
    durability: "shared_durable",
    multiInstance: "shared_database",
  } as const;

  readonly #state: PostgresSharedAuthoritativeState;
  #ready: Promise<void> | undefined;

  constructor(options: PostgresSharedAuthoritativeStateOptions) {
    this.#state = new PostgresSharedAuthoritativeState(options);
  }

  resolveOrCreateVerifiedIdentity(input: {
    readonly identity: VerifiedWalletIdentity;
    readonly accountId: string;
    readonly identityId: string;
  }): Promise<{ readonly account: AcsAccount; readonly identity: ExternalIdentity; readonly created: boolean }> {
    return this.#delegate((store) => store.resolveOrCreateVerifiedIdentity(input));
  }

  getAccount(accountId: string): Promise<AcsAccount | undefined> {
    return this.#delegate((store) => store.getAccount(accountId));
  }

  saveAccount(account: AcsAccount): Promise<AcsAccount> {
    return this.#delegate((store) => store.saveAccount(account));
  }

  getIdentity(identityId: string): Promise<ExternalIdentity | undefined> {
    return this.#delegate((store) => store.getIdentity(identityId));
  }

  createSession(session: AcsAuthSession): Promise<AcsAuthSession> {
    return this.#delegate((store) => store.createSession(session));
  }

  getSession(sessionId: string): Promise<AcsAuthSession | undefined> {
    return this.#delegate((store) => store.getSession(sessionId));
  }

  saveSession(session: AcsAuthSession): Promise<AcsAuthSession> {
    return this.#delegate((store) => store.saveSession(session));
  }

  revokeSessionsByProviderSessionId(providerSessionId: string, revokedAt: number): Promise<number> {
    return this.#delegate((store) => store.revokeSessionsByProviderSessionId(providerSessionId, revokedAt));
  }

  createNonce(record: SiwxNonceRecord): Promise<SiwxNonceRecord> {
    return this.#delegate((store) => store.createNonce(record));
  }

  consumeNonce(nonceDigest: string, consumedAt: number): Promise<boolean> {
    return this.#delegate((store) => store.consumeNonce(nonceDigest, consumedAt));
  }

  async close(): Promise<void> {
    await this.#state.close();
  }

  async #delegate<T>(operation: (store: AccountIdentityStore) => Promise<T>): Promise<T> {
    await this.#readyState();
    return operation(this.#state.accountIdentity);
  }

  #readyState(): Promise<void> {
    this.#ready ??= this.#state.migrate().then(() => undefined);
    return this.#ready;
  }
}
