import { createAcsReceipt, type AcsReceipt } from "./acs-receipts.js";

export type AcsLicenseLossReason =
  | "license_expired"
  | "license_revoked"
  | "license_transferred"
  | "license_not_owned"
  | "tenant_access_suspended"
  | "governance_restricted";

export interface AcsLicenseLossInput {
  readonly wallet: string;
  readonly tenantId?: string;
  readonly productId: string;
  readonly reason: AcsLicenseLossReason;
  readonly licenseId?: string;
  readonly createdAt?: string;
}

export interface AcsLicenseLossDecision {
  readonly allowed: false;
  readonly blockedReason: AcsLicenseLossReason;
  readonly operationalState: "RISK_RESTRICTED" | "SUSPENDED" | "REVOKED";
  readonly emergencyStopRecommended: boolean;
  readonly receipt: AcsReceipt;
}

export function evaluateLicenseLoss(input: AcsLicenseLossInput): AcsLicenseLossDecision {
  const operationalState = licenseLossOperationalState(input.reason);
  const receipt = createAcsReceipt({
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    wallet: input.wallet,
    consumptionLevel: "product",
    capabilityId: input.productId,
    actionType: "license_access_lost",
    actor: { type: "system", id: "acs.license-monitor" },
    policyDecision: {
      allowed: false,
      blockedReason: input.reason,
      automationLevel: "blocked",
      requiresUserLicense: true,
    },
    operationalState,
    telemetry: {
      warnings: [`product access blocked: ${input.reason}`],
      riskFlags: [input.reason],
    },
    metadata: {
      licenseId: input.licenseId,
      productId: input.productId,
    },
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  });

  return {
    allowed: false,
    blockedReason: input.reason,
    operationalState,
    emergencyStopRecommended: input.reason !== "license_expired",
    receipt,
  };
}

export function licenseLossOperationalState(reason: AcsLicenseLossReason): AcsLicenseLossDecision["operationalState"] {
  if (reason === "license_revoked" || reason === "governance_restricted") {
    return "REVOKED";
  }

  if (reason === "tenant_access_suspended") {
    return "SUSPENDED";
  }

  return "RISK_RESTRICTED";
}

export function mockLicenseLossReason(wallet: string, tenantId?: string): AcsLicenseLossReason | undefined {
  if (tenantId === "dao-disabled") {
    return "tenant_access_suspended";
  }

  const normalizedWallet = wallet.toLowerCase();
  if (normalizedWallet === "0xexpired") {
    return "license_expired";
  }

  if (normalizedWallet === "0xrevoked") {
    return "license_revoked";
  }

  if (normalizedWallet === "0xtransferred") {
    return "license_transferred";
  }

  if (normalizedWallet === "0xnotowner") {
    return "license_not_owned";
  }

  if (normalizedWallet === "0xrestricted") {
    return "governance_restricted";
  }

  return undefined;
}
