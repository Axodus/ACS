# Production Readiness Baseline

**Assessment date:** 2026-08-15

**Source revision:** `b104895`

**Overall classification:** **Development Ready / Integration Ready PARTIAL / Operational Ready BLOCKED / Production Ready BLOCKED**

This baseline evaluates the active composition, not only interfaces or milestone acceptance. `NOT PROVEN` is used when architecture or tests exist but no operational evidence demonstrates the required topology.

## Dimension baseline

| Dimension | Status | Evidence-based conclusion | Blocking findings |
| --- | --- | --- | --- |
| Identity | BLOCKED | HTTP accepts caller-selected mock identity; disabled mode can become platform authority. | ACS-ORG-003 |
| Security | BLOCKED | Tenant rules/redaction exist, but identity, secrets and edge trust are not production-grade. | ACS-ORG-002, 003, 010, 013 |
| Secrets | BLOCKED | Active memory store; plaintext local filesystem and mock alternatives only. | ACS-ORG-002, 016 |
| Persistence | BLOCKED | Core administrative and operational truth is process-local. | ACS-ORG-001, 007, 009, 019 |
| Runtime | PARTIAL | Sandbox lifecycle and engine adapters work; durable run state and recovery do not. | ACS-ORG-005, 017 |
| Distributed execution | NOT PROVEN | Worker contracts exist; only same-process local execution is active. | ACS-ORG-004, 005 |
| Deployment | BLOCKED | Sandbox deployment works; staged/live are intentionally rejected. | ACS-ORG-006 |
| Observability | BLOCKED | Evidence projections exist; no external exporter, HTTP telemetry, raw logs or traces. | ACS-ORG-009, 011, 012 |
| Economics | BLOCKED | Authorization/receipts exist; settlement and records are in memory. | ACS-ORG-007 |
| Audit | PARTIAL | Canonical, correlated, redacted, tenant-scoped read path exists; retention is process-local. | ACS-ORG-009 |
| Product API | PARTIAL | Broad read and bounded mutation surface exists; method mismatch, unreachable runtime mutations and unsupported actions remain. | ACS-ORG-008, 015, 017, 023 |
| Control Plane | PARTIAL | Main operational UX and Tenant Administration are browser-certified separately. | ACS-ORG-014–018 |
| UX journeys | BLOCKED | No complete authenticate-to-recover operator journey exists. | ACS-ORG-014–018, 021 |
| Recovery | BLOCKED | Diagnostics exist; durable reconcile/retry/cancel/operator remediation does not. | ACS-ORG-005, 018 |
| Testing | NOT PROVEN | Strong unit/route/browser coverage; production topology and failure modes are absent. | ACS-ORG-020 |

## Production-state inventory

