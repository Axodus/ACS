import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:https";

const host = process.env.ACS_MH02_OIDC_HOST ?? "127.0.0.1";
const port = Number(process.env.ACS_MH02_OIDC_PORT ?? 0);
const certificatePath = process.env.ACS_MH02_TLS_CERT_PATH ?? "";
const keyPath = process.env.ACS_MH02_TLS_KEY_PATH ?? "";
const controlToken = process.env.ACS_MH02_PROVIDER_CONTROL_TOKEN ?? "";
const introspectionToken = process.env.ACS_MH02_WORKLOAD_INTROSPECTION_TOKEN ?? "";
const humanAudience = process.env.ACS_MH02_OIDC_AUDIENCE ?? "acs-control-plane";
const workerAudience = process.env.ACS_MH02_WORKER_AUDIENCE ?? "acs-runtime-worker";
if (!certificatePath || !keyPath || !controlToken || !introspectionToken || !Number.isSafeInteger(port) || port <= 0) {
  throw new Error("external OIDC acceptance provider configuration is incomplete");
}
const issuer = process.env.ACS_MH02_OIDC_ISSUER ?? `https://localhost:${port}`;
const revoked = new Set();
let signingKeys = [createSigningKey()];

function createSigningKey() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const kid = `mh02-${randomUUID()}`;
  return {
    kid,
    privateKey,
    jwk: { ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" },
  };
}

function encode(value) { return Buffer.from(JSON.stringify(value), "utf8").toString("base64url"); }
function issue(input) {
  const signingKey = signingKeys[0];
  const now = Math.floor(Date.now() / 1000);
  const worker = input.kind === "worker";
  const jti = input.jti ?? randomUUID();
  const claims = {
    iss: input.issuer ?? issuer,
    aud: input.audience ?? (worker ? workerAudience : humanAudience),
    sub: input.subject,
    iat: now,
    nbf: now + Number(input.notBeforeOffsetSeconds ?? 0),
    exp: now + Number(input.expiresInSeconds ?? 300),
    jti,
    ...(worker ? {
      instance_id: input.instanceId,
      capabilities: input.capabilities ?? [],
    } : {
      ...(input.tenantId ? { tenant_id: input.tenantId } : {}),
      scope: input.scope ?? "acs.read acs.write",
      ...(input.platformAdmin ? { platform_role: "platform_admin" } : {}),
    }),
  };
  const encodedHeader = encode({ alg: input.algorithm ?? "RS256", typ: "JWT", kid: signingKey.kid });
  const encodedClaims = encode(claims);
  const signature = sign("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedClaims}`, "ascii"), signingKey.privateKey).toString("base64url");
  return { token: `${encodedHeader}.${encodedClaims}.${signature}`, kid: signingKey.kid, jti, expiresAt: claims.exp * 1000 };
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 128 * 1024) throw new Error("provider request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

const server = createServer({ cert: readFileSync(certificatePath), key: readFileSync(keyPath) }, async (request, response) => {
  const url = new URL(request.url ?? "/", issuer);
  if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { status: "ready", issuer, pid: process.pid });
  if (request.method === "GET" && url.pathname === "/.well-known/jwks.json") return json(response, 200, { keys: signingKeys.map((key) => key.jwk) });
  if (request.method === "GET" && url.pathname.startsWith("/introspect/revocations/")) {
    if (request.headers.authorization !== `Bearer ${introspectionToken}`) return json(response, 401, { error: "unauthorized" });
    const jti = decodeURIComponent(url.pathname.slice("/introspect/revocations/".length));
    return json(response, 200, { revoked: revoked.has(jti) });
  }
  if (request.headers.authorization !== `Bearer ${controlToken}`) return json(response, 401, { error: "unauthorized" });
  if (request.method === "POST" && url.pathname === "/admin/issue") {
    const body = await readJson(request);
    if (typeof body.subject !== "string" || !body.subject) return json(response, 400, { error: "subject_required" });
    if (body.kind === "worker" && (typeof body.instanceId !== "string" || !body.instanceId)) return json(response, 400, { error: "instance_required" });
    return json(response, 200, issue(body));
  }
  if (request.method === "POST" && url.pathname === "/admin/rotate") {
    signingKeys = [createSigningKey(), ...signingKeys].slice(0, 3);
    return json(response, 200, { kid: signingKeys[0].kid, retainedKeys: signingKeys.length, rotatedAt: Date.now() });
  }
  if (request.method === "POST" && url.pathname === "/admin/revoke") {
    const body = await readJson(request);
    if (typeof body.jti !== "string" || !body.jti) return json(response, 400, { error: "jti_required" });
    revoked.add(body.jti);
    return json(response, 200, { revoked: true });
  }
  return json(response, 404, { error: "not_found" });
});

await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(port, host, resolveListen); });
process.stdout.write(JSON.stringify({ ready: true, service: "external-oidc-provider", pid: process.pid, host, port, issuer, jwksUri: `${issuer}/.well-known/jwks.json` }) + "\n");

async function shutdown() { await new Promise((resolveClose) => server.close(resolveClose)); process.exit(0); }
process.once("SIGTERM", () => { void shutdown(); });
process.once("SIGINT", () => { void shutdown(); });
