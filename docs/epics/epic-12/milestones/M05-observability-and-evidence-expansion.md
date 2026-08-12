# M05 - Observability And Evidence Expansion

Status: PLANNING

## Mission

Define the observability and evidence-correlation expansion required for
operational hardening without creating a full incident management platform.

## Problem

EPIC-11 exposed logs, audit, diagnostics, evidence, and economics visibility.
EPIC-12 must decide how deep observability must become to support readiness
claims and reliable investigation.

## Candidate Capabilities

- logs depth and filtering;
- diagnostics clarity;
- trace correlation;
- alert and health threshold visibility;
- evidence correlation across actor, request, entity, operation, result, and
  time;
- retention and partial-data language.

## Dependencies

- M04 operational reliability state model;
- Product API evidence projections;
- observability source inventory;
- secrets boundary to avoid disclosure in logs and evidence.

## Out Of Scope

- full incident lifecycle platform;
- postmortem workflow tooling;
- external observability backend replacement;
- compliance program tooling;
- broad alerting automation.

## Risks

- overbuilding observability beyond EPIC-12 readiness needs;
- leaking secrets through evidence or logs;
- flattening logs, diagnostics, traces, alerts, and health into generic status;
- claiming correlation without stable identifiers.

## Expected Validation

- observability depth decision;
- correlation identifier strategy;
- logs/diagnostics/traces/alerts/health scope;
- evidence safety review;
- deferred scope for incident platform and compliance tooling.

## Preliminary Acceptance Criteria

- observability depth is explicit;
- evidence correlation requirements are testable;
- secret-safety constraints are included;
- partial observability and data absence are honestly represented.

## Open Questions

- Which observability sources currently exist?
- What retention assumptions are acceptable?
- Which identifiers correlate evidence across surfaces?
- Are alerts visibility-only or actionable?

## EPIC-11 Caveat Relationship

M05 consumes EPIC-11 evidence, diagnostics, and operational hardening caveats.

## EPIC-12 Decision Relationship

M05 is blocked on Observability depth and depends on Secrets boundary and M04
operational reliability decisions.
