# EPIC-17-IMP-03A — Implementation Gate Charter

## Identity and decision state

**Canonical milestone:** `EPIC-17-IMP-03A`  
**User-facing gate label:** `EPIC-17-IMP-03`  
**Title:** Integration Definition, Connection/Credential Projection and Channel Boundary  
**Status:** `CANDIDATE / PERSISTENCE DESIGN GATE`
**Gate preparation:** `COMPLETE / CTO ACCEPTED`
**Persistence/migration design authority:** granted
**Implementation authority:** none  
**Migration authority:** none  
**Baseline commit:** `cd8fed7c08c75b54b5aa290db73ed9d28bede535`

REQ-12 splits the candidate `IMP-03` window into two independent branches:
Integration (`IMP-03A`) and Memory (`IMP-03B`). This charter covers the
Integration branch only; it does not merge Memory work into this gate.

## CTO gate review disposition

The CTO accepted the `IMP-03A` / `IMP-03B` operational split, the REQ-05
ownership model, all seven contract-delta dispositions and the ADR
classification. Functional implementation remains blocked because the required
durable model needs a schema migration. The authorized next deliverable is the
[Persistence & Migration Design](imp-03-persistence-migration-design.md), not
migration execution or functional code.

## Canonical IMP-03 assignment from REQ-12

**Exact scope:** Connector/MCP definition boundary, Connection/Credential
projection, Channel identity/history, and ingress reference semantics.  
**Source:** [REQ-12 candidate IMP dependency plan](../req-12/candidate-imp-dependency-plan.md),
row `EPIC-17-IMP-03A`; [REQ-12 delta and ADR plan](../req-12/contract-delta-and-adr-plan.md),
row `IMP-03A`.  
**Dependencies:** `IMP-02 COMPLETE / CTO ACCEPTED`; accepted REQ-03, REQ-04,
REQ-05; existing Native Agent seam, shared-state transaction, Events/outbox,
idempotency and Tenant governance.  
**Primary REQs consumed:** `REQ-05`; `REQ-03` and `REQ-04` only for accepted
reference, snapshot and governed-definition conventions.

REQ-12 requires definition, configured instance, secret and Channel to remain
separate; credentials to remain opaque; and Tenant and historical tests to
pass. `IMP-03B` owns Memory Policy/store/reference, consent, retention,
deletion and Memory provenance, therefore remains outside this charter.

## REQ-12 intent versus current implementation

| Intended item | Classification | Reconciliation |
| --- | --- | --- |
| Native Agent seam, CAS, idempotency, Events/outbox | `ALREADY SATISFIED BY IMP-01` | Accepted reusable dependency. |
| Effective configuration, Tenant-bound immutable snapshot, reconstruction | `ALREADY SATISFIED BY IMP-02` | Existing execution-snapshot conventions are mandatory. |
| Governed Skill/Tool/MCP definition references | `PARTIALLY IMPLEMENTED` | `AgentRevisionV2.resources.mcp_server_refs` and IMP-02 observations exist, but no general MCP definition/Connection model does. |
| Provider/model observations and historical API snapshot projection | `ALREADY SATISFIED BY IMP-02` | Reusable evidence only; they do not become Connector or Channel authority. |
| Connector projection/definition discriminator | `NOT IMPLEMENTED` | Current `ModelProvider` and Tool/MCP definitions can be projected, but no distinct Connector definition is proven. |
| Connection relation to definition and Tenant | `PARTIALLY IMPLEMENTED` | `CredentialConnection` has provider, Tenant owner and opaque `secretRef`, but combines concepts and has no canonical durable lineage. |
| Opaque secret version and lease-purpose snapshot refs | `PARTIALLY IMPLEMENTED` | `SecretStore`, `SecretReference`, `CredentialLease` exist; admitted historical binding is incomplete. |
| Channel identity, lifecycle, history, ingress reference | `NOT IMPLEMENTED` | Trinity source vocabulary is only an intake boundary; no canonical Channel owner/repository/history exists. |
| MCP endpoint/configuration/Connection/Credential | `DEFERRED BY ARCHITECTURE` in IMP-02; `NOT IMPLEMENTED` now | The deferred REQ-05 scope is consumed by canonical IMP-03A subject to gates below. |
| Channel occurrence claims, deduplication and execution admission | `OUTSIDE IMP-03A` | This milestone may create an authenticated, policy-evaluated ingress reference/Evidence. Activation and admission belong to IMP-06. |
| Memory, Delegation, Automation, broad Administration and Control Plane | `OUTSIDE IMP-03A` | Canonical future owners are IMP-03B through IMP-09. |

