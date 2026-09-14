# EPIC-17-IMP-03B — Memory Policy & Memory Store Gate Charter

**Status:** `SLICE 1 / COMPLETE / CTO ACCEPTED / PUBLISHED; PHYSICAL DESIGN / COMPLETE / CTO ACCEPTED / PUBLISHED; ADR-023 / COMPLETE / CTO ACCEPTED / PUBLISHED; SLICE 2 / COMPLETE / CTO ACCEPTED / PUBLISHED; SLICE 3 / COMPLETE / CTO ACCEPTED / PUBLISHED; SLICE 4 / COMPLETE / CTO ACCEPTED / PUBLISHED; SLICE 5 / AUTHORIZED / GO`
**Gate preparation:** `COMPLETE / CTO ACCEPTED`
**Implementation authority:** Slice 5 Product API, Administration projection and cross-domain conformance only
**Migration authority:** schema 8 -> 9 consumed; no further schema change
**Predecessor:** IMP-03A `COMPLETE / CTO ACCEPTED / CLOSED`

## Canonical assignment

**Canonical IMP-03B assignment from REQ-12:** Memory Policy resolution and companion Memory record/store/reference contracts, consent, retention/deletion and provenance.

**Source:** [REQ-12 candidate IMP dependency plan](../req-12/candidate-imp-dependency-plan.md), `EPIC-17-IMP-03B` row; [REQ-06](../req-06/README.md).

**Dependencies:** REQ-01, REQ-03, REQ-06, REQ-10 and REQ-12; IMP-02 accepted. IMP-03A is closed and supplies compatible Tenant, immutable-reference, Event/outbox and PostgreSQL conventions.

**Primary REQs consumed:** `REQ-06`; `REQ-03` effective-configuration and historical-snapshot conventions. `REQ-10` projections remain reserved for its owning milestone.

| REQ-12 intended item | Current state | Classification |
| --- | --- | --- |
| Versioned, resolvable Memory Policy | `memory_policy_ref` exists on Agent revisions, but no policy owner or history exists | `NOT IMPLEMENTED` |
| Canonical Memory Store and Records | No Memory module, repository or durable record contract exists | `NOT IMPLEMENTED` |
| Exact Policy/result refs in historical execution | IMP-02 supplies a snapshot seam; Memory is `owner_required / unavailable` | `PARTIALLY IMPLEMENTED` |
| Tenant, fingerprint, CAS, Event/outbox conventions | Accepted through IMP-01/IMP-02 and exercised by IMP-03A | `ALREADY SATISFIED BY IMP-01/IMP-02` |
| Connection, Channel, secret-safe ingress | REQ-05 domain closed in IMP-03A | `OUTSIDE IMP-03B` |
| User-context Memory | Identity, consent and privacy-deletion authority are absent | `DEFERRED BY ARCHITECTURE` |
| Product API / Administration projection | REQ-10 reserves the application projection boundary | `OUTSIDE IMP-03B` |

## Boundary and non-goals

Memory is a companion domain. It is neither Agent/Workforce identity or revision, Runtime state, Run, Task, Attempt, Checkpoint, Knowledge, Evidence or Event. Memory content, scope, existence and retrieval do not grant capability, permission, credential access, delegation or execution authority.

Future implementation candidates are Working, Agent, Workforce Shared and Knowledge-backed Memory. User Context Memory is architecturally valid but blocked by `E17-R06-B03`. Persisted Working Memory remains companion data and cannot replace existing Run/Task/Attempt/Checkpoint owners; purely ephemeral Working Memory has no obligation to enter the durable Store.

Out of scope: new Agent/Workforce identity, SubAgent, Automation, Activation, delegation redesign, Run/Task replacement, Checkpoint replacement, Knowledge/Evidence replacement, vector database or generic RAG platform, Genome/NFT/economics, second database, parallel Product API/Event store, and any IMP-03A reopening.

## Dependencies

