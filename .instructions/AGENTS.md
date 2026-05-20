# ACS Agents

This file is legacy-compatible. Current level-based agent roles are defined in `ACS_AGENT_ROLES.md`.

ACS agents must now be interpreted through Core, Service, and Product consumption levels.

# Purpose

Agents are bounded operational cognitive systems.

Agents coordinate:
- workflows
- automation
- execution assistance
- monitoring
- orchestration

Agents are not sovereign authorities.

---

# Current Agents

## Axodus CORE Agents

These agents are exclusive to the Axodus ecosystem.

They must not be packaged, exposed, or consumed as standalone client products unless a future governance decision explicitly changes this boundary.

### Trinity
Operational execution and financial coordination.

Trinity is an Axodus CORE agent.

Trinity is the only CORE branch currently allowed to spawn client-facing sub-agents.

Allowed sub-agent scope:
- personal trading agents
- market-operation agents
- personal MCP Trading operators

Rules:
- spawned agents must remain sub-agents of Trinity
- spawned agents must not inherit unrestricted Trinity authority
- spawned agents must remain bounded to trading/market scopes
- spawned agents must expose telemetry and execution receipts
- treasury or wallet actions remain governance/permission constrained

OpenClaw note:
`main` and `trinity` refer to the same conceptual Trinity agent. The split was caused by OpenClaw configuration drift and must be normalized as `trinity` inside ACS.

---

### Morpheus
Strategic reasoning and governance alignment.

Morpheus is an Axodus CORE agent.

Morpheus is exclusive to the Axodus ecosystem and must not spawn client product agents by default.

---

### Agent Smith
Adversarial validation and stress testing.

Agent Smith is an Axodus CORE agent.

Smith is exclusive to the Axodus ecosystem and must not spawn client product agents by default.

---

## Product Agents

### RedHat Dev
Development orchestration and engineering execution.

RedHat Dev is a product agent, but currently exclusive to the Axodus owner/operator context:
- owner: Axodus Head Dev Senior
- audience: private owner use
- role: development orchestration, implementation, validation, and MCP-aware engineering execution

RedHat Dev is not a generic public/client product in the current ACS boundary.

---

## Client-Dedicated Agents

### Mariana
Client-dedicated personal workflow and operational assistance.

Mariana is a product/client agent currently being developed exclusively for a specific client deployment.

Rules:
- client isolation is mandatory
- no implicit access to Axodus CORE authority
- no cross-client memory or workflow leakage
- no Trinity/Morpheus/Smith authority inheritance

---

# Agent Rules

Agents must:
- remain observable
- remain permission-constrained
- expose telemetry
- expose execution logs
- declare their agent class and consumption boundary
- declare whether sub-agent spawning is allowed

---

# Forbidden Behaviors

Agents must never:
- bypass governance
- bypass treasury permissions
- self-escalate authority
- execute hidden workflows
- mutate permissions autonomously
- blur CORE, owner-product, and client-product boundaries
- spawn sub-agents unless explicitly allowed by ACS policy

---

# Agent Lifecycle

## Creation
- identity definition
- permission assignment
- telemetry configuration

---

## Execution
- bounded workflow execution
- telemetry generation
- execution logging

---

## Shutdown
- finalize execution state
- archive logs
- preserve auditability
