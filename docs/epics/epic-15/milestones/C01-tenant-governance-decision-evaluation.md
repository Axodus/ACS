# Milestone C01 — Tenant Governance Contracts and Decision Evaluation

## Discovery

- The control plane already had canonical tenant lifecycle and membership contracts from A01 and B01.
- Governance-related concepts were present only as scattered boundary concerns and projections.
- Agent roles, runtime readiness, deployment flow, tools, and economics all needed to remain separate from tenant governance decisions.
- No generic policy engine was required or introduced.

## Implemented scope

- canonical governance policy contracts;
- governed action taxonomy;
- entitlement grants and revocations;
- tenant limits and hard system ceiling semantics;
- deterministic decision evaluators;
- audit-ready mutation and decision receipts;
- tenant-scoped authority integration;
- deferred enforcement boundary.

## Files and modules

- src/control-plane/tenant-governance.ts
- dist/control-plane/tenant-governance.js
- dist/control-plane/tenant-governance.d.ts
- src/index.ts
- dist/index.js
- dist/index.d.ts
- tests/tenant-governance-decision-evaluation.test.mjs
- docs/epics/epic-15/contracts.md
- docs/epics/epic-15/boundary-review.md
- docs/epics/epic-15/stories.md

## Governance model

- Governance policy is a tenant-scoped allow/deny rule set.
- Entitlements model capability eligibility.
- Limits model bounded capacity.
- The three concepts remain separate and do not collapse into a generic policy or billing abstraction.

## Governed actions

- agent.create
- agent.configure
- deployment.create
- deployment.start
- tool.install
- plugin.install
- execution.start

## Default semantics

- No explicit policy resolves to deny.
- Explicit tenant deny overrides allow.
- System hard prohibition overrides all tenant decisions.
- Suspended and archived tenants remain conservative and do not regain privileged capability by implication.

## Precedence

1. system hard prohibition
2. tenant archived or suspended state
3. explicit tenant deny
4. explicit tenant allow
5. tenant default
6. no-policy default deny

## Entitlements

- Tenants can be granted or revoked named capability keys.
- Missing entitlement resolves to denied unless a future contract changes the default explicitly.
- Entitlement data remains tenant-scoped and audit-ready.

## Limits

- Limits are stored as tenant-scoped configured values.
- Hard system limits remain authoritative ceilings.
- Effective limit is the minimum of comparable tenant and system values.
- Tenant configuration cannot widen a hard ceiling.

## Authority integration

- tenant_owner can mutate governance, entitlements, and limits within tenant scope.
- tenant_admin has narrower, explicitly documented governance visibility.
- operator and auditor remain read-only.
- platform_admin remains explicit and separate from membership roles.

## Tenant lifecycle integration

- provisioning may accept initial governance state;
- active tenants support governed mutation according to authority;
- suspended tenants retain deterministic evaluation but are conservative for mutation;
- archived tenants block mutation and retain historical visibility only.

## Audit-ready receipts

Each mutation or decision can produce receipts containing:

- tenantId;
- action or key;
- prior value;
- next value;
- decision or effect;
- basis;
- actor or authority basis;
- timestamp;
- revision;
- reason when supplied.

## Enforcement boundary

- This milestone produces decisions.
- Enforcement consumes those decisions later.
- No runtime blocking, metering, billing, or product-wide security rewrite is introduced here.

## Economics and usage boundary

- Economics and billing stay deferred.
- Usage can be consumed only through a narrow future boundary if required.
- No metering store or pricing system is introduced.

## Deferred scope

- runtime enforcement;
- billing and pricing;
- metering infrastructure;
- generic policy DSL;
- ABAC or generic IAM;
- UI implementation.

## Test matrix

- policy allow/deny/default behavior;
- precedence;
- entitlement grant/revoke/default behavior;
- limit validation and effective limit computation;
- authority checks for mutation paths;
- tenant lifecycle gating;
- audit receipt contents;
- cross-tenant isolation.

## Acceptance result

Completed. C01 now has canonical governance, entitlement, and limit contracts with deterministic evaluation and audit-ready receipts, while enforcement remains deferred.
