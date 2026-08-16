const distUrl = process.env.ACS_TEST_DIST_URL;
if (!distUrl) throw new Error("ACS_TEST_DIST_URL is required");
const {
  FetchRemoteWorkerTransport,
  RemoteExecutionWorker,
  createOperationalTelemetryFromEnvironment,
} = await import(distUrl);

const workerId = process.env.ACS_WORKER_ID;
const instanceId = process.env.ACS_WORKER_INSTANCE_ID;
const failureCode = process.env.ACS_WORKER_FAILURE_CODE ?? "INJECTED_RETRYABLE_FAILURE";
const engine = {
  identity: { id: "openclaw", provider: "agentsai" },
  async health() { return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: ["runtime.start"] }; },
  async version() { return { identity: this.identity, sourceRevision: "aees-e-failure-worker", supportedProtocols: ["acs-engine/1"] }; },
  async capabilities() { return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: ["runtime.start"], engineCapabilities: [], deploymentModes: ["sandbox"] }; },
  async listExecutionTargets() { return [await this.inspectExecutionTarget("local-wsl")]; },
  async inspectExecutionTarget(targetId) { return { id: targetId, type: "test-process", environment: "sandbox", engineId: "openclaw", status: "ready", health: { status: "ready", observedAt: Date.now(), checks: [], findings: [] }, capabilities: ["runtime.start"], deploymentModes: ["sandbox"], schedulingEligible: true, schedulingReasons: [], supportedRunners: ["opencode"], supportedProviders: ["axodus-managed"], isolationModes: ["sandbox"] }; },
  async startRuntime() { const error = new Error("Injected retryable worker failure"); error.name = failureCode; throw error; },
  async close() {},
};

const worker = new RemoteExecutionWorker({
  transport: new FetchRemoteWorkerTransport({
    baseUrl: process.env.ACS_CONTROL_PLANE_URL,
    token: process.env.ACS_WORKER_TOKEN,
    requestTimeoutMs: Number(process.env.ACS_WORKER_REQUEST_TIMEOUT_MS ?? 30_000),
  }),
  engine,
  workerId,
  instanceId,
  workerName: workerId,
  workerVersion: "1.0.0-aees-e-failure",
  targetId: "local-wsl",
  heartbeatIntervalMs: 2_000,
  pollIntervalMs: 500,
  leaseRenewIntervalMs: 3_000,
  telemetry: createOperationalTelemetryFromEnvironment({ environment: process.env, serviceName: "acs-failure-worker", instanceId }),
});
await worker.start();
process.stdout.write(JSON.stringify({ success: true, service: "acs-aees-e-failure-worker", workerId, instanceId, processId: process.pid }) + "\n");
const stop = async () => { await worker.stop({ drain: true }); process.exit(0); };
process.once("SIGINT", () => { void stop(); });
process.once("SIGTERM", () => { void stop(); });
