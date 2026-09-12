# Negative cases

| Case | Result | Evidence |
| --- | --- | --- |
| First Workforce same key, same request | PASS | same canonical r1 returned |
| First Workforce same key, changed request | PASS | HTTP 409 idempotency conflict |
| Draft Run admission | semantic rejection PASS; public error typing FAIL | Native cause is `ACS_NATIVE_RUN_ADMISSION_REJECTED`; PostgreSQL adapter returns `ACS_REPOSITORY_TRANSACTION_FAILED` |
| Stale Workforce expected head | PASS | HTTP 409, no successor revision |
| Proposal alone | PASS | no execution intent exists before Decision A |
| Stale assignment | not reached | compiler failure occurs before reassignment |
| Archived → active | not reached | scenario stops at first canonical invariant failure |
| Cross-tenant isolation | reused accepted focused coverage | no new cross-contract result claimed |

`VAL-03-DEFECT-002` is the draft admission public error masking. It is classified as D because the durable Core rejects correctly but the shared adapter does not preserve the accepted typed error at its public boundary. It does not supersede `VAL-03-DEFECT-001`, which blocks the scenario earlier at runtime compilation.
