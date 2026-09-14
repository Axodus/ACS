# EPIC-17-IMP-06 — Schema 12 Physical Design

**Status:** `PHYSICAL DESIGN / CTO REVIEW READY`
**Date:** September 14, 2026
**Current canonical schema:** `11`
**Candidate target:** `12`
**Migration 11 → 12:** `HOLD / NOT AUTHORIZED`
**Functional persistence:** `HOLD`
**Source decisions:** `ADR-17-035` through `ADR-17-042` accepted

## Scope and frozen boundaries

This package is a physical design only. It proposes no migration, schema-runner change, repository, service, API, scheduler, Trigger receiver, target resolution call, authority revalidation call, admission call, Run/Workflow creation, worker invocation or OpenClaw execution.

Schema 12 is justified because Schema 11 owns Automation configuration/history, while it has no owner for a durable causal occurrence, recoverable processing claim, admission-handoff recovery or schedule range proof.

```text
source observation / occurrence
             ↓
  acs_activations: canonical causal identity and current state
             ↓
  immutable Activation state facts
             ↓
  recoverable processing attempt / claim
             ↓
  recoverable existing-admission handoff
             ↓
  existing Run / Runtime owners
```

Activation does not own Automation revision, Trigger/Schedule definition, authority grant, admission decision, admitted authority snapshot, Run, Workflow, Task, Attempt, Runtime intent, worker, executor, Event, Evidence, outbox, idempotency, Usage or Cost.

## Relation model and owner rationale

```text
acs_activations
  stable activation_id + exact Automation revision/fingerprint + causal uniqueness + current state
       │
       ├── acs_activation_state_events
       │     append-only causal, resolution, decision and outcome history
       │
       ├── acs_activation_attempts
       │     transient/recoverable processing claims, lease and fencing attempts
       │
       └── acs_activation_admission_handoffs
             one durable idempotent handoff record to the existing admission owner

acs_schedule_recovery_watermarks
  durable range proof for one exact schedule definition in one exact Automation revision
```

| Relation | Owner | Why it is needed | Explicit exclusions |
| --- | --- | --- | --- |
| `acs_activations` | Activation boundary | stable Tenant-scoped identity, exact causal Automation revision, source-specific occurrence identity, immutable causal digest and current state/CAS target | no authored Automation configuration, authority grant, Run/Workflow or provider state |
| `acs_activation_state_events` | Activation boundary | append-only state/decision/resolution facts needed to reconstruct why an occurrence did or did not reach admission | no Event/Evidence replacement and no Runtime execution history |
| `acs_activation_attempts` | Activation boundary | recoverable processing ownership, expiry and fencing separate from identity and Runtime attempts | no Runtime job/assignment/worker lease ownership |
| `acs_activation_admission_handoffs` | Activation boundary plus existing admission seam | durable idempotency/correlation and recovery record around one existing admission request | no second admission protocol or duplicate admitted-authority snapshot |
| `acs_schedule_recovery_watermarks` | Activation schedule-recovery boundary | durable covered-range proof for an exact schedule definition, bounded recovery and duplicate suppression | no scheduler queue, cron runner, execution state or generic schedule owner |

The primary normalized observation is stored with its canonical Activation because one logical Activation has one primary cause. Additional duplicate deliveries and supporting source material correlate through existing Event/Evidence/provenance references. Schema 12 deliberately proposes **no generic `acs_observations` table**: a separate table is not proven unless a later accepted source contract requires independent observation retention, query or lifecycle ownership.

## Candidate physical shape

The following SQL is review material, not migration SQL. JSONB fields are bounded typed serializations of accepted native contracts and must reject secrets, credential material, Memory content, raw provider/executor payloads, authentication headers/tokens and live authority-provider state.

