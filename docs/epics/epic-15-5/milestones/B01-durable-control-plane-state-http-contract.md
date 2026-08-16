# B01 — Durable Control Plane State & HTTP Contract Compatibility

> Historical milestone snapshot. Partial/readiness labels below describe B01 at execution time; current terminal finding status is authoritative in `../operational-gap-inventory.md` and the H closure report.

**Status:** PASS

**Date:** 2026-08-15

**Baseline:** `ed46412 docs(epic-15.5): establish operational readiness gap baseline`

## Outcome

B01 established a restart-safe, single-node persistence path for the EPIC-15 administrative domains and aligned the shipped HTTP server with the methods already declared by the Product API.

The sprint fully resolves `ACS-ORG-008`. It partially resolves `ACS-ORG-001` and `ACS-ORG-009` because the selected adapter survives restart but is not shared or safe for concurrent replicas. The route-order defect within `ACS-ORG-017` is fixed, while distributed execution and recovery remain open.

## Discovery

### State ownership inventory

| State | Current holder after B01 | Authoritative? | Process-local? | Restart | B01 result / classification |
| --- | --- | ---: | ---: | ---: | --- |
| Tenant identity/lifecycle/history | `TenantRepository` | Yes | No in HTTP composition | Survives | `AUTHORITATIVE_DURABLE`, single node |
| Membership/ownership/history | `TenantMembershipRepository` | Yes | No in HTTP composition | Survives | `AUTHORITATIVE_DURABLE`, single node |
| Governance/policy | `TenantGovernanceRepository` | Yes | No in HTTP composition | Survives | `AUTHORITATIVE_DURABLE`, single node |
| Entitlements/limits | governance aggregate repository | Yes | No in HTTP composition | Survives | `AUTHORITATIVE_DURABLE`, single node |
| Administrative/operational audit stream | `AuditEventStore` used by `AuditService` | Evidence source | No in HTTP composition | Survives | durable projection, single node |
| Agent definitions/revisions | `AgentService` / in-memory repository | Yes | Yes | Lost | `AUTHORITATIVE_BUT_EPHEMERAL_BLOCKER`; B03 |
| Composition catalogs | seeded registries | Mixed | Yes | Re-seeded | development implementation; B03/F |
| Deployments | `DeploymentService` map | Yes | Yes | Lost | `DEFERRED_TO_OTHER_MILESTONE`; B03 |
| Runtime/execution runs | `RuntimeLifecycleService` maps plus engine observation | Yes/projection mix | Yes | Lost | `DEFERRED_TO_OTHER_MILESTONE`; B03/D |
| Worker registry/assignments | registry/service maps | Development authority | Yes | Lost | acceptable local DEV; D for distributed path |
| Economics/settlement | `EconomicService` and in-memory provider | Yes in DEV flow | Yes | Lost | `DEFERRED_TO_OTHER_MILESTONE`; B02 |
| Secrets | in-memory active store | Yes in DEV flow | Yes | Lost | `DEFERRED_TO_OTHER_MILESTONE`; B02 |
| Request context/rate-limit projection | request-local/mock | No | Session-local | N/A | `SESSION_LOCAL`; C |

No runtime, deployment, economics, secret or remote-worker persistence was introduced.

### Existing boundaries reused

- `TenantRepository`, `TenantMembershipRepository` and `TenantGovernanceRepository` remain the domain-facing boundaries.
- `AuditService` remains the canonical redaction/query service and now consumes `AuditEventStore`.
- Existing Tenant, Membership, Governance and Audit contracts were not replaced or serialized in HTTP form.
- `createControlPlaneContext` remains injectable for deterministic tests.
- `createAcsHttpHandler` remains the single real HTTP entry boundary used by tests and the server.

## Persistence scope and architecture

### Selected scope

B01 persists:

1. Tenant current state and lifecycle history;
2. Membership current state, role/status history and ownership;
3. Governance policy, entitlements, limits and aggregate history;
4. Audit events emitted through the shared `AuditService`.

Agents, deployment, runtime, job/lease, secrets and economics remain outside this sprint.

### Adapter

`DurableAdministrativeState` composes aggregate-specific adapters over one versioned administrative snapshot:

```text
TenantLifecycleService ────────> TenantRepository ───────┐
TenantMembershipService ──────> MembershipRepository ───┤
TenantGovernanceService ──────> GovernanceRepository ───┼─> atomic snapshot file
AuditService ─────────────────> AuditEventStore ─────────┘
```

