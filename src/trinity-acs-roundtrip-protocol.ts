import {
  classifyTradingIntent,
  type AcsTradingIntentClassificationResult,
  type TradingIntentClassifierInput,
} from "./trading-intent-classifier.js";
import type { TrinityIntentSource } from "./trinity-intake-boundary.js";

export type ACSDecisionCode =
  | "allow_report_only"
  | "route_to_artifact_flow"
  | "allow_diff_only"
  | "pending_approval"
  | "deny"
  | "blocked_by_policy"
  | "blocked_by_freeze"
  | "requires_human_review";

export type TrinityUserResponseType = "decision" | "plan" | "block";

export type ACSRoundtripReasonCode =
  | "acs_default_deny"
  | "acs_missing_decision"
  | "acs_required_field_missing"
  | "telegram_execution_channel_blocked"
  | "execution_ticket_required"
  | "execution_ticket_missing"
  | "policy_denied"
  | "freeze_active"
  | "human_review_required"
  | "report_only_allowed"
  | "artifact_flow_required"
  | "diff_only_allowed"
  | "approval_required"
  | "audit_required"
  | "evidence_required";

export interface ACSDecision {
  readonly requestId: string;
  readonly decision: ACSDecisionCode;
  readonly agentId: "trinity";
  readonly nucleus: "trading";
  readonly allowedModes: readonly string[];
  readonly blockedActions: readonly string[];
  readonly reasonCodes: readonly string[];
  readonly requiredNextStep?: string;
  readonly executionTicketRequired: boolean;
  readonly auditRequired: boolean;
  readonly evidenceRequired: boolean;
}

export interface ACSExecutionTicket {
  readonly ticketId: string;
  readonly requestId: string;
  readonly issuedBy: "acs";
  readonly valid: boolean;
  readonly approvedMode: string;
  readonly expiresAt: string;
}

export interface TrinityUserResponse {
  readonly requestId: string;
  readonly agentId: "trinity";
  readonly nucleus: "trading";
  readonly channel: TrinityIntentSource;
  readonly requesterRef: string;
  readonly responseType: TrinityUserResponseType;
  readonly decision: ACSDecisionCode;
  readonly message: string;
  readonly allowedModes: readonly string[];
  readonly blockedActions: readonly string[];
  readonly reasonCodes: readonly string[];
  readonly requiredNextStep?: string;
  readonly executionTicketRequired: boolean;
  readonly executionTicketPresent: boolean;
  readonly canExecute: false;
}

export interface TrinityAcsRoundtripResult {
  readonly classification: AcsTradingIntentClassificationResult;
  readonly acsDecision: ACSDecision;
  readonly trinityUserResponse: TrinityUserResponse;
}

export const ACS_ROUNDTRIP_BLOCKED_ACTIONS: readonly string[] = [
  "write_file",
  "update_heartbeat",
  "mutate_runtime",
  "call_hummingbot",
  "create_strategy",
  "edit_strategy",
  "remove_strategy",
  "run_backtest",
  "call_mcp",
  "call_shell",
  "access_network",
  "touch_provider_or_exchange",
  "access_api_keys",
  "place_order",
  "trade_live",
  "treasury_operation",
];

export function runTrinityAcsRoundtrip(input: TradingIntentClassifierInput): TrinityAcsRoundtripResult {
  const classification = classifyTradingIntent(input);
  const acsDecision = createACSDecisionFromTradingIntent(classification);
  const trinityUserResponse = createTrinityUserResponse({
    request: input,
    decision: acsDecision,
  });

  return {
    classification,
    acsDecision,
    trinityUserResponse,
  };
}

