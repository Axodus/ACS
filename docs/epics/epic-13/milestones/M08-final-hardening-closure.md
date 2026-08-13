# M08 — Final Hardening & Closure

Status: PASS / IMPLEMENTED

## Mission

Consolidate final regression, claim discipline, boundary inventory and
pre-closure evidence for EPIC-13 without writing the S11 closure report.

## Scope

- final boundary and projection inventory
- GET-only and no-mutation regression checks
- financial claim, secret and invented-value audits
- Control Plane route and no-action verification
- pre-closure evidence package for S11

## Out of scope

- production financial operations
- new financial functionality
- provider/accounting/tax integration
- EPIC-13 final closure report

## Candidate stories

- validate every S03-S08 Product API projection
- validate every S03-S09 Control Plane route
- preserve all no-claim language
- prepare evidence inventory for S11

## Candidate Product API surfaces

- Existing GET-only Product API projections from S03-S08

## Candidate UI surfaces

- Billing UX & Operator Acceptance
- All EPIC-13 financial boundary surfaces

## Required decisions before implementation

- S11 remains responsible for the formal closure report.
- Production readiness remains not claimed.
- Browser real execution remains an explicit caveat.

## Acceptance criteria

- S43 final hardening regression passes
- all Product API financial projections remain GET-only
- all readiness flags remain false/not_claimed
- final-hardening-inventory.md is ready for S11 consumption

## Claim discipline

- Billing Ready: NO / not yet claimed
- Payment Ready: NO / not yet claimed
- Invoice Ready: NO / not yet claimed
- Tenant Billing Ready: NO / not yet claimed
- Production Financial Operations: NO / not yet claimed
- EPIC-13 Closed: NO / pending S11
- EPIC-13 Production Readiness: NO / not yet claimed
- Browser Acceptance Ready: NO / not yet claimed

## Dependencies

- M01 through M07

## Deferred scope

- S11 closure report
- production financial operations
- provider/accounting/tax integration
- browser certification

## Implementation note

S10 is a hardening and evidence sprint only. The historical S03-S06 remote
sequencing caveat and browser NOT EXECUTED caveat remain recorded for S11.
