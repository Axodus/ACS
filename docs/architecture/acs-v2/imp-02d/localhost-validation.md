# IMP-02D Localhost Validation

**Status:** PASS — API and localhost browser acceptance completed.

## Disposable API fixture — September 11, 2026

- Product API: `http://127.0.0.1:8789/api/v1`
- Standalone frontend: `http://127.0.0.1:3002`
- Agent A: `agent-imp-02d-r1-a`
- Agent B: `agent-imp-02d-r1-b`
- Empty Agent: `agent-imp-02d-r1-empty`
- Agent A first Run: `run_exec_agent-imp-02d-r1-a_1789121730169`
- Agent A Usage: `usage-imp-02d-r1-a`

The fixture is process-local and disposable. It creates 55 Agent A Runs, 3 Agent B Runs, Evidence emitted from the Agent-owned run audit records, one Agent A Usage record, and an Agent with no operational records. It does not alter a database or manually insert durable rows.

## API evidence

- `GET /agents/agent-imp-02d-r1-a/execution-runs?limit=50&offset=0` returns 50 Agent A Runs in canonical order.
- `GET /agents/agent-imp-02d-r1-a/execution-runs?limit=50&offset=50` returns the remaining five Agent A Runs, with no Agent B Run.
- `GET /agents/agent-imp-02d-r1-a/evidence?limit=50&offset=0` and offset 50 provide the corresponding bounded Agent A Evidence pages, excluding Agent B Evidence.
- `GET /economics/usage?agentId=agent-imp-02d-r1-a&limit=50` returns the Agent A Usage record only.
- `GET /agents/agent-imp-02d-r1-a/economics` returns the Agent-scoped zero-valued operational projection. R1 withholds its totals.
- The empty Agent receives `200 []` for Runs and Evidence and an empty Usage list. Empty is semantically distinct from Product API query error.

Focused Product API tests independently cover these same Agent A/B isolation, empty, pagination, and scoped economics conditions.

## Browser acceptance — September 11, 2026

Browser automation was explicitly authorized for `http://127.0.0.1:3002` and used only against the disposable frontend and fixture API above.

- Direct-loaded `/agents/agent-imp-02d-r1-a/runs`: the Agent context remained visible and the first page rendered 50 Agent A Runs. The Next control produced `?offset=50`, which rendered the remaining five Runs; no Agent B identifier appeared. A browser reload preserved the URL, Agent context, and second-page result.
- Direct-loaded `/agents/agent-imp-02d-r1-a/evidence`: the first page rendered 50 Agent A Evidence records with Product API source and canonical Run correlation IDs. The Next control produced `?offset=50`, which rendered the remaining five Evidence records; no Agent B identifier appeared. A browser reload preserved the URL, Agent context, and second-page result.
- Direct-loaded `/agents/agent-imp-02d-r1-a/usage-cost`: one bounded Agent A Usage record rendered with its canonical Run identifier. The scoped economics projection rendered only its semantic note: it is zero-valued operational context and does not define an authoritative cost total. No numeric total was displayed, no Agent B identifier appeared, and reload preserved Agent context and backend-backed content.
- Direct-loaded the empty Agent on all three routes. Runs displayed `No Runs have been recorded for this Agent.` Evidence displayed `No Evidence has been recorded for this Agent.` Usage & Cost displayed `No Usage & Cost records have been recorded for this Agent.` Each route preserved the empty Agent context after reload.
- No blocking route error, uncaught browser/runtime exception, infinite loading state, context loss, or cross-Agent record leakage was observed.

Browser validation does not deliberately induce a Product API failure. The focused frontend suite verifies error rendering, while the production UI separately retains valid primary Usage records when the secondary economics projection fails.
