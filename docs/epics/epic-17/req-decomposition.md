# EPIC-17 REQ Decomposition

**Status:** `COMPLETE / ACCEPTED`
**Baseline:** `08b9355c41c635910bade3700f81c03d36c8db50`
**Scope:** dependency planning only
**Implementation authority:** none

## 1. Execution and commit policy

The twelve REQs follow the accepted dependency graph. Queue presence does not
mean execution readiness. A REQ becomes `READY` only after every hard
dependency is accepted or explicitly resolved by the governing gate.

Each REQ is executed, validated and committed separately. Its dependent REQ
remains blocked until CTO acceptance. The original Genome attachment does not
override this package or supply presumed architecture.

## 2. Accepted sequence

| REQ | Normative subject | Hard dependencies | Current state |
| --- | --- | --- | --- |
| `EPIC-17-REQ-01` | Canonical Agent Seam & Identity Boundary | Accepted Architecture Review and decomposition | `COMPLETE / ACCEPTED` |
| `EPIC-17-REQ-02` | Profile, Persona & Presentation Ownership | `REQ-01` | `COMPLETE / ACCEPTED` |
| `EPIC-17-REQ-03` | Effective Configuration Resolution & Historical Runtime Snapshot | `REQ-01`, `REQ-02` where presentation applies | `COMPLETE / ACCEPTED` |
| `EPIC-17-REQ-04` | Governed Resources, Models, Skills, Tools & MCP Boundary | `REQ-01`, `REQ-03` | `COMPLETE / ACCEPTED` |
| `EPIC-17-REQ-05` | Connector, Connection, Credential & Channel Boundary | `REQ-03`, `REQ-04` | `COMPLETE / ACCEPTED` |
| `EPIC-17-REQ-06` | Memory Policy & Memory Store Boundary | `REQ-01`, `REQ-03`, `REQ-04` | `COMPLETE / ACCEPTED` |
| `EPIC-17-REQ-07` | Delegation & Agent-to-Agent Authority Boundary | `REQ-01`, `REQ-03`, `REQ-04`, `REQ-05`, `REQ-06` | `COMPLETE / ACCEPTED` |
| `EPIC-17-REQ-08` | Automation Domain Identity & Revision Boundary | `REQ-01`, `REQ-03`, `REQ-04`, `REQ-07` | `COMPLETE / ACCEPTED` |
| `EPIC-17-REQ-09` | Activation, Trigger, Schedule & Runtime Admission Boundary | `REQ-03`, `REQ-07`, `REQ-08` | `COMPLETE / READY FOR CTO ACCEPTANCE` |
| `EPIC-17-REQ-10` | Product API, Administration & Control Plane Projection | `REQ-02` through `REQ-09` | `PLANNED` |
| `EPIC-17-REQ-11` | Genome Traits, Presentation Assets & Verification Semantics | `REQ-01` through `REQ-04`, `REQ-10` | `PLANNED` |
| `EPIC-17-REQ-12` | Cross-Domain Conformance, Closure & IMP Readiness Plan | `REQ-01` through `REQ-11` accepted or explicitly blocked/deferred | `PLANNED` |

## 3. Normative charters

### EPIC-17-REQ-01 — Canonical Agent Seam & Identity Boundary

Resolve the seam between Native/current Agent and legacy representations.
Freeze one canonical identity, lifecycle, immutable revision and lineage
authority. Classify every other representation as projection, adapter, legacy
compatibility surface or deprecation candidate.

- **Required outputs:** ownership decision; seam map; compatibility rules;
  migration/deprecation candidates; proposed contract deltas; blockers/ADRs;
  IMP acceptance criteria.
- **Acceptance:** one unambiguous canonical Agent and revision authority; every
  relevant legacy representation has a destination; no `GenomeAgent`,
  `SubAgent` or provider/executor identity becomes canonical.
- **Authority:** documentation only; no implementation, migration or schema.

### EPIC-17-REQ-02 — Profile, Persona & Presentation Ownership

Resolve Profile, Persona and presentation without turning display state into
operational capability. Separate identity, behavioral semantics, presentation
and permission. Decide Profile owner/revision, AgentRevision content,
presentation resources, history/provenance and the Profile capability naming
conflict.

- **Requires:** accepted `REQ-01`.
- **Acceptance:** ownership and deltas are frozen; Persona remains subordinate
  to canonical Agent revision; presentation grants no capability or authority.

### EPIC-17-REQ-03 — Effective Configuration Resolution & Historical Runtime Snapshot

Define class-specific global, Agent, Workforce and operation authority for
presentation, model, capabilities, resources, credentials, security,
governance, runtime, Memory, Evidence and Cost/budget. Freeze deterministic
resolution, attenuation, immutable execution snapshot, provenance,
fingerprinting, reconstruction and failure semantics.

- **Requires:** accepted `REQ-01`; accepted `REQ-02` where presentation or
  Persona ownership affects resolution.
- **Acceptance:** no universal override chain; lower layers cannot exceed upper
  authority; runtime/Run are not redefined.

### EPIC-17-REQ-04 — Governed Resources, Models, Skills, Tools & MCP Boundary

Freeze canonical owners, stable identity, revision semantics, Agent references,
governance, provenance, compatibility selection and history for models, Skills,
Tools, MCP and capability requirements.

