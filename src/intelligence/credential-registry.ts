import { DuplicateRegistrationError, NotFoundError } from "../errors.js";
import type {
  CredentialConnection,
  CredentialConnectionStatus,
} from "./credential-connection.js";
import type { IsolationScope } from "../control-plane/isolation.js";

export interface CredentialConnectionStore {
  createConnection(connection: CredentialConnection): CredentialConnection;
  getConnection(id: string): CredentialConnection | undefined;
  listConnections(): readonly CredentialConnection[];
  saveConnection(connection: CredentialConnection): CredentialConnection;
}

export class InMemoryCredentialConnectionStore implements CredentialConnectionStore {
  readonly #connections = new Map<string, CredentialConnection>();

  createConnection(connection: CredentialConnection): CredentialConnection {
    if (this.#connections.has(connection.id)) {
      throw new DuplicateRegistrationError("credential-connection", connection.id);
    }
    this.#connections.set(connection.id, connection);
    return connection;
  }

  getConnection(id: string): CredentialConnection | undefined {
    return this.#connections.get(id);
  }

  listConnections(): readonly CredentialConnection[] {
    return [...this.#connections.values()];
  }

  saveConnection(connection: CredentialConnection): CredentialConnection {
    if (!this.#connections.has(connection.id)) {
      throw new NotFoundError("credential-connection", connection.id);
    }
    this.#connections.set(connection.id, connection);
    return connection;
  }
}

export class CredentialConnectionRegistry {
  readonly #store: CredentialConnectionStore;

  constructor(options: { readonly store?: CredentialConnectionStore } = {}) {
    this.#store = options.store ?? new InMemoryCredentialConnectionStore();
  }

  register(connection: CredentialConnection): CredentialConnection {
    return this.#store.createConnection(connection);
  }

  get(id: string): CredentialConnection {
    const connection = this.#store.getConnection(id);
    if (!connection) {
      throw new NotFoundError("credential-connection", id);
    }
    return connection;
  }

  getForScope(id: string, scope: IsolationScope): CredentialConnection {
    const connection = this.get(id);
    const ownerTenantId = connection.owner.tenantId;
    if (ownerTenantId && ownerTenantId !== scope.tenantId) {
      throw new NotFoundError("credential-connection", id);
    }
    return connection;
  }

  list(): readonly CredentialConnection[] {
    return [...this.#store.listConnections()].sort((left, right) => left.id.localeCompare(right.id));
  }

  listByProvider(providerId: string): readonly CredentialConnection[] {
    return this.list().filter((connection) => connection.providerId === providerId);
  }

  save(connection: CredentialConnection): CredentialConnection {
    return this.#store.saveConnection(connection);
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
    return this.#store.saveConnection(updated);
  }
}
