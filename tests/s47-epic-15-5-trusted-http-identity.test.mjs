import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DevelopmentHeaderIdentityValidator,
  HttpIdentityConfigurationError,
  OidcJwtIdentityValidator,
  createAcsHttpHandler,
} from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const ISSUER = "https://identity.example.test";
const AUDIENCE = "acs-control-plane";
const NOW = Date.UTC(2026, 7, 15, 12, 0, 0);

function createMockEngine() {
  return { identity: { id: "openclaw", provider: "agentsai" }, async close() {} };
}

function signingKey(kid) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    kid,
    privateKey,
    jwk: { ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" },
  };
}

function jwt(key, claims = {}, header = {}) {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: key.kid, ...header })).toString("base64url");
  const encodedClaims = Buffer.from(JSON.stringify({
    iss: ISSUER,
    aud: AUDIENCE,
    sub: "principal-a",
    exp: Math.floor(NOW / 1000) + 600,
    iat: Math.floor(NOW / 1000),
    ...claims,
  })).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedClaims}`), key.privateKey).toString("base64url");
  return `${encodedHeader}.${encodedClaims}.${signature}`;
}

class StaticJwksProvider {
  keys;
  refreshKeys;
  refreshes = 0;

  constructor(keys, refreshKeys = {}) {
    this.keys = new Map(Object.entries(keys));
    this.refreshKeys = new Map(Object.entries(refreshKeys));
  }

  async getKey(kid, forceRefresh = false) {
    if (forceRefresh) {
      this.refreshes += 1;
      for (const [keyId, key] of this.refreshKeys) this.keys.set(keyId, key);
    }
    return this.keys.get(kid);
  }

  async health() {
    return { configured: true, reachable: true, detail: `${this.keys.size} test key(s)` };
  }
}

function validator(provider, options = {}) {
  return new OidcJwtIdentityValidator({
    issuer: ISSUER,
    audience: AUDIENCE,
    jwksProvider: provider,
    tenantClaim: "tenant_id",
    platformAdminClaim: "roles",
    platformAdminValue: "platform_admin",
    clock: () => NOW,
    ...options,
  });
}

async function invoke(handler, { method = "GET", url, headers = {}, payload }) {
  const serialized = payload === undefined ? "" : JSON.stringify(payload);
  const response = {
    statusCode: 0,
    headers: {},
    bodyText: "",
    writeHead(status, responseHeaders) {
      this.statusCode = status;
      this.headers = responseHeaders;
      return this;
    },
    end(body) {
      this.bodyText = typeof body === "string" ? body : Buffer.from(body ?? "").toString("utf8");
    },
  };
  await handler({
    method,
    url,
    headers,
    on(event, callback) {
      if (event === "data" && serialized) callback(serialized);
      if (event === "end") callback();
    },
  }, response);
  return {
    status: response.statusCode,
    headers: response.headers,
    body: response.bodyText ? JSON.parse(response.bodyText) : undefined,
  };
}

test("OIDC validator checks signature, issuer, audience, time, subject, algorithm and signing key", async () => {
  const trusted = signingKey("trusted-1");
  const attacker = signingKey("attacker-1");
  const oidc = validator(new StaticJwksProvider({ [trusted.kid]: trusted.jwk }));
  const valid = await oidc.authenticate({ authorization: `Bearer ${jwt(trusted, { sub: "owner-a", tenant_id: "tenant-a" })}` });
  assert.equal(valid.actorId, "owner-a");
  assert.equal(valid.tenantId, "tenant-a");
  assert.equal(valid.trusted, true);
  assert.equal(valid.platformAdmin, false);
  assert.equal(valid.principal.authenticationMethod, "oidc_bearer");

  const invalidCases = [
    ["malformed", "malformed_token"],
    [jwt(attacker, {}, { kid: trusted.kid }), "invalid_signature"],
    [jwt(trusted, { exp: Math.floor(NOW / 1000) - 100 }), "expired_token"],
    [jwt(trusted, { nbf: Math.floor(NOW / 1000) + 100 }), "token_not_active"],
    [jwt(trusted, { iss: "https://attacker.invalid" }), "invalid_issuer"],
    [jwt(trusted, { aud: "another-service" }), "invalid_audience"],
    [jwt(trusted, { sub: "" }), "missing_subject"],
    [jwt(trusted, {}, { alg: "HS256" }), "unsupported_algorithm"],
    [jwt(trusted, {}, { kid: "unknown" }), "unknown_signing_key"],
  ];
  for (const [token, expectedCode] of invalidCases) {
    await assert.rejects(
      () => oidc.authenticate({ authorization: `Bearer ${token}` }),
      (error) => error?.code === expectedCode,
      expectedCode,
    );
  }
});

test("OIDC JWKS refresh accepts a rotated kid without restarting the validator", async () => {
  const oldKey = signingKey("old-key");
  const rotatedKey = signingKey("rotated-key");
  const provider = new StaticJwksProvider({ [oldKey.kid]: oldKey.jwk }, { [rotatedKey.kid]: rotatedKey.jwk });
  const oidc = validator(provider);
  const auth = await oidc.authenticate({ authorization: `Bearer ${jwt(rotatedKey)}` });
  assert.equal(auth.actorId, "principal-a");
  assert.equal(provider.refreshes, 1);
});

test("real HTTP server rejects forged identity headers and derives platform authority only from a trusted claim", async () => {
  const key = signingKey("server-key");
  const oidc = validator(new StaticJwksProvider({ [key.kid]: key.jwk }));
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
    identityValidator: oidc,
  });
  const handler = createAcsHttpHandler(context);
  const forgedHeaders = {
    "x-acs-auth-mode": "mock",
    "x-acs-actor-type": "system",
    "x-acs-actor-id": "victim",
    "x-platform-admin": "true",
  };
  try {
    const publicHealth = await invoke(handler, { url: "/api/v1/health" });
    assert.equal(publicHealth.status, 200);
    assert.equal(publicHealth.body.meta.auth.authenticated, false);

    const missingCredential = await invoke(handler, { url: "/api/v1/admin/tenants", headers: forgedHeaders });
    assert.equal(missingCredential.status, 401);
    assert.equal(missingCredential.body.error.details.category, "missing_credentials");
    assert.equal(missingCredential.headers["www-authenticate"], "Bearer");

    const attacker = signingKey("server-attacker");
    const invalidSignature = await invoke(handler, {
      url: "/api/v1/admin/tenants",
      headers: { authorization: `Bearer ${jwt(attacker, {}, { kid: key.kid })}` },
    });
    assert.equal(invalidSignature.status, 401);
    assert.equal(invalidSignature.body.error.details.category, "invalid_signature");

    const normalToken = jwt(key, { sub: "dev-operator", tenant_id: "tenant-dev", roles: ["tenant_admin"] });
    const forgedPlatform = await invoke(handler, {
      url: "/api/v1/admin/tenants",
      headers: { ...forgedHeaders, authorization: `Bearer ${normalToken}` },
    });
    assert.equal(forgedPlatform.status, 403);

    const tenantRead = await invoke(handler, {
      url: "/api/v1/admin/tenants/tenant-dev",
      headers: { ...forgedHeaders, authorization: `Bearer ${normalToken}` },
    });
    assert.equal(tenantRead.status, 200);
    assert.equal(tenantRead.body.meta.auth.actorId, "dev-operator");
    assert.equal(tenantRead.body.meta.auth.platformAdmin, false);

    const crossTenantProductRead = await invoke(handler, {
      url: "/api/v1/agents",
      headers: { authorization: `Bearer ${jwt(key, { sub: "dev-operator", tenant_id: "tenant-other" })}` },
    });
    assert.equal(crossTenantProductRead.status, 403);
    assert.equal(crossTenantProductRead.body.error.reason, "cross_tenant_scope");

    const noMembershipProductRead = await invoke(handler, {
      url: "/api/v1/agents",
      headers: { authorization: `Bearer ${jwt(key, { sub: "unknown-member", tenant_id: "tenant-dev" })}` },
    });
    assert.equal(noMembershipProductRead.status, 403);
    assert.equal(noMembershipProductRead.body.error.reason, "tenant_membership_required");

    const platformToken = jwt(key, { sub: "platform-operator", roles: ["platform_admin"] });
    const platformRead = await invoke(handler, {
      url: "/api/v1/admin/tenants",
      headers: { ...forgedHeaders, authorization: `Bearer ${platformToken}` },
    });
    assert.equal(platformRead.status, 200);
    assert.equal(platformRead.body.meta.auth.actorId, "platform-operator");
    assert.equal(platformRead.body.meta.auth.platformAdmin, true);

    const readiness = await invoke(handler, {
      url: "/api/v1/system/production-readiness",
      headers: { authorization: `Bearer ${platformToken}` },
    });
    const authGate = readiness.body.data.gates.find((gate) => gate.id === "G04");
    assert.equal(readiness.status, 200);
    assert.equal(authGate.status, "partial");
    assert.equal(authGate.blockers.length, 0);
  } finally {
    await context.close();
  }
});

test("trusted HTTP actor remains tenant-scoped and suspended or removed membership cannot mutate", async () => {
  const key = signingKey("tenant-key");
  const oidc = validator(new StaticJwksProvider({ [key.kid]: key.jwk }));
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false, identityValidator: oidc });
  const handler = createAcsHttpHandler(context);
  const platform = { kind: "platform_admin", principalId: "bootstrap" };
  try {
    context.tenantService.createTenant({ tenantId: "tenant-membership-auth", actor: "bootstrap", at: 10 });
    context.tenantMembershipService.bootstrapTenantOwner({
      tenantId: "tenant-membership-auth",
      principalId: "owner-auth",
      authority: platform,
      actor: "bootstrap",
      at: 11,
    });
    context.tenantService.activateTenant("tenant-membership-auth", { actor: "bootstrap", at: 12 });
    context.tenantMembershipService.addMembership({
      tenantId: "tenant-membership-auth",
      principalId: "operator-auth",
      role: "operator",
      authority: platform,
      actor: "bootstrap",
      at: 13,
    });

    const wrongTenant = jwt(key, { sub: "dev-operator", tenant_id: "tenant-other" });
    assert.equal((await invoke(handler, {
      url: "/api/v1/admin/tenants/tenant-dev",
      headers: { authorization: `Bearer ${wrongTenant}` },
    })).status, 403);

    context.tenantMembershipService.suspendMembership({
      tenantId: "tenant-membership-auth",
      principalId: "operator-auth",
      authority: platform,
      actor: "bootstrap",
      at: 14,
    });
    const memberToken = jwt(key, { sub: "operator-auth", tenant_id: "tenant-membership-auth" });
    assert.equal((await invoke(handler, {
      url: "/api/v1/admin/tenants/tenant-membership-auth",
      headers: { authorization: `Bearer ${memberToken}` },
    })).status, 403);

    context.tenantMembershipService.removeMembership({
      tenantId: "tenant-membership-auth",
      principalId: "operator-auth",
      authority: platform,
      actor: "bootstrap",
      at: 15,
    });
    assert.equal((await invoke(handler, {
      url: "/api/v1/admin/tenants/tenant-membership-auth",
      headers: { authorization: `Bearer ${memberToken}` },
    })).status, 403);
  } finally {
    await context.close();
  }
});

test("HTTP audit attribution uses the authenticated principal and never persists the bearer token", async () => {
  const key = signingKey("audit-key");
  const oidc = validator(new StaticJwksProvider({ [key.kid]: key.jwk }));
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false, identityValidator: oidc });
  const handler = createAcsHttpHandler(context);
  const token = jwt(key, { sub: "audit-platform", roles: ["platform_admin"] });
  try {
    const result = await invoke(handler, {
      method: "POST",
      url: "/api/v1/admin/tenants",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-acs-actor-id": "forged-audit-actor",
        "x-correlation-id": "corr-c01-audit",
      },
      payload: { tenantId: "tenant-c01-audit", createdBy: "forged-body-actor" },
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.receipt.tenant.administrativeMetadata.createdBy, "audit-platform");
    const events = context.auditService.queryEvents({ tenantId: "tenant-c01-audit", correlationId: "corr-c01-audit" });
    assert.equal(events.length, 1);
    assert.equal(events[0].actor, "audit-platform");
    assert.equal(JSON.stringify(events).includes(token), false);
    assert.equal(JSON.stringify(result.body).includes(token), false);
  } finally {
    await context.close();
  }
});

test("production profile rejects development/disabled identity and incomplete OIDC configuration", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-c01-production-auth-"));
  const vaultTransport = { async request() { return { status: 200, body: { data: {} } }; } };
  const secureOptions = {
    engine: createMockEngine(),
    startLocalWorker: false,
    adapterProfile: "production",
    allowedOrigins: ["https://control.example"],
    secretProvider: "vault",
    vaultTransport,
    secretCatalogPath: join(root, "catalog.sqlite"),
    economicStatePath: join(root, "economic.sqlite"),
    rateLimitDatabasePath: join(root, "rate-limit.sqlite"),
  };
  try {
    assert.throws(
      () => createControlPlaneContext({ ...secureOptions, identityValidator: new DevelopmentHeaderIdentityValidator() }),
      HttpIdentityConfigurationError,
    );
    assert.throws(
      () => createControlPlaneContext({ ...secureOptions, authMode: "oidc" }),
      HttpIdentityConfigurationError,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
