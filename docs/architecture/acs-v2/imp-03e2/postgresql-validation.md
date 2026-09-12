# PostgreSQL validation

## Schema impact

No migration was required. IMP-03E2 reuses the existing canonical tables and index:

- `acs_native_workforce_definitions`
- `acs_native_workforce_revisions`
- `acs_native_events`
- `acs_native_outbox`
- `acs_native_idempotency`
- `acs_native_runs`
- `acs_workforce_run_membership_snapshots`
- `acs_workforce_run_members`
- `acs_native_runs_workforce_idx`

## Integration path

The focused PostgreSQL test creates an isolated schema, seeds an Agent and a draft Workforce through Native Core, opens the real HTTP server, activates the Workforce, admits a Run against revision 2, creates revision 3 through the Product API, admits a second Run against revision 3, disables the Workforce, and queries the Workforce Runs endpoint.

The assertions verify:

- HTTP revision and lifecycle writes succeed through the shared PostgreSQL context;
- Run results preserve historical revision references and admission timestamps;
- deterministic ordering is `run-a`, then `run-b`;
- the original revision remains unchanged after later writes;
- the canonical state is persisted without a Product API side store.

The exact command and result are recorded in [`acceptance-report.md`](./acceptance-report.md).
