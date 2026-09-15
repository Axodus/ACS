# EPIC-17-IMP-06 — Post-S4 Closure Reconciliation

**Date:** September 15, 2026  
**Type:** closure reconciliation; documentation only  
**Baseline:** `f651048563c2c94a0bdaa78b71edfa9de3cc67e2 feat(epic-17): recover schedule occurrences`  
**Schema:** `12 / CANONICAL`  
**Implementation performed:** none

## Determination

**NEXT REQUIRED SLICE = S5 — external adapter boundary and safe Product
projection.**

The frozen mapping makes S5 the next required slice after bounded S4 recovery.
It is required for the provider-neutral normalized-observation boundary in
`B02`, `B13`, `CD02`, `CD12` and `ADR-17-042`. S4 implements the governed
Schedule evaluator and the ScheduleOccurrence-to-Activation ingress, but it
does not normalize external Trigger/Channel/Manual observations, preserve their
provider-neutral delivery identity or prove replacement-safe adapters.

The safe Product projection named in the historic S5 title is conditional:
this reconciliation does not authorize a Product API route. Product API work,
OpenClaw execution, admission invocation, Run/Workflow creation, a scheduler
daemon and Schema 13 remain out of scope.

## Accepted inventory

| Slice | Published baseline | Final result |
| --- | --- | --- |
| S1 | `116e248` | Activation contracts, source-class causal identity, state machine and fencing contracts. |
| S2 | `390e960` | Schema 12 durable identity, state facts, claims/attempts, handoff, watermark and transactional metadata. |
| S3 | `7be46f0` | Exact target/authority preparation and recoverable pre-admission handoff. |
| S4 | `f651048` | Typed schedule semantics, deterministic bounded recovery, canonical schedule ingress and crash-safe watermark reconciliation. |

## B01–B13 final dispositions

| Blocker | Final disposition | Evidence / remaining work |
| --- | --- | --- |
| B01 | RESOLVED | S1/S2 causal identity and durable history. |
| B02 | PARTIALLY RESOLVED | Source types exist; S5 must add provider-neutral normalized external observation adapter. |
| B03 | RESOLVED | S1/S2 causal uniqueness, claim, idempotency and fencing. |
| B04 | RESOLVED | S4 typed schedule definition, bounded recovery and Schema-12 watermark proof. |
| B05 | RESOLVED | S3 prepares a handoff without competing admission/runtime ownership. |
| B06 | RESOLVED | S3 revalidates canonical Delegation authority and fails closed. |
| B07 | RESOLVED | S3 preserves or captures exact target snapshot without current-head fallback. |
| B08 | PARTIALLY RESOLVED | Durable pre-admission handoff exists; admission submission and admitted/Run correlation remain downstream. |
| B09 | ACCEPTED DEFERRED | S1–S4 preserve layer separation; end-to-end admission/runtime cancellation belongs to S6/downstream owners. |
| B10 | REJECTED | Unsupported Workflow historical/admission support remains fail-closed pending its canonical owner. |
| B11 | ACCEPTED DEFERRED | Metadata-safe Activation Event/Evidence exists; full admitted/Run provenance is downstream. |
| B12 | ACCEPTED DEFERRED | Economics remains the Run-based authority; no ledger or budget mutation belongs to IMP-06. |
| B13 | PARTIALLY RESOLVED | OpenClaw remains non-canonical; S5 must provide a provider-neutral observation adapter contract. |

**Result:** 13/13 reconciled. Required implementation remains for B02 and B13 in S5.

## CD01–CD14 final dispositions

| Contract delta | Final disposition | Evidence / remaining work |
| --- | --- | --- |
| CD01 | RESOLVED | Stable causal identity and durable history. |
| CD02 | PARTIALLY RESOLVED | S5 normalized external observation and delivery correlation required. |
| CD03 | RESOLVED | Exact Automation revision owns authored source keys; S4 adds typed schedule semantics. |
| CD04 | RESOLVED | Deterministic causal key and fail-closed conflict. |
| CD05 | RESOLVED | Claim/fencing/idempotency/Event/outbox persistence. |
| CD06 | RESOLVED | Append-only Activation outcomes stay separate from Runtime. |
| CD07 | RESOLVED | Canonical authority revalidation through Delegation. |
| CD08 | RESOLVED | Historical target/configuration snapshot. |
| CD09 | PARTIALLY RESOLVED | Durable prepared handoff complete; admission submission/Run correlation downstream. |
| CD10 | RESOLVED | S4 governed bounded schedule recovery and watermark reconciliation. |
| CD11 | ACCEPTED DEFERRED | Cross-layer retry/cancellation conformance is S6/downstream; no owner is duplicated. |
| CD12 | PARTIALLY RESOLVED | S5 provider-neutral observation adapter and capability-fail-closed proof required. |
| CD13 | ACCEPTED DEFERRED | Activation Event/Evidence subject is complete; full admission/Run chain remains downstream. |
| CD14 | ACCEPTED DEFERRED | Economics owns Usage/Cost correlation under IMP-10. |

