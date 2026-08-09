import assert from "node:assert/strict";
import test from "node:test";
import {
  ModelProviderRegistry,
  ModelProviderService,
  createCanonicalModelId,
  DuplicateRegistrationError,
  NotFoundError,
} from "../dist/index.js";

class FakeModelProvider {
  constructor(id, displayName, options = {}) {
    this.id = id;
    this.displayName = displayName;
    this._health = options.health ?? {
      providerId: id,
      status: "ready",
      observedAt: 1,
      findings: [],
    };
    this._capabilities = options.capabilities ?? {
      providerId: id,
      providerTypes: ["managed"],
      supportedConnectionTypes: ["managed"],
      supportedModelCapabilities: ["text", "reasoning"],
    };
    this._models = options.models ?? [
      {
        providerId: id,
        modelId: "general",
        canonicalId: createCanonicalModelId(id, "general"),
        displayName: displayName + " General",
        availability: "available",
        capabilities: {
          supports: ["text", "reasoning"],
          inputModalities: ["text"],
          outputModalities: ["text"],
          contextWindow: 200000,
          toolUse: false,
          reasoning: true,
          coding: false,
          streaming: true,
          structuredOutput: true,
          vision: false,
        },
      },
    ];
  }

  async health() {
    return this._health;
  }

  async listModels() {
    return [...this._models].sort((left, right) => left.canonicalId.localeCompare(right.canonicalId));
  }

  async getModel(modelId) {
    const model = this._models.find((entry) => entry.modelId === modelId || entry.canonicalId === modelId);
    if (!model) throw new NotFoundError("model", modelId);
    return model;
  }

  async capabilities() {
    return this._capabilities;
  }
}

test("canonical model identity is provider-scoped and deterministic", () => {
  assert.equal(createCanonicalModelId("anthropic", "claude-sonnet"), "anthropic/claude-sonnet");
  assert.notEqual(createCanonicalModelId("openai", "gpt-5"), createCanonicalModelId("axodus", "gpt-5"));
});

test("provider registry registers deterministically and rejects duplicates", () => {
  const registry = new ModelProviderRegistry();
  registry.register(new FakeModelProvider("openai", "OpenAI"));
  registry.register(new FakeModelProvider("anthropic", "Anthropic"));
  assert.deepEqual(registry.list().map((provider) => provider.id), ["anthropic", "openai"]);
  assert.throws(() => registry.register(new FakeModelProvider("openai", "OpenAI Duplicate")), DuplicateRegistrationError);
});

test("provider registry lookup rejects unknown providers", () => {
  const registry = new ModelProviderRegistry();
  assert.throws(() => registry.get("missing"), NotFoundError);
});

test("provider service delegates health, capabilities, models, and individual lookup", async () => {
  const registry = new ModelProviderRegistry();
  registry.register(new FakeModelProvider("axodus", "Axodus", {
    capabilities: {
      providerId: "axodus",
      providerTypes: ["managed", "private"],
      supportedConnectionTypes: ["managed"],
      supportedModelCapabilities: ["text", "reasoning", "coding"],
    },
    models: [
      {
        providerId: "axodus",
        modelId: "managed-default",
        canonicalId: "axodus/managed-default",
        displayName: "Axodus Managed Default",
        availability: "available",
        capabilities: {
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
        },
      },
    ],
  }));
  const service = new ModelProviderService(registry);
  assert.equal((await service.health("axodus")).status, "ready");
  assert.deepEqual((await service.capabilities("axodus")).supportedModelCapabilities, ["text", "reasoning", "coding"]);
  assert.deepEqual((await service.listModels("axodus")).map((model) => model.canonicalId), ["axodus/managed-default"]);
  assert.equal((await service.getModel("axodus", "managed-default")).canonicalId, "axodus/managed-default");
});

test("model capability and health representations remain structured", async () => {
  const provider = new FakeModelProvider("local", "Local", {
    health: {
      providerId: "local",
      status: "degraded",
      observedAt: 42,
      findings: [{ code: "LOCAL_ONLY", severity: "warning", message: "Local provider is not portable to cloud targets" }],
    },
    capabilities: {
      providerId: "local",
      providerTypes: ["local"],
      supportedConnectionTypes: ["local-runner"],
      supportedModelCapabilities: ["text", "tool-use", "structured-output", "streaming"],
    },
  });
  const health = await provider.health();
  const capabilities = await provider.capabilities();
  const [model] = await provider.listModels();
  assert.equal(health.findings[0].code, "LOCAL_ONLY");
  assert.equal(capabilities.supportedConnectionTypes[0], "local-runner");
  assert.equal(model.capabilities.structuredOutput, true);
  assert.equal(model.capabilities.supports.includes("reasoning"), true);
});
