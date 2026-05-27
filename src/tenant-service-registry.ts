import type { AcsServiceCapability } from "./capability-registry.js";
import type { AcsTenantContext } from "./tenant-context.js";
import { tenantHasRestriction, tenantHasService } from "./tenant-context.js";
import type { PolicyDecision } from "./types.js";

export interface TenantServiceAccessInput {
  readonly tenant: AcsTenantContext;
  readonly capability: AcsServiceCapability;
  readonly governanceApproved?: boolean;
}

export function evaluateTenantServiceAccess(input: TenantServiceAccessInput): PolicyDecision {
  if (!input.capability.tenantAccessAllowed) {
    return { allowed: false, reason: `${input.capability.id} is not available to tenants` };
  }

  if (input.capability.requiresTenantApproval && !tenantHasService(input.tenant, input.capability.id)) {
    return { allowed: false, reason: `tenant ${input.tenant.tenantId} has not enabled ${input.capability.id}` };
  }

  if (tenantHasRestriction(input.tenant, `capability:${input.capability.id}:blocked`)) {
    return { allowed: false, reason: `tenant ${input.tenant.tenantId} is restricted from ${input.capability.id}` };
  }

  if (tenantHasRestriction(input.tenant, "acs.services.suspended")) {
    return { allowed: false, reason: `tenant ${input.tenant.tenantId} ACS services are suspended` };
  }

  if (input.capability.requiresGovernanceApproval && input.governanceApproved !== true) {
    return { allowed: false, reason: `${input.capability.id} requires governance approval` };
  }

  return { allowed: true };
}

