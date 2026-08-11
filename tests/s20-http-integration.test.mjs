import assert from "node:assert/strict";
import test from "node:test";
import { createAcsHttpHandler, routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { ProductApiClient } from "../dist/control-plane/product-api-client.js";
import { AgentRevisionConflictError } from "../dist/index.js";
import { NotFoundError } from "../dist/errors.js";
import { EngineSandboxOnlyError } from "../dist/index.js";
import { PolicyRejectedError } from "../dist/errors.js";

function createMockEngine() {
  return {
    identity: { id: "openclaw", provider: "agentsai" },
    async health() {
      return {
        identity: this.identity,
        status: "ready",
        supportedProtocols: ["acs-protocol"],
        operations: ["health"],
      };
    },
    async listExecutionTargets() {
      return [];
    },
    async close() {},
  };
}

test("GET /api/v1/health reports Product API connectivity", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/health", headers: {} },
      "/api/v1/health",
      context,
      { correlationId: "test_health" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.deepEqual(result.body.data, {
      service: "acs-product-api",
      status: "ok",
      mode: "inspection",
      automation: "disabled",
    });
  } finally {
    await context.close();
  }
});

test("GET /api/v1/dashboard returns a read-only operational summary", async () => {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/dashboard", headers: {} },
      "/api/v1/dashboard",
      context,
      { correlationId: "test_dashboard" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);

    const summary = result.body.data;
    assert.equal(summary.system.service, "acs-product-api");
    assert.equal(summary.system.status, "ok");
    assert.equal(summary.system.mode, "inspection");
    assert.equal(summary.system.automation, "disabled");
    assert.equal(summary.system.readOnly, true);
    assert.equal(typeof summary.system.generatedAt, "number");
    assert.equal(typeof summary.system.checkedAt, "number");
    assert.equal(typeof summary.system.stale, "boolean");
    assert.equal(summary.system.refreshWindowMs, 30_000);
    assert.equal(typeof summary.system.stateAgeMs, "number");
    assert.deepEqual(summary.system.guardrails, {
      inspectionMode: true,
      sandboxOnly: true,
      readOnly: true,
      mutableOperations: false,
    });
    assert.equal(typeof summary.agents.total, "number");
    assert.equal(typeof summary.deployments.total, "number");
    assert.equal(typeof summary.runtimes.total, "number");
    assert.equal(typeof summary.workers.total, "number");
    assert.equal(typeof summary.executionRuns.total, "number");
    assert.ok(Array.isArray(summary.blockers));
    assert.ok(Array.isArray(summary.warnings));
    assert.equal(typeof summary.readiness.blockerCount, "number");
    assert.equal(typeof summary.readiness.warningCount, "number");
    assert.equal(typeof summary.readiness.evidenceCount, "number");
    assert.equal(typeof summary.readiness.checkedAt, "number");
    assert.equal(typeof summary.runtime.checkedAt, "number");
    assert.ok(["connected", "degraded", "unavailable", "unverified"].includes(summary.runtime.connectivity));
  } finally {
    await context.close();
  }
});

test("GET /api/v1/readiness returns a read-only readiness inspection", async () => {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/readiness", headers: {} },
      "/api/v1/readiness",
      context,
      { correlationId: "test_readiness" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);

    const summary = result.body.data;
    assert.equal(summary.mode, "inspection");
    assert.equal(summary.readOnly, true);
    assert.equal(typeof summary.stale, "boolean");
    assert.equal(summary.refreshWindowMs, 30_000);
    assert.equal(typeof summary.stateAgeMs, "number");
    assert.deepEqual(summary.guardrails, {
      inspectionMode: true,
      sandboxOnly: true,
      readOnly: true,
      mutableOperations: false,
    });
    assert.equal(summary.productApi.service, "acs-product-api");
    assert.equal(summary.productApi.status, "ok");
    assert.equal(summary.productApi.mode, "inspection");
    assert.equal(summary.productApi.automation, "disabled");
    assert.equal(summary.productApi.checkMode, "inspection-read-only");
    assert.equal(summary.runtime.connectivity, "connected");
    assert.equal(typeof summary.runtime.checkedAt, "number");
    assert.equal(summary.readiness.devReady, true);
    assert.equal(summary.readiness.distributedRuntimeReady, false);
    assert.equal(summary.readiness.productionReady, false);
    assert.equal(summary.readiness.status, "blocked");
    assert.ok(summary.readiness.blockerCount > 0);
    assert.equal(typeof summary.readiness.warningCount, "number");
    assert.equal(typeof summary.readiness.evidenceCount, "number");
    assert.equal(typeof summary.readiness.refreshedAt, "number");
    assert.ok(Array.isArray(summary.readinessFlags));
    assert.ok(summary.readinessFlags.length > 0);
    assert.equal(summary.readinessFlags.find(flag => flag.id === "production").status, "blocked");
    assert.ok(Array.isArray(summary.healthIndicators));
    assert.ok(summary.healthIndicators.some(indicator => indicator.id === "infrastructure"));
    assert.ok(Array.isArray(summary.components));
    assert.ok(Array.isArray(summary.blockers));
    assert.ok(summary.blockers.length > 0);
    assert.ok(Array.isArray(summary.warnings));
    assert.ok(Array.isArray(summary.evidence));
    assert.ok(summary.evidence.length > 0);

    const serialized = JSON.stringify(result.body);
    assert.equal(serialized.includes("sk-"), false);
    assert.equal(serialized.includes("apiKey"), false);
  } finally {
    await context.close();
  }
});