export function createACSDecisionFromTradingIntent(result: AcsTradingIntentClassificationResult): ACSDecision {
  switch (result.classification) {
    case "research_only":
    case "backtest_design":
      return createACSDecision({
        requestId: result.requestId,
        decision: "allow_report_only",
        allowedModes: ["report_only"],
        blockedActions: ACS_ROUNDTRIP_BLOCKED_ACTIONS,
        reasonCodes: [...result.reasonCodes, "report_only_allowed", "audit_required", "evidence_required"],
        executionTicketRequired: false,
        auditRequired: true,
        evidenceRequired: true,
      });

    case "artifact_request":
      return createACSDecision({
        requestId: result.requestId,
        decision: "route_to_artifact_flow",
        allowedModes: ["acs_artifact_flow"],
        blockedActions: ACS_ROUNDTRIP_BLOCKED_ACTIONS,
        reasonCodes: [...result.reasonCodes, "artifact_flow_required", "audit_required", "evidence_required"],
        requiredNextStep: "route_to_acs_artifact_flow",
        executionTicketRequired: false,
        auditRequired: true,
        evidenceRequired: true,
      });

    case "strategy_diff_proposal":
      return createACSDecision({
        requestId: result.requestId,
        decision: "allow_diff_only",
        allowedModes: ["diff_only"],
        blockedActions: ACS_ROUNDTRIP_BLOCKED_ACTIONS,
        reasonCodes: [...result.reasonCodes, "diff_only_allowed", "audit_required", "evidence_required"],
        requiredNextStep: "produce_diff_proposal_without_writing_files",
        executionTicketRequired: false,
        auditRequired: true,
        evidenceRequired: true,
      });

    case "strategy_sandbox_write":
    case "strategy_disable_request":
      return createACSDecision({
        requestId: result.requestId,
        decision: "pending_approval",
        allowedModes: ["approval_required"],
        blockedActions: ACS_ROUNDTRIP_BLOCKED_ACTIONS,
        reasonCodes: [...result.reasonCodes, "approval_required", "execution_ticket_required", "audit_required", "evidence_required"],
        requiredNextStep: "request_governance_or_operator_approval",
        executionTicketRequired: true,
        auditRequired: true,
        evidenceRequired: true,
      });

    case "strategy_remove_request":
    case "backtest_dry_run":
      return createACSDecision({
        requestId: result.requestId,
        decision: "requires_human_review",
        allowedModes: ["human_review_only"],
        blockedActions: ACS_ROUNDTRIP_BLOCKED_ACTIONS,
        reasonCodes: [...result.reasonCodes, "human_review_required", "execution_ticket_required", "audit_required", "evidence_required"],
        requiredNextStep: "human_review_required_before_any_ticket",
        executionTicketRequired: true,
        auditRequired: true,
        evidenceRequired: true,
      });

    case "paper_trading_request":
    case "live_trading_request":
    case "secret_access_request":
    case "treasury_request":
      return createACSDecision({
        requestId: result.requestId,
        decision: "blocked_by_policy",
        allowedModes: [],
        blockedActions: ACS_ROUNDTRIP_BLOCKED_ACTIONS,
        reasonCodes: [...result.reasonCodes, "policy_denied", "telegram_execution_channel_blocked", "audit_required", "evidence_required"],
        requiredNextStep: "request_denied_by_current_acs_policy",
        executionTicketRequired: false,
        auditRequired: true,
        evidenceRequired: true,
      });
  }
}

export function validateACSDecision(decision: Partial<ACSDecision> | undefined, requestId = "unknown"): ACSDecision {
  if (!decision) {
    return createDefaultDenyACSDecision(requestId, ["acs_default_deny", "acs_missing_decision"]);
  }

  const requiredFields: readonly (keyof ACSDecision)[] = [
    "requestId",
    "decision",
    "agentId",
    "nucleus",
    "allowedModes",
    "blockedActions",
    "reasonCodes",
    "executionTicketRequired",
    "auditRequired",
    "evidenceRequired",
  ];

  const missingRequiredField = requiredFields.some((field) => decision[field] === undefined || decision[field] === null);
  const invalidAgent = decision.agentId !== "trinity";
  const invalidNucleus = decision.nucleus !== "trading";

  if (missingRequiredField || invalidAgent || invalidNucleus) {
    return createDefaultDenyACSDecision(decision.requestId ?? requestId, [
      "acs_default_deny",
      "acs_required_field_missing",
    ]);
  }

  return decision as ACSDecision;
}

export function createDefaultDenyACSDecision(
  requestId = "unknown",
  reasonCodes: readonly string[] = ["acs_default_deny"],
): ACSDecision {
  return createACSDecision({
    requestId,
    decision: "deny",
    allowedModes: [],
    blockedActions: ACS_ROUNDTRIP_BLOCKED_ACTIONS,
    reasonCodes,
    requiredNextStep: "do_not_execute_return_blocked_response",
    executionTicketRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  });
}

