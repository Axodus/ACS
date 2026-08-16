import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  DeploymentRevisionConflictError,
  type DeploymentRecord,
  type DeploymentRepository,
  type DeploymentRepositoryDescriptor,
} from "./deployment-service.js";

interface DeploymentRow { readonly payload_json: string; }

export class DeploymentStatePersistenceError extends Error {
  constructor(operation: string) {
    super(`durable deployment state persistence failed: ${operation}`);
    this.name = "DeploymentStatePersistenceError";
  }
}

function decode(payload: string): DeploymentRecord {
  try {
    const value = JSON.parse(payload) as Partial<DeploymentRecord>;
    if (!value || typeof value !== "object"
      || typeof value.deploymentId !== "string"
      || typeof value.agentId !== "string"
      || !Number.isSafeInteger(value.revision)
      || !Number.isSafeInteger(value.recordRevision)
      || typeof value.targetId !== "string"
      || typeof value.deploymentMode !== "string"
      || typeof value.status !== "string"
      || typeof value.createdAt !== "number"
      || typeof value.updatedAt !== "number") {
      throw new Error("invalid deployment state");
    }
    return value as DeploymentRecord;
  } catch {
    throw new DeploymentStatePersistenceError("decode deployment");
  }
}

export class SqliteDeploymentRepository implements DeploymentRepository {
  readonly descriptor: DeploymentRepositoryDescriptor = {
    adapter: "sqlite-deployment-state",
    productionOriented: true,
    durability: "single_node_durable",
    multiInstance: "shared_database",
    multiHost: "not_proven",
  };
  readonly #database: DatabaseSync;

  constructor(options: { readonly filePath: string }) {
    mkdirSync(dirname(options.filePath), { recursive: true, mode: 0o700 });
    this.#database = new DatabaseSync(options.filePath);
    this.#database.exec("PRAGMA journal_mode = WAL");
    this.#database.exec("PRAGMA busy_timeout = 5000");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS deployments (
        deployment_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT '',
        agent_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        deployment_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        record_revision INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS deployments_agent_target_idx
        ON deployments (tenant_id, agent_id, target_id, updated_at);
    `);
  }

  create(record: DeploymentRecord): DeploymentRecord {
    try {
      this.#database.prepare(`
        INSERT INTO deployments (
          deployment_id, tenant_id, agent_id, target_id, deployment_mode,
          status, record_revision, payload_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.deploymentId,
        record.scope?.tenantId ?? "",
        record.agentId,
        record.targetId,
        record.deploymentMode,
        record.status,
        record.recordRevision,
        JSON.stringify(record),
        record.createdAt,
        record.updatedAt,
      );
      return record;
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed")) throw new DeploymentRevisionConflictError("deployment already exists");
      throw new DeploymentStatePersistenceError("create deployment");
    }
  }

  get(deploymentId: string): DeploymentRecord | undefined {
    try {
      const row = this.#database.prepare(
        "SELECT payload_json FROM deployments WHERE deployment_id = ?",
      ).get(deploymentId) as unknown as DeploymentRow | undefined;
      return row ? decode(row.payload_json) : undefined;
    } catch (error) {
      if (error instanceof DeploymentStatePersistenceError) throw error;
      throw new DeploymentStatePersistenceError("read deployment");
    }
  }

  list(): readonly DeploymentRecord[] {
    try {
      const rows = this.#database.prepare(
        "SELECT payload_json FROM deployments ORDER BY created_at, deployment_id",
      ).all() as unknown as DeploymentRow[];
      return rows.map((row) => decode(row.payload_json));
    } catch (error) {
      if (error instanceof DeploymentStatePersistenceError) throw error;
      throw new DeploymentStatePersistenceError("list deployments");
    }
  }

  save(record: DeploymentRecord, expectedRecordRevision: number): DeploymentRecord {
    try {
      const changed = this.#database.prepare(`
        UPDATE deployments SET
          tenant_id = ?, agent_id = ?, target_id = ?, deployment_mode = ?,
          status = ?, record_revision = ?, payload_json = ?, updated_at = ?
        WHERE deployment_id = ? AND record_revision = ?
      `).run(
        record.scope?.tenantId ?? "",
        record.agentId,
        record.targetId,
        record.deploymentMode,
        record.status,
        record.recordRevision,
        JSON.stringify(record),
        record.updatedAt,
        record.deploymentId,
        expectedRecordRevision,
      );
      if (Number(changed.changes) !== 1) throw new DeploymentRevisionConflictError();
      return record;
    } catch (error) {
      if (error instanceof DeploymentRevisionConflictError) throw error;
      throw new DeploymentStatePersistenceError("save deployment");
    }
  }

  health(): { readonly configured: true; readonly reachable: boolean; readonly productionOriented: true; readonly adapter: string } {
    try {
      this.#database.prepare("SELECT 1 AS ok").get();
      return { configured: true, reachable: true, productionOriented: true, adapter: this.descriptor.adapter };
    } catch {
      return { configured: true, reachable: false, productionOriented: true, adapter: this.descriptor.adapter };
    }
  }

  close(): void { this.#database.close(); }
}
