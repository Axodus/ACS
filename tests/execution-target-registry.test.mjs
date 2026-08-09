import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  EngineError,
  EngineRegistry,
  ExecutionTargetRegistry,
  ExecutionTargetRegistryNotFoundError,
  ExecutionTargetService,
  createOpenClawEngineFromManifest,
} from "../dist/index.js";

class FakeEngine {
  identity;
  targets;
  failure;

  constructor(identity, targets, failure = null) {
    this.identity = identity;
    this.targets = targets;
    this.failure = failure;
  }

  async health() {
    return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] };
  }

  async version() {
    return { identity: this.identity, supportedProtocols: ["acs-engine/1"] };
  }

  async capabilities() {
    return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: [], engineCapabilities: [], deploymentModes: [] };
  }

  async listExecutionTargets() {
    if (this.failure) throw this.failure;
    return this.targets;
  }

  async inspectExecutionTarget(targetId) {
    const match = this.targets.find((target) => target.id === targetId);
    if (!match) throw new Error("missing target");
    return match;
  }

  async close() {}
}

function target(overrides = {}) {
  return {
    id: "local-wsl",
    type: "local",
    environment: "dev-local",
    engineId: "openclaw",
    status: "ready",
    health: { status: "ready", observedAt: 1, checks: [], findings: [] },
    capabilities: ["agent.inspect", "deployment.sandbox"],
    deploymentModes: ["sandbox"],
    schedulingEligible: true,
    schedulingReasons: [],
    supportedRunners: [],
    supportedProviders: [],
    isolationModes: ["sandbox"],
    operatorMetadata: { classification: "operator-only", sourceRuntimeOverlap: false },
    ...overrides,
  };
}

test("registry upserts, lists deterministically, and looks up canonical identities", () => {
  const registry = new ExecutionTargetRegistry();
  const first = registry.upsert(target({ id: "b", engineId: "openclaw" }), 10);
  const second = registry.upsert(target({ id: "a", engineId: "openclaw" }), 20);
  assert.equal(first.canonicalId, "openclaw/b");
  assert.equal(second.canonicalId, "openclaw/a");
  assert.deepEqual(registry.list().map((item) => item.canonicalId), ["openclaw/a", "openclaw/b"]);
  assert.equal(registry.get("openclaw/a").lastSeenAt, 20);
  assert.throws(() => registry.get("missing/target"), ExecutionTargetRegistryNotFoundError);
});

test("refresh aggregates multiple engines and isolates engine failures", async () => {
  const engineRegistry = new EngineRegistry();
  engineRegistry.register(new FakeEngine({ id: "alpha", provider: "test" }, [target({ id: "one", engineId: "alpha" })]));
  engineRegistry.register(new FakeEngine({ id: "beta", provider: "test" }, [], new EngineError("engine down", { code: "ENGINE_DOWN" })));

  const registry = new ExecutionTargetRegistry();
  const report = await registry.refreshFromEngines(engineRegistry, 50);

  assert.deepEqual(report.enginesInspected, ["alpha", "beta"]);
  assert.deepEqual(report.targetsDiscovered, ["alpha/one"]);
  assert.equal(report.failures.length, 1);
  assert.equal(report.failures[0].engineId, "beta");
  assert.equal(registry.list().length, 1);
});

test("refresh marks missing targets from a healthy engine as stale instead of deleting them", async () => {
  const registry = new ExecutionTargetRegistry();
  const engine = new FakeEngine({ id: "openclaw", provider: "agentsai" }, [target()]);
  await registry.refreshFromEngine(engine, 10);
  engine.targets = [];
  const report = await registry.refreshFromEngine(engine, 20);
  assert.deepEqual(report.targetsMarkedStale, ["openclaw/local-wsl"]);
  assert.equal(registry.get("openclaw/local-wsl").stale, true);
});

