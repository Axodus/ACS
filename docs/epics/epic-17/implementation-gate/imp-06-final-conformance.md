# EPIC-17-IMP-06 — Final Conformance & Closure Gate

**Status:** `COMPLETE / CTO ACCEPTED / CLOSED`
**Type:** documentation and conformance only
**Baseline:** `764d4580532a4c8bc2fc21f66f3036b376f298e7 feat(epic-17): normalize external activation observations`
**Schema:** `12 / CANONICAL`
**Schema 13:** `NOT REQUIRED`
**Date:** September 15, 2026
**Functional implementation during closure:** none

## Final determination

```text
IMP-06 FINAL CONFORMANCE: PASS
Remaining required implementation: NONE
Recommendation: READY FOR CTO CLOSURE
```

The S6 entry in the frozen slice mapping is a cross-domain conformance and closure gate. This report discharges that gate as documentation and validation; it does not create a sixth functional slice or extend a downstream owner.

## Published implementation inventory

| Slice | Published SHA | Accepted outcome | Conformance evidence |
| --- | --- | --- | --- |
| S1 | `116e248` | Activation contracts, source-class causal identity, state machine and claim/fencing contracts | deterministic identity; source-class separation; metadata-safe Activation Event subject |
| S2 | `390e960` | Schema 12 durable identity, append-only facts, claims/attempts, handoff, watermarks and transaction package | PostgreSQL 17.6 durable uniqueness, idempotency, fencing, handoff and Event/Evidence/outbox evidence |
| S3 | `7be46f0` | exact target snapshot, canonical authority revalidation and atomic prepared handoff | PostgreSQL 17.6 atomic prepared state/handoff/head/Event/Evidence/outbox/idempotency rollback proof |
| S4 | `f651048` | governed schedule semantics and deterministic bounded recovery | PostgreSQL 17.6 crash-after-materialization recovery without duplicate Activation |
| S5 | `764d458` | provider-neutral external observation ingress and metadata-safe Product projection contract | Provider A/B convergence to one causal Activation; PostgreSQL metadata-safe Event/Evidence/outbox proof |

## B01–B13 final dispositions

| Blocker | Final disposition | Evidence and closure rationale |
| --- | --- | --- |
| B01 | RESOLVED | S1/S2 establish Tenant-qualified causal identity, exact Automation revision/fingerprint binding and durable history. |
| B02 | RESOLVED | S5 normalizes provider input into a bounded observation contract and delegates identity creation to `nativeCore.createActivation(...)`. |
| B03 | RESOLVED | S1/S2 provide causal uniqueness, typed conflict, idempotency, claim/attempt separation and stale-fence rejection. |
| B04 | RESOLVED | S4 adds typed schedule semantics, bounded policy, deterministic slots and crash-safe Schema-12 watermark reconciliation. |
| B05 | RESOLVED | S3 prepares a recoverable handoff without becoming admission or Runtime owner. |
| B06 | RESOLVED | S3 composes canonical Delegation revalidation and fails closed on revoked, expired, invalid or cross-Tenant authority. |
| B07 | RESOLVED | S3 preserves PINNED target or captures canonical deterministic resolution for the exact Automation revision. |
| B08 | RESOLVED FOR IMP-06 | Schema 12 and S3 persist one idempotent pre-admission handoff. Admission delivery, decision and Run lifecycle remain admission/Run-owned downstream work. |
| B09 | ACCEPTED DEFERRED | IMP-06 proves identity and retry separation through preparation and recovery. Pre/post-admission cancellation and Runtime cancellation remain downstream because Activation cannot own those layers. |
| B10 | REJECTED | Unsupported Workflow historical/admission support remains fail-closed. No invented Workflow history, foreign key or Activation-owned substitute was introduced. |
| B11 | RESOLVED FOR IMP-06 | S1/S2/S3/S4/S5 establish the metadata-safe Activation subject and transactional Event/Evidence/outbox lineage. Admitted/Run execution provenance remains downstream. |
| B12 | ACCEPTED DEFERRED | Usage/Cost remains Run-based Economics authority under IMP-10. IMP-06 neither owns nor mutates budget, ledger, settlement or attribution. |
| B13 | RESOLVED | S5 proves replaceable provider adapters and keeps provider/delivery identifiers as provenance rather than ACS identity. |

