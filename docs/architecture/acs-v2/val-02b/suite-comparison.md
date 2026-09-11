# VAL-02B Suite Comparison

| Property | Accepted baseline | Reported IMP-02B run | VAL-02B canonical rerun |
| --- | --- | --- | --- |
| Command | `ACS_RUNTIME_DATABASE_PATH=<temporary> node --test --test-concurrency=1 tests/*.test.mjs` | `npm test` | Same isolated serial command, then `npm test` |
| Discovery | 114 test files; Node reports contained subtests | 114 test files reported at file level after failures | 114 test files; contained subtests reported |
| Scheduling | Serial | Default Node test concurrency | Serial, then default concurrency |
| Runtime DB | Isolated temporary SQLite | Not recorded in the original report | Isolated temporary SQLite for canonical run |
| Loopback/process permission | Available in accepted host environment | Restricted sandbox conditions were not recorded as equivalent | Available on host reruns |
| Total | 692 | 114 file-level results | 692 |
| Passed | 688 | 106 files | 688 |
| Failed | 0 | 8 files | 0 |
| Skipped | 4 PostgreSQL-gated | Not separately recorded | 4 PostgreSQL-gated |

The 692 baseline is a count of test cases/subtests. The reported 114 count is
the number of discovered `tests/*.test.mjs` files when eight files failed at a
file/process boundary. It was not a smaller product suite and cannot be
compared numerically to the 692-subtest baseline.

The valid comparison is execution under the same discovery set with isolated
SQLite and serial scheduling. VAL-02B reproduced that command as `692 total`,
`688 passed`, `0 failed`, `4 skipped`. A subsequent ordinary `npm test` host
rerun also returned the same `692 / 688 / 0 / 4` result.
