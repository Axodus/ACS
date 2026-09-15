# Agentic Genetics & Genome Licensing Research Package

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition from research to normative architecture or implementation requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

**Status:** `RESEARCH / NON-NORMATIVE`  
**Authority:** CEO research mandate  
**Technical owner:** Axodus CTO  
**Implementation authority:** `NONE`  
**EPIC-17 dependency:** none; this package must not block EPIC-17 delivery.

## Purpose and reading order

This package examines a hypothesis: a creator may publish a versioned technical Genome; a license may authorize a new, canonically identified Agent to start from that Genome; later work may produce independently identified derived Genomes. It is a vocabulary, option, risk, and feasibility record, not a design selection.

1. [Concepts and terminology](01-concepts-and-terminology.md)
2. [Conceptual model and lifecycle](02-conceptual-model-and-lifecycle.md)
3. [Genome lineage and derivation](03-genome-lineage-and-derivation.md)
4. [Licensing models](04-licensing-models.md)
5. [NFT and cryptographic entitlements](05-nft-and-cryptographic-entitlements.md)
6. [Evidence, performance and fitness](06-evidence-performance-and-fitness.md)
7. [On-chain/off-chain boundaries](07-onchain-offchain-boundaries.md)
8. [Marketplace and economics](08-marketplace-and-economics.md)
9. [Security and abuse](09-security-and-abuse.md)
10. [IP, legal and regulatory questions](10-ip-legal-regulatory-questions.md)
11. [EPIC-17 compatibility](11-epic-17-compatibility.md)
12. [Risks, open questions and decision gates](12-risks-open-questions-and-decision-gates.md)
13. [Feasibility recommendation](13-feasibility-recommendation.md)

## Research labels

| Label | Meaning |
| --- | --- |
| **CURRENT AXODUS FACT** | Existing accepted repository boundary. |
| **WORKING HYPOTHESIS** | Starting proposition under examination. |
| **EXTERNAL PATTERN** | Reference pattern; not Axodus architecture. |
| **OPTION** | Plausible later direction with no selection. |
| **OPEN QUESTION** | Requires a later owner decision or specialist review. |
| **FUTURE DECISION** | A gated choice after authorization. |

## Core separation

`Agent != Genome != License != NFT`; Evidence is separately owned proof and never reputation authority. License ownership does not control the originating Agent. Token ownership does not automatically grant Agent authority, IP ownership, or unrestricted commercial rights.

## Current boundary

EPIC-17-REQ-11 is the current authoritative Genome boundary: descriptive trait vocabulary, assertions, and exact references over canonical ACS state. It explicitly excludes Genome identity/lineage, fitness, tokenization, NFT representation, ownership economics, royalties, Marketplace mechanisms, and on-chain storage. See [EPIC-17-REQ-11](../../epics/epic-17/req-11/README.md).