| Dependency | Status | Consequence |
| --- | --- | --- |
| IMP-01 | `COMPLETE / CTO ACCEPTED` | Native Agent seam supplies exact Agent identity/revision references. |
| IMP-02 | `COMPLETE / CTO ACCEPTED` | Effective configuration, immutable snapshots, Tenant binding and reconstruction conventions are reusable. |
| IMP-03A | `COMPLETE / CTO ACCEPTED / CLOSED` | Schema 8 and Integration subjects remain closed; they are not Memory owners. |
| Native CAS/idempotency and canonical Events/Evidence/outbox | Available | Reuse conventions only after a Memory domain is authorized. |
| PostgreSQL acceptance and listener-capable regression | Available | Required if their durable or HTTP surfaces are later authorized. |

No documentation dependency is unsatisfied. Functional work remains blocked by the decisions and migration authority below.

## Current-state inventory and ownership gap

| Concept | Current owner / representation | Persistence and paths | Authority / history / Tenant | Canonical target owner | Gap |
| --- | --- | --- | --- | --- | --- |
| Policy reference | `AgentRevisionV2.knowledge.memory_policy_ref` | Fingerprinted Agent revision; legacy Product API synthesizes `memory:<agentId>` | Reference seam only; no resolvable policy history | Governance policy authority | No typed policy, revision, resolver or decision. |
| Effective Memory resolution | Effective configuration `memory_policy` class | Snapshot is `owner_required / unavailable` | Correct fail-closed behavior | Governance resolver plus typed result refs | No exact policy/result contract. |
| Runtime use | Generic `RuntimeExecutionIntentV2.runtime_configuration` | Runtime intent/checkpoint tables | Existing runtime owners remain unchanged | Governed Memory boundary consumed by runtime | No bounded read/write interface. |
| Memory Records | None | No repository or PostgreSQL table | No lifecycle, Tenant boundary or history | Memory Domain / Memory Store | Canonical owner absent. |
| Workforce Shared Memory | Workforce deliberately has no Memory field | Workforce lineage only | Membership is not authority | Memory Store with Workforce/Run refs | Companion access contract absent. |
| Knowledge-backed Memory | Knowledge references and observations | No Memory adapter | Knowledge remains source truth | Memory Store references Knowledge | No source/version/digest contract. |
| Event/Evidence/outbox | Existing canonical infrastructure | `acs_native_events`, `acs_native_evidence`, `acs_native_outbox` | Tenant/provenance conventions available | Reuse as fact/proof, never owner | No Memory subject vocabulary or payload contract. |
| Product API / Administration | REQ-10 placeholder | Application boundary only | Must Tenant-filter and redact | Projection only | No route is authorized in this milestone. |

`memory_policy_ref` is a reference seam, not a Memory aggregate. Its unavailable effective-configuration result remains required until a canonical owner exists.

## Ownership, authority, Tenant and history

```text
Governance -> owns Policy semantics/history
Memory Domain -> owns Memory Store and Records
Agent / Workforce / Knowledge -> exact references only
Runtime -> consumes through governed boundary
Product API / Administration -> projection only
```

Every future operation requires an authenticated actor, Tenant, requested operation, explicit scope/purpose, exact effective Policy revision and authority/participation constraints. Identity reference is not access authority. Policy authorization, scope authorization, Tenant isolation and governance decision are distinct from human/user consent; consent is never inferred from an account, session or Tenant.

All durable candidates bind `tenant_id` in identity, query, foreign reference and Event/Evidence correlation. Cross-Tenant substitution fails closed. Historical execution must use exact policy and immutable record/result refs or digests, never a current mutable Memory lookup.

Raw Memory content is prohibited from effective-configuration snapshots, Events, Evidence, outbox payloads, Product API projections and logs. Secrets, credentials, tokens, authorization headers and private keys are not Memory content.

## Blockers

| Blocker | Root cause / current state | Disposition | Blocking slice | Required evidence |
| --- | --- | --- | --- | --- |
| `E17-R06-B01` | No canonical versioned Policy owner/history | `OPEN` | Slice 1 / migration gate | Typed policy, resolver and historical revision proof. |
| `E17-R06-B02` | No Record/Store contract or persistence | `OPEN` | Slice 2 | Canonical Tenant-safe Store/repository. |
| `E17-R06-B03` | No human identity, consent or privacy-deletion authority | `OPEN / HARD BOUNDARY` | User Context Memory only | Separate owning-domain decision; no inference. |
| `E17-R06-B04` | Deletion can conflict with reproducible history | `RESOLVED` | Slice 4 | Exact Policy eligibility, idempotent retention, transactional tombstone/content exclusion, safe Event/Evidence/outbox and `ACTIVE_STORE_DELETED` are validated; cryptographic and backup erasure remain unclaimed. |
| `E17-R06-B05` | Workforce deliberately has no Memory field | `OPEN` | Slice 1 / Slice 3 | Companion refs/access without Workforce change. |
| `E17-R06-B06` | IMP-02 snapshot has primitives but no typed Memory refs/results | `OPEN / PARTIALLY REDUCED` | Slice 3 | Exact policy/result refs; no raw content. |

