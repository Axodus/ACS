import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  AuditService,
  CredentialConnectionRegistry,
  EconomicPersistenceError,
  EconomicService,
  InMemoryEconomicStateStore,
  InMemorySecretStore,
  InMemorySettlementProvider,
  SecretProviderConfigurationError,
  SecretProviderUnavailableError,
  SecretRevokedError,
  SecretTenantMismatchError,
  SettlementProviderUnavailableError,
  SqliteEconomicStateStore,
  SqliteSecretCatalog,
  SqliteSettlementProvider,
  VaultSecretProvider,
  routeProductApiRequest,
} from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const POLICY = {
  policyId: "policy-b02",
  revision: 1,
  pricing: {
    "llm.inference": 2n,
    "agent.runtime": 3n,
    compute: 5n,
    memory: 7n,
    storage: 11n,
    tools: 13n,
    network: 17n,
    "premium.capability": 19n,
    "scheduled.execution": 23n,
    "autonomous.duration": 29n,
  },
};

function createMockEngine() {
  return { identity: { id: "openclaw", provider: "agentsai" }, async close() {} };
}

const productionTestIdentityValidator = {
  descriptor: { mode: "oidc", provider: "test-oidc", productionOriented: true, issuer: "https://issuer.test", audience: "acs" },
  async authenticate() {
    return {
      mode: "oidc",
      actorType: "user",
      actorId: "b02-platform",
      scopes: [],
      authenticated: true,
      trusted: true,
      platformAdmin: true,
      principal: { principalId: "b02-platform", issuer: "https://issuer.test", subject: "b02-platform", authenticationMethod: "oidc_bearer" },
      warnings: [],
    };
  },
  async health() { return { configured: true, reachable: true, detail: "B02 production identity test fixture" }; },
};

class FakeVaultTransport {
  records = new Map();
  requests = [];
  failNext = false;

  async request(input) {
    this.requests.push({ method: input.method, path: input.path });
    if (this.failNext) {
      this.failNext = false;
      return { status: 503 };
    }
    if (input.path === "/v1/sys/health") return { status: 200, body: {} };

    const cleanPath = input.path.split("?")[0];
    const dataMarker = "/data/";
    const metadataMarker = "/metadata/";
    const deleteMarker = "/delete/";

    if (cleanPath.includes(dataMarker) && input.method === "POST") {
      const key = cleanPath.replace(dataMarker, "/");
      const current = this.records.get(key) ?? { versions: new Map(), deleted: new Set() };
      const requestedCas = input.body?.options?.cas ?? 0;
      const currentVersion = current.versions.size;
      if (requestedCas !== currentVersion) return { status: 400 };
      const version = currentVersion + 1;
      current.versions.set(version, input.body.data.value);
      current.deleted.delete(version);
      this.records.set(key, current);
      return { status: 200, body: { data: { version } } };
    }

    if (cleanPath.includes(dataMarker) && input.method === "GET") {
      const key = cleanPath.replace(dataMarker, "/");
      const record = this.records.get(key);
      const version = Number(new URL("http://vault" + input.path).searchParams.get("version"));
      if (!record || record.deleted.has(version) || !record.versions.has(version)) return { status: 404 };
      return { status: 200, body: { data: { data: { value: record.versions.get(version) }, metadata: { version } } } };
    }

    if (cleanPath.includes(metadataMarker) && input.method === "GET") {
      const key = cleanPath.replace(metadataMarker, "/");
      return this.records.has(key) ? { status: 200, body: { data: {} } } : { status: 404 };
    }

    if (cleanPath.includes(deleteMarker) && input.method === "POST") {
      const key = cleanPath.replace(deleteMarker, "/");
      const record = this.records.get(key);
      if (!record) return { status: 404 };
      for (const version of input.body.versions) record.deleted.add(version);
      return { status: 204 };
    }

    if (cleanPath.includes(metadataMarker) && input.method === "DELETE") {
      const key = cleanPath.replace(metadataMarker, "/");
      this.records.delete(key);
      return { status: 204 };
    }

    return { status: 404 };
  }
}

function economicAccount(tenantId = "tenant-a") {
  return {
    accountId: "account-" + tenantId,
    ownerId: tenantId,
    mode: "axodus-managed",
    assetCode: "NEURONS",
    tenantId,
    workloadId: "workload-" + tenantId,
  };
}

