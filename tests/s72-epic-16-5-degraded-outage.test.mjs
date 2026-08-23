import assert from "node:assert/strict";
import test from "node:test";

import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { routeProductApiRequest } from "../dist/http/routes/product-api-routes.js";
import { buildProviderBoundary } from "../dist/control-plane/provider-boundary.js";
import {
  EconomicService,
  EconomicIdempotencyConflictError,
  InMemoryEconomicStateStore,
  InMemorySettlementProvider,
  SettlementProviderUnavailableError,
} from "../dist/control-plane/neurons-economic-contract.js";
import { InMemoryTelemetryExporter, OperationalTelemetryProvider } from "../dist/control-plane/operational-telemetry.js";

const auth = {
  actorId: "platform-admin",
  actorType: "system",
  authenticated: true,
  trusted: true,
  platformAdmin: true,
  scopes: ["platform.system"],
  principal: {
    principalId: "platform-admin",
    issuer: "acs",
    subject: "platform-admin",
    authenticationMethod: "development_headers",
  },
};

function makeEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() {
      return { identity: this.identity, status: "ready", supportedProtocols: ["acs-engine/1"], operations: [] };
    },
    async version() {
      return { identity: this.identity, sourceRevision: "s72", supportedProtocols: ["acs-engine/1"] };
    },
    async capabilities() {
      return { identity: this.identity, supportedProtocols: ["acs-engine/1"], operations: [], engineCapabilities: [], deploymentModes: ["sandbox"] };
    },
    async listExecutionTargets() {
      return [await this.inspectExecutionTarget("local-wsl")];
    },
    async inspectExecutionTarget(targetId) {
      return {
        id: targetId,
        type: "local-wsl",
        environment: "sandbox",
        engineId: "openclaw",
        status: "ready",
        health: { status: "ready", observedAt: Date.now(), checks: [], findings: [] },
        capabilities: [],
        deploymentModes: ["sandbox"],
        schedulingEligible: true,
        schedulingReasons: [],
        supportedRunners: ["opencode"],
        supportedProviders: ["axodus-managed"],
        isolationModes: ["sandbox"],
      };
    },
    async close() {},
  };
}

function makeRuntimeCoordinator(state) {
  const worker = {
    workerId: "worker-1",
    instanceId: "instance-1",
    servicePrincipalId: "worker-1",
    name: "Worker 1",
    version: "1.0.0",
    capabilities: {
      engineId: "openclaw",
      supportedRunners: ["opencode"],
      supportedProviders: ["axodus-managed"],
      supportedIsolationModes: ["sandbox"],
      supportedDeploymentModes: ["sandbox"],
      maxConcurrentRuns: 1,
    },
    status: "available",
    registeredAt: 1,
    activeRuns: 0,
  };

  return {
    descriptor: {
      adapter: "sqlite-durable-runtime",
      productionOriented: true,
      durability: "single_node_durable",
      multiInstance: "shared_database",
      multiHost: "not_proven",
    },
    health() {
      return {
        configured: true,
        reachable: state.reachable,
        productionGrade: true,
        adapter: "sqlite-durable-runtime",
      };
    },
    listJobs() {
      return [];
    },
    listWorkers() {
      return state.reachable && state.activeWorkers > 0 ? [worker] : [];
    },
    listAssignments() {
      return [];
    },
    listEvents() {
      return [];
    },
    requestCancellation() {
      throw new Error("not used");
    },
    close() {},
  };
}

async function createHttpContext(state) {
  const telemetry = new OperationalTelemetryProvider({
    exporter: new InMemoryTelemetryExporter(),
    serviceName: "acs-s72",
    exportIntervalMs: 60_000,
    queueCapacity: 8,
    recentCapacity: 8,
    batchSize: 8,
    exportTimeoutMs: 1_000,
  });
  const runtimeCoordinator = makeRuntimeCoordinator(state);
  const context = await createControlPlaneContext({
    engine: makeEngine(),
    startLocalWorker: false,
    runtimeMode: "remote",
    runtimeCoordinator,
    useDurableRuntimeState: false,
    useDurableAdministrativeState: false,
    useDurableSecretCatalog: false,
    useDurableEconomicState: false,
    useDurableDeploymentState: false,
    rateLimitProvider: "memory",
    telemetry,
  });
  return { context, telemetry };
}

function baseProviderInput(overrides = {}) {
  return {
    environmentTopology: {
      environment: "development",
      adapterProfile: "development",
      dispatchMode: "remote",
      workerMode: "cloud",
      workerTransport: "https",
      httpHost: "0.0.0.0",
      httpPort: 8788,
    },
    profile: "development",
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
    persistencePaths: {
      administrativeStatePath: "/var/lib/acs/admin.sqlite",
      economicStatePath: "/var/lib/acs/economic.sqlite",
      settlementStatePath: "/var/lib/acs/settlement.sqlite",
      secretCatalogPath: "/var/lib/acs/secrets.sqlite",
      runtimeStatePath: "/var/lib/acs/runtime.sqlite",
      rateLimitDatabasePath: "/var/lib/acs/rate-limit.sqlite",
    },
    ...overrides,
  };
}

