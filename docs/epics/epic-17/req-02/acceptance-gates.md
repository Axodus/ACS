# EPIC-17-REQ-02 Acceptance Gates

## 1. Documentation gate

| Gate | Evidence | Result |
| --- | --- | --- |
| Dependency accepted | CTO accepted REQ-01 and commit `9696bfb37ddbaef0f59e188a1520f2016d080548` | `PASS` |
| Identity separated | Canonical Agent identity remains `AgentDefinitionV2.agent_id` | `PASS` |
| Behavior separated | Role, instructions, constraints and policies remain exact Agent revision state | `PASS` |
| Presentation separated | Profile is defined as a derived, non-authoritative projection | `PASS` |
| Capability separated | Legacy Profile capability contribution is recorded and rejected for presentation semantics | `PASS` |
| Profile ownership | No independent Profile aggregate/revision is presumed; source state remains Agent-owned | `PASS` |
| Persona ownership | Persona remains subordinate to canonical Agent revision | `PASS` |
| Presentation fields | Headline/bio/description gap and no-operational-effect rule are explicit | `PASS` |
| Displayed skills | Derivation from canonical bindings is explicit | `PASS` |
| History/provenance | Current versus retained presentation and required sources are distinguished | `PASS` |
| REQ-01 B02 consumed | REQ-03 dependency constraint distinguishes revision/head/lifecycle state | `PASS` |
| Downstream boundaries | Governed legacy Profile goes to REQ-04; assets/badges remain with REQ-11 | `PASS` |
| No implementation authority | Deltas and ADRs remain candidates | `PASS` |

## 2. Future IMP gates

No IMP is authorized. A future separately approved implementation must prove:

1. one canonical Agent remains the source of identity and Profile projection;
2. Persona changes create a fingerprinted canonical Agent revision;
3. presentation changes cannot grant or widen capability or authority;
4. legacy Profile capability-preset behavior cannot be confused with
   presentation and does not create dual canonical truth;
5. displayed skills/tools correspond to exact accepted bindings and revisions;
6. Product API marks projection version, source and unsupported actions;
7. retained output reconstructs from exact Agent revision, source state and
   artifact/projection provenance;
8. current and historical views distinguish Agent revision, head and lifecycle
   state and fail closed when history is unavailable;
9. Tenant scope, sharing policy, classification and redaction survive every
   projection;
10. no raw credentials, secrets, private Memory or hidden instructions leak;
11. provider/executor prompts remain replaceable compiled outputs;
12. migration from legacy composition Profile behavior is versioned,
    loss-explicit, reversible and separately authorized.

Product API/browser checks are required only if a future IMP changes those
surfaces. PostgreSQL/restart tests are required if canonical presentation state
or history becomes durable.

## 3. REQ closure

```text
Identity / behavior / presentation / capability: SEPARATED
Profile owner: CANONICAL AGENT SOURCE + PRODUCT API PROJECTION
Independent Profile aggregate/revision: NOT JUSTIFIED
Persona owner: AGENT REVISION
Legacy Profile conflict: EXPLICIT, ROUTED TO REQ-04
Presentation history/provenance: BOUNDED
REQ-01 B02 consequence: EXPLICIT INPUT TO REQ-03
Implementation blockers: EXPLICIT

EPIC-17-REQ-02: COMPLETE / ACCEPTED
Implementation authority: NONE
```
