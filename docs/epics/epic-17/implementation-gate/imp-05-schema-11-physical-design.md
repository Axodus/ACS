# EPIC-17-IMP-05 — Schema 11 Physical Design

**Status:** `COMPLETE / CTO ACCEPTED`
**Current canonical schema:** `10`
**Candidate target:** `11`
**Migration 10 -> 11:** `NOT AUTHORIZED`
**Functional persistence:** `HOLD`
**Source decisions:** `ADR-17-030` through `ADR-17-034` accepted by CTO on September 14, 2026

## Scope and frozen boundaries

This is a physical-design package only. It defines the candidate durable shape for Automation identity/history after CTO acceptance of the logical model. It does not add a migration, table, repository, service, route, Product API projection, scheduler, trigger receiver, Activation, admission call, Run, provider integration or OpenClaw execution path.

Automation remains a Tenant-scoped governed configuration subject:

```text
Automation head / CAS
  -> immutable Automation revision
  -> immutable lifecycle fact
  -> future Activation only
  -> existing authority/admission/Run machinery
```

Automation does not own Agent, Workforce, Workflow, Delegation authority, credential/secret material, Trigger/Schedule occurrence, Activation, execution intent, Run, Task, Attempt, executor, Evidence, Event, outbox, idempotency, Usage or Cost.

## Candidate relation model

```text
acs_automations
  stable automation_id + Tenant + current revision/fingerprint + lifecycle head/CAS
       |                              |                     |
       |                              |                     +-- exact current lifecycle fact
       |                              +-- exact current authored revision
       |
acs_automation_revisions
  immutable authored configuration, target semantics and historical references
       |
acs_automation_lifecycle_events
  append-only enabled/disabled/archived eligibility facts; no configuration rewrite
```

Events, Evidence, outbox and idempotency reuse the existing shared tables. Schema 11 proposes no parallel persistence or delivery infrastructure.

| Relation | Candidate owner | Purpose | Explicit exclusions |
| --- | --- | --- | --- |
| `acs_automations` | Automation domain under Governance | stable identity, current revision/fingerprint, current lifecycle and CAS target | no current authority, target resolution result, Trigger/Schedule occurrence or execution state |
| `acs_automation_revisions` | Automation domain | immutable authored execution-intent configuration and exact historical refs | no effective configuration, credential/secret, provider payload or Activation/Run state |
| `acs_automation_lifecycle_events` | Automation domain under Governance | append-only eligibility transitions and their provenance | no revision mutation, authority grant, cancellation or execution control |

## Candidate physical shape

The SQL is design material, not a migration. The SQL values `pinned` and `resolved_at_activation` implement the frozen semantic modes `PINNED` and `RESOLVED_AT_ACTIVATION`, respectively.

~~~sql
CREATE TABLE acs_automations (
  automation_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
  current_revision INTEGER NOT NULL CHECK (current_revision > 0),
  current_fingerprint TEXT NOT NULL,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('draft', 'enabled', 'disabled', 'archived')),
  lifecycle_sequence INTEGER NOT NULL CHECK (lifecycle_sequence > 0),
  current_lifecycle_event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (automation_id, tenant_id),
  UNIQUE (automation_id, tenant_id, current_revision, current_fingerprint),
  UNIQUE (automation_id, tenant_id, lifecycle_sequence, current_lifecycle_event_id)
);

CREATE TABLE acs_automation_revisions (
  automation_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  fingerprint TEXT NOT NULL,
  predecessor_revision INTEGER,
  predecessor_fingerprint TEXT,
  purpose TEXT NOT NULL,
  target_mode TEXT NOT NULL CHECK (target_mode IN ('pinned', 'resolved_at_activation')),
  target_kind TEXT NOT NULL,
  pinned_target_ref JSONB,
  target_resolution_policy JSONB,
  trigger_schedule_definition JSONB NOT NULL CHECK (jsonb_typeof(trigger_schedule_definition) = 'object'),
  agent_workforce_refs JSONB NOT NULL CHECK (jsonb_typeof(agent_workforce_refs) = 'array'),
  delegation_requirement_refs JSONB NOT NULL CHECK (jsonb_typeof(delegation_requirement_refs) = 'array'),
  governing_resource_refs JSONB NOT NULL CHECK (jsonb_typeof(governing_resource_refs) = 'array'),
  authored_configuration JSONB NOT NULL CHECK (jsonb_typeof(authored_configuration) = 'object'),
  authored_by TEXT NOT NULL,
  authored_at TIMESTAMPTZ NOT NULL,
  change_reason TEXT NOT NULL,
  provenance_refs JSONB NOT NULL CHECK (jsonb_typeof(provenance_refs) = 'array'),
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (automation_id, revision),
  UNIQUE (automation_id, tenant_id, revision, fingerprint),
  UNIQUE (automation_id, fingerprint),
  FOREIGN KEY (automation_id, tenant_id)
    REFERENCES acs_automations(automation_id, tenant_id),
  FOREIGN KEY (automation_id, predecessor_revision, predecessor_fingerprint)
    REFERENCES acs_automation_revisions(automation_id, revision, fingerprint)
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (revision = 1 AND predecessor_revision IS NULL AND predecessor_fingerprint IS NULL)
    OR
    (revision > 1 AND predecessor_revision = revision - 1 AND predecessor_fingerprint IS NOT NULL)
  ),
  CHECK (
    (target_mode = 'pinned' AND pinned_target_ref IS NOT NULL AND target_resolution_policy IS NULL)
    OR
    (target_mode = 'resolved_at_activation' AND pinned_target_ref IS NULL AND target_resolution_policy IS NOT NULL)
  )
);

