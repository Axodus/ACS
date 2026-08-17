# AEES-MH / MH03 — Cross-Host Runtime, Failover & Global Production Certification

**Execution date:** 2026-08-17

**Result:** **NOT CERTIFIED**

**Gate result:** `MH03-A=FAIL`, `MH03-B=NOT_STARTED_BY_GATE`, `MH03-C=NOT_STARTED_BY_GATE`, `MH03-D=NOT_STARTED_BY_GATE`, `MH03-E=PASS_TERMINAL_DECISION`

**Evidence:** `/tmp/acs-post15-5-aees-mh-mh03-evidence/manifest.json`

## Baseline imported from SH and MH02

The required software and provider prerequisites are present and were not repeated:

```text
AEES-SH: PASS
shared authoritative state: CERTIFIED
dual Control Plane: CERTIFIED DUAL_PROCESS_SHARED_STATE
MH02: PASS
external providers: CERTIFIED EXTERNAL_PROCESS_PROVEN
trusted edge: CERTIFIED DUAL_PROCESS
physical multi-host: NOT PROVEN
```

The MH02 evidence manifest was present and retained its `PASS` result. MH03 did not weaken or reopen SH/MH02 contracts.

## MH03-A — Physical topology and trust

The acceptance environment exposes one physical failure domain:

| Probe | Result |
| --- | --- |
| current host | `Whostler`, WSL2 |
| verified physical/VM hosts | `1` |
| required physical/VM hosts | `2` minimum |
| Docker contexts | `1`, local Unix socket, `0` remote contexts |
| Hyper-V | unavailable, `0` running VMs |
| WSL distributions | `1` |
| explicit SSH host aliases | `0` |
| Tailscale online peers | `0` |
| configured GCP project | no |
| Kubernetes context | unavailable |
| repository infrastructure inventory | absent |

No Control Plane B host, remote worker host or remote target host could be assigned. Containers, process separation, loopback aliases, network namespaces and additional listeners on `Whostler` were explicitly rejected as physical multi-host evidence.

The environment has one known offline Tailscale peer, but zero online peers. An offline/unreachable peer is not an acceptance host and was not treated as one. No external resource was provisioned or purchased without an authorized environment.

Shared PostgreSQL, the edge, OIDC, Vault and OTLP remain certified only in the prior same-host external-process topology. PostgreSQL TLS, database HA, cross-host TLS, clock skew and host firewall boundaries could not be exercised because the required topology did not exist.

**Gate MH03-A:** `FAIL`.

Blocker:

```text
MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE: OPEN_BLOCKER
```

## MH03-B — Runtime, fencing and recovery

`NOT_STARTED_BY_GATE`.

No cross-host job, worker heartbeat, worker host loss, network partition, stale worker return, Control Plane host loss, split-brain defense, credential revocation across hosts or cross-host trace chain was represented as executed.

The following earlier evidence remains valid but is not upgraded:

- D/SH: atomic claim, DB-authoritative fencing, stale-result rejection and dual-process recovery;
- MH02: OIDC workload identity and one-Control-Plane **process** loss through the edge;
- all of the above used one physical host.

No job, assignment, worker, host, fencing epoch or recovery ID was fabricated for MH03.

**Gate MH03-B:** `NOT_STARTED_BY_GATE`.

## MH03-C — Production deployment and rollback

`NOT_STARTED_BY_GATE`.

G previously proved readiness, deployment, health, degradation and rollback against an independent production-like process. SH proved alternate-process rollback over shared authority. MH03 did not have a target outside the Control Plane host, so it did not execute:

- deploy via CP A host and inspection by CP B host;
- cross-host post-deploy execution;
- target network partition/reconnect;
- initiator-host loss during deployment;
- rollback from an alternate physical host.

The certified production target remains `PRODUCTION_LIKE_SINGLE_HOST`; it is not reclassified as `EXTERNAL_TARGET`, `REMOTE_HOST_TARGET` or `CLUSTER_TARGET`.

**Gate MH03-C:** `NOT_STARTED_BY_GATE`.

## MH03-D — Operator and browser acceptance

`NOT_STARTED_BY_GATE`.

Browser acceptance through the MH02 TLS edge remains valid for dual processes on one host. It cannot prove browser-session continuity across physical Control Plane host loss. No MH03 browser manifest or screenshots were generated, because doing so against the same host would falsely imply a cross-host journey.

```text
browser manifest: not generated
accessibility/overflow/page/console result: NOT_EXECUTED_BY_GATE
sensitive browser scan: NOT_EXECUTED_BY_GATE
```

**Gate MH03-D:** `NOT_STARTED_BY_GATE`.

## MH03-E — Terminal certification decision

MH03-E executed the required terminal classification without promoting an unproven topology.

### Residual findings

These statuses apply to the post-15.5/global claim. The historical EPIC-15.5 table remains unchanged.

