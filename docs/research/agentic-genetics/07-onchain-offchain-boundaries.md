# On-chain/off-chain boundaries

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

## Responsibility alternatives

| Concern | Likely ACS/off-chain concern | Possible on-chain concern | Decision state |
| --- | --- | --- | --- |
| Genome technical definition | canonical content, protected parts, revision resolution | commitment/hash anchor | OPEN |
| Agent identity and history | canonical Agent and runtime history | none required | CURRENT ACS FACT |
| Evidence | classified source records and redaction | optional proof anchor | OPEN |
| License | private terms and validation context | issuance/ownership/status signal | OPEN |
| transfer/expiration/revocation | authoritative policy and recovery | event/status representation | OPEN |
| settlement/royalties | business and accounting records | possible settlement record | CEO FUTURE DECISION |

## Principles for research

- Secrets, protected configuration, personal data, operational state, and raw Evidence should not be assumed suitable for public immutable storage.
- A hash proves correspondence to specific bytes under a declared digest process; it does not prove rights, safety, ownership, or factual truth.
- An on-chain event may be unavailable, delayed, contested, or insufficient for a protected off-chain policy decision.
- If entitlement validation ever affected Agent instantiation, failure semantics, privacy, availability, and reconciliation would need separately authorized architecture.

No blockchain, network, NFT standard, bridge, smart contract design, or settlement system is selected.
