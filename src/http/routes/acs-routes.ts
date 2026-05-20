import { isConsumptionLevel } from "../../consumption-levels.js";
import type { AcsConsumptionLevel } from "../../consumption-levels.js";
import {
  inspectCapabilities,
  inspectPolicyCheck,
  inspectPolicyMatrix,
  inspectProductAccess,
  inspectTenantServices,
} from "../../inspection.js";
import { fail, ok } from "../responses.js";
import {
  getMockOperationalState,
  getMockOperationalStatus,
  getMockReadiness,
} from "../services/operational-status-service.js";

export function routeAcsRequest(requestUrl: string) {
  const url = new URL(requestUrl, "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const segments = path.split("/").filter(Boolean);

  if (segments[0] !== "acs") {
    return fail("route not found", 404);
  }

  try {
    if (path === "/acs/health") {
      return { status: 200, body: ok({ status: "ok", mode: "inspection", automation: "disabled" }) };
    }

    if (path === "/acs/version") {
      return { status: 200, body: ok({ name: "@axodus/acs-core", version: "0.1.0" }) };
    }

    if (path === "/acs/capabilities") {
      const levelParam = url.searchParams.get("level");
      if (levelParam && !isConsumptionLevel(levelParam)) {
        return fail(`invalid consumption level: ${levelParam}`, 400);
      }

      if (levelParam) {
        return { status: 200, body: ok(inspectCapabilities({ level: levelParam as AcsConsumptionLevel })) };
      }

      return { status: 200, body: ok(inspectCapabilities()) };
    }

    if (path === "/acs/tenant-services") {
      return { status: 200, body: ok(inspectTenantServices()) };
    }

    if (segments[1] === "tenant-services" && segments[2]) {
      return { status: 200, body: ok(inspectTenantServices({ tenantId: decodeURIComponent(segments[2]) })) };
    }

    if (path === "/acs/product-access") {
      return { status: 200, body: ok(inspectProductAccess()) };
    }

    if (segments[1] === "product-access" && segments[2]) {
      return {
        status: 200,
        body: ok(inspectProductAccess({
          walletAddress: decodeURIComponent(segments[2]),
          ...(segments[3] ? { productId: decodeURIComponent(segments[3]) } : {}),
        })),
      };
    }

    if (path === "/acs/policy-matrix") {
      return { status: 200, body: ok(inspectPolicyMatrix()) };
    }

    if (path === "/acs/policy-check") {
      const capabilityId = url.searchParams.get("capabilityId");
      if (!capabilityId) {
        return fail("capabilityId query parameter is required", 400);
      }

      return {
        status: 200,
        body: ok(inspectPolicyCheck({
          capabilityId,
          ...(url.searchParams.get("tenantId") ? { tenantId: url.searchParams.get("tenantId") ?? "" } : {}),
        })),
      };
    }

    if (segments[1] === "status" && segments[2]) {
      return { status: 200, body: ok(getMockOperationalStatus(decodeURIComponent(segments[2]))) };
    }

    if (segments[1] === "readiness" && segments[2]) {
      return { status: 200, body: ok(getMockReadiness(decodeURIComponent(segments[2]))) };
    }

    if (segments[1] === "operational-state" && segments[2]) {
      return { status: 200, body: ok(getMockOperationalState(decodeURIComponent(segments[2]))) };
    }

    return fail("route not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "unknown ACS HTTP error", 400);
  }
}
