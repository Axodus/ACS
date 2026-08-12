import assert from "node:assert/strict";
import test from "node:test";
import { createAcsHttpHandler, routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";
import { fail } from "../dist/http/responses.js";

// EPIC-11 Milestone F — Control Plane Hardening & Acceptance.
//
// Covers: structured error normalization, guardrails consistency, unsupported
// action consistency, no secret leakage, no production-ready claim, the
// read-only system boundary and the A/B/C/D/E regression smoke gate.

function jsonBodyRequest(payload, method = "POST") {
  const serialized = JSON.stringify(payload);
  return {
    method,
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

async function get(context, path, correlationId = "test_hardening") {
  return routeProductApiRequest(
    { method: "GET", url: path, headers: {} },
    path,
    context,
    { correlationId },
  );
}

// ---- Structured error normalization (F02) ----

test("fail() normalizes not_found with reason, retryable and severity", () => {
  const result = fail("agent not found: nope", 404, "not_found");
  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error.code, "not_found");
  assert.equal(result.body.error.reason, "not_found");
  assert.equal(result.body.error.retryable, false);
  assert.equal(result.body.error.severity, "error");
  assert.equal(result.body.blockedReason, "agent not found: nope");
});

test("not found errors carry entityRefs from the domain error", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await get(context, "/api/v1/roles/ghost-role");
    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, "not_found");
    assert.equal(result.body.error.reason, "not_found");
    assert.equal(result.body.error.retryable, false);
    assert.equal(result.body.error.severity, "error");
    assert.ok(result.body.error.entityRefs.some((ref) => ref.includes("role:ghost-role")));
  } finally {
    await context.close();
  }
});

test("validation errors are normalized with reason validation_error", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await get(context, "/api/v1/agents?unknownParam=1");
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "invalid_query");
    assert.equal(result.body.error.reason, "validation_error");
    assert.equal(result.body.error.retryable, false);
    assert.equal(result.body.error.severity, "error");
  } finally {
    await context.close();
  }
});

test("unsupported composition mutations return a normalized unsupported_action error", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/skills/math/install", headers: {} },
      "/api/v1/skills/math/install",
      context,
      { correlationId: "test_unsupported_composition" },
    );
    assert.equal(result.status, 405);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error.code, "unsupported_action");
    assert.equal(result.body.error.reason, "unsupported_action");
    assert.equal(result.body.error.retryable, false);
    assert.equal(result.body.error.severity, "warning");
    assert.ok(result.body.error.guardrails.includes("read_only"));
    assert.equal(result.body.error.details.guidance.includes("Unsupported"), true);
  } finally {
    await context.close();
  }
});

test("unsupported economic mutations never simulate success and carry not_billing guardrail", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/economics/quotes/q1/reserve", headers: {} },
      "/api/v1/economics/quotes/q1/reserve",
      context,
      { correlationId: "test_unsupported_economics" },
    );
    assert.equal(result.status, 405);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error.code, "unsupported_action");
    assert.equal(result.body.error.retryable, false);
    assert.ok(result.body.error.guardrails.includes("not_billing"));
  } finally {
    await context.close();
  }
});

test("sandbox blockers are normalized with reason blocked_by_sandbox", async () => {
  const context = createControlPlaneContext();
  try {
    const request = jsonBodyRequest({
      mode: "live",
      revision: 1,
      composition: {},
      targetId: "local-wsl",
    });
    const result = await routeProductApiRequest(
      request,
      "/api/v1/agents/test/deploy",
      context,
      { correlationId: "test_live_blocked" },
    );
    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
    assert.equal(result.body.error.code, "forbidden");
    assert.equal(result.body.error.reason, "blocked_by_sandbox");
    assert.equal(result.body.error.retryable, false);
    assert.ok(result.body.error.guardrails.includes("sandbox_only"));
  } finally {
    await context.close();
  }
});

test("lifecycle guards keep details and normalize reason/retryable", async () => {
  const context = createControlPlaneContext();
  try {
    const created = await createAgentViaApi(context, "hf-lifecycle");
    assert.equal(created.status, 201);

    const archive = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/agents/hf-lifecycle/archive", headers: {} },
      "/api/v1/agents/hf-lifecycle/archive",
      context,
      { correlationId: "test_archive_once" },
    );
    assert.equal(archive.status, 200);

    const doubleArchive = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/agents/hf-lifecycle/archive", headers: {} },
      "/api/v1/agents/hf-lifecycle/archive",
      context,
      { correlationId: "test_archive_twice" },
    );
    assert.equal(doubleArchive.status, 409);
    assert.equal(doubleArchive.body.error.code, "agent_lifecycle_guard");
    assert.equal(doubleArchive.body.error.retryable, false);
    assert.equal(doubleArchive.body.error.severity, "warning");
    assert.equal(doubleArchive.body.error.details.code, "AGENT_ALREADY_ARCHIVED");
    assert.ok(doubleArchive.body.error.guardrails.includes("blocked_with_reason"));
  } finally {
    await context.close();
  }
});

