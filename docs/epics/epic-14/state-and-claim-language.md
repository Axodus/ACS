# EPIC-14 State and Claim Language

## Purpose

This document is the authoritative vocabulary for how ACS Control Plane
surfaces communicate system state, health, readiness, governance posture and
operational claims.

It must be used by all AEES-04 and later UI work. It does not redefine backend
contracts; it defines presentation semantics that must map to authoritative
Product API or backend state.

## Core principles

1. State dimensions are orthogonal. Lifecycle, health, readiness, governance,
   connectivity and availability may coexist and must be presented separately
   when relevant.
2. Claim strength must match evidence. Never promote unknown, unsupported or
   not claimed into authoritative language.
3. Unknown and unavailable are first-class states. They protect claim integrity.
4. Severity is not state. A high-severity finding may exist on a partially
   operational entity.
5. Visual treatment follows semantics, never the reverse.
6. Terminology must be consistent across Overview, domain surfaces, entity
   detail and cross-domain references.

## State dimensions

| Dimension | Meaning | Authoritative source | Examples |
|---|---|---|---|
| Lifecycle | Governed existence and revision lifecycle | Product API lifecycle projections | draft, configured, deployed, active, stopped, archived |
| Operational health | Current operational condition | runtime/provider health, reconciliation, failure/drift projections | healthy, degraded, failed, unavailable |
| Readiness | Preconditions for a specific operation | readiness summaries, readiness flags, composition readiness | ready, not ready, partial, blocked, unknown |
| Governance / policy | Authority, restriction or approval posture | guardrails, policy findings, supported/unsupported action metadata | approved, pending approval, restricted, blocked by policy, revoked, unsupported |
| Connectivity / integration | Observable link to runtime or external targets | connectivity fields, provider health, credential validation, engine probes | connected, degraded, disconnected, unavailable, misconfigured |
| Availability | Whether a capability/resource can be used | availability fields on engines, providers, models, skills, tools and plugins | available, preview, pending, unavailable, credential required |

## Claim language

| Claim | Meaning | Authoritative source | True when | Unknown / failure behavior | Allowed surfaces |
|---|---|---|---|---|---|
| Ready | Meets preconditions for intended operation | readiness projections | required gates pass and no blockers remain | not ready, partial, blocked, unknown | Overview, entity headers, readiness surfaces |
| Healthy | Current operational condition is nominal | runtime/provider health | no active degradation or failure signals | degraded, failed, unavailable | Operations, runtime lists, health indicators |
| Connected | Observable link to target exists | connectivity/probe fields | recent successful contact exists | degraded, disconnected, unavailable | Runtime, provider, Overview connectivity |
| Governed | Subject to policy or approval constraints | guardrails and action metadata | explicit governance boundary applies | restricted, unsupported | action surfaces, Governance, entity detail |
| Available | Capability or resource can be selected or used | availability fields | source reports usable state | preview, pending, unavailable, credential required | Capabilities, composition, catalog lists |
| Production ready | Meets production criteria | production-readiness evidence only | all production gates pass with evidence | explicit no-claim or blockers present | System / readiness only |
| Economically bounded | Uses AEES-03 financial language and authority | Economics projections and labels | Product API economics values are present with unit and scope | unavailable, not claimed | Economics, contextual summaries |

Unsupported unless a future contract establishes them: secure, compliant,
verified, synchronized, live and isolated.

## Badge and status rules

- Use at most one primary state badge per entity header.
- Secondary dimensions belong in summary rows, finding rows or disclosed
  sections rather than stacked competing badges.
- good tone means positive nominal state such as healthy, ready, available or
  validated.
- warn tone means degraded, partial, blocked, attention or restricted state.
- muted tone means informational, archived, unsupported, unavailable, unknown or
  count metadata.
- Badge tone alone must not communicate severity.
- IDs, plain counts and repeated metadata should not become decorative badges.

## Unknown and unavailable language

- unavailable means ACS cannot currently determine the value.
- unknown means evidence exists but is insufficient or contradictory.
- not claimed means explicitly outside current supported semantics.

Missing or unavailable values must never silently become zero, healthy or ready.

## Temporal language

- Surface checked, last observed, snapshot age or equivalent when a state can
  become stale.
- Preserve stale banners when a previous snapshot is retained after refresh
  failure.

## Findings and attention

Findings are classified by severity independently from entity state: error,
warning or info.

Critical or blocking findings must remain reachable from Overview and entity
surfaces. Non-blocking warnings may be secondary or diagnostic.

## Cross-domain consistency

- Agent economic context must use AEES-03 language.
- Operations must not invent cost or billing terminology.
- Readiness surfaces must preserve EPIC-12 and EPIC-13 no-claims.
- All surfaces inherit the same state-dimension vocabulary.

## Change process

Any addition or change to this vocabulary requires:

1. update to this document;
2. corresponding contract updates in contracts.md;
3. migration of affected UI labels/components;
4. validation that no stronger claim is introduced without evidence.
