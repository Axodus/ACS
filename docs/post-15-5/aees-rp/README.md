# AEES-RP — Readiness Projection & Dashboard Reconciliation

**Status:** PASS

**Sequence:** RP01 → RP02 → RP03

**Exit:** Dashboard Overview, readiness APIs and diagnostics project the actual ACS state, distinguishing resolved certified-topology capabilities from global/topology caveats.

## Context

Dashboard Overview still uses the legacy EPIC-10 readiness projection. Its fixed defaults describe the pre-15.5 system and generate historical A01 blockers even when production-oriented adapters are active.

This contradicts certified evidence:

- EPIC-15.5 D/E/G: remote workers, recovery, external telemetry, governed production deployment;
- AEES-SH: shared PostgreSQL authority and dual-process semantics;
- MH02: external OIDC/JWKS, Vault, trusted edge and OTLP.

Global multi-host remains intentionally not certified. Those limitations must appear as caveats, not as false local errors.

## Objective

Replace historical projection with topology-aware readiness:

```text
certified topology capability → READY / DEGRADED / BLOCKED from live state
global claim limitation       → CAVEAT / NOT_CERTIFIED
historical A01 text           → retired from active dashboard findings
```

## Scope

Hotfix of projection and documentation only. No foundation reimplementation.

## Gates

- RP01 — Readiness Source-of-Truth Audit
- RP02 — Finding & Topology-Aware Readiness Reconciliation
- RP03 — Dashboard Overview Acceptance

## Relation to EPIC-16

AEES-RP is a prerequisite before the EPIC-16 normative package proceeds.
