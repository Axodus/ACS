# Candidate EPIC-17-IMP-01 Charter

## Identity and decision state

**Title:** Canonical Agent Seam & Profile Compatibility
**Status:** `CANDIDATE / AWAITING CTO GO`
**Architecture dependencies:** `EPIC-17-REQ-01`, `REQ-02`, `REQ-03`, `REQ-10`,
`REQ-11` and `REQ-12 COMPLETE / ACCEPTED`
**Preconditions:** `E17-R12-B01` and `E17-R12-B02` closed by the CTO gate
**Implementation authority:** none until explicit CTO GO
**Migration authority:** none
**Production authority:** none

## Objective

Make the Native Agent contracts and durable lineage the only supported Agent
write authority while preserving bounded legacy compatibility. Add exact
head/lifecycle and Profile presentation provenance without creating another
Agent, Profile, Persona, lifecycle, persistence or API owner.

## Canonical result

```text
Product API mutation
  -> Governance/Tenant/idempotency checks
  -> canonical Native Agent command adapter
  -> AsyncNativeCoreRepository.advanceAgentLineage
  -> Agent head + immutable revision + canonical Event + outbox
     in one existing shared transaction

Product API read
  <- versioned source-faithful projection
  <- exact agent_id + revision + fingerprint

legacy AgentService / GovernedProfileResource
  -> compatibility input/projection only
  -> no canonical write and no capability grant
```

## Included work

1. **Canonical command seam.** Route create, update, create-revision,
   adopt/restore-revision, duplicate, archive and restore through one adapter
   that builds a valid `AgentDefinitionV2`, `AgentRevisionV2`, canonical Event,
   outbox and idempotency input. When Native Core is configured, no Product API
   mutation may write through `AgentService`.
2. **Lifecycle and history.** Extend the Agent event payload contract with the
   exact revision reference, head state, transition kind, actor/authority
   reference and presentation source. The event is committed by the existing
   Agent lineage transaction. Historical reads reconstruct post-cutover state
   from Native revisions and canonical Events; missing pre-cutover inputs return
   an explicit incomplete-history status.
3. **Compatibility projection.** Version the existing Product API Agent
   projection and attach source revision/fingerprint, projection version and
   completeness. Mapping is one-way from canonical Native state. Unsupported or
   lossy legacy input fails explicitly.
4. **Profile presentation.** Add optional Agent-owned headline, bio and
   description head state with no operational effect. Profile remains a
   read-only projection with exact source/provenance and no identity, aggregate
   or revision stream.
5. **Persona.** Treat existing `role_ref`, `instructions` and `constraints` as
   the structured Persona semantic view. Do not introduce a Persona entity,
   identifier, repository, lifecycle or separate contract shape in IMP-01.
6. **Legacy Profile preset.** Keep `GovernedProfileResource` as compatibility
   data, classify it explicitly as a legacy capability-requirement preset and
   remove its `capabilityIds` from effective granted capabilities. Presentation
   Profile cannot reference it as authority.
7. **Canonical consumers.** Adapt Agent deployment, readiness, composition and
   supported Workforce/execution seams to consume exact Native
   `AgentRevisionRef`. Existing Workforce, admission, Assignment, Run, Task,
   Attempt and Runtime ownership remains unchanged.
8. **Deletion.** Native ordinary DELETE remains unavailable. Legal erasure and
   retention are deferred; no immutable revision or admitted reference is
   physically removed by this IMP.

## Explicit exclusions

- effective configuration/snapshot resolver and general resource history
  (`IMP-02`);
- Connector, Memory, Delegation, Automation, Activation and Genome contracts;
- general Administration and Control Plane IA;
- new Agent/Profile/Persona aggregate, repository or service;
- parallel or version-bypassing Product API;
- raw credential, secret or Memory data in Agent state or projections;
- Workforce/Runtime contract redesign;
- external providers, OpenClaw scheduling/execution and production rollout.

## Proposed contract-delta dispositions

These dispositions become accepted only with CTO GO.

