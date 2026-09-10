import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { EconomicService, InMemorySettlementProvider, SqliteEconomicStateStore, createAcsAuthContext, createControlPlaneContext, routeProductApiRequest } from "../dist/index.js";

const POLICY = { policyId: "pricing.e16-02", revision: 1, pricing: { compute: 1n } };

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() { return { identity: this.identity, status: "ready", supportedProtocols: [], operations: [] }; },
    async listExecutionTargets() { return []; },
    async close() {},
  };
}

function quote(service, tenantId = "tenant-e16-02") {
  return service.quote({
    quoteId: "quote-e16-02",
    account: { accountId: tenantId + "-account", ownerId: tenantId, tenantId, mode: "axodus-managed", assetCode: "NEURONS" },
    planId: "plan-e16-02",
    estimatedUsage: { compute: 1n },
    expiresAt: Date.now() + 60_000,
  });
}

function jsonRequest(payload) {
  const body = JSON.stringify(payload);
  return { method: "POST", url: "", headers: { "content-type": "application/json" }, on(event, callback) {
    if (event === "data") callback(body);
    if (event === "end") callback();
  } };
}

function auth(tenantId = "tenant-e16-02") {
  return createAcsAuthContext({ mode: "mock", actorType: "system", actorId: "operator-e16-02", tenantId, authenticated: true, trusted: true, platformAdmin: true });
}

