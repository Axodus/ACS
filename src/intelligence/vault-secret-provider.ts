import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { AuditService } from "../control-plane/audit-service.js";
import { DuplicateRegistrationError, NotFoundError } from "../errors.js";
import type { CredentialConnection, SecretReference } from "./credential-connection.js";
import type { CredentialConnectionStore } from "./credential-registry.js";
import {
  SecretInputError,
  SecretNotFoundError,
  SecretProviderConfigurationError,
  SecretProviderUnavailableError,
  SecretRevokedError,
  SecretTenantMismatchError,
  type PutSecretInput,
  type RotateSecretInput,
  type SecretAccessContext,
  type SecretMetadata,
  type SecretProviderDescriptor,
  type SecretStore,
} from "./secret-store.js";

export interface SecretMetadataStore {
  create(metadata: SecretMetadata): SecretMetadata | Promise<SecretMetadata>;
  get(secretId: string): SecretMetadata | undefined | Promise<SecretMetadata | undefined>;
  list(): readonly SecretMetadata[] | Promise<readonly SecretMetadata[]>;
  save(metadata: SecretMetadata, expectedVersion?: number): SecretMetadata | Promise<SecretMetadata>;
}

export class InMemorySecretMetadataStore implements SecretMetadataStore {
  readonly #metadata = new Map<string, SecretMetadata>();

  create(metadata: SecretMetadata): SecretMetadata {
    if (this.#metadata.has(metadata.secretId)) {
      throw new DuplicateRegistrationError("secret-metadata", metadata.secretId);
    }
    this.#metadata.set(metadata.secretId, metadata);
    return metadata;
  }

  get(secretId: string): SecretMetadata | undefined {
    return this.#metadata.get(secretId);
  }

  list(): readonly SecretMetadata[] {
    return [...this.#metadata.values()].sort((left, right) => left.secretId.localeCompare(right.secretId));
  }

  save(metadata: SecretMetadata): SecretMetadata {
    if (!this.#metadata.has(metadata.secretId)) {
      throw new NotFoundError("secret-metadata", metadata.secretId);
    }
    this.#metadata.set(metadata.secretId, metadata);
    return metadata;
  }
}

interface SecretMetadataRow {
  readonly secret_id: string;
  readonly tenant_id: string;
  readonly provider_id: string;
  readonly purpose: string;
  readonly backend: string;
  readonly version: number;
  readonly status: string;
  readonly created_at: number;
  readonly updated_at: number;
  readonly rotated_at: number | null;
  readonly revoked_at: number | null;
}

interface CredentialConnectionRow {
  readonly id: string;
  readonly payload_json: string;
}

function rowToMetadata(row: SecretMetadataRow): SecretMetadata {
  return {
    secretId: row.secret_id,
    tenantId: row.tenant_id,
    providerId: row.provider_id,
    purpose: row.purpose,
    backend: row.backend,
    version: row.version,
    status: row.status === "revoked" ? "revoked" : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.rotated_at === null ? {} : { rotatedAt: row.rotated_at }),
    ...(row.revoked_at === null ? {} : { revokedAt: row.revoked_at }),
  };
}

export class SqliteSecretCatalog implements SecretMetadataStore, CredentialConnectionStore {
  readonly #database: DatabaseSync;