## Dependency reconciliation

| Dependency | State | Conclusion |
| --- | --- | --- |
| `EPIC-17-IMP-01` | `COMPLETE / CTO ACCEPTED` | Satisfied. |
| `EPIC-17-IMP-02` | `COMPLETE / CTO ACCEPTED` | Satisfied by the CTO disposition supplied for this gate; old pending wording is reconciled in the index. |
| Native Agent seam; CAS; idempotency; Events/outbox | available | Reuse; do not create parallel owners. |
| Effective configuration, immutable snapshots, historical reconstruction | available | Reuse exact ref/observation conventions or return typed unavailable. |
| Product API historical projections | available | Extend the single application boundary only. |
| PostgreSQL acceptance harness | available | Mandatory for durable Integration state. |
| Listener-capable regression environment | available | Mandatory for ingress/listener evidence. |

No technical dependency is missing for chartering. The outstanding go conditions
are decisions: ADR closure, approved durable design and migration authority.

## Current-state discovery and canonical ownership

| Concept | Current owner and representation | Persistence/mutation/read | Authority and history | Tenant boundary | Target owner and gap |
| --- | --- | --- | --- | --- | --- |
| Provider integration definition | `ModelProvider` / `ModelProviderRegistry` | registry and Product API provider summary | health/capability is availability evidence, not permission | definitions may be shared; operations Tenant-scoped | Reuse as Connector projection if sufficient; prove a distinct Connector before creating one. |
| Tool/MCP governed definition | `AgentRevisionV2` refs; `RedHatMcpAdapter` planning boundary | Agent revision and IMP-02 observations | definition ref is not endpoint, configured instance, credential or grant | Agent snapshot is Tenant-bound | Preserve existing Tool/MCP ownership; add only a required discriminator/adapter. |
| Configured Connection | `CredentialConnection` / registry | in-memory or SQLite vault adapter; Product API credential routes | combines configuration and credential metadata; no exact shared durable lineage | `owner.tenantId`, `getForScope` | Keep one Connection owner; create semantic projection/history without duplicate store. |
| Credential/secret | `SecretStore`, `SecretReference`, `CredentialLease` | Secret backend owns values | purpose/Tenant checks, rotation and revocation exist; value stays external | SecretStore checks `tenantId` | Reuse exactly; snapshots only store opaque ref/version/purpose. |
| Channel | Trinity intake vocabulary/protocol | no canonical durable representation | source is not Channel identity; no lifecycle/history | absent | New Tenant-scoped Channel capability and durable repository required. |
| Ingress | Trinity protocols | protocol/test boundary | direct execution blocked; no domain correlation | must fail closed | Authenticated ingress reference and Evidence only; no Activation implementation. |
| Product API | `routeProductApiRequest`, `ProductApiClient` | single app boundary | credential reads redact material; no Channel contracts | auth/membership checks exist | Extend this API only; no parallel Integration API. |
| Governance | Tenant governance enforcer | existing control-plane governance | availability/reference never grants authority | current Tenant scope | Evaluate Connector/Connection/Channel operations server-side. |
| Events/Evidence | `AsyncNativeCoreRepository`; Event/outbox; Evidence store | existing shared PostgreSQL path | Event is domain transition; Evidence is observation | existing correlation supports Tenant envelope | Reuse both, preserving separate ownership. |

## Authority, Tenant and historical model