| Component | State held | Current mechanism | Durable? | Shared across replicas? | Survives restart? | Production adapter? | Classification / severity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tenant | identity, lifecycle, revisions/history | `InMemoryTenantRepository` maps | No | No | No | No | Authoritative DEV state / BLOCKER |
| Membership | role, status, ownership history | service maps | No | No | No | No | Authoritative DEV state / BLOCKER |
| Tenant governance | policies, entitlements, limits, revisions | repository maps | No | No | No | No | Authoritative DEV state / BLOCKER |
| Agents | definitions, revisions, lifecycle metadata | service/repository maps | No | No | No | No | Authoritative DEV state / BLOCKER |
| Composition resources | roles, profiles, skills, tools, capabilities | registry maps and seeded values | No | No | Re-seeded only | No | Registry/authoritative mix / HIGH |
| Credential connections | secret references and connection metadata | registry maps | No | No | No | No | Authoritative DEV state / BLOCKER dependency |
| Secrets | raw secret values | active memory map; optional local plaintext files | Memory: no; file: local only | No | File only | No managed adapter | Production blocker |
| Deployments | request, target, status | `DeploymentService` map | No | No | No | No | Authoritative operational state / BLOCKER |
| Runtime instances | lifecycle/status | `RuntimeLifecycleService` map plus engine observation | No | No | No | No | Authoritative/projection mix / BLOCKER |
| Execution runs | request/status/result projection | runtime service map | No | No | No | No | Authoritative operational state / BLOCKER |
| Workers | registration, heartbeat, status | registry map | No | No | No | No remote control plane | Acceptable local DEV registry; production blocker |
| Assignments/leases | dispatch intent and lease | assignment-service maps | No | No | No | No durable dispatcher | Production blocker |
| Administrative audit | correlated events | `AuditService` array | No | No | No | No | Functional projection / CRITICAL |
| Legacy workflow receipts | execution receipts | local JSONL | Local-durable | No | Yes on same volume | No shared store | Acceptable DEV evidence, not production source |
| Legacy telemetry | events | memory or local JSONL | Local-durable when JSONL | No | Same volume only | No exporter | Acceptable DEV evidence, not operations |
| Economics | quotes, reservations, usage, settlements, receipts | `EconomicService` maps | No | No | No | No | Authoritative DEV state / BLOCKER |
| Settlement | provider response | `InMemorySettlementProvider` | No | No | No | No | Test/DEV implementation / BLOCKER |
| Rate limiting | request context only | caller-selected mock headers | No state | No | N/A | No | Contract/mock only / CRITICAL |
| Readiness | computed report | on-demand projection with hardcoded adapter signals | Computed | Per process | Recomputed | No live composite gate | PARTIAL / HIGH |
| Tool/plugin installation | catalog/projections | seeded registries; mutation unsupported | No operational install state | No | Re-seeded | No | BACKEND_ONLY/PARTIAL / HIGH |

### State classifications

- **Acceptable ephemeral:** request correlation objects, derived read models and non-authoritative caches that can be rebuilt from durable truth.
- **Test implementation:** in-memory stores explicitly injected by tests.
- **Development implementation:** local JSONL, local filesystem and local workers selected only in a named development profile.
- **Authoritative production state:** tenant, agent, deployment, runtime, job, audit and economic records. These require durable shared adapters before production.

The current composition does not make those profile boundaries enforceable: development adapters are constructed directly in `createControlPlaneContext`.

## Production-adapter inventory

| Capability | Contract/interface | Current active adapter | Production adapter exists? | Default? | Operationally validated? | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| Tenant repository | `TenantRepository` | `InMemoryTenantRepository` | No | Yes | Domain tests only | ACS-ORG-001 |
| Membership repository | internal repository/service contract | map-backed repository | No | Yes | Domain tests only | ACS-ORG-001 |
| Governance repository | repository/service contract | map-backed repository | No | Yes | Domain/evaluator tests | ACS-ORG-001 |
| Agent repository | revision repository/service | map-backed repository | No | Yes | Domain/API tests | ACS-ORG-001 |
| Deployment store | service map, no external store interface | map | No | Yes | Local integration only | ACS-ORG-001 |
| Runtime/job store | service maps, no durable job adapter | maps | No | Yes | Local lifecycle tests | ACS-ORG-005 |
| Secret store | `SecretStore` | `InMemorySecretStore` | No | Yes | Test/dev only | ACS-ORG-002 |
| Secret storage boundary | `AcsSecretStorage` | `MockAcsSecretStorage` | No | Inspection only | Contract tests | ACS-ORG-002 |
| Settlement provider | `SettlementProvider` | `InMemorySettlementProvider` | No | Yes | Contract tests | ACS-ORG-007 |
| Audit store | `AuditService` only | in-process array | No | Yes | Route/domain tests | ACS-ORG-009 |
| Telemetry sink | `TelemetrySink` | memory/JSONL | No external adapter | Local runtime defaults JSONL | Local tests | ACS-ORG-011 |
| Identity validator | no production validator contract in active HTTP chain | mock header parser | No | Yes | Mock negative/positive tests | ACS-ORG-003 |
| Rate limiter | context contract only | mock header parser | No | Disabled | Mock tests | ACS-ORG-010 |
| Worker dispatcher | registry/assignment contracts | direct `LocalExecutionWorker` | No remote adapter | Yes | Same-process tests | ACS-ORG-004 |
| Queue/broker | none | none | No | N/A | No | ACS-ORG-004/005 |
| Observability exporter | inspection contract | disabled | No active implementation | Disabled | No | ACS-ORG-011 |
| Production target | engine/target contracts | local WSL sandbox target | No certified live target | Yes for DEV | Sandbox tests | ACS-ORG-006 |

