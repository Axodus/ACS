# EPIC-10 S13 — Unified Agent Model

S13 introduces the canonical ACS agent lifecycle model without collapsing governed definition, composition, deployment, runtime, execution, or billing into one mutable object.

## Implemented entities

Fully implemented:

- AgentDefinition
- AgentRevision
- AgentComposition

Defined as contracts:

- AgentDeployment
- ExecutionPlan
- RuntimeInstance
- ExecutionRun

## Lifecycle separation

Definition
→ Revision
→ Composition
→ Deployment
→ RuntimeInstance
→ ExecutionRun

The ACS top-level domain model is not:

- openclaw.json
- runtime directories
- PIDs
- logs
- generated runtime artifacts

Those remain materializations or observations.

## Security and references

AgentDefinition stores only logical references for:

- roles
- profiles
- capabilities
- skills
- tools
- model strategy
- credential connection IDs
- runner preferences
- execution policy

Raw secret-like fields are explicitly rejected by validation.

## Notes

S13 does not add CRUD, deployment, runtime lifecycle, frontend integration, or billing execution. It establishes the canonical domain boundary that later stories build on.
