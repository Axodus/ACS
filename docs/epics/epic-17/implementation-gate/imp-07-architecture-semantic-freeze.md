# EPIC-17-IMP-07 — Architecture & Semantic Freeze

**Epic:** EPIC-17 — Agent Genome Foundations, Administration & Automation Platform
**Milestone:** EPIC-17-IMP-07 — Product API and Administration Contracts
**Mapped requirement:** EPIC-17-REQ-10 — Product API, Administration & Control Plane Projection
**Decision state:** `FROZEN CANDIDATE / READY FOR CTO SLICE AUTHORIZATION`
**Baseline:** `8235c45c08c500f61d01447c9335aee29f9b2c39` (`origin/dev`)
**Schema:** `12 / CANONICAL`; Schema 13 is `NOT REQUIRED / NOT AUTHORIZED`
**Authority exercised:** repository inspection and documentation only
**Functional implementation:** none

## 1. Executive determination

IMP-07 has one acceptable architecture: the existing authenticated, Tenant-aware
Product API remains the unique external application boundary. It projects
canonical owner state through safe, versioned application representations and
adapts an authorized command to exactly one existing canonical owner. It does
not become domain truth, a repository owner, a runtime substitute, or a second
authorization system.

The repository already proves this boundary in
`src/http/routes/product-api-routes.ts`, `src/http/responses.ts`,
`src/http/control-plane-context.ts`, and the accepted Product API slices for
Connection/Credential, Memory, Delegation, Automation, and external-observation
Activation. The implementation work required after CTO authorization is bounded
by the slices in this document. No route, handler, persistence object, schema,
migration, Runtime behavior, admission behavior, or Control Plane UI module is
implemented by this freeze.

## 2. Baseline

The accepted post-IMP-06 baseline is commit
`8235c45c08c500f61d01447c9335aee29f9b2c39` on `origin/dev`. It records
IMP-06 as `COMPLETE / CTO ACCEPTED / CLOSED`, with Schema 12 canonical and
IMP-07 as the dependency-selected next milestone.

REQ-10 and REQ-12 are `COMPLETE / ACCEPTED`. Their accepted direction is
preserved: one Product API, source-faithful projections, owner-routed commands,
class-owned settings navigation, explicit unavailable states, and Tenant-safe
query behavior. This document does not reopen those decisions.

## 3. Authority and scope

This freeze authorizes architecture inventory, semantic decisions, candidate
contract documentation, blocker disposition, slice decomposition, test planning,
and implementation-gate indexing.

It does not authorize Product API behavior changes; HTTP handlers; DTOs in
code; mutations; canonical service changes; direct repository calls; new domain
contracts; migrations; tables; Schema 13; admission; Run or Workflow creation;
scheduler runtime; OpenClaw execution; Genome work; or IMP-08 and later work.

## 4. Repository inventory

