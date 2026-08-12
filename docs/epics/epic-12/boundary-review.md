# EPIC-12 Boundary Review

## Belongs To EPIC-12

Items in this section are directly aligned to production readiness and
operational hardening. They may become milestones or milestone workstreams after
Planner refinement.

- authentication boundary;
- authorization / RBAC baseline;
- production secrets handling;
- persistence readiness;
- environment separation;
- browser acceptance harness;
- visual acceptance discipline;
- accessibility and responsive validation;
- operational reliability for long-running operations;
- worker/runtime maturity where it affects control-plane trust;
- observability and evidence expansion;
- evidence correlation across actor, request, entity, time, and operation;
- economics boundary decision;
- governance and administration boundary definition.

## Candidate for EPIC-13 or later

These items must not enter EPIC-12 automatically. They require explicit scope
approval and should usually be deferred unless the Planner narrows EPIC-12
around one of them.

- complete billing product;
- invoices;
- payment rails;
- enterprise tenant administration suite;
- full tenant governance console;
- advanced worker fleet management;
- autoscaling;
- runtime orchestration automation beyond readiness needs;
- full incident management platform;
- compliance program tooling;
- productized financial forecasting;
- finance planning workflows.

## Continuous hardening

These items should be observed throughout EPIC-12. They do not automatically
become standalone milestones.

- honest unsupported states;
- loading / empty / error / pending / recovery states;
- no secret leakage;
- correlation IDs;
- regression validation;
- explicit data absence handling;
- partial-data and unavailable-data language;
- production claim discipline;
- safe disclosure boundaries;
- distinction between control-plane state, runtime state, and external execution
  targets.

## Requires Prior Technical Decision

These items must not advance into implementation sequencing without an explicit
Planner decision and documented rationale.

### Economics boundary

Decide whether Economics remains:

- a dedicated flow
- part of operational evidence

The planner MUST justify the choice before any implementation sequence is locked.

### Administration / Tenant boundary

Decide whether EPIC-12 is:

- operator-focused only
- tenant-aware but not tenant-admin capable
- tenant-admin capable with narrow mutation permissions

Do not assume administration scope without explicit approval and evidence.

### Browser acceptance scope

Decide whether the epic requires:

- smoke browser verification only
- formal visual acceptance
- accessibility pass
- responsive cross-viewport acceptance

The answer affects the milestone gates and the definition of readiness.

### Auth / RBAC model

Decide the minimum baseline for:

- authenticated actor identity;
- role or permission model;
- read vs mutate authority;
- denied-state behavior;
- audit and evidence correlation.

### Secrets boundary

Decide the production boundary for:

- secret storage;
- environment injection;
- redaction;
- UI disclosure;
- logs and evidence safety.

### Persistence readiness

Decide which state must be durable before EPIC-12 can close any readiness
blocker. This includes what may remain mock, seed, sandbox, read-only, or
ephemeral.

### Observability depth

Decide the required depth for:

- logs;
- diagnostics;
- traces;
- alerts;
- health;
- retention assumptions;
- correlation across evidence surfaces.

## EPIC-11 dependency

EPIC-12 assumes the EPIC-11 surface and closure report remain valid for:

- Product API surface inventory
- control-plane shell
- agent lifecycle and composition surfaces
- operational execution surfaces
- evidence and economics visibility
- hardening caveats and deferred scope

If a candidate EPIC-12 item is actually an unfinished EPIC-11 gap, it MUST be
identified explicitly instead of being relabeled as new work.

## Do Not Reopen

EPIC-12 planning must not:

- reopen EPIC-11;
- reimplement EPIC-10;
- transform EPIC-12 into a generic UI backlog;
- declare Production Ready without evidence;
- transform Economics into billing without an explicit decision;
- transform Administration into a tenant console without an explicit decision;
- treat browser acceptance as passed without browser evidence;
- collapse runtime/workers/external execution targets into control-plane state.
