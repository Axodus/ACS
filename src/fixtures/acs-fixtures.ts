import { createAcsReceipt, type AcsReceipt } from "../acs-receipts.js";
import type { EmergencyStopRecord } from "../emergency-stop.js";
import type { AcsPerformanceRecord } from "../performance-record.js";
import { createAcsPerformanceRecord } from "../performance-record.js";
import type { AcsTenantContext } from "../tenant-context.js";
import { getMockUserStatusSummary } from "../user-status.js";
export { createAcsReadinessRegistryFixtures } from "./acs-readiness-fixtures.js";

export const ACS_FIXTURE_IDS = {
  coreTenant: "axodus-core",
  enabledTenant: "dao-alpha",
  suspendedTenant: "dao-disabled",
  emergencyTenant: "dao-emergency",
  licensedWallet: "0xlicensed",
  unlicensedWallet: "0xunlicensed",
  stoppedWallet: "0xstopped",
  expiredWallet: "0xexpired",
  tradingIgnitionCapability: "product.trading-ignition",
  governanceComplianceCapability: "core.governance-alignment",
} as const;

export function createAcsTenantFixtures(): readonly AcsTenantContext[] {
  return [
    {
      tenantId: ACS_FIXTURE_IDS.coreTenant,
      tenantType: "root",
      governanceStatus: "active",
      federationTier: "core",
      enabledServices: ["core.tenant-health-monitoring", "core.governance-alignment"],
      restrictions: [],
    },
    {
      tenantId: ACS_FIXTURE_IDS.enabledTenant,
      tenantType: "dao",
      governanceStatus: "active",
      federationTier: "standard",
      enabledServices: ["service.risk-analysis", "service.content-validation", ACS_FIXTURE_IDS.tradingIgnitionCapability],
      restrictions: [],
    },
    {
      tenantId: ACS_FIXTURE_IDS.suspendedTenant,
      tenantType: "dao",
      governanceStatus: "suspended",
      federationTier: "standard",
      enabledServices: [],
      restrictions: ["acs.services.suspended"],
    },
  ];
}

export function createSamplePolicyDecisionFixtures() {
  return {
    allowed: {
      allowed: true,
      automationLevel: "manual_approval",
      requiresGovernanceApproval: true,
      requiresUserLicense: true,
    },
    blocked: {
      allowed: false,
      blockedReason: "emergency_stop_active",
      automationLevel: "blocked",
      requiresGovernanceApproval: true,
      requiresUserLicense: true,
    },
  } as const;
}

export function createSampleAcsReceiptFixture(): AcsReceipt {
  return createAcsReceipt({
    receiptId: "receipt_mock_policy_check_001",
    correlationId: "corr_mock_policy_check_001",
    tenantId: ACS_FIXTURE_IDS.enabledTenant,
    wallet: ACS_FIXTURE_IDS.licensedWallet,
    consumptionLevel: "product",
    capabilityId: ACS_FIXTURE_IDS.tradingIgnitionCapability,
    actionType: "policy_check",
    actor: { type: "system", id: "acs.inspection" },
    policyDecision: createSamplePolicyDecisionFixtures().allowed,
    operationalState: "READY",
    telemetry: { warnings: ["mock audit preview only"], riskFlags: [] },
    createdAt: "2026-01-01T00:00:00.000Z",
  });
}

export function createSampleEmergencyStopFixtures(): readonly EmergencyStopRecord[] {
  return [
    {
      stopId: "stop_mock_user_001",
      scope: "user",
      source: "user",
      wallet: ACS_FIXTURE_IDS.stoppedWallet,
      capabilityId: ACS_FIXTURE_IDS.tradingIgnitionCapability,
      reason: "mock user emergency stop for inspection",
      severity: "critical",
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      stopId: "stop_mock_tenant_001",
      scope: "tenant",
      source: "tenant-admin",
      tenantId: ACS_FIXTURE_IDS.emergencyTenant,
      reason: "mock tenant emergency stop for inspection",
      severity: "critical",
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

export function createSamplePerformanceRecordFixtures(): readonly AcsPerformanceRecord[] {
  return [
    createAcsPerformanceRecord({
      recordId: "perf_mock_trading_ignition_001",
      wallet: ACS_FIXTURE_IDS.licensedWallet,
      tenantId: ACS_FIXTURE_IDS.enabledTenant,
      capabilityId: ACS_FIXTURE_IDS.tradingIgnitionCapability,
      strategyId: "mock-grid-risk-check",
      exchange: "mock-exchange",
      mode: "internal-validation",
      capitalUsed: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      drawdown: 0,
      winRate: 0,
      lossRate: 0,
      tradeCount: 0,
      feesPaid: 0,
      fundingFees: 0,
      liquidationRiskEvents: 0,
      emergencyStops: 0,
      strategyVersion: "mock-0.1.0",
      botVersion: "acs-mock-0.1.0",
      preset: "conservative",
      warnings: [
        "mock record for UI validation only",
        "no real trading execution or return claim is represented",
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  ];
}

export function createSampleUserStatusSummaryFixtures() {
  return {
    eligible: getMockUserStatusSummary({
      wallet: ACS_FIXTURE_IDS.licensedWallet,
      tenantId: ACS_FIXTURE_IDS.enabledTenant,
      productId: ACS_FIXTURE_IDS.tradingIgnitionCapability,
    }),
    licenseLoss: getMockUserStatusSummary({
      wallet: ACS_FIXTURE_IDS.expiredWallet,
      tenantId: ACS_FIXTURE_IDS.enabledTenant,
      productId: ACS_FIXTURE_IDS.tradingIgnitionCapability,
    }),
  } as const;
}
