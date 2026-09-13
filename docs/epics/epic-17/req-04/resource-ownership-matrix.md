# REQ-04 Resource Ownership Matrix

| Class | Canonical owner | Stable identity | Revision/lifecycle | Agent meaning | Governance/provenance | Historical disposition |
| --- | --- | --- | --- | --- | --- | --- |
| Role | Governed resource owner already used by Native Workforce/Agent | Namespaced resource ID | Exact fingerprinted revisions; active/deprecated/experimental | Optional exact behavioral Role reference | Commit actor/time/reason; admission rejects ineligible current head | `REUSE` proven Role history |
| Capability | ACS capability-definition registry | Namespaced capability ID | Definition revision contract missing | Requirement only; never grant | Governance and target Evidence decide authority/support | `EXTEND` exact definition history |
| Skill | Governed Skill catalog owner | Namespaced Skill ID | Static revision exists; durable lineage missing | Exact bound resource revision | Source/package digest, governance and compatibility required | `ADAPT` into governed history, preserving Skill kind |
| Tool | Governed Tool catalog plus tool policy/invocation owners | Namespaced Tool ID | Static revision exists; durable lineage missing | Exact allowed binding; invocation remains policy-gated | Source/spec digest, allowed operations, approval and Evidence | `EXTEND`; availability and permission remain distinct |
| MCP server definition | Future governed integration/resource owner, coordinated with REQ-05 | Namespaced MCP resource ID | No canonical lifecycle/history proven | Exact server-definition reference only | Transport/tool inventory/source plus security policy; no credentials | `NEW/EXTEND` gap; no endpoint identity shortcut |
| Provider | Existing `ModelProviderRegistry`/provider service | Provider ID | Registration/config lifecycle; health is observation | Route candidate, not Agent-owned resource | Provider source/config and health/capability Evidence | `REUSE` owner, `ADAPT` historical evidence |
| Model | Provider-owned catalog exposed through model service | `providerId/modelId` canonical ID | Availability/capabilities are observed; immutable revision absent | Requirement/preference; admission selects exact eligible model | Provider response/source, observed-at/digest and capability Evidence | `ADAPT` snapshot selection; no duplicate Genome model catalog |
| Legacy capability preset | Governed resource compatibility owner pending canonical naming | Namespaced legacy preset ID | Static integer revision only | Requirement bundle candidate, never presentation or grant | Source and exact definition required if retained | `ADAPT` under explicit legacy/preset kind |

## Common invariants

- Resource identity is qualified by kind/namespace; equal bare IDs across kinds
  are not interchangeable.
- Agent references resources and never owns their registries or copies mutable
  catalog content as canonical truth.
- Exact historical use requires ID, revision, fingerprint and kind.
- A resource reference is not permission, installation, availability,
  compatibility or capability Evidence.
- Deprecation blocks new adoption by default but does not invalidate historical
  reconstruction.
- Provider/model health and runtime availability are timestamped observations,
  not resource lifecycle revisions.
