import assert from "node:assert/strict";
import { createAcsAuthContext } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { routeProductApiRequest } from "../dist/http/routes/product-api-routes.js";

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async close() {},
  };
}

function jsonBodyRequest(payload, method = "POST") {
  const serialized = JSON.stringify(payload);
  return {
    method,
    url: "",
    headers: { "content-type": "application/json" },
    on(event, cb) {
      if (event === "data") cb(serialized);
      if (event === "end") cb();
    },
  };
}

function request(context, path, { method = "GET", payload, auth } = {}) {
  const req = payload ? jsonBodyRequest(payload, method) : { method, url: path, headers: {}, on() {} };
  return routeProductApiRequest(req, path, context, {
    correlationId: "corr-" + Math.random().toString(36).slice(2, 10),
    ...(auth ? { auth } : {}),
  });
}

async function scenarioPlatformLifecycle() {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const platformAuth = createAcsAuthContext({
      mode: "mock",
      actorType: "system",
      actorId: "acs-system",
      authenticated: true,
    });

    const createResult = await request(context, "/api/v1/admin/tenants", {
      method: "POST",
      auth: platformAuth,
      payload: {
        tenantId: "tenant-d01-api",
        displayName: "Tenant D01",
        createdBy: "acs-system",
      },
    });
    assert.equal(createResult.status, 201);
    assert.equal(createResult.body.success, true);
    assert.equal(createResult.body.data.tenant.tenantId, "tenant-d01-api");

    const bootstrapResult = await request(context, "/api/v1/admin/tenants/tenant-d01-api/ownership/bootstrap", {
      method: "POST",
      auth: platformAuth,
      payload: {
        principalId: "owner-d01",
        reason: "bootstrap owner",
      },
    });
    assert.equal(bootstrapResult.status, 200);
    assert.equal(bootstrapResult.body.data.membership.role, "tenant_owner");
    assert.equal(bootstrapResult.body.data.receipt.event.operation, "bootstrap");

    const listResult = await request(context, "/api/v1/admin/tenants", { auth: platformAuth });
    assert.equal(listResult.status, 200);
    assert.equal(listResult.body.data.some((tenant) => tenant.tenantId === "tenant-d01-api"), true);

    const detailResult = await request(context, "/api/v1/admin/tenants/tenant-d01-api", {
      auth: createAcsAuthContext({
        mode: "mock",
        actorType: "tenant-admin",
        actorId: "owner-d01",
        tenantId: "tenant-d01-api",
        authenticated: true,
      }),
    });
    assert.equal(detailResult.status, 200);
    assert.equal(detailResult.body.data.tenantId, "tenant-d01-api");
    assert.equal(detailResult.body.data.ownerSummary.count, 1);
    assert.equal(detailResult.body.data.governance.policy, undefined);

    const activateResult = await request(context, "/api/v1/admin/tenants/tenant-d01-api/activate", {
      method: "POST",
      auth: platformAuth,
    });
    assert.equal(activateResult.status, 200);
    assert.equal(activateResult.body.data.receipt.event.operation, "activate");
  } finally {
    await context.close();
  }
}

