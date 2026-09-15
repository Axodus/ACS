# EPIC-17 / IMP-10 — Readiness and Final Cross-Domain Conformance Gate

**Date:** 2026-09-15
**Status:** `COMPLETE / PENDING CTO REVIEW`
**Assessment authority:** readiness and final-conformance assessment only
**Implementation performed:** `NONE`

## EPIC-17 readiness

`IMP-01` through `IMP-09` are accepted. `IMP-09` is closed and published by
the CTO decision that accepted ADR-17-051 and closed
`E17-R10-B14` / `E17-R12-C12`.

The EPIC has no architectural, ownership, Product API, persistence, Runtime,
Admission or Genome gap. One current PostgreSQL acceptance assertion retains a
pre-IMP-09 Workforce tab label. It fails against the accepted IA vocabulary,
not against a missing or unsafe capability. Final EPIC closure therefore needs
a small test-conformance correction and revalidation before it can be
recommended.

## REQ-01 through REQ-12 final matrix

| REQ | Final status | Canonical owner | Implementing IMP | Source contract and acceptance evidence | Remaining gap |
| --- | --- | --- | --- | --- | --- |
| REQ-01 Agent identity, Profile and Persona | `SATISFIED` | Agent / Profile-Persona services | IMP-01 | Canonical Agent seam and lifecycle acceptance; focused IMP-01 tests pass. | None. |
| REQ-02 governed resources | `SATISFIED` | Resource domain services | IMP-02 | Tenant-bound resource observations and governed configuration acceptance. | None. |
| REQ-03 Effective Configuration | `SATISFIED` | Effective Configuration resolver | IMP-02 | Immutable, fingerprinted, reconstructable configuration snapshots. | None. |
| REQ-04 capabilities and provider configuration | `SATISFIED` | Capability and configuration owners | IMP-02 | Owner-routed configuration and provider/model boundaries. | None. |
| REQ-05 Connectors, Connections and Channels | `SATISFIED` | Connector / Connection / Channel services | IMP-03A | Schema and ingress/credential/channel acceptance evidence. | None. |
| REQ-06 Memory | `SATISFIED` for accepted bounded Memory scope | Memory Policy and governed Memory service | IMP-03B | Schema 9, encrypted governed contents, metadata-only API and tombstones. | User Context Memory remains `ACCEPTED DEFERRED`; it needs a separate human identity, consent and privacy authority. |
| REQ-07 Delegation | `SATISFIED` | Delegation domain service | IMP-04 | Exact revisions, attenuation, revocation and Tenant-bound reads. | None. |
| REQ-08 Automation | `SATISFIED` | Automation domain service | IMP-05 | Durable Automation identity, revisions, history and controlled handoff. | No new economics authority. |
| REQ-09 Activation and Admission | `SATISFIED` with accepted fail-closed/deferred paths | Activation / Admission services | IMP-06 | Occurrence identity, claims, fencing, recovery, attribution and admission handoff. | Cancellation-layer split and Usage/Cost correlation remain explicit accepted deferrals; unsupported Workflow path is rejected/fail-closed. |
| REQ-10 Product API, Administration and Control Plane | `SATISFIED` | Product API and canonical domain services | IMP-07, IMP-09 | One Product API, AdministrativeQueryService reads, owner-routed commands, class-owned settings, accepted eight-domain IA. | None. |
| REQ-11 Genome | `SATISFIED` for accepted descriptive scope | Agent-referenced Genome projection and Evidence/provenance owners | IMP-08, IMP-09 | Exact-history, descriptive, Agent-local GET projection with non-authoritative verification. | No licensing, economics, lineage, breeding, reputation authority or mutation surface. |
| REQ-12 cross-domain conformance | `PARTIALLY SATISFIED` | Cross-domain gate | IMP-10 | Blocker and architecture reconciliation is complete; focused tests and standalone validation pass. | `IMP10-GAP-01`: one stale PostgreSQL browser assertion must be aligned to accepted Workforce navigation vocabulary and rerun. |