- **Requires:** accepted `REQ-01` and `REQ-03`.
- **Acceptance:** Agent references resources and does not own provider
  registries; Skill is not Profile; Tool availability is not permission; MCP
  endpoint is not provider identity.

### EPIC-17-REQ-05 — Connector, Connection, Credential & Channel Boundary

Separate integration definition, configured Connection, credential/secret
authority and interaction Channel. Test whether Connector needs a distinct
contract and freeze Channel owner, Tenant/authorization boundary,
lifecycle/revision expectations and relation to governed resources.

- **Requires:** accepted `REQ-03` and `REQ-04`.
- **Acceptance:** ownership is explicit; raw credentials never enter Agent
  history or Product API; insufficient evidence may defer representation but
  cannot leave boundary ambiguity.

### EPIC-17-REQ-06 — Memory Policy & Memory Store Boundary

Define Memory policy and store authority, Agent/Workforce/operation influence,
read/write permission, retention, deletion, reconstruction, provenance and
provider independence. Memory remains distinct from Run State, checkpoints,
Knowledge, Evidence and Agent identity.

- **Requires:** accepted `REQ-01`, `REQ-03` and `REQ-04`.
- **Acceptance:** canonical boundary and contract candidates are explicit; no
  database/store is chosen without demonstrated need.

### EPIC-17-REQ-07 — Delegation & Agent-to-Agent Authority Boundary

Define bounded authority from canonical Agent A to canonical Agent B, including
scope, attenuation, depth, cycle prevention, expiry, revocation, chain,
provenance, Workforce interaction, admission and Evidence.

- **Requires:** accepted `REQ-01`, `REQ-03`, `REQ-04`, `REQ-05` and `REQ-06`.
- **Acceptance:** authority boundary and representation candidate are explicit;
  delegated execution uses existing Run/Task/Assignment; distinct `SubAgent`
  identity is rejected.
- **Blocker:** any incompatible Workforce, membership, admission, Assignment,
  Run, Task or Attempt change requires architecture escalation.

### EPIC-17-REQ-08 — Automation Domain Identity & Revision Boundary

Define the minimum ACS Automation domain, testing the need for stable identity,
lifecycle, revision, owner, Tenant scope, target, configuration, enable/disable,
history, provenance, Evidence and Cost correlation. An independent aggregate
must be proved rather than assumed.

- **Requires:** accepted `REQ-01`, `REQ-03`, `REQ-04` and `REQ-07`.
- **Acceptance:** Automation remains separate from Run, Workflow, scheduler and
  executor; alternatives and rejected ownership models are recorded.

### EPIC-17-REQ-09 — Activation, Trigger, Schedule & Runtime Admission Boundary

Define durable idempotent Activation from triggers, schedules, external events
and manual requests through execution intent into existing admission. Cover
deduplication, retry, missed execution, cancellation, recovery, snapshot,
Evidence and Usage/Cost correlation.

```text
Automation -> Activation -> execution intent
           -> existing admission -> Run / Workflow target
```

- **Requires:** accepted `REQ-03`, `REQ-07` and `REQ-08`.
- **Acceptance:** existing Run, Workflow, Task, Assignment, Attempt, workers,
  leases, fencing and recovery remain authoritative. OpenClaw receives ACS
  intent and returns normalized observations only.

### EPIC-17-REQ-10 — Product API, Administration & Control Plane Projection

Define future projections for accepted Agent/Profile, resources, Connector,
Connection, Channel, Memory, Delegation, Automation, configuration and history
boundaries. Resolve Global Settings ownership by configuration class.

- **Requires:** accepted `REQ-02` through `REQ-09`.
- **Acceptance:** existing Product API remains the application boundary;
  Control Plane follows `Flow -> Module -> Screen`; no frontend truth, parallel
  API or convenience Global Settings core.

### EPIC-17-REQ-11 — Genome Traits, Presentation Assets & Verification Semantics

Define the minimum descriptive Genome layer over canonical ACS state. Freeze
trait identity/classification, references, compatibility, provenance,
historical resolution, Agent/Profile relations, assets, badges and
Evidence-backed verification.

```text
Trait != capability
Trait != permission
Trait != credential
Trait != reputation
Trait != economic right
Trait != NFT
```

- **Requires:** accepted `REQ-01` through `REQ-04` and `REQ-10`.
- **Acceptance:** Genome remains metadata/classification; no inheritance,
  mutation, breeding, NFT, marketplace, royalties or Genome economics.

### EPIC-17-REQ-12 — Cross-Domain Conformance, Closure & IMP Readiness Plan

Reconcile canonical ownership, provider independence, persistence, historical
reconstruction, security and all 76 dispositions across accepted REQs. Only
then produce a dependency-ordered candidate IMP plan, test strategy,
PostgreSQL/migration/rollback constraints, conformance gates and blockers.

- **Requires:** `REQ-01` through `REQ-11` accepted or explicitly
  blocked/deferred.
- **Acceptance:** 76/76 dispositions reconciled; no parallel architecture;
  blockers and material CEO decisions explicit; candidate IMP sequence ready
  for a separate CTO gate.
- **Prohibited result:** `IMPLEMENTATION AUTHORIZED`.

## 4. Common REQ package requirements

Every REQ package records repository evidence, canonical owner, boundary and
contract decisions, compatibility impact, persistence/API/UI impact, security
and Tenant constraints, acceptance gates, blockers, non-goals and decision
state. Every package closes with:

```text
Implementation authority: NONE
```