| Candidate | Proposed disposition in IMP-01 |
| --- | --- |
| `E17-R01-CD01` | `ACCEPT` — one Native command adapter under Product API. |
| `E17-R01-CD02` | `ACCEPT` — versioned, source-ref-bearing one-way projection. |
| `E17-R01-CD03` | `ACCEPT` — head/lifecycle snapshot in canonical Agent Event payload under the existing transaction. |
| `E17-R01-CD04` | `ACCEPT` — typed not-found, scope-denied, conflict and lineage-integrity outcomes. |
| `E17-R01-CD05` | `ACCEPT` — ordinary physical delete unavailable; legal erasure deferred. |
| `E17-R01-CD06` | `ACCEPT` — exact Native revision refs at supported consumers; no Runtime ownership change. |
| `E17-R02-CD01` | `ACCEPT` — Profile reserved for presentation; legacy resource labeled as compatibility preset. |
| `E17-R02-CD02` | `ACCEPT` — read-only Profile projection with exact provenance. |
| `E17-R02-CD03` | `ACCEPT` — optional Agent-owned presentation head fields with no operational effect. |
| `E17-R02-CD04` | `SATISFIED_BY_EXISTING_FIELDS` — Persona view uses `role_ref`, `instructions` and `constraints`; no new entity/shape. |
| `E17-R02-CD05` | `SPLIT` — display derives from exact current bindings here; catalog-history completion remains `IMP-02`. |
| `E17-R02-CD06` | `ACCEPT` — exact Agent/head/projection/source provenance for retained presentation. |
| `E17-R02-CD07` | `ACCEPT` — presentation Profile contributes no effective capability; compatibility preset grants nothing. |
| `E17-R02-CD08` | `ACCEPT` — revision/head/lifecycle sources remain distinct and missing history fails explicitly. |

## Proposed ADR dispositions

| ADR | Proposed disposition in IMP-01 |
| --- | --- |
| `ADR-17-001` | `ACCEPT` — Native Agent contracts and shared PostgreSQL lineage are sole canonical authority. |
| `ADR-17-002` | `ACCEPT` — exact head/lifecycle snapshot uses the existing canonical Agent Event stream, not a second lifecycle stream. |
| `ADR-17-003` | `ACCEPT` — one-way versioned compatibility, no dual write or destructive conversion. |
| `ADR-17-004` | `ACCEPT` — Profile is a projection; `GovernedProfileResource` is a legacy operational preset. |
| `ADR-17-005` | `ACCEPT_WITH_EXISTING_FIELDS` — Persona is a semantic view over accepted Agent revision fields. |
| `ADR-17-006` | `ACCEPT` — historical presentation requires exact revision/head/projection/source provenance. |

## Blockers consumed

IMP-01 must close all 11 inherited blockers in consolidated cause
`E17-R12-C01`:

```text
E17-R01-B01  E17-R01-B02  E17-R01-B03
E17-R02-B01  E17-R02-B02  E17-R02-B03  E17-R02-B04
E17-R03-B02
E17-R10-B01  E17-R10-B02
E17-R11-B03
```

It also consumes pre-IMP blockers `E17-R12-B01` and `E17-R12-B02` as entry
conditions. A blocker closes only when its named acceptance evidence passes; a
code change alone does not close it.

## Expected source surfaces

| Surface | Planned responsibility |
| --- | --- |
| `src/native-core/agent.ts` | Additive head/presentation and Agent event payload validation helpers; preserve revision fingerprint semantics. |
| `src/control-plane/shared-state/native-core-durable.ts` | Validate and commit exact Agent head/lifecycle event data through the existing transaction/event/outbox path. |
| `src/control-plane/product-api-client.ts` | Native command adapter, source-faithful Agent/Profile projections and explicit compatibility errors. |
| `src/http/routes/product-api-routes.ts` | Preserve existing routes while supplying actor, authority, idempotency and CAS inputs to the Native command path. |
| `src/http/control-plane-context.ts` | Compose the accepted Native Agent command dependency without another service owner. |
| `src/control-plane/agent-service.ts` | Retain bounded legacy compatibility; remove Profile-derived grant behavior from supported canonical composition. |
| `src/control-plane/composition-resources.ts` | Label the legacy Profile resource as an operational compatibility preset. |
| `src/control-plane/deployment-service.ts` and supported consumers | Replace integer/legacy Agent inputs with exact Native revision references through adapters. |
| `tests/` | New IMP-01 seam/PostgreSQL tests plus affected regression updates. |

The implementation may narrow this list. Adding another domain, persistence
owner or public API requires a charter amendment and CTO decision.

## Public contract and compatibility changes

- Keep `/api/v1/agents` as the only Agent application boundary.
- Preserve existing route purposes while mapping mutations to Native commands.
- Add versioned source metadata and explicit incomplete-history/error states.
- Require CAS and idempotency for mutation requests; duplicate keys with changed
  payload fail explicitly.
- Legacy payloads are accepted only through deterministic validated mapping.
  Unmapped operational fields are rejected rather than silently dropped.
