import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import http, { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  ClientAddressResolver,
  FixedWindowRateLimiter,
  HttpEdgePolicy,
  InMemoryRateLimitStore,
  RateLimitBackendError,
  RateLimitConfigurationError,
  SqliteRateLimitStore,
  createAcsHttpHandler,
  createAcsHttpServer,
} from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async close() {},
  };
}

async function startHttpContext(options = {}) {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
    ...options,
  });
  const server = createServer(createAcsHttpHandler(context));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.equal(typeof address, "object");
  return { context, server, port: address.port };
}

async function stopHttpContext(runtime) {
  await new Promise((resolve, reject) => runtime.server.close((error) => error ? reject(error) : resolve()));
  await runtime.context.close();
}

async function request(port, options = {}) {
  const body = options.body;
  const headers = { ...(options.headers ?? {}) };
  if (body !== undefined && options.contentLength !== false && headers["content-length"] === undefined) {
    headers["content-length"] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const outgoing = http.request({
      host: "127.0.0.1",
      port,
      path: options.path ?? "/api/v1/health",
      method: options.method ?? "GET",
      headers,
    }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: incoming.statusCode,
          headers: incoming.headers,
          body: text ? JSON.parse(text) : undefined,
        });
      });
    });
    outgoing.on("error", reject);
    if (body !== undefined) outgoing.write(body);
    outgoing.end();
  });
}

