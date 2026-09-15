# EPIC-17-IMP-06 — S4 Schedule Semantics Freeze

**Date:** September 14, 2026  
**Status:** FROZEN CANDIDATE / CTO REVIEW REQUIRED  
**Authority:** documentation and contract design only  
**Baseline:** 7be46f0 feat(epic-17): prepare durable activation handoff  
**Schema:** 12 / CANONICAL  
**Implementation performed:** none

## Decision boundary

This pre-gate defines the candidate semantics required before S4 can receive
implementation authority.

    Schedule Definition != Schedule Occurrence != Schedule Watermark
    Schedule Watermark != Activation != Scheduler Worker

A Schedule Definition is immutable authored configuration under one exact
Automation revision. A Schedule Occurrence is a deterministic logical causal
reference. A watermark is durable recovery progress. An Activation remains the
canonical durable causal occurrence. A future evaluator may compose these
owners, but it is not a scheduler runtime, background worker, timer, admission
owner or executor.

No cron grammar, RRULE, iCalendar shape or provider schedule format is selected
by this freeze. Repository inventory found no existing canonical representation
to reuse. Any eventual specification kind must be explicitly registered,
versioned, canonicalized and fail closed when unavailable or unknown.

## Current repository inventory

| Surface | Evidence | Finding |
| --- | --- | --- |
| Automation definitions | src/native-core/automation.ts | AutomationDefinitionV1 has only kind, definition_key, opaque configuration, and governed_refs; schedule is a discriminator, not typed schedule semantics. |
| Revision history | AutomationRevisionV1 and acs_automation_revisions | Exact definitions are immutable and fingerprinted with the Automation revision. |
| Schedule causal source | src/native-core/activation.ts | Existing schedule cause has schedule_key, schedule_digest, intended_at, timezone and optional calendar_digest. |
| Durable watermark | acs_schedule_recovery_watermarks; save/getScheduleRecoveryWatermark | Schema 12 stores exact revision/fingerprint, key, digest, time basis, covered-through, CAS generation and state fingerprint. |
| Activation identity and replay | createActivationCausalIdentityV1; createActivation | Exact Tenant/revision/source identity and causal uniqueness prevent duplicate logical Activations. |
| Claims/fencing | claimActivation; transitionActivation | Processing ownership is independent from Activation identity and rejects stale fences. |
| Schedule evaluator/runtime | repository search | No evaluator, timer, worker, cron process, catch-up algorithm or restart reconciler exists. |
| Provider scheduling | src/engines/openclaw-engine-adapter.ts | OpenClaw is an execution adapter; no canonical schedule ownership exists. |

The inventory supports a typed schedule contract candidate. It does not support
selecting a concrete recurrence grammar or authorizing scheduler runtime.

## Ownership map

| Concern | Canonical owner | S4 candidate boundary |
| --- | --- | --- |
| authored schedule definition | exact Automation revision | validates immutable definition semantics only |
| recurrence interpretation | registered schedule-specification evaluator | deterministic calculation only; no durable identity ownership |
| occurrence identity | Activation causal identity using schedule source material | derives no new aggregate or second Activation |
| recovery progress | Schema 12 watermark owner | holds range proof only |
| occurrence claim/state | Activation repository | uses existing causal uniqueness, claims and fencing |
| admission | existing admission owner | no call |
| Run/Workflow/Runtime/worker | existing execution owners | no create, mutation or invocation |
| Event/Evidence/outbox/idempotency | shared durable transaction owner | safe facts and recovery delivery only |
| OpenClaw/provider | replaceable adapter | no schedule truth or canonical identity |

## Schedule Definition candidate

The future typed schedule definition is a revision-owned value embedded in an
existing AutomationDefinitionV1 whose kind is schedule. It is not a new Schedule
aggregate or runtime configuration record.

    ScheduleDefinitionCandidateV1
      definition_key: non-empty and unique within exact Automation revision
      semantic_version: positive integer
      specification:
        kind: registered discriminator; no grammar selected by this freeze
        version: registered specification version
        canonical_form: safe normalized data for that registered kind
        digest: SHA-256 of canonical specification semantics
      time_basis:
        timezone: IANA timezone identifier
        timezone_rules_version: immutable rules/version identifier
        dst_resolution:
          ambiguous_local_time: explicit registered policy
          nonexistent_local_time: explicit registered policy
        calendar_ref?: exact versioned reference
        calendar_digest?: SHA-256 when calendar_ref is used
      activation_window:
        starts_at?: UTC instant, inclusive
        ends_at?: UTC instant, exclusive
      missed_work:
        mode: SKIP | COALESCE | CATCH_UP
        max_occurrences_per_recovery: positive bounded integer
        max_lookback_ms: positive bounded duration
        coalesce_window_ms?: required only for COALESCE
      concurrency:
        occurrence_materialization: one registered bounded policy
      semantic_digest: SHA-256 of all fields above

