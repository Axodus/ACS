# AEES-RP — Readiness Projection & Dashboard Reconciliation

**Nature:** post-15.5 correctness hotfix

**Baseline:** EPIC-15.5 closed; AEES-SH PASS; MH02 PASS; MH03 NOT CERTIFIED due to missing physical multi-host infrastructure.

## RP01 — Readiness Source-of-Truth Audit

### Discovery

```text
GET /api/v1/dashboard
  → ProductApiClient.getDashboardSummary()
  → ProductApiClient.getGlobalReadinessSummary()
  → createEpic10ReadinessReport()
  → Dashboard blockers
```

`src/control-plane/epic-10-readiness.ts` still contains pre-15.5 defaults and wording. `getGlobalReadinessSummary()` overwrote live adapter state with historical values, so the Overview reported false blockers.

| Historical dashboard blocker | Correct projection after reconciliation |
| --- | --- |
| in-memory/filesystem secret storage | ready when Vault/KMS is configured and healthy; provider HA is caveat |
| process-local deployment/runtime/audit/economic state | ready for shared/durable selected profile; multi-host/HA is caveat |
| HTTP auth disabled/mock-only | ready when trusted OIDC/required identity is configured |
| external exporters disabled | ready/degraded from telemetry provider |
| worker local-only | ready/partial from remote runtime descriptor and worker health |
| duplicated secret-store finding | one canonical secret-provider result only |
| sandbox-only governance | production gate ready/blocked from evaluator |

**RP01 gate:** PASS when legacy sources and hardcoded historical signals are identified.

## RP02 — Finding & Topology-Aware Reconciliation

### Contract

```text
Certified topology readiness
  READY | PARTIAL | BLOCKED from active dependencies and configured adapters

Global claim
  READY | PARTIALLY_CERTIFIED | NOT_CERTIFIED
  based on certified topology limits, never emitted as a false local blocker
```

### Required behavior

- Derive identity, secrets, persistence, settlement, telemetry, remote runtime and deployment eligibility from ControlPlaneContext descriptors.
- Preserve real dependency failures as blockers.
- Remove the duplicate secret-storage finding.
- Keep PRODUCTION_LIKE_SINGLE_HOST / DUAL_PROCESS_SHARED_STATE as certified topology evidence when selected.
- Present physical multi-host, host failover, cross-host workers and provider HA as caveats.
- Do not upgrade Global Production Ready from same-host evidence.

**RP02 gate:** PASS when dashboard/API findings are derived from live adapters, certified topology and real dependency state.

## RP03 — Dashboard Overview Acceptance

### Acceptance cases

1. Production-oriented context does not emit the seven historical A01 blockers.
2. Global caveats remain visible and are not counted as active errors.
3. A real unavailable dependency still appears as an actionable blocker.
4. Dashboard and readiness API report the same blocker count/state.
5. Overview surface contains no historical blocker text and no secret material.

**RP03 gate:** PASS when targeted backend and browser acceptance prove the Overview is topology-aware.

### Final acceptance

HOTFIX-05 establishes the final information architecture:

```text
Customer operational health  → /
Technical readiness          → /administration
```

The real `.design/app-standalone` surface passed the four-viewport light/dark Dashboard matrix, Administration desktop/mobile checks, route regressions and mobile drawer interactions. The manifest reports zero accessibility, overflow, page, console, API, request and sensitive-data failures.

The profile regression contract remains unchanged:

- development adapters are truthful characteristics, not critical errors;
- misconfigured production-like profiles retain critical blockers;
- certified production-oriented composition removes corresponding blockers;
- `GLOBAL_MULTI_HOST_NOT_CERTIFIED` remains a global caveat.

## Non-goals

- no MH03 retry;
- no secrets/persistence/identity/runtime reimplementation;
- no provider HA claim;
- no EPIC-16 product work;
- no rewrite of historical EPIC-15.5 findings.

## Definition of done

```text
Dashboard Overview is truthful for the selected certified topology.
Historical blockers are absent when their successor capabilities are active.
Actual dependency failures remain actionable.
Global limitations remain explicit but are not misrepresented as local errors.
```

## Terminal decision

```text
RP01: PASS
RP02: PASS
RP03: PASS
AEES-RP: PASS

EPIC-16 Normative Package: UNBLOCKED
```