## IMP-01 through IMP-09 acceptance matrix

| IMP | Final acceptance evidence | Final disposition |
| --- | --- | --- |
| IMP-01 | Agent seam, Profile/Persona lifecycle and focused tests | `COMPLETE / CTO ACCEPTED` |
| IMP-02 | Effective Configuration snapshots, fingerprints and Tenant binding | `COMPLETE / CTO ACCEPTED` |
| IMP-03A | Connectors, Connections, Channels and ingress boundaries | `COMPLETE / CTO ACCEPTED / PUBLISHED` |
| IMP-03B | Bounded governed Memory, Schema 9 and redacted metadata-only reads | `COMPLETE / CTO ACCEPTED / PUBLISHED` |
| IMP-04 | Delegation revisions, attenuation, revocation and Schema 10 | `COMPLETE / CTO ACCEPTED / PUBLISHED` |
| IMP-05 | Automation identity, revisions and history | `COMPLETE / CTO ACCEPTED / CLOSED` |
| IMP-06 | Activation, recovery, admission handoff and canonical Schema 12 | `COMPLETE / CTO ACCEPTED / CLOSED` |
| IMP-07 | One Product API and AdministrativeQueryService read coordination | `COMPLETE / CTO ACCEPTED / CLOSED` |
| IMP-08 | Descriptive Genome boundary and Agent-local read projection | `COMPLETE / CTO ACCEPTED / CLOSED` |
| IMP-09 | Eight-domain Control Plane IA, compatibility routing and source-faithful states | `COMPLETE / CTO ACCEPTED / CLOSED / PUBLISHED` |

## Cross-domain findings

| Invariant | Finding |
| --- | --- |
| Agent, Profile/Persona and Effective Configuration | Agent identity remains canonical; Profile/Persona and Effective Configuration retain their dedicated lifecycle and exact-revision semantics. |
| Governed resources and Connectors | Resource, Connector, Connection and Channel owners remain separate; no UI or administration owner was introduced. |
| Memory | Bounded Memory is governed and Tenant-bound. User Context Memory is not silently implied by the accepted scope. |
| Delegation, Automation and Activation | Delegation attenuation/revocation, Automation revision identity, and Activation occurrence/admission handoff compose through canonical services. No second authority path was found. |
| Product API and Control Plane | The Control Plane is a presentation client of one Product API. AdministrativeQueryService coordinates reads; canonical domain services own commands. No repository bypass or parallel administrative API was introduced. |
| Genome | Genome stays Agent-referenced, descriptive and read-only. Evidence/provenance and verification remain separate and non-authoritative. |
| Control Plane IA | The primary IA is Overview, Agents, Operations, Capabilities, Evidence, Economics, Governance and System. `/administration` is compatibility-only and has no independent owner. Flow → Module → Screen remains presentation hierarchy only. |

No dual ownership, duplicated identity, incompatible revision semantics, Tenant
boundary conflict, Evidence/provenance conflict, administrative bypass or
Runtime/configuration ambiguity was found in the accepted implementation
surfaces.

## Blocker reconciliation

The raw traceability table remains historical source evidence. This table gives
every inherited blocker an explicit final disposition by its consolidated cause.
An accepted deferred or rejected path is not an implicit open blocker.

