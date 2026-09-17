# 03 — Capability fit and ownership boundaries

## Classification matrix

| Capability | Current ACS equivalent | Fit | Differentiated value | Canonical owner / interaction |
| --- | --- | --- | --- | --- |
| Atomic contextual question | Deterministic classifiers and policy checks | `POSSIBLE FIT` | Allows a narrow evaluator to answer one bounded question with a typed result. | ACS owns question intent and policy; provider returns an observation/judgment candidate. |
| Typed answer space | Typed ACS records and policy enums | `POSSIBLE FIT` | Reduces free-form parsing for classification/evaluation. | ACS owns interpretation/versioning; provider schema is translated at adapter edge. |
| Probability/confidence output | Confidence fields when applicable; no universal confidence authority | `POSSIBLE FIT` | Makes uncertainty explicit for escalation. | ACS owns threshold semantics; provider owns only its reported estimate. |
| Deterministic composition | Orchestrator, policy, state machine, receipts | `REDUNDANT` as a runtime capability | System One does not replace ACS deterministic control. | ACS remains canonical composer and state owner. |
| Escalation threshold | Blocked actions, approval states, policy gates | `STRONG FIT` as a pattern | A judgment can trigger review without granting authority. | ACS policy and human/governance authority own escalation. |
| Evidence-quality judgment | Evidence and provenance plane | `POC RECOMMENDED` | May help triage relevance, completeness, or adherence over known evidence. | ACS owns Evidence; provider output is a judgment referencing Evidence IDs. |
| Request/routing classification | Trading intent and boundary classifiers | `POC RECOMMENDED` | Could add contextual classification where deterministic rules are insufficient. | ACS owns routing/admission; provider is advisory input. |
| Workforce orchestration | Workflow/workforce registry and orchestration plan | `REDUNDANT` / `ARCHITECTURAL CONFLICT` if authoritative | No demonstrated need to replace ACS ownership with a judgment product. | ACS owns workforce, workflow, assignment, leases, retries, and run lineage. |
| Runtime admission | Runtime policy, readiness, blocked-action gates | `ARCHITECTURAL CONFLICT` if authoritative | Probabilistic output cannot be the admission authority. | ACS policy decides; provider failure defaults to the operation’s safe state. |
| Genome fitness/reputation | Separate Agentic Genetics research boundary | `ARCHITECTURAL CONFLICT` if universalized | No safe basis for a universal score or authority claim. | Agentic Genetics and existing evidence owners remain separate. |
| Governance interpretation | Governance references and approval states | `POSSIBLE FIT` advisory only | Can summarize or classify submitted material. | Governance/authorized reviewers retain consequential decision authority. |
| Product API decision path | Read-only/guarded ACS API boundary | `NO-GO` for current change | No evidence justifies adding remote judgment latency or dependency now. | Future adapter must be separately approved and isolated. |

## Authority and failure rules

1. A provider result never mutates an ACS definition, permission, capability,
   policy, Genome, Evidence record, or institutional state.
2. A low-confidence or unavailable result is an explicit state, not a silent
   negative, positive, or fabricated confidence.
3. A provider timeout cannot be interpreted as approval.
4. A provider result can recommend escalation; only ACS policy or an authorized
   human/governance state can enact it.
5. The provider may be removed while ACS retains IDs, revisions, references,
   evidence lineage, and a terminal or recoverable run state.

## Net fit finding

The differentiated fit is narrow: **bounded judgment under ACS-owned policy**.
System One has no demonstrated differentiated fit as the owner of deterministic
orchestration, admission, evidence, Genome semantics, governance, or product
state.
