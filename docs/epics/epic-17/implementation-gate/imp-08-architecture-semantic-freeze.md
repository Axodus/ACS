# EPIC-17-IMP-08 — Architecture & Semantic Freeze

**Epic:** EPIC-17 — Agent Genome Foundations, Administration & Automation Platform
**Milestone:** EPIC-17-IMP-08 — Genome Traits, Assets & Verification
**Mapped requirement:** EPIC-17-REQ-11
**Decision state:** `COMPLETE / CTO ACCEPTED`
**Baseline:** `2f4f169a604617945d2e731f785ed2c85d8678a9` (`origin/dev`)
**Schema:** `12 / CANONICAL`; Schema 13 `NOT AUTHORIZED`
**Functional implementation:** none

## 1. Determination

IMP-08 may establish a bounded descriptive Genome classification boundary over
canonical ACS references. It may own only versioned trait-definition meaning
and provenance-bearing trait-assertion metadata. It does not own Agent
identity, AgentRevision behavior, source facts, Evidence, verification policy,
authority, execution, effective configuration, reputation or economics.

```text
Trait != capability != permission != credential
Trait != reputation != economic right != NFT
Genome != operational authority != effective configuration
Genome != Agent identity != AgentRevision != execution snapshot
```

The conceptual diagram is accepted only as a relation of references, not as a
required aggregate/table topology:

```text
canonical Agent / exact AgentRevision
             -> descriptive Genome boundary
             -> trait definitions and assertions
             -> presentation-asset bindings and verification references
             -> safe future projection
```

## 2. Semantic decisions

### Genome

Genome is a **bounded versioned descriptive vocabulary and assertion boundary**,
not a competing Agent companion identity. It has no independent identity that
can substitute for `agent_id`, no parent/offspring lineage and no claim over
Agent lifecycle or fingerprint.

A trait definition has qualified identity plus immutable version/digest because
changed meaning cannot silently reuse a former label. Assertions have their own
descriptive stable reference/digest and correction/supersession history when
future implementation requires it. This is not a decision for a Genome
aggregate, repository or revision store.

An AgentRevision does not pin a mutable Genome head. A revision-specific
assertion anchors to `agent_id + revision + fingerprint`; a current-presentation
assertion is an explicit mutable observation. Historical execution or retained
presentation reconstructs the exact assertion/definition/provenance sources
observed then, or reports a gap. It never resolves a historical Agent to the
current Genome state.

### Traits

A trait definition specifies qualified name, exact version/digest, value kind,
allowed qualifiers, allowed subject anchoring, scope, provenance and lifecycle.
A trait assertion specifies exact typed subject, exact definition, value and
qualifiers, origin, producer, effective/observation time or window, provenance
and Evidence references, visibility, and correction/verification state.

Trait existence, value or verification has no effect on capability, permission,
credential, Delegation, approval, admission, Runtime, effective configuration
or execution. Any future policy consuming an assertion must independently own
trusted issuer, evidence sufficiency, freshness and authority semantics.

### Assets

The term **presentation asset reference** is adopted; “Genome Asset” is rejected
as too ambiguous. A presentation asset reference describes a resource bound to
an Agent/Profile presentation role (for example avatar or banner). It is not a
Governed Resource, Credential, Connector, Memory, Evidence, economic asset,
token, NFT or ownership right.

Agent-owned presentation state owns binding and semantic role; storage owns
bytes, integrity, retention and deletion; Evidence may prove provenance.
`ArtifactReferenceV2` may be adapted for immutable media identity, but it does
not become an asset catalog, lifecycle owner or authorization source. Media
never enters `AgentRevisionV2`.

### Verification

Verification is a time-aware result over an exact assertion, exact subject,
Evidence/Source references, Governance policy/verifier decision, scope and
validity/freshness. It may be stale, disputed, revoked, unavailable or
superseded. Verification is not permission or authority.

Evidence remains the append-only proof owner. Governance remains the policy and
verifier-authority owner. Genome stores or projects exact references only; it
must not create a parallel proof ledger or verification authority.

## 3. Historical, Tenant and Product boundary

A retained view requires, as applicable: exact subject; Agent revision/head
observation; trait definition version/digest; assertion reference/digest;
Evidence/Source; verification decision/policy/validity; presentation binding and
asset digest; projection version/time; and redaction/reconstruction findings.

Current trait definitions, heads, assets and verification state must never
silently rewrite historical output. Missing, deleted, restricted or unresolved
sources are explicit findings and do not authorize recovery of erased content.

Future exposure reuses the frozen IMP-07 chain:

```text
Genome canonical or derived semantics
  -> safe administrative projection
  -> administrative service
  -> existing Product API
```

