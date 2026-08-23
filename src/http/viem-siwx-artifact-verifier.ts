import { createHash } from "node:crypto";
import { createPublicClient, defineChain, http } from "viem";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import {
  AccountIdentityService,
  createEvmWalletIdentity,
  type VerifiedWalletIdentity,
} from "../control-plane/account-identity.js";
import {
  SiwxArtifactVerificationError,
  type SiwxAuthenticatedArtifactVerifier,
  type SiwxAuthenticatedArtifactVerifierDescriptor,
} from "./siwx-artifact.js";

export interface ViemSiwxChainConfiguration {
  readonly chainId: number;
  readonly name: string;
  readonly rpcUrl: string;
}

export interface ViemSiwxArtifactVerifierOptions {
  readonly accountIdentity: AccountIdentityService;
  readonly allowedOrigins: readonly string[];
  readonly chains: readonly ViemSiwxChainConfiguration[];
  readonly clock?: () => number;
  readonly rpcTimeoutMs?: number;
  readonly productionOriented?: boolean;
}

interface SiwxMessageSignatureArtifact {
  readonly message: string;
  readonly signature: `0x${string}`;
}

interface AllowedOrigin {
  readonly origin: string;
  readonly host: string;
  readonly protocol: string;
}

/**
 * Server-side verifier for Reown AppKit custom SIWX message/signature exchange.
 * Browser-provided address, chain and timestamps are ignored; all identity
 * fields are parsed from the signed EIP-4361 message and independently proven.
 */
export class ViemSiwxArtifactVerifier implements SiwxAuthenticatedArtifactVerifier {
  readonly descriptor: SiwxAuthenticatedArtifactVerifierDescriptor;
  readonly #accountIdentity: AccountIdentityService;
  readonly #allowedOrigins: readonly AllowedOrigin[];
  readonly #chains: ReadonlyMap<number, ViemSiwxChainConfiguration>;
  readonly #clock: () => number;
  readonly #rpcTimeoutMs: number;

