import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ACSDecision } from "./trinity-acs-roundtrip-protocol.js";

export type HummingbotDiffProposalStatus = "created" | "blocked";
export type HummingbotDiffProposalRisk = "low" | "medium" | "high";

export type HummingbotDiffOnlyDeniedAction =
  | "apply_patch"
  | "edit_real_file"
  | "remove_strategy"
  | "run_hummingbot"
  | "run_backtest"
  | "access_connector"
  | "access_api_keys"
  | "call_shell"
  | "access_network"
  | "call_mcp"
  | "paper_trade"
  | "live_trade";

export interface HummingbotDiffProposalInput {
  readonly proposalId: string;
  readonly requestId: string;
  readonly requesterRef: string;
  readonly tenantId?: string;
  readonly sourceStrategyPath: string;
  readonly targetStrategyPath: string;
  readonly intentSummary: string;
  readonly proposedDiff: string;
  readonly rationale: readonly string[];
  readonly riskAssessment: readonly string[];
  readonly rollbackNotes: readonly string[];
  readonly acsDecision: ACSDecision;
  readonly createdAt?: string;
}

export interface HummingbotDiffProposalSidecar {
  readonly schemaVersion: 1;
  readonly proposalId: string;
  readonly requestId: string;
  readonly tenantId?: string;
  readonly requesterRef: string;
  readonly capabilityId: "trading.hummingbot.strategy.diff_proposal";
  readonly status: HummingbotDiffProposalStatus;
  readonly mode: "diff_only";
  readonly sourceStrategyPath: string;
  readonly targetStrategyPath: string;
  readonly realFileMutationAllowed: false;
  readonly applyPatchAllowed: false;
  readonly secretsAccessAllowed: false;
  readonly connectorAccessAllowed: false;
  readonly hummingbotRuntimeAllowed: false;
  readonly backtestAllowed: false;
  readonly networkAllowed: false;
  readonly mcpAllowed: false;
  readonly auditRequired: true;
  readonly evidenceRequired: true;
  readonly reasonCodes: readonly string[];
  readonly createdAt: string;
}

export interface HummingbotDiffProposalArtifact {
  readonly proposalId: string;
  readonly requestId: string;
  readonly status: HummingbotDiffProposalStatus;
  readonly diffText: string;
  readonly rationale: readonly string[];
  readonly riskAssessment: readonly string[];
  readonly rollbackNotes: readonly string[];
  readonly sidecar: HummingbotDiffProposalSidecar;
  readonly proofReport: string;
  readonly consoleSnapshot: string;
  readonly auditEvidence: readonly string[];
}

export interface SavedHummingbotDiffProposal {
  readonly proposal: HummingbotDiffProposalArtifact;
  readonly outputDir: string;
  readonly files: {
    readonly proposalMarkdown: string;
    readonly sidecarJson: string;
    readonly proofReport: string;
    readonly consoleSnapshot: string;
  };
}

export interface DiffOnlyActionDecision {
  readonly allowed: boolean;
  readonly blockedReason?: string;
  readonly reasonCodes: readonly string[];
}

export const DEFAULT_HUMMINGBOT_DIFF_OUTPUT_ROOT = ".acs-output/hummingbot-diff-proposals";
export const DEFAULT_HUMMINGBOT_DIFF_OUTPUT_ALLOWLIST: readonly string[] = [
  DEFAULT_HUMMINGBOT_DIFF_OUTPUT_ROOT,
];

const FORBIDDEN_PATH_MARKERS = [
  "/conf/connectors/",
  "/hummingbot/connector/",
  "/hummingbot/core/gateway/",
  "/hummingbot/user/",
  "/database/",
  "/logs/",
  "/runtime/",
  "/state/",
  "/wallet",
  "/account",
  "/secret",
  "/credential",
  "/key",
  ".env",
  ".db",
  ".sqlite",
];

const DENIED_ACTION_REASON_CODES: Record<HummingbotDiffOnlyDeniedAction, readonly string[]> = {
  apply_patch: ["diff_only_mode", "apply_patch_no_go"],
  edit_real_file: ["diff_only_mode", "real_file_mutation_no_go"],
  remove_strategy: ["diff_only_mode", "strategy_removal_no_go"],
  run_hummingbot: ["hummingbot_runtime_no_go"],
  run_backtest: ["backtest_execution_no_go"],
  access_connector: ["connector_access_no_go"],
  access_api_keys: ["secret_access_no_go", "api_keys_out_of_context"],
  call_shell: ["shell_no_go"],
  access_network: ["network_no_go"],
  call_mcp: ["mcp_no_go"],
  paper_trade: ["paper_trading_no_go_current_phase"],
  live_trade: ["live_trading_no_go"],
};

