import type { CredentialLease, CredentialProvider } from "../intelligence/credential-connection.js";
import type { AsyncNativeCoreRepository, NativeIntegrationChannelLineage, NativeIntegrationConnectionLineage } from "../control-plane/shared-state/native-core-durable.js";
import {
  ACS_NATIVE_SCHEMA_VERSION,
  assertNoSecretMaterial,
  assertValid,
  freezeNative,
  NativeContractValidationError,
  requireSafeInteger,
  requireSha256,
  requireString,
  sha256Hex,
  type ValidationIssue,
} from "./primitives.js";
import { validateIntegrationRevisionRef, type IntegrationRevisionRef } from "./integration.js";

export class IntegrationIngressError extends Error {
  constructor(readonly code: "AUTHENTICATION_FAILED" | "CHANNEL_UNAVAILABLE" | "CONNECTION_STALE" | "CREDENTIAL_UNAVAILABLE" | "TENANT_MISMATCH", message: string) {
    super(message);
    this.name = "IntegrationIngressError";
  }
}

export interface AuthenticatedIntegrationIngressReferenceV1 {
  readonly schema_version: typeof ACS_NATIVE_SCHEMA_VERSION;
  readonly ingress_ref: string;
  readonly tenant_id: string;
  readonly channel_revision_ref: IntegrationRevisionRef;
  readonly connection_revision_ref: IntegrationRevisionRef;
  readonly credential_ref: string;
  readonly credential_version?: string;
  readonly authentication_method: string;
  readonly payload_digest: string;
  readonly correlation_id: string;
  readonly authenticated_at: number;
  readonly provider_event_id?: string;
}

export interface IntegrationIngressAuthenticator {
  authenticate(input: {
    readonly payload: Uint8Array;
    readonly headers: Readonly<Record<string, string>>;
    readonly channel: NativeIntegrationChannelLineage["revisions"][number];
    readonly connection: NativeIntegrationConnectionLineage["revisions"][number];
    readonly credentialLease: CredentialLease;
  }): Promise<{ readonly authentication_method: string; readonly authenticated_at: number; readonly provider_event_id?: string }>;
}

function unavailable(code: IntegrationIngressError["code"], message: string): never {
  throw new IntegrationIngressError(code, message);
}

