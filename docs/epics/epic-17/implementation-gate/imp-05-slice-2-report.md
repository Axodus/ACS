# EPIC-17-IMP-05 — Slice 2 Durable Automation Identity/History

**Status:** COMPLETE / CTO ACCEPTED / PUBLISHED  
**Date:** September 14, 2026  
**Publication:** commit and push authorized by CTO  
**Canonical schema:** 10 remains canonical until CTO acceptance and publication  
**Schema 11:** canonical after this accepted publication

## Delivered persistence boundary

Schema 11 is additive and introduces only the approved Automation persistence shape:

    acs_automations
      stable identity, current revision/fingerprint, lifecycle and lifecycle sequence
            ↓
    acs_automation_revisions
      immutable configuration history
            ↓
    acs_automation_lifecycle_events
      append-only lifecycle facts

The durable repository provides Tenant-qualified idempotent commands for revision advancement and lifecycle transition, exact head CAS, exact historical reconstruction, Event/Evidence/outbox writes in the existing transaction authority, and typed integrity failures.

The migration limits foreign keys to Tenant, internal Automation lineage and existing Event infrastructure. Agent, Workforce, Workflow, Delegation, governed-resource and executor values persist as typed external references in revision payloads. No external owner is acquired and no external reference is resolved operationally.

## Required durable proofs

| Requirement | Evidence |
| --- | --- |
| migration 10 → 11 | state.migrate() reached schema version 11 in an isolated PostgreSQL schema. |
| exact immutable revisions | acs_automation_revisions persists full validated revision payloads; update/delete guards reject mutation. |
| head CAS | revision advancement locks the aggregate and rejects stale revision/fingerprint with RevisionConflictError. |
| Tenant integrity | Automation ID, revision, head, Event and Tenant-qualified idempotency scope are validated before write; cross-Tenant command shape rejects with NativeAutomationIntegrityError. |
| lifecycle reconstruction | root draft fact plus subsequent append-only lifecycle facts rebuild current lifecycle and sequence exactly. |
| archive preservation | archive retains both revisions and full lifecycle history; a later revision is rejected for archived Automation. |
| target semantics | a persisted PINNED revision retains its exact target ref; a successor RESOLVED_AT_ACTIVATION revision retains policy ref, selector and parameters without resolved target. |
| idempotent replay | same Tenant-qualified key and request hash returns the original lineage. |
| changed payload, same key | request-hash mismatch returns NativeIdempotencyConflictError. |
| Event/Evidence/outbox atomicity | creation writes all three; a deliberate duplicate-outbox conflict leaves Event, Evidence, Outbox and lifecycle counts unchanged. |
| external references | no FK or lookup exists for Agent, Workforce, Workflow, Delegation, resources or executor references. |

## Validation

| Command | Result |
| --- | --- |
| npm run build | PASS |
| Slice 1 + Slice 2 focused tests | PASS — 2 / 0 |
| npm run acceptance:postgres | PASS — PostgreSQL 17.6, schema 11, 22 / 0 / 0 |
| ACS_ENVIRONMENT=local npm run check | 138 pass / 10 fail |
| git diff --check | PASS |

## Full-regression causality

| Classification | Count | Evidence |
| --- | ---:| --- |
| A — caused by Slice 2 | 0 | Schema 11 migration, focused tests and PostgreSQL acceptance pass; no new failure appears. |
| B — independent real regression | 0 | No non-environment regression observed. |
| C — environment / harness | 10 | Unchanged listener/process failures: acs-v2-imp-03e, s48, s50, s51, s52, s54, s55, s56, s57, s77. |
| D — indeterminate | 0 | The failure set exactly matches the accepted Slice 1 baseline. |

## Scope confirmation

This Slice changes only Schema 11, durable Automation identity/history commands, the shared-state facade, schema-version assertions and the focused PostgreSQL test.

It adds no Product API, administration UI, Activation, scheduler, trigger occurrence processing, Run creation, Workflow execution, OpenClaw runtime integration, authority revalidation or Schema 12.

## CTO decision requested

The implementation and evidence are ready for Slice 2 review. Schema 11 is promoted to canonical by the accepted publication; Schema 10 is superseded.
