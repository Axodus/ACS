# MH03 Physical Multi-Host Topology

**Result:** `UNAVAILABLE / NOT_CERTIFIED`

## Required versus observed

Required:

```text
CP A — independent host/VM
CP B — independent host/VM
Worker C — outside both CP hosts
shared PostgreSQL over network
edge routing across hosts
remote production target
```

Observed:

```text
Whostler — one WSL2 physical failure domain
  ├─ one local Docker daemon/context
  ├─ one WSL distribution
  └─ no accessible remote host/VM inventory
```

Classification: `SINGLE_PHYSICAL_HOST_ONLY`.

## Host inventory

| Component | Host/VM | IP/FQDN | Process/container | Role/result |
| --- | --- | --- | --- | --- |
| CP A | unassigned | sanitized/not applicable | not started | no independent host |
| CP B | unassigned | sanitized/not applicable | not started | no independent host |
| Worker C | unassigned | sanitized/not applicable | not started | no remote worker host |
| Worker D | unassigned | sanitized/not applicable | not started | no remote worker host |
| DB | prior SH same-host service only | sanitized | external PostgreSQL process in SH | cross-host/TLS/HA not exercised |
| Edge/LB | prior MH02 same-host service only | sanitized | independent process in MH02 | cross-host backend pool not exercised |
| Vault | prior MH02 same-host external process | sanitized | `SINGLE_INSTANCE_EXTERNAL` | HA not proven |
| IdP | prior MH02 same-host external process | sanitized | external HTTPS process | managed/HA not proven |
| OTLP | prior MH02 same-host external process | sanitized | authenticated HTTPS receiver | managed/HA not proven |
| Target | prior G same-host process | sanitized | production-like process | remote target not available |

## Infrastructure probes

| Source | Sanitized result |
| --- | --- |
| Docker | one local context, zero remote contexts |
| Hyper-V | command unavailable, zero VMs observed |
| WSL | one distribution |
| SSH config | no explicit host aliases |
| Tailscale | service running in direct probe, zero online peers |
| GCP | CLI present, project unset |
| Kubernetes | no configured client/context |
| repository IaC/inventory | none found |

The local `known_hosts` file was not treated as topology inventory. Historical host keys do not prove current reachability, authority or authorization to deploy ACS.

## Trust, DNS, TLS and time

Cross-host source allowlists, DNS resolution, firewall policy, certificate trust/rotation and clock skew were `NOT_EXECUTED_BY_GATE`. MH02 TLS/DNS/provider tests remain valid only for its single-host external-process topology.

PostgreSQL classification remains `SHARED_DB_SINGLE_NODE / HA_NOT_PROVEN` for the available evidence. Vault remains `SINGLE_INSTANCE_EXTERNAL`. These are explicit non-HA boundaries, not hidden fallbacks.

## Gate

```text
MH03-A: FAIL
MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE: OPEN_BLOCKER
```

No container, namespace, loopback address or extra process was accepted as another host.
