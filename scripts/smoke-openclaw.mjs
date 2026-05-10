import { createAcsRuntime } from "../dist/index.js";

const runtime = createAcsRuntime({ workspaceRoot: process.cwd() });

console.log(JSON.stringify({
  openClawRoot: runtime.openClawRoot,
  agents: runtime.agents.list().map((agent) => ({
    id: agent.id,
    sourceIds: agent.sourceIds,
    name: agent.name,
    role: agent.role,
    agentClass: agent.agentClass,
    audience: agent.audience,
    exclusiveTo: agent.exclusiveTo,
    canSpawnSubAgents: agent.canSpawnSubAgents,
    subAgentScope: agent.subAgentScope,
    permissions: agent.permissions.map((permission) => permission.name),
  })),
  providers: runtime.providers.list().map((provider) => ({
    id: provider.id,
    capabilities: provider.capabilities.map((capability) => capability.name),
  })),
  receiptPath: runtime.receiptPath,
}, null, 2));
