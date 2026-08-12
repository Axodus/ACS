# M06 - Economics Boundary Closure

Status: PLANNING

## Mission

Close the EPIC-12 Economics boundary decision without converting operational
economics visibility into billing by accident.

## Problem

EPIC-11 delivered operational economics visibility for quotes, reservations,
metering, settlements, and receipts. EPIC-12 must decide whether Economics is a
dedicated flow or part of operational evidence, while keeping billing out of
scope unless explicitly deferred to a future epic.

## Candidate Capabilities

- Economics as dedicated flow option;
- Economics as operational evidence sublayer option;
- quote visibility boundaries;
- reservation visibility boundaries;
- metering visibility boundaries;
- settlement and receipt visibility boundaries;
- billing boundary register.

## Dependencies

- Product API economics support;
- evidence correlation from M05;
- governance/admin boundary if economics visibility depends on authority;
- candidate inventory economics and billing entries.

## Out Of Scope

- complete billing;
- invoices;
- payment rails;
- revenue operations;
- productized financial forecasting;
- finance planning workflows.

## Risks

- treating economics evidence as billing readiness;
- creating finance workflows without explicit scope;
- exposing unsupported settlement or receipt claims;
- hiding missing economics data.

## Expected Validation

- explicit Economics boundary decision;
- decision rationale for dedicated flow vs evidence sublayer;
- billing deferred-scope register;
- evidence requirements for economics visibility;
- unsupported economics states documented.

## Preliminary Acceptance Criteria

- Economics remains an explicit decision until closed by the Planner;
- billing is not included in EPIC-12 by default;
- quote, reservation, metering, settlement, and receipt visibility are bounded
  by available Product API evidence;
- no `Billing Ready` claim is made.

## Open Questions

- Does Economics deserve a dedicated flow in EPIC-12?
- Is economics visibility better handled inside operational evidence?
- Which economics states have reliable backing data?
- What billing scope should be deferred to EPIC-13+?

## EPIC-11 Caveat Relationship

M06 consumes EPIC-11 operational economics caveats and preserves the statement
that economics is not billing.

## EPIC-12 Decision Relationship

M06 is blocked on Economics boundary and depends on M05 evidence correlation.
