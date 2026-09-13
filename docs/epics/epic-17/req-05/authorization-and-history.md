# REQ-05 Authorization, Lifecycle and Snapshot Rules

- Connector lifecycle/version describes integration definition compatibility,
  never runtime reachability or permission.
- Connection lifecycle uses configured/active/degraded/expired/revoked meaning
  under its existing owner; mutation history/provenance is required before it
  participates as an exact historical source.
- Credential/secret lifecycle remains independent; rotation does not rewrite
  Agent, Connector, Connection or Channel history.
- Channel lifecycle must distinguish draft/active/disabled/revoked endpoint
  configuration from delivery health. Exact vocabulary/representation is
  deferred.
- Every Channel ingress is authenticated/attributed, Tenant-scoped,
  policy-evaluated, deduplicated and passed to the accepted activation/admission
  boundary. Channel is never direct execution authority.

The REQ-03 snapshot records Connector/Connection/Channel exact version or
immutable observed representation, authorization decision, requested action,
credential reference/version and lease purpose. It never records raw secret,
token, OAuth payload or lease value.

Historical reconstruction uses immutable configuration/provenance and Evidence
of delivery/auth decisions. It does not reconnect, fetch current secrets or
assert past reachability from current health.
