# ACS-V2-IMP-02D — Agent Operational Views

**Status:** COMPLETE — localhost browser acceptance passed
**Updated:** 2026-09-11

## Scope

IMP-02D-R1 completes the frozen Agent-local operational navigation using the bounded, server-authoritative Product API contracts accepted in IMP-02D1:

- **Runs** uses `GET /agents/:agentId/execution-runs?limit=50&offset=:offset`.
- **Evidence** uses `GET /agents/:agentId/evidence?limit=50&offset=:offset`.
- **Usage & Cost** retains `GET /economics/usage?agentId=:agentId&limit=50` and reads the scoped operational economics projection only to confirm its limited semantics.

The frontend makes no global operational collection request and performs no Agent ownership reconstruction, global browser join, or browser-side accounting.

## Operational hierarchy

Runs presents canonical Run state, timestamps, directly provided duration, safe outcome/failure text, and available runtime or deployment identifiers. It preserves server ordering and does not render `revisionId: 0` as execution revision provenance.

Evidence presents first-class Evidence records with title, type, concise summary, source, timestamp, entity references, and correlation ID where the Product API supplies them. Evidence remains distinct from Event, Audit, and Runtime Event.

Usage & Cost remains record-oriented. It shows bounded Usage quantities, units, measurement and settlement states, and canonical Run, reservation, quote, and settlement identifiers. The scoped economics projection is zero-valued operational context, not an authoritative cost total, so the page withholds totals.

## Read-model conclusion

**READ MODEL REQUIRED: NO.** Existing Product API endpoints now provide small deterministic, Agent-scoped requests for every implemented view. No aggregation endpoint, persistence change, or frontend correlation engine was introduced.

## Boundaries preserved

- Agent scope is enforced by the Product API; the URL is not an authorization boundary.
- Evidence is not rendered as logs, audit, or runtime events.
- Usage, quote, reservation, settlement, and cost remain distinct domains.
- No provider/model/name/timestamp heuristic establishes ownership or correlation.
- Global Runs, Evidence, and Economics views remain intact.
- No backend code, database, migration, dependency, or read model changed.

## Validation

- Standalone frontend typecheck, lint, tests, and build pass.
- Root build, IMP-02D scope, IMP-02D1 compatibility, and s63 correlation tests pass.
- Local API fixture and browser validation cover loaded, paginated, reloaded, empty, and cross-Agent-scoped records.
- Localhost API and browser evidence are recorded in [localhost-validation.md](localhost-validation.md).

See the contract inventory, correlation map, query plan, read-model assessment, implementation traceability, and localhost validation record.
