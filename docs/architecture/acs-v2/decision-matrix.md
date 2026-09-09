# ACS v2 Architecture Decision Matrix

**Status:** `SCORING PENDING POC EVIDENCE`

## Scoring method

Use a 0–5 score for each criterion:

- `0`: unsupported or incompatible;
- `1`: major gap/high-risk custom work;
- `2`: partial capability with substantial adaptation;
- `3`: adequate with bounded adaptation;
- `4`: strong fit with minor adaptation;
- `5`: demonstrated fit under the ACS reference workload.

Scores must cite a provider version/commit, test artifact, and reviewer. Do not
score from marketing copy alone.

## Weights

| Criterion | Weight | Required evidence |
| --- | ---: | --- |
| Multi-agent orchestration | 20% | BBA workload branch/join, handoff, retry, failure, and approval probes. |
| Agent registry/management | 15% | Round-trip projection, versioning, export, and no-drift test. |
| Codex integration | 15% | Bounded task execution, cancellation, artifact, and evidence adapter. |
| Evidence/tracing | 15% | Complete ACS lineage with provider links and redaction. |
| Workflow determinism | 10% | Revision pinning, idempotency, replay, and stable terminal outcomes. |
| Self-hosting/sovereignty | 10% | Deployment inventory, data-flow review, backup/export/removal test. |
| ACS embedding/API integration | 10% | Stable headless API or library adapter with typed failures. |
| Security/permissions | 5% | Organization/domain isolation, credentials, tools, prompt injection, least privilege. |

Total: 100%.

## Options

### Option A — Agenta-led

Agenta provides most agent management and available orchestration features.

Primary risks:

- responsibility overlap with existing ACS control-plane services;
- commercial-feature dependency for audit/governance requirements;
- runner overlap and canonical-state drift;
- uncertain workforce orchestration depth.

### Option B — Eigent-led

Eigent provides agent/workforce execution, with ACS retaining only a thin
control boundary.

Primary risks:

- loss of canonical agent/workflow ownership if the boundary is too thin;
- desktop/headless API fit;
- provider-side state and recovery semantics;
- agent-management and evaluation gaps.

### Option C — Agenta + Eigent

Agenta provides operational agent management/evaluation while Eigent provides
workforce orchestration.

Primary risks:

- two external state systems plus existing ACS/OpenClaw infrastructure;
- identity, version, trace, and lifecycle synchronization;
- duplicate runners, tracing, knowledge, credentials, and workflow concepts;
- highest operational complexity unless responsibilities are sharply bounded.

### Option D — ACS-native coordination with selected libraries/adapters

Extend existing ACS contracts and use OpenClaw, Codex, CAMEL, or other
components only behind focused adapters.

Primary risks:

- more ACS-owned engineering;
- longer time to mature workforce UX and evaluation tooling;
- risk of rebuilding capabilities available in maintained projects.

## Unscored matrix

| Criterion | Weight | A: Agenta | B: Eigent | C: Hybrid | D: ACS-native |
| --- | ---: | ---: | ---: | ---: | ---: |
| Multi-agent orchestration | 20 | TBD | TBD | TBD | TBD |
| Agent registry/management | 15 | TBD | TBD | TBD | TBD |
| Codex integration | 15 | TBD | TBD | TBD | TBD |
| Evidence/tracing | 15 | TBD | TBD | TBD | TBD |
| Workflow determinism | 10 | TBD | TBD | TBD | TBD |
| Self-hosting/sovereignty | 10 | TBD | TBD | TBD | TBD |
| ACS embedding/API integration | 10 | TBD | TBD | TBD | TBD |
| Security/permissions | 5 | TBD | TBD | TBD | TBD |
| **Weighted total** | **100** | **TBD** | **TBD** | **TBD** | **TBD** |

## Mandatory provider-removal gate

For every option, remove the evaluated provider from the test environment and
verify that ACS retains:

- agent and workforce identities/revisions;
- workflow definitions;
- Governance and approval references;
- knowledge provenance;
- evidence, artifacts, and decision history;
- enough portable state to resume through another eligible adapter, or an
  explicit terminal state when semantic resume is impossible.

An option that fails this gate cannot score above `2` for sovereignty or ACS
embedding and cannot receive an `ADOPT` recommendation.

## Decision output template

```text
Recommended ACS v2 architecture:

Recommended agent management:

Recommended orchestration:

Recommended execution providers:

Agenta: ADOPT | POC | DEFER | REJECT
Eigent: ADOPT | POC | DEFER | REJECT
CAMEL direct: ADOPT | POC | DEFER | REJECT
Codex role:
OpenClaw role:

Major risks:
Migration strategy:
Implementation readiness: GO | CONDITIONAL_GO | NO_GO
Evidence baseline:
Reviewers:
```
