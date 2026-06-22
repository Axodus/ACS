import {
  createACSIntentRequest,
  createTrinityIntentCapture,
  type ACSIntentRequest,
  type TrinityIntentCapture,
  type TrinityIntentSource,
} from "./trinity-intake-boundary.js";

export type AcsTradingIntentClassification =
  | "research_only"
  | "artifact_request"
  | "strategy_diff_proposal"
  | "strategy_sandbox_write"
  | "strategy_disable_request"
  | "strategy_remove_request"
  | "backtest_design"
  | "backtest_dry_run"
  | "paper_trading_request"
  | "live_trading_request"
  | "secret_access_request"
  | "treasury_request";

export type AcsTradingIntentDecision =
  | "allow_report_only"
  | "route_to_acs_artifact_flow"
  | "allow_after_gate"
  | "pending_approval"
  | "high_risk_pending_approval"
  | "future_caution"
  | "no_go";

export type AcsTradingIntentReasonCode =
  | "trinity_must_route_to_acs"
  | "report_only_allowed"
  | "artifact_flow_required"
  | "strategy_diff_gate_required"
  | "strategy_sandbox_write_pending_approval"
  | "strategy_disable_pending_approval"
  | "strategy_remove_high_risk_pending_approval"
  | "backtest_design_report_only"
  | "backtest_dry_run_future_caution"
  | "paper_trading_no_go_current_phase"
  | "live_trading_no_go"
  | "secret_access_no_go"
  | "treasury_no_go"
  | "hummingbot_runtime_no_go"
  | "api_keys_out_of_context"
  | "no_strategy_mutation_this_sprint";

export interface TradingIntentClassifierInput {
  readonly requestId: string;
  readonly source: TrinityIntentSource;
  readonly requesterRef: string;
  readonly message: string;
  readonly rawUserPromptRef: string;
}

export interface AcsTradingIntentClassificationResult {
  readonly requestId: string;
  readonly source: TrinityIntentSource;
  readonly requesterRef: string;
  readonly classification: AcsTradingIntentClassification;
  readonly decision: AcsTradingIntentDecision;
  readonly responseMode: "report_only" | "acs_routed" | "no_go";
  readonly reasonCodes: readonly AcsTradingIntentReasonCode[];
  readonly dangerous: boolean;
  readonly trinityMayDecideAlone: false;
  readonly directSideEffectsAllowed: false;
  readonly acsIntentRequest: ACSIntentRequest;
  readonly trinityIntentCapture: TrinityIntentCapture;
  readonly warnings: readonly string[];
}

export function classifyTradingIntent(input: TradingIntentClassifierInput): AcsTradingIntentClassificationResult {
  const classification = inferTradingIntentClassification(input.message);
  const matrixEntry = getTradingIntentDecisionMatrix().find((entry) => entry.classification === classification);
  if (!matrixEntry) {
    throw new Error(`missing trading intent matrix entry: ${classification}`);
  }

  const capture = createTrinityIntentCapture({
    requestId: input.requestId,
    source: input.source,
    requesterRef: input.requesterRef,
    intentType: toTrinityIntentType(classification),
    requestedAction: input.message,
    rawUserPromptRef: input.rawUserPromptRef,
    requiresArtifact: classification === "artifact_request",
    requiresStrategyMutation: isStrategyMutationIntent(classification),
    requiresExecution: isExecutionIntent(classification),
    requiresNetwork: isExecutionIntent(classification),
    requiresSecrets: classification === "secret_access_request",
  });

  const acsIntentRequest = createACSIntentRequest(capture);

  return {
    requestId: input.requestId,
    source: input.source,
    requesterRef: input.requesterRef,
    classification,
    decision: matrixEntry.decision,
    responseMode: matrixEntry.responseMode,
    reasonCodes: matrixEntry.reasonCodes,
    dangerous: matrixEntry.dangerous,
    trinityMayDecideAlone: false,
    directSideEffectsAllowed: false,
    acsIntentRequest,
    trinityIntentCapture: capture,
    warnings: [
      "Trading requests received through Trinity must be routed through ACS.",
      "No Hummingbot runtime, strategy mutation, trading execution, treasury operation, API key access, or provider action is enabled by this classifier.",
    ],
  };
}

