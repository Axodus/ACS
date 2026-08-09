import { DuplicateRegistrationError, NotFoundError } from "../errors.js";
import type {
  CredentialConnection,
  CredentialConnectionStatus,
} from "./credential-connection.js";

export class CredentialConnectionRegistry {
  readonly #connections = new Map<string, CredentialConnection>();

  register(connection: CredentialConnection): CredentialConnection {
    if (this.#connections.has(connection.id)) {
      throw new DuplicateRegistrationError("credential-connection", connection.id);
    }
    this.#connections.set(connection.id, connection);
    return connection;
  }

  get(id: string): CredentialConnection {
    const connection = this.#connections.get(id);
    if (!connection) {
      throw new NotFoundError("credential-connection", id);
    }
    return connection;
  }

  list(): readonly CredentialConnection[] {
    return [...this.#connections.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  listByProvider(providerId: string): readonly CredentialConnection[] {
    return this.list().filter((connection) => connection.providerId === providerId);
  }

  updateStatus(id: string, status: CredentialConnectionStatus, extra: { lastVerifiedAt?: number; expiresAt?: number } = {}): CredentialConnection {
    const current = this.get(id);
    const updated: CredentialConnection = {
      ...current,
      status,
      updatedAt: Date.now(),
      ...(extra.lastVerifiedAt ? { lastVerifiedAt: extra.lastVerifiedAt } : {}),
      ...(extra.expiresAt ? { expiresAt: extra.expiresAt } : {}),
    };
    this.#connections.set(id, updated);
    return updated;
  }
}
