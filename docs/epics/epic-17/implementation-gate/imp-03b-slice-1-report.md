# EPIC-17-IMP-03B — Slice 1 Contract Report

**Status:** `IMPLEMENTED / ACCEPTANCE PENDING`  
**Authority consumed:** Native Core contracts and tests only  
**Schema / migration:** unchanged; schema 9 remains `CANDIDATE / HOLD`  
**Runtime / Product API / repository:** unchanged

## Implemented boundary

Slice 1 adds [native Memory contracts](../../../../src/native-core/memory.ts) and
exports them through the Native Core index. It does not add a Store, repository,
durable write, retrieval engine, Event-envelope mutation, Product API route,
runtime integration, Agent/Workforce schema change or migration.

The contracts provide:

- `MemoryPolicyHeadV1` and immutable `MemoryPolicyRevisionV1`, using the
  existing generic `policy` `RevisionRef` seam used by Agent;
- explicit Tenant-bound references and scope contracts for Working, Agent,
  Workforce Shared and Knowledge-backed Memory;
- immutable, content-reference-bearing `MemoryRecordV1` identities with
  different successor identities linked through `predecessor_ref`;
- content-free `MemoryTombstoneV1` with only policy-permitted digest retention;
- `MemoryPolicyAccessDecisionV1`, which carries policy/authority/provenance
  inputs but rejects capability, credential, delegation and execution-authority
  fields;
- fail-closed User Context rejection with `USER_CONTEXT_MEMORY_DEFERRED`.

The accepted Event subjects `memory_policy` and `memory_record` are recorded in
the gate documents only. The Event envelope/store was intentionally not changed
because Slice 1 emits no canonical Memory Event.

## Contract evidence

| Required property | Evidence |
| --- | --- |
| Exact Policy revision/fingerprint | `MemoryPolicyRevisionV1.ref` is an existing `policy` `RevisionRef`; fingerprint derives from immutable semantic content. |
| Policy successor history | Policy revision 2 must name revision 1 through `supersedes_revision`; no current head storage was introduced. |
| Stable Memory identity | `MemoryRecordRefV1` binds `memory_id`, `tenant_id` and fingerprint. |
| Immutable content evolution | A changed record is a new identity with a different fingerprint and `predecessor_ref`; no `MemoryRecordRevision` was added. |
| Explicit Tenant/type/scope | Every record, Policy ref and scope is Tenant-bound; type and scope kind must match. |
| Agent/Workforce references without ownership | Scope holds only Tenant-bound Agent or exact Workforce revision references. |
| Knowledge reference without ownership transfer | Knowledge-backed scope needs exact Knowledge revision and fingerprint. |
| Content-free tombstone | Tombstone rejects `content`, `content_ref`, raw content, embedding and vector fields; retained digest requires `policy_permitted`. |
| No authority escalation | Decision contracts reject capability, credential, delegation and execution-authority fields. |

## Validation

| Command | Result |
| --- | --- |
| `npm run build` | `PASS` |
| `node --test tests/epic-17-imp-03b-slice-1-memory-contracts.test.mjs` | `PASS` |
| `ACS_ENVIRONMENT=local npm run check` | `127 pass / 10 fail` |
| PostgreSQL acceptance | Not run: Slice 1 touches no durable path. |

## Regression causality — September 13, 2026

| Classification | Count | Evidence |
| --- | --- | --- |
| A — caused by Slice 1 | 0 | `memory.ts` is pure Native Core validation and the new focused suite passes; no failing surface imports a Memory runtime, repository, Product API or migration path. |
| B — independent real regression | 0 in this run | The previously tracked production-profile SQLite typed-error debt did not reproduce under this local run. It is not reclassified as resolved. |
| C — environment / harness | 10 | All failures are listener/process acceptance surfaces. Representative direct runs prove `listen EPERM` on `127.0.0.1` or `0.0.0.0` before application logic. |
| D — indeterminate | 0 | Each failure is attributable to the restricted listener boundary. |

C surfaces: `acs-v2-imp-03e`, `s48`, `s50`, `s51`, `s52`, `s54`, `s55`,
`s56`, `s57` and `s77`. `acs-v2-imp-03e` executes four non-listener assertions
successfully before the listener test fails. `s77` executes its unauthenticated
external-bind rejection before later listener tests fail. The other eight suites
contain a listener boundary as their first unavailable external/process surface.

The accepted prior baseline of `B=3 / C=9` remains technical debt context. Its
three B failures were not exercised in this `ACS_ENVIRONMENT=local` result;
absence in one run does not resolve them.

## Documentation reconciliation

The implementation-gate index now records Gate Preparation `COMPLETE / CTO
ACCEPTED`, Slice 1 `IMPLEMENTED / ACCEPTANCE PENDING`, closed IMP-03A, approved
Memory Event vocabulary with deferred envelope work, and schema 9 hold status.
ADR-021 is recorded as decided for Slice 1. ADR-023 remains required before a
migration because physical content residence is deliberately unresolved.

## Acceptance decision requested

Slice 1 is ready for CTO review. No schema-9, persistence, runtime, Product API,
Event-envelope or Slice-2 work should begin until CTO accepts this contract
boundary and separately reviews the physical schema design.