The domain services do not know the path, JSON schema or filesystem operations. Direct context callers remain memory-backed unless they pass `useDurableAdministrativeState` or `administrativeStatePath`. `createAcsHttpServer` opts into the durable adapter by default.

### Atomicity and failures

Each repository mutation builds a new immutable snapshot, writes it to a temporary file in the target directory, and atomically renames it over the authoritative file. The in-process snapshot changes only after the rename succeeds.

`TenantMembershipRepository.saveMany` was added because ownership transfer changes the old and new owner together. Both records and histories are committed in one snapshot replacement.

Failure behavior:

- load/read errors and corrupt JSON fail explicitly with `ACS_ADMINISTRATIVE_STATE_PERSISTENCE_FAILED`;
- write/mkdir/rename failure propagates and does not update the in-memory authoritative snapshot;
- there is no silent fallback from durable to memory;
- resource persistence and its following audit append are separate atomic replacements, not one transaction. A transactional outbox/shared database remains a residual B finding.

### Multi-instance classification

```text
SINGLE_NODE_DURABLE
MULTI_INSTANCE_NOT_PROVEN
```

The adapter has no cross-process lock, live reload, distributed uniqueness or concurrent-writer fencing. It materially improves restart survivability but is not a production/shared-state adapter and does not close `ACS-ORG-001`.

## Restart survivability

The acceptance test creates state through context A, closes it, creates context B over the same file, mutates again, and creates context C for final verification.

| State | Result | Verified evidence |
| --- | --- | --- |
| Tenant | PASS | identity, active/suspended lifecycle, timestamps and revisions survive; revision continues after reload |
| Membership | PASS | owner transfer, prior owner role, status, timestamps and continuing revisions survive |
| Governance policy | PASS | policy ID, rules, default deny and aggregate revision survive |
| Entitlements | PASS | granted state and provenance fields survive |
| Limits | PASS | value survives and per-limit/aggregate revisions continue after reload |
| Administrative audit | PASS | tenant, event, correlation, actor, operation and revision remain queryable |
| Agent | DEFERRED | still process-local |
| Deployment/runtime/job | DEFERRED | still process-local |
| Economics/settlement | DEFERRED | B02 |

The loader validates schema version and critical object shapes. Serialization preserves the existing numeric timestamps, identifiers, status/effect enums, provenance objects, revision values and correlation IDs without domain remapping.

## HTTP contract discovery

### Root cause of ACS-ORG-008

The Product API route layer and frontend client had evolved to use `PUT`, `PATCH` and `DELETE`, but `createAcsHttpHandler` rejected every method except `GET` and `POST` before route matching. CORS preflight advertised the same incomplete allowlist. Route-level D01 tests called `routeProductApiRequest` directly and therefore did not exercise the shipped entry handler.

### Method matrix after B01

| Method | Server accepts? | Representative handler evidence | Result |
| --- | ---: | --- | --- |
| `GET` | Yes | Tenant list | PASS |
| `POST` | Yes | Tenant create/bootstrap/activate; runtime start/stop | PASS |
| `PUT` | Yes | governance policy, entitlement, limit | PASS |
| `PATCH` | Yes | Agent update | PASS |
| `DELETE` | Yes | entitlement revoke, limit clear | PASS |
| `OPTIONS` | Preflight | advertises the five application methods plus `OPTIONS` | PASS |
| other, for example `TRACE` | No | outer boundary returns structured `405` and `Allow` | PASS |

Route handlers remain responsible for deciding which accepted method is valid for a particular route. The read-only `/acs/*` inspection surface now explicitly accepts only `GET`, preventing the broader server allowlist from turning a read route into a method-agnostic response.

### Tenant Administration acceptance

The real HTTP handler was exercised for:

- Tenant list and creation;
- owner bootstrap and activation;
- governance policy `PUT`;
- entitlement `PUT` and `DELETE`;
- limit `PUT` and `DELETE`;
- Agent `PATCH` regression;
- CORS preflight and unsupported-method behavior.

Result:

```text
Tenant Administration PUT/DELETE declared contracts: 5/5 reachable
Application methods accepted by server: 5/5
Unexpected 405 responses in selected declared routes: 0
```

### Runtime start/stop reachability

The A01 finding was confirmed. Generic runtime mutation guards occurred before the existing start/stop handlers, so the handlers were unreachable.

B01 moved the typed `POST /api/v1/runtimes/:runtimeInstanceId/start` and `.../stop` routes before the guards and retained route-specific `405` behavior for wrong methods. `restart` remains unsupported. This is route compatibility only: state is still process-local, dispatch is local, and no remote/recovery claim is made.