| Surface | Path | Type | Canonical owner / consumer | Read or mutation | Tenant and sensitive-data boundary | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| Product API dispatch | `src/http/routes/product-api-routes.ts` | ROUTE | `/api/v1`; Product/API clients | Both, by existing domain | Auth, membership, scope mismatch and system checks precede route work | REUSE |
| HTTP composition | `src/http/server.ts`, `src/http/control-plane-context.ts` | SERVICE | Control Plane context | Coordination | Request correlation, edge policy, auth and rate limits | REUSE |
| Envelope and failures | `src/http/responses.ts`, `src/http/validation.ts` | CONTRACT / GUARD | HTTP boundary | Both | Structured safe errors, correlation, warnings and blocking data | REUSE |
| Tenant administration | `src/http/routes/admin-tenant-routes.ts`, `src/http/tenant-governance-enforcer.ts` | ROUTE / GUARD | EPIC-15 Tenant administration | Both | Tenant and platform authority are explicit | REUSE |
| Product projection facade | `src/control-plane/product-api-client.ts` | SERVICE / PROJECTION | Product API adapter over owner services | Read plus existing routed commands | Redacted credential summaries and native-core projections | ADAPT |
| Workforce Product API | `src/control-plane/product-api-workforce.ts` | PROJECTION | Native Workforce owner | Read and existing create path | Native Core scope is retained | REUSE |
| Agent | `src/native-core/agent.ts`, `src/control-plane/agent-service.ts` | DOMAIN / SERVICE | Native Agent; legacy compatibility remains explicit | Revision/lifecycle service semantics | Scope and revision conflicts are owner behavior | ADAPT |
| Effective configuration | `src/native-core/effective-configuration.ts` | DOMAIN | Class-specific resolution/snapshot owner | Read | Exact snapshot, source and finding semantics | REUSE |
| Connection/Credential | `src/intelligence/credential-connection.ts`, `src/intelligence/secret-store.ts` | DOMAIN / GUARD | Connection and secret owners | Existing lifecycle/read surfaces | Opaque/redacted secret references only | ADAPT |
| Memory | `src/native-core/memory.ts`, `src/control-plane/memory-service.ts` | DOMAIN / SERVICE | Memory policy/store owner | Governed access and retention | Policy/scope decision precedes content access | ADAPT |
| Delegation | `src/native-core/delegation.ts`, `src/control-plane/delegation-authority-resolver.ts` | DOMAIN / SERVICE | Delegation owner | Grant/history reads and owner commands | Exact chain, attenuation and Tenant scope | ADAPT |
| Automation | `src/native-core/automation.ts`, `src/control-plane/automation-service.ts` | DOMAIN / SERVICE | Automation owner | Revision/lifecycle service semantics | Exact head/revision, CAS and governed references | ADAPT |
| Activation | `src/native-core/activation.ts`, `src/control-plane/activation-resolution.ts` | DOMAIN / PROJECTION | Activation causal-occurrence owner | Read/preparation semantics | Safe external-observation projection; no raw provider content | ADAPT |
| Event/Evidence | `src/native-core/evidence.ts`, `src/control-plane/operational-evidence-service.ts` | DOMAIN / PROJECTION | Existing evidence/audit owners | Read plus owner-generated evidence | Product API never manufactures canonical audit facts | REUSE |
| Runtime and workers | `src/control-plane/runtime-lifecycle-service.ts`, `src/workers/*` | SERVICE / RUNTIME | Runtime owner | Operational behavior | Separate from administrative contracts | REJECT for IMP-07 ownership |
| OpenClaw adapter | `src/engines/openclaw-engine-adapter.ts`, `src/engines/openclaw-bootstrap.ts` | PROVIDER ADAPTER | Replaceable provider boundary | Execution integration | No canonical identity or API dependency | REJECT for IMP-07 ownership |

The present Product API route file exposes health/readiness, authenticated
account state, Tenant administration, composition and provider views,
connections/channels, Memory metadata, Automations, Delegation grants, runtime
and worker views, Event/Evidence, diagnostics, economics, and system
projections. This is evidence of one extension point, not authority to add new
routes in this freeze.

## 5. Canonical Product API ownership

The canonical Product API begins at `routeProductApiRequest()` in
`src/http/routes/product-api-routes.ts` under `/api/v1`. Route registration,
authentication integration, Tenant membership validation, response envelopes,
request validation and correlation are owned by the HTTP boundary. The route
constructs `ProductApiClient` from `ControlPlaneContext`; that facade may project
owner state and invoke existing owner services, but it is not a domain owner.

Tenant binding is derived from the authenticated context and
`context.isolation.scope.tenantId`. A client-provided Tenant identifier is never
trusted by itself. Non-platform requests with a conflicting authenticated Tenant
are rejected before a resource projection is returned. Product administration
authorization remains separate from Delegation authority and from Runtime
admission authority.

