# Concepts and terminology

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

## Working vocabulary

| Term | Research meaning | Must remain distinct from |
| --- | --- | --- |
| Genome | Possible canonical, versioned technical definition. | Agent, License, NFT. |
| Genome revision | Exact immutable or reconstructible revision of a Genome. | Agent revision. |
| Publication | A declared availability state plus a resolvable technical commitment. | Transfer or commercial offer. |
| License | Possible right to instantiate or use a specified Genome revision under terms. | Technical definition and Agent authority. |
| Entitlement | Technical evidence offered to support a license claim. | The legal agreement itself. |
| Agent | Canonical ACS identity/runtime entity with its own execution history. | Genome instance or token. |
| Evidence | Independently owned proof or telemetry connected to exact context. | Fitness, reputation, authority. |
| Derivation | A new Genome node that declares ancestry to a source revision. | Copy or Agent instance. |

## Copy, instance, derivation and evolution

| Concept | Candidate consequence | Why it cannot be collapsed |
| --- | --- | --- |
| **COPY** | Reproduces information/configuration. | May occur without a new ACS Agent or provenance claim. |
| **INSTANCE** | Creates a new canonical Agent initialized from an authorized source revision. | Requires new Agent identity and independent runtime history. |
| **DERIVATION** | Creates a new Genome lineage node with a parent reference. | Concerns Genome ancestry, not merely a runtime launch. |
| **EVOLUTION** | Produces a distinct revision or branch through change over time. | Requires future semantics for mutation, authorship, and lineage. |

**WORKING HYPOTHESIS:** one source Genome can support many instances; an instance’s observations do not rewrite the source Genome. A derivation can later be used for an instance. Whether an ordinary copy is licensable, detectable, or permitted remains **OPEN**.

## Identity implications

An eventual model would need distinct identifiers for Agent, Genome lineage root, Genome revision, publication, license grant, entitlement proof, and Evidence. A single identifier would conflate technical provenance, legal status, execution identity, and cryptographic possession.

## Vocabulary restrictions

“Genome Fitness” is an **OPEN QUESTION**, not a score, authority, quality guarantee, or entitlement. “Owner” must always name its object: Agent controller, Genome rights holder, licensee, wallet holder, or Evidence custodian.
