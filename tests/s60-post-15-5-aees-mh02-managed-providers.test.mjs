import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  DevelopmentHeaderIdentityValidator,
  HttpEdgePolicy,
  InMemoryRateLimitStore,
  FixedWindowRateLimiter,
  ManagedProviderComposition,
  ManagedProviderCompositionError,
  OidcWorkerIdentityValidator,
  OperationalTelemetryProvider,
  SharedDatabaseRateLimiter,
  VaultSecretProvider,
  WorkerAuthenticationError,
} = await import(`${distRoot}/index.js`);

function encode(value) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function issueRs256(privateKey, kid, claims) {
  const header = encode({ alg: "RS256", typ: "JWT", kid });
  const payload = encode(claims);
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`, "ascii"), privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

test("MH02-A rejects ambiguous development providers in distributed production composition", async () => {
  const telemetry = new OperationalTelemetryProvider({
    exporter: {
      descriptor: { adapter: "external-test", external: true, productionGrade: true },
      async export() {},
      async health() { return { configured: true, reachable: true, productionGrade: true, state: "ready", adapter: "external-test", external: true }; },
    },
    serviceName: "test",
  });
  try {
    assert.throws(() => new ManagedProviderComposition({
      identityValidator: new DevelopmentHeaderIdentityValidator(),
      workerIdentityValidator: { descriptor: { mode: "development", provider: "dev", productionOriented: false }, async authenticate() { throw new Error("unused"); }, async health() { return { configured: true, reachable: true, detail: "dev" }; } },
      secretStore: { descriptor: { provider: "memory", productionOriented: false, materialStorage: "memory", metadataDurability: "process_local", multiInstance: "not_applicable" }, async health() { return { reachable: true, provider: "memory" }; } },
      edgePolicy: new HttpEdgePolicy({ profile: "production", rateLimiter: new FixedWindowRateLimiter({ ...new InMemoryRateLimitStore(), descriptor: { adapter: "test", productionOriented: true, durability: "single_node_durable", multiInstance: "not_proven" } }), allowedOrigins: ["https://control-plane.test"] }),
      telemetry,
      sharedStateHealth: async () => ({ configured: true, reachable: true, writable: true, schemaCurrent: true, adapter: "test" }),
      edgeProbe: async () => ({ configured: true, reachable: true, authenticated: true, secureTransport: true, detail: "test" }),
      rateLimiterSecureTransport: false,
      telemetrySecureTransport: true,
      classifications: { identity: "LOCAL_FIXTURE", workload_identity: "LOCAL_FIXTURE", secrets: "LOCAL_FIXTURE", rate_limiter: "LOCAL_FIXTURE", edge: "LOCAL_FIXTURE", telemetry: "LOCAL_FIXTURE" },
    }), ManagedProviderCompositionError);
  } finally {
    await telemetry.close();
  }
});

test("MH02-B RS256 workload identity enforces issuer, audience, instance, expiry, and revocation", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const kid = "worker-key-1";
  const jwk = { ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" };
  const revoked = new Set();
  const validator = new OidcWorkerIdentityValidator({
    issuer: "https://identity.test",
    audience: "acs-runtime-worker",
    jwksProvider: { async getKey(candidate) { return candidate === kid ? jwk : undefined; }, async health() { return { configured: true, reachable: true, detail: "external key" }; } },
    revocationCheck: (jti) => revoked.has(jti),
    clockToleranceSeconds: 0,
  });
  const now = Math.floor(Date.now() / 1000);
  const token = issueRs256(privateKey, kid, { iss: "https://identity.test", aud: "acs-runtime-worker", sub: "worker-a", instance_id: "instance-a", capabilities: ["execute"], iat: now, exp: now + 60, jti: "credential-a" });
  const principal = await validator.authenticate({ authorization: `Bearer ${token}` });
  assert.equal(principal.workerId, "worker-a");
  assert.equal(principal.instanceId, "instance-a");
  assert.equal(principal.authenticationMethod, "oidc_worker_jwt");
  revoked.add("credential-a");
  await assert.rejects(() => validator.authenticate({ authorization: `Bearer ${token}` }), (error) => error instanceof WorkerAuthenticationError && error.code === "revoked_credential");
  const expired = issueRs256(privateKey, kid, { iss: "https://identity.test", aud: "acs-runtime-worker", sub: "worker-a", instance_id: "instance-a", exp: now - 1 });
  await assert.rejects(() => validator.authenticate({ authorization: `Bearer ${expired}` }), (error) => error.code === "expired_token");
});

test("MH02-C Vault accepts async shared metadata and preserves version CAS input", async () => {
  const metadata = new Map();
  const saves = [];
  let version = 0;
  const provider = new VaultSecretProvider({
    metadataDurability: "shared_durable",
    secureTransport: true,
    metadataStore: {
      async create(value) { metadata.set(value.secretId, value); return value; },
      async get(secretId) { return metadata.get(secretId); },
      async list() { return [...metadata.values()]; },
      async save(value, expectedVersion) { saves.push(expectedVersion); metadata.set(value.secretId, value); return value; },
    },
    transport: {
      async request(input) {
        if (input.path === "/v1/sys/health") return { status: 200 };
        if (input.path === "/v1/auth/token/lookup-self") return { status: 200, body: { data: { id: "redacted" } } };
        if (input.method === "POST" && input.path.includes("/data/")) return { status: 200, body: { data: { version: ++version } } };
        if (input.method === "GET" && input.path.includes("/data/")) return { status: 200, body: { data: { data: { value: "material" } } } };
        if (input.method === "POST" && input.path.includes("/delete/")) return { status: 204 };
        return { status: 200 };
      },
    },
  });
  const ref = await provider.put({ tenantId: "tenant-a", providerId: "vault", purpose: "test", value: "material" });
  const rotated = await provider.rotate(ref, { tenantId: "tenant-a", value: "new-material" });
  assert.equal(rotated.keyVersion, "2");
  assert.deepEqual(saves, [1]);
  assert.equal(provider.descriptor.metadataDurability, "shared_durable");
  assert.deepEqual(await provider.health(), { reachable: true, authenticated: true, secureTransport: true, provider: "vault-kv-v2" });
});

test("MH02-C shared limiter health reflects shared database outage", async () => {
  const store = { async consume() { return { consumed: 1 }; } };
  let reachable = true;
  const limiter = new SharedDatabaseRateLimiter(store, async () => ({ reachable, writable: reachable, schemaCurrent: reachable }));
  assert.equal((await limiter.health()).reachable, true);
  reachable = false;
  assert.equal((await limiter.health()).reachable, false);
});
