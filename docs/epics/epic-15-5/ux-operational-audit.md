# UX Operational Audit

## Classification

- **SUPPORTED:** real Product API path and operator surface exist for the bounded behavior.
- **PARTIAL:** some steps work, but the journey lacks required action, truth or recovery.
- **BACKEND_ONLY:** a domain/application capability exists without a supported operator surface.
- **MOCK:** UI/API depends on synthetic identity, data or behavior.
- **BLOCKED:** a safety/readiness prerequisite deliberately prevents the step.
- **MISSING:** no supported capability was found.

Browser acceptance from EPIC-14 and EPIC-15 proves route rendering, responsiveness and accessibility within those scopes. This audit asks whether the same routes let an operator complete real work.

## Surface inventory

| Surface/resource | Read | Create/configure | Operate | Observe/audit | Recover | Current assessment |
| --- | --- | --- | --- | --- | --- | --- |
| Agents | Yes | Agent create/edit/revisions | Sandbox deploy action exists | readiness, revisions, evidence | archive/restore; no runtime recovery | PARTIAL |
| Composition roles/profiles | Yes | Unsupported through semantic Product API mutations | N/A | compatibility/readiness | N/A | BACKEND_ONLY/PARTIAL |
| Capabilities/skills/tools/plugins | Catalog reads | Assignment/install mutations unsupported | N/A | read projection | N/A | PARTIAL |
| Providers/credentials | Reads and connection metadata | Secret provisioning not supported | Connection state only | readiness summaries | rotate/revoke/reconnect absent | PARTIAL |
| Deployments | List/detail | Agent sandbox deploy | No staged/live, rollback or reconcile | status/evidence | no rollback/retry | PARTIAL/BLOCKED |
| Runtimes | List/detail/jobs/events | Product API start/stop creates/cancels durable jobs | authenticated independent sandbox worker | durable status/result/recovery events | automatic lease/orphan recovery; operator retry UI absent | BACKEND_ONLY/PARTIAL |
| Execution runs | List/detail | durable remote dispatch path exists | cancellation API; retry UI absent | durable result/evidence projection | automatic recovery, no operator remediation surface | PARTIAL |
| Workers/targets | List/detail/readiness | remote registration/heartbeat exists; scheduling UI absent | authenticated worker pull | durable heartbeat/lease/recovery projection | automatic reassign; drain UI absent | BACKEND_ONLY/PARTIAL |
| Readiness/diagnostics | Yes | No configuration | inspection only | blockers/evidence | recommended action text only | SUPPORTED read / PARTIAL operation |
| Economics | quotes/reservations/usage/settlement reads | in-memory DEV flow | no real settlement control | receipts/audit projection | reconciliation operator flow absent | PARTIAL/MOCK |
| Tenant administration | List/detail/lifecycle/members/governance/audit | Yes at route/domain layer | several POST mutations | real in-process audit | no durable recovery | PARTIAL/MOCK identity |
| Governance/entitlements/limits | Read | Client uses PUT/DELETE | blocked at real HTTP handler | decision/read models | no recovery needed | BLOCKED by ACS-ORG-008 |
| Secrets | reference-only inspection | no supported secure UI/API lifecycle | runtime resolution only from bootstrap | redaction/readiness | rotate/revoke absent | MISSING operator journey |
| System settings/admin | read-only legacy boundary | unavailable/future | unavailable | caveats | none | BACKEND_ONLY/FUTURE |

## Journey A — Agent lifecycle

| Step | Surface | Status | Gap / workaround currently required | Target UX | Findings |
| --- | --- | --- | --- | --- | --- |
| Create Agent | `/agents/new` → Product API | SUPPORTED for bounded agent input | Active state is process-local | keep semantic form, persist durably | 001 |
| Configure identity/revision | Agent manage | SUPPORTED/PARTIAL | revisions work, but durable concurrency is absent | durable revision and conflict feedback | 001 |
| Assign Role/Profile | composition detail | BACKEND_ONLY | read projections; mutation unsupported | governed selection with compatibility receipt | 015 |
| Assign capabilities | composition detail | PARTIAL | effective capability read exists; supported assignment path incomplete | semantic capability mutation | 015 |
| Configure tools/plugins | catalogs | BACKEND_ONLY | install/assignment requires code/fixtures | governed install/assignment action | 015 |
| Configure secrets | provider/credential views | MISSING | bootstrap, environment or direct backend knowledge | managed reference create/rotate/revoke | 002, 016 |
| Validate readiness | Agent readiness | SUPPORTED/PARTIAL | signals include development hardcodes | live adapter-aware readiness | 012 |
| Deploy | Agent action | SUPPORTED for sandbox | production target blocked by prerequisites | explicit target and gate evidence | 006 |
| Inspect deployment | Operations/evidence | SUPPORTED/PARTIAL | process-local state and no rollback | durable status plus rollback/reconcile | 001, 018 |

