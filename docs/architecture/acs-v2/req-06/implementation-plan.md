# Dependency-Ordered Implementation Plan

Implementation is not authorized by REQ-06. Each milestone requires separate
authorization and must preserve current frozen contracts.

## IMP-03A — Workforce native contracts and durable primitives

**Owns:** WorkforceDefinitionV2, WorkforceRevisionV2, WorkforceMemberV2,
fingerprinting, validation, exact governed-role revision resolution,
PostgreSQL migrations, repository, CAS, lifecycle.

**Dependencies:** REQ-04 Agent lineage/event/outbox patterns.

**Exit gate:** identity/revision/CAS/immutability, governed-role historical
resolution, and restart reconstruction tests.

## IMP-03B — Membership admission and Run binding

**Owns:** WorkforceRunMembershipV2, pinned/current-head resolution, Agent
eligibility, atomic Run bind and evidence/event records.

**Dependencies:** IMP-03A; native Run contracts.

**Exit gate:** atomic binding, archived Agent, controlled upgrade, historical
reproducibility and idempotency tests.

## IMP-03C — Workflow/Coordination admission surface

**Owns:** CoordinationProposal/Decision validation, assignment decision
projection, slot eligibility checks, fake adapter contract.

**Dependencies:** IMP-03B; separately frozen Workflow graph policy contract.

**Exit gate:** unauthorized proposal rejection, reassignment evidence, immutable
in-flight Task behavior, adapter-removal proof.

## IMP-03D — Runtime compilation compatibility

**Owns:** compile admitted Task work to existing durable runtime jobs,
assignments, leases, fencing, cancellation, checkpoint, and recovery.

**Dependencies:** IMP-03C and a separately approved task workload/graph design.

**Exit gate:** duplicate delivery, stale fencing, worker death, timeout,
unknown outcome, resume, no-second-queue tests, and an accounting compatibility
decision for direct Attempt-to-Usage attribution if that projection is required.

## IMP-03E — Product API and bounded projections

**Owns:** Workforce commands, revision/history reads, Run membership inspection,
scope-authorized Workforce evidence/usage projections.

**Dependencies:** IMP-03A through IMP-03D as relevant.

**Exit gate:** Product API authorization, idempotency, redaction, pagination,
and compatibility tests.

## IMP-03F — Application experience

**Owns:** operational Workforce views using Product API only.

**Dependencies:** IMP-03E.

**Exit gate:** explicit loading/empty/error/pending/recovery states and browser
acceptance. No UI becomes a second authority.

## VAL-03 — Workforce durable acceptance

**Owns:** end-to-end conformance and removal testing.

**Dependencies:** all prior authorized milestones.

**Exit gate:** complete conformance plan, PostgreSQL recovery, runtime fencing,
event/evidence/cost reconciliation, and proof that ACS operates with Eigent and
CAMEL absent.

## Rollout gates

No production deployment follows this plan automatically. Provider, Codex,
OpenClaw, or CAMEL execution is independently gated. A failure in governance,
evidence completeness, persistence integrity, concurrency/fencing, or provider
removal tests keeps the affected milestone blocked.