| Cause and inherited blocker IDs | Final disposition | Basis |
| --- | --- | --- |
| `C01`: `R01-B01..B03`, `R02-B01..B04`, `R03-B02`, `R10-B01..B02`, `R11-B03` | `RESOLVED` | IMP-01 canonical Agent and presentation lifecycle closure. |
| `C02`: `R03-B01,B03..B05`, `R04-B01..B06`, `R10-B03,B08`, `R11-B09` | `RESOLVED` | IMP-02 Effective Configuration, governed resource and reconstruction closure. |
| `C03`: `R05-B01..B05`, `R10-B04` | `RESOLVED` | IMP-03A Connector / Connection / Channel closure. |
| `C04`: `R06-B01,B02,B04..B06`, `R10-B05` | `RESOLVED` | IMP-03B bounded governed Memory closure. |
| `C05`: `R07-B01..B04,B06`, `R10-B06` | `RESOLVED` | IMP-04 Delegation revision, attenuation and revocation closure. |
| `C06`: `R08-B01..B06`, `R10-B07` | `RESOLVED` | IMP-05 Automation closure, with Runtime authority retained by subsequent Activation boundary. |
| `C07`: `R09-B01..B10,B13` | `RESOLVED WITH EXPLICIT DEFERRED/REJECTED PATHS` | IMP-06 resolves supported Activation/Admission semantics. `R09-B09` is accepted deferred; `R09-B10` is rejected/fail-closed. |
| `C08`: `R07-B05`, `R08-B07,B08`, `R09-B11,B12` | `RESOLVED FOR SUPPORTED SUBJECTS; ACCEPTED DEFERRED ECONOMICS CORRELATION` | Delegation, Automation and Activation Evidence subjects are accepted. Usage/Cost correlation stays under Economics without a new ledger or authority. |
| `C09`: `R10-B09..B13`, `R11-B08` | `RESOLVED` | IMP-07 Product API / administrative read coordination and IMP-09 Control Plane projection closure. |
| `C10`: `R11-B01,B02,B04..B07,B10` | `RESOLVED WITH EXPLICIT SAFE DEFER` | IMP-08 closes descriptive trait, assertion, asset and verification scope. `R11-B10` remains safely deferred because performance does not become Genome reputation authority. |
| `C11`: `R06-B03`, `R07-B07`, `R10-B15`, `R11-B11` | `RESOLVED FOR IMPLEMENTED SURFACES; ACCEPTED DEFERRED FOR UNSCOPED HUMAN/FUTURE POLICY` | Tenant-safe implemented reads, redaction and non-disclosure are accepted. User Context Memory and future Genome consent/license/correction/deletion expansion remain excluded until separate ownership is accepted. |
| `C12`: `R10-B14`, `R11-B12` | `RESOLVED / CLOSED` | ADR-17-051 is accepted and effective. Administration is not primary IA or canonical owner; Governance and System are canonical presentation surfaces. |
| `R12-B01`, `R12-B02` | `RESOLVED` | Separate CTO implementation charters and status reconciliation were completed before implementation. |

There is one new final-gate issue, not an inherited architecture blocker:

| ID | Classification | Disposition |
| --- | --- | --- |
| `IMP10-GAP-01` | `IMP-09 CAUSAL / TEST CONFORMANCE` | `STILL BLOCKING FINAL EPIC CLOSURE` until the stale Workforce tab assertion is updated and the PostgreSQL acceptance run passes. |

## Persistence and schema conformance

`SHARED_STATE_SCHEMA_VERSION` is 12. Schema 9 (Memory), Schema 10
(Delegation), Schema 11 (Automation) and Schema 12 (Activation) form the
accepted migration lineage. Their canonical owners, Tenant boundaries,
revision/CAS rules, outbox or recovery expectations, and idempotency/fencing
boundaries remain in their domain implementations.

Schema 12 is canonical. No orphaned persistence concept, new aggregate,
migration or transaction boundary was found. Schema 13 is not required and is
not authorized.

## Product API and administration conformance

The application has one Product API. The standalone Control Plane uses its
Product API client rather than repositories or shared-state stores.
AdministrativeQueryService remains the read coordinator; canonical domain
services retain command ownership. Existing authentication and Tenant
enforcement precede administrative projections and commands.

No parallel Administration API, independent administration owner, generic
GlobalSettings aggregate or route-handler repository bypass was found.

## Runtime and Admission conformance

Automation describes governed intent and Activation supplies the recoverable
occurrence and admission handoff. Runtime remains downstream of that authority
chain. Configuration, delegation and resource resolution are not re-owned by
Runtime or the Control Plane. No Runtime or Admission change is required.