async function invokeHandler(handler, request) {
  const response = {
    statusCode: 0,
    headers: {},
    bodyText: "",
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
      return this;
    },
    end(body) {
      this.bodyText = typeof body === "string" ? body : Buffer.from(body ?? "").toString("utf8");
    },
  };

  await handler({
    method: request.method ?? "GET",
    url: request.url,
    headers: request.headers ?? {},
  }, response);

  return {
    status: response.statusCode,
    body: JSON.parse(response.bodyText),
  };
}

test("GET /api/v1/agents returns agent list", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents", headers: {} },
      "/api/v1/agents",
      context,
      { correlationId: "test_agents" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));
  } finally {
    await context.close();
  }
});

test("GET /api/v1/agents/:agentId returns agent detail", async () => {
  const context = createControlPlaneContext();
  try {
    // First get list to find an agent
    const listResult = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents", headers: {} },
      "/api/v1/agents",
      context,
      { correlationId: "test_detail" },
    );

    if (listResult.body.data.length > 0) {
      const agentId = listResult.body.data[0].agentId;
      const result = await routeProductApiRequest(
        { method: "GET", url: `/api/v1/agents/${agentId}`, headers: {} },
        `/api/v1/agents/${agentId}`,
        context,
        { correlationId: "test_detail" },
      );

      assert.equal(result.status, 200);
      assert.equal(result.body.success, true);
      assert.equal(result.body.data.agentId, agentId);
    }
  } finally {
    await context.close();
  }
});

test("GET /api/v1/agents/:agentId returns 404 for unknown agent", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/nonexistent", headers: {} },
      "/api/v1/agents/nonexistent",
      context,
      { correlationId: "test_404" },
    );

    assert.equal(result.status, 404);
    assert.equal(result.body.success, false);
  } finally {
    await context.close();
  }
});

test("GET /api/v1/targets returns target list", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/targets", headers: {} },
      "/api/v1/targets",
      context,
      { correlationId: "test_targets" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));
  } finally {
    await context.close();
  }
});

test("GET /api/v1/providers returns provider list", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/providers", headers: {} },
      "/api/v1/providers",
      context,
      { correlationId: "test_providers" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));
  } finally {
    await context.close();
  }
});

test("GET /api/v1/runners returns runner list", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/runners", headers: {} },
      "/api/v1/runners",
      context,
      { correlationId: "test_runners" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));
  } finally {
    await context.close();
  }
});

test("GET /api/v1/audit returns audit events", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/audit", headers: {} },
      "/api/v1/audit",
      context,
      { correlationId: "test_audit" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.ok(Array.isArray(result.body.data));
  } finally {
    await context.close();
  }
});

test("POST /api/v1/agents/:agentId/deploy rejects invalid mode with 400", async () => {
  const context = createControlPlaneContext();
  try {
    // Create a mock request with invalid mode
    const mockRequest = {
      method: "POST",
      url: "/api/v1/agents/test/deploy",
      headers: { "content-type": "application/json" },
      on: (event, cb) => {
        if (event === "data") {
          cb(JSON.stringify({ mode: "invalid", revision: 1, composition: {}, targetId: "local-wsl" }));
        }
        if (event === "end") {
          cb();
        }
      },
    };

    const result = await routeProductApiRequest(
      mockRequest,
      "/api/v1/agents/test/deploy",
      context,
      { correlationId: "test_invalid_mode", method: "POST" },
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  } finally {
    await context.close();
  }
});

test("POST /api/v1/agents/:agentId/deploy rejects live mode with 403", async () => {
  const context = createControlPlaneContext();
  try {
    const mockRequest = {
      method: "POST",
      url: "/api/v1/agents/test/deploy",
      headers: { "content-type": "application/json" },
      on: (event, cb) => {
        if (event === "data") {
          cb(JSON.stringify({ mode: "live", revision: 1, composition: {}, targetId: "local-wsl" }));
        }
        if (event === "end") {
          cb();
        }
      },
    };

    const result = await routeProductApiRequest(
      mockRequest,
      "/api/v1/agents/test/deploy",
      context,
      { correlationId: "test_live_mode", method: "POST" },
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  } finally {
    await context.close();
  }
});

test("POST /api/v1/agents/:agentId/deploy rejects staged mode with 403", async () => {
  const context = createControlPlaneContext();
  try {
    const mockRequest = {
      method: "POST",
      url: "/api/v1/agents/test/deploy",
      headers: { "content-type": "application/json" },
      on: (event, cb) => {
        if (event === "data") {
          cb(JSON.stringify({ mode: "staged", revision: 1, composition: {}, targetId: "local-wsl" }));
        }
        if (event === "end") {
          cb();
        }
      },
    };

    const result = await routeProductApiRequest(
      mockRequest,
      "/api/v1/agents/test/deploy",
      context,
      { correlationId: "test_staged_mode", method: "POST" },
    );

    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  } finally {
    await context.close();
  }
});

test("unknown Product API route returns 404", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/unknown", headers: {} },
      "/api/v1/unknown",
      context,
      { correlationId: "test_404" },
    );

    assert.equal(result.status, 404);
    assert.equal(result.body.success, false);
  } finally {
    await context.close();
  }
});

