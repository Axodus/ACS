# MH02 — Managed Provider Certification

**Result:** `NOT_STARTED_BY_GATE`

MH02 was not executed because MH01 failed. No claim is made for:

- live managed IdP/JWKS, rotation, DNS or TLS behavior;
- provider-managed workload identity;
- managed/HA Vault failover;
- network-shared rate limiting;
- a real reverse proxy/load balancer trust chain;
- managed OTLP backend, retention or reconnect across hosts.

The existing EPIC-15.5 provider-equivalent tests remain valid for `PRODUCTION_LIKE_SINGLE_HOST`; they are not reused as managed-provider proof.
