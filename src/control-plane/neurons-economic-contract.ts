import { AcsError } from "../errors.js";
import type { AuditService } from "./audit-service.js";

export type BillingResponsibilityMode = "axodus-managed" | "byok" | "byos";
export type EconomicRecordStatus = "quoted" | "reserved" | "authorized" | "metered" | "settled" | "released" | "failed";
export type EconomicAuthorizationDecisionEffect = "allowed" | "denied";
export type EconomicAuthorizationDecisionCode =
  | "ALLOWED"
  | "DENIED_BY_GOVERNANCE"
  | "DENIED_BY_ENTITLEMENT"
  | "DENIED_BY_LIMIT"
  | "INVALID_ECONOMIC_REQUEST"
  | "PRICE_REFERENCE_UNAVAILABLE"
  | "DEPENDENCY_UNAVAILABLE"
  | "DUPLICATE_REQUEST";

export type UsageDimension =
  | "llm.inference"
  | "agent.runtime"
  | "compute"
  | "memory"
  | "storage"
  | "tools"
  | "network"
  | "premium.capability"
  | "scheduled.execution"
  | "autonomous.duration";

export class NeuronsAmount {
  readonly units: bigint;

  constructor(units: bigint | number | string) {
    this.units = BigInt(units);
  }

  add(other: NeuronsAmount): NeuronsAmount {
    return new NeuronsAmount(this.units + other.units);
  }

  subtract(other: NeuronsAmount): NeuronsAmount {
    return new NeuronsAmount(this.units - other.units);
  }

  isNegative(): boolean {
    return this.units < 0n;
  }

  equals(other: NeuronsAmount): boolean {
    return this.units === other.units;
  }

  toJSON(): string {
    return this.units.toString();
  }
}

export interface EconomicAccount {
  readonly accountId: string;
  readonly ownerId: string;
  readonly mode: BillingResponsibilityMode;
  readonly assetCode: "NEURONS";
  readonly tenantId?: string;
  readonly workloadId?: string;
}

export interface BillingPolicy {
  readonly policyId: string;
  readonly revision: number;
  readonly pricing: Readonly<Record<UsageDimension, bigint>>;
}

export interface UsageQuote {
  readonly quoteId: string;
  readonly accountId: string;
  readonly planId: string;
  readonly policyId: string;
  readonly policyRevision: number;
  readonly mode: BillingResponsibilityMode;
  readonly estimatedByDimension: Readonly<Record<string, string>>;
  readonly total: NeuronsAmount;
  readonly expiresAt: number;
  readonly tenantId?: string;
  readonly workloadId?: string;
}

export interface UsageReservation {
  readonly reservationId: string;
  readonly quoteId: string;
  readonly accountId: string;
  readonly reserved: NeuronsAmount;
  readonly remaining: NeuronsAmount;
  readonly expiresAt: number;
  readonly status: "reserved" | "released" | "settled";
  readonly idempotencyKey: string;
  readonly authorizationDecisionId?: string;
  readonly operationId?: string;
  readonly decisionCode?: EconomicAuthorizationDecisionCode;
  readonly decisionReason?: string;
  readonly releasedAt?: number;
  readonly updatedAt?: number;
  readonly executionRunId?: string;
  readonly tenantId?: string;
  readonly workloadId?: string;
}

export interface EconomicAuthorizationDecision {
  readonly decisionId: string;
  readonly tenantId?: string;
  readonly actor?: string;
  readonly economicOperationId: string;
  readonly authorizationEffect: EconomicAuthorizationDecisionEffect;
  readonly decisionCode: EconomicAuthorizationDecisionCode;
  readonly reasons: readonly string[];
  readonly governanceReferences: readonly string[];
  readonly entitlementReferences: readonly string[];
  readonly limitReferences: readonly string[];
  readonly requestedAmount?: string;
  readonly effectiveAmount?: string;
  readonly unit?: string;
  readonly quoteId?: string;
  readonly reservationId?: string;
  readonly executionRunId?: string;
  readonly workloadId?: string;
  readonly idempotencyKey: string;
  readonly auditCorrelation: string;
  readonly createdAt: number;
  readonly evaluatedAt: number;
  readonly status: EconomicRecordStatus;
}

