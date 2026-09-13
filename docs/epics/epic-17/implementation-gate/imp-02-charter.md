# EPIC-17-IMP-02 — Implementation Gate Charter

## STATUS

`AUTHORIZED / GO`

**Planning/documentation authority:** granted
**Implementation authority:** granted for IMP-02 only
**Migration authority:** none
**Baseline commit:** `db642f5b9fbf9f932ee975da08d0cdfd567c23a4` (2026-09-13)

## MISSION

Prepare the bounded implementation package for the second REQ-12 candidate
milestone: typed, class-specific effective configuration, immutable admitted
execution snapshots, and only the governed-resource history or immutable
observation contracts required to reconstruct those snapshots.

This charter consumes the accepted REQ-03 and REQ-04 direction after IMP-01's
completed Native Agent seam. Profile and Persona are completed dependencies and
mandatory non-regression boundaries, not IMP-02 implementation scope.

## DEPENDENCIES

| Dependency | Current evidence | Gate disposition |
| --- | --- | --- |
| IMP-01 Native Agent seam | `ProductApiClient.#nativeMutateAgent` builds `AgentDefinitionV2`, `AgentRevisionV2`, CAS/idempotency input, Event and outbox command for `advanceAgentLineage`. | `COMPLETE / CTO ACCEPTED`; reusable dependency. |
| Canonical CAS/idempotency/events | Native durable repository and VAL-01 record PostgreSQL CAS, idempotency and Event/outbox behavior. | Available as reusable owner/convention. |
| PostgreSQL acceptance harness | `npm run acceptance:postgres` builds and runs `scripts/acs-postgres-acceptance.mjs`. | `ACS-BLOCKER-021 RESOLVED / CTO ACCEPTED`; reusable durable acceptance owner. |
| Full regression environment | Listener-capable regression completed `720 passed / 0 failed / 14 legitimate skips`. | `ACS-BLOCKER-022 RESOLVED / CTO ACCEPTED`; required environment for listener cases. |
| IMP-01 completion | Canonical Agent seam, Profile/Persona boundary and lifecycle history are completed. | `COMPLETE / CTO ACCEPTED`; IMP-02 dependency satisfied. |

## CURRENT STATE

### Profile, Persona and legacy-profile discovery

| Surface | Current owner/persistence | Mutation path | Read path | Canonical target owner | Compatibility requirement |
| --- | --- | --- | --- | --- | --- |
| Legacy Profile catalog | In-memory `CompositionResourceRegistry`; `GovernedProfileResource` has integer `revision`, `capabilityIds`, display metadata. No durable Profile store found. | No Product API Profile mutation route. | `CompositionResourceService`, `ProductApiClient.listProfiles/getProfileDetail`, `GET /api/v1/profiles`. | Legacy composition preset only; not Agent Profile. | Preserve read-only catalog consumers until REQ-04 preset disposition/cutover is authorized. |
| Product API Profile summary | Synthetic mapper `ProductApiClient.#profileSummary`; description, OpenClaw flags and sections are fixed values. | None. | Same GET routes; Control Plane catalog consumers. | Versioned projection assembled by Product API from canonical sources. | Existing route purpose and typed not-found behavior remain available; no new Profile authority endpoint. |
| Legacy Agent profile reference | `AgentDefinition.profileId/profileRevision` in legacy AgentService input/history. | Agent create/update payload accepted by Product API route parser; reference validation goes through composition registry. | Composition and Agent detail projection. | Compatibility input only. | No new write or dual truth; an unmappable reference must fail explicitly after a future cutover. |
| Persona | `AgentRevisionV2.role_ref`, `instructions`, and `constraints`; fingerprinted by `fingerprintAgentRevisionV2`. | Native Product API Agent command creates an immutable next revision using CAS/idempotency/Event/outbox. | Native Agent revision projection. | Canonical Agent revision. | No Persona entity, Profile field, separate API or revision stream. |
| Displayed skills/capabilities | Agent revision exact `skill_refs`/requirements and catalog display metadata; legacy UI composition maps effective capability sources. | Agent command changes canonical requirements/bindings only. | Agent composition/detail and future Profile projection. | Canonical binding/catalog owner; Profile is derived display only. | A display entry cannot grant a skill, permission, tool, credential or delegation authority. |
| Presentation metadata/assets | Current Agent name is head state. Headline/bio/description and durable presentation state are not proven; assets are REQ-11/IMP-08. | None. | Current Profile summary is synthetic. | To be decided only if a real presentation persistence requirement is demonstrated. | Do not add a Profile aggregate, revision stream, table or service in IMP-02. |
| Deployment/readiness/composition | Legacy composition has `profileId/profileRevision`; readiness has unrelated adapter-profile terminology. | Existing Agent configuration path. | Deployment/readiness/composition views. | Exact canonical Agent revision plus REQ-03 admitted snapshot. | Keep the names semantically separate; presentation Profile never affects deployment/readiness. |

