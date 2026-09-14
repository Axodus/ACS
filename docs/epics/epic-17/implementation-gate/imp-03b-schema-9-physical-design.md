# EPIC-17-IMP-03B — Schema 9 Physical Persistence Design

**Status:** COMPLETE / CTO ACCEPTED / PUBLISHED; ADR-023 COMPLETE / CTO ACCEPTED
**Baseline:** ef759def3746ca7d87ce283b10837e0d7269ae51
**Current schema:** 8
**Candidate target:** 9
**Migration execution:** AUTHORIZED — schema 8 -> 9 only
**Slice 2:** AUTHORIZED / GO

**ADR-023 package:** [Memory protection, deletion and reconstruction](imp-03b-adr-023-encryption-erasure.md), `COMPLETE / CTO ACCEPTED`

## Decisions frozen by Slice 1 and CTO

- Policy is stable identity, immutable contiguous revisions, and a mutable
  current head.
- Record is one immutable identity. Changed content creates a different
  memory_id with an exact predecessor reference. There is no
  MemoryRecordRevision table, record-head table, or in-place content update.
- Deletion removes content physically and adds one immutable content-free
  tombstone. A read projection reports tombstoned from that tombstone; it does
  not update the original Record.
- User Context Memory has no table, discriminator, or command in schema 9.
- External Agent, Workforce, Runtime and Knowledge references are validated at
  their canonical owner boundary before persistence when Tenant-compatible FKs
  do not exist; no shadow owner table is permitted.
- Immutable Policy revisions, Records and tombstones use the proposed database
  triggers. Contents remain deletable only through the explicit retention
  transaction.
- memory_policy and memory_record are approved Event subjects. Envelope/store
  implementation remains a future Slice 2 concern.

## Candidate tables

| Table | Owner | Purpose |
| --- | --- | --- |
| acs_memory_policies | Governance | Tenant Policy head and CAS target. |
| acs_memory_policy_revisions | Governance | Immutable Policy semantics and history. |
| acs_memory_records | Memory Store | Immutable metadata, explicit scope, and successor lineage. |
| acs_memory_contents | Memory Store | The only raw-content residence while a Record is active. |
| acs_memory_tombstones | Memory Store | Immutable deletion proof and allowed residual metadata. |

Events, Evidence, outbox, and idempotency reuse their existing tables. No new
Event store, Evidence store, idempotency store, or database is proposed.

## Exact schema candidate

This is design material only. It is not a migration file and must not be copied
into the migration runner before CTO migration authorization.

~~~sql
CREATE TABLE acs_memory_policies (
  memory_policy_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
  current_revision INTEGER NOT NULL CHECK (current_revision > 0),
  current_fingerprint TEXT NOT NULL,
  current_lifecycle TEXT NOT NULL CHECK (current_lifecycle IN ('draft', 'active', 'disabled', 'archived')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (memory_policy_id, tenant_id),
  UNIQUE (memory_policy_id, tenant_id, current_revision, current_fingerprint)
);

CREATE TABLE acs_memory_policy_revisions (
  memory_policy_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  fingerprint TEXT NOT NULL,
  supersedes_revision INTEGER,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('draft', 'active', 'disabled', 'archived')),
  policy_contract JSONB NOT NULL CHECK (jsonb_typeof(policy_contract) = 'object'),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  change_reason TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (memory_policy_id, revision),
  UNIQUE (memory_policy_id, tenant_id, revision, fingerprint),
  UNIQUE (memory_policy_id, fingerprint),
  FOREIGN KEY (memory_policy_id, tenant_id)
    REFERENCES acs_memory_policies(memory_policy_id, tenant_id),
  FOREIGN KEY (memory_policy_id, supersedes_revision)
    REFERENCES acs_memory_policy_revisions(memory_policy_id, revision),
  CHECK ((revision = 1 AND supersedes_revision IS NULL)
      OR (revision > 1 AND supersedes_revision = revision - 1))
);

