export type AcsTenantType = "root" | "dao" | "subdao" | "partner" | "product";

export interface AcsTenantContext {
  readonly tenantId: string;
  readonly tenantType: AcsTenantType;
  readonly governanceStatus: string;
  readonly federationTier: string;
  readonly enabledServices: readonly string[];
  readonly restrictions: readonly string[];
}

export interface AcsTenantPolicyContext {
  readonly tenant: AcsTenantContext;
  readonly capabilityId: string;
}

export function createTenantNamespace(tenant: AcsTenantContext): string {
  return `tenant:${tenant.tenantType}:${tenant.tenantId}`;
}

export function tenantHasService(tenant: AcsTenantContext, serviceId: string): boolean {
  return tenant.enabledServices.includes(serviceId);
}

export function tenantHasRestriction(tenant: AcsTenantContext, restriction: string): boolean {
  return tenant.restrictions.includes(restriction);
}

export function assertSameTenantContext(left: AcsTenantContext, right: AcsTenantContext): void {
  if (left.tenantId !== right.tenantId) {
    throw new Error(`tenant context mismatch: ${left.tenantId} cannot access ${right.tenantId}`);
  }
}

