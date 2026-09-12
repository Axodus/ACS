import type { AsyncNativeCoreRepository } from "./shared-state/native-core-durable.js";
import type { WorkforceDefinitionV2, WorkforceRevisionV2 } from "../native-core/workforce.js";
import type { WorkforceRunMembershipV2 } from "../native-core/workforce-run-membership.js";
import type { CoordinationDecisionV2, CoordinationProposalV2, TaskAssignmentV2 } from "../native-core/coordination.js";
import type { RunV2, TaskAttemptV2 } from "../native-core/runtime.js";
import type { RuntimeExecutionIntentV2 } from "../native-core/runtime-compilation.js";
import { NotFoundError } from "../errors.js";

export interface WorkforceProductApi {
  listWorkforces(): Promise<readonly WorkforceListItem[]>;
  getWorkforce(workforceId: string): Promise<WorkforceDetail>;
  getWorkforceRevisions(workforceId: string): Promise<readonly WorkforceRevisionV2[]>;
  getRunWorkforce(runId: string): Promise<RunWorkforceView>;
  getCoordination(runId: string, taskId: string): Promise<TaskCoordinationView>;
  getRuntime(runId: string, taskId: string): Promise<TaskRuntimeView>;
}

export interface WorkforceListItem {
  readonly workforceId: string;
  readonly name: string;
  readonly currentRevision: number;
  readonly lifecycleState: WorkforceDefinitionV2["current_status"];
  readonly memberCount: number;
  readonly updatedAt: number;
}

export interface WorkforceDetail {
  readonly identity: WorkforceDefinitionV2;
  readonly currentRevision: WorkforceRevisionV2;
  readonly currentComposition: WorkforceRevisionV2["members"];
  readonly revisionMetadata: WorkforceRevisionV2["commit"];
}

export interface RunWorkforceView {
  readonly run: RunV2;
  readonly workforce: { readonly workforceId: string; readonly admittedRevision: number; readonly currentHeadRevision: number } | null;
  readonly membership: readonly WorkforceRunMembershipV2[];
}

export interface TaskCoordinationView {
  readonly runId: string;
  readonly taskId: string;
  readonly proposals: readonly (CoordinationProposalV2 & { readonly canonicalStatus: "advisory" })[];
  readonly decisions: readonly (CoordinationDecisionV2 & { readonly canonicalStatus: "canonical" })[];
  readonly currentAssignment: TaskAssignmentV2 | null;
  readonly assignmentHistory: readonly TaskAssignmentV2[];
}

export interface TaskRuntimeView {
  readonly runId: string;
  readonly taskId: string;
  readonly intents: readonly RuntimeExecutionIntentV2[];
  readonly attempts: readonly ProductAttempt[];
}

export interface ProductAttempt {
  readonly attemptId: string;
  readonly status: TaskAttemptV2["status"];
  readonly executionIntentId?: string;
  readonly assignmentId?: string;
  readonly assignmentGeneration?: number;
  readonly memberSlotId?: string;
  readonly agentId?: string;
  readonly agentRevisionRef?: TaskAttemptV2["agent_revision_ref"];
  readonly workforceRevisionRef?: TaskAttemptV2["workforce_revision_ref"];
  readonly recoveryClassification: "resumable" | "superseded_assignment" | "completed" | "failed" | "stale_lease" | "corrupt_binding" | "unknown";
}