~~~sql
CREATE TABLE acs_activations (
  activation_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
  automation_id TEXT NOT NULL,
  automation_revision INTEGER NOT NULL CHECK (automation_revision > 0),
  automation_fingerprint TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('event', 'channel', 'schedule', 'manual', 'system')),
  source_key TEXT NOT NULL,
  causal_key TEXT NOT NULL,
  cause_digest TEXT NOT NULL,
  primary_cause JSONB NOT NULL CHECK (jsonb_typeof(primary_cause) = 'object'),
  observed_at TIMESTAMPTZ NOT NULL,
  effective_at TIMESTAMPTZ,
  current_state TEXT NOT NULL CHECK (current_state IN (
    'observed', 'claimed', 'resolving', 'prepared', 'handoff_pending',
    'admitted', 'rejected', 'cancelled', 'expired', 'skipped', 'coalesced', 'failed'
  )),
  state_sequence INTEGER NOT NULL CHECK (state_sequence > 0),
  current_state_event_id TEXT NOT NULL,
  current_state_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (activation_id, tenant_id),
  UNIQUE (tenant_id, automation_id, automation_revision, automation_fingerprint,
          source_kind, source_key, causal_key),
  UNIQUE (activation_id, tenant_id, state_sequence, current_state_event_id),
  FOREIGN KEY (automation_id, tenant_id, automation_revision, automation_fingerprint)
    REFERENCES acs_automation_revisions(automation_id, tenant_id, revision, fingerprint),
  CHECK (length(causal_key) > 0),
  CHECK (length(cause_digest) > 0)
);

CREATE TABLE acs_activation_state_events (
  activation_state_event_id TEXT PRIMARY KEY,
  activation_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  state_sequence INTEGER NOT NULL CHECK (state_sequence > 0),
  from_state TEXT,
  to_state TEXT NOT NULL CHECK (to_state IN (
    'observed', 'claimed', 'resolving', 'prepared', 'handoff_pending',
    'admitted', 'rejected', 'cancelled', 'expired', 'skipped', 'coalesced', 'failed'
  )),
  observed_automation_lifecycle TEXT NOT NULL,
  cause_digest TEXT NOT NULL,
  resolution_snapshot JSONB CHECK (resolution_snapshot IS NULL OR jsonb_typeof(resolution_snapshot) = 'object'),
  authority_context_refs JSONB NOT NULL CHECK (jsonb_typeof(authority_context_refs) = 'array'),
  policy_decision_refs JSONB NOT NULL CHECK (jsonb_typeof(policy_decision_refs) = 'array'),
  admission_handoff_id TEXT,
  outcome_code TEXT,
  reason_code TEXT,
  provenance_refs JSONB NOT NULL CHECK (jsonb_typeof(provenance_refs) = 'array'),
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (activation_id, state_sequence),
  UNIQUE (activation_id, tenant_id, state_sequence, activation_state_event_id),
  FOREIGN KEY (activation_id, tenant_id)
    REFERENCES acs_activations(activation_id, tenant_id),
  CHECK (
    (state_sequence = 1 AND from_state IS NULL AND to_state = 'observed')
    OR (state_sequence > 1 AND from_state IS NOT NULL)
  )
);

