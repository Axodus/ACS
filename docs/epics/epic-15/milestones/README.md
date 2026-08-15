# EPIC-15 Milestones Index

This directory contains the implementation-oriented sequence for EPIC-15 tenant administration and governance.

## Milestone A — Tenant Domain and Lifecycle

Status: implemented in Sprint A01.

Focus:
- canonical tenant identity;
- tenant lifecycle and archive semantics;
- domain invariants and audit-ready mutation contracts.

Exit criteria:
- tenant state transitions are explicit and tested;
- hard delete remains deferred;
- the tenant domain is stable enough for membership and authority work.

## Milestone B — Membership and Administrative Authority

Status: implemented in Sprint B01.

Focus:
- tenant membership;
- owner semantics;
- tenant-scoped administrative authority;
- cross-tenant privilege-escalation protection.

Exit criteria:
- principal to tenant membership is canonical;
- authority scope is explicit;
- ownership invariants are protected;
- audit-ready receipts exist for privileged mutations.

## Milestone C — Governance, Limits and Entitlements

Status: implemented in Sprint C01.

Focus:
- governance policy evaluation;
- entitlement evaluation;
- limit evaluation;
- deterministic decision receipts;
- hard system ceiling protection;
- enforcement handoff boundaries.

Exit criteria:
- governance, entitlement, and limit contracts remain separate;
- precedence and default semantics are explicit;
- decision receipts are audit-ready;
- enforcement remains deferred to later milestones.

## Milestone D — Administrative Surface and Enforcement Integration

Status: deferred.

Focus:
- administrative read/write surfaces;
- future runtime and control-plane enforcement integration;
- audit/history consumption.
