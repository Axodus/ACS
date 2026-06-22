# ACS Validation

Last updated: 2026-06-22

## Known Commands

From `package.json`:
- `npm run build`
- `npm test`
- `npm run check`
- `npm run smoke:openclaw`
- `npm run smoke:runtime`

Documentation / inspection commands used in `ACS-REQ-02`:
- `git diff -- .instructions`
- `git status --short`

Documentation / inspection commands used in `ACS-REQ-04`:
- `git diff -- .`
- `git status --short`

Documentation / inspection commands used in `ACS-REQ-05`:
- `git diff -- .`
- `git status --short`

Documentation / inspection commands used in `ACS-REQ-06`:
- `git diff -- .`
- `git status --short`

Documentation / inspection commands used in `ACS-REQ-07`:
- `git diff -- .`
- `git status --short`

Documentation / inspection commands used in `ACS-REQ-08`:
- `command -v node`
- `command -v npm`
- `git diff -- .`
- `git status --short`

Documentation / inspection commands used in `ACS-REQ-09`:
- `command -v node`
- `command -v npm`
- `git diff -- .`
- `git status --short`

Documentation / inspection commands used in `ACS-REQ-10`:
- `command -v node`
- `command -v npm`
- `git diff -- .`
- `git status --short`

Security and validation commands used in `ACS-REQ-11`:
- `command -v node`
- `command -v npm`
- local `rg` searches for secrets, credentials, endpoints, databases, providers, methods, environment access, runtime calls, and mutation indicators
- `npm run build`
- `npm test`
- `npm run check`
- `git diff -- .`
- `git status --short`

Local validation commands used in `ACS-REQ-12`, in order:
- `command -v node`
- `node --version`
- `command -v npm`
- `npm --version`
- `npm run build`
- `npm test`
- `npm run check`
- `git diff --check`
- `git diff -- .`
- `git status --short`

Documentation-safe evidence commands used in `ACS-REQ-13`:
- `git diff -- .instructions`
- `git status --short`

## Current-Cycle Validation Status

Status:
- `PASS_CURRENT_CYCLE_LOCAL_VALIDATION`

Result:
- Node `v24.14.1` and npm `11.11.0` are available.
- `npm run build`: PASS.
- `npm test`: PASS.
- `npm run check`: PASS.
- no tests were skipped or removed.
- loopback HTTP and CLI child-process tests were executed outside the restricted sandbox after sandbox-only `EPERM` diagnostics.

Current-cycle validation evidence:
- baseline report created
- instruction files normalized
- authority boundary matrix created
- readiness registry implementation added in source and fixtures
- readiness registry tests added
- permission state model implementation added in source and fixtures
- permission state model tests added
- operational gate registry implementation added in source and fixtures
- operational gate registry tests added
- read-only consumer contract aggregation added in source
- read-only consumer contract tests added
- AxodusAPP preview adapter added in source
- AxodusAPP preview adapter tests added
- Business/Marketplace alignment contract added in source
- Business/Marketplace alignment tests added
- boundary enforcement test suite added
- ACS security review, secret safety audit, and production endpoint audit completed
- ACS local validation report created
- documentation diff review performed

## Historical Validation Evidence

Historical evidence only:
- prior local documents record `npm test` success
- prior local documents record `npm run check` success
- prior local documents record `152` tests passing

Constraint:
- historical evidence must not be treated as current-cycle proof

## Current Validation Limits

- smoke commands were not part of ACS-REQ-12 and were not executed
- no markdown checker command was found in the repository
- local validation success is not an L4 consolidation assessment or production-readiness approval

## Validation Interpretation

Current validation status means:
- readiness, permission, operational gate, read-only consumer contract, AxodusAPP preview, Business/Marketplace alignment, and focused boundary enforcement test implementations are complete at source/documentation level
- repository local build/test/check health is confirmed for this cycle
- ACS must remain execution-gated and non-production

## Next Validation Need

`ACS-REQ-13` used the fresh evidence in `.instructions/reports/ACS_LOCAL_VALIDATION_REPORT.md` and did not re-run build/test/check.

Next:
- use `.instructions/reports/ACS_L4_CONSOLIDATION_ASSESSMENT.md` in `ACS-REQ-14`
- keep passing local validation as necessary but not sufficient evidence for maturity promotion
