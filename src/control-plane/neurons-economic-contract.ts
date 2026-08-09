export type BillingResponsibilityMode = "axodus-managed" | "byok" | "byos";
export type EconomicRecordStatus = "quoted" | "reserved" | "authorized" | "metered" | "settled" | "released" | "failed";

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
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface Settlement {
  readonly settlementId: string;
  readonly reservationId: string;
  readonly runId: string;
  readonly totalCharged: NeuronsAmount;
  readonly status: "pending" | "settled" | "partially_settled" | "failed" | "released";
  readonly idempotencyKey: string;
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
}

export interface SettlementProvider {
  settle(settlement: Settlement): Promise<{ settlementId: string; status: Settlement["status"] }>;
}

export class InMemorySettlementProvider implements SettlementProvider {
  async settle(settlement: Settlement): Promise<{ settlementId: string; status: Settlement["status"] }> {
    return { settlementId: settlement.settlementId, status: settlement.status };
  }
}

export class EconomicService {
  readonly #policy: BillingPolicy;
  readonly #settlementProvider: SettlementProvider;
  readonly #quotes = new Map<string, UsageQuote>();
  readonly #reservations = new Map<string, UsageReservation>();
  readonly #usage = new Map<string, UsageRecord[]>();
  readonly #settlements = new Map<string, Settlement>();
  readonly #receipts = new Map<string, EconomicReceipt>();

  constructor(input: { policy: BillingPolicy; settlementProvider?: SettlementProvider }) {
    this.#policy = input.policy;
    this.#settlementProvider = input.settlementProvider ?? new InMemorySettlementProvider();
  }

  quote(input: {
    quoteId: string;
    account: EconomicAccount;
    planId: string;
    estimatedUsage: Readonly<Partial<Record<UsageDimension, bigint>>>;
    expiresAt: number;
  }): UsageQuote {
    const estimatedByDimension: Record<string, string> = {};
    let total = new NeuronsAmount(0n);
    for (const [dimension, quantity] of Object.entries(input.estimatedUsage)) {
      if (quantity === undefined) continue;
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
    };
    this.#quotes.set(quote.quoteId, quote);
    return quote;
  }

  reserve(input: { reservationId: string; quoteId: string; idempotencyKey: string; expiresAt: number }): UsageReservation {
    const quote = this.#requireQuote(input.quoteId);
    const existing = [...this.#reservations.values()].find((item) => item.idempotencyKey === input.idempotencyKey && item.quoteId === input.quoteId);
    if (existing) return existing;
    const reservation: UsageReservation = {
      reservationId: input.reservationId,
      quoteId: quote.quoteId,
      accountId: quote.accountId,
      reserved: quote.total,
      remaining: quote.total,
      expiresAt: input.expiresAt,
      status: "reserved",
      idempotencyKey: input.idempotencyKey,
    };
    this.#reservations.set(reservation.reservationId, reservation);
    return reservation;
  }

  authorize(input: { reservationId: string; planId: string }): { reservationId: string; planId: string; authorized: boolean } {
    const reservation = this.#requireReservation(input.reservationId);
    if (reservation.status !== "reserved") {
      throw new Error("reservation is not active");
    }
    return { reservationId: reservation.reservationId, planId: input.planId, authorized: true };
  }

  recordUsage(record: UsageRecord): void {
    const usage = this.#usage.get(record.runId) ?? [];
    if (usage.some((entry) => entry.recordId === record.recordId)) return;
    usage.push(record);
    this.#usage.set(record.runId, usage);
  }

  async settle(input: { settlementId: string; reservationId: string; runId: string; idempotencyKey: string }): Promise<Settlement> {
    const reservation = this.#requireReservation(input.reservationId);
    const existing = [...this.#settlements.values()].find((item) => item.idempotencyKey === input.idempotencyKey && item.runId === input.runId);
    if (existing) return existing;

    const usage = this.#usage.get(input.runId) ?? [];
    let totalCharged = new NeuronsAmount(0n);
    for (const record of usage) {
      const price = this.#policy.pricing[record.dimension] ?? 0n;
      totalCharged = totalCharged.add(new NeuronsAmount(price * record.quantity));
    }

    if (totalCharged.units > reservation.reserved.units) {
      throw new Error("reservation exhausted");
    }

    const released = reservation.reserved.subtract(totalCharged);
    const settlement: Settlement = {
      settlementId: input.settlementId,
      reservationId: reservation.reservationId,
      runId: input.runId,
      totalCharged,
      status: released.equals(new NeuronsAmount(0n)) ? "settled" : "partially_settled",
      idempotencyKey: input.idempotencyKey,
    };
    await this.#settlementProvider.settle(settlement);
    this.#settlements.set(settlement.settlementId, settlement);
    this.#reservations.set(reservation.reservationId, {
      ...reservation,
      remaining: released,
      status: "settled",
    });
    this.#receipts.set(input.runId, {
      receiptId: "receipt_" + input.runId,
      runId: input.runId,
      quoteId: reservation.quoteId,
      reservationId: reservation.reservationId,
      settlementId: settlement.settlementId,
      totalQuoted: reservation.reserved,
      totalCharged,
      totalReleased: released,
      mode: this.#requireQuote(reservation.quoteId).mode,
      status: "settled",
    });
    return settlement;
  }

  release(input: { reservationId: string; reason: string }): UsageReservation {
    const reservation = this.#requireReservation(input.reservationId);
    if (reservation.status !== "reserved") return reservation;
    const released = {
      ...reservation,
      status: "released" as const,
      remaining: new NeuronsAmount(0n),
    };
    this.#reservations.set(released.reservationId, released);
    return released;
  }

  receipt(runId: string): EconomicReceipt {
    const receipt = this.#receipts.get(runId);
    if (!receipt) throw new Error("economic receipt not found");
    return receipt;
  }

  listUsage(runId: string): readonly UsageRecord[] {
    return [...(this.#usage.get(runId) ?? [])];
  }

  #requireQuote(quoteId: string): UsageQuote {
    const quote = this.#quotes.get(quoteId);
    if (!quote) throw new Error("quote not found");
    return quote;
  }

  #requireReservation(reservationId: string): UsageReservation {
    const reservation = this.#reservations.get(reservationId);
    if (!reservation) throw new Error("reservation not found");
    return reservation;
  }
}