test("correlectionId is preserved in responses", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents", headers: {} },
      "/api/v1/agents",
      context,
      { correlationId: "corr_test_123" },
    );

    assert.equal(result.body.correlationId, "corr_test_123");
  } finally {
    await context.close();
  }
});

test("Product API responses do not expose secrets", async () => {
  const context = createControlPlaneContext();
  try {
    // Check agents endpoint
    const agentsResult = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents", headers: {} },
      "/api/v1/agents",
      context,
      { correlationId: "test_secrets" },
    );

    const agentsJson = JSON.stringify(agentsResult.body);
    assert.equal(agentsJson.includes("sk-"), false);
    assert.equal(agentsJson.includes("apiKey"), false);
    assert.equal(agentsJson.includes("token"), false);

    // Check providers endpoint
    const providersResult = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/providers", headers: {} },
      "/api/v1/providers",
      context,
      { correlationId: "test_secrets" },
    );

    const providersJson = JSON.stringify(providersResult.body);
    assert.equal(providersJson.includes("sk-"), false);
    assert.equal(providersJson.includes("apiKey"), false);
    assert.equal(providersJson.includes("token"), false);
  } finally {
    await context.close();
  }
});

test("HTTP server exposes both inspection and Product API surfaces", async () => {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  const handler = createAcsHttpHandler(context);

  try {
    const acsResponse = await invokeHandler(handler, { method: "GET", url: "/acs/health", headers: {} });
    assert.equal(acsResponse.status, 200);
    assert.equal(acsResponse.body.data.status, "ok");

    const apiResponse = await invokeHandler(handler, { method: "GET", url: "/api/v1/agents", headers: {} });
    assert.equal(apiResponse.status, 200);
    assert.equal(apiResponse.body.success, true);
    assert.ok(Array.isArray(apiResponse.body.data));

    const notFoundResponse = await invokeHandler(handler, { method: "GET", url: "/api/v1/unknown", headers: {} });
    assert.equal(notFoundResponse.status, 404);
  } finally {
    await context.close();
  }
});

function jsonBodyRequest(payload) {
  const serialized = JSON.stringify(payload);
  return {
    method: "POST",
    url: "",
    headers: { "content-type": "application/json" },
    on(event, cb) {
      if (event === "data") {
        cb(serialized);
      }
      if (event === "end") {
        cb();
      }
    },
  };
}

function minimalAgentDefinition(agentId, overrides = {}) {
  return {
    agentId,
    name: `Test Agent ${agentId}`,
    status: "draft",
    capabilityIds: [],
    skillIds: [],
    toolIds: [],
    credentialConnectionIds: [],
    runnerPreferences: [],
    ...overrides,
  };
}

async function createAgentViaApi(context, agentId, overrides = {}) {
  const request = jsonBodyRequest({ definition: minimalAgentDefinition(agentId, overrides) });
  return routeProductApiRequest(
    request,
    "/api/v1/agents",
    context,
    { correlationId: `create_${agentId}` },
  );
}

test("GET /api/v1/agents returns typed agent list items", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents", headers: {} },
      "/api/v1/agents",
      context,
      { correlationId: "test_list_shape" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    const agents = result.body.data;
    assert.ok(Array.isArray(agents));
    assert.ok(agents.length > 0);

    const agent = agents[0];
    assert.equal(typeof agent.agentId, "string");
    assert.equal(typeof agent.name, "string");
    assert.ok(["draft", "active", "disabled", "archived"].includes(agent.status));
    assert.equal(agent.environment, "sandbox");
    assert.equal(typeof agent.currentRevisionId, "number");
    assert.equal(typeof agent.compositionSummary.ready, "boolean");
    assert.equal(typeof agent.compositionSummary.errorCount, "number");
    assert.ok(["ready", "partial", "blocked", "unavailable"].includes(agent.readinessSummary.state));
    assert.ok(["none", "deployed", "failed", "rejected"].includes(agent.deploymentSummary.state));
    assert.ok(["none", "running", "stopped", "failed", "other"].includes(agent.runtimeSummary.state));
    assert.equal(typeof agent.archived, "boolean");
    assert.equal(typeof agent.updatedAt, "number");
    assert.equal(typeof agent.checkedAt, "number");
  } finally {
    await context.close();
  }
});

