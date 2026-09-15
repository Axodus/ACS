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

Publication-history note: the original freeze file was later published in
`fca9081` together with the separately authorized S1 implementation. That
commit is therefore not evidence of a documentation-only publication boundary.
The completion-audit amendment that supplies the detailed records required by
the freeze charter changes documentation only and does not touch the later
accepted IMP-07 implementation or the in-progress IMP-08 worktree.

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

The baseline inventory also records the dimensions that cannot safely be
inferred from the surface name alone:

| Surface group | Authorization boundary | Projection source and history | Lifecycle / idempotency behavior |
| --- | --- | --- | --- |
| Product API dispatch and HTTP composition | Existing authentication, active Tenant membership, platform checks and route-specific guards | Existing `/api/v1` envelope over owner results; no history of its own | No lifecycle owner and no independent idempotency store |
| Tenant administration | EPIC-15 Tenant governance and platform authority | Tenant owner state and audit references | Existing Tenant lifecycle and owner idempotency only |
| Product projection facade | Authorization completed at HTTP edge and repeated by the selected owner where required | Native owner head, exact revision, immutable observation or explicit compatibility projection | Does not mutate lifecycle or create idempotency semantics |
| Agent and Profile/Persona | Native Agent scope and owner validation | Native Agent lineage; legacy and Profile fields are loss-aware projections | Native expected-head/CAS and lifecycle history remain authoritative |
| Effective configuration and governed resources | Class-specific policy and authority resolution | Exact snapshot, revision/fingerprint where available, or immutable verified observation | Read-only projection; owner-specific history rules; no Product API idempotency |
| Connection, Credential and Channel | Connection owner plus SecretStore/CredentialProvider authority | Exact Connection/Channel lineage and opaque credential reference/version | Owner lifecycle, rotation and idempotency; no secret material in projection |
| Memory | Memory Policy, purpose, scope, consent and Tenant decision | Exact Policy revision plus metadata/reference/tombstone; raw content excluded | Policy/record lifecycle and domain-specific deletion; owner operation idempotency |
| Delegation | Governance/Delegation attenuation and exact authority basis | Exact Grant revision/fingerprint and chain provenance | Grant lifecycle/revocation and owner CAS/idempotency |
| Automation | Automation owner, governed references and configured authority basis | Exact Automation revision/fingerprint; head is distinct from immutable revision | Owner CAS, idempotency and append-only lifecycle |
| Activation | Activation causal identity and Tenant owner | Exact causal observation/digest, Automation reference and preparation history | Read/preparation only for IMP-07; no admission or execution idempotency |
| Event and Evidence | Existing Event/Evidence access policy | Exact subject/correlation references; safe metadata only | Generated by canonical owner transaction, never by Product API independently |
| Runtime/workers and OpenClaw | Runtime/admission/provider authority outside IMP-07 | Existing operational views only | Existing Runtime leases/fencing/retry; rejected as Product administration ownership |

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

Delete semantics are explicitly non-generic:

| Resource class | Delete disposition |
| --- | --- |
| Agent, AgentRevision, AutomationRevision, Activation, Event and Evidence history | `NOT SUPPORTED`; immutable or audit-relevant history remains preserved under its owner |
| Agent, Connection, Channel, Delegation and Automation heads | `LIFECYCLE TRANSITION`; no Product API hard-delete contract is frozen |
| Memory content | `ACTIVE-STORE REMOVAL` or other domain-specific retention action through the Memory owner; tombstone/proof semantics remain authoritative |
| Credential material | `DOMAIN-SPECIFIC` revoke/rotate/remove through SecretStore/CredentialProvider; no readable secret is returned |
| Profile, Persona, effective configuration and projections | `NOT SUPPORTED` as independent deletion because they are owner-derived state or references |
| Connector definitions, governed resources and future settings entries | `DEFERRED` to each demonstrated canonical owner; no generic DELETE is authorized |

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

Fields are classified before mapping:

| Classification | Product projection rule |
| --- | --- |
| `PUBLIC_APPLICATION` | May be projected through the existing envelope after source validation. |
| `ADMIN_SAFE` | May be projected only to an authorized administrative consumer. |
| `SENSITIVE_REFERENCE_ONLY` | Project only an opaque, non-usable reference and safe metadata. |
| `INTERNAL_ONLY` | Excluded from Product responses, errors and logs. |
| `SECRET` | Never projected; write-only ingress is possible only through an owner-authorized command. |

Server-side/application-side mappers enforce these rules. Frontend hiding is
never accepted as redaction.

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

Canonical owner errors retain their typed meaning through the existing Product
API envelope:

| Required meaning | Freeze mapping |
| --- | --- |
| `NOT_FOUND` | Non-disclosing absent or inaccessible resource result |
| `TENANT_MISMATCH` | Authorization/Tenant denial before projection or mutation |
| `REVISION_MISMATCH` / `FINGERPRINT_MISMATCH` | Exact-history validation failure; no fallback to head |
| `CAS_CONFLICT` | Owner expected-head conflict |
| `IDEMPOTENCY_CONFLICT` | Same key with a different semantic request digest |
| `INVALID_LIFECYCLE` | Owner rejects an invalid state transition |
| `AUTHORIZATION_REJECTED` | Product administration, Delegation or owner policy denial, kept distinct |
| `VALIDATION_FAILED` | Typed request or domain validation failure |
| `REPOSITORY_TRANSACTION_FAILED` | Safe internal failure with correlation; no database detail leakage |

## 14. Compatibility and versioning

IMP-07 extends the existing Product API major version only through additive,
owner-faithful contracts. It does not create Product API v2, Genome API,
Administration API, Automation API or a frontend-only backend.

Legacy fields remain explicitly labeled compatibility data. They cannot be used
to reconstruct omitted Native Core state or accepted as write input merely
because they are visible on a read projection. A breaking owner semantic uses
the established versioning process; an unsupported mutation fails explicitly
and never falls back to a legacy owner.

Administrative lists reuse the existing Product API list conventions. Every
authorized list is Tenant-scoped, deterministically ordered and explicit about
status/resource filters and current versus historical scope. Stable cursors are
used only where the existing boundary supports them; database offset/order is
not promoted to canonical contract. S3 must freeze each exposed list's exact
ordering, pagination and filtering behavior before route implementation.

## 15. B09, B10, B11, B12, B13 and B15 dispositions

### E17-R10-B09

- **Original requirement/problem:** Product API lacks common source, lineage,
  freshness and reconstruction metadata.
- **Repository evidence:** at baseline `8235c45`,
  `src/control-plane/product-api-client.ts` contains owner-specific projection
  interfaces while `src/http/responses.ts` supplies the common HTTP envelope;
  no shared administrative source metadata contract exists.
- **Canonical owner:** Product API projection layer, with source facts supplied
  by each canonical domain owner.
- **Required contract:** additive common projection metadata and exact
  CURRENT/EXACT/OBSERVED references under the existing response envelope.
- **Required behavior:** expose owner, Tenant, source version/digest, freshness,
  compatibility, reconstruction and redaction state without inventing history.
- **Mapped implementation slice:** S1; consumed by S2/S3 and proven in S4.
- **Acceptance evidence required:** contract tests for exact references,
  unavailable/partial/loss markers and secret-free serialization.
- **Disposition:** `READY_FOR_IMPLEMENTATION` after exact S1 CTO authorization.

### E17-R10-B10

- **Original requirement/problem:** Product API lacks one owner-routed
  administrative action/command contract.
- **Repository evidence:** baseline routes call several services directly and
  owner contracts differ; no common administrative descriptor/envelope or
  coordination seam is present under `src/control-plane/`.
- **Canonical owner:** each selected domain service owns validation and durable
  mutation; Control Plane owns coordination only.
- **Required contract:** server-evaluated action descriptor plus command
  envelope carrying actor, Tenant, authority basis, purpose, CAS/idempotency and
  correlation.
- **Required behavior:** route exactly once to one owner, repeat owner checks,
  preserve owner transaction/Event/Evidence behavior and return a safe receipt.