No blocker is resolved by documentation. B03 does not block the four candidate classes, but blocks User Context Memory.

## Contract deltas

| Delta | Current evidence | Disposition | Target slice / acceptance |
| --- | --- | --- | --- |
| `E17-R06-CD01` Policy | Exact Agent ref only | `IMPLEMENT IN IMP-03B` | Slice 1; immutable Policy lineage/resolver. |
| `E17-R06-CD02` Record/ref | No contract/persistence | `IMPLEMENT IN IMP-03B` | Slice 2; Tenant/scope/provenance/sensitivity/lifecycle. |
| `E17-R06-CD03` Decisions/attenuation | Generic policy fields only | `IMPLEMENT IN IMP-03B` | Slice 3; fail-closed decision trace. |
| `E17-R06-CD04` Scopes | Agent/Workforce refs exist | `IMPLEMENT IN IMP-03B` | Slice 1; user scope deferred by B03. |
| `E17-R06-CD05` Result refs/digests | IMP-02 snapshot/Evidence primitives | `IMPLEMENT IN IMP-03B` | Slice 3; exact refs/digests. |
| `E17-R06-CD06` Retention/deletion | No durable model | `IMPLEMENT IN IMP-03B` | Storage before Slice 2; enforcement Slice 4. |
| `E17-R06-CD07` Knowledge adapter | Observation conventions only | `IMPLEMENT IN IMP-03B` | Slice 3; source/version/digest provenance. |
| `E17-R06-CD08` Product API | REQ-10 reserves it | `DEFER` | Owning projection milestone. |

## ADRs

| ADR | Status | Required decision / timing |
| --- | --- | --- |
| `ADR-17-020` Policy/Store ownership | `ALREADY DECIDED` architecturally; details `REQUIRED BEFORE FUNCTIONAL WORK` | Governance owns Policy; Memory owns Store/Records. |
| `ADR-17-021` Scopes/companion refs | `ALREADY DECIDED FOR SLICE 1` | Working/Agent/Workforce/Knowledge keys are allowed; User Context remains excluded. |
| `ADR-17-022` Memory vs Runtime/Knowledge/Evidence | `ALREADY DECIDED` | Preserve existing owners; typed references only. |
| `ADR-17-023` Retention/deletion/consent/history | `ALREADY DECIDED` | Crypto metadata, active-store deletion boundary and non-claims for backup/WAL erasure are accepted. |
| `ADR-17-024` Retrieval/indexing adapters | `DECIDED FOR SLICE 3` | Bounded Store query/retrieval contract; no mandatory vector/RAG. |

## Persistence, Event and migration candidates

The repository is at schema 9. Existing Agent, Workforce, Runtime, Event/Evidence/outbox and Integration tables do not own Memory; the additive durable Store preserves one canonical Memory owner. The accepted logical candidate is reconciled in [persistence and migration candidate](imp-03b-persistence-design-candidate.md); the physical table, constraint and transaction proposal is [schema-9 physical persistence design](imp-03b-schema-9-physical-design.md).

Derived candidate positions:

- Memory Policy requires its own immutable durable revision lineage because exact Agent references must resolve historically.
- Memory Record requires immutable successor semantics. It has no revision lineage or current head; active versus tombstoned state is derived from content/tombstone presence for that exact immutable identity.
- Retention/deletion mechanics must be frozen before migration. A tombstone preserves content-free identity, digest, decision and provenance while content is removed from every authorized residence.
- The CTO accepted closed `memory_policy` and `memory_record` Event subjects. Envelope/store changes remain deferred until a slice emits canonical Memory Events; no synthetic Agent, Workforce, Run or Task subject is permitted.

