export type ExchangeApiPermission =
  | "read"
  | "spot_trade"
  | "futures_trade"
  | "margin_trade"
  | "withdraw"
  | "transfer"
  | "universal_transfer";

export type ExchangeApiSafetySeverity = "blocker" | "warning" | "info";

export interface ExchangeApiSafetyInput {
  readonly exchangeId: string;
  readonly permissions: readonly ExchangeApiPermission[];
  readonly ipRestrictionEnabled: boolean;
  readonly allowedIps?: readonly string[];
  readonly secretStoredEncrypted: boolean;
  readonly secretExposedToFrontend: boolean;
  readonly plaintextLoggingEnabled: boolean;
  readonly futuresRequired?: boolean;
}

export interface ExchangeApiSafetyFinding {
  readonly id: string;
  readonly severity: ExchangeApiSafetySeverity;
  readonly message: string;
  readonly uiRecommendation: string;
}

export interface ExchangeApiSafetyResult {
  readonly safe: boolean;
  readonly exchangeId: string;
  readonly blockers: readonly ExchangeApiSafetyFinding[];
  readonly warnings: readonly ExchangeApiSafetyFinding[];
  readonly recommendations: readonly string[];
}

const WITHDRAWAL_PERMISSIONS: readonly ExchangeApiPermission[] = [
  "withdraw",
  "transfer",
  "universal_transfer",
];

export function validateMockExchangeApiSafety(input: ExchangeApiSafetyInput): ExchangeApiSafetyResult {
  const findings: ExchangeApiSafetyFinding[] = [];
  const permissions = new Set(input.permissions);

  for (const permission of WITHDRAWAL_PERMISSIONS) {
    if (permissions.has(permission)) {
      findings.push({
        id: `api.permission.${permission}.blocked`,
        severity: "blocker",
        message: `Exchange API permission is unsafe: ${permission}`,
        uiRecommendation: "Disable withdrawal and transfer permissions before connecting this API key.",
      });
    }
  }

  if (!input.secretStoredEncrypted) {
    findings.push({
      id: "api.secret.encryption.required",
      severity: "blocker",
      message: "API secret storage is not encrypted.",
      uiRecommendation: "Do not continue until encrypted secret storage is enabled.",
    });
  }

  if (input.secretExposedToFrontend) {
    findings.push({
      id: "api.secret.frontend.blocked",
      severity: "blocker",
      message: "API secret is exposed to frontend code or browser storage.",
      uiRecommendation: "Never paste or store API secrets in the browser. Use the secure backend flow only.",
    });
  }

  if (input.plaintextLoggingEnabled) {
    findings.push({
      id: "api.secret.logging.blocked",
      severity: "blocker",
      message: "API secrets may be written to plaintext logs.",
      uiRecommendation: "Disable plaintext API logging before connecting this API key.",
    });
  }

  if (!input.ipRestrictionEnabled) {
    findings.push({
      id: "api.ip.permission.recommended",
      severity: "warning",
      message: "API key does not use IP restrictions.",
      uiRecommendation: "Enable IP permission/allowlist on the exchange API key and allow only Axodus-approved execution IPs.",
    });
  } else if ((input.allowedIps ?? []).length === 0) {
    findings.push({
      id: "api.ip.allowlist.empty",
      severity: "warning",
      message: "API IP restriction is enabled but no allowed IPs were provided to ACS.",
      uiRecommendation: "Confirm the exchange API key is restricted to the exact execution IPs before activation.",
    });
  }

  if (input.futuresRequired !== true && permissions.has("futures_trade")) {
    findings.push({
      id: "api.permission.futures.unneeded",
      severity: "warning",
      message: "Futures trading permission is enabled but not required by the selected strategy.",
      uiRecommendation: "Disable futures permission unless the selected ACS preset explicitly requires it.",
    });
  }

  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warning");

  return {
    safe: blockers.length === 0,
    exchangeId: input.exchangeId,
    blockers,
    warnings,
    recommendations: [
      "Disable withdrawal permissions on the exchange API key.",
      "Use IP permission/allowlist whenever the exchange supports it.",
      "Grant only the minimum trading permissions required by the selected ACS preset.",
      "Never expose API secrets in frontend code, browser storage, or plaintext logs.",
    ],
  };
}