export function getTradingIntentDecisionMatrix() {
  return [
    {
      classification: "research_only",
      decision: "allow_report_only",
      responseMode: "report_only",
      dangerous: false,
      reasonCodes: ["report_only_allowed", "trinity_must_route_to_acs"],
    },
    {
      classification: "artifact_request",
      decision: "route_to_acs_artifact_flow",
      responseMode: "acs_routed",
      dangerous: false,
      reasonCodes: ["artifact_flow_required", "trinity_must_route_to_acs", "no_strategy_mutation_this_sprint"],
    },
    {
      classification: "strategy_diff_proposal",
      decision: "allow_after_gate",
      responseMode: "acs_routed",
      dangerous: false,
      reasonCodes: ["strategy_diff_gate_required", "trinity_must_route_to_acs", "no_strategy_mutation_this_sprint"],
    },
    {
      classification: "strategy_sandbox_write",
      decision: "pending_approval",
      responseMode: "acs_routed",
      dangerous: true,
      reasonCodes: ["strategy_sandbox_write_pending_approval", "hummingbot_runtime_no_go", "no_strategy_mutation_this_sprint"],
    },
    {
      classification: "strategy_disable_request",
      decision: "pending_approval",
      responseMode: "acs_routed",
      dangerous: true,
      reasonCodes: ["strategy_disable_pending_approval", "hummingbot_runtime_no_go", "no_strategy_mutation_this_sprint"],
    },
    {
      classification: "strategy_remove_request",
      decision: "high_risk_pending_approval",
      responseMode: "acs_routed",
      dangerous: true,
      reasonCodes: ["strategy_remove_high_risk_pending_approval", "hummingbot_runtime_no_go", "no_strategy_mutation_this_sprint"],
    },
    {
      classification: "backtest_design",
      decision: "allow_report_only",
      responseMode: "report_only",
      dangerous: false,
      reasonCodes: ["backtest_design_report_only", "trinity_must_route_to_acs"],
    },
    {
      classification: "backtest_dry_run",
      decision: "future_caution",
      responseMode: "acs_routed",
      dangerous: true,
      reasonCodes: ["backtest_dry_run_future_caution", "hummingbot_runtime_no_go", "trinity_must_route_to_acs"],
    },
    {
      classification: "paper_trading_request",
      decision: "no_go",
      responseMode: "no_go",
      dangerous: true,
      reasonCodes: ["paper_trading_no_go_current_phase", "hummingbot_runtime_no_go"],
    },
    {
      classification: "live_trading_request",
      decision: "no_go",
      responseMode: "no_go",
      dangerous: true,
      reasonCodes: ["live_trading_no_go", "hummingbot_runtime_no_go"],
    },
    {
      classification: "secret_access_request",
      decision: "no_go",
      responseMode: "no_go",
      dangerous: true,
      reasonCodes: ["secret_access_no_go", "api_keys_out_of_context"],
    },
    {
      classification: "treasury_request",
      decision: "no_go",
      responseMode: "no_go",
      dangerous: true,
      reasonCodes: ["treasury_no_go"],
    },
  ] as const satisfies readonly {
    readonly classification: AcsTradingIntentClassification;
    readonly decision: AcsTradingIntentDecision;
    readonly responseMode: "report_only" | "acs_routed" | "no_go";
    readonly dangerous: boolean;
    readonly reasonCodes: readonly AcsTradingIntentReasonCode[];
  }[];
}

export function inferTradingIntentClassification(message: string): AcsTradingIntentClassification {
  const text = message.toLowerCase();

  if (matchesAny(text, ["treasury", "withdraw", "withdrawal", "saque", "transfer funds", "move funds"])) {
    return "treasury_request";
  }

  if (matchesAny(text, ["api key", "api secret", "secret", "credential", "token", "private key"])) {
    return "secret_access_request";
  }

  if (matchesAny(text, ["live trade", "live trading", "real trade", "execute trade", "place order", "ordem real", "trade real"])) {
    return "live_trading_request";
  }

  if (matchesAny(text, ["paper trade", "paper trading", "start paper", "run paper"])) {
    return "paper_trading_request";
  }

  if (matchesAny(text, ["dry run", "run backtest", "execute backtest", "rodar backtest"])) {
    return "backtest_dry_run";
  }

  if (matchesAny(text, ["backtest design", "design backtest", "plano de backtest", "desenhar backtest"])) {
    return "backtest_design";
  }

  if (matchesAny(text, ["remove strategy", "delete strategy", "remover estratégia", "deletar estratégia"])) {
    return "strategy_remove_request";
  }

  if (matchesAny(text, ["disable strategy", "deactivate strategy", "desativar estratégia", "parar estratégia"])) {
    return "strategy_disable_request";
  }

  if (matchesAny(text, ["sandbox write", "write strategy", "save strategy", "criar arquivo", "editar arquivo"])) {
    return "strategy_sandbox_write";
  }

  if (matchesAny(text, ["diff", "proposal", "propose change", "patch", "propor estratégia", "proposta de estratégia"])) {
    return "strategy_diff_proposal";
  }

  if (matchesAny(text, ["artifact", "document", "write report", "gerar documento", "criar relatório"])) {
    return "artifact_request";
  }

  if (matchesAny(text, ["strategy", "hummingbot", "indicator", "indicador", "rsi", "macd", "risk review", "research", "study", "estudo"])) {
    return "research_only";
  }

  return "research_only";
}

function matchesAny(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function isStrategyMutationIntent(classification: AcsTradingIntentClassification): boolean {
  return classification === "strategy_sandbox_write"
    || classification === "strategy_disable_request"
    || classification === "strategy_remove_request";
}

function isExecutionIntent(classification: AcsTradingIntentClassification): boolean {
  return classification === "backtest_dry_run"
    || classification === "paper_trading_request"
    || classification === "live_trading_request";
}

function toTrinityIntentType(classification: AcsTradingIntentClassification): TrinityIntentCapture["intentType"] {
  switch (classification) {
    case "artifact_request":
      return "indicator_study";
    case "strategy_diff_proposal":
    case "strategy_sandbox_write":
      return "hummingbot_strategy_create";
    case "strategy_disable_request":
    case "strategy_remove_request":
      return "hummingbot_strategy_remove";
    case "backtest_design":
    case "backtest_dry_run":
      return "backtest_design";
    case "secret_access_request":
    case "treasury_request":
    case "paper_trading_request":
    case "live_trading_request":
      return "risk_review";
    case "research_only":
      return "research_request";
  }
}
