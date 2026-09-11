# ACS Current-State Audit

**Evidence state:** VERIFIED LOCAL FACT unless marked otherwise.  
**Audit date:** 2026-09-11

## Result

The repository has the foundation required to extend Workforce without a
parallel control plane. It does not contain a canonical Workforce aggregate,
Workforce revision, member roster, Workforce repository, or canonical
coordination contract. Existing runtime Worker terminology denotes process and
host capacity and MUST NOT be relabeled as a Workforce member.

## Inventory and classification

| Primitive | Local evidence | Workforce use | Classification |
| --- | --- | --- | --- |
| AgentDefinitionV2 and AgentRevisionV2 | src/native-core/agent.ts:20-80,142-230 | Stable Agent identity, append-only revision, fingerprint and authority/resource references. | REUSE |
| Agent lineage repository | src/control-plane/shared-state/native-core-durable.ts:58-110; migrations.ts:243-275 | Pattern for atomic revision append, CAS, idempotent event/outbox write. | ADAPT |
| Native repository interface | src/control-plane/shared-state/native-core-durable.ts:118-142 | Existing asynchronous boundary for lineage, events, checkpoints, evidence, usage, and cost; needs Workforce operations rather than a parallel repository. | EXTEND |
| Governed roles | src/control-plane/composition-resources.ts:4-69,77-94 | Existing role resource reference may bind a Workforce member slot. | REUSE |
| RunV2 | src/native-core/runtime.ts:109-128 | Already accepts workforce revision reference; no ownership redesign. | EXTEND |
| TaskV2 and TaskAttemptV2 | src/native-core/runtime.ts:130-153 | Canonical logical task and admitted attempt semantics. | REUSE |
| CheckpointV2 | src/native-core/runtime.ts:155-172 | Recovery boundary; Workforce only supplies history. | REUSE |
| ExecutionContextV2 | src/native-core/runtime.ts:50-67 | Includes Workforce, Workflow, and Agent revision references. | EXTEND |
| Runtime Core assignment, leases, fencing | src/workers/durable-runtime-state.ts:1-145; src/native-core/runtime.ts:532-550 | Coordination compiles admitted tasks to this substrate. | REUSE |
| Event envelope and outbox | src/native-core/runtime.ts:174-198; migrations.ts:277-328 | Canonical event delivery remains here. | REUSE |
| Evidence | src/native-core/evidence.ts:20-117 | Workforce changes and participation link through existing records. | REUSE |
| Usage and cost | src/native-core/accounting.ts:17-148 | Existing Workforce revision and cost-center dimensions. | EXTEND |
| Native durable migration v3 | src/control-plane/shared-state/migrations.ts:243-353 | Accepted additive shared PostgreSQL schema foundation; future Workforce tables belong in a later additive migration. | EXTEND |
| Product API | src/http/routes/product-api-routes.ts:556-903,1250-1324 | Agent APIs and bounded execution/evidence reads exist; no Workforce API exists. | EXTEND |
| Native contract tests | tests/acs-v2-imp-01.test.mjs:102-290 | Existing identity, revision, Run/Task, event, evidence, accounting, and fencing conformance style. | EXTEND |
| Durable repository tests | tests/acs-v2-imp-01b.test.mjs:101-310; tests/acs-v2-val-01-postgres.test.mjs:128-215 | Existing additive-schema, restart, CAS, outbox, evidence, and accounting acceptance patterns. | EXTEND |
| Architecture records | docs/architecture/acs-v2/req-03/contracts.md:160-268; docs/architecture/acs-v2/req-04/README.md | REQ-03 records the partial Workforce proposal; REQ-04 freezes the durable lineage/event substrate. | EXTEND |
| Early AcsOrchestrator | src/orchestrator.ts:17-95 | Sequential policy/receipt helper; no durable task work or Workforce authority. | DEPRECATE as Workforce candidate |
| Composition surface | tests/s25-composition.test.mjs:84-517 | Agent composition view only; mutations are unsupported. | NOT APPLICABLE |

## Contract gaps

1. No WorkforceDefinitionV2, WorkforceRevisionV2, WorkforceMemberV2, or
   durable repository exists.
2. RunV2 has a generic Workforce revision reference but no Workforce record to
   resolve it against.
3. TaskV2 lacks a task-level member assignment decision. A future coordination
   implementation needs an additive assignment record or event projection, not
   a second Task state machine.
4. Native migration version 3 provides Agent lineage, events, outbox,
   checkpoints, evidence, usage, and cost. It does not provide Workforce
   tables, revision history, or Run-binding enforcement.
5. UsageRecordV2 has no `attempt_id`. A future direct attempt-level usage/cost
   claim requires an additive Attempt reference or immutable bridge; REQ-06
   does not change the economic contract.
6. The current governed-resource registry accepts a role revision reference but
   reads only its current in-memory record and reports a stale revision as a
   warning. It does not demonstrate immutable role-history resolution. Future
   Workforce implementation must extend the existing governed-resource lineage
   or repository, not introduce a WorkforceRole aggregate.

## Reconciliation with earlier records

REQ-02 correctly identified Workforce as absent and proposed a revisioned
roster. REQ-06 resolves the `PARTIAL` WorkforceDefinition, WorkforceRevision,
and WorkforceRunMembership semantic proposal in REQ-03 as the Workforce v1
contract. It supersedes only those partial Workforce semantics: REQ-03 remains
the source for its other accepted contracts. Coordinator policy and Workflow
references are not part of Workforce v1 composition. They belong to
Workflow/Coordination and are frozen at Run admission. This prevents a
coordination-engine choice from altering Workforce identity.

## Existing guarantees to preserve

- Native Agent lineage is immutable and guarded by expected-head CAS.
- Canonical event, outbox, and idempotency writes are transactional.
- Runtime assignment ownership is leased and fenced; stale results are rejected.
- Evidence may record an incomplete, lost, unavailable, derived, or reconciled
  source; an external trace is never canonical by itself.
- Usage and Cost are distinct records and preserve provider/executor
  attribution without giving either authority over definitions.
