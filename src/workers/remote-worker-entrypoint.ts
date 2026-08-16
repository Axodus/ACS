import { homedir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createOpenClawEngineFromManifest } from "../engines/openclaw-bootstrap.js";
import { HttpProductionTargetEngine } from "../engines/http-production-target-engine.js";
import type { AgentEngine } from "../engines/agent-engine.js";
import { FetchRemoteWorkerTransport, RemoteExecutionWorker } from "./remote-worker.js";
import { createOperationalTelemetryFromEnvironment } from "../control-plane/operational-telemetry.js";

export async function runRemoteWorkerFromEnvironment(environment: NodeJS.ProcessEnv = process.env): Promise<RemoteExecutionWorker> {
  const baseUrl = required(environment, "ACS_CONTROL_PLANE_URL");
  const token = required(environment, "ACS_WORKER_TOKEN");
  const workerId = required(environment, "ACS_WORKER_ID");
  const instanceId = required(environment, "ACS_WORKER_INSTANCE_ID");
  const acsRoot = resolve(environment.ACS_ROOT ?? process.cwd());
  const runtimeRoot = resolve(environment.ACS_RUNTIME_ROOT ?? `${homedir()}/.openclaw`);
  const stateRoot = resolve(environment.ACS_STATE_ROOT ?? `${runtimeRoot}/.acs/state`);
  const configRoot = resolve(environment.ACS_CONFIG_ROOT ?? `${runtimeRoot}/.acs/config`);
  const artifactsRoot = resolve(environment.ACS_ARTIFACTS_ROOT ?? `${runtimeRoot}/.acs/artifacts`);
  const workspaceRoot = resolve(environment.ACS_WORKSPACE_ROOT ?? `${runtimeRoot}/.acs/workspace`);
  const engineMode = environment.ACS_WORKER_ENGINE ?? "openclaw";
  let engine: AgentEngine;
  if (engineMode === "production-http") {
    engine = new HttpProductionTargetEngine({
      baseUrl: required(environment, "ACS_PRODUCTION_TARGET_URL"),
      token: required(environment, "ACS_PRODUCTION_TARGET_TOKEN"),
      requestTimeoutMs: optionalPositiveInteger(environment.ACS_PRODUCTION_TARGET_TIMEOUT_MS),
    });
  } else if (engineMode === "openclaw") {
    engine = createOpenClawEngineFromManifest({
      acsRoot,
      runtimeRoot,
      stateRoot,
      configRoot,
      artifactsRoot,
      workspaceRoot,
      ...(environment.ACS_PYTHON_COMMAND ? { pythonCommand: environment.ACS_PYTHON_COMMAND } : {}),
      ...(environment.ACS_ENGINE_TIMEOUT_MS ? { timeoutMs: positiveInteger(environment.ACS_ENGINE_TIMEOUT_MS, "ACS_ENGINE_TIMEOUT_MS") } : {}),
    });
  } else {
    throw new Error("ACS_WORKER_ENGINE must be openclaw or production-http");
  }
  const worker = new RemoteExecutionWorker({
    transport: new FetchRemoteWorkerTransport({
      baseUrl,
      token,
      requestTimeoutMs: optionalPositiveInteger(environment.ACS_WORKER_REQUEST_TIMEOUT_MS),
    }),
    engine,
    workerId,
    instanceId,
    workerName: environment.ACS_WORKER_NAME ?? workerId,
    workerVersion: environment.ACS_WORKER_VERSION ?? "0.1.0",
    targetId: environment.ACS_WORKER_TARGET_ID ?? (engineMode === "production-http" ? "production-single-host" : "local-wsl"),
    supportedIsolationModes: engineMode === "production-http" ? ["tenant-scoped"] : ["sandbox"],
    telemetry: createOperationalTelemetryFromEnvironment({
      environment,
      serviceName: environment.ACS_OTEL_SERVICE_NAME ?? "acs-remote-worker",
      instanceId,
    }),
    heartbeatIntervalMs: optionalPositiveInteger(environment.ACS_WORKER_HEARTBEAT_INTERVAL_MS),
    pollIntervalMs: optionalPositiveInteger(environment.ACS_WORKER_POLL_INTERVAL_MS),
    leaseRenewIntervalMs: optionalPositiveInteger(environment.ACS_WORKER_LEASE_RENEW_INTERVAL_MS),
    executionDelayMs: optionalNonNegativeInteger(environment.ACS_WORKER_EXECUTION_DELAY_MS),
    maxConcurrentRuns: optionalPositiveInteger(environment.ACS_WORKER_MAX_CONCURRENT_RUNS),
    onError: (error) => {
      process.stderr.write(JSON.stringify({
        success: false,
        service: "acs-remote-worker",
        category: "worker_operation_failed",
        error: error instanceof Error ? error.message : String(error),
      }) + "\n");
    },
    onEvent: (event) => {
      process.stderr.write(JSON.stringify({ success: true, service: "acs-remote-worker", ...event }) + "\n");
    },
  });
  await worker.start();
  return worker;
}

async function main(): Promise<void> {
  const worker = await runRemoteWorkerFromEnvironment();
  process.stdout.write(JSON.stringify({
    success: true,
    service: "acs-remote-worker",
    workerId: worker.workerId,
    instanceId: worker.instanceId,
    processId: process.pid,
  }) + "\n");
  const stop = async () => {
    await worker.stop({ drain: true });
    process.exit(0);
  };
  process.once("SIGINT", () => { void stop(); });
  process.once("SIGTERM", () => { void stop(); });
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(name + " is required");
  return value;
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(name + " must be a positive integer");
  return parsed;
}

function optionalPositiveInteger(value: string | undefined): number | undefined {
  return value ? positiveInteger(value, "worker interval/capacity") : undefined;
}

function optionalNonNegativeInteger(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("worker execution delay must be a non-negative integer");
  return parsed;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  void main().catch((error) => {
    process.stderr.write(JSON.stringify({ success: false, service: "acs-remote-worker", error: error instanceof Error ? error.message : String(error) }) + "\n");
    process.exitCode = 1;
  });
}
