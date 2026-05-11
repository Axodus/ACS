export type CommandRiskLevel = "low" | "medium" | "high" | "critical";
export type ApprovalState = "not_required" | "required" | "satisfied" | "missing";
export type SandboxMode = "read_only" | "workspace_write" | "network_disabled" | "blocked";

export interface CommandSandboxBoundary {
  readonly mode: SandboxMode;
  readonly workspaceRoot?: string;
  readonly networkAllowed: boolean;
  readonly filesystemWriteAllowed: boolean;
  readonly allowedPaths: readonly string[];
}

export interface CommandRiskAssessment {
  readonly level: CommandRiskLevel;
  readonly reasons: readonly string[];
  readonly requiresExplicitApproval: boolean;
}

export interface CommandPolicyInput {
  readonly task: string;
  readonly requestedAction: string;
  readonly approvalToken?: string;
}

export interface CommandPolicyDecision {
  readonly allowed: boolean;
  readonly executionEnabled: boolean;
  readonly allowlistMatched: boolean;
  readonly approvalState: ApprovalState;
  readonly risk: CommandRiskAssessment;
  readonly sandbox: CommandSandboxBoundary;
  readonly reasons: readonly string[];
}

export interface ExecutionPolicy {
  evaluate(input: CommandPolicyInput): CommandPolicyDecision;
}

export interface DefaultExecutionPolicyOptions {
  readonly executionEnabled?: boolean;
  readonly allowedActions?: readonly string[];
  readonly approvalTokens?: readonly string[];
  readonly sandbox?: Partial<CommandSandboxBoundary>;
}

export class DefaultExecutionPolicy implements ExecutionPolicy {
  readonly #executionEnabled: boolean;
  readonly #allowedActions: readonly string[];
  readonly #approvalTokens: readonly string[];
  readonly #sandbox: CommandSandboxBoundary;

  constructor(options: DefaultExecutionPolicyOptions = {}) {
    this.#executionEnabled = options.executionEnabled ?? false;
    this.#allowedActions = options.allowedActions ?? [];
    this.#approvalTokens = options.approvalTokens ?? [];
    this.#sandbox = {
      mode: options.sandbox?.mode ?? "blocked",
      ...(options.sandbox?.workspaceRoot ? { workspaceRoot: options.sandbox.workspaceRoot } : {}),
      networkAllowed: options.sandbox?.networkAllowed ?? false,
      filesystemWriteAllowed: options.sandbox?.filesystemWriteAllowed ?? false,
      allowedPaths: options.sandbox?.allowedPaths ?? [],
    };
  }

  evaluate(input: CommandPolicyInput): CommandPolicyDecision {
    const risk = assessCommandRisk(input.task);
    const allowlistMatched = this.#allowedActions.includes(input.requestedAction);
    const approvalState = resolveApprovalState(risk, input.approvalToken, this.#approvalTokens);
    const reasons = buildDecisionReasons({
      executionEnabled: this.#executionEnabled,
      allowlistMatched,
      approvalState,
      sandbox: this.#sandbox,
      risk,
    });

    return {
      allowed: reasons.length === 0,
      executionEnabled: this.#executionEnabled,
      allowlistMatched,
      approvalState,
      risk,
      sandbox: this.#sandbox,
      reasons,
    };
  }
}

export function assessCommandRisk(task: string): CommandRiskAssessment {
  const normalized = task.toLowerCase();
  const reasons: string[] = [];

  const criticalPatterns = [
    "private key",
    "seed phrase",
    "wallet sign",
    "treasury transfer",
    "production deploy",
    "rm -rf",
    "chmod 777",
    "sudo",
  ];
  const highPatterns = ["deploy", "delete", "drop table", "migration", "write file", "modify", "execute", "run command"];
  const mediumPatterns = ["install", "network", "api key", "token", "env"];

  for (const pattern of criticalPatterns) {
    if (normalized.includes(pattern)) {
      reasons.push(`critical pattern detected: ${pattern}`);
    }
  }

  if (reasons.length > 0) {
    return { level: "critical", reasons, requiresExplicitApproval: true };
  }

  for (const pattern of highPatterns) {
    if (normalized.includes(pattern)) {
      reasons.push(`high-risk pattern detected: ${pattern}`);
    }
  }

  if (reasons.length > 0) {
    return { level: "high", reasons, requiresExplicitApproval: true };
  }

  for (const pattern of mediumPatterns) {
    if (normalized.includes(pattern)) {
      reasons.push(`medium-risk pattern detected: ${pattern}`);
    }
  }

  if (reasons.length > 0) {
    return { level: "medium", reasons, requiresExplicitApproval: true };
  }

  return { level: "low", reasons: ["planning-only task"], requiresExplicitApproval: false };
}

function resolveApprovalState(
  risk: CommandRiskAssessment,
  approvalToken: string | undefined,
  approvalTokens: readonly string[],
): ApprovalState {
  if (!risk.requiresExplicitApproval) {
    return "not_required";
  }

  if (!approvalToken) {
    return "missing";
  }

  return approvalTokens.includes(approvalToken) ? "satisfied" : "required";
}

function buildDecisionReasons(input: {
  readonly executionEnabled: boolean;
  readonly allowlistMatched: boolean;
  readonly approvalState: ApprovalState;
  readonly sandbox: CommandSandboxBoundary;
  readonly risk: CommandRiskAssessment;
}): readonly string[] {
  const reasons: string[] = [];

  if (!input.executionEnabled) {
    reasons.push("execution is disabled by policy");
  }

  if (!input.allowlistMatched) {
    reasons.push("requested action is not in the command allowlist");
  }

  if (input.approvalState === "missing") {
    reasons.push("explicit approval token is required");
  }

  if (input.approvalState === "required") {
    reasons.push("provided approval token is not accepted");
  }

  if (input.sandbox.mode === "blocked") {
    reasons.push("sandbox mode blocks execution");
  }

  if (input.risk.level === "critical") {
    reasons.push("critical risk tasks cannot execute under the default policy");
  }

  return reasons;
}
