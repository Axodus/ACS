# Security and abuse

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

| Threat | Candidate future boundary to investigate |
| --- | --- |
| stolen Genome publication / forged ancestry | signed provenance, dispute process, protected-source access, provenance verification |
| license theft / compromised wallet | holder binding, recovery, revocation, strong authentication, fraud response |
| replay / double-use of limited entitlement | nonce or reservation semantics, idempotency, concurrency control, audit trail |
| unauthorized instantiation | server-side validation before creation/admission, exact source and terms evidence |
| fabricated Evidence / collusion / Sybil evaluation | evaluator provenance, scope disclosure, independent verification, anti-correlation rules |
| poisoned Genome / hidden payloads | review, sandboxing, tool/prompt inspection, dependency and secret scanning |
| credential leakage | no secrets in Genome publications, protected configuration references, redaction |
| Marketplace fraud / wash trading | identity, transaction integrity, disclosure, anomaly review |
| fitness inflation | retain scoped observations; prohibit universal reputation inference |

## Boundary consequence

If any later capability changes rights to create or operate an Agent, validation must be server-side and authoritative. A client, wallet, public token metadata, Marketplace UI, badge, or performance display cannot grant authority. Security requirements would also need privacy, incident response, deletion, dispute, and historical reconstruction rules.

No security mechanism is implemented by this research.
