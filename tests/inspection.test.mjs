import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  inspectBusinessAlignmentSnapshot,
  inspectBusinessCommerceActionPosture,
  inspectBusinessCommerceBlockedActions,
  inspectBusinessCriticalWarnings,
  inspectBusinessMarketplaceAlignmentSummary,
  inspectAxodusAppBlockedActionCards,
  inspectAxodusAppCriticalWarnings,
  inspectAxodusAppGateCards,
  inspectAxodusAppPermissionCards,
  inspectAxodusAppPreviewSnapshot,
  inspectAxodusAppPreviewSummary,
  inspectAxodusAppReadinessCards,
  inspectMarketplaceAlignmentSnapshot,
  inspectMarketplaceCommerceActionPosture,
  inspectMarketplaceCommerceBlockedActions,
  inspectMarketplaceCriticalWarnings,
  inspectConsumerActionPosture,
  inspectConsumerBlockedActionView,
  inspectConsumerContractSnapshot,
  inspectConsumerContractSummary,
  inspectConsumerGateView,
  inspectConsumerPermissionView,
  inspectConsumerReadinessView,
  inspectBlockedActionCheck,
  inspectBlockedActionEntry,
  inspectBlockedActions,
  inspectCapabilities,
  inspectAuditReceipts,
  inspectEmergencyStops,
  inspectObservabilityStatus,
  inspectOperationalGateEntry,
  inspectOperationalGateRegistry,
  inspectOperationalGateSummary,
  inspectPerformanceRecords,
  inspectPermissionActionCheck,
  inspectPermissionStateEntry,
  inspectPermissionStateModel,
  inspectPermissionStateSummary,
  inspectPolicyCheck,
  inspectPolicyMatrix,
  inspectProductAccess,
  inspectReadinessRegistry,
  inspectReadinessRegistryEntry,
  inspectReadinessRegistrySummary,
  inspectSecretStorageStatus,
  inspectTenantServices,
  inspectUserStatus,
} from "../dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "..", "scripts", "acs.mjs");

test("lists all capabilities and filters by level", () => {
  const all = inspectCapabilities();
  const core = inspectCapabilities({ level: "core" });
  const service = inspectCapabilities({ level: "service" });
  const product = inspectCapabilities({ level: "product" });

  assert.ok(all.capabilities.length >= 6);
  assert.ok(core.capabilities.every((capability) => capability.consumptionLevel === "core"));
  assert.ok(service.capabilities.every((capability) => capability.consumptionLevel === "service"));
  assert.ok(product.capabilities.every((capability) => capability.consumptionLevel === "product"));
});

test("lists all tenant services and filters by tenant", () => {
  const all = inspectTenantServices();
  const tenant = inspectTenantServices({ tenantId: "dao-alpha" });

  assert.ok(all.tenants.length >= 3);
  assert.deepEqual(tenant.tenants.map((entry) => entry.tenantId), ["dao-alpha"]);
  assert.ok(tenant.tenants[0].services.some((service) => service.serviceId === "service.risk-analysis"));
});

test("blocks service access for disabled tenant", () => {
  const tenant = inspectTenantServices({ tenantId: "dao-disabled" });
  const risk = tenant.tenants[0].services.find((service) => service.serviceId === "service.risk-analysis");

  assert.equal(risk.allowed, false);
  assert.match(risk.blockedReason, /has not enabled|suspended/);
});

test("lists product access rules and checks Trading Ignition access", () => {
  const licensed = inspectProductAccess({
    walletAddress: "0xlicensed",
    productId: "product.trading-ignition",
  });
  const unlicensed = inspectProductAccess({
    walletAddress: "0xunlicensed",
    productId: "product.trading-ignition",
  });

  assert.equal(licensed.products[0].productId, "product.trading-ignition");
  assert.equal(licensed.products[0].allowed, true);
  assert.equal(unlicensed.products[0].allowed, false);
  assert.match(unlicensed.products[0].blockedReason, /valid NFT license|marketplace purchase/);
});

test("policy-check returns governance and automation metadata", () => {
  const result = inspectPolicyCheck({
    capabilityId: "product.trading-ignition",
    tenantId: "dao-alpha",
  });

  assert.equal(result.capabilityId, "product.trading-ignition");
  assert.deepEqual(result.policyContext, {
    capabilityId: "product.trading-ignition",
    tenantId: "dao-alpha",
    source: "capability-registry",
    decisionSurface: "inspection",
    executionTriggered: false,
  });
  assert.equal(result.automationLevel, "manual_approval");
  assert.equal(result.requiresGovernanceApproval, true);
  assert.equal(result.telemetryRequired, true);
  assert.equal(result.receiptsRequired, true);
});

test("policy matrix inspection exposes automation metadata", () => {
  const result = inspectPolicyMatrix();
  const withdraw = result.policies.find((policy) => policy.capabilityId === "withdraw.funds");

  assert.equal(withdraw.automationLevel, "blocked");
  assert.equal(withdraw.telemetryRequired, true);
  assert.equal(withdraw.receiptsRequired, true);
});

