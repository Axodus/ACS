# EPIC-17-IMP-07 S1 — Administrative Contracts & Safe Projection Foundations

**Status:** `READY FOR CTO ACCEPTANCE`
**Date:** September 15, 2026
**Baseline:** `8235c45c08c500f61d01447c9335aee29f9b2c39`
**Mapped requirement:** `EPIC-17-REQ-10`
**Schema:** `12 / unchanged`; Schema 13 is `NOT REQUIRED / NOT AUTHORIZED`
**Authority consumed:** S1 contracts, safe projection foundations, focused tests and documentation only

## Scope delivered

S1 adds a pure Control Plane administrative-contract module:

```text
canonical resource/history
  -> AdministrativeResourceRefV1
  -> AdministrativeProjectionMetadataV1
  -> createAdministrativeProjectionV1
  -> safe administrative projection
```

The module distinguishes three non-interchangeable source forms:

- `CURRENT` for a stable Tenant-scoped identity;
- `EXACT` for stable identity plus immutable revision and fingerprint; and
- `OBSERVED` for immutable observation/digest provenance.

`createAdministrativeProjectionV1` is an explicit allowlist. Only fields marked
`PUBLIC_APPLICATION` or `ADMIN_SAFE` enter the projection. It rejects
`SENSITIVE_REFERENCE_ONLY`, `INTERNAL_ONLY` and `SECRET` fields; validates
field names and values for secret material; limits values to scalars, scalar
lists and scalar records; and accepts typed opaque `EntityRef` references
separately. This prevents later internal fields from becoming Product-visible by
default.

The module also supplies typed `AdministrativeContractError` semantics for
invalid resource references, malformed projection metadata, duplicate fields,
non-projectable fields, unsafe values and Tenant-incompatible references.

## Files changed

| Path | Change |
| --- | --- |
| `src/control-plane/administrative-contracts.ts` | New pure administrative references, metadata, safe mapper and typed validation errors. |
| `src/index.ts` | Exports the S1 administrative contracts. |
| `tests/epic-17-imp-07-s1-administrative-contracts.test.mjs` | Focused contract and redaction tests. |
| `docs/epics/epic-17/implementation-gate/imp-07-s1-report.md` | This evidence record. |
| `docs/epics/epic-17/implementation-gate/README.md` | Discoverability link. |

The existing Architecture & Semantic Freeze remains unmodified in meaning and
continues to be the architecture source of truth.

## Required properties and evidence

| Requirement | Evidence |
| --- | --- |
| Current versus exact historical is distinct | `AdministrativeCurrentRefV1` and `AdministrativeHistoricalRefV1` require different addressing forms. |
| Historical references carry canonical identity | `EXACT` requires stable ID, Tenant, revision and SHA-256 fingerprint. |
| Invalid historical reference fails closed | Missing fingerprint and invalid revision fail through `AdministrativeContractError`. |
| Observed provenance is not represented as current state | `AdministrativeObservationRefV1` requires a digest and distinct `OBSERVED` addressing. |
| Projection is allowlist-oriented | Mapper accepts only `PUBLIC_APPLICATION` and `ADMIN_SAFE` classifications. |
| Internal additions are not automatically exposed | `INTERNAL_ONLY`, `SECRET` and `SENSITIVE_REFERENCE_ONLY` fail before projection construction. |
| Secrets and unsafe field names are excluded | Field name/value validation rejects `secret`, `api_key` and related secret-material shapes. |
| Raw nested domain/provider data is excluded | Values cannot contain nested objects beyond scalar records/lists. |
| Tenant mismatch fails closed | A reference carrying a conflicting Tenant is rejected. |
| Canonical IDs and revisions remain visible | Returned source references preserve stable ID, Tenant, exact revision and fingerprint. |
| No domain or persistence owner is created | Module imports Native Core primitives only; it has no repository, HTTP, Runtime, admission or provider imports. |

## Validation

| Check | Result |
| --- | --- |
| Build — `npm run build` | PASS |
| Focused S1 — `node --test tests/epic-17-imp-07-s1-administrative-contracts.test.mjs` | PASS — 4 tests / 0 failures |
| Full regression — `ACS_ENVIRONMENT=local npm run check` | RUN — 149 pass / 10 fail / 0 skip |
| S1 test in full regression | PASS |
| PostgreSQL | N/A — S1 adds no durable command path, schema, migration, table or repository. |
| `git diff --check` | PASS |

## Full-regression causality

| Classification | Count | Evidence |
| --- | --- | --- |
| A — caused by S1 | 0 | The focused S1 suite passes alone and in the full run. The new module is a pure contract/mapper layer with no HTTP, repository, Runtime, admission, scheduler or provider import. |
| B — independent real regression | 0 | No new non-environment failure was observed. |
| C — environment / harness | 10 | The complete pre-existing listener/process set remained unchanged: `acs-v2-imp-03e`, `s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57` and `s77`. Existing accepted reports classify this family at the local listener/process boundary. |
| D — indeterminate | 0 | The failing set is unchanged and does not import or exercise S1 contracts. |

## Explicit exclusions

- No Product API routes or handlers.
- No Control Plane command/query service.
- No repository mutation, persistence aggregate, schema migration or Schema 13.
- No admission invocation, Run/Workflow creation, Runtime behavior, scheduler or OpenClaw execution.
- No Genome implementation.
- No new Tenant or authorization owner.
- No raw credential, secret, provider payload, executor payload or Memory-content projection.

## Blocker and downstream mapping

S1 provides the contract foundation for `E17-R10-B09` and the contract portion
of `E17-R10-B10` and `E17-R10-B11`. It does not close route availability
(`E17-R10-B12`), Control Plane UI availability (`E17-R10-B13`) or final
Tenant-safe cross-domain query conformance (`E17-R10-B15`).

`E17-R10-B14` remains deferred to IMP-09. `E17-R11-B08` remains preserved for
IMP-08. Neither is changed or claimed by S1.

## S1 conclusion

```text
EPIC-17-IMP-07 S1

Build:
PASS

Focused:
PASS — 4 / 0

Regression:
RUN — 149 pass / 10 pre-existing environment/harness failures

Blockers addressed:
E17-R10-B09 foundation
E17-R10-B10 contract foundation
E17-R10-B11 contract foundation

Schema:
12 / unchanged

PostgreSQL:
N/A — no durable path

Scope violation:
NONE

Stop condition:
NONE

Recommendation:
READY FOR CTO ACCEPTANCE
```

S2 remains `HOLD` pending explicit CTO acceptance/publication and S2
authorization. No commit or push was performed.
