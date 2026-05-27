import { createHash } from "node:crypto";

export type HummingbotStrategyValidationCheck =
  | "schema_validation"
  | "static_safety_checks"
  | "no_secrets"
  | "no_connector_keys"
  | "no_direct_exchange_calls"
  | "no_network_calls"
  | "no_shell_calls"
  | "no_filesystem_escape"
  | "no_live_trading_flags"
  | "risk_metadata_present"
  | "strategy_config_explicit"
  | "rollback_plan_present";

export interface HummingbotStrategyValidationInput {
  readonly artifactId: string;
  readonly strategyPath: string;
  readonly strategySource: string;
  readonly riskMetadata?: {
    readonly riskLevel: "low" | "medium" | "high" | "critical";
    readonly maxPositionNotionalUsd: number;
    readonly liveExecutionEnabled: false;
    readonly paperTradingEnabled: false;
  };
  readonly rollbackPlanPresent: boolean;
}

export interface HummingbotStrategyValidationIssue {
  readonly check: HummingbotStrategyValidationCheck;
  readonly code: string;
  readonly message: string;
}

export interface HummingbotStrategyValidationReport {
  readonly schemaVersion: 1;
  readonly artifactId: string;
  readonly strategyPath: string;
  readonly valid: boolean;
  readonly contentSha256: string;
  readonly passedChecks: readonly HummingbotStrategyValidationCheck[];
  readonly failedChecks: readonly HummingbotStrategyValidationIssue[];
  readonly promotionAllowed: false;
  readonly realRuntimeTouched: false;
  readonly createdAt: string;
}

