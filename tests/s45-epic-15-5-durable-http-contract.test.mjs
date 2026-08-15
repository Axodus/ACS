import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  AdministrativeStatePersistenceError,
  DurableAdministrativeState,
  TenantLifecycleService,
  createAcsHttpHandler,
} from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async close() {},
  };
}

function requestHeaders(actorType, actorId, tenantId) {
  return {
    "content-type": "application/json",
    "x-acs-auth-mode": "mock",
    "x-acs-actor-type": actorType,
    "x-acs-actor-id": actorId,
    "x-acs-authenticated": "true",
    ...(tenantId ? { "x-acs-tenant-id": tenantId } : {}),
  };
}

async function invoke(handler, { method = "GET", url, headers = {}, payload }) {
  const serialized = payload === undefined ? "" : JSON.stringify(payload);
  const response = {
    statusCode: 0,
    headers: {},
    bodyText: "",
    writeHead(status, responseHeaders) {
      this.statusCode = status;
      this.headers = responseHeaders;
      return this;
    },
    end(body) {
      this.bodyText = typeof body === "string" ? body : Buffer.from(body ?? "").toString("utf8");
    },
  };
  await handler({
    method,
    url,
    headers,
    on(event, callback) {
      if (event === "data" && serialized) callback(serialized);
      if (event === "end") callback();
    },
  }, response);
  return {
    status: response.statusCode,
    headers: response.headers,
    body: response.bodyText ? JSON.parse(response.bodyText) : undefined,
  };
}

