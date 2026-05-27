import type { HummingbotSandboxLifecycleTransitionInput } from "../hummingbot-sandbox-lifecycle.js";

export function createHummingbotSandboxDisablePilotFixture(): HummingbotSandboxLifecycleTransitionInput {
  return {
    from: "created",
    action: "disable",
    realRuntimeTouched: false,
  };
}

export function createHummingbotSandboxRemovePilotFixture(): HummingbotSandboxLifecycleTransitionInput {
  return {
    from: "disabled",
    action: "remove",
    riskLevel: "high",
    rollbackPlanPresent: true,
    evidencePreserved: true,
    realRuntimeTouched: false,
  };
}

export function createHummingbotSandboxInvalidRemoveFixture(): HummingbotSandboxLifecycleTransitionInput {
  return {
    from: "created",
    action: "remove",
    riskLevel: "medium",
    rollbackPlanPresent: false,
    evidencePreserved: true,
    realRuntimeTouched: false,
  };
}