test("GET /api/v1/agents supports search, filter and sort", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-sort-alpha", { name: "Alpha Agent" });
    await createAgentViaApi(context, "agent-sort-bravo", { name: "Bravo Agent", status: "disabled" });

    const searchResult = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents?search=alpha", headers: {} },
      "/api/v1/agents?search=alpha",
      context,
      { correlationId: "test_search" },
    );
    assert.equal(searchResult.status, 200);
    assert.ok(searchResult.body.data.some((agent) => agent.agentId === "agent-sort-alpha"));
    assert.equal(searchResult.body.data.some((agent) => agent.agentId === "agent-sort-bravo"), false);

    const statusResult = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents?status=disabled", headers: {} },
      "/api/v1/agents?status=disabled",
      context,
      { correlationId: "test_status_filter" },
    );
    assert.equal(statusResult.status, 200);
    assert.ok(statusResult.body.data.every((agent) => agent.status === "disabled"));

    const environmentResult = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents?environment=sandbox", headers: {} },
      "/api/v1/agents?environment=sandbox",
      context,
      { correlationId: "test_env_filter" },
    );
    assert.equal(environmentResult.status, 200);
    assert.ok(environmentResult.body.data.every((agent) => agent.environment === "sandbox"));

    const sortResult = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents?sort=name", headers: {} },
      "/api/v1/agents?sort=name",
      context,
      { correlationId: "test_sort" },
    );
    assert.equal(sortResult.status, 200);
    const names = sortResult.body.data.map((agent) => agent.name);
    assert.deepEqual(names, [...names].sort((left, right) => left.localeCompare(right)));

    const invalidStatus = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents?status=bogus", headers: {} },
      "/api/v1/agents?status=bogus",
      context,
      { correlationId: "test_invalid_filter" },
    );
    assert.equal(invalidStatus.status, 400);
    assert.equal(invalidStatus.body.success, false);

    const unknownParam = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents?bogus=1", headers: {} },
      "/api/v1/agents?bogus=1",
      context,
      { correlationId: "test_unknown_param" },
    );
    assert.equal(unknownParam.status, 400);
  } finally {
    await context.close();
  }
});

test("GET /api/v1/agents/:agentId returns operational detail with summaries", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox", headers: {} },
      "/api/v1/agents/dev-agent-sandbox",
      context,
      { correlationId: "test_detail_shape" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    const detail = result.body.data;
    assert.equal(detail.agentId, "dev-agent-sandbox");
    assert.equal(detail.agentDefinition.agentId, "dev-agent-sandbox");
    assert.equal(typeof detail.agentDefinition.name, "string");
    assert.equal(detail.currentRevision.revision, 1);
    assert.equal(detail.currentRevision.definition.agentId, "dev-agent-sandbox");
    assert.ok(detail.composition);
    assert.equal(typeof detail.composition.ready, "boolean");
    assert.ok(Array.isArray(detail.composition.findings));
    assert.ok(["ready", "partial", "blocked", "unavailable"].includes(detail.readinessSummary.state));
    assert.ok(["none", "deployed", "failed", "rejected"].includes(detail.deploymentSummary.state));
    assert.ok(["none", "running", "stopped", "failed", "other"].includes(detail.runtimeSummary.state));
    assert.equal(detail.economicSummary.state, "unavailable");
    assert.equal(typeof detail.auditSummary.total, "number");
    assert.ok(Array.isArray(detail.auditSummary.recent));
    assert.equal(detail.lifecycleState.agentId, "dev-agent-sandbox");
    assert.equal(detail.lifecycleState.archived, false);
    assert.equal(detail.lifecycleState.protected, false);
    assert.ok(Array.isArray(detail.availableActions));
    assert.ok(detail.availableActions.every((action) => typeof action.label === "string"));
    assert.deepEqual(detail.guardrails, {
      inspectionMode: true,
      sandboxOnly: true,
      readOnly: false,
      mutableOperations: true,
      mutationScope: "agent-lifecycle",
      productionReady: false,
      sourceOfTruth: "product-api",
    });
    assert.equal(typeof detail.checkedAt, "number");
    assert.equal(typeof detail.stale, "boolean");
  } finally {
    await context.close();
  }
});

test("GET /api/v1/agents/:agentId/revisions returns history when available", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-revision-history");

    const first = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-revision-history/revisions", headers: {} },
      "/api/v1/agents/agent-revision-history/revisions",
      context,
      { correlationId: "test_revisions" },
    );
    assert.equal(first.status, 200);
    assert.equal(first.body.data.length, 1);
    assert.equal(first.body.data[0].revisionNumber, 1);
    assert.equal(first.body.data[0].status, "current");
    assert.equal(typeof first.body.data[0].createdAt, "number");
    assert.equal(typeof first.body.data[0].compositionHash, "string");

    const update = await routeProductApiRequest(
      {
        ...jsonBodyRequest({
          definition: minimalAgentDefinition("agent-revision-history", { name: "Renamed Agent" }),
          expectedRevision: 1,
        }),
        method: "PATCH",
      },
      "/api/v1/agents/agent-revision-history",
      context,
      { correlationId: "test_revisions_update" },
    );
    assert.equal(update.status, 200);

    const second = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-revision-history/revisions", headers: {} },
      "/api/v1/agents/agent-revision-history/revisions",
      context,
      { correlationId: "test_revisions_after" },
    );
    assert.equal(second.status, 200);
    assert.equal(second.body.data.length, 2);
    assert.equal(second.body.data[0].revisionNumber, 2);
    assert.equal(second.body.data[0].status, "current");
  } finally {
    await context.close();
  }
});

