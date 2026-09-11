# IMP-02D Correlation Map

| Source entity | Canonical field | Target entity | Classification | UI use |
| --- | --- | --- | --- | --- |
| Route | `agentId` | Agent-scoped Usage query | DIRECT | Usage records scope |
| Usage | `agentId` | Agent | DIRECT | Server response scope is asserted in integration coverage |
| Execution Run | `agentId` | Agent | DIRECT | Runs contract audit only; not rendered without a bound |
| Evidence | `entityRefs[]` with `execution-run` | Execution Run | DIRECT when present | Not rendered pending bounded, correct Agent scope |
| Usage | `executionRunId` | Execution Run | DIRECT | Run identifier shown |
| Usage | `reservationId` | Reservation | DIRECT when present | Identifier shown |
| Reservation | `quoteId` | Quote | DIRECT | Preserved by Product API usage projection |
| Usage | `settlementId` | Settlement | CANONICAL DERIVED | Product API resolves settlement to reservation/quote where needed, preserving ACS-BLOCKER-014 s63 behavior |
| Cost | No standalone Agent cost record | Agent | UNAVAILABLE | No total or derived accounting shown |
| Task / Attempt | No verified Agent-local operational query | Agent | UNAVAILABLE | Not rendered |
| Usage | Current Agent revision | Agent revision | UNAVAILABLE | No execution-revision field in Usage contract; not inferred |

No association uses Agent name, provider/model identity, timestamps, or browser heuristics.
