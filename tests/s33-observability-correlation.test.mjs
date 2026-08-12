import assert from "node:assert/strict";
import test from "node:test";
import { routeProductApiRequest } from "../dist/index.js";
import { createControlPlaneContext } from "../dist/http/control-plane-context.js";

const EXPECTED_CORRELATION_DIMENSIONS = [
  "actor",
  "request",
  "entity",
  "operation",
  "result",
  "time",
];

const EXPECTED_OBSERVABILITY_DEPTH_DIMENSIONS = [
  "logs",
  "diagnostics",
  "health",
  "audit",
  "evidence",
  "traces",
  "alerts",
  "thresholds",
  "incident_views",
  "retention",
  "correlation_ids",
];

const EXPECTED_DOMAINS = [
  "runtime-confidence",
  "worker-confidence",
  "operational-evidence",
  "audit",
  "diagnostics",
  "browser-acceptance",
  "economics",
  "system",
  "governance",
];

const EXPECTED_UNAVAILABLE_CODES = [
  "OBS-LOGS-UNSUPPORTED",
  "OBS-TRACES-DEFERRED",
  "OBS-ALERTS-DEFERRED",
  "OBS-INCIDENT-DEFERRED",
];

const EXPECTED_DEFERRED_CODES = [
  "OBS-DEFER-TRACING",
  "OBS-DEFER-ALERTS",
  "OBS-DEFER-INCIDENT",
  "OBS-DEFER-SLO",
  "OBS-DEFER-LOG-RETENTION",
];

