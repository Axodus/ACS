# MH03 — Cross-Host Runtime, Failover & Global Production Certification

**Result:** `NOT CERTIFIED — STOPPED AT MH03-A`

The original AEES-MH attempt stopped before MH03. AEES-SH supplied the shared-state prerequisite and resumed MH02 passed on 2026-08-17. MH03 then executed its physical-topology preflight and found only one physical WSL2 host. Per the certification rule, it did not substitute processes or containers for independent hosts.

| Scenario | Result |
| --- | --- |
| Control Plane A host loss | `NOT_EXECUTED_BY_GATE` |
| Control Plane B host continuity | `NOT_EXECUTED_BY_GATE` |
| worker host loss/recovery | `NOT_EXECUTED_BY_GATE` |
| network partition/reconnect | `NOT_EXECUTED_BY_GATE` |
| shared DB interruption across hosts | `NOT_EXECUTED_BY_GATE` |
| IdP/Vault/limiter/collector outage in external-provider dual-process topology | `PASS_IN_MH02` |
| target degradation across hosts | `NOT_EXECUTED_BY_GATE` |
| rollback from alternate Control Plane host | `NOT_EXECUTED_BY_GATE` |
| browser journey through independent TLS edge/LB | `PASS_IN_MH02_SINGLE_HOST` |

The single-host multi-process runtime, fencing and recovery guarantees certified by EPIC-15.5 are unchanged. `MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE` remains an `OPEN_BLOCKER`; the global claim is `NOT_CERTIFIED`.

Detailed result: [MH03 cross-host certification](./MH03-cross-host-runtime-failover-certification.md).
