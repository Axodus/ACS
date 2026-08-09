import { DuplicateRegistrationError, NotFoundError } from "../errors.js";
import { CompositionResourceService } from "./composition-resources.js";
import {
  createAgentComposition,
  createAgentRevision,
  type AgentComposition,
  type AgentDefinition,
  type AgentRevision,
  type CompositionFinding,
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
}

export class AgentRevisionConflictError extends Error {
  constructor(message = "agent revision conflict") {
    super(message);
    this.name = "AgentRevisionConflictError";
  }
}

export class InMemoryAgentRepository implements AgentRepository {
  readonly #revisions = new Map<string, AgentRevision>();

  create(revision: AgentRevision): AgentRevision {
    if (this.#revisions.has(revision.agentId)) {
      throw new DuplicateRegistrationError("agent-definition", revision.agentId);
    }
    this.#revisions.set(revision.agentId, revision);
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
    return revision;
  }
}

export class AgentService {
  readonly #repository: AgentRepository;
  readonly #resources: CompositionResourceService;
  readonly #providers: ModelProviderRegistry;
  readonly #credentials: CredentialConnectionRegistry;
  readonly #runners: AgentRunnerRegistry;

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
    const next = createAgentRevision({
      definition: input.definition,
      revision: current.revision + 1,
      createdAt: current.createdAt,
      updatedAt: input.updatedAt,
      ...((input.updatedBy ?? current.createdBy) ? { createdBy: input.updatedBy ?? current.createdBy! } : {}),
    });
    if (next.fingerprint === current.fingerprint) {
      return current;
    }
    return this.#repository.save(next, input.expectedRevision);
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
}
