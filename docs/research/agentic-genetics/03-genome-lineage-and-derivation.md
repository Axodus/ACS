# Genome lineage and derivation

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

## Conceptual alternatives

```text
Source Genome R1
├─ Instance A -> Agent A
├─ Instance B -> Agent B
└─ Derived Genome D1/R1
   ├─ Instance C -> Agent C
   └─ Derived Genome D2/R1
```

An **instance edge** says “an Agent started from an authorized Genome revision.” A **derivation edge** says “a Genome revision declares a source Genome revision as ancestry.” They are separate graphs and must not be inferred from each other.

## Candidate lineage record

| Element | Why it may matter | Status |
| --- | --- | --- |
| immutable Genome lineage ID and revision ID | distinguishes branch from revision | OPTION |
| parent revision reference and digest | permits verifiable direct ancestry | OPTION |
| root reference and ancestor chain | supports bounded provenance queries | OPTION |
| transformation declaration | makes claimed derivation inspectable | OPEN |
| visibility/redaction policy | avoids exposing protected parents | REQUIRED RESEARCH CONCERN |
| correction/dispute record | prevents silent ancestry rewrite | OPTION |

## Integrity and risks

Lineage claims can be forged, selectively omitted, or made ambiguous by semantic-equivalent copying. A digest proves a relationship only to the committed material and hashing procedure; it does not prove authorship, legal right, originality, safety, or economic obligation. Canonical ancestry would therefore need source availability rules, signature/provenance policy, dispute handling, and historical reconstruction semantics.

Multiple-parent ancestry, breeding, and crossover remain **FUTURE POSSIBILITY ONLY**. They raise cycle detection, ordered-parent semantics, attribution, consent, protected-material leakage, and unbounded royalty-chain questions. This package does not define mechanics.

## Current Axodus fact

EPIC-17-REQ-11 deliberately rejects Genome lineage. Existing canonical lineage is `agent_id -> exact Agent revision -> fingerprint`; research must not reinterpret it as Genome ancestry. See [REQ-11 lineage boundary](../../epics/epic-17/req-11/lineage-compatibility-and-reconstruction.md).
