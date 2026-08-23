import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";

const {
  AccountIdentityService,
  AccountSuspendedError,
  ExpiredAcsSessionError,
  InMemoryAccountIdentityStore,
  InvalidSiwxNonceError,
  RevokedAcsSessionError,
  SHARED_STATE_MIGRATIONS,
  SHARED_STATE_SCHEMA_VERSION,
  SiwxSessionIdentityValidator,
  SiwxArtifactVerificationError,
  ViemSiwxArtifactVerifier,
  createEvmWalletIdentity,
  routeProductApiRequest,
} = await import(process.env.ACS_TEST_DIST_URL ?? new URL("../dist/index.js", import.meta.url).href);
const { createControlPlaneContext } = await import(
  process.env.ACS_TEST_CONTEXT_DIST_URL ?? new URL("../dist/http/control-plane-context.js", import.meta.url).href
);

const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";

function deterministicService(start = 1_000_000) {
  let now = start;
  let id = 0;
  let secret = 1;
  const store = new InMemoryAccountIdentityStore();
  const service = new AccountIdentityService({
    store,
    clock: () => now,
    idFactory: () => `id-${++id}`,
    randomSecret: (bytes) => Buffer.alloc(bytes, secret++),
  });
  return {
    service,
    store,
    now: () => now,
    setNow: (value) => { now = value; },
  };
}

function walletIdentity({
  address = ADDRESS_A,
  chainId = 84532,
  providerSessionId = "provider-session-1",
  verifiedAt = 1_000_000,
} = {}) {
  return createEvmWalletIdentity({ address, chainId, providerSessionId, verifiedAt });
}

function jsonRequest(method, payload, authorization) {
  const serialized = JSON.stringify(payload);
  return {
    method,
    url: "",
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization: `Bearer ${authorization}` } : {}),
    },
    on(event, callback) {
      if (event === "data") callback(serialized);
      if (event === "end") callback();
    },
  };
}

function getRequest(authorization) {
  return {
    method: "GET",
    url: "",
    headers: authorization ? { authorization: `Bearer ${authorization}` } : {},
  };
}

function createSiwxTestContext(options) {
  return createControlPlaneContext({
    runtimeMode: "local",
    startLocalWorker: false,
    useDurableRuntimeState: false,
    useDurableAdministrativeState: false,
    useDurableAgentState: false,
    useDurableDeploymentState: false,
    useDurableSecretCatalog: false,
    useDurableEconomicState: false,
    useDurableRateLimitStore: false,
    ...options,
  });
}

test("provider + namespace + subject resolves one chain-agnostic ACS Account", async () => {
  const { service } = deterministicService();
  const base = await service.exchangeVerifiedIdentity(walletIdentity());
  const otherChain = await service.exchangeVerifiedIdentity(walletIdentity({
    chainId: 11155111,
    providerSessionId: "provider-session-2",
    verifiedAt: 1_000_100,
  }));

  assert.equal(otherChain.account.accountId, base.account.accountId);
  assert.equal(otherChain.externalIdentity.identityId, base.externalIdentity.identityId);
  assert.equal(otherChain.externalIdentity.subject, `reown_siwx:eip155:${ADDRESS_A}`);
  assert.equal(otherChain.externalIdentity.caip10, `eip155:11155111:${ADDRESS_A}`);
  assert.equal(otherChain.accountCreated, false);
});

test("a verified wallet creates an Account without inventing Tenant membership", async () => {
  const { service } = deterministicService();
  const exchanged = await service.exchangeVerifiedIdentity(walletIdentity());

  assert.equal(exchanged.account.status, "active");
  assert.equal(exchanged.externalIdentity.accountId, exchanged.account.accountId);
  assert.equal("tenantId" in exchanged.account, false);
  assert.equal("roles" in exchanged.account, false);
  assert.equal("permissions" in exchanged.account, false);
});

