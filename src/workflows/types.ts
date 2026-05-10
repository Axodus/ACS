import type { WorkflowDefinition } from "../types.js";

export interface WorkflowFactoryOptions {
  readonly workflowRunId?: string;
}

export interface RegisteredWorkflow {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  create(options?: WorkflowFactoryOptions): WorkflowDefinition;
}
