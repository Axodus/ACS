# Workforce-scoped Run query

## Endpoint

```text
GET /api/v1/workforces/:workforceId/runs
```

The query first verifies that the Workforce exists, then reads canonical Runs whose `workforce_id` matches the requested Workforce. Each result retains the revision used at admission.

## Response item

```json
{
  "runId": "run-42",
  "status": "created",
  "admittedWorkforceRevision": 3,
  "admittedWorkforceRevisionRef": {},
  "admittedAt": 2200,
  "membershipSnapshotId": "snapshot-run-42",
  "createdAt": 2100
}
```

`membershipSnapshotId` is omitted when no snapshot is present. `admittedAt` uses the canonical admission timestamp and falls back to the Run creation timestamp only when the snapshot has no admission timestamp.

## Ordering and scope

Results are deterministic: `created_at ASC, run_id ASC`. The current milestone keeps the established Product API list convention and does not add pagination. The query is Workforce scoped and does not expose unrelated tenants or Runs.

The PostgreSQL implementation reuses `acs_native_runs_workforce_idx` and left joins the existing membership snapshot tables. No projection table or migration was added.
