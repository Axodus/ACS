# EPIC-17-IMP-03A — Persistence & Migration Design

## Decision state

**Status:** `AUTHORIZED / GO`
**Gate preparation:** `COMPLETE / CTO ACCEPTED`
**Persistence/migration design authority:** granted
**Functional implementation authority:** granted for IMP-03A only
**Migration execution authority:** granted for schema version 8 only
**Baseline implementation commit:** `1de54343f25c3f43d3194ebd4942e9f34b310aa7`
**Current shared schema version:** `7`
**Proposed target schema version:** `8`
**Scope:** IMP-03A implementation; no legacy SQLite preservation, import or backfill.

## Accepted operational decomposition

```text
IMP-03A = REQ-05 Integration boundary
IMP-03B = REQ-06 Memory boundary
```

IMP-03A consumes Connector/MCP definition boundaries, Tenant-scoped Connection,
opaque Credential references, Channel identity/history and bounded ingress
reference/Evidence semantics. IMP-03B, IMP-04 and later milestones remain out
of scope and unauthorized.

## CTO legacy-data policy

```text
Environment: DEVELOPMENT / PRE-PRODUCTION
Legacy SQLite data: DISPOSABLE
Legacy preservation/import/backfill: NOT REQUIRED
Historical compatibility with development SQLite data: NOT REQUIRED
PostgreSQL schema migration: 7 -> 8 AUTHORIZED
Development state reset/recreation: PERMITTED when required for validation
```

No implementation mechanism may map, import, read-through, preserve or derive
canonical provenance from `SqliteSecretCatalog.credential_connections`.
Architecture remains production-grade: Tenant isolation, authority boundaries,
secret safety, historical semantics, CAS, idempotency and canonical contracts
remain mandatory.

## Final ADR dispositions

| ADR | Decision |
| --- | --- |
| `ADR-17-014` | `ALREADY DECIDED` — Tool/Skill/MCP governed definitions remain REQ-04 resources. An MCP definition is not endpoint, Connection, Credential, lease or authority. |
| `ADR-17-016` | `ACCEPTED FOR PERSISTENCE DESIGN` — Connector is a projection/discriminator over Provider, Tool or MCP definition unless a later demonstrated reusable definition requires a separate owner. No `connectors` table is proposed. |
| `ADR-17-017` | `ACCEPTED FOR PERSISTENCE DESIGN` — Connection is the canonical Tenant-scoped configured integration instance with immutable revisions. It references a credential; it never owns credential material or a lease. |
| `ADR-17-018` | `ACCEPTED FOR PERSISTENCE DESIGN` — Channel is a separate canonical Tenant-scoped interaction-endpoint identity with immutable revisions and an exact Connection revision reference. It is not Connection, Credential, Provider, executor, Run, Activation or authority. |
| `ADR-17-019` | `ACCEPTED FOR PERSISTENCE DESIGN` — authority decisions, opaque secret references, lease purpose and exact refs/fingerprints are serializable provenance. Secret values and leases remain external and ephemeral. |

These decisions close the ADR design questions only. They do not authorize the
functional code, migration execution, external provider access or ingress
activation.

## Contract-delta dispositions

| Delta | Final design disposition |
| --- | --- |
| `E17-R05-CD01` | Connector projection/discriminator; no Connector table. |
| `E17-R05-CD02` | Tenant-scoped, versioned Connection relation to governed definition. |
| `E17-R05-CD03` | Opaque credential ref/version/purpose only; no credential material or lease value. |
| `E17-R05-CD04` | Versioned Channel identity with endpoint/source/policy references. |
| `E17-R05-CD05` | Operation authority is evaluated at the existing governance boundary and recorded as provenance. |
| `E17-R05-CD06` | Exact immutable Connection/Channel revision/fingerprint or typed unavailable history. |
| `E17-R05-CD07` | Ingress Evidence/correlation belongs to IMP-03A; durable occurrence idempotency/admission remains IMP-06. |

## Existing persistence inventory and insufficiency