`admin/tenants` is an existing EPIC-15 ownership boundary. `system/*` views are
operational projections, including `SystemConfigurationView`; they are not a
Global Settings aggregate or a generic settings-mutation contract. Legacy Agent
representations remain compatibility projections and must carry explicit loss or
source markers where they cannot reconstruct Native Core truth.

## 6. Administrative resource matrix

| Resource | Allowed administration semantics | Historical read | Canonical owner | Product projection decision |
| --- | --- | --- | --- | --- |
| Agent | READ, REVISE, LIFECYCLE, ACTION | Exact revision/fingerprint | Native Agent | ADAPT |
| AgentRevision | READ | Exact only | Native Agent | ADAPT |
| Profile | READ | Source Agent revision | Agent-owned presentation projection | ADAPT |
| Persona | READ | Exact Agent revision | Native Agent revision configuration | ADAPT |
| Effective configuration | READ | Snapshot/fingerprint/finding | Class-specific resolver/snapshot owner | REUSE |
| Governed resource metadata | READ | Kind-specific exact ref or immutable observation | Existing resource owner | ADAPT |
| Capability metadata | READ | Owner-defined | Capability/resource owner | ADAPT; never authority by presence |
| Connector definition | READ, DEFERRED | Owner-defined | Existing backing owner or proven future connector owner | DEFERRED where no canonical definition exists |
| Connection | READ, REVISE, LIFECYCLE, ACTION | Exact lineage | Connection owner | ADAPT |
| Credential metadata | READ, ACTION | Safe version/reference only | Credential/Secret owner | ADAPT; secret values NOT_EXPOSED |
| Channel | READ, REVISE, LIFECYCLE, ACTION | Exact lineage | Channel owner | ADAPT |
| Memory Policy | READ, REVISE, LIFECYCLE | Exact policy revision | Memory policy owner | ADAPT |
| Memory administrative metadata | READ | Owner-defined references/tombstones | Memory companion domain | ADAPT |
| Raw Memory content | NOT_EXPOSED, DEFERRED | Purpose-scoped only | Memory owner plus security authority | REJECT from generic administration |
| Delegation | READ, CREATE, REVISE, LIFECYCLE, ACTION | Exact chain/revision | Delegation authority owner | ADAPT |
| Automation | READ, CREATE, REVISE, LIFECYCLE, ACTION | Exact revision/fingerprint | Automation owner | ADAPT |
| AutomationRevision | READ | Exact only | Automation owner | ADAPT |
| Activation | READ | Exact causal identity and source refs | Activation owner | ADAPT |
| Schedule metadata | READ, REVISE, LIFECYCLE | Exact schedule/source refs | Automation/Activation schedule owner | ADAPT; no scheduler authority |
| External-observation provenance | READ | Immutable observation/digest | Activation/external-observation owner | REUSE |
| Event/Evidence references | READ | Exact subject/correlation | Existing Event/Evidence owner | REUSE |

No matrix entry implies CRUD symmetry. In particular, revisioned history is not
updated in place, lifecycle is not deletion, and an exposed reference does not
grant a capability or authority.

## 7. Query and command model

A query follows this path:

```text
Product API query
  -> safe projection/query service
  -> canonical state or exact history
  -> application-safe representation
```

Queries do not mutate lifecycle, synthesize an unavailable source as an empty
or healthy result, or resolve historical references through mutable heads.

A command follows this path:

```text
validated Product API request
  -> authenticated actor and Tenant scope
  -> action-specific authorization and owner-routed service
  -> canonical domain validation and transaction
  -> owner Event/Evidence/receipt behavior
  -> safe result projection
```

The command envelope frozen for later implementation needs actor/Tenant context,
action and subject, exact authority basis, purpose, expected revision or other
owner precondition, idempotency key plus semantic request digest, correlation
and causation identifiers, and owner-result status. The Product API does not
reimplement CAS, idempotency, lifecycle, authority or transaction rules.

## 8. Administrative action model

