import { NotFoundError } from "../errors.js";
import type { CredentialConnection } from "./credential-connection.js";
import type {
  ModelDefinition,
  ModelProvider,
  ModelProviderCapabilities,
  ModelProviderHealth,
} from "./model-provider.js";
import { createCanonicalModelId } from "./model-provider.js";
import type { AxodusModelGateway } from "./axodus-model-gateway.js";

export class AxodusManagedModelProvider implements ModelProvider {
  readonly id = "axodus";
  readonly displayName = "Axodus Managed";

  readonly #gateway: AxodusModelGateway;
  readonly #managedConnection: CredentialConnection | undefined;

  constructor(input: {
    readonly gateway: AxodusModelGateway;
    readonly managedConnection?: CredentialConnection;
  }) {
    this.#gateway = input.gateway;
    this.#managedConnection = input.managedConnection;
  }

  async health(): Promise<ModelProviderHealth> {
    const gatewayHealth = await this.#gateway.health();
    return {
      providerId: this.id,
      status: gatewayHealth.status,
      observedAt: gatewayHealth.observedAt,
      findings: [...gatewayHealth.findings],
    };
  }

  async listModels(): Promise<readonly ModelDefinition[]> {
    const records = await this.#gateway.listManagedModels();
    return records.map((record) => ({
      providerId: this.id,
      modelId: record.modelId,
      canonicalId: createCanonicalModelId(this.id, record.modelId),
      displayName: record.displayName,
      availability: record.availability,
      capabilities: record.capabilities,
      metadata: {
        source: "axodus-managed",
        ...(this.#managedConnection ? { connectionType: this.#managedConnection.type } : {}),
        ...(record.metadata ?? {}),
      },
    }));
  }

  async getModel(modelId: string): Promise<ModelDefinition> {
    const normalized = modelId.startsWith(this.id + "/") ? modelId.slice(this.id.length + 1) : modelId;
    try {
      const record = await this.#gateway.getManagedModel(normalized);
      return {
        providerId: this.id,
        modelId: record.modelId,
        canonicalId: createCanonicalModelId(this.id, record.modelId),
        displayName: record.displayName,
        availability: record.availability,
        capabilities: record.capabilities,
        metadata: {
          source: "axodus-managed",
          ...(this.#managedConnection ? { connectionType: this.#managedConnection.type } : {}),
          ...(record.metadata ?? {}),
        },
      };
    } catch {
      throw new NotFoundError("model", modelId);
    }
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
      providerTypes: ["managed", "private"],
      supportedConnectionTypes: ["managed"],
      supportedModelCapabilities: [...capabilities].sort(),
    };
  }
}
