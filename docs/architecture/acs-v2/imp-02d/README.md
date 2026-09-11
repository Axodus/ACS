# ACS-V2-IMP-02D — Agent Operational Views

**Status:** PARTIAL — Usage & Cost is implemented with existing server-scoped contracts; Runs and Evidence remain unavailable pending bounded, correct Agent-scoped query contracts.
**Date:** 2026-09-11

## Scope

The frozen Agent-local navigation renders canonical operational data only where existing Product API queries preserve Agent ownership and bounded retrieval:

- **Usage & Cost** uses only `GET /economics/usage?agentId=:agentId&limit=50`.
- **Runs** remains explicit unavailable because `GET /agents/:agentId/execution-runs` is Agent-scoped but has neither pagination nor a server limit.
- **Evidence** remains explicit unavailable. `GET /agents/:agentId/evidence` is Agent-scoped but unbounded; the generic `GET /evidence?agentId=:agentId` route accepts `agentId` but its query builder currently does not apply it.

No global collection is fetched and filtered in the browser. No new backend endpoint, persistence model, dependency, or read model was added.

## Operational hierarchy

Usage & Cost presents up to 50 server-scoped Usage records with canonical Run, reservation, quote, and settlement references. It does not present a total because the available Agent economics summary ignores the requested Agent scope; it does not claim an order because the Usage contract defines no ordering. Evidence remains in its global canonical view until the Agent scope contract is corrected. Technical identifiers remain secondary to the operational interpretation.

## Read-model conclusion

**READ MODEL REQUIRED: NO.** The existing Usage endpoint is sufficient for a correct bounded Agent-scoped record view. Runs and Evidence need pagination or a bounded-query parameter on their existing scoped endpoints; Evidence additionally needs its generic `agentId` filter fixed. The Agent economics summary also needs to apply its Agent filter before it can be rendered. These are compatibility and bounded-query gaps, not reasons to add an aggregation/read model.

## Boundaries preserved

- Evidence remains distinct from Event, Audit, and Runtime Event.
- Usage, quote, reservation, settlement, and cost remain distinct economic entities.
- No browser-side cost calculation or cross-domain ownership inference.
- No Agent-scoped Runs, Evidence, or Usage data is persisted in the browser.
- Global operational views remain unchanged.

## Validation

- Standalone frontend typecheck, lint, and all 10 frontend tests pass.
- Root TypeScript build passes.
- Focused HTTP, operational-evidence, Usage/settlement, and Agent-scope tests pass.
- The serial host suite passed on September 11, 2026: 693 total, 689 passed, 0 failed, and 4 PostgreSQL-gated skips.
- Browser acceptance remains pending explicit IMP-02D localhost authorization.

See the companion inventory, correlation, query plan, read-model assessment, traceability, and localhost evidence.