| Existing surface | Current representation | Why it cannot be the IMP-03A canonical durable model |
| --- | --- | --- |
| `SqliteSecretCatalog.credential_connections` | local SQLite `id`, optional `tenant_id`, opaque JSON payload | no immutable revisions, fingerprint, lifecycle head/CAS, canonical Event/outbox transaction, shared PostgreSQL semantics or exact historical reconstruction. |
| `CredentialConnection` | in-memory/SQLite DTO with provider ID, status, optional `secretRef`, metadata and timestamps | combines Connection and credential metadata; no versioned definition relation or immutable history. |
| `SecretStore` / `SecretReference` | secret owner and opaque reference/version | correct secret owner, but intentionally not Connection/Channel configuration persistence. |
| `acs_secret_metadata` | PostgreSQL metadata projection | secret metadata only; it cannot own configured integration state, Channel lifecycle or endpoint semantics. |
| `acs_native_events`, `acs_native_outbox`, `acs_native_idempotency` | shared Event/outbox/idempotency owners | must be reused to record commands; Events are not a substitute for Connection/Channel heads and immutable revisions. |
| `RuntimeExecutionIntentV2` JSON | admitted immutable snapshot path | consumes exact Connection/Channel refs after admission; it is not a mutable configuration catalog or Channel owner. |
| Trinity intake protocols | source/request vocabulary | an untrusted-source boundary only; no Channel identity/history or authorization. |

Legacy SQLite Connection data is disposable and removed from scope. The new
PostgreSQL Integration repository becomes the only canonical owner when its
functional command path is enabled. There is no SQLite adapter, read-through,
import pipeline, provenance mapping, backfill or dual canonical write.

## Proposed canonical durable model

### Connection

| Property | Proposed representation |
| --- | --- |
| Canonical owner | Integration domain, backed by the shared PostgreSQL Native Core transaction. |
| Stable identity | `connection_id`. |
| Tenant ownership | non-null `tenant_id`, FK to `acs_tenants`; all command/read paths carry this Tenant. |
| Definition relation | `definition_kind`, `definition_id`, optional exact `definition_revision` and `definition_fingerprint`; no Connector aggregate is created. |
| Configuration | secret-free `configuration_metadata` plus `configuration_fingerprint`; schema validation later constrains allowed keys. |
| Credential relation | `credential_ref_id`, backend, permitted key version and purpose only; nullable for connection types that do not require credentials. |
| Lifecycle/head | `current_revision`, `lifecycle_status`, `current_fingerprint` in head; immutable revision rows retain historic lifecycle. |
| CAS | update head where `current_revision = expected_revision`; conflict returns typed error. |
| Idempotency | existing `acs_native_idempotency`, scope `integration-connection:<connection_id>`. |
| Event/outbox | one canonical Event and outbox record in the same PostgreSQL transaction as head/revision mutation. |
| Historical reconstruction | resolve exact `(connection_id, revision, fingerprint)` from revision table; never load current head or secret value. |
| Retention/deletion | ordinary physical delete unavailable; revoke/disable is a new revision. Legal retention is out of scope. |

### Channel

| Property | Proposed representation |
| --- | --- |
| Canonical owner | Integration domain, separate from Connection. |
| Stable identity | `channel_id`. |
| Tenant ownership | non-null `tenant_id`, FK to `acs_tenants`; must equal referenced Connection revision Tenant. |
| Connection relation | exact `connection_id`, `connection_revision`, `connection_fingerprint` on each immutable Channel revision. |
| Interaction semantics | `direction`, `endpoint_kind`, `source_identity`, secret-free endpoint metadata, `admission_policy_ref` where applicable. |
| Lifecycle/head | `current_revision`, `lifecycle_status`, `current_fingerprint` in head; draft/active/disabled/revoked are configuration lifecycle, not delivery health. |
| CAS | update head where `current_revision = expected_revision`; conflict returns typed error. |
| Idempotency | existing `acs_native_idempotency`, scope `integration-channel:<channel_id>`. |
| Event/outbox | one canonical Event/outbox record with Channel subject; ingress Evidence is separate. |
| Historical reconstruction | resolve exact Channel revision, then exact referenced Connection revision/fingerprint; never use current Channel or Connection. |
| Retention/deletion | revoke/disable through immutable revision; no ordinary physical delete. |

## Proposed PostgreSQL schema delta — version 8

