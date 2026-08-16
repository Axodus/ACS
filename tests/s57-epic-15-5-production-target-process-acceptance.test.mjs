import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const distRoot = process.env.ACS_TEST_DIST_ROOT ?? "../dist";
const { HttpProductionTargetEngine } = await import(`${distRoot}/engines/http-production-target-engine.js`);
const entrypoint = `${distRoot}/engines/production-target-server.js`;

async function startTarget(root, token) {
  const child = spawn(process.execPath, [entrypoint], {
    env: { ...process.env, ACS_PRODUCTION_TARGET_HOST: "127.0.0.1", ACS_PRODUCTION_TARGET_PORT: "0", ACS_PRODUCTION_TARGET_TOKEN: token, ACS_PRODUCTION_TARGET_DATABASE_PATH: join(root, "target.sqlite") },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`target start timeout: ${stderr}`)), 30_000);
    const inspect = () => {
      for (const line of stdout.split(/\r?\n/)) {
        try {
          const value = JSON.parse(line);
          if (value.service === "acs-production-target" && value.success) {
            clearTimeout(timer);
            resolve(value);
            return;
          }
        } catch { /* partial output */ }
      }
    };
    child.stdout.on("data", inspect);
    child.once("exit", code => reject(new Error(`target exited ${code}: ${stderr}`)));
  });
  return { child, ready, stop: async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
    await new Promise(resolve => child.once("exit", resolve));
  } };
}

test("production target deploy, health inspection and rollback cross an independent process boundary", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-g03-target-process-"));
  const token = "g03-independent-target-token";
  const target = await startTarget(root, token);
  try {
    assert.notEqual(target.ready.processId, process.pid);
    const engine = new HttpProductionTargetEngine({ baseUrl: `http://127.0.0.1:${target.ready.address.port}`, token });
    const composition = { profile: "production", credentialReferenceIds: ["credential-ref-v1"] };
    const first = await engine.deployAgent({ deploymentId: "deployment-process-a", agentId: "agent-process", revision: 1, composition, deploymentMode: "live", targetId: "production-single-host" });
    assert.equal(first.status, "active");
    assert.equal((await engine.inspectDeployment(first.deploymentId)).health, "ready");
    const second = await engine.deployAgent({ deploymentId: "deployment-process-b", agentId: "agent-process", revision: 2, composition, deploymentMode: "live", targetId: "production-single-host" });
    const runtime = await engine.startRuntime({ deploymentId: second.deploymentId, agentId: "agent-process", deploymentMode: "live", targetId: "production-single-host" });
    assert.equal(runtime.status, "running");
    assert.equal((await engine.inspectRuntime(runtime.runtimeInstanceId)).deploymentId, second.deploymentId);
    assert.equal((await engine.stopRuntime(runtime.runtimeInstanceId)).status, "stopped");
    const rollback = await engine.rollbackDeployment({ deploymentId: second.deploymentId, targetId: "production-single-host", predecessorDeploymentId: first.deploymentId });
    assert.equal(rollback.deploymentId, first.deploymentId);
    assert.equal(rollback.status, "active");
    assert.equal((await engine.inspectDeployment(second.deploymentId)).status, "stopped");
    assert.equal(JSON.stringify({ first, second, rollback }).includes(token), false);
  } finally {
    await target.stop();
    await rm(root, { recursive: true, force: true });
  }
});
