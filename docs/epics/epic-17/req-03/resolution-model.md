# REQ-03 Resolution and Admission Model

## 1. Resolution owner

ACS admission owns effective-configuration resolution. Domain owners supply
versioned facts and constraints; the resolver combines them according to the
class-specific matrix. Administration may select policy/catalog inputs but does
not become a transversal configuration owner. Runtime receives the admitted
snapshot and normalized intent.

## 2. Deterministic stages

1. **Bind subject:** identify Run/Task/assignment generation and exact Agent,
   Workforce and Workflow revisions.
2. **Read head eligibility:** evaluate current scope, status, sharing and other
   admission-time head/lifecycle facts without rewriting revision history.
3. **Load exact sources:** resolve every required policy/resource revision and
   immutable fingerprint. An unqualified `latest` is resolved once at admission
   and the selected exact reference is recorded.
4. **Collect class inputs:** separate requirements, preferences, grants,
   constraints, selections and observations. Labels and presentation are never
   treated as grants.
5. **Apply class rule:** intersect/attenuate authority, select only eligible
   resources and evaluate required governance decisions.
6. **Validate completeness:** reject missing, stale, conflicting, ambiguous or
   unverifiable required inputs with typed findings.
7. **Freeze result:** canonically serialize inputs, decisions and resolved
   values; compute input and effective fingerprints; bind resolver/schema
   version.
8. **Admit and persist:** associate the immutable snapshot with the existing
   execution binding, intent, event and idempotency transaction before dispatch.

## 3. Time semantics

- **Revision state** answers what behavior/configuration was authored.
- **Head state** answers whether the subject is currently eligible at the
  admission instant.
- **Lifecycle history** explains how head state reached that point.
- **Effective configuration** answers what admission selected after all
  constraints and observations.
- **Snapshot** proves what that binding generation actually consumed.

Head changes after admission do not mutate an existing snapshot. Whether they
cancel or supersede active work is owned by lifecycle/governance policy and
must create a recorded decision, not an in-place configuration edit.

## 4. Run, assignment and retry scope

One Run may have multiple tasks, members and assignment generations, so no
single undifferentiated blob is declared “the Run configuration.” Each admitted
binding generation has one immutable effective snapshot. Run and Task/Attempt
records reference the existing binding/intent evidence chain.

Retries of the same admitted assignment reuse the snapshot unless an accepted
policy requires re-admission. Reassignment, supersession or re-admission creates
a new snapshot linked to the predecessor and reason. Prior snapshots remain
immutable.

## 5. Late-bound values

Secret material, leases, volatile availability and runtime observations cannot
be frozen as ordinary configuration values:

- credentials store only opaque connection/secret version and lease-purpose
  references; runtime obtains a scoped lease through the existing owner;
- admission captures the availability/capability evidence used for selection;
  later health changes are observations and may trigger a recorded recovery or
  re-admission decision;
- timestamps, nonces and executor handles are runtime state, not authored
  configuration;
- provider-normalized prompts are compiled artifacts with source snapshot and
  compiler provenance.

## 6. Failure semantics

Resolution fails closed before dispatch when a required source is missing,
scope-denied, ambiguous, mutable without a captured value, fingerprint-mismatched,
deprecated/ineligible, authority-expanding, conflicting or unsupported by the
selected target. No fallback may silently broaden authority or switch to a
current/latest value.

Failures must identify class, source reference, decision stage and stable code
without leaking secret values. Rejection is recorded through existing admission
event/Evidence boundaries.
