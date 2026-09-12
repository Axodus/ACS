# ACS-V2-IMP-03E2 — Workforce Product API Write & Run Query Completion

## Status

`COMPLETE / IMPLEMENTED / VALIDATED_WITH_EXISTING_REPOSITORY_BLOCKERS`

This increment completes the Product API capabilities required for Workforce revision writes, canonical lifecycle transitions, and Workforce-scoped Run discovery. It reuses the Native Core lineage command, PostgreSQL repository, tenant/governance gates, idempotency, compare-and-set revision checks, immutable snapshots, events, and outbox persistence already defined by ACS v2.

## Delivered routes

```text
POST /api/v1/workforces/:workforceId/revisions
POST /api/v1/workforces/:workforceId/lifecycle
GET  /api/v1/workforces/:workforceId/runs
```

The existing initial creation and Workforce read routes remain unchanged. Product API code assembles commands and read models; it does not become a second source of domain truth.

## Boundaries

- No redesign of Native Core, runtime, persistence, governance, or event contracts.
- No provider, scheduler, broker, cache, deployment, economic settlement, trading, treasury, signing, or on-chain execution changes.
- No new PostgreSQL migration is required.
- The implementation does not imply Production Readiness; repository-wide ACS blockers remain governed by their existing records.

## Validation

The focused contract test validates Product API idempotency, immutable member references, lifecycle mutation, stale revision rejection, and Workforce Run projection. The PostgreSQL integration test exercises the HTTP boundary against the canonical shared database, including historical Run admission after two revisions and lifecycle changes.

See [`acceptance-report.md`](./acceptance-report.md) for the recorded validation outcome.
