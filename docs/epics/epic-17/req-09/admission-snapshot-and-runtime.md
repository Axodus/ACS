# REQ-09 Admission, Snapshot and Runtime

## Canonical sequence

```text
candidate occurrence
  -> normalize and durably claim Activation cause
  -> load exact Automation revision and observe current lifecycle
  -> validate trigger/schedule applicability
  -> revalidate direct or delegated authority and current policies
  -> resolve exact target and effective configuration
  -> freeze Activation/admission inputs and decisions
  -> call existing admission with stable idempotency/correlation
  -> persist accepted/rejected linkage and Events/Evidence
  -> existing coordination and runtime compilation
```

The pre-admission output is a logical admission request. It must map to existing
`ExecutionRequestV2`/Workforce admission concepts where applicable, but REQ-09
does not authorize a competing runtime-intent contract.

`RuntimeExecutionIntentV2` remains downstream of Run, Task, Assignment and
exact membership resolution. Moving it ahead of admission would contradict its
implemented required fields and create a second runtime model.

## Authority evaluation

Every Activation re-evaluates the authority applicable at admission time:

- Automation existence, revision validity and enabled state grant nothing;
- an authored direct authority reference is validated against current
  Governance policy and operation scope;
- a Delegation reference requires the complete current chain, attenuation,
  depth, expiry and revocation checks from REQ-07;
- Channel, Connection, credential, capability, Skill, Tool and Memory
  references grant nothing independently;
- required credential use obtains an opaque purpose-limited lease through the
  existing owner, never through Activation;
- any missing, stale, ambiguous or authority-expanding input rejects before
  dispatch.

## Snapshot

Dynamic resolution ends before accepted execution. The immutable
Activation/admission evidence chain must capture or reference:

- exact Automation revision/fingerprint and lifecycle observation;
- normalized cause, source digest, trigger/schedule key and occurrence key;
- intended/observed/evaluated time basis and evaluator/rule version;
- exact target resolved from pinned or resolve-at-Activation semantics;
- exact Agent, Workforce and Workflow revisions where supported;
- direct/delegated authority basis and all policy/approval decisions;
- REQ-03 effective-configuration snapshot, source refs and fingerprints;
- admission request/decision, binding and idempotency/correlation refs;
- resulting Run, membership, Task/Assignment and runtime-intent refs as they
  become available;
- Evidence gaps or unsupported historical sources explicitly.

Historical reconstruction uses these immutable records. It never reruns a
schedule, resolves current `latest`, revalidates current authority or fetches
current secrets to describe a past admission.

## Fail-closed targets and hard gate

An Automation may target only a canonical kind that the existing admission
boundary can resolve exactly. The known Workflow historical/reference gap from
REQ-08 remains an implementation blocker; unsupported target types fail closed.

Any required incompatible change to Workforce, WorkforceRevision, slots,
membership, admission, Workflow, Run, Task, Assignment, Attempt, workers,
leases, fencing or runtime recovery becomes:

```text
BLOCKER + ARCHITECTURE ESCALATION
```

No such incompatible change is required by this proposed boundary.
