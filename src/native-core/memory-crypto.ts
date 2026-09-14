import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { ACS_NATIVE_SCHEMA_VERSION, NativeContractValidationError, sha256Hex } from "./primitives.js";
import type { MemoryRecordRefV1, MemoryPolicyRevisionRefV1 } from "./memory.js";

export interface MemoryCryptoContextV1 {
  readonly tenant_id: string;
  readonly memory_ref: MemoryRecordRefV1;
  readonly policy_ref: MemoryPolicyRevisionRefV1;
  readonly purpose: "acs.memory.content";
}

export interface ProtectedMemoryContentV1 {
  readonly ciphertext: string;
  readonly encryption_backend: string;
  readonly encryption_key_ref: string;
  readonly encryption_key_version: string;
  readonly cipher_suite: string;
  readonly encryption_context_digest: string;
}

export interface MemoryCryptoProviderV1 {
  readonly descriptor: {
    readonly backend: string;
    readonly productionEligible: boolean;
    readonly deterministicTestOnly: boolean;
  };
  protect(input: { readonly plaintext: string; readonly context: MemoryCryptoContextV1 }): Promise<ProtectedMemoryContentV1>;
  unprotect(input: { readonly protected: ProtectedMemoryContentV1; readonly context: MemoryCryptoContextV1 }): Promise<string>;
}

export class MemoryCryptoUnavailableError extends Error {
  readonly code = "ACS_MEMORY_CRYPTO_UNAVAILABLE";
  constructor() {
    super("a configured Memory cryptographic provider is required for content persistence");
    this.name = "MemoryCryptoUnavailableError";
  }
}

export function memoryEncryptionContextDigestV1(context: MemoryCryptoContextV1): string {
  return sha256Hex(JSON.stringify({
    schema_version: ACS_NATIVE_SCHEMA_VERSION,
    tenant_id: context.tenant_id,
    memory_id: context.memory_ref.memory_id,
    memory_fingerprint: context.memory_ref.fingerprint,
    policy_id: context.policy_ref.ref.entity_id,
    policy_revision: context.policy_ref.ref.revision,
    policy_fingerprint: context.policy_ref.ref.fingerprint,
    purpose: context.purpose,
  }));
}

function aad(context: MemoryCryptoContextV1): Buffer {
  return Buffer.from(memoryEncryptionContextDigestV1(context), "utf8");
}

/** Test harness only. It is deliberately not production eligible. */
export class DeterministicTestMemoryCryptoProviderV1 implements MemoryCryptoProviderV1 {
  readonly descriptor = {
    backend: "deterministic-test-aes-256-gcm",
    productionEligible: false,
    deterministicTestOnly: true,
  } as const;
  readonly #key: Buffer;

  constructor(seed = "acs-memory-test-provider") {
    this.#key = createHash("sha256").update(seed).digest();
  }

  async protect(input: { readonly plaintext: string; readonly context: MemoryCryptoContextV1 }): Promise<ProtectedMemoryContentV1> {
    if (!input.plaintext) throw new NativeContractValidationError("Memory crypto validation failed", [{ path: "plaintext", code: "REQUIRED_STRING", message: "Memory plaintext is required" }]);
    const digest = memoryEncryptionContextDigestV1(input.context);
    const iv = createHash("sha256").update(digest + ":" + sha256Hex(input.plaintext)).digest().subarray(0, 12);
    const cipher = createCipheriv("aes-256-gcm", this.#key, iv);
    cipher.setAAD(aad(input.context));
    const ciphertext = Buffer.concat([cipher.update(input.plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      ciphertext: Buffer.concat([iv, tag, ciphertext]).toString("base64"),
      encryption_backend: this.descriptor.backend,
      encryption_key_ref: "test-key:acs-memory",
      encryption_key_version: "1",
      cipher_suite: "AES-256-GCM",
      encryption_context_digest: digest,
    };
  }

  async unprotect(input: { readonly protected: ProtectedMemoryContentV1; readonly context: MemoryCryptoContextV1 }): Promise<string> {
    const expected = memoryEncryptionContextDigestV1(input.context);
    if (input.protected.encryption_context_digest !== expected) {
      throw new NativeContractValidationError("Memory crypto context mismatch", [{ path: "encryption_context_digest", code: "MEMORY_CRYPTO_CONTEXT_MISMATCH", message: "Ciphertext cannot be moved across Memory context" }]);
    }
    const packed = Buffer.from(input.protected.ciphertext, "base64");
    if (packed.length < 29) throw new NativeContractValidationError("Memory ciphertext is invalid", [{ path: "ciphertext", code: "INVALID_CIPHERTEXT", message: "Ciphertext is malformed" }]);
    const decipher = createDecipheriv("aes-256-gcm", this.#key, packed.subarray(0, 12));
    decipher.setAAD(aad(input.context));
    decipher.setAuthTag(packed.subarray(12, 28));
    return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8");
  }
}