test("durable administrative state survives a new context with revisions, ownership, governance and audit intact", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-b01-restart-"));
  const filePath = join(root, "administrative-state.json");
  const platformAuthority = { kind: "platform_admin", principalId: "system-b01" };
  const ownerAuthority = { kind: "tenant_member", principalId: "owner-b01", tenantId: "tenant-b01" };
  let first;
  let second;
  let third;
  try {
    first = createControlPlaneContext({
      engine: createMockEngine(),
      startLocalWorker: false,
      administrativeStatePath: filePath,
      tenantId: "tenant-bootstrap-b01",
    });
    assert.equal(first.administrativeState.durability, "single_node_durable");

    const created = first.tenantService.createTenant({
      tenantId: "tenant-b01",
      displayName: "Tenant B01",
      actor: "system-b01",
      correlationId: "corr-b01-create",
      at: 100,
    });
    first.tenantMembershipService.bootstrapTenantOwner({
      tenantId: "tenant-b01",
      principalId: "owner-b01",
      authority: platformAuthority,
      actor: "system-b01",
      correlationId: "corr-b01-owner",
      at: 110,
    });
    first.tenantService.activateTenant("tenant-b01", {
      actor: "system-b01",
      correlationId: "corr-b01-activate",
      at: 120,
    });
    first.tenantMembershipService.addMembership({
      tenantId: "tenant-b01",
      principalId: "next-owner-b01",
      role: "tenant_admin",
      authority: ownerAuthority,
      actor: "owner-b01",
      correlationId: "corr-b01-member",
      at: 130,
    });
    first.tenantMembershipService.transferOwnership({
      tenantId: "tenant-b01",
      fromPrincipalId: "owner-b01",
      toPrincipalId: "next-owner-b01",
      authority: ownerAuthority,
      actor: "owner-b01",
      correlationId: "corr-b01-transfer",
      at: 140,
    });
    const nextOwnerAuthority = { kind: "tenant_member", principalId: "next-owner-b01", tenantId: "tenant-b01" };
    first.tenantGovernanceService.replacePolicy({
      tenantId: "tenant-b01",
      authority: nextOwnerAuthority,
      policyId: "policy-b01",
      defaultEffect: "deny",
      rules: [{ ruleId: "allow-agent-create", action: "agent.create", effect: "allow", priority: 10 }],
      actor: "next-owner-b01",
      correlationId: "corr-b01-policy",
      at: 150,
    });
    first.tenantGovernanceService.grantEntitlement({
      tenantId: "tenant-b01",
      authority: nextOwnerAuthority,
      entitlementKey: "custom_tools",
      enabled: true,
      actor: "next-owner-b01",
      correlationId: "corr-b01-entitlement",
      at: 160,
    });
    first.tenantGovernanceService.setLimit({
      tenantId: "tenant-b01",
      authority: nextOwnerAuthority,
      limitKey: "max_agents",
      value: 7,
      actor: "next-owner-b01",
      correlationId: "corr-b01-limit",
      at: 170,
    });
    assert.equal(created.tenant.lifecycle.createdAt, 100);
    await first.close();
    first = undefined;

    second = createControlPlaneContext({
      engine: createMockEngine(),
      startLocalWorker: false,
      administrativeStatePath: filePath,
      tenantId: "tenant-bootstrap-b01",
    });
    const tenant = second.tenantService.getTenant("tenant-b01");
    assert.equal(tenant.status, "active");
    assert.equal(tenant.revision, 2);
    assert.equal(tenant.lifecycle.createdAt, 100);
    assert.equal(tenant.lifecycle.activatedAt, 120);

    const memberships = second.tenantMembershipService.listMemberships("tenant-b01");
    assert.equal(memberships.filter((membership) => membership.role === "tenant_owner" && membership.status === "active").length, 1);
    assert.equal(second.tenantMembershipService.getMembership("tenant-b01", "owner-b01").role, "tenant_admin");
    assert.equal(second.tenantMembershipService.getMembership("tenant-b01", "next-owner-b01").revision, 2);

    const governance = second.tenantGovernanceService.readGovernanceState("tenant-b01", platformAuthority);
    assert.equal(governance.policy.policyId, "policy-b01");
    assert.equal(governance.entitlements[0].enabled, true);
    assert.equal(governance.limits[0].value, 7);
    assert.equal(governance.updatedAt, 170);
    assert.equal(second.auditService.queryEvents({ tenantId: "tenant-b01", correlationId: "corr-b01-transfer" }).length, 1);
    assert.equal(second.auditService.queryEvents({ tenantId: "tenant-b01", correlationId: "corr-b01-limit" }).length, 1);

    const updatedLimit = second.tenantGovernanceService.setLimit({
      tenantId: "tenant-b01",
      authority: { kind: "tenant_member", principalId: "next-owner-b01", tenantId: "tenant-b01" },
      limitKey: "max_agents",
      value: 8,
      actor: "next-owner-b01",
      at: 175,
    });
    assert.equal(updatedLimit.revision, governance.revision + 1);
    assert.equal(updatedLimit.nextValue.revision, 2);

    second.tenantMembershipService.changeRole({
      tenantId: "tenant-b01",
      principalId: "owner-b01",
      role: "operator",
      authority: { kind: "tenant_member", principalId: "next-owner-b01", tenantId: "tenant-b01" },
      actor: "next-owner-b01",
      at: 180,
    });
    second.tenantService.suspendTenant("tenant-b01", {
      actor: "next-owner-b01",
      correlationId: "corr-b01-suspend",
      at: 190,
    });
    await second.close();
    second = undefined;

    third = createControlPlaneContext({
      engine: createMockEngine(),
      startLocalWorker: false,
      administrativeStatePath: filePath,
      tenantId: "tenant-bootstrap-b01",
    });
    assert.equal(third.tenantService.getTenant("tenant-b01").status, "suspended");
    assert.equal(third.tenantService.getTenant("tenant-b01").revision, 3);
    assert.equal(third.tenantService.getTenant("tenant-b01").lifecycle.suspendedAt, 190);
    const updatedMember = third.tenantMembershipService.getMembership("tenant-b01", "owner-b01");
    assert.equal(updatedMember.role, "operator");
    assert.equal(updatedMember.revision, 3);
    assert.equal(updatedMember.updatedAt, 180);
  } finally {
    if (first) await first.close();
    if (second) await second.close();
    if (third) await third.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("durable repository does not report success or retain in-memory state when the atomic write fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "acs-b01-failure-"));
  const blockedParent = join(root, "not-a-directory");
  await writeFile(blockedParent, "blocked", "utf8");
  try {
    const durable = new DurableAdministrativeState({ filePath: join(blockedParent, "state.json") });
    const service = new TenantLifecycleService({ repository: durable.tenantRepository });
    assert.throws(
      () => service.createTenant({ tenantId: "tenant-write-failure", at: 1 }),
      (error) => error instanceof AdministrativeStatePersistenceError,
    );
    assert.equal(durable.tenantRepository.list().length, 0);

    const corruptPath = join(root, "corrupt.json");
    await writeFile(corruptPath, "{not-json", "utf8");
    assert.throws(
      () => new DurableAdministrativeState({ filePath: corruptPath }),
      (error) => error instanceof AdministrativeStatePersistenceError,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("HTTP server accepts Product API methods and routes PUT, PATCH and DELETE to real handlers", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  const handler = createAcsHttpHandler(context);
  const systemHeaders = requestHeaders("system", "system-b01");
  const ownerHeaders = requestHeaders("tenant-admin", "owner-http-b01", "tenant-http-b01");
  const devOwnerHeaders = requestHeaders("tenant-admin", "dev-operator", "tenant-dev");
  try {
    const getResult = await invoke(handler, { url: "/api/v1/admin/tenants", headers: systemHeaders });
    assert.equal(getResult.status, 200);

    const createResult = await invoke(handler, {
      method: "POST",
      url: "/api/v1/admin/tenants",
      headers: systemHeaders,
      payload: { tenantId: "tenant-http-b01" },
    });
    assert.equal(createResult.status, 201);
    assert.equal((await invoke(handler, {
      method: "POST",
      url: "/api/v1/admin/tenants/tenant-http-b01/ownership/bootstrap",
      headers: systemHeaders,
      payload: { principalId: "owner-http-b01" },
    })).status, 200);
    assert.equal((await invoke(handler, {
      method: "POST",
      url: "/api/v1/admin/tenants/tenant-http-b01/activate",
      headers: systemHeaders,
    })).status, 200);

    const policyResult = await invoke(handler, {
      method: "PUT",
      url: "/api/v1/admin/tenants/tenant-http-b01/governance/policy",
      headers: ownerHeaders,
      payload: {
        policyId: "policy-http-b01",
        defaultEffect: "deny",
        rules: [{ ruleId: "allow-agent-create", action: "agent.create", effect: "allow", priority: 10 }],
      },
    });
    assert.equal(policyResult.status, 200);
    assert.equal(policyResult.body.data.value.policyId, "policy-http-b01");

    assert.equal((await invoke(handler, {
      method: "PUT",
      url: "/api/v1/admin/tenants/tenant-http-b01/entitlements/custom_tools",
      headers: ownerHeaders,
      payload: { enabled: true },
    })).status, 200);
    const deleteEntitlement = await invoke(handler, {
      method: "DELETE",
      url: "/api/v1/admin/tenants/tenant-http-b01/entitlements/custom_tools",
      headers: ownerHeaders,
    });
    assert.equal(deleteEntitlement.status, 200);
    assert.equal(deleteEntitlement.body.data.value.enabled, false);

    assert.equal((await invoke(handler, {
      method: "PUT",
      url: "/api/v1/admin/tenants/tenant-http-b01/limits/max_agents",
      headers: ownerHeaders,
      payload: { value: 4 },
    })).status, 200);
    const deleteLimit = await invoke(handler, {
      method: "DELETE",
      url: "/api/v1/admin/tenants/tenant-http-b01/limits/max_agents",
      headers: ownerHeaders,
    });
    assert.equal(deleteLimit.status, 200);

    const currentAgent = context.agentService.get("dev-agent-sandbox");
    const patchResult = await invoke(handler, {
      method: "PATCH",
      url: "/api/v1/agents/dev-agent-sandbox",
      headers: devOwnerHeaders,
      payload: {
        definition: { ...currentAgent.definition, name: "DEV Sandbox Agent B01" },
        expectedRevision: currentAgent.revision,
      },
    });
    assert.equal(patchResult.status, 200);
    assert.equal(patchResult.body.success, true);
    assert.equal(context.agentService.get("dev-agent-sandbox").definition.name, "DEV Sandbox Agent B01");

    const optionsResult = await invoke(handler, { method: "OPTIONS", url: "/api/v1/admin/tenants" });
    assert.equal(optionsResult.status, 204);
    assert.match(optionsResult.headers["access-control-allow-methods"], /PUT/);
    assert.match(optionsResult.headers["access-control-allow-methods"], /PATCH/);
    assert.match(optionsResult.headers["access-control-allow-methods"], /DELETE/);

    const unsupported = await invoke(handler, { method: "TRACE", url: "/api/v1/health" });
    assert.equal(unsupported.status, 405);
    assert.match(unsupported.headers.allow, /PUT/);
    assert.deepEqual(unsupported.body.error.details.allowedMethods, ["GET", "POST", "PUT", "PATCH", "DELETE"]);
  } finally {
    await context.close();
  }
});

test("runtime start and stop routes are reachable before unsupported-operation guards", async () => {
  const context = createControlPlaneContext({ engine: createMockEngine(), startLocalWorker: false });
  let starts = 0;
  let stops = 0;
  context.runtimeService = {
    async start(request) {
      starts += 1;
      return {
        runtimeInstanceId: "runtime-b01",
        deploymentId: request.deploymentId,
        targetId: request.targetId,
        deploymentMode: "sandbox",
        status: "running",
        startedAt: 1,
        updatedAt: 1,
      };
    },
    async stop(runtimeInstanceId) {
      stops += 1;
      return {
        runtimeInstanceId,
        deploymentId: "deployment-b01",
        targetId: "local-wsl",
        deploymentMode: "sandbox",
        status: "stopped",
        startedAt: 1,
        stoppedAt: 2,
        updatedAt: 2,
      };
    },
  };
  const handler = createAcsHttpHandler(context);
  try {
    const started = await invoke(handler, {
      method: "POST",
      url: "/api/v1/runtimes/runtime-b01/start",
      payload: { deploymentId: "deployment-b01", targetId: "local-wsl", agentId: "dev-agent-sandbox" },
    });
    assert.equal(started.status, 200);
    assert.equal(started.body.data.status, "running");
    assert.equal(starts, 1);

    const stopped = await invoke(handler, {
      method: "POST",
      url: "/api/v1/runtimes/runtime-b01/stop",
    });
    assert.equal(stopped.status, 200);
    assert.equal(stopped.body.data.status, "stopped");
    assert.equal(stops, 1);

    const wrongMethod = await invoke(handler, {
      method: "GET",
      url: "/api/v1/runtimes/runtime-b01/start",
    });
    assert.equal(wrongMethod.status, 405);
  } finally {
    await context.close();
  }
});
