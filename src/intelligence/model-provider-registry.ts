import { DuplicateRegistrationError, NotFoundError } from "../errors.js";
import type { ModelProvider } from "./model-provider.js";

export class ModelProviderRegistry {
  readonly #providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider): ModelProvider {
    if (this.#providers.has(provider.id)) {
      throw new DuplicateRegistrationError("model-provider", provider.id);
    }
    this.#providers.set(provider.id, provider);
    return provider;
  }

  get(id: string): ModelProvider {
    const provider = this.#providers.get(id);
    if (!provider) {
      throw new NotFoundError("model-provider", id);
    }
    return provider;
  }

  list(): readonly ModelProvider[] {
    return [...this.#providers.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}
