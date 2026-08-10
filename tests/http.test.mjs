import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createAcsHttpServer, routeAcsRequest } from "../dist/index.js";

test("capabilities endpoint returns JSON envelope", () => {
  const result = routeAcsRequest("/acs/capabilities?level=product");

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.version, "0.1.0");
  assert.ok(result.body.data.capabilities.some((capability) => capability.id === "product.trading-ignition"));
});

test("tenant-services endpoint supports tenant filter", () => {
  const result = routeAcsRequest("/acs/tenant-services/dao-alpha");

  assert.equal(result.status, 200);
  assert.equal(result.body.data.tenants[0].tenantId, "dao-alpha");
  assert.ok(result.body.data.tenants[0].services.length > 0);
});

test("product-access endpoint blocks unlicensed wallet", () => {
  const result = routeAcsRequest("/acs/product-access/0xunlicensed/product.trading-ignition");

  assert.equal(result.status, 200);
  assert.equal(result.body.data.products[0].allowed, false);
  assert.match(result.body.data.products[0].blockedReason, /valid NFT license|marketplace purchase/);
});

test("readiness and operational state endpoints expose mock status", () => {
  const readiness = routeAcsRequest("/acs/readiness/0xlicensed");
  const operationalState = routeAcsRequest("/acs/operational-state/0xlicensed");
  const status = routeAcsRequest("/acs/status/0xlicensed");

  assert.equal(readiness.body.data.completed, true);
  assert.equal(operationalState.body.data.state, "READY");
  assert.equal(status.body.data.integrationMode, "mock");
});

test("policy-check endpoint requires capabilityId", () => {
  const missing = routeAcsRequest("/acs/policy-check");
  const present = routeAcsRequest("/acs/policy-check?capabilityId=product.trading-ignition&tenantId=dao-alpha");

  assert.equal(missing.status, 400);
  assert.equal(missing.body.success, false);
  assert.equal(present.status, 200);
  assert.equal(present.body.data.capabilityId, "product.trading-ignition");
  assert.equal(present.body.data.automationLevel, "manual_approval");
});

test("HTTP inspection endpoints reject invalid filters without side effects", () => {
  const invalidLevel = routeAcsRequest("/acs/capabilities?level=unknown");
  const unsupportedQuery = routeAcsRequest("/acs/capabilities?level=product&tenantId=dao-alpha");
  const invalidTenant = routeAcsRequest("/acs/tenant-services/unknown-tenant");
  const invalidWallet = routeAcsRequest("/acs/user-status/not a wallet?productId=product.trading-ignition");
  const missingRoute = routeAcsRequest("/acs/not-found");

  assert.equal(invalidLevel.status, 400);
  assert.equal(invalidLevel.body.success, false);
  assert.match(invalidLevel.body.blockedReason, /invalid consumption level/);

  assert.equal(unsupportedQuery.status, 400);
  assert.equal(unsupportedQuery.body.error.code, "invalid_query");
  assert.match(unsupportedQuery.body.error.message, /unsupported query parameter/);
  assert.deepEqual(unsupportedQuery.body.error.details.allowed, ["level"]);

  assert.equal(invalidTenant.status, 400);
  assert.equal(invalidTenant.body.success, false);
  assert.match(invalidTenant.body.blockedReason, /unknown tenant/);

  assert.equal(invalidWallet.status, 400);
  assert.equal(invalidWallet.body.error.code, "invalid_query");
  assert.match(invalidWallet.body.error.message, /unsupported characters/);

  assert.equal(missingRoute.status, 404);
  assert.equal(missingRoute.body.success, false);
});

test("HTTP server returns JSON for ACS health", async () => {
  const { server } = await createAcsHttpServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/acs/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "ok");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("HTTP server rejects non-GET methods", async () => {
  const { server } = await createAcsHttpServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/acs/health`, { method: "DELETE" });
    const body = await response.json();

    assert.equal(response.status, 405);
    assert.equal(body.success, false);
    assert.match(body.blockedReason, /method not allowed/);
  } finally {
    server.close();
    await once(server, "close");
  }
});