async function getObservabilityReport() {
  const context = createControlPlaneContext();
  try {
    const result = await routeProductApiRequest(
      { method: "GET", url: "/api/v1/system/observability", headers: {} },
      "/api/v1/system/observability",
      context,
      { correlationId: "test_observability" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    return result.body.data;
  } finally {
    await context.close();
  }
}

test("GET /api/v1/system/observability returns an honest observability projection", async () => {
  const report = await getObservabilityReport();

  assert.equal(typeof report.checkedAt, "string");
  assert.equal(report.observabilityReady, false);
  assert.equal(report.productionReady, false);
  assert.equal(report.claim, "not_claimed");
  assert.ok(Array.isArray(report.correlationModel));
  assert.ok(Array.isArray(report.evidenceSources));
  assert.ok(Array.isArray(report.diagnosticTimeline));
  assert.ok(Array.isArray(report.observabilityDepth));
  assert.ok(Array.isArray(report.unsupportedSignals));
  assert.ok(Array.isArray(report.deferredItems));
  assert.ok(Array.isArray(report.blockers));
  assert.ok(Array.isArray(report.warnings));
  assert.ok(Array.isArray(report.caveats));
  assert.ok(report.readinessGateDependencies.includes("G06"));
  assert.ok(report.readinessGateDependencies.includes("G07"));
  assert.ok(report.readinessGateDependencies.includes("G08"));
  assert.ok(report.readinessGateDependencies.includes("G09"));
  assert.ok(report.readinessGateDependencies.includes("G13"));
  assert.equal(report.claimDiscipline.productionReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.observabilityReadyClaimAllowed, false);
  assert.equal(report.claimDiscipline.sloSlaClaimAllowed, false);
  assert.equal(report.claimDiscipline.incidentPlatformClaimAllowed, false);
  assert.ok(report.claimDiscipline.reason.length > 0);
  assert.ok(report.sourceEvidence.length > 0);
});

test("observability correlation model covers required dimensions", async () => {
  const report = await getObservabilityReport();
  const dimensions = report.correlationModel.map((entry) => entry.dimension);

  assert.deepEqual(dimensions, EXPECTED_CORRELATION_DIMENSIONS);
  for (const entry of report.correlationModel) {
    assert.ok(entry.label.length > 0);
    assert.ok(entry.evidence.length > 0);
  }
});

test("observability depth covers required dimensions with honest states", async () => {
  const report = await getObservabilityReport();
  const depthDimensions = report.observabilityDepth.map((entry) => entry.dimension);

  assert.deepEqual(depthDimensions, EXPECTED_OBSERVABILITY_DEPTH_DIMENSIONS);
  for (const entry of report.observabilityDepth) {
    assert.ok(entry.label.length > 0);
    assert.ok(entry.reason.length > 0);
    assert.ok(entry.evidence.length > 0);
  }

  const logsDepth = report.observabilityDepth.find((entry) => entry.dimension === "logs");
  assert.equal(logsDepth?.status, "unavailable");

  const tracesDepth = report.observabilityDepth.find((entry) => entry.dimension === "traces");
  assert.equal(tracesDepth?.status, "deferred");

  const alertsDepth = report.observabilityDepth.find((entry) => entry.dimension === "alerts");
  assert.equal(alertsDepth?.status, "deferred");

  const incidentDepth = report.observabilityDepth.find((entry) => entry.dimension === "incident_views");
  assert.equal(incidentDepth?.status, "deferred");
});

test("evidence source inventory covers required domains", async () => {
  const report = await getObservabilityReport();
  const domains = report.evidenceSources.map((entry) => entry.domain);

  for (const expected of EXPECTED_DOMAINS) {
    assert.ok(domains.includes(expected), `Expected evidence source domain "${expected}" to be present`);
  }
  for (const entry of report.evidenceSources) {
    assert.ok(entry.name.length > 0);
    assert.ok(entry.caveats.length > 0);
  }
});

test("health and diagnostics correlation is honest", async () => {
  const report = await getObservabilityReport();
  const correlation = report.healthDiagnosticsCorrelation;

  assert.ok(Array.isArray(correlation.healthIndicators));
  assert.ok(Array.isArray(correlation.diagnosticSummaries));
  assert.equal(typeof correlation.logAvailability.available, "boolean");
  assert.equal(correlation.logAvailability.available, false);
  assert.ok(["available", "partial", "unavailable", "planned"].includes(correlation.auditAvailability));
  assert.ok(["available", "partial", "unavailable", "planned"].includes(correlation.correlationStatus));
  assert.ok(correlation.caveats.length > 0);
});

test("unsupported and deferred signals are explicit with codes", async () => {
  const report = await getObservabilityReport();
  const unsupportedCodes = report.unsupportedSignals.map((entry) => entry.code);
  const deferredCodes = report.deferredItems.map((entry) => entry.code);

  for (const expected of EXPECTED_UNAVAILABLE_CODES) {
    assert.ok(unsupportedCodes.includes(expected), `Expected unsupported signal "${expected}"`);
  }
  for (const expected of EXPECTED_DEFERRED_CODES) {
    assert.ok(deferredCodes.includes(expected), `Expected deferred item "${expected}"`);
  }
});

test("diagnostic timeline items are time-ordered with no-secret status", async () => {
  const report = await getObservabilityReport();
  const timeline = report.diagnosticTimeline;

  let previousTime;
  for (const item of timeline) {
    assert.equal(typeof item.timestamp, "string");
    assert.equal(typeof item.severity, "string");
    assert.equal(typeof item.category, "string");
    assert.equal(typeof item.domain, "string");
    assert.equal(typeof item.message, "string");
    assert.equal(typeof item.source, "string");
    assert.equal(typeof item.actionability, "string");
    assert.equal(item.noSecretStatus, true);
    const currentTime = new Date(item.timestamp).getTime();
    if (previousTime !== undefined) {
      assert.ok(currentTime >= previousTime, "Timeline should be sorted ascending by timestamp");
    }
    previousTime = currentTime;
  }
});

test("observability JSON does not leak raw secret markers", async () => {
  const report = await getObservabilityReport();
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("Bearer "), false);
  assert.equal(serialized.includes("password"), false);
  assert.equal(serialized.includes("secret_key"), false);
});

test("observability endpoint rejects unsupported methods", async () => {
  const context = createControlPlaneContext();
  try {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const result = await routeProductApiRequest(
        { method, url: "/api/v1/system/observability", headers: {} },
        "/api/v1/system/observability",
        context,
        { correlationId: `test_observability_${method}` },
      );
      assert.equal(result.status, 405);
      assert.equal(result.body.error.code, "method_not_allowed");
    }
  } finally {
    await context.close();
  }
});
