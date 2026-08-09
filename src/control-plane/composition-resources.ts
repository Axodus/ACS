import { NotFoundError } from "../errors.js";
import { ACS_CAPABILITIES, type AcsServiceCapability } from "../capability-registry.js";

export type ResourceKind = "role" | "profile" | "skill" | "tool" | "capability";
export type ResourceStatus = "active" | "deprecated" | "experimental";

export interface GovernedResourceReference {
  readonly id: string;
  readonly revision?: number;
}

export interface GovernedRoleResource {
  readonly kind: "role";
  readonly id: string;
  readonly revision: number;
  readonly displayName: string;
  readonly status: ResourceStatus;
  readonly capabilityIds: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GovernedProfileResource {
  readonly kind: "profile";
  readonly id: string;
  readonly revision: number;
  readonly displayName: string;
  readonly status: ResourceStatus;
  readonly capabilityIds: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GovernedSkillResource {
  readonly kind: "skill";
  readonly id: string;
  readonly revision: number;
  readonly displayName: string;
  readonly status: ResourceStatus;
  readonly capabilityIds: readonly string[];
  readonly source: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GovernedToolResource {
  readonly kind: "tool";
  readonly id: string;
  readonly revision: number;
  readonly displayName: string;
  readonly status: ResourceStatus;
  readonly capabilityIds: readonly string[];
  readonly source: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GovernedCapabilityResource {
  readonly kind: "capability";
  readonly id: string;
  readonly revision: number;
  readonly displayName: string;
  readonly status: ResourceStatus;
  readonly category: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type GovernedCompositionResource =
  | GovernedRoleResource
  | GovernedProfileResource
  | GovernedSkillResource
  | GovernedToolResource
  | GovernedCapabilityResource;

export interface ResourceValidationFinding {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

const DEFAULT_ROLES: readonly GovernedRoleResource[] = [
  {
    kind: "role",
    id: "role.executor",
    revision: 2,
    displayName: "Executor",
    status: "active",
    capabilityIds: ["agent.inspect", "deployment.sandbox"],
  },
  {
    kind: "role",
    id: "role.planner",
    revision: 1,
    displayName: "Planner",
    status: "active",
    capabilityIds: ["agent.inspect"],
  },
];

const DEFAULT_PROFILES: readonly GovernedProfileResource[] = [
  {
    kind: "profile",
    id: "profile.default",
    revision: 3,
    displayName: "Default",
    status: "active",
    capabilityIds: ["agent.inspect", "deployment.sandbox"],
  },
];

const DEFAULT_SKILLS: readonly GovernedSkillResource[] = [
  {
    kind: "skill",
    id: "skill.analysis",
    revision: 1,
    displayName: "Analysis",
    status: "active",
    capabilityIds: ["agent.inspect"],
    source: "acs-static",
  },
];

const DEFAULT_TOOLS: readonly GovernedToolResource[] = [
  {
    kind: "tool",
    id: "tool.registry",
    revision: 1,
    displayName: "Registry Tool",
    status: "active",
    capabilityIds: ["agent.inspect"],
    source: "acs-static",
  },
];

const DEFAULT_GOVERNED_CAPABILITIES: readonly GovernedCapabilityResource[] = [
  {
    kind: "capability",
    id: "agent.inspect",
    revision: 1,
    displayName: "Agent Inspect",
    status: "active",
    category: "agent",
  },
  {
    kind: "capability",
    id: "deployment.sandbox",
    revision: 1,
    displayName: "Sandbox Deployment",
    status: "active",
    category: "deployment",
  },
  {
    kind: "capability",
    id: "runtime.inspect",
    revision: 1,
    displayName: "Runtime Inspect",
    status: "active",
    category: "runtime",
  },
];

function toCapabilityResource(capability: AcsServiceCapability): GovernedCapabilityResource {
  return {
    kind: "capability",
    id: capability.id,
    revision: 1,
    displayName: capability.name,
    status: "active",
    category: capability.category,
    metadata: {
      level: capability.level,
      requiresTenantApproval: capability.requiresTenantApproval,
      requiresUserLicense: capability.requiresUserLicense,
      requiresGovernanceApproval: capability.requiresGovernanceApproval,
    },
  };
}

export class CompositionResourceRegistry {
  readonly #roles = new Map<string, GovernedRoleResource>();
  readonly #profiles = new Map<string, GovernedProfileResource>();
  readonly #skills = new Map<string, GovernedSkillResource>();
  readonly #tools = new Map<string, GovernedToolResource>();
  readonly #capabilities = new Map<string, GovernedCapabilityResource>();

  constructor(input: {
    readonly roles?: readonly GovernedRoleResource[];
    readonly profiles?: readonly GovernedProfileResource[];
    readonly skills?: readonly GovernedSkillResource[];
    readonly tools?: readonly GovernedToolResource[];
    readonly capabilities?: readonly GovernedCapabilityResource[];
  } = {}) {
    for (const role of input.roles ?? DEFAULT_ROLES) this.#roles.set(role.id, role);
    for (const profile of input.profiles ?? DEFAULT_PROFILES) this.#profiles.set(profile.id, profile);
    for (const skill of input.skills ?? DEFAULT_SKILLS) this.#skills.set(skill.id, skill);
    for (const tool of input.tools ?? DEFAULT_TOOLS) this.#tools.set(tool.id, tool);
    for (const capability of input.capabilities ?? [...DEFAULT_GOVERNED_CAPABILITIES, ...ACS_CAPABILITIES.map(toCapabilityResource)]) this.#capabilities.set(capability.id, capability);
  }

  list(kind: ResourceKind): readonly GovernedCompositionResource[] {
    return this.#sort(this.#map(kind));
  }

  get(kind: ResourceKind, id: string): GovernedCompositionResource {
    const record = this.#map(kind).get(id);
    if (!record) throw new NotFoundError(kind, id);
    return record;
  }

  validateReferences(input: {
    readonly role?: GovernedResourceReference;
    readonly profile?: GovernedResourceReference;
    readonly skills?: readonly GovernedResourceReference[];
    readonly tools?: readonly GovernedResourceReference[];
    readonly capabilities?: readonly string[];
  }): readonly ResourceValidationFinding[] {
    const findings: ResourceValidationFinding[] = [];
    if (input.role) findings.push(...this.#validateRevision("role", input.role));
    if (input.profile) findings.push(...this.#validateRevision("profile", input.profile));
    for (const skill of input.skills ?? []) findings.push(...this.#validateRevision("skill", skill));
    for (const tool of input.tools ?? []) findings.push(...this.#validateRevision("tool", tool));
    for (const capabilityId of input.capabilities ?? []) {
      if (!this.#capabilities.has(capabilityId)) {
        findings.push({
          code: "RESOURCE_CAPABILITY_UNKNOWN",
          severity: "error",
          message: "Unknown capability reference: " + capabilityId,
        });
      }
    }
    return findings;
  }

  #validateRevision(kind: Exclude<ResourceKind, "capability">, reference: GovernedResourceReference): readonly ResourceValidationFinding[] {
    const record = this.#map(kind).get(reference.id);
    if (!record) {
      return [{
        code: "RESOURCE_NOT_FOUND",
        severity: "error",
        message: "Unknown " + kind + " reference: " + reference.id,
      }];
    }
    if (reference.revision && "revision" in record && reference.revision !== record.revision) {
      return [{
        code: "RESOURCE_REVISION_STALE",
        severity: "warning",
        message: kind + " reference " + reference.id + " points to stale revision " + reference.revision + " while current revision is " + record.revision,
      }];
    }
    return [];
  }

  #map(kind: ResourceKind): Map<string, GovernedCompositionResource> {
    switch (kind) {
      case "role": return this.#roles as Map<string, GovernedCompositionResource>;
      case "profile": return this.#profiles as Map<string, GovernedCompositionResource>;
      case "skill": return this.#skills as Map<string, GovernedCompositionResource>;
      case "tool": return this.#tools as Map<string, GovernedCompositionResource>;
      case "capability": return this.#capabilities as Map<string, GovernedCompositionResource>;
    }
  }

  #sort(items: Map<string, GovernedCompositionResource>): readonly GovernedCompositionResource[] {
    return [...items.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}

export class CompositionResourceService {
  readonly #registry: CompositionResourceRegistry;

  constructor(registry = new CompositionResourceRegistry()) {
    this.#registry = registry;
  }

  listRoles(): readonly GovernedRoleResource[] { return this.#registry.list("role") as readonly GovernedRoleResource[]; }
  listProfiles(): readonly GovernedProfileResource[] { return this.#registry.list("profile") as readonly GovernedProfileResource[]; }
  listSkills(): readonly GovernedSkillResource[] { return this.#registry.list("skill") as readonly GovernedSkillResource[]; }
  listTools(): readonly GovernedToolResource[] { return this.#registry.list("tool") as readonly GovernedToolResource[]; }
  listCapabilities(): readonly GovernedCapabilityResource[] { return this.#registry.list("capability") as readonly GovernedCapabilityResource[]; }

  getRole(id: string): GovernedRoleResource { return this.#registry.get("role", id) as GovernedRoleResource; }
  getProfile(id: string): GovernedProfileResource { return this.#registry.get("profile", id) as GovernedProfileResource; }
  getSkill(id: string): GovernedSkillResource { return this.#registry.get("skill", id) as GovernedSkillResource; }
  getTool(id: string): GovernedToolResource { return this.#registry.get("tool", id) as GovernedToolResource; }
  getCapability(id: string): GovernedCapabilityResource { return this.#registry.get("capability", id) as GovernedCapabilityResource; }

  validateReferences(input: Parameters<CompositionResourceRegistry["validateReferences"]>[0]): readonly ResourceValidationFinding[] {
    return this.#registry.validateReferences(input);
  }
}
