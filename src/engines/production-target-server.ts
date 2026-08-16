import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import type {
  DeployAgentRequest,
  DeploymentInspectionResult,
  DeploymentResult,
  ExecutionTargetInfo,
  RollbackDeploymentRequest,
  RuntimeInstanceResult,
  StartRuntimeRequest,
} from "./agent-engine.js";

interface StoredDeployment {
  readonly deploymentId: string;
  readonly agentId: string;
  readonly revision: number;
  readonly targetId: string;
  readonly deploymentMode: string;
  readonly executionPlanId?: string;
  readonly artifactReference: string;
  readonly status: "active" | "degraded" | "failed" | "stopped";
  readonly health: "ready" | "degraded" | "unavailable";
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly predecessorDeploymentId?: string;
  readonly reasonCode?: string;
}

interface TargetRow { readonly payload_json: string; }

export class ProductionTargetStore {
  readonly #database: DatabaseSync;

  constructor(options: { readonly filePath: string }) {
    mkdirSync(dirname(options.filePath), { recursive: true, mode: 0o700 });
    this.#database = new DatabaseSync(options.filePath);
    this.#database.exec("PRAGMA journal_mode = WAL");
    this.#database.exec("PRAGMA busy_timeout = 5000");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS target_deployments (
        deployment_id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS target_runtimes (
        runtime_id TEXT PRIMARY KEY,
        deployment_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  saveDeployment(record: StoredDeployment): StoredDeployment {
    this.#database.prepare(`
      INSERT INTO target_deployments (deployment_id, agent_id, revision, status, payload_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(deployment_id) DO UPDATE SET
        agent_id = excluded.agent_id,
        revision = excluded.revision,
        status = excluded.status,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `).run(record.deploymentId, record.agentId, record.revision, record.status, JSON.stringify(record), record.updatedAt);
    return record;
  }

  getDeployment(deploymentId: string): StoredDeployment | undefined {
    const row = this.#database.prepare(
      "SELECT payload_json FROM target_deployments WHERE deployment_id = ?",
    ).get(deploymentId) as unknown as TargetRow | undefined;
    return row ? JSON.parse(row.payload_json) as StoredDeployment : undefined;
  }

  latestActive(agentId: string, excludeDeploymentId?: string): StoredDeployment | undefined {
    const row = this.#database.prepare(`
      SELECT payload_json FROM target_deployments
      WHERE agent_id = ? AND status IN ('active', 'degraded') AND deployment_id != ?
      ORDER BY updated_at DESC LIMIT 1
    `).get(agentId, excludeDeploymentId ?? "") as unknown as TargetRow | undefined;
    return row ? JSON.parse(row.payload_json) as StoredDeployment : undefined;
  }

  saveRuntime(record: RuntimeInstanceResult): RuntimeInstanceResult {
    this.#database.prepare(`
      INSERT INTO target_runtimes (runtime_id, deployment_id, payload_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(runtime_id) DO UPDATE SET
        deployment_id = excluded.deployment_id,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `).run(record.runtimeInstanceId, record.deploymentId, JSON.stringify(record), record.timestamp);
    return record;
  }

  getRuntime(runtimeId: string): RuntimeInstanceResult | undefined {
    const row = this.#database.prepare(
      "SELECT payload_json FROM target_runtimes WHERE runtime_id = ?",
    ).get(runtimeId) as unknown as TargetRow | undefined;
    return row ? JSON.parse(row.payload_json) as RuntimeInstanceResult : undefined;
  }

  health(): boolean {
    try { this.#database.prepare("SELECT 1 AS ok").get(); return true; } catch { return false; }
  }

  close(): void { this.#database.close(); }
}

export interface ProductionTargetServerOptions {
  readonly token: string;
  readonly databasePath: string;
  readonly targetId?: string;
  readonly allowTestControl?: boolean;
}

export function createProductionTargetServer(options: ProductionTargetServerOptions) {
  if (!options.token.trim()) throw new Error("production target token is required");
  const targetId = options.targetId ?? "production-single-host";
  const store = new ProductionTargetStore({ filePath: options.databasePath });
  const target = (): ExecutionTargetInfo => ({
    id: targetId,
    type: "remote",
    environment: "production",
    engineId: "acs-production-target",
    status: store.health() ? "ready" : "unavailable",
    health: {
      status: store.health() ? "ready" : "unavailable",
      observedAt: Date.now(),
      checks: [{ name: "durable-target-state", status: store.health() ? "pass" : "fail", message: store.health() ? "Target state is reachable." : "Target state is unavailable." }],
      findings: [],
    },
    capabilities: [
      "deployment.live",
      "deployment.health",
      "deployment.rollback",
      "runtime.remote",
      "state.durable",
      "telemetry.external",
      "secrets.references",
    ],
    deploymentModes: ["live"],
    schedulingEligible: store.health(),
    schedulingReasons: store.health() ? [] : ["durable target state is unavailable"],
    supportedRunners: ["opencode"],
    supportedProviders: ["axodus-managed"],
    isolationModes: ["tenant-scoped"],
    region: "local-certification",
    engineVersion: "1.0.0",
  });

  const server = createServer(async (request, response) => {
    try {
      if (!authorized(request, options.token)) return json(response, 401, { error: "unauthorized" });
      const url = new URL(request.url ?? "/", "http://localhost");
      const segments = url.pathname.split("/").filter(Boolean);

      if (request.method === "GET" && url.pathname === "/health") {
        return json(response, store.health() ? 200 : 503, { status: store.health() ? "ready" : "unavailable" });
      }
      if (request.method === "GET" && url.pathname === "/targets") return json(response, 200, [target()]);
      if (request.method === "GET" && segments[0] === "targets" && segments[1]) {
        return segments[1] === targetId ? json(response, 200, target()) : json(response, 404, { error: "target_not_found" });
      }
      if (request.method === "POST" && url.pathname === "/deployments") {
        const body = await readJson<DeployAgentRequest>(request);
        if (body.deploymentMode !== "live") return json(response, 409, { error: "production_target_requires_live_mode" });
        if (body.targetId !== targetId) return json(response, 409, { error: "production_target_mismatch" });
        assertNoSecretMaterial(body.composition);
        const now = Date.now();
        const deploymentId = body.deploymentId ?? `prod_${randomUUID()}`;
        const predecessor = store.latestActive(body.agentId, deploymentId);
        const record: StoredDeployment = {
          deploymentId,
          agentId: body.agentId,
          revision: body.revision,
          targetId,
          deploymentMode: body.deploymentMode,
          ...(body.executionPlanId ? { executionPlanId: body.executionPlanId } : {}),
          artifactReference: `agent:${body.agentId}:revision:${body.revision}`,
          status: "active",
          health: "ready",
          createdAt: now,
          updatedAt: now,
          ...(predecessor ? { predecessorDeploymentId: predecessor.deploymentId } : {}),
        };
        store.saveDeployment(record);
        return json(response, 201, deploymentResult(record));
      }
      if (segments[0] === "deployments" && segments[1] && request.method === "GET") {
        const record = store.getDeployment(segments[1]);
        return record ? json(response, 200, inspection(record)) : json(response, 404, { error: "deployment_not_found" });
      }
      if (segments[0] === "deployments" && segments[1] && segments[2] === "rollback" && request.method === "POST") {
        const body = await readJson<RollbackDeploymentRequest>(request);
        const current = store.getDeployment(segments[1]);
        const predecessor = store.getDeployment(body.predecessorDeploymentId);
        if (!current || !predecessor || current.agentId !== predecessor.agentId) {
          return json(response, 409, { error: "rollback_predecessor_invalid" });
        }
        const now = Date.now();
        store.saveDeployment({ ...current, status: "stopped", health: "ready", updatedAt: now });
        const restored = store.saveDeployment({ ...predecessor, status: "active", health: "ready", updatedAt: now });
        return json(response, 200, deploymentResult(restored));
      }
      if (options.allowTestControl && segments[0] === "test" && segments[1] === "deployments" && segments[2] && segments[3] === "health" && request.method === "POST") {
        const current = store.getDeployment(segments[2]);
        if (!current) return json(response, 404, { error: "deployment_not_found" });
        const body = await readJson<{ readonly health: StoredDeployment["health"]; readonly reasonCode?: string }>(request);
        const updated = store.saveDeployment({
          ...current,
          status: body.health === "ready" ? "active" : body.health === "degraded" ? "degraded" : "failed",
          health: body.health,
          updatedAt: Date.now(),
          ...(body.reasonCode ? { reasonCode: body.reasonCode } : {}),
        });
        return json(response, 200, inspection(updated));
      }
      if (request.method === "POST" && url.pathname === "/runtimes") {
        const body = await readJson<StartRuntimeRequest>(request);
        const deployment = store.getDeployment(body.deploymentId);
        if (!deployment || deployment.status !== "active" || deployment.health !== "ready") {
          return json(response, 409, { error: "deployment_not_active" });
        }
        const now = Date.now();
        const runtime: RuntimeInstanceResult = {
          runtimeInstanceId: `runtime_${randomUUID()}`,
          deploymentId: body.deploymentId,
          ...(body.agentId ? { agentId: body.agentId } : {}),
          status: "running",
          startedAt: now,
          timestamp: now,
        };
        store.saveRuntime(runtime);
        return json(response, 201, runtime);
      }
      if (segments[0] === "runtimes" && segments[1] && request.method === "GET") {
        const runtime = store.getRuntime(segments[1]);
        return runtime ? json(response, 200, runtime) : json(response, 404, { error: "runtime_not_found" });
      }
      if (segments[0] === "runtimes" && segments[1] && segments[2] === "stop" && request.method === "POST") {
        const runtime = store.getRuntime(segments[1]);
        if (!runtime) return json(response, 404, { error: "runtime_not_found" });
        const now = Date.now();
        const stopped = { ...runtime, status: "stopped", stoppedAt: now, timestamp: now };
        store.saveRuntime(stopped);
        return json(response, 200, stopped);
      }
      return json(response, 404, { error: "not_found" });
    } catch (error) {
      return json(response, 500, { error: error instanceof Error ? error.message : "target_error" });
    }
  });

  return {
    server,
    store,
    targetId,
    close: async () => {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
      store.close();
    },
  };
}

function authorized(request: IncomingMessage, token: string): boolean {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  const presented = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1024 * 1024) throw new Error("request_body_too_large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as T;
}

function assertNoSecretMaterial(value: unknown, path: readonly string[] = []): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach((entry, index) => assertNoSecretMaterial(entry, [...path, String(index)]));
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (["secret", "password", "token", "apiKey", "privateKey"].includes(key)) {
      throw new Error(`secret_material_forbidden:${[...path, key].join(".")}`);
    }
    assertNoSecretMaterial(nested, [...path, key]);
  }
}

function inspection(record: StoredDeployment): DeploymentInspectionResult {
  return {
    deploymentId: record.deploymentId,
    status: record.status,
    health: record.health,
    targetId: record.targetId,
    deployedRevision: record.revision,
    observedAt: record.updatedAt,
    ...(record.reasonCode ? { reasonCode: record.reasonCode } : {}),
  };
}

function deploymentResult(record: StoredDeployment): DeploymentResult {
  return {
    deploymentId: record.deploymentId,
    agentId: record.agentId,
    revision: record.revision,
    targetId: record.targetId,
    deploymentMode: record.deploymentMode,
    ...(record.executionPlanId ? { executionPlanId: record.executionPlanId } : {}),
    status: record.status,
    artifactPath: record.artifactReference,
    timestamp: record.updatedAt,
  };
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.setHeader("x-content-type-options", "nosniff");
  response.end(JSON.stringify(body));
}

async function main(): Promise<void> {
  const token = process.env.ACS_PRODUCTION_TARGET_TOKEN?.trim();
  if (!token) throw new Error("ACS_PRODUCTION_TARGET_TOKEN is required");
  const port = Number(process.env.ACS_PRODUCTION_TARGET_PORT ?? "0");
  const host = process.env.ACS_PRODUCTION_TARGET_HOST ?? "127.0.0.1";
  const target = createProductionTargetServer({
    token,
    databasePath: resolve(process.env.ACS_PRODUCTION_TARGET_DATABASE_PATH ?? "/tmp/acs-production-target.sqlite"),
    targetId: process.env.ACS_PRODUCTION_TARGET_ID,
    allowTestControl: process.env.ACS_PRODUCTION_TARGET_TEST_CONTROL === "true",
  });
  target.server.listen(port, host, () => {
    const address = target.server.address();
    process.stdout.write(JSON.stringify({
      success: true,
      service: "acs-production-target",
      processId: process.pid,
      targetId: target.targetId,
      address,
    }) + "\n");
  });
  const stop = async () => { await target.close(); process.exit(0); };
  process.once("SIGINT", () => { void stop(); });
  process.once("SIGTERM", () => { void stop(); });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  void main().catch((error) => {
    process.stderr.write(JSON.stringify({ success: false, service: "acs-production-target", error: error instanceof Error ? error.message : String(error) }) + "\n");
    process.exitCode = 1;
  });
}
