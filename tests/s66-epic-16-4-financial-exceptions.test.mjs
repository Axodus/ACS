import assert from "node:assert/strict";
import test from "node:test";
import { EconomicService, InMemorySettlementProvider } from "../dist/index.js";
import { OperationalEvidenceService } from "../dist/control-plane/operational-evidence-service.js";

const POLICY = {
  policyId: "pricing.default",
  revision: 1,
  pricing: { compute: 5n },
};

function account(tenantId = "tenant-alpha") {
  return {
    accountId: tenantId + "-acct",
    ownerId: tenantId,
    tenantId,
    mode: "axodus-managed",
    assetCode: "NEURONS",
  };
}

async function seedMismatch(suffix = "exc", tenantId = "tenant-alpha") {
  const economicService = new EconomicService({ policy: POLICY, settlementProvider: new InMemorySettlementProvider() });
  const quote = economicService.quote({
    quoteId: "quote_" + suffix,
    account: account(tenantId),
    planId: "plan_" + suffix,
    estimatedUsage: { compute: 1n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = economicService.reserve({
    reservationId: "res_" + suffix,
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_" + suffix,
    expiresAt: Date.now() + 60_000,
  });
  await economicService.settle({
    settlementId: "settle_" + suffix,
    reservationId: reservation.reservationId,
    runId: "run_" + suffix,
    idempotencyKey: "idem_settle_" + suffix,
  });
  return new OperationalEvidenceService({ economicService });
}

async function seedMatched(suffix = "matched") {
  const economicService = new EconomicService({ policy: POLICY, settlementProvider: new InMemorySettlementProvider() });
  const quote = economicService.quote({
    quoteId: "quote_" + suffix,
    account: account(),
    planId: "plan_" + suffix,
    estimatedUsage: { compute: 2n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = economicService.reserve({
    reservationId: "res_" + suffix,
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_" + suffix,
    expiresAt: Date.now() + 60_000,
  });
  economicService.recordUsage({
    recordId: "usage_" + suffix,
    runId: "run_" + suffix,
    accountId: account().accountId,
    tenantId: "tenant-alpha",
    dimension: "compute",
    quantity: 2n,
    unit: "ms",
    source: "worker",
    observedAt: 100,
  });
  await economicService.settle({
    settlementId: "settle_" + suffix,
    reservationId: reservation.reservationId,
    runId: "run_" + suffix,
    idempotencyKey: "idem_settle_" + suffix,
  });
  return new OperationalEvidenceService({ economicService });
}
test("mismatch opens a tenant-scoped financial exception", async () => {
  const evidence = await seedMismatch();
  const mismatches = await evidence.listReconciliationMismatches();
  assert.equal(mismatches.length, 1);
  const opened = await evidence.openFinancialException(mismatches[0].mismatchId, "operator-a");
  assert.equal(opened.status, "open");
  assert.equal(opened.mismatchId, mismatches[0].mismatchId);
  assert.equal(opened.tenantId, "tenant-alpha");
  assert.equal(opened.exceptionId, "exc_" + mismatches[0].mismatchId);
  const listed = await evidence.listFinancialExceptions({ tenantId: "tenant-alpha" });
  assert.equal(listed.length, 1);
  const otherTenant = await evidence.listFinancialExceptions({ tenantId: "tenant-beta" });
  assert.equal(otherTenant.length, 0);
  const backlog = await evidence.listReconciliationBacklog();
  assert.equal(backlog[0].exceptionOpen, true);
});

test("duplicate open of the same mismatch is idempotent", async () => {
  const evidence = await seedMismatch("dup");
  const mismatch = (await evidence.listReconciliationMismatches())[0];
  const first = await evidence.openFinancialException(mismatch.mismatchId);
  const second = await evidence.openFinancialException(mismatch.mismatchId);
  assert.equal(first.exceptionId, second.exceptionId);
  assert.equal(first.openedAt, second.openedAt);
  const listed = await evidence.listFinancialExceptions();
  assert.equal(listed.length, 1);
});

test("matched evidence cannot open a financial exception", async () => {
  const evidence = await seedMatched();
  const mismatches = await evidence.listReconciliationMismatches();
  assert.equal(mismatches.length, 0);
  await assert.rejects(() => evidence.openFinancialException("mismatch_recon_settle_matched"), /proven mismatch/);
  const listed = await evidence.listFinancialExceptions();
  assert.equal(listed.length, 0);
});

test("invalid transitions are rejected and missing exceptions stay absent", async () => {
  const evidence = await seedMismatch("trans");
  const mismatch = (await evidence.listReconciliationMismatches())[0];
  const opened = await evidence.openFinancialException(mismatch.mismatchId);
  await assert.rejects(() => evidence.transitionFinancialException(opened.exceptionId, "close"), /invalid financial exception transition/);
  const missing = await evidence.getFinancialException("exc_missing");
  assert.equal(missing, undefined);
  await assert.rejects(() => evidence.transitionFinancialException("exc_missing", "acknowledge"), /financial exception not found/);
});

test("governed lifecycle preserves evidence and closes only from terminal states", async () => {
  const evidence = await seedMismatch("life");
  const mismatch = (await evidence.listReconciliationMismatches())[0];
  const opened = await evidence.openFinancialException(mismatch.mismatchId, "operator-a");
  const acknowledged = await evidence.transitionFinancialException(opened.exceptionId, "acknowledge", { actor: "operator-a" });
  assert.equal(acknowledged.status, "acknowledged");
  const reviewed = await evidence.transitionFinancialException(opened.exceptionId, "review");
  assert.equal(reviewed.status, "under_review");
  const pending = await evidence.transitionFinancialException(opened.exceptionId, "remediate");
  assert.equal(pending.status, "remediation_pending");
  const resolved = await evidence.transitionFinancialException(opened.exceptionId, "resolve", { justification: "matched after recheck" });
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.justification, "matched after recheck");
  assert.deepEqual([...resolved.evidenceRefs], [...opened.evidenceRefs]);
  const closed = await evidence.transitionFinancialException(opened.exceptionId, "close");
  assert.equal(closed.status, "closed");
  assert.equal(typeof closed.closedAt, "number");
  const stillThere = await evidence.getFinancialException(opened.exceptionId);
  assert.equal(stillThere?.status, "closed");
});