- **Mapped implementation slice:** S1 contract and S2 coordination seams.
- **Acceptance evidence required:** owner-reuse, CAS conflict, same-key retry,
  lifecycle denial, Tenant denial and no-direct-repository tests.
- **Disposition:** `READY_FOR_IMPLEMENTATION` after S1 then S2 CTO authorization.

### E17-R10-B11

- **Original requirement/problem:** `SystemConfigurationView` is an operational
  read model and cannot own Global Settings.
- **Repository evidence:** baseline
  `src/control-plane/product-api-client.ts` defines `SystemConfigurationView`
  and `getSystemConfiguration()` without a class-owned settings index or a
  separate canonical settings owner.
- **Canonical owner:** the existing owner of each configuration class.
- **Required contract:** read-only settings index entries containing class,
  owner, scope, source, applicability, precedence/attenuation, history link and
  available owner actions.
- **Required behavior:** unavailable when no owner is demonstrated; never
  aggregate, persist or universally override settings in Product API.
- **Mapped implementation slice:** S1 contract and S3 query exposure only if
  explicitly authorized.
- **Acceptance evidence required:** mixed-owner index tests, missing-owner
  unavailable state, no mutation/store and REQ-03 precedence preservation.
- **Disposition:** `READY_FOR_IMPLEMENTATION` as an index/projection only.

### E17-R10-B12

- **Original requirement/problem:** Product API lacks source-faithful
  administrative route families for accepted EPIC-17 domains.
- **Repository evidence:** baseline `src/http/routes/product-api-routes.ts`
  contains `/api/v1` Connection, Channel, Memory, Automation and Delegation
  reads, but no shared exact/observed administrative projection route contract
  and no Activation administrative detail route.
- **Canonical owner:** existing `/api/v1` route boundary plus each projected
  domain owner.
- **Required contract:** QUERY-only Automation current/exact, Delegation
  current/exact and Activation current/observed route families for S3. COMMAND,
  LIFECYCLE and ACTION routes require separate explicit authorization.
- **Required behavior:** authenticate, bind Tenant, validate exact references,
  call the S2 query seam and serialize only safe projections.
- **Mapped implementation slice:** S3.
- **Acceptance evidence required:** route-to-service integration, exact mismatch,
  cross-Tenant non-disclosure, redaction and no-side-effect tests.
- **Disposition:** `READY_FOR_IMPLEMENTATION` only after exact S3 CTO authorization;
  all route work remains HOLD in this freeze.

### E17-R10-B13

- **Original requirement/problem:** Control Plane UI has incomplete Memory,
  Delegation, Automation and Activation modules.
- **Repository evidence:** accepted REQ-12 assigns Flow -> Module -> Screen and
  Administration IA remediation to IMP-09; baseline Product API surfaces do not
  transfer this ownership to IMP-07.
- **Canonical owner:** IMP-09 Control Plane/IA boundary; IMP-07 owns only API
  readiness and explicit unavailable/error semantics.
- **Required contract:** safe API availability metadata and typed unavailable
  state, without navigation/module placement.
- **Required behavior:** keep UI implementation and B14 decision out of IMP-07.
- **Mapped implementation slice:** S3 API boundary; remaining UI work IMP-09.
- **Acceptance evidence required:** explicit unavailable behavior and proof that
  no Flow/Module/Screen code or IA decision entered IMP-07.
- **Disposition:** `ACCEPTED_DEFERRED` to IMP-09 after the bounded S3 API part.

### E17-R10-B15

- **Original requirement/problem:** Tenant-safe list, search, reference and
  history behavior is not proven consistently for future projections.
- **Repository evidence:** baseline HTTP code derives Tenant from
  `context.isolation.scope.tenantId` and checks membership, while owner-specific
  routes/tests have uneven list/history coverage.
- **Canonical owner:** existing HTTP Tenant/auth boundary plus every queried or
  commanded canonical owner.
- **Required contract:** consistent non-disclosing Tenant behavior and
  deterministic list/reference/history semantics per route family.
- **Required behavior:** never trust client Tenant alone; fail closed before
  projection; preserve exact-history mismatch and secret redaction.
