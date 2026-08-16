import type { IncomingMessage } from "node:http";
import type { ControlPlaneContext } from "../control-plane-context.js";
import { readBoundedJsonBody } from "../request-body.js";
import { fail, ok } from "../responses.js";
import type { WorkerServicePrincipal } from "../../workers/worker-service-auth.js";
import {
  RuntimeStateConflictError,
  RuntimeStateError,
  RuntimeStaleOwnerError,
  type DurableExecutionError,
  type DurableExecutionResult,
} from "../../workers/durable-runtime-state.js";
import type { WorkerCapability } from "../../workers/worker-types.js";

export async function routeWorkerRuntimeRequest(
  request: IncomingMessage,
  requestUrl: string,
  context: ControlPlaneContext,
  principal: WorkerServicePrincipal,
  correlationId?: string,
) {
  const coordinator = context.runtimeCoordinator;
  if (!coordinator) {
    return fail("remote runtime is not configured", 503, "runtime_dispatch_unavailable", correlationId);
  }
  const url = new URL(requestUrl, "http://localhost");
  const segments = url.pathname.split("/").filter(Boolean);
  try {
    if (segments.join("/") === "api/v1/internal/runtime/workers/register") {
      if (request.method !== "POST") return methodNotAllowed(correlationId, "POST");
      const body = readRecord(await readBoundedJsonBody(request, context.edgePolicy.limits.maxBodyBytes));
      const capabilities = readCapabilities(body.capabilities);
      assertCapabilitiesAllowed(principal, capabilities, body.targetId);
      const worker = coordinator.registerWorker({
        workerId: principal.workerId,
        instanceId: principal.instanceId,
        servicePrincipalId: principal.subject,
        name: readRequiredString(body, "name"),
        version: readRequiredString(body, "version"),
        capabilities,
      });
      return { status: 200, body: ok(worker, [], correlationId) };
    }

    if (segments.join("/") === "api/v1/internal/runtime/workers/heartbeat") {
      if (request.method !== "POST") return methodNotAllowed(correlationId, "POST");
      const body = readRecord(await readBoundedJsonBody(request, context.edgePolicy.limits.maxBodyBytes));
      const status = body.status;
      if (status !== "available" && status !== "busy" && status !== "draining") {
        throw new RuntimeStateError("invalid worker heartbeat status", "ACS_RUNTIME_INVALID_INPUT", { field: "status" });
      }
      const worker = coordinator.heartbeat({
        workerId: principal.workerId,
        instanceId: principal.instanceId,
        servicePrincipalId: principal.subject,
        status,
      });
      return { status: 200, body: ok(worker, [], correlationId) };
    }

    if (segments.join("/") === "api/v1/internal/runtime/jobs/claim") {
      if (request.method !== "POST") return methodNotAllowed(correlationId, "POST");
      const claim = coordinator.claimNext({
        workerId: principal.workerId,
        instanceId: principal.instanceId,
        servicePrincipalId: principal.subject,
      });
      return claim
        ? { status: 200, body: ok(claim, [], correlationId) }
        : { status: 204, body: undefined };
    }

    const jobId = segments[5];
    if (segments[0] === "api" && segments[1] === "v1" && segments[2] === "internal"
      && segments[3] === "runtime" && segments[4] === "jobs" && jobId && segments.length === 7) {
      if (request.method !== "POST") return methodNotAllowed(correlationId, "POST");
      const action = segments[6];
      const body = readRecord(await readBoundedJsonBody(request, context.edgePolicy.limits.maxBodyBytes));
      const ownership = {
        jobId,
        assignmentId: readRequiredString(body, "assignmentId"),
        leaseId: readRequiredString(body, "leaseId"),
        fencingToken: readPositiveInteger(body, "fencingToken"),
        workerId: principal.workerId,
        instanceId: principal.instanceId,
        servicePrincipalId: principal.subject,
      };
      if (action === "running") {
        return { status: 200, body: ok(coordinator.markRunning(ownership), [], correlationId) };
      }
      if (action === "renew") {
        return { status: 200, body: ok(coordinator.renewLease(ownership), [], correlationId) };
      }
      if (action === "result") {
        const result = readExecutionResult(body.result);
        const completed = coordinator.completeJob({
          ...ownership,
          result,
          resultIdempotencyKey: readRequiredString(body, "resultIdempotencyKey"),
        });
        return { status: completed.status === "cancelled" ? 409 : 200, body: ok(completed, [], correlationId) };
      }
      if (action === "failure") {
        const error = readExecutionError(body.error);
        return { status: 200, body: ok(coordinator.failJob({ ...ownership, error }), [], correlationId) };
      }
    }
    return fail("worker runtime route not found", 404, "not_found", correlationId);
  } catch (error) {
    if (error instanceof RuntimeStaleOwnerError) {
      return fail(error.message, 409, "stale_worker_ownership", correlationId, error.details);
    }
    if (error instanceof RuntimeStateConflictError) {
      return fail(error.message, 409, "runtime_state_conflict", correlationId, error.details);
    }
    if (error instanceof RuntimeStateError) {
      const status = error.code === "ACS_RUNTIME_JOB_NOT_FOUND" ? 404
        : error.code === "ACS_RUNTIME_WORKER_IDENTITY_MISMATCH"
          || error.code === "ACS_RUNTIME_WORKER_CAPABILITY_DENIED" ? 403
          : error.code === "ACS_RUNTIME_INVALID_INPUT" ? 400
            : 500;
      return fail(error.message, status, error.code.toLowerCase(), correlationId, error.details);
    }
    return fail("worker runtime request failed", 500, "runtime_internal_error", correlationId);
  }
}