test("GET /api/v1/agents/:agentId/lifecycle returns governed lifecycle state", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox/lifecycle", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/lifecycle",
      context,
      { correlationId: "test_lifecycle" },
    );

    assert.equal(result.status, 200);
    const lifecycle = result.body.data;
    assert.equal(lifecycle.agentId, "dev-agent-sandbox");
    assert.equal(lifecycle.currentRevision, 1);
    assert.equal(lifecycle.status, "draft");
    assert.equal(lifecycle.archived, false);
    assert.equal(lifecycle.protected, false);

    const missing = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/does-not-exist/lifecycle", headers: {} },
      "/api/v1/agents/does-not-exist/lifecycle",
      context,
      { correlationId: "test_lifecycle_404" },
    );
    assert.equal(missing.status, 404);
  } finally {
    await context.close();
  }
});

test("POST /api/v1/agents creates an agent and returns an operation result", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await createAgentViaApi(context, "agent-mb-create");

    assert.equal(result.status, 201);
    assert.equal(result.body.success, true);
    const operation = result.body.data;
    assert.equal(operation.ok, true);
    assert.equal(operation.operation, "create");
    assert.equal(operation.entityType, "agent");
    assert.equal(operation.entityId, "agent-mb-create");
    assert.equal(operation.status, "draft");
    assert.ok(Array.isArray(operation.warnings));
    assert.ok(Array.isArray(operation.errors));
    assert.equal(typeof operation.checkedAt, "number");

    const list = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents?search=agent-mb-create", headers: {} },
      "/api/v1/agents?search=agent-mb-create",
      context,
      { correlationId: "test_create_list" },
    );
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].agentId, "agent-mb-create");
  } finally {
    await context.close();
  }
});

test("POST /api/v1/agents rejects invalid definitions with 400", async () => {
  const context = createControlPlaneContext();
  try {
    const missingName = await routeProductApiRequest(
      jsonBodyRequest({ definition: { agentId: "agent-bad-name" } }),
      "/api/v1/agents",
      context,
      { correlationId: "test_create_bad" },
    );
    assert.equal(missingName.status, 400);
    assert.equal(missingName.body.success, false);

    const badStatus = await routeProductApiRequest(
      jsonBodyRequest({ definition: minimalAgentDefinition("agent-bad-status", { status: "live" }) }),
      "/api/v1/agents",
      context,
      { correlationId: "test_create_bad_status" },
    );
    assert.equal(badStatus.status, 400);

    const duplicate = await createAgentViaApi(context, "agent-dup-target");
    assert.equal(duplicate.status, 201);
    const again = await createAgentViaApi(context, "agent-dup-target");
    assert.equal(again.status, 409);
    assert.equal(again.body.success, false);
  } finally {
    await context.close();
  }
});

test("POST /api/v1/agents rejects secret-like definition fields", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      jsonBodyRequest({
        definition: minimalAgentDefinition("agent-secret-scan", {
          metadata: { apiKey: "sk-test-secret-value" },
        }),
      }),
      "/api/v1/agents",
      context,
      { correlationId: "test_create_secret" },
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    const serialized = JSON.stringify(result.body);
    assert.equal(serialized.includes("sk-test-secret-value"), false);
  } finally {
    await context.close();
  }
});

test("PATCH /api/v1/agents/:agentId updates an agent definition", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-mb-update");

    const result = await routeProductApiRequest(
      {
        ...jsonBodyRequest({
          definition: minimalAgentDefinition("agent-mb-update", { name: "Updated Agent Name" }),
          expectedRevision: 1,
        }),
        method: "PATCH",
      },
      "/api/v1/agents/agent-mb-update",
      context,
      { correlationId: "test_update" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.data.ok, true);
    assert.equal(result.body.data.operation, "update");

    const detail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-update", headers: {} },
      "/api/v1/agents/agent-mb-update",
      context,
      { correlationId: "test_update_detail" },
    );
    assert.equal(detail.body.data.agentDefinition.name, "Updated Agent Name");
    assert.equal(detail.body.data.currentRevision.revision, 2);
  } finally {
    await context.close();
  }
});

test("PATCH /api/v1/agents/:agentId rejects stale revision conflicts with 409", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-mb-conflict");
    const result = await routeProductApiRequest(
      {
        ...jsonBodyRequest({
          definition: minimalAgentDefinition("agent-mb-conflict", { name: "Conflicting Edit" }),
          expectedRevision: 99,
        }),
        method: "PATCH",
      },
      "/api/v1/agents/agent-mb-conflict",
      context,
      { correlationId: "test_update_conflict" },
    );

    assert.equal(result.status, 409);
    assert.equal(result.body.success, false);
  } finally {
    await context.close();
  }
});

