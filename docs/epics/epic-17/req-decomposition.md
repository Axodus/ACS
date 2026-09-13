# EPIC-17 REQ Decomposition

**Status:** `COMPLETE / PROPOSED FOR NORMATIVE REQ AUTHORING`
**Scope:** dependency planning only
**Accepted REQs:** none
**Implementation authority:** none

## 1. Numbering decision

The accepted Architecture & Boundary Review yields twelve REQ planning units.
The count follows ownership seams and dependency gates. It is independent of
the eleven requests in the original Genome attachment.

Numbering expresses the earliest safe normative order. A higher-numbered REQ
may begin discovery when its listed prerequisites are stable, but it cannot be
accepted before its hard dependencies.

## 2. Planned sequence

| Planned REQ | Normative subject | Canonical owner preserved | Hard dependencies | Planning state |
| --- | --- | --- | --- | --- |
| `EPIC-17-REQ-01` | Canonical Agent Compatibility, Profile, Persona & Presentation Ownership | Native Agent Core and immutable Agent lineage | Accepted Architecture Review | `PLANNED` |
| `EPIC-17-REQ-02` | Effective Configuration Resolution & Historical Snapshot | Agent/Workforce revisions, governance and runtime compilation | `REQ-01` | `PLANNED` |
| `EPIC-17-REQ-03` | Governed Resources, Models, Connector, Connection & Channel Boundaries | Governed catalogs, provider registry, credential/secret owners | `REQ-02` | `PLANNED` |
| `EPIC-17-REQ-04` | Memory Policy, Store, Scope & Deletion Boundary | Agent memory-policy reference, Tenant/governance, Knowledge and Evidence boundaries | `REQ-02` | `PLANNED` |
| `EPIC-17-REQ-05` | Agent Delegation Relationship & Authority Attenuation | Canonical Agents, governance and existing Run/Task/Assignment machinery | `REQ-03`, `REQ-04` | `PLANNED` |
| `EPIC-17-REQ-06` | Automation Domain, Identity, Lifecycle & Target Semantics | New owner to decide; existing Workflow/Run/Workforce references preserved | `REQ-03`, `REQ-05` | `PLANNED` |
| `EPIC-17-REQ-07` | Activation, Trigger, Schedule & Admission Integration | Automation activation plus existing admission, events and idempotency | `REQ-02`, `REQ-03`, `REQ-06` | `PLANNED` |
| `EPIC-17-REQ-08` | Runtime Integration, Recovery & Replaceable Executor Boundary | Runtime compilation, workers, leases, fencing and engine adapters | `REQ-02`, `REQ-03`, `REQ-07` | `PLANNED` |
| `EPIC-17-REQ-09` | Evidence, Provenance, Usage & Cost Correlation | Existing Evidence and Economics authorities | `REQ-04`, `REQ-05`, `REQ-06`, `REQ-07`, `REQ-08` | `PLANNED` |
| `EPIC-17-REQ-10` | Product API, Administration & Control Plane Projections | Existing Product API and Control Plane | `REQ-03`, `REQ-04`, `REQ-05`, `REQ-06`, `REQ-07`, `REQ-09` | `PLANNED` |
| `EPIC-17-REQ-11` | Genome Trait Classification & Provenance Mapping | Canonical Agent lineage and accepted domain references | `REQ-01`, `REQ-03`, `REQ-04`, `REQ-05`, `REQ-06`, `REQ-09` | `PLANNED` |
| `EPIC-17-REQ-12` | Integrated Conformance & Implementation Readiness Gate | All accepted ACS and EPIC-17 owners | `REQ-01` through `REQ-11` | `PLANNED` |

## 3. REQ charters

### EPIC-17-REQ-01 — Canonical Agent Compatibility, Profile, Persona & Presentation Ownership

Freeze the Native-to-legacy Agent compatibility seam and decide where Profile,
Persona, name/role/mission, presentation assets and badges live and revision.
Resolve the current Profile-to-effective-capability contribution explicitly.

- **Primary inputs:** capabilities `E17-C12` through `E17-C21`, `E17-C27` and
  `E17-C28`; gates `E17-BR-G01`, `E17-BR-G02`, `E17-BR-G07`.
- **Required decisions:** canonical write path; compatibility projection;
  Profile revision owner; presentation versus operational truth; Persona
  relationship to `role_ref`, instructions, constraints and policies.
- **Acceptance gate:** one canonical Agent identity/lineage remains; Profile and
  badges grant no capability or authority; historical references are explicit.
- **Non-goals:** third Agent model, parallel lifecycle, provider prompt as
  canonical state, schema or implementation.

### EPIC-17-REQ-02 — Effective Configuration Resolution & Historical Snapshot

Freeze class-specific resolution for presentation, model, capabilities,
skills/tools, credentials, security, governance, runtime, Memory, Evidence and
Cost/budget. Specify the typed effective snapshot boundary and reconstruction
sources without replacing runtime compilation.