## Genome conformance

IMP-08 remains descriptive, Agent-referenced, exact-history aware and
read-only. The accepted Agent-local route consumes the existing Genome GET
projection. Evidence and provenance remain separate from verification, and
verification does not grant authority.

No Genome licensing, NFTs, economics, lineage economy, breeding, reputation
authority, mutation or Agentic Genetics dependency was found. The research
package remains non-normative and outside the EPIC dependency graph.

## Security conformance

The accepted surfaces preserve Tenant isolation, authentication, authorization,
redaction/non-disclosure, revision/CAS safety, idempotency and fencing where
the canonical domain requires them. Delegation attenuation and revocation are
kept in the Delegation domain. Administrative presentation does not grant
authority or disclose secret configuration/Evidence outside the existing
Product API boundary.

No cross-domain confused-deputy, cross-Tenant or secret-disclosure issue was
found. The final PostgreSQL browser assertion must still be corrected and
rerun before this assessment can certify the complete validation baseline.

## Validation baseline

| Command / evidence | Result | Classification |
| --- | --- | --- |
| `node --test tests/epic-17-*.test.mjs` | `36 pass / 0 fail` | PASS |
| Standalone `npm run typecheck` | PASS | PASS |
| Standalone `npm run build` | PASS | PASS |
| Standalone `npm test` | `16 pass / 0 fail` | PASS |
| Root `npm run acceptance:postgres` | `27 pass / 1 fail` | `IMP10-GAP-01` |
| Root `npm test` | `154 pass / 11 fail` | Ten listener failures are environmental (`listen EPERM`); the extra S39 billing-boundary failure passes in isolated rerun (`4 pass / 0 fail`) and is test-harness/concurrency variance. |
| Root build | PASS in the acceptance/regression runs | PASS |
| `git diff --check` | Pending after this documentation update | Required before commit |

`IMP10-GAP-01` is at `tests/acs-v2-val-03-postgres.test.mjs:478`. The test
expects a Workforce context-tab name of `Overview / List`; the accepted
IMP-09 IA deliberately exposes the canonical tab as `Overview` at the same
Workforce base route. The direct browser route and entity context remain
present. The assertion needs a stable canonical locator, preferably the
Workforce base `href` with its `aria-current` check, then a rerun of the
PostgreSQL acceptance test.

## Remaining gaps

One small conformance fix is required:

1. Update only the stale VAL-03 Workforce context-tab assertion to the accepted
   canonical UI vocabulary or its stable Workforce base route.
2. Rerun the PostgreSQL acceptance suite, focused UI routing tests and the
   relevant root regression evidence.

This is a tests-only adjustment. It must not change UI behavior, routes,
Product API contracts, persistence, Schema 12, Runtime, Admission, authority
or Tenant/authentication semantics.

## Architectural contradictions

None found. `IMP10-GAP-01` is a test expectation drift caused by an accepted
IMP-09 presentation terminology change, not an architectural contradiction.

## Decisions required from CTO

Authorize a bounded IMP-10 test-conformance slice for `IMP10-GAP-01`, or direct
that the accepted Workforce tab label be restored. The evidence supports
updating the stale test assertion because `Overview` is the accepted canonical
IA label.

## Decisions required from CEO

`NONE`.

## IMP-10 classification

**`B — SMALL CONFORMANCE FIX REQUIRED`**

No feature implementation, architecture change, Product API delta, persistence
change or CEO decision is required. Final EPIC-17 closure remains blocked only
until `IMP10-GAP-01` is corrected and revalidated.

## Recommended next action

CTO should authorize one test-only IMP-10 slice: align the Workforce tab
locator in `tests/acs-v2-val-03-postgres.test.mjs` with the accepted canonical
route/label, then rerun PostgreSQL acceptance and classify the existing
environmental root-suite failures without masking them.

**Implementation performed:** `NONE`
