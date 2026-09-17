# 09 — Decision matrix and recommendation

## Qualitative decision matrix

No composite numeric score is produced.

| Dimension | Finding | Classification |
| --- | --- | --- |
| Architectural fit | Fits below ACS policy as a bounded judgment provider; conflicts if authoritative. | `POSSIBLE FIT` |
| Capability gain | Differentiated for typed contextual evaluation and uncertainty-driven review. | `POSSIBLE FIT` |
| ACS overlap | High overlap with deterministic policy, orchestration, evidence, and state ownership. | `REDUNDANT` outside judgment scope |
| Provider independence | Achievable only through an ACS-owned adapter and portable semantics. | `INTEGRATION CANDIDATE` |
| Security | No production use evidence; data and credential boundaries require review. | `UNKNOWN / CONDITIONAL` |
| Privacy/data | Retention, training use, residency, tenancy, and export require validation. | `UNKNOWN` |
| Latency | No target-workload measurement. | `UNKNOWN` |
| Cost | No total-cost measurement; lower call price is unproven. | `UNKNOWN` |
| Reliability | No ACS-approved availability/failure evidence. | `UNKNOWN` |
| Observability | Adapter normalization is plausible; completeness and export unproven. | `POSSIBLE FIT` |
| Confidence usefulness | Useful only when task-specific and calibrated. | `POSSIBLE FIT` |
| Integration complexity | Likely bounded for offline evaluation; higher for request-path use. | `POSSIBLE FIT / UNKNOWN` |
| Lock-in risk | Medium/high for semantics, confidence, model evolution, and critical path. | `CONDITIONAL` |
| Removal/reversibility | Good in an offline adapter; unproven in a live path. | `POC RECOMMENDED` |
| Genome/Evidence applicability | Evidence-quality judgment possible; universal Genome fitness is incompatible. | `POC RECOMMENDED` / `NO-GO` |

## Subsystem classifications

| Subsystem | Classification |
| --- | --- |
| Atomic typed judgments | `PATTERN ONLY` |
| Confidence and explicit escalation | `PATTERN ONLY` |
| Evidence quality, relevance, adherence, completeness | `POC RECOMMENDED` |
| Runtime context/risk/routing input | `POC RECOMMENDED`, advisory only |
| Runtime/Admission authority | `NO-GO` |
| Workforce/workflow orchestration | `NO-GO` as owner; `POC RECOMMENDED` as input only |
| Governance interpretation | `POSSIBLE FIT`, advisory only |
| Permissions, constitutional decisions, treasury, production release | `NO-GO` |
| Genome fitness, reputation, economic value | `NO-GO` |
| System One as removable provider | `INTEGRATION CANDIDATE`, future gate only |
| System One as current production dependency | `NO-GO` |

## Explicit answers

1. **Should ACS adopt the pattern?** Yes, as an ACS-owned architectural pattern:
   bounded typed judgments, explicit uncertainty, deterministic composition, and
   policy-owned escalation. This does not adopt TypeSafe as a dependency.
2. **Should ACS experiment with System One?** Conditionally yes, through one
   isolated non-production replay/evaluation PoC after a data-flow and test-design
   gate. The current request did not run one.
3. **Should ACS consider System One as a provider/dependency?** Consider it as
   a removable future provider candidate, not as a current or canonical
   dependency. Production adoption is `NO-GO` on current evidence.
4. **What evidence is missing?** Target-workload accuracy and calibration;
   p50/p95/p99 latency and throughput; total cost; timeout/outage behavior;
   version/replay stability; API/export stability; retention/training/residency;
   tenant isolation; credential/secret controls; observability; licensing and
   commercial terms; and a provider-removal test.
5. **Smallest useful next gate?** CTO review of a redacted/synthetic replay
   corpus, provider-neutral acceptance criteria, and data-flow/retention review.
   No provider call is needed for this gate.
6. **What is authorized now?** Documentation and research only. No install,
   dependency, credential, provider call, code integration, schema, API, or
   production change.

## CTO recommendation

Adopt the judgment pattern independently of TypeSafe. Permit a future narrow
System One evaluation only if it remains below ACS-owned policy and passes the
security, privacy, calibration, operations, and removal gates. Do not make
System One the canonical owner of any ACS domain or a critical-path authority.

## Decisions required from CTO

- Select one candidate workload and approve its acceptance metrics.
- Confirm the future adapter owner and portable result semantics.
- Decide whether an offline-only test is sufficient before any provider call.
- Review security/privacy evidence requirements and provider-removal criteria.

## Decisions required from CEO

- Approve any future use of external provider credentials, paid access, or
  Axodus data outside synthetic/redacted fixtures.
- Approve any change to production posture, authority boundary, economic
  interpretation, or institutional data flow.

## Implementation performed

Research documentation and a coordination handoff only. No TypeSafe/System One
installation, dependency, credential, provider call, code integration, API
change, schema change, runtime change, Admission change, Evidence/Genome
semantic change, security-boundary change, or PoC implementation was performed.
