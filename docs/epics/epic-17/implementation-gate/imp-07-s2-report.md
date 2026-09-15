# EPIC-17-IMP-07 S2 Report

- **Slice:** S2 — Control Plane Administrative Command / Query Services
- **Baseline:** `fca9081264ae772633a5c39ce841fda6e177ad3a` (published S1 on `origin/dev`)
- **Date:** September 15, 2026

## Scope implemented

| Administrative operation | Control Plane coordinator | Canonical owner | Repository mutation by S2 |
| --- | --- | --- | --- |
| Automation current/head, exact historical, tenant list | `AdministrativeQueryService` | Native Automation history through the canonical Native Core read port | No |
| Delegation current/head, exact historical, tenant list | `AdministrativeQueryService` | Native Delegation history through the canonical Native Core read port | No |
| Activation current/observed inspection | `AdministrativeQueryService` | Native Activation lineage through the canonical Native Core read port | No |
| Automation create, revise, lifecycle transition | `AdministrativeAutomationCommandService` | `GovernedAutomationService` | No |

`AdministrativeQueryService` is read-only and produces only S1 allowlisted projections. `AdministrativeAutomationCommandService` has no repository dependency and delegates all durable behavior to `GovernedAutomationService`; the canonical owner retains validation, CAS, idempotency, lifecycle, durable transactions, and Event/Evidence behavior.

## Addressing and boundary evidence

- **CURRENT:** resolves the canonical head.
- **EXACT:** resolves the requested immutable Automation or Delegation revision only after revision and fingerprint verification; mismatches fail closed.
- **OBSERVED:** applies only to Activation causal observation and compares the supplied observation digest with the canonical initial causal event. It is not an alias for CURRENT or latest.
- **Tenant:** request/reference mismatch fails before repository access. A canonical lineage outside the request Tenant is returned as administrative not-found, avoiding cross-Tenant disclosure.
- **Redaction:** all responses use `createAdministrativeProjectionV1`; projections include only allowlisted metadata and safe summaries. Authored configuration, credential material, authority context, raw provider payloads, lease details, and raw Memory content remain excluded.
- **Activation:** S2 exposes inspection only. It contains no admission, execution, Run, Workflow, retry, scheduler, or OpenClaw operation.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Build | PASS | `npm run build` |
| Focused S2 | PASS | `node --test tests/epic-17-imp-07-s2-administrative-services.test.mjs` |
| Canonical service reuse | PASS | Commands accept only `GovernedAutomationService` methods; no repository is injected into the command coordinator. |
| Direct repository mutation | NONE | S2 query port is read-only; command coordinator delegates to the canonical service. |
| CURRENT query | PASS | Focused query test. |
| EXACT historical query | PASS | Focused query test verifies exact revision and fingerprint mismatch rejection. |
| OBSERVED semantics | PASS | Focused query test verifies the distinct canonical causal observation digest. |
| Cross-Tenant | FAIL CLOSED | Focused and PostgreSQL tests. |
| CAS conflict | PASS | Focused test preserves canonical `RevisionConflictError`. |
| Idempotent retry | PASS | Focused and PostgreSQL tests verify repeated canonical commands return the same durable result. |
| Lifecycle rejection | PASS | Focused test preserves canonical `GovernedAutomationServiceError`. |
| Projection/redaction | PASS | Focused test verifies authored configuration secret is absent; all output is constructed by the S1 safe mapper. |
| PostgreSQL 17.x | PASS | `npm run acceptance:postgres`: PostgreSQL 17.6, schema version 12, 28 passed / 0 failed / 0 skipped. |
| Schema 12 | UNCHANGED | Verified by PostgreSQL acceptance runner. |
| Schema 13 | NOT REQUIRED | No migration or persistence aggregate added. |
| Full regression | CLASSIFIED | `ACS_ENVIRONMENT=local npm run check`: 151 passed, 10 classified pre-existing environment failures. Both S2 tests passed. |
| Causality | A = 0; D = 0 | The ten failures are the same listener/process environmental set accepted for S1: `acs-v2-imp-03e`, `s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57`, `s77`. |
| `git diff --check` | PASS | No whitespace errors. |

## Required evidence fields

- **Files changed:** `src/control-plane/administrative-services.ts`, `src/index.ts`, `tests/epic-17-imp-07-s2-administrative-services.test.mjs`, `tests/epic-17-imp-07-s2-postgres.test.mjs`, `scripts/acs-postgres-acceptance.mjs`, this report, and the implementation-gate index.
- **Contracts changed:** S2 coordinator exports and typed query error only; S1 contracts are reused unchanged.
- **Services changed:** `AdministrativeQueryService`; `AdministrativeAutomationCommandService`.
- **Routes changed:** N/A — none.
- **Repositories changed:** NONE.
- **Schema changed:** NONE; Schema 12 remains canonical and unchanged.
- **Mapped blockers:** E17-R10-B09 through B13 and B15 are carried by the accepted freeze; this S2 slice supplies the query/command boundary evidence only and does not alter their frozen mapping.
- **Mapped contract deltas:** S2 consumes the accepted S1 administrative references and projections; no Product API contract is introduced.
- **Security proof:** Allowlist mapper usage; focused secret exclusion; no raw provider payload, authority internals, credential material, or Memory content in projections.
- **Tenant proof:** request/reference mismatch fails before access; foreign canonical lineage is not disclosed.
- **Historical proof:** CURRENT, EXACT, and OBSERVED are separate paths; exact never resolves latest and observed validates causal digest.
- **Redaction proof:** projections contain safe summary fields only.
- **Product API routes:** NONE.
- **Admission:** NONE.
- **Runtime / Run / Workflow:** NONE.
- **Scheduler:** NONE.
- **OpenClaw execution:** NONE.
- **Genome:** NONE.
- **Scope violation:** NONE.
- **Stop condition:** NONE.

## Recommendation

**READY FOR CTO ACCEPTANCE**

S2 remains local and uncommitted. No push was performed.