**Result:** 13/13 reconciled. B08 and B11 are resolved within the Activation-boundary scope; their downstream admission/Run extensions do not block IMP-06. B09 and B12 are intentionally deferred, and B10 is intentionally rejected/fail-closed under the frozen ownership model.

## CD01–CD14 final dispositions

| Contract delta | Final disposition | Evidence and closure rationale |
| --- | --- | --- |
| CD01 | RESOLVED | S1/S2 stable Activation identity, exact history and reconstruction. |
| CD02 | RESOLVED | S5 normalized external observation with source validation, digest provenance and duplicate-delivery correlation. |
| CD03 | RESOLVED | S1 keeps authored source keys under exact Automation revision; S4 applies governed schedule semantics. |
| CD04 | RESOLVED | S1/S2 deterministic causal key, Tenant-qualified uniqueness and typed semantic conflict. |
| CD05 | RESOLVED | S2 shared transaction use with Activation-specific claim, fencing, Event/Evidence/outbox and idempotency. |
| CD06 | RESOLVED | S1/S2 append-only Activation state facts and valid head transitions remain separate from Runtime outcomes. |
| CD07 | RESOLVED | S3 revalidates through canonical Delegation machinery and does not invent authority. |
| CD08 | RESOLVED | S3 immutable target/configuration snapshot is independent of the current Automation head. |
| CD09 | RESOLVED FOR IMP-06 | S2/S3 create an idempotent durable handoff and recovery record. Calling admission and Run correlation are explicitly owned downstream. |
| CD10 | RESOLVED | S4 persists bounded schedule recovery progress and deterministically reconciles watermarks. |
| CD11 | ACCEPTED DEFERRED | The boundary is implemented: source, Activation, admission and Runtime keep distinct identity. Cross-owner cancellation execution is downstream. |
| CD12 | RESOLVED | S5 bounded, capability-fail-closed provider-neutral adapter composes canonical Activation ingress. |
| CD13 | RESOLVED FOR IMP-06 | S1/S2/S3/S4/S5 provide Activation Event/Evidence subject, redaction and atomic transaction evidence. Full admission/Run provenance remains downstream. |
| CD14 | ACCEPTED DEFERRED | Economics retains Usage/Cost ownership under IMP-10; no economic mutation is required or authorized here. |

**Result:** 14/14 reconciled. CD09 and CD13 close the required Activation-side contract without absorbing admission/Run ownership. CD11 and CD14 remain explicitly deferred to their canonical owners and are non-blocking by the frozen mapping.

## ADR-17-035 through ADR-17-042 final conformance

| ADR | Final conformance | Published evidence |
| --- | --- | --- |
| ADR-17-035 | CONFORMANT | S1/S2 source-class causal identity, exact Automation revision/fingerprint and Schema-12 causal uniqueness. |
| ADR-17-036 | CONFORMANT | Automation definition, observation, ScheduleOccurrence and Activation remain distinct. |
| ADR-17-037 | CONFORMANT | Claims, attempts and fences are processing facts and cannot redefine causal identity. |
| ADR-17-038 | CONFORMANT | S3 preserves PINNED targets, resolves through canonical owners and persists exact snapshots without latest fallback. |
| ADR-17-039 | CONFORMANT | S3 uses canonical Delegation revalidation; prepared is neither admitted nor executable. |
| ADR-17-040 | CONFORMANT | S4 enforces bounded SKIP/COALESCE/CATCH_UP semantics and crash-safe watermark recovery. |
| ADR-17-041 | CONFORMANT FOR IMP-06 | S2/S3 provide durable idempotent pre-admission handoff and rollback/replay protection. Submission and decision reconciliation are admission-owned downstream. |
| ADR-17-042 | CONFORMANT | S5 proves provider-neutral normalization and canonical Activation ingress; external IDs remain provenance only. |

**Result:** 8/8 reconciled; no violation found.

