# EPIC-17-IMP-01 Acceptance Report

**Status:** `IN IMPLEMENTATION / AUTHORIZED`  
**Gate commit:** `efed500224b08ab7f8b62a61b547d302f63172d7`  
**Date:** 2026-09-13

Final `COMPLETE / READY FOR CTO ACCEPTANCE` is withheld until real PostgreSQL
durable-path validation and a green repository regression are available.

| Acceptance area | Current evidence | Status |
| --- | --- | --- |
| Canonical Native mutation seam | Product API create/update/revision/lifecycle/duplicate paths use the Native adapter when configured; focused seam test passes. | PASS |
| Legacy authoritative writes eliminated in scope | Native configured path does not call legacy AgentService mutations; compatibility remains read/input projection. | PASS |
| Profile projection-only | Profile identifiers remain presentation metadata; profile capability IDs are excluded from effective grants. | PASS |
| Persona revision semantics | Native revision maps role reference, instructions and constraints without a Persona aggregate. | PASS |
| Head/lifecycle history | Native commands emit canonical creation, revision and lifecycle event payloads through the existing lineage transaction. | PASS, durable proof pending |
| Typed errors | CAS conflict, missing lineage, missing revision, ID mismatch and physical-delete-unavailable paths are explicit. | PASS |
| Idempotency/CAS | Adapter supplies request hash, idempotency scope/key and expected head; focused seam test covers retry and conflict. | PASS, PostgreSQL proof pending |
| PostgreSQL durable paths | Existing durable repository path is wired, but this host cannot reach the configured PostgreSQL endpoint. | BLOCKED BY ENVIRONMENT |
| Compatibility consumers | Existing composition tests pass after Profile authority removal; deployment/readiness adapters remain bounded follow-up verification. | PARTIAL |
| Full repository regression | Last run: 130 files, 120 passed, 10 failed; failures include sandbox `listen EPERM` cases and existing IMP-03E coverage. | NOT GREEN |

## Focused evidence

- `npm run build`: PASS.
- `node --test tests/agent-crud-composition.test.mjs tests/unified-agent-model.test.mjs tests/epic-17-imp-01-agent-seam.test.mjs`: 3 files passed.
- `git diff --check`: PASS.
- Native seam test directly executed: 2 assertions passed.

## PostgreSQL boundary

The configured `.env.local` endpoint was detected, but the health check
returned `SHARED_STATE_UNAVAILABLE` with `reachable: false` and
`writable: false`. Docker access was also unavailable in this environment.
The PostgreSQL-gated acceptance skips therefore cannot be counted as durable
acceptance evidence.

No migration was added. If a persistence gap appears in a reachable PostgreSQL
run, implementation must stop before DDL and return for a separate migration
gate.
