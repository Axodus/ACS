# EPIC-17-IMP-04 — Delegation Grant & Authority Boundary Gate Charter

**Status:** COMPLETE / CTO ACCEPTED
**Gate preparation:** COMPLETE / CTO ACCEPTED
**Implementation authority:** none
**Migration authority:** schema 9 -> 10 authorized for Slice 2 only
**Schema:** 10 / REQUIRED; physical design COMPLETE / CTO ACCEPTED

## Mission, scope and non-goals

Prepare the architecture gate for a Tenant-bound Delegation Grant from canonical Agent A to canonical Agent B:

~~~
Governance authority -> bounded Delegation Grant -> canonical Agent B
  -> existing admission boundary -> Run / Task / Assignment
~~~

The core invariant is authority(delegate) subset-of authority(delegator). Delegation is not Agent identity/revision, SubAgent, Workforce membership, capability definition, credential or secret ownership, Memory Policy, execution, admission, Run, Task, Assignment, Automation or Activation. This gate authorizes documentation only: no contract, functional code, schema, migration, persistence, runtime, admission, Product API or Event vocabulary changes.

## Current-state inventory and ownership

| Concern | Repository evidence | Classification and boundary |
| --- | --- | --- |
| Agent identity, revision and lifecycle | AgentDefinitionV2 and immutable AgentRevisionV2 in src/native-core/agent.ts; durable lineage/CAS in src/control-plane/shared-state/native-core-durable.ts | REUSE; endpoints remain canonical agent_id values and exact revisions are evaluated, never replaced. |
| Governance and Tenant | Agent authority/policy refs and evaluateTenantGovernanceAuthority in src/control-plane/tenant-governance.ts | REUSE; Governance owns authority. The current evaluator is administrative, so Agent-operation authority cannot be inferred from it. |
| Effective configuration and history | EffectiveConfigurationSnapshotV1 carries immutable refs, provenance and fingerprints in src/native-core/effective-configuration.ts | ADAPT; reuse deterministic snapshot/fingerprint conventions, never a universal permission resolver. |
| Runtime, Run, Task and Attempt | ExecutionContextV2, RunV2, TaskV2 and TaskAttemptV2 in src/native-core/runtime.ts | REUSE; future admission may consume an exact authority snapshot. Grant -> Run is prohibited. |
| Workforce and Assignment | Workforce, membership and coordination native contracts | REUSE; no Grant can change members, slots, revisions, CoordinationDecisionV2 or TaskAssignmentV2. |
| Capabilities, tools and models | Agent resource/capability refs and effective-configuration observations | ADAPT; references constrain a Grant but do not grant authority. |
| Connections, credentials and secrets | Integration opaque credential refs; CredentialConnectionRegistry, CredentialProvider.resolve, CredentialLease and SecretStore | REUSE; Grant supplies bounded opaque reference/purpose only, never material or lease ownership. |
| Memory | Memory Policy lineage in src/native-core/memory.ts and GovernedMemoryService | REUSE; Grant bounds a request and cannot bypass exact Policy or expose user_context. |
| Evidence, Event, outbox and idempotency | EventEnvelopeV2, Evidence and atomic durable commands/outbox in native-core-durable.ts | ADAPT; reuse transaction, redaction and idempotency conventions. Current subject vocabulary lacks Delegation. |
| Product API | existing closed-domain routes and projections | REJECT in IMP-04; any read-only projection waits for separate authority. |
| Delegation | no native/control-plane Grant, resolver, chain/history or subject | NEW; gap classification only. |

## Delegation Grant semantic contract

The logical Grant requires a stable grant_id, immutable revision/fingerprint, Tenant and Scope, canonical delegator/delegate Agent refs, exact evaluated Agent revisions, authority/action/resource/capability/tool/model bounds, Connection/credential-purpose bounds, Memory scope/operation bounds, valid_from/expires_at, lifecycle/revocation state, onward/depth controls, parent/ancestry refs and governing authority/policy/approval/issuer/reason/Evidence provenance.