test("AEES-16-02 services preserve durable authorization, reservation, and release idempotency", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "acs-e16-02-"));
  const store = new SqliteEconomicStateStore({ filePath: path.join(root, "economic.sqlite") });
  const provider = new InMemorySettlementProvider();
  const first = new EconomicService({ policy: POLICY, store, settlementProvider: provider, tenantId: "tenant-e16-02" });
  const second = new EconomicService({ policy: POLICY, store, settlementProvider: provider, tenantId: "tenant-e16-02" });
  try {
    const seeded = quote(first);
    const authorization = first.authorize({ decisionId: "decision-e16-02", economicOperationId: "operation-e16-02", idempotencyKey: "authorize-e16-02", authorizationEffect: "allowed", decisionCode: "ALLOWED", reasons: ["test"], quoteId: seeded.quoteId, executionRunId: "run-e16-02", workloadId: "workload-e16-02", auditCorrelation: "corr-authorize" });
    const replay = second.authorize({ decisionId: "ignored", economicOperationId: "operation-e16-02", idempotencyKey: "authorize-e16-02", authorizationEffect: "allowed", decisionCode: "ALLOWED", reasons: ["test"], quoteId: seeded.quoteId, executionRunId: "run-e16-02", workloadId: "workload-e16-02", auditCorrelation: "corr-authorize-replay" });
    assert.equal(authorization.decisionId, replay.decisionId);
    const reservation = first.reserve({ reservationId: "reservation-e16-02", quoteId: seeded.quoteId, idempotencyKey: "reserve-e16-02", authorizationDecisionId: authorization.decisionId, executionRunId: "run-e16-02", workloadId: "workload-e16-02", expiresAt: Date.now() + 60_000 });
    const reservationReplay = second.reserve({ reservationId: "ignored", quoteId: seeded.quoteId, idempotencyKey: "reserve-e16-02", authorizationDecisionId: authorization.decisionId, executionRunId: "run-e16-02", workloadId: "workload-e16-02", expiresAt: Date.now() + 60_000 });
    assert.equal(reservation.reservationId, reservationReplay.reservationId);
    assert.equal(first.release({ reservationId: reservation.reservationId, reason: "operator release" }).status, "released");
    assert.equal(second.release({ reservationId: reservation.reservationId, reason: "operator release replay" }).status, "released");
  } finally {
    store.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("AEES-16-02 Product API uses the canonical control-plane context export", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "acs-e16-02-api-"));
  const context = createControlPlaneContext({ tenantId: "tenant-e16-02", workloadId: "workload-e16-02", engine: createMockEngine(), startLocalWorker: false, economicStatePath: path.join(root, "economic.sqlite") });
  try {
    context.tenantGovernanceService.replacePolicy({
      tenantId: "tenant-e16-02",
      authority: { kind: "platform_admin", principalId: "system" },
      policyId: "policy-e16-02",
      defaultEffect: "allow",
      rules: [],
      at: 100,
      actor: "system",
      reason: "authorize economic lifecycle acceptance",
      provenance: "test",
    });
    const seeded = quote(context.economicService);
    const authorization = await routeProductApiRequest(jsonRequest({ economicOperationId: "operation-e16-02", quoteId: seeded.quoteId, idempotencyKey: "api-authorize-e16-02", executionRunId: "run-e16-02", workloadId: "workload-e16-02" }), "/api/v1/economics/authorizations", context, { correlationId: "corr-api-authorize", auth: auth() });
    assert.equal(authorization.status, 201);
    const authorizationReplay = await routeProductApiRequest(jsonRequest({ economicOperationId: "operation-e16-02", quoteId: seeded.quoteId, idempotencyKey: "api-authorize-e16-02", executionRunId: "run-e16-02", workloadId: "workload-e16-02" }), "/api/v1/economics/authorizations", context, { correlationId: "corr-api-authorize-replay", auth: auth() });
    assert.equal(authorizationReplay.body.data.decisionId, authorization.body.data.decisionId);
    const reservation = await routeProductApiRequest(jsonRequest({ economicOperationId: "operation-e16-02", quoteId: seeded.quoteId, authorizationDecisionId: authorization.body.data.decisionId, idempotencyKey: "api-reserve-e16-02", executionRunId: "run-e16-02", workloadId: "workload-e16-02" }), "/api/v1/economics/reservations", context, { correlationId: "corr-api-reserve", auth: auth() });
    assert.equal(reservation.status, 201);
    const reservationReplay = await routeProductApiRequest(jsonRequest({ economicOperationId: "operation-e16-02", quoteId: seeded.quoteId, authorizationDecisionId: authorization.body.data.decisionId, idempotencyKey: "api-reserve-e16-02", executionRunId: "run-e16-02", workloadId: "workload-e16-02" }), "/api/v1/economics/reservations", context, { correlationId: "corr-api-reserve-replay", auth: auth() });
    assert.equal(reservationReplay.body.data.reservationId, reservation.body.data.reservationId);
    const releasePath = "/api/v1/economics/reservations/" + reservation.body.data.reservationId + "/release";
    assert.equal((await routeProductApiRequest(jsonRequest({ reason: "operator release", idempotencyKey: "api-release-e16-02" }), releasePath, context, { correlationId: "corr-api-release", auth: auth() })).status, 200);
    assert.equal((await routeProductApiRequest(jsonRequest({ reason: "operator release", idempotencyKey: "api-release-e16-02" }), releasePath, context, { correlationId: "corr-api-release-replay", auth: auth() })).status, 200);
    const missingQuote = await routeProductApiRequest(jsonRequest({ economicOperationId: "operation-missing", quoteId: "missing-quote", idempotencyKey: "api-missing-e16-02" }), "/api/v1/economics/authorizations", context, { correlationId: "corr-api-missing", auth: auth() });
    assert.equal(missingQuote.status, 503);

    context.tenantGovernanceService.grantEntitlement({ tenantId: "tenant-e16-02", authority: { kind: "platform_admin", principalId: "system" }, entitlementKey: "economic.operations", enabled: true, at: 110, actor: "system", reason: "test", provenance: "test" });
    context.tenantGovernanceService.setLimit({ tenantId: "tenant-e16-02", authority: { kind: "platform_admin", principalId: "system" }, limitKey: "max_agents", value: 1, at: 120, actor: "system", reason: "test", provenance: "test" });
    const limitDenied = await routeProductApiRequest(jsonRequest({ economicOperationId: "operation-limit", quoteId: seeded.quoteId, idempotencyKey: "api-limit-e16-02", entitlementKey: "economic.operations", limitKey: "max_agents", requestedAmount: 2 }), "/api/v1/economics/authorizations", context, { correlationId: "corr-api-limit", auth: auth() });
    assert.equal(limitDenied.status, 429);
    context.tenantGovernanceService.revokeEntitlement({ tenantId: "tenant-e16-02", authority: { kind: "platform_admin", principalId: "system" }, entitlementKey: "economic.operations", enabled: false, at: 130, actor: "system", reason: "test", provenance: "test" });
    const entitlementDenied = await routeProductApiRequest(jsonRequest({ economicOperationId: "operation-entitlement", quoteId: seeded.quoteId, idempotencyKey: "api-entitlement-e16-02", entitlementKey: "economic.operations" }), "/api/v1/economics/authorizations", context, { correlationId: "corr-api-entitlement", auth: auth() });
    assert.equal(entitlementDenied.status, 403);
    const crossTenant = await routeProductApiRequest(jsonRequest({ economicOperationId: "operation-cross", quoteId: seeded.quoteId, idempotencyKey: "api-cross-e16-02" }), "/api/v1/economics/authorizations", context, { correlationId: "corr-api-cross", auth: createAcsAuthContext({ mode: "mock", actorType: "user", actorId: "other", tenantId: "tenant-other", authenticated: true, trusted: true }) });
    assert.equal(crossTenant.status, 403);
  } finally {
    await context.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
