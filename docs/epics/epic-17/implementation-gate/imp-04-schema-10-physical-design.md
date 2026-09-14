# EPIC-17-IMP-04 — Schema 10 Physical Design Candidate

**Status:** COMPLETE / CTO ACCEPTED
**Baseline:** e6db696
**Current schema:** 9
**Candidate target:** 10
**Migration 9 -> 10:** AUTHORIZED
**Persistence implementation:** Slice 2 only / AUTHORIZED
**Slice 2:** AUTHORIZED / GO

## Scope and frozen boundaries

This is a documentation-only physical design candidate for durable Delegation after accepted Slice 1 contracts. It proposes no migration file, migration-runner change, repository, PostgreSQL command, admission integration, Product API route, Workforce mutation, Run/Task creation, credential resolution, or Memory access.

Delegation remains a Governance-subordinate authorization relation between canonical Agents. It does not own Agent identity, Workforce, Runtime, credentials, secrets, Memory Policy, Memory content, admission, Assignment, Run, Task, Attempt, Event, Evidence, outbox, or idempotency infrastructure.

## Design decision

Schema 10 is required for durable Delegation because schema 9 has no owner for a bilateral, revocable, immutable authority lineage. The proposed model is:

~~~
acs_delegation_grants
  stable Grant identity + mutable CAS head
        |
acs_delegation_grant_revisions
  immutable authority terms, exact parent ref, snapshot/provenance
        |
acs_delegation_grant_revocations
  append-only lifecycle fact; no historical revision or Run mutation
~~~

Events, Evidence, outbox and idempotency reuse schema-9 owners. This design does not create a second Event store, Evidence ledger, outbox, idempotency table, database, Agent lineage, Workforce relation, or Runtime owner.

## Candidate tables and owner boundaries

| Table | Owner | Purpose | Explicit exclusions |
| --- | --- | --- | --- |
| acs_delegation_grants | Delegation boundary under Governance | stable Grant identity, current revision/fingerprint, usable lifecycle and CAS target | no Agent, credential, Memory or execution ownership |
| acs_delegation_grant_revisions | Delegation boundary under Governance | immutable authority terms, exact endpoints, parent/ancestry, lifecycle terms and governing refs | no raw secret, lease, Memory content or Runtime state |
| acs_delegation_grant_revocations | Delegation boundary under Governance | append-only revocation fact for future new-admission checks | no Run mutation or cancellation authority |

Agent and resource references are stored only as exact evaluated identifiers/revisions/fingerprints. Where schema 9 lacks a Tenant-aware immutable foreign-key surface, future command validation must consult the canonical owner in the same transaction and fail closed. Stored references grant nothing.

## Candidate physical shape

The following is review material, not migration SQL.

~~~sql
CREATE TABLE acs_delegation_grants (
  grant_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
  current_revision INTEGER NOT NULL CHECK (current_revision > 0),
  current_fingerprint TEXT NOT NULL,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('active', 'revoked', 'superseded')),
  valid_from TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (grant_id, tenant_id),
  UNIQUE (grant_id, tenant_id, current_revision, current_fingerprint),
  CHECK (expires_at > valid_from),
  CHECK (
    (lifecycle = 'revoked' AND revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
    OR
    (lifecycle <> 'revoked' AND revoked_at IS NULL AND revocation_reason IS NULL)
  )
);

CREATE TABLE acs_delegation_grant_revisions (
  grant_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  fingerprint TEXT NOT NULL,
  delegator_agent_id TEXT NOT NULL,
  delegator_agent_revision INTEGER NOT NULL CHECK (delegator_agent_revision > 0),
  delegator_agent_fingerprint TEXT NOT NULL,
  delegate_agent_id TEXT NOT NULL,
  delegate_agent_revision INTEGER NOT NULL CHECK (delegate_agent_revision > 0),
  delegate_agent_fingerprint TEXT NOT NULL,
  authority_bounds JSONB NOT NULL CHECK (jsonb_typeof(authority_bounds) = 'object'),
  governing_authority_refs JSONB NOT NULL CHECK (jsonb_typeof(governing_authority_refs) = 'array'),
  governing_policy_refs JSONB NOT NULL CHECK (jsonb_typeof(governing_policy_refs) = 'array'),
  approval_refs JSONB NOT NULL CHECK (jsonb_typeof(approval_refs) = 'array'),
  provenance_refs JSONB NOT NULL CHECK (jsonb_typeof(provenance_refs) = 'array'),
  parent_grant_id TEXT,
  parent_tenant_id TEXT,
  parent_revision INTEGER,
  parent_fingerprint TEXT,
  ancestry JSONB NOT NULL CHECK (jsonb_typeof(ancestry) = 'array'),
  ancestry_digest TEXT NOT NULL,
  depth INTEGER NOT NULL CHECK (depth > 0),
  onward_delegation_allowed BOOLEAN NOT NULL,
  max_delegation_depth INTEGER NOT NULL CHECK (max_delegation_depth > 0),
  valid_from TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  issued_by TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (grant_id, revision),
  UNIQUE (grant_id, tenant_id, revision, fingerprint),
  UNIQUE (grant_id, fingerprint),
  FOREIGN KEY (grant_id, tenant_id)
    REFERENCES acs_delegation_grants(grant_id, tenant_id),
  FOREIGN KEY (parent_grant_id, parent_tenant_id, parent_revision, parent_fingerprint)
    REFERENCES acs_delegation_grant_revisions(grant_id, tenant_id, revision, fingerprint)
    DEFERRABLE INITIALLY DEFERRED,
  CHECK (delegator_agent_id <> delegate_agent_id),
  CHECK (expires_at > valid_from),
  CHECK (depth <= max_delegation_depth),
  CHECK (
    (parent_grant_id IS NULL AND parent_tenant_id IS NULL
      AND parent_revision IS NULL AND parent_fingerprint IS NULL
      AND depth = 1 AND ancestry = '[]'::jsonb)
    OR
    (parent_grant_id IS NOT NULL AND parent_tenant_id = tenant_id
      AND parent_revision IS NOT NULL AND parent_fingerprint IS NOT NULL
      AND depth > 1)
  )
);