async function scenarioMembershipGovernance() {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const platformAuth = createAcsAuthContext({
      mode: "mock",
      actorType: "system",
      actorId: "acs-system",
      authenticated: true,
    });
    const ownerAuth = createAcsAuthContext({
      mode: "mock",
      actorType: "tenant-admin",
      actorId: "owner-d01",
      tenantId: "tenant-d01-flow",
      authenticated: true,
    });

    await request(context, "/api/v1/admin/tenants", {
      method: "POST",
      auth: platformAuth,
      payload: { tenantId: "tenant-d01-flow", displayName: "Tenant Flow" },
    });
    await request(context, "/api/v1/admin/tenants/tenant-d01-flow/ownership/bootstrap", {
      method: "POST",
      auth: platformAuth,
      payload: { principalId: "owner-d01" },
    });
    await request(context, "/api/v1/admin/tenants/tenant-d01-flow/activate", {
      method: "POST",
      auth: platformAuth,
    });

    const addMember = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/members", {
      method: "POST",
      auth: ownerAuth,
      payload: { principalId: "member-d01", role: "operator" },
    });
    assert.equal(addMember.status, 200);
    assert.equal(addMember.body.data.membership.role, "operator");

    const changeRole = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/members/member-d01/change-role", {
      method: "POST",
      auth: ownerAuth,
      payload: { role: "tenant_admin" },
    });
    assert.equal(changeRole.status, 200);
    assert.equal(changeRole.body.data.membership.role, "tenant_admin");

    const addTarget = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/members", {
      method: "POST",
      auth: ownerAuth,
      payload: { principalId: "new-owner-d01", role: "operator" },
    });
    assert.equal(addTarget.status, 200);

    const transferOwnership = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/ownership/transfer", {
      method: "POST",
      auth: ownerAuth,
      payload: { fromPrincipalId: "owner-d01", toPrincipalId: "new-owner-d01" },
    });
    assert.equal(transferOwnership.status, 200);
    assert.equal(transferOwnership.body.data.membership.role, "tenant_owner");

    const newOwnerAuth = createAcsAuthContext({
      mode: "mock",
      actorType: "tenant-admin",
      actorId: "new-owner-d01",
      tenantId: "tenant-d01-flow",
      authenticated: true,
    });

    const policy = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/governance/policy", {
      method: "PUT",
      auth: newOwnerAuth,
      payload: {
        policyId: "policy-d01",
        defaultEffect: "deny",
        rules: [
          { ruleId: "allow-create", action: "agent.create", effect: "allow", priority: 10 },
          { ruleId: "allow-configure", action: "agent.configure", effect: "allow", priority: 20 },
        ],
      },
    });
    assert.equal(policy.status, 200);
    assert.equal(policy.body.data.value.policyId, "policy-d01");

    const evaluation = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/governance/evaluate", {
      method: "POST",
      auth: newOwnerAuth,
      payload: { action: "agent.create" },
    });
    assert.equal(evaluation.status, 200);
    assert.equal(evaluation.body.data.decision, "allow");

    const entitlement = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/entitlements/custom_tools", {
      method: "PUT",
      auth: newOwnerAuth,
      payload: { enabled: true, reason: "enable custom tools" },
    });
    assert.equal(entitlement.status, 200);
    assert.equal(entitlement.body.data.value.enabled, true);

    const limits = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/limits/max_agents", {
      method: "PUT",
      auth: newOwnerAuth,
      payload: { value: 3, reason: "limit agents" },
    });
    assert.equal(limits.status, 200);
    assert.equal(limits.body.data.value.value, 3);

    const limitsRead = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/limits", { auth: ownerAuth });
    assert.equal(limitsRead.status, 200);
    assert.equal(limitsRead.body.data[0].evaluation.limitKey, "max_agents");

    const archive = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/archive", {
      method: "POST",
      auth: newOwnerAuth,
    });
    assert.equal(archive.status, 200);

    const blockedAfterArchive = await request(context, "/api/v1/admin/tenants/tenant-d01-flow/members", {
      method: "POST",
      auth: ownerAuth,
      payload: { principalId: "after-archive", role: "operator" },
    });
    assert.equal(blockedAfterArchive.status, 409);
    assert.equal(blockedAfterArchive.body.error.code, "conflict");
  } finally {
    await context.close();
  }
}

