# AEES-MH Regression and Evidence Inventory

## Added verification

| Check | Purpose |
| --- | --- |
| `tests/s58-post-15-5-aees-mh-preflight.test.mjs` | imports H closure, inventories host-local stores, enforces gate ordering and checks evidence redaction |
| `scripts/certify-aees-mh-preflight.mjs` | produces the structured certification-attempt manifest |
| `tests/s60-post-15-5-aees-mh02-managed-providers.test.mjs` | production composition rejection, RS256 worker lifecycle, async Vault metadata/CAS and shared limiter health |
| `scripts/certify-aees-mh02.mjs` | external OIDC/Vault/OTLP, shared limiter, TLS edge, dual Control Plane, outages, browser and evidence |
| `scripts/aees-mh02-oidc-provider.mjs` | independent HTTPS RS256 IdP/JWKS with bounded rotation and revocation |
| `scripts/aees-mh02-control-plane-instance.mjs` | independent provider-bound Control Plane acceptance instance |
| `scripts/aees-mh02-edge-proxy.mjs` | independent TLS edge with forwarding sanitization and CP failover |
| `scripts/aees-mh02-tls-provider-proxy.mjs` | TLS boundary for the external Vault process |
| `scripts/aees-mh02-worker-client.mjs` | independent worker workload-identity process |
| `tests/s61-post-15-5-aees-mh03-physical-topology.test.mjs` | rejects same-host process/container substitution and validates terminal evidence redaction |
| `scripts/certify-aees-mh03-preflight.mjs` | probes available physical/VM inventory and emits the MH03 terminal manifest |

## Execution result

Because MH01 failed before production adapter implementation, B–H product contracts were not changed. Validation covered:

- new preflight: `PASS`;
- no-emit TypeScript: `PASS`;
- official build: `TS5033/EROFS` environment limitation;
- equivalent writable `/tmp` build: `PASS`;
- B01→H core files `s45`–`s58`: `14/14 PASS`;
- nine affected loopback/process files: `26/26 PASS` outside the sandbox;
- `git diff --check`: `PASS`;
- source/environment probes: `PASS` with MH01 blockers found.

The first aggregate run after the failed repository emit used an incomplete `dist/` and was invalid. The clean `/tmp` build removed module failures. Sandbox network tests then failed with `listen EPERM`; the same files passed outside the sandbox. Classification: `ENVIRONMENT_LIMITATION`, not `PRODUCT_DEFECT`.

MH02/MH03 provider, cross-host, failover, browser and full regression suites are intentionally not reported as executed. They become mandatory only after a future MH01 implementation passes.

## Evidence path

```text
/tmp/acs-post15-5-aees-mh-evidence/manifest.json
```

Sensitive evidence matches must remain zero.

Follow-up AEES-SH coverage is indexed separately in `docs/post-15-5/aees-sh/regression-inventory.md`; it does not alter the original MH preflight result.

## Resumed MH02 execution

| Check | Result |
| --- | --- |
| MH02 unit/contract suite S60 | `PASS` |
| MH02-A provider composition | `PASS` |
| MH02-B identity/workload identity | `PASS` |
| MH02-C secrets/limiter/edge | `PASS` |
| MH02-D telemetry/TLS/DNS/network | `PASS` |
| MH02-E integrated/browser | `PASS` |
| invalid human token matrix | `7 attempts / 0 accepted` |
| browser viewports | `4/4 PASS` |
| browser accessibility/overflow/page/console errors | `0/0/0/0` |
| sensitive evidence scan | `0 matches in 6 categories` |
| evidence manifest | `/tmp/acs-post15-5-aees-mh-mh02-evidence/manifest.json` |
| B02→MH02 aggregate run, default file concurrency | `50/52 PASS`; D02/D03 process startup timeouts |
| B02→MH02 final run, `--test-concurrency=1` | `52/52 PASS` |

The acceptance uses real sockets and independent processes/containers. It does not reuse in-memory fixtures as external-provider proof. Classification is `EXTERNAL_PROCESS_PROVEN`; provider-managed HA and physical multi-host remain outside MH02.

The two default-concurrency failures were classified `TEST_INFRASTRUCTURE_CONTENTION`, not `PRODUCT_RACE`: D02 and D03 competed with the E03/F/G process acceptances for local startup resources. The entire same 52-test matrix then passed with file concurrency fixed to one, including D02 remote dispatch and the full D03 crash/fencing/recovery scenario. No product assertion or timeout was weakened.

The official repository backend/frontend emits remain subject to the historical WSL path-casing `TS5033/EROFS` limitation. No-emit typecheck and equivalent writable `/tmp` builds are the product-validation path; no compiler configuration was weakened.

Final writable outputs:

```text
/tmp/acs-mh02-dist-final
/tmp/acs-mh02-static-final/dist
```

## MH03 execution

| Check | Result |
| --- | --- |
| prerequisite import (SH/MH02) | `PASS` |
| S61 physical-topology gate | `PASS` — correctly yields `MH03-A=FAIL` |
| physical/VM host inventory | `1 verified / 2 required` |
| Docker topology | `1 local context / 0 remote` |
| Hyper-V/WSL | `0 running VM / 1 WSL distribution` |
| remote SSH/cloud/Kubernetes inventory | `not configured` |
| MH03-B/C/D | `NOT_STARTED_BY_GATE` |
| MH03-E | `PASS_TERMINAL_DECISION / NOT_CERTIFIED` |
| sensitive manifest scan | `0 matches in 6 categories` |
| evidence manifest | `/tmp/acs-post15-5-aees-mh-mh03-evidence/manifest.json` |

No browser or cross-host process suite was run after Gate A failed; those scenarios remain unexecuted rather than skipped and represented as passing.

### Final validation details

| Validation | Result |
| --- | --- |
| no-emit TypeScript | `PASS` |
| official backend/frontend emit | `ENVIRONMENT_LIMITATION_TS5033_EROFS` |
| writable backend build | `/tmp/acs-mh03-backend.rpoa2l/dist PASS` |
| writable frontend build | `/tmp/acs-mh03-static.GS4NDo/dist PASS` |
| full serial suite, clean absolute dist | `577/580 PASS`; D02 aggregate timeout; two conditional SH DB skips |
| D02 isolated stability | four file executions, `12/12 PASS` |
| D03 process acceptance | `PASS` in aggregate |
| classification | `TEST_INFRASTRUCTURE_CONTENTION`; full suite not labeled entirely green |

An earlier aggregate run used a stale/misresolved default `dist` and produced five import/spawn failures. All five passed against the clean absolute `/tmp` build; that run is invalid for product classification. The remaining D02 aggregate timeout is retained explicitly because it recurred in the long suite even though isolated repetitions passed.