Candidate actions are descriptive until a Slice is explicitly authorized.

| Candidate action family | Existing owner/seam | Required properties | IMP-07 disposition |
| --- | --- | --- | --- |
| Agent revise/lifecycle/validate | Native Agent service | CAS, Tenant, lifecycle rules and result receipt | Candidate owner-routed command |
| Connection rotate/rebind | Connection/Credential owner | Write-only secret ingress where owner-authorized; idempotency | Candidate owner-routed command |
| Memory policy/retention action | Memory service | Policy, scope, purpose and deletion proof | Candidate owner-routed command |
| Delegation issue/narrow/revoke | Delegation owner | Attenuation, chain integrity, validity and revocation | Candidate owner-routed command |
| Automation prepare/revise/lifecycle | Automation service | Exact head, governed refs, lifecycle and idempotency | Candidate owner-routed command |
| Activation inspect | Activation projection | Exact causal provenance; no authority gain | Candidate query only |
| Activation admission/retry/cancel | Admission/Runtime owner | Separate authorization and accepted runtime contract | DEFERRED / outside IMP-07 |
| Run/Workflow start | Runtime owner | Admission and execution authority | REJECT / outside IMP-07 |

Administrative action availability is advisory projection metadata. The
canonical owner repeats all checks when a command executes.

## 9. Historical addressing

The following rule is frozen for every revisioned or observed resource:

```text
head/current read: stable identity only, with returned resolved revision/fingerprint
exact historical read: stable identity + exact revision/fingerprint, or immutable observation/digest
```

An exact historical request must fail closed on missing revision, revision
mismatch, fingerprint mismatch, Tenant mismatch, or unreconstructable source.
It must never silently substitute a current Agent, Automation, configuration,
Delegation, governed resource, or policy head.

Activation details retain their exact Automation reference, causal source,
target-resolution snapshot and available handoff state. Effective configuration
uses the accepted snapshot/reference and resolution findings; current settings
are context only. A legitimately deleted source is represented through surviving
reference, digest, tombstone, policy decision, Evidence and reconstruction-gap
metadata instead of fabricated content.

## 10. Resource-specific administration boundaries

Agent identity, history and lifecycle remain Native Core truth. Profile is a
presentation projection; Persona is AgentRevision-owned semantics. A combined
application payload may aid UX but remains source-labeled and cannot become an
aggregate or writable round-trip DTO.

Effective configuration is class-specific. Product projection may expose safe
metadata such as class, source reference, resolved version, fingerprint,
snapshot reference and validation status. It defaults to metadata-safe output;
full configuration requires an existing source-specific security decision.

Connection, Credential and Channel remain separate. Credential outputs exclude
secret values, tokens, passwords, keys and private material. Opaque credential
references are not credentials. Memory administration exposes policy and
administrative metadata only; raw content remains a separate purpose, scope and
authority decision. Delegation projection does not confer Delegation authority
and cannot expand attenuation. Automation configuration, revision and lifecycle
remain separate from Activation occurrence, admission and execution.

## 11. Tenant and authorization boundary

Every future administrative operation preserves:

```text
request -> authenticated and authorized Tenant context -> Product API -> canonical owner
```

The existing HTTP route verifies trusted authentication, Tenant-scope agreement
and active membership before non-public Tenant-scoped operations. Platform scope
is separately checked for system surfaces. Each eventual query and command must
apply non-disclosing cross-Tenant behavior: a requester denied by Tenant scope
must not learn whether a referenced object exists.

Product administration authorization, Delegation authority and Runtime/admission
authority are distinct checks. A permitted administrator may inspect an
Automation without gaining permission to execute it.

## 12. Projection and redaction policy

Every new or adapted projection uses a common metadata shape, reusing the
existing Product API envelope rather than creating a parallel API envelope:

