import type { RegisteredWorkflow, WorkflowFactoryOptions } from "./types.js";

export const SECURITY_REVIEW_WORKFLOW: RegisteredWorkflow = {
  name: "security-review",
  version: "1.0.0",
  description: "Coordinate adversarial security review for ACS changes.",
  create(options: WorkflowFactoryOptions = {}) {
    return {
      id: this.name,
      workflowRunId: options.workflowRunId ?? "security-review:local",
      name: "ACS security review",
      createdBy: "acs-runtime",
      governancePolicyRef: "default-bounded-local-policy",
      steps: [
        {
          id: "smith-security-review",
          agentId: "agentsmith",
          action: "review-security-boundaries",
          requiredPermissions: ["security.review"],
          providerCapability: "validation",
        },
        {
          id: "redhat-remediation-plan",
          agentId: "redhat",
          action: "plan-secure-remediation",
          requiredPermissions: ["workflow.plan", "code.review"],
          providerCapability: "development-orchestration",
        },
      ],
    };
  },
};
