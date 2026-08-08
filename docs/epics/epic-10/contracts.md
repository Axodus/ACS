# EPIC-10 Contracts

## 1. ACS Engine Protocol

The stable logical protocol is `acs-engine/1`. JSON is the canonical initial encoding. JSON Schema documents MUST become the normative wire schemas; generated TypeScript/Python types MUST NOT replace those schemas as protocol authority.

Initial transport is newline-delimited JSON over a supervised subprocess stdio pair: protocol frames on stdout, diagnostics on stderr, no prompts, and one frame per line. Future transports MAY include Unix socket, private HTTP, gRPC, job bus, or remote RPC. Transport adapters MUST preserve operation names, envelopes, error semantics, idempotency, cancellation, and correlation.

### 1.1 Request envelope

```json
{
  "protocol": "acs-engine/1",
  "id": "req_01",
  "correlation_id": "corr_01",
  "tenant_id": "tenant_01",
  "operation": "agent.inspect",
  "deadline": "2026-08-08T15:00:00Z",
  "idempotency_key": "idem_01",
  "params": { "agent_id": "mazikeen" },
  "meta": { "traceparent": "00-..." }
}
```

Required fields are `protocol`, `id`, `correlation_id`, `operation`, and `params`. Commands MUST carry an idempotency key. Tenant-bound operations MUST carry `tenant_id`. Unknown top-level fields MUST be ignored within major version 1 unless they alter security; unknown required capabilities MUST fail explicitly.

### 1.2 Success and error envelopes

```json
{
  "protocol": "acs-engine/1",
  "id": "req_01",
  "correlation_id": "corr_01",
  "ok": true,
  "result": {},
  "warnings": [],
  "engine": { "name": "agentsai", "version": "0.x", "revision": "44e9f4d..." }
}
```

```json
{
  "protocol": "acs-engine/1",
  "id": "req_01",
  "correlation_id": "corr_01",
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "agent definition failed validation",
    "retryable": false,
    "details": { "findings": [{ "code": "ACS001" }] }
  }
}
```

Error codes MUST be stable machine values. Required families include `invalid_request`, `unsupported_protocol`, `unsupported_operation`, `not_found`, `conflict`, `stale_revision`, `validation_failed`, `policy_denied`, `sandbox_only`, `unauthorized`, `credential_unavailable`, `target_unavailable`, `capacity_exhausted`, `deadline_exceeded`, `cancelled`, `engine_unavailable`, and `internal_error`. Messages/details MUST be redacted. Process exit is a transport failure, not a domain error envelope.

### 1.3 Version and compatibility

- Major version changes may be breaking and require a separate adapter.
- Minor additive schema/operation capabilities are announced by discovery.
- Patch engine versions may fix behavior without wire changes.
- Client and server MUST negotiate the exact major protocol and discovered operation/schema revisions before commands.
- A server MUST reject semantics it cannot safely honor, not silently downgrade.
- ACS SHOULD support the current and immediately previous compatible engine minor capability set during rolling upgrades.

### 1.4 Deadlines, cancellation, health, discovery

ACS supplies absolute deadlines; adapters impose per-operation defaults and a maximum. Deadline expiry MUST attempt cancellation and return `deadline_exceeded`; it MUST NOT imply the workload stopped until confirmed. Cancellation uses `execution.cancel` for runs and `request.cancel` for in-flight non-run requests, is idempotent, and returns final/accepted state.

Required bootstrap operations:

- `engine.health`: liveness/readiness, dependency/root checks, degraded reasons; MUST NOT mutate runtime.
- `engine.version`: engine/package revision, protocol versions, artifact schema versions.
- `engine.capabilities`: operations, deployment modes, runners/providers, isolation modes, streaming/cancellation, limits.

Health MUST distinguish `healthy`, `degraded`, and `unavailable`. Process liveness alone is not readiness.

## 2. AgentEngine adapter

