# Global Coordination Handoff

- Workspace: `ACS`
- Handoff ID / time: `ACS-RESEARCH-REQ-02B / 2026-09-17T12:46:25Z`
- Request / branch / HEAD: `ACS-RESEARCH-REQ-02B / dev / documentation commit containing this receipt`
- Scope: Freeze parameters for the first System One experiment after CTO selection of Evidence Judgment.
- Local status: `POC EXECUTION READY / DESIGN-ONLY / EXECUTION NOT AUTHORIZED`
- Validation: `git diff --check` PASS; required deliverable fields, arm definitions, thresholds, budgets, data gates, and removal criteria reviewed with targeted repository search; no product build/test run because the change is documentation-only.
- Changed local records: `docs/research/system-one/README.md`; `docs/research/system-one/req-02b/README.md`; `parameter-freeze.md`; `corpus-specification.md`; `evaluation-matrix.md`; this handoff receipt.
- Selected candidate: `Evidence Judgment` as an offline shadow evaluator over `relevance`, `evidence_quality`, `instruction_adherence`, and `output_completeness`.
- Frozen design: A ACS deterministic/simple control, B System One typed judgment, C stronger reasoning comparator; 240 evaluation rows / 216 unique synthetic cases plus repeats; independent adjudication; preregistered confidence bands; quality, calibration, escalation, latency, reliability, economics, repeatability, and removal gates.
- Data boundary: `PHASE 0 ONLY` synthetic design. No Phase 1 redacted data, Phase 2 real data, provider transfer, credentials, or external calls are authorized.
- Dependencies: separate CTO PoC Execution Authorization for synthetic corpus generation, harness implementation, provider/API access, credential handling, and calls; security/privacy review remains required before any future non-synthetic phase.
- Critical risks: confidence bands are operational partitions, not correctness probabilities; provider/model semantics may not normalize cleanly; cost must include escalation/review/rework; provider absence must fail closed; any authority or semantic lock-in is a negative criterion.
- Required next action: return to CTO with `POC EXECUTION READY`; do not execute. Await explicit authorization for the next gate.
- Portfolio action: `none`; no portfolio status, roadmap, ownership, blocker register, production posture, or ACS normative contract changed.
