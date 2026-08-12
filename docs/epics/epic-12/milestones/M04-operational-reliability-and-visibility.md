# M04 - Operational Reliability And Visibility

Status: PLANNING

## Mission

Plan the reliability and visibility hardening needed for long-running
operations, worker/runtime status, and recovery-oriented operational flows.

## Problem

EPIC-11 exposed operational execution and evidence surfaces, but sustained
operational confidence requires clearer reliability behavior, pending/recovery
states, and runtime-worker boundaries.

## Candidate Capabilities

- long-running operation visibility;
- pending, blocked, failed, retrying, and recovering states;
- operational reliability indicators;
- worker/runtime maturity assessment;
- control-plane vs runtime-state separation;
- recovery affordance planning.

## Dependencies

- M01 persistence readiness;
- Product API execution and runtime projections;
- EPIC-10 runtime and worker domain truth;
- observability depth inputs for M05.

## Out Of Scope

- runtime reimplementation;
- worker fleet autoscaling;
- advanced scheduler;
- external execution target management expansion;
- full incident management platform.

## Risks

- treating runtime state as control-plane truth;
- expanding into advanced worker fleet management;
- simulating reliable operation without durable evidence;
- hiding long-running operation uncertainty.

## Expected Validation

- state model for long-running operations;
- evidence source for progress and recovery;
- boundaries between control-plane state and runtime observations;
- deferred scope for advanced worker/runtime management.

## Preliminary Acceptance Criteria

- reliability candidates map to Product API-backed evidence;
- unsupported and partial runtime visibility is explicit;
- runtime/worker maturity gaps are documented without reimplementation;
- recovery states are part of the planning contract.

## Open Questions

- Which operations are considered long-running?
- What progress evidence is authoritative?
- What recovery states are required?
- Which worker/runtime gaps belong to EPIC-12 vs EPIC-13+?

## EPIC-11 Caveat Relationship

M04 consumes EPIC-11 operational execution and hardening caveats while preserving
EPIC-11 as closed.

## EPIC-12 Decision Relationship

M04 depends on Persistence readiness and feeds Observability depth and final
acceptance decisions.
