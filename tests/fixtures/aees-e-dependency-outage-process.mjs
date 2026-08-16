import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const distUrl = process.env.ACS_TEST_DIST_URL;
if (!distUrl) throw new Error("ACS_TEST_DIST_URL is required");
const { createAcsHttpServer } = await import(distUrl);

const root = process.env.ACS_RUNTIME_ROOT;
if (!root) throw new Error("ACS_RUNTIME_ROOT is required");

function createEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() { return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] }; },
    async version() { return { identity: this.identity, sourceRevision: "aees-e-outage", supportedProtocols: ["acs-engine/1"] }; },
    async capabilities() { return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: [], engineCapabilities: [], deploymentModes: ["sandbox"] }; },
    async listExecutionTargets() { return [await this.inspectExecutionTarget("local-wsl")]; },
    async inspectExecutionTarget(targetId) { return { id: targetId, type: "local-wsl", environment: "sandbox", engineId: "openclaw", status: "ready", health: { status: "ready", observedAt: Date.now(), checks: [], findings: [] }, capabilities: [], deploymentModes: ["sandbox"], schedulingEligible: true, schedulingReasons: [], supportedRunners: ["opencode"], supportedProviders: ["axodus-managed"], isolationModes: ["sandbox"] }; },
    async close() {},
  };
}

const unavailableSecretStore = {
  descriptor: { provider: "vault-kv-v2", productionOriented: true, materialStorage: "external_managed", metadataDurability: "single_node_durable", multiInstance: "external_provider_managed" },
  async health() { return { reachable: false, provider: "vault-kv-v2" }; },
  async put() { throw new Error("unavailable"); },
  async get() { throw new Error("unavailable"); },
  async describe() { throw new Error("unavailable"); },
  async rotate() { throw new Error("unavailable"); },
  async revoke() { throw new Error("unavailable"); },
  async delete() { throw new Error("unavailable"); },
  async exists() { return false; },
};

const unavailableRateLimiter = {
  descriptor: { adapter: "failure-injection-shared-rate-limit", productionOriented: true, durability: "single_node_durable", multiInstance: "shared_database" },
  async consume(input) {
    return { allowed: true, limit: input.policy.limit, remaining: input.policy.limit - 1, resetAt: new Date(Date.now() + 60_000).toISOString(), policy: input.policy.policyId, keyScope: input.policy.keyScope };
  },
  async health() { return { configured: true, reachable: false, productionGrade: true, adapter: "failure-injection-shared-rate-limit" }; },
};

await Promise.all([
  root,
  join(root, "state"),
  join(root, "config"),
  join(root, "artifacts"),
  join(root, "workspace"),
].map((path) => mkdir(path, { recursive: true })));
await writeFile(join(root, "config", "openclaw.json"), "{}\n", "utf8");

const runtime = await createAcsHttpServer({
  engine: createEngine(),
  startLocalWorker: false,
  runtimeMode: "remote",
  runtimeStatePath: join(root, "runtime.sqlite"),
  runtimeRoot: root,
  stateRoot: join(root, "state"),
  configRoot: join(root, "config"),
  artifactsRoot: join(root, "artifacts"),
  workspaceRoot: join(root, "workspace"),
  administrativeStatePath: join(root, "admin.json"),
  economicStatePath: join(root, "economic.sqlite"),
  secretStore: unavailableSecretStore,
  rateLimiter: unavailableRateLimiter,
});

const host = process.env.ACS_HTTP_HOST ?? "127.0.0.1";
const port = Number(process.env.ACS_HTTP_PORT ?? "0");
await new Promise((resolveListen, reject) => {
  runtime.server.once("error", reject);
  runtime.server.listen(port, host, resolveListen);
});
const address = runtime.server.address();
if (!address || typeof address === "string") throw new Error("dependency outage process did not bind a TCP address");
process.stdout.write(JSON.stringify({ success: true, service: "acs-aees-e-dependency-outage", host, port: address.port, processId: process.pid }) + "\n");