**Journey result:** **PARTIAL**. An operator can exercise a useful development/sandbox lifecycle, but cannot fully compose, secret-provision or production-deploy an Agent using supported surfaces.

## Journey B — Execution

| Step | Surface | Status | Gap / workaround currently required | Target UX | Findings |
| --- | --- | --- | --- | --- | --- |
| Select deployed Agent | Agent/Operations | SUPPORTED for current process | deployments disappear on restart | durable selectable deployment | 001 |
| Start execution/runtime | Product API/runtime action | BACKEND_ONLY/SUPPORTED | durable remote job exists, but current operator surface does not expose the full flow | execution action with assignment/recovery feedback | 017 |
| Observe status | runtime/execution API | BACKEND_ONLY/SUPPORTED | durable job/worker/lease state exists; UI integration remains | surface canonical freshness/recovery state | 011, 017 |
| Inspect result | runtime job/evidence API | BACKEND_ONLY/SUPPORTED | durable result exists; complete operator presentation remains | correlated result and artifacts | 017 |
| Inspect failure | diagnostics/evidence | PARTIAL | raw logs/traces unavailable | correlated logs/traces and cause | 011 |
| Retry/cancel | Product API cancel; retry via automatic policy | PARTIAL | no governed operator retry/drain surface | semantic idempotent actions | 017, 018 |
| Remediate/recover | automatic recovery plus diagnostics | PARTIAL | lease/orphan recovery is automatic; operator commands/UI remain missing | governed runbook action and verification | 018 |

**Journey result:** **PARTIAL for operational use**. AEES-D proves distributed backend execution/recovery; Milestone F must expose the supported operator journey and Milestone E must add diagnostics.

## Journey C — Tenant administration

| Step | Surface | Status | Gap / workaround currently required | Target UX | Findings |
| --- | --- | --- | --- | --- | --- |
| Authenticate | Tenant Administration context selector | MOCK | browser localStorage selects actor/system role | real authenticated shared session | 003 |
| List/detail tenant | `/admin/tenants` | SUPPORTED in one process | separate app; state not durable | canonical shell and durable read model | 001, 014 |
| Lifecycle | detail actions | SUPPORTED at HTTP POST layer | forged authority remains possible | trusted actor plus durable receipt | 003 |
| Membership/ownership | members tab | SUPPORTED at route layer | mock actor and ephemeral state | same semantics with trusted identity | 001, 003 |
| Governance policy | governance tab | BLOCKED over real server | UI sends PUT; handler rejects it | aligned method/preflight contract | 008 |
| Entitlements/limits | tabs | BLOCKED over real server | UI sends PUT/DELETE; handler rejects them | aligned method/preflight contract | 008 |
| Audit/history | activity tab | SUPPORTED in process | lost on restart and not replica-shared | durable tenant-scoped history | 009 |

**Journey result:** **PARTIAL/MOCK**. EPIC-15 contracts and browser UX are real, but trusted identity, durability, shell integration and several HTTP mutations are not operational.

## Journey D — Operator failure handling

| Step | Surface | Status | Gap / workaround currently required | Target UX | Findings |
| --- | --- | --- | --- | --- | --- |
| Detect issue | readiness/operations/evidence | PARTIAL | no external alerts; operator must open ACS | alert and readiness signal | 011, 012 |
| Identify component | diagnostics/health | SUPPORTED/PARTIAL | local projections and hardcoded adapter facts | live dependency graph | 012 |
| Inspect evidence | audit/evidence/economics | PARTIAL | process-local, no raw logs/traces | durable correlated timeline | 009, 011 |
| Understand cause | diagnostic summaries | PARTIAL | actionability varies; no deep runtime logs | causal context and affected resources | 011, 018 |
| Remediate | mostly unsupported | MISSING | shell, file edits or restart | bounded runbook actions | 018, 021 |
| Verify recovery | manual refresh | PARTIAL | no durable before/after proof | post-action readiness and audit receipt | 018 |

