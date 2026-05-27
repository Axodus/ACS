export type AcsSecretType = "cex-api-key" | "cex-api-secret" | "oauth-token" | "webhook-secret";

export interface AcsSecretStorage {
  storeSecret(input: {
    readonly tenantId?: string;
    readonly wallet?: string;
    readonly provider: string;
    readonly secretType: AcsSecretType;
    readonly value: string;
  }): Promise<{ readonly secretRef: string }>;

  readSecret(input: {
    readonly secretRef: string;
    readonly purpose: string;
  }): Promise<{ readonly value: string }>;

  revokeSecret(input: {
    readonly secretRef: string;
    readonly reason: string;
  }): Promise<{ readonly revoked: boolean }>;
}

export class MockAcsSecretStorage implements AcsSecretStorage {
  readonly #refs = new Map<string, { readonly revoked: boolean }>();

  async storeSecret(input: {
    readonly tenantId?: string;
    readonly wallet?: string;
    readonly provider: string;
    readonly secretType: AcsSecretType;
    readonly value: string;
  }): Promise<{ readonly secretRef: string }> {
    if (!input.value) {
      throw new Error("secret value is required");
    }

    const secretRef = [
      "secretref",
      input.provider.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
      input.secretType,
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10),
    ].join("_");

    this.#refs.set(secretRef, { revoked: false });
    return { secretRef };
  }

  async readSecret(input: { readonly secretRef: string; readonly purpose: string }): Promise<{ readonly value: string }> {
    const record = this.#refs.get(input.secretRef);
    if (!record) {
      throw new Error(`unknown secretRef: ${input.secretRef}`);
    }

    if (record.revoked) {
      throw new Error(`secretRef revoked: ${input.secretRef}`);
    }

    if (!input.purpose) {
      throw new Error("secret read purpose is required");
    }

    return { value: "[mock-secret-redacted]" };
  }

  async revokeSecret(input: { readonly secretRef: string; readonly reason: string }): Promise<{ readonly revoked: boolean }> {
    const record = this.#refs.get(input.secretRef);
    if (!record) {
      return { revoked: false };
    }

    if (!input.reason) {
      throw new Error("secret revoke reason is required");
    }

    this.#refs.set(input.secretRef, { revoked: true });
    return { revoked: true };
  }
}
