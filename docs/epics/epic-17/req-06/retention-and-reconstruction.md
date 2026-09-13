# REQ-06 Retention, Deletion and Reconstruction

## Lifecycle requirements

A future Memory contract must distinguish record creation, superseding
correction, expiry, policy-driven forgetting, administrative deletion and legal
hold. Exact state vocabulary and persistence remain deferred.

Retention resolves from the exact policy revision and may be narrowed by
purpose, sensitivity, subject consent and operation duration. A lower layer
cannot extend retention or convert an expired/revoked scope into active data.

Deleting or expiring Memory content does not mutate Agent/Workforce revisions,
Run/Task/checkpoint state, events, Knowledge sources or Evidence. Evidence of a
governed deletion may retain content-free identifiers, digests, policy and
decision refs when governance permits; it must not preserve deleted content by
accident.

## Run snapshot

REQ-03 admission captures:

- exact Memory policy revision/snapshot and resolver decision;
- allowed Memory classes, scopes, actions, purposes and retention limits;
- exact Agent, Workforce, membership, Run and subject refs that constrained
  access;
- retrieval/write policy, provenance and Evidence requirements;
- provider-independent adapter/config reference when operationally material.

The effective-configuration snapshot excludes raw Memory content. Each actual
read or write records a stable Memory record/result reference or digest,
source/provenance refs, decision/Evidence refs and correlation to Run/Task.

## Historical reconstruction

Reconstruction must answer what policy and authority were evaluated, which
scope and query were used, which immutable result/reference influenced
execution, and what write/delete outcome occurred. It must not query current
mutable Memory and present that result as the historical input.

Content may be unavailable later because of accepted expiry, deletion or
privacy policy. In that case reconstruction reports a verifiable tombstone,
digest and decision trail without claiming content recovery. Deterministic
reconstruction means deterministic proof of the execution inputs and decisions;
it does not override lawful deletion.
