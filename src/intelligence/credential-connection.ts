export type CredentialConnectionType =
  | "managed"
  | "api-key"
  | "oauth"
  | "subscription"
  | "service-account"
  | "local-runner";

export type CredentialConnectionStatus =
  | "pending"
  | "configured"
  | "valid"
  | "invalid"
  | "active"
  | "degraded"
  | "expired"
  | "revoked"
  | "unsupported"
  | "unavailable"
  | "requires-authentication";

export interface CredentialConnectionOwner {
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly userId?: string;
}

export interface SecretReference {
  readonly id: string;
  readonly backend: string;
  readonly tenantId?: string;
  readonly keyVersion?: string;
  readonly purpose?: string;
  readonly createdAt: number;
}

export interface CredentialConnection {
  readonly id: string;
  readonly providerId: string;
  readonly type: CredentialConnectionType;
  readonly status: CredentialConnectionStatus;
  readonly owner: CredentialConnectionOwner;
  readonly scopes: readonly string[];
  readonly secretRef?: SecretReference;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastVerifiedAt?: number;
  readonly expiresAt?: number;
}

export interface CredentialStatus {
  readonly connectionId: string;
  readonly status: CredentialConnectionStatus;
  readonly reason?: string;
  readonly lastVerifiedAt?: number;
}

export interface CredentialLease {
  readonly connectionId: string;
  readonly providerId: string;
  readonly type: CredentialConnectionType;
  readonly purpose: string;
  readonly tenantId?: string;
  readonly secretRef?: SecretReference;
  readonly expiresAt: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface CredentialProvider {
  validate(connectionId: string): Promise<CredentialStatus>;
  resolve(connectionId: string, purpose: string): Promise<CredentialLease>;
  refresh(connectionId: string): Promise<CredentialStatus>;
  revoke(connectionId: string): Promise<void>;
}
