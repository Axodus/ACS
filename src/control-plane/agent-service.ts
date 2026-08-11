import { DuplicateRegistrationError, NotFoundError } from "../errors.js";
import { CompositionResourceService } from "./composition-resources.js";
import {
  createAgentComposition,
  createAgentRevision,
  type AgentComposition,
  type AgentDefinition,
  type AgentRevision,
  type CompositionFinding,
  type GovernedAgentStatus,
  validateAgentDefinition,
} from "./unified-agent-model.js";
import { ModelProviderRegistry } from "../intelligence/model-provider-registry.js";
import { CredentialConnectionRegistry } from "../intelligence/credential-registry.js";
import { AgentRunnerRegistry } from "../intelligence/agent-runner-registry.js";

export interface AgentUpdateInput {
  readonly definition: AgentDefinition;
  readonly expectedRevision: number;
  readonly updatedAt: number;
  readonly updatedBy?: string;
}

export interface AgentCompositionResult {
  readonly revision: AgentRevision;
  readonly composition: AgentComposition;
}

export interface AgentRepository {
  create(revision: AgentRevision): AgentRevision;
  get(agentId: string): AgentRevision;
  list(): readonly AgentRevision[];
  save(revision: AgentRevision, expectedRevision: number): AgentRevision;
  history(agentId: string): readonly AgentRevision[];
  remove(agentId: string): AgentRevision;
}

export class AgentRevisionConflictError extends Error {
  constructor(message = "agent revision conflict") {
    super(message);
    this.name = "AgentRevisionConflictError";
  }
}

export class AgentLifecycleGuardError extends Error {
  constructor(
    message: string,
    readonly details: { readonly code: string; readonly reason: string },
  ) {
    super(message);
    this.name = "AgentLifecycleGuardError";
  }
}

export class InMemoryAgentRepository implements AgentRepository {
  readonly #revisions = new Map<string, AgentRevision>();
  readonly #history = new Map<string, AgentRevision[]>();

  create(revision: AgentRevision): AgentRevision {
    if (this.#revisions.has(revision.agentId)) {
      throw new DuplicateRegistrationError("agent-definition", revision.agentId);
    }
    this.#revisions.set(revision.agentId, revision);
    this.#appendHistory(revision);
    return revision;
  }

  get(agentId: string): AgentRevision {
    const revision = this.#revisions.get(agentId);
    if (!revision) {
      throw new NotFoundError("agent-definition", agentId);
    }
    return revision;
  }

