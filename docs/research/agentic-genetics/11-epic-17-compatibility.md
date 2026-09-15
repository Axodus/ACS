# EPIC-17 compatibility

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

## Compatibility matrix

| Neutral EPIC-17 primitive | Classification | Research conclusion |
| --- | --- | --- |
| canonical Agent identity | **REUSE** | A licensed instance would remain a new canonical Agent, never a token or Genome clone. |
| Agent revisions | **REUSE** | Exact behavior/source references can anchor an instance observation. They are not Genome revisions. |
| Genome subjects / traits / assertions | **EXTEND LATER** | Current scope is descriptive vocabulary and assertions, not a Genome aggregate or lineage. |
| Evidence references | **REUSE** | Associate scoped observations without copying proof ownership. |
| verification references | **REUSE** | Could record verification provenance; cannot issue legal entitlement or authority. |
| presentation references | **REUSE** | Useful for disclosure only; public display creates no right. |
| exact historical addressing / fingerprints | **REUSE** | Useful primitives for commitments and reconstruction, subject to future owner contracts. |
| administrative projections | **EXTEND LATER** | May present future state only through Product API/Control Plane after canonical contracts. |
| Genome lineage root / branch / derivation | **NEW DOMAIN LIKELY** | REQ-11 explicitly rejects Genome identity and lineage. |
| license / entitlement / terms / use counters | **NEW DOMAIN LIKELY** | Legal and operational rights need their own owner and source of truth. |
| NFT / chain / settlement / royalties | **OPEN** | No selected representation or implementation path. |
| fitness/reputation/authority from performance | **INCOMPATIBLE** | Conflicts with REQ-11’s bounded-performance and no-authority boundary. |

## Optionality assessment

EPIC-17 preserves useful optionality by retaining canonical Agent identity, exact revisions/fingerprints, typed references, Evidence provenance, verification references, and source-faithful projections. It correctly does not pre-commit a Genome identity, lineage, license, marketplace, or token model. No contradiction is found if the research remains non-normative and does not reinterpret traits as rights.

## Explicit constraints

The research must not alter EPIC-17 contracts, source, Product API, Runtime/Admission, or acceptance criteria. It cannot make S5, IMP-08 closure, or IMP-09 contingent on a future Genome Economy.