- contract/version and projection generation or observation time;
- canonical kind, stable identity, Tenant/scope and owner;
- exact source revision/fingerprint or immutable observation/digest;
- lifecycle/status with freshness/source semantics;
- compatibility/loss and historical-reconstruction markers;
- typed cross-domain references and correlation IDs;
- redaction/minimization markers; and
- server-evaluated action descriptors, when an owner has supplied them.

The central policy is minimization. Responses, errors, history, Event payloads
and logs exclude raw credentials, secrets, provider authentication material,
lease values and raw provider payloads. Existing external-observation tests
already demonstrate a safe Activation projection that retains a digest while
excluding raw delivery/provider content, credentials and authority internals.

## 13. Error, idempotency and CAS model

The existing Product API envelope remains the error envelope. Candidate
owner-appropriate categories are validation/unsupported operation,
authentication/authorization/Tenant denial, not found without existence
leakage, CAS or idempotency conflict, policy/lifecycle/dependency/readiness
block, unavailable/partial/stale/historical-gap source, accepted/pending owner
operation, and safe internal adapter failure with correlation.

Commands carry an idempotency key and semantic request digest. After uncertain
completion, a client retries with the same key and digest. Owners preserve their
existing expected-head/CAS rules; a Product API handler may not transform a
blind overwrite into a valid command. Retryability is server-supplied and
action-specific.

## 14. Compatibility and versioning

IMP-07 extends the existing Product API major version only through additive,
owner-faithful contracts. It does not create Product API v2, Genome API,
Administration API, Automation API or a frontend-only backend.

Legacy fields remain explicitly labeled compatibility data. They cannot be used
to reconstruct omitted Native Core state or accepted as write input merely
because they are visible on a read projection. A breaking owner semantic uses
the established versioning process; an unsupported mutation fails explicitly
and never falls back to a legacy owner.

## 15. B09, B10, B11, B12, B13 and B15 dispositions

| Blocker | Frozen disposition | Slice / boundary |
| --- | --- | --- |
| `E17-R10-B09` | Define common source, lineage, freshness, redaction and reconstruction metadata under the existing envelope. | S1 |
| `E17-R10-B10` | Define owner-routed action descriptors and command envelope; owner revalidation remains mandatory. | S1, S2 |
| `E17-R10-B11` | Define Global Settings as a class-owned read index over existing owners; reject aggregate, repository, table and universal overrides. | S1, S3 |
| `E17-R10-B12` | Route families are required only after CTO authorizes their Slice; all route work remains HOLD now. | S3 |
| `E17-R10-B13` | API readiness/unavailable semantics may be defined; Flow/Module/Screen implementation belongs to IMP-09. | S3; IMP-09 preserved |
| `E17-R10-B15` | Require Tenant-safe list, search, reference and history conformance for each authorized projection; final cross-domain verification remains IMP-10. | S4 |

## 16. B14 preservation

`E17-R10-B14` is `DEFERRED -> IMP-09` and does not block this freeze. The
Administration-under-System versus current primary-navigation divergence cannot
be resolved implicitly by path naming, route registration, DTO naming or module
placement. No Slice in IMP-07 may decide Flow -> Module -> Screen information
architecture.

## 17. REQ-11 and IMP-08 boundary

`E17-R11-B08` is preserved for IMP-08. IMP-07 may define that a future Genome
projection is descriptive administration data and may return a typed
unavailable state until a canonical IMP-08 source exists. It cannot implement
Genome routes, traits, assets, verification, authority, reputation, economic
rights or NFT semantics. Genome metadata must never be interpreted as a
capability, permission, credential or authority source.

## 18. Runtime, admission, scheduler and OpenClaw boundaries

Administration is not execution. An Activation read does not admit, execute or
make an Activation executable. Prepared state remains distinct from admitted,
Run and Workflow state. Schedule configuration administration is distinct from
a scheduler daemon or timer worker.

