import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AgentId, ExecutionReceipt, WorkflowRunId, WorkflowStatus } from "./types.js";

export interface ReceiptQuery {
  readonly workflowRunId?: WorkflowRunId;
  readonly workflowId?: string;
  readonly agentId?: AgentId;
  readonly status?: WorkflowStatus;
}

export interface ReceiptStore {
  save(receipt: ExecutionReceipt): void;
  list(): readonly ExecutionReceipt[];
  findByWorkflowRunId(workflowRunId: WorkflowRunId): ExecutionReceipt | undefined;
  query(filter: ReceiptQuery): readonly ExecutionReceipt[];
}

export class InMemoryReceiptStore implements ReceiptStore {
  readonly #receipts: ExecutionReceipt[] = [];

  save(receipt: ExecutionReceipt): void {
    this.#receipts.push(receipt);
  }

  list(): readonly ExecutionReceipt[] {
    return [...this.#receipts];
  }

  findByWorkflowRunId(workflowRunId: WorkflowRunId): ExecutionReceipt | undefined {
    return this.#receipts.find((receipt) => receipt.workflowRunId === workflowRunId);
  }

  query(filter: ReceiptQuery): readonly ExecutionReceipt[] {
    return filterReceipts(this.#receipts, filter);
  }
}

export class JsonlReceiptStore implements ReceiptStore {
  constructor(private readonly filePath: string) {}

  save(receipt: ExecutionReceipt): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(receipt)}\n`, { encoding: "utf8" });
  }

  list(): readonly ExecutionReceipt[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    return readFileSync(this.filePath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => normalizeReceipt(JSON.parse(line) as Partial<ExecutionReceipt>));
  }

  findByWorkflowRunId(workflowRunId: WorkflowRunId): ExecutionReceipt | undefined {
    return this.list().find((receipt) => receipt.workflowRunId === workflowRunId);
  }

  query(filter: ReceiptQuery): readonly ExecutionReceipt[] {
    return filterReceipts(this.list(), filter);
  }
}

function filterReceipts(receipts: readonly ExecutionReceipt[], filter: ReceiptQuery): readonly ExecutionReceipt[] {
  return receipts.filter((receipt) => {
    if (filter.workflowRunId && receipt.workflowRunId !== filter.workflowRunId) {
      return false;
    }

    if (filter.workflowId && receipt.workflowId !== filter.workflowId) {
      return false;
    }

    if (filter.status && receipt.status !== filter.status) {
      return false;
    }

    if (filter.agentId && !receipt.steps.some((step) => step.agentId === filter.agentId)) {
      return false;
    }

    return true;
  });
}

function normalizeReceipt(receipt: Partial<ExecutionReceipt>): ExecutionReceipt {
  if (!receipt.id || !receipt.workflowId || !receipt.status || !receipt.startedAt || !receipt.steps || !receipt.telemetryIds) {
    throw new Error("invalid execution receipt record");
  }

  return {
    id: receipt.id,
    workflowId: receipt.workflowId,
    workflowRunId: receipt.workflowRunId ?? receipt.workflowId,
    status: receipt.status,
    startedAt: receipt.startedAt,
    ...(receipt.completedAt ? { completedAt: receipt.completedAt } : {}),
    steps: receipt.steps,
    telemetryIds: receipt.telemetryIds,
    ...(receipt.rejectionReason ? { rejectionReason: receipt.rejectionReason } : {}),
  };
}
