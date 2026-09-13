# REQ-02 Persona and Behavioral Ownership

**Decision state:** `CTO ACCEPTED`

## 1. Persona decision

Persona is a subordinate semantic view of canonical Agent behavior. It does not
have a separate identity, owner, lifecycle, principal, lineage or execution
authority.

```text
Persona(agent revision)
  = role_ref
  + instructions
  + constraints
  + relevant governance/policy references
```

The existing `AgentRevisionV2` owns these inputs and fingerprints them.
Therefore Persona changes create a new canonical Agent revision through the
accepted Agent lineage. A provider prompt, OpenClaw profile or UI form is a
compiled/projection representation and cannot become Persona truth.

## 2. Behavioral allocation

| Concern | Owner | Rule |
| --- | --- | --- |
| Stable Agent identity | `AgentDefinitionV2.agent_id` | Persona cannot replace or alias identity. |
| Current Agent name | `AgentDefinitionV2.name` | Display/head state; not behavioral authority. |
| Reusable role semantics | Exact `role_ref` governed resource | Agent revision adopts a reference; later Role changes do not silently propagate. |
| Custom instructions | `AgentRevisionV2.instructions` | Reused as a canonical fingerprinted behavioral component. |
| Constraints | `AgentRevisionV2.constraints` plus governance refs | Constraints narrow behavior and cannot be weakened by presentation. |
| Resource/model preferences | Existing exact refs in Agent revision | Not Persona-owned; resolved by their owners and later configuration REQs. |
| Mission/persona label or summary | Derived or future structured Agent revision content | Descriptive view; it does not become identity or grant authority. |
| Provider system prompt | Runtime compilation output | Replaceable materialization with source provenance, not canonical behavior. |

## 3. Structured Persona extension

The repository proves enough behavior to avoid creating a Persona entity, but
does not prove that free-form instructions alone are sufficient for every
future use. A later additive Agent contract may introduce typed behavioral
facets only when they:

- remain inside or are exactly referenced by `AgentRevisionV2`;
- participate in the Agent revision fingerprint;
- identify their source and compiler version when materialized;
- cannot carry credentials, authority grants or runtime observations;
- cannot update without a new Agent revision;
- do not duplicate Role, constraints, governance, resources or model owners.

This is an `EXTEND` candidate, not an approved field set or schema.

## 4. Compilation rule

```text
canonical AgentRevisionV2 behavior
  + accepted effective configuration
  -> deterministic compiled provider/executor instructions
  -> replaceable executor input
```

The compiled form must retain the exact Agent revision reference and compiler
provenance. Reverse-importing provider text as canonical Persona state requires
an explicit governed authoring/adoption operation and a new Agent revision; it
cannot occur implicitly.

## 5. Prohibited meanings

Persona is not:

- a second Agent or `SubAgent`;
- an authentication principal or delegated actor;
- a Profile presentation aggregate;
- a capability, permission or credential bundle;
- a provider/executor account;
- mutable runtime state, Memory or Evidence;
- a Genome trait authority.