- **Primary inputs:** `E17-C11`, `E17-C29`, `E17-C50`, `E17-C58`; precedence
  matrix; gate `E17-BR-G03`.
- **Required decisions:** authority by class; allowed override; attenuation;
  deterministic conflict/rejection; exact Run snapshot; secret-free capture;
  historical reconstruction.
- **Acceptance gate:** no universal override chain; lower layers cannot exceed
  upper authority; the same accepted inputs reconstruct the same effective
  configuration.
- **Non-goals:** new runtime owner, raw credentials in snapshots, implementation
  or migration.

### EPIC-17-REQ-03 — Governed Resources, Models, Connector, Connection & Channel Boundaries

Reconcile capabilities, Skills, Tools, MCP references, models, connections,
credentials, Connector definitions and Channels under their current owners.
Prove any distinct Connector or Channel responsibility before proposing an
additive contract.

- **Primary inputs:** `E17-C03` through `E17-C10`, `E17-C22` through
  `E17-C25`; gate `E17-BR-G06`.
- **Required decisions:** catalog durability/history; requirement versus grant;
  provider-neutral model identity; Connector overlap test; connection and lease
  references; Channel owner and permission relationship.
- **Acceptance gate:** no embedded resource catalog in Agent; no raw secret;
  Connector does not duplicate provider/tool/MCP/connection authority.
- **Non-goals:** provider-owned Agent identity, parallel credential store,
  provider-specific canonical model identity.

### EPIC-17-REQ-04 — Memory Policy, Store, Scope & Deletion Boundary

Define Memory ownership, taxonomy, authority, isolation, retention, deletion,
retrieval provenance and historical capture while preserving existing
`memory_policy_ref` and keeping Memory distinct from Run State, checkpoints,
Knowledge, Evidence and event history.

- **Primary inputs:** `E17-C26`, `E17-C30` through `E17-C35`; gate
  `E17-BR-G04`.
- **Required decisions:** policy owner; store owner candidates; working, Agent,
  Workforce-shared and user/context scope; consent and deletion; retrieval
  evidence; companion ownership outside Workforce Core.
- **Acceptance gate:** no aliasing of Evidence/history as mutable Memory; no
  cross-Tenant or delegated access without explicit authority; deletion and
  reconstruction semantics are compatible.
- **Non-goals:** relabeling checkpoints or Knowledge as Memory, storage schema or
  provider selection.

### EPIC-17-REQ-05 — Agent Delegation Relationship & Authority Attenuation

Freeze delegation as a bounded relationship from one canonical Agent to
another and define its authority, recursion, revision, audit and execution
references.

- **Primary inputs:** `E17-C36` through `E17-C42`.
- **Required decisions:** relation versus companion entity; owning revision;
  authority intersection; resource/credential/Memory attenuation; depth and
  cycle rules; Evidence subject/reference.
- **Acceptance gate:** both endpoints are canonical Agents; delegated execution
  uses existing Run/Task/Assignment; any Workforce incompatibility is a
  blocker; `SubAgent` identity is rejected.
- **Non-goals:** new Agent lifecycle, delegated self-grant, new execution
  machinery.

### EPIC-17-REQ-06 — Automation Domain, Identity, Lifecycle & Target Semantics

Define the Automation ownership boundary before selecting aggregate identity,
revision or persistence. Keep Automation as configuration that targets
canonical Agent, Workforce, Workflow or Run admission references.

- **Primary inputs:** `E17-C43` through `E17-C45`, `E17-C49`, `E17-C56`,
  `E17-C57`; gate `E17-BR-G05`.
- **Required decisions:** owner; identity/revision necessity; lifecycle;
  authority; target references; change concurrency; deletion/disable semantics.
- **Acceptance gate:** Automation remains separate from execution; no Task or
  schedule is redefined; target references are canonical and reconstructable.
- **Non-goals:** OpenClaw-owned Automation, provider-owned schedules, runtime
  queue or Workflow replacement.

### EPIC-17-REQ-07 — Activation, Trigger, Schedule & Admission Integration

Freeze normalized trigger observations, schedule evaluation, activation
identity, idempotency, concurrency, retry, recovery and the exact handoff into
existing admission.

- **Primary inputs:** `E17-C46` through `E17-C48`, `E17-C51` through
  `E17-C55`.
- **Required decisions:** trigger normalization; schedule version/reference;
  activation key; due-work transaction; trigger retry versus execution retry;
  correlation with admitted Run/Workflow targets.
- **Acceptance gate:** `Automation -> Activation -> execution intent -> existing
  admission -> Run/Workflow`; duplicate observations do not duplicate admitted
  work; recovery does not create a second execution recovery system.
- **Non-goals:** scheduled Task identity, direct provider dispatch or bypass of
  governance/admission.

