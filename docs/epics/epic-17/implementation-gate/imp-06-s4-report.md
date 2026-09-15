# EPIC-17-IMP-06 S4 — Schedule Occurrence & Recovery Machinery

**Status:** `COMPLETE / CTO ACCEPTED / PUBLICATION AUTHORIZED`
**Baseline:** `7be46f0`
**Schema:** `12 / CANONICAL`
**Date:** September 14, 2026

## Scope delivered

S4 adds a deterministic, explicitly invoked recovery service. It is not a
scheduler daemon, worker, timer, cron process or OpenClaw integration.

- `ScheduleDefinitionV1` governs a normalized, versioned schedule
  specification, explicit timezone/DST handling, missed-work policy and finite
  recovery bounds.
- `ScheduleSpecificationRegistryV1` selects an injected canonical evaluator by
  exact specification kind and version. There is no implicit cron, RRULE or
  iCalendar parser and unavailable formats fail closed.
- `ScheduleOccurrenceV1` derives a logical identity from Tenant, exact
  Automation revision/fingerprint, schedule semantic digest, timezone and
  either a logical slot or a coalesced interval. Worker, claim, attempt,
  process and restart identity are absent.
- `ScheduleRecoveryServiceV1.reconcile(...)` loads the exact Automation
  revision, evaluates slots from the durable watermark, applies `SKIP`,
  `COALESCE` or bounded `CATCH_UP`, delegates each eligible occurrence to
  `ScheduleOccurrenceActivationIngressV1`, then advances the Schema-12
  watermark only after durable materialization.
- `ScheduleOccurrenceActivationIngressV1` composes the existing
  `nativeCore.createActivation(...)` owner. It creates only observed
  Activations with metadata-safe Event/outbox entries. It does not claim,
  resolve, prepare, call admission, create a Run or invoke execution.

## Recovery and failure behavior

The watermark represents durable recovery progress, not worker ownership. A
failure after Activation materialization but before watermark save leaves the
watermark unchanged. A retry derives the same logical occurrences and the
existing Tenant-qualified Activation causal uniqueness returns the same durable
Activation rather than a duplicate. A recovery cutoff outside the configured
lookback, a materialization count above the finite bound, an invalid schedule
definition, unavailable format/version, invalid timezone or cross-Tenant input
fails closed.

## Validation evidence

| Check | Result |
| --- | --- |
| Build | PASS — `npm run build` |
| Focused S4 | PASS — 6 tests / 0 failures |
| PostgreSQL | PASS — PostgreSQL 17.6, Schema 12, 26 tests / 0 failures / 0 skips |
| PostgreSQL S4 crash proof | PASS — three observed Activations survive injected failure before watermark; retry creates no duplicate and advances one watermark |
| Full regression | RUN — 141 passing files / 10 failing files |
| Regression causality | `A = 0`, `D = 0`, `C = 10` existing listener/process environment denials |
| `git diff --check` | PASS |

The S4 focused and PostgreSQL tests passed. The full-regression failures are the
same listener/process-environment class outside S4 (`acs-v2-imp-03e`,
`s48`, `s50`–`s52`, `s54`–`s57`, `s77`) and do not exercise the S4 contracts or
recovery service.

## Required-property coverage

| Property | Evidence |
| --- | --- |
| Same slot / restart has same logical identity | focused identity/restart test |
| Unknown format/version fails closed | focused registry test |
| Deterministic timezone normalization | focused `Etc/UTC` normalization and invalid-zone rejection |
| SKIP, COALESCE, CATCH_UP | focused policy test |
| Unbounded recovery rejected | finite `max_occurrences_per_recovery` validation and bounded CATCH_UP rejection |
| Crash recovery without loss or duplicate | focused injected failure and PostgreSQL proof |
| Tenant isolation | focused cross-Tenant rejection before persistence |
| Canonical Activation ownership | ingress delegates to `nativeCore.createActivation` |
| Event/outbox metadata safety | Activation Event contains refs/identifiers only; no raw schedule/provider/executor payload |
| No admission, Run, Workflow or daemon | no imports/calls to admission/runtime execution; service has only explicit `reconcile(...)` |

## Explicit exclusions

S4 does not introduce a continuous scheduler loop, background worker, timer or
cron integration. It does not invoke admission, create a Run or Workflow,
execute OpenClaw, alter Schema 12, create Schema 13, replace the Activation
owner or add a second admission engine.

## CTO disposition

S4 is accepted for publication. The commit remains limited to the contracts,
recovery service, canonical Activation ingress, focused/PostgreSQL tests and
directly associated evidence in this report.
