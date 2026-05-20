import { isConsumptionLevel } from "../../consumption-levels.js";
import type { AcsConsumptionLevel } from "../../consumption-levels.js";
import { AcsCapabilityRegistry } from "../../capability-registry.js";
import {
  inspectCapabilities,
  inspectPolicyCheck,
  inspectPolicyMatrix,
  inspectProductAccess,
  inspectTenantServices,
} from "../../inspection.js";
import { fail, ok } from "../responses.js";
import { getMockUserStatusSummary } from "../../user-status.js";
import {
  getMockOperationalState,
  getMockOperationalStatus,
  getMockReadiness,
} from "../services/operational-status-service.js";
import { createAcsReceipt } from "../../acs-receipts.js";
import { getMockTradingIgnitionPerformanceRecords } from "../../performance-record.js";

export interface AcsRouteOptions {
  readonly correlationId?: string;
}

export function routeAcsRequest(requestUrl: string, options: AcsRouteOptions = {}) {
  const url = new URL(requestUrl, "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const segments = path.split("/").filter(Boolean);

  if (segments[0] !== "acs") {
    return fail("route not found", 404);
  }

  try {
    if (path === "/acs/health") {
      return {
        status: 200,
        body: ok({
          status: "ok",
          mode: "inspection",
          automation: "disabled",
          hardening: {
            apiVersioning: "enabled",
            responseEnvelope: "enabled",
            requestCorrelation: "enabled",
            schemaValidation: "placeholder",
            rateLimit: "placeholder",
            tenantAuth: "placeholder",
            observability: "placeholder",
          },
        }, [], options.correlationId),
      };
    }

    if (path === "/acs/version") {
      return { status: 200, body: ok({ name: "@axodus/acs-core", version: "0.1.0" }, [], options.correlationId) };
    }

    if (path === "/acs/capabilities") {
      const levelParam = url.searchParams.get("level");
      if (levelParam && !isConsumptionLevel(levelParam)) {
        return fail(`invalid consumption level: ${levelParam}`, 400, "invalid_query", options.correlationId);
      }

      if (levelParam) {
        return { status: 200, body: ok(inspectCapabilities({ level: levelParam as AcsConsumptionLevel }), [], options.correlationId) };
      }

      return { status: 200, body: ok(inspectCapabilities(), [], options.correlationId) };
    }

    if (path === "/acs/tenant-services") {
      return { status: 200, body: ok(inspectTenantServices(), [], options.correlationId) };
    }

    if (segments[1] === "tenant-services" && segments[2]) {
      return { status: 200, body: ok(inspectTenantServices({ tenantId: decodeURIComponent(segments[2]) }), [], options.correlationId) };
    }

    if (path === "/acs/product-access") {
      return { status: 200, body: ok(inspectProductAccess(), [], options.correlationId) };
    }

    if (segments[1] === "product-access" && segments[2]) {
      assertKnownCapability(segments[3]);
      return {
        status: 200,
        body: ok(inspectProductAccess({
          walletAddress: decodeURIComponent(segments[2]),
          ...(segments[3] ? { productId: decodeURIComponent(segments[3]) } : {}),
        }), [], options.correlationId),
      };
    }

    if (path === "/acs/policy-matrix") {
      return { status: 200, body: ok(inspectPolicyMatrix(), [], options.correlationId) };
    }

    if (path === "/acs/policy-check") {
      const capabilityId = url.searchParams.get("capabilityId");
      if (!capabilityId) {
        return fail("capabilityId query parameter is required", 400, "invalid_query", options.correlationId);
      }

      return {
        status: 200,
        body: ok(inspectPolicyCheck({
          capabilityId,
          ...(url.searchParams.get("tenantId") ? { tenantId: url.searchParams.get("tenantId") ?? "" } : {}),
          ...(url.searchParams.get("wallet") ? { wallet: url.searchParams.get("wallet") ?? "" } : {}),
        }), [], options.correlationId),
      };
    }

    if (segments[1] === "status" && segments[2]) {
      return { status: 200, body: ok(getMockOperationalStatus(decodeURIComponent(segments[2])), [], options.correlationId) };
    }

    if (segments[1] === "readiness" && segments[2]) {
      return { status: 200, body: ok(getMockReadiness(decodeURIComponent(segments[2])), [], options.correlationId) };
    }

    if (segments[1] === "operational-state" && segments[2]) {
      return { status: 200, body: ok(getMockOperationalState(decodeURIComponent(segments[2])), [], options.correlationId) };
    }

    if (segments[1] === "user-status" && segments[2]) {
      const productId = url.searchParams.get("productId") ?? undefined;
      assertKnownCapability(productId);
      return {
        status: 200,
        body: ok(getMockUserStatusSummary({
          wallet: decodeURIComponent(segments[2]),
          ...(url.searchParams.get("tenantId") ? { tenantId: url.searchParams.get("tenantId") ?? "" } : {}),
          ...(productId ? { productId } : {}),
        }), [], options.correlationId),
      };
    }

    if (path === "/acs/performance-records") {
      return { status: 200, body: ok({ records: getMockTradingIgnitionPerformanceRecords() }, [], options.correlationId) };
    }

    if (path === "/acs/receipts") {
      return {
        status: 200,
        body: ok({
          receipts: [
            createAcsReceipt({
              receiptId: "receipt_mock_policy_check_001",
              correlationId: options.correlationId ?? "corr_mock_policy_check_001",
              tenantId: "dao-alpha",
              wallet: "0xlicensed",
              consumptionLevel: "product",
              capabilityId: "product.trading-ignition",
              actionType: "policy_check",
              actor: { type: "system", id: "acs.inspection" },
              policyDecision: {
                allowed: true,
                automationLevel: "manual_approval",
                requiresGovernanceApproval: true,
                requiresUserLicense: true,
              },
              operationalState: "READY",
              telemetry: { warnings: ["mock audit preview only"], riskFlags: [] },
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
          ],
        }, [], options.correlationId),
      };
    }

    return fail("route not found", 404, "not_found", options.correlationId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "unknown ACS HTTP error", 400, "bad_request", options.correlationId);
  }
}

function assertKnownCapability(capabilityId: string | undefined): void {
  if (!capabilityId) {
    return;
  }

  new AcsCapabilityRegistry().require(decodeURIComponent(capabilityId));
}