const SECRET_PATTERNS: readonly RegExp[] = [
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /api[_-]?secret\s*[:=]\s*["'][^"']+["']/i,
  /private[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /seed[_-]?phrase\s*[:=]\s*["'][^"']+["']/i,
  /password\s*[:=]\s*["'][^"']+["']/i,
  /token\s*[:=]\s*["'][^"']+["']/i,
];

const CONNECTOR_KEY_PATTERNS: readonly RegExp[] = [
  /connector[_-]?config\s*[:=]/i,
  /conf\/connectors/i,
  /hummingbot\.connector/i,
  /binance_auth/i,
  /bybit_auth/i,
  /okx_auth/i,
];

const DIRECT_EXCHANGE_PATTERNS: readonly RegExp[] = [
  /place_order\s*\(/i,
  /buy\s*\(/i,
  /sell\s*\(/i,
  /execute_trade\s*\(/i,
  /create_order\s*\(/i,
  /cancel_order\s*\(/i,
  /exchange\./i,
];

const NETWORK_PATTERNS: readonly RegExp[] = [
  /requests\./i,
  /httpx\./i,
  /aiohttp/i,
  /urllib/i,
  /websocket/i,
  /socket\./i,
];

const SHELL_PATTERNS: readonly RegExp[] = [
  /subprocess/i,
  /os\.system/i,
  /Popen\s*\(/i,
  /exec\s*\(/i,
  /eval\s*\(/i,
];

const FILESYSTEM_ESCAPE_PATTERNS: readonly RegExp[] = [
  /\.\.\//,
  /\/mnt\/d\/Rede\/Github\/Axodus\/tradingbot/i,
  /\/mnt\/d\/Rede\/Github\/Axodus\/hummingbot-api/i,
  /open\s*\(/i,
  /Path\s*\(/i,
  /shutil\./i,
  /os\.remove/i,
  /os\.rename/i,
];

export function validateHummingbotSandboxStrategy(
  input: HummingbotStrategyValidationInput,
  createdAt = new Date().toISOString(),
): HummingbotStrategyValidationReport {
  const passedChecks = new Set<HummingbotStrategyValidationCheck>();
  const failedChecks: HummingbotStrategyValidationIssue[] = [];

  addCheck(
    input.strategyPath.startsWith(".instructions/acs/trading/hummingbot-sandbox/strategies/")
      && input.strategyPath.endsWith(".py"),
    "schema_validation",
    "strategy_schema_invalid",
    "Strategy artifact must be a Python file inside the ACS Hummingbot sandbox strategies path.",
    passedChecks,
    failedChecks,
  );

  addCheck(
    /ACS sandbox-only Hummingbot strategy artifact/.test(input.strategySource)
      && /describe_strategy\(\)/.test(input.strategySource),
    "static_safety_checks",
    "static_safety_markers_missing",
    "Strategy must include sandbox-only and describe_strategy markers.",
    passedChecks,
    failedChecks,
  );

  addPatternAbsenceCheck(input.strategySource, SECRET_PATTERNS, "no_secrets", "secret_pattern_detected", "Secret-like assignment detected.", passedChecks, failedChecks);
  addPatternAbsenceCheck(input.strategySource, CONNECTOR_KEY_PATTERNS, "no_connector_keys", "connector_key_pattern_detected", "Connector config/key pattern detected.", passedChecks, failedChecks);
  addPatternAbsenceCheck(input.strategySource, DIRECT_EXCHANGE_PATTERNS, "no_direct_exchange_calls", "direct_exchange_call_detected", "Direct exchange/order call detected.", passedChecks, failedChecks);
  addPatternAbsenceCheck(input.strategySource, NETWORK_PATTERNS, "no_network_calls", "network_call_detected", "Network call pattern detected.", passedChecks, failedChecks);
  addPatternAbsenceCheck(input.strategySource, SHELL_PATTERNS, "no_shell_calls", "shell_call_detected", "Shell/process execution pattern detected.", passedChecks, failedChecks);
  addPatternAbsenceCheck(input.strategySource, FILESYSTEM_ESCAPE_PATTERNS, "no_filesystem_escape", "filesystem_escape_detected", "Filesystem escape or file mutation pattern detected.", passedChecks, failedChecks);

  addCheck(
    /live_execution_enabled:\s*bool\s*=\s*False/.test(input.strategySource)
      && /paper_trading_enabled:\s*bool\s*=\s*False/.test(input.strategySource)
      && !/live_execution_enabled:\s*bool\s*=\s*True/.test(input.strategySource)
      && !/paper_trading_enabled:\s*bool\s*=\s*True/.test(input.strategySource),
    "no_live_trading_flags",
    "live_or_paper_trading_flag_enabled",
    "Live or paper trading flag is enabled or missing explicit false declaration.",
    passedChecks,
    failedChecks,
  );

  addCheck(
    Boolean(input.riskMetadata)
      && input.riskMetadata?.liveExecutionEnabled === false
      && input.riskMetadata?.paperTradingEnabled === false
      && typeof input.riskMetadata?.maxPositionNotionalUsd === "number",
    "risk_metadata_present",
    "risk_metadata_missing",
    "Risk metadata must be present with live/paper execution disabled.",
    passedChecks,
    failedChecks,
  );

  addCheck(
    /strategy_id:\s*str\s*=/.test(input.strategySource)
      && /market:\s*str\s*=/.test(input.strategySource)
      && /rsi_period:\s*int\s*=/.test(input.strategySource)
      && /max_position_notional_usd:\s*int\s*=/.test(input.strategySource),
    "strategy_config_explicit",
    "strategy_config_not_explicit",
    "Strategy config must explicitly declare id, market, RSI period and max notional.",
    passedChecks,
    failedChecks,
  );

  addCheck(
    input.rollbackPlanPresent,
    "rollback_plan_present",
    "rollback_plan_missing",
    "Rollback plan must be present before any future promotion.",
    passedChecks,
    failedChecks,
  );

  return {
    schemaVersion: 1,
    artifactId: input.artifactId,
    strategyPath: input.strategyPath,
    valid: failedChecks.length === 0,
    contentSha256: createHash("sha256").update(input.strategySource).digest("hex"),
    passedChecks: [...passedChecks],
    failedChecks,
    promotionAllowed: false,
    realRuntimeTouched: false,
    createdAt,
  };
}

export function renderHummingbotStrategyValidationMarkdown(report: HummingbotStrategyValidationReport): string {
  return [
    `# Hummingbot Strategy Validation Gate: ${report.artifactId}`,
    "",
    `Strategy: ${report.strategyPath}`,
    `Valid: ${report.valid}`,
    `Promotion Allowed: ${report.promotionAllowed}`,
    `Real Runtime Touched: ${report.realRuntimeTouched}`,
    `SHA-256: ${report.contentSha256}`,
    "",
    "## Passed Checks",
    ...report.passedChecks.map((check) => `- ${check}`),
    "",
    "## Failed Checks",
    ...(report.failedChecks.length === 0
      ? ["- none"]
      : report.failedChecks.map((issue) => `- ${issue.check}: ${issue.code} - ${issue.message}`)),
    "",
  ].join("\n");
}

function addPatternAbsenceCheck(
  source: string,
  patterns: readonly RegExp[],
  check: HummingbotStrategyValidationCheck,
  code: string,
  message: string,
  passedChecks: Set<HummingbotStrategyValidationCheck>,
  failedChecks: HummingbotStrategyValidationIssue[],
): void {
  addCheck(!patterns.some((pattern) => pattern.test(source)), check, code, message, passedChecks, failedChecks);
}

function addCheck(
  passed: boolean,
  check: HummingbotStrategyValidationCheck,
  code: string,
  message: string,
  passedChecks: Set<HummingbotStrategyValidationCheck>,
  failedChecks: HummingbotStrategyValidationIssue[],
): void {
  if (passed) {
    passedChecks.add(check);
    return;
  }

  failedChecks.push({ check, code, message });
}
