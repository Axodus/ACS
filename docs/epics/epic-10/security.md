# EPIC-10 Security Baseline

## 1. Security posture

Autonomous agent execution is untrusted workload execution. Agent instructions, tool output, retrieved content, repositories, artifacts, model output, runners, plugins, and remote endpoints may be malicious or compromised. Control-plane authority MUST remain outside the workload trust boundary, and deny-by-default behavior MUST survive engine, runner, or provider failure.

## 2. Trust boundaries

1. Browser ↔ Product API: untrusted client; authenticate actor, authorize tenant/resource/action, validate all input, redact all output.
2. Control plane ↔ engine/worker: mutually authenticated internal boundary; authorize plan/lease, verify protocol/version, prevent replay, encrypt transport.
3. Worker ↔ runtime instance: privilege boundary; worker supervises but does not grant its own control-plane credentials.
4. Runtime ↔ runner/provider/tool/network: egress and credential boundary; explicit capability and destination policies apply.
5. Tenant/runtime/workspace ↔ other tenants: hard isolation boundary; no shared writable state or credentials.

## 3. Normative controls

### 3.1 Secrets and account credentials

- Raw secrets MUST NOT appear in AgentDefinition, AgentRevision, ExecutionPlan, normal Product API responses, URLs, command arguments, logs, telemetry, evidence, exceptions, crash dumps, or artifacts.
- Secret values MUST be encrypted at rest and in transit, versioned, rotatable, revocable, and resolved only for an authorized purpose/target/run.
- Secret leases SHOULD be short-lived and injected through the narrowest supported mechanism; environment variables are acceptable only where the runner requires them and the process environment is isolated.
- Frontend credential submission MUST use a dedicated one-way write flow. Responses return connection metadata/status only.
- Account-backed connections MUST use official provider mechanisms, validate scopes/entitlement, refresh only where supported, and expose disconnect/revocation. Unsupported local browser/session credential scraping or cloud copying is prohibited.
- Axodus-managed upstream credentials MUST be inaccessible to tenants and isolated from BYOK/BYOS stores and logs.

### 3.2 Tenant, filesystem, and runtime isolation

- Production state, artifacts, workspace, memory, runtime materialization, and credential projection MUST be scoped by tenant plus deployment/runtime instance.
- Runtime roots MUST be canonicalized and checked against target-owned allowlists before use. Symlink traversal, `..`, alternate mount, or hard-link escape MUST fail closed.
- Engine source MUST be read-only. Runtime workloads MUST NOT write to control-plane source, worker control state, another instance, or host credential locations.
- Destruction MUST prove ownership and containment before deletion, following the existing sandbox-adapter pattern.
- Resource quotas MUST cover CPU/time, memory, processes, file count/size, disk, network, and concurrency as supported by the isolation tier.

### 3.3 Sandboxing, commands, and tools

- Sandbox mode is the default. Live transports, shell, MCP, mutation, and activation remain disabled unless a policy explicitly grants the exact capability for a staged/live target.
- Command execution MUST use structured arguments without shell interpolation where possible; executable, working directory, environment, identity, limits, and timeout are policy inputs.
- Runners/plugins/tools MUST declare permissions, data access, network destinations, command capabilities, credential requirements, and isolation compatibility.
- Tool grants are least-privilege, revision-bound, target-bound, and auditable. Model output alone can never grant or expand a tool permission.
- Cancellation/timeout MUST terminate descendants or isolate them from further side effects; unknown termination state is reported as degraded, not completed.

### 3.4 Network and SSRF

- Runtime egress is deny-by-default for production isolation tiers and allowlisted by plan/policy where practical.
- URL-accepting tools MUST prevent SSRF to loopback, link-local, instance metadata, private control-plane networks, Unix sockets, file schemes, and DNS rebinding targets unless an explicitly scoped internal integration requires them.
- Redirects, resolved IPs, ports, schemes, response size, timeouts, and content types MUST be constrained.
- OpenCode and similar runner services MUST bind to localhost or a private authenticated network. Public exposure is not a supported production topology.
- Provider/tool responses are untrusted input and MUST be size-limited and sanitized before persistence/rendering.

### 3.5 Internal identity and privilege separation

- Workers/engines MUST have unique workload identities, short-lived credentials, revocation, and authorization limited to assigned tenants/plans.
- Dispatch leases MUST be signed/authenticated, replay-resistant, expiring, and bound to target identity, plan fingerprint, and attempt.
- The scheduler, economic service, governance authority, evidence writer, secret service, and execution worker SHOULD be separable privileges even when co-located in DEV.
- A compromised worker MUST NOT be able to mint plans, authorize billing/governance, read unrelated credentials, or rewrite append-only evidence.

### 3.6 Audit and redaction

- Security-significant allow/deny decisions, secret lifecycle operations, worker identity changes, runner/plugin grants, network-policy changes, and runtime degradation MUST emit evidence.
- Redaction MUST cover known secret fields, authorization headers, query strings, environment snapshots, provider payloads, token-like patterns, and user-specified sensitive values.
- Logs/evidence SHOULD reference `credential_connection_id`, key version, and access purpose, never a secret reference if that reference itself grants access.
- Production evidence MUST define retention, access, integrity verification, clock source, and export controls.

## 4. Production worker trust model

Each target declares a trust class and isolation capabilities. Scheduling policy determines which tenants, credentials, models, tools, and deployment modes that class may host. Worker self-advertisement is not sufficient: ACS verifies identity, attestation where available, configured capabilities, health freshness, and policy eligibility. Sensitive managed credentials SHOULD be exchanged for short-lived gateway tokens rather than delivered as upstream keys.

No single mechanism is mandated, but staged/live readiness requires evidence for isolation escape tests, credential cross-tenant tests, network/SSRF tests, command-boundary tests, lease replay/expiry tests, degraded worker behavior, redaction, and incident stop/revocation.

## 5. Security gates by deployment mode

| Gate | Sandbox | Staged | Live |
|---|---|---|---|
| Runtime isolation | Required | Production-like | Production-certified tier |
| External side effects | Disabled/synthetic | Explicitly constrained | Explicitly authorized |
| Credentials | Test/local scoped | Non-production or constrained | Production secret backend/leases |
| Network | Denied/limited | Allowlisted | Policy-controlled and monitored |
| Economic authorization | Contract/fake allowed | Required dry-run/reservation | Required |
| Evidence | Required | Required with integrity checks | Required with production retention |
| Human/governance approval | Per risk policy | Required for promotion | Required per live policy |

Promotion MUST be an explicit governed action. Passing sandbox tests does not authorize staged/live execution.

## 6. Minimum security acceptance for EPIC-10 readiness

- threat model and data-flow review approved;
- no secret returned through normal APIs, logs, evidence, or protocol fixtures;
- cross-tenant state/credential/workspace access tests fail closed;
- root/symlink/path traversal and destructive-operation containment tests pass;
- SSRF/private-network and internal-runner authentication tests pass;
- commands are bounded, cancellable, and descendant cleanup is verified;
- worker lease replay/expiry/revocation tests pass;
- governance and economic bypass attempts fail;
- incident stop, credential revocation, and degraded target behavior are exercised;
- residual risks and unsupported BYOS integrations are documented truthfully.