**Journey result:** **BLOCKED**. Detection is useful, but a supported remediation loop is absent.

## Journey E — Production deployment

| Step | Surface | Status | Gap / workaround currently required | Target UX | Findings |
| --- | --- | --- | --- | --- | --- |
| Production readiness | readiness report | BLOCKED | known blockers and no traffic gate | signed level/gate with live dependencies | 012 |
| Target selection | targets | BLOCKED | local sandbox target only | certified production target | 006 |
| Deploy | agent deploy | BLOCKED | sandbox-only checks at multiple layers | gated rollout after prerequisites | 006 |
| Health/observe | operations/evidence | PARTIAL | no external exporter | target and platform telemetry | 011 |
| Rollback/recover | none | MISSING | manual engineering process | governed rollback/reconcile | 018 |

**Journey result:** **BLOCKED by design**. The current gate correctly prevents unsafe production deployment.

## Hidden operational steps

| Hidden step | Current mechanism | Why it is an operational gap | Findings |
| --- | --- | --- | --- |
| Choose actor/platform authority | browser localStorage and headers | untrusted client controls security context | 003 |
| Seed tenant, owner, policy and agent | `createControlPlaneContext` code | restart rebuilds fixtures, not operator data | 001 |
| Provision secret | code/bootstrap/in-memory store | no secure Product API/UX lifecycle | 002, 016 |
| Configure roots/endpoints | environment variables and local filesystem | requires shell and deployment knowledge | 021 |
| Register remote worker | signed credential plus worker entrypoint/environment | backend path exists but onboarding still requires deployment engineering | 021 |
| Repair orphan/stale runtime | automatic recovery coordinator | backend no longer needs manual DB repair; operator inspection/remediation UI remains | 018 |
| Obtain raw runtime logs/traces | direct process/filesystem access | not exposed or exported | 011 |
| Reconcile settlement | no supported provider/operator flow | memory provider only | 007 |

## Error UX audit

### Existing strengths

- Product API uses structured error envelopes, correlation IDs, semantic codes and denial layers.
- Tenant administration renders loading, empty, forbidden, error and semantic mutation feedback.
- Main Control Plane exposes blockers, caveats, evidence and unsupported-action explanations.
- Secret redaction and cross-tenant domain errors are explicit.

### Gaps

- `405` from the outer HTTP method guard is not the domain/API error the Tenant UI expects.
- No authenticated identity means a forbidden response does not prove a trusted actor decision.
- Diagnostics often stop at “unsupported”, “deferred” or a finding without an executable remediation.
- No external signal alerts an operator before opening the Control Plane.
- Cached runtime fallback is not clearly distinguished from a successful live inspection at the domain boundary.
- Provider, worker and settlement failures lack retry/reconcile actions and post-action verification.

## Ready-surface audit

Current surfaces distinguish production readiness from development status in many places, but the vocabulary remains inconsistent:

- `/api/v1/health` and `/acs/health` are connectivity/inspection, not production readiness.
- the readiness report correctly keeps production blocked;
- the “Distributed Runtime readiness” flag can be ready based on a local worker/target;
- stale legacy projections still call tenant administration future scope;
- static/demo content can display live-looking data without runtime proof.

Target presentation must always include the readiness level, evidence timestamp/source and whether the state is observed, derived, mocked or configured.

## UX acceptance target for Milestone F

Milestone F must prove at least one non-destructive flow across a single authenticated Control Plane:

```text
tenant selection
→ agent create/configure
→ governed composition assignment
→ managed secret reference
→ readiness
→ sandbox/approved target deploy
→ execution
→ failure diagnosis
→ governed remediation
→ audit verification
```

The flow may remain non-production until G/H, but it may not use forged identity, direct repository access, file edits or hidden curl commands.