export function createWorkforceProductApi(nativeCore: AsyncNativeCoreRepository): WorkforceProductApi {
  return {
    async listWorkforces() {
      const definitions = await nativeCore.listWorkforceDefinitions();
      const items: WorkforceListItem[] = [];
      for (const definition of definitions) {
        const revisions = await nativeCore.listWorkforceRevisions(definition.workforce_id);
        const current = revisions.find((revision) => revision.ref.revision === definition.current_revision);
        if (!current) throw new Error(`workforce ${definition.workforce_id} head revision is missing`);
        items.push({
          workforceId: definition.workforce_id,
          name: current.display_name,
          currentRevision: definition.current_revision,
          lifecycleState: definition.current_status,
          memberCount: current.members.length,
          updatedAt: definition.updated_at,
        });
      }
      return items;
    },
    async getWorkforce(workforceId) {
      const lineage = await nativeCore.getWorkforceLineage(workforceId);
      const currentRevision = lineage.revisions.at(-1);
      if (!currentRevision) throw new NotFoundError("workforce-revision", workforceId);
      return { identity: lineage.definition, currentRevision, currentComposition: currentRevision.members, revisionMetadata: currentRevision.commit };
    },
    getWorkforceRevisions: (workforceId) => nativeCore.listWorkforceRevisions(workforceId),
    async getRunWorkforce(runId) {
      const run = await nativeCore.getRun(runId);
      if (!run) throw new NotFoundError("run", runId);
      const membership = await nativeCore.getRunMembership(runId);
      if (!run.definition_refs.workforce_revision_ref) return { run, workforce: null, membership };
      const ref = run.definition_refs.workforce_revision_ref;
      const lineage = await nativeCore.getWorkforceLineage(ref.entity_id);
      return { run, workforce: { workforceId: ref.entity_id, admittedRevision: ref.revision, currentHeadRevision: lineage.definition.current_revision }, membership };
    },
    async getCoordination(runId, taskId) {
      const run = await nativeCore.getRun(runId);
      if (!run) throw new NotFoundError("run", runId);
      const [proposals, decisions, currentAssignment, assignmentHistory] = await Promise.all([
        nativeCore.listCoordinationProposals(runId, taskId),
        nativeCore.listCoordinationDecisions(runId, taskId),
        nativeCore.getCurrentTaskAssignment(runId, taskId),
        nativeCore.listTaskAssignments(runId, taskId),
      ]);
      return {
        runId, taskId,
        proposals: proposals.map((proposal) => ({ ...proposal, canonicalStatus: "advisory" as const })),
        decisions: decisions.map((decision) => ({ ...decision, canonicalStatus: "canonical" as const })),
        currentAssignment: currentAssignment ?? null,
        assignmentHistory,
      };
    },
    async getRuntime(runId, taskId) {
      const run = await nativeCore.getRun(runId);
      if (!run) throw new NotFoundError("run", runId);
      const [intents, attempts, currentAssignment] = await Promise.all([
        nativeCore.listExecutionIntents(runId, taskId),
        nativeCore.listAttempts(runId, taskId),
        nativeCore.getCurrentTaskAssignment(runId, taskId),
      ]);
      const currentAssignmentId = currentAssignment?.assignment_id;
      return { runId, taskId, intents, attempts: attempts.map((attempt) => projectAttempt(attempt, currentAssignmentId)) };
    },
  };
}

function projectAttempt(attempt: TaskAttemptV2, currentAssignmentId?: string): ProductAttempt {
  const superseded = currentAssignmentId !== undefined && attempt.assignment_id !== undefined && attempt.assignment_id !== currentAssignmentId;
  const recoveryClassification = attempt.status === "succeeded" ? "completed"
    : attempt.status === "failed" || attempt.status === "timed_out" ? "failed"
    : superseded ? "superseded_assignment"
    : attempt.assignment_id && attempt.execution_intent_id ? "resumable" : "corrupt_binding";
  return {
    attemptId: attempt.attempt_id,
    status: attempt.status,
    ...(attempt.execution_intent_id ? { executionIntentId: attempt.execution_intent_id } : {}),
    ...(attempt.assignment_id ? { assignmentId: attempt.assignment_id } : {}),
    ...(attempt.assignment_generation !== undefined ? { assignmentGeneration: attempt.assignment_generation } : {}),
    ...(attempt.member_slot_id ? { memberSlotId: attempt.member_slot_id } : {}),
    ...(attempt.agent_id ? { agentId: attempt.agent_id } : {}),
    ...(attempt.agent_revision_ref ? { agentRevisionRef: attempt.agent_revision_ref } : {}),
    ...(attempt.workforce_revision_ref ? { workforceRevisionRef: attempt.workforce_revision_ref } : {}),
    recoveryClassification,
  };
}