test("eligibility distinguishes health from deployment mode and capability requirements", () => {
  const registry = new ExecutionTargetRegistry();
  registry.upsert(target(), 10);

  const sandbox = registry.evaluateEligibility(registry.get("openclaw/local-wsl"), {
    engineId: "openclaw",
    deploymentMode: "sandbox",
    requiredCapabilities: ["agent.inspect", "deployment.sandbox"],
    targetType: "local",
    environment: "dev-local",
  });
  assert.equal(sandbox.eligible, true);

  const live = registry.evaluateEligibility(registry.get("openclaw/local-wsl"), {
    engineId: "openclaw",
    deploymentMode: "live",
  });
  assert.equal(live.eligible, false);
  assert.equal(live.reasons[0].code, "TARGET_DEPLOYMENT_MODE_UNSUPPORTED");

  const missingCapability = registry.evaluateEligibility(registry.get("openclaw/local-wsl"), {
    requiredCapabilities: ["runtime.execute"],
  });
  assert.equal(missingCapability.eligible, false);

  const unhealthyRegistry = new ExecutionTargetRegistry();
  unhealthyRegistry.upsert(target({ status: "misconfigured" }), 10);
  const unhealthy = unhealthyRegistry.evaluateEligibility(unhealthyRegistry.get("openclaw/local-wsl"), {});
  assert.equal(unhealthy.eligible, false);
  assert.equal(unhealthy.reasons[0].code, "TARGET_STATUS_MISCONFIGURED");
});

test("execution target service refreshes through engine registry and filters eligible targets", async () => {
  const engineRegistry = new EngineRegistry();
  engineRegistry.register(new FakeEngine({ id: "openclaw", provider: "agentsai" }, [target()]));
  const service = new ExecutionTargetService(engineRegistry);
  await service.refresh();
  assert.deepEqual(service.list().map((item) => item.canonicalId), ["openclaw/local-wsl"]);
  assert.deepEqual(service.findEligible({ deploymentMode: "sandbox" }).map((item) => item.canonicalId), ["openclaw/local-wsl"]);
  assert.deepEqual(service.findEligible({ deploymentMode: "live" }), []);
});

test("real OpenClaw adapter refreshes local-wsl and evaluates sandbox vs live eligibility", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-target-registry-"));
  const runtimeRoot = join(workspace, "runtime");
  const stateRoot = join(runtimeRoot, ".acs", "state");
  const configRoot = runtimeRoot;
  const artifactsRoot = join(stateRoot, "artifacts");
  const workspaceRoot = join(runtimeRoot, ".acs", "workspaces");
  mkdirSync(runtimeRoot, { recursive: true });
  writeFileSync(join(configRoot, "openclaw.json"), "{}\n", "utf8");

  const engine = createOpenClawEngineFromManifest({
    acsRoot: "/opt/Axodus/ACS",
    runtimeRoot,
    stateRoot,
    configRoot,
    artifactsRoot,
    workspaceRoot,
    timeoutMs: 10000,
  });

  try {
    const engineRegistry = new EngineRegistry();
    engineRegistry.register(engine);
    const service = new ExecutionTargetService(engineRegistry);
    const report = await service.refresh();
    assert.equal(report.failures.length, 0);
    const targetInfo = service.get("openclaw/local-wsl");
    assert.equal(targetInfo.id, "local-wsl");
    assert.equal(targetInfo.operatorMetadata?.sourceRuntimeOverlap, false);

    const sandbox = service.evaluateEligibility("openclaw/local-wsl", {
      engineId: "openclaw",
      deploymentMode: "sandbox",
    });
    assert.equal(sandbox.eligible, true);

    const live = service.evaluateEligibility("openclaw/local-wsl", {
      engineId: "openclaw",
      deploymentMode: "live",
    });
    assert.equal(live.eligible, false);
    assert.equal(live.reasons[0].code, "TARGET_DEPLOYMENT_MODE_UNSUPPORTED");
  } finally {
    await engine.close();
    rmSync(workspace, { recursive: true, force: true });
  }
});