**Result:** 14/14 reconciled. Required implementation remains for CD02 and CD12 in S5.

## ADR-17-035 through ADR-17-042 conformance

| ADR | Conformance | Evidence / remaining downstream work |
| --- | --- | --- |
| ADR-17-035 | CONFORMANT | S1/S2 stable source-class causal identity and Schema-12 uniqueness. |
| ADR-17-036 | CONFORMANT | Automation Definition, logical occurrence and Activation remain distinct. |
| ADR-17-037 | CONFORMANT | Claims/attempts/fences remain processing state, not causal identity. |
| ADR-17-038 | CONFORMANT | S3 exact target resolution snapshots and fail-closed unresolved policy. |
| ADR-17-039 | CONFORMANT | S3 canonical Delegation revalidation; admission remains decision owner. |
| ADR-17-040 | CONFORMANT | S4 bounded SKIP/COALESCE/CATCH_UP and crash-safe watermark reconciliation. |
| ADR-17-041 | PARTIAL — EXPECTED DOWNSTREAM | S3 durable handoff is complete; submission/reconciliation is admission-owned downstream. |
| ADR-17-042 | PARTIAL — REQUIRED S5 | S4 provider-neutral evaluator is format-neutral, but external observation adapter boundary is not implemented. |

No ADR violation was found.

## REQ-09 and REQ-12 coverage

REQ-09 is materially covered through durable causal Activation, exact
Automation history, target/authority preparation, recoverable handoff and
bounded schedule recovery. It is not final-conformance complete because the
frozen mapping still requires S5 normalized external observation/provider
neutrality before S6 closure can run.

REQ-12 retains the same result: the inherited capabilities for idempotent
Activation, recovery/restart, Events/outbox and shared PostgreSQL authority are
implemented or preserved by existing owners. External provider-neutral
observation remains a mapped IMP-06 obligation; Economics, admitted Run
correlation and Workflow historical support remain explicitly deferred or
rejected by their canonical owners.

## S5 dependency and authority statement

| Item | Result |
| --- | --- |
| S5 dependency: bounded S4 recovery proof | SATISFIED by `f651048` |
| S5 dependency: no provider ownership/execution authority | SATISFIED; no such ownership was added |
| Remaining REQUIRED implementation | B02, B13, CD02, CD12, ADR-17-042 external observation adapter boundary |
| Autonomous scheduler | HOLD |
| Admission invocation | HOLD |
| Run / Workflow creation | HOLD |
| OpenClaw execution | HOLD |
| Product API route | HOLD pending separate authorization |
| Schema change | NONE; Schema 13 not required |

S5, if separately authorized, is limited to a composition contract that accepts
a provider-neutral normalized observation, retains external identifiers only as
provenance, delegates causal creation to the canonical Activation owner and
fails closed when required adapter capability is unavailable. It must not turn
OpenClaw into an Activation/Automation/admission owner or create execution.

## Validation

| Check | Result |
| --- | --- |
| Baseline | PASS — `f651048` equals `origin/dev` |
| B01–B13 | PASS — 13/13 final dispositions |
| CD01–CD14 | PASS — 14/14 final dispositions |
| ADR-17-035..042 | PASS — 8/8 reconciled; no violation |
| REQ-09 traceability | PASS |
| REQ-12 traceability | PASS |
| Frozen slice mapping | PASS |
| Documentation-only scope | PASS |
| `git diff --check` | PASS |

```text
EPIC-17-IMP-06
POST-S4 CLOSURE RECONCILIATION
Baseline: f651048
Schema: 12 / CANONICAL
REQ-09: PASS — final closure pending S5/S6 mapping obligations
REQ-12: PASS — mapped deferred/rejected owners remain explicit
B01–B13: 13/13 reconciled
CD01–CD14: 14/14 reconciled
ADR-17-035..042: 8/8 reconciled; no violation
Remaining REQUIRED implementation: B02, B13, CD02, CD12, ADR-17-042
Next determination: NEXT REQUIRED SLICE = S5 — external adapter boundary and safe Product projection
Scheduler runtime authority: NO
Admission invocation authority: NO
Run/Workflow creation authority: NO
Schema change required: NO
Scope violation: NONE
Recommendation: CTO authorization required for S5; do not start implementation automatically
Implementation performed: NONE
```
