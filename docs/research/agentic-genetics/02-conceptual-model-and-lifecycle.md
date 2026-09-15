# Conceptual model and lifecycle

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

## Starting hypothesis

```text
Creator -> Agent -> Genome revision -> Evidence / telemetry / observations
        -> Genome publication -> Genome license -> entitlement proof
        -> acquisition -> ACS validates asserted right -> new Agent instance
        -> independent execution history -> evolution -> derived Genome branch
```

This is a conceptual sequence, not a required runtime flow. It does not say that an Agent creates a Genome, that publication is public, or that an entitlement is a token.

## Candidate lifecycle states

| Subject | Possible states to investigate | Research concern |
| --- | --- | --- |
| Genome revision | draft, protected, published, withdrawn, superseded, disputed | Publication and withdrawal must not erase historical addressing. |
| License | proposed, issued, active, suspended, expired, revoked, disputed | Legal effect and technical signal may diverge. |
| Entitlement proof | observed, verified, stale, invalid, unavailable | Possession is insufficient without scope and conditions. |
| Agent instance | created, configured, admitted, active, stopped, historical | Existing canonical lifecycle remains Agent-owned. |

## Candidate instantiation validation question

A later ACS validation boundary could theoretically need the exact source Genome revision and digest, target Agent identity, claimed entitlement, terms/version, valid time, allowed use/deployment count, transfer/revocation status, tenant/context, and audit/Evidence references. This is an inventory only; it does **not** authorize license enforcement, admission changes, or any implementation.

## Immutability and disclosure

Immutable publication need not mean public disclosure. A publication may expose a commitment or digest while protected configuration stays access-controlled. Any future model needs to separate: immutable reference, disclosure policy, legal terms, and secret-bearing configuration.
