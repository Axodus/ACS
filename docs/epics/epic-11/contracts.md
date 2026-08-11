# EPIC-11 Contracts

This document defines the planning-level contracts that the EPIC-11 coder agents must respect. It does not freeze final implementation details, but it does define the shape of the operational surface.

## 1. Product API consumption contract

EPIC-11 consumers MUST treat the Product API as the authoritative source of truth for:

- system health and readiness
- agent inventory and lifecycle
- composition resources
- credentials and provider connections
- deployment planning and execution
- runtime and worker state
- logs, audit, diagnostics, and evidence
- economic state and settlement visibility
- policy and configuration visibility

## 2. Operational state contract

Each surfaced capability MUST support a minimum state model:

- loading
- empty
- ready
- warning
- blocked
- error
- pending
- recovering

Long-running operations SHOULD expose progress and terminal result state.

## 3. Evidence contract

Evidence MUST be:

- append-oriented
- correlation-friendly
- redacted where needed
- attributable to actor, entity, and timestamp
- queryable by the operational surface

## 4. Error contract

Operational errors MUST distinguish:

- validation failures
- readiness blockers
- governance failures
- credential failures
- connection failures
- deployment failures
- runtime failures
- worker failures
- economic failures
- partial failures

Errors SHOULD preserve enough context for troubleshooting without exposing secrets.

## 5. Execution-plan contract

Deployment and execution requests SHOULD surface a plan object or plan summary that can carry:

- target selection
- worker requirements
- engine/provider/credential references
- policy and eligibility findings
- economic quote or reservation context
- sandbox constraints
- correlation identifiers

## 6. Domain exposure contract

EPIC-11 MAY display these consolidated domains, but MUST NOT reimplement them:

- AgentDefinition
- AgentRevision
- AgentComposition
- Runtime
- Deployment
- ExecutionPlan
- ExecutionRun
- Worker
- Credential
- Provider
- Engine
- Policy
- Eligibility
- Sandbox
- Economic Contract
- Product API

## 7. Economics boundary

Economics MUST remain open as a planning decision:

- either a dedicated operational flow
- or a sublayer of operational evidence

The implementation docs MUST preserve this ambiguity until refinement, while still documenting quote, reservation, metering, settlement, and receipt visibility where supported by the Product API.
