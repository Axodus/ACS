# MH03 Failure-Domain Matrix

**MH03 cross-host result:** `NOT_EXECUTED_BY_GATE`

| Failure domain | Prior bounded evidence | MH03 result | Final claim |
| --- | --- | --- | --- |
| Control Plane process loss | MH02 edge continued through CP B on the same host | `NOT_EXECUTED` as host loss | process failover retained; host failover not certified |
| Control Plane B continuity | SH/MH02 dual-process authority | `NOT_EXECUTED` across hosts | `NOT_CERTIFIED` cross-host |
| worker process crash | D/E/F single-host recovery | `NOT_EXECUTED` as worker-host loss | process recovery retained; host recovery not certified |
| worker network partition | no physical partition evidence | `NOT_EXECUTED` | `NOT_CERTIFIED` |
| stale worker after partition | D/SH stale epoch rejection, same host | `NOT_EXECUTED` cross-host | fencing contract retained; physical partition not certified |
| database outage | SH blocked authority and reconnected on one host | `NOT_EXECUTED` across hosts | outage semantics retained; DB HA not certified |
| Vault outage | MH02 fail-safe outage/recovery | `PASS_IN_MH02_SINGLE_HOST` | external-process behavior certified; HA not claimed |
| IdP/JWKS outage | MH02 cache/unknown-key fail-closed | `PASS_IN_MH02_SINGLE_HOST` | external-process behavior certified; HA not claimed |
| OTLP outage | MH02 bounded degradation/reconnect | `PASS_IN_MH02_SINGLE_HOST` | external-process behavior certified; managed HA not claimed |
| limiter outage | MH02 protected mutations fail closed | `PASS_IN_MH02_SINGLE_HOST` | dual-process behavior certified; physical cross-host not certified |
| target outage/partition | G single-host target degradation | `NOT_EXECUTED` cross-host | remote target not certified |
| edge backend loss | MH02 removed a failed CP process | `NOT_EXECUTED` as backend-host loss | same-host process failover only |
| rollback from alternate CP | SH/G alternate process/shared state | `NOT_EXECUTED` from alternate host | cross-host rollback not certified |

## Decision

The matrix does not convert prior same-host evidence into host-failure evidence. The central failure domain remains one physical host, so loss of `Whostler` would remove all locally instantiated Control Planes, workers, providers and targets used by the available harness.
