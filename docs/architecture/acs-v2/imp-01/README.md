# ACS-V2-IMP-01 — Native Core Foundations

## STATUS

`PARTIAL`

The implementation establishes the provider-neutral native contract layer for
the frozen REQ-03 foundations. It is independently buildable and covered by
focused conformance tests. The milestone is partial because the current change
does not add the durable Agent lineage repository or the transactional ACS
event/outbox persistence required to claim complete native runtime
implementation.

`ACS-BLOCKER-014` remains a separate `HIGH / OPEN` blocker. This document does
not claim a green repository-wide suite or production readiness.

## IMPLEMENTED

- Shared identifiers, scopes, revision references, policy snapshots,
  idempotency records, schema versions, validation issues, secret-material
  rejection, deterministic JSON serialization, and SHA-256 helpers.
- ACS-owned `AgentDefinition` and immutable `AgentRevision` contracts,
  including revision fingerprinting, provider-neutral preferences, governance,
  evidence and economic references, validation, and round-trip serialization.
- Runtime envelopes for `ExecutionBinding`, `ExecutionContext`,
  `ExecutionPolicy`, `ExecutionRequest`, `ExecutionResult`, `Run`, `Task`,
  `TaskAttempt`, and `Checkpoint`.
- Explicit Run and Task state sets, transition guards, terminal behavior,
  retry and recovery guard fields, and fencing-token comparison.
- Mapping from the existing durable runtime assignment shape to a native
  `TaskAttempt`; the native layer does not create a second lease authority.
- Versioned event envelopes and an in-process append ledger that validates event
  identity and monotonic sequence within its ledger scope.
- Evidence, source, artifact, decision, approval, and execution-trace
  references, plus an append-oriented correction-aware evidence ledger.
- Provider-neutral Usage and Cost records with normalized measurements,
  hierarchical cost-center paths, decimal validation, evidence references, and
  explicit separation from pricing and settlement.
- Public exports from `src/index.ts` and focused IMP-01 conformance tests.

## REUSED

- Existing durable runtime assignment and fencing vocabulary from
  `src/workers/durable-runtime-state.ts` is adapted by
  `taskAttemptFromDurableAssignment`.
- Existing ACS Agent revision/fingerprint direction is preserved rather than
  replaced; the native contract adds a provider-neutral typed boundary around
  that semantic model.
- Existing repository TypeScript, Node test runner, ESM, and deterministic
  build conventions are reused.

## INTENTIONALLY NOT COMPLETE

- Durable AgentDefinition/AgentRevision repository operations, immutable
  lineage persistence, restart/reload proof, and update/delete rejection at the
  storage boundary remain follow-up work.
- Event persistence, transactional fact-before-dispatch outbox behavior,
  cursor persistence, and durable reconstruction of a Run from events remain
  follow-up work.
- Runtime mutation, worker dispatch, executor adapters, provider adapters,
  Workforce membership, Workflow graph orchestration, and Product API v2 remain
  outside this implementation slice or are still `PARTIAL` under REQ-03.

These limits are recorded instead of being filled by assumptions about the
`PARTIAL` Workforce or Product API contracts.

## CONTRACT TRACEABILITY

The complete contract-to-code-to-test matrix is in
[implementation-traceability.md](./implementation-traceability.md). The matrix
distinguishes native contract evidence from existing runtime evidence and
marks persistence gaps explicitly.

## VALIDATION

Validation is recorded from the actual repository commands below. The focused
suite is separate from the pre-existing full-suite blocker and must remain so.

| Check | Scope | Result |
| --- | --- | --- |
| `npm run build` | TypeScript build | PASS, exit `0` |
| `node --test tests/acs-v2-imp-01.test.mjs` | IMP-01 conformance | PASS, `1` test passed, exit `0` |
| `node --test tests/runtime.test.mjs tests/s49-epic-15-5-durable-runtime-state.test.mjs tests/unified-agent-model.test.mjs` | Reused runtime/Agent behavior | PASS, `3` tests passed, exit `0` |
| `node --test tests/s27-operational-evidence.test.mjs tests/s63-epic-16-3-usage-settlement.test.mjs` | Related existing behavior | FAIL, `2` test files failed, exit `1`; failures are pre-existing and remain separately classified |
| `npm test` | Repository-wide regression suite | FAIL, `687` tests: `680` passed, `5` failed, `2` skipped, exit `1`; all five failures remain in the documented blocker set |
| `git diff --check` | Patch hygiene | PASS, exit `0` |

## BASELINE COMPARISON

The authoritative pre-IMP baseline from September 9, 2026 was `680` tests:
`673` passing, `5` failing, and `2` skipped. The post-IMP repository-wide run
on September 10, 2026 reported `687` tests: `680` passing, `5` failing, and
`2` skipped. The delta is `+7` tests with the same five failing blocker cases;
the five failures were not modified, deleted, skipped, weakened, or
reclassified by IMP-01.

IMP-01 adds a separate focused suite. Its result must be read alongside the
baseline; it does not replace or repair the repository-wide baseline.

## BLOCKERS

`ACS-BLOCKER-014` remains `HIGH / OPEN`. The documented failures are in
operational evidence HTTP behavior, observability/rate limiting, production
target child-process resolution, a missing economic public export, and
usage/reservation correlation. The related `s27` and `s63` tests remain
failing in the current repository and are not absorbed into the native core.

## DEVIATIONS

No frozen REQ-03 semantic contract was changed. The implementation is a native
contract and conformance layer; persistence and outbox completion are deferred
because implementing them here would require a larger runtime mutation and
transaction-boundary change than this slice can substantiate safely.

## NEW DEPENDENCIES

None.

No provider SDK, external runtime, orchestration framework, Agenta, Eigent,
CAMEL, Codex, OpenClaw, or model-provider dependency was introduced.

## SECURITY IMPACT

No material security-boundary change. Canonical records reject common secret
material keys, use references for credentials and providers, preserve ACS
identity ownership, and keep executor/provider observations outside canonical
authority.

## UNRESOLVED CONTRACT QUESTIONS

- Which existing durable ACS repository and transaction boundary will own
  immutable Agent revision lineage and its outbox record?
- Which existing event/audit persistence mechanism will be extended to satisfy
  the REQ-03 fact-before-dispatch outbox invariant without introducing a second
  event authority?
- What persistence acceptance evidence will close the remaining Phase 1–3
  gates: restart/reload, idempotency conflict, projection rebuild, and durable
  reconstruction from events?

These are implementation decisions for the next authorized runtime-persistence
slice, not changes made by IMP-01.

## FILES CHANGED

- `src/native-core/primitives.ts`
- `src/native-core/agent.ts`
- `src/native-core/runtime.ts`
- `src/native-core/evidence.ts`
- `src/native-core/accounting.ts`
- `src/native-core/index.ts`
- `src/index.ts`
- `tests/acs-v2-imp-01.test.mjs`
- `docs/architecture/acs-v2/README.md`
- `docs/architecture/acs-v2/req-03/` normative REQ-03 package already present in the worktree
- `docs/architecture/acs-v2/imp-01/README.md`
- `docs/architecture/acs-v2/imp-01/implementation-traceability.md`

## NEXT RECOMMENDED MILESTONE

Authorize a narrowly scoped durable-persistence follow-up for Agent revision
lineage and ACS event/outbox integration. It should begin with repository and
transaction-boundary mapping, preserve the current durable runtime authority,
and close the persistence gates before any Workforce or Product API v2
implementation.
