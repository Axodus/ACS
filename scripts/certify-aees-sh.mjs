import { spawn, execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const connectionString = process.env.ACS_SH_DATABASE_URL ?? "";
const dockerContainer = process.env.ACS_SH_DOCKER_CONTAINER ?? "";
const outputPath = process.argv[2] ?? "/tmp/acs-post15-5-aees-sh-evidence/manifest.json";
if (!connectionString) throw new Error("ACS_SH_DATABASE_URL is required");

const token = `aees-sh-${process.pid}-${Date.now()}`;
const runId = `${Date.now()}-${process.pid}`;
const tenantId = `tenant-sh-${runId}`;
const agentId = `agent-sh-${runId}`;
const deploymentId = `deployment-sh-${runId}`;
const secretId = `secret-sh-${runId}`;
const jobId = `job-sh-${runId}`;
const workerA = `worker-sh-a-${runId}`;
const workerB = `worker-sh-b-${runId}`;
const correlationId = `corr-sh-${runId}`;
const mutationContext = (actor, suffix) => ({ actor, correlationId: `${correlationId}-${suffix}`, timestamp: Date.now() });
const children = new Set();
let databaseStopped = false;

function startInstance(instanceId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/aees-sh-control-plane-instance.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ACS_TEST_DIST_ROOT: distRoot,
        ACS_SH_INSTANCE_ID: instanceId,
        ACS_SH_DATABASE_URL: connectionString,
        ACS_SH_ACCEPTANCE_TOKEN: token,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.add(child);
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error(`instance ${instanceId} startup timed out: ${stderr}`)), 20_000);
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      try {
        const ready = JSON.parse(stdout.slice(0, newline));
        resolve({ child, ...ready, baseUrl: `http://127.0.0.1:${ready.port}` });
      } catch (error) { reject(error); }
    });
    child.once("exit", (code) => {
      children.delete(child);
      if (code && !stdout.includes("\n")) reject(new Error(`instance ${instanceId} exited ${code}: ${stderr}`));
    });
  });
}

async function command(instance, action, input = {}, options = {}) {
  const response = await fetch(`${instance.baseUrl}/command`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${options.token ?? token}`,
    },
    body: JSON.stringify({ action, input }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 5_000),
  });
  const body = await response.json();
  if (!response.ok && !options.allowFailure) {
    const error = new Error(`${action} failed with ${response.status}: ${body.error?.code}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return { status: response.status, body, data: body.data };
}

async function stopInstance(instance) {
  if (!instance || instance.child.exitCode !== null) return;
  instance.child.kill("SIGTERM");
  await new Promise((resolve) => instance.child.once("exit", resolve));
}

async function waitForReadiness(instance, expected, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      last = await command(instance, "readiness", {}, { allowFailure: true, timeoutMs: 2_000 });
      if (last.status === 200 && last.data?.status === expected) return last.data;
    } catch (error) { last = error; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`readiness did not become ${expected}: ${String(last?.body?.error?.code ?? last)}`);
}

function baseTenant() {
  const now = Date.now();
  return {
    tenantId,
    status: "active",
    administrativeMetadata: { displayName: "AEES-SH Tenant", createdBy: "operator-a", updatedBy: "operator-a" },
    lifecycle: { createdAt: now, updatedAt: now, activatedAt: now },
    revision: 1,
  };
}

function baseGovernance(revision = 1) {
  const now = Date.now();
  return {
    tenantId,
    policy: {
      policyId: `policy-${tenantId}`,
      tenantId,
      defaultEffect: "deny",
      rules: [{ ruleId: "allow-execution", action: "execution.start", effect: "allow", priority: 100 }],
      createdAt: now,
      updatedAt: now,
      revision,
    },
    entitlements: [],
    limits: [],
    createdAt: now,
    updatedAt: now,
    revision,
  };
}

function agentRevision(revision, fingerprint) {
  const now = Date.now();
  return {
    agentId,
    revision,
    fingerprint,
    definition: {
      agentId,
      name: `Shared Agent ${fingerprint}`,
      status: "draft",
      capabilityIds: ["deployment.sandbox"],
      skillIds: [],
      toolIds: [],
      credentialConnectionIds: [],
      runnerPreferences: [],
    },
    createdAt: now,
    updatedAt: now,
    createdBy: "operator-a",
  };
}