test("method not allowed is normalized", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/system/acceptance", headers: {} },
      "/api/v1/system/acceptance",
      context,
      { correlationId: "test_method_not_allowed" },
    );
    assert.equal(result.status, 405);
    assert.equal(result.body.error.code, "method_not_allowed");
    assert.equal(result.body.error.reason, "method_not_allowed");
    assert.equal(result.body.error.retryable, false);
  } finally {
    await context.close();
  }
});

// ---- Guardrails consistency (F03/F04) ----

test("read-only surfaces expose consistent guardrails and productionReady=false", async () => {
  const context = createControlPlaneContext();
  try {
    const guardrailPaths = [
      ["/api/v1/dashboard", (body) => body.data.system.guardrails],
      ["/api/v1/readiness", (body) => body.data.guardrails],
    ];
    for (const [path, pick] of guardrailPaths) {
      const result = await get(context, path);
      assert.equal(result.status, 200);
      assert.deepEqual(pick(result.body), {
        inspectionMode: true,
        sandboxOnly: true,
        readOnly: true,
        mutableOperations: false,
      });
    }

    const readiness = await get(context, "/api/v1/readiness");
    assert.equal(readiness.body.data.readiness.productionReady, false);
    assert.equal(readiness.body.data.readiness.status, "blocked");
    assert.ok(readiness.body.data.blockers.length > 0);

    const agent = await createAgentViaApi(context, "hf-guardrails");
    assert.equal(agent.status, 201);
    const detail = await get(context, "/api/v1/agents/hf-guardrails");
    assert.equal(detail.body.data.guardrails.productionReady, false);
    assert.equal(detail.body.data.guardrails.sourceOfTruth, "product-api");
  } finally {
    await context.close();
  }
});

test("system guardrails projection exposes the administration/tenants boundary", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await get(context, "/api/v1/system/guardrails");
    assert.equal(result.status, 200);
    assert.equal(result.body.data.productionReady, false);
    assert.equal(result.body.data.readOnly, true);
    assert.equal(result.body.data.administration.status, "unavailable");
    assert.equal(result.body.data.administration.scope, "future");
    assert.equal(result.body.data.tenants.status, "future_scope");
    assert.ok(result.body.data.futureScope.length > 0);
  } finally {
    await context.close();
  }
});

test("system configuration and policies are read-only visibility projections", async () => {
  const context = createControlPlaneContext();
  try {
    const configuration = await get(context, "/api/v1/system/configuration");
    assert.equal(configuration.status, 200);
    assert.equal(configuration.body.data.readOnly, true);
    assert.equal(configuration.body.data.mode, "inspection");
    assert.ok(configuration.body.data.notices.some((notice) => notice.includes("not billing")));
    assert.ok(configuration.body.data.notices.some((notice) => notice.includes("No secrets")));

    const policies = await get(context, "/api/v1/system/policies");
    assert.equal(policies.status, 200);
    const availabilities = new Set(policies.body.data.map((policy) => policy.availability));
    assert.ok(availabilities.has("read_only"));
    assert.ok(availabilities.has("governed_by_product_api"));
    assert.ok(availabilities.has("unavailable"));

    const administration = await get(context, "/api/v1/system/administration");
    assert.equal(administration.body.data.status, "unavailable");

    const tenants = await get(context, "/api/v1/system/tenants");
    assert.equal(tenants.body.data.status, "future_scope");
    assert.ok(Array.isArray(tenants.body.data.isolationVisibility));
  } finally {
    await context.close();
  }
});

// ---- No secret leakage (F08) ----

test("API responses expose redacted refs only, no secret material", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "hf-secrets");
    const surfaces = [
      "/api/v1/dashboard",
      "/api/v1/readiness",
      "/api/v1/agents",
      "/api/v1/agents/hf-secrets",
      "/api/v1/credentials",
      "/api/v1/provider-connections",
      "/api/v1/evidence",
      "/api/v1/economics",
      "/api/v1/audit",
    ];
    for (const path of surfaces) {
      const result = await get(context, path);
      assert.equal(result.status, 200, `surface ${path} should respond 200`);
      const serialized = JSON.stringify(result.body);
      assert.equal(serialized.includes("sk-"), false, `${path} leaks sk- style secret`);
      assert.equal(serialized.includes("apiKey"), false, `${path} leaks apiKey`);
      assert.equal(serialized.includes("-----BEGIN"), false, `${path} leaks PEM material`);
      assert.equal(serialized.includes("Bearer "), false, `${path} leaks bearer token`);
      assert.equal(serialized.includes("AKIA"), false, `${path} leaks AWS-style access key`);
    }

    const credentials = await get(context, "/api/v1/credentials");
    for (const credential of credentials.body.data) {
      if (credential.secretRefRedacted !== undefined) {
        assert.match(credential.secretRefRedacted, /^redacted:/, "credential secret refs must be redacted");
      }
    }
  } finally {
    await context.close();
  }
});

// ---- Unsupported action consistency (F02) ----