```sql
-- Authorized only for EPIC-17-IMP-03A schema version 8.
-- SHARED_STATE_SCHEMA_VERSION: 7 -> 8

CREATE TABLE acs_integration_connections (
  connection_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
  current_revision INTEGER NOT NULL CHECK (current_revision > 0),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN
    ('draft', 'configured', 'active', 'degraded', 'disabled', 'revoked', 'expired')),
  current_fingerprint TEXT NOT NULL,
  definition_kind TEXT NOT NULL CHECK (definition_kind IN
    ('model_provider', 'tool', 'mcp', 'connector_projection')),
  definition_id TEXT NOT NULL,
  definition_revision INTEGER,
  definition_fingerprint TEXT,
  credential_ref_id TEXT,
  credential_backend TEXT,
  credential_key_version TEXT,
  credential_purpose TEXT,
  configuration_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (connection_id, tenant_id),
  UNIQUE (connection_id, current_fingerprint),
  CHECK ((credential_ref_id IS NULL AND credential_backend IS NULL
    AND credential_key_version IS NULL AND credential_purpose IS NULL)
    OR (credential_ref_id IS NOT NULL AND credential_backend IS NOT NULL
      AND credential_purpose IS NOT NULL))
);

CREATE INDEX acs_integration_connections_tenant_idx
  ON acs_integration_connections (tenant_id, lifecycle_status, connection_id);
CREATE INDEX acs_integration_connections_definition_idx
  ON acs_integration_connections (tenant_id, definition_kind, definition_id);

CREATE TABLE acs_integration_connection_revisions (
  connection_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  fingerprint TEXT NOT NULL,
  supersedes_revision INTEGER,
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN
    ('draft', 'configured', 'active', 'degraded', 'disabled', 'revoked', 'expired')),
  definition_kind TEXT NOT NULL CHECK (definition_kind IN
    ('model_provider', 'tool', 'mcp', 'connector_projection')),
  definition_id TEXT NOT NULL,
  definition_revision INTEGER,
  definition_fingerprint TEXT,
  credential_ref_id TEXT,
  credential_backend TEXT,
  credential_key_version TEXT,
  credential_purpose TEXT,
  configuration_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_by TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  change_reason TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  PRIMARY KEY (connection_id, revision),
  UNIQUE (connection_id, fingerprint),
  UNIQUE (connection_id, tenant_id, revision),
  UNIQUE (connection_id, tenant_id, revision, fingerprint),
  FOREIGN KEY (connection_id, tenant_id)
    REFERENCES acs_integration_connections(connection_id, tenant_id),
  CHECK ((revision = 1 AND supersedes_revision IS NULL)
    OR (revision > 1 AND supersedes_revision = revision - 1)),
  CHECK ((credential_ref_id IS NULL AND credential_backend IS NULL
    AND credential_key_version IS NULL AND credential_purpose IS NULL)
    OR (credential_ref_id IS NOT NULL AND credential_backend IS NOT NULL
      AND credential_purpose IS NOT NULL))
);

CREATE INDEX acs_integration_connection_revisions_tenant_idx
  ON acs_integration_connection_revisions (tenant_id, connection_id, revision);

CREATE TABLE acs_integration_channels (
  channel_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
  current_revision INTEGER NOT NULL CHECK (current_revision > 0),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN
    ('draft', 'active', 'disabled', 'revoked')),
  current_fingerprint TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  connection_revision INTEGER NOT NULL,
  connection_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (channel_id, tenant_id),
  UNIQUE (channel_id, current_fingerprint),
  FOREIGN KEY (connection_id, tenant_id, connection_revision, connection_fingerprint)
    REFERENCES acs_integration_connection_revisions(connection_id, tenant_id, revision, fingerprint)
);

CREATE INDEX acs_integration_channels_tenant_idx
  ON acs_integration_channels (tenant_id, lifecycle_status, channel_id);
CREATE INDEX acs_integration_channels_connection_idx
  ON acs_integration_channels (tenant_id, connection_id, channel_id);

CREATE TABLE acs_integration_channel_revisions (
  channel_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  fingerprint TEXT NOT NULL,
  supersedes_revision INTEGER,
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN
    ('draft', 'active', 'disabled', 'revoked')),
  connection_id TEXT NOT NULL,
  connection_revision INTEGER NOT NULL,
  connection_fingerprint TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('ingress', 'egress', 'bidirectional')),
  endpoint_kind TEXT NOT NULL,
  source_identity TEXT NOT NULL,
  admission_policy_ref TEXT,
  endpoint_fingerprint TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_by TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  change_reason TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  PRIMARY KEY (channel_id, revision),
  UNIQUE (channel_id, fingerprint),
  FOREIGN KEY (channel_id, tenant_id)
    REFERENCES acs_integration_channels(channel_id, tenant_id),
  FOREIGN KEY (connection_id, tenant_id, connection_revision, connection_fingerprint)
    REFERENCES acs_integration_connection_revisions(connection_id, tenant_id, revision, fingerprint),
  CHECK ((revision = 1 AND supersedes_revision IS NULL)
    OR (revision > 1 AND supersedes_revision = revision - 1))
);

CREATE INDEX acs_integration_channel_revisions_tenant_idx
  ON acs_integration_channel_revisions (tenant_id, channel_id, revision);
CREATE INDEX acs_integration_channel_revisions_source_idx
  ON acs_integration_channel_revisions (tenant_id, endpoint_kind, source_identity)
  WHERE lifecycle_status = 'active';
```

