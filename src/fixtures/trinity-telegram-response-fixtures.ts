import type { ACSDecision } from "../trinity-acs-roundtrip-protocol.js";
import type { TrinityTelegramResponseContext } from "../trinity-telegram-response-contract.js";

const blockedActions = [
  "write_file",
  "mutate_runtime",
  "call_hummingbot",
  "run_backtest",
  "access_api_keys",
  "paper_trade",
  "live_trade",
] as const;

export function createTrinityTelegramResponseFixtures(): readonly TrinityTelegramResponseContext[] {
  return [
    { decision: decision("research-001", "allow_report_only", ["report_only"]) },
    { decision: decision("artifact-001", "route_to_artifact_flow", ["acs_artifact_flow"], "route_to_acs_artifact_flow") },
    {
      decision: decision("diff-001", "allow_diff_only", ["diff_only"], "produce_diff_proposal_without_writing_files"),
      outputRef: ".acs-output/hummingbot-diff-proposals/hb-diff-001/proposal.diff.md",
      evidenceRef: ".acs-output/hummingbot-diff-proposals/hb-diff-001/sidecar.json",
      proofRef: ".acs-output/hummingbot-diff-proposals/hb-diff-001/proof-report.md",
    },
    { decision: decision("sandbox-001", "pending_approval", ["approval_required"], "request_governance_or_operator_approval", true) },
    {
      decision: decision("created-001", "pending_approval", ["acs_sandbox_only"], "validation_gate_required_before_any_future_promotion", true),
      outputRef: ".instructions/acs/trading/hummingbot-sandbox/strategies/acs_rsi_sandbox_pilot.py",
      evidenceRef: ".instructions/acs/trading/hummingbot-sandbox/proofs/acs-rsi-sandbox-pilot-evidence-index.json",
      proofRef: ".instructions/acs/trading/hummingbot-sandbox/proofs/acs-rsi-sandbox-pilot-proof.md",
      rollbackRef: ".instructions/acs/trading/hummingbot-sandbox/rollback/acs-rsi-sandbox-pilot-rollback.json",
    },
    { decision: decision("blocked-001", "blocked_by_policy", [], "request_denied_by_current_acs_policy") },
    { decision: decision("review-001", "requires_human_review", ["human_review_only"], "human_review_required_before_any_ticket", true) },
    { decision: decision("deny-001", "deny", [], "do_not_execute_return_blocked_response") },
  ];
}

function decision(
  requestId: string,
  code: ACSDecision["decision"],
  allowedModes: readonly string[],
  requiredNextStep?: string,
  executionTicketRequired = false,
): ACSDecision {
  const base = {
    requestId,
    decision: code,
    agentId: "trinity",
    nucleus: "trading",
    allowedModes,
    blockedActions,
    reasonCodes: ["audit_required", "evidence_required"],
    executionTicketRequired,
    auditRequired: true,
    evidenceRequired: true,
  } satisfies Omit<ACSDecision, "requiredNextStep">;

  return requiredNextStep ? { ...base, requiredNextStep } : base;
}
