# ACS Tasks

Last updated: 2026-06-23

## ACS v2 Architecture Discovery

The controlled ACS v2 discovery backlog is maintained in
`docs/architecture/acs-v2/implementation-backlog.md`. It is a planning
backlog, not an implementation authorization. The historical task list below
remains the record for the completed L4 Readiness cycle.

## ACS-EPIC-01 Active Tasks

### Sprint 01 - Current State, Boundaries and Instruction Normalization

- [x] `ACS-REQ-01` create ACS current-state baseline from local evidence
- [x] `ACS-REQ-02` normalize ACS operational instruction set against the baseline
- [x] `ACS-REQ-03` create ACS authority boundary matrix

### Sprint 02 - Readiness Registry and Control Plane Foundation

- [x] `ACS-REQ-04` implement dedicated readiness registry
- [x] `ACS-REQ-05` implement dedicated permission state model
- [x] `ACS-REQ-06` implement centralized operational gate registry

### Sprint 03 - Integration Contracts and Cross-Nucleus Consumers

- [x] `ACS-REQ-07` define read-only consumer contract
- [x] `ACS-REQ-08` prepare AxodusAPP ACS integration preview
- [x] `ACS-REQ-09` define Business and Marketplace alignment contract

### Sprint 04 - Security, Validation and Boundary Enforcement

- [x] `ACS-REQ-10` add explicit boundary enforcement coverage
- [x] `ACS-REQ-11` perform security review and secret safety audit update
- [x] `ACS-REQ-12` re-run and document local validation in a compatible environment

### Sprint 05 - L4 Consolidation Assessment and Portfolio Update

- [x] `ACS-REQ-13` perform evidence-based L4 consolidation assessment
- [x] `ACS-REQ-14` create final ACS EPIC handoff
- [x] `ACS-REQ-15` check portfolio/global registers and document write unavailability in the current environment

## Current Documentation-Derived Gaps

- [x] separate L-Level and D-Level with confirmed evidence
- [x] replace historical validation claims with current-cycle validation evidence
- [x] consolidate authority boundaries into a single ACS-facing matrix
- [x] formalize dedicated readiness registry target shape
- [x] formalize dedicated permission state model target shape
- [x] formalize centralized operational gate registry target shape
- [x] add explicit coverage for `wallet.sign`
- [x] add explicit coverage for `provider.execute.production`
- [x] add explicit coverage for billing, settlement, and provisioning gates

## Explicitly Deferred In This Cycle

- [x] do not execute the `ACS-REQ-13` assessment during `ACS-REQ-12`
- [x] do not promote ACS to `L4 Consolidated` during `ACS-REQ-12`
- [x] do not update portfolio/global registers during `ACS-REQ-12`
- [x] do not add production execution authority during `ACS-REQ-12`

## ACS-REQ-13 Outcome

- [x] create `.instructions/reports/ACS_L4_CONSOLIDATION_ASSESSMENT.md`
- [x] recommend `PROMOTE_TO_L4_READINESS`
- [x] recommend `D3+`
- [x] confirm ACS remains non-production and without mutation authority
- [x] defer final handoff and portfolio/global register updates to later requests

## ACS-REQ-14 Outcome

- [x] create `.instructions/reports/ACS_HANDOFF_AND_OPERATIONAL_REPORT.md`
- [x] carry forward the `PROMOTE_TO_L4_READINESS` recommendation
- [x] preserve `ACS-REQ-15` as pending
- [x] confirm ACS remains local-first, config-first, mock/read-only when applicable, integration-ready, execution-gated, and non-production

## ACS-REQ-15 Outcome

- [x] inspect the ACS-REQ-13/14 evidence chain
- [x] confirm `/opt/Axodus/.instructions/` and all 13 expected register files exist
- [x] confirm the active environment does not provide write access to the global register directory
- [x] create `.instructions/reports/ACS_PORTFOLIO_REGISTER_UPDATE_REPORT.md`
- [x] record `PORTFOLIO_REGISTERS_UNAVAILABLE_IN_CURRENT_ENVIRONMENT` without simulating updates
- [x] preserve `PROMOTE_TO_L4_READINESS`, `D3+`, non-production posture, and closed execution gates

## ACS-FOLLOWUP-01 Outcome

- [x] synchronize the 13 global portfolio registers
- [x] register ACS current L-Level as `L4_CANDIDATE` pending governance adoption
- [x] register recommended L-Level `L4_READINESS` and D-Level `D3+`
- [x] preserve all canonical blocked actions and non-production authority boundaries

## ACS-GOV-01 Outcome

- [x] review local and global maturity evidence
- [x] verify validation, security, secret-safety, endpoint and boundary evidence
- [x] verify all canonical actions remain `BLOCKED`
- [x] decide `ADOPT_L4_READINESS`
- [x] record `L4_READINESS_ADOPTED`
- [x] retain `D3+`, `NON_PRODUCTION`, `EXECUTION_GATED`, and `NO_MUTATION_AUTHORITY`
- [x] retain L4 Consolidated as `NO`

## ACS-GOV-02 Outcome

- [x] verify the adopted L4 Readiness baseline
- [x] define evidence freshness, governance, authority, production, security, cross-nucleus, blocked-action, non-production, delivery-reality and sign-off gates
- [x] distinguish permanent no-go boundaries from future governance gates
- [x] define future evidence and invalidation criteria
- [x] preserve all 17 canonical blocked actions
- [x] keep ACS at `L4_READINESS`, `D3+`, `NON_PRODUCTION`, `EXECUTION_GATED`, and `NO_MUTATION_AUTHORITY`
- [x] record `GOVERNANCE_GATE_DEFINITION_ONLY`

## ACS-CLOSE-01 Outcome

- [x] verify and preserve `L4_READINESS` / `D3+` / `NON_PRODUCTION` / `EXECUTION_GATED` / `NO_MUTATION_AUTHORITY`
- [x] create `.instructions/reports/ACS_L4_READINESS_CLOSURE_AND_PORTFOLIO_HANDOFF.md`
- [x] record `ACS-GOV-03` as `DEFERRED_TO_AVOID_GOVERNANCE_LOOP`
- [x] record `ACS-GOV-04` as `NOT_OPENED`
- [x] set ACS governance track to `PAUSED_AND_HANDOFF`
- [x] preserve ACS as not `L4_CONSOLIDATED`
- [x] hand off portfolio focus recommendation to `ACADEMY-EPIC-01 - Academy L4 Consolidation`