OpenClaw remains optional and replaceable. It is not an Agent, Automation,
Activation, scheduler, admission or Product API owner. Any discovered legacy
operational route is classified as existing compatibility behavior; it receives
no extension under IMP-07 without a separate CTO authorization.

## 19. Schema and persistence determination

Schema 12 remains canonical. IMP-07 has no persistence impact: no table,
migration, aggregate, store, repository or Schema 13 is needed or authorized.

If an authorized implementation Slice appears to require persistence, it must
stop, identify the canonical domain owner and return to CTO for a new
architecture and migration decision. The Product API must not add persistence
as a workaround for a missing owner seam.

## 20. Security review

| Risk | Boundary | Canonical mitigation | Acceptance proof |
| --- | --- | --- | --- |
| Cross-Tenant read or mutation | HTTP/Product API and owner | Authenticated scope, membership, owner Tenant checks, non-disclosure | Negative list/detail/reference/history tests |
| Secret or credential leak | Projection/redaction | Opaque references, redacted summaries, write-only ingress only where owner permits | Serialized response/error/log exclusion tests |
| Raw provider payload leak | External observation/Activation | Metadata-safe digest/provenance projection | External-observation projection regression |
| Authority escalation | Action/Delegation | Server-evaluated descriptor plus owner revalidation and attenuation | Denied action and chain-attenuation tests |
| Blind revision overwrite | Command adapter | Owner expected-head/CAS | Conflict tests |
| Idempotency bypass | Command adapter | Stable key plus semantic request digest | Same-key retry/no duplicate mutation tests |
| Lifecycle bypass | Domain owner | Owner lifecycle validation | Invalid transition tests |
| Historical spoofing | Historical projection | Exact ref/fingerprint, no silent head substitution | Mismatch and missing-history tests |
| Direct repository mutation | Application boundary | Route -> service -> owner -> repository only | Code-path/integration tests |
| Hidden execution action | Runtime boundary | Explicit defer/reject of admission/Run/Workflow/scheduler actions | Route/action inventory and negative tests |

## 21. Event, Evidence and audit review

Event, Evidence, audit and outbox facts remain canonical owner outputs. A
Product command invokes an existing Control Plane/domain service; that service
or domain owns transactional mutation and any resulting Event/Evidence behavior.
The Product API returns safe receipt and reference projections.

No Product API route manually writes canonical audit events or independently
mutates repositories. Read projections may link exact subjects and correlation
identifiers to existing Event/Evidence views without copying them into a new
truth store.

## 22. Candidate contracts and seams

The following are contract candidates, not code authority. Existing contracts
and response conventions take precedence over a new abstraction.

| Candidate | Need | Owner | Classification |
| --- | --- | --- | --- |
| Common projection metadata | Satisfy B09 with lineage, freshness, compatibility and reconstruction facts | Product API projection layer | ADAPT |
| Action descriptor | Satisfy B10 without granting authority | Canonical command owner, projected by Product API | ADAPT |
| Command envelope | Carry context, CAS, idempotency and causation to one owner | Control Plane coordination seam | EXTEND |
| Historical reference | Make head versus exact read explicit | Referenced canonical owner | ADAPT |
| Typed error mapping | Preserve owner failure without disclosure | Existing HTTP envelope | ADAPT |
| Global Settings index | Navigate class-owned settings sources | Per-class owners | EXTEND; no aggregate/store |
| Agent/Automation/Activation admin projections | Remove lossy/uneven application representation | Existing domain owners | ADAPT |
| Missing command seam | Where a canonical service cannot receive a valid owner-routed command | Identified canonical domain owner | NEW candidate only |

A registry or shared interface is not frozen as mandatory. The implementation
must first show that repeated safe-mapper behavior cannot remain explicit and
consistent in the existing Product API facade.

## 23. Slice decomposition

### S1 — Administrative contracts and safe projection foundation

**Purpose:** freeze and implement, only after CTO authorization, the additive
contract shapes for common metadata, typed references, historical addressing,
action descriptors, command envelope, unavailable states and Global Settings
index semantics.

