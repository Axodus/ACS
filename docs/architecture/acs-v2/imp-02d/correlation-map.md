# IMP-02D Correlation Map

| Source entity | Canonical field | Target entity | Classification | UI use |
| --- | --- | --- | --- | --- |
| Route | `agentId` | Agent Runs query | DIRECT | Server-scoped Runs page |
| Route | `agentId` | Agent Evidence query | DIRECT | Server-scoped Evidence page |
| Route | `agentId` | Agent Usage and economics queries | DIRECT | Server-scoped Usage and projection requests |
| Run | `agentId` | Agent | DIRECT | Product API ownership scope; not inferred in the browser |
| Evidence | `entityRefs[]` with Agent reference | Agent | DIRECT | Product API ownership scope |
| Evidence | `entityRefs[]` with execution-run reference | Run | DIRECT when present | Technical context identifier only; no unsupported Run filter is added |
| Evidence | `correlationId` | Related operational correlation | DIRECT when supplied | Technical correlation metadata |
| Usage | `executionRunId` | Run | DIRECT | Run identifier shown |
| Usage | `reservationId` | Reservation | DIRECT when supplied | Identifier shown |
| Reservation | `quoteId` | Quote | DIRECT | Preserved Product API correlation |
| Usage | `settlementId` | Settlement | CANONICAL DERIVED | Product API preserves the accepted settlement/reservation/quote chain |
| Run | execution Agent revision | Agent revision | UNAVAILABLE | `revisionId: 0` is not rendered as provenance |
| Cost | canonical Agent total | Agent | UNAVAILABLE | No standalone cost record or authoritative summary total is displayed |

No relationship uses Agent name, timestamp proximity, provider, model, labels, or visual similarity.