- No raw Native repository payload, secret or private Memory content is exposed.

## Persistence and migration plan

**Planned schema migration:** `NONE`.

The accepted path reuses existing `acs_agents`, `acs_agent_history`,
`acs_native_events`, `acs_native_outbox` and durable idempotency tables. Exact
head/lifecycle/presentation state is added to the canonical Agent Event JSON
payload and committed atomically by `advanceAgentLineage`.

No old head state is fabricated. History before the first conforming event is
reported as incomplete. `record_kind='legacy'` rows remain untouched and are
never promoted or dual-written as `native_v2`.

If implementation proves that a schema change is required, work stops before
DDL. A charter amendment must specify additive migration, backfill limits,
PostgreSQL validation and rollback, then receive separate migration authority.

## Implementation sequence

1. Freeze typed command, event payload, projection, error and compatibility
   contracts in tests.
2. Add Native command construction and validation without enabling routes.
3. Switch existing Agent mutations to the single Native command path.
4. Add lifecycle/Profile history and source-faithful reads.
5. Remove Profile-derived capability grants and adapt exact-ref consumers.
6. Run focused, PostgreSQL, full-suite and boundary checks.
7. Record blocker/delta/ADR disposition and implementation evidence in one
   IMP-01 report and commit.

## Required validation

### New focused evidence

- root create and successor CAS; duplicate idempotency and conflicting payload;
- immutable revision/fingerprint and exact canonical Event/outbox correlation;
- archive/restore/adopt/duplicate transitions and physical-delete rejection;
- exact post-cutover head/lifecycle/Profile reconstruction;
- explicit pre-cutover incomplete-history response;
- Native reads and writes with no `AgentService` mutation;
- Profile and legacy preset grant no capability or authority;
- Persona changes advance Agent revision while presentation-only changes do not
  alter operational semantics;
- Tenant denial/non-disclosure and typed Product API errors;
- deployment/readiness/composition consumers receive exact revision refs;
- rollback disables mutation instead of restoring legacy canonical writes.

### Commands

```bash
npm run build
node --test tests/epic-17-imp-01-agent-seam.test.mjs
node --test tests/agent-crud-composition.test.mjs tests/s17-deployment.test.mjs tests/s20-http-integration.test.mjs tests/s25-composition.test.mjs
ACS_SH_DATABASE_URL=<disposable-postgresql> node --test tests/epic-17-imp-01-agent-seam-postgres.test.mjs tests/acs-v2-imp-01b.test.mjs tests/acs-v2-val-01-postgres.test.mjs
ACS_RUNTIME_DATABASE_PATH=<temporary-runtime.sqlite> npm run test
npm run check
git diff --check
```

Exact totals, failures and skips must be recorded. PostgreSQL skips are not
passes. A failing baseline cannot be described as green.

## Acceptance criteria

1. Every supported Product API Agent mutation has exactly one Native write.
2. No successful mutation writes through both Native and legacy repositories.
3. Every canonical boundary uses `agent_id + revision + fingerprint`.
4. Head/lifecycle/presentation Events are exact, deterministic and committed
   atomically with revision, outbox and idempotency state.
5. Historical reconstruction never substitutes current head state for missing
   source history.
6. Profile has no identity, aggregate, revision stream or operational effect.
7. Persona has no independent owner and behavior remains fingerprinted in the
   Agent revision.
8. `GovernedProfileResource.capabilityIds` grants no effective capability.
9. Legacy callers are either adapted through an explicit one-way boundary or
   fail with a typed compatibility error.
10. Ordinary Native physical delete remains unavailable.
11. Workforce, admission, Run/Task/Assignment/Attempt and Runtime contracts
    remain backward compatible and authoritative.
12. Tenant, authority, secret and provider-independence tests pass.
13. All 11 `E17-R12-C01` blockers and 14 delta/6 ADR candidates have exact
    evidence-backed final disposition.
14. Full and PostgreSQL validation pass under the accepted baseline.
15. The diff contains only the accepted IMP-01 scope.

## Rollback

Rollback stops or disables Native Agent mutation while preserving committed
Native history, Events and outbox records. It may restore the previous read
projection through the versioned adapter, but it cannot re-enable legacy writes
as canonical, rewrite immutable history, fabricate missing head state or delete
new records. A failed cutover remains fail-closed until corrected or rolled
forward.

## Decision requested

```text
EPIC-17-IMP-01: GO
```

authorizes only this charter after both pre-IMP blockers are explicitly closed.
Any narrower or broader decision must name the changed scope and blocker
disposition.
