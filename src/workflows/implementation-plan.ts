import type { RegisteredWorkflow, WorkflowFactoryOptions } from "./types.js";

export const IMPLEMENTATION_PLAN_WORKFLOW: RegisteredWorkflow = {
  name: "implementation-plan",
  version: "1.0.0",
  description: "Create a bounded implementation plan using RedHat Dev and governance validation.",
  create(options: WorkflowFactoryOptions = {}) {
    return {
      id: this.name,
      workflowRunId: options.workflowRunId ?? "implementation-plan:local",
      name: "ACS implementation plan",
      createdBy: "acs-runtime",
      governancePolicyRef: "default-bounded-local-policy",
      steps: [
        {
          id: "redhat-implementation-plan",
          agentId: "redhat",
          action: "create-implementation-plan",
          requiredPermissions: ["workflow.plan", "mcp.coordinate"],
          providerCapability: "development-orchestration",
        },
        {
          id: "morpheus-alignment-check",
          agentId: "morpheus",
          action: "check-strategic-alignment",
          requiredPermissions: ["governance.review"],
          providerCapability: "coordination",
        },
      ],
    };
  },
};
