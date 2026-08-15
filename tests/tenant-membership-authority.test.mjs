import assert from "node:assert/strict";
import test from "node:test";
import {
  AuditService,
  InMemoryTenantRepository,
  TenantLifecycleService,
} from "../dist/index.js";
import {
  TenantMembershipService,
  evaluateTenantAdministrativeAuthority,
} from "../dist/control-plane/tenant-membership.js";

function createFixture() {
  const tenantRepository = new InMemoryTenantRepository();
  const audit = new AuditService();
  const tenantService = new TenantLifecycleService({ repository: tenantRepository, auditService: audit });
  const membershipService = new TenantMembershipService({ tenantRepository, auditService: audit });
  return { tenantRepository, audit, tenantService, membershipService };
}

function platformAdmin(principalId = "platform-admin") {
  return { kind: "platform_admin", principalId };
}

function tenantAuthority(tenantId, principalId) {
  return { kind: "tenant_member", tenantId, principalId };
}

function bootstrapTenant(fixture, tenantId, ownerPrincipalId = "owner-1") {
  fixture.tenantService.createTenant({ tenantId, at: 1, actor: "platform-admin" });
  const receipt = fixture.membershipService.bootstrapTenantOwner({
    tenantId,
    principalId: ownerPrincipalId,
    authority: platformAdmin(),
    at: 2,
    actor: "platform-admin",
    reason: "bootstrap tenant owner",
    provenance: "tenant-admin-console",
  });
  fixture.tenantService.activateTenant(tenantId, { at: 3, actor: "platform-admin", reason: "tenant initialized" });
  return receipt;
}

test("bootstraps the initial tenant owner through explicit platform authority", () => {
  const fixture = createFixture();
  const receipt = bootstrapTenant(fixture, "dao-alpha", "principal-owner");

  assert.equal(receipt.membership.tenantId, "dao-alpha");
  assert.equal(receipt.membership.principalId, "principal-owner");
  assert.equal(receipt.membership.role, "tenant_owner");
  assert.equal(receipt.membership.status, "active");
  assert.equal(receipt.event.operation, "bootstrap");
  assert.equal(receipt.event.authorityKind, "platform_admin");
  assert.equal(receipt.event.authorityPrincipalId, "platform-admin");
  assert.equal(receipt.event.nextRole, "tenant_owner");
  assert.equal(receipt.event.nextStatus, "active");
  assert.equal(fixture.audit.listEvents()[0].eventType, "tenant.create");

  assert.throws(
    () =>
      fixture.membershipService.bootstrapTenantOwner({
        tenantId: "dao-alpha",
        principalId: "principal-owner",
        authority: platformAdmin(),
        at: 4,
      }),
    (error) =>
      error?.code === "ACS_TENANT_MEMBERSHIP_ALREADY_EXISTS" ||
      error?.code === "ACS_TENANT_STATE_BLOCKS_MEMBERSHIP_MUTATION",
  );
});

test("creates tenant memberships, rejects duplicates, rejects invalid principals, and blocks archived tenants", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-beta", "owner-beta");

  const membership = fixture.membershipService.addMembership({
    tenantId: "dao-beta",
    principalId: "operator-beta",
    role: "operator",
    authority: tenantAuthority("dao-beta", "owner-beta"),
    at: 4,
    actor: "owner-beta",
    reason: "delegate operator access",
  });

  assert.equal(membership.membership.role, "operator");
  assert.equal(membership.membership.status, "active");
  assert.equal(membership.event.previousRole, undefined);
  assert.equal(membership.event.nextRole, "operator");

  assert.throws(
    () =>
      fixture.membershipService.addMembership({
        tenantId: "dao-beta",
        principalId: "operator-beta",
        role: "auditor",
        authority: tenantAuthority("dao-beta", "owner-beta"),
        at: 5,
      }),
    (error) => error?.code === "ACS_TENANT_MEMBERSHIP_ALREADY_EXISTS",
  );

  assert.throws(
    () =>
      fixture.membershipService.addMembership({
        tenantId: "dao-beta",
        principalId: " ",
        role: "auditor",
        authority: tenantAuthority("dao-beta", "owner-beta"),
        at: 6,
      }),
    (error) => error?.code === "ACS_PRINCIPAL_IDENTITY_INVALID",
  );

  fixture.tenantService.archiveTenant("dao-beta", { at: 7, actor: "platform-admin", reason: "retired" });
  assert.throws(
    () =>
      fixture.membershipService.addMembership({
        tenantId: "dao-beta",
        principalId: "auditor-beta",
        role: "auditor",
        authority: platformAdmin(),
        at: 8,
      }),
    (error) =>
      error?.code === "ACS_TENANT_STATE_BLOCKS_MEMBERSHIP_MUTATION" ||
      error?.code === "ACS_TENANT_ADMIN_AUTHORITY_DENIED",
  );
});

