# EPIC-17-IMP-06 — Slice 1 Evidence Report

**Status:** `IMPLEMENTED CANDIDATE / CTO REVIEW READY`
**Date:** September 14, 2026
**Scope:** Activation contracts, causal identity, state machine, claim/fencing contracts, admission-handoff contracts and Event subject closure
**Excluded:** Schema 12 migration/persistence, source ingestion, scheduler runtime, target/authority owner calls, admission call, Run/Workflow creation, worker invocation and OpenClaw execution.

## Implemented contract surface

| Surface | Evidence | Boundary preserved |
| --- | --- | --- |
| source-specific causal identity | `src/native-core/activation.ts` | Tenant + exact Automation revision/fingerprint + source-class occurrence derive one stable `activation_id`; no universal arbitrary key. |
| source classes | `event`, `channel`, `schedule`, `manual`, `system` discriminated contracts | irrelevant source fields are not forced across classes. |
| Activation state | immutable append-only state facts and head advancement validation | Activation is not Automation, admission, Run, Workflow or executor. |
| claims and attempts | bounded claim/fencing and processing-attempt contracts | claim/attempt are separate from causal identity and no lease storage/runtime recovery exists. |
| handoff | structural pre-admission handoff intent | existing admission remains the decision owner; no `admitted=true` shortcut. |
| target/authority contexts | typed resolution and governing-reference contracts | no target resolution, Delegation resolver or authority call occurs. |
| Event subject | `activation` added to existing closed Event subject vocabulary | metadata-safe validation remains shared; no Event store/schema change. |

## Required proof matrix

| Required proof | Result | Evidence |
| --- | --- | --- |
| deterministic causal identity | `PASS` | same Tenant/revision/source identity derives the same `activation_id` |
| source-class separation | `PASS` | Event, Channel, Schedule, Manual and System have explicit discriminated shapes |
| same logical occurrence → same identity | `PASS` | focused test replay case |
| semantic occurrence change → different identity | `PASS` | changed source event ID and changed exact Automation revision alter identity |
| exact Automation revision/fingerprint participates | `PASS` | `AutomationRevisionRefV1` is causal input and Tenant-matched |
| retry metadata does not alter identity | `PASS` | claim, attempt and fencing are separate contracts |
| immutable state facts | `PASS` | frozen validated facts; head only advances by next append-only fact |
| valid transitions | `PASS` | observed → claimed → resolving → prepared → handoff_pending contract proof |
| invalid transitions fail closed | `PASS` | observed → admitted is rejected with `INVALID_STATE_TRANSITION` |
| claim != Activation identity | `PASS` | independent claim ID/lease/fence contract |
| attempt != Activation identity | `PASS` | independent attempt ID/sequence and claim reference |
| fencing without runtime implementation | `PASS` | stale/expired/mismatched fence is represented as typed `STALE_FENCE` rejection |
| handoff != admission decision | `PASS` | handoff status only supports prepared/submitted/unknown/reconciled; no admission outcome mutation |
| target/authority grants no execution authority | `PASS` | structural refs only; no resolver/admission/runtime import or call |
| Event subject metadata-safe | `PASS` | `activation` subject accepted; secret-bearing payload rejected by shared validation |

## Validation

| Check | Result |
| --- | --- |
| Build | `PASS` — `npm run build` |
| Focused Slice 1 | `PASS` — 5 subtests, 0 failures |
| Full regression | `RUN` — 141 passing files, 10 failing files, 0 skips |
| Causality A | `0` |
| Causality B | `0` |
| Causality C | `10` environment-blocked suites |
| Causality D | `0` |
| `git diff --check` | `PASS` |
| Scope violation | `NONE` |

## Full-regression causality

The ten failing suites are pre-existing HTTP/process acceptance scenarios. Direct isolated runs show the same cause in each: the environment rejects listener creation with `listen EPERM: operation not permitted` on `127.0.0.1` or `0.0.0.0`.

| Classification | Suites | Cause |
| --- | --- | --- |
| `C` environment | `acs-v2-imp-03e`, `s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57`, `s77` | sandbox/network-listener restriction; no Activation contract path is involved |

The focused Slice 1 suite passed during the complete run. The changed paths contain native contracts, one Event subject enum extension, focused tests and IMP-06 documentation only. No failure is causally attributable to the Slice 1 implementation.

## Frozen operational boundary

```text
enable != executable
enable != authorized
enable != target resolved
enable != Delegation revalidated
Activation != admission decision
Activation != Run / Workflow / executor
```

The next authorized decision remains CTO acceptance/publication of Slice 1. Schema 12 migration and durable Activation persistence remain `HOLD`.
