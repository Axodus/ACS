import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
const {
  InMemoryTelemetryExporter,
  OperationalTelemetryProvider,
  OtlpHttpTelemetryExporter,
  assertProductionTelemetryConfiguration,
  containsSensitiveTelemetry,
  createServerRequestIdentity,
  formatTraceparent,
  parseTraceparent,
} = await import(process.env.ACS_TEST_DIST_URL ?? new URL("../dist/index.js", import.meta.url).href);

async function startReceiver() {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    requests.push({ path: request.url, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
    response.writeHead(200, { "content-type": "application/json" });
    response.end("{}");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.equal(typeof address, "object");
  return {
    requests,
    endpoint: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("E01 exports bounded structured logs, metrics and traces through OTLP HTTP with redaction", async () => {
  const receiver = await startReceiver();
  const telemetry = new OperationalTelemetryProvider({
    exporter: new OtlpHttpTelemetryExporter({ endpoint: receiver.endpoint, serviceName: "acs-e01-test" }),
    serviceName: "acs-e01-test",
    instanceId: "instance-e01",
    exportIntervalMs: 60_000,
    queueCapacity: 4,
  });
  try {
    const parent = parseTraceparent("00-0123456789abcdef0123456789abcdef-0123456789abcdef-01");
    assert.ok(parent);
    const span = telemetry.startSpan("job.execute", {
      parent,
      context: { correlationId: "corr-e01", jobId: "job-high-cardinality" },
      attributes: { authorization: "Bearer dangerous-token", safe: "value" },
    });
    telemetry.log({
      component: "http",
      event: "http.request.completed",
      message: "request completed with Bearer dangerous-token",
      context: { correlationId: "corr-e01", traceId: span.context.traceId, spanId: span.context.spanId },
      attributes: { secretValue: "plaintext-secret", status: 200 },
    });
    telemetry.metric({
      name: "acs.runtime.jobs.completed",
      kind: "counter",
      value: 1,
      attributes: { status: "succeeded", jobId: "must-not-be-a-label", traceId: "must-not-be-a-label" },
    });
    span.end("ok", { workerCredential: "worker-secret", result: "succeeded" });
    await telemetry.flush();

    assert.deepEqual(new Set(receiver.requests.map((request) => request.path)), new Set(["/v1/logs", "/v1/metrics", "/v1/traces"]));
    assert.equal(containsSensitiveTelemetry(receiver.requests), false);
    const snapshot = await telemetry.snapshot();
    assert.equal(snapshot.health.external, true);
    assert.equal(snapshot.health.productionGrade, true);
    assert.equal(snapshot.health.reachable, true);
    assert.equal(snapshot.recentMetrics[0].attributes.jobId, undefined);
    assert.equal(snapshot.recentMetrics[0].attributes.traceId, undefined);
    assert.equal(snapshot.recentLogs[0].attributes.secretValue, undefined);
    assert.equal(snapshot.recentSpans[0].parentSpanId, parent.spanId);
    const traceRequest = receiver.requests.find((request) => request.path === "/v1/traces");
    const exportedSpan = traceRequest.body.resourceSpans[0].scopeSpans[0].spans[0];
    assert.equal(exportedSpan.traceId, Buffer.from(parent.traceId, "hex").toString("base64"));
    assert.equal(exportedSpan.parentSpanId, Buffer.from(parent.spanId, "hex").toString("base64"));
  } finally {
    await telemetry.close();
    await receiver.close();
  }
});

test("E01 exporter outage is bounded, degraded and never throws into domain operations", async () => {
  const exporter = new OtlpHttpTelemetryExporter({
    endpoint: "http://127.0.0.1:9",
    serviceName: "acs-e01-outage",
    timeoutMs: 50,
    fetchImpl: async () => { throw Object.assign(new Error("receiver unavailable"), { name: "ReceiverUnavailable" }); },
  });
  const telemetry = new OperationalTelemetryProvider({
    exporter,
    serviceName: "acs-e01-outage",
    exportIntervalMs: 60_000,
    queueCapacity: 2,
    exportTimeoutMs: 100,
  });
  try {
    telemetry.log({ component: "test", event: "one", message: "one" });
    telemetry.log({ component: "test", event: "two", message: "two" });
    telemetry.log({ component: "test", event: "three", message: "three" });
    await assert.doesNotReject(() => telemetry.flush());
    const snapshot = await telemetry.snapshot();
    assert.equal(snapshot.health.state, "degraded");
    assert.equal(snapshot.health.reachable, false);
    assert.equal(snapshot.queue.logs, 2);
    assert.equal(snapshot.queue.dropped, 1);
  } finally {
    await telemetry.close();
  }
});

test("E01 request identity is server-owned and W3C trace context validation is deterministic", () => {
  const invalid = createServerRequestIdentity({ clientCorrelationId: "bad correlation with spaces", traceparent: "invalid" });
  assert.match(invalid.requestId, /^req_/);
  assert.equal(invalid.correlationId, invalid.requestId);
  assert.equal(invalid.parentTrace, undefined);

  const accepted = createServerRequestIdentity({
    clientCorrelationId: "client.correlation-1",
    traceparent: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
  });
  assert.equal(accepted.correlationId, "client.correlation-1");
  assert.equal(formatTraceparent(accepted.parentTrace), "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01");
});

test("E01 memory exporter remains explicit development evidence, never production external evidence", async () => {
  const telemetry = new OperationalTelemetryProvider({ exporter: new InMemoryTelemetryExporter(), serviceName: "acs-dev" });
  try {
    const health = await telemetry.health();
    assert.equal(health.external, false);
    assert.equal(health.productionGrade, false);
    assert.throws(
      () => assertProductionTelemetryConfiguration("production", telemetry),
      /external production-oriented telemetry exporter/,
    );
    assert.doesNotThrow(() => assertProductionTelemetryConfiguration("development", telemetry));
  } finally {
    await telemetry.close();
  }
});
