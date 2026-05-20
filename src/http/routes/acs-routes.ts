import { isConsumptionLevel } from "../../consumption-levels.js";
import type { AcsConsumptionLevel } from "../../consumption-levels.js";
import { AcsCapabilityRegistry } from "../../capability-registry.js";
import {
  inspectAuditReceipts,
  inspectCapabilities,
  inspectEmergencyStops,
  inspectObservabilityStatus,
  inspectPerformanceRecords,
  inspectPolicyCheck,
  inspectPolicyMatrix,
  inspectProductAccess,
  inspectSecretStorageStatus,
  inspectTenantServices,
  inspectUserStatus,
} from "../../inspection.js";
import { fail, ok } from "../responses.js";
import {
  AcsHttpValidationError,
  assertAllowedQueryParams,
  readOptionalQuery,
  readPathSegment,
  readRequiredQuery,
} from "../validation.js";
import {
  getMockOperationalState,
  getMockOperationalStatus,
  getMockReadiness,
} from "../services/operational-status-service.js";

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
      assertAllowedQueryParams(url, []);
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
            observability: "contract-only",
          },
        }, [], options.correlationId),
      };
    }

    if (path === "/acs/version") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok({ name: "@axodus/acs-core", version: "0.1.0" }, [], options.correlationId) };
    }

    if (path === "/acs/capabilities") {
      assertAllowedQueryParams(url, ["level"]);
      const levelParam = readOptionalQuery(url, "level");
      if (levelParam && !isConsumptionLevel(levelParam)) {
        return fail(`invalid consumption level: ${levelParam}`, 400, "invalid_query", options.correlationId);
      }

      if (levelParam) {
        return { status: 200, body: ok(inspectCapabilities({ level: levelParam as AcsConsumptionLevel }), [], options.correlationId) };
      }

      return { status: 200, body: ok(inspectCapabilities(), [], options.correlationId) };
    }

    if (path === "/acs/tenant-services") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectTenantServices(), [], options.correlationId) };
    }

    if (segments[1] === "tenant-services" && segments[2]) {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectTenantServices({ tenantId: readPathSegment(segments, 2, "tenantId") }), [], options.correlationId) };
    }

    if (path === "/acs/product-access") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectProductAccess(), [], options.correlationId) };
    }

    if (segments[1] === "product-access" && segments[2]) {
      assertAllowedQueryParams(url, []);
      const walletAddress = readPathSegment(segments, 2, "wallet");
      const productId = segments[3] ? readPathSegment(segments, 3, "productId") : undefined;
      assertKnownCapability(productId);
      return {
        status: 200,
        body: ok(inspectProductAccess({
          walletAddress,
          ...(productId ? { productId } : {}),
        }), [], options.correlationId),
      };
    }

    if (path === "/acs/policy-matrix") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectPolicyMatrix(), [], options.correlationId) };
    }

    if (path === "/acs/policy-check") {
      assertAllowedQueryParams(url, ["capabilityId", "tenantId", "wallet"]);
      const capabilityId = readRequiredQuery(url, "capabilityId");
      const tenantId = readOptionalQuery(url, "tenantId");
      const wallet = readOptionalQuery(url, "wallet");

      return {
        status: 200,
        body: ok(inspectPolicyCheck({
          capabilityId,
          ...(tenantId ? { tenantId } : {}),
          ...(wallet ? { wallet } : {}),
        }), [], options.correlationId),
      };
    }

    if (segments[1] === "status" && segments[2]) {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(getMockOperationalStatus(readPathSegment(segments, 2, "wallet")), [], options.correlationId) };
    }

    if (segments[1] === "readiness" && segments[2]) {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(getMockReadiness(readPathSegment(segments, 2, "wallet")), [], options.correlationId) };
    }

    if (segments[1] === "operational-state" && segments[2]) {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(getMockOperationalState(readPathSegment(segments, 2, "wallet")), [], options.correlationId) };
    }

    if (segments[1] === "user-status" && segments[2]) {
      assertAllowedQueryParams(url, ["tenantId", "productId"]);
      const wallet = readPathSegment(segments, 2, "wallet");
      const tenantId = readOptionalQuery(url, "tenantId");
      const productId = readOptionalQuery(url, "productId");
      assertKnownCapability(productId);
      return {
        status: 200,
        body: ok(inspectUserStatus({
          wallet,
          ...(tenantId ? { tenantId } : {}),
          ...(productId ? { productId } : {}),
        }).userStatus, [], options.correlationId),
      };
    }

    if (path === "/acs/performance-records") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectPerformanceRecords(), [], options.correlationId) };
    }

    if (path === "/acs/receipts") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectAuditReceipts(), [], options.correlationId) };
    }

    if (path === "/acs/emergency-stops") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectEmergencyStops(), [], options.correlationId) };
    }

    if (path === "/acs/secret-storage/status") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectSecretStorageStatus(), [], options.correlationId) };
    }

    if (path === "/acs/observability/status") {
      assertAllowedQueryParams(url, []);
      return { status: 200, body: ok(inspectObservabilityStatus(), [], options.correlationId) };
    }

    return fail("route not found", 404, "not_found", options.correlationId);
  } catch (error) {
    if (error instanceof AcsHttpValidationError) {
      return fail(error.message, 400, error.code, options.correlationId, error.details);
    }

    return fail(error instanceof Error ? error.message : "unknown ACS HTTP error", 400, "bad_request", options.correlationId);
  }
}

function assertKnownCapability(capabilityId: string | undefined): void {
  if (!capabilityId) {
    return;
  }

  new AcsCapabilityRegistry().require(decodeURIComponent(capabilityId));
}
