import type { HummingbotDiffProposalInput } from "../trinity-hummingbot-diff-only-flow.js";

export function createHummingbotDiffProposalFixture(): HummingbotDiffProposalInput {
  return {
    proposalId: "hb-diff-001",
    requestId: "tg-diff-001",
    requesterRef: "telegram:user:diff",
    tenantId: "tenant-axodus-trading",
    sourceStrategyPath: "/mnt/d/Rede/Github/Axodus/tradingbot/scripts/community/simple_rsi_no_config.py",
    targetStrategyPath: "/mnt/d/Rede/Github/Axodus/tradingbot/scripts/community/simple_rsi_no_config.py",
    intentSummary: "Propose a no-write RSI threshold adjustment for review.",
    proposedDiff: [
      "--- a/scripts/community/simple_rsi_no_config.py",
      "+++ b/scripts/community/simple_rsi_no_config.py",
      "@@",
      "- RSI_OVERBOUGHT = 70",
      "+ RSI_OVERBOUGHT = 72",
      "- RSI_OVERSOLD = 30",
      "+ RSI_OVERSOLD = 28",
    ].join("\n"),
    rationale: [
      "Slightly reduces signal frequency in noisy market conditions.",
      "Keeps the change small enough for manual review.",
    ],
    riskAssessment: [
      "Diff-only artifact may still encode unsafe strategy assumptions.",
      "No runtime, backtest or exchange behavior is authorized by this proposal.",
    ],
    rollbackNotes: [
      "Reject the proposal to keep the current file unchanged.",
      "If later applied in a sandbox, revert the two threshold lines to prior values.",
    ],
    acsDecision: {
      requestId: "tg-diff-001",
      decision: "allow_diff_only",
      agentId: "trinity",
      nucleus: "trading",
      allowedModes: ["diff_only"],
      blockedActions: [
        "write_file",
        "mutate_runtime",
        "call_hummingbot",
        "run_backtest",
        "access_api_keys",
      ],
      reasonCodes: ["diff_only_allowed", "audit_required", "evidence_required"],
      requiredNextStep: "produce_diff_proposal_without_writing_files",
      executionTicketRequired: false,
      auditRequired: true,
      evidenceRequired: true,
    },
    createdAt: "2026-05-27T12:00:00.000Z",
  };
}