Every referenced authority remains with its canonical owner. The Grant excludes secrets, tokens, passwords, private keys, API keys, raw credentials, CredentialLease values and Memory content. Resource availability, bindings, capability requirements and Workforce membership never become authority grants.

## Grant identity and historical model

**Recommendation: stable Grant identity + immutable revisions + mutable CAS-protected head.** A bilateral revocable relationship needs stable identity for current lifecycle, revocation and replacement; immutable revisions preserve every issued authority term. The head selects current lifecycle/version but never rewrites history. Revocation is append-only lifecycle evidence correlated to grant and revision.

Historical admission reconstruction uses exact Grant and parent refs/fingerprints, evaluated Agent revisions, governing authority/policy/approval refs, resolver version, attenuation result/fingerprint, validity observation and admission decision. Current heads, policies and resource states cannot replace historical facts. A broadening replacement is a new authority request.

## Delegator authority proof, attenuation and composition

~~~
requested Grant
 -> exact delegator Agent revision and Tenant scope
 -> Governance authority and owner-specific policy/resource decisions
 -> exact parent chain where present
 -> dimensional intersection and fingerprint
 -> lifecycle, time and ancestry validation
 -> one explicit authority basis or typed rejection
~~~

Every dimension attenuates only. Missing/unavailable owner, unknown value, stale reference, empty intersection or expansion fails closed. For A -> B -> C, record each exact parent revision and prove authority(C) subset-of authority(B) subset-of authority(A) across Tenant, actions, capabilities, resources, tools, models, Connections, credential purpose, Memory scope/operation, validity interval, onward permission and depth.

One operation records one authority basis. Multiple Grants may support independent operations but cannot be unioned with sibling paths, Agent B unrelated authority, bindings or availability to synthesize authority.

## Tenant, ancestry, cycle and onward delegation

~~~
delegator.tenant_id = delegate.tenant_id = grant.tenant_id = referenced_authority.tenant_id
~~~

Cross-Tenant input fails before resolution. Store immutable parent exact ref and ordered ancestry digest/list. Depth is both stored for limits/query and derived from immutable parents as an integrity check. Direct delegation begins at depth 1. Reject A -> A, any repeated canonical Agent ID, missing or fingerprint-mismatched parent, absent onward authorization, exceeded depth and child expiry later than parent expiry. Onward delegation defaults to false; a parent with maximum depth 2 permits A -> B -> C and rejects C -> D.

## Expiry, revocation, admission and snapshot boundary

Expiry/revocation block issuance, new admission, re-admission and retries requiring a new authority decision. They never mutate historical admitted snapshots. A Run admitted at T1 remains reconstructable after Grant revocation at T2; a new admission at T3 fails. External Connection, credential, provider and resource owners may independently deny live use.

A future admission owner may consume exact Grant identity/revision/fingerprint, delegator/delegate, bounded authority, ancestry, governing refs and admission-time expiry through compatible authority-context and policy-snapshot seams. The snapshot excludes secret material and Memory content. Any required change to Workforce, WorkforceRevision, membership, Assignment, Run, Task, Attempt or admission ownership is BLOCKER + CTO ARCHITECTURE ESCALATION.

## Credential, Memory and Workforce decisions

Credential flow is Grant -> bounded opaque Connection/credential reference and purpose -> existing CredentialProvider.resolve(connectionId, purpose) -> CredentialLease. Credential and Secret owners keep material, lifecycle and revalidation.

Memory flow is Grant -> bounded scope/operation -> GovernedMemoryService -> exact Memory Policy revalidation -> Memory Store. Delegation is not Memory Policy and cannot make User Context Memory available; REQ-06 B03 remains open.

Workforce v1 is unchanged. A Grant cannot create membership, slots, revisions, Assignments or execution. Workforce eligibility and delegated authority are separate checks at current owners.

## B01–B07 reconciliation