`payload` is a typed, secret-free document, not an escape hatch. Functional
implementation must validate it with an allowlist and reject known secret keys
before persistence, Event creation, Evidence creation and Product API output.
The SQL constraints prevent missing paired reference metadata but cannot by
themselves detect all secret-shaped JSON; the application contract is required.

The functional contract must also reject endpoint URIs with user-info and any
query/header/value field carrying credentials, signed URLs, bearer material or
callback secrets. `source_identity` is a normalized non-secret identifier;
`endpoint_fingerprint` is computed from the validated, secret-free endpoint
configuration. A repository transaction must verify that every head's
`current_revision` and `current_fingerprint` equal the immutable row committed
in that same transaction.

## Events, outbox, evidence and ingress

Connection/Channel create, revise, disable and revoke commands use the existing
shared transaction pattern:

```text
CAS head update + immutable revision insert
  + canonical Event in acs_native_events
  + outbox row in acs_native_outbox
  + existing idempotency result
  = one transaction
```

Event payloads contain IDs, revisions, fingerprints, lifecycle status, authority
decision refs and correlation/causation IDs. They contain no endpoint secret,
credential material, callback secret or lease value.

IMP-03A ingress is bounded as follows:

```text
untrusted external event
  -> provider/channel authentication
  -> Tenant resolution
  -> Channel + exact Connection revision validation
  -> bounded ingress reference
  -> Evidence/correlation
  -> future admission boundary
```

No path from callback to Run, Activation, assignment or executor is authorized.
Replay-resistant authentication and source-identity validation are contract
requirements. Durable occurrence claim, payload conflict and admission
idempotency remain `IMP-06`.

## Historical, Tenant and secret-safety analysis

- Connection and Channel history is resolved by `(id, revision, fingerprint)`.
  Missing exact data returns a typed unavailable result; current-head fallback
  is prohibited.
- Channel revision references the exact Connection revision under the same
  `tenant_id`; the composite FK prevents cross-Tenant substitution.
- Connection definition references are evidence/configuration references, not
  authority grants. Operation permission remains a current governance decision.
- `credential_ref_id`, backend, permitted key version and purpose are allowed.
  Passwords, private keys, API tokens, OAuth tokens, session tokens, callback
  secrets and lease values are prohibited in all four tables, Events, Evidence,
  snapshots and Product API responses.
- Secret rotation/revocation does not rewrite a Connection or Channel revision.
  Historical reads retain the opaque reference/version provenance and never
  resolve secret material.

## Migration and compatibility plan

| Concern | Design |
| --- | --- |
| Current/target schema | `7` to proposed `8`, registered through `SHARED_STATE_MIGRATIONS`. |
| Forward migration | one transactional additive migration: create four tables, constraints and indexes. No alteration or deletion of current tables. |
| Bootstrap | new databases apply migrations 1–8 in order. Existing schema-7 databases apply version 8 once under existing advisory migration lock. |
| Existing data | disposable development SQLite data is ignored. |
| Backfill | `NO`; legacy import is removed from scope. |
| Compatibility during migration | schema addition is deploy-compatible; no active reader/writer changes until functional GO. |
| Old code/new schema | compatible: old code ignores additive tables and continues its existing behavior. |
| New code/old schema | incompatible by design: new functional Integration repository must refuse startup/command execution if schema version is below 8. It must use a non-migrating schema check. |
| Cutover | functional deployment enables one canonical PostgreSQL Connection/Channel command path; no SQLite compatibility path exists. |
| Rollback | before command exposure, deploy prior code or reset disposable development state. After a command writes canonical v8 state, stop affected mutations and roll forward; do not route writes to SQLite. |
| Failure atomicity | migration runs inside existing PostgreSQL transaction; command writes use one shared transaction. Failed migration/command rolls back fully. |
| Deployment ordering | run the authorized migration runner, verify schema/constraints, deploy repository disabled by feature boundary, run shadow/read verification, authorize command exposure separately. The normal shared-context bootstrap currently calls `migrate()` unless `migrate: false`; functional implementation must not rely on that default for v8 rollout. |

