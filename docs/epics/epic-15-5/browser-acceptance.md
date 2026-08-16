# EPIC-15.5 Browser Acceptance

**Latest certification:** AEES-F, 2026-08-16
**Result:** **PASS** for the certified multi-process single-host topology.

## Harness

The reproducible harness is `.design/app-standalone/tools/aees-f-browser-acceptance.mjs`, invoked by:

```bash
ACS_AEES_F_DIST_ROOT=/tmp/acs-epic15-5-aees-f-dist \
  npm --prefix .design/app-standalone run test:browser:aees-f
```

It starts an independent ACS Control Plane process, Chromium, same-origin frontend gateways and independent primary/recovery/failure workers over a durable SQLite runtime store. The UI uses the Product API; process controls are used only to inject the acceptance incidents.

## Route and viewport matrix

Viewports:

```text
1440x900
1280x800
768x1024
390x844
```

Routes:

```text
/agents
/agents/:agentId
/credentials
/executions
/workers
/operations
/readiness
/admin/tenants
/admin/tenants/:tenantId
/admin/tenants/:tenantId/members
/admin/tenants/:tenantId/governance
/admin/tenants/:tenantId/entitlements
/admin/tenants/:tenantId/limits
/admin/tenants/:tenantId/audit
```

## Evidence summary

```text
Browser acceptance: PASS

routes/viewports: 56/56 PASS
unique routes: 14/14
viewports: 4/4
route screenshots: 56
critical journey screenshots: 6
total screenshots: 62
accessibility: 56/56 checks PASS
keyboard dialog flow: PASS
horizontal overflow: 0
page errors: 0
console errors: 0
sensitive evidence matches: 0
manifest: /tmp/acs-epic15-5-aees-f-evidence/manifest.json
```

Accessibility checks validate an H1, landmark structure, named buttons, labelled inputs and named dialogs for every route/viewport. A real keyboard flow proves focus enters the labelled rotation dialog and `Tab` + `Enter` reaches the safe cancel action. The harness fails on any unexpected page/console error or document-level horizontal overflow.

## Journey and mutation proof

| Journey | Browser mutation/evidence | Result |
| --- | --- | --- |
| Agent lifecycle | credential create; Agent create with role/profile/model/capability/skill/tool/reference; readiness; sandbox deploy | PASS |
| Execution | Agent Execute action creates durable remote job | PASS |
| Recovery | worker crash, lease expiry, reassignment, attempt 2 completion | PASS |
| Failed job | terminal injected failure, diagnostic reason and recommended action | PASS |
| Dependency/capacity | no eligible worker shown in Operations | PASS |
| Tenant Administration | Tenant create, detail and governance navigation | PASS |
| Authorization | non-platform principal denied without protected content | PASS |
| Error UX | structured 403, 429 and 503 states | PASS |

The manifest records runtime IDs and mutations without secret plaintext. Browser DOM/evidence scanning found no bearer token, Vault token, secret value or private key.

## Caveat

This proves browser-to-Product-API-to-remote-worker behavior across independent local processes. It does not prove multi-host network topology, live external IdP/Vault deployment or production target rollout; those remain G/H scope.
