# IMP-02C Revision Experience

## Current and historical state

The revisions endpoint is rendered newest-first. The record designated by the Product API as current is labelled CURRENT and is the canonical head. Every other record is labelled HISTORICAL and explains that it is read-only.

The current record offers the existing Configuration path. Historical records do not expose an edit action and cannot silently replace the canonical head.

## Existing revision commands

Where the Product API marks a historical revision action as available, Overview shows the existing Adopt and Restore actions. Both commands use the existing Product API and Agent service methods. They append a new canonical revision from the selected historical definition and record provenance; they do not mutate the selected historical record.

Configuration continues to preserve expected-head/CAS behavior from IMP-02B: a stale update is rejected by the server and the UI offers reload rather than merge, retry, or overwrite.

## Deferred capabilities

- Revision comparison: deferred; no diff engine or comparison API was added.
- Historical revision detail route: deferred; no dedicated historical read API was added.
- Restore from revision as a client-side copy operation: not added. Only the existing canonical restore command is surfaced.