test("authority evaluation distinguishes platform, owner, admin, operator, and auditor roles", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-gamma", "owner-gamma");

  fixture.membershipService.addMembership({
    tenantId: "dao-gamma",
    principalId: "admin-gamma",
    role: "tenant_admin",
    authority: tenantAuthority("dao-gamma", "owner-gamma"),
    at: 4,
  });
  fixture.membershipService.addMembership({
    tenantId: "dao-gamma",
    principalId: "operator-gamma",
    role: "operator",
    authority: tenantAuthority("dao-gamma", "owner-gamma"),
    at: 5,
  });
  fixture.membershipService.addMembership({
    tenantId: "dao-gamma",
    principalId: "auditor-gamma",
    role: "auditor",
    authority: tenantAuthority("dao-gamma", "owner-gamma"),
    at: 6,
  });

  const tenant = fixture.tenantService.getTenant("dao-gamma");
  const owner = fixture.membershipService.getMembership("dao-gamma", "owner-gamma");
  const admin = fixture.membershipService.getMembership("dao-gamma", "admin-gamma");
  const operator = fixture.membershipService.getMembership("dao-gamma", "operator-gamma");
  const auditor = fixture.membershipService.getMembership("dao-gamma", "auditor-gamma");

  assert.equal(
    evaluateTenantAdministrativeAuthority({
      action: "membership.add",
      authority: tenantAuthority("dao-gamma", "owner-gamma"),
      tenant,
      actorMembership: owner,
      ownerCount: 1,
      targetRole: "tenant_admin",
    }).allowed,
    true,
  );
  assert.equal(
    evaluateTenantAdministrativeAuthority({
      action: "membership.change_role",
      authority: tenantAuthority("dao-gamma", "admin-gamma"),
      tenant,
      actorMembership: admin,
      ownerCount: 1,
      targetRole: "operator",
    }).allowed,
    true,
  );
  assert.equal(
    evaluateTenantAdministrativeAuthority({
      action: "membership.remove",
      authority: tenantAuthority("dao-gamma", "operator-gamma"),
      tenant,
      actorMembership: operator,
      ownerCount: 1,
    }).allowed,
    false,
  );
  assert.equal(
    evaluateTenantAdministrativeAuthority({
      action: "membership.read",
      authority: tenantAuthority("dao-gamma", "auditor-gamma"),
      tenant,
      actorMembership: auditor,
      ownerCount: 1,
    }).allowed,
    true,
  );
  assert.equal(
    evaluateTenantAdministrativeAuthority({
      action: "membership.add",
      authority: platformAdmin(),
      tenant,
      ownerCount: 1,
      isBootstrap: false,
    }).allowed,
    true,
  );
});

test("blocks cross-tenant administrative mutation and self-promotion", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-a", "owner-a");
  bootstrapTenant(fixture, "dao-b", "owner-b");

  fixture.membershipService.addMembership({
    tenantId: "dao-a",
    principalId: "operator-a",
    role: "operator",
    authority: tenantAuthority("dao-a", "owner-a"),
    at: 4,
  });

  assert.throws(
    () =>
      fixture.membershipService.addMembership({
        tenantId: "dao-b",
        principalId: "cross-tenant",
        role: "auditor",
        authority: tenantAuthority("dao-a", "owner-a"),
        at: 5,
      }),
    (error) => error?.code === "ACS_TENANT_CROSS_TENANT_FORBIDDEN",
  );

  assert.throws(
    () =>
      fixture.membershipService.changeRole({
        tenantId: "dao-a",
        principalId: "operator-a",
        role: "tenant_admin",
        authority: tenantAuthority("dao-a", "operator-a"),
        at: 6,
        actor: "operator-a",
      }),
    (error) => error?.code === "ACS_TENANT_ADMIN_AUTHORITY_DENIED",
  );
});

test("protects single-owner invariants and transfer ownership atomically", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-owner", "owner-old");

  fixture.membershipService.addMembership({
    tenantId: "dao-owner",
    principalId: "admin-new",
    role: "tenant_admin",
    authority: tenantAuthority("dao-owner", "owner-old"),
    at: 4,
  });
  fixture.membershipService.addMembership({
    tenantId: "dao-owner",
    principalId: "operator-new",
    role: "operator",
    authority: tenantAuthority("dao-owner", "owner-old"),
    at: 5,
  });

  assert.throws(
    () =>
      fixture.membershipService.removeMembership({
        tenantId: "dao-owner",
        principalId: "owner-old",
        authority: tenantAuthority("dao-owner", "owner-old"),
        at: 6,
      }),
    (error) => error?.code === "ACS_TENANT_LAST_OWNER_PROTECTED",
  );

  const receipt = fixture.membershipService.transferOwnership({
    tenantId: "dao-owner",
    fromPrincipalId: "owner-old",
    toPrincipalId: "admin-new",
    authority: tenantAuthority("dao-owner", "owner-old"),
    at: 7,
    reason: "handoff",
  });

  assert.equal(receipt.membership.principalId, "admin-new");
  assert.equal(receipt.membership.role, "tenant_owner");
  assert.equal(receipt.event.operation, "transfer_ownership");
  assert.equal(fixture.membershipService.getMembership("dao-owner", "owner-old").role, "tenant_admin");
  assert.equal(fixture.membershipService.getMembership("dao-owner", "admin-new").role, "tenant_owner");

  assert.throws(
    () =>
      fixture.membershipService.transferOwnership({
        tenantId: "dao-owner",
        fromPrincipalId: "admin-new",
        toPrincipalId: "admin-new",
        authority: tenantAuthority("dao-owner", "admin-new"),
        at: 8,
      }),
    (error) => error?.code === "ACS_TENANT_OWNERSHIP_TRANSFER_INVALID",
  );
});

