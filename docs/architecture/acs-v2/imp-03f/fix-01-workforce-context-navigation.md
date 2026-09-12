# ACS-V2-IMP-03F-FIX-01 — Workforce Context Navigation Completion

## Purpose

Complete the visible Workforce navigation within `IMP-03F` without creating a new sprint or expanding the Product API contract.

## Implemented behavior

- `Workforces` retains one collection-level child: `All Workforces`.
- A direct Workforce route adds a separate sidebar group labelled `Workforce: <canonical display name>`.
- The group exposes Overview, Members, Revisions, Runs, and Operations.
- The same links remain available in the entity context strip above the detail surface.
- Only the deepest matching entity route is active. The collection link is active only at `/workforces`.
- The shell reads the accepted Workforce detail endpoint solely to resolve a display name. It falls back to the route ID if that request has not resolved or fails.

## Boundary

This is navigation and presentation work only. It adds no Workforce write, no local persistence, no inferred Run membership, and no new Product API route.

## Decision state

`PARTIAL / DOMAIN ENTRY ACCEPTED / DOMAIN NAVIGATION INCOMPLETE`

The overall milestone remains partial because the local Product API does not currently register Workforce reads, Product API write/query gaps remain, and PostgreSQL-required validation is unresolved. The implementation must be revalidated by selecting a Workforce returned by `GET /api/v1/workforces` before navigation can be accepted.
