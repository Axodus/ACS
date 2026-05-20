import { validateMockExchangeApiSafety } from "./api-safety.js";
import { EmergencyStopService, type EmergencyStopRecord } from "./emergency-stop.js";
import { inspectPolicyCheck } from "./inspection.js";
import { evaluateLicenseLoss, mockLicenseLossReason, type AcsLicenseLossReason } from "./license-loss.js";
import { getMockOperationalState, getMockReadiness } from "./http/services/operational-status-service.js";

export interface AcsUserStatusSummary {
  readonly wallet: string;
  readonly tenantId?: string;
  readonly productId?: string;
  readonly operationalState: string;
  readonly readiness: {
    readonly completed: readonly string[];
    readonly pending: readonly string[];
    readonly blocked: readonly string[];
  };
  readonly license: {
    readonly valid: boolean;
    readonly licenseId?: string;
    readonly blockedReason?: AcsLicenseLossReason | "license_missing";
  };
  readonly apiSafety: {
    readonly status: "not_configured" | "valid" | "blocked" | "warning";
    readonly warnings: readonly string[];
  };
  readonly risk: {
    readonly preset: string;
    readonly warnings: readonly string[];
  };
  readonly policy: {
    readonly allowed: boolean;
    readonly blockedReason?: string;
    readonly automationLevel: string;
  };
  readonly emergencyStop: {
    readonly active: boolean;
    readonly reason?: string;
  };
  readonly updatedAt: string;
}

export interface GetAcsUserStatusSummaryInput {
  readonly wallet: string;
  readonly tenantId?: string;
  readonly productId?: string;
  readonly emergencyStopService?: EmergencyStopService;
}

const DEFAULT_PRODUCT_ID = "product.trading-ignition";

export function getMockUserStatusSummary(input: GetAcsUserStatusSummaryInput): AcsUserStatusSummary {
  const productId = input.productId ?? DEFAULT_PRODUCT_ID;
  const readiness = getMockReadiness(input.wallet);
  const licenseLossReason = mockLicenseLossReason(input.wallet, input.tenantId);
  const licensed = input.wallet.toLowerCase() === "0xlicensed" && !licenseLossReason;
  const emergencyStop = getEmergencyStop(input);
  const apiSafety = validateMockExchangeApiSafety({
    exchangeId: "mock-exchange",
    permissions: licensed ? ["read", "spot_trade"] : ["read"],
    ipRestrictionEnabled: licensed,
    allowedIps: licensed ? ["127.0.0.1"] : [],
    secretStoredEncrypted: true,
    secretExposedToFrontend: false,
    plaintextLoggingEnabled: false,
  });
  const policyCheck = inspectPolicyCheck({
    capabilityId: productId,
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    wallet: input.wallet,
  });
  const blockedReason = licenseLossReason
    ?? (licensed ? undefined : "license_missing")
    ?? emergencyStop.blockedReason
    ?? policyCheck.blockedReason;
  const policyAllowed = Boolean(policyCheck.allowed && licensed && !licenseLossReason && !emergencyStop.blocked);
  const operationalState = licenseLossReason
    ? evaluateLicenseLoss({
      wallet: input.wallet,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      productId,
      reason: licenseLossReason,
    }).operationalState
    : emergencyStop.blocked
      ? "EMERGENCY_STOP"
      : getMockOperationalState(input.wallet).state;

  return {
    wallet: input.wallet,
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    productId,
    operationalState,
    readiness: {
      completed: readiness.checks.filter((item) => item.completed).map((item) => item.id),
      pending: readiness.checks.filter((item) => !item.completed).map((item) => item.id),
      blocked: [
        ...readiness.blockedBy,
        ...(blockedReason ? [blockedReason] : []),
      ],
    },
    license: {
      valid: licensed,
      ...(licensed ? { licenseId: "mock-license-trading-ignition" } : {}),
      ...(!licensed && blockedReason ? { blockedReason: blockedReason as AcsLicenseLossReason | "license_missing" } : {}),
    },
    apiSafety: {
      status: apiSafety.safe ? (apiSafety.warnings.length > 0 ? "warning" : "valid") : "blocked",
      warnings: [...apiSafety.blockers, ...apiSafety.warnings].map((finding) => finding.uiRecommendation),
    },
    risk: {
      preset: "conservative",
      warnings: [
        "restricted/mock mode only",
        "disable withdrawal permissions and use IP permission/allowlist before any future CEX integration",
      ],
    },
    policy: {
      allowed: policyAllowed,
      ...(blockedReason ? { blockedReason } : {}),
      automationLevel: policyCheck.automationLevel ?? "blocked",
    },
    emergencyStop: {
      active: emergencyStop.blocked,
      ...(emergencyStop.stop ? { reason: emergencyStop.stop.reason } : {}),
    },
    updatedAt: new Date().toISOString(),
  };
}

function getEmergencyStop(input: GetAcsUserStatusSummaryInput): {
  readonly blocked: boolean;
  readonly blockedReason?: string;
  readonly stop?: EmergencyStopRecord;
} {
  if (input.emergencyStopService) {
    return input.emergencyStopService.evaluate({
      wallet: input.wallet,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      capabilityId: input.productId ?? DEFAULT_PRODUCT_ID,
    });
  }

  if (input.wallet.toLowerCase() === "0xstopped") {
    const service = new EmergencyStopService();
    service.createStop({
      scope: "user",
      source: "user",
      wallet: input.wallet,
      capabilityId: input.productId ?? DEFAULT_PRODUCT_ID,
      reason: "mock user emergency stop",
      severity: "critical",
    });
    return service.evaluate({ wallet: input.wallet, capabilityId: input.productId ?? DEFAULT_PRODUCT_ID });
  }

  return { blocked: false };
}