function byId(boundary, providerId) {
  const provider = boundary.providers.find((entry) => entry.providerId === providerId);
  assert.ok(provider, "missing provider " + providerId);
  return provider;
}

async function settleFixture(options = {}) {
  const store = new InMemoryEconomicStateStore();
  const provider = options.provider ?? new InMemorySettlementProvider();
  const service = new EconomicService({ policy: {
    policyId: "policy-s72",
    revision: 1,
    pricing: {
      "llm.inference": 10n,
      "agent.runtime": 10n,
      compute: 10n,
      memory: 0n,
      storage: 0n,
      tools: 0n,
      network: 0n,
      "premium.capability": 0n,
      "scheduled.execution": 0n,
      "autonomous.duration": 0n,
    },
  }, store, settlementProvider: provider, tenantId: "tenant-a" });
  const quote = service.quote({
    quoteId: "quote-s72",
    account: {
      accountId: "account-s72",
      ownerId: "tenant-a",
      mode: "axodus-managed",
      assetCode: "NEURONS",
      tenantId: "tenant-a",
    },
    planId: "plan-s72",
    estimatedUsage: { "llm.inference": 1n },
    expiresAt: Date.now() + 60_000,
  });
  const reservation = service.reserve({
    reservationId: "reservation-s72",
    quoteId: quote.quoteId,
    idempotencyKey: "reserve-s72",
    expiresAt: Date.now() + 60_000,
    correlationId: "corr-s72",
  });
  return { store, provider, service, quote, reservation };
}

test("S03 keeps HTTP available while OpenClaw execution remains blocked", async () => {
  const state = { reachable: false, activeWorkers: 0 };
  const { context } = await createHttpContext(state);
  try {
    const health = await routeProductApiRequest({ method: "GET", url: "/api/v1/health", headers: {} }, "/api/v1/health", context, { auth, correlationId: "s72-health" });
    const ready = await routeProductApiRequest({ method: "GET", url: "/api/v1/ready", headers: {} }, "/api/v1/ready", context, { auth, correlationId: "s72-ready" });

    assert.equal(health.status, 200);
    assert.equal(health.body.data.status, "LIVE");
    assert.equal(ready.status, 503);
    assert.equal(ready.body.data.status, "BLOCKED");
    assert.ok(ready.body.data.reasonCodes.length > 0);
  } finally {
    await context.close();
  }
});

test("S03 derives outage and no-fallback provider truth explicitly", () => {
  const outage = buildProviderBoundary(baseProviderInput({
    environmentTopology: {
      environment: "development",
      adapterProfile: "development",
      dispatchMode: "remote",
      workerMode: "cloud",
      workerTransport: "https",
      httpHost: "0.0.0.0",
      httpPort: 8788,
    },
    runtimeMode: "remote",
    localWorkerConfigured: false,
    runtimeCoordinatorHealth: { configured: true, reachable: false },
    settlementHealth: { reachable: false },
    sharedStateHealth: {
      configured: true,
      reachable: false,
      writable: false,
      schemaCurrent: false,
      adapter: "shared-postgres",
      reasonCode: "SHARED_STATE_UNAVAILABLE",
    },
    telemetryHealth: {
      configured: false,
      reachable: false,
      productionGrade: false,
      state: "disabled",
      adapter: "disabled",
      external: true,
    },
  }));
  const worker = byId(outage, "openclaw-worker");
  const settlement = byId(outage, "settlement-provider");
  const persistence = byId(outage, "shared-state-provider");
  const telemetry = byId(outage, "telemetry-exporter");

  assert.equal(worker.providerMode, "cloud");
  assert.equal(worker.readiness, "UNAVAILABLE");
  assert.notEqual(worker.providerMode, "local");
  assert.equal(settlement.readiness, "UNAVAILABLE");
  assert.equal(persistence.providerMode, "shared-postgres");
  assert.equal(persistence.readiness, "UNAVAILABLE");
  assert.notEqual(persistence.providerMode, "memory");
  assert.equal(telemetry.readiness, "NOT_CONFIGURED");
  assert.equal(telemetry.productionEligible, false);
  assert.equal(outage.readiness.execution.status, "UNAVAILABLE");
  assert.equal(outage.readiness.financialOperation.status, "UNAVAILABLE");
  assert.equal(outage.readiness.productionEligibility.status !== "READY", true);
});

test("S03 settlement outage blocks settlement while read models remain usable", async () => {
  const { store, service } = await settleFixture({
    provider: {
      descriptor: {
        adapter: "outage-provider",
        productionOriented: true,
        durability: "external_managed",
        multiInstance: "capable",
      },
      async settle() {
        throw new SettlementProviderUnavailableError("settle");
      },
      async lookupSettlement() {
        return undefined;
      },
      async listSettlements() {
        return [];
      },
    },
  });

  await assert.rejects(
    () => service.settle({
      settlementId: "settlement-s72",
      reservationId: "reservation-s72",
      runId: "run-s72",
      idempotencyKey: "settle-s72",
    }),
    SettlementProviderUnavailableError,
  );

  assert.equal(store.listSettlements().length, 0);
  assert.equal(store.listReservations().length, 1);
  assert.equal(service.listReservations()[0].status, "reserved");
});