Semantic digest becomes the future canonical schedule digest. It derives from
normalized semantics, including time basis and policy, not a display string or
mutable provider configuration.

### Required semantic rules

- Definition key is the stable schedule key within its exact Automation
  revision. It cannot be reused ambiguously inside that revision.
- Timezone must use a registered IANA identifier. Timezone rules version and
  explicit ambiguous/nonexistent local-time behavior are required so historical
  recurrence is not reinterpreted by later timezone data.
- Activation window uses UTC instants with inclusive start and exclusive end.
  A slot outside the window is not eligible.
- Calendar exclusion is optional. If used, it requires an exact immutable
  reference and digest; no current calendar owner means unsupported calendar
  configuration fails closed.
- The eventual specification registry normalizes canonical form before
  computing its digest. A non-registered kind or version is
  SCHEDULE_SPEC_UNSUPPORTED, never a fallback to a current provider or timer.
- Max occurrences per recovery and max lookback are mandatory for every
  missed-work mode. Omitted, zero or unbounded values are invalid.
- Occurrence materialization policy grants no worker, executor or admission
  authority.

## Schedule Occurrence identity candidate

A Schedule Occurrence is a logical value, not a durable aggregate, database
table, worker job or provider event. Its source material feeds the existing
Schedule Activation cause and existing Activation causal identity.

### Normal slot identity

    ScheduleSlotIdentityV1 =
      tenant_id
      + exact automation_id/revision/fingerprint
      + schedule definition_key
      + schedule semantic_digest
      + time_basis digest
      + slot_at_utc
      + occurrence_kind = scheduled_slot

The deterministic occurrence key is the SHA-256 of this canonical tuple.
Slot_at_utc is the canonical scheduled instant. Exact time basis is also
included so two local-time interpretations cannot collapse accidentally.

The existing Activation schedule source provides the foundation: exact
Automation ref is in ActivationCausalIdentityV1 and the source has schedule
key/digest, intended instant, timezone and optional calendar digest. S4 must
freeze the mapping from this tuple to that source with no implicit current
Automation head.

### Coalesced interval identity

COALESCE cannot pretend a recovery interval is one ordinary scheduled slot.

    ScheduleCoalescedIdentityV1 =
      normal schedule identity material except slot_at_utc
      + occurrence_kind = coalesced_interval
      + interval_start_exclusive_utc
      + interval_end_inclusive_utc
      + coalesce_window_ms

This requires an explicit future Schedule-cause contract extension or equivalent
typed causal reference. The current schedule source has one intended_at, not a
recovery interval. This is a required composition/contract seam, not authority
for a second Activation owner.

Worker ID, evaluator process ID, claim ID, attempt ID, fencing token, processing
timestamp, restart count, outbox retry count and OpenClaw IDs do not participate
in Schedule Occurrence identity.

    same logical scheduled occurrence
      -> same schedule occurrence key
      -> same Activation causal identity
    restart / retry / worker replacement
      -> no duplicate logical Activation

## Missed-work policy candidate

The names below are candidate names; their effects are frozen for CTO review.

| Candidate mode | Eligible recovery effect | Identity effect | Watermark rule | Bound and duplicate rule |
| --- | --- | --- | --- | --- |
| SKIP | Missed slots are not materialized as Activations. | No Activation identity for skipped slots; exact skipped range proof is durable watermark metadata. | Advances only after skipped range proof is durable. | Limited by max lookback; no silent drop or per-worker interpretation. |
| COALESCE | One eligible recovery occurrence represents a bounded missed interval. | Uses ScheduleCoalescedIdentityV1, never an arbitrary current timestamp. | Advances only after coalesced occurrence is durably created or terminal. | Requires coalesce window and global recovery bounds. Same interval has same identity. |
| CATCH_UP | Eligible missed slots are materialized individually. | Each slot uses ScheduleSlotIdentityV1. | Advances only through slots with durable/recoverable results. | At most max occurrences per recovery and within max lookback; remaining slots remain uncovered. |