## Identity and authorization trust chain

```text
untrusted request headers
        ↓
parseMockAuthContext
        ↓
AcsAuthContext (disabled or mock)
        ↓
resolveAuthority
        ↓
platform_admin or tenant_member
        ↓
correct domain authority/governance rules
```

The lower authorization layers are valuable and tested, but the first trusted step is absent. Therefore:

- **Can an untrusted HTTP client forge actor identity today?** Yes.
- **Can an untrusted HTTP client forge `platform_admin` or global authority?** Yes, through caller-selected actor type or disabled mode.
- **Does cross-tenant domain enforcement exist?** Yes.
- **Does it establish production security without authenticated principal binding?** No.

## Restart survivability

| Event | Current expected behavior |
| --- | --- |
| ACS process restarts | A new context recreates DEV fixtures; tenant/admin, agent, deployment, runtime, audit and economics mutations disappear. |
| Local worker process is lost | Registration, assignment and lease state disappear with the same ACS process; no durable orphan recovery exists. |
| One replica dies while another remains | The remaining replica has independent maps and cannot reconstruct the lost replica's authoritative state. |
| Local JSONL volume survives | Legacy workflow receipts/telemetry remain readable on that volume, but are not the active Product API domain source and are not replica-shared. |
| Secret memory store restarts | Raw values and references held only by the active memory store are lost. |
| Filesystem secret store is used | Values survive on one volume but remain local plaintext and unavailable to other replicas. |

## Multi-replica baseline

The active architecture assumes a single process:

- mutable global/service maps are used as authority;
- worker and target registries are local;
- rate-limit state is absent;
- JSONL and filesystem stores assume a local volume;
- no distributed lock, transactional uniqueness or idempotent command store protects concurrent mutations;
- no acceptance suite starts two ACS instances against shared state.

Horizontal scaling is therefore **NOT PROVEN** and structurally unsafe for authoritative mutations.

## Readiness level model

### Level 1 — Development Ready

Criteria:

- local setup starts with documented dependencies;
- deterministic fixtures and sandbox operations work;
- unit/domain/route tests pass;
- no production claim is made.

**Current status: READY**, with the official `dist` build currently affected by the workspace `EROFS` environment caveat.

### Level 2 — Integration Ready

Criteria:

- Product API and UI complete supported flows against real application boundaries;
- external development services can be connected;
- failures are semantic and correlated;
- adapters may be non-production but are explicit.

**Current status: PARTIAL.** Broad routes and browser surfaces exist, but the server method mismatch, split Control Plane, unsupported composition and incomplete execution journey remain.

### Level 3 — Operational Ready

Criteria:

- trusted identity and tenant scope;
- durable shared authoritative state;
- supported secrets lifecycle;
- remote execution and durable job recovery;
- operator-visible diagnostics and remediation;
- restart and multi-instance proof.

**Current status: BLOCKED.** Milestones B–F are required.

### Level 4 — Production Ready

Criteria:

- all Operational Ready gates;
- production target and controlled rollout/rollback;
- external telemetry/alerts and dependency-aware traffic readiness;
- security, capacity and failure acceptance;
- approved production adapter configuration with no DEV fallback.

**Current status: BLOCKED.** Milestones G and H may certify it only after all prerequisites pass.

## Why current `ready` labels are insufficient

The existing readiness report correctly keeps `productionReady` false, but it combines live probes with hardcoded adapter facts and can show a local worker/target as “Distributed Runtime readiness: ready”. `health` endpoints identify liveness/inspection, not traffic safety. Future implementation must expose the readiness level and dependency evidence explicitly; a component being reachable must not imply the platform is operational or production-ready.

## Baseline decision

No production deployment guard may be removed based on this document alone. The baseline is a dependency map: durable state and trusted identity precede remote execution; remote execution and external diagnostics precede production deployment; complete UX and final acceptance close the operational claim.