test("ACS sessions use a 256-bit secret and persist only its SHA-256 digest", async () => {
  const { service, store } = deterministicService();
  const exchanged = await service.exchangeVerifiedIdentity(walletIdentity());
  const [sessionId, secret] = exchanged.accessToken.split(".");
  const persisted = await store.getSession(sessionId);

  assert.equal(Buffer.from(secret, "base64url").byteLength, 32);
  assert.ok(persisted);
  assert.notEqual(persisted.tokenDigest, exchanged.accessToken);
  assert.notEqual(persisted.tokenDigest, secret);
  assert.equal(Buffer.from(persisted.tokenDigest, "base64url").byteLength, 32);
  assert.equal("tokenDigest" in exchanged.session, false);
  assert.equal("providerSessionId" in exchanged.session, false);
});

test("session TTL is fixed at 15 minutes and lastSeenAt never extends it", async () => {
  const fixture = deterministicService();
  const exchanged = await fixture.service.exchangeVerifiedIdentity(walletIdentity());
  const fixedExpiry = fixture.now() + 15 * 60 * 1000;
  assert.equal(exchanged.session.expiresAt, fixedExpiry);

  fixture.setNow(fixture.now() + 60_000);
  const authenticated = await fixture.service.authenticateSessionToken(exchanged.accessToken);
  assert.equal(authenticated.session.lastSeenAt, fixture.now());
  assert.equal(authenticated.session.expiresAt, fixedExpiry);

  fixture.setNow(fixedExpiry);
  await assert.rejects(
    () => fixture.service.authenticateSessionToken(exchanged.accessToken),
    ExpiredAcsSessionError,
  );
});

test("revocation is immediate and deterministic", async () => {
  const { service } = deterministicService();
  const exchanged = await service.exchangeVerifiedIdentity(walletIdentity());
  await service.revokeSession(exchanged.accessToken);
  await service.revokeSession(exchanged.accessToken);
  await assert.rejects(
    () => service.authenticateSessionToken(exchanged.accessToken),
    RevokedAcsSessionError,
  );
});

test("Account suspension rejects existing sessions and new SIWX exchange without mutating authentication evidence", async () => {
  const fixture = deterministicService();
  const exchanged = await fixture.service.exchangeVerifiedIdentity(walletIdentity());
  const previousLastAuthenticatedAt = exchanged.account.lastAuthenticatedAt;
  fixture.setNow(fixture.now() + 1_000);
  await fixture.service.setAccountStatus(exchanged.account.accountId, "suspended");

  await assert.rejects(
    () => fixture.service.authenticateSessionToken(exchanged.accessToken),
    AccountSuspendedError,
  );
  await assert.rejects(
    () => fixture.service.exchangeVerifiedIdentity(walletIdentity({
      providerSessionId: "provider-session-after-suspension",
      verifiedAt: fixture.now(),
    })),
    AccountSuspendedError,
  );
  const suspended = await fixture.service.getAccount(exchanged.account.accountId);
  assert.equal(suspended.lastAuthenticatedAt, previousLastAuthenticatedAt);
});

test("SIWX nonces are single-use and time bounded", async () => {
  const fixture = deterministicService();
  const first = await fixture.service.createNonce();
  await fixture.service.consumeNonce(first.nonce);
  await assert.rejects(() => fixture.service.consumeNonce(first.nonce), InvalidSiwxNonceError);

  const expired = await fixture.service.createNonce();
  fixture.setNow(expired.expiresAt);
  await assert.rejects(() => fixture.service.consumeNonce(expired.nonce), InvalidSiwxNonceError);
});

