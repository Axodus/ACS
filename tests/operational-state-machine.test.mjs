import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  InMemoryOperationalStateReceiptStore,
  InMemoryTelemetrySink,
  JsonlOperationalStateReceiptStore,
  OperationalStateMachine,
} from "../dist/index.js";

test("accepts valid operational state transitions with telemetry and receipts", () => {
  const telemetry = new InMemoryTelemetrySink();
  const receipts = new InMemoryOperationalStateReceiptStore();
  const machine = new OperationalStateMachine({ telemetry, receipts });

  const receipt = machine.transition({
    subjectId: "user:1",
    from: "READY",
    to: "ACTIVE",
    actor: "user",
    reason: "user confirmed strategy activation",
    policyRef: "acs-policy-matrix:v1",
  });

  assert.equal(receipt.status, "accepted");
  assert.equal(receipt.from, "READY");
  assert.equal(receipt.to, "ACTIVE");
  assert.equal(receipt.telemetryIds.length, 2);
  assert.deepEqual(
    telemetry.list().map((event) => event.type),
    ["operational.state.transition.accepted", "operational.state.changed"],
  );
  assert.equal(receipts.query({ subjectId: "user:1", status: "accepted" }).length, 1);
});

test("rejects invalid operational state transitions with audit evidence", () => {
  const telemetry = new InMemoryTelemetrySink();
  const receipts = new InMemoryOperationalStateReceiptStore();
  const machine = new OperationalStateMachine({ telemetry, receipts });

  const receipt = machine.transition({
    subjectId: "user:2",
    from: "EMERGENCY_STOP",
    to: "ACTIVE",
    actor: "user",
    reason: "resume after stop",
  });

  assert.equal(receipt.status, "rejected");
  assert.match(receipt.rejectionReason, /not allowed/);
  assert.equal(receipt.telemetryIds.length, 1);
  assert.equal(telemetry.list()[0].type, "operational.state.transition.rejected");
  assert.equal(receipts.query({ subjectId: "user:2", status: "rejected" }).length, 1);
});

test("persists operational state receipts as JSONL", () => {
  const workspace = mkdtempSync(join(tmpdir(), "acs-state-receipts-"));
  const receiptPath = join(workspace, "receipts", "state.jsonl");

  try {
    const telemetry = new InMemoryTelemetrySink();
    const receipts = new JsonlOperationalStateReceiptStore(receiptPath);
    const machine = new OperationalStateMachine({ telemetry, receipts });

    const receipt = machine.transition({
      subjectId: "user:3",
      from: "LICENSED",
      to: "API_PENDING",
      actor: "user",
      reason: "user started exchange API setup",
    });

    assert.equal(receipt.status, "accepted");
    assert.equal(receipts.list().length, 1);
    assert.equal(receipts.list()[0].id, receipt.id);
    assert.equal(receipts.query({ to: "API_PENDING" }).length, 1);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

