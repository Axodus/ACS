export type TrinityIntentSource = "telegram_dm" | "telegram_group" | "cli" | "acs_console";
export type TrinityAgentId = "trinity";
export type TrinityNucleus = "trading";

export type TrinityIntentType =
  | "research_request"
  | "strategy_review"
  | "indicator_study"
  | "hummingbot_strategy_create"
  | "hummingbot_strategy_edit"
  | "hummingbot_strategy_remove"
  | "backtest_design"
  | "risk_review";

export type TrinityResponseMode = "report_only" | "acs_routed" | "no_go";

export type TrinitySideEffectBlockReason =
  | "telegram_direct_file_write_no_go"
  | "telegram_direct_runtime_mutation_no_go"
  | "telegram_direct_heartbeat_update_no_go"
  | "telegram_direct_hummingbot_mutation_no_go"
  | "telegram_direct_backtest_no_go"
  | "telegram_direct_mcp_no_go"
  | "telegram_direct_shell_no_go"
  | "telegram_direct_network_no_go"
  | "telegram_direct_provider_or_exchange_no_go"
  | "telegram_direct_secret_access_no_go"
  | "acs_policy_required";

export interface TrinityIntentCapture {
  readonly requestId: string;
  readonly source: TrinityIntentSource;
  readonly requesterRef: string;
  readonly agentId: TrinityAgentId;
  readonly nucleus: TrinityNucleus;
  readonly intentType: TrinityIntentType;
  readonly requestedAction: string;
  readonly rawUserPromptRef: string;
  readonly requiresArtifact: boolean;
  readonly requiresStrategyMutation: boolean;
  readonly requiresExecution: boolean;
  readonly requiresNetwork: boolean;
  readonly requiresSecrets: boolean;
}

export interface ACSIntentRequest {
  readonly requestId: string;
  readonly capturedAt: string;
  readonly intakeAgentId: TrinityAgentId;
  readonly source: TrinityIntentSource;
  readonly requesterRef: string;
  readonly nucleus: TrinityNucleus;
  readonly intentType: TrinityIntentType;
  readonly requestedAction: string;
  readonly rawUserPromptRef: string;
  readonly responseMode: TrinityResponseMode;
  readonly directSideEffectsAllowed: false;
  readonly requiredAcsGates: readonly string[];
  readonly blockReasons: readonly TrinitySideEffectBlockReason[];
  readonly hardConstraints: readonly string[];
}

export interface TrinityIntentDecision {
  readonly allowedResponseMode: TrinityResponseMode;
  readonly directSideEffectsAllowed: false;
  readonly acsRoutingRequired: boolean;
  readonly blockReasons: readonly TrinitySideEffectBlockReason[];
  readonly warnings: readonly string[];
}

export const TRINITY_TELEGRAM_HARD_CONSTRAINTS: readonly string[] = [
  "do_not_execute_pilot",
  "do_not_create_strategy",
  "do_not_edit_strategy",
  "do_not_remove_strategy",
  "do_not_write_main_workspace",
  "do_not_update_HEARTBEAT",
  "do_not_call_MCP",
  "do_not_call_shell",
  "do_not_access_network",
  "do_not_touch_real_hummingbot",
  "do_not_touch_api_keys",
  "do_not_touch_exchange_or_provider",
];

const MUTATION_INTENTS: readonly TrinityIntentType[] = [
  "hummingbot_strategy_create",
  "hummingbot_strategy_edit",
  "hummingbot_strategy_remove",
];

export function createTrinityIntentCapture(input: Omit<TrinityIntentCapture, "agentId" | "nucleus">): TrinityIntentCapture {
  return {
    ...input,
    agentId: "trinity",
    nucleus: "trading",
  };
}

export function createACSIntentRequest(capture: TrinityIntentCapture, capturedAt = new Date().toISOString()): ACSIntentRequest {
  const decision = evaluateTrinityIntentBoundary(capture);

  return {
    requestId: capture.requestId,
    capturedAt,
    intakeAgentId: capture.agentId,
    source: capture.source,
    requesterRef: capture.requesterRef,
    nucleus: capture.nucleus,
    intentType: capture.intentType,
    requestedAction: capture.requestedAction,
    rawUserPromptRef: capture.rawUserPromptRef,
    responseMode: decision.allowedResponseMode,
    directSideEffectsAllowed: false,
    requiredAcsGates: inferRequiredAcsGates(capture),
    blockReasons: decision.blockReasons,
    hardConstraints: TRINITY_TELEGRAM_HARD_CONSTRAINTS,
  };
}

