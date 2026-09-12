# Snapshot schema

Migration 5 adds:

- `acs_native_runs`, including the Workforce revision binding;
- `acs_workforce_run_membership_snapshots`, one immutable header per Run;
- `acs_workforce_run_membership_members`, one immutable JSON payload per slot.

Foreign keys preserve Run, Workforce, Workforce revision, and snapshot relationships. No provider or runtime state is stored.