**Mapped blockers:** B09, B10, B11.
**Dependencies:** accepted IMP-01 through IMP-06.
**Expected areas:** Product API contracts/projections and focused tests.
**Allowed implementation:** additive contracts and safe mapper conventions.
**Excluded:** routes, mutations, schemas, persistence, runtime, Genome and IA.
**PostgreSQL:** no new requirement; use existing owner acceptance only when a
contract test touches durable owner state.
**Acceptance:** no duplicate owner, no secret fields, exact historical type,
class-owned settings index only, and documented compatibility markers.

### S2 — Owner-routed Control Plane administrative seams

**Purpose:** map each authorized command category to an existing canonical
service and add only missing coordination seams that preserve owner rules.

**Mapped blockers:** B10 and owner-specific parts of B09/B11.
**Dependencies:** S1 accepted.
**Expected areas:** existing Control Plane services, Product API facade and
owner-specific tests.
**Allowed implementation:** coordination-only query/command adapters that
invoke exactly one owner.
**Excluded:** direct repository access, domain truth, schemas, admission,
execution, scheduler and provider ownership.
**PostgreSQL:** required for any durable mutation path where existing acceptance
infrastructure supports it.
**Acceptance:** CAS, idempotency, lifecycle, Tenant and owner Event/Evidence
behavior are proven through the owner seam.

### S3 — Product API integration and availability boundaries

**Purpose:** integrate CTO-authorized query, command and lifecycle route
families under `/api/v1`, preserving auth, Tenant, redaction, response envelope,
compatibility and typed unavailable behavior.

**Mapped blockers:** B11, B12 and B13.
**Dependencies:** S1 and any applicable S2 seam accepted.
**Expected areas:** `src/http/routes/product-api-routes.ts`, Product API facade,
projection mappers and integration tests.
**Allowed implementation:** only explicit CTO-authorized route categories.
**Excluded:** Control Plane Flow/Module/Screen work (IMP-09), routes for Genome
sources absent before IMP-08, Runtime/admission/execution and persistence.
**PostgreSQL:** required for durable command routes where their owner already
has PostgreSQL acceptance.
**Acceptance:** route integration reaches owner services only; cross-Tenant and
redaction behavior fail closed; unavailable source behavior is explicit.

### S4 — Conformance and closure

**Purpose:** complete cross-resource contract, security, historical, compatibility
and regression evidence.

**Mapped blockers:** B15 and closure evidence for B09-B13.
**Dependencies:** all authorized prior IMP-07 slices.
**Expected areas:** focused, integration, PostgreSQL where applicable, and full
regression evidence.
**Allowed implementation:** conformance fixes within previously accepted
contract scope.
**Excluded:** net-new resource families, Schema 13, IMP-08/IMP-09 scope.
**Acceptance:** deterministic list/pagination where exposed; exact-history
behavior; non-disclosure; no secret/provider leakage; causality-classified full
regression.

The dependency order is acyclic: `S1 -> S2 -> S3 -> S4`, with S2 omitted for a
route family only when existing owner seams fully satisfy its command/query
needs.

## 24. Testing strategy

Contract tests must cover safe projection metadata, resource classification,
typed unavailable/error outcomes, action descriptors and historical reference
validation. Tenant/security tests must prove cross-Tenant list, detail,
reference, search and history non-disclosure; secret/credential/provider-payload
exclusion; and authority separation.

Command tests must exercise CAS conflict, same-key idempotent retry, lifecycle
rejection, owner-service reuse and canonical Event/Evidence linkage. Query tests
must cover current/head, exact revision, missing revision, fingerprint mismatch,
historical reconstruction gap, deterministic list/filter/order/pagination where
introduced, and stale/unavailable state.

Authorized route integration tests must prove:

```text
request -> Product API -> canonical service -> canonical owner/repository -> safe projection
```

