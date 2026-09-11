# IMP-02D Localhost Validation

**Status:** PASS for the implemented bounded Usage empty-state path and the intentional Runs/Evidence unavailable paths. IMP-02D remains PARTIAL by contract.

This record will capture Product API and standalone frontend addresses, disposable Agent IDs, canonical operational record IDs, direct-route reload evidence, bounded query evidence, cross-Agent isolation where fixtures allow it, empty states, and browser/runtime errors.

Runs is expected to remain unavailable until a bounded Agent-scoped query contract exists. Evidence also remains unavailable until its bounded Agent query is correct. Usage & Cost validation uses only server-scoped Product API queries and non-production local data.

The prior localhost browser authorization was explicitly limited to IMP-02C. Browser automation against `http://127.0.0.1:3001` for IMP-02D was initially denied by automatic review on that basis. CTO then granted explicit IMP-02D authorization. No alternate browser surface, CDP connection, shell request, or source change was used as a workaround.

## Browser evidence — September 11, 2026

- Frontend: `http://127.0.0.1:3001`
- Product API displayed by the frontend: `http://127.0.0.1:8788/api/v1`
- Agent: `dev-agent-sandbox` (`DEV Sandbox Agent`, revision `r1`, lifecycle `draft`, readiness `READY` in the Agent inventory)

### Usage & Cost

1. Direct-loaded `/agents/dev-agent-sandbox/usage-cost`.
2. The page retained the Agent context and navigation, showed Product API connected, and displayed the bounded-query statement: “Up to 50 records returned by the Product API.”
3. The request completed with the valid EMPTY state: “No Usage & Cost records have been recorded for this Agent.” It did not render an error, unavailable state, zero total, or synthetic accounting total.
4. The page disclosed that Agent-scoped cost totals and canonical ordering are unavailable and that the browser performs no accounting.
5. An actual browser reload preserved the exact route, Agent context, Product API connection, and EMPTY state.

The authorized fixture Agent had no Usage records, so the browser could not observe a populated Usage row without creating new operational data. The focused Product API scope test separately proves the bounded query returns only `agent-imp-02d-a` records and excludes Agent B. A browser attempt to inspect the global Economics page was rejected by automatic review because it could expose unrelated financial records; no global data was accessed.

### Runs

1. Direct-loaded `/agents/dev-agent-sandbox/runs`.
2. The page retained Agent context and rendered `UNAVAILABLE`, not EMPTY.
3. It states that the Product API lacks a bounded, verified Agent-scoped query and that the Agent-specific endpoint is not used because it can return unbounded history.
4. An actual browser reload preserved the exact route, Agent context, and unavailable state.

### Evidence

1. Direct-loaded `/agents/dev-agent-sandbox/evidence`.
2. The page retained Agent context and rendered `UNAVAILABLE`, not EMPTY.
3. It states that the Product API lacks a bounded, verified Agent-scoped query and that Agent Evidence is not fabricated from global records.
4. An actual browser reload preserved the exact route, Agent context, and unavailable state.

### Browser errors and negative paths

- No blocking route error, uncaught exception, infinite loading state, or context loss appeared on the three authorized routes.
- A real service failure was not induced because the authorization prohibits damaging shared localhost infrastructure. Error rendering remains covered by the focused frontend source test and the existing request-state component behavior.

## Completed non-browser evidence

- Product API scope test: direct Agent Runs and Evidence queries exclude foreign Agent records; the bounded Usage query with `agentId` and `limit=50` excludes foreign Usage records.
- Relevant API tests: `s20-http-integration`, `s27-operational-evidence`, and `s63-epic-16-3-usage-settlement` pass.
- Host serial suite on September 11, 2026: 693 total, 689 passed, 0 failed, 4 PostgreSQL-gated skips.