The functional change must provide a separately governed migration-runner entry
point and construct service/runtime contexts with `migrate: false` during
normal startup. Startup then reads `schemaVersion()` and fails closed when the
required version is absent. This prevents a newly deployed application binary
from applying schema v8 as an incidental side effect.

## PostgreSQL acceptance and migration-specific tests

`npm run acceptance:postgres` is mandatory after functional/migration authority.
The acceptance expansion must prove:

1. clean install reaches schema version 8;
2. upgrade from schema 7 applies only version 8 once;
3. migration failure leaves no partial tables/version row;
4. old-code/new-schema compatibility and new-code/old-schema fail-closed check;
5. same-Tenant Connection/Channel create/revise CAS and idempotent replay;
6. cross-Tenant connection/channel reference rejection by query and repository;
7. immutable reconstruction after current Connection/Channel mutation;
8. secret-shaped payload rejection and redaction in Event/Evidence/API paths;
9. secret rotation/revocation without rewriting historical revisions;
10. Event/outbox/idempotency atomicity and restart recovery;
11. authenticated ingress reference/Evidence correlation with no Run creation;
12. listener-capable validation for ingress-facing HTTP/process cases.

## Technical review disposition

| Finding | Severity | Resolution incorporated in this design |
| --- | --- | --- |
| Exact Connection fingerprint was not enforced by the proposed Channel FK. | `MUST FIX` | Channel head and revision FKs now reference `(connection_id, tenant_id, revision, fingerprint)`; a Channel cannot bind a mismatched fingerprint. |
| Connection/Channel revision rows did not enforce the same Tenant as their heads. | `MUST FIX` | Composite unique keys and composite FKs now bind each revision to its same-Tenant head. |
| Shared context defaults to `migrate()` and could apply v8 on normal startup. | `MUST FIX` | Migration runner and ordinary startup are explicitly separated; normal functional startup uses `migrate: false` plus a fail-closed schema-version check. |
| JSON payload could hide endpoint or secret material. | `MUST FIX` | The contract adds endpoint normalization and secret-key/value rejection before persistence, Event, Evidence and API projection. |
| Head/revision coherence cannot be fully expressed by static FKs. | `REQUIRED REPOSITORY INVARIANT` | The write transaction must verify head revision/fingerprint against the committed immutable row, with CAS and rollback tests. |

Docker unavailability remains an environment constraint only when reported by
the canonical acceptance harness; it cannot be converted to a silent skip.

## Files modified by Slice 1

| Surface | Likely file(s) |
| --- | --- |
| migration registration | `src/control-plane/shared-state/migrations.ts` — schema v8 and four additive tables. |
| durable repository | `src/control-plane/shared-state/native-core-durable.ts` — Connection/Channel CAS, idempotency, Event and outbox lineage. |
| shared state composition | `src/control-plane/shared-state/postgres-shared-state.ts` — transactional repository exposure. |
| Integration contracts | `src/native-core/integration.ts` and `src/native-core/index.ts`. |
| focused tests | `tests/epic-17-imp-03a-integration-foundation.test.mjs` and schema-version assertions. |

Credential compatibility, Product API and bounded ingress/Evidence remain later
authorized IMP-03A slices; no SQLite import, backfill or legacy read-through is
implemented.

## Risks and decisions carried into later authorized slices

| Risk / decision | Required action |
| --- | --- |
| Connector distinct definition need remains evidence-dependent | retain the accepted projection/discriminator unless later evidence requires a new owner. |
| Legacy SQLite Connection records | Removed from scope by CTO disposable-development-data policy. |
| Secret reference referential integrity | implement logical/validated reference integrity rather than a foreign key to a possibly external SecretStore. |
| Channel endpoint uniqueness | define final endpoint/source normalization before adding a broader uniqueness constraint; current index is a lookup aid, not an exclusivity claim. |
| Authority vocabulary | define exact governance operation names and typed error codes with the authority slice. |

```text
EPIC-17-IMP-03A
STATUS: AUTHORIZED / GO
Persistence design: CTO ACCEPTED
Functional implementation authority: GRANTED FOR IMP-03A ONLY
Migration execution authority: GRANTED FOR SCHEMA VERSION 8 ONLY
IMP-03B: NOT AUTHORIZED
IMP-04+: NOT AUTHORIZED
```