test("POST /api/v1/agents/:agentId/revisions creates a revision", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-mb-revision");
    const result = await routeProductApiRequest(
      jsonBodyRequest({
        definition: minimalAgentDefinition("agent-mb-revision", { name: "Revision Two" }),
        expectedRevision: 1,
      }),
      "/api/v1/agents/agent-mb-revision/revisions",
      context,
      { correlationId: "test_create_revision" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.data.ok, true);
    assert.equal(result.body.data.operation, "create_revision");

    const revisions = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-revision/revisions", headers: {} },
      "/api/v1/agents/agent-mb-revision/revisions",
      context,
      { correlationId: "test_create_revision_list" },
    );
    assert.equal(revisions.body.data.length, 2);
    assert.equal(revisions.body.data[0].revisionNumber, 2);
  } finally {
    await context.close();
  }
});

test("adopt and restore revision actions are governed by the Product API", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-mb-adopt", { name: "Original Name" });
    await routeProductApiRequest(
      {
        ...jsonBodyRequest({
          definition: minimalAgentDefinition("agent-mb-adopt", { name: "Second Name" }),
          expectedRevision: 1,
        }),
        method: "PATCH",
      },
      "/api/v1/agents/agent-mb-adopt",
      context,
      { correlationId: "test_adopt_setup" },
    );

    const adopt = await routeProductApiRequest(
      jsonBodyRequest({}),
      "/api/v1/agents/agent-mb-adopt/revisions/r1/adopt",
      context,
      { correlationId: "test_adopt" },
    );
    assert.equal(adopt.status, 200);
    assert.equal(adopt.body.data.ok, true);
    assert.equal(adopt.body.data.operation, "adopt_revision");

    const detail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-adopt", headers: {} },
      "/api/v1/agents/agent-mb-adopt",
      context,
      { correlationId: "test_adopt_detail" },
    );
    assert.equal(detail.body.data.currentRevision.revision, 3);
    assert.equal(detail.body.data.agentDefinition.name, "Original Name");

    const restore = await routeProductApiRequest(
      jsonBodyRequest({}),
      "/api/v1/agents/agent-mb-adopt/revisions/r2/restore",
      context,
      { correlationId: "test_restore_revision" },
    );
    assert.equal(restore.status, 200);
    assert.equal(restore.body.data.operation, "restore_revision");

    const restoredDetail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-adopt", headers: {} },
      "/api/v1/agents/agent-mb-adopt",
      context,
      { correlationId: "test_restore_detail" },
    );
    assert.equal(restoredDetail.body.data.currentRevision.revision, 4);
    assert.equal(restoredDetail.body.data.agentDefinition.name, "Second Name");

    const invalid = await routeProductApiRequest(
      jsonBodyRequest({}),
      "/api/v1/agents/agent-mb-adopt/revisions/not-a-revision/adopt",
      context,
      { correlationId: "test_adopt_invalid" },
    );
    assert.equal(invalid.status, 409);
    assert.equal(invalid.body.error.code, "agent_lifecycle_guard");
    assert.equal(invalid.body.error.details.code, "INVALID_REVISION_ID");
  } finally {
    await context.close();
  }
});

test("archive and restore lifecycle actions transition agent status", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-mb-archive");

    const archive = await routeProductApiRequest(
      jsonBodyRequest({}),
      "/api/v1/agents/agent-mb-archive/archive",
      context,
      { correlationId: "test_archive" },
    );
    assert.equal(archive.status, 200);
    assert.equal(archive.body.data.ok, true);
    assert.equal(archive.body.data.operation, "archive");

    const archivedDetail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-archive", headers: {} },
      "/api/v1/agents/agent-mb-archive",
      context,
      { correlationId: "test_archive_detail" },
    );
    assert.equal(archivedDetail.body.data.lifecycleState.archived, true);
    assert.equal(archivedDetail.body.data.agentDefinition.status, "archived");
    assert.equal(typeof archivedDetail.body.data.lifecycleState.archivedAt, "number");
    assert.equal(
      archivedDetail.body.data.availableActions.find((action) => action.action === "archive").available,
      false,
    );
    assert.equal(
      archivedDetail.body.data.availableActions.find((action) => action.action === "restore").available,
      true,
    );

    const doubleArchive = await routeProductApiRequest(
      jsonBodyRequest({}),
      "/api/v1/agents/agent-mb-archive/archive",
      context,
      { correlationId: "test_archive_twice" },
    );
    assert.equal(doubleArchive.status, 409);
    assert.equal(doubleArchive.body.error.code, "agent_lifecycle_guard");

    const restore = await routeProductApiRequest(
      jsonBodyRequest({}),
      "/api/v1/agents/agent-mb-archive/restore",
      context,
      { correlationId: "test_restore_agent" },
    );
    assert.equal(restore.status, 200);
    assert.equal(restore.body.data.operation, "restore");

    const restoredDetail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-archive", headers: {} },
      "/api/v1/agents/agent-mb-archive",
      context,
      { correlationId: "test_restore_agent_detail" },
    );
    assert.equal(restoredDetail.body.data.lifecycleState.archived, false);
    assert.equal(restoredDetail.body.data.agentDefinition.status, "draft");
  } finally {
    await context.close();
  }
});

