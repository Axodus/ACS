# S19 — Execution Evidence and Audit

## Overview

S19 establishes append-oriented audit logging and evidence tracking across the governed execution lifecycle.

## Audit Event Structure

Every event is recorded with an immutable timestamp and correlation ID:

- `eventId`: Unique event identifier (`evt_...`).
- `eventType`: Lifecycle stage (e.g. `agent.plan_resolved`, `governance.evaluated`, `economic.reserved`, `deployment.completed`, `runtime.started`, `usage.metered`).
- `correlationId`: Correlation identifier spanning the execution attempt.
- `agentId` / `revision`: Governed agent identity.
- `deploymentId` / `runtimeInstanceId` / `executionRunId`: Execution entity references.
- `decision` / `result`: Structured governance and execution outcomes.
- `metadata`: Secret-redacted contextual payload.

## Secret Redaction

The `AuditService` automatically redacts sensitive fields matching secret key patterns (such as `api_key`, `secret`, `bearer`, `password`, `token`, `sk-`, `private_key`) prior to appending audit records.

## Querying Evidence

Audit records are queryable by `correlationId`, `agentId`, `deploymentId`, `runtimeInstanceId`, `executionRunId`, or `eventType`.