### Authority findings

`GovernedProfileResource` remains an operational composition-preset candidate,
not an Agent presentation Profile and not a capability grant. Current
`AgentService.compose` excludes its `capabilityIds` from effective capabilities;
Product API still exposes its legacy catalog summary. That separation must be
preserved, then resolved only through the accepted REQ-04 resource-history work.

Profile presentation has no current persistence owner. A future headline/bio/
description requirement must first prove why Agent-owned head state or a derived
projection is insufficient. Any new persistence is outside this charter and
requires a CTO migration decision.

## TARGET STATE

```text
Canonical Agent revision/head + exact governed resource refs/observations
  + class-specific admission rules
  -> deterministic effective configuration
  -> immutable fingerprinted execution snapshot
  -> existing binding / intent / Run evidence chain
  -> Product API source-faithful projection
```

Profile remains a read-only presentation projection. Persona remains Agent
revision semantics. Displayed skills/capabilities are source-labeled projections
of exact accepted bindings and never inputs to authority resolution.

## CANONICAL OWNERSHIP

| Concern | Owner | IMP-02 rule |
| --- | --- | --- |
| Stable identity and lifecycle head | `AgentDefinitionV2` | Reuse only; do not create another Agent model. |
| Behavioral Persona | `AgentRevisionV2` | Reuse revisioned `role_ref`, `instructions`, `constraints`; mutation stays on Native seam. |
| Presentation Profile | Product API projection from Agent-owned presentation sources and canonical bindings | Read-only; no identity, grants, permissions, credentials or runtime authority. |
| Effective configuration | Admission/resolution owner defined by REQ-03 | Class-specific resolution; no universal override chain or second resolver. |
| Execution snapshot | Existing binding/intent/Run evidence chain | Immutable and fingerprinted per admitted generation. |
| Resources/history | Each resource/catalog owner | Add only proven per-kind history or immutable observations; do not create a universal resource aggregate. |
| Legacy `GovernedProfileResource` | Compatibility composition resource | Preserve semantic separation; no absorption into Profile. |

## SCOPE

1. Freeze typed effective-configuration and immutable execution-snapshot
   contracts for the REQ-03 class matrix.
2. Specify the exact Native Agent revision/head/lifecycle source references
   consumed by admission and explicit unavailable/incomplete-history outcomes.
3. Define only the REQ-04 owner-specific resource-history or immutable
   observation deltas necessary for deterministic snapshot reconstruction.
4. Version Product API configuration/snapshot projections, typed errors,
   Tenant filtering and compatibility mapping without a parallel API.
5. Preserve Profile/Persona ownership and prove that display-only projections
   cannot alter capabilities, permissions, credential authority or runtime
   admission.

## NON-GOALS

- Memory, Delegation, Automation, Activation, Channel, Genome, NFT semantics,
  Genome inheritance/mutation, new capability authority, Workforce, Runtime,
  Agent identity, and IMP-03+;
- a Profile aggregate, Profile revision stream, Profile table/database/service,
  Profile mutation endpoint, or presentation asset storage;
- a general MCP implementation, Connector/credential redesign, provider
  registry replacement, migration, production rollout, or dual canonical write.

## BLOCKERS CONSUMED

These blockers are consumed as planned work only. None is resolved by this
charter.

| ID | Source REQ | Problem / affected surface | Proposed IMP-02 resolution | Acceptance evidence |
| --- | --- | --- | --- | --- |
| `E17-R03-B01` | REQ-03 | Generic runtime intent configuration/provenance | Typed snapshot contract and source graph | deterministic serialization/fingerprint/restart |
| `E17-R03-B03` | REQ-03 | Resource catalogs lack immutable history | Per-kind owner rules | unavailable-source and exact-reference tests |
| `E17-R03-B04` | REQ-03 | Legacy consumers/Profile could compete in resolution | one resolver; exclude presentation and unresolved preset authority | no dual resolver/grant test |
| `E17-R03-B05` | REQ-03 | `plan_fingerprint` equivalence unproven | define fingerprint relationship | mismatch and reconstruction tests |
| `E17-R04-B01` | REQ-04 | Only Role proves durable history | add only necessary owner-specific history | PostgreSQL/restart/CAS evidence |
| `E17-R04-B02` | REQ-04 | Skill/Tool/Capability/Profile static revisions lack history | inventory and exact observation/history contract | source fidelity tests |
| `E17-R04-B03` | REQ-04 | MCP definition catalog absent | fail closed / defer connection semantics | no invented MCP authority |
| `E17-R04-B04` | REQ-04 | Provider/model observations not immutable | snapshot observation/digest contract | digest provenance/reconstruction |
| `E17-R04-B05` | REQ-04 | Legacy Profile union can look like a grant | preserve preset separation and exclude it from grants | no Profile capability authority |
| `E17-R04-B06` | REQ-04 | Product API IDs lose revisions/fingerprints | versioned source-faithful mapping | compatibility projection tests |
| `E17-R10-B03` | REQ-10 | Uneven resource lineage | expose explicit source completeness | typed Product API status |
| `E17-R10-B08` | REQ-10 | No typed durable effective snapshot | implement approved snapshot seam | admission/Run linkage tests |
| `E17-R11-B09` | REQ-11 | Agent head/Profile/resource history gaps | explicit incomplete reconstruction, no current-state substitution | historical negative cases |

