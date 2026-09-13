# EPIC-17-REQ-11 — Genome Traits, Presentation Assets & Verification Semantics

**Status:** `COMPLETE / READY FOR CTO ACCEPTANCE`
**Decision state:** `PROPOSED`
**Baseline:** `75758a752bb8ab04f1402bcd7ce9039fb623a673`
**Dependencies:** `REQ-01` through `REQ-04` and `REQ-10 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none
**Migration authority:** none
**Public contract changes:** none
**Database changes:** none

## Boundary

```text
canonical ACS subject and source state
        │ exact references
        ▼
Genome classification boundary
  ├── versioned descriptive vocabulary
  └── provenance-bearing trait assertions
        │ projects
        ├── Profile/presentation metadata
        ├── presentation-asset bindings
        └── badges and derived views

Evidence remains proof owner
Governance remains authority/policy owner
Agent remains identity and behavior owner
```

Genome owns only the semantics of descriptive trait definitions and assertion
metadata. It does not own the subject, source fact, Evidence, operational
compatibility, authority, reputation, economics or execution. Its aggregate,
repository, persistence and schema representation remain undecided.

```text
Trait != capability
Trait != permission
Trait != credential
Trait != reputation
Trait != economic right
Trait != NFT
```

A trait cannot grant authority, satisfy an operational requirement, alter an
effective configuration or change runtime truth.

## Capability dispositions

| Capability | Review class | REQ-11 disposition |
| --- | --- | --- |
| `E17-C18` Avatar/profile asset | `NEW` | Define a logical presentation-asset reference and Agent-owned Profile binding; adapt artifact primitives for immutable media identity without treating Evidence artifacts as an asset catalog. |
| `E17-C28` Badges | `NEW` | Separate decorative, assertion, verified and canonical-state badges; only a verified assertion badge links to Evidence and verification policy. |
| `E17-C71` Trait classification | `NEW` | Define versioned vocabulary plus provenance-bearing descriptive assertions under a bounded Genome classification owner; persistence remains unchosen. |
| `E17-C72` Lineage-ready identity | `REUSE` | Reference canonical `agent_id` and exact Agent revision/fingerprint; reject Genome identity or lineage. |
| `E17-C73` Historical reconstruction | `EXTEND` | Require exact subject, trait-definition, assertion, asset, Evidence and projection sources; gaps remain explicit and current heads never rewrite history. |
| `E17-C74` Evidence association | `ADAPT` | Link assertions to existing Evidence/Source/Artifact references; Genome neither copies nor verifies its own proof. |
| `E17-C75` Future representation compatibility | `NEW` | Freeze representation-neutral IDs, versions/digests, typed references and correction semantics without selecting schema, token or storage. |
| `E17-C76` Performance history | `ADAPT` | Permit bounded Evidence-backed historical views with explicit method/window/completeness; reject fitness, reputation, rank, authority and economic-right claims. |

## Package

- [Evidence and current boundary](evidence-and-current-boundary.md)
- [Trait vocabulary and assertion semantics](trait-vocabulary-and-assertions.md)
- [Presentation assets and Profile bindings](presentation-assets-and-profile-bindings.md)
- [Badges and verification](badges-and-verification.md)
- [Lineage, compatibility and reconstruction](lineage-compatibility-and-reconstruction.md)
- [Performance and derived views](performance-and-derived-views.md)
- [Security, Product API and Control Plane](security-api-and-control-plane.md)
- [Contract deltas, ADRs and blockers](contract-deltas-and-adrs.md)
- [Decision record](decision-record.md)
- [Acceptance gates](acceptance-gates.md)

## Non-goals

- final Genome/DNA schema, aggregate, repository, service, table or API;
- inheritance, crossover, mutation, fitness or autonomous evolution;
- Agent breeding, offspring identity or genetic optimization;
- tokenization, NFT, on-chain representation or storage;
- marketplace, transfer, ownership rights, royalties or Genome economics;
- operational capability, permission, credential, Delegation or policy grants;
- reputation, universal score, ranking or admission signal;
- inline binary/media in `AgentRevisionV2`;
- second Agent/Profile/Evidence/Cost lineage or parallel Product API;
- route, DTO, UI, storage, migration, production or IMP implementation;
- resolution of the REQ-10 Administration IA divergence.

```text
REQ-11: COMPLETE / READY FOR CTO ACCEPTANCE
REQ-12: BLOCKED_BY_REQ-11_ACCEPTANCE
Implementation authority: NONE
```
