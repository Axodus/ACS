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
    mode: "axodus-managed",
    assetCode: "NEURONS",
  };
}

test("matched settlement evidence does not create a mismatch", async () => {
  const economicService = new EconomicService({ policy: POLICY, settlementProvider: new InMemorySettlementProvider() });
  const quote = economicService.quote({
    quoteId: "quote_match",
    account: account(),
    planId: "plan_match",
    estimatedUsage: { compute: 2n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = economicService.reserve({
    reservationId: "res_match",
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_match",
    expiresAt: Date.now() + 60_000,
  });
  economicService.recordUsage({
    recordId: "usage_match",
    runId: "run_match",
    accountId: account().accountId,
    tenantId: "tenant-alpha",
    dimension: "compute",
    quantity: 2n,
    unit: "ms",
    source: "worker",
    observedAt: 100,
  });
  await economicService.settle({
    settlementId: "settle_match",
    reservationId: reservation.reservationId,
    runId: "run_match",
    idempotencyKey: "idem_settle_match",
  });
  const evidence = new OperationalEvidenceService({ economicService });
  const mismatches = await evidence.listReconciliationMismatches();
  assert.equal(mismatches.length, 0);
});

test("settlement without usage produces an inspectable usage correlation mismatch", async () => {
  const economicService = new EconomicService({ policy: POLICY, settlementProvider: new InMemorySettlementProvider() });
  const quote = economicService.quote({
    quoteId: "quote_mismatch",
    account: account(),
    planId: "plan_mismatch",
    estimatedUsage: { compute: 1n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = economicService.reserve({
    reservationId: "res_mismatch",
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_mismatch",
    expiresAt: Date.now() + 60_000,
  });
  const settled = await economicService.settle({
    settlementId: "settle_mismatch",
    reservationId: reservation.reservationId,
    runId: "run_mismatch",
    idempotencyKey: "idem_settle_mismatch",
  });
  const evidence = new OperationalEvidenceService({ economicService });
  const first = await evidence.listReconciliationMismatches();
  const second = await evidence.listReconciliationMismatches();
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0].mismatchId, second[0].mismatchId);
  assert.equal(first[0].classification, "usage_correlation_mismatch");
  assert.equal(first[0].severity, "error");
  assert.equal(first[0].settlementId, settled.settlementId);
  assert.equal(first[0].usageId, undefined);
  const missing = await evidence.getReconciliationMismatch("missing-mismatch");
  assert.equal(missing, undefined);
});