| Concern | Canonical meaning | Required boundary |
| --- | --- | --- |
| Definition | governed provider, Tool or MCP metadata/capability schema | never grants use. |
| Configuration | Tenant-scoped Connection or Channel endpoint | never grants authority. |
| Availability | health, reachability or delivery observation | does not rewrite history or grant authority. |
| Support evidence | validation/delivery/authentication observation | Evidence does not own the domain. |
| Authority grant | current Tenant governance decision for one operation | explicit, auditable and fail-closed. |
| Credential | opaque SecretStore reference | material remains external. |
| Runtime lease | purpose-bound, short-lived resolution | non-persistent and non-transferable. |
| Execution permission | later Activation/admission decision | Channel cannot execute directly. |

Connector sharing never shares Connections, credentials, Channels or authority.
Cross-Tenant lookup, list/detail discovery, reference resolution and secret
access fail closed. Historical reconstruction reads exact immutable
Connection/Channel provenance and opaque secret ref/version/purpose; it never
reconnects, fetches current secrets, substitutes current configuration or
asserts past reachability from current health.

Canonical snapshots, Events, Evidence, Product API output, errors and logs must
never contain passwords, API tokens, OAuth access/refresh tokens, secret
material or lease values.

## Persistence analysis and migration gate

```text
Schema changes required: YES
Migration required: YES
New tables: YES — minimum Channel durable identity/history and Integration
                 relation metadata, subject to ADR-17-016 through ADR-17-019
Existing tables reused: acs_native_events, acs_native_outbox, existing
                        idempotency and Evidence storage
Existing JSON/document paths reused: RuntimeExecutionIntentV2 effective
                                      configuration / immutable observation path
New durable repository required: YES
```

This conclusion derives from the absence of a generic Channel owner or durable
history and REQ-05's Tenant-scoped exact-history requirement. Reusing the
local SQLite/in-memory `CredentialConnection` state as shared canonical durable
state would violate the existing PostgreSQL/single-authority constraints.

**STOP CONDITION:** no code may begin until the CTO approves the named owner,
minimal additive schema delta, migration/rollback plan and migration authority.
The plan must use expand/backfill/verify/cutover/observe/contract stages; must
not create a second database/event store/outbox/idempotency store; must not
persist secrets; and must not introduce dual canonical writes.

## Blocker reconciliation

| ID | Source REQ | Root cause/current state | Affected surface | Proposal and required evidence |
| --- | --- | --- | --- | --- |
| `E17-R05-B01` | REQ-05 | `CredentialConnection` combines Connection and credential metadata; still applicable | connection persistence/history | ADR-17-017, semantic projection, one owner, migration and exact-history evidence. |
| `E17-R05-B02` | REQ-05 | no generic Channel owner/contract/history; still applicable | Channel persistence | ADR-17-018, minimal PostgreSQL schema/repository, lifecycle/history/Tenant/rollback evidence. |
| `E17-R05-B03` | REQ-05/REQ-04 | MCP definition/Connection split absent; still applicable | MCP boundary | ADR-17-016, prove definition ref remains separate from endpoint/config/credential. |
| `E17-R05-B04` | REQ-05 | exact Connection/secret-version reconstruction unproven; still applicable | snapshots/history | ADR-17-017/019, mutate-current-state reconstruction proof. |
| `E17-R05-B05` | REQ-05 | ingress idempotency/admission/Evidence absent; partially applicable | ingress | IMP-03A supplies authentication/reference/Evidence; durable occurrence claim remains IMP-06. |
| `E17-R10-B04` | REQ-10 | Connector/Channel contracts absent; still applicable | product projection | domain foundation here; broad Product API/Admin closure remains IMP-07. |

No blocker is declared resolved by this charter.

## Contract deltas and ADR candidates

