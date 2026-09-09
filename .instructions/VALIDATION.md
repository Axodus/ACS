# ACS Validation

Last updated: 2026-09-09

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

Documentation-safe evidence commands used in `ACS-REQ-14`:
- `git diff -- .instructions`
- `git status --short`

Documentation/register-safe evidence commands used in `ACS-REQ-15`:
- `test -d /opt/Axodus/.instructions && echo PORTFOLIO_DIR_AVAILABLE || echo PORTFOLIO_DIR_UNAVAILABLE`
- `test -w /opt/Axodus/.instructions && echo PORTFOLIO_DIR_WRITABLE || echo PORTFOLIO_DIR_NOT_WRITABLE`
- expected global-register presence and read-only content inspection with `rg`, `sed`, `tail`, `wc`, `ls`, and `stat`
- `git diff -- .instructions`
- `git status --short`

Documentation/register-safe evidence commands used in `ACS-GOV-01`:
- `test -d /opt/Axodus/.instructions && echo PORTFOLIO_DIR_AVAILABLE || echo PORTFOLIO_DIR_UNAVAILABLE`
- `test -w /opt/Axodus/.instructions && echo PORTFOLIO_DIR_WRITABLE || echo PORTFOLIO_DIR_NOT_WRITABLE`
- local/global evidence inspection with `rg` and `sed`
- canonical blocked-action verification
- `git diff -- .instructions`
- `git status --short`

Documentation/register-safe evidence commands used in `ACS-GOV-02`:
- `test -d /opt/Axodus/.instructions && echo PORTFOLIO_DIR_AVAILABLE || echo PORTFOLIO_DIR_UNAVAILABLE`
- `test -w /opt/Axodus/.instructions && echo PORTFOLIO_DIR_WRITABLE || echo PORTFOLIO_DIR_NOT_WRITABLE`
- local/global evidence and gate-source inspection with `rg` and `sed`
- canonical blocked-action verification
- `git diff -- .instructions`
- `git status --short`

Documentation/register-safe evidence commands used in `ACS-CLOSE-01`:
- `test -d /opt/Axodus/.instructions && echo PORTFOLIO_DIR_AVAILABLE || echo PORTFOLIO_DIR_UNAVAILABLE`
- `test -w /opt/Axodus/.instructions && echo PORTFOLIO_DIR_WRITABLE || echo PORTFOLIO_DIR_NOT_WRITABLE`
- local/global evidence inspection with `sed`
- `git diff -- .instructions`
- `git status --short`

## ACS v2 Documentation-Cycle Validation - 2026-09-09

Status:
- `DOCUMENTATION_VALIDATED / FULL_SUITE_BLOCKED`

Results:
- `git diff --check`: PASS.
- ACS v2 required-file and relative-link validation: PASS for eight documents
  with zero broken relative links.
- TypeScript build executed by `npm run check`: PASS.
- Full `npm run check` outside the restricted sandbox: FAIL with `680` tests,
  `673` passing, `5` failing, and `2` skipped.

Current failing tests:
- `tests/s27-operational-evidence.test.mjs`
- `tests/s54-epic-15-5-observability-incident-acceptance.test.mjs`
- `tests/s57-epic-15-5-production-target-process-acceptance.test.mjs`
- `tests/s62-epic-16-2-economic-authorization-reservations.test.mjs`
- `tests/s63-epic-16-3-usage-settlement.test.mjs`

Interpretation:
- the ACS v2 documentation baseline is structurally valid;
- the documentation-only changes do not authorize a runtime or provider
  integration;
- the current repository must not be represented as having a fresh all-green
  runtime suite;
- failure diagnosis and any source/test correction require a separately scoped
  implementation request.

Evidence:
- `.instructions/reports/ACS_V2_ARCHITECTURE_DISCOVERY_BASELINE_2026-09-09.md`
- `.instructions/BLOCKER_REGISTER.md` (`ACS-BLOCKER-014`)

## Historical ACS-REQ-12 Validation Status - 2026-06-22

Historical status:
- `PASS_CURRENT_CYCLE_LOCAL_VALIDATION`

Historical result:
- Node `v24.14.1` and npm `11.11.0` are available.
- `npm run build`: PASS.
- `npm test`: PASS.
- `npm run check`: PASS.
- no tests were skipped or removed.
- loopback HTTP and CLI child-process tests were executed outside the restricted sandbox after sandbox-only `EPERM` diagnostics.

Historical ACS-REQ-12 validation evidence:
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

## Historical Validation Limits

- smoke commands were not part of ACS-REQ-12 and were not executed
- no markdown checker command was found in the repository
- local validation success is not an L4 consolidation assessment or production-readiness approval

## Historical Validation Interpretation

Current validation status means:
- readiness, permission, operational gate, read-only consumer contract, AxodusAPP preview, Business/Marketplace alignment, and focused boundary enforcement test implementations are complete at source/documentation level
- repository local build/test/check health is confirmed for this cycle
- ACS must remain execution-gated and non-production

## Next Validation Need

`ACS-GOV-02` used the evidence chain captured by ACS-REQ-12 through ACS-GOV-01 and did not re-run build/test/check.

Next:
- retain `.instructions/reports/ACS_GLOBAL_PORTFOLIO_SYNC_REPORT.md` as successful global-sync evidence
- retain `.instructions/reports/ACS_L4_READINESS_ADOPTION_REVIEW.md` as governance adoption evidence
- retain `.instructions/reports/ACS_L4_CONSOLIDATED_GOVERNANCE_GATE_DEFINITION.md` as the future gate baseline
- retain `.instructions/reports/ACS_L4_READINESS_CLOSURE_AND_PORTFOLIO_HANDOFF.md` as the closure/handoff baseline
- keep passing local validation as necessary but not sufficient evidence for L4 Consolidated or production authority