ALTER TABLE acs_activations
  ADD CONSTRAINT acs_activation_state_head_fk
  FOREIGN KEY (activation_id, tenant_id, state_sequence, current_state_event_id)
  REFERENCES acs_activation_state_events(activation_id, tenant_id, state_sequence, activation_state_event_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE acs_activation_attempts (
  activation_attempt_id TEXT PRIMARY KEY,
  activation_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  attempt_sequence INTEGER NOT NULL CHECK (attempt_sequence > 0),
  status TEXT NOT NULL CHECK (status IN ('claimed', 'released', 'expired', 'completed', 'failed', 'superseded')),
  claimant_id TEXT NOT NULL,
  lease_expires_at TIMESTAMPTZ NOT NULL,
  fencing_token BIGINT NOT NULL CHECK (fencing_token > 0),
  claimed_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  result_state_event_id TEXT,
  failure_code TEXT,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  UNIQUE (activation_id, attempt_sequence),
  UNIQUE (activation_id, fencing_token),
  FOREIGN KEY (activation_id, tenant_id)
    REFERENCES acs_activations(activation_id, tenant_id),
  FOREIGN KEY (result_state_event_id)
    REFERENCES acs_activation_state_events(activation_state_event_id)
    DEFERRABLE INITIALLY DEFERRED,
  CHECK ((status = 'claimed' AND released_at IS NULL) OR status <> 'claimed')
);

CREATE UNIQUE INDEX acs_activation_active_claim_idx
  ON acs_activation_attempts (activation_id)
  WHERE status = 'claimed';
CREATE INDEX acs_activation_claim_expiry_idx
  ON acs_activation_attempts (status, lease_expires_at, activation_id)
  WHERE status = 'claimed';

CREATE TABLE acs_activation_admission_handoffs (
  activation_handoff_id TEXT PRIMARY KEY,
  activation_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  handoff_sequence INTEGER NOT NULL CHECK (handoff_sequence > 0),
  status TEXT NOT NULL CHECK (status IN ('prepared', 'submitted', 'accepted', 'rejected', 'unknown', 'reconciled')),
  admission_idempotency_scope TEXT NOT NULL,
  admission_idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  admission_request_ref JSONB NOT NULL CHECK (jsonb_typeof(admission_request_ref) = 'object'),
  admission_decision_ref JSONB,
  run_ref JSONB,
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  prepared_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (activation_id),
  UNIQUE (admission_idempotency_scope, admission_idempotency_key),
  FOREIGN KEY (activation_id, tenant_id)
    REFERENCES acs_activations(activation_id, tenant_id),
  CHECK ((status IN ('accepted', 'reconciled') AND admission_decision_ref IS NOT NULL)
      OR (status NOT IN ('accepted', 'reconciled')))
);

CREATE TABLE acs_schedule_recovery_watermarks (
  schedule_watermark_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
  automation_id TEXT NOT NULL,
  automation_revision INTEGER NOT NULL CHECK (automation_revision > 0),
  automation_fingerprint TEXT NOT NULL,
  schedule_key TEXT NOT NULL,
  schedule_digest TEXT NOT NULL,
  time_basis JSONB NOT NULL CHECK (jsonb_typeof(time_basis) = 'object'),
  covered_through TIMESTAMPTZ,
  recovery_generation BIGINT NOT NULL CHECK (recovery_generation >= 0),
  state_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tenant_id, automation_id, automation_revision, automation_fingerprint, schedule_key),
  FOREIGN KEY (automation_id, tenant_id, automation_revision, automation_fingerprint)
    REFERENCES acs_automation_revisions(automation_id, tenant_id, revision, fingerprint)
);

CREATE INDEX acs_activation_tenant_state_idx
  ON acs_activations (tenant_id, current_state, updated_at, activation_id);
CREATE INDEX acs_activation_automation_history_idx
  ON acs_activations (tenant_id, automation_id, automation_revision, created_at, activation_id);
CREATE INDEX acs_activation_state_history_idx
  ON acs_activation_state_events (tenant_id, activation_id, state_sequence);
CREATE INDEX acs_schedule_watermark_recovery_idx
  ON acs_schedule_recovery_watermarks (tenant_id, updated_at, schedule_watermark_id);
~~~

The exact state labels are candidate values. Before migration, Slice 1 contracts must freeze allowed state transitions and determine whether a terminal evaluation failure is represented as `failed`, `rejected`, or a typed result beneath another terminal state. This design does not permit a state transition to overwrite prior facts.

## Identity, uniqueness and conflict rules

The causal unique key is intentionally independent of `cause_digest`. It identifies the asserted logical occurrence. On insert conflict, the durable owner reads the existing Activation and compares its Tenant, exact Automation revision/fingerprint, source kind/key, causal key and cause digest:

- all semantic values equal: return the same canonical Activation deterministically;
- any causal material or digest differs: reject with a typed causal-idempotency conflict;
- a later Automation head is irrelevant because the exact revision was bound by the first claim.

The unique index prevents parallel workers from creating separate logical Activations. `acs_native_idempotency` remains the command-level replay owner; its Tenant-qualified request hash must include the causal tuple and normalized cause digest. The local causal uniqueness is a domain invariant, not a substitute for command idempotency.

## State, claim, fencing and recovery invariants

`acs_activations` contains only the current state pointer and immutable causal identity. Every state transition appends an `acs_activation_state_events` row and CAS-updates the head pointer under expected state sequence/fingerprint.

`acs_activation_attempts` records processing ownership separately. One partial unique index permits one active claim per Activation. A claimant obtains a monotonically increasing fencing token and must include it with every transition that produces a resolution, handoff or terminal effect. A transition from an older/lost attempt is rejected after claim expiry, release or supersession. Expiry makes the occurrence recoverable; it never deletes the Activation or authorizes a new causal identity.

