# EPIC-17-IMP-05 — Slice 1 Automation Contracts, Lifecycle & Target Semantics

**Status:** `COMPLETE / CTO ACCEPTED / PUBLISHED`
**Authority consumed:** Native Core contracts, focused tests and the `automation` Event subject only
**Schema / migration:** unchanged; schema 10 remains canonical and schema 11 remains approved design only
**Persistence / Product API / Activation / scheduler / OpenClaw runtime:** unchanged

## Delivered boundary

Slice 1 adds [native Automation contracts](../../../../src/native-core/automation.ts), exports them through the Native Core index, and allows `automation` in the existing in-memory Event-envelope subject vocabulary. It does not add a schema migration, durable repository, PostgreSQL query, shared-state mutation, Product API route, scheduler, trigger receiver, Activation, admission integration, Run creation or executor call.

The contracts provide:

- `AutomationRevisionV1` with stable Tenant-scoped `automation_id`, immutable predecessor-linked revisions and a deterministic semantic fingerprint;
- `AutomationHeadV1` with exact revision/fingerprint CAS semantics and an independently tracked lifecycle/current-state contract;
- `AutomationLifecycleEventV1` as an append-only fact, separate from authored revision history;
- frozen `PINNED` and `RESOLVED_AT_ACTIVATION` target shapes that are mutually exclusive and fail closed;
- structural, non-authoritative references for Agent, Workforce, Workflow, governed resources, Delegation requirements and executor integrations;
- Trigger/Schedule definition contracts as revision configuration only, with no occurrence, scheduler, catch-up or retry behavior;
- the accepted `automation` Event subject for focused contract/Event validation only. No persistent Event vocabulary or database constraint is changed.

## Contract evidence

| Required property | Evidence |
| --- | --- |
| stable `automation_id` | `AutomationRevisionRefV1` and `AutomationHeadV1` bind stable ID, Tenant, revision and fingerprint. |
| immutable revision semantics | `createAutomationRevisionV1` emits frozen revisions; later revisions require the immediate exact predecessor. |
| deterministic fingerprint | `fingerprintAutomationRevisionV1` canonicalizes object fields and unordered reference/definition arrays, excludes non-semantic author/time/reason/provenance metadata, and rejects mismatched supplied fingerprints. |
| CAS/head semantics | `assertAutomationHeadAdvanceV1` requires exact expected revision/fingerprint and rejects stale, mismatched or archived heads. |
| valid/invalid `PINNED` | requires one exact `RevisionRef`; forbids a resolution policy. |
| valid/invalid `RESOLVED_AT_ACTIVATION` | requires deterministic policy ref/selector/parameters; forbids an exact resolved target. |
| revision versus lifecycle | lifecycle events observe an exact revision but do not mutate it; semantic configuration change advances revision/head only. |
| enable/disable/archive | valid transitions are explicit; archive is terminal and no implicit unarchive exists. |
| external refs remain non-authoritative | contracts only validate type/shape/Tenant compatibility for Delegation requirements; no owner lookup, availability check, authority resolution or executor invocation occurs. |
| Delegation grants no authority | `delegation_requirement_refs` carries exact Grant revision refs only; no Delegation usability/attenuation resolver is imported or called. |
| Automation grants no execution | module imports no persistence, shared state, Product API, admission, Runtime or OpenClaw engine surface. |

## Validation

| Command | Result |
| --- | --- |
| Build — `npm run build` | `PASS` |
| `node tests/epic-17-imp-05-slice-1-automation-contracts.test.mjs` | `PASS — 5 / 0` |
| `ACS_ENVIRONMENT=local npm run check` | `137 pass / 10 fail` |
| `git diff --check` | `PASS` |
| PostgreSQL acceptance | Not run: Slice 1 changes no migration or durable persistence path. |

## Full-regression causality — September 14, 2026

| Classification | Count | Evidence |
| --- | --- | --- |
| A — caused by Slice 1 | 0 | Focused suite passes in isolation and within full regression. The new module is pure Native Core; it has no persistence, HTTP, Product API, admission, Runtime or OpenClaw engine import. |
| B — independent real regression | 0 | No non-environment regression was observed in this run. |
| C — environment / harness | 10 | `acs-v2-imp-03e`, `s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57`, `s77` fail at local listener/process boundaries. Direct reproduction shows `listen EPERM` before application behavior at `127.0.0.1` and `0.0.0.0`. |
| D — indeterminate | 0 | The direct listener reproductions and unchanged known failure set establish the cause. |

Direct reproduction of `acs-v2-imp-03e` passed four non-listener assertions before `listen EPERM: operation not permitted 127.0.0.1`. `s77` passed its unauthenticated external-bind rejection before subsequent loopback/external listener assertions failed with the same `EPERM` boundary.

## Scope confirmation

The functional diff is limited to:

- `src/native-core/automation.ts`;
- `src/native-core/index.ts` export;
- `src/native-core/runtime.ts` Event subject union/validator;
- `tests/epic-17-imp-05-slice-1-automation-contracts.test.mjs`.

No migration, `shared-state`, PostgreSQL, Product API, HTTP route, scheduler, Activation, admission, Run, Workforce mutation or OpenClaw runtime source changed.

## Publication and next boundary

Slice 1 is `COMPLETE / CTO ACCEPTED / PUBLISHED`. Slice 2 is separately authorized for Schema 11 migration and durable Automation identity/history only. Product API, Activation, scheduler and runtime work remain prohibited.