function methodNotAllowed(correlationId: string | undefined, allow: string) {
  return fail("method not allowed", 405, "method_not_allowed", correlationId, { allow });
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RuntimeStateError("request body must be an object", "ACS_RUNTIME_INVALID_INPUT");
  }
  return value as Record<string, unknown>;
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new RuntimeStateError(key + " is required", "ACS_RUNTIME_INVALID_INPUT", { field: key });
  }
  return value;
}

function readPositiveInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new RuntimeStateError(key + " must be a positive integer", "ACS_RUNTIME_INVALID_INPUT", { field: key });
  }
  return Number(value);
}

function readStringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new RuntimeStateError(field + " must be a string array", "ACS_RUNTIME_INVALID_INPUT", { field });
  }
  return value as string[];
}

function readCapabilities(value: unknown): WorkerCapability {
  const record = readRecord(value);
  const maxConcurrentRuns = readPositiveInteger(record, "maxConcurrentRuns");
  const engineRevision = typeof record.engineRevision === "string" && record.engineRevision ? record.engineRevision : undefined;
  const supportedTargetIds = record.supportedTargetIds === undefined
    ? undefined
    : readStringArray(record.supportedTargetIds, "supportedTargetIds");
  return {
    engineId: readRequiredString(record, "engineId"),
    ...(engineRevision ? { engineRevision } : {}),
    supportedRunners: readStringArray(record.supportedRunners, "supportedRunners"),
    supportedProviders: readStringArray(record.supportedProviders, "supportedProviders"),
    supportedIsolationModes: readStringArray(record.supportedIsolationModes, "supportedIsolationModes"),
    supportedDeploymentModes: readStringArray(record.supportedDeploymentModes, "supportedDeploymentModes"),
    ...(supportedTargetIds ? { supportedTargetIds } : {}),
    maxConcurrentRuns,
  };
}

function assertCapabilitiesAllowed(
  principal: WorkerServicePrincipal,
  capabilities: WorkerCapability,
  targetId: unknown,
): void {
  if (principal.permittedCapabilities.includes("*")) return;
  const declared = [
    `engine:${capabilities.engineId}`,
    ...capabilities.supportedIsolationModes.map((item) => `isolation:${item}`),
    ...capabilities.supportedDeploymentModes.map((item) => `deployment:${item}`),
    ...(capabilities.supportedTargetIds?.map((item) => `target:${item}`) ?? []),
    ...(typeof targetId === "string" && targetId ? [`target:${targetId}`] : []),
  ];
  const denied = declared.filter((item) => !principal.permittedCapabilities.includes(item));
  if (denied.length) {
    throw new RuntimeStateError("worker credential does not permit declared capabilities", "ACS_RUNTIME_WORKER_CAPABILITY_DENIED", { denied });
  }
}

function readExecutionResult(value: unknown): DurableExecutionResult {
  const record = readRecord(value);
  if (record.status !== "success") throw new RuntimeStateError("result status must be success", "ACS_RUNTIME_INVALID_INPUT", { field: "result.status" });
  const output = readRecord(record.output);
  const completedAt = readPositiveInteger(record, "completedAt");
  const evidenceRefs = readStringArray(record.evidenceRefs, "evidenceRefs");
  if (!Array.isArray(record.usageRecords)) throw new RuntimeStateError("usageRecords must be an array", "ACS_RUNTIME_INVALID_INPUT");
  const usageRecords = record.usageRecords.map((entry) => {
    const usage = readRecord(entry);
    const source = readRequiredString(usage, "source");
    const confidence = readRequiredString(usage, "confidence");
    if (!(["worker", "engine", "runner", "provider"] as string[]).includes(source)) throw new RuntimeStateError("invalid usage source", "ACS_RUNTIME_INVALID_INPUT");
    if (confidence !== "estimated" && confidence !== "final") throw new RuntimeStateError("invalid usage confidence", "ACS_RUNTIME_INVALID_INPUT");
    return {
      dimension: readRequiredString(usage, "dimension"),
      quantity: readRequiredString(usage, "quantity"),
      unit: readRequiredString(usage, "unit"),
      startTime: readPositiveInteger(usage, "startTime"),
      endTime: readPositiveInteger(usage, "endTime"),
      source: source as "worker" | "engine" | "runner" | "provider",
      confidence: confidence as "estimated" | "final",
    };
  });
  return { status: "success", output, evidenceRefs, usageRecords, completedAt };
}

function readExecutionError(value: unknown): DurableExecutionError {
  const record = readRecord(value);
  const details = record.details && typeof record.details === "object" && !Array.isArray(record.details)
    ? record.details as Record<string, unknown>
    : undefined;
  return {
    code: readRequiredString(record, "code"),
    message: readRequiredString(record, "message"),
    retryable: record.retryable === true,
    ...(details ? { details } : {}),
  };
}
