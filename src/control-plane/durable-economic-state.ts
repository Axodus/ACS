import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  EconomicIdempotencyConflictError,
  EconomicPersistenceError,
  NeuronsAmount,
  type EconomicAdapterDescriptor,
  type EconomicReceipt,
  type EconomicStateStore,
  type Settlement,
  type SettlementCommit,
  type SettlementProvider,
  type SettlementProviderRecord,
  type UsageQuote,
  type UsageRecord,
  type UsageReservation,
} from "./neurons-economic-contract.js";

type RecordKind = "quote" | "reservation" | "usage" | "settlement" | "receipt";

interface EconomicRow {
  readonly payload_json: string;
}

interface ProviderRow {
  readonly payload_json: string;
  readonly settled_at: number;
}

function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => typeof nested === "bigint" ? nested.toString() : nested);
}

function parseObject(payload: string): Record<string, unknown> {
  const value = JSON.parse(payload) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new EconomicPersistenceError("decode");
  return value as Record<string, unknown>;
}

function stringValue(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new EconomicPersistenceError("decode " + key);
  return value;
}

function numberValue(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new EconomicPersistenceError("decode " + key);
  return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new EconomicPersistenceError("decode " + key);
  return value;
}

function decodeQuote(payload: string): UsageQuote {
  const record = parseObject(payload);
  return {
    quoteId: stringValue(record, "quoteId"),
    accountId: stringValue(record, "accountId"),
    planId: stringValue(record, "planId"),
    policyId: stringValue(record, "policyId"),
    policyRevision: numberValue(record, "policyRevision"),
    mode: stringValue(record, "mode") as UsageQuote["mode"],
    estimatedByDimension: (record.estimatedByDimension ?? {}) as Readonly<Record<string, string>>,
    total: new NeuronsAmount(stringValue(record, "total")),
    expiresAt: numberValue(record, "expiresAt"),
    ...(optionalString(record, "tenantId") ? { tenantId: optionalString(record, "tenantId") } : {}),
    ...(optionalString(record, "workloadId") ? { workloadId: optionalString(record, "workloadId") } : {}),
  };
}

function decodeReservation(payload: string): UsageReservation {
  const record = parseObject(payload);
  return {
    reservationId: stringValue(record, "reservationId"),
    quoteId: stringValue(record, "quoteId"),
    accountId: stringValue(record, "accountId"),
    reserved: new NeuronsAmount(stringValue(record, "reserved")),
    remaining: new NeuronsAmount(stringValue(record, "remaining")),
    expiresAt: numberValue(record, "expiresAt"),
    status: stringValue(record, "status") as UsageReservation["status"],
    idempotencyKey: stringValue(record, "idempotencyKey"),
    ...(optionalString(record, "tenantId") ? { tenantId: optionalString(record, "tenantId") } : {}),
    ...(optionalString(record, "workloadId") ? { workloadId: optionalString(record, "workloadId") } : {}),
  };
}

function decodeUsage(payload: string): UsageRecord {
  const record = parseObject(payload);
  return {
    recordId: stringValue(record, "recordId"),
    runId: stringValue(record, "runId"),
    accountId: stringValue(record, "accountId"),
    dimension: stringValue(record, "dimension") as UsageRecord["dimension"],
    quantity: BigInt(stringValue(record, "quantity")),
    unit: stringValue(record, "unit"),
    source: stringValue(record, "source"),
    observedAt: numberValue(record, "observedAt"),
    ...(optionalString(record, "tenantId") ? { tenantId: optionalString(record, "tenantId") } : {}),
    ...(optionalString(record, "workloadId") ? { workloadId: optionalString(record, "workloadId") } : {}),
    ...(record.metadata && typeof record.metadata === "object" ? { metadata: record.metadata as Readonly<Record<string, unknown>> } : {}),
  };
}

function decodeSettlement(payload: string): Settlement {
  const record = parseObject(payload);
  return {
    settlementId: stringValue(record, "settlementId"),
    reservationId: stringValue(record, "reservationId"),
    runId: stringValue(record, "runId"),
    totalCharged: new NeuronsAmount(stringValue(record, "totalCharged")),
    status: stringValue(record, "status") as Settlement["status"],
    idempotencyKey: stringValue(record, "idempotencyKey"),
    ...(optionalString(record, "tenantId") ? { tenantId: optionalString(record, "tenantId") } : {}),
    ...(optionalString(record, "workloadId") ? { workloadId: optionalString(record, "workloadId") } : {}),
  };
}

function decodeReceipt(payload: string): EconomicReceipt {
  const record = parseObject(payload);
  return {
    receiptId: stringValue(record, "receiptId"),
    runId: stringValue(record, "runId"),
    quoteId: stringValue(record, "quoteId"),
    reservationId: stringValue(record, "reservationId"),
    ...(optionalString(record, "settlementId") ? { settlementId: optionalString(record, "settlementId") } : {}),
    totalQuoted: new NeuronsAmount(stringValue(record, "totalQuoted")),
    totalCharged: new NeuronsAmount(stringValue(record, "totalCharged")),
    totalReleased: new NeuronsAmount(stringValue(record, "totalReleased")),
    mode: stringValue(record, "mode") as EconomicReceipt["mode"],
    status: stringValue(record, "status") as EconomicReceipt["status"],
    ...(optionalString(record, "tenantId") ? { tenantId: optionalString(record, "tenantId") } : {}),
    ...(optionalString(record, "workloadId") ? { workloadId: optionalString(record, "workloadId") } : {}),
  };
}