| Delta | Disposition | Contract target and validation |
| --- | --- | --- |
| `E17-R05-CD01` | `IMPLEMENT IN IMP-03A` | versioned Connector projection/discriminator; distinct definition only with proof; test projection and unavailable source. |
| `E17-R05-CD02` | `IMPLEMENT IN IMP-03A` | explicit Tenant Connection-to-definition relation; test isolation, migration and history. |
| `E17-R05-CD03` | `IMPLEMENT IN IMP-03A` | opaque secret ref/version/lease-purpose snapshot refs; test redaction, rotation/revocation and reconstruction. |
| `E17-R05-CD04` | `IMPLEMENT IN IMP-03A` | Channel identity, endpoint metadata, direction, source identity and policy ref; test lifecycle and forged refs. |
| `E17-R05-CD05` | `IMPLEMENT IN IMP-03A` | operation authority decision ref; test deny/stale/revoked behavior. |
| `E17-R05-CD06` | `IMPLEMENT IN IMP-03A` | immutable provenance or typed unavailable history gap; test current-state mutation. |
| `E17-R05-CD07` | `SPLIT` | Evidence/correlation here; durable activation occurrence idempotency remains IMP-06. |

| ADR | Disposition | Decision required |
| --- | --- | --- |
| `ADR-17-016` | `REQUIRED BEFORE IMPLEMENTATION` | Connector projection/discriminator versus proven distinct reusable definition. |
| `ADR-17-017` | `REQUIRED BEFORE IMPLEMENTATION` | Connection/Credential separation, history strategy and migration owner. |
| `ADR-17-018` | `REQUIRED BEFORE IMPLEMENTATION` | Channel contract/repository/lifecycle/history and IMP-06 activation boundary. |
| `ADR-17-019` | `REQUIRED BEFORE IMPLEMENTATION` | operation authority and secret-safe snapshot/reference contract. |
| `ADR-17-014` | `ALREADY DECIDED` | IMP-02 retains governed Skill/Tool/MCP definition semantics; this charter consumes only REQ-05 endpoint/configuration work. |

## Planned functional slices after migration authorization and CTO GO

| Slice | Scope and dependencies | Blockers/deltas/ADRs | Surfaces, acceptance and rollback |
| --- | --- | --- | --- |
| 1. Contract decisions | close ADR-016–019; define refs, projection/discriminator and typed errors | B01–B04; CD01–CD06 | domain contracts, governance adapters, docs/tests. Rollback disables unexposed contracts. |
| 2. Durable state | approved PostgreSQL schema/repository, CAS/idempotency, Events/outbox and exact history | B01–B04; CD02–CD06 | persistence/migration/PostgreSQL tests. Rollback stops mutation and rolls forward without dual authority. |
| 3. Secret-safe binding/ingress ref | opaque ref/version/purpose, redaction, authorization, authenticated ingress reference and Evidence correlation | B03–B05; CD03/CD05/CD07 | SecretStore/CredentialProvider, snapshot adapter, Evidence/listener tests. Rollback revokes/rotates via SecretStore and disables ingress. |
| 4. API and closure | Product API projections/commands/history, compatibility, full conformance | CD01–CD07 | Product API/tests/docs. Rollback restores prior projection only; durable state/evidence remains. |

Administration composition and Control Plane screens are excluded: their
canonical milestones are IMP-07 and IMP-09.

## Planned surfaces

| Category | Expected surface |
| --- | --- |
| Domain | Integration discriminator/projection, Connection semantic projection, Channel contract and typed errors. |
| Repository/Persistence | approved PostgreSQL durable repository and additive migration only. |
| Product API/Compatibility | existing Product API routes/client and bounded `CredentialConnection` adapter. |
| Runtime/Admission | immutable reference binding only; no Activation, Run or executor redesign. |
| Governance | existing Tenant governance operation authorization. |
| Events/Evidence | canonical transition Events/outbox and separate ingress/delivery Evidence correlation. |
| Administration/Control Plane | no UI; only API composition necessary for compatibility tests. |
| Tests/Documentation | contract, API, PostgreSQL, listener, recovery and closure artifacts. |

## Security review