```ts
interface AgentEngine {
  health(ctx: RequestContext): Promise<EngineHealth>;
  capabilities(ctx: RequestContext): Promise<EngineCapabilities>;
  listAgents(ctx: RequestContext, query?: AgentQuery): Promise<AgentSummary[]>;
  getAgent(ctx: RequestContext, id: string): Promise<AgentRecord>;
  createAgent(ctx: CommandContext, input: CreateAgentInput): Promise<AgentRecord>;
  updateAgent(ctx: CommandContext, id: string, input: UpdateAgentInput): Promise<AgentRecord>;
  validateAgent(ctx: CommandContext, id: string): Promise<ValidationReport>;
  deployAgent(ctx: CommandContext, id: string, target: DeploymentTarget): Promise<AgentDeployment>;
  startAgent(ctx: CommandContext, deploymentId: string, planId: string): Promise<RuntimeInstance>;
  stopAgent(ctx: CommandContext, runtimeInstanceId: string): Promise<void>;
  inspectAgent(ctx: RequestContext, runtimeInstanceId: string): Promise<RuntimeInspection>;
  cancelExecution(ctx: CommandContext, executionRunId: string): Promise<ExecutionRun>;
}
```

The ACS core depends on this interface and domain DTOs only. `OpenClawEngineAdapter` translates these calls to `acs-engine/1`; it MUST NOT import Python modules or parse internal engine state outside protocol results.

## 3. Execution targets

`ExecutionTarget` fields include `id`, `type` (`local`, `cloud-worker`, `remote`), `engine`, target revision, health with observed timestamp, region/location, capacity/allocations, runner capabilities, provider reachability, isolation modes, trust class, supported deployment modes, labels/constraints, and `scheduling_eligible` plus reasons.

```json
{
  "id": "local-wsl",
  "type": "local",
  "engine": "openclaw",
  "health": { "status": "healthy", "observed_at": "2026-08-08T12:00:00Z" },
  "capacity": { "max_concurrent_runs": 2, "available_slots": 1 },
  "supported_runners": ["openclaw-native", "opencode"],
  "supported_providers": ["anthropic", "axodus-managed"],
  "isolation_modes": ["process", "sandbox"],
  "scheduling_eligible": true
}
```

Health observations expire. Eligibility requires authenticated target identity, compatible engine/protocol, adequate capacity, required runner/provider/isolation capabilities, policy-compatible location/trust, and non-expired health.

## 4. Intelligence and runner contracts

```ts
interface ModelProvider {
  discoverModels(ctx: ProviderContext): Promise<ModelDescriptor[]>;
  health(ctx: ProviderContext): Promise<ProviderHealth>;
  estimate(input: InferenceEstimateInput): Promise<UsageEstimate>;
}

interface AgentRunner {
  capabilities(ctx: RunnerContext): Promise<RunnerCapabilities>;
  execute(task: AgentTask): Promise<ExecutionHandle>;
  cancel(executionId: string): Promise<void>;
  inspect(executionId: string): Promise<ExecutionStatus>;
}

interface CredentialProvider {
  validate(connectionId: string): Promise<CredentialStatus>;
  resolve(connectionId: string, purpose: CredentialPurpose): Promise<CredentialLease>;
  refresh(connectionId: string): Promise<CredentialStatus>;
  revoke(connectionId: string): Promise<void>;
}
```

Model descriptors SHOULD express context window, modalities, tool use, reasoning/coding capabilities, locality, pricing metadata source/time, and availability. Runner capabilities SHOULD express task types, streaming, cancellation, supported providers/models/credential modes, workspace needs, network requirements, and isolation.

## 5. Credential model

- `CredentialConnection`: logical tenant/user-owned connection with type `managed`, `api-key`, `oauth`, `subscription`, `local-runner`, or `service-account`; provider, owner, scopes, status, timestamps, secret references, and metadata.
- `CredentialProvider`: backend-specific validation/resolution/refresh/revocation behavior.
- `CredentialSecretReference`: opaque locator, backend, key version, and purpose metadata; never secret material.
- `CredentialStatus`: `pending`, `active`, `degraded`, `expired`, `revoked`, or `unsupported`, with redacted reason and last verification.

AgentDefinition contains only a logical connection ID:

```json
{
  "provider": "anthropic",
  "credential_connection": "cred_user_123_anthropic"
}
```

Resolution MUST be late-bound to the authorized execution target, short-lived where possible, purpose-limited, audited, and never included in protocol logs/evidence. DEV MAY use an encrypted local/keyring adapter. Production MUST use a replaceable managed-secret abstraction with encryption at rest/in transit, access policy, rotation, revocation, and audit.

