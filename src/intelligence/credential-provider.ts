import { NotFoundError } from "../errors.js";
import type { CredentialLease, CredentialProvider, CredentialStatus } from "./credential-connection.js";
import { CredentialConnectionRegistry } from "./credential-registry.js";
import type { SecretStore } from "./secret-store.js";

export class RegistryBackedCredentialProvider implements CredentialProvider {
  readonly #connections: CredentialConnectionRegistry;
  readonly #secretStore: SecretStore;

  constructor(input: { connections: CredentialConnectionRegistry; secretStore: SecretStore }) {
    this.#connections = input.connections;
    this.#secretStore = input.secretStore;
  }

  async validate(connectionId: string): Promise<CredentialStatus> {
    const connection = this.#connections.get(connectionId);
    const hasSecret = connection.secretRef ? await this.#secretStore.exists(connection.secretRef) : false;
    if (connection.type === "api-key" && !connection.secretRef) {
      return { connectionId, status: "invalid", reason: "API key connections require a secret reference" };
    }
    if (connection.secretRef && !hasSecret) {
      return { connectionId, status: "invalid", reason: "Secret reference is not available" };
    }
    if (connection.status === "revoked" || connection.status === "expired" || connection.status === "unsupported") {
      return { connectionId, status: connection.status, reason: "Connection is not usable" };
    }
    return {
      connectionId,
      status: connection.status === "configured" ? "valid" : connection.status,
      lastVerifiedAt: Date.now(),
    };
  }

  async resolve(connectionId: string, purpose: string): Promise<CredentialLease> {
    const connection = this.#connections.get(connectionId);
    const status = await this.validate(connectionId);
    if (status.status === "invalid" || status.status === "revoked" || status.status === "expired" || status.status === "unsupported" || status.status === "unavailable") {
      throw new Error("credential connection is not usable for this purpose");
    }
    if (!purpose) {
      throw new Error("credential purpose is required");
    }
    return {
      connectionId: connection.id,
      providerId: connection.providerId,
      type: connection.type,
      purpose,
      ...(connection.secretRef ? { secretRef: connection.secretRef } : {}),
      expiresAt: Date.now() + 5 * 60 * 1000,
      ...(connection.metadata ? { metadata: connection.metadata } : {}),
    };
  }

  async refresh(connectionId: string): Promise<CredentialStatus> {
    const status = await this.validate(connectionId);
    this.#connections.updateStatus(connectionId, status.status, status.lastVerifiedAt ? { lastVerifiedAt: status.lastVerifiedAt } : {});
    return status;
  }

  async revoke(connectionId: string): Promise<void> {
    const connection = this.#connections.get(connectionId);
    if (connection.secretRef) {
      await this.#secretStore.delete(connection.secretRef);
    }
    this.#connections.updateStatus(connectionId, "revoked");
  }
}