A schedule definition may not define unbounded CATCH_UP. Unknown, missing,
contradictory or unsupported policy fails closed and does not advance a
watermark.

## Watermark semantics candidate

    watermark = durable recovery progress and range proof
    watermark != Schedule Occurrence != Activation != claim != scheduler ownership

For one Tenant, exact Automation revision/fingerprint and schedule key:

- Covered through is the greatest canonical schedule instant for which every
  eligible prior slot in the evaluated half-open range has a durable,
  recoverable outcome. Recovery reads
  (prior_covered_through, evaluation_cutoff].
- Time basis must equal the exact definition time basis used to calculate the
  range; mismatch with schedule semantic digest is a typed conflict.
- Recovery generation is a CAS generation for progress, not an occurrence
  counter or worker lease.
- State fingerprint hashes coverage boundary, exact schedule semantic digest,
  time basis, selected policy and outcome-proof summary.
- Initial watermark requires an explicit deterministic anchor from definition
  or activation window, or a separately governed bootstrap decision. Current
  time at first process start is prohibited as an implicit anchor.
- A future evaluator may lock the watermark for mutation, but its claim never
  becomes Activation identity or scheduler ownership.

A watermark cannot advance past an eligible slot before that slot has one
durable result: created Activation, durable terminal Activation outcome, or
durable SKIP range proof. Timer firing, provider acknowledgement or evaluator
completion is insufficient.

## Recovery algorithm candidate

This is a design algorithm only. It authorizes no loop, timer or worker.

1. Load the exact Automation revision and exact schedule definition.
2. Validate typed schedule semantics, time basis, policy and bounded recovery
   input. Any unavailable exact input fails closed.
3. Read and CAS-lock the exact watermark.
4. Calculate candidate slots for the half-open durable range.
5. Restrict the range by max lookback and the mode-specific occurrence bound.
6. Materialize the policy result: SKIP records range proof; COALESCE derives
   one interval occurrence; CATCH_UP derives individual slots.
7. Send each eligible causal reference through the occurrence-to-Activation
   seam. Existing createActivation performs canonical identity/replay.
8. Record durable terminal outcomes for any intentionally non-materialized or
   rejected result.
9. Advance the watermark only after every outcome in the covered subrange is
   durable/recoverable.
10. Emit metadata-safe Event/Evidence/outbox/idempotency facts as required by
    the existing transaction boundary.

No step calls admission, creates a Run, compiles runtime intent, assigns a
worker, performs an external side effect or invokes OpenClaw.

## Crash and restart matrix

| Crash point | Permitted durable state | Restart behavior | Forbidden outcome |
| --- | --- | --- | --- |
| Before watermark lock | no new fact | Recalculate same range. | Advancing progress. |
| After lock, before outcome write | no committed mutation | Retry after lock release/expiry. | Treating in-memory calculation as covered. |
| After Activation creation, before watermark advance | Activation may exist; watermark remains behind. | Re-derive identical occurrence; createActivation returns same Activation, then recovery advances. | Duplicate Activation. |
| After durable SKIP proof, before watermark advance | skipped proof exists; watermark remains behind. | Replay same proof idempotently, then advance. | Silent loss or materializing skipped work. |
| After coalesced/CATCH_UP outcome, before watermark advance | outcome exists; watermark remains behind. | Re-derive same interval/slots and reuse existing identities. | Different recovery identity for same range. |
| Before any outcome but after attempted watermark advance | no such commit is valid. | Transaction rolls back. | Covered range with missing outcome. |
| After transaction commit, before outbox delivery | state/outcome/watermark may exist; outbox is pending. | Existing outbox recovery delivers it. | Recreating work for delivery retry. |
| Claim expiry or stale fence | newer claim may proceed; prior mutation rejected. | Re-read durable head/watermark and retry from facts. | Prior worker accepted transition. |

## Occurrence → Activation seam

The baseline has no canonical service for:

    Schedule causal reference
      -> create observed Activation
      -> claim / resolving orchestration

