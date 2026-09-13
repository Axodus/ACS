# EPIC-17 Agent Guide

## Scope

These instructions apply to work under `docs/epics/epic-17/` and to work
explicitly attributed to EPIC-17.

The current authorized milestone is documentation only. Do not change product
code, tests, schemas, migrations, tables, routes, APIs, UI, providers, runtime
configuration or production state under this milestone.

## Read first

1. `README.md`
2. `architecture-and-boundary-review.md`
3. `capability-inventory.md`
4. `precedence-matrix.md`
5. `decision-register.md`
6. Relevant ACS v2 Agent, Workforce, runtime, Evidence and persistence records

## Classification discipline

Every capability must cite current repository evidence before receiving a
classification.

- `REUSE` preserves the existing owner and contract.
- `ADAPT` permits a bounded adapter or projection.
- `EXTEND` reserves an additive proposal for later REQ review.
- `NEW` records a missing owner or insufficient contract only.
- `REJECT` forbids a duplicate, weakening or incompatible approach.

`NEW` does not authorize an entity, aggregate, schema, API, table, service,
migration or implementation. Never convert a planning classification into
implementation authority.

## Canonical boundaries

- Do not create another Agent identity, Agent revision stream or lifecycle.
- Do not create `SubAgent` as a distinct identity type.
- Do not redefine Workforce, WorkforceRevision, slots, memberships, admission,
  Assignment, Run, Task or Attempt.
- Do not create a parallel persistence service, event system, outbox,
  idempotency mechanism, runtime, Evidence ledger, Cost model or Product API.
- Keep Automation separate from execution; whether it becomes an aggregate is
  a REQ decision.
- Keep Memory separate from Run State, checkpoints, Knowledge, Evidence and
  event history.
- Keep raw secrets outside Agent, profile, history and API representations.
- Keep OpenClaw and every provider replaceable and non-canonical.
- Treat Genome traits as descriptive references without authority or economic
  rights.

Any proposed incompatible change to a frozen Workforce/runtime contract must
stop as a blocker and architecture escalation.

## Evidence and language

Use repository paths and symbols for implemented facts. Label gaps,
hypotheses, candidate aggregates and future interfaces explicitly. Do not
describe a route, store, schedule, memory system, delegation model or Genome
representation as implemented unless current code proves it.

The review exists to discover where the original proposal is wrong. Do not
force evidence to preserve an initial classification.

## Configuration resolution

Do not apply a universal `global -> Agent -> Workforce -> operation` override
rule. Resolve authority separately for presentation, models, capabilities,
skills/tools, credentials, security, governance, runtime, memory, Evidence and
Cost/budget.

The invariant is deterministic historical reconstruction without authority
escalation at lower layers.

## Change and closure rules

- Preserve EPIC-16 and prior closure records.
- Preserve independently governed VAL-03 work.
- The Architecture & Boundary Review may authorize REQ decomposition only.
- REQ numbering and count are derived after the dependency graph; the original
  eleven-request list is not mandatory.
- NFT, inheritance, mutation, breeding, marketplace, royalties and Genome
  economics remain rejected and require a new executive decision to enter
  scope.
