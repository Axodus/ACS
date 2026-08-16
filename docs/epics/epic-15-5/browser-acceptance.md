# EPIC-15.5 Browser Acceptance — H Closure

**Latest run:** 2026-08-16
**Result:** **PASS**
**Manifest:** `/tmp/acs-epic15-5-aees-h-evidence/browser-certified/manifest.json`

## Topology

| Role | Evidence |
| --- | --- |
| Control Plane | independent process PID `810061` |
| Primary worker | PID `810611`, `worker-f-primary` |
| Recovery worker | PID `810699`, `worker-f-recovery` |
| Failure worker | PID `810729`, `worker-f-failure` |
| Runtime store | isolated SQLite under `/tmp` |
| Browser | Chromium `151.0.7922.34` |
| Classification | `MULTI_PROCESS_SINGLE_HOST` |

Ports and temporary database paths are ephemeral harness details and are not production configuration.

## Route and viewport matrix

Four normative viewports were used: `1440x900`, `1280x800`, `768x1024`, `390x844`.

Routes:

- Control Plane: `/agents`, `/agents/:id`, `/credentials`, `/executions`, `/workers`, `/operations`, `/readiness`;
- Tenant Administration: `/admin/tenants`, tenant overview, members, governance, entitlements, limits and audit.

| Metric | Result |
| --- | ---: |
| route-viewports | **56/56 PASS** |
| screenshots | **56** |
| accessibility checks | **56/56 PASS** |
| horizontal overflow | **0** |
| page errors | **0** |
| unexpected console errors | **0** |
| unexpected non-2xx browser responses | **0** |

H found and fixed fourteen unlabeled governance rule controls. The final run assigns contextual accessible names to every effect/priority input. The acceptance harness also records response status/URL, waits for Tenant Administration loading skeletons to complete and ignores only known external font/favicon noise.

## Journey evidence

| Journey | Result | Evidence |
| --- | --- | --- |
| A — secret, Agent create/configure, readiness and deploy | **PASS** | Agent `aees-f-agent-msw48ujz`; plaintext rendered: false |
| B — execution and remote durable result | **PASS** | job `job_66ef9fac-59c7-4302-af71-f284b66be51d` |
| C — worker crash/reassignment/completion | **PASS** | recovery screenshot and independent recovery worker |
| D — failed job diagnostics | **PASS** | job `job_676e99bc-178b-4a20-91ce-5b06a836991e`, `INJECTED_RETRYABLE_FAILURE` |
| E — no eligible worker/readiness/remediation | **PASS** | operations screenshot and reason/action surface |
| F — Tenant creation/detail/governance | **PASS** | Tenant `tenant-f-msw4cnv0` |
| G — coherent authorization denial | **PASS** | protected content not exposed |
| keyboard/dialog behavior | **PASS** | focus, Tab and safe cancel via Enter |
| error UX | **PASS** | 403, 429 and 503 |

## Mutation evidence

- credential reference created without plaintext read-back;
- Agent created and configured;
- sandbox deployment performed;
- remote runtime started and completed;
- Tenant created and governed.

No secret plaintext, bearer token, worker credential or private key is stored in the manifest/screenshots.

## Closure result

Browser acceptance proves the supported operational journey without manual URL entry, shell, SQLite inspection or direct API calls after harness bootstrap. It supports Operational Ready for the certified topology; it does not prove a global multi-host or live-provider topology.
