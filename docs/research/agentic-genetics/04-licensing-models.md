# Licensing models

> **NON-NORMATIVE / RESEARCH ONLY**
>
> This research does not authorize NFTs, smart contracts, tokenization, Marketplace functionality, royalties, economic rights, reputation authority, or changes to EPIC-17.
>
> Any transition requires: CEO decision -> CTO architecture / feasibility authorization -> separate REQ -> implementation authorization.

## Options for later comparison

| Model | Candidate benefit | Main unresolved issue |
| --- | --- | --- |
| non-transferable | binds a right to an identified licensee | recovery, organizational changes, delegated use |
| transferable | supports secondary transfer | transfer terms, fraud, revocation, jurisdiction |
| perpetual | predictable access | later security/policy withdrawal and maintenance |
| expiring/subscription | time-bounded commercial model | clock source, renewal, offline operation |
| limited-use/deployment count | bounded consumption | double-use, concurrency, metering evidence |
| commercial/non-commercial | expresses use class | legal definition and enforcement scope |
| derivative-rights restricted | controls publication or modification | what constitutes a derivative |
| sublicensable | supports distribution chains | attribution and control depth |

## License versus entitlement

The legal or contractual instrument would define rights. A cryptographic entitlement can at most be evidence that a holder has a claim under that instrument. A wallet transfer cannot, by itself, establish that terms travel with it, that the holder accepted terms, or that a license is enforceable.

## Theoretical ACS validation inputs

Later design work would need to decide whether ACS validates issuer, exact Genome revision/digest, license scope, holder binding, target tenant, time, transferability, usage/deployment counters, revocation/dispute status, and a durable audit record. Each choice involves a source of truth and failure mode. No current ACS service is authorized to validate licenses.

## Legal specialist boundary

Enforceability, assignability, exhaustion, consumer terms, jurisdiction, remedies, and IP ownership require counsel. This document provides no legal conclusion.
