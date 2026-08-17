import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const {
  createSharedControlPlaneContext,
  SharedSecretMetadataStore,
  VaultSecretProvider,
  SharedDatabaseRateLimiter,
  HttpEdgePolicy,
  OidcJwtIdentityValidator,
  OidcWorkerIdentityValidator,
  RemoteJwksProvider,
  ManagedProviderComposition,
  OtlpHttpTelemetryExporter,
  OperationalTelemetryProvider,
  HttpAuthenticationError,
  WorkerAuthenticationError,
  isRateLimitBackendError,
  createAcsAuthContext,
  parseTraceparent,
} = await import(`${distRoot}/index.js`);

const instanceId = process.env.ACS_MH02_INSTANCE_ID ?? `cp-${process.pid}`;
const port = Number(process.env.ACS_MH02_CP_PORT ?? 0);
const connectionString = process.env.ACS_SH_DATABASE_URL ?? "";
const issuer = process.env.ACS_MH02_OIDC_ISSUER ?? "";
const jwksUri = process.env.ACS_MH02_OIDC_JWKS_URI ?? "";
const humanAudience = process.env.ACS_MH02_OIDC_AUDIENCE ?? "acs-control-plane";
const workerAudience = process.env.ACS_MH02_WORKER_AUDIENCE ?? "acs-runtime-worker";
const introspectionToken = process.env.ACS_MH02_WORKLOAD_INTROSPECTION_TOKEN ?? "";
const vaultAddress = process.env.ACS_MH02_VAULT_ADDR ?? "";
const vaultToken = process.env.ACS_MH02_VAULT_TOKEN ?? "";
const otlpEndpoint = process.env.ACS_MH02_OTLP_ENDPOINT ?? "";
const otlpToken = process.env.ACS_MH02_OTLP_TOKEN ?? "";
const edgeUrl = process.env.ACS_MH02_EDGE_URL ?? "";
const edgeProbeToken = process.env.ACS_MH02_EDGE_PROBE_TOKEN ?? "";
const edgeAttestationToken = process.env.ACS_MH02_EDGE_ATTESTATION_TOKEN ?? "";
const browserOrigin = process.env.ACS_MH02_BROWSER_ORIGIN ?? "https://localhost";
if (!Number.isSafeInteger(port) || port <= 0 || !connectionString || !issuer || !jwksUri || !introspectionToken
  || !vaultAddress || !vaultToken || !otlpEndpoint || !otlpToken || !edgeUrl || !edgeProbeToken || !edgeAttestationToken) {
  throw new Error("MH02 Control Plane provider composition is incomplete");
}

