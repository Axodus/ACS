# NFT and cryptographic entitlements

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

## Representation alternatives

| Representation | What it could evidence | What it cannot establish by itself |
| --- | --- | --- |
| NFT ownership token | control of a token identifier | IP ownership, Agent authority, terms acceptance |
| NFT license certificate | an issuer-associated certificate | scope, enforceability, continued validity without terms/policy |
| transferable entitlement | control of transferable access record | whether rights may legally transfer |
| non-transferable credential | holder-bound claim | holder identity, revocation validity, rights scope alone |
| off-chain license + on-chain proof | integrity anchor or timestamp | completeness of private terms or off-chain status |
| signed off-chain grant | issuer assertion and holder binding | universal discovery or settlement |

## External patterns

ERC-721 standardizes distinguishable token identifiers and transfer interfaces; its own scope is token tracking and transfer, not a legal license model. W3C Verifiable Credentials provide a general credential data model with issuer/holder/verifier roles and status patterns. These are **EXTERNAL PATTERNS**, not selected standards or Axodus architecture. See [ERC-721](https://eips.ethereum.org/EIPS/eip-721) and [W3C VC Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/).

## Binding requirements to investigate

Any later token-based model must make the legal/technical binding explicit: issuer authority; exact Genome revision and digest; terms version; permitted acts; holder/wallet relation; transfer rule; revocation and expiration; dispute handling; evidence retention; and how ACS obtains an authoritative result. Without this, “NFT = license” is an unsupported assertion.

## Security note

Wallet compromise, transfer replay, chain reorganization/finality choices, metadata substitution, and lost keys are entitlement risks. A token should never be treated as Agent control authority.