export function createHummingbotDiffProposal(input: HummingbotDiffProposalInput): HummingbotDiffProposalArtifact {
  assertDiffOnlyDecision(input.acsDecision);
  assertNonSensitiveStrategyPath(input.sourceStrategyPath);
  assertNonSensitiveStrategyPath(input.targetStrategyPath);

  const createdAt = input.createdAt ?? new Date().toISOString();
  const sidecarBase = {
    schemaVersion: 1,
    proposalId: input.proposalId,
    requestId: input.requestId,
    requesterRef: input.requesterRef,
    capabilityId: "trading.hummingbot.strategy.diff_proposal",
    status: "created",
    mode: "diff_only",
    sourceStrategyPath: input.sourceStrategyPath,
    targetStrategyPath: input.targetStrategyPath,
    realFileMutationAllowed: false,
    applyPatchAllowed: false,
    secretsAccessAllowed: false,
    connectorAccessAllowed: false,
    hummingbotRuntimeAllowed: false,
    backtestAllowed: false,
    networkAllowed: false,
    mcpAllowed: false,
    auditRequired: true,
    evidenceRequired: true,
    reasonCodes: [...new Set([...input.acsDecision.reasonCodes, "diff_only_artifact_created"])],
    createdAt,
  } satisfies Omit<HummingbotDiffProposalSidecar, "tenantId">;
  const sidecar: HummingbotDiffProposalSidecar = input.tenantId
    ? { ...sidecarBase, tenantId: input.tenantId }
    : sidecarBase;

  return {
    proposalId: input.proposalId,
    requestId: input.requestId,
    status: "created",
    diffText: input.proposedDiff,
    rationale: input.rationale,
    riskAssessment: input.riskAssessment,
    rollbackNotes: input.rollbackNotes,
    sidecar,
    proofReport: renderProofReport(input, sidecar),
    consoleSnapshot: renderConsoleSnapshot(input, sidecar),
    auditEvidence: [
      "acs_decision_allow_diff_only",
      "real_file_mutation_blocked",
      "apply_patch_blocked",
      "secret_access_blocked",
      "connector_access_blocked",
      "hummingbot_runtime_blocked",
    ],
  };
}

export function saveHummingbotDiffProposal(
  input: HummingbotDiffProposalInput,
  options?: {
    readonly outputRoot?: string;
    readonly allowlist?: readonly string[];
    readonly cwd?: string;
  },
): SavedHummingbotDiffProposal {
  const cwd = options?.cwd ?? process.cwd();
  const outputRoot = options?.outputRoot ?? DEFAULT_HUMMINGBOT_DIFF_OUTPUT_ROOT;
  const allowlist = options?.allowlist ?? DEFAULT_HUMMINGBOT_DIFF_OUTPUT_ALLOWLIST;
  const resolvedRoot = ensureDiffOutputRootAllowed(outputRoot, allowlist, cwd);
  const proposal = createHummingbotDiffProposal(input);
  const outputDir = join(resolvedRoot, proposal.proposalId);

  mkdirSync(outputDir, { recursive: true });

  const files = {
    proposalMarkdown: join(outputDir, "proposal.diff.md"),
    sidecarJson: join(outputDir, "sidecar.json"),
    proofReport: join(outputDir, "proof-report.md"),
    consoleSnapshot: join(outputDir, "console-snapshot.txt"),
  };

  writeFileSync(files.proposalMarkdown, renderProposalMarkdown(input, proposal), "utf8");
  writeFileSync(files.sidecarJson, `${JSON.stringify(proposal.sidecar, null, 2)}\n`, "utf8");
  writeFileSync(files.proofReport, proposal.proofReport, "utf8");
  writeFileSync(files.consoleSnapshot, proposal.consoleSnapshot, "utf8");

  return {
    proposal,
    outputDir,
    files,
  };
}

