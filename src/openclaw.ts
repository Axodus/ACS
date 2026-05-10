import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentDefinition, PermissionScope } from "./types.js";

export interface OpenClawDiscoveryOptions {
  readonly rootPath: string;
}

const AGENT_ALIASES: Readonly<Record<string, string>> = {
  main: "trinity",
};

const KNOWN_AGENT_PROFILES: Readonly<Record<string, Pick<
  AgentDefinition,
  "name" | "role" | "agentClass" | "audience" | "exclusiveTo" | "canSpawnSubAgents" | "subAgentScope"
> & {
  readonly permissions: readonly PermissionScope[];
}>> = {
  redhat: {
    name: "RedHat Dev",
    role: "development orchestration and engineering execution",
    agentClass: "owner_product",
    audience: "owner_private",
    exclusiveTo: "Axodus Head Dev Senior",
    canSpawnSubAgents: false,
    permissions: [
      { name: "workflow.plan" },
      { name: "code.generate" },
      { name: "code.review" },
      { name: "test.run" },
      { name: "mcp.coordinate" },
    ],
  },
  morpheus: {
    name: "Morpheus",
    role: "strategic reasoning and governance alignment",
    agentClass: "axodus_core",
    audience: "axodus_ecosystem",
    exclusiveTo: "Axodus ecosystem",
    canSpawnSubAgents: false,
    permissions: [{ name: "workflow.plan" }, { name: "governance.review" }],
  },
  agentsmith: {
    name: "Agent Smith",
    role: "adversarial validation and stress testing",
    agentClass: "axodus_core",
    audience: "axodus_ecosystem",
    exclusiveTo: "Axodus ecosystem",
    canSpawnSubAgents: false,
    permissions: [{ name: "code.review" }, { name: "security.review" }],
  },
  mariana: {
    name: "Mariana",
    role: "client-dedicated personal workflow and operational assistance",
    agentClass: "client_product",
    audience: "client_dedicated",
    exclusiveTo: "dedicated client deployment",
    canSpawnSubAgents: false,
    permissions: [{ name: "workflow.plan" }],
  },
  trinity: {
    name: "Trinity",
    role: "operational execution and financial coordination",
    agentClass: "axodus_core",
    audience: "axodus_ecosystem",
    exclusiveTo: "Axodus ecosystem",
    canSpawnSubAgents: true,
    subAgentScope: "Trading-only client sub-agents for personal market/trading operations and MCP Trading surfaces.",
    permissions: [{ name: "workflow.plan" }, { name: "treasury.review" }, { name: "subagents.spawn.trading" }],
  },
};

export function discoverOpenClawAgents(options: OpenClawDiscoveryOptions): readonly AgentDefinition[] {
  if (!existsSync(options.rootPath)) {
    return [];
  }

  const discovered = readdirSync(options.rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => toAgentDefinition(options.rootPath, entry.name));

  return [...mergeAgentAliases(discovered)].sort((left, right) => left.id.localeCompare(right.id));
}

function toAgentDefinition(rootPath: string, directoryName: string): AgentDefinition {
  const canonicalId = AGENT_ALIASES[directoryName] ?? directoryName;
  const profile = KNOWN_AGENT_PROFILES[canonicalId];
  const manifestPath = join(rootPath, directoryName, "AGENTS.md");
  const manifestTitle = readManifestTitle(manifestPath);

  return {
    id: canonicalId,
    sourceIds: [directoryName],
    name: profile?.name ?? manifestTitle ?? directoryName,
    role: profile?.role ?? "openclaw local agent",
    agentClass: profile?.agentClass ?? "unknown",
    audience: profile?.audience ?? "unknown",
    ...(profile?.exclusiveTo ? { exclusiveTo: profile.exclusiveTo } : {}),
    canSpawnSubAgents: profile?.canSpawnSubAgents ?? false,
    ...(profile?.subAgentScope ? { subAgentScope: profile.subAgentScope } : {}),
    status: "active",
    telemetryEnabled: true,
    permissions: profile?.permissions ?? [{ name: "workflow.plan" }],
  };
}

function mergeAgentAliases(agents: readonly AgentDefinition[]): readonly AgentDefinition[] {
  const merged = new Map<string, AgentDefinition>();

  for (const agent of agents) {
    const existing = merged.get(agent.id);
    if (!existing) {
      merged.set(agent.id, agent);
      continue;
    }

    merged.set(agent.id, {
      ...existing,
      sourceIds: uniqueStrings([...(existing.sourceIds ?? [existing.id]), ...(agent.sourceIds ?? [agent.id])]),
      permissions: mergePermissions(existing.permissions, agent.permissions),
    });
  }

  return [...merged.values()];
}

function mergePermissions(left: readonly PermissionScope[], right: readonly PermissionScope[]): readonly PermissionScope[] {
  const byName = new Map<string, PermissionScope>();

  for (const permission of [...left, ...right]) {
    byName.set(permission.name, permission);
  }

  return [...byName.values()];
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function readManifestTitle(manifestPath: string): string | undefined {
  if (!existsSync(manifestPath)) {
    return undefined;
  }

  const firstHeading = readFileSync(manifestPath, "utf8")
    .split("\n")
    .find((line) => line.startsWith("# "));

  return firstHeading?.replace(/^#\s+/, "").trim();
}
