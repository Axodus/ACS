import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentRunnerRegistry,
  AgentRunnerService,
  AgentRunnerUnsupportedOperationError,
  DuplicateRegistrationError,
  NotFoundError,
} from "../dist/index.js";

class FakeRunner {
  constructor(id, displayName, options = {}) {
    this.id = id;
    this.displayName = displayName;
    this._health = options.health ?? {
      runnerId: id,
      status: "authenticated",
      observedAt: 1,
      findings: [],
    };
    this._capabilities = options.capabilities ?? {
      runnerId: id,
      supportedConnectionTypes: ["subscription"],
      supportedProviders: ["anthropic"],
      supportsExecution: false,
      supportsInspection: false,
      supportsCancellation: false,
      environmentScope: "local-only",
    };
  }

  async health() {
    return this._health;
  }

  async capabilities() {
    return this._capabilities;
  }

  async execute() {
    throw new AgentRunnerUnsupportedOperationError();
  }

  async inspect() {
    return { executionId: "unsupported", status: "unsupported", message: "Execution inspection is not supported" };
  }

  async cancel() {
    throw new AgentRunnerUnsupportedOperationError();
  }
}

test("runner registry registers deterministically and rejects duplicates", () => {
  const registry = new AgentRunnerRegistry();
  registry.register(new FakeRunner("claude-code", "Claude Code"));
  registry.register(new FakeRunner("codex", "Codex"));
  assert.deepEqual(registry.list().map((runner) => runner.id), ["claude-code", "codex"]);
  assert.throws(() => registry.register(new FakeRunner("codex", "Codex Duplicate")), DuplicateRegistrationError);
});

test("runner registry lookup rejects unknown runners", () => {
  const registry = new AgentRunnerRegistry();
  assert.throws(() => registry.get("missing"), NotFoundError);
});

test("runner service delegates health and capabilities with subscription-safe metadata", async () => {
  const registry = new AgentRunnerRegistry();
  registry.register(new FakeRunner("codex", "Codex", {
    capabilities: {
      runnerId: "codex",
      supportedConnectionTypes: ["subscription", "oauth"],
      supportedProviders: ["openai"],
      supportsExecution: false,
      supportsInspection: true,
      supportsCancellation: false,
      environmentScope: "local-only",
    },
    health: {
      runnerId: "codex",
      status: "not-authenticated",
      observedAt: 42,
      findings: [{ code: "RUNNER_AUTH_REQUIRED", severity: "warning", message: "Runner requires official local authentication" }],
    },
  }));
  const service = new AgentRunnerService(registry);
  const health = await service.health("codex");
  const capabilities = await service.capabilities("codex");
  assert.equal(health.status, "not-authenticated");
  assert.equal(capabilities.supportedConnectionTypes.includes("subscription"), true);
  assert.equal(JSON.stringify(capabilities).includes("token"), false);
});

test("unsupported execution handling is explicit instead of faked", async () => {
  const runner = new FakeRunner("gemini-cli", "Gemini CLI");
  await assert.rejects(() => runner.execute({ task: "hello" }), AgentRunnerUnsupportedOperationError);
  const inspection = await runner.inspect("exec_1");
  assert.equal(inspection.status, "unsupported");
});

test("local account sessions do not imply cloud compatibility", async () => {
  const runner = new FakeRunner("claude-code", "Claude Code", {
    capabilities: {
      runnerId: "claude-code",
      supportedConnectionTypes: ["subscription"],
      supportedProviders: ["anthropic"],
      supportsExecution: false,
      supportsInspection: false,
      supportsCancellation: false,
      environmentScope: "local-only",
    },
  });
  const capabilities = await runner.capabilities();
  assert.equal(capabilities.environmentScope, "local-only");
  assert.equal(capabilities.environmentScope === "cloud-compatible", false);
});