## Slices after a separate GO

| Slice | Scope | Preconditions / closure |
| --- | --- | --- |
| 1 — Contracts & Policy | Taxonomy, Policy/Record contracts, scope semantics, typed errors and ADR closure | `COMPLETE / CTO ACCEPTED / PUBLISHED`; no schema. |
| 2 — Durable Store | Authorized schema, Policy lineage, immutable Record successors, Tenant isolation, idempotency, Event/outbox, tombstone-capable storage | `COMPLETE / CTO ACCEPTED / PUBLISHED`. |
| 3 — Governed operations | Effective Policy resolution, bounded write/retrieval, exact snapshot refs, Knowledge refs and provenance | `COMPLETE / CTO ACCEPTED / PUBLISHED`; no vector platform. |
| 4 — Retention & deletion | Enforce expiry/forget/delete, content deletion, tombstone and redacted proof | `COMPLETE / CTO ACCEPTED / PUBLISHED`; no scheduler or Automation owner. |
| 5 — Projections & closure | Safe read/admin projection, typed errors, Tenant isolation, conformance and docs | `AUTHORIZED / GO`; no parallel API, Runtime integration or User Context implementation. |

No slice authorizes admission, Activation, Run creation or execution. User Context Memory awaits B03.

## Security, tests and acceptance

Future tests must prove Tenant isolation; scope/Agent/Workforce substitution rejection; stale policy/reference rejection; unauthorized write/retrieval; retention bypass rejection; no deleted-content recovery; bounded retrieval; CAS/idempotency where selected; Event/Evidence separation; no secret leakage; Knowledge ownership; and historical determinism.

After admission, change the current policy or add record successors and reconstruct the earlier snapshot: it must retain the original exact policy and result ref/digest. After deletion, prove raw content is absent from records, history, Event/Evidence/outbox payloads and diagnostics while content-free proof remains.

Durable work requires `npm run acceptance:postgres`. Slice 4 validation passed schema 9 PostgreSQL acceptance with `19 passed / 0 failed / 0 skipped`. A restricted sandbox still reports `129 passed / 10 failed` at the listener boundary, but the listener-capable local environment completed `750 passed / 0 failed / 19 skipped`; those skips are PostgreSQL tests without `ACS_SH_DATABASE_URL` and are independently covered by acceptance. The authoritative Slice 4 causality result is `A = 0`, `B = 0`, `C = 0`, `D = 0`.

### Gate acceptance criteria

1. One Governance-owned, versioned Policy contract is selected.
2. One Memory Domain/Store owns Records without a second owner.
3. Scope, Tenant and authority are explicit and fail closed.
4. Historical semantics do not use current mutable state.
5. Deletion/tombstone storage semantics are approved before migration.
6. User Context remains blocked until B03 is resolved by its owner.
7. Event vocabulary is closed or explicitly deferred before mutations.
8. The candidate migration is additive and avoids dual authority.
9. Secrets and raw Memory content are excluded from prohibited surfaces.
10. Slices, deltas, ADRs, blockers, tests and rollback have explicit owners.

## Gate report

**Status:** `GATE PREPARATION COMPLETE / CTO ACCEPTED; SLICE 1 COMPLETE / CTO ACCEPTED / PUBLISHED; PHYSICAL SCHEMA-9 DESIGN COMPLETE / CTO ACCEPTED / PUBLISHED; ADR-023 COMPLETE / CTO ACCEPTED / PUBLISHED; SLICE 2 COMPLETE / CTO ACCEPTED / PUBLISHED; SLICE 3 COMPLETE / CTO ACCEPTED / PUBLISHED; SLICE 4 COMPLETE / CTO ACCEPTED / PUBLISHED; SLICE 5 AUTHORIZED / GO`
**Blockers:** six open; B03 is a hard User Context boundary.
**Deltas:** CD01–CD07 candidate IMP-03B work; CD08 deferred to REQ-10.
**ADRs:** 020/022 decided; 021 decided for Slice 1; 023 partially decided and required before migration; 024 deferred to Slice 3.
**Migration:** schema 8 -> 9 additive migration is authorized; no legacy import or backfill.
**CTO decisions required:** Slice 5 acceptance/closure. A validated external KMS/Transit integration remains required before production Memory enablement.
