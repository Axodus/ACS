# Agenta–ACS Capability Matrix

| Capability | Current ACS evidence | Agenta reference evidence | ACS contract/owner | Target decision | Rationale |
| --- | --- | --- | --- | --- | --- |
| Agent list | `/agents` inventory with search/filter/sort | Agent/app list is part of local workflow | ACS Agent service | `ACS-NATIVE` | Identity and lifecycle belong to ACS. |
| Intent-first creation | No current purpose/instructions field | Documented “what do you want to build?” entry | No current ACS contract | `ADAPT` | Useful entry pattern; requires a future purpose/instructions contract if persisted. |
| Name | Required current field | Agenta names the created agent | `AgentDefinition.name` | `REUSE UX PATTERN` | Keep explicit ACS naming and identity. |
| Description/purpose | Missing | Description starts the documented workflow | No current field | `REQUIRES ARCHITECTURE DECISION` | Decide whether purpose is metadata, instruction content, or a separate product field. |
| Instructions/prompt | Missing | Configuration includes Instructions/AGENTS.md | No current field | `DEFER` | Do not add a frontend-only prompt field without an ACS-owned contract. |
| Model/runtime | Provider/model selectors and execution plan exist | Model & harness is a grouped configuration section | Agent model strategy, ExecutionPlan | `ADAPT` | Present provider-neutral runtime binding with advanced detail. |
| Parameters/variables | No current field or endpoint evidence | Playground/configuration supports editable configuration concepts | No current ACS contract | `DEFER` | Future capability; requires schema and execution semantics. |
| Tools | Catalog-backed IDs in current form | Add-tool workflow is documented | `toolIds`, composition | `ADAPT` | Explain capability and governance meaning; avoid raw identifiers as primary UX. |
| Skills | Catalog-backed IDs in current form | Skills are a separate task-procedure concept | `skillIds`, composition | `ADAPT` | Reuse grouping, preserve ACS catalog ownership. |
| Files/knowledge | No Agent file surface | Files/knowledge are documented Agenta concepts | No ACS contract in inspected model | `REJECT` for v1 | Do not import a storage model without an ACS knowledge contract. |
| Playground/test | No current route or command evidence | Playground is a central build/test surface | No current ACS command/read model | `DEFER` | Classify as future IMP, not current behavior. |
| Save/commit | Create/update/revision endpoints exist | Commit creates a version | ACS immutable revision lineage | `ACS-NATIVE` | Map commit mental model to append revision and compare-and-swap. |
| Version history | Revisions, adopt, restore available | Registry/version history documented | REQ-04 Agent lineage | `REUSE UX PATTERN` | Present ACS revision/fingerprint/provenance, not Agenta variants. |
| Comparison | No explicit compare route in current frontend | Version comparison is described as available in local docs | No current compare contract identified | `DEFER` | Useful later; do not invent a read model. |
| Invocation/use | Execution plans and runs exist | Deployment/playground/invocation references exist | ExecutionPlan, Deployment, ExecutionRun | `ADAPT` | Keep ACS execution and governance semantics. |
| Activity/traces | Global executions, events, logs, audit, evidence | Traces and observability pages exist in local source tree | Run/Event/Evidence/Audit | `ADAPT` | Add contextual Agent links and preserve distinct evidence classes. |
| Evaluations | No current evaluation workflow | Evaluation routes and docs exist | No ACS evaluation contract in inspected scope | `DEFER` | Future product capability. |
| Usage/cost | Global and Agent-scoped economics endpoints | Agenta observability/evaluation references exist | Usage/Cost/Economics | `ACS-NATIVE` | Economics remains an ACS boundary. |
| Permissions/governance | Governance enforcement and credentials exist | Agenta documents permissions | ACS governance and credential authorities | `ACS-NATIVE` | Preserve ACS authority and tenant isolation. |
| Deployment | Deployment plan/readiness exists | Agenta deployment pages exist | Deployment/Runtime | `ADAPT` | Expose as operational transition after configuration, not as Agent identity. |