  list(): readonly AgentRevision[] {
    return [...this.#revisions.values()].sort((left, right) => left.agentId.localeCompare(right.agentId));
  }

  save(revision: AgentRevision, expectedRevision: number): AgentRevision {
    const current = this.get(revision.agentId);
    if (current.revision !== expectedRevision) {
      throw new AgentRevisionConflictError("revision conflict: expected revision " + expectedRevision + " but found " + current.revision);
    }
    this.#revisions.set(revision.agentId, revision);
    this.#appendHistory(revision);
    return revision;
  }

  history(agentId: string): readonly AgentRevision[] {
    return [...(this.#history.get(agentId) ?? [])];
  }

  remove(agentId: string): AgentRevision {
    const current = this.get(agentId);
    this.#revisions.delete(agentId);
    this.#history.delete(agentId);
    return current;
  }

  #appendHistory(revision: AgentRevision): void {
    const existing = this.#history.get(revision.agentId) ?? [];
    this.#history.set(revision.agentId, [...existing, revision]);
  }
}

export interface AgentRevisionHistoryRecord {
  readonly revision: AgentRevision;
  readonly adoptedAt: number;
  readonly restoredFrom?: number;
  readonly changeSummary?: string;
}

export type AgentLifecycleActionName =
  | "update"
  | "createRevision"
  | "adoptRevision"
  | "restoreRevision"
  | "duplicate"
  | "archive"
  | "restore"
  | "delete";

export interface AgentLifecycleActionAvailability {
  readonly action: AgentLifecycleActionName;
  readonly available: boolean;
  readonly reason?: string;
  readonly requiresConfirmation?: boolean;
}

export interface AgentLifecycleState {
  readonly agentId: string;
  readonly currentRevision: number;
  readonly status: GovernedAgentStatus;
  readonly archived: boolean;
  readonly protected: boolean;
  readonly archivedAt?: number;
  readonly restoredAt?: number;
  readonly availableActions: readonly AgentLifecycleActionAvailability[];
}

interface AgentLifecycleMeta {
  readonly archivedAt?: number;
  readonly archivedBy?: string;
  readonly statusBeforeArchive?: GovernedAgentStatus;
  readonly restoredAt?: number;
}

interface AgentRevisionMeta {
  readonly restoredFrom?: number;
  readonly changeSummary?: string;
}

export class AgentService {
  readonly #repository: AgentRepository;
  readonly #resources: CompositionResourceService;
  readonly #providers: ModelProviderRegistry;
  readonly #credentials: CredentialConnectionRegistry;
  readonly #runners: AgentRunnerRegistry;
  readonly #lifecycle = new Map<string, AgentLifecycleMeta>();
  readonly #revisionMeta = new Map<string, AgentRevisionMeta>();

  constructor(input: {
    repository?: AgentRepository;
    resources?: CompositionResourceService;
    providers: ModelProviderRegistry;
    credentials: CredentialConnectionRegistry;
    runners: AgentRunnerRegistry;
  }) {
    this.#repository = input.repository ?? new InMemoryAgentRepository();
    this.#resources = input.resources ?? new CompositionResourceService();
    this.#providers = input.providers;
    this.#credentials = input.credentials;
    this.#runners = input.runners;
  }

  create(input: { definition: AgentDefinition; createdAt: number; createdBy?: string }): AgentRevision {
    const findings = this.validateDefinition(input.definition);
    if (findings.some((finding) => finding.severity === "error")) {
      throw new Error("agent definition is invalid");
    }
    return this.#repository.create(createAgentRevision({
      definition: input.definition,
      revision: 1,
      createdAt: input.createdAt,
      ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    }));
  }

  get(agentId: string): AgentRevision {
    return this.#repository.get(agentId);
  }

  list(): readonly AgentRevision[] {
    return this.#repository.list();
  }

  update(agentId: string, input: AgentUpdateInput): AgentRevision {
    const findings = this.validateDefinition(input.definition);
    if (findings.some((finding) => finding.severity === "error")) {
      throw new Error("agent definition is invalid");
    }
    const current = this.#repository.get(agentId);
    if (current.agentId !== input.definition.agentId) {
      throw new Error("agent identifier cannot be changed");
    }
    const next = this.#nextRevision(current, input.definition, input.updatedAt, input.updatedBy);
    if (next.fingerprint === current.fingerprint) {
      return current;
    }
    return this.#repository.save(next, input.expectedRevision);
  }

  createRevision(input: {
    agentId: string;
    definition: AgentDefinition;
    expectedRevision: number;
    actor?: string;
    at?: number;
  }): AgentRevision {
    return this.update(input.agentId, {
      definition: input.definition,
      expectedRevision: input.expectedRevision,
      updatedAt: input.at ?? Date.now(),
      ...(input.actor ? { updatedBy: input.actor } : {}),
    });
  }

  archiveAgent(agentId: string, input: { actor?: string; at?: number } = {}): AgentRevision {
    const current = this.#repository.get(agentId);
    if (current.definition.status === "archived") {
      throw new AgentLifecycleGuardError(`agent already archived: ${agentId}`, {
        code: "AGENT_ALREADY_ARCHIVED",
        reason: "Agent is already archived.",
      });
    }
    const next = this.#nextRevision(
      current,
      { ...current.definition, status: "archived" },
      input.at ?? Date.now(),
      input.actor,
    );
    const saved = this.#repository.save(next, current.revision);
    const previous = this.#lifecycle.get(agentId);
    this.#lifecycle.set(agentId, {
      ...(previous ? { restoredAt: previous.restoredAt } : {}),
      archivedAt: saved.updatedAt,
      ...(input.actor ? { archivedBy: input.actor } : {}),
      statusBeforeArchive: current.definition.status,
    });
    return saved;
  }

  restoreAgent(agentId: string, input: { actor?: string; at?: number } = {}): AgentRevision {
    const current = this.#repository.get(agentId);
    if (current.definition.status !== "archived") {
      throw new AgentLifecycleGuardError(`agent is not archived: ${agentId}`, {
        code: "AGENT_NOT_ARCHIVED",
        reason: "Only archived agents can be restored.",
      });
    }
    const meta = this.#lifecycle.get(agentId);
    const targetStatus: GovernedAgentStatus =
      meta?.statusBeforeArchive === "active" || meta?.statusBeforeArchive === "disabled"
        ? meta.statusBeforeArchive
        : "draft";
    const next = this.#nextRevision(
      current,
      { ...current.definition, status: targetStatus },
      input.at ?? Date.now(),
      input.actor,
    );
    const saved = this.#repository.save(next, current.revision);
    this.#lifecycle.set(agentId, { ...(meta ?? {}), restoredAt: saved.updatedAt });
    return saved;
  }

  deleteAgent(agentId: string, input: { actor?: string; at?: number } = {}): { readonly agentId: string; readonly deletedAt: number } {
    const current = this.#repository.get(agentId);
    if (this.#isProtectedAgent(current)) {
      throw new AgentLifecycleGuardError(`agent is protected: ${agentId}`, {
        code: "AGENT_PROTECTED",
        reason: "Protected agents cannot be deleted.",
      });
    }
    if (current.definition.status !== "archived") {
      throw new AgentLifecycleGuardError(`agent must be archived before deletion: ${agentId}`, {
        code: "AGENT_NOT_ARCHIVED",
        reason: "Archive the agent before deleting it.",
      });
    }
    this.#repository.remove(agentId);
    this.#lifecycle.delete(agentId);
    return { agentId, deletedAt: input.at ?? Date.now() };
  }

  duplicateAgent(agentId: string, input: { newAgentId: string; name?: string; actor?: string; at?: number }): AgentRevision {
    const current = this.#repository.get(agentId);
    const definition: AgentDefinition = {
      ...current.definition,
      agentId: input.newAgentId,
      name: input.name ?? `${current.definition.name} (copy)`,
      status: "draft",
      metadata: current.definition.metadata
        ? { ...current.definition.metadata, duplicatedFrom: agentId }
        : { duplicatedFrom: agentId },
    };
    return this.create({
      definition,
      createdAt: input.at ?? Date.now(),
      ...(input.actor ? { createdBy: input.actor } : {}),
    });
  }

  adoptRevision(agentId: string, revisionNumber: number, input: { actor?: string; at?: number } = {}): AgentRevision {
    return this.#restateRevision(agentId, revisionNumber, "Adopted", input);
  }

  restoreRevision(agentId: string, revisionNumber: number, input: { actor?: string; at?: number } = {}): AgentRevision {
    return this.#restateRevision(agentId, revisionNumber, "Restored", input);
  }

  getRevisionHistory(agentId: string): readonly AgentRevisionHistoryRecord[] {
    this.#repository.get(agentId);
    return this.#repository.history(agentId)
      .map((revision) => {
        const meta = this.#revisionMeta.get(this.#revisionMetaKey(agentId, revision.revision));
        return {
          revision,
          adoptedAt: revision.updatedAt,
          ...(meta?.restoredFrom !== undefined ? { restoredFrom: meta.restoredFrom } : {}),
          ...(meta?.changeSummary ? { changeSummary: meta.changeSummary } : {}),
        };
      })
      .sort((left, right) => right.revision.revision - left.revision.revision);
  }

  getLifecycleState(agentId: string): AgentLifecycleState {
    const current = this.#repository.get(agentId);
    const history = this.#repository.history(agentId);
    const meta = this.#lifecycle.get(agentId);
    const protectedAgent = this.#isProtectedAgent(current);
    const archived = current.definition.status === "archived";
    return {
      agentId,
      currentRevision: current.revision,
      status: current.definition.status,
      archived,
      protected: protectedAgent,
      ...(meta?.archivedAt !== undefined ? { archivedAt: meta.archivedAt } : {}),
      ...(meta?.restoredAt !== undefined ? { restoredAt: meta.restoredAt } : {}),
      availableActions: this.#availableActions(current, history.length, protectedAgent),
    };
  }

  validateDefinition(definition: AgentDefinition): readonly CompositionFinding[] {
    const findings: CompositionFinding[] = [...validateAgentDefinition(definition)];

    findings.push(...this.#resources.validateReferences({
      ...(definition.roleId ? { role: { id: definition.roleId, ...(definition.roleRevision ? { revision: definition.roleRevision } : {}) } } : {}),
      ...(definition.profileId ? { profile: { id: definition.profileId, ...(definition.profileRevision ? { revision: definition.profileRevision } : {}) } } : {}),
      skills: definition.skillIds.map((id) => ({ id })),
      tools: definition.toolIds.map((id) => ({ id })),
      capabilities: definition.capabilityIds,
    }));

    for (const credentialId of definition.credentialConnectionIds) {
      try {
        this.#credentials.get(credentialId);
      } catch {
        findings.push({
          code: "AGENT_CREDENTIAL_REFERENCE_UNKNOWN",
          severity: "error",
          message: "Unknown credential connection reference: " + credentialId,
        });
      }
    }

    for (const runnerId of definition.runnerPreferences) {
      try {
        this.#runners.get(runnerId);
      } catch {
        findings.push({
          code: "AGENT_RUNNER_REFERENCE_UNKNOWN",
          severity: "error",
          message: "Unknown runner reference: " + runnerId,
        });
      }
    }

    const strategy = definition.modelStrategy;
    if (strategy) {
      const providerRefs = [strategy.primary, ...strategy.fallbacks];
      for (const reference of providerRefs) {
        try {
          this.#providers.get(reference.providerId);
        } catch {
          findings.push({
            code: "AGENT_PROVIDER_REFERENCE_UNKNOWN",
            severity: "error",
            message: "Unknown model provider reference: " + reference.providerId,
          });
        }
      }
    }

    return findings;
  }

  compose(agentId: string): AgentCompositionResult {
    const revision = this.#repository.get(agentId);
    const findings = this.validateDefinition(revision.definition);
    const role = revision.definition.roleId ? this.#resources.getRole(revision.definition.roleId) : undefined;
    const profile = revision.definition.profileId ? this.#resources.getProfile(revision.definition.profileId) : undefined;
    const roleCapabilities = role?.capabilityIds ?? [];
    const profileCapabilities = profile?.capabilityIds ?? [];
    const effectiveCapabilities = [...new Set([
      ...revision.definition.capabilityIds,
      ...roleCapabilities,
      ...profileCapabilities,
    ])].sort();
    const composition = createAgentComposition({
      revision,
      findings,
      effective: {
        ...(role ? { roleId: role.id, roleRevision: role.revision } : {}),
        ...(profile ? { profileId: profile.id, profileRevision: profile.revision } : {}),
        capabilityIds: effectiveCapabilities,
        skillIds: revision.definition.skillIds,
        toolIds: revision.definition.toolIds,
        credentialConnectionIds: revision.definition.credentialConnectionIds,
        runnerPreferences: revision.definition.runnerPreferences,
        ...(revision.definition.modelStrategy ? { modelStrategy: revision.definition.modelStrategy } : {}),
      },
    });
    return { revision, composition };
  }

  #nextRevision(current: AgentRevision, definition: AgentDefinition, at: number, actor?: string): AgentRevision {
    return createAgentRevision({
      definition,
      revision: current.revision + 1,
      createdAt: current.createdAt,
      updatedAt: at,
      ...((actor ?? current.createdBy) ? { createdBy: actor ?? current.createdBy! } : {}),
    });
  }

  #restateRevision(
    agentId: string,
    revisionNumber: number,
    label: string,
    input: { actor?: string; at?: number },
  ): AgentRevision {
    const current = this.#repository.get(agentId);
    const history = this.#repository.history(agentId);
    const source = history.find((entry) => entry.revision === revisionNumber);
    if (!source) {
      throw new NotFoundError("agent-revision", String(revisionNumber));
    }
    if (source.revision === current.revision) {
      throw new AgentLifecycleGuardError(`revision ${revisionNumber} is already the current revision`, {
        code: "REVISION_ALREADY_CURRENT",
        reason: `Revision ${revisionNumber} is already adopted.`,
      });
    }
    if (current.definition.status === "archived") {
      throw new AgentLifecycleGuardError(`archived agents cannot change revisions: ${agentId}`, {
        code: "AGENT_ARCHIVED",
        reason: "Restore the agent before changing revisions.",
      });
    }
    const next = this.#nextRevision(current, source.definition, input.at ?? Date.now(), input.actor);
    const saved = this.#repository.save(next, current.revision);
    this.#revisionMeta.set(this.#revisionMetaKey(agentId, saved.revision), {
      restoredFrom: revisionNumber,
      changeSummary: `${label} revision ${revisionNumber}`,
    });
    return saved;
  }

  #availableActions(
    current: AgentRevision,
    historyCount: number,
    protectedAgent: boolean,
  ): readonly AgentLifecycleActionAvailability[] {
    const archived = current.definition.status === "archived";
    const hasHistory = historyCount > 1;
    return [
      {
        action: "update",
        available: !archived,
        ...(!archived ? {} : { reason: "Archived agents cannot be edited." }),
      },
      {
        action: "createRevision",
        available: !archived,
        ...(!archived ? {} : { reason: "Archived agents cannot receive new revisions." }),
      },
      {
        action: "adoptRevision",
        available: !archived && hasHistory,
        ...(!hasHistory
          ? { reason: "Only one revision exists; nothing to adopt." }
          : archived
            ? { reason: "Archived agents cannot change revisions." }
            : {}),
      },
      {
        action: "restoreRevision",
        available: !archived && hasHistory,
        ...(!hasHistory
          ? { reason: "Only one revision exists; nothing to restore." }
          : archived
            ? { reason: "Archived agents cannot change revisions." }
            : {}),
      },
      {
        action: "duplicate",
        available: true,
      },
      {
        action: "archive",
        available: !archived,
        ...(!archived ? {} : { reason: "Agent is already archived." }),
      },
      {
        action: "restore",
        available: archived,
        ...(archived ? {} : { reason: "Agent is not archived." }),
      },
      {
        action: "delete",
        available: archived && !protectedAgent,
        requiresConfirmation: true,
        ...(!archived
          ? { reason: "Archive the agent before deleting it." }
          : protectedAgent
            ? { reason: "Protected agents cannot be deleted." }
            : {}),
      },
    ];
  }

  #isProtectedAgent(revision: AgentRevision): boolean {
    return revision.definition.metadata?.protected === true;
  }

  #revisionMetaKey(agentId: string, revision: number): string {
    return `${agentId}:${revision}`;
  }
}
