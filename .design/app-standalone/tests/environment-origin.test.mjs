import assert from "node:assert/strict";
import test from "node:test";

import { resolveStandaloneApiBaseUrl } from "../src/api/environment.js";

test("LOCAL standalone browser API may target localhost", () => {
  assert.equal(
    resolveStandaloneApiBaseUrl({
      VITE_ACS_ENVIRONMENT: "local",
      VITE_ACS_API_BASE_URL: "http://127.0.0.1:8788/api/v1",
    }),
    "http://127.0.0.1:8788/api/v1",
  );
});

test("DEVELOPMENT standalone browser API rejects localhost and private Railway origins", () => {
  assert.throws(() => resolveStandaloneApiBaseUrl({
    VITE_ACS_ENVIRONMENT: "development",
    VITE_ACS_API_BASE_URL: "http://127.0.0.1:8788/api/v1",
  }), /must use https API origins/);

  assert.throws(() => resolveStandaloneApiBaseUrl({
    VITE_ACS_ENVIRONMENT: "development",
    VITE_ACS_API_BASE_URL: "https://exquisite-enjoyment.railway.internal/api/v1",
  }), /must not use localhost or private Railway API origins/);
});

test("DEVELOPMENT and PRODUCTION standalone browser API accept public HTTPS origins", () => {
  assert.equal(
    resolveStandaloneApiBaseUrl({
      VITE_ACS_ENVIRONMENT: "development",
      VITE_ACS_API_BASE_URL: "https://acs-axodus.up.railway.app/api/v1",
    }),
    "https://acs-axodus.up.railway.app/api/v1",
  );

  assert.equal(
    resolveStandaloneApiBaseUrl({
      VITE_ACS_ENVIRONMENT: "production",
      VITE_ACS_API_BASE_URL: "https://api.example.com/api/v1",
    }, {
      hostname: "acs.example.com",
    }),
    "https://api.example.com/api/v1",
  );
});
