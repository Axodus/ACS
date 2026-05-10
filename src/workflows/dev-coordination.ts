import type { RegisteredWorkflow, WorkflowFactoryOptions } from "./types.js";

export const DEV_COORDINATION_WORKFLOW: RegisteredWorkflow = {
  name: "dev-coordination",
  version: "1.0.0",
  description: "Coordinate local ACS development planning, governance review, and boundary validation.",
  create(options: WorkflowFactoryOptions = {}) {
    return {
      id: this.name,
      workflowRunId: options.workflowRunId ?? "dev-coordination:local",
      name: "ACS development coordination",
      createdBy: "acs-runtime",
      governancePolicyRef: "default-bounded-local-policy",
      steps: [
        {
          id: "redhat-plan",
          agentId: "redhat",
          action: "plan-development-workflow",
          requiredPermissions: ["workflow.plan", "mcp.coordinate"],
          providerCapability: "development-orchestration",
        },
        {
          id: "morpheus-governance-review",
          agentId: "morpheus",
          action: "review-governance-alignment",
          requiredPermissions: ["governance.review"],
          providerCapability: "coordination",
        },
        {
          id: "smith-validation",
          agentId: "agentsmith",
          action: "validate-runtime-boundaries",
          requiredPermissions: ["security.review"],
          providerCapability: "validation",
        },
      ],
    };
  },
};