ALTER TABLE acs_memory_policies
  ADD CONSTRAINT acs_memory_policy_head_fk
  FOREIGN KEY (memory_policy_id, tenant_id, current_revision, current_fingerprint)
  REFERENCES acs_memory_policy_revisions(memory_policy_id, tenant_id, revision, fingerprint)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE acs_memory_records (
  memory_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
  fingerprint TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('working', 'agent', 'workforce_shared', 'knowledge_backed')),
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('working', 'agent', 'workforce_shared', 'knowledge_backed')),
  policy_id TEXT NOT NULL,
  policy_revision INTEGER NOT NULL CHECK (policy_revision > 0),
  policy_fingerprint TEXT NOT NULL,
  predecessor_memory_id TEXT,
  predecessor_tenant_id TEXT,
  predecessor_fingerprint TEXT,
  working_run_id TEXT,
  working_task_id TEXT,
  working_attempt_id TEXT,
  agent_id TEXT,
  workforce_id TEXT,
  workforce_revision INTEGER,
  workforce_fingerprint TEXT,
  workforce_run_id TEXT,
  knowledge_id TEXT,
  knowledge_revision INTEGER,
  knowledge_fingerprint TEXT,
  sensitivity TEXT NOT NULL CHECK (sensitivity IN ('internal', 'restricted')),
  provenance JSONB NOT NULL CHECK (jsonb_typeof(provenance) = 'object'),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (memory_id, tenant_id),
  UNIQUE (memory_id, tenant_id, fingerprint),
  FOREIGN KEY (policy_id, tenant_id, policy_revision, policy_fingerprint)
    REFERENCES acs_memory_policy_revisions(memory_policy_id, tenant_id, revision, fingerprint),
  FOREIGN KEY (predecessor_memory_id, predecessor_tenant_id, predecessor_fingerprint)
    REFERENCES acs_memory_records(memory_id, tenant_id, fingerprint)
    DEFERRABLE INITIALLY DEFERRED,
  CHECK ((predecessor_memory_id IS NULL AND predecessor_tenant_id IS NULL AND predecessor_fingerprint IS NULL)
      OR (predecessor_memory_id IS NOT NULL AND predecessor_tenant_id = tenant_id
          AND predecessor_fingerprint IS NOT NULL AND predecessor_memory_id <> memory_id)),
  CHECK (
    (memory_type = 'working' AND scope_kind = 'working'
      AND working_run_id IS NOT NULL
      AND (working_task_id IS NOT NULL OR working_attempt_id IS NULL)
      AND agent_id IS NULL AND workforce_id IS NULL AND workforce_revision IS NULL
      AND workforce_fingerprint IS NULL AND workforce_run_id IS NULL
      AND knowledge_id IS NULL AND knowledge_revision IS NULL AND knowledge_fingerprint IS NULL)
    OR
    (memory_type = 'agent' AND scope_kind = 'agent'
      AND agent_id IS NOT NULL
      AND working_run_id IS NULL AND working_task_id IS NULL AND working_attempt_id IS NULL
      AND workforce_id IS NULL AND workforce_revision IS NULL AND workforce_fingerprint IS NULL
      AND workforce_run_id IS NULL AND knowledge_id IS NULL AND knowledge_revision IS NULL
      AND knowledge_fingerprint IS NULL)
    OR
    (memory_type = 'workforce_shared' AND scope_kind = 'workforce_shared'
      AND workforce_id IS NOT NULL AND workforce_revision IS NOT NULL
      AND workforce_fingerprint IS NOT NULL AND workforce_run_id IS NOT NULL
      AND working_run_id IS NULL AND working_task_id IS NULL AND working_attempt_id IS NULL
      AND agent_id IS NULL AND knowledge_id IS NULL AND knowledge_revision IS NULL
      AND knowledge_fingerprint IS NULL)
    OR
    (memory_type = 'knowledge_backed' AND scope_kind = 'knowledge_backed'
      AND knowledge_id IS NOT NULL AND knowledge_revision IS NOT NULL
      AND knowledge_fingerprint IS NOT NULL
      AND working_run_id IS NULL AND working_task_id IS NULL AND working_attempt_id IS NULL
      AND agent_id IS NULL AND workforce_id IS NULL AND workforce_revision IS NULL
      AND workforce_fingerprint IS NULL AND workforce_run_id IS NULL)
  )
);

