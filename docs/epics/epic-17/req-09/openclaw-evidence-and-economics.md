# REQ-09 OpenClaw, Evidence and Economics

## OpenClaw and provider-neutral adapters

```text
ACS owns authored intent, occurrence identity, Activation and admission
adapter may observe time/event or execute accepted work
adapter returns normalized observations/results
```

OpenClaw may:

- surface an event or due-time observation through a bounded adapter;
- perform evaluator work assigned by ACS with a stable occurrence key;
- execute already-admitted work through existing engine/worker interfaces;
- return normalized health, observation, result and failure Evidence.

OpenClaw may not own Automation revisions, schedule truth, Activation identity,
deduplication truth, authority decisions, Agent identity, admission, Run history
or Cost. `schedulingEligible` remains a target readiness observation only.

Alternative runtimes use the same provider-neutral boundaries. Provider feature
absence is an explicit capability/fail-closed result, not a reason to move
canonical state into one adapter.

## Evidence and provenance chain

Existing Events, Source, Decision, Approval and Evidence remain authoritative.
A future Activation vocabulary must correlate:

```text
Automation revision
  -> trigger/schedule/manual source observation
  -> occurrence claim and Activation decisions
  -> authority/policy/configuration snapshot
  -> admission decision
  -> Run / Task / Assignment / Attempt
  -> runtime result / artifacts / Usage / Cost
```

Event retries preserve the same event/causation/idempotency identities. Evidence
must distinguish an observed occurrence, a rejected Activation, an accepted
admission and a completed execution; none implies another.

## Usage, Cost and Economics

Run-based Usage and Cost attribution remains canonical. Automation and
Activation add correlation dimensions/references only when the cost is caused
by their admitted work.

If pre-admission evaluation itself becomes billable or budget-relevant, the
existing Accounting/Economics owner must define an operation-level attribution
contract before use. Activation cannot invent a ledger, quote, budget,
reservation, settlement or royalty model.

```text
Automation/Activation correlation != economic authority
Trigger delivery != billable execution by assumption
Genome trait != economic right
```
