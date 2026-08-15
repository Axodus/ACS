import assert from "node:assert/strict";
import test from "node:test";
import {
  AuditService,
  InMemoryTenantRepository,
  TenantLifecycleService,
  evaluateTenantGovernanceAuthority,
} from "../dist/index.js";
import { TenantMembershipService } from "../dist/control-plane/tenant-membership.js";
import { TenantGovernanceService } from "../dist/control-plane/tenant-governance.js";

function createFixture() {
  const tenantRepository = new InMemoryTenantRepository();
  const audit = new AuditService();
  const tenantService = new TenantLifecycleService({ repository: tenantRepository, auditService: audit });
  const membershipService = new TenantMembershipService({ tenantRepository, auditService: audit });
  const governanceService = new TenantGovernanceService({
    tenantRepository,
    membershipService,
    auditService: audit,
    hardSystemPolicy: { "execution.start": "deny" },
    hardSystemLimits: { max_agents: 5, max_active_deployments: 3 },
  });
  return { tenantRepository, audit, tenantService, membershipService, governanceService };
}

function platformAdmin(principalId = "platform-admin") {
  return { kind: "platform_admin", principalId };
}

function tenantAuthority(tenantId, principalId) {
  return { kind: "tenant_member", tenantId, principalId };
}

function bootstrapTenant(fixture, tenantId, ownerPrincipalId = "owner-1") {
  fixture.tenantService.createTenant({ tenantId, at: 1, actor: "platform-admin" });
  fixture.membershipService.bootstrapTenantOwner({
    tenantId,
    principalId: ownerPrincipalId,
    authority: platformAdmin(),
    at: 2,
    actor: "platform-admin",
    reason: "bootstrap tenant owner",
    provenance: "tenant-admin-console",
  });
  fixture.tenantService.activateTenant(tenantId, { at: 3, actor: "platform-admin", reason: "tenant initialized" });
}

test("evaluates governance policies with explicit allow, explicit deny, default allow, and hard system prohibition precedence", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-governance", "owner-governance");

  fixture.membershipService.addMembership({
    tenantId: "dao-governance",
    principalId: "admin-governance",
    role: "tenant_admin",
    authority: tenantAuthority("dao-governance", "owner-governance"),
    at: 4,
  });

  const policyReceipt = fixture.governanceService.replacePolicy({
    tenantId: "dao-governance",
    authority: tenantAuthority("dao-governance", "owner-governance"),
    policyId: "policy-governance",
    defaultEffect: "allow",
    rules: [
      { ruleId: "deny-deployment", action: "deployment.create", effect: "deny", priority: 10, reason: "deployment frozen" },
      { ruleId: "allow-deployment", action: "deployment.create", effect: "allow", priority: 10, reason: "fallback allow" },
      { ruleId: "allow-agent", action: "agent.create", effect: "allow", priority: 5, reason: "agents allowed" },
    ],
    at: 5,
    actor: "owner-governance",
    reason: "configure governance",
    provenance: "tenant-admin-console",
  });

  assert.equal(policyReceipt.nextValue.policyId, "policy-governance");
  assert.equal(policyReceipt.event.operation, "policy.replace");
  assert.equal(policyReceipt.event.authorityKind, "tenant_member");
  assert.equal(policyReceipt.event.authorityPrincipalId, "owner-governance");
  assert.equal(policyReceipt.event.objectType, "policy");
  assert.equal(policyReceipt.event.key, "policy-governance");
  assert.equal(fixture.audit.listEvents().at(-1).eventType, "tenant.governance.policy_replaced");

  const explicitDeny = fixture.governanceService.evaluateGovernedAction({
    tenantId: "dao-governance",
    action: "deployment.create",
    at: 6,
    actor: "owner-governance",
  });
  assert.equal(explicitDeny.decision, "deny");
  assert.equal(explicitDeny.basis, "explicit_tenant_deny");
  assert.equal(explicitDeny.policyId, "policy-governance");
  assert.equal(explicitDeny.matchedRuleId, "deny-deployment");

  const explicitAllow = fixture.governanceService.evaluateGovernedAction({
    tenantId: "dao-governance",
    action: "agent.create",
    at: 7,
    actor: "owner-governance",
  });
  assert.equal(explicitAllow.decision, "allow");
  assert.equal(explicitAllow.basis, "explicit_tenant_allow");
  assert.equal(explicitAllow.policyId, "policy-governance");
  assert.equal(explicitAllow.matchedRuleId, "allow-agent");

  const tenantDefault = fixture.governanceService.evaluateGovernedAction({
    tenantId: "dao-governance",
    action: "tool.install",
    at: 8,
    actor: "owner-governance",
  });
  assert.equal(tenantDefault.decision, "allow");
  assert.equal(tenantDefault.basis, "tenant_default");
  assert.equal(tenantDefault.policyId, "policy-governance");
  assert.equal(tenantDefault.matchedRuleId, undefined);

  const hardProhibition = fixture.governanceService.evaluateGovernedAction({
    tenantId: "dao-governance",
    action: "execution.start",
    at: 9,
    actor: "owner-governance",
  });
  assert.equal(hardProhibition.decision, "deny");
  assert.equal(hardProhibition.basis, "system_hard_prohibition");
  assert.equal(hardProhibition.policyId, undefined);

  const decisionEvent = fixture.audit.listEvents().find((event) => event.eventType === "governance.evaluated" && event.metadata?.action === "deployment.create");
  assert.equal(decisionEvent?.decision, "denied");
  assert.equal(decisionEvent?.metadata?.basis, "explicit_tenant_deny");
  assert.equal(decisionEvent?.metadata?.matchedRuleId, "deny-deployment");
});

