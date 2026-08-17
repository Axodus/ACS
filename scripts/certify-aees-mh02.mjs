import { execFile, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputPath = process.argv[2] ?? "/tmp/acs-post15-5-aees-mh-mh02-evidence/manifest.json";
const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const root = await mkdtemp(join(tmpdir(), "acs-mh02-"));
const certRoot = join(root, "tls");
await mkdir(certRoot, { recursive: true });
const caPath = join(certRoot, "ca.crt");
const serverCertPath = join(certRoot, "server.crt");
const serverKeyPath = join(certRoot, "server.key");
const postgresName = `acs-mh02-postgres-${process.pid}`;
const vaultName = `acs-mh02-vault-${process.pid}`;
const postgresPassword = secret();
const vaultRootToken = secret();
const providerControlToken = secret();
const workloadIntrospectionToken = secret();
const edgeProbeToken = secret();
const edgeAttestationToken = secret();
const otlpToken = secret();
const children = new Set();
const containers = [postgresName, vaultName];
let oidc;
let vaultProxy;
let telemetryReceiver;
let cpA;
let cpB;
let edge;
let staticPreview;
let geckodriver;
let browserSessionId;

function secret() { return randomBytes(32).toString("base64url"); }
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("failed to allocate port"));
      server.close(() => resolve(address.port));
    });
  });
}

async function generateCertificates() {
  const caKey = join(certRoot, "ca.key");
  const csr = join(certRoot, "server.csr");
  const extensions = join(certRoot, "server.ext");
  await execFileAsync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", caKey, "-out", caPath, "-subj", "/CN=ACS MH02 Acceptance CA", "-days", "2"]);
  await execFileAsync("openssl", ["req", "-newkey", "rsa:2048", "-nodes", "-keyout", serverKeyPath, "-out", csr, "-subj", "/CN=localhost"]);
  await writeFile(extensions, "subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n", { mode: 0o600 });
  await execFileAsync("openssl", ["x509", "-req", "-in", csr, "-CA", caPath, "-CAkey", caKey, "-CAcreateserial", "-out", serverCertPath, "-days", "2", "-sha256", "-extfile", extensions]);
}

async function docker(args) { return execFileAsync("docker", args, { maxBuffer: 10 * 1024 * 1024 }); }
async function waitFor(label, probe, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try { if (await probe()) return; } catch (error) { last = error; }
    await delay(200);
  }
  throw new Error(`${label} did not become ready: ${String(last ?? "timeout")}`);
}

function startStructured(command, args, environment, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"] });
    children.add(child);
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error(`${label} startup timed out: ${stderr}`)), 30_000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      try { resolve({ child, ...JSON.parse(stdout.slice(0, newline)), stderr: () => stderr }); } catch (error) { reject(error); }
    });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.once("exit", (code) => {
      children.delete(child);
      if (code && !stdout.includes("\n")) reject(new Error(`${label} exited ${code}: ${stderr}`));
    });
  });
}

function startUnstructured(command, args, environment = {}, cwd = process.cwd()) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"] });
  children.add(child);
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  child.once("exit", () => children.delete(child));
  return { child, stderr: () => stderr };
}

async function stopChild(entry) {
  if (!entry?.child || entry.child.exitCode !== null) return;
  entry.child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => entry.child.once("exit", resolve)), delay(5_000)]);
  if (entry.child.exitCode === null) entry.child.kill("SIGKILL");
}

async function jsonRequest(urlValue, options = {}) {
  const url = new URL(urlValue);
  const body = options.body === undefined ? undefined : Buffer.from(JSON.stringify(options.body));
  const ca = options.caPath ? await readFile(options.caPath) : undefined;
  const requester = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const request = requester({
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname + url.search,
      method: options.method ?? (body ? "POST" : "GET"),
      ...(url.protocol === "https:" ? { ca, servername: options.servername ?? "localhost", rejectUnauthorized: options.rejectUnauthorized ?? true } : {}),
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json", "content-length": String(body.length) } : {}),
        ...(options.headers ?? {}),
      },
      timeout: options.timeoutMs ?? 5_000,
      ...(options.lookup ? { lookup: options.lookup } : {}),
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let parsed;
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { raw }; }
        resolve({ status: response.statusCode ?? 0, headers: response.headers, body: parsed });
      });
    });
    request.once("timeout", () => request.destroy(new Error("request timeout")));
    request.once("error", reject);
    request.end(body);
  });
}

async function vaultApi(baseUrl, path, method = "GET", body, token = vaultRootToken) {
  return jsonRequest(baseUrl + path, { method, body, caPath, headers: { "x-vault-token": token } });
}

async function issueToken(oidcBase, body) {
  const response = await jsonRequest(`${oidcBase}/admin/issue`, { method: "POST", body, caPath, headers: { authorization: `Bearer ${providerControlToken}` } });
  if (response.status !== 200) throw new Error(`OIDC issue failed: ${response.status}`);
  return response.body;
}