function createEconomicLifecycle(service, suffix = "a") {
  const quote = service.quote({
    quoteId: "quote-" + suffix,
    account: economicAccount("tenant-a"),
    planId: "plan-" + suffix,
    estimatedUsage: { compute: 4n },
    expiresAt: 10_000,
  });
  const reservation = service.reserve({
    reservationId: "reservation-" + suffix,
    quoteId: quote.quoteId,
    idempotencyKey: "reserve-key-" + suffix,
    expiresAt: 10_000,
  });
  service.recordUsage({
    recordId: "usage-" + suffix,
    runId: "run-" + suffix,
    accountId: quote.accountId,
    dimension: "compute",
    quantity: 2n,
    unit: "unit",
    source: "test",
    observedAt: 100,
    tenantId: "tenant-a",
    workloadId: "workload-tenant-a",
  });
  return { quote, reservation };
}

test("Vault KV v2 adapter keeps values external, tenant-scoped and restart-resolvable", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-b02-vault-"));
  const catalogPath = join(root, "secret-catalog.sqlite");
  const transport = new FakeVaultTransport();
  const audit = new AuditService();
  let firstCatalog;
  let secondCatalog;
  try {
    firstCatalog = new SqliteSecretCatalog({ filePath: catalogPath });
    const firstProvider = new VaultSecretProvider({ metadataStore: firstCatalog, transport, auditService: audit });
    const firstRef = await firstProvider.put({
      tenantId: "tenant-a",
      providerId: "openai",
      purpose: "api-key",
      value: "b02-secret-value-v1",
      actor: "owner-a",
      correlationId: "corr-secret-create",
      at: 100,
    });
    const metadata = await firstProvider.describe(firstRef, { tenantId: "tenant-a" });
    assert.equal(metadata.version, 1);
    assert.equal(JSON.stringify(metadata).includes("b02-secret-value-v1"), false);
    assert.equal(await firstProvider.get(firstRef, { tenantId: "tenant-a" }), "b02-secret-value-v1");
    await assert.rejects(
      () => firstProvider.get(firstRef, { tenantId: "tenant-b", actor: "owner-b" }),
      SecretTenantMismatchError,
    );
    await assert.rejects(
      () => firstProvider.describe(firstRef, { tenantId: "tenant-b", actor: "owner-b" }),
      SecretTenantMismatchError,
    );
    await assert.rejects(
      () => firstProvider.rotate(firstRef, {
        tenantId: "tenant-b",
        value: "must-not-be-written",
        actor: "owner-b",
      }),
      SecretTenantMismatchError,
    );
    await assert.rejects(
      () => firstProvider.revoke(firstRef, { tenantId: "tenant-b", actor: "owner-b" }),
      SecretTenantMismatchError,
    );

    const rotatedRef = await firstProvider.rotate(firstRef, {
      tenantId: "tenant-a",
      value: "b02-secret-value-v2",
      actor: "owner-a",
      at: 200,
    });
    assert.equal(rotatedRef.keyVersion, "2");
    assert.equal(await firstProvider.get(rotatedRef, { tenantId: "tenant-a" }), "b02-secret-value-v2");

    const connections = new CredentialConnectionRegistry({ store: firstCatalog });
    connections.register({
      id: "credential-a",
      providerId: "openai",
      type: "api-key",
      status: "configured",
      owner: { tenantId: "tenant-a" },
      scopes: ["model:inference"],
      secretRef: rotatedRef,
      createdAt: 200,
      updatedAt: 200,
    });
    firstCatalog.close();
    firstCatalog = undefined;

    secondCatalog = new SqliteSecretCatalog({ filePath: catalogPath });
    const secondProvider = new VaultSecretProvider({ metadataStore: secondCatalog, transport, auditService: audit });
    const restoredConnection = new CredentialConnectionRegistry({ store: secondCatalog }).get("credential-a");
    assert.equal(restoredConnection.secretRef.keyVersion, "2");
    assert.equal(
      await secondProvider.get(restoredConnection.secretRef, { tenantId: "tenant-a" }),
      "b02-secret-value-v2",
    );

    await secondProvider.revoke(restoredConnection.secretRef, {
      tenantId: "tenant-a",
      actor: "owner-a",
      correlationId: "corr-secret-revoke",
      at: 300,
    });
    await assert.rejects(
      () => secondProvider.get(restoredConnection.secretRef, { tenantId: "tenant-a" }),
      SecretRevokedError,
    );

    const serializedAudit = JSON.stringify(audit.listEvents());
    assert.equal(serializedAudit.includes("b02-secret-value-v1"), false);
    assert.equal(serializedAudit.includes("b02-secret-value-v2"), false);
    assert.equal(audit.queryEvents({ correlationId: "corr-secret-create" }).length, 1);
    assert.equal(audit.queryEvents({ correlationId: "corr-secret-revoke" }).length, 1);
  } finally {
    firstCatalog?.close();
    secondCatalog?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("Vault provider failure produces no false success and no secret leakage", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-b02-vault-failure-"));
  const catalog = new SqliteSecretCatalog({ filePath: join(root, "catalog.sqlite") });
  const transport = new FakeVaultTransport();
  const provider = new VaultSecretProvider({ metadataStore: catalog, transport });
  transport.failNext = true;
  try {
    await assert.rejects(
      () => provider.put({
        tenantId: "tenant-a",
        providerId: "openai",
        purpose: "api-key",
        value: "never-persist-this-secret",
      }),
      (error) => error instanceof SecretProviderUnavailableError
        && !error.message.includes("never-persist-this-secret"),
    );
    assert.equal(catalog.list().length, 0);
    assert.equal(JSON.stringify(transport.requests).includes("never-persist-this-secret"), false);
  } finally {
    catalog.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("production profile rejects insecure secret and economic fallback", async () => {
  assert.throws(
    () => createControlPlaneContext({
      engine: createMockEngine(),
      startLocalWorker: false,
      adapterProfile: "production",
      secretStore: new InMemorySecretStore(),
      economicStateStore: new InMemoryEconomicStateStore(),
      settlementProvider: new InMemorySettlementProvider(),
    }),
    SecretProviderConfigurationError,
  );

  const root = await mkdtemp(join(tmpdir(), "acs-b02-production-config-"));
  const transport = new FakeVaultTransport();
  let context;
  try {
    context = createControlPlaneContext({
      engine: createMockEngine(),
      startLocalWorker: false,
      adapterProfile: "production",
      secretProvider: "vault",
      vaultTransport: transport,
      secretCatalogPath: join(root, "catalog.sqlite"),
      economicStatePath: join(root, "economic.sqlite"),
      identityValidator: productionTestIdentityValidator,
    });
    assert.equal(context.productionAdapters.profile, "production");
    assert.equal(context.productionAdapters.secretProvider.productionOriented, true);
    assert.equal(context.productionAdapters.economicStore.productionOriented, true);
    assert.equal(context.productionAdapters.settlementProvider.productionOriented, true);

    const reachable = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/production-readiness", headers: {} },
      "/api/v1/system/production-readiness",
      context,
      { correlationId: "b02_reachable_vault" },
    );
    assert.equal(reachable.status, 200);
    assert.equal(reachable.body.data.secretsBoundary.storage, "vault");
    assert.equal(
      reachable.body.data.blockers.some((blocker) => blocker.code === "SECRETS_PROVIDER_UNREACHABLE"),
      false,
    );

    transport.failNext = true;
    const unavailable = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/production-readiness", headers: {} },
      "/api/v1/system/production-readiness",
      context,
      { correlationId: "b02_unreachable_vault" },
    );
    assert.equal(unavailable.status, 200);
    assert.equal(
      unavailable.body.data.blockers.some((blocker) => blocker.code === "SECRETS_PROVIDER_UNREACHABLE"),
      true,
    );
  } finally {
    if (context) await context.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("durable economics survives restart and settlement is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-b02-economics-"));
  const filePath = join(root, "economic.sqlite");
  let firstStore;
  let firstProvider;
  let secondStore;
  let secondProvider;
  try {
    firstStore = new SqliteEconomicStateStore({ filePath });
    firstProvider = new SqliteSettlementProvider({ filePath });
    const firstService = new EconomicService({
      policy: POLICY,
      store: firstStore,
      settlementProvider: firstProvider,
      tenantId: "tenant-a",
    });
    const { reservation } = createEconomicLifecycle(firstService, "restart");
    const settled = await firstService.settle({
      settlementId: "settlement-restart",
      reservationId: reservation.reservationId,
      runId: "run-restart",
      idempotencyKey: "settlement-key-restart",
    });
    const duplicate = await firstService.settle({
      settlementId: "settlement-ignored",
      reservationId: reservation.reservationId,
      runId: "run-restart",
      idempotencyKey: "settlement-key-restart",
    });
    assert.equal(duplicate.settlementId, settled.settlementId);
    assert.equal((await firstProvider.listSettlements()).length, 1);
    firstStore.close();
    firstProvider.close();
    firstStore = undefined;
    firstProvider = undefined;

    secondStore = new SqliteEconomicStateStore({ filePath });
    secondProvider = new SqliteSettlementProvider({ filePath });
    const secondService = new EconomicService({
      policy: POLICY,
      store: secondStore,
      settlementProvider: secondProvider,
      tenantId: "tenant-a",
    });
    assert.equal(secondService.receipt("run-restart").totalCharged.toJSON(), "10");
    assert.equal(secondService.listUsage("run-restart")[0].quantity, 2n);
    assert.deepEqual(await secondService.reconcile(), { inspected: 1, repaired: 0 });

    const tenantB = new EconomicService({
      policy: POLICY,
      store: secondStore,
      settlementProvider: secondProvider,
      tenantId: "tenant-b",
    });
    assert.equal(tenantB.listSettlements().length, 0);
    assert.throws(() => tenantB.receipt("run-restart"), /not available for this tenant/);
    const tenantBQuote = tenantB.quote({
      quoteId: "quote-tenant-b",
      account: economicAccount("tenant-b"),
      planId: "plan-tenant-b",
      estimatedUsage: { compute: 1n },
      expiresAt: 10_000,
    });
    const tenantBReservation = tenantB.reserve({
      reservationId: "reservation-tenant-b",
      quoteId: tenantBQuote.quoteId,
      idempotencyKey: "reserve-key-restart",
      expiresAt: 10_000,
    });
    tenantB.recordUsage({
      recordId: "usage-tenant-b",
      runId: "run-tenant-b",
      accountId: tenantBQuote.accountId,
      dimension: "compute",
      quantity: 1n,
      unit: "unit",
      source: "test",
      observedAt: 101,
      tenantId: "tenant-b",
    });
    await tenantB.settle({
      settlementId: "settlement-tenant-b",
      reservationId: tenantBReservation.reservationId,
      runId: "run-tenant-b",
      idempotencyKey: "settlement-key-restart",
    });
    assert.equal(tenantB.listSettlements().length, 1);
    assert.equal(secondService.listSettlements().length, 1);
    assert.equal((await secondProvider.listSettlements()).length, 2);
  } finally {
    firstStore?.close();
    firstProvider?.close();
    secondStore?.close();
    secondProvider?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("settlement crash window is repaired from durable provider state without double charge", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-b02-reconcile-"));
  const filePath = join(root, "economic.sqlite");
  let firstStore;
  let provider;
  let recoveredStore;
  try {
    firstStore = new SqliteEconomicStateStore({ filePath });
    provider = new SqliteSettlementProvider({ filePath });
    const failingStore = new Proxy(firstStore, {
      get(target, property) {
        if (property === "commitSettlement") {
          return () => { throw new EconomicPersistenceError("simulated crash window"); };
        }
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const service = new EconomicService({
      policy: POLICY,
      store: failingStore,
      settlementProvider: provider,
      tenantId: "tenant-a",
    });
    const { reservation } = createEconomicLifecycle(service, "reconcile");
    await assert.rejects(
      () => service.settle({
        settlementId: "settlement-reconcile",
        reservationId: reservation.reservationId,
        runId: "run-reconcile",
        idempotencyKey: "settlement-key-reconcile",
      }),
      EconomicPersistenceError,
    );
    assert.equal(firstStore.listSettlements().length, 0);
    assert.equal((await provider.listSettlements()).length, 1);
    firstStore.close();
    firstStore = undefined;

    recoveredStore = new SqliteEconomicStateStore({ filePath });
    const recovered = new EconomicService({
      policy: POLICY,
      store: recoveredStore,
      settlementProvider: provider,
      tenantId: "tenant-a",
    });
    assert.deepEqual(await recovered.reconcile(), { inspected: 1, repaired: 1 });
    assert.deepEqual(await recovered.reconcile(), { inspected: 1, repaired: 0 });
    assert.equal(recovered.receipt("run-reconcile").totalCharged.toJSON(), "10");
    assert.equal((await provider.listSettlements()).length, 1);
  } finally {
    firstStore?.close();
    recoveredStore?.close();
    provider?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("settlement provider failure cannot produce local economic success", async () => {
  const store = new InMemoryEconomicStateStore();
  const unavailableProvider = {
    descriptor: {
      adapter: "unavailable-test-provider",
      productionOriented: true,
      durability: "external_managed",
      multiInstance: "capable",
    },
    async settle() { throw new SettlementProviderUnavailableError("settle"); },
    async lookupSettlement() { return undefined; },
    async listSettlements() { return []; },
  };
  const service = new EconomicService({
    policy: POLICY,
    store,
    settlementProvider: unavailableProvider,
    tenantId: "tenant-a",
  });
  const { reservation } = createEconomicLifecycle(service, "failure");
  await assert.rejects(
    () => service.settle({
      settlementId: "settlement-failure",
      reservationId: reservation.reservationId,
      runId: "run-failure",
      idempotencyKey: "settlement-key-failure",
    }),
    SettlementProviderUnavailableError,
  );
  assert.equal(store.listSettlements().length, 0);
  assert.equal(store.listReceipts().length, 0);
  assert.equal(store.getReservation(reservation.reservationId).status, "reserved");
});