test("SQLite rate-limit store is atomic and shared by independent instances", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-c02-rate-limit-"));
  const filePath = join(root, "rate-limit.sqlite");
  const first = new FixedWindowRateLimiter(new SqliteRateLimitStore({ filePath }));
  const second = new FixedWindowRateLimiter(new SqliteRateLimitStore({ filePath }));
  const policy = { policyId: "shared", limit: 2, windowMs: 60_000, keyScope: "principal", failClosed: true };
  try {
    assert.equal((await first.consume({ key: "principal:a", policy, timestamp: 1_000 })).allowed, true);
    assert.equal((await second.consume({ key: "principal:a", policy, timestamp: 1_000 })).allowed, true);
    const denied = await first.consume({ key: "principal:a", policy, timestamp: 1_000 });
    assert.equal(denied.allowed, false);
    assert.equal(denied.remaining, 0);
    assert.equal(denied.retryAfterSeconds, 59);
  } finally {
    first.close();
    second.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("production edge rejects process-local limiter and wildcard CORS", async () => {
  const memory = new FixedWindowRateLimiter(new InMemoryRateLimitStore());
  assert.throws(
    () => new HttpEdgePolicy({ profile: "production", rateLimiter: memory, allowedOrigins: ["https://control.example"] }),
    RateLimitConfigurationError,
  );

  const root = await mkdtemp(join(tmpdir(), "acs-c02-production-edge-"));
  const sqlite = new FixedWindowRateLimiter(new SqliteRateLimitStore({ filePath: join(root, "edge.sqlite") }));
  try {
    assert.throws(
      () => new HttpEdgePolicy({ profile: "production", rateLimiter: sqlite, allowedOrigins: ["*"] }),
      RateLimitConfigurationError,
    );
  } finally {
    sqlite.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("client address resolution ignores forwarded headers unless the socket peer is trusted", () => {
  const untrusted = new ClientAddressResolver([]);
  assert.equal(untrusted.resolve({ socket: { remoteAddress: "198.51.100.7" }, headers: { "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.10" } }), "198.51.100.7");

  const trusted = new ClientAddressResolver(["127.0.0.0/8"]);
  assert.equal(trusted.resolve({ socket: { remoteAddress: "127.0.0.1" }, headers: { "x-forwarded-for": "203.0.113.9, 127.0.0.2" } }), "203.0.113.9");
  assert.equal(trusted.resolve({ socket: { remoteAddress: "127.0.0.1" }, headers: { "x-forwarded-for": "not-an-ip" } }), "127.0.0.1");
});

test("real HTTP server enforces 429, Retry-After, security headers, and ignores forged bucket headers", async () => {
  const runtime = await startHttpContext({ publicRequestsPerWindow: 2 });
  try {
    const first = await request(runtime.port, { headers: { "x-acs-rate-limit-mode": "mock-exceeded", "x-acs-rate-limit-key": "attacker-a" } });
    const second = await request(runtime.port, { headers: { "x-acs-rate-limit-key": "attacker-b", "x-forwarded-for": "203.0.113.77" } });
    const denied = await request(runtime.port, { headers: { "x-acs-rate-limit-key": "attacker-c", "x-forwarded-for": "203.0.113.78" } });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(denied.status, 429);
    assert.equal(denied.body.error.code, "rate_limit_exceeded");
    assert.equal(denied.body.error.details.scope, "network");
    assert.equal(Number(denied.headers["retry-after"]), denied.body.error.details.retryAfterSeconds);
    assert.equal(denied.headers["ratelimit-remaining"], "0");
    assert.equal(first.headers["x-content-type-options"], "nosniff");
    assert.equal(first.headers["referrer-policy"], "no-referrer");
    assert.match(first.headers["content-security-policy"], /default-src 'none'/);
    assert.equal(first.body.meta.rateLimit.key, undefined);
  } finally {
    await stopHttpContext(runtime);
  }
});

test("authenticated principals and tenant-scoped mutations use isolated buckets", async () => {
  const runtime = await startHttpContext({ authenticatedReadsPerWindow: 1, publicRequestsPerWindow: 100 });
  try {
    const principalA = { "x-acs-actor-type": "system", "x-acs-actor-id": "principal-a" };
    const principalB = { "x-acs-actor-type": "system", "x-acs-actor-id": "principal-b" };
    assert.equal((await request(runtime.port, { path: "/api/v1/agents", headers: principalA })).status, 200);
    assert.equal((await request(runtime.port, { path: "/api/v1/agents", headers: principalA })).status, 429);
    assert.equal((await request(runtime.port, { path: "/api/v1/agents", headers: principalB })).status, 200);

    const auth = await runtime.context.identityValidator.authenticate({ "x-acs-actor-type": "system", "x-acs-actor-id": "principal-c" });
    const tenantEdge = new HttpEdgePolicy({
      profile: "development",
      rateLimiter: new FixedWindowRateLimiter(new InMemoryRateLimitStore()),
      administrativeMutationsPerWindow: 1,
    });
    const tenantAFirst = await tenantEdge.consumeAuthenticated("/api/v1/admin/tenants/tenant-a/suspend", "POST", auth, "tenant-default", 5_000);
    const tenantASecond = await tenantEdge.consumeAuthenticated("/api/v1/admin/tenants/tenant-a/suspend", "POST", auth, "tenant-default", 5_000);
    const tenantBFirst = await tenantEdge.consumeAuthenticated("/api/v1/admin/tenants/tenant-b/suspend", "POST", auth, "tenant-default", 5_000);
    assert.equal(tenantAFirst.allowed, true);
    assert.equal(tenantASecond.allowed, false);
    assert.equal(tenantBFirst.allowed, true);
  } finally {
    await stopHttpContext(runtime);
  }
});

test("CORS uses an explicit origin policy and supports Authorization preflight for mutation methods", async () => {
  const runtime = await startHttpContext({ allowedOrigins: ["https://control.example"] });
  try {
    const allowed = await request(runtime.port, { headers: { origin: "https://control.example" } });
    const denied = await request(runtime.port, { headers: { origin: "https://attacker.example" } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers["access-control-allow-origin"], "https://control.example");
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error.code, "cors_origin_denied");
    assert.equal(denied.headers["access-control-allow-origin"], undefined);

    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const preflight = await request(runtime.port, {
        method: "OPTIONS",
        path: "/api/v1/admin/tenants/tenant-dev/governance/policy",
        headers: {
          origin: "https://control.example",
          "access-control-request-method": method,
          "access-control-request-headers": "Authorization, Content-Type",
        },
      });
      assert.equal(preflight.status, 204);
      assert.match(preflight.headers["access-control-allow-methods"], new RegExp(method));
      assert.match(preflight.headers["access-control-allow-headers"], /authorization/);
    }
  } finally {
    await stopHttpContext(runtime);
  }
});

test("declared and chunked oversized bodies fail with 413 before an Agent side effect", async () => {
  const runtime = await startHttpContext({ maxBodyBytes: 32, publicRequestsPerWindow: 100, administrativeMutationsPerWindow: 100 });
  const headers = { "content-type": "application/json", "x-acs-actor-type": "system", "x-acs-actor-id": "edge-admin" };
  const before = runtime.context.agentService.list().length;
  try {
    const declared = await request(runtime.port, {
      method: "POST",
      path: "/api/v1/agents",
      headers: { ...headers, "content-length": "1000" },
      body: "x".repeat(1000),
      contentLength: false,
    });
    const chunked = await request(runtime.port, {
      method: "POST",
      path: "/api/v1/agents",
      headers,
      body: JSON.stringify({ definition: { padding: "x".repeat(128) } }),
      contentLength: false,
    });
    const optionalDeleteBody = await request(runtime.port, {
      method: "DELETE",
      path: "/api/v1/admin/tenants/tenant-dev/entitlements/agent_execution",
      headers,
      body: JSON.stringify({ reason: "x".repeat(128) }),
      contentLength: false,
    });
    assert.equal(declared.status, 413);
    assert.equal(chunked.status, 413);
    assert.equal(optionalDeleteBody.status, 413);
    assert.equal(declared.body.error.code, "payload_too_large");
    assert.equal(chunked.body.error.code, "payload_too_large");
    assert.equal(optionalDeleteBody.body.error.code, "payload_too_large");
    assert.equal(runtime.context.agentService.list().length, before);
  } finally {
    await stopHttpContext(runtime);
  }
});

test("protected routes fail closed when the rate-limit backend is unavailable while public health remains observable", async () => {
  const failingLimiter = {
    descriptor: { adapter: "failing-test", productionOriented: true, durability: "single_node_durable", multiInstance: "not_proven" },
    async consume() { throw new RateLimitBackendError(); },
    async health() { return { configured: true, reachable: false, productionGrade: true, adapter: "failing-test" }; },
  };
  const runtime = await startHttpContext({ rateLimiter: failingLimiter });
  try {
    assert.equal((await request(runtime.port)).status, 200);
    const protectedResult = await request(runtime.port, {
      path: "/api/v1/agents",
      headers: { "x-acs-actor-type": "system", "x-acs-actor-id": "edge-admin" },
    });
    assert.equal(protectedResult.status, 503);
    assert.equal(protectedResult.body.error.code, "rate_limit_backend_unavailable");
  } finally {
    await stopHttpContext(runtime);
  }
});

test("server applies configured header, request, keep-alive, and connection limits", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-c02-server-config-"));
  const runtime = await createAcsHttpServer({
    engine: createMockEngine(),
    startLocalWorker: false,
    runtimeRoot: root,
    stateRoot: join(root, "state"),
    headersTimeoutMs: 4_000,
    requestTimeoutMs: 8_000,
    keepAliveTimeoutMs: 2_000,
    maxHeadersCount: 40,
    maxRequestsPerSocket: 25,
    maxHeaderBytes: 8_192,
  });
  try {
    assert.equal(runtime.server.headersTimeout, 4_000);
    assert.equal(runtime.server.requestTimeout, 8_000);
    assert.equal(runtime.server.keepAliveTimeout, 2_000);
    assert.equal(runtime.server.maxHeadersCount, 40);
    assert.equal(runtime.server.maxRequestsPerSocket, 25);
  } finally {
    await runtime.context.close();
    await rm(root, { recursive: true, force: true });
  }
});
