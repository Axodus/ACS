# RP02 — Finding & Topology-Aware Reconciliation

**Result:** PASS

## Projection rules

| Dimension | Certified topology | Global claim |
| --- | --- | --- |
| identity | live OIDC/required validator decides readiness | provider HA not certified |
| secrets | active Vault/KMS descriptor + health decides readiness | Vault HA not certified |
| persistence | selected durable/shared profile decides readiness | physical multi-host/DB HA not certified |
| telemetry | exporter descriptor + health decides readiness | managed retention/HA not certified |
| runtime | remote descriptor + worker/store/recovery health decides readiness | cross-host execution not certified |
| deployment | production evaluator decision decides readiness | remote/cloud/HA target not certified |

## Dashboard policy

- active BLOCKED means a current dependency or policy prevents supported operation;
- CAVEAT / NOT_CERTIFIED means a larger global claim is unsupported;
- global caveats must not increase the active blocker count;
- duplicate secret storage text is removed.
