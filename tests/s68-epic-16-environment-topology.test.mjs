import assert from "node:assert/strict";
import test from "node:test";

import { resolveEnvironmentTopology } from "../dist/control-plane/environment-topology.js";

test("LOCAL topology defaults to local dispatch and local worker", () => {
  const topology = resolveEnvironmentTopology({
    ACS_ENVIRONMENT: "local",
    ACS_HTTP_HOST: "127.0.0.1",
    ACS_HTTP_PORT: "8788",
  });

  assert.equal(topology.environment, "local");
  assert.equal(topology.dispatchMode, "local");
  assert.equal(topology.workerMode, "local");
  assert.equal(topology.workerTransport, "stdio");
  assert.equal(topology.httpHost, "127.0.0.1");
  assert.equal(topology.httpPort, 8788);
});

test("DEVELOPMENT topology defaults to remote dispatch and cloud worker", () => {
  const topology = resolveEnvironmentTopology({
    ACS_ENVIRONMENT: "development",
    ACS_HTTP_PORT: "8788",
  });

  assert.equal(topology.environment, "development");
  assert.equal(topology.dispatchMode, "remote");
  assert.equal(topology.workerMode, "cloud");
  assert.equal(topology.workerTransport, "https");
  assert.equal(topology.httpHost, "0.0.0.0");
  assert.equal(topology.httpPort, 8788);
});

test("PRODUCTION topology defaults to remote dispatch and remote worker", () => {
  const topology = resolveEnvironmentTopology({
    ACS_ENVIRONMENT: "production",
    ACS_HTTP_PORT: "8080",
  });

  assert.equal(topology.environment, "production");
  assert.equal(topology.dispatchMode, "remote");
  assert.equal(topology.workerMode, "remote");
  assert.equal(topology.workerTransport, "https");
  assert.equal(topology.httpHost, "0.0.0.0");
  assert.equal(topology.httpPort, 8080);
});
