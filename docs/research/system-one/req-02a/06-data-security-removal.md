# 06 — Data, security, and removal test

## Data progression and authorization

| Phase | Data | Permitted by REQ-02A | Additional gate |
| --- | --- | --- | --- |
| 0 | Synthetic/fabricated fixtures | Design only; no provider transfer | CTO approves corpus and labels before execution authorization |
| 1 | Redacted ACS-like samples | Design only; no provider transfer | Separate security/privacy review, redaction review, provider terms/data-use review, and execution authorization |
| 2 | Real ACS data | No | Separate security/privacy and business authorization; not part of this request |

The design must identify every field before execution: prompt/request text,
context, Evidence references, excerpts, output artifact, tenant/domain,
correlation IDs, metadata, logs, traces, and error payloads. Default posture is
to exclude secrets, credentials, private keys, unredacted personal data,
cross-tenant identifiers, and unnecessary raw content.

## Security and privacy prerequisites

Before any Phase 1 execution, the approval record must resolve:

- retention, deletion, backups, and provider training/data-use semantics;
- subprocessors, region/residency, tenant isolation, and incident notification;
- credential ownership, scope, rotation, and secret non-disclosure;
- prompt/data leakage, malicious content, injection, and confidence
  manipulation tests;
- auditability of inputs, outputs, policy revisions, and provider/model version;
- provider compromise, unavailability, malformed output, and failure isolation;
- whether raw provider payloads may be retained at all.

No unresolved answer is treated as an implicit approval.

## Removal test

### ACS-owned artifacts

- corpus IDs, redaction decisions, labels, adjudication rubric, and expected
  judgments;
- question/dimension meaning, allowed options, threshold policy, escalation
  policy, and result-state semantics;
- canonical Evidence references or hashes, tenant scope, data classification,
  experiment manifest, metrics, and decision record;
- baseline implementation/output and the final policy interpretation.

### Provider-specific artifacts

- endpoint, SDK, provider/model/version identifiers, provider request IDs;
- provider-native prompt templates, payload formats, traces, token accounting,
  proprietary scores, and raw response storage;
- adapter configuration and provider-specific retry behavior.

### Replacement proof

The PoC passes the removal test only if the provider-specific layer can be
deleted and the same frozen corpus can be replayed through an ACS-native stub,
deterministic fixture, or second provider-shaped adapter. The replay must still
produce an explicit `answered`, `uncertain`, `unavailable`, `invalid`, or
`timed_out` state and let ACS policy make the final comparison.

Provider absence must fail closed to the baseline/hold/escalation path. It must
not delete canonical Evidence, rewrite Genome, alter reputation, or change
Admission.
