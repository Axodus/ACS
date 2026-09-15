# Risks, open questions and decision gates

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

## Open-question register

| Question | Why it matters | Dependencies | Decision owner | Earliest gate |
| --- | --- | --- | --- | --- |
| NFT standard / blockchain/network | portability, custody, cost, finality | CEO product intent | CTO after CEO | feasibility REQ |
| smart-contract architecture | security and operational ownership | chain decision, legal review | CTO | architecture REQ |
| token vs non-token entitlement | custody, privacy, transfer | rights model | CEO | product decision |
| transferability / perpetual vs expiring | commercial promise and enforcement | legal terms, recovery | CEO | product decision |
| pricing / settlement / commercial rights | economic model | legal, tax, $Neurons role | CEO | economic REQ |
| derivative rights / revocation | creator and user obligations | IP/legal terms | CEO | policy decision |
| ancestor royalties / royalty depth | chain incentives and complexity | derivation semantics, settlement | CEO | economic REQ |
| Genome Fitness | quality claims and gaming risk | Evidence methodology | CEO with CTO input | separate research decision |
| breeding/crossover/mutation | lineage, IP, safety | Genome identity/derivation | CEO then CTO | feasibility REQ |
| Marketplace mechanics | intermediary risk and trust | entitlement, compliance | CEO | product decision |
| economic ownership / $Neurons role | incentives and regulation | business model | CEO | economic decision |
| regulatory classification | legal viability | jurisdiction, terms, tokens | CEO with counsel | before feasibility completion |

## Decision sequence

```text
CEO: decide whether a product/economic problem warrants feasibility work
  -> CTO: authorize bounded architecture and technical feasibility REQ
    -> legal/compliance: scoped specialist review
      -> separate REQ: define selected scope and non-goals
        -> implementation authorization: only after acceptance
```

## Major risks

The largest risks are rights ambiguity, conflation of cryptographic possession with legal rights, secret/protected-configuration disclosure, forged or manipulated provenance and performance, wallet compromise, unbounded derivative economics, and accidental conversion of observations into reputation or authority.
