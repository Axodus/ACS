import assert from "node:assert/strict";
import test from "node:test";
import {
  CredentialConnectionRegistry,
  InMemorySecretStore,
  OpenAiByokModelProvider,
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  RegistryBackedCredentialProvider,
} from "../dist/index.js";

class FakeTransport {
  requests = [];
  constructor(handler) {
    this.handler = handler;
  }
  async request(input) {
    this.requests.push(input);
    return await this.handler(input);
  }
}

async function buildProvider(options = {}) {
  const connections = new CredentialConnectionRegistry();
  const secretStore = new InMemorySecretStore();
  const secretRef = options.withSecret === false
    ? undefined
    : await secretStore.put({ providerId: "openai", purpose: "api-key", value: "sk-test-secret" });
  connections.register({
    id: "cred_openai",
    providerId: "openai",
    type: "api-key",
    status: options.status ?? "configured",
    owner: { tenantId: "tenant-alpha", wallet: "0xabc" },
    scopes: ["inference"],
    ...(secretRef ? { secretRef } : {}),
    createdAt: 1,
    updatedAt: 1,
  });
  const credentialProvider = new RegistryBackedCredentialProvider({ connections, secretStore });
  const transport = new FakeTransport(options.handler ?? (async (input) => {
    if (input.url.endsWith("/v1/models")) {
      return { status: 200, json: { data: [{ id: "gpt-5", owned_by: "openai" }] } };
    }
    if (input.url.endsWith("/v1/models/gpt-5")) {
      return { status: 200, json: { id: "gpt-5", owned_by: "openai" } };
    }
    return { status: 404, json: {} };
  }));
  const provider = new OpenAiByokModelProvider({
    transport,
    credentialProvider,
    secretStore,
    connectionId: "cred_openai",
    catalog: [{
      modelId: "gpt-5",
      displayName: "GPT-5",
      availability: "available",
      capabilities: {
        supports: ["text", "reasoning", "coding", "streaming"],
        inputModalities: ["text"],
        outputModalities: ["text"],
        contextWindow: 400000,
        toolUse: false,
        reasoning: true,
        coding: true,
        streaming: true,
        structuredOutput: true,
        vision: false,
      },
    }],
  });
  return { provider, transport, connections, secretStore, credentialProvider };
}

test("BYOK provider resolves connection and injects bearer auth without leaking secret", async () => {
  const { provider, transport } = await buildProvider();
  const models = await provider.listModels();
  assert.equal(models[0].canonicalId, "openai/gpt-5");
  assert.equal(transport.requests[0].headers.Authorization, "Bearer sk-test-secret");
  assert.equal(JSON.stringify(models).includes("sk-test-secret"), false);
});

test("BYOK provider getModel uses provider-specific path and model catalog", async () => {
  const { provider } = await buildProvider();
  const model = await provider.getModel("gpt-5");
  assert.equal(model.displayName, "GPT-5");
  assert.equal(model.capabilities.reasoning, true);
});

test("missing or invalid credentials fail cleanly without exposing secret data", async () => {
  const missing = await buildProvider({ withSecret: false });
  await assert.rejects(() => missing.provider.listModels(), /credential connection is not usable/i);

  const invalid = await buildProvider({ status: "revoked" });
  await assert.rejects(() => invalid.provider.listModels(), /credential connection is not usable/i);
});

test("provider error mapping distinguishes auth, rate limit, and availability", async () => {
  const auth = await buildProvider({ handler: async () => ({ status: 401, json: {} }) });
  await assert.rejects(() => auth.provider.listModels(), ProviderAuthenticationError);

  const rate = await buildProvider({ handler: async () => ({ status: 429, json: {} }) });
  await assert.rejects(() => rate.provider.listModels(), ProviderRateLimitError);

  const unavailable = await buildProvider({ handler: async () => ({ status: 503, json: {} }) });
  await assert.rejects(() => unavailable.provider.listModels(), ProviderUnavailableError);
});

test("health remains structured and credential references stay separate from secret values", async () => {
  const { provider, connections } = await buildProvider();
  const health = await provider.health();
  assert.equal(health.status, "ready");
  const connection = connections.get("cred_openai");
  assert.equal(JSON.stringify(connection).includes("sk-test-secret"), false);
  assert.equal(connection.secretRef?.id.startsWith("secret_"), true);
});