S4 must not hide that gap inside a scheduler. A future implementation needs a
named composition seam, tentatively ScheduleOccurrenceActivationIngressV1:

    input: exact ScheduleOccurrenceIdentityV1 + exact Automation ref + safe cause
    delegates: existing nativeCore.createActivation(...)
    output: canonical Activation lineage

This seam is not an Activation owner, does not choose a current Automation head,
does not materialize authority, does not invoke admission and does not create a
Run. It uses existing Activation causal identity and durable repository.

**Status:** IMPLEMENTED in S4 as `ScheduleOccurrenceActivationIngressV1`.
It delegates only to `nativeCore.createActivation(...)`; it remains a
composition seam, not an Activation owner.

## Tenant, idempotency and fencing rules

- Every Schedule Definition, watermark, occurrence identity and Activation
  creation is Tenant-qualified. Cross-Tenant material is a typed fail-closed
  rejection.
- Schedule recovery command idempotency scope stays bound to Tenant, exact
  Automation revision and schedule key. It cannot be reused after a schedule
  semantic digest change.
- Logical occurrence uniqueness comes from deterministic cause material and
  existing Activation causal uniqueness. Command idempotency is separate.
- Watermark CAS generation serializes progress; Activation claims/fencing
  serialize processing. Neither substitutes for the other.
- Schedule revision change creates a new exact definition/digest namespace. It
  cannot reinterpret, overwrite or merge old occurrence identities or
  watermarks.

## Event, Evidence and security boundary

Schedule/Activation Events are metadata-safe: exact refs, digests, policy mode,
safe range boundaries, state/outcome codes and correlation IDs are allowed.
Credentials, secret values, raw provider/executor payloads, Memory content,
unrestricted authority details and sensitive Delegation reason material are not.

Event and Evidence remain correlation/provenance infrastructure. Neither owns
the Schedule Definition, Schedule Occurrence, watermark or Activation.

## Affected mapping and blockers

| Item | Freeze disposition |
| --- | --- |
| B04 | Converts missing schedule semantics into a candidate contract and makes the S4 prerequisite explicit. |
| CD03 | Retains exact Automation revision + definition key as authored identity basis. |
| CD10 | Freezes candidate watermark, range, policy, bound and duplicate-suppression semantics. |
| CD11 | Keeps schedule recovery separate from Activation/admission/runtime retry and cancellation owners. |
| ADR-17-036 | Preserves authored Definition versus occurrence versus Activation separation. |
| ADR-17-040 | Freezes candidate range-proof and bounded missed-work semantics. |
| B02 / B13 / CD02 / CD12 / ADR-17-042 | Remain S5 adapter work; no external ingestion adapter is introduced. |
| B08 / CD09 / ADR-17-041 | Remain downstream admission submission/reconciliation work; no admission call is introduced. |

## Acceptance matrix

| Requirement | Result |
| --- | --- |
| Repository inventory | PASS |
| Schedule Definition semantics | FROZEN CANDIDATE |
| Schedule Occurrence identity | FROZEN CANDIDATE |
| Missed-work policy | FROZEN CANDIDATE |
| Recovery bounds | EXPLICIT |
| Watermark semantics | FROZEN CANDIDATE |
| Crash/restart behavior | DEFINED |
| Occurrence → Activation seam | IMPLEMENTED AS CANONICAL COMPOSITION SEAM |
| Tenant isolation | FAIL-CLOSED |
| Scheduler runtime implementation | NONE |
| Schema change | NONE; Schema 13 NOT REQUIRED |
| Scope violation | NONE |

## CTO decision

The Semantic Freeze was accepted before S4 implementation. The implementation
evidence is recorded in [the S4 report](imp-06-s4-report.md). This document
continues to freeze the semantics; it does not authorize a scheduler runtime.

    typed schedule contracts: candidate ready for CTO freeze
    missed-work semantics: candidate ready for CTO freeze
    occurrence identity design: candidate ready for CTO freeze
    watermark semantics: candidate ready for CTO freeze
    recovery algorithm design: candidate ready for CTO freeze
    scheduler loop: HOLD
    background worker: HOLD
    timer/cron process: HOLD
    OpenClaw scheduling: HOLD
    admission: HOLD
    Run / Workflow creation: HOLD
    Schema 13: NOT REQUIRED
