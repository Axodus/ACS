import type { SecretMetadata } from "../../intelligence/secret-store.js";
import type { SecretMetadataStore } from "../../intelligence/vault-secret-provider.js";
import type { SharedAuthorityMutationContext, SharedAuthorityService } from "./shared-authority-service.js";
import type { SharedAuthoritativeState } from "./contracts.js";

export interface SharedSecretMetadataStoreOptions {
  readonly state: SharedAuthoritativeState;
  readonly authority: SharedAuthorityService;
  readonly actor: string;
  readonly correlationId: (operation: "create" | "save", metadata: SecretMetadata) => string;
}

/**
 * Bridges the Vault provider's metadata contract to SH shared authority while
 * preserving the same-transaction administrative audit append.
 */
export class SharedSecretMetadataStore implements SecretMetadataStore {
  readonly #options: SharedSecretMetadataStoreOptions;

  constructor(options: SharedSecretMetadataStoreOptions) {
    this.#options = options;
  }

  create(metadata: SecretMetadata): Promise<SecretMetadata> {
    return this.#options.authority.createSecretMetadata(metadata, this.#context("create", metadata));
  }

  get(secretId: string): Promise<SecretMetadata | undefined> {
    return this.#options.state.secretMetadata.get(secretId);
  }

  list(): Promise<readonly SecretMetadata[]> {
    return this.#options.state.secretMetadata.list();
  }

  save(metadata: SecretMetadata, expectedVersion?: number): Promise<SecretMetadata> {
    if (expectedVersion === undefined) throw new Error("shared secret metadata save requires expectedVersion");
    return this.#options.authority.saveSecretMetadata(metadata, expectedVersion, this.#context("save", metadata));
  }

  #context(operation: "create" | "save", metadata: SecretMetadata): SharedAuthorityMutationContext {
    return {
      actor: this.#options.actor,
      correlationId: this.#options.correlationId(operation, metadata),
      timestamp: Date.now(),
      reason: `vault metadata ${operation}`,
    };
  }
}