## REQ-09 and REQ-12 final acceptance

| Requirement | Final result | Basis |
| --- | --- | --- |
| REQ-09 | PASS | All B01–B13 and CD01–CD14 have final dispositions. The durable causal boundary, target/authority preparation, schedule recovery and provider-neutral ingress are implemented without converting Activation into admission or execution. |
| REQ-12 | PASS | The accepted dependency plan permits explicit safe deferral/rejection when canonical owners remain downstream. Tenant isolation, secret safety, historical reconstruction and provider independence are demonstrated within IMP-06. |

## Canonical conformance properties

| Property | Conformance |
| --- | --- |
| Schema 12 | Canonical durable owner for Activation identity/history, facts, processing fencing, handoff and schedule recovery watermarks; Schema 13 is not required. |
| Tenant isolation | Causal keys, repository constraints and focused S3/S4/S5 tests reject cross-Tenant input before durable mutation. |
| Historical reproducibility | S1/S2 bind exact Automation revision/fingerprint; S3 snapshot capture does not depend on the current head; S4 occurrence identity uses exact schedule definition/version. |
| Recovery and idempotency | S2 causal uniqueness/fencing, S3 rollback-safe prepared handoff and S4 crash-safe watermark reconciliation prevent lost or duplicate logical Activation. |
| Provider neutrality | S5 Provider A/B forms normalize to one logical observation only when their causal source is equivalent; provider/delivery identity never replaces ACS identity. |
| Event and Evidence | Event/Evidence remain infrastructure owners. Activation payloads and Product projection are metadata-safe and exclude credentials, secrets, raw provider/executor payload, Memory content and unrestricted authority details. |
| Ownership boundary | Activation remains distinct from Automation, observation, admission, Run, Workflow, executor, schedule worker and provider. |

## Explicit downstream exclusions

| Item | Final disposition | Why it does not block closure |
| --- | --- | --- |
| Autonomous scheduler/daemon | HOLD / downstream | S4 is a deterministic recovery service invoked by a future caller; worker ownership was never an IMP-06 obligation. |
| Admission invocation | HOLD / downstream | IMP-06 creates the durable pre-admission handoff required by ADR-17-041 without creating a second admission engine. |
| Run/Workflow creation | HOLD / downstream | Activation preparation and handoff deliberately stop before Run/Workflow ownership. Unsupported Workflow support remains fail-closed. |
| Product API route | HOLD / downstream | S5 supplies only a metadata-safe projection mapper; route/mutation authority belongs to a separately authorized Product surface. |
| OpenClaw execution | HOLD / downstream | S5 treats OpenClaw as an optional replaceable adapter; it does not become a canonical owner or executor. |
| Usage/Cost attribution | ACCEPTED DEFERRED / IMP-10 | Economics is the canonical Run-based owner. |

## Integrated validation

| Check | Result |
| --- | --- |
| Baseline | PASS — `HEAD` and `origin/dev` resolve to `764d4580532a4c8bc2fc21f66f3036b376f298e7`. |
| Build | PASS — `npm run build`. |
| Focused/domain evidence | PASS — S1, S3, S4 and S5 focused files: 4 files / 0 failures. |
| PostgreSQL 17.6 / Schema 12 | PASS — `npm run acceptance:postgres`: 27 pass / 0 fail / 0 skip. |
| Published integrated regression | CLASSIFIED — S5 evidence: 148 pass / 10 environment listener/process failures, `A = 0`, `D = 0`, `C = 10`. |
| PostgreSQL transient classification | NON-CAUSAL — one initial `VAL-03` Workforce UI navigation timeout was unrelated to IMP-06 and the immediate full retry passed 27/0/0. |
| `git diff --check` | PASS. |
| Functional implementation during closure | NONE. |
| Scope violation | NONE. |

## CTO closure disposition

```text
EPIC-17-IMP-06
Activation / Causal Occurrence Boundary

FINAL CONFORMANCE: PASS
Remaining required implementation: NONE
Schema: 12 / CANONICAL
Schema 13: NOT REQUIRED
Status: COMPLETE / CTO ACCEPTED / CLOSED
```