test("membership lifecycle respects suspend, reactivate, removed, suspended tenant, and archived tenant semantics", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-lifecycle", "owner-life");

  fixture.membershipService.addMembership({
    tenantId: "dao-lifecycle",
    principalId: "operator-life",
    role: "operator",
    authority: tenantAuthority("dao-lifecycle", "owner-life"),
    at: 4,
  });

  const suspended = fixture.membershipService.suspendMembership({
    tenantId: "dao-lifecycle",
    principalId: "operator-life",
    authority: tenantAuthority("dao-lifecycle", "owner-life"),
    at: 5,
    reason: "temporary pause",
  });
  assert.equal(suspended.membership.status, "suspended");

  const reactivated = fixture.membershipService.reactivateMembership({
    tenantId: "dao-lifecycle",
    principalId: "operator-life",
    authority: tenantAuthority("dao-lifecycle", "owner-life"),
    at: 6,
    reason: "restored",
  });
  assert.equal(reactivated.membership.status, "active");

  const removed = fixture.membershipService.removeMembership({
    tenantId: "dao-lifecycle",
    principalId: "operator-life",
    authority: tenantAuthority("dao-lifecycle", "owner-life"),
    at: 7,
    reason: "role ended",
  });
  assert.equal(removed.membership.status, "removed");

  assert.throws(
    () =>
      fixture.membershipService.changeRole({
        tenantId: "dao-lifecycle",
        principalId: "operator-life",
        role: "auditor",
        authority: tenantAuthority("dao-lifecycle", "owner-life"),
        at: 8,
      }),
    (error) => error?.code === "ACS_TENANT_MEMBERSHIP_INACTIVE",
  );

  fixture.tenantService.suspendTenant("dao-lifecycle", { at: 9, actor: "platform-admin", reason: "admin pause" });
  assert.throws(
    () =>
      fixture.membershipService.addMembership({
        tenantId: "dao-lifecycle",
        principalId: "auditor-life",
        role: "auditor",
        authority: tenantAuthority("dao-lifecycle", "owner-life"),
        at: 10,
      }),
    (error) =>
      error?.code === "ACS_TENANT_STATE_BLOCKS_MEMBERSHIP_MUTATION" ||
      error?.code === "ACS_TENANT_ADMIN_AUTHORITY_DENIED",
  );

  const platformMutation = fixture.membershipService.addMembership({
    tenantId: "dao-lifecycle",
    principalId: "auditor-platform",
    role: "auditor",
    authority: platformAdmin(),
    at: 11,
  });
  assert.equal(platformMutation.membership.principalId, "auditor-platform");

  fixture.tenantService.archiveTenant("dao-lifecycle", { at: 12, actor: "platform-admin", reason: "retired" });
  assert.throws(
    () =>
      fixture.membershipService.addMembership({
        tenantId: "dao-lifecycle",
        principalId: "auditor-archived",
        role: "auditor",
        authority: platformAdmin(),
        at: 13,
      }),
    (error) => error?.code === "ACS_TENANT_STATE_BLOCKS_MEMBERSHIP_MUTATION",
  );
});

test("membership mutations emit audit-ready receipts and events", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-audit", "owner-audit");

  const receipt = fixture.membershipService.addMembership({
    tenantId: "dao-audit",
    principalId: "operator-audit",
    role: "operator",
    authority: tenantAuthority("dao-audit", "owner-audit"),
    at: 4,
    actor: "owner-audit",
    reason: "operator onboarding",
    provenance: "tenant-admin-console",
  });

  assert.equal(receipt.event.tenantId, "dao-audit");
  assert.equal(receipt.event.principalId, "operator-audit");
  assert.equal(receipt.event.authorityKind, "tenant_member");
  assert.equal(receipt.event.authorityPrincipalId, "owner-audit");
  assert.equal(receipt.event.nextRole, "operator");
  assert.equal(receipt.event.nextStatus, "active");
  assert.equal(receipt.event.reason, "operator onboarding");
  assert.equal(receipt.event.timestamp, 4);
  assert.equal(receipt.event.revision, 1);

  const events = fixture.audit.listEvents();
  assert.equal(events.at(-1).eventType, "tenant.membership.add");
  assert.equal(events.at(-1).tenantId, "dao-audit");
  assert.equal(events.at(-1).actor, "owner-audit");
  assert.equal(events.at(-1).metadata.nextRole, "operator");
});