Durable command slices use existing PostgreSQL 17.x acceptance infrastructure
where it supports the owner. Final implementation acceptance requires full
regression and causality classification; this documentation-only freeze does not
claim that future implementation validation has been completed.

## 25. Acceptance matrix

| Gate | Result for this freeze |
| --- | --- |
| Repository inventory | PASS |
| REQ-10 traceability | PASS |
| REQ-12 mapping | PASS |
| B09/B10/B11/B12/B13/B15 dispositioned | PASS — 6/6 |
| B14 | `DEFERRED -> IMP-09`; non-blocking |
| E17-R11-B08 | Preserved for IMP-08 |
| Administrative resource model | FROZEN CANDIDATE |
| Command/query boundary | FROZEN CANDIDATE |
| Historical addressing | FROZEN CANDIDATE |
| Tenant/auth boundary | FROZEN CANDIDATE |
| Projection/redaction policy | FROZEN CANDIDATE |
| Runtime, admission, scheduler and OpenClaw boundaries | PASS |
| Schema | `12 / CANONICAL`; Schema 13 not required |
| Slice decomposition | DEFINED |
| Functional implementation | NONE |

## 26. Blockers and stop conditions

No stop condition was found during this documentation freeze. In particular,
repository evidence supports one Product API boundary and existing Tenant/auth
mechanisms; it does not require Schema 13, direct repository mutation, raw
credential output, raw Memory content, admission ownership, Runtime ownership,
mandatory OpenClaw, or a new canonical owner.

Implementation must stop and return to CTO if any authorized Slice discovers a
need for a new persistence aggregate, an unresolvable exact historical reference,
a new authorization model, direct repository mutation, an IMP-09 IA decision, a
Genome prerequisite, or any violation of an accepted EPIC-17 invariant.

## 27. CTO recommendation

```text
EPIC-17-IMP-07
ARCHITECTURE & SEMANTIC FREEZE

Baseline:
8235c45c08c500f61d01447c9335aee29f9b2c39

Mapped requirement:
EPIC-17-REQ-10

REQ-10 traceability: PASS
REQ-12 mapping: PASS
Repository inventory: PASS

Canonical Product API owner:
src/http/routes/product-api-routes.ts under /api/v1,
composed through ControlPlaneContext and ProductApiClient

Administrative resource model: FROZEN CANDIDATE
Command/query boundary: FROZEN CANDIDATE
Historical addressing: FROZEN CANDIDATE
Tenant/auth boundary: FROZEN CANDIDATE
Projection/redaction policy: FROZEN CANDIDATE
Error/idempotency/CAS model: FROZEN CANDIDATE

B09: S1 common projection metadata
B10: S1/S2 owner-routed action and command model
B11: S1/S3 class-owned Global Settings index
B12: S3 routes remain HOLD pending exact CTO Slice authorization
B13: S3 API availability only; Control Plane module work remains IMP-09
B15: S4 Tenant-safe query conformance
B14: DEFERRED -> IMP-09; Blocking IMP-07: NO
E17-R11-B08: PRESERVED -> IMP-08

Product API routes required: YES, only in a CTO-authorized S3
New Control Plane services required: YES, only coordination seams where existing owner service is insufficient
New canonical domain owner: NO

Schema impact: NONE
Schema 12: CANONICAL
Schema 13: NOT REQUIRED / NOT AUTHORIZED

Slice decomposition: S1 -> S2 -> S3 -> S4

Runtime authority: NO
Admission authority: NO
Scheduler runtime authority: NO
OpenClaw execution authority: NO
Genome implementation authority: NO
Functional implementation performed: NONE

Links/paths: PASS
git diff --check: pending documentation validation
Scope violation: NONE
Stop condition: NONE

Recommendation:
READY FOR CTO SLICE AUTHORIZATION
```

CTO acceptance and an exact Slice authorization are required before any
functional implementation begins.
