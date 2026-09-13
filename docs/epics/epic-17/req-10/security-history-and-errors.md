# REQ-10 Security, History and Error Semantics

## Tenant and authority boundary

Tenant visibility rules apply consistently to list, detail, reference lookup,
search, history, settings and action endpoints. A cross-Tenant denial must not
reveal whether the referenced object exists.

Action availability is advisory projection data. Every command revalidates the
authenticated actor, Tenant, authority basis, policy, target state and
concurrency precondition at the canonical owner.

## Sensitive data

Read projections must never return raw credentials, secrets, tokens, lease
values or provider authentication material. They may expose only authorized
opaque references and safe metadata such as kind, status, scope and expiry.

An owner-specific command may accept bounded write-only secret material when
the existing credential boundary requires it. That material must not enter a
generic settings document, response echo, browser cache contract, history
projection, error detail, Event payload or log.

Memory content is purpose-scoped and minimized. A Memory reference or
administrative role does not authorize content access. Memory Policy, requested
operation, scope and applicable authority must be evaluated independently.

## Historical reconstruction

History views use exact historical references and immutable observations. They
must not silently replace an old reference with the current Agent, resource,
Automation, policy or settings head.

When content is legitimately deleted or a historical owner cannot reconstruct
state, the projection exposes the surviving reference, digest, tombstone,
policy decision, Evidence and reconstruction gap. It does not fabricate a
complete historical view.

Effective configuration views use the REQ-03 Run snapshot and resolution
findings. Current settings are contextual information only and cannot be
presented as the configuration used by an earlier execution.

## Errors and recovery

Product API errors preserve the established response envelope and add stable,
owner-appropriate categories when future contracts require them, including:

- validation or unsupported operation;
- authentication, authorization or Tenant visibility denial;
- not found without cross-Tenant existence disclosure;
- revision/CAS or idempotency conflict;
- blocked by policy, lifecycle, dependency or readiness;
- source unavailable, partial, stale or historically unreconstructable;
- accepted/pending asynchronous operation;
- internal owner or adapter failure with safe correlation.

Retryability is server-supplied and action-specific. After an uncertain
mutation result, the client reuses the same idempotency key and request digest;
it must not create another logical command by generating a new key.

Freshness, observation time and stale/unavailable state are explicit for
operational projections. The Control Plane never converts absence or adapter
failure into a healthy default.
