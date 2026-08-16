import assert from "node:assert/strict";
import test from "node:test";
import {
  createAcsAuthContext,
  createAcsHttpHandler,
  createAcsRateLimitContext,
  routeAcsRequest,
} from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async close() {},
  };
}

async function invokeHttpHandler(request) {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  const handler = createAcsHttpHandler(context);
  const response = {
    statusCode: 0,
    headers: {},
    bodyText: "",
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
      return this;
    },
    end(body) {
      this.bodyText = typeof body === "string" ? body : Buffer.from(body ?? "").toString("utf8");
    },
  };

  try {
    await handler({
      method: request.method ?? "GET",
      url: request.url,
      headers: request.headers ?? {},
    }, response);
    return {
      status: response.statusCode,
      body: JSON.parse(response.bodyText),
    };
  } finally {
    await context.close();
  }
}

test("auth context supports default, mock, unauthenticated, tenant-admin, and user wallet modes", () => {
  const disabled = createAcsAuthContext();
  const mockSystem = createAcsAuthContext({
    mode: "mock",
    actorType: "system",
    actorId: "acs.local",
    scopes: ["acs:inspect"],
    authenticated: true,
  });
  const unauthenticated = createAcsAuthContext({ mode: "required", authenticated: false });
  const tenantAdmin = createAcsAuthContext({
    mode: "mock",
    actorType: "tenant-admin",
    actorId: "admin-1",
    tenantId: "dao-alpha",
    authenticated: true,
  });
  const user = createAcsAuthContext({
    mode: "mock",
    actorType: "user",
    actorId: "0xlicensed",
    wallet: "0xlicensed",
    authenticated: true,
  });

  assert.equal(disabled.mode, "disabled");
  assert.equal(disabled.authenticated, true);
  assert.equal(mockSystem.scopes[0], "acs:inspect");
  assert.equal(unauthenticated.authenticated, false);
  assert.equal(tenantAdmin.tenantId, "dao-alpha");
  assert.equal(user.wallet, "0xlicensed");
  assert.equal(JSON.stringify(user).includes("secret"), false);
});

test("rate-limit context supports disabled, mock allowed, and mock exceeded modes", () => {
  const disabled = createAcsRateLimitContext();
  const allowed = createAcsRateLimitContext({
    enabled: true,
    key: "tenant:dao-alpha",
    limit: 60,
    remaining: 59,
    resetAt: "2026-01-01T00:01:00.000Z",
  });
  const exceeded = createAcsRateLimitContext({
    enabled: true,
    key: "tenant:dao-alpha",
    limit: 1,
    remaining: 0,
    resetAt: "2026-01-01T00:01:00.000Z",
    exceeded: true,
  });

  assert.equal(disabled.enabled, false);
  assert.equal(disabled.exceeded, false);
  assert.equal(allowed.remaining, 59);
  assert.equal(exceeded.exceeded, true);
});

test("HTTP response envelope includes auth and rate-limit metadata without secrets", () => {
  const result = routeAcsRequest("/acs/health", {
    correlationId: "corr-auth",
    auth: createAcsAuthContext({
      mode: "mock",
      actorType: "tenant-admin",
      actorId: "admin-1",
      tenantId: "dao-alpha",
      scopes: ["acs:inspect"],
      authenticated: true,
    }),
    rateLimit: createAcsRateLimitContext({
      enabled: true,
      key: "tenant:dao-alpha",
      limit: 60,
      remaining: 59,
      resetAt: "2026-01-01T00:01:00.000Z",
    }),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.correlationId, "corr-auth");
  assert.equal(result.body.meta.auth.actorType, "tenant-admin");
  assert.equal(result.body.meta.rateLimit.remaining, 59);
  assert.equal(JSON.stringify(result.body).includes("raw-secret"), false);
});

test("mock exceeded rate-limit returns structured error and preserves correlationId", () => {
  const result = routeAcsRequest("/acs/health", {
    correlationId: "corr-rate",
    rateLimit: createAcsRateLimitContext({
      enabled: true,
      key: "mock",
      limit: 1,
      remaining: 0,
      resetAt: "2026-01-01T00:01:00.000Z",
      exceeded: true,
    }),
  });

  assert.equal(result.status, 429);
  assert.equal(result.body.success, false);
  assert.equal(result.body.correlationId, "corr-rate");
  assert.equal(result.body.error.code, "rate_limit_exceeded");
  assert.equal(result.body.meta.rateLimit.exceeded, true);
});

test("HTTP handler keeps development auth but ignores client-controlled rate-limit headers", async () => {
  const result = await invokeHttpHandler({
    url: "/acs/health",
    headers: {
      "x-correlation-id": "corr-server-auth",
      "x-acs-auth-mode": "mock",
      "x-acs-actor-type": "user",
      "x-acs-actor-id": "0xlicensed",
      "x-acs-wallet": "0xlicensed",
      "x-acs-scopes": "acs:inspect",
      "x-acs-authenticated": "true",
      "x-acs-rate-limit-mode": "mock",
      "x-acs-rate-limit-key": "wallet:0xlicensed",
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.correlationId, "corr-server-auth");
  assert.equal(result.body.meta.auth.actorType, "user");
  assert.equal(result.body.meta.auth.wallet, "0xlicensed");
  assert.equal(result.body.meta.rateLimit.enabled, true);
  assert.equal(result.body.meta.rateLimit.key, undefined);
  assert.equal(result.body.meta.rateLimit.exceeded, false);
});