ALTER TABLE acs_automations
  ADD CONSTRAINT acs_automation_head_fk
  FOREIGN KEY (automation_id, tenant_id, current_revision, current_fingerprint)
  REFERENCES acs_automation_revisions(automation_id, tenant_id, revision, fingerprint)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE acs_automation_lifecycle_events (
  lifecycle_event_id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  lifecycle_sequence INTEGER NOT NULL CHECK (lifecycle_sequence > 0),
  observed_revision INTEGER NOT NULL CHECK (observed_revision > 0),
  observed_fingerprint TEXT NOT NULL,
  from_lifecycle TEXT,
  to_lifecycle TEXT NOT NULL CHECK (to_lifecycle IN ('draft', 'enabled', 'disabled', 'archived')),
  transitioned_by TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  governing_authority_refs JSONB NOT NULL CHECK (jsonb_typeof(governing_authority_refs) = 'array'),
  approval_refs JSONB NOT NULL CHECK (jsonb_typeof(approval_refs) = 'array'),
  provenance_refs JSONB NOT NULL CHECK (jsonb_typeof(provenance_refs) = 'array'),
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (automation_id, lifecycle_sequence),
  FOREIGN KEY (automation_id, tenant_id)
    REFERENCES acs_automations(automation_id, tenant_id),
  FOREIGN KEY (automation_id, tenant_id, observed_revision, observed_fingerprint)
    REFERENCES acs_automation_revisions(automation_id, tenant_id, revision, fingerprint),
  CHECK ((lifecycle_sequence = 1 AND from_lifecycle IS NULL AND to_lifecycle = 'draft')
      OR (lifecycle_sequence > 1 AND from_lifecycle IS NOT NULL))
);

