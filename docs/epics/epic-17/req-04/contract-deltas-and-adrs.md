# REQ-04 Proposed Contract Deltas and ADRs

## Candidate deltas

| ID | Candidate direction |
| --- | --- |
| `E17-R04-CD01` | Define common exact governed-resource reference/history guarantees without forcing one aggregate implementation. |
| `E17-R04-CD02` | Extend durable history beyond Role only for resource kinds proven necessary. |
| `E17-R04-CD03` | Separate capability definition, requirement, support Evidence and authority grant in all projections/resolvers. |
| `E17-R04-CD04` | Add Tool spec/source/version and invocation-policy references while keeping availability distinct from permission. |
| `E17-R04-CD05` | Establish an MCP server-definition resource boundary before endpoint/connection/credential semantics in REQ-05. |
| `E17-R04-CD06` | Capture exact provider/model selection and observed catalog digest/provenance in the REQ-03 snapshot. |
| `E17-R04-CD07` | Reclassify legacy `GovernedProfileResource` as an explicit capability-requirement preset or retire it after migration analysis. |
| `E17-R04-CD08` | Version compatibility/fallback decisions and fail closed on missing exact historical content. |

## Candidate ADRs

- `ADR-17-011`: governed-resource identity and exact revision semantics.
- `ADR-17-012`: capability requirement/support/grant separation.
- `ADR-17-013`: provider-neutral model identity with dynamic catalog Evidence.
- `ADR-17-014`: Tool versus Skill versus MCP resource boundaries.
- `ADR-17-015`: legacy composition Profile preset disposition.

## Implementation blockers

| ID | Blocker | Gate |
| --- | --- | --- |
| `E17-R04-B01` | Only Role has proven durable governed history. | Accept per-kind history contracts and PostgreSQL/restart/CAS tests before canonical writes. |
| `E17-R04-B02` | Static Skill/Tool/Capability/Profile revisions lack fingerprints/history. | Inventory consumers and add only accepted owner-specific history. |
| `E17-R04-B03` | No canonical general MCP definition catalog exists. | REQ-05 must separate definition, connection, credential and Channel before implementation. |
| `E17-R04-B04` | Provider/model observations lack immutable revision semantics. | Freeze snapshot observation/digest contract without duplicating provider registry. |
| `E17-R04-B05` | Legacy Profile capability union can appear to grant capability. | Migrate/adapt only after accepted preset and configuration contracts; no incidental fix. |
| `E17-R04-B06` | Product API legacy IDs lose exact resource revisions/fingerprints. | Define versioned compatibility projections before API changes. |

No blocker prevents REQ-04 acceptance. Implementation authority remains none.
