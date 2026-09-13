# REQ-09 Schedule, Recovery and Cancellation

## Schedule evaluation

An authored schedule must define enough immutable semantics to compute the same
logical due instants:

- normalized rule and schema/version;
- timezone and daylight-saving interpretation;
- optional calendar/exclusion reference and exact version/digest;
- start/end and applicability window;
- missed-occurrence policy and bounded catch-up limits;
- concurrency/coalescing policy;
- stable schedule key and exact Automation revision.

No universal catch-up policy is frozen. Skip, bounded replay and coalescing are
candidate policy outcomes only. The exact authored policy must be present; an
unknown or absent required policy fails closed rather than creating an
unbounded backlog.

## Durable due-work reconciliation

A scheduler is a replaceable evaluator. Correct recovery requires a durable
watermark or equivalent range proof, exclusive occurrence claims and an
idempotent reconciliation algorithm over exact schedule semantics.

After restart or evaluator outage, reconciliation must:

1. read the last durable evaluated range/claim state;
2. compute candidate due instants using the exact Automation revision and
   schedule rule applicable to each instant;
3. apply the accepted missed-occurrence and concurrency policy;
4. claim each emitted logical occurrence with its canonical key;
5. record skipped/coalesced/rejected outcomes rather than silently dropping
   them;
6. advance the durable range only when emitted outcomes are recoverable.

Current wall-clock time, a process-local timer or OpenClaw state cannot be the
historical source of schedule truth.

## Recovery boundary

Recovery before admission resumes the same Activation. Recovery after accepted
admission queries and follows the existing Run/runtime state. It cannot submit
a new admission merely because an evaluator lost the response.

Runtime recovery continues to own worker reassignment, attempts, leases,
fencing, stale-result rejection and execution cancellation. Activation recovery
must not inspect or mutate worker ownership directly.

## Cancellation

- before admission, Activation cancellation prevents the admission handoff and
  records a durable decision;
- concurrent cancellation and admission require a single deterministic winner
  or recoverable ordering proof;
- after admission, cancelling the Activation does not rewrite or directly stop
  the Run; the existing Run/Task cancellation and reconciliation machinery is
  invoked under captured policy;
- disabling or archiving Automation blocks future occurrence admission but does
  not erase Activation or Run history;
- schedule change never mutates already materialized occurrence identities.