ALTER TABLE acs_delegation_grants
  ADD CONSTRAINT acs_delegation_grant_head_fk
  FOREIGN KEY (grant_id, tenant_id, current_revision, current_fingerprint)
  REFERENCES acs_delegation_grant_revisions(grant_id, tenant_id, revision, fingerprint)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE acs_delegation_grant_revocations (
  revocation_id TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL,
  revoked_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  governing_authority_refs JSONB NOT NULL CHECK (jsonb_typeof(governing_authority_refs) = 'array'),
  approval_refs JSONB NOT NULL CHECK (jsonb_typeof(approval_refs) = 'array'),
  provenance_refs JSONB NOT NULL CHECK (jsonb_typeof(provenance_refs) = 'array'),
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (grant_id, tenant_id, revision, fingerprint),
  FOREIGN KEY (grant_id, tenant_id, revision, fingerprint)
    REFERENCES acs_delegation_grant_revisions(grant_id, tenant_id, revision, fingerprint)
);

CREATE INDEX acs_delegation_grant_head_tenant_idx
  ON acs_delegation_grants (tenant_id, lifecycle, expires_at, grant_id);
CREATE INDEX acs_delegation_grant_delegator_idx
  ON acs_delegation_grant_revisions (tenant_id, delegator_agent_id, issued_at, grant_id);
CREATE INDEX acs_delegation_grant_delegate_idx
  ON acs_delegation_grant_revisions (tenant_id, delegate_agent_id, issued_at, grant_id);
CREATE INDEX acs_delegation_grant_parent_idx
  ON acs_delegation_grant_revisions (parent_grant_id, parent_revision)
  WHERE parent_grant_id IS NOT NULL;
~~~

The `payload` columns canonically serialize the accepted Slice 1 head, revision, or revocation contract for deterministic reconstruction. JSONB is otherwise reserved for bounded typed arrays/objects such as authority bounds and immutable reference sets; it is not a universal permission registry or a secret-bearing document store.

## Head/revision coherence, CAS and immutability

The head composite foreign key ensures the selected revision and fingerprint exist under the same Tenant. A future mutation must lock the stable grant identity, verify expected revision and fingerprint, append exactly one immutable revision or revocation fact, update the head, write the canonical Event and outbox entry, and record idempotency in one transaction.

CAS is expected_revision plus expected_fingerprint. A stale head changes no Grant row, Event, Evidence, outbox or idempotency result. Revisions and revocation rows are append-only; update/delete triggers must reject mutation. A replacement that broadens authority is a new governed request and cannot overwrite a prior revision.

## Parent, ancestry, depth and cycle validation

The exact parent composite foreign key proves a same-Tenant parent revision exists. The stored ancestry array and ancestry_digest are immutable reconstruction material. The database can enforce direct-versus-child row shape, same-Tenant parent, non-self Agent endpoints and local depth checks. It cannot safely prove every transitive Agent cycle or semantic attenuation from JSON alone.

Before insert, a future authoritative command must lock/read the exact parent chain and prove:

1. parent head/revision is usable at issuance;
2. child delegator is the parent delegate;
3. parent explicitly permits onward delegation;
4. child depth equals parent depth plus one and does not exceed parent maximum;
5. child expiry is no later than parent expiry;
6. child authority bounds are an intersection-only subset of the parent and governing source;
7. no Agent identity repeats across immutable ancestry.

The candidate stores depth and validates derived depth from exact immutable parent links. Any discrepancy, unavailable parent, stale fingerprint, repeated Agent or unknown source fails closed. A recursive CTE may be used for diagnostics/reconstruction but is not the sole integrity control.

## Lifecycle, expiry and revocation