CREATE TABLE acs_memory_contents (
  content_id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  content_ciphertext BYTEA NOT NULL,
  media_type TEXT NOT NULL,
  content_digest TEXT NOT NULL,
  encryption_key_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (memory_id),
  UNIQUE (memory_id, tenant_id),
  FOREIGN KEY (memory_id, tenant_id)
    REFERENCES acs_memory_records(memory_id, tenant_id)
);

CREATE TABLE acs_memory_tombstones (
  memory_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL,
  deletion_reason TEXT NOT NULL CHECK (deletion_reason IN ('retention_expired', 'policy_forget', 'administrative_deletion')),
  policy_id TEXT NOT NULL,
  policy_revision INTEGER NOT NULL CHECK (policy_revision > 0),
  policy_fingerprint TEXT NOT NULL,
  digest_retention TEXT NOT NULL CHECK (digest_retention IN ('not_retained', 'policy_permitted')),
  retained_content_digest TEXT,
  provenance JSONB NOT NULL CHECK (jsonb_typeof(provenance) = 'object'),
  event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
  CHECK ((digest_retention = 'not_retained' AND retained_content_digest IS NULL)
      OR (digest_retention = 'policy_permitted' AND retained_content_digest IS NOT NULL)),
  FOREIGN KEY (memory_id, tenant_id)
    REFERENCES acs_memory_records(memory_id, tenant_id),
  FOREIGN KEY (policy_id, tenant_id, policy_revision, policy_fingerprint)
    REFERENCES acs_memory_policy_revisions(memory_policy_id, tenant_id, revision, fingerprint)
);

ALTER TABLE acs_native_events ADD COLUMN subject_type TEXT;
ALTER TABLE acs_native_events ADD COLUMN subject_id TEXT;
ALTER TABLE acs_native_events ADD CONSTRAINT acs_native_event_subject_pair_check
  CHECK ((subject_type IS NULL) = (subject_id IS NULL));
ALTER TABLE acs_native_events ADD CONSTRAINT acs_native_event_subject_type_check
  CHECK (subject_type IS NULL OR subject_type IN
    ('agent', 'workforce', 'run', 'task',
     'integration_connection', 'integration_channel',
     'memory_policy', 'memory_record'));

CREATE FUNCTION acs_reject_memory_immutable_row_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'immutable Memory row cannot be updated or deleted';
END;
$$;

CREATE TRIGGER acs_memory_policy_revision_immutable
  BEFORE UPDATE OR DELETE ON acs_memory_policy_revisions
  FOR EACH ROW EXECUTE FUNCTION acs_reject_memory_immutable_row_mutation();
CREATE TRIGGER acs_memory_record_immutable
  BEFORE UPDATE OR DELETE ON acs_memory_records
  FOR EACH ROW EXECUTE FUNCTION acs_reject_memory_immutable_row_mutation();
CREATE TRIGGER acs_memory_tombstone_immutable
  BEFORE UPDATE OR DELETE ON acs_memory_tombstones
  FOR EACH ROW EXECUTE FUNCTION acs_reject_memory_immutable_row_mutation();

