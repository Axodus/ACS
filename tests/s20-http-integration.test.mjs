import assert from "node:assert/strict";
import test from "node:test";
import { createAcsHttpHandler, routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
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
  const context = createControlPlaneContext();
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
    assert.equal(typeof summary.agents.total, "number");
    assert.equal(typeof summary.deployments.total, "number");
    assert.equal(typeof summary.runtimes.total, "number");
    assert.equal(typeof summary.workers.total, "number");
    assert.equal(typeof summary.executionRuns.total, "number");
    assert.ok(Array.isArray(summary.blockers));
    assert.ok(Array.isArray(summary.warnings));
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
    assert.equal(summary.productApi.service, "acs-product-api");
    assert.equal(summary.productApi.status, "ok");
    assert.equal(summary.productApi.mode, "inspection");
    assert.equal(summary.productApi.automation, "disabled");
    assert.equal(summary.runtime.connectivity, "connected");
    assert.equal(summary.readiness.devReady, true);
    assert.equal(summary.readiness.distributedRuntimeReady, false);
    assert.equal(summary.readiness.productionReady, false);
    assert.equal(summary.readiness.status, "blocked");
    assert.ok(summary.readiness.blockerCount > 0);
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
