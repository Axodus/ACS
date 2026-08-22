import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

function assertEnv(relativePath, expected, forbidden = []) {
  const env = parseEnv(read(relativePath));
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(env[key], value, `${relativePath} ${key}`);
  }
  for (const key of forbidden) {
    assert.ok(!(key in env), `${relativePath} should not define ${key}`);
  }
}

test("root environment templates preserve the LOCAL, DEVELOPMENT, and PRODUCTION topology contract", () => {
  assertEnv(".env.local", {
    ACS_ENVIRONMENT: "local",
    ACS_HTTP_HOST: "127.0.0.1",
    ACS_HTTP_PORT: "8788",
    ACS_DISPATCH_MODE: "local",
    ACS_OPENCLAW_WORKER_MODE: "local",
  });

  assertEnv(".env.development", {
    ACS_ENVIRONMENT: "development",
    ACS_HTTP_HOST: "0.0.0.0",
    ACS_DISPATCH_MODE: "remote",
    ACS_OPENCLAW_WORKER_MODE: "cloud",
    ACS_OPENCLAW_TRANSPORT: "https",
  });

  const rootExample = read(".env.example");
  assert.match(rootExample, /ACS_HTTP_PORT=\$\{PORT\}/);
  assert.match(rootExample, /ACS_OPENCLAW_CLOUD_BASE_URL=https:\/\/exquisite-enjoyment\.railway\.internal/);
  assert.match(rootExample, /ACS_OPENCLAW_WORKER_BASE_URL=https:\/\/openclaw-worker\.example\.com/);
  assert.match(rootExample, /ACS_TELEMETRY_MODE=external/);
});

test("standalone environment templates keep browser-visible API origins public and browser-safe", () => {
  assertEnv(".design/app-standalone/.env.local", {
    VITE_ACS_ENVIRONMENT: "local",
    VITE_ACS_API_BASE_URL: "http://127.0.0.1:8788/api/v1",
  });

  assertEnv(".design/app-standalone/.env.development", {
    VITE_ACS_ENVIRONMENT: "development",
    VITE_ACS_API_BASE_URL: "https://acs-axodus.up.railway.app/api/v1",
  });

  const standaloneExample = read(".design/app-standalone/.env.example");
  assert.match(standaloneExample, /VITE_ACS_API_BASE_URL=https:\/\/acs-api\.example\.com\/api\/v1/);
  assert.doesNotMatch(standaloneExample, /railway\.internal/);
});
