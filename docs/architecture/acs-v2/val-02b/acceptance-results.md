# VAL-02B Acceptance Results

## Acceptance matrix

| Gate | Result | Evidence | Blocking IMP-02B? |
| --- | --- | --- | --- |
| IMP-02B focused frontend tests | PASS | 8 passed, 0 failed | No |
| Regression suite equivalence | PASS | Same 114 files; 692 subtests under valid serial environment | No |
| s48 | PASS / ENVIRONMENT-HARNESS | Host focused rerun: 9 passed | No |
| s50 | PASS / ENVIRONMENT-HARNESS | Host focused rerun: 3 passed | No |
| s51 | PASS / ENVIRONMENT-HARNESS | Host focused rerun: 1 passed | No |
| s52 | PASS / ENVIRONMENT-HARNESS | Host focused rerun: 4 passed | No |
| s54 | PASS / ENVIRONMENT-HARNESS | Host focused rerun: 1 passed | No |
| s55 | PASS / ENVIRONMENT-HARNESS | Host focused rerun: 1 passed | No |
| s56 | PASS / ENVIRONMENT-HARNESS | Host focused rerun: 3 passed | No |
| s57 | PASS / ENVIRONMENT-HARNESS | Host focused rerun: 1 passed | No |
| Final canonical rerun | PASS | 692 total, 688 passed, 0 failed, 4 skipped | No |
| Ordinary `npm test` rerun | PASS | 692 total, 688 passed, 0 failed, 4 skipped | No |
| Revision reload | PASS | `r3 → r4`, real Configuration reload | No |
| Backend re-fetch | PASS | Matching Product API response after API restart | No |
| Agent context after reload | PASS | Direct Configuration and Validate routes retained Agent context | No |
| `git diff --check` | PASS | No whitespace errors | No |

## Gates

**REGRESSION GATE: PASS**

**RELOAD GATE: PASS**

## Integrity

- Production source changes: none.
- API changes: none.
- Database / migration changes: none.
- New dependencies: none.
- Validation-only tests: none added; existing real Product API and browser flow
  were used.
- Existing tests were not deleted, weakened, skipped, or reclassified to force
  acceptance.
- PostgreSQL was not required for IMP-02B causality or reload validation. The
  four already documented PostgreSQL tests remained explicit skips because
  `ACS_SH_DATABASE_URL` was not configured.
- Security / governance impact: no material boundary change.

## Promotion recommendation

**PROMOTE TO COMPLETE — ACCEPTED**

Both remaining gates pass: the eight reported failures are proven harness-bound
under non-equivalent execution conditions, and the canonical Agent revision
survives browser reload plus independent Product API re-fetch.