| ID | Exact REQ-07 concern; evidence; owner | Gap and classification | Earliest slice | Acceptance evidence |
| --- | --- | --- | --- | --- |
| E17-R07-B01 | No canonical Grant/reference/durable history under native-core/control-plane; no owner | Grant identity/head/revision/history absent; NEW | 1, 2 | exact identity/revision/fingerprint and deterministic lookup |
| E17-R07-B02 | No typed authority-set/intersection resolver; effective config has generic provenance | Delegation proof absent; Governance/effective-config EXTEND | 1 | subset proof and typed denials for every expansion/unknown |
| E17-R07-B03 | No chain/depth/cycle contract; no owner | parent/ancestry/depth validation absent; NEW | 1 | self/cycle/depth/onward rejection and reconstruction |
| E17-R07-B04 | Revocation/expiry semantics for admission, retry and active work absent; Runtime owns transition/cancellation policy | lifecycle facts/admission integration absent; ADAPT | 3, 4 | new-admission denial, immutable snapshot, explicit active-work outcome |
| E17-R07-B05 | Event/Evidence lack Delegation subject and chain correlation; Event/Evidence/outbox own infrastructure | closed vocabulary lacks Grant; EXTEND | 2 | atomic redacted Event/Evidence/outbox and chain proof |
| E17-R07-B06 | legacy canSpawnSubAgents/subAgentScope can be mistaken for authority | active translation prohibited; REJECT | 1 | legacy metadata never creates or authorizes a Grant |
| E17-R07-B07 | no cross-Tenant Delegation contract; Tenant Governance owns boundary | existing fail-closed enforcement reusable; REUSE | 1 | all cross-Tenant refs and authority sources reject |

IMP-02, IMP-03A and IMP-03B provide seams only. They do not resolve Delegation semantics.

## CD01–CD10 reconciliation

| Delta | Current state -> target semantics | Owner | Classification | Dependency/persistence | Acceptance evidence |
| --- | --- | --- | --- | --- | --- |
| CD01 | no Grant identity/history -> stable identity, immutable revision, CAS head, Tenant endpoints | Delegation under Governance | NEW | 1 -> 2; schema 10 candidate | exact history/version/fingerprint |
| CD02 | generic refs -> typed action/resource/purpose/exclusion bounds | Governance and resource owners | NEW | 1 | no source-authority expansion |
| CD03 | generic provenance -> deterministic attenuation and fingerprint | Governance resolver | EXTEND | 1 | repeatable result and typed failures |
| CD04 | no parent chain -> immutable parent/ancestry/depth/onward/cycle rules | Delegation | NEW | 1 -> 2 | cycle/depth/parent mismatch rejection |
| CD05 | no lifecycle -> issued/active/expired/revoked/superseded facts | Delegation with Evidence | NEW | 2 -> 3 | lifecycle history without snapshot mutation |
| CD06 | generic runtime authority context -> exact Delegation admission/snapshot | admission/Runtime retains ownership | EXTEND | 4 | admission and snapshot reconstruction |
| CD07 | opaque credential and governed Memory owners -> bounded purpose/scope handoff | credential and Memory owners | ADAPT | 1 -> 4 | independent revalidation and no secret/content leak |
| CD08 | Event/outbox/Evidence lack Grant subject -> safe correlation vocabulary | Event/Evidence owners | EXTEND | 2 | atomic redacted facts |
| CD09 | legacy sub-Agent metadata -> non-authoritative compatibility | legacy seam | REJECT | 1 | cannot create identity or authority |
| CD10 | no Grant projection -> reserved redacted read model | Product API/Admin | REJECT in IMP-04 | later 5 and separate API GO | Tenant-safe metadata projection |

## ADR-17-025 through ADR-17-029

| ADR | Status | CTO review boundary |
| --- | --- | --- |
| ADR-17-025 Grant owner and physical representation | REQUIRED BEFORE FUNCTIONAL WORK | authority ownership and historical semantics |
| ADR-17-026 attenuation algorithm and explicit authority basis | REQUIRED BEFORE FUNCTIONAL WORK | admission authority semantics |
| ADR-17-027 depth, onward delegation and cycle prevention | REQUIRED BEFORE FUNCTIONAL WORK | authority and history |
| ADR-17-028 expiry/revocation with admission, retry and active Runs | REQUIRED BEFORE FUNCTIONAL WORK | Runtime/admission-owner agreement |
| ADR-17-029 legacy sub-Agent compatibility/deprecation | DECIDED | REQ-07 accepts non-authoritative metadata and no auto-Grant |