- **Mapped implementation slice:** cross-cutting S1-S3 rules, closure in S4 and
  final cross-domain revalidation in IMP-10.
- **Acceptance evidence required:** foreign-Tenant list/detail/reference/history
  negatives, deterministic ordering/pagination, exact mismatch and serialized
  secret-exclusion tests.
- **Disposition:** `READY_FOR_IMPLEMENTATION` across authorized IMP-07 slices.

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

| Candidate | Why existing contract is insufficient | Canonical owner / consumer | Persistence and security impact | Compatibility impact / class |
| --- | --- | --- | --- | --- |
| Common projection metadata | Existing owner-specific projections lack one source/freshness/reconstruction shape | Product API projection layer / administrative clients | None; allowlisted server-side fields only | Additive under existing envelope / ADAPT |
| Action descriptor | Existing surfaces do not express owner-evaluated availability uniformly | Canonical command owner / Product API clients | None; grants no authority and exposes safe denial only | Additive advisory metadata / ADAPT |
| Command envelope | Existing routes do not carry one consistent actor/Tenant/CAS/idempotency/causation context | Control Plane coordination seam / canonical owner | None; secret material excluded and owner transaction retained | Additive application contract / EXTEND |
| Historical reference | Current owner contracts represent revisions and observations unevenly | Referenced canonical owner / query services | None; exact fingerprint/digest fails closed | Wraps existing refs without replacing them / ADAPT |
| Typed error mapping | Existing owner errors need stable safe transport meaning | Existing HTTP envelope / Product clients | None; internal/database detail redacted | Preserve existing codes where available / ADAPT |
| Global Settings index | `SystemConfigurationView` cannot express class ownership or history | Per-class owners / Administration navigation | None; no aggregate, table, store or override engine | New index projection only / EXTEND |
| Agent/Automation/Activation admin projections | Existing representations are lossy or inconsistent across current/exact/observed state | Existing domain owners / Product clients | None; safe metadata and redaction only | Existing legacy fields remain marked compatibility / ADAPT |
| Missing command seam | A valid owner-routed request may lack application coordination even when its owner service exists | Identified canonical owner / Product command adapter | None unless a stop condition is raised; direct repository access forbidden | NEW candidate only, bounded to coordination |

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
**Mapped contract deltas:** `E17-R10-CD01`, `CD02`, `CD03`, `CD12`,
`CD13`, `CD14` and `CD15`.
**Mapped ADR candidates:** `ADR-17-043` through `ADR-17-048` and
`ADR-17-050`, dispositioned only as relevant to S1.
**Dependencies:** accepted IMP-01 through IMP-06.
**Expected areas:** Product API contracts/projections and focused tests.
**Allowed implementation:** additive contracts and safe mapper conventions.
**Excluded:** routes, mutations, schemas, persistence, runtime, Genome and IA.
**PostgreSQL:** no new requirement; use existing owner acceptance only when a
contract test touches durable owner state.
**Schema impact:** NONE.
**Required tests:** exact-reference, field classification/redaction,
unavailable/loss metadata, command-envelope validation and settings-owner tests.
**Acceptance:** no duplicate owner, no secret fields, exact historical type,
class-owned settings index only, and documented compatibility markers.

### S2 — Owner-routed Control Plane administrative seams

**Purpose:** map each authorized command category to an existing canonical
service and add only missing coordination seams that preserve owner rules.

**Mapped blockers:** B10 and owner-specific parts of B09/B11.
**Mapped contract deltas:** `E17-R10-CD02` through `CD11`, plus `CD13` and
`CD15` where a seam returns a projection.
**Mapped ADR candidates:** `ADR-17-045`, `ADR-17-048` and `ADR-17-050`.
**Dependencies:** S1 accepted.
**Expected areas:** existing Control Plane services, Product API facade and
owner-specific tests.
**Allowed implementation:** coordination-only query/command adapters that
invoke exactly one owner.
**Excluded:** direct repository access, domain truth, schemas, admission,
execution, scheduler and provider ownership.
**PostgreSQL:** required for any durable mutation path where existing acceptance
infrastructure supports it.
**Schema impact:** NONE.
**Required tests:** owner reuse, no repository call, CAS, idempotency,
lifecycle/Tenant denial and canonical Event/Evidence behavior.
**Acceptance:** CAS, idempotency, lifecycle, Tenant and owner Event/Evidence
behavior are proven through the owner seam.

