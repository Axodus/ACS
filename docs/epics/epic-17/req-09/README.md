# EPIC-17-REQ-09 — Activation, Trigger, Schedule & Runtime Admission Boundary

**Status:** `COMPLETE / ACCEPTED`
**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `8e5c60977affa299b864a42d831e79ef4339ab2a`
**Baseline:** `0a3c590c0aa478c1485ab3e006c4ab81dfa045b4`
**Dependencies:** `REQ-03`, `REQ-07` and `REQ-08 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Boundary

```text
AutomationRevision
  -> Trigger observation / Schedule occurrence / Manual request
  -> durable idempotent Activation
  -> current authority + policy + lifecycle evaluation
  -> exact target and effective-configuration resolution
  -> existing admission
  -> Run / Workforce membership / Task / Assignment
  -> RuntimeExecutionIntentV2
  -> existing worker / lease / fencing / recovery
```

Activation is the Tenant-scoped, durable causal occurrence that evaluates one
exact Automation revision for possible admission. It owns neither the authored
Automation nor the admitted execution.

The architecture-level phrase `execution intent` before admission means a
logical request to execute. It is not the implemented
`RuntimeExecutionIntentV2`: repository evidence shows that canonical runtime
intent is compiled only after Run admission and Task assignment. REQ-09 keeps
that order and rejects a competing pre-admission runtime-intent type.

## Capability dispositions

| Capability | Class | REQ-09 disposition |
| --- | --- | --- |
| `E17-C46` Scheduled Tasks | `NEW` | A schedule produces Activation occurrences targeting existing admission; a scheduled Task type is rejected. |
| `E17-C47` Triggers | `NEW` | Normalize authenticated source observations with exact source identity, logical event key, digest and Evidence; an observation grants no authority. |
| `E17-C48` Schedules | `NEW` | Keep authored schedule semantics under the Automation revision and canonical occurrence history under Activation; a scheduler is only an evaluator. |
| `E17-C51` Idempotent activation | `EXTEND` | Require one canonical Activation and admission lineage per logical occurrence using shared idempotency, event and outbox rules. |
| `E17-C52` Retry and concurrency | `ADAPT` | Activation retries reuse the same occurrence; execution retries remain under Run/Task/Attempt, leases and fencing. |
| `E17-C53` Automation history | `ADAPT` | Correlate exact Automation revision, cause, Activation decision and resulting Run through existing Events/Evidence authority. |
| `E17-C54` Recovery/restart | `EXTEND` | Require durable occurrence claims, schedule watermarks and reconciliation without creating another execution-recovery system. |
| `E17-C55` Run linkage | `EXTEND` | Add causal Activation-to-admission-to-Run correlation while Run remains authoritative. |
| `E17-C56` Workflow target | `REUSE` | Preserve Workflow ownership and require an exact supported target reference before admission. |
| `E17-C57` Run/Task/Assignment/Attempt | `REUSE` | Preserve all existing execution lifecycle and retry machinery unchanged. |
| `E17-C59` OpenClaw execution | `ADAPT` | Permit bounded observation/evaluator/executor adapters receiving ACS-owned work; reject canonical Automation, schedule or Activation ownership. |
| `E17-C60` Alternative runtime compatibility | `REUSE` | Preserve provider-neutral engine, worker and target interfaces. |
| `E17-C61` Evidence | `REUSE` | Evidence remains authoritative; Activation adds subject and correlation requirements only. |
| `E17-C62` Provenance | `REUSE` | Reuse source, causation, correlation and decision references for the full causal chain. |
| `E17-C63` Usage and Cost | `REUSE` | Preserve Run-based accounting and add Automation/Activation correlation where attributable. |
| `E17-C64` Economics | `REUSE` | Preserve current budget, reservation and settlement authority; no Automation economics exists. |
| `E17-C65` Events/outbox/idempotency | `REUSE` | New Activation state must participate in shared transaction and delivery rules. |
| `E17-C66` PostgreSQL shared state | `REUSE` | Any future durable state uses existing shared authority; parallel persistence is rejected. |

## Package

- [Evidence and ownership](evidence-and-ownership.md)
- [Activation and cause model](activation-and-cause-model.md)
- [Idempotency, retry and concurrency](idempotency-retry-and-concurrency.md)
- [Schedule, recovery and cancellation](schedule-recovery-and-cancellation.md)
- [Admission, snapshot and runtime](admission-snapshot-and-runtime.md)
- [OpenClaw, Evidence and Economics](openclaw-evidence-and-economics.md)
- [Contract deltas, ADRs and blockers](contract-deltas-and-adrs.md)
- [Decision record](decision-record.md)
- [Acceptance gates](acceptance-gates.md)

## Non-goals

- scheduler, worker, trigger receiver or runtime implementation;
- aggregate, repository, table, schema, service, endpoint or UI selection;
- a Scheduled Task subtype or second Run/Workflow/Task lifecycle;
- pre-admission `RuntimeExecutionIntentV2` or bypass around admission;
- exactly-once external side-effect claims;
- provider/OpenClaw-owned Automation, schedule, Activation or execution history;
- incompatible Workforce, Workflow, Run, Task, Assignment, Attempt, lease,
  fencing or recovery changes;
- new pricing, settlement, ledger or Genome economics.

```text
REQ-09: COMPLETE / ACCEPTED
REQ-10: READY / GO
Implementation authority: NONE
```
