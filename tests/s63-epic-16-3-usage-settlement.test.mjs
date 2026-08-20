import assert from "node:assert/strict";
import test from "node:test";
import { EconomicService, InMemorySettlementProvider } from "../dist/index.js";
import { OperationalEvidenceService } from "../dist/control-plane/operational-evidence-service.js";

const POLICY = {
  policyId: "pricing.default",
  revision: 1,
  pricing: {
    "compute": 5n,
    "network": 17n,
    "tools": 13n,
  },
};

function account(tenantId = "tenant-alpha") {
  return {
    accountId: tenantId + "-acct",
    ownerId: tenantId,
    mode: "axodus-managed",
    assetCode: "NEURONS",
  };
}

test("usage records are canonical, deduplicated, and execution-correlated", async () => {
  const economicService = new EconomicService({ policy: POLICY, settlementProvider: new InMemorySettlementProvider() });
  const quote = economicService.quote({
    quoteId: "quote_usage_1",
    account: account(),
    planId: "plan_usage_1",
    estimatedUsage: { compute: 2n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = economicService.reserve({
    reservationId: "res_usage_1",
    quoteId: quote.quoteId,
    idempotencyKey: "idem_res_usage_1",
    expiresAt: Date.now() + 60_000,
  });

  economicService.recordUsage({
    recordId: "usage_1",
    runId: "run_usage_1",
    accountId: account().accountId,
    tenantId: "tenant-alpha",
    workloadId: "workload_1",
    dimension: "compute",
    quantity: 2n,
    unit: "ms",
    source: "worker",
    observedAt: 100,
  });
  economicService.recordUsage({
    recordId: "usage_1",
    runId: "run_usage_1",
    accountId: account().accountId,
    tenantId: "tenant-alpha",
    workloadId: "workload_1",
    dimension: "compute",
    quantity: 2n,
    unit: "ms",
    source: "worker",
    observedAt: 100,
  });

  const settled = await economicService.settle({
    settlementId: "settle_usage_1",
    reservationId: reservation.reservationId,
    runId: "run_usage_1",
    idempotencyKey: "idem_settle_usage_1",
  });
  assert.equal(settled.status, "settled");

  const evidence = new OperationalEvidenceService({
    economicService,
    runtimeService: {
      listExecutionRuns() {
        return [{
          runId: "run_usage_1",
          runtimeInstanceId: "runtime_1",
          agentId: "agent_1",
          executionPlanId: "plan_1",
          status: "completed",
          startedAt: 50,
        }];
      },
      listRuntimes() {
        return [{
          runtimeInstanceId: "runtime_1",
          deploymentId: "deployment_1",
          targetId: "target_1",
          deploymentMode: "managed",
          status: "running",
          startedAt: 40,
          updatedAt: 50,
        }];
      },
    },
  });

  const usage = await evidence.listUsageRecords();
  assert.equal(usage.length, 1);
  assert.equal(usage[0].usageId, "usage_1");
  assert.equal(usage[0].executionRunId, "run_usage_1");
  assert.equal(usage[0].runtimeId, "runtime_1");
  assert.equal(usage[0].agentId, "agent_1");
  assert.equal(usage[0].deploymentId, "deployment_1");
  assert.equal(usage[0].reservationId, reservation.reservationId);
  assert.equal(usage[0].quoteId, quote.quoteId);
  assert.equal(usage[0].settlementId, settled.settlementId);
  assert.equal(usage[0].measurementState, "observed");
  assert.equal(usage[0].settlementState, "settled");
  assert.equal(usage[0].status, "settled");
  assert.equal(usage[0].pricingState, "available");
  assert.equal(usage[0].pricingProvenance?.startsWith(quote.quoteId), true);

  const usageById = await evidence.getUsageRecord("usage_1");
  assert.equal(usageById?.usageId, "usage_1");

  const usageByRun = await evidence.getExecutionRunUsage("run_usage_1");
  assert.equal(usageByRun.length, 1);

  const missing = await evidence.getUsageRecord("missing-usage");
  assert.equal(missing, undefined);
});