test("DELETE /api/v1/agents/:agentId requires archive first", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-mb-delete-guard");
    const result = await routeProductApiRequest(
      { method: "DELETE", url: "/api/v1/agents/agent-mb-delete-guard", headers: {} },
      "/api/v1/agents/agent-mb-delete-guard",
      context,
      { correlationId: "test_delete_guard" },
    );

    assert.equal(result.status, 409);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error.code, "agent_lifecycle_guard");
    assert.equal(result.body.error.details.code, "AGENT_NOT_ARCHIVED");
  } finally {
    await context.close();
  }
});

test("deleteAgent is guarded when deployments reference the agent", async () => {
  const context = createControlPlaneContext();
  try {
    const api = new ProductApiClient({
      agentService: context.agentService,
      deploymentService: {
        listDeployments: () => [{
          deploymentId: "dep_guard_test",
          agentId: "dev-agent-sandbox",
          revision: 1,
          targetId: "local-wsl",
          deploymentMode: "sandbox",
          status: "deployed",
          createdAt: Date.now(),
        }],
      },
      runtimeService: context.runtimeService,
      auditService: context.auditService,
    });

    await api.archiveAgent("dev-agent-sandbox");

    await assert.rejects(
      () => api.deleteAgent("dev-agent-sandbox"),
      (error) => {
        assert.equal(error.name, "AgentLifecycleGuardError");
        assert.equal(error.details.code, "AGENT_DEPENDENCIES_PRESENT");
        assert.match(error.details.reason, /dep_guard_test/);
        return true;
      },
    );

    const detail = await api.getAgentDetail("dev-agent-sandbox");
    assert.equal(detail.deploymentSummary.state, "deployed");
    const deleteAction = detail.availableActions.find((action) => action.action === "delete");
    assert.equal(deleteAction.available, false);
    assert.match(deleteAction.reason, /referenced by/);
  } finally {
    await context.close();
  }
});

test("DELETE archived agent without dependencies succeeds", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-mb-delete-ok");
    await routeProductApiRequest(
      jsonBodyRequest({}),
      "/api/v1/agents/agent-mb-delete-ok/archive",
      context,
      { correlationId: "test_delete_ok_archive" },
    );

    const result = await routeProductApiRequest(
      { method: "DELETE", url: "/api/v1/agents/agent-mb-delete-ok", headers: {} },
      "/api/v1/agents/agent-mb-delete-ok",
      context,
      { correlationId: "test_delete_ok" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.data.ok, true);
    assert.equal(result.body.data.operation, "delete");
    assert.equal(result.body.data.status, "deleted");

    const gone = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-delete-ok", headers: {} },
      "/api/v1/agents/agent-mb-delete-ok",
      context,
      { correlationId: "test_delete_ok_gone" },
    );
    assert.equal(gone.status, 404);
  } finally {
    await context.close();
  }
});

test("protected agents cannot be deleted", async () => {
  const context = createControlPlaneContext();
  try {
    context.agentService.create({
      definition: minimalAgentDefinition("agent-mb-protected", { metadata: { protected: true } }),
      createdAt: Date.now(),
    });
    await routeProductApiRequest(
      jsonBodyRequest({}),
      "/api/v1/agents/agent-mb-protected/archive",
      context,
      { correlationId: "test_protected_archive" },
    );

    const result = await routeProductApiRequest(
      { method: "DELETE", url: "/api/v1/agents/agent-mb-protected", headers: {} },
      "/api/v1/agents/agent-mb-protected",
      context,
      { correlationId: "test_protected_delete" },
    );
    assert.equal(result.status, 409);
    assert.equal(result.body.error.details.code, "AGENT_PROTECTED");

    const detail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-protected", headers: {} },
      "/api/v1/agents/agent-mb-protected",
      context,
      { correlationId: "test_protected_detail" },
    );
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.lifecycleState.protected, true);
    assert.equal(
      detail.body.data.availableActions.find((action) => action.action === "delete").available,
      false,
    );
  } finally {
    await context.close();
  }
});

test("wrong methods on agent routes do not create accidental mutations", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "agent-mb-method-guard");

    const getArchive = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-method-guard/archive", headers: {} },
      "/api/v1/agents/agent-mb-method-guard/archive",
      context,
      { correlationId: "test_method_archive" },
    );
    assert.equal(getArchive.status, 405);
    assert.equal(getArchive.body.error.code, "method_not_allowed");

    const deleteList = await routeProductApiRequest(
      { method: "DELETE", url: "/api/v1/agents", headers: {} },
      "/api/v1/agents",
      context,
      { correlationId: "test_method_list" },
    );
    assert.equal(deleteList.status, 405);

    const patchDetailRoute = await routeProductApiRequest(
      { method: "PUT", url: "/api/v1/agents/agent-mb-method-guard", headers: {} },
      "/api/v1/agents/agent-mb-method-guard",
      context,
      { correlationId: "test_method_put" },
    );
    assert.equal(patchDetailRoute.status, 405);

    const detail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/agent-mb-method-guard", headers: {} },
      "/api/v1/agents/agent-mb-method-guard",
      context,
      { correlationId: "test_method_guard_detail" },
    );
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.lifecycleState.archived, false);
  } finally {
    await context.close();
  }
});

