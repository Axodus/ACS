# EPIC-17-IMP-02 — Final Closure Audit

## STATUS

`READY FOR CTO CLOSURE`

This audit follows Slice 3 and records the final implementation evidence. It
does not itself mark the milestone `CTO ACCEPTED`.

## VALIDATION BASELINE

- Baseline before Slice 3: `fd79c13179f23bc15ad481724d205618233ba2ab`.
- Build: PASS.
- Focused IMP-02/runtime/API tests: PASS, including 10/10
  `tests/epic-17-imp-02-effective-configuration.test.mjs` tests.
- PostgreSQL acceptance: PASS, 14 passed / 0 failed / 0 skipped, Docker
  PostgreSQL 17.6, schema version 7.
- Listener-capable full regression: PASS, 730 passed / 0 failed / 14 expected
  PostgreSQL URL skips.
- Restricted-sandbox diagnostic regression: 121 passed / 10 failed; every
  failure was independently reproduced as `listen EPERM` and classified C.
- `git diff --check`: PASS.

## ACCEPTANCE CRITERIA MATRIX

| # | Result | Evidence |
| --- | --- | --- |
| 1 | PASS | Class-specific resolver and deterministic snapshot tests. |
| 2 | PASS | Exact observation coverage, fingerprint validation and fail-closed tests. |
| 3 | PASS | IMP-01 Native seam and existing Agent revision/CAS/idempotency/Event tests. |
| 4 | PASS | Presentation class is projection-only; no Profile mutation or authority path. |
| 5 | PASS | Skill/capability display and authority-separation tests. |
| 6 | PASS | `GovernedProfileResource` persists as `legacy_capability_requirement_preset` evidence. |
| 7 | PASS | Provider/model evidence requires `authority_grant=false`; no grant is derived. |
| 8 | PASS | Product API read projection, Tenant filtering and typed unavailable/not-found behavior. |
| 9 | PASS | Existing intent JSON remains the single admitted snapshot owner; no dual write. |
| 10 | PASS | Docker PostgreSQL acceptance 14/14 and restart reconstruction. |
| 11 | PASS | Listener-capable full regression; no listener failures. |
| 12 | PASS | Full regression recorded faithfully: 730/0/14. |
| 13 | PASS | Blocker, delta and ADR matrices below. |
| 14 | PASS | Diff stays within authorized Slice 3 surfaces; no migration or new authority. |

## CONTRACT DELTAS

| ID | Disposition | Evidence |
| --- | --- | --- |
| E17-R03-CD01 | IMPLEMENTED | Versioned effective snapshot contract. |
| E17-R03-CD02 | IMPLEMENTED | Resolver, input and effective fingerprints. |
| E17-R03-CD03 | IMPLEMENTED | Snapshot bound to `RuntimeExecutionIntentV2`. |
| E17-R03-CD04 | IMPLEMENTED | Exact observations and unavailable outcome. |
| E17-R03-CD05 | IMPLEMENTED | Bounded per-class decision provenance and typed API errors. |
| E17-R03-CD06 | SATISFIED | Existing admitted generation retains its snapshot; new admission creates successor snapshot. |
| E17-R03-CD07 | IMPLEMENTED | Opaque provider/model evidence and secret-free validation. |
| E17-R03-CD08 | SATISFIED | Profile/preset excluded from grants and runtime authority. |
| E17-R04-CD01 | IMPLEMENTED | Exact per-kind observation guarantees. |
| E17-R04-CD02 | SATISFIED | No artificial revision stream; existing intent JSON is reused. |
| E17-R04-CD03 | IMPLEMENTED | Definition, requirement, support evidence and grant remain separate. |
| E17-R04-CD04 | SATISFIED | Tool refs require exact observed resource revision. |
| E17-R04-CD05 | DEFERRED | MCP connection/configuration semantics remain REQ-05. |
| E17-R04-CD06 | IMPLEMENTED | Provider/model pair observation and fingerprint are retained. |
| E17-R04-CD07 | SATISFIED | Legacy preset has explicit compatibility-only semantics. |
| E17-R04-CD08 | IMPLEMENTED | Missing history returns unavailable; no mutable-current fallback. |

## ADR MATRIX

| ADR | Final disposition | Decision implemented |
| --- | --- | --- |
| ADR-17-007 | SATISFIED | Class-specific resolution rules. |
| ADR-17-008 | SATISFIED | Immutable snapshot per admitted generation. |
| ADR-17-009 | SATISFIED | Agent head, revision and lifecycle remain separate. |
| ADR-17-010 | SATISFIED | Reconstruction reads snapshot evidence, never current state. |
| ADR-17-011 | SATISFIED | Exact resource revision/evidence semantics. |
| ADR-17-012 | SATISFIED | Requirement/support/grant separation. |
| ADR-17-013 | SATISFIED | Provider-neutral model observation without Model revision stream. |
| ADR-17-014 | SATISFIED FOR IMP-02 | Skill/Tool boundaries preserved; MCP implementation deferred to REQ-05. |
| ADR-17-015 | SATISFIED | Governed preset remains separate from Agent Profile. |

