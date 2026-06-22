# ACS Roadmap

Last updated: 2026-06-22

## Current Track

Current roadmap focus:
- `ACS-EPIC-01 - ACS L4 Consolidation`

Boundary:
- roadmap progress must not be interpreted as execution authority
- ACS remains local/mock, read-only where applicable, and non-production

## Sprint 01 - Current State, Boundaries and Instruction Normalization

Status:
- `COMPLETE`

Request progress:
- `ACS-REQ-01` - COMPLETE
- `ACS-REQ-02` - COMPLETE
- `ACS-REQ-03` - COMPLETE

Deliverables in scope:
- current-state baseline
- normalized operational instruction set
- authority boundary matrix

Out-of-scope for this sprint:
- source-code implementation of new registries
- promotion to `L4 Consolidated`
- portfolio/global register updates

## Sprint 02 - Readiness Registry and Control Plane Foundation

Status:
- `COMPLETE`

Requests:
- `ACS-REQ-04`
- `ACS-REQ-05`
- `ACS-REQ-06`

Planned outcomes:
- dedicated readiness registry
- dedicated permission state model
- centralized operational gate registry

Dependency:
- Sprint 01 authority matrix must be complete first

## Sprint 03 - Integration Contracts and Cross-Nucleus Consumers

Status:
- `COMPLETE`

Requests:
- `ACS-REQ-07`
- `ACS-REQ-08`
- `ACS-REQ-09`

Planned outcomes:
- read-only consumer contract
- AxodusAPP preview integration
- Business and Marketplace alignment contract

## Sprint 04 - Security, Validation and Boundary Enforcement

Status:
- `COMPLETE`

Requests:
- `ACS-REQ-10`
- `ACS-REQ-11`
- `ACS-REQ-12`

Planned outcomes:
- explicit boundary enforcement coverage
- security review update
- reproducible local validation evidence

## Sprint 05 - L4 Consolidation Assessment and Portfolio Update

Status:
- `IN_PROGRESS`

Requests:
- `ACS-REQ-13` - COMPLETE
- `ACS-REQ-14`
- `ACS-REQ-15`

Planned outcomes:
- evidence-based maturity assessment
- final handoff
- portfolio updates only if the required environment is available

## Hold Conditions

The roadmap remains blocked from execution-sensitive expansion while any of the following remain unresolved:
- execution authority not approved
- production security controls intentionally unavailable
- portfolio/global registers unavailable in the current environment
- Hummingbot runtime blocked