BYOS MUST use official mechanisms supported by the specific provider (CLI, SDK, device/OAuth/account connection). Copying, scraping, exporting, or replaying unsupported browser/session tokens is prohibited. Cloud execution requires an explicitly cloud-compatible connection; a local subscription login does not imply cloud portability.

## 6. Model strategy and execution plan

`ModelStrategy` includes primary provider/model, ordered fallbacks, selected runner, credential source per route, hard capability requirements, and optional cost, latency, quality, context, tool-use, reasoning, or coding constraints. Fallback MUST be policy/economic compatible and explicitly recorded when selected.

```json
{
  "id": "plan_01",
  "agent_revision": "agent-mazikeen@7",
  "environment": "local-wsl",
  "engine": { "id": "openclaw", "revision": "44e9f4d..." },
  "execution_target": "local-wsl",
  "runner": "opencode",
  "model_strategy": {
    "primary": { "provider": "anthropic", "source": "user-api", "model": "configured-model", "credential_connection": "cred_01" },
    "fallbacks": [{ "provider": "axodus-managed", "model": "managed-default", "credential_connection": "managed_axodus" }]
  },
  "governance": { "policy": "policy_01", "revision": 3 },
  "billing": { "policy": "billing_01", "settlement": "NEURONS" },
  "isolation": { "mode": "sandbox" }
}
```

Plans are immutable. Retries create attempts under the same run or a successor run according to idempotency policy; any material plan change creates a new plan.

## 7. Product API

The frontend communicates exclusively with the authenticated, tenant-aware ACS Product API. Canonical resources are versionable even if the initial routing retains `/acs`:

| Surface | Minimum responsibility |
|---|---|
| `/acs/engines` | health, version, capabilities; no internals. |
| `/acs/execution-targets` | registration/inspection/eligibility/capacity. |
| `/acs/agents` | definitions, immutable revisions, validation, composition actions. |
| `/acs/roles`, `/profiles`, `/skills`, `/tools`, `/capabilities` | governed reusable resources and revisions. |
| `/acs/providers`, `/models`, `/runners` | discovery and policy-compatible choices. |
| `/acs/credentials` | connection metadata/status/create/rotate/revoke; never secret reads. |
| `/acs/executions`, `/deployments`, `/runtime` | plan/authorize/cancel/inspect lifecycle. |
| `/acs/billing`, `/usage` | quotes, reservations, metering, settlements, receipts. |
| `/acs/evidence` | correlated redacted event/query surface. |

Commands MUST support idempotency, optimistic concurrency/revision preconditions, structured validation errors, correlation IDs, actor/tenant authorization, audit events, and `202 Accepted` for asynchronous work. Existing response-envelope, correlation, rate-limit, and redaction behavior SHOULD be preserved. Product API DTOs MUST NOT expose filesystem paths unless an operator-only redacted diagnostic contract explicitly permits them.

Prohibited paths are Frontend → `~/.openclaw`, AgentsAI internals, Python CLI, OpenCode, external model credentials, or providers.

## 8. Evidence contract

Lifecycle events include:

```text
agent.created agent.updated agent.composed agent.validated
execution.planned execution.authorized execution.started execution.completed
execution.failed execution.cancelled
deployment.requested deployment.approved deployment.executed
runtime.started runtime.stopped runtime.degraded
usage.metered billing.reserved billing.settled billing.refunded
```

Every evidence event MUST contain event ID/type/schema version, correlation/causation IDs, tenant, actor, timestamp, resource IDs/revisions, outcome, component identity/version, and redacted attributes. Applicable events MUST correlate agent revision, composition fingerprint, engine revision, target, runner, provider/model, credential connection ID (never secret ref/value), governance decision, plan/run/deployment/runtime IDs, billing record, and usage records.

Evidence stores MUST be append-oriented and tamper-evident or externally integrity-verifiable for production. Event producers use an outbox/idempotent append strategy so retries do not create ambiguous lifecycle claims. Large artifacts are content-addressed; evidence stores hashes and authorized references, not secret-bearing payloads.