Runtime job/worker leases are not referenced as the Activation claim. The implementation may reuse the existing PostgreSQL conditional-update, advisory-lock and fencing patterns, but must use Activation-specific records and typed errors so runtime recovery remains independent.

## Resolution, authority and admission handoff boundary

A `resolution_snapshot` appears only in an immutable state event after all required resolution is complete. It must contain safe exact refs/fingerprints for:

- the exact pinned target, or the exact target resolved by `RESOLVED_AT_ACTIVATION` policy;
- supported exact Agent, Workforce and Workflow revisions where applicable;
- the effective configuration snapshot/reference and fingerprint;
- the observed Automation lifecycle;
- the authority-context, policy and approval decision references;
- the immutable source/cause and time basis.

It contains no secret, credential lease value, raw Delegation authority material, provider payload or resolved target inferred after the fact. Target ambiguity, unavailable canonical owner, stale/expired/revoked authority, unsupported target kind or missing required snapshot rejects before handoff.

`acs_activation_admission_handoffs` records at most one downstream admission idempotency scope/key for an Activation. It supports these recovery cases:

1. `prepared`: causal inputs are frozen but no admission submission is known.
2. `submitted` or `unknown`: restart queries the existing admission owner with the same correlation/idempotency identity; it does not send a second semantic request.
3. `accepted` or `reconciled`: stores safe decision/Run correlation references; Activation never owns the admitted authority snapshot or Run lifecycle.
4. `rejected`: stores safe decision correlation and leaves no Run correlation.

When both owners share one transaction, the Activation state fact, handoff state, admission outcome, Event/Evidence/outbox and idempotency success must commit atomically. When they cannot, the shared outbox plus existing admission idempotency must provide recoverable consistency. There must be no accepted Run with unrecoverable Activation causation.

## Schedule watermark and missed-work recovery

The watermark belongs only to schedule source semantics. It keys one exact Automation revision/fingerprint, schedule key and schedule digest; a schedule change never reinterprets a prior covered range.

A future recovery transaction must lock the watermark, use its exact time basis to derive eligible due instants, apply the explicit authored missed-work and concurrency/coalescing policy, claim deterministic occurrences through `acs_activations`, record skipped/coalesced/rejected state facts and advance `covered_through` only after every emitted outcome is durable/recoverable.

`covered_through`, `recovery_generation` and `state_fingerprint` are a range-proof head, not a scheduler queue. An unknown policy or unbounded catch-up request fails closed. No process-local clock, timer or OpenClaw job state can stand in for this durable proof.

## Referential integrity versus historical external references

| Reference type | Candidate constraint | Why |
| --- | --- | --- |
| Tenant | direct FK to `acs_tenants`; same-Tenant composite FKs within Schema 12 | Tenant isolation and local lineage are durable local facts. |
| Automation revision/fingerprint | composite FK to Schema 11 immutable revision | exact causal configuration is an ACS-local historical fact. |
| Activation state/attempt/handoff | internal FKs and unique keys | prove local identity, state ordering and one handoff. |
| Event ID | direct FK to `acs_native_events` | Event is an ACS-local infrastructure fact. |
| Evidence/provenance | exact reference IDs/fingerprints in typed payloads | Evidence remains its own owner and may have historical external inputs. |
| Trigger/Channel/Connection/provider source | typed external historical reference plus canonical validation at ingestion | a broad FK would create adapter/source ownership and break recoverable external provenance. |
| Delegation, governance, policy and approval | exact external refs resolved by their owners at evaluation/admission time | Activation cannot materialize or own authority. |
| target, Agent, Workforce and Workflow | typed exact refs validated by canonical owner; only local immutable FK if the owner exposes a compatible historical surface | prevents accidental ownership and preserves historical reconstruction. |
| admission and Run | safe correlation refs owned by admission/Run domains | no second admission/Run aggregate. |
| OpenClaw/executor job/message/run ID | optional provenance/external causal reference; no FK | external adapters are replaceable and non-canonical. |

## Event, Evidence, outbox and idempotency