| Finding/blocker | Final status | Rationale |
| --- | --- | --- |
| `ACS-ORG-001` | `RESOLVED` | SH certified async shared PostgreSQL authority for the multi-instance profile. |
| `ACS-ORG-002` | `ACCEPTABLE_DEFERRED` | external Vault/workload identity are proven; provider HA is not claimed. |
| `ACS-ORG-009` | `RESOLVED` | shared transactional audit is certified by SH. |
| `ACS-ORG-010` | `OPEN_BLOCKER` | shared limiter is dual-instance proven but has no physical cross-host acceptance. |
| `ACS-ORG-018` | `ACCEPTABLE_DEFERRED` | external infrastructure provisioning/repair remains an operator boundary. |
| `ACS-ORG-019` | `OPEN_BLOCKER` | no independent host, host loss or network-partition evidence exists. |
| `ACS-ORG-021` | `OPEN_BLOCKER` | no provisioned multi-host inventory/bootstrap target was available. |
| `MH_ASYNC_SHARED_REPOSITORY_BOUNDARY_UNAVAILABLE` | `RESOLVED` | AEES-SH. |
| `MH_SHARED_AUTHORITATIVE_STATE_UNAVAILABLE` | `RESOLVED` | AEES-SH shared PostgreSQL profile. |
| `MH_DUAL_HOST_TOPOLOGY_UNAVAILABLE` | `OPEN_BLOCKER` | one verified physical host for a two-host minimum. |

### Readiness

| Level | Certified bounded topology | Global claim |
| --- | --- | --- |
| Development Ready | `READY` | `READY` |
| Integration Ready | `READY` | `PARTIALLY_CERTIFIED` |
| Operational Ready | `READY` | `NOT_CERTIFIED` |
| Production Ready | `READY for PRODUCTION_LIKE_SINGLE_HOST` | `NOT_CERTIFIED` |

The result is not `PASS WITH CAVEATS`: physical multi-host is a central prerequisite of the requested claim, not a peripheral caveat.

## Failure-domain decision

The detailed matrix is in [MH03-failure-domain-matrix.md](./MH03-failure-domain-matrix.md). Cross-host CP loss, worker loss, partition, DB interruption, target outage and edge backend host loss are all `NOT_EXECUTED_BY_GATE`. Earlier single-host provider/process outage evidence is retained but not promoted.

## Guarantees retained

- shared PostgreSQL authority and transactional audit for dual processes;
- DB-backed CAS, fencing, recovery contention and economic idempotency;
- external-process OIDC/JWKS, workload identity, Vault, trusted edge and OTLP;
- shared limiter across dual processes;
- production-like single-host deployment, health and rollback;
- supported operator/browser journeys for the certified bounded topology.

## Non-guarantees

- physical multi-host or multi-VM operation;
- Control Plane host failover;
- cross-host workers, fencing or network-partition recovery;
- PostgreSQL or Vault HA;
- cross-host edge/backend health removal;
- remote target deployment/rollback;
- zero downtime, multi-region, multi-cloud, formal RPO/RTO or provider-managed HA.

## Validation and regression result

| Validation | Result |
| --- | --- |
| `git diff --check` | `PASS` |
| `npx tsc -p tsconfig.json --noEmit` | `PASS` |
| official backend `npm run build` | `ENVIRONMENT_LIMITATION`: `TS5033/EROFS` on the historical differently-cased mount path |
| backend emit to `/tmp/acs-mh03-backend.rpoa2l/dist` | `PASS` |
| official frontend build | `ENVIRONMENT_LIMITATION`: `TS5033/EROFS` on `tsconfig.app.tsbuildinfo` |
| frontend app/node typechecks with writable build info | `PASS` |
| Vite build to `/tmp/acs-mh03-static.GS4NDo/dist` | `PASS` |
| S61 MH03 preflight | `PASS` |
| full serial repository suite with absolute clean dist | `577/580 PASS`, `1 FAIL`, `2 conditional SKIP` |
| D02 isolated reruns | `4/4 file executions PASS` (`12/12` subtests) |
| D03 distributed process acceptance in full suite | `PASS` |
| SH evidence manifest | existing `PASS`; two current S59 DB cases skipped because disposable `ACS_SH_DATABASE_URL` was not configured |
| MH02 evidence manifest/contracts | existing integrated `PASS`; S60 contracts `PASS` |

The one full-suite failure was D02 timing out after the job reached `running`. It occurred under the long aggregate run, while D02 passed four isolated executions and the stronger D03 crash/fencing/recovery acceptance passed in the aggregate. Classification: `TEST_INFRASTRUCTURE_CONTENTION`, not a reproduced `PRODUCT_RACE`. The full suite is therefore not represented as wholly green. This regression caveat does not change the MH03 result, which is already blocked at the physical-topology gate.

The first aggregate attempt without an absolute `ACS_TEST_DIST_ROOT` also produced five invalid failures from an old/misresolved `dist`; those files passed after a clean `/tmp` build and are excluded from the final product classification.

## Final status

```text
Original MH01: FAIL
AEES-SH: PASS
MH02: PASS
MH03: NOT CERTIFIED
POST-15.5 / AEES-MH: NOT CERTIFIED
```

Gate MH03-E is `PASS_TERMINAL_DECISION`: the sequence has a truthful terminal result and no cross-host guarantee was inferred from local processes.