### EPIC-17-REQ-08 — Runtime Integration, Recovery & Replaceable Executor Boundary

Specify how accepted activations and effective configuration enter existing
runtime compilation and how OpenClaw or another executor receives ACS-owned
intent and returns normalized observations.

- **Primary inputs:** `E17-C59`, `E17-C60`, `E17-C65`, `E17-C66`; supporting
  input from `E17-C58` and `E17-C54`.
- **Required decisions:** adapter input/output; execution correlation; lease and
  fencing ownership; restart reconciliation; event/outbox transaction use;
  provider capability rejection.
- **Acceptance gate:** executor replacement does not change canonical state;
  runtime remains owner of execution, leases, fencing and recovery; shared
  PostgreSQL/events/outbox/idempotency are reused.
- **Non-goals:** executor-owned identity, scheduling or Evidence authority; new
  runtime or persistence subsystem.

### EPIC-17-REQ-09 — Evidence, Provenance, Usage & Cost Correlation

Define additive subject and correlation requirements for Profile, Memory,
Delegation, Automation and Activation while preserving existing Evidence,
Usage, Cost and Economics authority.

- **Primary inputs:** `E17-C61` through `E17-C64`, `E17-C69`, `E17-C70`;
  supporting history inputs `E17-C39`, `E17-C53`, `E17-C55`.
- **Required decisions:** subject/reference sufficiency; source and artifact
  provenance; activation-to-Run correlation; cost attribution; retention and
  Tenant visibility; mandatory negative evidence.
- **Acceptance gate:** no new Evidence ledger or economic model; all
  correlations are historically reconstructable and Tenant-isolated; traits or
  presentation cannot claim authority from evidence.
- **Non-goals:** Genome economics, royalties, settlement reinterpretation or
  fabricated performance/reputation.

### EPIC-17-REQ-10 — Product API, Administration & Control Plane Projections

Define additive Product API projections and operator journeys for accepted
EPIC-17 contracts. Administration and Control Plane consume and govern those
contracts; they do not originate Agent, resource, Memory, Delegation,
Automation, runtime, Evidence or Cost truth.

- **Primary inputs:** `E17-C01`, `E17-C02`, `E17-C67`, `E17-C68`.
- **Required decisions:** Global Settings owner by configuration class; API
  resources/commands; authorization and conflict semantics; historical views;
  unavailable/degraded states; operator flow and evidence links.
- **Acceptance gate:** one Product API authority; no frontend domain truth;
  every mutation maps to an accepted owner; no universal Global Settings core.
- **Non-goals:** parallel API, unrelated UI redesign, UI-first domain contracts
  or implementation.

### EPIC-17-REQ-11 — Genome Trait Classification & Provenance Mapping

Define a descriptive trait vocabulary and references over canonical accepted
state. Decide whether any representation is needed only after Agent, resources,
Memory, Delegation, Automation and Evidence boundaries are frozen.

- **Primary inputs:** `E17-C71` through `E17-C76`.
- **Required decisions:** vocabulary owner; trait identity/version; source and
  evidence references; historical view; projection semantics; representation
  compatibility constraints.
- **Acceptance gate:** `Trait != capability`, permission, credential,
  reputation, economic right or NFT; a trait grants no authority and alters no
  operational truth.
- **Non-goals:** DNA schema, inheritance, crossover, mutation, breeding,
  fitness, autonomous evolution, tokenization, marketplace, royalties or
  on-chain storage.

### EPIC-17-REQ-12 — Integrated Conformance & Implementation Readiness Gate

Prove that the accepted REQ contracts compose through the canonical ACS without
creating duplicate truth or weakening authority. Produce the evidence needed
for a later decision on an implementation plan.

- **Primary inputs:** all 76 capability dispositions, all rejected scope and
  accepted `REQ-01` through `REQ-11` contracts.
- **Required decisions:** cross-contract traceability; compatibility strategy;
  persistence/API/migration impact inventory; security and Tenant negative
  cases; historical reconstruction scenarios; incremental IMP slicing.
- **Acceptance gate:** every disposition maps to an accepted owner and contract
  or remains explicitly deferred/rejected; all blocker rules are tested in the
  plan; no IMP authority is inferred.
- **Non-goals:** implementation, migration, provider activation, production
  readiness claim or automatic IMP authorization.

## 4. Normative authoring rule

Each future REQ package must contain its evidence baseline, owner and authority
matrix, contract decisions, compatibility impact, persistence/API/UI impact,
security and Tenant constraints, acceptance gates, blockers, non-goals and
explicit decision state. A REQ may close `ACCEPTED` while retaining
`Implementation authority: NONE`.

`EPIC-17-REQ-01` is the first package eligible for normative authoring. This
decomposition does not authorize that package to change source, tests, schema,
migrations, API, UI, database or production state.