  constructor(options: ViemSiwxArtifactVerifierOptions) {
    if (options.allowedOrigins.length === 0) {
      throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "at least one SIWX application origin is required");
    }
    if (options.chains.length === 0) {
      throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "at least one SIWX chain RPC is required");
    }
    this.#accountIdentity = options.accountIdentity;
    this.#allowedOrigins = options.allowedOrigins.map(parseAllowedOrigin);
    this.#chains = new Map(options.chains.map((chain) => {
      if (!Number.isSafeInteger(chain.chainId) || chain.chainId <= 0) {
        throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "SIWX chain id must be a positive safe integer");
      }
      if (!chain.name.trim()) {
        throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "SIWX chain name is required");
      }
      validateRpcUrl(chain.rpcUrl);
      return [chain.chainId, chain] as const;
    }));
    if (this.#chains.size !== options.chains.length) {
      throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "SIWX chain ids must be unique");
    }
    this.#clock = options.clock ?? (() => Date.now());
    this.#rpcTimeoutMs = positiveTimeout(options.rpcTimeoutMs ?? 5_000);
    this.descriptor = {
      provider: "reown_appkit_siwx",
      configured: true,
      serverVerified: true,
      productionOriented: options.productionOriented ?? false,
      supportedNamespaces: ["eip155"],
    };
  }

  async verify(artifact: unknown): Promise<VerifiedWalletIdentity> {
    const request = parseArtifact(artifact);
    const parsed = parseSiweMessage(request.message);
    if (!parsed.address || !parsed.chainId || !parsed.domain || !parsed.nonce || !parsed.uri || parsed.version !== "1") {
      throw new SiwxArtifactVerificationError("SIWX_ARTIFACT_INVALID", "SIWX message is missing required EIP-4361 fields");
    }
    const allowedOrigin = this.#allowedOrigins.find((candidate) => candidate.host === parsed.domain);
    if (!allowedOrigin) {
      throw new SiwxArtifactVerificationError("SIWX_DOMAIN_NOT_ALLOWED", "SIWX message domain is not allowed");
    }
    let messageUri: URL;
    try {
      messageUri = new URL(parsed.uri);
    } catch {
      throw new SiwxArtifactVerificationError("SIWX_ARTIFACT_INVALID", "SIWX message URI is invalid");
    }
    if (messageUri.origin !== allowedOrigin.origin
      || (parsed.scheme !== undefined && parsed.scheme + ":" !== allowedOrigin.protocol)) {
      throw new SiwxArtifactVerificationError("SIWX_DOMAIN_NOT_ALLOWED", "SIWX message URI does not match the allowed application origin");
    }
    const configuredChain = this.#chains.get(parsed.chainId);
    if (!configuredChain) {
      throw new SiwxArtifactVerificationError("SIWX_CHAIN_UNSUPPORTED", "SIWX message chain is not configured");
    }
    const now = this.#clock();
    const client = createPublicClient({
      chain: defineChain({
        id: configuredChain.chainId,
        name: configuredChain.name,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [configuredChain.rpcUrl] } },
      }),
      transport: http(configuredChain.rpcUrl, { timeout: this.#rpcTimeoutMs }),
    });
    let verified: boolean;
    try {
      verified = await verifySiweMessage(client, {
        address: parsed.address,
        domain: parsed.domain,
        message: request.message,
        nonce: parsed.nonce,
        ...(parsed.scheme ? { scheme: parsed.scheme } : {}),
        signature: request.signature,
        time: new Date(now),
      });
    } catch {
      throw new SiwxArtifactVerificationError("SIWX_PROVIDER_UNAVAILABLE", "SIWX signature authority could not be evaluated");
    }
    if (!verified) {
      const expired = parsed.expirationTime !== undefined && parsed.expirationTime.getTime() <= now;
      throw new SiwxArtifactVerificationError(
        expired ? "SIWX_ARTIFACT_EXPIRED" : "SIWX_SIGNATURE_INVALID",
        expired ? "SIWX message has expired" : "SIWX signature is invalid",
      );
    }

    // Atomic consumption occurs only after cryptographic verification. A
    // simultaneous replay can therefore have at most one successful exchange.
    await this.#accountIdentity.consumeNonce(parsed.nonce);
    return createEvmWalletIdentity({
      address: parsed.address,
      chainId: parsed.chainId,
      providerSessionId: providerSessionDigest(request),
      verifiedAt: now,
      ...(parsed.expirationTime ? { artifactExpiresAt: parsed.expirationTime.getTime() } : {}),
    });
  }
}

function parseArtifact(artifact: unknown): SiwxMessageSignatureArtifact {
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    throw new SiwxArtifactVerificationError("SIWX_ARTIFACT_INVALID", "SIWX verification request must be an object");
  }
  const record = artifact as Readonly<Record<string, unknown>>;
  if (typeof record.message !== "string" || !record.message.trim()) {
    throw new SiwxArtifactVerificationError("SIWX_ARTIFACT_INVALID", "SIWX message is required");
  }
  if (typeof record.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(record.signature)) {
    throw new SiwxArtifactVerificationError("SIWX_ARTIFACT_INVALID", "SIWX signature must be hexadecimal");
  }
  return { message: record.message, signature: record.signature as `0x${string}` };
}

function parseAllowedOrigin(value: string): AllowedOrigin {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "SIWX allowed origin must be an absolute URL");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "SIWX allowed origins require HTTPS except for localhost");
  }
  return { origin: url.origin, host: url.host, protocol: url.protocol };
}

function validateRpcUrl(value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid protocol");
  } catch {
    throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "SIWX RPC URL must be absolute HTTP(S)");
  }
}

function providerSessionDigest(artifact: SiwxMessageSignatureArtifact): string {
  return createHash("sha256")
    .update(artifact.message, "utf8")
    .update("\u0000", "utf8")
    .update(artifact.signature, "utf8")
    .digest("base64url");
}

function positiveTimeout(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new SiwxArtifactVerificationError("SIWX_VERIFIER_NOT_CONFIGURED", "SIWX RPC timeout must be a positive safe integer");
  }
  return value;
}