export function evaluateTrinityIntentBoundary(capture: TrinityIntentCapture): TrinityIntentDecision {
  const telegram = capture.source === "telegram_dm" || capture.source === "telegram_group";
  const blockReasons = new Set<TrinitySideEffectBlockReason>();

  if (telegram) {
    blockReasons.add("acs_policy_required");
  }

  if (telegram && capture.requiresArtifact) {
    blockReasons.add("telegram_direct_file_write_no_go");
  }

  if (telegram && capture.requiresStrategyMutation) {
    blockReasons.add("telegram_direct_hummingbot_mutation_no_go");
    blockReasons.add("telegram_direct_runtime_mutation_no_go");
  }

  if (telegram && capture.requiresExecution) {
    blockReasons.add("telegram_direct_backtest_no_go");
    blockReasons.add("telegram_direct_shell_no_go");
  }

  if (telegram && capture.requiresNetwork) {
    blockReasons.add("telegram_direct_network_no_go");
    blockReasons.add("telegram_direct_provider_or_exchange_no_go");
    blockReasons.add("telegram_direct_mcp_no_go");
  }

  if (telegram && capture.requiresSecrets) {
    blockReasons.add("telegram_direct_secret_access_no_go");
  }

  if (telegram && MUTATION_INTENTS.includes(capture.intentType)) {
    blockReasons.add("telegram_direct_hummingbot_mutation_no_go");
  }

  const requiresAcsRouting = telegram || blockReasons.size > 0;
  const responseMode: TrinityResponseMode = requiresAcsRouting
    ? "acs_routed"
    : "report_only";

  return {
    allowedResponseMode: responseMode,
    directSideEffectsAllowed: false,
    acsRoutingRequired: requiresAcsRouting,
    blockReasons: [...blockReasons],
    warnings: [
      "Trinity intake may classify and respond, but direct side effects are blocked.",
      "Telegram-originated technical mutation must route through ACS policy gates.",
    ],
  };
}

export function getTelegramAllowedResponseMatrix() {
  return [
    {
      requestClass: "research_request",
      allowedResponseMode: "report_only",
      directSideEffectsAllowed: false,
      notes: "Trinity may summarize research and recommend ACS-routed next steps.",
    },
    {
      requestClass: "strategy_review",
      allowedResponseMode: "report_only",
      directSideEffectsAllowed: false,
      notes: "Review only; no strategy file writes or runtime updates.",
    },
    {
      requestClass: "indicator_study",
      allowedResponseMode: "report_only",
      directSideEffectsAllowed: false,
      notes: "Study/report only unless ACS authorizes artifact generation.",
    },
    {
      requestClass: "hummingbot_strategy_create",
      allowedResponseMode: "acs_routed",
      directSideEffectsAllowed: false,
      notes: "Requires ACS gates before diff-only, sandbox write, tests, or operational integration.",
    },
    {
      requestClass: "hummingbot_strategy_edit",
      allowedResponseMode: "acs_routed",
      directSideEffectsAllowed: false,
      notes: "Requires ACS gates before any controlled mutation.",
    },
    {
      requestClass: "hummingbot_strategy_remove",
      allowedResponseMode: "acs_routed",
      directSideEffectsAllowed: false,
      notes: "Requires ACS gates before any controlled deletion/removal.",
    },
    {
      requestClass: "backtest_design",
      allowedResponseMode: "acs_routed",
      directSideEffectsAllowed: false,
      notes: "Design/report allowed; running backtests directly from Telegram is blocked.",
    },
    {
      requestClass: "risk_review",
      allowedResponseMode: "report_only",
      directSideEffectsAllowed: false,
      notes: "Risk review only; no provider, exchange, network, or treasury actions.",
    },
  ] as const;
}

function inferRequiredAcsGates(capture: TrinityIntentCapture): readonly string[] {
  const gates = new Set<string>([
    "intent_classification",
    "policy_matrix_check",
    "risk_scope_check",
    "audit_receipt_required",
  ]);

  if (capture.requiresStrategyMutation || MUTATION_INTENTS.includes(capture.intentType)) {
    gates.add("hummingbot_diff_only_review");
    gates.add("sandbox_write_approval");
    gates.add("controlled_tests_required");
  }

  if (capture.requiresExecution) {
    gates.add("execution_policy_check");
    gates.add("manual_approval_required");
  }

  if (capture.requiresNetwork) {
    gates.add("network_access_review");
  }

  if (capture.requiresSecrets) {
    gates.add("secret_storage_policy_check");
  }

  return [...gates];
}
