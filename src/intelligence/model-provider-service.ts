import type {
  ModelDefinition,
  ModelProvider,
  ModelProviderCapabilities,
  ModelProviderHealth,
} from "./model-provider.js";
import { ModelProviderRegistry } from "./model-provider-registry.js";

export class ModelProviderService {
  readonly #registry: ModelProviderRegistry;

  constructor(registry: ModelProviderRegistry) {
    this.#registry = registry;
  }

  listProviders(): readonly ModelProvider[] {
    return this.#registry.list();
  }

  getProvider(id: string): ModelProvider {
    return this.#registry.get(id);
  }

  health(id: string): Promise<ModelProviderHealth> {
    return this.getProvider(id).health();
  }

  capabilities(id: string): Promise<ModelProviderCapabilities> {
    return this.getProvider(id).capabilities();
  }

  listModels(id: string): Promise<readonly ModelDefinition[]> {
    return this.getProvider(id).listModels();
  }

  getModel(providerId: string, modelId: string): Promise<ModelDefinition> {
    return this.getProvider(providerId).getModel(modelId);
  }
}
