import { createAcsReceipt, type AcsReceipt, type AcsReceiptStore } from "./acs-receipts.js";
import type { AcsConsumptionLevel } from "./consumption-levels.js";
import type { TelemetrySink } from "./telemetry.js";

export type EmergencyStopScope = "user" | "tenant" | "capability" | "governance" | "system";
export type EmergencyStopSource = "user" | "tenant-admin" | "agent" | "governance" | "system";
export type EmergencyStopSeverity = "warning" | "critical" | "constitutional";

export interface EmergencyStopRecord {
  readonly stopId: string;
  readonly scope: EmergencyStopScope;
  readonly source: EmergencyStopSource;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly capabilityId?: string;
  readonly reason: string;
  readonly severity: EmergencyStopSeverity;
  readonly active: boolean;
  readonly createdAt: string;
  readonly resolvedAt?: string;
}

export interface CreateEmergencyStopInput {
  readonly scope: EmergencyStopScope;
  readonly source: EmergencyStopSource;
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly capabilityId?: string;
  readonly reason: string;
  readonly severity: EmergencyStopSeverity;
  readonly createdAt?: string;
  readonly correlationId?: string;
}

export interface EmergencyStopCheckInput {
  readonly tenantId?: string;
  readonly wallet?: string;
  readonly capabilityId?: string;
}

export interface EmergencyStopDecision {
  readonly blocked: boolean;
  readonly blockedReason?: "emergency_stop_active";
  readonly warnings: readonly string[];
  readonly stop?: EmergencyStopRecord;
}

export class EmergencyStopService {
  readonly #records: EmergencyStopRecord[] = [];

  constructor(
    private readonly telemetry?: TelemetrySink,
    private readonly receipts?: AcsReceiptStore,
  ) {}

  createStop(input: CreateEmergencyStopInput): { readonly stop: EmergencyStopRecord; readonly receipt: AcsReceipt } {
    const stop: EmergencyStopRecord = {
      stopId: `stop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      scope: input.scope,
      source: input.source,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.wallet ? { wallet: input.wallet } : {}),
      ...(input.capabilityId ? { capabilityId: input.capabilityId } : {}),
      reason: input.reason,
      severity: input.severity,
      active: true,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };

    this.#records.push(stop);
    this.telemetry?.record("emergency.stop.created", stop.stopId, {
      scope: stop.scope,
      source: stop.source,
      tenantId: stop.tenantId,
      wallet: stop.wallet,
      capabilityId: stop.capabilityId,
      severity: stop.severity,
      reason: stop.reason,
    });

    const receipt = createAcsReceipt({
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(stop.tenantId ? { tenantId: stop.tenantId } : {}),
      ...(stop.wallet ? { wallet: stop.wallet } : {}),
      consumptionLevel: receiptConsumptionLevel(stop),
      capabilityId: stop.capabilityId ?? "system.emergency-stop",
      actionType: "emergency_stop_created",
      actor: { type: sourceActorType(stop.source), id: stop.source },
      policyDecision: {
        allowed: false,
        blockedReason: "emergency_stop_active",
        automationLevel: "blocked",
        requiresGovernanceApproval: stop.source !== "governance",
      },
      operationalState: "EMERGENCY_STOP",
      telemetry: {
        warnings: [`emergency stop active: ${stop.reason}`],
        riskFlags: [stop.severity],
      },
      metadata: {
        stopId: stop.stopId,
        scope: stop.scope,
        severity: stop.severity,
      },
      createdAt: stop.createdAt,
    });
    this.receipts?.save(receipt);

    return { stop, receipt };
  }

  resolveStop(stopId: string, resolvedAt = new Date().toISOString()): EmergencyStopRecord {
    const index = this.#records.findIndex((record) => record.stopId === stopId);
    if (index < 0) {
      throw new Error(`unknown emergency stop: ${stopId}`);
    }

    const current = this.#records[index];
    if (!current) {
      throw new Error(`unknown emergency stop: ${stopId}`);
    }

    const resolved: EmergencyStopRecord = {
      ...current,
      active: false,
      resolvedAt,
    };
    this.#records[index] = resolved;
    this.telemetry?.record("emergency.stop.resolved", resolved.stopId, {
      scope: resolved.scope,
      tenantId: resolved.tenantId,
      wallet: resolved.wallet,
      capabilityId: resolved.capabilityId,
    });

    return resolved;
  }

  listActiveStops(filter: EmergencyStopCheckInput = {}): readonly EmergencyStopRecord[] {
    return this.#records.filter((record) => record.active && stopApplies(record, filter));
  }

  list(): readonly EmergencyStopRecord[] {
    return [...this.#records];
  }

  evaluate(input: EmergencyStopCheckInput): EmergencyStopDecision {
    const stop = this.listActiveStops(input)[0];
    if (!stop) {
      return { blocked: false, warnings: [] };
    }

    return {
      blocked: true,
      blockedReason: "emergency_stop_active",
      warnings: [`emergency stop active for ${stop.scope}: ${stop.reason}`],
      stop,
    };
  }
}

export function stopApplies(stop: EmergencyStopRecord, input: EmergencyStopCheckInput): boolean {
  if (!stop.active) {
    return false;
  }

  if (stop.scope === "system" || stop.scope === "governance") {
    return true;
  }

  if (stop.scope === "tenant") {
    return Boolean(stop.tenantId && input.tenantId === stop.tenantId);
  }

  if (stop.scope === "user") {
    return Boolean(stop.wallet && input.wallet === stop.wallet);
  }

  if (stop.scope === "capability") {
    return Boolean(stop.capabilityId && input.capabilityId === stop.capabilityId);
  }

  return false;
}

function receiptConsumptionLevel(stop: EmergencyStopRecord): AcsConsumptionLevel {
  if (stop.scope === "tenant") {
    return "service";
  }

  if (stop.scope === "user") {
    return "product";
  }

  return "core";
}

function sourceActorType(source: EmergencyStopSource): AcsReceipt["actor"]["type"] {
  if (source === "agent") {
    return "agent";
  }

  if (source === "governance") {
    return "governance";
  }

  if (source === "system") {
    return "system";
  }

  return "user";
}