export function validateAuthenticatedIntegrationIngressReferenceV1(value: unknown): AuthenticatedIntegrationIngressReferenceV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NativeContractValidationError("invalid authenticated integration ingress reference", [{ path: "$", code: "INVALID_OBJECT", message: "An object is required" }]);
  const reference = value as Partial<AuthenticatedIntegrationIngressReferenceV1>;
  const issues: ValidationIssue[] = [];
  if (reference.schema_version !== ACS_NATIVE_SCHEMA_VERSION) issues.push({ path: "schema_version", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Expected ${ACS_NATIVE_SCHEMA_VERSION}` });
  for (const key of ["ingress_ref", "tenant_id", "credential_ref", "authentication_method", "correlation_id"] as const) requireString(reference[key], key, issues);
  if (reference.credential_version !== undefined) requireString(reference.credential_version, "credential_version", issues);
  if (reference.provider_event_id !== undefined) requireString(reference.provider_event_id, "provider_event_id", issues);
  requireSha256(reference.payload_digest, "payload_digest", issues);
  requireSafeInteger(reference.authenticated_at, "authenticated_at", issues, 0);
  for (const key of ["channel_revision_ref", "connection_revision_ref"] as const) {
    try { validateIntegrationRevisionRef(reference[key], key); } catch (error) { if (error instanceof NativeContractValidationError) issues.push(...error.issues); }
  }
  if (reference.channel_revision_ref?.entity_kind !== "integration_channel") issues.push({ path: "channel_revision_ref.entity_kind", code: "INVALID_ENTITY_KIND", message: "A Channel revision reference is required" });
  if (reference.connection_revision_ref?.entity_kind !== "integration_connection") issues.push({ path: "connection_revision_ref.entity_kind", code: "INVALID_ENTITY_KIND", message: "A Connection revision reference is required" });
  assertNoSecretMaterial(value);
  return assertValid(reference as AuthenticatedIntegrationIngressReferenceV1, issues);
}

export class AuthenticatedChannelIngressResolver {
  readonly #nativeCore: AsyncNativeCoreRepository;
  readonly #credentials: CredentialProvider;
  readonly #authenticator: IntegrationIngressAuthenticator;

  constructor(input: { readonly nativeCore: AsyncNativeCoreRepository; readonly credentials: CredentialProvider; readonly authenticator: IntegrationIngressAuthenticator }) {
    this.#nativeCore = input.nativeCore;
    this.#credentials = input.credentials;
    this.#authenticator = input.authenticator;
  }

  async authenticate(input: { readonly ingressRef: string; readonly tenantId: string; readonly channelId: string; readonly payload: Uint8Array; readonly headers: Readonly<Record<string, string>>; readonly correlationId: string }): Promise<AuthenticatedIntegrationIngressReferenceV1> {
    const channel = await this.#nativeCore.getIntegrationChannelLineage(input.channelId);
    const channelRevision = channel.revisions.at(-1);
    if (!channelRevision || channel.definition.tenant_id !== input.tenantId || channel.definition.lifecycle !== "active") unavailable("CHANNEL_UNAVAILABLE", "Channel is unavailable for authenticated ingress");
    const connection = await this.#nativeCore.getIntegrationConnectionLineage(channelRevision.connection_revision_ref.entity_id);
    const connectionRevision = connection.revisions.at(-1);
    if (!connectionRevision || connection.definition.tenant_id !== input.tenantId) unavailable("TENANT_MISMATCH", "Channel Connection is unavailable for this Tenant");
    if (connection.definition.lifecycle !== "active" || connectionRevision.ref.revision !== channelRevision.connection_revision_ref.revision || connectionRevision.ref.fingerprint !== channelRevision.connection_revision_ref.fingerprint) unavailable("CONNECTION_STALE", "Channel does not bind the active exact Connection revision");
    if (!connectionRevision.credential_ref) unavailable("CREDENTIAL_UNAVAILABLE", "Connection has no credential reference for ingress authentication");
    let lease: CredentialLease;
    try { lease = await this.#credentials.resolve(connectionRevision.credential_ref.credential_ref, "integration:channel-ingress-auth"); }
    catch { unavailable("CREDENTIAL_UNAVAILABLE", "Credential reference is unavailable for ingress authentication"); }
    if (lease.tenantId !== undefined && lease.tenantId !== input.tenantId) unavailable("TENANT_MISMATCH", "Credential lease belongs to a different Tenant");
    let authentication: Awaited<ReturnType<IntegrationIngressAuthenticator["authenticate"]>>;
    try { authentication = await this.#authenticator.authenticate({ payload: input.payload, headers: input.headers, channel: channelRevision, connection: connectionRevision, credentialLease: lease }); }
    catch { unavailable("AUTHENTICATION_FAILED", "Channel authentication failed"); }
    return validateAuthenticatedIntegrationIngressReferenceV1(freezeNative({
      schema_version: ACS_NATIVE_SCHEMA_VERSION,
      ingress_ref: input.ingressRef,
      tenant_id: input.tenantId,
      channel_revision_ref: channelRevision.ref,
      connection_revision_ref: connectionRevision.ref,
      credential_ref: connectionRevision.credential_ref.credential_ref,
      ...(connectionRevision.credential_ref.credential_version ? { credential_version: connectionRevision.credential_ref.credential_version } : {}),
      authentication_method: authentication.authentication_method,
      payload_digest: sha256Hex(Buffer.from(input.payload).toString("base64")),
      correlation_id: input.correlationId,
      authenticated_at: authentication.authenticated_at,
      ...(authentication.provider_event_id ? { provider_event_id: authentication.provider_event_id } : {}),
    }));
  }
}