const context = await createSharedControlPlaneContext({
  instanceId,
  connectionString,
  poolSize: 4,
  connectionTimeoutMs: 1_000,
  statementTimeoutMs: 3_000,
});
const humanJwks = new RemoteJwksProvider({ jwksUri, cacheTtlMs: 60_000, timeoutMs: 1_500 });
const workerJwks = new RemoteJwksProvider({ jwksUri, cacheTtlMs: 60_000, timeoutMs: 1_500 });
const identityValidator = new OidcJwtIdentityValidator({
  issuer,
  audience: humanAudience,
  jwksProvider: humanJwks,
  tenantClaim: "tenant_id",
  platformAdminClaim: "platform_role",
  platformAdminValue: "platform_admin",
});
const workerIdentityValidator = new OidcWorkerIdentityValidator({
  issuer,
  audience: workerAudience,
  jwksProvider: workerJwks,
  revocationCheck: async (jti) => {
    const response = await fetch(`${issuer}/introspect/revocations/${encodeURIComponent(jti)}`, {
      headers: { authorization: `Bearer ${introspectionToken}` },
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) throw new Error("workload identity revocation provider unavailable");
    return Boolean((await response.json()).revoked);
  },
});
const metadataStore = new SharedSecretMetadataStore({
  state: context.state,
  authority: context.authority,
  actor: `service:${instanceId}`,
  correlationId: (operation, metadata) => `mh02-${operation}-${metadata.secretId}-${randomUUID()}`,
});
const secretStore = new VaultSecretProvider({
  metadataStore,
  metadataDurability: "shared_durable",
  baseUrl: vaultAddress,
  token: vaultToken,
  timeoutMs: 1_500,
  requireHttps: true,
});
const limiter = new SharedDatabaseRateLimiter(context.state.rateLimits, () => context.readiness());
const edgePolicy = new HttpEdgePolicy({
  profile: "production",
  rateLimiter: limiter,
  allowedOrigins: [browserOrigin],
  trustedProxyCidrs: ["127.0.0.2/32"],
  rateLimitWindowMs: 60_000,
  publicRequestsPerWindow: 1_000,
  authenticatedReadsPerWindow: 100,
  administrativeMutationsPerWindow: 100,
  executionStartsPerWindow: 4,
  systemAdminRequestsPerWindow: 100,
  runtimeWorkerRequestsPerWindow: 100,
  enableHsts: true,
});
const telemetry = new OperationalTelemetryProvider({
  exporter: new OtlpHttpTelemetryExporter({
    endpoint: otlpEndpoint,
    serviceName: "acs-control-plane",
    timeoutMs: 1_000,
    headers: { authorization: `Bearer ${otlpToken}` },
  }),
  serviceName: "acs-control-plane",
  instanceId,
  queueCapacity: 8,
  recentCapacity: 32,
  batchSize: 8,
  exportIntervalMs: 200,
  exportTimeoutMs: 1_000,
});
const composition = new ManagedProviderComposition({
  identityValidator,
  workerIdentityValidator,
  secretStore,
  edgePolicy,
  telemetry,
  sharedStateHealth: () => context.readiness(),
  edgeProbe: async () => {
    const response = await fetch(`${edgeUrl}/edge/health`, {
      headers: { authorization: `Bearer ${edgeProbeToken}` },
      signal: AbortSignal.timeout(1_000),
    });
    return {
      configured: true,
      reachable: response.ok,
      authenticated: response.ok,
      secureTransport: edgeUrl.startsWith("https://"),
      detail: response.ok ? "authenticated TLS edge is reachable" : "trusted edge is unavailable",
      ...(!response.ok ? { reasonCode: "TRUSTED_EDGE_UNAVAILABLE" } : {}),
    };
  },
  rateLimiterSecureTransport: false,
  telemetrySecureTransport: otlpEndpoint.startsWith("https://"),
  classifications: {
    identity: "EXTERNAL_PROCESS_PROVEN",
    workload_identity: "EXTERNAL_PROCESS_PROVEN",
    secrets: "EXTERNAL_PROCESS_PROVEN",
    rate_limiter: "EXTERNAL_PROCESS_PROVEN",
    edge: "EXTERNAL_PROCESS_PROVEN",
    telemetry: "EXTERNAL_PROCESS_PROVEN",
  },
});

function headersRecord(request) {
  return Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]));
}
async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > edgePolicy.limits.maxBodyBytes) throw Object.assign(new Error("request too large"), { status: 413, code: "request_too_large" });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function responseHeaders(corsHeaders = {}) { return { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...edgePolicy.responseHeaders(corsHeaders) }; }
function json(response, status, body, corsHeaders = {}, extraHeaders = {}) {
  response.writeHead(status, { ...responseHeaders(corsHeaders), ...extraHeaders });
  response.end(JSON.stringify(body));
}
function correlationId(request) { return request.headers["x-correlation-id"]?.toString() ?? `mh02-${randomUUID()}`; }
function rateHeaders(decision) {
  return {
    "ratelimit-limit": String(decision.limit),
    "ratelimit-remaining": String(decision.remaining),
    "ratelimit-reset": decision.resetAt,
    ...(decision.retryAfterSeconds ? { "retry-after": String(decision.retryAfterSeconds) } : {}),
  };
}
function errorStatus(error) {
  if (error?.status) return error.status;
  if (error instanceof HttpAuthenticationError || error instanceof WorkerAuthenticationError) return 401;
  if (isRateLimitBackendError(error)) return 503;
  const code = String(error?.code ?? "");
  if (code.includes("NOT_FOUND")) return 404;
  if (code.includes("TENANT") || code.includes("AUTHORITY") || code.includes("REVOKED")) return 403;
  if (code.includes("CONFLICT") || code.includes("REVISION")) return 409;
  if (code.includes("UNAVAILABLE") || code.includes("TIMEOUT")) return 503;
  return 500;
}
async function requireTenantAuthority(auth, tenantId) {
  if (auth.platformAdmin) return;
  let membership;
  try { membership = await context.state.memberships.get(tenantId, auth.actorId); } catch { membership = undefined; }
  if (!membership || membership.status !== "active") throw Object.assign(new Error("active Tenant membership is required"), { status: 403, code: "tenant_authority_denied" });
}
function tenantFromPath(pathname) {
  const match = /^\/api\/v1\/tenants\/([^/]+)/.exec(pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

async function dispatch(request, response, url, auth, corsHeaders, span) {
  const tenantId = tenantFromPath(url.pathname);
  if (request.method === "GET" && url.pathname === "/api/v1/health") {
    return json(response, 200, { success: true, data: { status: "LIVE", instanceId, pid: process.pid } }, corsHeaders);
  }
  if (request.method === "GET" && url.pathname === "/api/v1/ready") {
    const health = await composition.health();
    return json(response, health.ready ? 200 : 503, { success: health.ready, data: health }, corsHeaders);
  }
  if (request.method === "GET" && url.pathname === "/api/v1/system/providers") {
    if (!auth.platformAdmin) throw Object.assign(new Error("platform authority is required"), { status: 403, code: "platform_authority_denied" });
    const health = await composition.health();
    return json(response, 200, { success: true, data: { ...health, instanceId } }, corsHeaders);
  }
  if (request.method === "POST" && url.pathname === "/api/v1/system/telemetry/flush") {
    if (!auth.platformAdmin) throw Object.assign(new Error("platform authority is required"), { status: 403, code: "platform_authority_denied" });
    await telemetry.flush();
    return json(response, 200, { success: true, data: await telemetry.snapshot() }, corsHeaders);
  }
  if (request.method === "POST" && url.pathname === "/api/v1/tenants/bootstrap") {
    if (!auth.platformAdmin) throw Object.assign(new Error("platform authority is required"), { status: 403, code: "platform_authority_denied" });
    const body = await readJson(request);
    const now = Date.now();
    const created = await context.authority.createTenant({
      tenant: {
        tenantId: body.tenantId,
        status: "active",
        administrativeMetadata: { displayName: body.displayName ?? body.tenantId, createdBy: auth.actorId, updatedBy: auth.actorId },
        lifecycle: { createdAt: now, updatedAt: now, activatedAt: now },
        revision: 1,
      },
      owner: {
        tenantId: body.tenantId,
        principalId: body.ownerPrincipalId,
        role: "tenant_owner",
        status: "active",
        createdAt: now,
        updatedAt: now,
        revision: 1,
        createdBy: auth.actorId,
      },
      governance: {
        tenantId: body.tenantId,
        policy: { policyId: `policy-${body.tenantId}`, tenantId: body.tenantId, defaultEffect: "deny", rules: [], createdAt: now, updatedAt: now, revision: 1 },
        entitlements: [], limits: [], createdAt: now, updatedAt: now, revision: 1,
      },
      context: { actor: auth.actorId, correlationId: correlationId(request), timestamp: now },
    });
    return json(response, 201, { success: true, data: { tenantId: created.tenantId, instanceId } }, corsHeaders);
  }
  if (tenantId) await requireTenantAuthority(auth, tenantId);
  if (request.method === "GET" && tenantId && url.pathname === `/api/v1/tenants/${encodeURIComponent(tenantId)}`) {
    const tenant = await context.state.tenants.get(tenantId);
    return json(response, 200, { success: true, data: { tenantId: tenant.tenantId, status: tenant.status, revision: tenant.revision, instanceId } }, corsHeaders);
  }
  if (request.method === "POST" && tenantId && url.pathname === `/api/v1/tenants/${encodeURIComponent(tenantId)}/secrets`) {
    const body = await readJson(request);
    const secret = await secretStore.put({ tenantId, providerId: body.providerId ?? "external-vault", purpose: body.purpose, value: body.value, actor: auth.actorId, correlationId: correlationId(request) });
    return json(response, 201, { success: true, data: { secret, instanceId } }, corsHeaders);
  }
  const secretMatch = tenantId ? new RegExp(`^/api/v1/tenants/${encodeURIComponent(tenantId)}/secrets/([^/]+)(?:/(rotate|revoke|verify))?$`).exec(url.pathname) : undefined;
  if (secretMatch?.[1]) {
    const secretId = decodeURIComponent(secretMatch[1]);
    const metadata = await context.state.secretMetadata.get(secretId);
    if (!metadata) throw Object.assign(new Error("secret metadata not found"), { status: 404, code: "secret_not_found" });
    const ref = { id: secretId, backend: metadata.backend, tenantId, keyVersion: String(metadata.version), purpose: metadata.purpose, createdAt: metadata.createdAt };
    if (request.method === "GET" && !secretMatch[2]) return json(response, 200, { success: true, data: { metadata: await secretStore.describe(ref, { tenantId, actor: auth.actorId }), instanceId } }, corsHeaders);
    if (request.method === "POST" && secretMatch[2] === "rotate") {
      const body = await readJson(request);
      const next = await secretStore.rotate(ref, { tenantId, actor: auth.actorId, correlationId: correlationId(request), value: body.value });
      return json(response, 200, { success: true, data: { secret: next, instanceId } }, corsHeaders);
    }
    if (request.method === "POST" && secretMatch[2] === "revoke") {
      const next = await secretStore.revoke(ref, { tenantId, actor: auth.actorId, correlationId: correlationId(request) });
      return json(response, 200, { success: true, data: { metadata: next, instanceId } }, corsHeaders);
    }
    if (request.method === "POST" && secretMatch[2] === "verify") {
      const body = await readJson(request);
      const value = await secretStore.get(ref, { tenantId, actor: auth.actorId, correlationId: correlationId(request) });
      const digest = createHash("sha256").update(value).digest("hex");
      return json(response, 200, { success: true, data: { matched: digest === body.sha256, instanceId } }, corsHeaders);
    }
  }
  if (request.method === "POST" && (url.pathname === "/api/v1/probe" || url.pathname === "/api/v1/probe/execute")) {
    const body = await readJson(request);
    span.setAttribute("probe.name", body.name ?? "provider-probe");
    return json(response, 200, { success: true, data: { instanceId, principalId: auth.actorId, tenantId: auth.tenantId, clientAddress: edgePolicy.clientAddressResolver.resolve(request), traceId: span.context.traceId } }, corsHeaders);
  }
  throw Object.assign(new Error("route not found"), { status: 404, code: "not_found" });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const cors = edgePolicy.cors(request);
  if (!cors.allowed) return json(response, 403, { success: false, error: { code: cors.reason } }, cors.headers);
  if (request.method === "OPTIONS") return json(response, 204, {}, cors.headers);
  let span;
  try {
    let networkDecision;
    try {
      networkDecision = await edgePolicy.consumeNetwork(request, request.url ?? "/");
    } catch (error) {
      if (url.pathname !== "/api/v1/health" && url.pathname !== "/api/v1/ready") throw error;
    }
    if (networkDecision && !networkDecision.allowed) return json(response, 429, { success: false, error: { code: "rate_limited" } }, cors.headers, rateHeaders(networkDecision));
    const protectedRoute = url.pathname !== "/api/v1/health" && url.pathname !== "/api/v1/ready";
    if (protectedRoute && (request.socket.remoteAddress !== "127.0.0.2" || request.headers["x-acs-edge-attestation"] !== edgeAttestationToken)) {
      throw Object.assign(new Error("trusted edge is required"), { status: 403, code: "trusted_edge_required" });
    }
    const parent = parseTraceparent(request.headers.traceparent?.toString());
    span = telemetry.startSpan("http.request", { parent, context: { correlationId: correlationId(request), requestId: request.headers["x-request-id"]?.toString() }, attributes: { method: request.method ?? "GET", path: url.pathname } });
    if (url.pathname === "/api/v1/internal/runtime/identity") {
      const principal = await workerIdentityValidator.authenticate(headersRecord(request));
      const body = await readJson(request);
      if (body.workerId !== principal.workerId || body.instanceId !== principal.instanceId) throw Object.assign(new Error("worker binding mismatch"), { status: 403, code: "worker_binding_mismatch" });
      const workerAuth = createAcsAuthContext({ mode: "oidc", actorType: "agent", actorId: principal.workerId, authenticated: true, trusted: true, principal: { principalId: principal.workerId, issuer: principal.issuer, subject: principal.subject, authenticationMethod: "oidc_bearer" } });
      const decision = await edgePolicy.consumeAuthenticated(request.url ?? "/", request.method, workerAuth, "runtime");
      if (decision && !decision.allowed) return json(response, 429, { success: false, error: { code: "rate_limited" } }, cors.headers, rateHeaders(decision));
      span.end("ok", { workerId: principal.workerId });
      telemetry.log({ component: "worker.identity", event: "worker.identity.authenticated", message: "External worker identity authenticated.", context: { traceId: span.context.traceId, spanId: span.context.spanId, workerId: principal.workerId } });
      return json(response, 200, { success: true, data: { workerId: principal.workerId, instanceId: principal.instanceId, authenticationMethod: principal.authenticationMethod, controlPlaneInstanceId: instanceId } }, cors.headers);
    }
    const auth = url.pathname === "/api/v1/health" || url.pathname === "/api/v1/ready"
      ? createAcsAuthContext({ mode: "oidc", authenticated: false, trusted: false })
      : await identityValidator.authenticate(headersRecord(request));
    const decision = await edgePolicy.consumeAuthenticated(request.url ?? "/", request.method, auth, auth.tenantId ?? "platform");
    if (decision && !decision.allowed) return json(response, 429, { success: false, error: { code: "rate_limited" } }, cors.headers, rateHeaders(decision));
    await dispatch(request, response, url, auth, cors.headers, span);
    span.end("ok", { status: response.statusCode });
    telemetry.log({ component: "http", event: "http.request.completed", message: "Provider-boundary request completed.", context: { traceId: span.context.traceId, spanId: span.context.spanId, correlationId: correlationId(request), principalId: auth.actorId }, attributes: { status: response.statusCode, path: url.pathname } });
    telemetry.metric({ name: "acs.http.requests", kind: "counter", value: 1, attributes: { instance: instanceId, statusClass: `${Math.floor(response.statusCode / 100)}xx` } });
  } catch (error) {
    span?.end("error", { code: error?.code ?? error?.name ?? "internal_error" });
    const status = errorStatus(error);
    json(response, status, { success: false, error: { code: error?.code ?? error?.name ?? "internal_error", message: status === 500 ? "provider-boundary request failed" : error.message }, correlationId: correlationId(request) }, cors.headers);
  }
});
server.maxHeadersCount = edgePolicy.limits.maxHeadersCount;
server.headersTimeout = edgePolicy.limits.headersTimeoutMs;
server.requestTimeout = edgePolicy.limits.requestTimeoutMs;
server.keepAliveTimeout = edgePolicy.limits.keepAliveTimeoutMs;
server.maxRequestsPerSocket = edgePolicy.limits.maxRequestsPerSocket;
await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolveListen); });
process.stdout.write(JSON.stringify({ ready: true, service: "mh02-control-plane", instanceId, pid: process.pid, port }) + "\n");

async function shutdown() {
  await new Promise((resolveClose) => server.close(resolveClose));
  await telemetry.close();
  await context.close();
  process.exit(0);
}
process.once("SIGTERM", () => { void shutdown(); });
process.once("SIGINT", () => { void shutdown(); });
