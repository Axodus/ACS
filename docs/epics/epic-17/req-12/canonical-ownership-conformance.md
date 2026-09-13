# REQ-12 Canonical Ownership Conformance

## Core authority audit

| Canonical concern | Exactly one accepted authority | EPIC-17 extension rule | Parallel owner result |
| --- | --- | --- | --- |
| Agent identity, lifecycle, revisions and lineage | Native Agent Core: `AgentDefinitionV2`, `AgentRevisionV2`, Native repositories and PostgreSQL lineage | Profile, Delegation, Automation and Genome reference exact canonical Agents | `NONE` |
| Workforce definition, revision, slots and membership | Workforce v1 owner | Memory uses a companion reference; Delegation does not become membership | `NONE` |
| Workflow definition/revision | Existing Workflow/Coordination owner | Automation targets exact supported Workflow references through admission | `NONE` |
| Run and Task lifecycle | Existing Run/Task owner | Activation adds causal correlation only | `NONE` |
| Assignment and Attempt | Existing coordination/runtime owners | Delegation/Automation do not allocate or retry work directly | `NONE` |
| Runtime intent, workers, leases, fencing and recovery | Existing Runtime owner; `RuntimeExecutionIntentV2` remains post-admission/post-assignment | Effective snapshot and Activation correlation are additive inputs/references | `NONE` |
| Evidence, Source, Artifact, Decision, Approval and Trace | Existing Evidence/provenance authority | New subjects and references may be added; no domain-local proof ledger | `NONE` |
| Usage, Cost and Economics | Existing Accounting/Economics authority | Automation/Activation/Genome carry correlation or derived views only | `NONE` |
| Product API | Existing versioned Product API | New projections and owner-routed command adapters remain under one boundary | `NONE` |
| PostgreSQL, transactions, events, outbox and idempotency | Existing shared-state/Native persistence authority | Future durable domains reuse its accepted transaction patterns | `NONE` |
| Governance authority and policy | Existing Governance/Tenant authority | Memory policy, Delegation attenuation, verification and settings preserve this owner | `NONE` |

## New logical domains without competing ownership

| Logical boundary | Accepted owner scope | Explicit exclusions |
| --- | --- | --- |
| Profile | Derived Agent presentation projection | No identity, aggregate, authority or independent revision stream |
| Persona | Behavioral semantics inside or exactly referenced by Agent revision | No provider prompt or independent Persona core |
| Connector/Channel | Integration definition/interaction companion boundaries where existing provider/tool/MCP owners are insufficient | No credential or authorization ownership by reference |
| Memory | Governance owns policy; Memory companion domain owns record/store semantics | No Run State, Checkpoint, Knowledge, Evidence or Workforce-core ownership |
| Delegation | Logical bounded grant/attenuation between canonical Agents | No authority creation, credential/Memory transfer or SubAgent identity |
| Automation | Stable configured execution intent and immutable authored history | No Trigger occurrence, scheduler, Run, Workflow or executor ownership |
| Activation | Durable causal occurrence and idempotent admission handoff | No Task/Assignment/Attempt/runtime recovery ownership |
| Administration/Global Settings | Workflow/index projections routed to class owners | No canonical state, universal override or transversal settings core |
| Genome | Descriptive vocabulary/assertions and references | No Agent lineage, capability, authority, reputation or economics |

## Incompatibility guard

Any future plan that needs a competing owner or an incompatible change to the
core table above fails this conformance result and requires architecture
escalation before implementation. No accepted REQ currently requires such a
change.

Provider and executor adapters remain replaceable. OpenClaw, Codex or another
runtime cannot own Agent identity, Automation/schedule truth, admission,
canonical history, Evidence or Cost.