export function ensureDiffOutputRootAllowed(
  outputRoot: string,
  allowlist: readonly string[] = DEFAULT_HUMMINGBOT_DIFF_OUTPUT_ALLOWLIST,
  cwd = process.cwd(),
): string {
  const resolvedRoot = resolve(cwd, outputRoot);
  const allowedRoots = allowlist.map((entry) => resolve(cwd, entry));
  const allowed = allowedRoots.some((allowedRoot) => (
    resolvedRoot === allowedRoot || resolvedRoot.startsWith(`${allowedRoot}/`)
  ));

  if (!allowed) {
    throw new Error("diff_output_root_not_allowlisted");
  }

  return resolvedRoot;
}

export function evaluateHummingbotDiffOnlyAction(action: HummingbotDiffOnlyDeniedAction): DiffOnlyActionDecision {
  return {
    allowed: false,
    blockedReason: "diff_only_flow_blocks_side_effect",
    reasonCodes: DENIED_ACTION_REASON_CODES[action],
  };
}

function assertDiffOnlyDecision(decision: ACSDecision): void {
  if (decision.decision !== "allow_diff_only" || !decision.allowedModes.includes("diff_only")) {
    throw new Error("acs_decision_not_diff_only");
  }
}

function assertNonSensitiveStrategyPath(path: string): void {
  const normalized = path.replaceAll("\\", "/").toLowerCase();
  const forbidden = FORBIDDEN_PATH_MARKERS.some((marker) => normalized.includes(marker));

  if (forbidden) {
    throw new Error("sensitive_hummingbot_path_forbidden");
  }
}

function renderProposalMarkdown(input: HummingbotDiffProposalInput, proposal: HummingbotDiffProposalArtifact): string {
  return [
    `# Hummingbot Diff Proposal: ${proposal.proposalId}`,
    "",
    `Request: ${proposal.requestId}`,
    `Requester: ${input.requesterRef}`,
    `Source: ${input.sourceStrategyPath}`,
    `Target: ${input.targetStrategyPath}`,
    "",
    "## Intent",
    input.intentSummary,
    "",
    "## Diff",
    "```diff",
    proposal.diffText,
    "```",
    "",
    "## Rationale",
    ...proposal.rationale.map((item) => `- ${item}`),
    "",
    "## Risk Assessment",
    ...proposal.riskAssessment.map((item) => `- ${item}`),
    "",
    "## Rollback Notes",
    ...proposal.rollbackNotes.map((item) => `- ${item}`),
    "",
    "## Hard Blocks",
    "- No patch was applied.",
    "- No real Hummingbot file was edited.",
    "- No strategy was removed.",
    "- No Hummingbot runtime, backtest, shell, MCP or network action was executed.",
    "- No connector config, API key or secret was accessed.",
    "",
  ].join("\n");
}

function renderProofReport(input: HummingbotDiffProposalInput, sidecar: HummingbotDiffProposalSidecar): string {
  return [
    `# Proof Report: ${sidecar.proposalId}`,
    "",
    `Request: ${sidecar.requestId}`,
    `Capability: ${sidecar.capabilityId}`,
    `Mode: ${sidecar.mode}`,
    `Created At: ${sidecar.createdAt}`,
    "",
    "## Evidence",
    "- ACS decision was `allow_diff_only`.",
    "- Artifact was produced as text only.",
    "- Sidecar declares all mutation and execution capabilities disabled.",
    "- Output root must pass ACS allowlist validation.",
    "- Connector/API key/secret paths are forbidden.",
    "",
    "## Source And Target",
    `- Source: ${input.sourceStrategyPath}`,
    `- Target: ${input.targetStrategyPath}`,
    "",
  ].join("\n");
}

function renderConsoleSnapshot(input: HummingbotDiffProposalInput, sidecar: HummingbotDiffProposalSidecar): string {
  return [
    "ACS_TRINITY_HUMMINGBOT_DIFF_ONLY_FLOW",
    `proposalId=${sidecar.proposalId}`,
    `requestId=${sidecar.requestId}`,
    "decision=allow_diff_only",
    "applyPatchAllowed=false",
    "realFileMutationAllowed=false",
    "secretsAccessAllowed=false",
    "connectorAccessAllowed=false",
    "hummingbotRuntimeAllowed=false",
    "backtestAllowed=false",
    `sourceStrategyPath=${input.sourceStrategyPath}`,
    `targetStrategyPath=${input.targetStrategyPath}`,
    "",
  ].join("\n");
}
