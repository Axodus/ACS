import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildProviderBoundary } from "../dist/control-plane/provider-boundary.js";
import {
  EconomicIdempotencyConflictError,
  EconomicPersistenceError,
  EconomicService,
} from "../dist/control-plane/neurons-economic-contract.js";
import {
  SqliteEconomicStateStore,
  SqliteSettlementProvider,
} from "../dist/control-plane/durable-economic-state.js";
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

function seedLifecycle(service, suffix = "a", tenantId = "tenant-alpha", withUsage = true) {
  const quote = service.quote({
    quoteId: "quote-" + suffix,
    account: account(tenantId),
    planId: "plan-" + suffix,
    estimatedUsage: { compute: 2n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = service.reserve({
    reservationId: "reservation-" + suffix,
    quoteId: quote.quoteId,
    idempotencyKey: "reserve-key-" + suffix,
    expiresAt: Date.now() + 60_000,
  });
  if (withUsage) {
    service.recordUsage({
      recordId: "usage-" + suffix,
      runId: "run-" + suffix,
      accountId: quote.accountId,
      tenantId,
      dimension: "compute",
      quantity: 2n,
      unit: "unit",
      source: "test",
      observedAt: 100,
    });
  }
  return { quote, reservation };
}

async function withDurableFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "acs-s73-"));
  const storePath = join(root, "economic.sqlite");
  const providerPath = join(root, "settlement.sqlite");
  const store = new SqliteEconomicStateStore({ filePath: storePath });
  const provider = new SqliteSettlementProvider({ filePath: providerPath });
  const service = new EconomicService({
    policy: POLICY,
    store,
    settlementProvider: provider,
    tenantId: "tenant-alpha",
  });
  try {
    return await callback({ root, storePath, providerPath, store, provider, service });
  } finally {
    closeIfOpen(store);
    closeIfOpen(provider);
    await rm(root, { recursive: true, force: true });
  }
}

function closeIfOpen(database) {
  try {
    database.close();
  } catch (error) {
    if (error?.code !== "ERR_INVALID_STATE") throw error;
  }
}

test("same idempotency key replays the same settlement and conflicting replay is rejected", async () => {
  await withDurableFixture(async ({ service }) => {
    const { reservation } = seedLifecycle(service, "replay");

    const first = await service.settle({
      settlementId: "settlement-replay",
      reservationId: reservation.reservationId,
      runId: "run-replay",
      idempotencyKey: "settlement-key-replay",
    });
    const second = await service.settle({
      settlementId: "settlement-replay-ignored",
      reservationId: reservation.reservationId,
      runId: "run-replay",
      idempotencyKey: "settlement-key-replay",
    });

    assert.equal(first.settlementId, second.settlementId);
    assert.equal(service.listSettlements().length, 1);
    await assert.rejects(
      () => service.settle({
        settlementId: "settlement-conflict",
        reservationId: "reservation-replay",
        runId: "run-replay-different",
        idempotencyKey: "settlement-key-replay",
      }),
      EconomicIdempotencyConflictError,
    );
  });
});

test("tenant isolation preserves replay identity across the same shared store", async () => {
  await withDurableFixture(async ({ storePath, providerPath, service: alphaService }) => {
    seedLifecycle(alphaService, "tenant-alpha", "tenant-alpha", true);
    await alphaService.settle({
      settlementId: "settlement-tenant-alpha",
      reservationId: "reservation-tenant-alpha",
      runId: "run-tenant-alpha",
      idempotencyKey: "shared-idempotency-key",
    });

    const betaStore = new SqliteEconomicStateStore({ filePath: storePath });
    const betaProvider = new SqliteSettlementProvider({ filePath: providerPath });
    const betaService = new EconomicService({
      policy: POLICY,
      store: betaStore,
      settlementProvider: betaProvider,
      tenantId: "tenant-beta",
    });
    try {
      seedLifecycle(betaService, "tenant-beta", "tenant-beta", true);
      const beta = await betaService.settle({
        settlementId: "settlement-tenant-beta",
        reservationId: "reservation-tenant-beta",
        runId: "run-tenant-beta",
        idempotencyKey: "shared-idempotency-key",
      });

      assert.equal(betaService.listSettlements().length, 1);
      assert.equal(alphaService.listSettlements().length, 1);
      assert.equal(alphaService.listSettlements()[0].settlementId, "settlement-tenant-alpha");
      assert.equal(beta.settlementId, "settlement-tenant-beta");
    } finally {
      betaStore.close();
      betaProvider.close();
    }
  });
});

