import assert from "node:assert/strict";
import test from "node:test";
import { validateMockExchangeApiSafety } from "../dist/index.js";

test("blocks exchange API keys with withdrawal or transfer permissions", () => {
  const result = validateMockExchangeApiSafety({
    exchangeId: "binance",
    permissions: ["read", "spot_trade", "withdraw", "transfer"],
    ipRestrictionEnabled: true,
    allowedIps: ["203.0.113.10"],
    secretStoredEncrypted: true,
    secretExposedToFrontend: false,
    plaintextLoggingEnabled: false,
  });

  assert.equal(result.safe, false);
  assert.ok(result.blockers.some((finding) => finding.id === "api.permission.withdraw.blocked"));
  assert.ok(result.blockers.some((finding) => finding.id === "api.permission.transfer.blocked"));
  assert.ok(result.recommendations.includes("Disable withdrawal permissions on the exchange API key."));
});

test("warns the UI to recommend IP permission when allowlist is missing", () => {
  const result = validateMockExchangeApiSafety({
    exchangeId: "kucoin",
    permissions: ["read", "spot_trade"],
    ipRestrictionEnabled: false,
    secretStoredEncrypted: true,
    secretExposedToFrontend: false,
    plaintextLoggingEnabled: false,
  });

  assert.equal(result.safe, true);
  assert.ok(result.warnings.some((finding) => finding.id === "api.ip.permission.recommended"));
  assert.ok(
    result.warnings.some((finding) =>
      finding.uiRecommendation.includes("Enable IP permission/allowlist"),
    ),
  );
});

test("blocks unsafe secret handling for exchange APIs", () => {
  const result = validateMockExchangeApiSafety({
    exchangeId: "binance",
    permissions: ["read"],
    ipRestrictionEnabled: true,
    allowedIps: ["203.0.113.10"],
    secretStoredEncrypted: false,
    secretExposedToFrontend: true,
    plaintextLoggingEnabled: true,
  });

  assert.equal(result.safe, false);
  assert.ok(result.blockers.some((finding) => finding.id === "api.secret.encryption.required"));
  assert.ok(result.blockers.some((finding) => finding.id === "api.secret.frontend.blocked"));
  assert.ok(result.blockers.some((finding) => finding.id === "api.secret.logging.blocked"));
});

