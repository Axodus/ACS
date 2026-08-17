import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AcsError } from "../errors.js";
import type { SecretReference } from "./credential-connection.js";

export type SecretStatus = "active" | "revoked";
export type SecretProviderMultiInstance =
  | "not_applicable"
  | "not_proven"
  | "external_provider_managed";

export interface SecretProviderDescriptor {
  readonly provider: string;
  readonly productionOriented: boolean;
  readonly materialStorage: "memory" | "plaintext_filesystem" | "external_managed";
  readonly metadataDurability: "process_local" | "single_node_durable" | "shared_durable" | "external_managed";
  readonly multiInstance: SecretProviderMultiInstance;
}

export interface SecretAccessContext {
  readonly tenantId?: string;
  readonly actor?: string;
  readonly reason?: string;
  readonly correlationId?: string;
  readonly at?: number;
}

export interface PutSecretInput extends SecretAccessContext {
  readonly tenantId?: string;
  readonly providerId: string;
  readonly purpose: string;
  readonly value: string;
  readonly keyVersion?: string;
}

export interface RotateSecretInput extends SecretAccessContext {
  readonly value: string;
}

export interface SecretMetadata {
  readonly secretId: string;
  readonly tenantId?: string;
  readonly providerId: string;
  readonly purpose: string;
  readonly backend: string;
  readonly version: number;
  readonly status: SecretStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly rotatedAt?: number;
  readonly revokedAt?: number;
}

export interface SecretStore {
  readonly descriptor: SecretProviderDescriptor;
  put(input: PutSecretInput): Promise<SecretReference>;
  get(secretRef: SecretReference, access?: SecretAccessContext): Promise<string>;
  describe(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata>;
  rotate(secretRef: SecretReference, input: RotateSecretInput): Promise<SecretReference>;
  revoke(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata>;
  delete(secretRef: SecretReference, access?: SecretAccessContext): Promise<boolean>;
  exists(secretRef: SecretReference, access?: SecretAccessContext): Promise<boolean>;
  health(): Promise<{
    readonly reachable: boolean;
    readonly provider: string;
    readonly authenticated?: boolean;
    readonly secureTransport?: boolean;
    readonly reasonCode?: string;
  }>;
}

export class SecretInputError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_SECRET_INVALID_INPUT");
  }
}

export class SecretNotFoundError extends AcsError {
  constructor(secretId: string) {
    super("secret reference not found: " + secretId, "ACS_SECRET_NOT_FOUND");
  }
}

export class SecretTenantMismatchError extends AcsError {
  constructor() {
    super("secret reference is not available for this tenant", "ACS_SECRET_TENANT_MISMATCH");
  }
}

export class SecretRevokedError extends AcsError {
  constructor(secretId: string) {
    super("secret reference is revoked: " + secretId, "ACS_SECRET_REVOKED");
  }
}

export class SecretProviderUnavailableError extends AcsError {
  constructor(provider: string, operation: string) {
    super("secret provider " + provider + " is unavailable for " + operation, "ACS_SECRET_PROVIDER_UNAVAILABLE");
  }
}

export class SecretProviderConfigurationError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_SECRET_PROVIDER_CONFIGURATION_INVALID");
  }
}

function assertValue(value: string): void {
  if (!value) throw new SecretInputError("secret value is required");
}

function assertPurpose(purpose: string): void {
  if (!purpose) throw new SecretInputError("secret purpose is required");
}

function assertAccess(secretRef: SecretReference, access?: SecretAccessContext): void {
  if (secretRef.tenantId && access?.tenantId !== secretRef.tenantId) {
    throw new SecretTenantMismatchError();
  }
}

function assertMetadataAccess(metadata: SecretMetadata, access?: SecretAccessContext): void {
  if (metadata.tenantId && access?.tenantId !== metadata.tenantId) {
    throw new SecretTenantMismatchError();
  }
}

