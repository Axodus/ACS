# ACS Tasks

Last updated: 2026-06-22

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
- [ ] `ACS-REQ-14` create final ACS EPIC handoff
- [ ] `ACS-REQ-15` update portfolio/global registers when environment is available

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
