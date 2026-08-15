import { NotFoundError } from "../errors.js";
import type { CredentialProvider } from "./credential-connection.js";
import type {
  ModelCapabilities,
  ModelDefinition,
  ModelProvider,
  ModelProviderCapabilities,
  ModelProviderHealth,
} from "./model-provider.js";
import { createCanonicalModelId } from "./model-provider.js";
import { ProviderAuthenticationError, ProviderRateLimitError, ProviderRequestError, ProviderUnavailableError } from "./provider-errors.js";
import type { SecretStore } from "./secret-store.js";
import type { ProviderHttpTransport } from "./byok-http-transport.js";

export interface OpenAiModelCatalogEntry {
  readonly modelId: string;
  readonly displayName: string;
  readonly capabilities: ModelCapabilities;
  readonly availability: "available" | "preview" | "deprecated" | "unavailable";
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class OpenAiByokModelProvider implements ModelProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI BYOK";

  readonly #transport: ProviderHttpTransport;
  readonly #credentialProvider: CredentialProvider;
  readonly #secretStore: SecretStore;
  readonly #connectionId: string;
  readonly #baseUrl: string;
  readonly #catalog: readonly OpenAiModelCatalogEntry[];

  constructor(input: {
    transport: ProviderHttpTransport;
    credentialProvider: CredentialProvider;
    secretStore: SecretStore;
    connectionId: string;
    baseUrl?: string;
    catalog?: readonly OpenAiModelCatalogEntry[];
  }) {
    this.#transport = input.transport;
    this.#credentialProvider = input.credentialProvider;
    this.#secretStore = input.secretStore;
    this.#connectionId = input.connectionId;
    this.#baseUrl = input.baseUrl ?? "https://api.openai.com";
    this.#catalog = input.catalog ?? [];
  }

  async health(): Promise<ModelProviderHealth> {
    try {
      await this.#listModelsResponse();
      return { providerId: this.id, status: "ready", observedAt: Date.now(), findings: [] };
    } catch (error) {
      if (error instanceof ProviderAuthenticationError) {
        return { providerId: this.id, status: "degraded", observedAt: Date.now(), findings: [{ code: error.code, severity: "warning", message: error.message }] };
      }
      if (error instanceof ProviderUnavailableError || error instanceof ProviderRateLimitError) {
        return { providerId: this.id, status: "unavailable", observedAt: Date.now(), findings: [{ code: error.code, severity: "error", message: error.message }] };
      }
      return { providerId: this.id, status: "degraded", observedAt: Date.now(), findings: [{ code: "PROVIDER_REQUEST_ERROR", severity: "warning", message: "Provider health check failed" }] };
    }
  }

  async listModels(): Promise<readonly ModelDefinition[]> {
    const payload = await this.#listModelsResponse();
    const payloadRecord = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const data = Array.isArray(payloadRecord.data) ? payloadRecord.data : [];
    return data
      .map((entry: unknown) => this.#mapListModel(entry))
      .sort((left: ModelDefinition, right: ModelDefinition) => left.canonicalId.localeCompare(right.canonicalId));
  }

  async getModel(modelId: string): Promise<ModelDefinition> {
    const normalized = modelId.startsWith(this.id + "/") ? modelId.slice(this.id.length + 1) : modelId;
    const secret = await this.#resolveSecret("openai:model:get");
    const response = await this.#transport.request({
      method: "GET",
      url: this.#baseUrl + "/v1/models/" + normalized,
      headers: { Authorization: "Bearer " + secret },
      timeoutMs: 10000,
    });
    if (response.status === 404) {
      throw new NotFoundError("model", modelId);
    }
    this.#throwForStatus(response.status);
    return this.#mapModelObject(response.json);
  }

  async capabilities(): Promise<ModelProviderCapabilities> {
    const models = await this.listModels();
    const capabilities = new Set<ModelDefinition["capabilities"]["supports"][number]>();
    for (const model of models) {
      for (const capability of model.capabilities.supports) {
        capabilities.add(capability);
      }
    }
    return {
      providerId: this.id,
      providerTypes: ["byok"],
      supportedConnectionTypes: ["api-key"],
      supportedModelCapabilities: [...capabilities].sort(),
    };
  }

  async #resolveSecret(purpose: string): Promise<string> {
    const lease = await this.#credentialProvider.resolve(this.#connectionId, purpose);
    if (!lease.secretRef) {
      throw new ProviderAuthenticationError("credential lease does not contain a secret reference");
    }
    return await this.#secretStore.get(lease.secretRef, { tenantId: lease.tenantId });
  }

  async #listModelsResponse(): Promise<unknown> {
    const secret = await this.#resolveSecret("openai:model:list");
    const response = await this.#transport.request({
      method: "GET",
      url: this.#baseUrl + "/v1/models",
      headers: { Authorization: "Bearer " + secret },
      timeoutMs: 10000,
    });
    this.#throwForStatus(response.status);
    return response.json;
  }

  #throwForStatus(status: number): void {
    if (status === 401 || status === 403) throw new ProviderAuthenticationError();
    if (status === 429) throw new ProviderRateLimitError();
    if (status >= 500) throw new ProviderUnavailableError();
    if (status >= 400) throw new ProviderRequestError("provider request failed with status " + status);
  }

  #mapListModel(raw: unknown): ModelDefinition {
    if (!raw || typeof raw !== "object") {
      throw new ProviderRequestError("provider returned malformed model list");
    }
    const record = raw as Record<string, unknown>;
    return this.#mapModel({
      id: typeof record.id === "string" ? record.id : "unknown",
      owned_by: record.owned_by,
    });
  }

  #mapModelObject(raw: unknown): ModelDefinition {
    if (!raw || typeof raw !== "object") {
      throw new ProviderRequestError("provider returned malformed model payload");
    }
    const record = raw as Record<string, unknown>;
    return this.#mapModel(record);
  }

  #mapModel(record: Record<string, unknown>): ModelDefinition {
    const modelId = typeof record.id === "string" ? record.id : "unknown";
    const catalog = this.#catalog.find((entry) => entry.modelId === modelId);
    return {
      providerId: this.id,
      modelId,
      canonicalId: createCanonicalModelId(this.id, modelId),
      displayName: catalog?.displayName ?? modelId,
      availability: catalog?.availability ?? "available",
      capabilities: catalog?.capabilities ?? {
        supports: ["text", "streaming"],
        inputModalities: ["text"],
        outputModalities: ["text"],
        toolUse: false,
        reasoning: false,
        coding: false,
        streaming: true,
        structuredOutput: false,
        vision: false,
      },
      metadata: {
        owner: typeof record.owned_by === "string" ? record.owned_by : "openai",
        ...(catalog?.metadata ?? {}),
      },
    };
  }
}