The head lifecycle supports active, revoked and superseded. Expiry is immutable in each revision and is evaluated at issuance and new admission. Revocation creates an append-only row and changes the current head atomically. It blocks new issuance, admission, re-admission and authority-refresh retry. It does not update historical Grant revisions, Events, Evidence, snapshots or admitted Runs.

The revocation table uses one exact target revision because the historical question is which terms were revoked and when. A future governance decision may revoke the current usable head only unless a later ADR explicitly defines broader chain-revocation semantics. No revocation row owns cancellation; active work remains subject to existing Runtime policy.

## Governing, credential and Memory references

Governing authority, policy, approval and provenance references are exact immutable refs captured at issuance. Their canonical owners remain Governance, resource owners and Evidence. Future validation resolves them through those owners, not through a Delegation-local permission catalog.

Authority bounds may contain opaque Connection references and credential purposes. They must not persist a secret-store reference, credential value, token, lease, API key or password. The credential owner revalidates the reference/purpose at future use.

Authority bounds may contain Memory scope refs and allowed Memory operations. They must not contain Memory content, retrieval results, embeddings or a Memory Policy replacement. GovernedMemoryService and exact Memory Policy remain the future operational enforcement boundary. User Context Memory remains excluded.

## Event, Evidence, outbox and idempotency transaction model

Schema 10 must extend the schema-9 database subject constraint to include delegation_grant, matching accepted native contract vocabulary. No new Event table is proposed.

For create, replacement/supersession and revocation:

~~~
canonical owner and Tenant proof
  + exact authority/parent attenuation validation
  + head lock and CAS
  + immutable revision or revocation insert
  + head update when applicable
  + acs_native_events row
  + acs_native_evidence row when required
  + acs_native_outbox row
  + acs_native_idempotency success record
  = one transaction
~~~

Candidate Event types are delegation_grant.issued, delegation_grant.revision_created, delegation_grant.revoked and delegation_grant.superseded. Payload is limited to grant ID, Tenant, revision, fingerprint, lifecycle, redacted authority-bounds fingerprint, parent ref/fingerprint, ancestry digest, depth, expiry, governing decision refs and correlation/causation. It excludes secrets, credential material, Memory content and full raw authority/policy documents.

Use aggregate-safe Tenant-qualified scopes:
- delegation.grant:<tenant_id>:<grant_id> for creation/revision;
- delegation.grant.revoke:<tenant_id>:<grant_id> for revocation.

The schema-9 native idempotency rule applies: same scope/key/request hash and operation replays the recorded success; a changed hash, operation or semantic input is a typed conflict. Parent exact ref/fingerprint and expected head belong in the request hash.

## Migration 9 -> 10 strategy

Migration remains prohibited. If later authorized, the migration is additive and needs no backfill because no canonical Delegation state existed before Slice 1. It must:

1. install Grant tables, constraints, indexes, immutable triggers and Event subject constraint extension;
2. leave all readers/writers unchanged until the durable repository is separately accepted;
3. verify clean schema-9 upgrade, clean schema-10 install, restart, concurrent CAS/idempotency, failed-transaction rollback, Tenant isolation and Event/outbox recovery;
4. perform no legacy sub-Agent conversion, inferred grant generation, backfill or dual-write;
5. expose no Product API or admission path before later authorization.

## Startup, deployment, rollback and failure semantics

Startup must treat a database below schema 10 as unavailable for durable Delegation, not as permission to fall back to in-memory or Agent/Workforce fields. A partially applied schema-10 migration blocks Delegation mutations and reports migration health; it must not fabricate a head or bypass lineage checks.

Deployment requires a supported disposable PostgreSQL acceptance before production review. Failed transaction means no head, revision, revocation, Event, Evidence, outbox or idempotency success is committed. Outbox delivery failure leaves the committed authoritative mutation recoverable through schema-9 outbox semantics.

Rollback before any durable write may remove deployment exposure only after confirming no schema-10 mutation occurred. After a durable Grant mutation, rollback is roll-forward: preserve immutable Grant/Event/Evidence facts, stop new Delegation commands and repair with append-only correction or revocation. No rollback may rewrite history, resurrect revoked authority, turn legacy sub-Agent metadata into a Grant, or alter admitted execution snapshots.

## CTO decisions required

1. Accept or amend the three-table shape and the stable identity/revision/head model.
2. Decide whether Grant lifecycle uses only active/revoked/superseded or requires an additional non-usable draft state.
3. Approve the exact JSONB canonical serialization and redacted Event payload contract.
4. Approve the parent-chain enforcement boundary: database local constraints plus transactional canonical-owner validation.
5. Decide current-head-only versus chain-wide revocation semantics.
6. Authorize a migration only after this physical design and associated ADRs are accepted.

**Review result:** schema 10 is REQUIRED / PHYSICAL DESIGN ACCEPTED. Migration 9 -> 10 and Slice 2 durable Delegation persistence are authorized. Admission, Runtime authority consumption, Product API, Workforce mutation and operational credential/Memory access remain unauthorized.