ADR-025 through ADR-028 require explicit CTO review. Any proposal affecting Agent identity, Workforce/admission semantics, credential ownership, Memory authority, Runtime authority, Tenant security or historical execution also requires CTO review.

## Persistence, Event and idempotency candidate

Schema 10 is required before durable Grant work but is not required or authorized by this gate. Schema 9 has no bilateral revocable authority owner. A future additive candidate needs Grant head, immutable revisions, append-only lifecycle/revocation facts, immutable parent/ancestry, Tenant-qualified idempotency and atomic Event/Evidence/outbox.

The candidate must define Tenant-aware PK/FK integrity, grant_id/revision uniqueness, CAS, valid-time/depth checks, parent-child Tenant equality, semantic request-hash conflict checks, historical model and transaction-time chain validation. Mutable-state traversal alone cannot prove historical ancestry.

Recommend future Event subject delegation_grant only when an authorized mutation slice extends the vocabulary. Candidate events are issued, revision_created, revoked and superseded. Payloads must contain only IDs, revision/fingerprint, redacted bounds fingerprint, lifecycle, parent/depth, decision/Evidence refs and correlation. They must never contain secrets, credential material or Memory content.

Idempotency scopes must be Tenant-qualified and aggregate-safe, such as delegation-grant:<tenant>:<grant>. Same key and semantic hash replays deterministically; same key with a changed semantic input is a typed conflict. Child creation binds the parent exact revision/fingerprint.

## Security failure matrix

| Failure | Required fail-closed result |
| --- | --- |
| cross-Tenant ref/source | TENANT_MISMATCH |
| self, cycle, absent/mismatched parent | INVALID_DELEGATION_CHAIN |
| depth exceeded/onward absent | DELEGATION_DEPTH_OR_ONWARD_DENIED |
| expired/revoked Grant or ancestor | GRANT_NOT_USABLE for new admission |
| authority/resource/credential/Memory expansion | AUTHORITY_ATTENUATION_DENIED |
| stale/unknown/unavailable owner or fingerprint mismatch | AUTHORITY_REFERENCE_UNRESOLVED |
| changed idempotent replay | IDEMPOTENCY_CONFLICT |

## Proposed functional slices and acceptance matrix

| Slice | Scope after separate authorization | Gate |
| --- | --- | --- |
| 1 | contracts, authority model, attenuation, ancestry, typed failures and ADR closure; no persistence | CTO functional GO and ADR-025–028 decisions |
| 2 | schema 10, durable Grant/CAS/lifecycle, Event/Evidence/outbox/idempotency | separate migration GO |
| 3 | issuance/replacement/revocation, proof, chain/depth and owner handoffs | durable boundary accepted |
| 4 | existing admission and immutable execution snapshot | admission/Runtime owner sign-off |
| 5 | read-only redacted Product API/Admin and conformance | separate Product API GO |

Future positive and negative acceptance covers Grant identity/history, Tenant isolation, delegator proof, every attenuation dimension, cross-Tenant/self/cycle/depth/onward rejection, expiry/revocation, historical reconstruction, credential/Memory bounds, Workforce non-interference, admission/snapshot behavior, idempotency, Event/outbox, typed failures and Product API redaction.

## Remaining CTO decisions and gate result

Slice 1 is complete and accepted in commit e6db696. Schema 10 physical design is complete and CTO accepted. Migration 9 -> 10 and Slice 2 durable Grant persistence are authorized. Admission integration, Runtime authority consumption, Product API, Workforce mutation, credential resolution and Memory access execution remain separately unauthorized.

**Gate result:** EPIC-17-IMP-04 — COMPLETE / CTO ACCEPTED. Slice 1 is COMPLETE / CTO ACCEPTED / PUBLISHED. Schema 10 physical design is COMPLETE / CTO ACCEPTED. Slice 2 and migration 9 -> 10 are AUTHORIZED / GO; later slices remain on hold.
