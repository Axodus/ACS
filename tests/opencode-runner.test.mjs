import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentRunnerRegistry,
  CredentialConnectionRegistry,
  InMemorySecretStore,
  OpenCodeRunner,
  FetchOpenCodeTransport,
  RegistryBackedCredentialProvider,
} from "../dist/index.js";

class FakeOpenCodeTransport {
  requests = [];
  constructor(handler) {
    this.handler = handler;
  }
  async get(path, input = {}) {
    this.requests.push({ path, input });
    return await this.handler(path, input);
  }
}

async function buildRunner(options = {}) {
  const transport = new FakeOpenCodeTransport(options.handler ?? (async (path) => {
    if (path === "/global/health") {
      return { status: 200, json: { healthy: true, version: "1.0.0" } };
    }
    if (path === "/config/providers") {
      return { status: 200, json: { providers: [{ id: "openai" }, { id: "anthropic" }] } };
    }
    return { status: 404, json: {} };
  }));

  if (!options.auth) {
    return { runner: new OpenCodeRunner({ endpoint: options.endpoint, transport }), transport };
  }

  const connections = new CredentialConnectionRegistry();
  const secretStore = new InMemorySecretStore();
  const secretRef = await secretStore.put({ providerId: "opencode", purpose: "http-basic", value: "runner-password" });
  connections.register({
    id: "cred_opencode",
    providerId: "opencode",
    type: "local-runner",
    status: "configured",
    owner: { tenantId: "tenant-alpha" },
    scopes: ["runner"],
    secretRef,
    createdAt: 1,
    updatedAt: 1,
  });
  const credentialProvider = new RegistryBackedCredentialProvider({ connections, secretStore });
  return {
    runner: new OpenCodeRunner({
      endpoint: options.endpoint,
      transport,
      connectionId: "cred_opencode",
      credentialProvider,
      secretStore,
    }),
    transport,
  };
}

test("OpenCode runner maps health and capabilities through the AgentRunner contract", async () => {
  const { runner } = await buildRunner();
  const health = await runner.health();
  const capabilities = await runner.capabilities();
  assert.equal(health.status, "authenticated");
  assert.deepEqual(capabilities.supportedProviders, ["openai", "anthropic"]);
  assert.equal(capabilities.environmentScope, "local-only");
});

test("OpenCode runner reports unavailable service without degrading ACS globally", async () => {
  const { runner } = await buildRunner({
    handler: async () => { throw new Error("connect ECONNREFUSED"); },
  });
  const health = await runner.health();
  assert.equal(health.status, "unavailable");
  assert.equal(health.findings[0].code, "OPENCODE_UNAVAILABLE");
});

test("OpenCode runner returns not-authenticated when HTTP auth is required", async () => {
  const { runner } = await buildRunner({
    handler: async () => ({ status: 401, json: {} }),
  });
  const health = await runner.health();
  assert.equal(health.status, "not-authenticated");
});

test("OpenCode runner injects basic auth when a local-runner credential is configured", async () => {
  const { runner, transport } = await buildRunner({ auth: true });
  await runner.health();
  assert.equal(String(transport.requests[0].input.headers.Authorization).startsWith("Basic "), true);
  assert.equal(JSON.stringify(transport.requests).includes("runner-password"), false);
});

test("OpenCode runner execution remains explicitly unsupported in S12", async () => {
  const { runner } = await buildRunner();
  await assert.rejects(() => runner.execute({ task: "hello" }), /not enabled in S12/i);
  const inspection = await runner.inspect("exec_1");
  assert.equal(inspection.status, "unsupported");
});

test("OpenCode runner integrates with the runner registry and flags non-private endpoints", async () => {
  const registry = new AgentRunnerRegistry();
  const { runner } = await buildRunner({ endpoint: "http://example.com:4096" });
  registry.register(runner);
  const health = await registry.get("opencode").health();
  assert.equal(health.findings[0].code, "OPENCODE_NON_PRIVATE_BINDING");
});