test("hardening inspection exposes user status, performance records, and audit receipts", () => {
  const userStatus = inspectUserStatus({
    wallet: "0xexpired",
    tenantId: "dao-alpha",
    productId: "product.trading-ignition",
  });
  const performanceRecords = inspectPerformanceRecords();
  const auditReceipts = inspectAuditReceipts();
  const emergencyStops = inspectEmergencyStops();
  const secretStorage = inspectSecretStorageStatus();
  const observability = inspectObservabilityStatus();

  assert.equal(userStatus.userStatus.policy.allowed, false);
  assert.equal(userStatus.userStatus.policy.blockedReason, "license_expired");
  assert.equal(performanceRecords.records[0].capabilityId, "product.trading-ignition");
  assert.equal(auditReceipts.receipts[0].consumptionLevel, "product");
  assert.ok(auditReceipts.receipts[0].correlationId);
  assert.ok(emergencyStops.stops.some((stop) => stop.active && stop.wallet === "0xstopped"));
  assert.equal(secretStorage.plaintextStorageAllowed, false);
  assert.equal(secretStorage.frontendSecretExposureAllowed, false);
  assert.equal(observability.correlationId.enabled, true);
  assert.equal(observability.telemetry.externalExporterEnabled, false);
});

test("policy-check inspection can include wallet emergency stop context", () => {
  const result = inspectPolicyCheck({
    capabilityId: "product.trading-ignition",
    wallet: "0xstopped",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.blockedReason, "emergency_stop_active");
  assert.equal(result.policyContext.source, "emergency-stop");
  assert.equal(result.policyContext.wallet, "0xstopped");
  assert.equal(result.policyContext.executionTriggered, false);
});

test("readiness registry inspection lists entries, blocked entries, and summary without side effects", () => {
  const all = inspectReadinessRegistry();
  const blocked = inspectReadinessRegistry({ blockedOnly: true });
  const byDomain = inspectReadinessRegistry({ domain: "readiness.registry" });
  const byStatus = inspectReadinessRegistry({ status: "BLOCKED" });
  const entry = inspectReadinessRegistryEntry("acs.core");
  const summary = inspectReadinessRegistrySummary();

  assert.ok(all.entries.length >= 13);
  assert.ok(blocked.entries.every((item) => item.status === "BLOCKED"));
  assert.deepEqual(byDomain.entries.map((item) => item.domain), ["readiness.registry"]);
  assert.ok(byStatus.entries.every((item) => item.status === "BLOCKED"));
  assert.equal(entry.entry?.id, "acs.core");
  assert.equal(summary.summary.executionGated, true);
  assert.equal(summary.summary.nonProduction, true);
});

test("permission state inspection lists entries, filters blocked domains, and reports representational action checks", () => {
  const all = inspectPermissionStateModel();
  const bySubject = inspectPermissionStateModel({ subject: "acs.permission-state-model" });
  const byDomain = inspectPermissionStateModel({ domain: "wallet-signing" });
  const blocked = inspectPermissionStateModel({ blockedOnly: true });
  const entry = inspectPermissionStateEntry("acs.permission-state-model");
  const summary = inspectPermissionStateSummary();
  const action = inspectPermissionActionCheck("acs.wallet-signing", "wallet.sign.real");

  assert.ok(all.entries.length >= 20);
  assert.deepEqual(bySubject.entries.map((item) => item.subject), ["acs.permission-state-model"]);
  assert.deepEqual(byDomain.entries.map((item) => item.domain), ["wallet-signing"]);
  assert.ok(blocked.entries.some((item) => item.id === "acs.wallet-signing"));
  assert.equal(entry.entry?.id, "acs.permission-state-model");
  assert.equal(summary.summary.nonProduction, true);
  assert.equal(summary.summary.productionEnforcementAvailable, false);
  assert.equal(action.result.representedBlocked, true);
  assert.equal(action.result.executionTriggered, false);
});

test("operational gate inspection exposes gates, blocked actions, and representational block checks read-only", () => {
  const all = inspectOperationalGateRegistry();
  const byDomain = inspectOperationalGateRegistry({ domain: "wallet-signing" });
  const blocked = inspectOperationalGateRegistry({ blockedOnly: true });
  const gate = inspectOperationalGateEntry("gate.wallet-signing");
  const summary = inspectOperationalGateSummary();
  const actions = inspectBlockedActions({ domain: "wallet-signing" });
  const action = inspectBlockedActionEntry("wallet.sign.real");
  const check = inspectBlockedActionCheck("wallet.sign.real");

  assert.ok(all.gates.length >= 15);
  assert.deepEqual(byDomain.gates.map((item) => item.domain), ["wallet-signing"]);
  assert.ok(blocked.gates.every((item) => ["CLOSED", "BLOCKED", "EXECUTION_GATED"].includes(item.status)));
  assert.equal(gate.gate?.id, "gate.wallet-signing");
  assert.equal(summary.summary.nonProduction, true);
  assert.equal(summary.summary.executionGated, true);
  assert.equal(actions.actions.length, 2);
  assert.equal(action.action?.gateId, "gate.wallet-signing");
  assert.equal(check.result.representedBlocked, true);
  assert.equal(check.result.executionTriggered, false);
});

test("consumer contract inspection exposes aggregated read-only consumer surfaces", () => {
  const snapshot = inspectConsumerContractSnapshot();
  const summary = inspectConsumerContractSummary();
  const readiness = inspectConsumerReadinessView();
  const permissions = inspectConsumerPermissionView();
  const gates = inspectConsumerGateView();
  const blockedActions = inspectConsumerBlockedActionView();
  const action = inspectConsumerActionPosture("wallet.sign.real");

  assert.equal(snapshot.snapshot.consumerMode, "READ_ONLY_CONSUMER");
  assert.equal(snapshot.snapshot.boundaries.readOnly, true);
  assert.equal(snapshot.snapshot.boundaries.nonProduction, true);
  assert.equal(summary.summary.recommendedNextReq, "ACS-REQ-08");
  assert.ok(readiness.readiness.entries.length >= 13);
  assert.ok(permissions.permissions.entries.length >= 20);
  assert.ok(gates.gates.gates.length >= 15);
  assert.ok(blockedActions.blockedActions.actions.length >= 17);
  assert.equal(action.result.representedBlocked, true);
  assert.equal(action.result.executionTriggered, false);
});

test("AxodusAPP preview inspection exposes dashboard-safe read-only preview surfaces", () => {
  const snapshot = inspectAxodusAppPreviewSnapshot();
  const summary = inspectAxodusAppPreviewSummary();
  const readiness = inspectAxodusAppReadinessCards();
  const permissions = inspectAxodusAppPermissionCards();
  const gates = inspectAxodusAppGateCards();
  const blockedActions = inspectAxodusAppBlockedActionCards();
  const warnings = inspectAxodusAppCriticalWarnings();

  assert.equal(snapshot.snapshot.adapterMode, "AXODUSAPP_PREVIEW_READ_ONLY");
  assert.equal(snapshot.snapshot.targetConsumer, "AXODUSAPP_PORTFOLIO_INTELLIGENCE_HUB_PREVIEW");
  assert.equal(summary.summary.recommendedNextReq, "ACS-REQ-09");
  assert.ok(readiness.cards.length >= 13);
  assert.ok(permissions.cards.length >= 20);
  assert.ok(gates.cards.length >= 15);
  assert.ok(blockedActions.cards.length >= 17);
  assert.ok(warnings.warnings.some((warning) => warning.includes("Preview-only adapter")));
});

test("Business and Marketplace alignment inspection exposes read-only alignment surfaces", () => {
  const business = inspectBusinessAlignmentSnapshot();
  const marketplace = inspectMarketplaceAlignmentSnapshot();
  const summary = inspectBusinessMarketplaceAlignmentSummary();
  const businessActions = inspectBusinessCommerceBlockedActions();
  const marketplaceActions = inspectMarketplaceCommerceBlockedActions();
  const businessWarnings = inspectBusinessCriticalWarnings();
  const marketplaceWarnings = inspectMarketplaceCriticalWarnings();
  const businessCheck = inspectBusinessCommerceActionPosture("billing.execute.real");
  const marketplaceCheck = inspectMarketplaceCommerceActionPosture("provider.external.production.execute");

  assert.equal(business.snapshot.targetConsumer, "BUSINESS_ALIGNMENT_PREVIEW");
  assert.equal(marketplace.snapshot.targetConsumer, "MARKETPLACE_ALIGNMENT_PREVIEW");
  assert.equal(summary.summary.recommendedNextReq, "ACS-REQ-10");
  assert.ok(businessActions.actions.length >= 5);
  assert.ok(marketplaceActions.actions.length >= 5);
  assert.ok(businessWarnings.warnings.some((warning) => warning.includes("Business alignment is preview-only")));
  assert.ok(marketplaceWarnings.warnings.some((warning) => warning.includes("Marketplace alignment is HOLD/BACKLOG_READY")));
  assert.equal(businessCheck.result.representedBlocked, true);
  assert.equal(marketplaceCheck.result.representedBlocked, true);
});

test("inspection CLI commands return valid JSON without runtime side effects", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-inspection-cli-"));

  try {
    const commands = [
      ["capabilities"],
      ["capabilities", "--level", "product"],
      ["tenant-services"],
      ["tenant-services", "--tenant", "dao-alpha"],
      ["product-access", "--wallet", "0xlicensed", "--product", "product.trading-ignition"],
      ["policy-matrix"],
      ["policy-check", "--capability", "product.trading-ignition", "--tenant", "dao-alpha"],
      ["policy-check", "--capability", "product.trading-ignition", "--wallet", "0xstopped"],
      ["user-status", "--wallet", "0xexpired", "--tenant", "dao-alpha", "--product", "product.trading-ignition"],
      ["performance-records"],
      ["audit-receipts"],
      ["emergency-stops"],
      ["secret-storage-status"],
      ["observability-status"],
    ];

    for (const command of commands) {
      const output = execFileSync(process.execPath, [cliPath, ...command], {
        cwd: workspace,
        encoding: "utf8",
      });
      assert.doesNotThrow(() => JSON.parse(output), command.join(" "));
    }

    assert.equal(existsSync(join(workspace, ".acs")), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