The implementation must prove Tenant isolation and non-disclosure, forged
reference rejection, server-side authority evaluation, no availability-to-
authority escalation, stale/revoked authority denial, secret non-persistence,
redaction in API/errors/logs, scoped lease purpose/expiry, idempotent durable
mutation, immutable historical reconstruction, Event/Evidence correlation and
no direct Channel execution. Provider callback/ingress authenticity and
confused-deputy paths are in scope. Client-visible action availability and
Channel metadata never grant authority.

## Test plan

1. Domain contracts and canonical serialization for all refs/discriminators.
2. Tenant isolation for create/read/list/history/resolve and secret access.
3. Authority allow/deny, stale/revoked decision and forged-reference cases.
4. CAS and idempotent replay/conflict for every durable mutation.
5. Canonical Event/outbox and separate Evidence/correlation assertions.
6. Redaction and negative scans for token/password/OAuth/lease material.
7. Mutate current Connection/Channel state after admission, reconstruct and
   prove the old binding is unchanged.
8. Rotate/revoke a secret and prove reconstruction neither fetches current
   material nor leaks it; return typed unavailable/redacted behavior as needed.
9. Product API authorization, Tenant filtering, history, typed errors and
   compatibility.
10. `npm run acceptance:postgres`: clean install, upgrade, restart, transaction
    rollback, outbox recovery, idempotency and Tenant isolation.
11. Listener-capable authenticated ingress/regression; restricted sandbox
    `listen EPERM` is environmental only after listener-boundary proof.
12. Full canonical regression with causal final closure `A = 0`, `D = 0`.

## Non-goals

- IMP-03B Memory policy/store/content, consent and deletion;
- Delegation, Automation, Activation, schedule recovery, occurrence claim and
  execution admission (IMP-04 through IMP-06);
- broad Product API/Admin and Control Plane work (IMP-07 and IMP-09);
- new Agent identity, Workforce model, Runtime architecture, Product API,
  event store, database, Genome economics, NFT, inheritance/mutation,
  marketplace/royalties or unrelated UI redesign;
- provider adoption, production credential access, external execution and
  rollout authority.

## Acceptance criteria

1. One canonical owner exists for each implemented Integration concept.
2. Definition, configuration, availability, Evidence, authority, credential,
   lease and execution permission remain separate.
3. Connector/MCP definition references do not become endpoint, Connection,
   credential or authority objects.
4. Connection/Channel reads and mutations enforce Tenant isolation; cross-Tenant
   access fails closed.
5. Secret material is absent from durable state, snapshots, Events, Evidence,
   API output, errors and logs.
6. Opaque credential ref/version/purpose and lease rules are enforced.
7. Historical reconstruction remains deterministic after mutable state changes
   and never retrieves current secret material.
8. Durable mutation uses approved PostgreSQL/shared transaction, Event/outbox,
   idempotency and CAS patterns.
9. Channel ingress is authenticated, policy-evaluated, correlated as Evidence
   and cannot execute directly.
10. Product API remains the single application boundary with typed failures,
    authorization, Tenant filters and redaction.
11. Compatibility retains one canonical owner and no dual canonical write.
12. PostgreSQL acceptance passes for durable changes.
13. Listener-capable regression passes and residual classifications are
    `A = 0`, `D = 0`.
14. Full regression is green or every unrelated environmental failure is
    faithfully classified; no accepted architecture invariant is violated.

## CTO decisions required before functional authorization

1. Confirm `IMP-03A` as the Integration branch and retain `IMP-03B` as the
   separate, parallel Memory charter.
2. Approve or reject ADR-17-016 through ADR-17-019.
3. Approve the minimal durable PostgreSQL schema delta, migration owner and
   rollback/roll-forward plan; grant migration authority if approved.
4. Confirm the IMP-03A/IMP-06 boundary: authenticated ingress reference/Evidence
   here; Activation claim and execution admission in IMP-06.

```text
EPIC-17-IMP-03A
STATUS: CANDIDATE / PERSISTENCE DESIGN GATE
Gate preparation: COMPLETE / CTO ACCEPTED
Persistence/migration design authority: GRANTED
Functional implementation authority: NONE
Migration execution authority: NONE
```
