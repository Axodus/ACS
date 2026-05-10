import type { RegisteredWorkflow, WorkflowFactoryOptions } from "./types.js";

export const GOVERNANCE_ALIGNMENT_WORKFLOW: RegisteredWorkflow = {
  name: "governance-alignment",
  version: "1.0.0",
  description: "Validate ACS workflow changes against governance boundaries.",
  create(options: WorkflowFactoryOptions = {}) {
    return {
      id: this.name,
      workflowRunId: options.workflowRunId ?? "governance-alignment:local",
      name: "ACS governance alignment",
      createdBy: "acs-runtime",
      governancePolicyRef: "default-bounded-local-policy",
      steps: [
        {
          id: "morpheus-governance-analysis",
          agentId: "morpheus",
          action: "analyze-governance-impact",
          requiredPermissions: ["workflow.plan", "governance.review"],
          providerCapability: "coordination",
        },
        {
          id: "smith-boundary-stress-test",
          agentId: "agentsmith",
          action: "stress-test-governance-boundaries",
          requiredPermissions: ["security.review"],
          providerCapability: "validation",
        },
      ],
    };
  },
};