test("official SIWX message/signature is verified server-side and derives identity from the signed message", async () => {
  const fixture = deterministicService();
  const account = privateKeyToAccount("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const { nonce } = await fixture.service.createNonce();
  const message = createSiweMessage({
    address: account.address,
    chainId: 84532,
    domain: "localhost:3000",
    nonce,
    uri: "http://localhost:3000",
    version: "1",
    issuedAt: new Date(fixture.now()),
    expirationTime: new Date(fixture.now() + 60_000),
  });
  const signature = await account.signMessage({ message });
  const verifier = new ViemSiwxArtifactVerifier({
    accountIdentity: fixture.service,
    allowedOrigins: ["http://localhost:3000"],
    chains: [{ chainId: 84532, name: "Base Sepolia", rpcUrl: "http://127.0.0.1:1" }],
    clock: fixture.now,
    rpcTimeoutMs: 100,
  });

  const verified = await verifier.verify({
    message,
    signature,
    address: ADDRESS_B,
    chainId: 1,
    trusted: true,
  });
  assert.equal(verified.normalizedAddress, account.address.toLowerCase());
  assert.equal(verified.chainId, 84532);
  assert.equal(verified.caip10, `eip155:84532:${account.address.toLowerCase()}`);
  assert.equal(verified.verifiedAt, fixture.now());
  assert.equal(verifier.descriptor.serverVerified, true);
  assert.equal(verifier.descriptor.productionOriented, false);
  await assert.rejects(() => verifier.verify({ message, signature }), InvalidSiwxNonceError);
});

test("SIWX verifier rejects disallowed domains and unsupported chains before identity exchange", async () => {
  const fixture = deterministicService();
  const account = privateKeyToAccount("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  const verifier = new ViemSiwxArtifactVerifier({
    accountIdentity: fixture.service,
    allowedOrigins: ["https://acs-app.axodus.country"],
    chains: [{ chainId: 84532, name: "Base Sepolia", rpcUrl: "https://rpc.example.invalid" }],
    clock: fixture.now,
  });
  const domainNonce = (await fixture.service.createNonce()).nonce;
  const invalidDomainMessage = createSiweMessage({
    address: account.address,
    chainId: 84532,
    domain: "evil.example",
    nonce: domainNonce,
    uri: "https://evil.example",
    version: "1",
  });
  const invalidDomainSignature = await account.signMessage({ message: invalidDomainMessage });
  await assert.rejects(
    () => verifier.verify({ message: invalidDomainMessage, signature: invalidDomainSignature }),
    (error) => error instanceof SiwxArtifactVerificationError && error.code === "SIWX_DOMAIN_NOT_ALLOWED",
  );

  const chainNonce = (await fixture.service.createNonce()).nonce;
  const unsupportedChainMessage = createSiweMessage({
    address: account.address,
    chainId: 11155111,
    domain: "acs-app.axodus.country",
    nonce: chainNonce,
    uri: "https://acs-app.axodus.country",
    version: "1",
  });
  const unsupportedChainSignature = await account.signMessage({ message: unsupportedChainMessage });
  await assert.rejects(
    () => verifier.verify({ message: unsupportedChainMessage, signature: unsupportedChainSignature }),
    (error) => error instanceof SiwxArtifactVerificationError && error.code === "SIWX_CHAIN_UNSUPPORTED",
  );
});

test("SIWX session validation proves identity but never grants Tenant or platform authority", async () => {
  const { service } = deterministicService();
  const exchanged = await service.exchangeVerifiedIdentity(walletIdentity());
  const validator = new SiwxSessionIdentityValidator(service);
  const auth = await validator.authenticate({ authorization: `Bearer ${exchanged.accessToken}` });

  assert.equal(auth.authenticated, true);
  assert.equal(auth.trusted, true);
  assert.equal(auth.actorId, exchanged.account.accountId);
  assert.equal(auth.wallet, ADDRESS_A);
  assert.equal(auth.platformAdmin, false);
  assert.equal(auth.tenantId, undefined);
  assert.deepEqual(auth.scopes, []);
});

