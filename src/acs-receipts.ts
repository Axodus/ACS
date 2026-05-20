import type { AcsAutomationLevel, AcsConsumptionLevel } from "./consumption-levels.js";

export type AcsReceiptActorType = "user" | "agent" | "system" | "governance";

export interface AcsReceipt {
  readonly receiptId: string;
  readonly correlationId: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly consumptionLevel: AcsConsumptionLevel;
  readonly capabilityId: string;
  readonly actionType: string;
  readonly actor: {
    readonly type: AcsReceiptActorType;
    readonly id: string;
  };
  readonly policyDecision: {
    readonly allowed: boolean;
    readonly blockedReason?: string;
    readonly automationLevel: AcsAutomationLevel | string;
    readonly requiresGovernanceApproval?: boolean;
    readonly requiresTenantApproval?: boolean;
    readonly requiresUserLicense?: boolean;
  };
  readonly operationalState?: string;
  readonly telemetry: {
    readonly warnings: readonly string[];
    readonly riskFlags: readonly string[];
  };
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface CreateAcsReceiptInput {
  readonly receiptId?: string;
  readonly correlationId?: string;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly consumptionLevel: AcsConsumptionLevel;
  readonly capabilityId: string;
  readonly actionType: string;
  readonly actor: AcsReceipt["actor"];
  readonly policyDecision: AcsReceipt["policyDecision"];
  readonly operationalState?: string;
  readonly telemetry?: Partial<AcsReceipt["telemetry"]>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt?: string;
}

export interface AcsReceiptStore {
  save(receipt: AcsReceipt): void;
  list(): readonly AcsReceipt[];
  findByReceiptId(receiptId: string): AcsReceipt | undefined;
}

export class InMemoryAcsReceiptStore implements AcsReceiptStore {
  readonly #receipts: AcsReceipt[] = [];

  save(receipt: AcsReceipt): void {
    this.#receipts.push(receipt);
  }

  list(): readonly AcsReceipt[] {
    return [...this.#receipts];
  }

  findByReceiptId(receiptId: string): AcsReceipt | undefined {
    return this.#receipts.find((receipt) => receipt.receiptId === receiptId);
  }
}

export function createAcsReceipt(input: CreateAcsReceiptInput): AcsReceipt {
  const receipt: AcsReceipt = {
    receiptId: input.receiptId ?? createReceiptId(),
    correlationId: input.correlationId ?? createCorrelationId(),
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.wallet ? { wallet: input.wallet } : {}),
    consumptionLevel: input.consumptionLevel,
    capabilityId: input.capabilityId,
    actionType: input.actionType,
    actor: input.actor,
    policyDecision: input.policyDecision,
    ...(input.operationalState ? { operationalState: input.operationalState } : {}),
    telemetry: {
      warnings: input.telemetry?.warnings ?? [],
      riskFlags: input.telemetry?.riskFlags ?? [],
    },
    ...(input.metadata ? { metadata: sanitizeReceiptMetadata(input.metadata) } : {}),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  if (receipt.consumptionLevel === "service" && !receipt.tenantId) {
    throw new Error("service receipt requires tenantId");
  }

  if (receipt.consumptionLevel === "product" && !receipt.wallet) {
    throw new Error("product receipt requires wallet");
  }

  return receipt;
}

export function sanitizeReceiptMetadata(metadata: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (isSensitiveMetadataKey(key)) {
      sanitized[key] = "[redacted]";
      continue;
    }

    sanitized[key] = sanitizeMetadataValue(value);
  }

  return sanitized;
}

function sanitizeMetadataValue(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMetadataValue(entry));
  }

  return sanitizeReceiptMetadata(value as Readonly<Record<string, unknown>>);
}

function isSensitiveMetadataKey(key: string): boolean {
  return /secret|token|password|private[-_]?key|api[-_]?key/i.test(key);
}

function createReceiptId(): string {
  return `receipt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createCorrelationId(): string {
  return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