test("enforces authority boundaries for governance mutations and blocks suspended or archived tenant mutations", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-authority", "owner-authority");

  fixture.membershipService.addMembership({
    tenantId: "dao-authority",
    principalId: "admin-authority",
    role: "tenant_admin",
    authority: tenantAuthority("dao-authority", "owner-authority"),
    at: 4,
  });

  const governanceState = fixture.governanceService.readGovernanceState("dao-authority", tenantAuthority("dao-authority", "admin-authority"));
  assert.equal(governanceState.tenantId, "dao-authority");

  assert.throws(
    () =>
      fixture.governanceService.replacePolicy({
        tenantId: "dao-authority",
        authority: tenantAuthority("dao-authority", "admin-authority"),
        policyId: "policy-admin",
        defaultEffect: "deny",
        rules: [],
        at: 5,
      }),
    (error) => error?.code === "ACS_TENANT_GOVERNANCE_MUTATION_UNAUTHORIZED",
  );

  assert.throws(
    () =>
      fixture.governanceService.replacePolicy({
        tenantId: "dao-authority",
        authority: tenantAuthority("other-tenant", "owner-authority"),
        policyId: "policy-cross",
        defaultEffect: "deny",
        rules: [],
        at: 6,
      }),
    (error) => error?.code === "ACS_TENANT_CROSS_TENANT_GOVERNANCE_FORBIDDEN",
  );

  fixture.tenantService.suspendTenant("dao-authority", { at: 7, actor: "platform-admin", reason: "maintenance" });
  assert.throws(
    () =>
      fixture.governanceService.replacePolicy({
        tenantId: "dao-authority",
        authority: platformAdmin(),
        policyId: "policy-suspended",
        defaultEffect: "deny",
        rules: [],
        at: 8,
      }),
    (error) => error?.code === "ACS_TENANT_STATE_BLOCKS_GOVERNANCE_MUTATION",
  );

  fixture.tenantService.archiveTenant("dao-authority", { at: 9, actor: "platform-admin", reason: "retired" });
  assert.throws(
    () =>
      fixture.governanceService.replacePolicy({
        tenantId: "dao-authority",
        authority: platformAdmin(),
        policyId: "policy-archived",
        defaultEffect: "deny",
        rules: [],
        at: 10,
      }),
    (error) => error?.code === "ACS_TENANT_ARCHIVED_GOVERNANCE_MUTATION",
  );
});

test("evaluates entitlements and limits with tenant state, hard maxima, and audit-ready receipts", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-quotas", "owner-quotas");

  const entitlementReceipt = fixture.governanceService.grantEntitlement({
    tenantId: "dao-quotas",
    authority: tenantAuthority("dao-quotas", "owner-quotas"),
    entitlementKey: "plugin_installation",
    enabled: true,
    at: 4,
    actor: "owner-quotas",
    reason: "enable plugins",
    provenance: "tenant-admin-console",
  });
  assert.equal(entitlementReceipt.nextValue.enabled, true);
  assert.equal(entitlementReceipt.event.operation, "entitlement.grant");
  assert.equal(entitlementReceipt.event.objectType, "entitlement");
  assert.equal(fixture.audit.listEvents().at(-1).eventType, "tenant.governance.entitlement_granted");

  const entitlementDecision = fixture.governanceService.evaluateEntitlement({
    tenantId: "dao-quotas",
    entitlementKey: "plugin_installation",
    at: 5,
  });
  assert.equal(entitlementDecision.granted, true);
  assert.equal(entitlementDecision.basis, "explicit_grant");

  const missingEntitlement = fixture.governanceService.evaluateEntitlement({
    tenantId: "dao-quotas",
    entitlementKey: "distributed_execution",
    at: 6,
  });
  assert.equal(missingEntitlement.granted, false);
  assert.equal(missingEntitlement.basis, "missing_default_denied");

  const limitReceipt = fixture.governanceService.setLimit({
    tenantId: "dao-quotas",
    authority: tenantAuthority("dao-quotas", "owner-quotas"),
    limitKey: "max_agents",
    value: 4,
    at: 7,
    actor: "owner-quotas",
    reason: "cap agent growth",
  });
  assert.equal(limitReceipt.nextValue.value, 4);
  assert.equal(limitReceipt.event.operation, "limit.set");
  assert.equal(fixture.audit.listEvents().at(-1).eventType, "tenant.governance.limit_set");

  const effectiveLimit = fixture.governanceService.evaluateLimit({
    tenantId: "dao-quotas",
    limitKey: "max_agents",
    requestedAmount: 1,
    usage: 2,
    at: 8,
  });
  assert.equal(effectiveLimit.configuredLimit, 4);
  assert.equal(effectiveLimit.hardSystemLimit, 5);
  assert.equal(effectiveLimit.effectiveLimit, 4);
  assert.equal(effectiveLimit.withinLimit, true);
  assert.equal(effectiveLimit.basis, "tenant_and_system_limit");

  const exceeded = fixture.governanceService.evaluateLimit({
    tenantId: "dao-quotas",
    limitKey: "max_agents",
    requestedAmount: 3,
    usage: 2,
    at: 9,
  });
  assert.equal(exceeded.withinLimit, false);
  assert.equal(exceeded.basis, "limit_exceeded");

  const hardOnly = fixture.governanceService.evaluateLimit({
    tenantId: "dao-quotas",
    limitKey: "max_active_deployments",
    requestedAmount: 3,
    at: 10,
  });
  assert.equal(hardOnly.configuredLimit, undefined);
  assert.equal(hardOnly.hardSystemLimit, 3);
  assert.equal(hardOnly.effectiveLimit, 3);
  assert.equal(hardOnly.basis, "system_hard_limit");

  assert.throws(
    () =>
      fixture.governanceService.setLimit({
        tenantId: "dao-quotas",
        authority: tenantAuthority("dao-quotas", "owner-quotas"),
        limitKey: "max_agents",
        value: -1,
        at: 11,
      }),
    /non-negative integer/,
  );

  assert.throws(
    () =>
      fixture.governanceService.setLimit({
        tenantId: "dao-quotas",
        authority: tenantAuthority("dao-quotas", "owner-quotas"),
        limitKey: "max_agents",
        value: 6,
        at: 12,
      }),
    (error) => error?.code === "ACS_TENANT_LIMIT_EXCEEDS_HARD_MAXIMUM",
  );
});