export interface UsageRecord {
  readonly recordId: string;
  readonly runId: string;
  readonly accountId: string;
  readonly dimension: UsageDimension;
  readonly quantity: bigint;
  readonly unit: string;
  readonly source: string;
  readonly observedAt: number;
  readonly tenantId?: string;
  readonly workloadId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface Settlement {
  readonly settlementId: string;
  readonly reservationId: string;
  readonly runId: string;
  readonly totalCharged: NeuronsAmount;
  readonly status: "pending" | "settled" | "partially_settled" | "failed" | "released";
  readonly idempotencyKey: string;
  readonly tenantId?: string;
  readonly workloadId?: string;
}

export interface EconomicReceipt {
  readonly receiptId: string;
  readonly runId: string;
  readonly quoteId: string;
  readonly reservationId: string;
  readonly settlementId?: string;
  readonly totalQuoted: NeuronsAmount;
  readonly totalCharged: NeuronsAmount;
  readonly totalReleased: NeuronsAmount;
  readonly mode: BillingResponsibilityMode;
  readonly status: EconomicRecordStatus;
  readonly tenantId?: string;
  readonly workloadId?: string;
}

export type EconomicMultiInstanceClassification = "not_applicable" | "not_proven" | "capable";

export interface EconomicAdapterDescriptor {
  readonly adapter: string;
  readonly productionOriented: boolean;
  readonly durability: "process_local" | "single_node_durable" | "external_managed";
  readonly multiInstance: EconomicMultiInstanceClassification;
}

export interface SettlementProviderRecord {
  readonly settlement: Settlement;
  readonly settledAt: number;
}

export interface SettlementCommit {
  readonly settlement: Settlement;
  readonly reservation: UsageReservation;
  readonly receipt: EconomicReceipt;
}

export interface EconomicStateStore {
  readonly descriptor: EconomicAdapterDescriptor;
  getQuote(quoteId: string): UsageQuote | undefined;
  listQuotes(): readonly UsageQuote[];
  saveQuote(quote: UsageQuote): UsageQuote;
  getAuthorization(decisionId: string): EconomicAuthorizationDecision | undefined;
  listAuthorizations(): readonly EconomicAuthorizationDecision[];
  findAuthorizationByIdempotency(idempotencyKey: string, tenantId?: string): EconomicAuthorizationDecision | undefined;
  saveAuthorization(decision: EconomicAuthorizationDecision): EconomicAuthorizationDecision;
  getReservation(reservationId: string): UsageReservation | undefined;
  listReservations(): readonly UsageReservation[];
  findReservationByIdempotency(idempotencyKey: string, quoteId?: string, tenantId?: string): UsageReservation | undefined;
  saveReservation(reservation: UsageReservation): UsageReservation;
  listUsage(runId?: string): readonly UsageRecord[];
  saveUsage(record: UsageRecord): UsageRecord;
  getSettlement(settlementId: string): Settlement | undefined;
  listSettlements(): readonly Settlement[];
  findSettlementByIdempotency(idempotencyKey: string, runId?: string, tenantId?: string): Settlement | undefined;
  getReceipt(runId: string): EconomicReceipt | undefined;
  listReceipts(): readonly EconomicReceipt[];
  commitSettlement(commit: SettlementCommit): void;
}

export interface SettlementProvider {
  readonly descriptor: EconomicAdapterDescriptor;
  settle(settlement: Settlement): Promise<SettlementProviderRecord>;
  lookupSettlement(input: { readonly idempotencyKey: string; readonly runId?: string; readonly tenantId?: string }): Promise<SettlementProviderRecord | undefined>;
  listSettlements(): Promise<readonly SettlementProviderRecord[]>;
}

export class EconomicPersistenceError extends AcsError {
  constructor(operation: string) {
    super("economic persistence failed for " + operation, "ACS_ECONOMIC_PERSISTENCE_FAILED");
  }
}

export class EconomicAdapterConfigurationError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_ECONOMIC_ADAPTER_CONFIGURATION_INVALID");
  }
}

