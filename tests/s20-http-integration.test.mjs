import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createAcsHttpServer, routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { AgentRevisionConflictError } from "../dist/index.js";
import { NotFoundError } from "../dist/errors.js";
import { EngineSandboxOnlyError } from "../dist/index.js";
import { PolicyRejectedError } from "../dist/errors.js";

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
    assert.equal(agentsJson.includes("apiKey"), false);
    assert.equal(agentsJson.includes("secret"), false);
    assert.equal(agentsJson.includes("token"), false);

    // Check providers endpoint
    const providersResult = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/providers", headers: {} },
      "/api/v1/providers",
      context,
      { correlationId: "test_secrets" },
    );

    const providersJson = JSON.stringify(providersResult.body);
    assert.equal(providersJson.includes("apiKey"), false);
    assert.equal(providersJson.includes("secret"), false);
    assert.equal(providersJson.includes("token"), false);
  } finally {
    await context.close();
  }
});

test("HTTP server exposes both inspection and Product API surfaces", async () => {
  const { server, context } = await createAcsHttpServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    // Test inspection API
    const acsResponse = await fetch(`http://127.0.0.1:${port}/acs/health`);
    const acsBody = await acsResponse.json();
    assert.equal(acsResponse.status, 200);
    assert.equal(acsBody.data.status, "ok");

    // Test Product API
    const apiResponse = await fetch(`http://127.0.0.1:${port}/api/v1/agents`);
    const apiBody = await apiResponse.json();
    assert.equal(apiResponse.status, 200);
    assert.equal(apiBody.success, true);
    assert.ok(Array.isArray(apiBody.data));

    // Test Product API 404
    const notFoundResponse = await fetch(`http://127.0.0.1:${port}/api/v1/unknown`);
    assert.equal(notFoundResponse.status, 404);
  } finally {
    server.close();
    await once(server, "close");
    await context.close();
  }
});