function toReference(metadata: SecretMetadata): SecretReference {
  return {
    id: metadata.secretId,
    backend: metadata.backend,
    keyVersion: String(metadata.version),
    purpose: metadata.purpose,
    createdAt: metadata.createdAt,
    ...(metadata.tenantId ? { tenantId: metadata.tenantId } : {}),
  };
}

export class InMemorySecretStore implements SecretStore {
  readonly #backend = "memory";
  readonly descriptor: SecretProviderDescriptor = {
    provider: "memory",
    productionOriented: false,
    materialStorage: "memory",
    metadataDurability: "process_local",
    multiInstance: "not_applicable",
  };
  readonly #values = new Map<string, { value: string; metadata: SecretMetadata }>();

  async put(input: PutSecretInput): Promise<SecretReference> {
    assertValue(input.value);
    assertPurpose(input.purpose);
    const id = "secret_" + randomUUID();
    const now = input.at ?? Date.now();
    const metadata: SecretMetadata = {
      secretId: id,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      providerId: input.providerId,
      purpose: input.purpose,
      backend: this.#backend,
      version: input.keyVersion ? Number(input.keyVersion) || 1 : 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.#values.set(id, { value: input.value, metadata });
    return toReference(metadata);
  }

  async get(secretRef: SecretReference, access?: SecretAccessContext): Promise<string> {
    assertAccess(secretRef, access);
    const record = this.#values.get(secretRef.id);
    if (!record) throw new SecretNotFoundError(secretRef.id);
    assertMetadataAccess(record.metadata, access);
    if (record.metadata.status === "revoked") throw new SecretRevokedError(secretRef.id);
    return record.value;
  }

  async describe(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata> {
    assertAccess(secretRef, access);
    const record = this.#values.get(secretRef.id);
    if (!record) throw new SecretNotFoundError(secretRef.id);
    assertMetadataAccess(record.metadata, access);
    return record.metadata;
  }

  async rotate(secretRef: SecretReference, input: RotateSecretInput): Promise<SecretReference> {
    assertValue(input.value);
    const current = await this.describe(secretRef, input);
    if (current.status === "revoked") throw new SecretRevokedError(secretRef.id);
    const now = input.at ?? Date.now();
    const metadata: SecretMetadata = {
      ...current,
      version: current.version + 1,
      updatedAt: now,
      rotatedAt: now,
    };
    this.#values.set(secretRef.id, { value: input.value, metadata });
    return toReference(metadata);
  }

  async revoke(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata> {
    const current = await this.describe(secretRef, access);
    if (current.status === "revoked") return current;
    const now = access?.at ?? Date.now();
    const metadata: SecretMetadata = {
      ...current,
      status: "revoked",
      updatedAt: now,
      revokedAt: now,
    };
    const record = this.#values.get(secretRef.id)!;
    this.#values.set(secretRef.id, { value: record.value, metadata });
    return metadata;
  }

  async delete(secretRef: SecretReference, access?: SecretAccessContext): Promise<boolean> {
    await this.revoke(secretRef, access);
    return true;
  }

  async exists(secretRef: SecretReference, access?: SecretAccessContext): Promise<boolean> {
    try {
      return (await this.describe(secretRef, access)).status === "active";
    } catch (error) {
      if (error instanceof SecretNotFoundError) return false;
      throw error;
    }
  }

  async health(): Promise<{ readonly reachable: boolean; readonly provider: string }> {
    return { reachable: true, provider: this.descriptor.provider };
  }
}

export class FileSystemSecretStore implements SecretStore {
  readonly #root: string;
  readonly #backend = "filesystem";
  readonly descriptor: SecretProviderDescriptor = {
    provider: "filesystem",
    productionOriented: false,
    materialStorage: "plaintext_filesystem",
    metadataDurability: "process_local",
    multiInstance: "not_proven",
  };
  readonly #metadata = new Map<string, SecretMetadata>();

  constructor(root: string) {
    this.#root = root;
  }

  async put(input: PutSecretInput): Promise<SecretReference> {
    assertValue(input.value);
    assertPurpose(input.purpose);
    const id = "secret_" + randomUUID();
    await mkdir(this.#root, { recursive: true, mode: 0o700 });
    await writeFile(join(this.#root, id), input.value, { encoding: "utf8", mode: 0o600 });
    const now = input.at ?? Date.now();
    const metadata: SecretMetadata = {
      secretId: id,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      providerId: input.providerId,
      purpose: input.purpose,
      backend: this.#backend,
      version: input.keyVersion ? Number(input.keyVersion) || 1 : 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.#metadata.set(id, metadata);
    return toReference(metadata);
  }

  async get(secretRef: SecretReference, access?: SecretAccessContext): Promise<string> {
    assertAccess(secretRef, access);
    const metadata = this.#metadata.get(secretRef.id);
    if (metadata) assertMetadataAccess(metadata, access);
    if (metadata?.status === "revoked") throw new SecretRevokedError(secretRef.id);
    return await readFile(join(this.#root, secretRef.id), "utf8");
  }

  async describe(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata> {
    assertAccess(secretRef, access);
    const metadata = this.#metadata.get(secretRef.id);
    if (metadata) {
      assertMetadataAccess(metadata, access);
      return metadata;
    }
    try {
      const file = await stat(join(this.#root, secretRef.id));
      return {
        secretId: secretRef.id,
        ...(secretRef.tenantId ? { tenantId: secretRef.tenantId } : {}),
        providerId: "unknown",
        purpose: secretRef.purpose ?? "unspecified",
        backend: this.#backend,
        version: Number(secretRef.keyVersion) || 1,
        status: "active",
        createdAt: secretRef.createdAt,
        updatedAt: file.mtimeMs,
      };
    } catch {
      throw new SecretNotFoundError(secretRef.id);
    }
  }

  async rotate(secretRef: SecretReference, input: RotateSecretInput): Promise<SecretReference> {
    assertValue(input.value);
    const current = await this.describe(secretRef, input);
    if (current.status === "revoked") throw new SecretRevokedError(secretRef.id);
    await writeFile(join(this.#root, secretRef.id), input.value, { encoding: "utf8", mode: 0o600 });
    const now = input.at ?? Date.now();
    const metadata: SecretMetadata = {
      ...current,
      version: current.version + 1,
      updatedAt: now,
      rotatedAt: now,
    };
    this.#metadata.set(secretRef.id, metadata);
    return toReference(metadata);
  }

  async revoke(secretRef: SecretReference, access?: SecretAccessContext): Promise<SecretMetadata> {
    const current = await this.describe(secretRef, access);
    try {
      await unlink(join(this.#root, secretRef.id));
    } catch {
      // The logical revocation is still authoritative for this DEV adapter.
    }
    const now = access?.at ?? Date.now();
    const metadata: SecretMetadata = {
      ...current,
      status: "revoked",
      updatedAt: now,
      revokedAt: now,
    };
    this.#metadata.set(secretRef.id, metadata);
    return metadata;
  }

  async delete(secretRef: SecretReference, access?: SecretAccessContext): Promise<boolean> {
    await this.revoke(secretRef, access);
    return true;
  }

  async exists(secretRef: SecretReference, access?: SecretAccessContext): Promise<boolean> {
    try {
      return (await this.describe(secretRef, access)).status === "active";
    } catch (error) {
      if (!(error instanceof SecretNotFoundError)) throw error;
      return false;
    }
  }

  async health(): Promise<{ readonly reachable: boolean; readonly provider: string }> {
    try {
      await mkdir(this.#root, { recursive: true, mode: 0o700 });
      await stat(this.#root);
      return { reachable: true, provider: this.descriptor.provider };
    } catch {
      return { reachable: false, provider: this.descriptor.provider };
    }
  }
}
