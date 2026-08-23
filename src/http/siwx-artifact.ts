import type { VerifiedWalletIdentity } from "../control-plane/account-identity.js";

export interface SiwxAuthenticatedArtifactVerifierDescriptor {
  readonly provider: "reown_appkit_siwx";
  readonly configured: boolean;
  readonly serverVerified: true;
  readonly productionOriented: boolean;
  readonly supportedNamespaces: readonly ["eip155"];
}

export interface SiwxAuthenticatedArtifactVerifier {
  readonly descriptor: SiwxAuthenticatedArtifactVerifierDescriptor;
  verify(artifact: unknown): Promise<VerifiedWalletIdentity>;
}

export class SiwxArtifactVerificationError extends Error {
  readonly code:
    | "SIWX_VERIFIER_NOT_CONFIGURED"
    | "SIWX_ARTIFACT_INVALID"
    | "SIWX_ARTIFACT_EXPIRED"
    | "SIWX_DOMAIN_NOT_ALLOWED"
    | "SIWX_CHAIN_UNSUPPORTED"
    | "SIWX_SIGNATURE_INVALID"
    | "SIWX_PROVIDER_UNAVAILABLE";

  constructor(code: SiwxArtifactVerificationError["code"], message: string) {
    super(message);
    this.name = "SiwxArtifactVerificationError";
    this.code = code;
  }
}

export class UnavailableSiwxArtifactVerifier implements SiwxAuthenticatedArtifactVerifier {
  readonly descriptor: SiwxAuthenticatedArtifactVerifierDescriptor = {
    provider: "reown_appkit_siwx",
    configured: false,
    serverVerified: true,
    productionOriented: false,
    supportedNamespaces: ["eip155"],
  };

  async verify(_artifact: unknown): Promise<VerifiedWalletIdentity> {
    throw new SiwxArtifactVerificationError(
      "SIWX_VERIFIER_NOT_CONFIGURED",
      "server-verifiable SIWX integration is not configured",
    );
  }
}
