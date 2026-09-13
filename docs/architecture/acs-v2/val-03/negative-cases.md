# Negative cases

| Case | Result |
| --- | --- |
| Same create key and payload | PASS: same canonical r1 |
| Same create key, changed payload | PASS: HTTP 409 |
| Draft Run admission | PASS: `NativeRunAdmissionError`, no Run/event/outbox mutation |
| Stale Workforce expected head | PASS: HTTP 409, no successor |
| Proposal without Decision | PASS: no execution intent |
| Invalid assignment generation | PASS: `NativeStaleAssignmentError` |
| Archived → active | PASS: HTTP 400, `ACS_NATIVE_WORKFORCE_REFERENCE_INVALID`, no mutation |
| Canonical Agent in Application create selector | PASS after `ACS-BLOCKER-020`: canonical Native Core Agent is discoverable and selectable |
| Cross-tenant access | PASS by accepted focused Product API coverage |

`ACS-BLOCKER-019` closed the prior runtime stream and PostgreSQL error-typing defects. The former 422 lifecycle expectation was corrected as an A-class validation expectation defect because the accepted Product API mapping is HTTP 400.

`VAL-03-DEFECT-003` was a D-class implementation regression and is resolved by
`ACS-BLOCKER-020`. The accepted remediation preserves the Product API boundary,
Native Core authority, tenant filtering, and the unchanged Workforce creation
validation path.