## BLOCKERS CONSUMED

| ID | Result | Evidence |
| --- | --- | --- |
| E17-R03-B01 | RESOLVED | Typed snapshot and provenance contract. |
| E17-R03-B03 | RESOLVED | Exact observations or unavailable. |
| E17-R03-B04 | RESOLVED | One resolver; presentation and preset cannot grant authority. |
| E17-R03-B05 | RESOLVED | Deterministic input/effective fingerprints. |
| E17-R04-B01 | RESOLVED FOR IMP-02 | Existing intent persistence is sufficient; no new history stream. |
| E17-R04-B02 | RESOLVED FOR IMP-02 | Skill/Tool/Capability/preset immutable observations. |
| E17-R04-B03 | DEFERRED BY ARCHITECTURE | MCP definition preserved; REQ-05 connection boundary untouched. |
| E17-R04-B04 | RESOLVED FOR IMP-02 | Provider/model exact observation and fail-closed resolution. |
| E17-R04-B05 | RESOLVED | Legacy preset cannot become Profile or capability authority. |
| E17-R04-B06 | RESOLVED | Product API exposes source-faithful snapshot/history reads. |
| E17-R10-B03 | RESOLVED FOR IMP-02 | Incomplete source is explicit in provenance/status. |
| E17-R10-B08 | RESOLVED | Durable effective snapshot is linked to the intent/Event chain. |
| E17-R11-B09 | RESOLVED FOR IMP-02 | Historical reconstruction is explicit and fail-closed. |

## REQ CONFORMANCE

### REQ-03

Conforms: class-specific effective configuration, immutable Tenant-bound
snapshot, deterministic fingerprints, historical reconstruction without mutable
current-state lookup, bounded provenance, and admitted-generation identity.

### REQ-04

Conforms: owner-specific resource evidence, no universal revision-stream
requirement, no authority escalation from support evidence, separate governed
preset semantics, and MCP deferral to the REQ-05 boundary.

## RECOVERY / RETRY / RE-ADMISSION

Existing Runtime and Assignment semantics are sufficient. An admitted intent
retains its immutable snapshot across retry/recovery. A changed configuration
does not mutate that intent; a new intended configuration is admitted as a new
generation with a successor snapshot. IMP-03D recovery tests and PostgreSQL
restart acceptance provide the evidence.

## PERSISTENCE / MIGRATION

```text
schema changes required: NO
migration required: NO
new tables required: NO
existing persistence reused: RuntimeExecutionIntentV2 JSON and existing
Event/outbox/Run evidence storage
```

No migration authority was consumed.

## SECURITY / TENANT / MCP BOUNDARY

Product API is read-only for this projection. Snapshot scope is checked against
the request Tenant. Provider/model availability and historical evidence do not
grant permission, credentials, capability authority or execution authorization.
MCP endpoint/configuration/Connection/Credential work remains deferred by
architecture.

## GATE REPORT

```text
STATUS:
EPIC-17-IMP-02
READY FOR CTO CLOSURE

DEPENDENCIES:
IMP-01 COMPLETE / CTO ACCEPTED
CAS AVAILABLE
Idempotency AVAILABLE
Canonical Events AVAILABLE
PostgreSQL acceptance PASS
Listener-capable regression PASS

BLOCKERS:
E17-R04-B03 DEFERRED BY ARCHITECTURE to REQ-05; all other consumed blockers
resolved for IMP-02

CONTRACT DELTAS:
16 total: 15 implemented/satisfied, 1 deferred by architecture

ADR CANDIDATES:
9 total: 9 satisfied for IMP-02; ADR-17-014 retains MCP deferral

MIGRATION:
NO

PLANNED SURFACES:
Native effective-configuration resolver, existing RuntimeExecutionIntentV2
durable path, Product API client/routes, focused tests and implementation docs

TEST PLAN:
Build PASS; focused Slice 3 PASS; PostgreSQL 14/14 PASS; listener-capable full
regression 730/0/14; restricted-sandbox failures independently classified C=10

ACCEPTANCE CRITERIA:
14/14 PASS

RISKS:
MCP connection semantics remain future REQ-05 work; no current risk requires
new persistence or Runtime redesign

DECISIONS REQUIRED FROM CTO:
Accept or reject final IMP-02 closure. Preserve MCP as DEFERRED BY ARCHITECTURE.
```
