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
- `COMPLETE`

Requests:
- `ACS-REQ-13` - COMPLETE
- `ACS-REQ-14` - COMPLETE
- `ACS-REQ-15` - COMPLETE WITH `PORTFOLIO_REGISTERS_UNAVAILABLE_IN_CURRENT_ENVIRONMENT`

Planned outcomes:
- evidence-based maturity assessment
- final handoff
- portfolio updates only if the required environment is available

## Hold Conditions

The roadmap remains blocked from execution-sensitive expansion while any of the following remain unresolved:
- execution authority not approved
- production security controls intentionally unavailable
- Hummingbot runtime blocked

## ACS-FOLLOWUP-01 - Global Portfolio Register Sync

Status:
- `COMPLETE`

Outcome:
- global register sync `COMPLETE`
- ACS current L-Level remained `L4_CANDIDATE` pending governance adoption
- ACS D-Level registered as `D3+`
- no production, execution or mutation authority added

## ACS-GOV-01 - L4 Readiness Adoption Review

Status:
- `COMPLETE`

Decision:
- `ADOPT_L4_READINESS`
- governance adoption `L4_READINESS_ADOPTED`
- previous L-Level `L4_CANDIDATE`
- current L-Level `L4_READINESS`
- D-Level `D3+`
- L4 Consolidated `NO`

Next target:
- `L4_CONSOLIDATED_ASSESSMENT_ONLY_AFTER_GOVERNANCE_GATES`

## ACS-GOV-02 - L4 Consolidated Governance Gate Definition

Status:
- `COMPLETE`

Outcome:
- ten governance gate categories defined
- current L-Level remains `L4_READINESS`
- D-Level remains `D3+`
- L4 Consolidated remains `NO`
- production, execution and mutation authority remain blocked
- final recommendation `GOVERNANCE_GATE_DEFINITION_ONLY`

Governance closure:
- `ACS-CLOSE-01` pauses the ACS governance track after adoption and gate definition.
- `ACS-GOV-03` is deferred to avoid governance looping.
- `ACS-GOV-04` is not opened.
- ACS should return only when a formal L4 Consolidated assessment is actually intended.

Next portfolio focus:
- `ACADEMY-EPIC-01 - Academy L4 Consolidation`
- secondary option: `MINING-EPIC-01 - Mining L4 Consolidation`
