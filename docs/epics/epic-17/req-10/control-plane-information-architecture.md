# REQ-10 Control Plane Information Architecture

## Navigation invariant

The Control Plane preserves the accepted hierarchy:

```text
Flow
  -> Module
  -> Screen
  -> Product API projection or governed action
```

A flow expresses an operator objective. A module groups the canonical domains
needed for that objective. A screen presents source-faithful projections and
submits commands through Product API. Screen state never becomes canonical
domain state.

Exact route names, modules, component structure and visual design remain future
implementation decisions.

## Candidate flow placement

| Operator objective | Candidate flow/module context | Canonical drill-down |
| --- | --- | --- |
| Understand or change an Agent | Agent lifecycle and composition | Agent identity/revision, Profile projection, Persona and governed references |
| Inspect available capabilities | Composition/resources | Kind-specific Role, Skill, Tool, Capability, MCP and Model owners |
| Configure an integration | Administration or Operations, subject to the accepted IA | Connector definition, Connection, credential reference and Channel |
| Govern Memory use | Agent/Workforce context plus Administration policy | Memory Policy owner, scope, store reference and Evidence |
| Grant bounded Agent-to-Agent authority | Agent/Governance | Delegation Grant, authority basis, chain and canonical Agents |
| Configure recurring/event-driven intent | Automation | Automation identity, revision, lifecycle and configured targets |
| Diagnose an occurrence or execution | Automation, Operations and Evidence | Observation, Activation, admission, Assignment, Run and Evidence |
| Explain effective configuration | Agent or execution context | REQ-03 snapshot, exact source references and resolution findings |
| Inspect settings | System/Administration according to final IA | Class-owned setting entry and its canonical owner |

These placements describe user journeys and drill direction. They do not assign
domain ownership to a module or screen.

## Cross-domain navigation

Summary cards and dashboards may combine data from multiple projections only
as read-only composition. Every cross-domain link must retain:

- canonical kind and stable identity;
- Tenant/scope;
- exact revision, fingerprint or immutable observation when applicable;
- correlation or causation reference for execution history;
- source owner and availability/freshness state.

A screen must navigate to the owning projection rather than copy editable
canonical fields into a local aggregate.

## Required interaction states

Every future screen must distinguish, as applicable:

```text
loading
empty
ready
warning
blocked
error
pending
recovering
stale
unavailable
```

`empty`, `unavailable`, `unauthorized`, `redacted` and `not yet implemented`
are different states. Pending asynchronous commands retain the request,
correlation and owner receipt needed for recovery.

## Existing IA divergence

EPIC-14 records Administration as a child of System, while the current
standalone Control Plane exposes Administration as a primary navigation domain.
REQ-10 does not choose between those structures and does not authorize a
navigation redesign.

Before a REQ-10 implementation plan can assign routes or modules, the latest
accepted IA authority must explicitly reconcile this divergence. Until then,
candidate placements involving Administration remain informational and the
existing surface remains unchanged.
