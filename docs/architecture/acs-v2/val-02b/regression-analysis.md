# VAL-02B Regression Analysis

## IMP-02B change surface

`67dba463` changes only the standalone Agent form, its CSS, a source-oriented
standalone test, and ACS v2 documentation. It does not change backend runtime,
rate limiting, telemetry, worker dispatch, production target processes, or any
EPIC-15.5 test source. The changed frontend production files do not participate
in the eight test execution paths below.

The original 114-file failure report retained file identities but not individual
stderr. VAL-02B therefore records its own focused reruns. In the restricted
sandbox, s48 deterministically failed five loopback cases with
`listen EPERM: operation not permitted 127.0.0.1`; four non-loopback cases
passed. Host reruns with loopback/process permission passed every focused test.

| Test | Reproduction / focused result | Environment dependency | Historical comparison | Classification | Rationale |
| --- | --- | --- | --- | --- | --- |
| s48 | Restricted sandbox: 4 pass, 5 fail at `listen EPERM` on `127.0.0.1`; host: 9 pass | HTTP server loopback bind | BLOCKER-014 recorded 9 pass after its rate-limit remediation | ENVIRONMENT / HARNESS | No IMP-02B path is loaded; host result proves the rate-limit assertions pass. |
| s50 | Host: 3 pass | Local HTTP service and remote worker client | AEES-F recorded isolated 3/3 pass | ENVIRONMENT / HARNESS | The test exercises worker transport, not standalone Agent form code. |
| s51 | Host: 1 pass; two control planes and independent workers completed crash/recovery/fencing certification | Loopback plus child processes | AEES-D recorded 1/1 pass | ENVIRONMENT / HARNESS | The process topology passes under the required host conditions; no IMP-02B path participates. |
| s52 | Host: 4 pass | Local OTLP/HTTP receiver | EPIC-15.5 telemetry certification recorded passing coverage | ENVIRONMENT / HARNESS | Structured telemetry is backend-only and passed focused. |
| s54 | Host: 1 pass | Independent control-plane/worker processes and loopback | BLOCKER-014 recorded 1 pass after observability limiter remediation | ENVIRONMENT / HARNESS | Accepted remediation behavior remains present; host incident certification passes. |
| s55 | Host: 1 pass | Operational HTTP service | AEES-F recorded F01/F02 pass | ENVIRONMENT / HARNESS | The test covers credential lifecycle and job cancellation, not Agent creation UI. |
| s56 | Host: 3 pass | Disposable production-target and telemetry services | EPIC-15.5 G01/G03 certification recorded passing coverage | ENVIRONMENT / HARNESS | Production gate contract passes focused and has no IMP-02B execution path. |
| s57 | Host: 1 pass | Spawned production-target process and loopback | BLOCKER-014 recorded 1 pass after module-relative dist resolution fix | ENVIRONMENT / HARNESS | The compiled entrypoint resolved and the independent-process test passed. |

## Common cause

**Restricted loopback/process harness conditions.** s48 directly demonstrated
the condition as `EPERM` on loopback bind. Every remaining reported file starts
or contacts local HTTP services and/or child processes; all passed both in
focused host reruns and in the canonical serial host suite. The original report
did not preserve individual failure stderr, so it cannot support a product
defect attribution.

## Parent comparison

No parent-commit checkout was necessary. The validated commit has no changed
production path in any failing test, each focused test passed at the validated
commit, and the full serial and ordinary host reruns passed. Those conditions
exclude an IMP-02B causal relationship more directly than a cross-checkout
comparison under a different harness would.

## BLOCKER-014 comparisons

### s54

The accepted rate-limit remediation remains intact: s54 passed its independent
process incident certification on the validated commit. The earlier reported
failure is explained by the non-equivalent restricted execution context, not a
reopened observability defect.

### s57

The accepted module-relative dist resolution remains intact: s57 imported the
compiled production-target entrypoint and completed deploy, health inspection,
runtime stop, and rollback across a child process. The earlier reported failure
does not reproduce in the valid host environment.