test("Product API derives wallet identity server-side and reports NO_TENANT_MEMBERSHIP", async () => {
  const fixture = deterministicService();
  const verifier = {
    descriptor: {
      provider: "reown_appkit_siwx",
      configured: true,
      serverVerified: true,
      productionOriented: false,
      supportedNamespaces: ["eip155"],
    },
    async verify(artifact) {
      assert.equal(artifact.address, ADDRESS_B, "client-supplied identity remains untrusted input");
      await fixture.service.consumeNonce(artifact.nonce);
      return walletIdentity({ address: ADDRESS_A, providerSessionId: "verified-provider-session" });
    },
  };
  const context = createSiwxTestContext({
    authMode: "siwx",
    accountIdentityService: fixture.service,
    siwxArtifactVerifier: verifier,
  });
  try {
    const nonceResult = await routeProductApiRequest(
      { method: "POST", url: "", headers: {} },
      "/api/v1/auth/siwx/nonce",
      context,
      { correlationId: "s74-nonce" },
    );
    assert.equal(nonceResult.status, 201);

    const exchangeResult = await routeProductApiRequest(
      jsonRequest("POST", {
        nonce: nonceResult.body.data.nonce,
        message: "official integration message structure",
        signature: "official integration signature structure",
        address: ADDRESS_B,
        chainId: 1,
      }),
      "/api/v1/auth/siwx/exchange",
      context,
      { correlationId: "s74-exchange" },
    );
    assert.equal(exchangeResult.status, 201);
    assert.equal(exchangeResult.body.data.externalIdentity.normalizedAddress, ADDRESS_A);
    assert.equal(exchangeResult.body.data.membershipState, "NO_TENANT_MEMBERSHIP");
    assert.deepEqual(exchangeResult.body.data.memberships, []);
    assert.equal("tokenDigest" in exchangeResult.body.data.session, false);
    assert.equal("providerSessionId" in exchangeResult.body.data.session, false);

    const accessToken = exchangeResult.body.data.accessToken;
    const meResult = await routeProductApiRequest(
      getRequest(accessToken),
      "/api/v1/accounts/me",
      context,
      { correlationId: "s74-me" },
    );
    assert.equal(meResult.status, 200);
    assert.equal(meResult.body.data.account.accountId, exchangeResult.body.data.account.accountId);
    assert.equal(meResult.body.data.membershipState, "NO_TENANT_MEMBERSHIP");
    const serializedMe = JSON.stringify(meResult.body.data);
    assert.equal(serializedMe.includes("tokenDigest"), false);
    assert.equal(serializedMe.includes(accessToken), false);

    const governedResult = await routeProductApiRequest(
      getRequest(accessToken),
      "/api/v1/dashboard",
      context,
      { correlationId: "s74-governed" },
    );
    assert.equal(governedResult.status, 403);
    assert.equal(governedResult.body.error.reason, "tenant_membership_required");
  } finally {
    await context.close();
  }
});

test("unconfigured server verifier blocks exchange and never trusts wallet connection state", async () => {
  const fixture = deterministicService();
  const context = createSiwxTestContext({
    authMode: "siwx",
    accountIdentityService: fixture.service,
  });
  try {
    const result = await routeProductApiRequest(
      jsonRequest("POST", { isConnected: true, address: ADDRESS_A }),
      "/api/v1/auth/siwx/exchange",
      context,
      { correlationId: "s74-unavailable-verifier" },
    );
    assert.equal(result.status, 503);
    assert.equal(result.body.error.reason, "SIWX_VERIFIER_NOT_CONFIGURED");
  } finally {
    await context.close();
  }
});

test("suspension produces HTTP 403 while the wallet may remain connected", async () => {
  const fixture = deterministicService();
  const exchanged = await fixture.service.exchangeVerifiedIdentity(walletIdentity());
  await fixture.service.setAccountStatus(exchanged.account.accountId, "suspended");
  const context = createSiwxTestContext({
    authMode: "siwx",
    accountIdentityService: fixture.service,
  });
  try {
    const result = await routeProductApiRequest(
      getRequest(exchanged.accessToken),
      "/api/v1/accounts/me",
      context,
      { correlationId: "s74-suspended" },
    );
    assert.equal(result.status, 403);
    assert.equal(result.body.error.reason, "account_suspended");
  } finally {
    await context.close();
  }
});

test("shared-state schema v2 persists Account identity, sessions and nonce uniqueness", () => {
  assert.equal(SHARED_STATE_SCHEMA_VERSION, 2);
  const migration = SHARED_STATE_MIGRATIONS.find((entry) => entry.version === 2);
  assert.ok(migration);
  const sql = migration.statements.join("\n");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS acs_accounts/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS acs_external_identities/);
  assert.match(sql, /UNIQUE \(provider, namespace, subject\)/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS acs_auth_sessions/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS acs_siwx_nonces/);
});
