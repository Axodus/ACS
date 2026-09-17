# 07 — Provider-neutral abstraction research

## Non-normative boundary

This section does not add ACS contracts, schemas, migrations, source interfaces,
or names. It evaluates the minimum semantics a future adapter would need to
preserve provider neutrality.

## Candidate conceptual flow

```text
ACS
 |
 +-- Judgment Provider boundary
       +-- System One
       +-- future external provider
       +-- ACS-native provider
```

Concepts similar to `JudgmentRequest`, `JudgmentQuestion`, `JudgmentOption`,
`JudgmentResult`, `Confidence`, `JudgmentEvidence`, and `JudgmentProvider` are
useful research vocabulary, but none is proposed as a frozen ACS name or schema.

**DOCUMENTED FACT:** TypeSafe also publishes a System One adapter for comparing
the same evaluation surface against ordinary LLM APIs. This is useful evidence
that a provider boundary is technically conceivable, but the adapter's own
provider, retry, and probability-normalization behavior must not be mistaken
for ACS semantics or a production guarantee.

## Minimum ACS-owned semantics

Any future boundary must preserve, in ACS-owned terms:

- subject and scope of the judgment;
- question meaning and revision;
- permitted answer type/options or score interpretation;
- Organization/tenant and product domain;
- actor, mandate, policy, approval, and correlation references where applicable;
- canonical Evidence references and data classification;
- requested deadline, idempotency key, and retry policy;
- provider/model/version metadata;
- result, uncertainty/confidence state, unavailable state, and failure reason;
- timestamp, provenance, and adapter correlation;
- retention/redaction policy;
- policy interpretation and resulting ACS decision.

## Provider responsibilities

A provider may:

- accept a bounded question and scoped context;
- return a typed candidate result;
- report its own confidence/uncertainty and metadata;
- expose provider-level errors and availability;
- return supporting spans or references when permitted.

A provider must not:

- mint ACS identity or authority;
- decide admission or permissions;
- define canonical Evidence;
- write Genome, reputation, or economic state;
- own workflow/workforce truth;
- make a provider ID the ACS request ID;
- require provider-native semantics in ACS policy.

## Result semantics

The ACS-owned interpretation should distinguish at least:

```text
answered
uncertain
unavailable
invalid
timed_out
policy_rejected
```

`confidence` should remain a typed, provenance-bearing field whose meaning is
declared by the question/provider/version. It must not be silently treated as a
cross-provider probability or universal quality score.

## Acceptance gates for a future adapter

Before any integration candidate could progress, it should demonstrate:

1. ACS-owned question and policy revisions survive provider removal.
2. Results can be exported with provenance and Evidence references.
3. Unavailable, timeout, invalid, and low-confidence states are explicit.
4. Tenant/domain isolation and redaction are testable.
5. Provider IDs remain subordinate correlation metadata.
6. A second provider or ACS-native stub can satisfy the same conceptual tests.
7. No Runtime, Admission, Evidence, Genome, Governance, Workforce, or Product
   API authority moves across the boundary.