test("unsupported actions never simulate success across governed surfaces", async () => {
  const context = createControlPlaneContext();
  try {
    const unsupportedCalls = [
      ["POST", "/api/v1/skills/math/install"],
      ["POST", "/api/v1/plugins/toolkit/remove"],
      ["POST", "/api/v1/agents/a1/composition/role"],
      ["POST", "/api/v1/agents/a1/composition/engine"],
      ["POST", "/api/v1/agents/a1/economics/quote"],
      ["POST", "/api/v1/economics/metering/m1/settle"],
      ["POST", "/api/v1/economics/reservations/r1/cancel"],
      ["POST", "/api/v1/economics/quotes/q1/reserve"],
    ];
    for (const [method, url] of unsupportedCalls) {
      const result = await routeProductApiRequest(
        { method, url, headers: {} },
        url,
        context,
        { correlationId: "test_unsupported_consistency" },
      );
      assert.equal(result.body.success, false, `${url} must never report success`);
      assert.ok(result.status >= 400 && result.status < 500, `${url} must be a client error`);
      assert.equal(result.body.error.code, "unsupported_action", `${url} must use unsupported_action`);
      assert.equal(result.body.error.retryable, false);
    }
  } finally {
    await context.close();
  }
});

// ---- Acceptance report (F08) ----

test("GET /api/v1/system/acceptance reports an honest, read-only acceptance gate", async () => {
  const context = createControlPlaneContext();
  try {
    const result = await get(context, "/api/v1/system/acceptance");
    assert.equal(result.status, 200);
    const report = result.body.data;
    assert.equal(report.epic, "epic-11");
    assert.equal(report.milestone, "F");
    assert.equal(report.productionReadiness.ready, false);
    assert.equal(report.productionReadiness.status, "not_claimed");
    assert.equal(report.guardrails.productionReady, false);

    const milestoneIds = report.milestoneStatuses.map((entry) => entry.id);
    assert.deepEqual(milestoneIds, ["A", "B", "C", "D", "E", "F"]);
    assert.ok(report.milestoneStatuses.every((entry) => entry.status.startsWith("PASS")));

    const checkIds = report.validationSummary.map((entry) => entry.id);
    assert.ok(checkIds.includes("backend-tests"));
    assert.ok(checkIds.includes("app-tests"));
    assert.ok(checkIds.includes("no-secret-leakage"));
    assert.ok(checkIds.includes("unsupported-actions"));
    assert.ok(checkIds.includes("guardrails-consistency"));

    const visualCheck = report.validationSummary.find((entry) => entry.id === "visual-browser");
    assert.equal(visualCheck.status, "caveat", "visual/browser verification must be an honest caveat");

    assert.ok(report.knownCaveats.length > 0);
    assert.ok(report.deferredItems.length > 0);
    assert.ok(report.deferredItems.some((item) => item.includes("Production administration")));
    assert.ok(typeof report.checkedAt === "string");
  } finally {
    await context.close();
  }
});

// ---- A/B/C/D/E regression smoke (F05) ----

test("Milestones A through E surfaces remain green", async () => {
  const context = createControlPlaneContext();
  try {
    await createAgentViaApi(context, "hf-regression");
    const greenSurfaces = [
      "/api/v1/health",
      "/api/v1/dashboard",
      "/api/v1/readiness",
      "/api/v1/agents",
      "/api/v1/agents/hf-regression",
      "/api/v1/agents/hf-regression/revisions",
      "/api/v1/agents/hf-regression/composition",
      "/api/v1/agents/hf-regression/readiness",
      "/api/v1/agents/hf-regression/deployment-plan",
      "/api/v1/composition",
      "/api/v1/roles",
      "/api/v1/profiles",
      "/api/v1/capabilities",
      "/api/v1/skills",
      "/api/v1/tools",
      "/api/v1/plugins",
      "/api/v1/engines",
      "/api/v1/providers",
      "/api/v1/models",
      "/api/v1/credentials",
      "/api/v1/provider-connections",
      "/api/v1/deployments",
      "/api/v1/runtimes",
      "/api/v1/execution-runs",
      "/api/v1/workers",
      "/api/v1/events",
      "/api/v1/logs",
      "/api/v1/audit",
      "/api/v1/evidence",
      "/api/v1/diagnostics",
      "/api/v1/readiness/evidence",
      "/api/v1/economics",
      "/api/v1/economics/summary",
      "/api/v1/economics/quotes",
      "/api/v1/economics/reservations",
      "/api/v1/economics/metering",
      "/api/v1/economics/settlements",
      "/api/v1/economics/receipts",
      "/api/v1/economics/audit",
    ];
    for (const path of greenSurfaces) {
      const result = await get(context, path);
      assert.equal(result.status, 200, `regression surface ${path} must stay green`);
      assert.equal(result.body.success, true, `regression surface ${path} must report success`);
    }
  } finally {
    await context.close();
  }
});

test("frontend integration harness remains importable", async () => {
  // Guards against accidentally breaking the app-facing HTTP handler.
  const handler = createAcsHttpHandler();
  assert.equal(typeof handler, "function");
});