function idFor(kind: RecordKind, value: UsageQuote | UsageReservation | UsageRecord | Settlement | EconomicReceipt): string {
  if (kind === "quote") return (value as UsageQuote).quoteId;
  if (kind === "reservation") return (value as UsageReservation).reservationId;
  if (kind === "usage") return (value as UsageRecord).recordId;
  if (kind === "settlement") return (value as Settlement).settlementId;
  return (value as EconomicReceipt).receiptId;
}

export class SqliteEconomicStateStore implements EconomicStateStore {
  readonly descriptor: EconomicAdapterDescriptor = {
    adapter: "sqlite-economic-state",
    productionOriented: true,
    durability: "single_node_durable",
    multiInstance: "not_proven",
  };
  readonly #database: DatabaseSync;

  constructor(options: { readonly filePath: string }) {
    mkdirSync(dirname(options.filePath), { recursive: true, mode: 0o700 });
    this.#database = new DatabaseSync(options.filePath);
    this.#database.exec("PRAGMA journal_mode = WAL");
    this.#database.exec("PRAGMA foreign_keys = ON");
    this.#database.exec("PRAGMA busy_timeout = 5000");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS economic_records (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT '',
        idempotency_key TEXT,
        run_id TEXT,
        payload_json TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS economic_records_idempotency_idx
        ON economic_records (kind, tenant_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL;
      CREATE INDEX IF NOT EXISTS economic_records_run_idx
        ON economic_records (kind, tenant_id, run_id);
    `);
  }

  getQuote(quoteId: string): UsageQuote | undefined { return this.#get("quote", quoteId, decodeQuote); }
  listQuotes(): readonly UsageQuote[] { return this.#list("quote", decodeQuote); }
  saveQuote(quote: UsageQuote): UsageQuote { this.#save("quote", quote); return quote; }
  getReservation(reservationId: string): UsageReservation | undefined { return this.#get("reservation", reservationId, decodeReservation); }
  listReservations(): readonly UsageReservation[] { return this.#list("reservation", decodeReservation); }
  findReservationByIdempotency(idempotencyKey: string, quoteId?: string, tenantId?: string): UsageReservation | undefined {
    return this.listReservations().find((record) => record.idempotencyKey === idempotencyKey
      && (!quoteId || record.quoteId === quoteId)
      && (tenantId === undefined || record.tenantId === tenantId));
  }
  saveReservation(reservation: UsageReservation): UsageReservation { this.#save("reservation", reservation); return reservation; }
  listUsage(runId?: string): readonly UsageRecord[] {
    return this.#list("usage", decodeUsage).filter((record) => !runId || record.runId === runId);
  }
  saveUsage(record: UsageRecord): UsageRecord { this.#save("usage", record); return record; }
  getSettlement(settlementId: string): Settlement | undefined { return this.#get("settlement", settlementId, decodeSettlement); }
  listSettlements(): readonly Settlement[] { return this.#list("settlement", decodeSettlement); }
  findSettlementByIdempotency(idempotencyKey: string, runId?: string, tenantId?: string): Settlement | undefined {
    return this.listSettlements().find((record) => record.idempotencyKey === idempotencyKey
      && (!runId || record.runId === runId)
      && (tenantId === undefined || record.tenantId === tenantId));
  }
  getReceipt(runId: string): EconomicReceipt | undefined {
    return this.#list("receipt", decodeReceipt).find((receipt) => receipt.runId === runId);
  }
  listReceipts(): readonly EconomicReceipt[] { return this.#list("receipt", decodeReceipt); }

  commitSettlement(commit: SettlementCommit): void {
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#save("settlement", commit.settlement);
      this.#save("reservation", commit.reservation);
      this.#save("receipt", commit.receipt);
      this.#database.exec("COMMIT");
    } catch {
      try { this.#database.exec("ROLLBACK"); } catch { /* no active transaction */ }
      throw new EconomicPersistenceError("settlement commit");
    }
  }

  close(): void { this.#database.close(); }

  #get<T>(kind: RecordKind, id: string, decoder: (payload: string) => T): T | undefined {
    try {
      const row = this.#database.prepare(
        "SELECT payload_json FROM economic_records WHERE kind = ? AND id = ?",
      ).get(kind, id) as unknown as EconomicRow | undefined;
      return row ? decoder(row.payload_json) : undefined;
    } catch (error) {
      if (error instanceof EconomicPersistenceError) throw error;
      throw new EconomicPersistenceError("read " + kind);
    }
  }

  #list<T>(kind: RecordKind, decoder: (payload: string) => T): readonly T[] {
    try {
      const rows = this.#database.prepare(
        "SELECT payload_json FROM economic_records WHERE kind = ? ORDER BY id",
      ).all(kind) as unknown as EconomicRow[];
      return rows.map((row) => decoder(row.payload_json));
    } catch (error) {
      if (error instanceof EconomicPersistenceError) throw error;
      throw new EconomicPersistenceError("list " + kind);
    }
  }

  #save(kind: RecordKind, value: UsageQuote | UsageReservation | UsageRecord | Settlement | EconomicReceipt): void {
    const tenantId = value.tenantId ?? "";
    const idempotencyKey = kind === "reservation" || kind === "settlement"
      ? (value as UsageReservation | Settlement).idempotencyKey
      : null;
    const runId = kind === "usage" || kind === "settlement" || kind === "receipt"
      ? (value as UsageRecord | Settlement | EconomicReceipt).runId
      : null;
    try {
      this.#database.prepare(`
        INSERT INTO economic_records (kind, id, tenant_id, idempotency_key, run_id, payload_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(kind, id) DO UPDATE SET
          tenant_id = excluded.tenant_id,
          idempotency_key = excluded.idempotency_key,
          run_id = excluded.run_id,
          payload_json = excluded.payload_json
      `).run(kind, idFor(kind, value), tenantId, idempotencyKey, runId, serialize(value));
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed")) throw new EconomicIdempotencyConflictError();
      throw new EconomicPersistenceError("write " + kind);
    }
  }
}

export class SqliteSettlementProvider implements SettlementProvider {
  readonly descriptor: EconomicAdapterDescriptor = {
    adapter: "sqlite-settlement-provider",
    productionOriented: true,
    durability: "single_node_durable",
    multiInstance: "not_proven",
  };
  readonly #database: DatabaseSync;

  constructor(options: { readonly filePath: string }) {
    mkdirSync(dirname(options.filePath), { recursive: true, mode: 0o700 });
    this.#database = new DatabaseSync(options.filePath);
    this.#database.exec("PRAGMA journal_mode = WAL");
    this.#database.exec("PRAGMA busy_timeout = 5000");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS provider_settlements (
        settlement_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT '',
        run_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        settled_at INTEGER NOT NULL,
        UNIQUE (tenant_id, idempotency_key)
      );
    `);
  }

  async settle(settlement: Settlement): Promise<SettlementProviderRecord> {
    const existing = await this.lookupSettlement({
      idempotencyKey: settlement.idempotencyKey,
      tenantId: settlement.tenantId,
    });
    if (existing) {
      if (existing.settlement.runId !== settlement.runId || existing.settlement.reservationId !== settlement.reservationId) {
        throw new EconomicIdempotencyConflictError();
      }
      return existing;
    }
    const settledAt = Date.now();
    try {
      this.#database.prepare(`
        INSERT INTO provider_settlements (
          settlement_id, tenant_id, run_id, idempotency_key, payload_json, settled_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        settlement.settlementId,
        settlement.tenantId ?? "",
        settlement.runId,
        settlement.idempotencyKey,
        serialize(settlement),
        settledAt,
      );
      return { settlement, settledAt };
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed")) throw new EconomicIdempotencyConflictError();
      throw new EconomicPersistenceError("provider settlement");
    }
  }

  async lookupSettlement(input: { readonly idempotencyKey: string; readonly runId?: string; readonly tenantId?: string }): Promise<SettlementProviderRecord | undefined> {
    try {
      const tenantClause = input.tenantId === undefined ? "" : "AND tenant_id = ?";
      const runClause = input.runId ? "AND run_id = ?" : "";
      const row = this.#database.prepare(
        `SELECT payload_json, settled_at FROM provider_settlements
         WHERE idempotency_key = ? ${tenantClause} ${runClause}
         ORDER BY settled_at LIMIT 1`,
      );
      const values = [
        input.idempotencyKey,
        ...(input.tenantId === undefined ? [] : [input.tenantId]),
        ...(input.runId ? [input.runId] : []),
      ];
      const found = row.get(...values) as unknown as ProviderRow | undefined;
      return found ? { settlement: decodeSettlement(found.payload_json), settledAt: found.settled_at } : undefined;
    } catch (error) {
      if (error instanceof EconomicPersistenceError) throw error;
      throw new EconomicPersistenceError("provider lookup");
    }
  }

  async listSettlements(): Promise<readonly SettlementProviderRecord[]> {
    try {
      const rows = this.#database.prepare(
        "SELECT payload_json, settled_at FROM provider_settlements ORDER BY settled_at, settlement_id",
      ).all() as unknown as ProviderRow[];
      return rows.map((row) => ({ settlement: decodeSettlement(row.payload_json), settledAt: row.settled_at }));
    } catch (error) {
      if (error instanceof EconomicPersistenceError) throw error;
      throw new EconomicPersistenceError("provider list");
    }
  }

  close(): void { this.#database.close(); }
}
