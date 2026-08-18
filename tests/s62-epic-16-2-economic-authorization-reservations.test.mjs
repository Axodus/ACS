import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EconomicService,
  InMemorySettlementProvider,
  SqliteEconomicStateStore,
  createAcsAuthContext,
  createControlPlaneContext,
  routeProductApiRequest,
} from "../dist/index.js";

function createMockEngine() {
  return {
    runtime: "test",
    async sendEvent() {},
    async persistEvent() {},
    async recordAuditEvent() {},
  };
}

function economicPolicy() {
  return {
    name: "economic-operations",
    grants: [
      { action: "economic.authorize", effect: "allow" },
      { action: "economic.reserve", effect: "allow" },
      { action: "economic.release", effect: "allow" },
    ],
  };
}

async function seededQuote(service, overrides = {}) {
  const quote = {
    tenantId: "tenant-e16-02",
    quoteId: "quote-e16-02",
    operationId: "operation-e16-02",
    amount: 1,
    unit: "agent",
    pricingModel: "unit-test",
    source: "economic.quote",
    sourceVersion: "1",
    effectiveAt: new Date("2026-08-18T00:00:00.000Z").toISOString(),
    ...overrides,
  };
  await service.recordQuote(quote);
  return quote;
}

async function post(context, pathName, payload, correlationId, auth) {
  return routeProductApiRequest(
    context,
    new Request("http://localhost" + pathName, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify(payload),
    }),
    auth ?? createAcsAuthContext({
      tenantId: payload.tenantId || "tenant-e16-02",
      actorId: "operator-e16-02",
      role: "platform_admin",
      permissions: ["economic.operations", "governance.manage"],
    }),
  );
}

test("AEES-16-02 services persist idempotent decisions, reservations, and releases across shared state", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "acs-e16-02-"));
  const store = new SqliteEconomicStateStore(path.join(tempDir, "economic.sqlite"));
  const settlementProvider = new InMemorySettlementProvider();
  const serviceA = new EconomicService({ stateStore: store, settlementProvider, auditSink: createMockEngine() });
  const serviceB = new EconomicService({ stateStore: store, settlementProvider, auditSink: createMockEngine() });

  await seededQuote(serviceA);

  const authDecision = await serviceA.authorize({
    tenantId: "tenant-e16-02",
    economicOperationId: "operation-e16-02",
    amount: 1,
    unit: "agent",
    quoteId: "quote-e16-02",
    governanceContext: { policy: "economic-operations" },
    entitlementContext: { entitlementIds: ["economic.operations"] },
    limitContext: { scopes: ["max_agents"] },
    correlationId: "corr-auth",
    auditCorrelationId: "audit-auth",
    idempotencyKey: "idem-auth",
    actorId: "operator-e16-02",
    workloadId: "workload-e16-02",
    executionRunId: "run-e16-02",
  });

  const authReplay = await serviceB.authorize({
    tenantId: "tenant-e16-02",
    economicOperationId: "operation-e16-02",
    amount: 1,
    unit: "agent",
    quoteId: "quote-e16-02",
    governanceContext: { policy: "economic-operations" },
    entitlementContext: { entitlementIds: ["economic.operations"] },
    limitContext: { scopes: ["max_agents"] },
    correlationId: "corr-auth-replay",
    auditCorrelationId: "audit-auth-replay",
    idempotencyKey: "idem-auth",
    actorId: "operator-e16-02",
    workloadId: "workload-e16-02",
    executionRunId: "run-e16-02",
  });

  assert.equal(authDecision.decisionId, authReplay.decisionId);
  assert.equal(authDecision.effect, "allowed");

  const reservation = await serviceA.reserve({
    tenantId: "tenant-e16-02",
    economicOperationId: "operation-e16-02",
    amount: 1,
    unit: "agent",
    quoteId: "quote-e16-02",
    authorizationDecisionId: authDecision.decisionId,
    correlationId: "corr-reserve",
    auditCorrelationId: "audit-reserve",
    idempotencyKey: "idem-reserve",
    actorId: "operator-e16-02",
    workloadId: "workload-e16-02",
    executionRunId: "run-e16-02",
  });

  const reservationReplay = await serviceB.reserve({
    tenantId: "tenant-e16-02",
    economicOperationId: "operation-e16-02",
    amount: 1,
    unit: "agent",
    quoteId: "quote-e16-02",
    authorizationDecisionId: authDecision.decisionId,
    correlationId: "corr-reserve-replay",
    auditCorrelationId: "audit-reserve-replay",
    idempotencyKey: "idem-reserve",
    actorId: "operator-e16-02",
    workloadId: "workload-e16-02",
    executionRunId: "run-e16-02",
  });

  assert.equal(reservation.reservationId, reservationReplay.reservationId);
  assert.equal(reservation.status, "reserved");

  const release = await serviceA.release({
    tenantId: "tenant-e16-02",
    reservationId: reservation.reservationId,
    reason: "operator release",
    correlationId: "corr-release",
    auditCorrelationId: "audit-release",
    idempotencyKey: "idem-release",
    actorId: "operator-e16-02",
  });

  const releaseReplay = await serviceB.release({
    tenantId: "tenant-e16-02",
    reservationId: reservation.reservationId,
    reason: "operator release",
    correlationId: "corr-release-replay",
    auditCorrelationId: "audit-release-replay",
    idempotencyKey: "idem-release",
    actorId: "operator-e16-02",
  });

  assert.equal(release.reservationId, releaseReplay.reservationId);
  assert.equal(release.status, "released");
  assert.equal(release.tenantId, "tenant-e16-02");
});