## CONTRACT DELTAS

| ID | Current contract | Target contract | Surface | Compatibility / validation |
| --- | --- | --- | --- | --- |
| `E17-R03-CD01` | Untyped runtime configuration | Versioned effective snapshot/reference | admission, Product API | schema validation |
| `E17-R03-CD02` | No resolver identity/fingerprint | resolver/schema/class/input/effective fingerprints | resolver/snapshot | deterministic hash |
| `E17-R03-CD03` | Binding/intent lack snapshot identity | exact snapshot link | binding/intent/Run evidence | restart reconstruction |
| `E17-R03-CD04` | Head/lifecycle history incomplete | explicit observation/source status | historical reads | no current-state substitution |
| `E17-R03-CD05` | Generic provenance | per-class decision/attenuation/rejection provenance | snapshot/API errors | typed denial cases |
| `E17-R03-CD06` | Retry refresh unstated | reuse same snapshot per admitted generation | recovery | re-admission test |
| `E17-R03-CD07` | Credentials/availability risk nondeterminism | opaque decision/version/evidence refs | snapshot | secret-redaction test |
| `E17-R03-CD08` | Legacy Profile can inject capability | exclude presentation Profile/preset from grants | composition/resolver | authority-preservation test |
| `E17-R04-CD01` | Uneven resource refs/history | common exact-reference guarantees | resource owners | owner-specific tests |
| `E17-R04-CD02` | Durable history only for Role | additive per-kind history where justified | persistence | PostgreSQL gate if durable |
| `E17-R04-CD03` | Definition/requirement/Evidence/grant blur | separate projection/resolution roles | resolver/API | no-grant test |
| `E17-R04-CD04` | Tool version/policy incomplete | Tool spec/source/version refs | Tool owner | exact-ref test |
| `E17-R04-CD05` | MCP boundary absent | definition boundary only | resource contracts | fail-closed test |
| `E17-R04-CD06` | Model catalog dynamic | exact selected observation/digest | snapshot | provenance test |
| `E17-R04-CD07` | Legacy Profile preset ambiguity | explicit preset disposition or later retirement | compatibility | semantic-separation test |
| `E17-R04-CD08` | Fallback history vague | versioned decisions, fail closed | compatibility/history | missing-history test |

## ADR CANDIDATES

| ADR | Disposition for IMP-02 |
| --- | --- |
| `ADR-17-007` class-specific resolution | REQUIRED BEFORE IMPLEMENTATION |
| `ADR-17-008` immutable snapshot per admitted generation | REQUIRED BEFORE IMPLEMENTATION |
| `ADR-17-009` revision/head/lifecycle separation | REQUIRED BEFORE IMPLEMENTATION |
| `ADR-17-010` reconstruct from snapshot, not current state | REQUIRED BEFORE IMPLEMENTATION |
| `ADR-17-011` resource exact revision semantics | REQUIRED BEFORE IMPLEMENTATION |
| `ADR-17-012` capability requirement/support/grant separation | REQUIRED BEFORE IMPLEMENTATION |
| `ADR-17-013` provider-neutral model identity/dynamic Evidence | REQUIRED DURING IMPLEMENTATION |
| `ADR-17-014` Tool/Skill/MCP boundaries | REQUIRED BEFORE IMPLEMENTATION |
| `ADR-17-015` legacy Profile preset disposition | REQUIRED BEFORE IMPLEMENTATION |

## PLANNED IMPLEMENTATION SURFACES

| Group | Expected modules/files |
| --- | --- |
| Domain | `src/native-core/agent.ts`, `src/native-core/runtime.ts`, `src/native-core/primitives.ts` |
| Repository | `src/control-plane/shared-state/native-core-durable.ts`, `src/control-plane/shared-state/migrations.ts` only if separately authorized |
| Product API | `src/control-plane/product-api-client.ts`, `src/http/routes/product-api-routes.ts`, `src/http/control-plane-context.ts` |
| Compatibility | `src/control-plane/agent-service.ts`, `src/control-plane/composition-resources.ts`, exact legacy consumer adapters |
| Control Plane / UI | Existing Product API consumers only after API projection is frozen; no new UI flow is authorized by this charter |
| Tests | focused IMP-02 contract/resolver/PostgreSQL suites plus impacted Agent/composition/HTTP/regression tests |
| Documentation | this charter, ADR/delta/blocker disposition and acceptance report |

