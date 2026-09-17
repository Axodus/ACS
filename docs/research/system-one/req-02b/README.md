# ACS-RESEARCH-REQ-02B — System One PoC Parameter Freeze

**Status:** `AUTHORIZED / PARAMETER-FREEZE`
**Classification:** `RESEARCH / NON-NORMATIVE`
**Selected PoC:** `Evidence Judgment`
**Provider calls:** `NONE`
**Credentials:** `NONE`
**Data:** `PHASE 0 ONLY / SYNTHETIC DESIGN`
**Implementation:** `NONE`
**Design date:** 2026-09-17

## Execution-readiness classification

`POC EXECUTION READY`

This means the experiment parameters are sufficiently specified for a separate
CTO decision on corpus generation, harness implementation, credentials, and
external calls. It does **not** authorize any of those actions. The first
execution gate must still explicitly authorize each one.

## Selected PoC

Evidence Judgment is selected as an offline shadow evaluator because it has the
cleanest authority boundary:

```text
Canonical Evidence -> ACS baseline      -> evaluation
                   -> System One B      -> evaluation
                   -> comparator C      -> evaluation only
```

No judgment result may cause routing, Admission, permission, execution,
workflow completion, Evidence mutation, Genome mutation, reputation change, or
economic interpretation.

## Frozen design package

- [Parameter freeze](./parameter-freeze.md)
- [Synthetic corpus specification](./corpus-specification.md)
- [Evaluation matrix and preregistered gates](./evaluation-matrix.md)

## Authority and data gates

| Action | REQ-02B status |
| --- | --- |
| Documentation and parameter design | `AUTHORIZED` |
| Synthetic corpus generation | `HOLD` |
| Evaluation harness implementation | `HOLD` |
| System One dependency or installation | `NOT AUTHORIZED` |
| API calls or credentials | `NOT AUTHORIZED` |
| Redacted/real ACS data | `NOT AUTHORIZED` |
| Production integration | `NOT AUTHORIZED` |

## Required next decision

Return to the CTO for a separate **PoC Execution Authorization**. That decision
must explicitly approve synthetic corpus generation, harness implementation,
provider dependency/API access, credential handling, and external calls.