  constructor(options: { readonly filePath: string }) {
    mkdirSync(dirname(options.filePath), { recursive: true, mode: 0o700 });
    this.#database = new DatabaseSync(options.filePath);
    this.#database.exec("PRAGMA journal_mode = WAL");
    this.#database.exec("PRAGMA foreign_keys = ON");
    this.#database.exec("PRAGMA busy_timeout = 5000");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS secret_metadata (
        secret_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        purpose TEXT NOT NULL,
        backend TEXT NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        rotated_at INTEGER,
        revoked_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS secret_metadata_tenant_idx
        ON secret_metadata (tenant_id, status, secret_id);
      CREATE TABLE IF NOT EXISTS credential_connections (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS credential_connections_tenant_idx
        ON credential_connections (tenant_id, id);
    `);
  }

  create(metadata: SecretMetadata): SecretMetadata {
    return this.#createMetadata(metadata);
  }

  get(secretId: string): SecretMetadata | undefined {
    const metadata = this.#database.prepare(
      "SELECT * FROM secret_metadata WHERE secret_id = ?",
    ).get(secretId) as unknown as SecretMetadataRow | undefined;
    return metadata ? rowToMetadata(metadata) : undefined;
  }

  list(): readonly SecretMetadata[] {
    const metadata = this.#database.prepare(
      "SELECT * FROM secret_metadata ORDER BY secret_id",
    ).all() as unknown as SecretMetadataRow[];
    return metadata.map(rowToMetadata);
  }

  createConnection(connection: CredentialConnection): CredentialConnection {
    return this.#createConnection(connection);
  }

  getConnection(id: string): CredentialConnection | undefined {
    const row = this.#database.prepare(
      "SELECT id, payload_json FROM credential_connections WHERE id = ?",
    ).get(id) as unknown as CredentialConnectionRow | undefined;
    return row ? JSON.parse(row.payload_json) as CredentialConnection : undefined;
  }

  listConnections(): readonly CredentialConnection[] {
    const rows = this.#database.prepare(
      "SELECT id, payload_json FROM credential_connections ORDER BY id",
    ).all() as unknown as CredentialConnectionRow[];
    return rows.map((row) => JSON.parse(row.payload_json) as CredentialConnection);
  }

  save(metadata: SecretMetadata): SecretMetadata {
    return this.#saveMetadata(metadata);
  }

  saveConnection(value: CredentialConnection): CredentialConnection {
    const result = this.#database.prepare(
      "UPDATE credential_connections SET tenant_id = ?, payload_json = ? WHERE id = ?",
    ).run(value.owner.tenantId ?? null, JSON.stringify(value), value.id);
    if (result.changes === 0) throw new NotFoundError("credential-connection", value.id);
    return value;
  }

  close(): void {
    this.#database.close();
  }

  #createMetadata(metadata: SecretMetadata): SecretMetadata {
    try {
      this.#database.prepare(`
        INSERT INTO secret_metadata (
          secret_id, tenant_id, provider_id, purpose, backend, version, status,
          created_at, updated_at, rotated_at, revoked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        metadata.secretId,
        metadata.tenantId ?? "",
        metadata.providerId,
        metadata.purpose,
        metadata.backend,
        metadata.version,
        metadata.status,
        metadata.createdAt,
        metadata.updatedAt,
        metadata.rotatedAt ?? null,
        metadata.revokedAt ?? null,
      );
      return metadata;
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed")) {
        throw new DuplicateRegistrationError("secret-metadata", metadata.secretId);
      }
      throw error;
    }
  }

  #saveMetadata(metadata: SecretMetadata): SecretMetadata {
    const result = this.#database.prepare(`
      UPDATE secret_metadata
      SET tenant_id = ?, provider_id = ?, purpose = ?, backend = ?, version = ?,
          status = ?, created_at = ?, updated_at = ?, rotated_at = ?, revoked_at = ?
      WHERE secret_id = ?
    `).run(
      metadata.tenantId ?? "",
      metadata.providerId,
      metadata.purpose,
      metadata.backend,
      metadata.version,
      metadata.status,
      metadata.createdAt,
      metadata.updatedAt,
      metadata.rotatedAt ?? null,
      metadata.revokedAt ?? null,
      metadata.secretId,
    );
    if (result.changes === 0) throw new NotFoundError("secret-metadata", metadata.secretId);
    return metadata;
  }

  #createConnection(connection: CredentialConnection): CredentialConnection {
    try {
      this.#database.prepare(
        "INSERT INTO credential_connections (id, tenant_id, payload_json) VALUES (?, ?, ?)",
      ).run(connection.id, connection.owner.tenantId ?? null, JSON.stringify(connection));
      return connection;
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed")) {
        throw new DuplicateRegistrationError("credential-connection", connection.id);
      }
      throw error;
    }
  }
}

export interface VaultSecretTransportResponse {
  readonly status: number;
  readonly body?: unknown;
}

export interface VaultSecretTransport {
  request(input: {
    readonly method: "GET" | "POST" | "DELETE";
    readonly path: string;
    readonly body?: unknown;
  }): Promise<VaultSecretTransportResponse>;
}

export class FetchVaultSecretTransport implements VaultSecretTransport {
  readonly #baseUrl: string;
  readonly #token: string;
  readonly #namespace: string | undefined;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly baseUrl: string;
    readonly token: string;
    readonly namespace?: string;
    readonly timeoutMs?: number;
    readonly requireHttps?: boolean;
  }) {
    if (!options.baseUrl) throw new SecretProviderConfigurationError("Vault base URL is required");
    if (!options.token) throw new SecretProviderConfigurationError("Vault authentication token is required");
    let baseUrl: URL;
    try {
      baseUrl = new URL(options.baseUrl);
    } catch {
      throw new SecretProviderConfigurationError("Vault base URL must be absolute");
    }
    if ((options.requireHttps ?? true) && baseUrl.protocol !== "https:") {
      throw new SecretProviderConfigurationError("Vault base URL must use HTTPS");
    }
    if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
      throw new SecretProviderConfigurationError("Vault base URL must use HTTP or HTTPS");
    }
    this.#baseUrl = baseUrl.toString().replace(/\/+$/, "");
    this.#token = options.token;
    this.#namespace = options.namespace;
    this.#timeoutMs = positiveTimeout(options.timeoutMs ?? 5_000);
  }

  async request(input: {
    readonly method: "GET" | "POST" | "DELETE";
    readonly path: string;
    readonly body?: unknown;
  }): Promise<VaultSecretTransportResponse> {
    let response: Response;
    try {
      response = await fetch(this.#baseUrl + input.path, {
        method: input.method,
        headers: {
          "x-vault-token": this.#token,
          ...(this.#namespace ? { "x-vault-namespace": this.#namespace } : {}),
          ...(input.body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      throw new SecretProviderUnavailableError("vault-kv-v2", input.method.toLowerCase());
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    return { status: response.status, ...(body === undefined ? {} : { body }) };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function encodePath(value: string): string {
  return value.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

function toReference(metadata: SecretMetadata): SecretReference {
  return {
    id: metadata.secretId,
    backend: metadata.backend,
    ...(metadata.tenantId ? { tenantId: metadata.tenantId } : {}),
    keyVersion: String(metadata.version),
    purpose: metadata.purpose,
    createdAt: metadata.createdAt,
  };
}

export class VaultSecretProvider implements SecretStore {
  readonly descriptor: SecretProviderDescriptor;
  readonly #transport: VaultSecretTransport;
  readonly #metadata: SecretMetadataStore;
  readonly #auditService: AuditService | undefined;
  readonly #mount: string;
  readonly #pathPrefix: string;
  readonly #secureTransport: boolean;

  constructor(options: {
    readonly metadataStore: SecretMetadataStore;
    readonly transport?: VaultSecretTransport;
    readonly baseUrl?: string;
    readonly token?: string;
    readonly namespace?: string;
    readonly timeoutMs?: number;
    readonly requireHttps?: boolean;
    readonly secureTransport?: boolean;
    readonly mount?: string;
    readonly pathPrefix?: string;
    readonly metadataDurability?: SecretProviderDescriptor["metadataDurability"];
    readonly auditService?: AuditService;
  }) {
    this.descriptor = {
      provider: "vault-kv-v2",
      productionOriented: true,
      materialStorage: "external_managed",
      metadataDurability: options.metadataDurability ?? "single_node_durable",
      multiInstance: "external_provider_managed",
    };
    this.#metadata = options.metadataStore;
    this.#mount = encodePath(options.mount ?? "secret");
    this.#pathPrefix = encodePath(options.pathPrefix ?? "acs");
    this.#auditService = options.auditService;
    this.#secureTransport = options.secureTransport
      ?? Boolean(options.baseUrl && new URL(options.baseUrl).protocol === "https:");
    this.#transport = options.transport ?? new FetchVaultSecretTransport({
      baseUrl: options.baseUrl ?? "",
      token: options.token ?? "",
      ...(options.namespace ? { namespace: options.namespace } : {}),
      ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
      requireHttps: options.requireHttps,
    });
  }

  async put(input: PutSecretInput): Promise<SecretReference> {
    if (!input.tenantId) throw new SecretInputError("tenantId is required for Vault secrets");
    if (!input.providerId) throw new SecretInputError("secret providerId is required");
    if (!input.purpose) throw new SecretInputError("secret purpose is required");
    if (!input.value) throw new SecretInputError("secret value is required");
    const secretId = "secret_" + randomUUID();
    const response = await this.#transport.request({
      method: "POST",
      path: this.#dataPath(input.tenantId, secretId),
      body: { data: { value: input.value }, options: { cas: 0 } },
    });
    const version = this.#readWrittenVersion(response, "put");
    const now = input.at ?? Date.now();
    let metadata: SecretMetadata;
    try {
      metadata = await this.#metadata.create({
        secretId,
        tenantId: input.tenantId,
        providerId: input.providerId,
        purpose: input.purpose,
        backend: this.descriptor.provider,
        version,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      try {
        await this.#transport.request({ method: "DELETE", path: this.#metadataPath(input.tenantId, secretId) });
      } catch {
        // Preserve the authoritative catalog failure; provider cleanup is best effort.
      }
      throw error;
    }
    this.#recordAudit("secret.created", metadata, input);
    return toReference(metadata);
  }

  async get(secretRef: SecretReference, access?: SecretAccessContext): Promise<string> {
    const metadata = await this.#requireMetadata(secretRef, access);
    if (metadata.status === "revoked") throw new SecretRevokedError(secretRef.id);
    const response = await this.#transport.request({
      method: "GET",
      path: this.#dataPath(metadata.tenantId!, metadata.secretId) + "?version=" + metadata.version,
    });
    if (response.status === 404) throw new SecretNotFoundError(secretRef.id);
    if (response.status < 200 || response.status >= 300) {
      throw new SecretProviderUnavailableError(this.descriptor.provider, "resolve");
    }
    const value = isRecord(response.body)
      && isRecord(response.body.data)
      && isRecord(response.body.data.data)
      ? response.body.data.data.value
      : undefined;
    if (typeof value !== "string" || !value) {
      throw new SecretProviderUnavailableError(this.descriptor.provider, "resolve");
    }
    return value;
  }

  async describe(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata> {
    return this.#requireMetadata(secretRef, access);
  }

  async rotate(secretRef: SecretReference, input: RotateSecretInput): Promise<SecretReference> {
    if (!input.value) throw new SecretInputError("secret value is required");
    const current = await this.#requireMetadata(secretRef, input);
    if (current.status === "revoked") throw new SecretRevokedError(secretRef.id);
    const response = await this.#transport.request({
      method: "POST",
      path: this.#dataPath(current.tenantId!, current.secretId),
      body: { data: { value: input.value }, options: { cas: current.version } },
    });
    const version = this.#readWrittenVersion(response, "rotate");
    const now = input.at ?? Date.now();
    let metadata: SecretMetadata;
    try {
      metadata = await this.#metadata.save({
        ...current,
        version,
        updatedAt: now,
        rotatedAt: now,
      }, current.version);
    } catch (error) {
      try {
        await this.#transport.request({
          method: "POST",
          path: this.#deleteVersionsPath(current.tenantId!, current.secretId),
          body: { versions: [version] },
        });
      } catch {
        // Preserve the authoritative catalog failure; provider cleanup is best effort.
      }
      throw error;
    }
    this.#recordAudit("secret.rotated", metadata, input);
    return toReference(metadata);
  }

  async revoke(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata> {
    const current = await this.#requireMetadata(secretRef, access);
    if (current.status === "revoked") return current;
    const versions = Array.from({ length: current.version }, (_, index) => index + 1);
    const response = await this.#transport.request({
      method: "POST",
      path: this.#deleteVersionsPath(current.tenantId!, current.secretId),
      body: { versions },
    });
    if (response.status < 200 || response.status >= 300) {
      throw new SecretProviderUnavailableError(this.descriptor.provider, "revoke");
    }
    const now = access?.at ?? Date.now();
    const metadata = await this.#metadata.save({
      ...current,
      status: "revoked",
      updatedAt: now,
      revokedAt: now,
    }, current.version);
    this.#recordAudit("secret.revoked", metadata, access);
    return metadata;
  }

  async delete(secretRef: SecretReference, access?: SecretAccessContext): Promise<boolean> {
    await this.revoke(secretRef, access);
    return true;
  }

  async exists(secretRef: SecretReference, access?: SecretAccessContext): Promise<boolean> {
    try {
      const metadata = await this.#requireMetadata(secretRef, access);
      if (metadata.status !== "active") return false;
      const response = await this.#transport.request({
        method: "GET",
        path: this.#metadataPath(metadata.tenantId!, metadata.secretId),
      });
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      if (error instanceof SecretNotFoundError) return false;
      throw error;
    }
  }

  async health(): Promise<{
    readonly reachable: boolean;
    readonly provider: string;
    readonly authenticated: boolean;
    readonly secureTransport: boolean;
    readonly reasonCode?: string;
  }> {
    try {
      const response = await this.#transport.request({ method: "GET", path: "/v1/sys/health" });
      const reachable = [200, 429, 472, 473].includes(response.status);
      if (!reachable) {
        return {
          reachable: false,
          authenticated: false,
          secureTransport: this.#secureTransport,
          provider: this.descriptor.provider,
          reasonCode: "SECRET_PROVIDER_UNREACHABLE",
        };
      }
      const identity = await this.#transport.request({ method: "GET", path: "/v1/auth/token/lookup-self" });
      const authenticated = identity.status >= 200 && identity.status < 300;
      return {
        reachable,
        authenticated,
        secureTransport: this.#secureTransport,
        provider: this.descriptor.provider,
        ...(!authenticated ? { reasonCode: "SECRET_PROVIDER_AUTHENTICATION_FAILED" } : {}),
      };
    } catch {
      return {
        reachable: false,
        authenticated: false,
        secureTransport: this.#secureTransport,
        provider: this.descriptor.provider,
        reasonCode: "SECRET_PROVIDER_UNREACHABLE",
      };
    }
  }

  async #requireMetadata(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata> {
    const metadata = await this.#metadata.get(secretRef.id);
    if (!metadata) throw new SecretNotFoundError(secretRef.id);
    if (!metadata.tenantId || access?.tenantId !== metadata.tenantId) {
      this.#recordDenied(metadata, access);
      throw new SecretTenantMismatchError();
    }
    if (secretRef.tenantId && secretRef.tenantId !== metadata.tenantId) {
      this.#recordDenied(metadata, access);
      throw new SecretTenantMismatchError();
    }
    return metadata;
  }

  #readWrittenVersion(response: VaultSecretTransportResponse, operation: string): number {
    if (response.status < 200 || response.status >= 300) {
      throw new SecretProviderUnavailableError(this.descriptor.provider, operation);
    }
    const version = isRecord(response.body) && isRecord(response.body.data)
      ? response.body.data.version
      : undefined;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
      throw new SecretProviderUnavailableError(this.descriptor.provider, operation);
    }
    return version;
  }

  #dataPath(tenantId: string, secretId: string): string {
    return "/v1/" + this.#mount + "/data/" + this.#pathPrefix + "/" + encodeURIComponent(tenantId) + "/" + encodeURIComponent(secretId);
  }

  #metadataPath(tenantId: string, secretId: string): string {
    return "/v1/" + this.#mount + "/metadata/" + this.#pathPrefix + "/" + encodeURIComponent(tenantId) + "/" + encodeURIComponent(secretId);
  }

  #deleteVersionsPath(tenantId: string, secretId: string): string {
    return "/v1/" + this.#mount + "/delete/" + this.#pathPrefix + "/" + encodeURIComponent(tenantId) + "/" + encodeURIComponent(secretId);
  }

  #recordAudit(eventType: string, metadata: SecretMetadata, access?: SecretAccessContext): void {
    this.#auditService?.recordEvent({
      eventType,
      correlationId: access?.correlationId ?? "secret:" + metadata.secretId + ":v" + metadata.version,
      tenantId: metadata.tenantId,
      actor: access?.actor,
      timestamp: access?.at,
      metadata: {
        secretId: metadata.secretId,
        providerId: metadata.providerId,
        backend: metadata.backend,
        version: metadata.version,
        status: metadata.status,
        purpose: metadata.purpose,
        ...(access?.reason ? { reason: access.reason } : {}),
      },
    });
  }

  #recordDenied(metadata: SecretMetadata, access?: SecretAccessContext): void {
    this.#auditService?.recordEvent({
      eventType: "secret.resolution_denied",
      correlationId: access?.correlationId ?? "secret:" + metadata.secretId + ":denied",
      tenantId: access?.tenantId,
      actor: access?.actor,
      timestamp: access?.at,
      metadata: {
        secretId: metadata.secretId,
        providerId: metadata.providerId,
        reason: "tenant_scope_mismatch",
      },
    });
  }
}

function positiveTimeout(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new SecretProviderConfigurationError("Vault timeout must be a positive safe integer");
  }
  return value;
}