## PERSISTENCE / MIGRATION IMPACT

```text
schema changes required: NO (at this gate)
migration required: NO
new tables required: NO
existing tables reused if approved: acs_agents, acs_agent_history,
acs_native_events, acs_native_outbox, acs_native_idempotency and existing
binding/intent/Run evidence storage
```

If the frozen contract proves existing persistence insufficient, stop before
DDL. Return an exact additive schema delta, table/column/index ownership,
backfill/cutover/rollback plan, PostgreSQL evidence plan, and a request for CTO
migration authority. No migration is authorized here.

## SECURITY / TENANT BOUNDARIES

All read and mutation paths remain Product API-mediated, authenticated and
Tenant-scoped. Snapshot inputs require an explicit actor, authority basis,
policy/approval applicability, purpose, target, freshness, CAS/idempotency and
correlation. References and display metadata never become authority. Credentials
remain opaque references; raw secrets, private Memory and provider prompts are
excluded from snapshots, Profile and errors. Tenant-safe list/detail/history
queries must not disclose cross-Tenant source identifiers.

## COMPATIBILITY STRATEGY

Keep existing Profile GET routes as read-only legacy catalog compatibility until
a source-faithful projection is accepted. Preserve `profileId/profileRevision`
as legacy input only where deterministic mapping exists. Do not write both
legacy and Native representations. For unsupported historical resource content,
return a typed unavailable/incomplete-source result rather than a latest-value
substitute. `GovernedProfileResource` stays separate from Profile presentation.

## TEST PLAN

- Profile is projection-only; Profile mutation is unavailable and cannot grant
  capability, permission, credential, tool, delegation or runtime authority.
- Persona mutation uses the Native seam, creates an immutable canonical
  `AgentRevisionV2`, retains reconstructable history, Event and outbox links,
  CAS and idempotency behavior.
- Effective configuration resolves deterministically by class; snapshot
  fingerprints/serialization, retry/re-admission and missing-source behavior
  are explicit.
- Displayed skills/capabilities derive only from exact bindings/catalog
  metadata; `GovernedProfileResource` remains semantically separate.
- Product API projection, typed errors, Tenant isolation/non-disclosure and
  legacy compatibility mapping are covered.
- Durable changes, if separately authorized, run `npm run acceptance:postgres`
  with clean install/upgrade, restart, CAS/idempotency, Event/outbox rollback
  and Tenant isolation.
- Run listener-based cases in the established listener-capable environment.
  Restricted-sandbox `listen EPERM` is recorded as an environment limitation
  only after causal confirmation, never silently ignored.
- Run focused suites, affected regression, `npm run check`, `git diff --check`
  and the full regression; record exact pass/fail/skip counts.

## ROLLBACK

Disable new projection/command exposure or stop mutation fail-closed while
retaining canonical immutable revisions, Events and outbox records. A rollback
may restore a prior read projection but cannot restore legacy authoritative
writes, create dual writes, delete canonical Agent revisions or break existing
Profile GET consumers. If an approved durable cutover cannot safely return to a
single owner, stop new mutations and roll forward through a correction rather
than rewriting history.

## ACCEPTANCE CRITERIA

1. One class-specific resolver produces deterministic, fingerprinted snapshots.
2. Snapshot reconstruction uses exact source references/observations, never
   current/latest substitutions.
3. Native Agent Persona remains canonical revision behavior with CAS,
   idempotency, Events and outbox provenance.
4. Profile remains projection-only and has no authority effect.
5. Displayed skills/capabilities are derived only.
6. `GovernedProfileResource` remains an operational preset candidate and is not
   absorbed into presentation Profile.
7. No resource reference, availability signal or projection becomes a grant.
8. Tenant isolation and typed errors cover list/detail/history/resolution.
9. Compatibility has one authoritative owner and no dual canonical write.
10. Any durable change passes disposable PostgreSQL acceptance and restart
    reconstruction.
11. Listener cases are evaluated in a listener-capable environment.
12. Full regression result is recorded faithfully; it is not called green if it
    fails.
13. Every listed blocker, delta and ADR has an evidence-backed final
    disposition.
14. The diff remains within authorized IMP-02 scope.

## RISKS

- Existing Profile API output is synthetic, and legacy catalog integer revisions
  do not prove durable historical content.
- Resource history may require migration; no migration authority exists.

## DECISIONS REQUIRED FROM CTO

None. The CTO accepted the scope, 16 deltas, ADR dispositions and the stop rule
for any proven persistence insufficiency. ADR-17-013 remains to be closed from
implementation evidence before its dependent code is finalized.