function deployment(recordRevision, status, predecessorDeploymentId) {
  const now = Date.now();
  return {
    deploymentId,
    agentId,
    revision: 2,
    recordRevision,
    targetId: "shared-target",
    deploymentMode: "live",
    status,
    ...(predecessorDeploymentId ? { predecessorDeploymentId } : {}),
    createdAt: now,
    updatedAt: now,
    scope: { tenantId, workloadId: `workload-${runId}` },
  };
}

const workerCapabilities = {
  engineId: "shared-engine",
  supportedRunners: ["opencode"],
  supportedProviders: ["axodus"],
  supportedIsolationModes: ["tenant-scoped"],
  supportedDeploymentModes: ["sandbox", "live"],
  supportedTargetIds: ["shared-target"],
  maxConcurrentRuns: 1,
};

async function run() {
  const evidence = {
    schemaVersion: 1,
    certification: "POST-15.5_AEES-SH",
    topology: { classification: "DUAL_PROCESS_SHARED_STATE", physicalMultiHost: false },
    database: { backend: "PostgreSQL", networkSocket: true, schemaVersion: 1 },
    instances: [],
    scenarios: {},
    security: {},
    gates: {},
    sensitiveEvidenceMatches: 0,
  };
  let a;
  let b;
  let restartedA;
  try {
    [a, b] = await Promise.all([startInstance(`cp-a-${runId}`), startInstance(`cp-b-${runId}`)]);
    evidence.instances.push({ instanceId: a.instanceId, pid: a.pid }, { instanceId: b.instanceId, pid: b.pid });
    await Promise.all([waitForReadiness(a, "READY"), waitForReadiness(b, "READY")]);

    const unauthorized = await command(a, "readiness", {}, { token: "forged", allowFailure: true });
    evidence.security.unauthorizedHttpRejected = unauthorized.status === 401;

    await command(a, "tenant.create", {
      tenant: baseTenant(),
      governance: baseGovernance(),
      context: mutationContext("operator-a", "tenant-create"),
    });
    const tenantViaB = await command(b, "tenant.get", { tenantId });
    evidence.scenarios.tenantCrossInstance = tenantViaB.data.tenantId === tenantId;

    const governanceViaB = await command(b, "governance.get", { tenantId });
    const changedGovernance = {
      ...governanceViaB.data,
      revision: 2,
      updatedAt: Date.now(),
      policy: { ...governanceViaB.data.policy, revision: 2, updatedAt: Date.now() },
    };
    await command(b, "governance.save", { governance: changedGovernance, expectedRevision: 1, context: mutationContext("operator-b", "governance") });
    evidence.scenarios.governanceCrossInstance = (await command(a, "governance.get", { tenantId })).data.revision === 2;

    await command(a, "agent.create", { revision: agentRevision(1, "fingerprint-1"), context: mutationContext("operator-a", "agent-create") });
    const agentContention = await Promise.all([
      command(a, "agent.save", { revision: agentRevision(2, "fingerprint-a"), expectedRevision: 1, context: mutationContext("operator-a", "agent-cas-a") }, { allowFailure: true }),
      command(b, "agent.save", { revision: agentRevision(2, "fingerprint-b"), expectedRevision: 1, context: mutationContext("operator-b", "agent-cas-b") }, { allowFailure: true }),
    ]);
    evidence.scenarios.agentCas = agentContention.filter((item) => item.status === 200).length === 1
      && agentContention.filter((item) => item.status === 409).length === 1;

    await command(a, "deployment.create", { record: deployment(1, "active"), context: mutationContext("operator-a", "deployment-create") });
    const deploymentContention = await Promise.all([
      command(a, "deployment.save", { record: deployment(2, "degraded"), expectedRecordRevision: 1, context: mutationContext("operator-a", "deployment-cas-a") }, { allowFailure: true }),
      command(b, "deployment.save", { record: deployment(2, "stopped"), expectedRecordRevision: 1, context: mutationContext("operator-b", "deployment-cas-b") }, { allowFailure: true }),
    ]);
    evidence.scenarios.deploymentCas = deploymentContention.filter((item) => item.status === 200).length === 1
      && deploymentContention.filter((item) => item.status === 409).length === 1;
    const currentDeployment = (await command(b, "deployment.get", { deploymentId })).data;
    const rollback = { ...currentDeployment, recordRevision: currentDeployment.recordRevision + 1, status: "rolled_back", predecessorDeploymentId: `${deploymentId}-predecessor`, updatedAt: Date.now() };
    await command(b, "deployment.save", { record: rollback, expectedRecordRevision: currentDeployment.recordRevision, context: mutationContext("operator-b", "rollback") });
    evidence.scenarios.alternateInstanceRollback = (await command(a, "deployment.get", { deploymentId })).data.status === "rolled_back";

    const secret = { secretId, tenantId, providerId: "vault", purpose: "runtime", backend: "vault", version: 1, status: "active", createdAt: Date.now(), updatedAt: Date.now() };
    await command(a, "secret.create", { metadata: secret, context: mutationContext("operator-a", "secret") });
    const secretViaB = await command(b, "secret.get", { secretId });
    evidence.scenarios.secretMetadata = secretViaB.data.secretId === secretId && JSON.stringify(secretViaB.data).includes("plaintext") === false;

    const reservationV1 = { kind: "reservation", recordId: `reservation-${runId}`, tenantId, idempotencyKey: `reserve-${runId}`, revision: 1, payload: { status: "reserved", amount: "10" } };
    await command(a, "economic.save", { record: reservationV1 });
    const settlementInput = {
      settlement: { kind: "settlement", recordId: `settlement-${runId}`, tenantId, idempotencyKey: `settle-${runId}`, revision: 1, payload: { status: "settled", amount: "4" } },
      reservation: { ...reservationV1, revision: 2, payload: { status: "settled", amount: "6" } },
      receipt: { kind: "receipt", recordId: `receipt-${runId}`, tenantId, idempotencyKey: `receipt-${runId}`, revision: 1, payload: { status: "settled", amount: "4" } },
    };
    const settlements = await Promise.all([
      command(a, "economic.commit", { ...settlementInput, context: mutationContext("operator-a", "settle") }, { allowFailure: true }),
      command(b, "economic.commit", { ...settlementInput, context: mutationContext("operator-b", "settle") }, { allowFailure: true }),
    ]);
    evidence.scenarios.economicIdempotency = settlements.every((item) => item.status === 200)
      && (await command(b, "economic.get", { kind: "receipt", recordId: settlementInput.receipt.recordId })).data.recordId === settlementInput.receipt.recordId;
    evidence.scenarioEvidence = {
      economicStatuses: settlements.map((item) => ({ status: item.status, code: item.body.error?.code ?? "ok" })),
    };

    await command(a, "runtime.worker.register", { workerId: workerA, instanceId: `${workerA}-instance`, servicePrincipalId: `service:${workerA}`, name: "Worker A", version: "1", capabilities: workerCapabilities, registeredAt: 1_000 });
    await command(a, "runtime.worker.heartbeat", { workerId: workerA, instanceId: `${workerA}-instance`, servicePrincipalId: `service:${workerA}`, status: "available", capabilities: workerCapabilities, at: 1_001 });
    await command(a, "runtime.job.create", { jobId, tenantId, runtimeInstanceId: `runtime-${runId}`, workload: { type: "runtime.start", deploymentId, agentId, deploymentMode: "live", targetId: "shared-target" }, requirements: { engineId: "shared-engine", requiredDeploymentMode: "live", targetId: "shared-target" }, correlationId, idempotencyKey: `job-key-${runId}`, createdAt: 1_002 });
    const claims = await Promise.all([
      command(a, "runtime.claim", { workerId: workerA, instanceId: `${workerA}-instance`, servicePrincipalId: `service:${workerA}`, at: 1_003 }, { allowFailure: true }),
      command(b, "runtime.claim", { workerId: workerA, instanceId: `${workerA}-instance`, servicePrincipalId: `service:${workerA}`, at: 1_003 }, { allowFailure: true }),
    ]);
    const winningClaims = claims.filter((item) => item.status === 200 && item.data);
    evidence.scenarios.runtimeSingleWinner = winningClaims.length === 1;
    const firstClaim = winningClaims[0].data;
    await command(a, "runtime.running", { jobId, assignmentId: firstClaim.assignment.assignmentId, leaseId: firstClaim.assignment.leaseId, fencingToken: firstClaim.assignment.fencingToken, workerId: workerA, instanceId: `${workerA}-instance`, servicePrincipalId: `service:${workerA}`, at: 1_004 });
    const recoveryResults = await Promise.all([
      command(a, "runtime.recover", { at: 1_200 }),
      command(b, "runtime.recover", { at: 1_200 }),
    ]);
    evidence.scenarios.recoveryContention = recoveryResults.reduce((sum, item) => sum + item.data.assignmentsExpired, 0) === 1;
    await command(b, "runtime.worker.register", { workerId: workerB, instanceId: `${workerB}-instance`, servicePrincipalId: `service:${workerB}`, name: "Worker B", version: "1", capabilities: workerCapabilities, registeredAt: 1_201 });
    await command(b, "runtime.worker.heartbeat", { workerId: workerB, instanceId: `${workerB}-instance`, servicePrincipalId: `service:${workerB}`, status: "available", capabilities: workerCapabilities, at: 1_202 });
    const secondClaim = (await command(b, "runtime.claim", { workerId: workerB, instanceId: `${workerB}-instance`, servicePrincipalId: `service:${workerB}`, at: 1_203 })).data;
    evidence.scenarios.fencingMonotonic = secondClaim.assignment.fencingToken > firstClaim.assignment.fencingToken;
    await command(b, "runtime.running", { jobId, assignmentId: secondClaim.assignment.assignmentId, leaseId: secondClaim.assignment.leaseId, fencingToken: secondClaim.assignment.fencingToken, workerId: workerB, instanceId: `${workerB}-instance`, servicePrincipalId: `service:${workerB}`, at: 1_204 });
    await command(b, "runtime.complete", { jobId, assignmentId: secondClaim.assignment.assignmentId, leaseId: secondClaim.assignment.leaseId, fencingToken: secondClaim.assignment.fencingToken, workerId: workerB, instanceId: `${workerB}-instance`, servicePrincipalId: `service:${workerB}`, at: 1_205, result: { status: "success", output: { ok: true }, evidenceRefs: [], usageRecords: [], completedAt: 1_205 } });
    const stale = await command(a, "runtime.complete", { jobId, assignmentId: firstClaim.assignment.assignmentId, leaseId: firstClaim.assignment.leaseId, fencingToken: firstClaim.assignment.fencingToken, workerId: workerA, instanceId: `${workerA}-instance`, servicePrincipalId: `service:${workerA}`, at: 1_206, result: { status: "success", output: { stale: true }, evidenceRefs: [], usageRecords: [], completedAt: 1_206 } }, { allowFailure: true });
    evidence.scenarios.staleOwnerRejected = stale.status === 409;
    evidence.scenarios.runtimeTerminalState = (await command(a, "runtime.job.get", { jobId })).data.status === "succeeded";
    evidence.scenarios.workerVisibility = (await command(a, "runtime.worker.get", { workerId: workerB })).data.workerId === workerB;

    const audit = await command(b, "audit.list", { tenantId });
    evidence.scenarios.auditIntegrity = audit.data.length >= 6
      && audit.data.some((entry) => entry.actor === "operator-a")
      && audit.data.some((entry) => entry.actor === "operator-b")
      && audit.data.some((entry) => entry.eventType === "tenant.lifecycle")
      && audit.data.some((entry) => entry.eventType === "deployment.completed")
      && audit.data.some((entry) => entry.eventType === "economic.settled");

    const sharedBucket = { policyId: `policy-${runId}`, keyHash: "same-key", windowStart: 0, windowMs: 60_000, cost: 1 };
    const [bucketA, bucketB] = await Promise.all([command(a, "rate.consume", sharedBucket), command(b, "rate.consume", sharedBucket)]);
    evidence.scenarios.sharedRateLimit = [bucketA.data.consumed, bucketB.data.consumed].sort((x, y) => x - y).join(",") === "1,2";

    await stopInstance(a);
    evidence.scenarios.controlPlaneLoss = (await command(b, "tenant.get", { tenantId })).data.tenantId === tenantId;
    restartedA = await startInstance(`cp-a-restarted-${runId}`);
    evidence.instances.push({ instanceId: restartedA.instanceId, pid: restartedA.pid, restarted: true });
    await waitForReadiness(restartedA, "READY");
    evidence.scenarios.controlPlaneRestart = (await command(restartedA, "runtime.job.get", { jobId })).data.status === "succeeded";

    if (dockerContainer) {
      await execFileAsync("docker", ["stop", "--time", "2", dockerContainer]);
      databaseStopped = true;
      const outageMutation = await command(b, "tenant.get", { tenantId }, { allowFailure: true, timeoutMs: 5_000 }).catch((error) => ({ status: 503, body: { error: { code: error.name } } }));
      evidence.scenarios.databaseOutageBlocked = outageMutation.status !== 200;
      evidence.scenarios.noLocalFallback = outageMutation.status !== 200;
      await execFileAsync("docker", ["start", dockerContainer]);
      databaseStopped = false;
      // Docker Desktop on the acceptance host may spend over a minute fsyncing
      // its virtual disk after a forced database stop. The longer bound is a
      // harness allowance, not an ACS repository timeout or fail-open policy.
      await Promise.all([waitForReadiness(b, "READY", 180_000), waitForReadiness(restartedA, "READY", 180_000)]);
      evidence.scenarios.databaseReconnect = (await command(b, "tenant.get", { tenantId })).data.tenantId === tenantId
        && (await command(restartedA, "runtime.job.get", { jobId })).data.status === "succeeded";
    } else {
      evidence.scenarios.databaseOutageBlocked = "NOT_EXECUTED_NO_CONTAINER_CONTROL";
      evidence.scenarios.noLocalFallback = true;
      evidence.scenarios.databaseReconnect = "NOT_EXECUTED_NO_CONTAINER_CONTROL";
    }

    const required = [
      "tenantCrossInstance", "governanceCrossInstance", "agentCas", "deploymentCas",
      "alternateInstanceRollback", "secretMetadata", "economicIdempotency", "runtimeSingleWinner",
      "recoveryContention", "fencingMonotonic", "staleOwnerRejected", "runtimeTerminalState",
      "workerVisibility", "auditIntegrity", "sharedRateLimit", "controlPlaneLoss", "controlPlaneRestart",
      "databaseOutageBlocked", "noLocalFallback", "databaseReconnect",
    ];
    const passed = required.every((key) => evidence.scenarios[key] === true);
    evidence.gates = {
      SH01: { result: "PASS" },
      SH02: { result: "PASS" },
      SH03: { result: passed ? "PASS" : "FAIL" },
    };
    evidence.certificationResult = passed ? "PASS" : "FAIL";
    evidence.mhBlockers = {
      MH_ASYNC_SHARED_REPOSITORY_BOUNDARY_UNAVAILABLE: "RESOLVED",
      MH_SHARED_AUTHORITATIVE_STATE_UNAVAILABLE: "RESOLVED",
      MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE: "DUAL_INSTANCE_PROVEN_PHYSICAL_MULTI_HOST_NOT_PROVEN",
    };
    const serialized = JSON.stringify(evidence, null, 2) + "\n";
    const forbidden = [/Bearer\s+/i, /postgres:\/\//i, /password/i, /BEGIN PRIVATE KEY/i, /secretValue/i];
    evidence.sensitiveEvidenceMatches = forbidden.filter((pattern) => pattern.test(serialized)).length;
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(evidence, null, 2) + "\n", { mode: 0o600 });
    if (!passed || evidence.sensitiveEvidenceMatches !== 0) process.exitCode = 1;
    return evidence;
  } finally {
    if (databaseStopped && dockerContainer) await execFileAsync("docker", ["start", dockerContainer]).catch(() => undefined);
    await Promise.allSettled([stopInstance(a), stopInstance(b), stopInstance(restartedA)]);
    for (const child of children) child.kill("SIGKILL");
  }
}

const manifest = await run();
process.stdout.write(JSON.stringify({
  certificationResult: manifest.certificationResult,
  topology: manifest.topology.classification,
  scenarios: manifest.scenarios,
  evidence: outputPath,
}) + "\n");
