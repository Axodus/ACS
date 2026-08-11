import assert from "node:assert/strict";
import test from "node:test";
import { createEpic10ReadinessReport, inspectEpic10Readiness, routeAcsRequest } from "../dist/index.js";

test("worker readiness reports a ready distributed worker when capability and transport are present", () => {
  const report = createEpic10ReadinessReport({
    workerStatus: "available",
    remoteWorkerSupported: true,
  });

  const workerDomain = report.domains.find((domain) => domain.domain === "execution-workers");

  assert.ok(workerDomain);
  assert.equal(workerDomain.status, "ready");
  assert.equal(workerDomain.currentState.includes("available"), true);
});

test("worker unavailable finding is reported when the worker is not available", () => {
  const report = createEpic10ReadinessReport({
    workerStatus: "unavailable",
  });

  const finding = report.findings.find((item) => item.domain === "execution-workers");

  assert.ok(finding);
  assert.equal(finding.severity, "error");
  assert.equal(finding.blocksProduction, false);
  assert.match(finding.currentState, /unavailable/);
});

test("target unavailable finding is reported explicitly", () => {
  const report = createEpic10ReadinessReport({
    targetStatus: "unavailable",
  });

  const finding = report.findings.find((item) => item.domain === "execution-targets");

  assert.ok(finding);
  assert.equal(finding.severity, "error");
  assert.match(finding.currentState, /unavailable/i);
  assert.equal(finding.blocksProduction, false);
});

test("tenant isolation readiness is explicit and ready", () => {
  const report = createEpic10ReadinessReport();
  const domain = report.domains.find((item) => item.domain === "tenant-isolation");

  assert.ok(domain);
  assert.equal(domain.status, "ready");
  assert.equal(domain.findings.length, 0);
});

test("credential backend readiness is blocked until a managed secret backend exists", () => {
  const report = createEpic10ReadinessReport();
  const domain = report.domains.find((item) => item.domain === "credential-handling");

  assert.ok(domain);
  assert.equal(domain.status, "blocked");
  assert.ok(domain.findings.some((finding) => finding.blocksProduction));
});

test("auth readiness is blocked until real authentication is wired", () => {
  const report = createEpic10ReadinessReport();
  const domain = report.domains.find((item) => item.domain === "authentication-authorization");

  assert.ok(domain);
  assert.equal(domain.status, "blocked");
  assert.ok(domain.findings[0].reason.includes("mock-only"));
});

test("rate-limit readiness is blocked until production enforcement is wired", () => {
  const report = createEpic10ReadinessReport();
  const domain = report.domains.find((item) => item.domain === "rate-limiting");

  assert.ok(domain);
  assert.equal(domain.status, "blocked");
  assert.ok(domain.findings[0].blocksProduction);
});

test("persistence readiness is blocked until durable storage exists", () => {
  const report = createEpic10ReadinessReport();
  const domain = report.domains.find((item) => item.domain === "persistence");

  assert.ok(domain);
  assert.equal(domain.status, "blocked");
  assert.ok(domain.findings[0].currentState.includes("memory"));
});

test("remote-worker readiness is blocked while the implementation remains local-only", () => {
  const report = createEpic10ReadinessReport();
  const domain = report.domains.find((item) => item.domain === "remote-worker-support");

  assert.ok(domain);
  assert.equal(domain.status, "blocked");
  assert.ok(domain.findings[0].blocksProduction);
});

test("S23 certification reports explicit production blockers and no false production-ready status", () => {
  const report = createEpic10ReadinessReport();

  assert.equal(report.devReady, true);
  assert.equal(report.distributedArchitectureReady, true);
  assert.equal(report.productionReady, false);
  assert.ok(report.blockers.length >= 6);
  assert.ok(report.blockers.every((finding) => finding.blocksProduction));
});

test("readiness output is secret-free and the /acs surface exposes the report", () => {
  const report = inspectEpic10Readiness();
  const serialized = JSON.stringify(report);
  const route = routeAcsRequest("/acs/epic-10/readiness");

  assert.equal(serialized.includes("sk-"), false);
  assert.equal(serialized.includes("secret_"), false);
  assert.equal(route.status, 200);
  assert.equal(route.body.data.readiness.productionReady, false);
  assert.equal(JSON.stringify(route.body).includes("sk-"), false);
});
