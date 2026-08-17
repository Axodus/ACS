# AEES-RP — Readiness Projection & Dashboard Reconciliation

**Status:** PASS — HOTFIX-05 ACCEPTED

**Sequence:** RP01 → RP02 → RP03

**Exit:** Dashboard Overview, readiness APIs and diagnostics project the actual ACS state, distinguishing resolved certified-topology capabilities from global/topology caveats.

## Context

Dashboard Overview still uses the legacy EPIC-10 readiness projection. Its fixed defaults describe the pre-15.5 system and generate historical A01 blockers even when production-oriented adapters are active.

This contradicts certified evidence:

- EPIC-15.5 D/E/G: remote workers, recovery, external telemetry, governed production deployment;
- AEES-SH: shared PostgreSQL authority and dual-process semantics;
- MH02: external OIDC/JWKS, Vault, trusted edge and OTLP.

Global multi-host remains intentionally not certified. Those limitations must appear as caveats, not as false local errors.

## Current UX boundary

```text
/               → customer-facing operational health and activity
/administration → profile, composition, readiness and certification
```

The current root Dashboard no longer treats platform readiness diagnostics as the primary customer experience. Profile-aware semantics from HOTFIX-04 remain available under Administration Overview.

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

## Closure sequence

- HOTFIX-03 proved the runtime path and active application provenance.
- HOTFIX-04 made readiness relative to the selected profile.
- HOTFIX-05 separated customer operational health from technical administration and completed browser acceptance.

Evidence: `/tmp/acs-aees-rp-hotfix05-evidence/manifest.json` (`PASS`).

## Relation to EPIC-16

AEES-RP is a prerequisite before the EPIC-16 normative package proceeds.