CREATE FUNCTION acs_assert_memory_content_tombstone_exclusive()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM acs_memory_contents AS content
      JOIN acs_memory_tombstones AS tombstone
        ON tombstone.memory_id = content.memory_id
       AND tombstone.tenant_id = content.tenant_id
     WHERE content.memory_id = NEW.memory_id
       AND content.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'active Memory content and tombstone cannot coexist';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER acs_memory_content_tombstone_exclusive_from_content
  AFTER INSERT OR UPDATE ON acs_memory_contents
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  EXECUTE FUNCTION acs_assert_memory_content_tombstone_exclusive();
CREATE CONSTRAINT TRIGGER acs_memory_content_tombstone_exclusive_from_tombstone
  AFTER INSERT OR UPDATE ON acs_memory_tombstones
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  EXECUTE FUNCTION acs_assert_memory_content_tombstone_exclusive();

CREATE INDEX acs_memory_policy_head_tenant_idx
  ON acs_memory_policies (tenant_id, current_lifecycle, memory_policy_id);
CREATE INDEX acs_memory_record_scope_idx
  ON acs_memory_records (tenant_id, memory_type, scope_kind, created_at, memory_id);
CREATE INDEX acs_memory_record_agent_idx
  ON acs_memory_records (tenant_id, agent_id, created_at) WHERE agent_id IS NOT NULL;
CREATE INDEX acs_memory_record_workforce_idx
  ON acs_memory_records (tenant_id, workforce_id, workforce_revision, created_at)
  WHERE workforce_id IS NOT NULL;
CREATE INDEX acs_memory_record_knowledge_idx
  ON acs_memory_records (tenant_id, knowledge_id, knowledge_revision, created_at)
  WHERE knowledge_id IS NOT NULL;
CREATE INDEX acs_native_event_subject_idx
  ON acs_native_events (tenant_id, subject_type, subject_id, sequence)
  WHERE subject_type IS NOT NULL;
~~~

The immutable-row trigger is the recommended physical enforcement, rather than
repository convention alone. It is design-only until a migration is authorized.
Policy contract and provenance are typed, secret-free Native Core contracts.
They are not content escape hatches. No metadata table includes content bytes,
content references, embeddings, credentials, secrets, or authorization headers.

### ADR-023 amendment pending CTO decision

The `acs_memory_contents` snippet above shows the pre-ADR placeholder
`encryption_key_ref`. The pending ADR-023 recommendation replaces it with the
opaque `encryption_backend`, `encryption_key_ref`, `encryption_key_version`,
`cipher_suite` and `encryption_context_digest` fields, plus a content-row guard
that permits only security rewraps and explicit retention deletion. It does not
add a table or change the five-table ownership shape. See the
[ADR-023 package](imp-03b-adr-023-encryption-erasure.md).

## Tenant integrity and scope constraints

The Record CHECK is a closed sum type, not a loose scope_type plus nullable
scope_id design. It permits exactly Working, Agent, Workforce Shared, and
Knowledge-backed combinations. Internal Policy, predecessor, content, and
tombstone relations use composite Tenant-aware foreign keys.

Agent, Workforce, Run/Task/Attempt, and Knowledge do not currently expose one
uniform Tenant-compatible immutable FK surface. Schema 9 must not pretend that
one exists. Slice 2 must validate each external reference through its canonical
owner under the same transaction and reject unavailable or cross-Tenant owners.
Stored identifiers/revisions/fingerprints describe the evaluated boundary; they
grant no authority.

## Successor model and cycle prevention

A changed Record is a new memory_id with an exact predecessor id, Tenant, and
fingerprint. The predecessor FK proves same-Tenant existence and the CHECK
rejects self-reference.

Cycles are impossible while Records are insert-only: a predecessor must exist
before its successor, and a new immutable id cannot already be its own
ancestor. The proposed immutable-row trigger denies Record updates/deletes. If
a later implementation weakens that trigger or permits predecessor updates, it
must stop for CTO review.

## Tombstone and physical deletion