test("blocks governance mutations on suspended or archived tenants while preserving readable state", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-state", "owner-state");

  fixture.governanceService.replacePolicy({
    tenantId: "dao-state",
    authority: tenantAuthority("dao-state", "owner-state"),
    policyId: "policy-state",
    defaultEffect: "deny",
    rules: [{ ruleId: "allow-agent", action: "agent.create", effect: "allow", priority: 1 }],
    at: 4,
  });

  fixture.tenantService.suspendTenant("dao-state", { at: 5, actor: "platform-admin", reason: "temporary pause" });
  const suspendedRead = fixture.governanceService.readGovernanceState("dao-state", tenantAuthority("dao-state", "owner-state"));
  assert.equal(suspendedRead.policy?.policyId, "policy-state");
  assert.equal(
    fixture.governanceService.evaluateEntitlement({ tenantId: "dao-state", entitlementKey: "plugin_installation", at: 6 }).basis,
    "tenant_state_suspended",
  );
  assert.equal(
    fixture.governanceService.evaluateGovernedAction({ tenantId: "dao-state", action: "agent.create", at: 6 }).basis,
    "tenant_state_suspended",
  );

  fixture.tenantService.archiveTenant("dao-state", { at: 7, actor: "platform-admin", reason: "retired" });
  assert.equal(
    fixture.governanceService.evaluateEntitlement({ tenantId: "dao-state", entitlementKey: "plugin_installation", at: 8 }).basis,
    "tenant_state_archived",
  );
  assert.equal(
    fixture.governanceService.evaluateGovernedAction({ tenantId: "dao-state", action: "agent.create", at: 8 }).basis,
    "tenant_state_archived",
  );
});

test("documents governance contract validation and deterministic authority evaluation", () => {
  const fixture = createFixture();
  bootstrapTenant(fixture, "dao-validation", "owner-validation");

  const tenant = fixture.tenantService.getTenant("dao-validation");
  const ownerMembership = fixture.membershipService.getMembership("dao-validation", "owner-validation");
  assert.equal(
    evaluateTenantGovernanceAuthority({
      action: "governance.read",
      authority: tenantAuthority("dao-validation", "owner-validation"),
      tenant,
      actorMembership: ownerMembership,
    }).allowed,
    true,
  );

  assert.throws(
    () =>
      fixture.governanceService.replacePolicy({
        tenantId: "dao-validation",
        authority: tenantAuthority("dao-validation", "owner-validation"),
        policyId: " ",
        defaultEffect: "deny",
        rules: [],
        at: 4,
      }),
    (error) => error?.code === "ACS_TENANT_GOVERNANCE_POLICY_INVALID",
  );

  const auditEvent = fixture.governanceService.evaluateGovernedAction({
    tenantId: "dao-validation",
    action: "agent.create",
    at: 5,
    actor: "owner-validation",
    correlationId: "corr-governance-eval",
  }).event;
  assert.equal(auditEvent?.correlationId, "corr-governance-eval");
  assert.equal(auditEvent?.decision, "deny");
  assert.equal(auditEvent?.basis, "no_policy_configured_default_deny");
});
