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

function seedSettled(economicService, suffix = "1") {
  const quote = economicService.quote({
    quoteId: "quote_recon_" + suffix,
    account: account(),
    planId: "plan_recon_" + suffix,
    estimatedUsage: { compute: 2n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = economicService.reserve({
    reservationId: "res_recon_" + suffix,
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_recon_" + suffix,
    expiresAt: Date.now() + 60_000,
  });
  economicService.recordUsage({
    recordId: "usage_recon_" + suffix,
    runId: "run_recon_" + suffix,
    accountId: account().accountId,
    tenantId: "tenant-alpha",
    workloadId: "workload_recon",
    dimension: "compute",
    quantity: 2n,
    unit: "ms",
    source: "worker",
    observedAt: 100,
  });
  return economicService.settle({
    settlementId: "settle_recon_" + suffix,
    reservationId: reservation.reservationId,
    runId: "run_recon_" + suffix,
    idempotencyKey: "idem_settle_recon_" + suffix,
  });
}

test("reconciliation backlog is tenant-scoped, deterministic, and replay-safe", async () => {
  const economicService = new EconomicService({ policy: POLICY, settlementProvider: new InMemorySettlementProvider() });
  const settled = await seedSettled(economicService, "1");
  assert.equal(settled.status, "settled");
  const evidence = new OperationalEvidenceService({ economicService });
  const first = await evidence.listReconciliationBacklog();
  const second = await evidence.listReconciliationBacklog();
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0].reconciliationId, second[0].reconciliationId);
  assert.equal(first[0].settlementId, settled.settlementId);
  assert.equal(first[0].usageId, "usage_recon_1");
  assert.equal(first[0].state, "matched");
  assert.equal(first[0].mismatch, false);
  assert.equal(first[0].exceptionOpen, false);
  const missing = await evidence.getReconciliationItem("missing-recon");
  assert.equal(missing, undefined);
});

test("settlement without usage is a usage correlation mismatch", async () => {
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
  assert.equal(settled.status, "settled");
  const evidence = new OperationalEvidenceService({ economicService });
  const items = await evidence.listReconciliationBacklog({ settlementId: settled.settlementId });
  assert.equal(items.length, 1);
  assert.equal(items[0].state, "mismatched");
  assert.equal(items[0].mismatchClass, "usage_correlation_mismatch");
  assert.equal(items[0].operatorActionRequired, true);
});
