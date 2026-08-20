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
async function pendingException(suffix = "rem") {
  const evidence = await seedMismatch(suffix);
  const mismatch = (await evidence.listReconciliationMismatches())[0];
  const opened = await evidence.openFinancialException(mismatch.mismatchId, "operator-a");
  await evidence.transitionFinancialException(opened.exceptionId, "acknowledge", { actor: "operator-a" });
  await evidence.transitionFinancialException(opened.exceptionId, "review");
  const pending = await evidence.transitionFinancialException(opened.exceptionId, "remediate");
  return { evidence, pending, originalEvidence: [...pending.evidenceRefs] };
}

test("proven exception can enter remediation through valid lifecycle", async () => {
  const { evidence, pending } = await pendingException("enter");
  assert.equal(pending.status, "remediation_pending");
  const remediation = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_enter",
    actor: "operator-a",
  });
  assert.equal(remediation.status, "succeeded");
  assert.equal(remediation.exceptionId, pending.exceptionId);
});

test("supported reevaluation succeeds without erasing mismatch evidence", async () => {
  const { evidence, pending, originalEvidence } = await pendingException("reeval");
  const remediation = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_reeval",
  });
  const current = await evidence.getFinancialException(pending.exceptionId);
  assert.equal(remediation.status, "succeeded");
  assert.equal(current?.status, "remediation_pending");
  for (const ref of originalEvidence) assert.equal(current?.evidenceRefs.includes(ref), true);
  assert.equal(current?.evidenceRefs.includes(remediation.remediationId), true);
});

test("unauthorized remediation is rejected and leaves the exception intact", async () => {
  const { evidence, pending } = await pendingException("unauth");
  const remediation = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_unauth",
    authorized: false,
  });
  assert.equal(remediation.status, "rejected");
  assert.equal(remediation.authorizationOutcome, "denied");
  const current = await evidence.getFinancialException(pending.exceptionId);
  assert.equal(current?.status, "remediation_pending");
});

test("unsupported remediation is explicit and does not mutate economic truth", async () => {
  const { evidence, pending } = await pendingException("unsup");
  const remediation = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "RETRY_SETTLEMENT",
    idempotencyKey: "idem_unsup",
  });
  assert.equal(remediation.status, "unsupported");
  assert.equal(remediation.outcome, "UNSUPPORTED / REQUIRES_FUTURE_POLICY");
  const current = await evidence.getFinancialException(pending.exceptionId);
  assert.equal(current?.status, "remediation_pending");
});

test("invalid exception state and closed exceptions reject remediation", async () => {
  const evidence = await seedMismatch("invalid");
  const mismatch = (await evidence.listReconciliationMismatches())[0];
  const opened = await evidence.openFinancialException(mismatch.mismatchId);
  await assert.rejects(() => evidence.requestFinancialRemediation({
    exceptionId: opened.exceptionId,
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_open_state",
  }), /invalid financial exception state/);
  const { evidence: closing, pending } = await pendingException("closed");
  await closing.transitionFinancialException(pending.exceptionId, "reject", { justification: "no action" });
  await closing.transitionFinancialException(pending.exceptionId, "close");
  await assert.rejects(() => closing.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_closed",
  }), /financial exception is closed/);
});
test("tenant isolation hides remediations from another tenant query", async () => {
  const { evidence, pending } = await pendingException("tenant");
  await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_tenant",
  });
  const own = await evidence.listFinancialRemediations({ tenantId: "tenant-alpha" });
  const other = await evidence.listFinancialRemediations({ tenantId: "tenant-beta" });
  assert.equal(own.length, 1);
  assert.equal(other.length, 0);
});

test("same idempotency key replays the same remediation", async () => {
  const { evidence, pending } = await pendingException("replay");
  const first = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "RETRY_RECONCILIATION",
    idempotencyKey: "idem_replay",
  });
  const second = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "RETRY_RECONCILIATION",
    idempotencyKey: "idem_replay",
  });
  assert.equal(first.remediationId, second.remediationId);
  assert.equal(first.requestedAt, second.requestedAt);
  assert.equal((await evidence.listFinancialRemediations()).length, 1);
});

test("conflicting idempotency intent is rejected", async () => {
  const { evidence, pending } = await pendingException("conflict");
  await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_conflict",
  });
  await assert.rejects(() => evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "MARK_NO_ACTION",
    idempotencyKey: "idem_conflict",
    reason: "operator reviewed",
  }), /idempotency conflict/);
});

test("failed no-action without reason preserves original exception evidence", async () => {
  const { evidence, pending, originalEvidence } = await pendingException("fail");
  const remediation = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "MARK_NO_ACTION",
    idempotencyKey: "idem_fail",
  });
  assert.equal(remediation.status, "failed");
  const current = await evidence.getFinancialException(pending.exceptionId);
  assert.equal(current?.status, "remediation_pending");
  for (const ref of originalEvidence) assert.equal(current?.evidenceRefs.includes(ref), true);
});

test("successful no-action produces evidence and rejects only with justification", async () => {
  const { evidence, pending } = await pendingException("noact");
  const remediation = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "MARK_NO_ACTION",
    idempotencyKey: "idem_noact",
    actor: "operator-a",
    reason: "operator reviewed residual mismatch",
  });
  assert.equal(remediation.status, "succeeded");
  assert.equal(remediation.resultingExceptionStatus, "rejected");
  const current = await evidence.getFinancialException(pending.exceptionId);
  assert.equal(current?.status, "rejected");
  assert.equal(current?.evidenceRefs.includes(remediation.remediationId), true);
});

test("resolution occurs only when mismatch is no longer proven", async () => {
  const { evidence, pending } = await pendingException("still");
  const stillMismatched = await evidence.requestFinancialRemediation({
    exceptionId: pending.exceptionId,
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_still",
  });
  assert.equal(stillMismatched.resultingExceptionStatus, "remediation_pending");
  const current = await evidence.getFinancialException(pending.exceptionId);
  assert.equal(current?.status, "remediation_pending");
});

test("missing exception cannot be remediated", async () => {
  const evidence = await seedMismatch("missing");
  await assert.rejects(() => evidence.requestFinancialRemediation({
    exceptionId: "exc_missing",
    action: "REEVALUATE_MISMATCH",
    idempotencyKey: "idem_missing",
  }), /financial exception not found/);
});
