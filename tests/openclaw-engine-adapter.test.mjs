import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  EngineInvalidResponseError,
  EngineRegistry,
  EngineRegistryDuplicateError,
  EngineRegistryNotFoundError,
  EngineService,
  EngineTargetNotFoundError,
  EngineTimeoutDomainError,
  OpenClawEngineAdapter,
  createOpenClawEngineFromManifest,
  EngineProtocolError,
  EngineTimeoutError,
} from "../dist/index.js";

class FakeClient {
  constructor(handlers) { this.handlers = handlers; }
  async request(operation, params = {}) {
    const handler = this.handlers[operation];
    if (!handler) throw new Error(`missing handler: ${operation}`);
    if (typeof handler === 'function') return handler(params);
    if (handler instanceof Error) throw handler;
    return handler;
  }
  async close() {}
}

test("registry registers, lists, and rejects duplicates/unknown engines", async () => {
  const engine = new OpenClawEngineAdapter(new FakeClient({
    "engine.health": { engine: "openclaw", status: "ready", protocols: ["acs-engine/1"], operations: ["engine.health"] },
  }));
  const registry = new EngineRegistry();
  registry.register(engine);
  assert.equal(registry.get("openclaw"), engine);
  assert.equal(registry.list().length, 1);
  assert.throws(() => registry.register(engine), EngineRegistryDuplicateError);
  assert.throws(() => registry.get("missing"), EngineRegistryNotFoundError);
});

test("adapter maps health/version/capabilities/targets and preserves operator metadata", async () => {
  const adapter = new OpenClawEngineAdapter(new FakeClient({
    "engine.health": { engine: "openclaw", status: "ready", protocols: ["acs-engine/1"], operations: ["engine.health", "target.inspect"] },
    "engine.version": { engine: "openclaw", package_version: "0.1.0", source_revision: "abc", protocol: "acs-engine/1" },
    "engine.capabilities": { engine: "openclaw", protocols: ["acs-engine/1"], operations: ["engine.health"], engine_capabilities: ["deployment.sandbox"], deployment_modes: ["sandbox"] },
    "target.list": { targets: [{
      id: "local-wsl", type: "local", environment: "dev-local", engine: "openclaw", status: "degraded",
      capabilities: ["deployment.sandbox"], deployment_modes: ["sandbox"], scheduling_eligible: true,
      scheduling_reasons: ["sandbox-only local target"], supported_runners: [], supported_providers: [], isolation_modes: ["sandbox"],
      health: { status: "degraded", observed_at: 1, checks: [{ name: "source", status: "pass", message: "ok" }], findings: [{ code: "WARN", severity: "warning", message: "legacy overlap" }] },
      runtime: { source_root: "/src", runtime_root: "/runtime", source_runtime_overlap: true }
    }] },
    "target.inspect": { target: {
      id: "local-wsl", type: "local", environment: "dev-local", engine: "openclaw", status: "ready",
      capabilities: ["deployment.sandbox"], deployment_modes: ["sandbox"], scheduling_eligible: true,
      scheduling_reasons: ["sandbox-only local target"], supported_runners: [], supported_providers: [], isolation_modes: ["sandbox"],
      health: { status: "ready", observed_at: 1, checks: [], findings: [] },
      runtime: { source_root: "/src", runtime_root: "/runtime", source_runtime_overlap: false }
    } },
  }));

  assert.equal((await adapter.health()).status, "ready");
  assert.equal((await adapter.version()).sourceRevision, "abc");
  assert.deepEqual((await adapter.capabilities()).deploymentModes, ["sandbox"]);
  const listed = await adapter.listExecutionTargets();
  assert.equal(listed[0].operatorMetadata?.classification, "operator-only");
  assert.equal(listed[0].operatorMetadata?.sourceRuntimeOverlap, true);
  const inspected = await adapter.inspectExecutionTarget("local-wsl");
  assert.equal(inspected.status, "ready");
  assert.equal(inspected.operatorMetadata?.sourceRuntimeOverlap, false);
});

test("adapter maps protocol and transport errors into engine-domain errors", async () => {
  const notFound = new OpenClawEngineAdapter(new FakeClient({
    "target.inspect": new EngineProtocolError({ code: "ACS_ENGINE_TARGET_NOT_FOUND", message: "missing", retryable: false }),
  }));
  await assert.rejects(() => notFound.inspectExecutionTarget("missing"), EngineTargetNotFoundError);

  const timeout = new OpenClawEngineAdapter(new FakeClient({
    "engine.health": new EngineTimeoutError("timed out"),
  }));
  await assert.rejects(() => timeout.health(), EngineTimeoutDomainError);
});

test("adapter rejects unexpected engine identity and invalid shapes", async () => {
  const wrongEngine = new OpenClawEngineAdapter(new FakeClient({
    "engine.health": { engine: "different-engine", status: "ready", protocols: ["acs-engine/1"], operations: [] },
  }));
  await assert.rejects(() => wrongEngine.health(), EngineInvalidResponseError);

  const malformedTarget = new OpenClawEngineAdapter(new FakeClient({
    "target.inspect": { target: { id: "local-wsl", type: "local", environment: "dev-local", engine: "openclaw", status: "ready" } },
  }));
  await assert.rejects(() => malformedTarget.inspectExecutionTarget("local-wsl"), EngineInvalidResponseError);
});

test("engine service delegates through registry to the adapter", async () => {
  const engine = new OpenClawEngineAdapter(new FakeClient({
    "engine.health": { engine: "openclaw", status: "ready", protocols: ["acs-engine/1"], operations: [] },
  }));
  const registry = new EngineRegistry();
  registry.register(engine);
  const service = new EngineService(registry);
  const health = await service.health("openclaw");
  assert.equal(health.status, "ready");
});

test("real stdio stack works through AgentEngine abstraction", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-openclaw-adapter-"));
  const runtimeRoot = join(workspace, "runtime");
  const stateRoot = join(runtimeRoot, ".acs", "state");
  const configRoot = runtimeRoot;
  const artifactsRoot = join(stateRoot, "artifacts");
  const workspaceRoot = join(runtimeRoot, ".acs", "workspaces");
  mkdirSync(runtimeRoot, { recursive: true });
  mkdirSync(configRoot, { recursive: true });
  writeFileSync(join(configRoot, "openclaw.json"), "{}\n", "utf8");

  const engine = createOpenClawEngineFromManifest({
    acsRoot: "/opt/Axodus/ACS",
    runtimeRoot,
    stateRoot,
    configRoot,
    artifactsRoot,
    workspaceRoot,
    timeoutMs: 5000,
  });

  try {
    const health = await engine.health();
    assert.equal(health.identity.id, "openclaw");
    const target = await engine.inspectExecutionTarget("local-wsl");
    assert.equal(target.id, "local-wsl");
    assert.equal(target.operatorMetadata?.sourceRuntimeOverlap, false);
  } finally {
    await engine.close();
    rmSync(workspace, { recursive: true, force: true });
  }
});