test("S03 persistence outage exposes durable-write blockage truthfully", () => {
  const boundary = buildProviderBoundary(baseProviderInput({
    sharedStateHealth: {
      configured: true,
      reachable: false,
      writable: false,
      schemaCurrent: false,
      adapter: "shared-postgres",
      reasonCode: "SHARED_STATE_UNAVAILABLE",
    },
  }));
  const persistence = byId(boundary, "shared-state-provider");

  assert.equal(persistence.readiness, "UNAVAILABLE");
  assert.equal(persistence.productionEligible, false);
  assert.equal(persistence.reasonCode, "PERSISTENCE_PROVIDER_UNAVAILABLE");
  assert.equal(boundary.readiness.productionEligibility.status !== "READY", true);
});

test("S03 telemetry outage is reflected in eligibility and reason codes", () => {
  const boundary = buildProviderBoundary(baseProviderInput({
    telemetryHealth: {
      configured: false,
      reachable: false,
      productionGrade: false,
      state: "disabled",
      adapter: "disabled",
      external: true,
    },
  }));
  const telemetry = byId(boundary, "telemetry-exporter");

  assert.equal(telemetry.readiness, "NOT_CONFIGURED");
  assert.equal(telemetry.productionEligible, false);
  assert.equal(telemetry.reasonCode, "TELEMETRY_EXPORTER_DISABLED");
  assert.equal(boundary.readiness.productionEligibility.status, "NOT_CONFIGURED");
});

test("S03 provider recovery updates readiness without duplicating economic effect", async () => {
  const recovered = buildProviderBoundary(baseProviderInput({
    runtimeCoordinatorHealth: { configured: true, reachable: true },
  }));
  const outage = buildProviderBoundary(baseProviderInput({
    runtimeCoordinatorHealth: { configured: true, reachable: false },
  }));

  assert.equal(outage.readiness.execution.status, "UNAVAILABLE");
  assert.equal(recovered.readiness.execution.status, "READY");

  let failSettlement = true;
  const provider = {
    descriptor: {
      adapter: "toggle-provider",
      productionOriented: true,
      durability: "external_managed",
      multiInstance: "capable",
    },
    async settle(settlement) {
      if (failSettlement) throw new SettlementProviderUnavailableError("settle");
      return new InMemorySettlementProvider().settle(settlement);
    },
    async lookupSettlement() {
      return undefined;
    },
    async listSettlements() {
      return [];
    },
  };
  const { service } = await settleFixture({ provider });

  await assert.rejects(
    () => service.settle({
      settlementId: "settlement-s72-a",
      reservationId: "reservation-s72",
      runId: "run-s72",
      idempotencyKey: "settle-s72-a",
    }),
    SettlementProviderUnavailableError,
  );

  failSettlement = false;
  const first = await service.settle({
    settlementId: "settlement-s72-a",
    reservationId: "reservation-s72",
    runId: "run-s72",
    idempotencyKey: "settle-s72-a",
  });
  const second = await service.settle({
    settlementId: "settlement-s72-ignored",
    reservationId: "reservation-s72",
    runId: "run-s72",
    idempotencyKey: "settle-s72-a",
  });

  assert.equal(first.settlementId, second.settlementId);
  assert.equal(first.idempotencyKey, "settle-s72-a");
  assert.equal(second.idempotencyKey, "settle-s72-a");
});

test("S03 unavailable authority never renders a truthful-looking empty success", async () => {
  const state = { reachable: false, activeWorkers: 0 };
  const { context } = await createHttpContext(state);
  try {
    const ready = await routeProductApiRequest({ method: "GET", url: "/api/v1/ready", headers: {} }, "/api/v1/ready", context, { auth, correlationId: "s72-ready-2" });
    const status = await context.operationalDiagnostics.status({ force: true });

    assert.equal(ready.status, 503);
    assert.equal(ready.body.data.status, "BLOCKED");
    assert.equal(status.overall, "BLOCKED");
    assert.equal(status.dependencies.some((entry) => entry.reasonCode === "NO_ELIGIBLE_WORKERS" || entry.reasonCode === "RUNTIME_STORE_UNAVAILABLE"), true);
  } finally {
    await context.close();
  }
});

test("S03 output is deterministic for the same outage configuration", () => {
  const input = baseProviderInput({
    runtimeCoordinatorHealth: { configured: true, reachable: false },
    settlementHealth: { reachable: false },
    sharedStateHealth: {
      configured: true,
      reachable: false,
      writable: false,
      schemaCurrent: false,
      adapter: "shared-postgres",
      reasonCode: "SHARED_STATE_UNAVAILABLE",
    },
    telemetryHealth: {
      configured: false,
      reachable: false,
      productionGrade: false,
      state: "disabled",
      adapter: "disabled",
      external: true,
    },
  });

  assert.deepEqual(buildProviderBoundary(input), buildProviderBoundary(input));
});