async function scenarioCrossTenantAccess() {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const platformAuth = createAcsAuthContext({
      mode: "mock",
      actorType: "system",
      actorId: "acs-system",
      authenticated: true,
    });

    await request(context, "/api/v1/admin/tenants", {
      method: "POST",
      auth: platformAuth,
      payload: { tenantId: "tenant-d01-a" },
    });
    await request(context, "/api/v1/admin/tenants/tenant-d01-a/ownership/bootstrap", {
      method: "POST",
      auth: platformAuth,
      payload: { principalId: "owner-a" },
    });
    await request(context, "/api/v1/admin/tenants", {
      method: "POST",
      auth: platformAuth,
      payload: { tenantId: "tenant-d01-b" },
    });
    await request(context, "/api/v1/admin/tenants/tenant-d01-b/ownership/bootstrap", {
      method: "POST",
      auth: platformAuth,
      payload: { principalId: "owner-b" },
    });

    const crossTenantDetail = await request(context, "/api/v1/admin/tenants/tenant-d01-b", {
      auth: createAcsAuthContext({
        mode: "mock",
        actorType: "tenant-admin",
        actorId: "owner-a",
        tenantId: "tenant-d01-a",
        authenticated: true,
      }),
    });
    assert.equal(crossTenantDetail.status, 403);
    assert.equal(crossTenantDetail.body.error.reason, "cross_tenant_scope");

    const nonPlatformList = await request(context, "/api/v1/admin/tenants", {
      auth: createAcsAuthContext({
        mode: "mock",
        actorType: "tenant-admin",
        actorId: "owner-a",
        tenantId: "tenant-d01-a",
        authenticated: true,
      }),
    });
    assert.equal(nonPlatformList.status, 403);
    assert.equal(nonPlatformList.body.error.reason, "platform_scope_required");

    const unauthorizedMemberMutation = await request(context, "/api/v1/admin/tenants/tenant-d01-b/members", {
      method: "POST",
      auth: createAcsAuthContext({
        mode: "mock",
        actorType: "tenant-admin",
        actorId: "owner-a",
        tenantId: "tenant-d01-a",
        authenticated: true,
      }),
      payload: { principalId: "intruder", role: "operator" },
    });
    assert.equal(unauthorizedMemberMutation.status, 403);
    assert.equal(unauthorizedMemberMutation.body.error.reason, "cross_tenant_scope");
  } finally {
    await context.close();
  }
}

async function scenarioSemanticErrors() {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const platformAuth = createAcsAuthContext({
      mode: "mock",
      actorType: "system",
      actorId: "acs-system",
      authenticated: true,
    });

    const missingTenant = await request(context, "/api/v1/admin/tenants/missing-tenant", {
      auth: createAcsAuthContext({
        mode: "mock",
        actorType: "tenant-admin",
        actorId: "owner-missing",
        tenantId: "missing-tenant",
        authenticated: true,
      }),
    });
    assert.equal(missingTenant.status, 404);
    assert.equal(missingTenant.body.error.code, "not_found");

    const invalidCreate = await request(context, "/api/v1/admin/tenants", {
      method: "POST",
      auth: platformAuth,
      payload: {},
    });
    assert.equal(invalidCreate.status, 400);
    assert.equal(invalidCreate.body.error.code, "invalid_query");

    await request(context, "/api/v1/admin/tenants", {
      method: "POST",
      auth: platformAuth,
      payload: { tenantId: "tenant-d01-dup" },
    });
    const duplicateCreate = await request(context, "/api/v1/admin/tenants", {
      method: "POST",
      auth: platformAuth,
      payload: { tenantId: "tenant-d01-dup" },
    });
    assert.equal(duplicateCreate.status, 409);
    assert.equal(duplicateCreate.body.error.code, "conflict");

    await request(context, "/api/v1/admin/tenants/tenant-d01-dup/ownership/bootstrap", {
      method: "POST",
      auth: platformAuth,
      payload: { principalId: "owner-d01" },
    });
    const invalidRole = await request(context, "/api/v1/admin/tenants/tenant-d01-dup/members", {
      method: "POST",
      auth: createAcsAuthContext({
        mode: "mock",
        actorType: "tenant-admin",
        actorId: "owner-d01",
        tenantId: "tenant-d01-dup",
        authenticated: true,
      }),
      payload: { principalId: "member-d01", role: "tenant_owner" },
    });
    assert.equal(invalidRole.status, 400);
    assert.equal(invalidRole.body.error.code, "invalid_query");
  } finally {
    await context.close();
  }
}

await scenarioPlatformLifecycle();
await scenarioMembershipGovernance();
await scenarioCrossTenantAccess();
await scenarioSemanticErrors();
