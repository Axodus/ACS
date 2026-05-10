import type { AgentDefinition, PolicyDecision, WorkflowDefinition, WorkflowStep } from "./types.js";

export interface GovernancePolicy {
  evaluateWorkflow(workflow: WorkflowDefinition): PolicyDecision;
  evaluateStep(workflow: WorkflowDefinition, step: WorkflowStep, agent: AgentDefinition): PolicyDecision;
}

export class BoundedGovernancePolicy implements GovernancePolicy {
  constructor(
    private readonly blockedActions: readonly string[] = [],
    private readonly maxSteps = 20,
  ) {}

  evaluateWorkflow(workflow: WorkflowDefinition): PolicyDecision {
    if (workflow.steps.length === 0) {
      return { allowed: false, reason: "workflow must contain at least one step" };
    }

    if (workflow.steps.length > this.maxSteps) {
      return { allowed: false, reason: `workflow exceeds max step limit: ${this.maxSteps}` };
    }

    return { allowed: true };
  }

  evaluateStep(_workflow: WorkflowDefinition, step: WorkflowStep, agent: AgentDefinition): PolicyDecision {
    if (agent.status !== "active") {
      return { allowed: false, reason: `agent is not active: ${agent.id}` };
    }

    if (!agent.telemetryEnabled) {
      return { allowed: false, reason: `agent telemetry is disabled: ${agent.id}` };
    }

    if (this.blockedActions.includes(step.action)) {
      return { allowed: false, reason: `action is blocked by governance policy: ${step.action}` };
    }

    const agentPermissions = new Set(agent.permissions.map((permission) => permission.name));
    const missingPermission = step.requiredPermissions.find((permission) => !agentPermissions.has(permission));
    if (missingPermission) {
      return { allowed: false, reason: `agent ${agent.id} is missing permission: ${missingPermission}` };
    }

    return { allowed: true };
  }
}