test("AEES-16-02 product API enforces governance, entitlements, limits, tenant isolation, and dependency errors", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "acs-e16-02-api-"));
  const context = createControlPlaneContext({
    tenantId: "tenant-e16-02",
    workloadId: "workload-e16-02",
    engine: createMockEngine(),
    startLocalWorker: false,
    dataDir: tempDir,
  });

  await context.governanceService.replacePolicy("tenant-e16-02", economicPolicy());
  await context.governanceService.grantEntitlement("tenant-e16-02", "economic.operations");
  await context.governanceService.setLimit("tenant-e16-02", "max_agents", 1);

  const seeded = await seededQuote(context.economicService);

  const authAllowed = await post(
    context,
    "/api/v1/economics/authorizations",
    {
      tenantId: "tenant-e16-02",
      economicOperationId: "operation-e16-02",
      amount: 1,
      unit: "agent",
      quoteId: seeded.quoteId,
      governanceContext: { policy: "economic-operations" },
      entitlementContext: { entitlementIds: ["economic.operations"] },
      limitContext: { scopes: ["max_agents"] },
      idempotencyKey: "idem-api-auth",
      actorId: "operator-e16-02",
      workloadId: "workload-e16-02",
      executionRunId: "run-e16-02",
    },
    "corr-api-auth",
  );
  assert.equal(authAllowed.status, 201);

  const authReplay = await post(
    context,
    "/api/v1/economics/authorizations",
    {
      tenantId: "tenant-e16-02",
      economicOperationId: "operation-e16-02",
      amount: 1,
      unit: "agent",
      quoteId: seeded.quoteId,
      governanceContext: { policy: "economic-operations" },
      entitlementContext: { entitlementIds: ["economic.operations"] },
      limitContext: { scopes: ["max_agents"] },
      idempotencyKey: "idem-api-auth",
      actorId: "operator-e16-02",
      workloadId: "workload-e16-02",
      executionRunId: "run-e16-02",
    },
    "corr-api-auth-replay",
  );
  assert.equal(authReplay.status, 201);

  const allowedBody = await authAllowed.json();

  const reserveAllowed = await post(
    context,
    "/api/v1/economics/reservations",
    {
      tenantId: "tenant-e16-02",
      economicOperationId: "operation-e16-02",
      amount: 1,
      unit: "agent",
      quoteId: seeded.quoteId,
      authorizationDecisionId: allowedBody.decisionId,
      idempotencyKey: "idem-api-reserve",
      actorId: "operator-e16-02",
      workloadId: "workload-e16-02",
      executionRunId: "run-e16-02",
    },
    "corr-api-reserve",
  );
  assert.equal(reserveAllowed.status, 201);

  const reserveReplay = await post(
    context,
    "/api/v1/economics/reservations",
    {
      tenantId: "tenant-e16-02",
      economicOperationId: "operation-e16-02",
      amount: 1,
      unit: "agent",
      quoteId: seeded.quoteId,
      authorizationDecisionId: allowedBody.decisionId,
      idempotencyKey: "idem-api-reserve",
      actorId: "operator-e16-02",
      workloadId: "workload-e16-02",
      executionRunId: "run-e16-02",
    },
    "corr-api-reserve-replay",
  );
  assert.equal(reserveReplay.status, 201);

  const reservationBody = await reserveAllowed.json();

  const releaseAllowed = await post(
    context,
    "/api/v1/economics/reservations/" + reservationBody.reservationId + "/release",
    {
      tenantId: "tenant-e16-02",
      reservationId: reservationBody.reservationId,
      reason: "operator release",
      idempotencyKey: "idem-api-release",
      actorId: "operator-e16-02",
    },
    "corr-api-release",
  );
  assert.equal(releaseAllowed.status, 200);

  const releaseReplay = await post(
    context,
    "/api/v1/economics/reservations/" + reservationBody.reservationId + "/release",
    {
      tenantId: "tenant-e16-02",
      reservationId: reservationBody.reservationId,
      reason: "operator release",
      idempotencyKey: "idem-api-release",
      actorId: "operator-e16-02",
    },
    "corr-api-release-replay",
  );
  assert.equal(releaseReplay.status, 200);

  const limitDenied = await post(
    context,
    "/api/v1/economics/authorizations",
    {
      tenantId: "tenant-e16-02",
      economicOperationId: "operation-e16-02-limit",
      amount: 2,
      unit: "agent",
      quoteId: seeded.quoteId,
      governanceContext: { policy: "economic-operations" },
      entitlementContext: { entitlementIds: ["economic.operations"] },
      limitContext: { scopes: ["max_agents"] },
      idempotencyKey: "idem-limit",
      actorId: "operator-e16-02",
      workloadId: "workload-e16-02",
      executionRunId: "run-e16-02",
    },
    "corr-limit",
  );
  assert.equal(limitDenied.status, 429);

  await context.governanceService.revokeEntitlement("tenant-e16-02", "economic.operations");
  const entitlementDenied = await post(
    context,
    "/api/v1/economics/authorizations",
    {
      tenantId: "tenant-e16-02",
      economicOperationId: "operation-e16-02-no-entitlement",
      amount: 1,
      unit: "agent",
      quoteId: seeded.quoteId,
      governanceContext: { policy: "economic-operations" },
      entitlementContext: { entitlementIds: ["economic.operations"] },
      limitContext: { scopes: ["max_agents"] },
      idempotencyKey: "idem-entitlement",
      actorId: "operator-e16-02",
      workloadId: "workload-e16-02",
      executionRunId: "run-e16-02",
    },
    "corr-entitlement",
  );
  assert.equal(entitlementDenied.status, 403);

  const crossTenant = await post(
    context,
    "/api/v1/economics/authorizations",
    {
      tenantId: "tenant-other",
      economicOperationId: "operation-cross-tenant",
      amount: 1,
      unit: "agent",
      quoteId: seeded.quoteId,
      governanceContext: { policy: "economic-operations" },
      entitlementContext: { entitlementIds: ["economic.operations"] },
      limitContext: { scopes: ["max_agents"] },
      idempotencyKey: "idem-cross",
      actorId: "operator-e16-02",
      workloadId: "workload-e16-02",
      executionRunId: "run-e16-02",
    },
    "corr-cross",
    createAcsAuthContext({
      tenantId: "tenant-e16-02",
      actorId: "operator-e16-02",
      role: "platform_admin",
      permissions: ["economic.operations"],
    }),
  );
  assert.equal(crossTenant.status, 403);

  const dependencyUnavailable = await post(
    context,
    "/api/v1/economics/authorizations",
    {
      tenantId: "tenant-e16-02",
      economicOperationId: "operation-missing-quote",
      amount: 1,
      unit: "agent",
      quoteId: "missing-quote",
      governanceContext: { policy: "economic-operations" },
      entitlementContext: { entitlementIds: ["economic.operations"] },
      limitContext: { scopes: ["max_agents"] },
      idempotencyKey: "idem-missing-quote",
      actorId: "operator-e16-02",
      workloadId: "workload-e16-02",
      executionRunId: "run-e16-02",
    },
    "corr-missing-quote",
  );
  assert.equal(dependencyUnavailable.status, 503);
});
