# Decision Record

## 1. Agenta role

**DECISION** Use Agenta as a UX/workflow reference only.

**CONTEXT** Local evidence shows useful intent-first, contextual configuration, playground, grouped configuration, and versioning patterns.

**OPTIONS** Adopt as dependency; copy concepts wholesale; adapt selected interaction patterns; reject all reference value.

**SELECTED** Adapt selected patterns; preserve ACS-native contracts.

**RATIONALE** ACS architecture index and REQ-05 explicitly prohibit Agenta authority or dependency.

**CONSEQUENCES** No Agenta package, runtime, persistence, identity, or provider integration is introduced.

**STATUS** `FROZEN-v1`

## 2. Agent ownership and lineage

**DECISION** ACS owns canonical Agent identity and immutable revision lineage.

**CONTEXT** REQ-03 and REQ-04 define stable identity, revision fingerprints, append-only history, and PostgreSQL durable ownership.

**OPTIONS** ACS; provider; executor; Agenta; separate lineage service.

**SELECTED** ACS control plane and existing durable state.

**RATIONALE** Preserves identity, tenant scope, governance, provenance, and restart-safe lineage.

**CONSEQUENCES** UI labels and flows must show ACS revisions, not provider versions as identity.

**STATUS** `FROZEN-v1`

## 3. Creation pattern

**DECISION** Use a guided progressive form: identity and purpose first, configuration next, advanced technical binding last.

**CONTEXT** Current form is a dense single surface; current contract supports identity/composition but not instructions or test data.

**OPTIONS** Flat form; wizard; conversational-first; hybrid progressive form.

**SELECTED** Progressive form with optional future intent/test surfaces.

**RATIONALE** Reduces cognitive load without inventing a new persistence model.

**CONSEQUENCES** A first Agent must not require provider, runner, or raw credential decisions when ACS can derive or defer them.

**STATUS** `FROZEN-v1`

## 4. Navigation and dashboard

**DECISION** Agents is the primary object workflow; Dashboard is global attention and health routing.

**CONTEXT** Current shell gives peer status to Agents, Executions, Workers, Financial Operations, Customers, Operations, and Administration.

**OPTIONS** Keep domain peers; Agent-first shell; dashboard-only model.

**SELECTED** Agent-first contextual workflow with global operational domains retained.

**RATIONALE** Matches the primary operator task while preserving cross-Agent operations.

**CONSEQUENCES** Runs, Evidence, and Usage/Cost need both global and Agent-local entry points.

**STATUS** `PARTIAL` pending CTO review of labels and exact shell grouping.

## 5. Revisions

**DECISION** Editing creates an immutable new revision and never mutates historical state.

**CONTEXT** Current UI supports expected-revision updates and revision creation; REQ-04 freezes append-and-advance semantics.

**SELECTED** ACS-native revision workflow with visible current head, provenance, and conflict recovery.

**STATUS** `FROZEN-v1`

## 6. Test/playground

**DECISION** Do not represent a test/playground screen as current ACS capability.

**CONTEXT** Agenta documents a playground, but no ACS-native test command/read model/evidence path was verified.

**SELECTED** Defer to a contract-gated future IMP.

**CONSEQUENCES** Any implementation requires a separate architecture decision for safe execution, inputs, outputs, governance, and evidence.

**STATUS** `DEFERRED`

## 7. Progressive disclosure and governance

**DECISION** Keep identity, status, current revision, readiness summary, and safe next action primary; keep composition internals, runtime diagnostics, audit internals, provider IDs, and financial boundaries contextual/advanced.

**CONTEXT** Current UI exposes all these capabilities, but the operator hierarchy is unclear.

**SELECTED** Contextual disclosure without hiding evidence or weakening enforcement.

**STATUS** `FROZEN-v1`

## Decisions requiring CTO review

- Whether Agent purpose/description belongs in `AgentDefinition`, metadata, or a separate product read model.
- Whether “Validate” can be satisfied initially by composition/readiness only, or requires a new safe test contract.
- Exact top-level labels for Operations, Runs, Evidence, and Usage/Cost after shell implementation planning.