export class SettlementProviderUnavailableError extends AcsError {
  constructor(operation: string) {
    super("settlement provider is unavailable for " + operation, "ACS_SETTLEMENT_PROVIDER_UNAVAILABLE");
  }
}

export class EconomicTenantMismatchError extends AcsError {
  constructor() {
    super("economic record is not available for this tenant", "ACS_ECONOMIC_TENANT_MISMATCH");
  }
}

export class EconomicIdempotencyConflictError extends AcsError {
  constructor() {
    super("economic idempotency key was already used for another operation", "ACS_ECONOMIC_IDEMPOTENCY_CONFLICT");
  }
}

export class InMemoryEconomicStateStore implements EconomicStateStore {
  readonly descriptor: EconomicAdapterDescriptor = {
    adapter: "memory-economic-state",
    productionOriented: false,
    durability: "process_local",
    multiInstance: "not_applicable",
  };
  readonly #quotes = new Map<string, UsageQuote>();
  readonly #authorizations = new Map<string, EconomicAuthorizationDecision>();
  readonly #reservations = new Map<string, UsageReservation>();
  readonly #usage = new Map<string, UsageRecord>();
  readonly #settlements = new Map<string, Settlement>();
  readonly #receipts = new Map<string, EconomicReceipt>();

  getQuote(quoteId: string): UsageQuote | undefined { return this.#quotes.get(quoteId); }
  listQuotes(): readonly UsageQuote[] { return [...this.#quotes.values()]; }
  saveQuote(quote: UsageQuote): UsageQuote { this.#quotes.set(quote.quoteId, quote); return quote; }
  getAuthorization(decisionId: string): EconomicAuthorizationDecision | undefined { return this.#authorizations.get(decisionId); }
  listAuthorizations(): readonly EconomicAuthorizationDecision[] { return [...this.#authorizations.values()]; }
  findAuthorizationByIdempotency(idempotencyKey: string, tenantId?: string): EconomicAuthorizationDecision | undefined {
    return this.listAuthorizations().find((item) => item.idempotencyKey === idempotencyKey && (tenantId === undefined || item.tenantId === tenantId));
  }
  saveAuthorization(decision: EconomicAuthorizationDecision): EconomicAuthorizationDecision { this.#authorizations.set(decision.decisionId, decision); return decision; }
  getReservation(reservationId: string): UsageReservation | undefined { return this.#reservations.get(reservationId); }
  listReservations(): readonly UsageReservation[] { return [...this.#reservations.values()]; }
  findReservationByIdempotency(idempotencyKey: string, quoteId?: string, tenantId?: string): UsageReservation | undefined {
    return this.listReservations().find((item) => item.idempotencyKey === idempotencyKey
      && (!quoteId || item.quoteId === quoteId)
      && (tenantId === undefined || item.tenantId === tenantId));
  }
  saveReservation(reservation: UsageReservation): UsageReservation { this.#reservations.set(reservation.reservationId, reservation); return reservation; }
  listUsage(runId?: string): readonly UsageRecord[] {
    return [...this.#usage.values()].filter((item) => !runId || item.runId === runId);
  }
  saveUsage(record: UsageRecord): UsageRecord { this.#usage.set(record.recordId, record); return record; }
  getSettlement(settlementId: string): Settlement | undefined { return this.#settlements.get(settlementId); }
  listSettlements(): readonly Settlement[] { return [...this.#settlements.values()]; }
  findSettlementByIdempotency(idempotencyKey: string, runId?: string, tenantId?: string): Settlement | undefined {
    return this.listSettlements().find((item) => item.idempotencyKey === idempotencyKey
      && (!runId || item.runId === runId)
      && (tenantId === undefined || item.tenantId === tenantId));
  }
  getReceipt(runId: string): EconomicReceipt | undefined { return this.#receipts.get(runId); }
  listReceipts(): readonly EconomicReceipt[] { return [...this.#receipts.values()]; }
  commitSettlement(commit: SettlementCommit): void {
    this.#settlements.set(commit.settlement.settlementId, commit.settlement);
    this.#reservations.set(commit.reservation.reservationId, commit.reservation);
    this.#receipts.set(commit.receipt.runId, commit.receipt);
  }
}

export class InMemorySettlementProvider implements SettlementProvider {
  readonly descriptor: EconomicAdapterDescriptor = {
    adapter: "memory-settlement-provider",
    productionOriented: false,
    durability: "process_local",
    multiInstance: "not_applicable",
  };
  readonly #settlements = new Map<string, SettlementProviderRecord>();

  async settle(settlement: Settlement): Promise<SettlementProviderRecord> {
    const existing = await this.lookupSettlement({
      idempotencyKey: settlement.idempotencyKey,
      runId: settlement.runId,
      tenantId: settlement.tenantId,
    });
    if (existing) return existing;
    const conflicting = await this.lookupSettlement({
      idempotencyKey: settlement.idempotencyKey,
      tenantId: settlement.tenantId,
    });
    if (conflicting) throw new EconomicIdempotencyConflictError();
    const record = { settlement, settledAt: Date.now() };
    this.#settlements.set(settlement.settlementId, record);
    return record;
  }

  async lookupSettlement(input: { readonly idempotencyKey: string; readonly runId?: string; readonly tenantId?: string }): Promise<SettlementProviderRecord | undefined> {
    return [...this.#settlements.values()].find((record) =>
      record.settlement.idempotencyKey === input.idempotencyKey
      && (!input.runId || record.settlement.runId === input.runId)
      && (input.tenantId === undefined || record.settlement.tenantId === input.tenantId));
  }

  async listSettlements(): Promise<readonly SettlementProviderRecord[]> {
    return [...this.#settlements.values()];
  }
}

function sameTenant(left?: string, right?: string): boolean {
  return !left || left === right;
}

export class EconomicService {
  readonly #policy: BillingPolicy;
  readonly #settlementProvider: SettlementProvider;
  readonly #store: EconomicStateStore;
  readonly #tenantId: string | undefined;
  readonly #auditService: AuditService | undefined;

  constructor(input: {
    policy: BillingPolicy;
    settlementProvider?: SettlementProvider;
    store?: EconomicStateStore;
    tenantId?: string;
    auditService?: AuditService;
  }) {
    this.#policy = input.policy;
    this.#settlementProvider = input.settlementProvider ?? new InMemorySettlementProvider();
    this.#store = input.store ?? new InMemoryEconomicStateStore();
    this.#tenantId = input.tenantId;
    this.#auditService = input.auditService;
  }

  get stateStoreDescriptor(): EconomicAdapterDescriptor { return this.#store.descriptor; }
  get settlementProviderDescriptor(): EconomicAdapterDescriptor { return this.#settlementProvider.descriptor; }

  getAuthorization(decisionId: string): EconomicAuthorizationDecision | undefined {
    const decision = this.#store.getAuthorization(decisionId);
    return decision ? this.#assertVisible(decision) : undefined;
  }

  listAuthorizations(): readonly EconomicAuthorizationDecision[] {
    return this.#store.listAuthorizations().filter((record) => this.#isVisible(record));
  }

  quote(input: {
    quoteId: string;
    account: EconomicAccount;
    planId: string;
    estimatedUsage: Readonly<Partial<Record<UsageDimension, bigint>>>;
    expiresAt: number;
  }): UsageQuote {
    this.#assertTenant(input.account.tenantId);
    const existing = this.#store.getQuote(input.quoteId);
    if (existing) return this.#assertVisible(existing);
    const estimatedByDimension: Record<string, string> = {};
    let total = new NeuronsAmount(0n);
    for (const [dimension, quantity] of Object.entries(input.estimatedUsage)) {
      if (quantity === undefined) continue;
      if (quantity < 0n) throw new AcsError("usage quantity cannot be negative", "ACS_ECONOMIC_INVALID_USAGE");
      const price = this.#policy.pricing[dimension as UsageDimension] ?? 0n;
      const amount = new NeuronsAmount(price * BigInt(quantity));
      estimatedByDimension[dimension] = amount.toJSON();
      total = total.add(amount);
    }
    const quote: UsageQuote = {
      quoteId: input.quoteId,
      accountId: input.account.accountId,
      planId: input.planId,
      policyId: this.#policy.policyId,
      policyRevision: this.#policy.revision,
      mode: input.account.mode,
      estimatedByDimension,
      total,
      expiresAt: input.expiresAt,
      ...(input.account.tenantId ? { tenantId: input.account.tenantId } : {}),
      ...(input.account.workloadId ? { workloadId: input.account.workloadId } : {}),
    };
    return this.#store.saveQuote(quote);
  }

  authorize(input: {
    decisionId: string;
    economicOperationId: string;
    idempotencyKey: string;
    authorizationEffect: EconomicAuthorizationDecisionEffect;
    decisionCode: EconomicAuthorizationDecisionCode;
    reasons: readonly string[];
    governanceReferences?: readonly string[];
    entitlementReferences?: readonly string[];
    limitReferences?: readonly string[];
    requestedAmount?: bigint | number | string;
    effectiveAmount?: bigint | number | string;
    unit?: string;
    quoteId?: string;
    reservationId?: string;
    executionRunId?: string;
    workloadId?: string;
    actor?: string;
    auditCorrelation: string;
    createdAt?: number;
    evaluatedAt?: number;
  }): EconomicAuthorizationDecision {
    const existing = this.#store.findAuthorizationByIdempotency(input.idempotencyKey, this.#tenantId);
    if (existing) {
      if (existing.economicOperationId !== input.economicOperationId || existing.quoteId !== input.quoteId) {
        throw new EconomicIdempotencyConflictError();
      }
      return this.#assertVisible(existing);
    }
    const decision: EconomicAuthorizationDecision = {
      decisionId: input.decisionId,
      economicOperationId: input.economicOperationId,
      authorizationEffect: input.authorizationEffect,
      decisionCode: input.decisionCode,
      reasons: [...input.reasons],
      governanceReferences: [...(input.governanceReferences ?? [])],
      entitlementReferences: [...(input.entitlementReferences ?? [])],
      limitReferences: [...(input.limitReferences ?? [])],
      ...(input.requestedAmount !== undefined ? { requestedAmount: String(input.requestedAmount) } : {}),
      ...(input.effectiveAmount !== undefined ? { effectiveAmount: String(input.effectiveAmount) } : {}),
      ...(input.unit ? { unit: input.unit } : {}),
      ...(input.quoteId ? { quoteId: input.quoteId } : {}),
      ...(input.reservationId ? { reservationId: input.reservationId } : {}),
      ...(input.executionRunId ? { executionRunId: input.executionRunId } : {}),
      ...(input.workloadId ? { workloadId: input.workloadId } : {}),
      idempotencyKey: input.idempotencyKey,
      auditCorrelation: input.auditCorrelation,
      createdAt: input.createdAt ?? Date.now(),
      evaluatedAt: input.evaluatedAt ?? Date.now(),
      status: input.authorizationEffect === "allowed" ? "authorized" : "failed",
      ...(this.#tenantId ? { tenantId: this.#tenantId } : {}),
      ...(input.actor ? { actor: input.actor } : {}),
    };
    this.#store.saveAuthorization(decision);
    this.#auditService?.recordEvent({
      eventType: input.authorizationEffect === "allowed" ? "economic.authorized" : "economic.authorization_denied",
      correlationId: input.auditCorrelation,
      tenantId: decision.tenantId,
      actor: input.actor,
      decision: input.authorizationEffect === "allowed" ? "allowed" : "denied",
      result: input.authorizationEffect === "allowed" ? "success" : "failure",
      timestamp: decision.evaluatedAt,
      metadata: {
        decisionId: decision.decisionId,
        economicOperationId: decision.economicOperationId,
        decisionCode: decision.decisionCode,
        reasons: decision.reasons,
        ...(decision.quoteId ? { quoteId: decision.quoteId } : {}),
        ...(decision.reservationId ? { reservationId: decision.reservationId } : {}),
        ...(decision.requestedAmount ? { requestedAmount: decision.requestedAmount } : {}),
        ...(decision.effectiveAmount ? { effectiveAmount: decision.effectiveAmount } : {}),
        ...(decision.unit ? { unit: decision.unit } : {}),
      },
    });
    return this.#assertVisible(decision);
  }

  reserve(input: { reservationId: string; quoteId: string; idempotencyKey: string; expiresAt: number; authorizationDecisionId?: string; operationId?: string; decisionCode?: EconomicAuthorizationDecisionCode; decisionReason?: string; executionRunId?: string; workloadId?: string; actor?: string; correlationId?: string; createdAt?: number }): UsageReservation {
    const quote = this.#requireQuote(input.quoteId);
    const existingForKey = this.#store.findReservationByIdempotency(input.idempotencyKey, undefined, this.#tenantId);
    if (existingForKey) {
      if (existingForKey.quoteId !== input.quoteId) throw new EconomicIdempotencyConflictError();
      return this.#assertVisible(existingForKey);
    }
    if (input.authorizationDecisionId) {
      const authorization = this.getAuthorization(input.authorizationDecisionId);
      if (!authorization) throw new AcsError("authorization decision not found", "ACS_ECONOMIC_AUTHORIZATION_NOT_FOUND");
      if (authorization.authorizationEffect !== "allowed") {
        throw new AcsError("economic authorization was denied", "ACS_ECONOMIC_AUTHORIZATION_DENIED");
      }
      if (authorization.quoteId && authorization.quoteId !== quote.quoteId) {
        throw new EconomicIdempotencyConflictError();
      }
    }
    const reservation: UsageReservation = {
      reservationId: input.reservationId,
      quoteId: quote.quoteId,
      accountId: quote.accountId,
      reserved: quote.total,
      remaining: quote.total,
      expiresAt: input.expiresAt,
      status: "reserved",
      idempotencyKey: input.idempotencyKey,
      ...(input.authorizationDecisionId ? { authorizationDecisionId: input.authorizationDecisionId } : {}),
      ...(input.operationId ? { operationId: input.operationId } : {}),
      ...(input.decisionCode ? { decisionCode: input.decisionCode } : {}),
      ...(input.decisionReason ? { decisionReason: input.decisionReason } : {}),
      ...(input.executionRunId ? { executionRunId: input.executionRunId } : {}),
      ...(input.workloadId ? { workloadId: input.workloadId } : {}),
      ...(this.#tenantId || quote.tenantId ? { tenantId: this.#tenantId ?? quote.tenantId } : {}),
      ...(quote.workloadId ? { workloadId: quote.workloadId } : {}),
      updatedAt: input.createdAt ?? Date.now(),
    };
    const saved = this.#store.saveReservation(reservation);
    this.#auditService?.recordEvent({
      eventType: "economic.reserved",
      correlationId: input.correlationId ?? input.idempotencyKey,
      tenantId: saved.tenantId,
      actor: input.actor,
      decision: "allowed",
      result: "success",
      timestamp: saved.updatedAt ?? Date.now(),
      metadata: {
        reservationId: saved.reservationId,
        quoteId: saved.quoteId,
        ...(saved.authorizationDecisionId ? { authorizationDecisionId: saved.authorizationDecisionId } : {}),
        ...(saved.operationId ? { operationId: saved.operationId } : {}),
        ...(saved.decisionCode ? { decisionCode: saved.decisionCode } : {}),
      },
    });
    return saved;
  }

  authorizeReservation(input: { reservationId: string; planId: string }): { reservationId: string; planId: string; authorized: boolean } {
    const reservation = this.#requireReservation(input.reservationId);
    if (reservation.status !== "reserved") throw new AcsError("reservation is not active", "ACS_ECONOMIC_RESERVATION_INACTIVE");
    return { reservationId: reservation.reservationId, planId: input.planId, authorized: true };
  }

  recordUsage(record: UsageRecord): void {
    this.#assertTenant(record.tenantId);
    if (record.quantity < 0n) throw new AcsError("usage quantity cannot be negative", "ACS_ECONOMIC_INVALID_USAGE");
    if (this.#store.listUsage(record.runId).some((entry) => entry.recordId === record.recordId)) return;
    this.#store.saveUsage(record);
  }

  async settle(input: { settlementId: string; reservationId: string; runId: string; idempotencyKey: string }): Promise<Settlement> {
    const reservation = this.#requireReservation(input.reservationId);
    const existing = this.#store.findSettlementByIdempotency(input.idempotencyKey, undefined, this.#tenantId);
    if (existing) {
      if (existing.runId !== input.runId || existing.reservationId !== input.reservationId) {
        throw new EconomicIdempotencyConflictError();
      }
      return this.#assertVisible(existing);
    }

    const providerExisting = await this.#settlementProvider.lookupSettlement({
      idempotencyKey: input.idempotencyKey,
      runId: input.runId,
      tenantId: this.#tenantId,
    });
    if (providerExisting) {
      await this.#commitProviderRecord(providerExisting);
      return this.#requireSettlement(providerExisting.settlement.settlementId);
    }

    const totalCharged = this.#calculateCharge(input.runId);
    if (totalCharged.units > reservation.reserved.units) {
      throw new AcsError("reservation exhausted", "ACS_ECONOMIC_RESERVATION_EXHAUSTED");
    }
    const released = reservation.reserved.subtract(totalCharged);
    const settlement: Settlement = {
      settlementId: input.settlementId,
      reservationId: reservation.reservationId,
      runId: input.runId,
      totalCharged,
      status: released.equals(new NeuronsAmount(0n)) ? "settled" : "partially_settled",
      idempotencyKey: input.idempotencyKey,
      ...(reservation.tenantId ? { tenantId: reservation.tenantId } : {}),
      ...(reservation.workloadId ? { workloadId: reservation.workloadId } : {}),
    };
    const providerRecord = await this.#settlementProvider.settle(settlement);
    if (providerRecord.settlement.idempotencyKey !== settlement.idempotencyKey
      || providerRecord.settlement.runId !== settlement.runId) {
      throw new EconomicIdempotencyConflictError();
    }
    await this.#commitProviderRecord(providerRecord);
    return this.#requireSettlement(providerRecord.settlement.settlementId);
  }

  release(input: { reservationId: string; reason: string; actor?: string; correlationId?: string; releasedAt?: number }): UsageReservation {
    const reservation = this.#requireReservation(input.reservationId);
    if (reservation.status !== "reserved") return reservation;
    const released = {
      ...reservation,
      status: "released" as const,
      remaining: new NeuronsAmount(0n),
      decisionReason: input.reason,
      releasedAt: input.releasedAt ?? Date.now(),
      updatedAt: input.releasedAt ?? Date.now(),
    };
    const saved = this.#store.saveReservation(released);
    this.#auditService?.recordEvent({
      eventType: "economic.released",
      correlationId: input.correlationId ?? input.reservationId,
      tenantId: saved.tenantId,
      actor: input.actor,
      decision: "allowed",
      result: "success",
      timestamp: saved.releasedAt ?? Date.now(),
      metadata: {
        reservationId: saved.reservationId,
        reason: input.reason,
      },
    });
    return saved;
  }

  receipt(runId: string): EconomicReceipt {
    const receipt = this.#store.getReceipt(runId);
    if (!receipt) throw new AcsError("economic receipt not found", "ACS_ECONOMIC_RECEIPT_NOT_FOUND");
    return this.#assertVisible(receipt);
  }

  listUsage(runId: string): readonly UsageRecord[] {
    return this.#store.listUsage(runId).filter((record) => this.#isVisible(record));
  }

  listQuotes(): readonly UsageQuote[] { return this.#store.listQuotes().filter((record) => this.#isVisible(record)); }
  listReservations(): readonly UsageReservation[] { return this.#store.listReservations().filter((record) => this.#isVisible(record)); }
  getExecutionRunReservation(executionRunId: string): UsageReservation | undefined {
    return this.listReservations().find((reservation) => reservation.executionRunId === executionRunId);
  }
  listSettlements(): readonly Settlement[] { return this.#store.listSettlements().filter((record) => this.#isVisible(record)); }
  getExecutionRunSettlement(executionRunId: string): Settlement | undefined {
    return this.listSettlements().find((settlement) => settlement.runId === executionRunId);
  }
  listReceipts(): readonly EconomicReceipt[] { return this.#store.listReceipts().filter((record) => this.#isVisible(record)); }

  async reconcile(): Promise<{ readonly inspected: number; readonly repaired: number }> {
    const records = await this.#settlementProvider.listSettlements();
    let inspected = 0;
    let repaired = 0;
    for (const record of records) {
      if (!this.#isVisible(record.settlement)) continue;
      inspected += 1;
      const existing = this.#store.findSettlementByIdempotency(
        record.settlement.idempotencyKey,
        record.settlement.runId,
        this.#tenantId,
      );
      if (existing) continue;
      await this.#commitProviderRecord(record);
      repaired += 1;
    }
    return { inspected, repaired };
  }

  #calculateCharge(runId: string): NeuronsAmount {
    let totalCharged = new NeuronsAmount(0n);
    for (const record of this.#store.listUsage(runId).filter((item) => this.#isVisible(item))) {
      const price = this.#policy.pricing[record.dimension] ?? 0n;
      totalCharged = totalCharged.add(new NeuronsAmount(price * record.quantity));
    }
    return totalCharged;
  }

  async #commitProviderRecord(providerRecord: SettlementProviderRecord): Promise<void> {
    const settlement = this.#assertVisible(providerRecord.settlement);
    const reservation = this.#requireReservation(settlement.reservationId);
    if (reservation.status !== "reserved") {
      const existing = this.#store.findSettlementByIdempotency(
        settlement.idempotencyKey,
        settlement.runId,
        this.#tenantId,
      );
      if (existing) return;
      throw new AcsError("settlement reconciliation found an inactive reservation", "ACS_ECONOMIC_RECONCILIATION_CONFLICT");
    }
    const released = reservation.reserved.subtract(settlement.totalCharged);
    if (released.isNegative()) throw new AcsError("settlement exceeds reservation", "ACS_ECONOMIC_RECONCILIATION_CONFLICT");
    const updatedReservation: UsageReservation = { ...reservation, remaining: released, status: "settled" };
    const receipt: EconomicReceipt = {
      receiptId: "receipt_" + settlement.runId,
      runId: settlement.runId,
      quoteId: reservation.quoteId,
      reservationId: reservation.reservationId,
      settlementId: settlement.settlementId,
      totalQuoted: reservation.reserved,
      totalCharged: settlement.totalCharged,
      totalReleased: released,
      mode: this.#requireQuote(reservation.quoteId).mode,
      status: "settled",
      ...(reservation.tenantId ? { tenantId: reservation.tenantId } : {}),
      ...(reservation.workloadId ? { workloadId: reservation.workloadId } : {}),
    };
    this.#store.commitSettlement({ settlement, reservation: updatedReservation, receipt });
    this.#auditService?.recordEvent({
      eventType: "economic.settled",
      correlationId: settlement.idempotencyKey,
      tenantId: settlement.tenantId,
      workloadId: settlement.workloadId,
      executionRunId: settlement.runId,
      decision: "passed",
      result: "success",
      timestamp: providerRecord.settledAt,
      metadata: {
        settlementId: settlement.settlementId,
        reservationId: settlement.reservationId,
        totalCharged: settlement.totalCharged.toJSON(),
        status: settlement.status,
      },
    });
  }

  #requireQuote(quoteId: string): UsageQuote {
    const quote = this.#store.getQuote(quoteId);
    if (!quote) throw new AcsError("quote not found", "ACS_ECONOMIC_QUOTE_NOT_FOUND");
    return this.#assertVisible(quote);
  }

  #requireReservation(reservationId: string): UsageReservation {
    const reservation = this.#store.getReservation(reservationId);
    if (!reservation) throw new AcsError("reservation not found", "ACS_ECONOMIC_RESERVATION_NOT_FOUND");
    return this.#assertVisible(reservation);
  }

  #requireSettlement(settlementId: string): Settlement {
    const settlement = this.#store.getSettlement(settlementId);
    if (!settlement) throw new EconomicPersistenceError("settlement lookup");
    return this.#assertVisible(settlement);
  }

  #assertTenant(tenantId?: string): void {
    if (!sameTenant(this.#tenantId, tenantId)) throw new EconomicTenantMismatchError();
  }

  #isVisible(record: { readonly tenantId?: string }): boolean {
    return sameTenant(this.#tenantId, record.tenantId);
  }

  #assertVisible<T extends { readonly tenantId?: string }>(record: T): T {
    if (!this.#isVisible(record)) throw new EconomicTenantMismatchError();
    return record;
  }
}