## Compatibility and bootstrap

The development Tenant bootstrap is now ordered according to the EPIC-15 lifecycle contract:

```text
create provisioning Tenant
→ bootstrap first owner
→ establish default-deny development policy
→ activate
```

On reload, existing Tenant, Membership and Governance records are inspected before bootstrap, so restart does not create duplicate owners, re-run lifecycle transitions or increment governance revision merely because a process started.

The memory repositories remain available as explicit test/development adapters. No domain identifier or Product API payload changed.

## Files and modules

### Runtime/source

- `src/control-plane/durable-administrative-state.ts`
- `src/control-plane/audit-service.ts`
- `src/control-plane/tenant-domain.ts`
- `src/control-plane/tenant-membership.ts`
- `src/http/control-plane-context.ts`
- `src/http/server.ts`
- `src/http/routes/acs-routes.ts`
- `src/http/routes/product-api-routes.ts`
- `src/index.ts`

### Tests

- `tests/s45-epic-15-5-durable-http-contract.test.mjs`
- `tests/s20-http-integration.test.mjs`

## Test matrix

| Area | Evidence |
| --- | --- |
| restart | three independent context instances over one snapshot |
| revisions | Tenant, Membership, Governance aggregate and limit revisions preserved/continued |
| serialization | lifecycle timestamps, owner roles/status, policy/effect, entitlement and limit fields |
| ownership atomicity | prior/new owner persisted through one `saveMany` commit |
| failure | unwritable path rejects mutation without false in-memory success |
| corruption | invalid JSON rejects startup without memory fallback |
| HTTP methods | GET/POST/PUT/PATCH/DELETE and OPTIONS through real handler |
| Tenant Administration | policy, entitlement and limit mutations through real handler |
| runtime route order | start/stop handlers invoked; wrong method remains `405` |
| regressions | Tenant A01/B01/C01/C02/D01/E01 boundaries, isolation, Product API, HTTP and runtime suites |

## Finding status

| Finding | B01 status | Reason |
| --- | --- | --- |
| ACS-ORG-001 | **PARTIALLY_RESOLVED** | selected administrative state survives restart; remaining aggregates and multi-instance safety remain open |
| ACS-ORG-008 | **RESOLVED** | real server, CORS, routes and client method contract are compatible |
| ACS-ORG-009 | **PARTIALLY_RESOLVED** | audit survives single-node restart; shared append/retention/outbox remain open |
| ACS-ORG-017 | **OPEN with route subgap resolved** | start/stop reachable; durable remote dispatch/result/recovery still absent |

## Deferred scope

- managed secret provider and secret durability;
- economic state and settlement provider;
- Agent, deployment, runtime, execution-run and worker state durability;
- shared database, migrations, backup/restore and concurrent replicas;
- trusted HTTP identity and platform authority;
- distributed rate limiting and complete edge hardening;
- remote worker dispatch, durable queue/redelivery and recovery;
- telemetry exporters and production deployment.

The next planned sprint is **B02 — Production Secrets & Economic State Adapters**. It may reuse the explicit adapter-selection pattern, but must not treat the B01 filesystem snapshot as a production secret or economic store.

## Validation results

Validation executed on August 15, 2026:

| Check | Result | Evidence |
| --- | --- | --- |
| official build | **ENVIRONMENT BLOCKER** | `npm run build` reached TypeScript emission and failed with `TS5033` / `EROFS` while writing repository `dist`; project configuration was not changed |
| temporary compilation | **PASS** | `npx tsc -p tsconfig.json --outDir /tmp/epic15-5-b01/dist --declaration false --emitDeclarationOnly false --rootDir src` |
| B01 focused suite | **PASS** | `s45-epic-15-5-durable-http-contract.test.mjs`: 4/4 subtests |
| expanded regression set | **PASS** | 22/22 suite files, 0 failures, using the temporary compilation output |
| diff hygiene | **PASS** | `git diff --check` |

The official build failure is an environment output-path blocker, not a TypeScript diagnostic. The successful temporary emission and regression run establish code validation while preserving the distinction between the official command and its temporary-output substitute.

## Acceptance result

B01 is **PASS** for its approved scope:

- administrative state in scope is durable across restart;
- revisions and semantic metadata are preserved;
- persistence failures are explicit and cannot report false success;
- single-node versus multi-instance readiness is documented honestly;
- `ACS-ORG-008` is resolved;
- runtime start/stop reachability is restored without remote-runtime expansion.

Milestone B and ACS operational/production readiness remain incomplete.
