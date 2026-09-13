# REQ-08 Target, Configuration and Authority

## Target reference

Automation references a canonical admission-capable target. It never embeds or
redefines Agent, Workforce or Workflow semantics and never targets a provider,
executor, worker, Task instance or Run instance as configuration truth.

A target selector must be explicit:

- `pinned`: exact immutable target revision is authored; or
- `resolve_at_activation`: the target owner resolves an eligible exact revision
  during Activation/admission and the result is frozen in the REQ-03 snapshot.

There is no implicit “latest”. If a target kind lacks accepted identity,
revision or admission semantics, that target is ineligible rather than mapped
to an opaque provider object.

## Authored versus effective configuration

Automation revision stores authored requirements and references. It does not
store a permanently effective runtime configuration. REQ-03 class-specific
resolution remains authoritative at each Activation/admission.

```text
Automation revision
  -> authored target + requirements + policy/resource refs
  -> Activation evaluates current eligibility/authority
  -> admission resolves exact effective configuration
  -> immutable snapshot
  -> existing Runtime
```

Triggers, schedules, due-work evaluation, deduplication and Activation identity
belong to REQ-09. They may reference an exact Automation revision but are not
owned by the Automation definition.

## Authority separation

REQ-08 distinguishes:

1. configuration authority to create, revise, enable, disable or archive an
   Automation; and
2. execution authority required when a later Activation requests admission.

Authoring under a Delegation grant records the exact authority basis and chain
provenance. It does not convert temporary delegated authority into a permanent
execution grant. At Activation the applicable direct or delegated authority,
Tenant, policies, lifecycle, target and resource constraints are evaluated
again.

An expired or revoked Delegation basis does not erase the Automation or its
history. It makes the basis unusable for new Activation unless another explicit
authorized basis is selected. Automation existence, revision, enablement,
target references and prior approvals grant no operational authority.
