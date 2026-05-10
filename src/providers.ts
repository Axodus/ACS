import { DuplicateRegistrationError } from "./errors.js";
import type { ProviderDefinition, ProviderId } from "./types.js";

export class ProviderRegistry {
  readonly #providers = new Map<ProviderId, ProviderDefinition>();

  register(provider: ProviderDefinition): ProviderDefinition {
    if (this.#providers.has(provider.id)) {
      throw new DuplicateRegistrationError("provider", provider.id);
    }

    this.#providers.set(provider.id, provider);
    return provider;
  }

  findAvailableByCapability(capabilityName: string): ProviderDefinition | undefined {
    for (const provider of this.#providers.values()) {
      const supportsCapability = provider.capabilities.some((capability) => capability.name === capabilityName);
      if (provider.status === "available" && supportsCapability) {
        return provider;
      }
    }

    return undefined;
  }

  list(): readonly ProviderDefinition[] {
    return [...this.#providers.values()];
  }
}