### S3 — Product API integration and availability boundaries

**Purpose:** integrate CTO-authorized query, command and lifecycle route
families under `/api/v1`, preserving auth, Tenant, redaction, response envelope,
compatibility and typed unavailable behavior.

**Mapped blockers:** B11, B12 and B13.
**Mapped contract deltas:** `E17-R10-CD04` through `CD15`. `CD16` and `CD17`
remain deferred to IMP-09.
**Mapped ADR candidates:** `ADR-17-043` through `ADR-17-048` and
`ADR-17-050`; `ADR-17-049` and `ADR-17-051` remain IMP-09 inputs.
**Dependencies:** S1 and any applicable S2 seam accepted.
**Expected areas:** `src/http/routes/product-api-routes.ts`, Product API facade,
projection mappers and integration tests.
**Allowed implementation:** only explicit CTO-authorized route categories.
**Excluded:** Control Plane Flow/Module/Screen work (IMP-09), routes for Genome
sources absent before IMP-08, Runtime/admission/execution and persistence.
**PostgreSQL:** required for durable command routes where their owner already
has PostgreSQL acceptance.
**Schema impact:** NONE.
**Required tests:** authenticated route integration, CURRENT/EXACT/OBSERVED,
Tenant non-disclosure, redaction, typed unavailable state and no query side
effects.
**Acceptance:** route integration reaches owner services only; cross-Tenant and
redaction behavior fail closed; unavailable source behavior is explicit.

### S4 — Conformance and closure

**Purpose:** complete cross-resource contract, security, historical, compatibility
and regression evidence.

**Mapped blockers:** B15 and closure evidence for B09-B13.
**Mapped contract deltas:** conformance disposition for `E17-R10-CD01` through
`CD15`; verify `CD16`/`CD17` remain deferred.
**Mapped ADR candidates:** closure trace for `ADR-17-043` through
`ADR-17-048` and `ADR-17-050`.
**Dependencies:** all authorized prior IMP-07 slices.
**Expected areas:** focused, integration, PostgreSQL where applicable, and full
regression evidence.
**Allowed implementation:** conformance fixes within previously accepted
contract scope.
**Excluded:** net-new resource families, Schema 13, IMP-08/IMP-09 scope.
**PostgreSQL:** existing Schema 12 acceptance for any durable owner path; no
new migration.
**Schema impact:** NONE.
**Required tests:** focused contract/service/routes, PostgreSQL where
applicable, full regression with causality, links and diff checks.
**Acceptance:** deterministic list/pagination where exposed; exact-history
behavior; non-disclosure; no secret/provider leakage; causality-classified full
regression.

The dependency order is acyclic: `S1 -> S2 -> S3 -> S4`, with S2 omitted for a
route family only when existing owner seams fully satisfy its command/query
needs.

The route decision is `YES`, limited to S3 QUERY families for Automation
current/exact, Delegation current/exact and Activation current/observed
administrative reads. No COMMAND, LIFECYCLE or ACTION route is authorized by
this freeze. Global Settings may be exposed only as a class-owned query index
if its exact S3 slice is separately authorized and can reuse demonstrated
owners.

The Control Plane service decision is `YES`, limited to coordination seams:
one read coordinator for source-faithful Automation, Delegation and Activation
queries, and owner-routed command adapters only where an existing canonical
service lacks an application-facing seam. Agent, Connection, Memory,
Delegation, Automation and Activation remain canonical owners; no service may
call a repository directly as a substitute for an owner.

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
| Links / paths | PASS |
| `git diff --check` | PASS |
| Functional implementation | NONE |
| Scope violation | NONE |

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
git diff --check: PASS
Scope violation: NONE
Stop condition: NONE

Recommendation:
READY FOR CTO SLICE AUTHORIZATION
```

CTO acceptance and an exact Slice authorization are required before any
functional implementation begins.
