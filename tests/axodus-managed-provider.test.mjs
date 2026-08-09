import assert from "node:assert/strict";
import test from "node:test";
import {
  AxodusManagedModelProvider,
  ModelProviderRegistry,
  ModelProviderService,
  StaticAxodusModelGateway,
} from "../dist/index.js";

function capabilities(overrides = {}) {
  return {
    supports: ["text", "reasoning", "coding", "streaming"],
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextWindow: 128000,
    toolUse: false,
    reasoning: true,
    coding: true,
    streaming: true,
    structuredOutput: true,
    vision: false,
    ...overrides,
  };
}

test("Axodus managed provider registers cleanly and exposes managed catalog models", async () => {
  const provider = new AxodusManagedModelProvider({
    gateway: new StaticAxodusModelGateway({
      models: [
        { modelId: "managed-default", displayName: "Axodus Managed Default", availability: "available", capabilities: capabilities() },
      ],
    }),
    managedConnection: {
      id: "managed_axodus",
      providerId: "axodus",
      type: "managed",
      status: "active",
      owner: { tenantId: "axodus" },
      scopes: ["managed-routing"],
      createdAt: 1,
      updatedAt: 1,
    },
  });

  const registry = new ModelProviderRegistry();
  registry.register(provider);
  const service = new ModelProviderService(registry);

  assert.deepEqual(service.listProviders().map((entry) => entry.id), ["axodus"]);
  assert.equal((await service.getModel("axodus", "managed-default")).canonicalId, "axodus/managed-default");
});

test("Axodus managed provider health reflects gateway state without inventing readiness", async () => {
  const provider = new AxodusManagedModelProvider({
    gateway: new StaticAxodusModelGateway({
      health: {
        status: "not-configured",
        observedAt: 42,
        findings: [{ code: "AXODUS_GATEWAY_MISSING", severity: "warning", message: "No managed gateway is configured in this environment" }],
      },
      models: [],
    }),
  });

  const health = await provider.health();
  assert.equal(health.status, "not-configured");
  assert.equal(health.findings[0].code, "AXODUS_GATEWAY_MISSING");
});

test("Axodus managed provider capabilities derive from catalog and stay secret-free", async () => {
  const provider = new AxodusManagedModelProvider({
    gateway: new StaticAxodusModelGateway({
      models: [
        { modelId: "managed-default", displayName: "Axodus Managed Default", availability: "available", capabilities: capabilities() },
        { modelId: "vision-preview", displayName: "Axodus Vision Preview", availability: "preview", capabilities: capabilities({ supports: ["text", "vision", "streaming"], vision: true, reasoning: false, coding: false }) },
      ],
    }),
  });

  const model = await provider.getModel("axodus/managed-default");
  const providerCapabilities = await provider.capabilities();
  assert.equal(model.metadata?.source, "axodus-managed");
  assert.equal(JSON.stringify(model).includes("secret"), false);
  assert.deepEqual(providerCapabilities.providerTypes, ["managed", "private"]);
  assert.equal(providerCapabilities.supportedModelCapabilities.includes("vision"), true);
});

test("Axodus managed provider returns deterministic not-found for missing models", async () => {
  const provider = new AxodusManagedModelProvider({
    gateway: new StaticAxodusModelGateway({ models: [] }),
  });

  await assert.rejects(() => provider.getModel("missing"), /model not found/i);
});
