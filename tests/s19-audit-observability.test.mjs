import test from "node:test";
import assert from "node:assert/strict";
import { AuditService, redactValue } from "../dist/control-plane/audit-service.js";

test("AuditService records events with correlation IDs in append-only order", () => {
  const audit = new AuditService();
  const correlationId = "corr_flow_123";

  const evt1 = audit.recordEvent({
    eventType: "agent.plan_resolved",
    correlationId,
    agentId: "mazikeen",
    revision: 1,
    metadata: { plan: "sandbox_plan" },
  });

  const evt2 = audit.recordEvent({
    eventType: "governance.evaluated",
    correlationId,
    agentId: "mazikeen",
    decision: "allowed",
    metadata: { mode: "sandbox" },
  });

  const events = audit.listEvents();
  assert.equal(events.length, 2);
  assert.equal(events[0].eventId, evt1.eventId);
  assert.equal(events[1].eventId, evt2.eventId);
  assert.equal(events[0].correlationId, correlationId);
  assert.equal(events[1].correlationId, correlationId);
});

test("AuditService automatically redacts secret fields in metadata", () => {
  const audit = new AuditService();
  const evt = audit.recordEvent({
    eventType: "deployment.requested",
    correlationId: "corr_secret_test",
    agentId: "mazikeen",
    metadata: {
      api_key: "secret_12345",
      user: "alice",
      token: "sk-proj-98765432101234567890",
      nested: {
        password: "supersecretpassword",
        publicSetting: "ok",
      },
    },
  });

  assert.equal(evt.metadata.api_key, "[REDACTED]");
  assert.equal(evt.metadata.user, "alice");
  assert.equal(evt.metadata.token, "[REDACTED]");
  assert.equal(evt.metadata.nested.password, "[REDACTED]");
  assert.equal(evt.metadata.nested.publicSetting, "ok");
});

test("AuditService queries events by correlationId, agentId, deploymentId, and eventType", () => {
  const audit = new AuditService();
  audit.recordEvent({ eventType: "agent.plan_resolved", correlationId: "c1", agentId: "a1" });
  audit.recordEvent({ eventType: "deployment.completed", correlationId: "c1", agentId: "a1", deploymentId: "d1" });
  audit.recordEvent({ eventType: "runtime.started", correlationId: "c2", agentId: "a2", runtimeInstanceId: "r2" });

  const c1Events = audit.queryEvents({ correlationId: "c1" });
  assert.equal(c1Events.length, 2);

  const a2Events = audit.queryEvents({ agentId: "a2" });
  assert.equal(a2Events.length, 1);
  assert.equal(a2Events[0].runtimeInstanceId, "r2");

  const deployEvents = audit.queryEvents({ eventType: "deployment.completed" });
  assert.equal(deployEvents.length, 1);
  assert.equal(deployEvents[0].deploymentId, "d1");
});

test("redactValue utility function handles primitives, arrays, and objects", () => {
  assert.equal(redactValue("sk-12345"), "[REDACTED]");
  assert.equal(redactValue("plain_text"), "plain_text");

  const inputObj = { secret_token: "12345", safe_field: "hello" };
  const redacted = redactValue(inputObj);
  assert.equal(redacted.secret_token, "[REDACTED]");
  assert.equal(redacted.safe_field, "hello");
});
