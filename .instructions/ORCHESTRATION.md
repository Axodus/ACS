# ACS Orchestration

# Purpose

The orchestration layer coordinates:
- workflows
- multi-agent execution
- event routing
- inference execution
- provider coordination

## Current and proposed scope

The implemented ACS orchestration baseline includes deterministic local
workflow sequencing, provider-capability matching, receipts, telemetry, and
explicit policy boundaries. It is not yet a canonical workforce model with
revisioned workforce identities, DAG branches and joins, provider-neutral
checkpoints, or cross-provider replay semantics.

Those capabilities are proposed for discovery in
[`docs/architecture/acs-v2/`](../docs/architecture/acs-v2/). The proposed
`IOrchestrator`-like boundary is an evaluation target, not an implemented
provider interface or authorization to integrate Eigent, CAMEL, Agenta, Codex,
OpenClaw, or any other external system.

Orchestration is operational infrastructure.

---

# Core Principles

Orchestration must remain:
- observable
- deterministic
- auditable
- bounded
- governance-aware

---

# Workflow Coordination

Workflows coordinate:
- task sequencing
- execution dependencies
- event propagation
- execution lifecycle

---

# Multi-Agent Coordination

Multi-agent systems must:
- expose execution ownership
- expose telemetry
- expose workflow state
- expose permission boundaries

---

# Provider Coordination

Provider coordination includes:
- inference routing
- capability matching
- telemetry aggregation
- billing coordination

---

# Governance Integration

Governance may:
- restrict orchestration flows
- restrict execution permissions
- restrict provider participation

Orchestration must remain governance-compatible.

---

# Non-Negotiables

- no hidden orchestration
- no opaque workflow routing
- no uncontrolled autonomy
- no hidden provider execution
- no unbounded execution chains
