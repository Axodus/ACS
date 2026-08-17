# MH02 — Managed Provider Certification

**Original 2026-08-16 result:** `NOT_STARTED_BY_GATE`

**Resumed 2026-08-17 result:** **PASS**

**Classification:** `DUAL_PROCESS_SHARED_STATE_WITH_EXTERNAL_PROVIDERS`

The original gate result remains historical. After AEES-SH resolved the MH01 shared-state blockers, MH02 resumed without repeating MH01 and passed all internal gates:

| Gate | Result |
| --- | --- |
| MH02-A — composition | `PASS` |
| MH02-B — identity | `PASS` |
| MH02-C — secrets/edge | `PASS` |
| MH02-D — telemetry/network | `PASS` |
| MH02-E — integrated acceptance | `PASS` |

Certified boundaries:

- external HTTPS OIDC/JWKS with RS256 rotation, cache/outage and invalid-token matrix;
- external OIDC workload identity with worker/instance binding, revocation, renewal and expiry;
- external Vault KV v2 with shared metadata, AppRole, CAS, outage and zero disclosure;
- PostgreSQL-backed shared rate buckets enforced through an independent TLS edge across CP A/B;
- authenticated HTTPS OTLP for logs, metrics and traces with bounded outage behavior;
- TLS/DNS/refusal failure behavior and one-Control-Plane process failover through the edge;
- browser/operator provider diagnostics at four viewports.

These services were independent processes/containers on one physical host. They are therefore `EXTERNAL_PROCESS_PROVEN`, not `MANAGED_PROVIDER_PROVEN` or `HA_PROVEN`.

See [the detailed MH02 certification](./MH02-managed-provider-certification.md) and `/tmp/acs-post15-5-aees-mh-mh02-evidence/manifest.json`.