Before deletion, immutable metadata exists in acs_memory_records and exactly one
raw-content row exists in acs_memory_contents. After deletion, the metadata
still exists, content is physically absent, and one tombstone supplies the
current tombstoned projection. The deferred cross-table constraint triggers
allow the explicit transaction to insert a tombstone and remove content in either
order, but reject a commit where both rows remain.

~~~text
lock memory_id and verify active content plus exact Policy decision
  -> validate deletion authority and digest-retention rule
  -> append content-free memory.record.tombstoned Event
  -> insert immutable tombstone
  -> delete acs_memory_contents for memory_id and tenant_id
  -> insert outbox
  -> commit
~~~

Any Event, tombstone, content-delete, or outbox failure rolls back the entire
transaction. Event, outbox, and Evidence carry only IDs, type/scope, Policy ref,
reason class, and provenance references. They never carry content bytes,
content ID/ref, digest, embedding, or a reusable decryption/key reference.

The PostgreSQL content row is absent after commit. ADR-023 must still select the
governed encryption-key owner and backup/WAL erasure policy before migration
authorization, so a retained backup cannot become an unauthorized recovery path.

## CAS, idempotency, Event and outbox

Policy mutations lock memory-policy:id and use CAS on current_revision plus
current_fingerprint. Closed idempotency scopes include the exact Tenant and are:

- memory.policy:tenant-id:memory-policy-id for Policy create, revise, and lifecycle;
- memory.record:tenant-id:memory-id for Record and successor creation;
- memory.retention:tenant-id:memory-id for tombstone/deletion.

The existing acs_native_idempotency request-hash conflict behavior is reused.
Each durable mutation commits canonical state, Event, and outbox in one
transaction. Policy Events use memory_policy and Record, successor, and
tombstone Events use memory_record. Payloads carry only safe IDs, exact
revision/fingerprint where applicable, Policy ref, correlation/causation, and
lifecycle/reason class.

## Migration, deployment, and rollback

| Topic | Candidate behavior |
| --- | --- |
| Forward migration | Add five tables, Event subject columns/checks/indexes, and immutable-row protections. Existing Event vocabulary remains compatible for agent, workforce, run, task and Integration subjects. No existing table is rewritten. |
| Bootstrap | Existing migration runner applies version 9 after version 8. |
| Development data | Disposable. No SQLite import, backfill, mapping, or fabricated provenance. |
| Old code/new schema | Safe: old code ignores additive tables and nullable Event subject columns. |
| New code/old schema | Fail closed: Memory Store commands require schema 9 and never use a JSON fallback. |
| Deployment order | Migrate, deploy Slice 2 repository/envelope code, run PostgreSQL acceptance, then enable durable commands. |
| Rollback | Before the first write, roll back code and leave tables unused. After write/tombstone, roll forward only; never drop tables or resurrect content. |
| Migration failure | The current runner takes an advisory transaction lock and applies every pending migration statement plus its version record in one transaction. A schema-9 statement failure rolls back to schema 8 with no version-9 record and no partial Memory owner enabled. |

## Remaining CTO decisions and blockers

1. ADR-023 must approve the encryption-key owner and backup/WAL erasure policy.
2. Approve canonical-owner validation for external Agent, Workforce, Runtime,
   and Knowledge Tenant references where composite FK targets do not exist.
3. ADR-023 must define encryption-key ownership, rotation, backup/WAL handling,
   deletion guarantee vocabulary and development/production posture.
4. E17-R06-B03 remains open. User Context is absent from schema 9.
5. E17-R06-B04 is partially reduced by the approved physical shape and remains
   open until ADR-023 closes and physical deletion is implemented and proven.

## Future migration validation

The migration authorization package must prove Policy CAS/history, scope CHECK
failure, external cross-Tenant rejection, successor self/cross-Tenant/cycle
rejection, tombstone rollback, physical content absence, Event/outbox atomicity,
idempotency replay/conflict, redaction, old/new schema compatibility, PostgreSQL
acceptance, and full causal regression. This document itself is design only.