test("shared-state reload preserves settlement and receipt identity", async () => {
  await withDurableFixture(async ({ storePath, providerPath, store, provider, service }) => {
    const { reservation } = seedLifecycle(service, "reload");
    const settled = await service.settle({
      settlementId: "settlement-reload",
      reservationId: reservation.reservationId,
      runId: "run-reload",
      idempotencyKey: "settlement-key-reload",
    });

    store.close();
    provider.close();

    const reloadedStore = new SqliteEconomicStateStore({ filePath: storePath });
    const reloadedProvider = new SqliteSettlementProvider({ filePath: providerPath });
    const reloaded = new EconomicService({
      policy: POLICY,
      store: reloadedStore,
      settlementProvider: reloadedProvider,
      tenantId: "tenant-alpha",
    });
    try {
      assert.equal(reloaded.listSettlements().length, 1);
      assert.equal(reloaded.listReceipts().length, 1);
      assert.equal(reloaded.receipt("run-reload").settlementId, settled.settlementId);
      assert.equal(reloaded.receipt("run-reload").totalCharged.toJSON(), "10");
    } finally {
      reloadedStore.close();
      reloadedProvider.close();
    }
  });
});

test("provider crash window is repaired once and does not fake completion", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-s73-crash-"));
  const storePath = join(root, "economic.sqlite");
  const providerPath = join(root, "settlement.sqlite");
  let store = new SqliteEconomicStateStore({ filePath: storePath });
  const provider = new SqliteSettlementProvider({ filePath: providerPath });
  const failingStore = new Proxy(store, {
    get(target, property, receiver) {
      if (property === "commitSettlement") {
        return () => { throw new EconomicPersistenceError("simulated crash window"); };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const service = new EconomicService({
    policy: POLICY,
    store: failingStore,
    settlementProvider: provider,
    tenantId: "tenant-alpha",
  });
  try {
    const { reservation } = seedLifecycle(service, "crash");
    await assert.rejects(
      () => service.settle({
        settlementId: "settlement-crash",
        reservationId: reservation.reservationId,
        runId: "run-crash",
        idempotencyKey: "settlement-key-crash",
      }),
      EconomicPersistenceError,
    );
    assert.equal(await provider.listSettlements().then((records) => records.length), 1);

    store.close();
    store = undefined;

    const recoveredStore = new SqliteEconomicStateStore({ filePath: storePath });
    const recovered = new EconomicService({
      policy: POLICY,
      store: recoveredStore,
      settlementProvider: provider,
      tenantId: "tenant-alpha",
    });
    try {
      assert.deepEqual(await recovered.reconcile(), { inspected: 1, repaired: 1 });
      assert.deepEqual(await recovered.reconcile(), { inspected: 1, repaired: 0 });
      assert.equal(recovered.receipt("run-crash").settlementId, "settlement-crash");
      const replayed = await recovered.settle({
        settlementId: "settlement-crash-ignored",
        reservationId: "reservation-crash",
        runId: "run-crash",
        idempotencyKey: "settlement-key-crash",
      });
      assert.equal(replayed.settlementId, "settlement-crash");
      assert.equal((await provider.listSettlements()).length, 1);
    } finally {
      recoveredStore.close();
    }
  } finally {
    if (store) store.close();
    provider.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("exception replay and remediation replay are deterministic", async () => {
  await withDurableFixture(async ({ service }) => {
    const { reservation } = seedLifecycle(service, "exception", "tenant-alpha", false);
    await service.settle({
      settlementId: "settlement-exception",
      reservationId: reservation.reservationId,
      runId: "run-exception",
      idempotencyKey: "settlement-key-exception",
    });
    const evidence = new OperationalEvidenceService({ economicService: service });
    const mismatch = (await evidence.listReconciliationMismatches())[0];
    assert.ok(mismatch);

    const firstException = await evidence.openFinancialException(mismatch.mismatchId, "operator-a");
    const secondException = await evidence.openFinancialException(mismatch.mismatchId, "operator-b");
    assert.equal(firstException.exceptionId, secondException.exceptionId);

    await evidence.transitionFinancialException(firstException.exceptionId, "acknowledge", { actor: "operator-a" });
    await evidence.transitionFinancialException(firstException.exceptionId, "review");
    const pending = await evidence.transitionFinancialException(firstException.exceptionId, "remediate");

    const firstRemediation = await evidence.requestFinancialRemediation({
      exceptionId: pending.exceptionId,
      action: "RETRY_RECONCILIATION",
      idempotencyKey: "remediation-key-exception",
      actor: "operator-a",
    });
    const secondRemediation = await evidence.requestFinancialRemediation({
      exceptionId: pending.exceptionId,
      action: "RETRY_RECONCILIATION",
      idempotencyKey: "remediation-key-exception",
      actor: "operator-b",
    });

    assert.equal(firstRemediation.remediationId, secondRemediation.remediationId);
    assert.equal((await evidence.listFinancialRemediations()).length, 1);
    assert.equal((await evidence.getFinancialException(pending.exceptionId))?.status, "remediation_pending");
    assert.equal(reservation.reservationId, "reservation-exception");
  });
});

test("process-local fallback stays non-production and does not satisfy shared-state requirements", () => {
  const boundary = buildProviderBoundary({
    environmentTopology: {
      environment: "production",
      adapterProfile: "production",
      dispatchMode: "remote",
      workerMode: "remote",
      workerTransport: "https",
      httpHost: "0.0.0.0",
      httpPort: 8080,
    },
    profile: "production",
    runtimeMode: "remote",
    localWorkerConfigured: false,
    checkedAt: 1234567890,
    secretStore: {
      descriptor: {
        provider: "vault-kv-v2",
        productionOriented: true,
        materialStorage: "external_managed",
        metadataDurability: "shared_durable",
        multiInstance: "external_provider_managed",
      },
      async health() {
        return { reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true };
      },
    },
    secretHealth: { reachable: true, provider: "vault-kv-v2", authenticated: true, secureTransport: true },
    economicStore: {
      adapter: "shared-postgres",
      productionOriented: true,
      durability: "external_managed",
      multiInstance: "capable",
    },
    settlementProvider: {
      adapter: "shared-settlement-provider",
      productionOriented: true,
      durability: "external_managed",
      multiInstance: "capable",
    },
    settlementHealth: { reachable: true },
    administrativeState: { mode: "filesystem", durability: "single_node_durable" },
    telemetryHealth: {
      configured: true,
      reachable: true,
      productionGrade: true,
      state: "ready",
      adapter: "otlp-http-json",
      external: true,
    },
    sharedStateHealth: {
      configured: true,
      reachable: false,
      writable: false,
      schemaCurrent: false,
      adapter: "shared-postgres",
      reasonCode: "SHARED_STATE_UNAVAILABLE",
    },
    persistencePaths: {
      administrativeStatePath: "/tmp/acs-admin.sqlite",
      economicStatePath: "/tmp/acs-economic.sqlite",
      settlementStatePath: "/tmp/acs-settlement.sqlite",
      secretCatalogPath: "/tmp/acs-secrets.sqlite",
      runtimeStatePath: "/tmp/acs-runtime.sqlite",
      rateLimitDatabasePath: "/tmp/acs-rate-limit.sqlite",
    },
  });
  const persistence = boundary.providers.find((entry) => entry.providerId === "shared-state-provider");

  assert.ok(persistence);
  assert.equal(persistence.productionEligible, false);
  assert.equal(persistence.readiness, "UNAVAILABLE");
  assert.equal(boundary.readiness.productionEligibility.status !== "READY", true);
});