No Product API route, direct persistence call, parallel Genome API or
client-owned truth is authorized by this gate. Tenant visibility is fail-closed
and cannot exceed the most restrictive subject, source, Evidence, consent,
license, policy or asset classification.

## 4. E17-R11-B08 disposition

```text
E17-R11-B08
Problem:
No canonical trait, presentation-asset or verification Product/API projection
or owner-routed action exists.

Required semantic decision:
Future projections reuse IMP-07 safe projection, administrative-service and
Product API boundaries only after canonical source contracts exist.

Canonical owner:
Trait vocabulary/assertion boundary; Agent presentation binding owner; existing
Evidence and Governance owners for proof and verification policy.

Reuse / Adapt / Extend / Reject:
REUSE Product API and administrative boundary; ADAPT Evidence, Source and
Artifact references; EXTEND only after a separately authorized source contract;
REJECT parallel Genome API and client persistence.

Persistence impact:
A — NO PERSISTENCE CHANGE REQUIRED for this freeze. Future implementation must
perform a separate physical-design review if durable state is required.

Implementation owner:
Future IMP-08 slices, after CTO authorization.

Blocking status after freeze:
NON-BLOCKING FOR ARCHITECTURE FREEZE; BLOCKS FUNCTIONAL PROJECTION/ACTION UNTIL
THE CORRESPONDING CANONICAL SOURCE CONTRACTS ARE ACCEPTED.
```

## 5. Persistence decision

**A — NO PERSISTENCE CHANGE REQUIRED** for the Architecture/Semantic Gate.

The existing records do not prove that a durable Genome store is unnecessary
for every later slice. They do prove that no physical representation may be
assumed now. If a future slice needs durable definition/assertion/binding state,
it stops for a physical-design review. Neither B nor C is authorized by this
freeze; Schema 13 and any migration remain prohibited.

## 6. ADR candidates

The accepted REQ-11 candidates remain appropriate planning inputs without
renumbering: `ADR-17-052` (Genome boundary), `053` (trait definitions/assertions),
`054` (history/anchoring), `055` (presentation assets), `056` (verification),
`057` (bounded performance), `058` (Product/Tenant/redaction), and `059`
(correction/revocation/deletion). They are not accepted implementation ADRs by
this document.

## 7. Proposed slices

| Slice | Candidate scope | Gate / exclusions |
| --- | --- | --- |
| S1 | Trait definition/assertion semantic contracts and exact references | No persistence, API, Profile, authority or execution. |
| S2 | Presentation-asset reference, provenance and verification association contracts | No bytes/storage owner, Evidence copy or verification authority. |
| S3 | Durable foundations only if a separately accepted physical design requires them | STOP for Schema/physical-design review before work. |
| S4 | Safe administrative projection and Product integration after canonical sources exist | Reuse IMP-07; no direct persistence or parallel API. |
| S5 | Cross-domain conformance and closure | No catch-all functional work. |

The sequence is conditional: S3 is omitted if no durable requirement is proven;
S4 cannot begin until its source contracts are accepted.

## 8. Preserved exclusions

NFT minting, tokenization, transferability, royalties, dividends, marketplace,
Genome trading, Agent lineage market, economic ownership, breeding, mutation,
inheritance, reputation, ranking, fitness, operational authority, admission,
Runtime, scheduler, OpenClaw execution, Product routes, migrations and Schema
13 are outside this gate.

## 9. Result

```text
EPIC-17-IMP-08
ARCHITECTURE & SEMANTIC FREEZE
REQ-11:
READY
E17-R11-B08:
DISPOSITIONED — source-contract/Product boundary gate retained
Genome owner:
BOUNDED DESCRIPTIVE VOCABULARY AND ASSERTION METADATA BOUNDARY
Genome authority:
NONE
Trait authority:
NONE
Asset economic semantics:
NONE
Verification authority:
NONE (Governance remains policy/verifier owner)
Historical semantics:
EXACT REFERENCES OR EXPLICIT RECONSTRUCTION GAP; NEVER CURRENT SUBSTITUTION
Evidence/provenance:
REUSE EXISTING EVIDENCE/SOURCE; GENOME DOES NOT OWN PROOF
Product API changes:
NONE
Persistence impact:
A
Schema 12:
CANONICAL
Schema 13:
NOT AUTHORIZED
Functional implementation:
NONE
Proposed slices:
S1, S2, conditional S3, S4, S5
Unresolved architecture blockers:
NONE
Architecture & semantic freeze:
COMPLETE / CTO ACCEPTED
S1 authorization:
SEPARATE / REQUIRED
```
