import assert from "node:assert/strict";
import test from "node:test";
import {
  EconomicService,
  InMemorySettlementProvider,
  NeuronsAmount,
} from "../dist/index.js";

const POLICY = {
  policyId: "pricing.default",
  revision: 1,
  pricing: {
    "llm.inference": 2n,
    "agent.runtime": 3n,
    "compute": 5n,
    "memory": 7n,
    "storage": 11n,
    "tools": 13n,
    "network": 17n,
    "premium.capability": 19n,
    "scheduled.execution": 23n,
    "autonomous.duration": 29n,
  },
};

function account(mode) {
  return {
    accountId: "acct_1",
    ownerId: "tenant-alpha",
    mode,
    assetCode: "NEURONS",
  };
}

test("NeuronsAmount uses exact arithmetic", () => {
  const a = new NeuronsAmount(10n);
  const b = new NeuronsAmount(3n);
  assert.equal(a.add(b).toJSON(), "13");
  assert.equal(a.subtract(b).toJSON(), "7");
  assert.equal(a.equals(new NeuronsAmount("10")), true);
});

test("quote -> reserve -> meter -> settle -> receipt lifecycle is represented", async () => {
  const service = new EconomicService({ policy: POLICY, settlementProvider: new InMemorySettlementProvider() });
  const quote = service.quote({
    quoteId: "quote_1",
    account: account("axodus-managed"),
    planId: "plan_1",
    estimatedUsage: { "llm.inference": 10n, "agent.runtime": 2n },
    expiresAt: 100,
  });
  assert.equal(quote.total.toJSON(), "26");

  const reservation = service.reserve({
    reservationId: "res_1",
    quoteId: quote.quoteId,
    idempotencyKey: "idem_1",
    expiresAt: 100,
  });
  assert.equal(reservation.reserved.toJSON(), "26");

  service.recordUsage({
    recordId: "usage_1",
    runId: "run_1",
    accountId: "acct_1",
    dimension: "llm.inference",
    quantity: 8n,
    unit: "token-batch",
    source: "provider",
    observedAt: 10,
  });
  const settlement = await service.settle({
    settlementId: "settle_1",
    reservationId: reservation.reservationId,
    runId: "run_1",
    idempotencyKey: "idem_settle_1",
  });
  assert.equal(settlement.totalCharged.toJSON(), "16");

  const receipt = service.receipt("run_1");
  assert.equal(receipt.totalReleased.toJSON(), "10");
  assert.equal(receipt.totalCharged.toJSON(), "16");
});

test("BYOK and BYOS retain different billing responsibility from Axodus Managed", () => {
  const service = new EconomicService({ policy: POLICY });
  const managed = service.quote({
    quoteId: "q_managed",
    account: account("axodus-managed"),
    planId: "plan_managed",
    estimatedUsage: { "llm.inference": 1n },
    expiresAt: 1,
  });
  const byok = service.quote({
    quoteId: "q_byok",
    account: account("byok"),
    planId: "plan_byok",
    estimatedUsage: { "agent.runtime": 1n },
    expiresAt: 1,
  });
  const byos = service.quote({
    quoteId: "q_byos",
    account: account("byos"),
    planId: "plan_byos",
    estimatedUsage: { "tools": 1n },
    expiresAt: 1,
  });

  assert.equal(managed.mode, "axodus-managed");
  assert.equal(byok.mode, "byok");
  assert.equal(byos.mode, "byos");
});

test("reservations and settlements are idempotent and protect against double settlement", async () => {
  const service = new EconomicService({ policy: POLICY });
  const quote = service.quote({
    quoteId: "quote_2",
    account: account("byok"),
    planId: "plan_2",
    estimatedUsage: { "compute": 2n },
    expiresAt: 100,
  });
  const reservationA = service.reserve({
    reservationId: "res_2",
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_2",
    expiresAt: 100,
  });
  const reservationB = service.reserve({
    reservationId: "res_ignored",
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_2",
    expiresAt: 100,
  });
  assert.equal(reservationA.reservationId, reservationB.reservationId);

  service.recordUsage({
    recordId: "usage_2",
    runId: "run_2",
    accountId: "acct_1",
    dimension: "compute",
    quantity: 2n,
    unit: "ms",
    source: "worker",
    observedAt: 10,
  });

  const settledA = await service.settle({
    settlementId: "settle_2",
    reservationId: reservationA.reservationId,
    runId: "run_2",
    idempotencyKey: "idem_settle_2",
  });
  const settledB = await service.settle({
    settlementId: "settle_ignored",
    reservationId: reservationA.reservationId,
    runId: "run_2",
    idempotencyKey: "idem_settle_2",
  });
  assert.equal(settledA.settlementId, settledB.settlementId);
});

test("economic records stay secret-free", async () => {
  const service = new EconomicService({ policy: POLICY });
  const quote = service.quote({
    quoteId: "quote_3",
    account: account("byos"),
    planId: "plan_3",
    estimatedUsage: { "tools": 2n },
    expiresAt: 10,
  });
  const reservation = service.reserve({
    reservationId: "res_3",
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_3",
    expiresAt: 10,
  });
  service.recordUsage({
    recordId: "usage_3",
    runId: "run_3",
    accountId: "acct_1",
    dimension: "tools",
    quantity: 2n,
    unit: "invocation",
    source: "runner",
    observedAt: 5,
    metadata: { credentialConnectionId: "cred_ok", upstreamSecret: "[redacted-not-allowed]" },
  });
  await service.settle({
    settlementId: "settle_3",
    reservationId: reservation.reservationId,
    runId: "run_3",
    idempotencyKey: "idem_settle_3",
  });
  const serialized = JSON.stringify(service.receipt("run_3"));
  assert.equal(serialized.includes("secret"), false);
});
