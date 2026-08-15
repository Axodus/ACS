import assert from "node:assert/strict";
import test from "node:test";
import {
  AuditService,
  InMemoryTenantRepository,
  TenantAlreadyExistsError,
  TenantArchivedError,
  TenantIdentityError,
  TenantLifecycleService,
  TenantLifecycleTransitionError,
  createTenantNamespace,
  assertSameTenantContext,
} from "../dist/index.js";

test("creates a canonical tenant in provisioning state", () => {
  const audit = new AuditService();
  const service = new TenantLifecycleService({ auditService: audit });

  const receipt = service.createTenant({
    tenantId: "dao-alpha",
    displayName: "DAO Alpha",
    description: "primary governance tenant",
    createdBy: "platform-admin",
    at: 1_700_000_000_000,
    actor: "platform-admin",
    reason: "initial registration",
    provenance: "tenant-admin-console",
  });

  assert.equal(receipt.tenant.tenantId, "dao-alpha");
  assert.equal(receipt.tenant.status, "provisioning");
  assert.equal(receipt.tenant.administrativeMetadata.displayName, "DAO Alpha");
  assert.equal(receipt.tenant.administrativeMetadata.createdBy, "platform-admin");
  assert.equal(receipt.tenant.lifecycle.createdAt, 1_700_000_000_000);
  assert.equal(receipt.tenant.lifecycle.updatedAt, 1_700_000_000_000);
  assert.equal(receipt.event.operation, "create");
  assert.equal(receipt.event.nextStatus, "provisioning");
  assert.equal(receipt.event.tenantId, "dao-alpha");
  assert.equal(receipt.event.timestamp, 1_700_000_000_000);
  assert.equal(audit.listEvents().length, 1);
  assert.equal(audit.listEvents()[0].eventType, "tenant.create");
  assert.equal(audit.listEvents()[0].tenantId, "dao-alpha");
});

test("rejects duplicate tenant creation and invalid tenant identities", () => {
  const service = new TenantLifecycleService({ repository: new InMemoryTenantRepository() });

  service.createTenant({
    tenantId: "dao-alpha",
    at: 1,
  });

  assert.throws(
    () =>
      service.createTenant({
        tenantId: "dao-alpha",
        at: 2,
      }),
    TenantAlreadyExistsError,
  );

  assert.throws(
    () =>
      service.createTenant({
        tenantId: " ",
        at: 3,
      }),
    TenantIdentityError,
  );
});

test("supports the normative tenant lifecycle and keeps archived tenants terminal", () => {
  const service = new TenantLifecycleService();

  service.createTenant({ tenantId: "dao-alpha", at: 10, actor: "platform-admin" });

  const activated = service.activateTenant("dao-alpha", {
    at: 20,
    actor: "platform-admin",
    reason: "tenant approved",
  });
  assert.equal(activated.tenant.status, "active");
  assert.equal(activated.tenant.lifecycle.activatedAt, 20);
  assert.equal(activated.event.previousStatus, "provisioning");
  assert.equal(activated.event.nextStatus, "active");

  const suspended = service.suspendTenant("dao-alpha", {
    at: 30,
    actor: "platform-admin",
    reason: "administrative pause",
  });
  assert.equal(suspended.tenant.status, "suspended");
  assert.equal(suspended.tenant.lifecycle.suspendedAt, 30);
  assert.equal(suspended.event.previousStatus, "active");
  assert.equal(suspended.event.nextStatus, "suspended");

  const reactivated = service.reactivateTenant("dao-alpha", {
    at: 40,
    actor: "platform-admin",
    reason: "suspension lifted",
  });
  assert.equal(reactivated.tenant.status, "active");
  assert.equal(reactivated.tenant.lifecycle.activatedAt, 40);
  assert.equal(reactivated.event.previousStatus, "suspended");
  assert.equal(reactivated.event.nextStatus, "active");

  const archived = service.archiveTenant("dao-alpha", {
    at: 50,
    actor: "platform-admin",
    reason: "tenant retired",
  });
  assert.equal(archived.tenant.status, "archived");
  assert.equal(archived.tenant.lifecycle.archivedAt, 50);
  assert.equal(archived.event.previousStatus, "active");
  assert.equal(archived.event.nextStatus, "archived");

  assert.throws(
    () =>
      service.activateTenant("dao-alpha", {
        at: 60,
        actor: "platform-admin",
      }),
    TenantArchivedError,
  );
  assert.throws(
    () =>
      service.suspendTenant("dao-alpha", {
        at: 61,
        actor: "platform-admin",
      }),
    TenantArchivedError,
  );
  assert.throws(
    () =>
      service.reactivateTenant("dao-alpha", {
        at: 62,
        actor: "platform-admin",
      }),
    TenantArchivedError,
  );
  assert.throws(
    () =>
      service.archiveTenant("dao-alpha", {
        at: 63,
        actor: "platform-admin",
      }),
    TenantArchivedError,
  );
});

test("rejects invalid lifecycle transitions before archiving", () => {
  const service = new TenantLifecycleService();

  service.createTenant({ tenantId: "dao-beta", at: 100 });

  assert.throws(
    () =>
      service.suspendTenant("dao-beta", {
        at: 110,
      }),
    TenantLifecycleTransitionError,
  );

  assert.throws(
    () =>
      service.reactivateTenant("dao-beta", {
        at: 120,
      }),
    TenantLifecycleTransitionError,
  );

  service.activateTenant("dao-beta", {
    at: 125,
  });

  assert.throws(
    () =>
      service.activateTenant("dao-beta", {
        at: 130,
      }),
    TenantLifecycleTransitionError,
  );
});

test("keeps tenant mutations scoped to the targeted tenant only", () => {
  const service = new TenantLifecycleService();

  service.createTenant({ tenantId: "dao-alpha", at: 1 });
  service.createTenant({ tenantId: "dao-beta", at: 2 });

  service.activateTenant("dao-alpha", { at: 3, actor: "platform-admin" });

  assert.equal(service.getTenant("dao-alpha").status, "active");
  assert.equal(service.getTenant("dao-beta").status, "provisioning");
  assert.equal(createTenantNamespace({ tenantId: "dao-alpha", tenantType: "dao" }), "tenant:dao:dao-alpha");
  assert.doesNotThrow(() =>
    assertSameTenantContext(
      { tenantId: "dao-alpha", tenantType: "dao", governanceStatus: "active", federationTier: "standard", enabledServices: [], restrictions: [] },
      { tenantId: "dao-alpha", tenantType: "dao", governanceStatus: "active", federationTier: "standard", enabledServices: [], restrictions: [] },
    ),
  );
});

test("records audit-ready lifecycle events with before and after state", () => {
  const audit = new AuditService();
  const service = new TenantLifecycleService({ auditService: audit });

  service.createTenant({ tenantId: "dao-gamma", at: 10, actor: "platform-admin" });
  service.activateTenant("dao-gamma", { at: 20, actor: "platform-admin", reason: "approved" });

  const events = audit.listEvents();
  assert.equal(events.length, 2);
  assert.equal(events[1].eventType, "tenant.activate");
  assert.equal(events[1].tenantId, "dao-gamma");
  assert.equal(events[1].actor, "platform-admin");
  assert.equal(events[1].metadata.previousStatus, "provisioning");
  assert.equal(events[1].metadata.nextStatus, "active");
  assert.equal(events[1].metadata.operation, "activate");
});
