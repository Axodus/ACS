import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

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

test("Milestone E: operational evidence and economics surfaces", async () => {
  const context = createControlPlaneContext({
    engine: createMockEngine(),
    startLocalWorker: false,
  });
  try {
    // E01 — Events & Logs (read-only)
    const events = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/events", headers: {} },
      "/api/v1/events",
      context,
      { correlationId: "test_events" },
    );
    assert.equal(events.status, 200);
    assert.ok(Array.isArray(events.body.data));

    const eventDetail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/events/evt_test", headers: {} },
      "/api/v1/events/evt_test",
      context,
      { correlationId: "test_event_detail" },
    );
    assert.equal(eventDetail.status, 404);

    const logs = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/logs", headers: {} },
      "/api/v1/logs",
      context,
      { correlationId: "test_logs" },
    );
    assert.equal(logs.status, 200);
    assert.ok(Array.isArray(logs.body.data));

    const logDetail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/logs/log_test", headers: {} },
      "/api/v1/logs/log_test",
      context,
      { correlationId: "test_log_detail" },
    );
    assert.equal(logDetail.status, 200);
    assert.equal(logDetail.body.data.available, false);

    // Events POST should be 405
    const eventsPost = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/events", headers: {} },
      "/api/v1/events",
      context,
      { correlationId: "test_events_post" },
    );
    assert.equal(eventsPost.status, 405);

    // E02 — Audit Trail (read-only)
    const audit = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/audit", headers: {} },
      "/api/v1/audit",
      context,
      { correlationId: "test_audit" },
    );
    assert.equal(audit.status, 200);
    assert.ok(Array.isArray(audit.body.data));

    const auditDetail = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/audit/audit_test", headers: {} },
      "/api/v1/audit/audit_test",
      context,
      { correlationId: "test_audit_detail" },
    );
    assert.equal(auditDetail.status, 404);

    // Entity-scoped audit
    const agentAudit = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox/audit", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/audit",
      context,
      { correlationId: "test_agent_audit" },
    );
    assert.equal(agentAudit.status, 200);
    assert.ok(Array.isArray(agentAudit.body.data));

    const agentEvents = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox/events", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/events",
      context,
      { correlationId: "test_agent_events" },
    );
    assert.equal(agentEvents.status, 200);
    assert.ok(Array.isArray(agentEvents.body.data));

    const agentEvidence = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox/evidence", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/evidence",
      context,
      { correlationId: "test_agent_evidence" },
    );
    assert.equal(agentEvidence.status, 200);
    assert.ok(Array.isArray(agentEvidence.body.data));

    // E03 — Diagnostics & Evidence (read-only)
    const evidence = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/evidence", headers: {} },
      "/api/v1/evidence",
      context,
      { correlationId: "test_evidence" },
    );
    assert.equal(evidence.status, 200);
    assert.ok(Array.isArray(evidence.body.data));

    const diagnostics = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/diagnostics", headers: {} },
      "/api/v1/diagnostics",
      context,
      { correlationId: "test_diagnostics" },
    );
    assert.equal(diagnostics.status, 200);
    assert.ok(Array.isArray(diagnostics.body.data));

    const readinessEvidence = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/readiness/evidence", headers: {} },
      "/api/v1/readiness/evidence",
      context,
      { correlationId: "test_readiness_evidence" },
    );
    assert.equal(readinessEvidence.status, 200);
    assert.ok(Array.isArray(readinessEvidence.body.data));

    // Diagnostics POST should be 405
    const diagnosticsPost = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/diagnostics", headers: {} },
      "/api/v1/diagnostics",
      context,
      { correlationId: "test_diagnostics_post" },
    );
    assert.equal(diagnosticsPost.status, 405);

    // E04 — Economic Overview (read-only)
    const economics = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics", headers: {} },
      "/api/v1/economics",
      context,
      { correlationId: "test_economics" },
    );
    assert.equal(economics.status, 200);
    assert.equal(economics.body.success, true);
    assert.equal(economics.body.data.neuronsContext, "operational");
    assert.equal(economics.body.data.guardrails.notBilling, true);
    assert.equal(economics.body.data.guardrails.productionReady, false);
    assert.equal(economics.body.data.currency, "NEURONS");

    const econSummary = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics/summary", headers: {} },
      "/api/v1/economics/summary",
      context,
      { correlationId: "test_econ_summary" },
    );
    assert.equal(econSummary.status, 200);
    assert.equal(econSummary.body.data.neuronsContext, "operational");

    const agentEconomics = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/agents/dev-agent-sandbox/economics", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/economics",
      context,
      { correlationId: "test_agent_economics" },
    );
    assert.equal(agentEconomics.status, 200);
    assert.equal(agentEconomics.body.data.neuronsContext, "operational");

    // Economics POST should be 405
    const economicsPost = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/economics", headers: {} },
      "/api/v1/economics",
      context,
      { correlationId: "test_economics_post" },
    );
    assert.equal(economicsPost.status, 405);

    // E05 — Quote & Reservation (read-only, mutations return 405)
    const quotes = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics/quotes", headers: {} },
      "/api/v1/economics/quotes",
      context,
      { correlationId: "test_quotes" },
    );
    assert.equal(quotes.status, 200);
    assert.ok(Array.isArray(quotes.body.data));

    const reservations = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics/reservations", headers: {} },
      "/api/v1/economics/reservations",
      context,
      { correlationId: "test_reservations" },
    );
    assert.equal(reservations.status, 200);
    assert.ok(Array.isArray(reservations.body.data));

    // Quote creation should be 405 (unsupported)
    const quoteCreate = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/agents/dev-agent-sandbox/economics/quote", headers: {} },
      "/api/v1/agents/dev-agent-sandbox/economics/quote",
      context,
      { correlationId: "test_quote_create" },
    );
    assert.equal(quoteCreate.status, 405);
    assert.equal(quoteCreate.body.error.code, "unsupported_action");

    // Reserve quote should be 405
    const reserveQuote = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/economics/quotes/quote_1/reserve", headers: {} },
      "/api/v1/economics/quotes/quote_1/reserve",
      context,
      { correlationId: "test_reserve_quote" },
    );
    assert.equal(reserveQuote.status, 405);
    assert.equal(reserveQuote.body.error.code, "unsupported_action");

    // Cancel reservation should be 405
    const cancelRes = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/economics/reservations/resv_1/cancel", headers: {} },
      "/api/v1/economics/reservations/resv_1/cancel",
      context,
      { correlationId: "test_cancel_reservation" },
    );
    assert.equal(cancelRes.status, 405);
    assert.equal(cancelRes.body.error.code, "unsupported_action");

    // E06 — Metering & Settlement (read-only, settle returns 405)
    const metering = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics/metering", headers: {} },
      "/api/v1/economics/metering",
      context,
      { correlationId: "test_metering" },
    );
    assert.equal(metering.status, 200);
    assert.ok(Array.isArray(metering.body.data));

    const settlements = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics/settlements", headers: {} },
      "/api/v1/economics/settlements",
      context,
      { correlationId: "test_settlements" },
    );
    assert.equal(settlements.status, 200);
    assert.ok(Array.isArray(settlements.body.data));

    const receipts = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics/receipts", headers: {} },
      "/api/v1/economics/receipts",
      context,
      { correlationId: "test_receipts" },
    );
    assert.equal(receipts.status, 200);
    assert.ok(Array.isArray(receipts.body.data));

    // Economic audit
    const econAudit = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/economics/audit", headers: {} },
      "/api/v1/economics/audit",
      context,
      { correlationId: "test_econ_audit" },
    );
    assert.equal(econAudit.status, 200);
    assert.ok(Array.isArray(econAudit.body.data));

    // Settle metering should be 405
    const settlePost = await routeProductApiRequest(
      { method: "POST", url: "/api/v1/economics/metering/meter_1/settle", headers: {} },
      "/api/v1/economics/metering/meter_1/settle",
      context,
      { correlationId: "test_settle" },
    );
    assert.equal(settlePost.status, 405);
    assert.equal(settlePost.body.error.code, "unsupported_action");

    // Guardrail: no secrets leaked in any response
    const allResponses = [
      events, logs, audit, evidence, diagnostics,
      economics, quotes, reservations, metering, settlements, receipts,
    ];
    for (const resp of allResponses) {
      const serialized = JSON.stringify(resp.body);
      assert.equal(serialized.includes("sk-"), false, "secret found in response");
      assert.equal(serialized.includes("api_key"), false, "api_key found in response");
      assert.equal(serialized.includes("secret"), false, "secret found in response");
    }

    // Admin/tenant surfaces must remain 404
    const noTenants = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/tenants", headers: {} },
      "/api/v1/tenants",
      context,
      { correlationId: "test_no_tenants_e" },
    );
    assert.equal(noTenants.status, 404);

  } finally {
    await context.close();
  }
});
