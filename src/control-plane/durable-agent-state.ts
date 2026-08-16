import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DuplicateRegistrationError, NotFoundError } from "../errors.js";
import {
  AgentRevisionConflictError,
  type AgentRepository,
} from "./agent-service.js";
import type { AgentRevision } from "./unified-agent-model.js";

interface AgentRow { readonly payload_json: string; }

export interface AgentRepositoryDescriptor {
  readonly adapter: string;
  readonly productionOriented: boolean;
  readonly durability: "single_node_durable";
  readonly multiInstance: "shared_database";
  readonly multiHost: "not_proven";
}

export class AgentStatePersistenceError extends Error {
  constructor(operation: string) {
    super(`durable agent state persistence failed: ${operation}`);
    this.name = "AgentStatePersistenceError";
  }
}

function decodeAgentRevision(payload: string): AgentRevision {
  try {
    const value = JSON.parse(payload) as Partial<AgentRevision>;
    if (!value || typeof value !== "object"
      || typeof value.agentId !== "string"
      || !Number.isSafeInteger(value.revision)
      || typeof value.fingerprint !== "string"
      || !value.definition
      || typeof value.createdAt !== "number"
      || typeof value.updatedAt !== "number") {
      throw new Error("invalid agent revision");
    }
    return value as AgentRevision;
  } catch {
    throw new AgentStatePersistenceError("decode agent revision");
  }
}

export class SqliteAgentRepository implements AgentRepository {
  readonly descriptor: AgentRepositoryDescriptor = {
    adapter: "sqlite-agent-state",
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
      CREATE TABLE IF NOT EXISTS agent_revisions (
        agent_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (agent_id, revision)
      );
      CREATE TABLE IF NOT EXISTS agents_current (
        agent_id TEXT PRIMARY KEY,
        revision INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  create(revision: AgentRevision): AgentRevision {
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const existing = this.#database.prepare(
        "SELECT agent_id FROM agents_current WHERE agent_id = ?",
      ).get(revision.agentId);
      if (existing) throw new DuplicateRegistrationError("agent-definition", revision.agentId);
      this.#insertRevision(revision);
      this.#database.prepare(`
        INSERT INTO agents_current (agent_id, revision, payload_json, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(revision.agentId, revision.revision, JSON.stringify(revision), revision.updatedAt);
      this.#database.exec("COMMIT");
      return revision;
    } catch (error) {
      try { this.#database.exec("ROLLBACK"); } catch { /* no active transaction */ }
      if (error instanceof DuplicateRegistrationError) throw error;
      throw new AgentStatePersistenceError("create agent");
    }
  }

  get(agentId: string): AgentRevision {
    try {
      const row = this.#database.prepare(
        "SELECT payload_json FROM agents_current WHERE agent_id = ?",
      ).get(agentId) as unknown as AgentRow | undefined;
      if (!row) throw new NotFoundError("agent-definition", agentId);
      return decodeAgentRevision(row.payload_json);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AgentStatePersistenceError) throw error;
      throw new AgentStatePersistenceError("read agent");
    }
  }

  list(): readonly AgentRevision[] {
    try {
      const rows = this.#database.prepare(
        "SELECT payload_json FROM agents_current ORDER BY agent_id",
      ).all() as unknown as AgentRow[];
      return rows.map((row) => decodeAgentRevision(row.payload_json));
    } catch (error) {
      if (error instanceof AgentStatePersistenceError) throw error;
      throw new AgentStatePersistenceError("list agents");
    }
  }

  save(revision: AgentRevision, expectedRevision: number): AgentRevision {
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const current = this.#database.prepare(
        "SELECT revision FROM agents_current WHERE agent_id = ?",
      ).get(revision.agentId) as { readonly revision: number } | undefined;
      if (!current) throw new NotFoundError("agent-definition", revision.agentId);
      if (current.revision !== expectedRevision) {
        throw new AgentRevisionConflictError(
          `revision conflict: expected revision ${expectedRevision} but found ${current.revision}`,
        );
      }
      this.#insertRevision(revision);
      const changed = this.#database.prepare(`
        UPDATE agents_current
        SET revision = ?, payload_json = ?, updated_at = ?
        WHERE agent_id = ? AND revision = ?
      `).run(revision.revision, JSON.stringify(revision), revision.updatedAt, revision.agentId, expectedRevision);
      if (Number(changed.changes) !== 1) throw new AgentRevisionConflictError();
      this.#database.exec("COMMIT");
      return revision;
    } catch (error) {
      try { this.#database.exec("ROLLBACK"); } catch { /* no active transaction */ }
      if (error instanceof NotFoundError || error instanceof AgentRevisionConflictError) throw error;
      throw new AgentStatePersistenceError("save agent");
    }
  }

  history(agentId: string): readonly AgentRevision[] {
    try {
      const rows = this.#database.prepare(
        "SELECT payload_json FROM agent_revisions WHERE agent_id = ? ORDER BY revision",
      ).all(agentId) as unknown as AgentRow[];
      return rows.map((row) => decodeAgentRevision(row.payload_json));
    } catch (error) {
      if (error instanceof AgentStatePersistenceError) throw error;
      throw new AgentStatePersistenceError("read agent history");
    }
  }

  remove(agentId: string): AgentRevision {
    const current = this.get(agentId);
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare("DELETE FROM agents_current WHERE agent_id = ?").run(agentId);
      this.#database.prepare("DELETE FROM agent_revisions WHERE agent_id = ?").run(agentId);
      this.#database.exec("COMMIT");
      return current;
    } catch {
      try { this.#database.exec("ROLLBACK"); } catch { /* no active transaction */ }
      throw new AgentStatePersistenceError("remove agent");
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

  #insertRevision(revision: AgentRevision): void {
    this.#database.prepare(`
      INSERT INTO agent_revisions (agent_id, revision, payload_json, created_at)
      VALUES (?, ?, ?, ?)
    `).run(revision.agentId, revision.revision, JSON.stringify(revision), revision.updatedAt);
  }
}
