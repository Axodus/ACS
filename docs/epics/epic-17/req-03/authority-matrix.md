# REQ-03 Configuration Authority Matrix

`global` means the owning platform/Tenant catalog, policy or service. It does
not imply a Global Settings aggregate.

| Class | Global owner | Agent input | Workforce input | Operation/admission input | Override rule | Attenuation only | Frozen for execution | Reconstruction source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Presentation | Canonical Agent source; Product API owns projection contract | Exact Agent revision plus eligible head/presentation state | Context/labels only | May choose view/rendering without changing source claims | Layout may vary; source semantics cannot be overridden | No authority exists to expand | Capture only if presentation affects retained input/output: source refs, projection version and digest | Agent revision, head/lifecycle source or explicit unavailable marker, projection/artifact provenance |
| Model preference | Provider/model catalogs and governance own identity, availability and eligibility | Provider routes and model requirements/preferences | None; Workforce Core forbids provider/runtime fields | Select one eligible route/model supported by target and policy | Selection within allowed candidates; no invented fallback | Yes | Exact provider/model/target/credential refs, requirements, capability evidence and decision | Agent revision, catalog revisions, binding, policy decisions and provider/target evidence |
| Capability requirements | Capability catalog defines meaning; governance/target Evidence proves grants/support | Declares requirements, never grants | Slots may add requirements | Task/operation may add requirements and selects evidence-bearing target | Requirements combine by union; satisfaction requires evidence for all | Yes | Exact requirement refs, source class and evidence refs | Agent/Workforce revisions, operation request, binding and Evidence |
| Skill/tool binding | Governed resource catalogs own exact resources and history | Binds exact allowed revisions | No Skill/Tool ownership; may add capability constraints | Selects subset needed for task and permitted invocation | Cannot add outside Agent binding/governance; selection narrows | Yes | Exact selected/allowed resource refs, policy decisions and invocation limits | Agent revision, catalog history, execution context and tool Evidence |
| Credential binding | Tenant Connection/secret/credential services own metadata and secret versions | References eligible opaque connections | None; Workforce Core forbids credentials | Selects connection and obtains purpose/scope-limited lease | May choose/narrow an authorized connection; never reveal or broaden | Yes | Opaque connection/secret version, purpose, lease policy/decision; never secret value | Agent ref, connection metadata/history, policy decision and provider audit |
| Security constraints | Platform/Tenant security and authority policy define maximum | Constraints and permission/approval refs narrow | Authority/participation constraints narrow | Adds task constraints and evaluates authority/approval | Intersection/strictest applicable constraint; conflict rejects | Yes | Every applied constraint/policy ref, authority context, decision and approval | Agent/Workforce revisions, governance records, binding/context and Evidence |
| Governance policies | Governance policy owners | Exact permission/approval refs | Membership/authority/audit refs | Evaluates decisions in request context | Merge only by policy-kind semantics; mandatory policies cannot be suppressed | Yes | PolicySnapshotRefs, decision-context hashes, outcomes and approvals | Policy snapshots, definition revisions, Decision/Approval/Evidence records |
| Runtime constraints | Engine, harness, executor, target and runtime policy owners | Preferences/requirements only | None; Workforce Core forbids runtime fields | Selects eligible engine/harness/executor/target and execution policy | Selection within intersection of requirements, health evidence and policy | Yes | Exact refs, modes, limits, retry/cancel/deadline policy and selection evidence | Agent revision, binding, intent, request, checkpoints and observations |
| Memory policy | Owner absent; REQ-06 must establish policy/store boundary | Exact `memory_policy_ref` already exists | No core field; future shared Memory is companion state | May request narrower scope/read/write/retention only after policy exists | No resolution while required owner/ref is unavailable; no permissive default | Yes | Exact policy ref/snapshot, allowed scope, retrieval/write permissions and provenance requirements; no Memory contents by default | Agent revision plus future policy/store records and retrieval Evidence |
| Evidence policy | Governance/Evidence owners define mandatory proof | Audit policy and evaluation refs | Workforce audit policy | May require additional Evidence and emits outcomes | Required sets combine; operation may increase but not suppress | Yes | Exact policies, required evidence set, emitted refs and gaps | Definition revisions, policy snapshots, events and Evidence ledger |
| Cost/budget policy | Economics/governance own pricing, budget and settlement | Exact cost/budget/optional settlement refs | No Workforce economic override | Selects/reserves within authority and records actual Usage/Cost | Budget and settlement authority can only narrow; pricing truth is owner-supplied | Yes | Policy snapshots, quote/reservation/authorization refs, limits and attribution dimensions | Agent revision, economic store, binding, Usage/Cost and Evidence |

## Cross-class rules

- A preference is not a grant, a requirement is not evidence, and a reference
  is not an authorization decision.
- More specific operation context may select or narrow; it cannot exceed the
  owning domain's authority.
- Configuration classes keep their own merge semantics. Union is valid for
  requirements, intersection for authority, ordered eligible selection for
  preferences, and mandatory accumulation for Evidence.
- Unknown or ownerless required classes fail closed. Optional absent classes
  are recorded as not applicable, not synthesized from unrelated metadata.
- Workforce contributes only its accepted fields. The resolver cannot add
  provider, runtime, credential, Memory or economic fields to Workforce Core.
