import assert from "node:assert/strict";
import test from "node:test";
import { validateMockLicense } from "../dist/index.js";

test("validates a mock license for the requested strategy", () => {
  const result = validateMockLicense({
    walletAddress: "0x123",
    licenseType: "trading-ignition",
    requiredLicenseType: "trading-ignition",
    expiresAt: "2999-01-01T00:00:00.000Z",
    strategyAccess: ["conservative"],
    requiredStrategy: "conservative",
  });

  assert.equal(result.valid, true);
  assert.equal(result.status, "valid");
  assert.deepEqual(result.reasons, []);
});

test("rejects missing, expired, revoked, or strategy-incompatible mock licenses", () => {
  const expired = validateMockLicense({
    walletAddress: "0x123",
    licenseType: "trading-ignition",
    requiredLicenseType: "trading-ignition",
    expiresAt: "2000-01-01T00:00:00.000Z",
    strategyAccess: ["conservative"],
    requiredStrategy: "balanced",
  });

  assert.equal(expired.valid, false);
  assert.equal(expired.status, "expired");
  assert.ok(expired.reasons.includes("license is expired"));
  assert.ok(expired.reasons.includes("license does not allow strategy balanced"));

  const revoked = validateMockLicense({
    walletAddress: "0x123",
    licenseType: "trading-ignition",
    requiredLicenseType: "trading-ignition",
    revoked: true,
  });

  assert.equal(revoked.valid, false);
  assert.equal(revoked.status, "revoked");
});