test("agent detail preserves sandbox and readiness context", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox", headers: {} },
      "/api/v1/agents/dev-agent-sandbox",
      context,
      { correlationId: "test_guardrails" },
    );

    assert.equal(result.status, 200);
    const detail = result.body.data;
    assert.equal(detail.guardrails.sandboxOnly, true);
    assert.equal(detail.guardrails.inspectionMode, true);
    assert.equal(detail.guardrails.productionReady, false);
    assert.equal(detail.guardrails.mutationScope, "agent-lifecycle");
    assert.equal(detail.guardrails.sourceOfTruth, "product-api");

    const serialized = JSON.stringify(result.body);
    assert.equal(serialized.includes("sk-"), false);
    assert.equal(serialized.includes("apiKey"), false);
    assert.equal(serialized.includes("token"), false);
  } finally {
    await context.close();
  }
});

test("operational execution routes expose read-only governed contracts", async () => {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    const credentialList = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/credentials", headers: {} },
      "/api/v1/credentials",
      context,
      { correlationId: "test_credentials" },
    );
    assert.equal(credentialList.status, 200);
    assert.ok(Array.isArray(credentialList.body.data));
    assert.equal(JSON.stringify(credentialList.body).includes("sk-"), false);
    assert.equal(JSON.stringify(credentialList.body).includes("apiKey"), false);

    const connectionList = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/provider-connections", headers: {} },
      "/api/v1/provider-connections",
      context,
      { correlationId: "test_connections" },
    );
    assert.equal(connectionList.status, 200);
    assert.ok(Array.isArray(connectionList.body.data));

    const readiness = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox/readiness", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/readiness",
      context,
      { correlationId: "test_readiness_surface" },
    );
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.data.agentId, "dev-agent-sandbox");
    assert.ok(Array.isArray(readiness.body.data.categories));

    const deploymentPlan = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox/deployment-plan", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/deployment-plan",
      context,
      { correlationId: "test_deployment_plan" },
    );
    assert.equal(deploymentPlan.status, 200);
    assert.equal(deploymentPlan.body.data.agentId, "dev-agent-sandbox");

    const executionPlan = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox/execution-plan", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/execution-plan",
      context,
      { correlationId: "test_execution_plan" },
    );
    assert.equal(executionPlan.status, 200);
    assert.equal(executionPlan.body.data.agentId, "dev-agent-sandbox");

    const deployments = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/deployments", headers: {} },
      "/api/v1/deployments",
      context,
      { correlationId: "test_deployments" },
    );
    assert.equal(deployments.status, 200);
    assert.ok(Array.isArray(deployments.body.data));

    const runtimes = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/runtimes", headers: {} },
      "/api/v1/runtimes",
      context,
      { correlationId: "test_runtimes" },
    );
    assert.equal(runtimes.status, 200);
    assert.ok(Array.isArray(runtimes.body.data));

    const executionRuns = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/execution-runs", headers: {} },
      "/api/v1/execution-runs",
      context,
      { correlationId: "test_execution_runs" },
    );
    assert.equal(executionRuns.status, 200);
    assert.ok(Array.isArray(executionRuns.body.data));

    const workers = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/workers", headers: {} },
      "/api/v1/workers",
      context,
      { correlationId: "test_workers" },
    );
    assert.equal(workers.status, 200);
    assert.ok(Array.isArray(workers.body.data));

    const unsupportedCredentials = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/credentials/cred_dev_openai_byok/validate", headers: {} },
      "/api/v1/credentials/cred_dev_openai_byok/validate",
      context,
      { correlationId: "test_credentials_validate" },
    );
    assert.equal(unsupportedCredentials.status, 405);
    assert.equal(unsupportedCredentials.body.error.code, "unsupported_action");

    const unsupportedRuntimeStop = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/runtimes/runtime-1/stop", headers: {} },
      "/api/v1/runtimes/runtime-1/stop",
      context,
      { correlationId: "test_runtime_stop_unsupported" },
    );
    assert.equal(unsupportedRuntimeStop.status, 405);

    const unsupportedWorkerDrain = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/workers/worker-1/drain", headers: {} },
      "/api/v1/workers/worker-1/drain",
      context,
      { correlationId: "test_worker_drain_unsupported" },
    );
    assert.equal(unsupportedWorkerDrain.status, 405);

    const noAdminSurface = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/tenants", headers: {} },
      "/api/v1/tenants",
      context,
      { correlationId: "test_no_tenants" },
    );
    assert.equal(noAdminSurface.status, 404);

    const noEconomicsSurface = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics", headers: {} },
      "/api/v1/economics",
      context,
      { correlationId: "test_no_economics" },
    );
    assert.equal(noEconomicsSurface.status, 404);
  } finally {
    await context.close();
  }
});