ALTER TABLE acs_automations
  ADD CONSTRAINT acs_automation_lifecycle_head_fk
  FOREIGN KEY (current_lifecycle_event_id)
  REFERENCES acs_automation_lifecycle_events(lifecycle_event_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX acs_automation_head_tenant_idx
  ON acs_automations (tenant_id, lifecycle, updated_at, automation_id);
CREATE INDEX acs_automation_revision_target_idx
  ON acs_automation_revisions (tenant_id, target_kind, authored_at, automation_id);
CREATE INDEX acs_automation_lifecycle_history_idx
  ON acs_automation_lifecycle_events (tenant_id, automation_id, lifecycle_sequence);
~~~

The head's mutable fields are limited to revision/fingerprint, lifecycle/lifecycle pointer, payload and timestamps under CAS. Revision and lifecycle-event rows are append-only. A future migration must add immutable-row triggers to reject update/delete on both history tables.

## Integrity: relational versus historical external references

| Reference class | Candidate enforcement | Reason |
| --- | --- | --- |
| Tenant | direct FK to `acs_tenants`; composite FKs inside Automation | tenant isolation and internal lineage are local durable facts |
| Automation head -> revision and lifecycle event | deferred composite/internal FKs | proves current pointers select exact immutable history in one transaction |
| revision predecessor | same-Automation FK plus contiguous revision CHECK | prevents broken or cross-Automation lineage |
| Event IDs | direct FK to `acs_native_events` | shared Event is an ACS-local durable fact |
| Agent, Workforce, Workflow and target refs | exact typed historical refs; canonical-owner validation at command time | no uniform Tenant-compatible immutable FK surface exists; FK would fabricate ownership or erase valid historical reconstruction |
| Delegation requirements | exact grant/revision/fingerprint ref, validated by Delegation owner when authored and revalidated by future Activation | Automation stores no authority and Grant revocation must not rewrite Automation history |
| Trigger/Schedule definition or governed refs | bounded typed JSON ref/config validated by its owner | a definition is configuration, not occurrence/scheduler state |
| governance/resource/policy refs | exact historical refs and owner validation | avoids a duplicate resource/governance registry |
| OpenClaw/executor handles | optional integration/projection ref only; no FK | replaceable provider state is non-canonical and may not outlive historical ACS identity |

`payload`, `authored_configuration`, and reference arrays are metadata-safe typed serializations, not unbounded documents. They must reject secret values, credential material, Memory content, raw provider/executor payloads, authentication headers and tokens.

## Revision, lifecycle and CAS semantics

A semantic configuration change appends one contiguous revision and updates head revision/fingerprint with expected revision plus expected fingerprint. It does not add a lifecycle event unless a separately authorized command also performs a valid lifecycle transition.

A lifecycle transition locks the stable Automation head, checks expected revision/fingerprint and expected lifecycle sequence, appends one lifecycle fact, updates only lifecycle head fields, and leaves authored revision rows unchanged. The first lifecycle fact establishes `draft` for revision 1. Candidate transitions are `draft -> enabled`, `enabled -> disabled`, `disabled -> enabled`, and `draft|enabled|disabled -> archived`; no transition leaves `archived` without a future CTO decision.

A stale CAS operation commits no Automation row, Event, Evidence, outbox or idempotency success. Same idempotency key with a different request hash, operation or expected state is a typed conflict. Revisions and lifecycle events never update in place.

## Target semantics and historical reconstruction

`pinned_target_ref` holds an exact typed target identity/revision/fingerprint. `target_resolution_policy` holds deterministic authored criteria and exact governed refs, but no future resolution result. The exclusive CHECK forbids implicit latest and requires exactly one mode.

Historical reconstruction of an Automation revision returns the authored target mode, exact pinned ref or exact resolution policy, Trigger/Schedule definition/configuration, Agent/Workforce refs, Delegation requirement refs, governing/resource refs, author/provenance and revision fingerprint. It does not resolve today's target, Grant, policy, provider availability or executor state.

Lifecycle reconstruction uses the exact lifecycle fact and its observed Automation revision. It proves eligibility history only. It does not prove that an Activation occurred, authority was valid, admission succeeded or a Run existed.

## Event, Evidence, outbox and idempotency

The future schema 11 migration may extend the existing Event subject CHECK to include `automation`; no new Event table is proposed. The candidate semantic vocabulary is:

- `automation.created`
- `automation.revised`
- `automation.enabled`
- `automation.disabled`
- `automation.archived`

Final Event names must conform to the implemented Event subsystem at implementation time. Event/Evidence payloads contain only safe metadata: Automation ID, Tenant, revision/fingerprint, lifecycle transition, target mode, redacted reference fingerprints, reason class, correlation/causation and provenance references. They exclude secrets, credential material, Memory content and raw provider/executor payloads.

Each future command must commit in one transaction:

```text
canonical Tenant/governance proof
  + external reference validation where applicable
  + head lock and CAS
  + immutable revision or lifecycle fact
  + head update
  + Event and Evidence when required
  + existing outbox row
  + existing idempotency success record
```

Candidate scopes are `automation:<tenant_id>:<automation_id>` for create/revise and `automation.lifecycle:<tenant_id>:<automation_id>` for lifecycle transition. Occurrence idempotency is excluded; it belongs to future Activation.

## Migration, startup, rollback and validation gate

Migration 10 -> 11 remains prohibited. If separately authorized, it must be additive: add the three Automation tables, internal constraints/indexes, immutable triggers and Event-subject extension; retain all schema-10 data unchanged; create no backfill, inferred Automation, legacy OpenClaw import, dual write, Product API route or Activation path.

A database below schema 11 must report durable Automation unavailable rather than falling back to OpenClaw, in-memory configuration, Agent fields or scheduler state. After durable writes, rollback is roll-forward: preserve immutable Automation/Event/Evidence facts, stop new commands and repair by append-only correction/lifecycle transition. No rollback may rewrite history or reinterpret a historical external ref using current state.

A future migration authorization must prove clean schema-10 upgrade and clean schema-11 install; Tenant isolation; head/revision/lifecycle coherence; immutable-row rejection; stale CAS; replay/conflict idempotency; target-mode exclusivity; cross-Tenant/unavailable external-reference rejection; Event/Evidence/outbox atomic rollback/recovery; metadata redaction; restart reconstruction; and no scheduler, Activation, admission, Run or provider execution effect.

## Required CTO decision after review

Approve or amend the three-relation physical shape, local-FK/external-reference boundary, lifecycle transition matrix, candidate Event subject/vocabulary and the migration acceptance package. This document alone does not authorize Schema 11 migration, functional persistence, Product API, Activation, scheduler or executor work.