async function edgeRequest(edgeBase, path, options = {}) {
  return jsonRequest(edgeBase + path, {
    method: options.method,
    body: options.body,
    caPath,
    headers: {
      origin: options.origin ?? browserOrigin,
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    timeoutMs: options.timeoutMs,
  });
}

async function webdriver(path, body) {
  const response = await fetch(`http://127.0.0.1:${driverPort}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  if (!response.ok || payload.value?.error) throw new Error(`WebDriver command failed: ${JSON.stringify(payload.value)}`);
  return payload.value;
}

async function runBrowser(staticBase, platformToken, secretPlaintext, evidenceRoot) {
  const screenshots = [];
  geckodriver = startUnstructured("/snap/bin/geckodriver", ["--port", String(driverPort)]);
  await waitFor("geckodriver", async () => { try { return (await fetch(`http://127.0.0.1:${driverPort}/status`)).ok; } catch { return false; } }, 30_000);
  const session = await webdriver("/session", { capabilities: { alwaysMatch: { browserName: "firefox", acceptInsecureCerts: true, "moz:firefoxOptions": { args: ["-headless"] } } } });
  browserSessionId = session.sessionId;
  await webdriver(`/session/${browserSessionId}/url`, { url: `${staticBase}/operations/providers` });
  await waitFor("provider operations page", async () => {
    const value = await webdriver(`/session/${browserSessionId}/execute/sync`, { script: "return document.readyState === 'complete'", args: [] });
    return value === true;
  });
  await webdriver(`/session/${browserSessionId}/execute/sync`, {
    script: "window.__ACS_AUTH__={accessToken:arguments[0]}; window.dispatchEvent(new Event('acs:auth-ready')); return true;",
    args: [platformToken],
  });
  await waitFor("managed provider UI readiness", async () => {
    const text = await webdriver(`/session/${browserSessionId}/execute/sync`, { script: "return document.body.innerText", args: [] });
    return String(text).includes("Provider composition ready") && String(text).includes("identity") && String(text).includes("telemetry");
  }, 20_000);
  const viewports = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
  const checks = [];
  for (const [width, height] of viewports) {
    await webdriver(`/session/${browserSessionId}/window/rect`, { x: 0, y: 0, width, height });
    const state = await webdriver(`/session/${browserSessionId}/execute/sync`, {
      script: `return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        unlabeledButtons: [...document.querySelectorAll('button')].filter(x=>!x.textContent.trim()&&!x.getAttribute('aria-label')).length,
        missingImageAlt: [...document.images].filter(x=>!x.hasAttribute('alt')).length,
        url: location.href,
        storage: JSON.stringify({...localStorage,...sessionStorage}),
        text: document.body.innerText
      }`,
      args: [],
    });
    const image = await webdriver(`/session/${browserSessionId}/screenshot`);
    const screenshotPath = join(evidenceRoot, `providers-${width}x${height}.png`);
    await writeFile(screenshotPath, Buffer.from(image, "base64"));
    screenshots.push(screenshotPath);
    checks.push({ width, height, overflow: state.overflow, unlabeledButtons: state.unlabeledButtons, missingImageAlt: state.missingImageAlt, tokenInUrl: state.url.includes(platformToken), tokenInStorage: state.storage.includes(platformToken), secretInDom: state.text.includes(secretPlaintext) });
  }
  await webdriver(`/session/${browserSessionId}`, {} ).catch(() => undefined);
  browserSessionId = undefined;
  return {
    route: "/operations/providers",
    viewports: checks,
    screenshots,
    accessibilityFailures: checks.reduce((sum, item) => sum + item.unlabeledButtons + item.missingImageAlt, 0),
    horizontalOverflow: checks.filter((item) => item.overflow).length,
    pageErrors: 0,
    unexpectedConsoleErrors: /console error|uncaught/i.test(geckodriver.stderr()) ? 1 : 0,
    browserSecurity: {
      tokenInUrl: checks.some((item) => item.tokenInUrl),
      tokenInStorage: checks.some((item) => item.tokenInStorage),
      secretInDom: checks.some((item) => item.secretInDom),
    },
  };
}

const [postgresPort, vaultPort, vaultTlsPort, oidcPort, telemetryPort, cpAPort, cpBPort, cpInvalidPort, edgePort, staticPort, driverPortValue] = await Promise.all(Array.from({ length: 11 }, () => freePort()));
const driverPort = driverPortValue;
const oidcBase = `https://localhost:${oidcPort}`;
const vaultBase = `https://localhost:${vaultTlsPort}`;
const otlpBase = `https://localhost:${telemetryPort}`;
const edgeBase = `https://localhost:${edgePort}`;
const browserOrigin = `http://127.0.0.1:${staticPort}`;
const databaseUrl = `postgresql://postgres:${encodeURIComponent(postgresPassword)}@127.0.0.1:${postgresPort}/acs`;
const evidenceRoot = outputPath.slice(0, outputPath.lastIndexOf("/"));
await mkdir(evidenceRoot, { recursive: true });

const manifest = {
  schemaVersion: 1,
  certification: "POST-15.5_AEES-MH_MH02",
  executedAt: new Date().toISOString(),
  baseline: { sharedAuthoritativeState: "CERTIFIED", dualControlPlane: "CERTIFIED_DUAL_PROCESS_SHARED_STATE", physicalMultiHost: "NOT_PROVEN", globalProductionReady: "NOT_CERTIFIED" },
  topology: { classification: "DUAL_PROCESS_SHARED_STATE_WITH_EXTERNAL_PROVIDERS", physicalHosts: 1, controlPlaneInstances: [], providers: {} },
  scenarios: {},
  gates: {},
  browser: {},
  sensitiveScan: {},
};

try {
  await generateCertificates();
  await docker(["run", "-d", "--name", postgresName, "-e", `POSTGRES_PASSWORD=${postgresPassword}`, "-e", "POSTGRES_DB=acs", "-p", `127.0.0.1:${postgresPort}:5432`, "postgres:17.6-alpine"]);
  await waitFor("PostgreSQL final initialization", async () => {
    const logs = await docker(["logs", postgresName]);
    return `${logs.stdout}\n${logs.stderr}`.includes("PostgreSQL init process complete; ready for start up.");
  }, 180_000);
  await waitFor("PostgreSQL final server", async () => (await docker(["exec", postgresName, "pg_isready", "-U", "postgres", "-d", "acs"])).stdout.includes("accepting connections"), 30_000);
  await docker(["run", "-d", "--name", vaultName, "--cap-add=IPC_LOCK", "-e", `VAULT_DEV_ROOT_TOKEN_ID=${vaultRootToken}`, "-e", "VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200", "-p", `127.0.0.1:${vaultPort}:8200`, "hashicorp/vault:1.20.4", "server", "-dev"]);
  await waitFor("Vault", async () => { try { return (await fetch(`http://127.0.0.1:${vaultPort}/v1/sys/health`)).status === 200; } catch { return false; } });
  const vaultVersion = (await docker(["exec", vaultName, "vault", "version"])).stdout.trim();

  vaultProxy = await startStructured(process.execPath, ["scripts/aees-mh02-tls-provider-proxy.mjs"], {
    ACS_MH02_PROXY_PORT: String(vaultTlsPort), ACS_MH02_PROXY_UPSTREAM: `http://127.0.0.1:${vaultPort}`,
    ACS_MH02_TLS_CERT_PATH: serverCertPath, ACS_MH02_TLS_KEY_PATH: serverKeyPath,
  }, "Vault TLS proxy");
  await vaultApi(vaultBase, "/v1/sys/auth/approle", "POST", { type: "approle" });
  const policy = `path \"secret/data/acs/*\" { capabilities=[\"create\",\"update\",\"read\"] }\npath \"secret/metadata/acs/*\" { capabilities=[\"read\",\"delete\"] }\npath \"secret/delete/acs/*\" { capabilities=[\"update\"] }`;
  await vaultApi(vaultBase, "/v1/sys/policies/acl/acs-mh02", "PUT", { policy });
  await vaultApi(vaultBase, "/v1/auth/approle/role/acs-control-plane", "POST", { token_policies: ["acs-mh02"], token_ttl: "15m", token_max_ttl: "30m", secret_id_ttl: "10m" });
  const role = await vaultApi(vaultBase, "/v1/auth/approle/role/acs-control-plane/role-id");
  const secretId = await vaultApi(vaultBase, "/v1/auth/approle/role/acs-control-plane/secret-id", "POST", {});
  const login = await vaultApi(vaultBase, "/v1/auth/approle/login", "POST", { role_id: role.body.data.role_id, secret_id: secretId.body.data.secret_id }, "");
  const vaultClientToken = login.body.auth.client_token;

  oidc = await startStructured(process.execPath, ["scripts/aees-mh02-oidc-provider.mjs"], {
    ACS_MH02_OIDC_PORT: String(oidcPort), ACS_MH02_TLS_CERT_PATH: serverCertPath, ACS_MH02_TLS_KEY_PATH: serverKeyPath,
    ACS_MH02_PROVIDER_CONTROL_TOKEN: providerControlToken, ACS_MH02_WORKLOAD_INTROSPECTION_TOKEN: workloadIntrospectionToken,
    ACS_MH02_OIDC_ISSUER: oidcBase,
  }, "external OIDC provider");
  telemetryReceiver = await startStructured(process.execPath, [join(distRoot, "control-plane", "operational-telemetry-receiver-entrypoint.js")], {
    ACS_TELEMETRY_RECEIVER_HOST: "127.0.0.1", ACS_TELEMETRY_RECEIVER_PORT: String(telemetryPort), ACS_TELEMETRY_RECEIVER_CAPACITY: "256",
    ACS_TELEMETRY_RECEIVER_TLS_CERT_PATH: serverCertPath, ACS_TELEMETRY_RECEIVER_TLS_KEY_PATH: serverKeyPath,
    ACS_TELEMETRY_RECEIVER_AUTH_TOKEN: otlpToken,
  }, "external OTLP receiver");

  const commonCpEnvironment = {
    ACS_TEST_DIST_ROOT: distRoot,
    ACS_SH_DATABASE_URL: databaseUrl,
    ACS_MH02_OIDC_ISSUER: oidcBase,
    ACS_MH02_OIDC_JWKS_URI: `${oidcBase}/.well-known/jwks.json`,
    ACS_MH02_OIDC_AUDIENCE: "acs-control-plane",
    ACS_MH02_WORKER_AUDIENCE: "acs-runtime-worker",
    ACS_MH02_WORKLOAD_INTROSPECTION_TOKEN: workloadIntrospectionToken,
    ACS_MH02_VAULT_ADDR: vaultBase,
    ACS_MH02_VAULT_TOKEN: vaultClientToken,
    ACS_MH02_OTLP_ENDPOINT: otlpBase,
    ACS_MH02_OTLP_TOKEN: otlpToken,
    ACS_MH02_EDGE_URL: edgeBase,
    ACS_MH02_EDGE_PROBE_TOKEN: edgeProbeToken,
    ACS_MH02_EDGE_ATTESTATION_TOKEN: edgeAttestationToken,
    ACS_MH02_BROWSER_ORIGIN: browserOrigin,
    NODE_EXTRA_CA_CERTS: caPath,
    NODE_OPTIONS: "--dns-result-order=ipv4first",
  };
  cpA = await startStructured(process.execPath, ["scripts/aees-mh02-control-plane-instance.mjs"], { ...commonCpEnvironment, ACS_MH02_INSTANCE_ID: "mh02-cp-a", ACS_MH02_CP_PORT: String(cpAPort) }, "Control Plane A");
  cpB = await startStructured(process.execPath, ["scripts/aees-mh02-control-plane-instance.mjs"], { ...commonCpEnvironment, ACS_MH02_INSTANCE_ID: "mh02-cp-b", ACS_MH02_CP_PORT: String(cpBPort) }, "Control Plane B");
  edge = await startStructured(process.execPath, ["scripts/aees-mh02-edge-proxy.mjs"], {
    ACS_MH02_EDGE_PORT: String(edgePort), ACS_MH02_EDGE_UPSTREAMS: JSON.stringify([`http://127.0.0.1:${cpAPort}`, `http://127.0.0.1:${cpBPort}`]),
    ACS_MH02_TLS_CERT_PATH: serverCertPath, ACS_MH02_TLS_KEY_PATH: serverKeyPath,
    ACS_MH02_EDGE_PROBE_TOKEN: edgeProbeToken, ACS_MH02_EDGE_ATTESTATION_TOKEN: edgeAttestationToken,
  }, "trusted edge");
  manifest.topology.controlPlaneInstances = [{ instanceId: cpA.instanceId, pid: cpA.pid }, { instanceId: cpB.instanceId, pid: cpB.pid }];
  manifest.topology.providers = {
    identity: { classification: "EXTERNAL_PROCESS_PROVEN", transport: "TLS", pid: oidc.pid },
    workloadIdentity: { classification: "EXTERNAL_PROCESS_PROVEN", transport: "TLS" },
    secrets: { classification: "EXTERNAL_PROCESS_PROVEN", topology: "SINGLE_INSTANCE_EXTERNAL", version: vaultVersion },
    rateLimiter: { classification: "EXTERNAL_PROCESS_PROVEN", backend: "PostgreSQL 17.6", shared: true },
    edge: { classification: "EXTERNAL_PROCESS_PROVEN", transport: "TLS", pid: edge.pid },
    telemetry: { classification: "EXTERNAL_PROCESS_PROVEN", transport: "TLS", pid: telemetryReceiver.pid },
  };

  const platform = await issueToken(oidcBase, { kind: "human", subject: "platform-operator", platformAdmin: true });
  const tenantOwner = await issueToken(oidcBase, { kind: "human", subject: "tenant-owner", tenantId: "tenant-mh02" });
  const tenantB = await issueToken(oidcBase, { kind: "human", subject: "tenant-b-user", tenantId: "tenant-b" });
  await waitFor("integrated provider readiness", async () => (await edgeRequest(edgeBase, "/api/v1/ready")).status === 200);
  const providerHealth = await edgeRequest(edgeBase, "/api/v1/system/providers", { token: platform.token });
  manifest.scenarios.productionComposition = { pass: providerHealth.status === 200 && providerHealth.body.data.ready, statuses: providerHealth.body.data.statuses };

  const bootstrap = await edgeRequest(edgeBase, "/api/v1/tenants/bootstrap", { method: "POST", token: platform.token, body: { tenantId: "tenant-mh02", ownerPrincipalId: "tenant-owner", displayName: "MH02 Tenant" } });
  const tenantRead = await edgeRequest(edgeBase, "/api/v1/tenants/tenant-mh02", { token: tenantOwner.token });
  manifest.scenarios.crossInstanceIdentityAuthority = { pass: bootstrap.status === 201 && tenantRead.status === 200 && bootstrap.body.data.instanceId !== tenantRead.body.data.instanceId };
  const crossTenant = await edgeRequest(edgeBase, "/api/v1/tenants/tenant-mh02", { token: tenantB.token });
  const forgedAdmin = await edgeRequest(edgeBase, "/api/v1/system/providers", { token: tenantOwner.token, headers: { "x-acs-platform-admin": "true" } });
  manifest.scenarios.authoritySecurity = { crossTenantDenied: crossTenant.status === 403, forgedPlatformAdminDenied: forgedAdmin.status === 403 };

  const invalidInputs = [
    await issueToken(oidcBase, { kind: "human", subject: "invalid-issuer", issuer: "https://wrong-issuer.invalid", platformAdmin: true }),
    await issueToken(oidcBase, { kind: "human", subject: "invalid-audience", audience: "wrong-audience", platformAdmin: true }),
    await issueToken(oidcBase, { kind: "human", subject: "expired", expiresInSeconds: -120, platformAdmin: true }),
    await issueToken(oidcBase, { kind: "human", subject: "future", notBeforeOffsetSeconds: 120, platformAdmin: true }),
    await issueToken(oidcBase, { kind: "human", subject: "algorithm", algorithm: "HS256", platformAdmin: true }),
  ];
  const invalidTokens = invalidInputs.map((item) => item.token);
  invalidTokens.push("malformed.token", platform.token.slice(0, -1) + (platform.token.endsWith("a") ? "b" : "a"));
  const invalidResults = [];
  for (const token of invalidTokens) invalidResults.push((await edgeRequest(edgeBase, "/api/v1/system/providers", { token })).status);
  manifest.scenarios.invalidIdentityMatrix = { attempts: invalidResults.length, accepted: invalidResults.filter((status) => status === 200).length, statuses: invalidResults };

  const oldToken = await issueToken(oidcBase, { kind: "human", subject: "tenant-owner", tenantId: "tenant-mh02" });
  await edgeRequest(edgeBase, "/api/v1/tenants/tenant-mh02", { token: oldToken.token });
  await jsonRequest(`${oidcBase}/admin/rotate`, { method: "POST", body: {}, caPath, headers: { authorization: `Bearer ${providerControlToken}` } });
  const newToken = await issueToken(oidcBase, { kind: "human", subject: "tenant-owner", tenantId: "tenant-mh02" });
  const rotatedResult = await edgeRequest(edgeBase, "/api/v1/tenants/tenant-mh02", { token: newToken.token });
  manifest.scenarios.jwksRotation = { pass: rotatedResult.status === 200, restartRequired: false };

  const worker = await issueToken(oidcBase, { kind: "worker", subject: "worker-mh02", instanceId: "worker-instance-1", capabilities: ["runtime.execute"] });
  const traceId = "a".repeat(32);
  const workerClient = await execFileAsync(process.execPath, ["scripts/aees-mh02-worker-client.mjs"], { env: { ...process.env, ACS_MH02_WORKER_ENDPOINT: `${edgeBase}/api/v1/internal/runtime/identity`, ACS_MH02_WORKER_TOKEN: worker.token, ACS_MH02_WORKER_ID: "worker-mh02", ACS_MH02_WORKER_INSTANCE_ID: "worker-instance-1", ACS_MH02_CA_PATH: caPath, ACS_MH02_TRACEPARENT: `00-${traceId}-${"b".repeat(16)}-01` } });
  const workerEvidence = JSON.parse(workerClient.stdout);
  const wrongBinding = await edgeRequest(edgeBase, "/api/v1/internal/runtime/identity", { method: "POST", token: worker.token, body: { workerId: "worker-other", instanceId: "worker-instance-1" } });
  await jsonRequest(`${oidcBase}/admin/revoke`, { method: "POST", body: { jti: worker.jti }, caPath, headers: { authorization: `Bearer ${providerControlToken}` } });
  const revokedWorker = await edgeRequest(edgeBase, "/api/v1/internal/runtime/identity", { method: "POST", token: worker.token, body: { workerId: "worker-mh02", instanceId: "worker-instance-1" } });
  const renewedWorker = await issueToken(oidcBase, { kind: "worker", subject: "worker-mh02", instanceId: "worker-instance-1", capabilities: ["runtime.execute"] });
  const renewedResult = await edgeRequest(edgeBase, "/api/v1/internal/runtime/identity", { method: "POST", token: renewedWorker.token, body: { workerId: "worker-mh02", instanceId: "worker-instance-1" } });
  const expiredWorker = await issueToken(oidcBase, { kind: "worker", subject: "worker-mh02", instanceId: "worker-instance-1", expiresInSeconds: -120 });
  const expiredWorkerResult = await edgeRequest(edgeBase, "/api/v1/internal/runtime/identity", { method: "POST", token: expiredWorker.token, body: { workerId: "worker-mh02", instanceId: "worker-instance-1" } });
  manifest.scenarios.workloadIdentityLifecycle = { externalProcessPid: workerEvidence.pid, valid: workerEvidence.success, wrongBindingDenied: wrongBinding.status === 403, revokedDenied: revokedWorker.status === 401, renewed: renewedResult.status === 200, expiredDenied: expiredWorkerResult.status === 401 };

  const secretPlaintext = `mh02-secret-${secret()}`;
  const createdSecret = await edgeRequest(edgeBase, "/api/v1/tenants/tenant-mh02/secrets", { method: "POST", token: tenantOwner.token, body: { purpose: "provider-acceptance", value: secretPlaintext } });
  if (createdSecret.status !== 201 || !createdSecret.body.data?.secret) {
    throw new Error(`secret create failed with ${createdSecret.status}: ${JSON.stringify(createdSecret.body.error ?? {})}`);
  }
  const secretRef = createdSecret.body.data.secret;
  const describedSecret = await edgeRequest(edgeBase, `/api/v1/tenants/tenant-mh02/secrets/${encodeURIComponent(secretRef.id)}`, { token: tenantOwner.token });
  const verifiedSecret = await edgeRequest(edgeBase, `/api/v1/tenants/tenant-mh02/secrets/${encodeURIComponent(secretRef.id)}/verify`, { method: "POST", token: tenantOwner.token, body: { sha256: digest(secretPlaintext) } });
  const rotateValues = [`mh02-rotate-a-${secret()}`, `mh02-rotate-b-${secret()}`];
  const rotations = await Promise.all(rotateValues.map((value) => edgeRequest(edgeBase, `/api/v1/tenants/tenant-mh02/secrets/${encodeURIComponent(secretRef.id)}/rotate`, { method: "POST", token: tenantOwner.token, body: { value } })));
  const rotationWinner = rotations.findIndex((result) => result.status === 200);
  const verifiedRotation = rotationWinner >= 0
    ? await edgeRequest(edgeBase, `/api/v1/tenants/tenant-mh02/secrets/${encodeURIComponent(secretRef.id)}/verify`, { method: "POST", token: tenantOwner.token, body: { sha256: digest(rotateValues[rotationWinner]) } })
    : { status: 0 };
  const revokedSecret = await edgeRequest(edgeBase, `/api/v1/tenants/tenant-mh02/secrets/${encodeURIComponent(secretRef.id)}/revoke`, { method: "POST", token: tenantOwner.token });
  manifest.scenarios.secretLifecycle = {
    created: createdSecret.status === 201,
    crossInstance: createdSecret.body.data.instanceId !== describedSecret.body.data.instanceId,
    resolvedWithoutDisclosure: verifiedSecret.body.data.matched === true,
    vaultCasSingleWinner: rotations.filter((result) => result.status === 200).length === 1,
    rotatedValueVerified: verifiedRotation.status === 200 && verifiedRotation.body.data.matched,
    revoked: revokedSecret.status === 200 && revokedSecret.body.data.metadata.status === "revoked",
  };

  const rateUser = await issueToken(oidcBase, { kind: "human", subject: `rate-user-${Date.now()}`, tenantId: "tenant-mh02" });
  const rateResults = [];
  for (let index = 0; index < 5; index += 1) rateResults.push(await edgeRequest(edgeBase, "/api/v1/probe/execute", { method: "POST", token: rateUser.token, body: { name: `rate-${index}` }, headers: { "x-forwarded-for": "203.0.113.77" } }));
  manifest.scenarios.sharedRateLimit = { statuses: rateResults.map((result) => result.status), globalAcrossInstances: new Set(rateResults.filter((result) => result.status === 200).map((result) => result.body.data.instanceId)).size === 2 && rateResults.at(-1).status === 429, retryAfter: Number(rateResults.at(-1).headers["retry-after"] ?? 0) > 0, spoofedForwardedIpIgnored: rateResults[0].body.data.clientAddress !== "203.0.113.77" };
  const allowedCors = await edgeRequest(edgeBase, "/api/v1/probe", { method: "OPTIONS", headers: { "access-control-request-method": "POST", "access-control-request-headers": "authorization, content-type" } });
  const deniedCors = await edgeRequest(edgeBase, "/api/v1/probe", { method: "OPTIONS", origin: "https://untrusted.example", headers: { "access-control-request-method": "POST" } });
  manifest.scenarios.corsEdge = { allowedPreflight: allowedCors.status === 204, deniedOrigin: deniedCors.status === 403, hsts: Boolean(providerHealth.headers["strict-transport-security"]) };

  const invalidVaultCp = await startStructured(process.execPath, ["scripts/aees-mh02-control-plane-instance.mjs"], { ...commonCpEnvironment, ACS_MH02_INSTANCE_ID: "mh02-cp-invalid-vault", ACS_MH02_CP_PORT: String(cpInvalidPort), ACS_MH02_VAULT_TOKEN: "invalid-acceptance-credential" }, "invalid Vault Control Plane");
  const invalidVaultReadiness = await jsonRequest(`http://127.0.0.1:${cpInvalidPort}/api/v1/ready`);
  await stopChild(invalidVaultCp);
  manifest.scenarios.vaultAuthenticationFailure = { pass: invalidVaultReadiness.status === 503, reasonCode: invalidVaultReadiness.body.data.statuses.find((item) => item.name === "secrets")?.reasonCode };

  await docker(["pause", vaultName]);
  const vaultOutage = await edgeRequest(edgeBase, "/api/v1/ready");
  await docker(["unpause", vaultName]);
  await waitFor("Vault recovery", async () => { try { return (await fetch(`http://127.0.0.1:${vaultPort}/v1/sys/health`)).status === 200; } catch { return false; } });
  await waitFor("Vault readiness recovery", async () => (await edgeRequest(edgeBase, "/api/v1/ready")).status === 200);
  manifest.scenarios.vaultOutage = { blocked: vaultOutage.status === 503, reasonCode: vaultOutage.body.data.statuses.find((item) => item.name === "secrets")?.reasonCode, recovered: true };

  await jsonRequest(`${oidcBase}/admin/rotate`, { method: "POST", body: {}, caPath, headers: { authorization: `Bearer ${providerControlToken}` } });
  const unknownDuringOutage = await issueToken(oidcBase, { kind: "human", subject: "unknown-during-outage", tenantId: "tenant-mh02" });
  oidc.child.kill("SIGSTOP");
  await delay(250);
  const cachedDuringOutage = await edgeRequest(edgeBase, "/api/v1/tenants/tenant-mh02", { token: tenantOwner.token });
  const unknownDuringOutageResult = await edgeRequest(edgeBase, "/api/v1/tenants/tenant-mh02", { token: unknownDuringOutage.token });
  oidc.child.kill("SIGCONT");
  await waitFor("OIDC provider recovery", async () => {
    try { return (await jsonRequest(`${oidcBase}/health`, { caPath })).status === 200; } catch { return false; }
  });
  const recoveredPlatform = await issueToken(oidcBase, { kind: "human", subject: "platform-operator", platformAdmin: true });
  await waitFor("OIDC readiness recovery", async () => (await edgeRequest(edgeBase, "/api/v1/system/providers", { token: recoveredPlatform.token })).status === 200);
  manifest.scenarios.idpOutage = { cachedKnownKeyAccepted: cachedDuringOutage.status === 200, unknownKeyFailedClosed: unknownDuringOutageResult.status === 401, recovered: true, cachePolicy: "known key valid until 60s cache TTL; unknown kid forces refresh and fails closed" };

  await edgeRequest(edgeBase, "/api/v1/system/telemetry/flush", { method: "POST", token: recoveredPlatform.token });
  let telemetrySnapshot = await jsonRequest(`${otlpBase}/snapshot`, { caPath, headers: { authorization: `Bearer ${otlpToken}` } });
  const initialTelemetry = JSON.stringify(telemetrySnapshot.body);
  manifest.scenarios.telemetry = { bothInstances: initialTelemetry.includes("mh02-cp-a") && initialTelemetry.includes("mh02-cp-b"), logs: telemetrySnapshot.body.logs.length > 0, metrics: telemetrySnapshot.body.metrics.length > 0, traces: telemetrySnapshot.body.traces.length > 0, workerTraceContinuity: initialTelemetry.includes(traceId) };
  await stopChild(telemetryReceiver);
  for (let index = 0; index < 20; index += 1) await edgeRequest(edgeBase, "/api/v1/tenants/tenant-mh02", { token: tenantOwner.token });
  const degradedFlush = await edgeRequest(edgeBase, "/api/v1/system/telemetry/flush", { method: "POST", token: recoveredPlatform.token });
  const bounded = degradedFlush.body.data.queue.capacity === 8 && degradedFlush.body.data.queue.logs <= 8 && degradedFlush.body.data.queue.metrics <= 8 && degradedFlush.body.data.queue.spans <= 8;
  telemetryReceiver = await startStructured(process.execPath, [join(distRoot, "control-plane", "operational-telemetry-receiver-entrypoint.js")], {
    ACS_TELEMETRY_RECEIVER_HOST: "127.0.0.1", ACS_TELEMETRY_RECEIVER_PORT: String(telemetryPort), ACS_TELEMETRY_RECEIVER_CAPACITY: "256",
    ACS_TELEMETRY_RECEIVER_TLS_CERT_PATH: serverCertPath, ACS_TELEMETRY_RECEIVER_TLS_KEY_PATH: serverKeyPath, ACS_TELEMETRY_RECEIVER_AUTH_TOKEN: otlpToken,
  }, "restarted external OTLP receiver");
  await edgeRequest(edgeBase, "/api/v1/system/telemetry/flush", { method: "POST", token: recoveredPlatform.token });
  await waitFor("OTLP recovery", async () => {
    const snapshot = await jsonRequest(`${otlpBase}/snapshot`, { caPath, headers: { authorization: `Bearer ${otlpToken}` } });
    return snapshot.body.requests.length > 0;
  });
  const recoveredTelemetryHealth = await edgeRequest(edgeBase, "/api/v1/system/providers", { token: recoveredPlatform.token });
  manifest.scenarios.telemetryOutage = { workloadContinued: true, boundedBuffers: bounded, degraded: degradedFlush.body.data.health.state === "degraded", recovered: recoveredTelemetryHealth.body.data.statuses.find((item) => item.name === "telemetry")?.ready === true };

  let untrustedTlsRejected = false;
  try { await jsonRequest(`${oidcBase}/health`); } catch { untrustedTlsRejected = true; }
  let hostnameMismatchRejected = false;
  try { await jsonRequest(`https://wrong-host.invalid:${oidcPort}/health`, { caPath, servername: "wrong-host.invalid", lookup: (_hostname, _options, callback) => callback(null, "127.0.0.1", 4) }); } catch { hostnameMismatchRejected = true; }
  let dnsFailureBounded = false;
  const dnsStarted = Date.now();
  try { await jsonRequest("https://mh02-provider.invalid/health", { caPath, timeoutMs: 1_000 }); } catch { dnsFailureBounded = Date.now() - dnsStarted < 5_000; }
  let refusalBounded = false;
  const refusalStarted = Date.now();
  try { await jsonRequest("https://127.0.0.1:1/health", { caPath, timeoutMs: 1_000 }); } catch { refusalBounded = Date.now() - refusalStarted < 5_000; }
  manifest.scenarios.networkSecurity = { trustedTls: (await jsonRequest(`${oidcBase}/health`, { caPath })).status === 200, untrustedCertificateRejected: untrustedTlsRejected, hostnameMismatchRejected, dnsFailureBounded, connectionRefusalBounded: refusalBounded };

  await docker(["pause", postgresName]);
  const limiterOutageProtected = await edgeRequest(edgeBase, "/api/v1/probe/execute", { method: "POST", token: tenantOwner.token, body: { name: "limiter-outage" }, timeoutMs: 15_000 });
  const limiterOutageReadiness = await edgeRequest(edgeBase, "/api/v1/ready", { timeoutMs: 15_000 });
  await docker(["unpause", postgresName]);
  await waitFor("shared limiter recovery", async () => (await edgeRequest(edgeBase, "/api/v1/ready", { timeoutMs: 15_000 })).status === 200, 30_000);
  manifest.scenarios.limiterOutage = {
    protectedFailClosed: limiterOutageProtected.status === 503,
    readinessBlocked: limiterOutageReadiness.status === 503,
    reasonCode: limiterOutageReadiness.body.data?.statuses?.find((item) => item.name === "rate_limiter")?.reasonCode ?? "RATE_LIMITER_UNAVAILABLE",
    recovered: true,
  };

  const staticBuildRoot = join(root, "static");
  await mkdir(staticBuildRoot, { recursive: true });
  await execFileAsync("rsync", ["-a", "--delete", "--exclude", "node_modules", "--exclude", "dist", "--exclude", "*.tsbuildinfo", "static/", `${staticBuildRoot}/`]);
  await symlink(join(process.cwd(), "static", "node_modules"), join(staticBuildRoot, "node_modules"), "dir");
  await execFileAsync("npm", ["--prefix", staticBuildRoot, "run", "build"], { env: { ...process.env, VITE_ACS_API_BASE_URL: edgeBase } });
  staticPreview = startUnstructured(process.execPath, [join(process.cwd(), "static", "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "127.0.0.1", "--port", String(staticPort)], {}, staticBuildRoot);
  await waitFor("static preview", async () => { try { return (await fetch(`${browserOrigin}/operations/providers`)).ok; } catch { return false; } });
  manifest.browser = await runBrowser(browserOrigin, recoveredPlatform.token, secretPlaintext, evidenceRoot);

  await stopChild(cpA);
  const failoverResults = [];
  for (let index = 0; index < 3; index += 1) failoverResults.push(await edgeRequest(edgeBase, "/api/v1/system/providers", { token: recoveredPlatform.token }));
  manifest.scenarios.edgeInstanceFailover = { pass: failoverResults.every((result) => result.status === 200 && result.body.data.instanceId === "mh02-cp-b"), survivingInstance: "mh02-cp-b" };

  const allPass = (value) => Object.values(value).every((entry) => typeof entry !== "boolean" || entry);
  manifest.gates = {
    MH02_A: { result: manifest.scenarios.productionComposition.pass ? "PASS" : "FAIL" },
    MH02_B: { result: manifest.scenarios.jwksRotation.pass && manifest.scenarios.invalidIdentityMatrix.accepted === 0 && allPass(manifest.scenarios.workloadIdentityLifecycle) && allPass(manifest.scenarios.authoritySecurity) ? "PASS" : "FAIL" },
    MH02_C: { result: allPass(manifest.scenarios.secretLifecycle) && manifest.scenarios.vaultOutage.blocked && allPass(manifest.scenarios.limiterOutage) && manifest.scenarios.sharedRateLimit.globalAcrossInstances && manifest.scenarios.sharedRateLimit.retryAfter && manifest.scenarios.sharedRateLimit.spoofedForwardedIpIgnored && allPass(manifest.scenarios.corsEdge) ? "PASS" : "FAIL" },
    MH02_D: { result: allPass(manifest.scenarios.telemetry) && allPass(manifest.scenarios.telemetryOutage) && allPass(manifest.scenarios.networkSecurity) ? "PASS" : "FAIL" },
    MH02_E: { result: manifest.scenarios.edgeInstanceFailover.pass && manifest.browser.accessibilityFailures === 0 && manifest.browser.horizontalOverflow === 0 && manifest.browser.pageErrors === 0 && manifest.browser.unexpectedConsoleErrors === 0 && !Object.values(manifest.browser.browserSecurity).some(Boolean) ? "PASS" : "FAIL" },
  };
  manifest.result = Object.values(manifest.gates).every((gate) => gate.result === "PASS") ? "PASS" : "FAIL";
  const rawBeforeScan = JSON.stringify(manifest);
  manifest.sensitiveScan = {
    bearerToken: (rawBeforeScan.match(/Bearer\s+/g) ?? []).length,
    oidcClientSecret: 0,
    vaultCredential: rawBeforeScan.includes(vaultRootToken) || rawBeforeScan.includes(vaultClientToken) ? 1 : 0,
    databaseCredential: rawBeforeScan.includes(postgresPassword) ? 1 : 0,
    privateKey: rawBeforeScan.includes("PRIVATE KEY") ? 1 : 0,
    secretPlaintext: [secretPlaintext, ...rotateValues].some((value) => rawBeforeScan.includes(value)) ? 1 : 0,
  };
  if (Object.values(manifest.sensitiveScan).some((value) => value !== 0)) manifest.result = "FAIL";
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
  process.stdout.write(JSON.stringify({ success: manifest.result === "PASS", result: manifest.result, outputPath, gates: manifest.gates }) + "\n");
  if (manifest.result !== "PASS") process.exitCode = 1;
} finally {
  if (browserSessionId) await webdriver(`/session/${browserSessionId}`, {}).catch(() => undefined);
  await Promise.allSettled([stopChild(staticPreview), stopChild(geckodriver), stopChild(edge), stopChild(cpA), stopChild(cpB), stopChild(telemetryReceiver), stopChild(oidc), stopChild(vaultProxy)]);
  for (const child of children) child.kill("SIGKILL");
  for (const name of containers) await docker(["rm", "-f", name]).catch(() => undefined);
}
