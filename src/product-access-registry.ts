import type { AcsServiceCapability } from "./capability-registry.js";
import type { PolicyDecision } from "./types.js";

export interface AcsProductAccessContext {
  readonly walletAddress?: string;
  readonly subscriptionActive: boolean;
  readonly nftLicenseValid: boolean;
  readonly marketplacePurchaseValid: boolean;
  readonly governancePermission: boolean;
  readonly userReadinessState: string;
}

export interface ProductAccessInput {
  readonly capability: AcsServiceCapability;
  readonly access: AcsProductAccessContext;
}

export function evaluateProductAccess(input: ProductAccessInput): PolicyDecision {
  if (!input.capability.productAccessAllowed) {
    return { allowed: false, reason: `${input.capability.id} is not available as a product` };
  }

  if (!input.access.walletAddress) {
    return { allowed: false, reason: "wallet is required for product access" };
  }

  if (input.capability.requiresUserLicense && !input.access.nftLicenseValid && !input.access.marketplacePurchaseValid) {
    return { allowed: false, reason: `${input.capability.id} requires a valid NFT license or marketplace purchase` };
  }

  if (input.capability.requiresGovernanceApproval && !input.access.governancePermission) {
    return { allowed: false, reason: `${input.capability.id} requires governance permission` };
  }

  return { allowed: true };
}