Schema 12 may extend the Event subject convention with `activation` only after migration authorization. Candidate conceptual events are `activation.created`, `activation.claimed`, `activation.resolved`, `activation.handoff_prepared`, `activation.admitted`, `activation.rejected`, `activation.recovered`, `activation.cancelled` and `activation.failed`. Final names must conform to the existing Event subsystem.

Every command that creates or changes canonical Activation state must use the existing PostgreSQL transaction authority:

```text
Tenant/source validation
  + command idempotency advisory lock
  + causal uniqueness / Activation or watermark CAS
  + immutable state/attempt/handoff fact
  + mutable head update where applicable
  + canonical Event and Evidence when required
  + existing outbox row
  + idempotency success record
  = one transaction
```

Candidate scopes are:

- `activation.create:<tenant_id>:<automation_id>:<automation_revision>:<source_key>`;
- `activation.evaluate:<tenant_id>:<activation_id>`;
- `activation.handoff:<tenant_id>:<activation_id>`;
- `activation.schedule.recover:<tenant_id>:<automation_id>:<automation_revision>:<schedule_key>`.

Same scope/key/request hash/operation replays deterministically; a changed request hash, operation, causal input, expected state or fencing token produces a typed conflict. Outbox delivery failure never erases a committed Activation fact; it is recovered by the existing outbox owner.

## Migration, startup and rollback strategy

Migration 11 → 12 remains prohibited. If separately authorized after contracts are accepted, it must be additive and occur in these bounded phases:

1. install Schema 12 tables, constraints, indexes, immutable-row triggers and the accepted Event-subject extension;
2. retain existing readers/writers unchanged until the durable Activation repository is separately accepted;
3. perform no inferred Activation backfill, no conversion from OpenClaw job IDs, no scheduler-state import, no dual canonical write and no Run/history mutation;
4. validate clean Schema 11 upgrade and clean Schema 12 install on disposable supported PostgreSQL;
5. later cut over one Activation command path only after separate acceptance.

There is no required backfill because no canonical Activation state existed before Schema 12. Historical provider/runtime data must remain external evidence and cannot be reclassified as an ACS Activation.

At startup, a database below Schema 12 reports Activation durable state unavailable. It must not fall back to in-memory occurrence identity, an OpenClaw job, an Event ID, a Runtime job or a current Automation head. A partial migration blocks Activation mutation and exposes migration health.

Before the first durable write, rollback may remove feature exposure after proving no Schema 12 mutation occurred. After a durable write, rollback is roll-forward: stop new claims/admissions, retain immutable facts and repair through append-only state/reconciliation facts. It must never rewrite causal identity, alter exact Automation revision, suppress an admitted Run correlation or turn external provider history into canonical state.

## Acceptance plan after implementation authorization

A future database-affecting Slice must prove on supported disposable PostgreSQL:

- clean Schema 11 → 12 upgrade and clean Schema 12 install;
- Tenant isolation and no cross-Tenant causal lookup/enumeration;
- one Activation for concurrent same-cause claims and typed conflict for changed digest/material;
- exact Automation revision/fingerprint reconstruction after a later head change;
- append-only state history and immutable row rejection;
- claim expiry/reclaim with stale fencing rejection;
- attempt and state recovery after restart;
- PINNED persistence and `RESOLVED_AT_ACTIVATION` exact-resolution capture without `latest` fallback;
- pre-admission revoked/expired authority rejection without Grant-history mutation;
- uncertain admission-handoff recovery with one causal correlation and no semantic duplicate admission;
- schedule watermark recovery, time-basis/DST proof, bounded missed-work outcomes and duplicate suppression;
- Event/Evidence/outbox atomic rollback/recovery and metadata redaction;
- no scheduler execution, Run/Workflow creation, worker invocation or OpenClaw execution outside separately authorized slices.

## Required CTO decision after review

1. Accept or amend the five-relation shape and the deliberate absence of a generic observation table.
2. Freeze the Activation state transition matrix and typed terminal/outcome model before Slice 1 code.
3. Approve the local-FK versus historical-external-reference boundary.
4. Approve exact idempotency scopes, causal uniqueness and claim/fencing rules.
5. Approve the Schedule watermark/range-proof requirements and accepted missed-work policy representation.
6. Authorize a migration only after Slice 1 contracts and this physical design receive separate GO.
