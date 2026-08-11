# EPIC-11 Milestone F — Control Plane Hardening

## Goal

The surface becomes consistent, recoverable, and ready for acceptance.

## Scope

- policies
- tenants and isolation visibility
- configuration visibility
- error handling
- UX consistency
- long-running operations
- retry and recovery
- regression
- E2E validation
- EPIC acceptance

## Requests

- CP-01 Policies & Governance
- CP-02 Tenants & Isolation
- CP-03 ACS Configuration
- CP-04 Operational Error Handling
- CP-05 UX State & Operational Consistency
- CP-06 Full Agent Lifecycle E2E
- CP-07 Distributed Operations E2E
- CP-08 EPIC-11 Acceptance

## Dependencies

- all prior milestones
- stable Product API contracts
- observable real flows to validate against

## Success criteria

- the surface behaves consistently across flows
- regressions are caught by the acceptance path
- out-of-scope production hardening items can be deferred without breaking the core operational surface
