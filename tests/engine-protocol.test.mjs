import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  ACS_ENGINE_PROTOCOL,
  EngineProtocolClient,
  EngineProtocolError,
  EngineTimeoutError,
  StdioEngineTransport,
} from "../dist/index.js";

function createEngineEnv(sourceRoot, runtimeRoot) {
  const stateRoot = join(runtimeRoot, ".acs", "state");
  const configRoot = runtimeRoot;
  const artifactsRoot = join(stateRoot, "artifacts");
  const workspaceRoot = join(runtimeRoot, ".acs", "workspaces");
  mkdirSync(runtimeRoot, { recursive: true });
  mkdirSync(configRoot, { recursive: true });
  writeFileSync(join(configRoot, "openclaw.json"), "{}\n", "utf8");
  return {
    PYTHONPATH: join(sourceRoot, "src"),
    ACS_SOURCE_ROOT: sourceRoot,
    ACS_RUNTIME_ROOT: runtimeRoot,
    ACS_STATE_ROOT: stateRoot,
    ACS_CONFIG_ROOT: configRoot,
    ACS_ARTIFACTS_ROOT: artifactsRoot,
    ACS_WORKSPACE_ROOT: workspaceRoot,
  };
}

test("protocol fixtures remain stable and versioned", () => {
  const request = JSON.parse(readFileSync(new URL("../contracts/acs-engine/v1/fixtures/health.request.json", import.meta.url), "utf8"));
  const success = JSON.parse(readFileSync(new URL("../contracts/acs-engine/v1/fixtures/health.response.json", import.meta.url), "utf8"));
  const failure = JSON.parse(readFileSync(new URL("../contracts/acs-engine/v1/fixtures/error.response.json", import.meta.url), "utf8"));
  assert.equal(request.protocol, ACS_ENGINE_PROTOCOL);
  assert.equal(success.protocol, ACS_ENGINE_PROTOCOL);
  assert.equal(failure.protocol, ACS_ENGINE_PROTOCOL);
  assert.equal(success.success, true);
  assert.equal(failure.success, false);
});

test("engine protocol client preserves correlation and surfaces protocol errors", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-engine-protocol-"));
  const sourceRoot = "/opt/Axodus/ACS/engines/agentsai";
  const runtimeRoot = join(workspace, "runtime");
  const transport = new StdioEngineTransport({
    command: "python3",
    args: ["-m", "acs.protocol.stdio"],
    cwd: sourceRoot,
    env: { ...process.env, ...createEngineEnv(sourceRoot, runtimeRoot) },
  });
  const client = new EngineProtocolClient(transport, { timeoutMs: 5000 });
  try {
    const health = await client.request("engine.health", {}, { id: "req-health" });
    assert.equal(health.engine, "openclaw");
    const target = await client.request("target.inspect", { target_id: "local-wsl" }, { id: "req-target" });
    assert.equal(target.target.id, "local-wsl");
    await assert.rejects(
      () => client.request("target.inspect", {}, { id: "req-missing" }),
      (error) => error instanceof EngineProtocolError && error.payload.code === "ACS_ENGINE_INVALID_PARAMS",
    );
  } finally {
    await client.close();
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("stdio transport times out and rejects malformed engine output", async () => {
  const slowWorkspace = mkdtempSync(join(tmpdir(), "acs-engine-timeout-"));
  const slowTransport = new StdioEngineTransport({
    command: "python3",
    args: ["-c", "import time; time.sleep(5)"],
    cwd: slowWorkspace,
    env: process.env,
  });
  try {
    await assert.rejects(
      () => slowTransport.request({ protocol: ACS_ENGINE_PROTOCOL, id: "timeout", operation: "engine.health", params: {} }, 50),
      (error) => error instanceof EngineTimeoutError,
    );
  } finally {
    await slowTransport.close();
    rmSync(slowWorkspace, { recursive: true, force: true });
  }

  const malformedWorkspace = mkdtempSync(join(tmpdir(), "acs-engine-malformed-"));
  const malformedTransport = new StdioEngineTransport({
    command: "python3",
    args: ["-c", "import sys; sys.stdout.write('not-json\\n'); sys.stdout.flush(); import time; time.sleep(1)"],
    cwd: malformedWorkspace,
    env: process.env,
  });
  try {
    await assert.rejects(
      () => malformedTransport.request({ protocol: ACS_ENGINE_PROTOCOL, id: "malformed", operation: "engine.health", params: {} }, 1000),
      /malformed JSON/,
    );
  } finally {
    await malformedTransport.close();
    rmSync(malformedWorkspace, { recursive: true, force: true });
  }
});

test("stdio transport reports missing engine command without crashing the process", async () => {
  const transport = new StdioEngineTransport({
    command: "python3-missing-acs-engine",
    args: ["-m", "acs.protocol.stdio"],
  });
  await assert.rejects(
    () => transport.request({ protocol: ACS_ENGINE_PROTOCOL, id: "missing", operation: "engine.health", params: {} }, 200),
    (error) => error instanceof Error && /failed to start|ENOENT|not available|already closed/i.test(error.message),
  );
  await transport.close();
});
