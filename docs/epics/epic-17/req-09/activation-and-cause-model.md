# REQ-09 Activation and Cause Model

## Logical Activation

Activation is one durable, Tenant-scoped evaluation occurrence for one exact
Automation revision. Stable `activation_id` semantics are required for
deduplication, recovery, cancellation, Evidence and Run correlation. This does
not authorize an Activation aggregate, repository or table.

A future logical record must be able to identify:

- Tenant, organization and product-domain scope;
- exact Automation identity, revision and fingerprint;
- stable trigger/schedule key within that revision;
- cause kind and canonical logical occurrence key;
- immutable source observation/reference and payload digest;
- observed, effective and evaluation times;
- lifecycle eligibility observation for the Automation;
- authority basis and current policy/approval decisions;
- exact resolved target and REQ-03 effective snapshot reference;
- admission decision, idempotency and correlation references;
- resulting Run/Workflow admission reference, when accepted;
- rejection, cancellation, expiry, coalescing or recovery reason;
- Events, Evidence and actor/provenance references.

## Cause classes

| Cause | Required source semantics | Authority rule |
| --- | --- | --- |
| External/internal event | issuer/source, stream or namespace, logical event ID, payload digest, occurred/received times and authentication Evidence | Event delivery grants nothing; current policy and authority are evaluated. |
| Channel observation | exact Channel/Connection refs, principal/source, delivery ID, digest and authentication/authorization Evidence | Channel and Connection references grant nothing. |
| Schedule occurrence | exact schedule specification/digest, intended instant, timezone/calendar basis, occurrence key and evaluator Evidence | Due time grants nothing; Automation lifecycle and authority are revalidated. |
| Manual request | authenticated actor, request idempotency key, requested time, purpose and policy decision | Actor authority is evaluated for this occurrence. |

One Activation has one primary logical cause. Additional duplicate deliveries or
supporting observations correlate to it as Evidence and do not create more
Activations.

## Trigger and Schedule ownership

Trigger and Schedule specifications are authored activation conditions of an
exact Automation revision. Each carries a stable logical source key in the
Automation lineage plus an immutable revision-specific representation or
digest. A reusable independent Trigger or Schedule aggregate is not
demonstrated and remains unapproved.

```text
Trigger specification != source observation
Schedule specification != scheduler
due occurrence != execution
delivery != authority
```

The scheduler or event adapter detects a candidate occurrence. ACS owns
normalization, occurrence identity, Activation history and the admission
decision.

## Semantic phases

Activation must distinguish at least:

1. occurrence observed/claimed;
2. eligibility, authority and configuration evaluation;
3. rejected, cancelled, expired, skipped or coalesced without admission; or
4. admitted with one durable downstream correlation.

Exact enum names and physical state topology remain future contract decisions.
An admitted Activation never becomes the owner of its resulting Run.
