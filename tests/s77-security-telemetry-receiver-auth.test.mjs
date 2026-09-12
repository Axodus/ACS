import assert from "node:assert/strict";
import test from "node:test";

const { runOperationalTelemetryReceiverFromEnvironment } = await import(
  new URL("../dist/control-plane/operational-telemetry-receiver-entrypoint.js", import.meta.url).href,
);

test("telemetry receiver rejects an unauthenticated external bind", async () => {
  await assert.rejects(
    () => runOperationalTelemetryReceiverFromEnvironment({
      ACS_TELEMETRY_RECEIVER_HOST: "0.0.0.0",
      ACS_TELEMETRY_RECEIVER_PORT: "0",
    }),
    /authentication token is required outside loopback/,
  );
});

test("telemetry receiver permits explicit loopback-only acceptance use without a token", async () => {
  const receiver = await runOperationalTelemetryReceiverFromEnvironment({
    ACS_TELEMETRY_RECEIVER_HOST: "127.0.0.1",
    ACS_TELEMETRY_RECEIVER_PORT: "0",
  });
  try {
    const response = await fetch(`http://127.0.0.1:${receiver.port}/snapshot`);
    assert.equal(response.status, 200);
  } finally {
    await receiver.close();
  }
});

test("telemetry receiver protects external snapshot access with its configured bearer token", async () => {
  const receiver = await runOperationalTelemetryReceiverFromEnvironment({
    ACS_TELEMETRY_RECEIVER_HOST: "0.0.0.0",
    ACS_TELEMETRY_RECEIVER_PORT: "0",
    ACS_TELEMETRY_RECEIVER_AUTH_TOKEN: "test-receiver-token",
  });
  try {
    const baseUrl = `http://127.0.0.1:${receiver.port}`;
    const missingCredential = await fetch(`${baseUrl}/snapshot`);
    assert.equal(missingCredential.status, 401);

    const validCredential = await fetch(`${baseUrl}/snapshot`, {
      headers: { authorization: "Bearer test-receiver-token" },
    });
    assert.equal(validCredential.status, 200);
  } finally {
    await receiver.close();
  }
});
