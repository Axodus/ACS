# REQ-08 Evidence, Cost and Historical Reconstruction

## Provenance and history

A future Automation contract must record creation, revision commit and
lifecycle decisions through the existing event/outbox/idempotency authority.
Evidence remains append-only and records exact Automation identity/revision,
actor, Tenant, authority basis, approval, change reason and source references.

Historical reconstruction separates:

- immutable authored revision and fingerprint;
- lifecycle/head observation at Activation;
- exact direct or Delegation authority basis evaluated;
- target resolution and effective-configuration snapshot;
- Activation, admission, Run/Task/Attempt and result Evidence.

Reconstruction never re-resolves current Automation head, target head,
Delegation state, policy or provider availability and presents it as historical
truth.

## Evidence boundary

Automation may become an Evidence subject and correlation ref. It does not own
Evidence, approvals, source records or traces. Enable/disable history does not
prove execution, and an execution result does not rewrite Automation
configuration or lifecycle.

## Usage and Cost

Existing Accounting/Economics remains authoritative:

```text
Automation revision
  -> Activation occurrence
  -> admitted Run / Task / Attempt
  -> UsageRecordV2
  -> CostRecordV2
```

Automation identity/revision and Activation identity are correlation dimensions
for attribution. Actual Usage and Cost remain Run-based and preserve Agent,
Workforce, Workflow, provider, executor and policy attribution. Automation
cannot define prices, budgets, reservations, settlement or a separate economic
ledger.

The current `UsageRecordV2` and `CostCenterPathV2` do not expose an Automation
correlation. A future additive reference or Evidence correlation is a contract
gap; REQ-08 does not choose which representation is required.

Creating, revising or enabling an Automation does not imply an execution cost.
Costs arise from measured operations and remain subject to the exact budget,
cost and settlement policies re-evaluated at Activation/admission.
