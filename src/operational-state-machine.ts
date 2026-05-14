import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TelemetrySink } from "./telemetry.js";
import type { TelemetryId } from "./types.js";
import {
  canTransition,
  type OperationalActor,
  type OperationalState,
} from "./operational-state.js";

export type OperationalStateTransitionStatus = "accepted" | "rejected";

export interface OperationalStateTransitionInput {
  readonly subjectId: string;
  readonly from: OperationalState;
  readonly to: OperationalState;
  readonly actor: OperationalActor;
  readonly reason: string;
  readonly policyRef?: string;
}

export interface OperationalStateTransitionReceipt {
  readonly id: string;
  readonly subjectId: string;
  readonly from: OperationalState;
  readonly to: OperationalState;
  readonly actor: OperationalActor;
  readonly status: OperationalStateTransitionStatus;
  readonly reason: string;
  readonly policyRef?: string;
  readonly occurredAt: string;
  readonly telemetryIds: readonly TelemetryId[];
  readonly rejectionReason?: string;
}

export interface OperationalStateReceiptStore {
  save(receipt: OperationalStateTransitionReceipt): void;
  list(): readonly OperationalStateTransitionReceipt[];
  query(filter: OperationalStateReceiptQuery): readonly OperationalStateTransitionReceipt[];
}

export interface OperationalStateReceiptQuery {
  readonly subjectId?: string;
  readonly status?: OperationalStateTransitionStatus;
  readonly from?: OperationalState;
  readonly to?: OperationalState;
  readonly actor?: OperationalActor;
}

export class InMemoryOperationalStateReceiptStore implements OperationalStateReceiptStore {
  readonly #receipts: OperationalStateTransitionReceipt[] = [];

  save(receipt: OperationalStateTransitionReceipt): void {
    this.#receipts.push(receipt);
  }

  list(): readonly OperationalStateTransitionReceipt[] {
    return [...this.#receipts];
  }

  query(filter: OperationalStateReceiptQuery): readonly OperationalStateTransitionReceipt[] {
    return filterOperationalStateReceipts(this.#receipts, filter);
  }
}

export class JsonlOperationalStateReceiptStore implements OperationalStateReceiptStore {
  constructor(private readonly filePath: string) {}

  save(receipt: OperationalStateTransitionReceipt): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(receipt)}\n`, { encoding: "utf8" });
  }

  list(): readonly OperationalStateTransitionReceipt[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    return readFileSync(this.filePath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => normalizeOperationalStateReceipt(JSON.parse(line) as Partial<OperationalStateTransitionReceipt>));
  }

  query(filter: OperationalStateReceiptQuery): readonly OperationalStateTransitionReceipt[] {
    return filterOperationalStateReceipts(this.list(), filter);
  }
}

export interface OperationalStateMachineOptions {
  readonly telemetry: TelemetrySink;
  readonly receipts: OperationalStateReceiptStore;
}

export class OperationalStateMachine {
  #sequence = 0;

  constructor(private readonly options: OperationalStateMachineOptions) {}

  transition(input: OperationalStateTransitionInput): OperationalStateTransitionReceipt {
    if (!canTransition(input.from, input.to, input.actor)) {
      return this.#reject(input, `transition ${input.from} -> ${input.to} is not allowed for ${input.actor}`);
    }

    const accepted = this.options.telemetry.record("operational.state.transition.accepted", input.subjectId, {
      from: input.from,
      to: input.to,
      actor: input.actor,
      reason: input.reason,
      policyRef: input.policyRef,
    });
    const changed = this.options.telemetry.record("operational.state.changed", input.subjectId, {
      previousState: input.from,
      nextState: input.to,
      actor: input.actor,
      reason: input.reason,
      policyRef: input.policyRef,
    });

    return this.#save({
      id: this.#nextReceiptId(),
      subjectId: input.subjectId,
      from: input.from,
      to: input.to,
      actor: input.actor,
      status: "accepted",
      reason: input.reason,
      ...(input.policyRef ? { policyRef: input.policyRef } : {}),
      occurredAt: changed.timestamp,
      telemetryIds: [accepted.id, changed.id],
    });
  }

  #reject(input: OperationalStateTransitionInput, rejectionReason: string): OperationalStateTransitionReceipt {
    const rejected = this.options.telemetry.record("operational.state.transition.rejected", input.subjectId, {
      from: input.from,
      to: input.to,
      actor: input.actor,
      reason: input.reason,
      policyRef: input.policyRef,
      rejectionReason,
    });

    return this.#save({
      id: this.#nextReceiptId(),
      subjectId: input.subjectId,
      from: input.from,
      to: input.to,
      actor: input.actor,
      status: "rejected",
      reason: input.reason,
      ...(input.policyRef ? { policyRef: input.policyRef } : {}),
      occurredAt: rejected.timestamp,
      telemetryIds: [rejected.id],
      rejectionReason,
    });
  }

  #save(receipt: OperationalStateTransitionReceipt): OperationalStateTransitionReceipt {
    this.options.receipts.save(receipt);
    return receipt;
  }

  #nextReceiptId(): string {
    this.#sequence += 1;
    return `state_${this.#sequence.toString().padStart(6, "0")}`;
  }
}

function filterOperationalStateReceipts(
  receipts: readonly OperationalStateTransitionReceipt[],
  filter: OperationalStateReceiptQuery,
): readonly OperationalStateTransitionReceipt[] {
  return receipts.filter((receipt) => {
    if (filter.subjectId && receipt.subjectId !== filter.subjectId) {
      return false;
    }

    if (filter.status && receipt.status !== filter.status) {
      return false;
    }

    if (filter.from && receipt.from !== filter.from) {
      return false;
    }

    if (filter.to && receipt.to !== filter.to) {
      return false;
    }

    if (filter.actor && receipt.actor !== filter.actor) {
      return false;
    }

    return true;
  });
}

function normalizeOperationalStateReceipt(
  receipt: Partial<OperationalStateTransitionReceipt>,
): OperationalStateTransitionReceipt {
  if (
    !receipt.id ||
    !receipt.subjectId ||
    !receipt.from ||
    !receipt.to ||
    !receipt.actor ||
    !receipt.status ||
    !receipt.reason ||
    !receipt.occurredAt ||
    !receipt.telemetryIds
  ) {
    throw new Error("invalid operational state receipt record");
  }

  return {
    id: receipt.id,
    subjectId: receipt.subjectId,
    from: receipt.from,
    to: receipt.to,
    actor: receipt.actor,
    status: receipt.status,
    reason: receipt.reason,
    ...(receipt.policyRef ? { policyRef: receipt.policyRef } : {}),
    occurredAt: receipt.occurredAt,
    telemetryIds: receipt.telemetryIds,
    ...(receipt.rejectionReason ? { rejectionReason: receipt.rejectionReason } : {}),
  };
}