export function createTrinityUserResponse(input: {
  readonly request: TradingIntentClassifierInput;
  readonly decision?: Partial<ACSDecision>;
  readonly executionTicket?: ACSExecutionTicket;
}): TrinityUserResponse {
  const decision = validateACSDecision(input.decision, input.request.requestId);
  const executionTicketPresent = input.executionTicket?.valid === true && input.executionTicket.requestId === decision.requestId;
  const reasonCodes = new Set(decision.reasonCodes);

  if (decision.executionTicketRequired && !executionTicketPresent) {
    reasonCodes.add("execution_ticket_missing");
  }

  const responseInput = {
    requestId: decision.requestId,
    channel: input.request.source,
    requesterRef: input.request.requesterRef,
    responseType: inferTrinityUserResponseType(decision),
    decision: decision.decision,
    message: createTrinityUserResponseMessage(decision, executionTicketPresent),
    allowedModes: decision.allowedModes,
    blockedActions: decision.blockedActions,
    reasonCodes: [...reasonCodes],
    executionTicketRequired: decision.executionTicketRequired,
    executionTicketPresent,
    canExecute: false,
  } satisfies Omit<TrinityUserResponse, "agentId" | "nucleus" | "requiredNextStep">;

  return createTrinityResponse(decision.requiredNextStep
    ? { ...responseInput, requiredNextStep: decision.requiredNextStep }
    : responseInput);
}

export function getACSDecisionReasonCodeTable() {
  return [
    { code: "acs_default_deny", meaning: "ACS failed, did not respond, or could not validate the decision object." },
    { code: "acs_missing_decision", meaning: "No ACSDecision was available. Absence of response is not permission." },
    { code: "acs_required_field_missing", meaning: "ACSDecision is incomplete or invalid." },
    { code: "telegram_execution_channel_blocked", meaning: "Telegram cannot become a direct execution channel." },
    { code: "execution_ticket_required", meaning: "The requested mode would require an ACS-issued execution ticket." },
    { code: "execution_ticket_missing", meaning: "No valid execution ticket was present for the request." },
    { code: "policy_denied", meaning: "The current ACS policy blocks this request." },
    { code: "freeze_active", meaning: "A freeze/emergency condition blocks the request." },
    { code: "human_review_required", meaning: "Human review is required before any further gate can be evaluated." },
    { code: "report_only_allowed", meaning: "Trinity may return a report-only response." },
    { code: "artifact_flow_required", meaning: "Artifact creation must route through the ACS artifact flow." },
    { code: "diff_only_allowed", meaning: "Only a no-write diff proposal is allowed." },
    { code: "approval_required", meaning: "Operator, governance, or tenant approval is required." },
    { code: "audit_required", meaning: "ACS audit trail is required." },
    { code: "evidence_required", meaning: "Evidence/proof metadata is required." },
  ] as const satisfies readonly { readonly code: ACSRoundtripReasonCode; readonly meaning: string }[];
}

function createACSDecision(input: Omit<ACSDecision, "agentId" | "nucleus">): ACSDecision {
  return {
    ...input,
    agentId: "trinity",
    nucleus: "trading",
  };
}

function createTrinityResponse(input: Omit<TrinityUserResponse, "agentId" | "nucleus">): TrinityUserResponse {
  return {
    ...input,
    agentId: "trinity",
    nucleus: "trading",
  };
}

function inferTrinityUserResponseType(decision: ACSDecision): TrinityUserResponseType {
  if (decision.decision === "deny" || decision.decision === "blocked_by_policy" || decision.decision === "blocked_by_freeze") {
    return "block";
  }

  if (decision.decision === "allow_report_only") {
    return "decision";
  }

  return "plan";
}

function createTrinityUserResponseMessage(decision: ACSDecision, executionTicketPresent: boolean): string {
  if (decision.decision === "allow_report_only") {
    return "ACS allows a report-only response. No execution, file write, runtime mutation, Hummingbot action, secret access, or trading action is authorized.";
  }

  if (decision.decision === "route_to_artifact_flow") {
    return "ACS requires this request to route through the artifact flow. Trinity may describe the next step but must not write files directly from Telegram.";
  }

  if (decision.decision === "allow_diff_only") {
    return "ACS allows diff-only planning. Trinity may prepare a proposal, but no file write or runtime mutation is authorized.";
  }

  if (decision.decision === "pending_approval") {
    return executionTicketPresent
      ? "ACS approval ticket is present, but this sprint does not enable real execution."
      : "ACS requires approval and a valid execution ticket before Trinity can act.";
  }

  if (decision.decision === "requires_human_review") {
    return "ACS requires human review before any execution ticket can be considered.";
  }

  if (decision.decision === "blocked_by_freeze") {
    return "ACS blocks this request because a freeze or emergency condition is active.";
  }

  if (decision.decision === "blocked_by_policy") {
    return "ACS blocks this request by policy. Telegram cannot be used for direct execution, secret access, treasury operations, or trading.";
  }

  return "ACS denies this request by default. Absence of a valid ACS decision is not permission.";
}
