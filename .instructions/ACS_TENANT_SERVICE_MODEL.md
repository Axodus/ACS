# ACS Tenant Service Model

# Purpose

ACS must never treat all DAOs, tenants, products, or users as one shared context.

Tenant isolation is required from the beginning.

---

# Tenant Context

Tenant-aware ACS contracts must include:
- `tenantId`
- tenant namespace
- tenant type
- governance status
- federation tier
- enabled services
- restrictions
- service status
- tenant policy context

---

# Service Access Rules

A tenant can consume an ACS Service only when:
- the capability allows tenant access
- the tenant has enabled the service when required
- tenant ACS services are not suspended
- no capability-specific restriction blocks access
- governance approval exists when required

---

# Isolation Rules

- Tenant A cannot access Tenant B context.
- Tenant telemetry must include tenant identity when applicable.
- Tenant receipts must include tenant identity when applicable.
- Tenant restrictions override service availability.
- Tenant service execution remains bounded by policy and governance.

---

# Current Implementation

- `src/tenant-context.ts`
- `src/capability-registry.ts`
- `src/tenant-service-registry.ts`
- `src/inspection.ts`
- `scripts/acs.mjs` read-only inspection commands
