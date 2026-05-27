export type HummingbotSandboxLifecycleState =
  | "proposed"
  | "approved_for_sandbox"
  | "created"
  | "edited"
  | "disabled"
  | "removed"
  | "rolled_back"
  | "archived";

export type HummingbotSandboxLifecycleAction =
  | "approve_for_sandbox"
  | "create"
  | "edit"
  | "disable"
  | "remove"
  | "rollback"
  | "archive";

export interface HummingbotSandboxLifecycleTransitionInput {
  readonly from: HummingbotSandboxLifecycleState;
  readonly action: HummingbotSandboxLifecycleAction;
  readonly rollbackPlanPresent?: boolean;
  readonly evidencePreserved?: boolean;
  readonly riskLevel?: "low" | "medium" | "high" | "critical";
  readonly realRuntimeTouched?: boolean;
}

export interface HummingbotSandboxLifecycleDecision {
  readonly allowed: boolean;
  readonly to?: HummingbotSandboxLifecycleState;
  readonly preferredAction?: HummingbotSandboxLifecycleAction;
  readonly blockedReason?: string;
  readonly reasonCodes: readonly string[];
}

const ALLOWED_TRANSITIONS: Record<HummingbotSandboxLifecycleState, Partial<Record<HummingbotSandboxLifecycleAction, HummingbotSandboxLifecycleState>>> = {
  proposed: {
    approve_for_sandbox: "approved_for_sandbox",
  },
  approved_for_sandbox: {
    create: "created",
  },
  created: {
    edit: "edited",
    disable: "disabled",
  },
  edited: {
    disable: "disabled",
  },
  disabled: {
    remove: "removed",
    rollback: "rolled_back",
    archive: "archived",
  },
  removed: {
    rollback: "rolled_back",
    archive: "archived",
  },
  rolled_back: {
    archive: "archived",
  },
  archived: {},
};

export function evaluateHummingbotSandboxLifecycleTransition(
  input: HummingbotSandboxLifecycleTransitionInput,
): HummingbotSandboxLifecycleDecision {
  if (input.realRuntimeTouched) {
    return {
      allowed: false,
      blockedReason: "real_runtime_touch_no_go",
      reasonCodes: ["hummingbot_runtime_no_go", "sandbox_only_required"],
    };
  }

  const to = ALLOWED_TRANSITIONS[input.from][input.action];
  if (!to) {
    return {
      allowed: false,
      blockedReason: "invalid_lifecycle_transition",
      reasonCodes: ["invalid_transition", "sandbox_lifecycle_policy_required"],
    };
  }

  if (input.action === "remove") {
    if (input.from !== "disabled") {
      return {
        allowed: false,
        preferredAction: "disable",
        blockedReason: "disable_required_before_remove",
        reasonCodes: ["disable_preferred", "remove_requires_disabled_state"],
      };
    }

    if (input.riskLevel !== "high" && input.riskLevel !== "critical") {
      return {
        allowed: false,
        blockedReason: "remove_requires_high_risk_classification",
        reasonCodes: ["remove_high_risk_required"],
      };
    }

    if (!input.rollbackPlanPresent) {
      return {
        allowed: false,
        blockedReason: "remove_requires_rollback_plan",
        reasonCodes: ["rollback_plan_required"],
      };
    }

    if (!input.evidencePreserved) {
      return {
        allowed: false,
        blockedReason: "remove_must_preserve_evidence",
        reasonCodes: ["evidence_preservation_required"],
      };
    }
  }

  return {
    allowed: true,
    to,
    reasonCodes: input.action === "remove"
      ? ["sandbox_remove_allowed_as_logical_tombstone", "rollback_plan_present", "evidence_preserved"]
      : ["sandbox_lifecycle_transition_allowed"],
  };
}

export function getHummingbotSandboxLifecycleStates(): readonly HummingbotSandboxLifecycleState[] {
  return [
    "proposed",
    "approved_for_sandbox",
    "created",
    "edited",
    "disabled",
    "removed",
    "rolled_back",
    "archived",
  ];
}
