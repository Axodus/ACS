import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SecretReference } from "./credential-connection.js";

export interface SecretStore {
  put(input: { providerId: string; purpose: string; value: string; keyVersion?: string }): Promise<SecretReference>;
  get(secretRef: SecretReference): Promise<string>;
  delete(secretRef: SecretReference): Promise<boolean>;
  exists(secretRef: SecretReference): Promise<boolean>;
}

export class InMemorySecretStore implements SecretStore {
  readonly #backend = "memory";
  readonly #values = new Map<string, string>();

  async put(input: { providerId: string; purpose: string; value: string; keyVersion?: string }): Promise<SecretReference> {
    if (!input.value) {
      throw new Error("secret value is required");
    }
    const id = "secret_" + randomUUID();
    this.#values.set(id, input.value);
    return {
      id,
      backend: this.#backend,
      ...(input.keyVersion ? { keyVersion: input.keyVersion } : {}),
      purpose: input.purpose,
      createdAt: Date.now(),
    };
  }

  async get(secretRef: SecretReference): Promise<string> {
    const value = this.#values.get(secretRef.id);
    if (!value) {
      throw new Error("secret reference not found");
    }
    return value;
  }

  async delete(secretRef: SecretReference): Promise<boolean> {
    return this.#values.delete(secretRef.id);
  }

  async exists(secretRef: SecretReference): Promise<boolean> {
    return this.#values.has(secretRef.id);
  }
}

export class FileSystemSecretStore implements SecretStore {
  readonly #root: string;
  readonly #backend = "filesystem";

  constructor(root: string) {
    this.#root = root;
  }

  async put(input: { providerId: string; purpose: string; value: string; keyVersion?: string }): Promise<SecretReference> {
    if (!input.value) {
      throw new Error("secret value is required");
    }
    const id = "secret_" + randomUUID();
    await mkdir(this.#root, { recursive: true, mode: 0o700 });
    await writeFile(join(this.#root, id), input.value, { encoding: "utf8", mode: 0o600 });
    return {
      id,
      backend: this.#backend,
      ...(input.keyVersion ? { keyVersion: input.keyVersion } : {}),
      purpose: input.purpose,
      createdAt: Date.now(),
    };
  }

  async get(secretRef: SecretReference): Promise<string> {
    return await readFile(join(this.#root, secretRef.id), "utf8");
  }

  async delete(secretRef: SecretReference): Promise<boolean> {
    try {
      await unlink(join(this.#root, secretRef.id));
      return true;
    } catch {
      return false;
    }
  }

  async exists(secretRef: SecretReference): Promise<boolean> {
    try {
      await stat(join(this.#root, secretRef.id));
      return true;
    } catch {
      return false;
    }
  }
}
