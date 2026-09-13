# REQ-12 Capability Closure Matrix

**Coverage:** `76 / 76`
**Implementation authority:** none

This matrix preserves the original inventory row, review classification and
primary accepted REQ. Closure state describes architecture disposition; the
implementation column is a candidate dependency only.

| ID | Capability | Review class | Accepted owner REQ | Architecture closure | Implementation disposition |
| --- | --- | --- | --- | --- | --- |
| `E17-C01` | Administration domain | `EXTEND` | `REQ-10` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-07 / IMP-09` after its specific blockers and CTO gate. |
| `E17-C02` | Global Settings | `NEW` | `REQ-10` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-07 / IMP-09`. |
| `E17-C03` | Model catalog | `ADAPT` | `REQ-04` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-02` after its specific blockers and CTO gate. |
| `E17-C04` | Skills | `ADAPT` | `REQ-04` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-02` after its specific blockers and CTO gate. |
| `E17-C05` | Tools | `EXTEND` | `REQ-04` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-02` after its specific blockers and CTO gate. |
| `E17-C06` | Capabilities | `EXTEND` | `REQ-04` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-02` after its specific blockers and CTO gate. |
| `E17-C07` | Connector definition | `ADAPT` | `REQ-05` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-03A` after its specific blockers and CTO gate. |
| `E17-C08` | Connection | `REUSE` | `REQ-05` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-03A`; create no new owner. |
| `E17-C09` | Credentials and secrets | `REUSE` | `REQ-05` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-03A`; create no new owner. |
| `E17-C10` | Channels | `NEW` | `REQ-05` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-03A`. |
| `E17-C11` | Runtime/system configuration | `EXTEND` | `REQ-03` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-02` after its specific blockers and CTO gate. |
| `E17-C12` | Agent identity | `REUSE` | `REQ-01` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-01`; create no new owner. |
| `E17-C13` | Agent lifecycle | `REUSE` | `REQ-01` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-01`; create no new owner. |
| `E17-C14` | Agent revisions | `REUSE` | `REQ-01` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-01`; create no new owner. |
| `E17-C15` | Agent lineage/history | `REUSE` | `REQ-01` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-01`; create no new owner. |
| `E17-C16` | Canonical name, role and mission | `EXTEND` | `REQ-02` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-01` after its specific blockers and CTO gate. |
| `E17-C17` | Profile | `ADAPT` | `REQ-02` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-01` after its specific blockers and CTO gate. |
| `E17-C18` | Avatar/profile asset | `NEW` | `REQ-11` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-08`. |
| `E17-C19` | Headline, bio and description | `NEW` | `REQ-02` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-01`. |
| `E17-C20` | Persona | `EXTEND` | `REQ-02` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-01` after its specific blockers and CTO gate. |
| `E17-C21` | Custom instructions | `REUSE` | `REQ-02` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-01`; create no new owner. |
| `E17-C22` | Model preferences | `ADAPT` | `REQ-04` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-02` after its specific blockers and CTO gate. |
| `E17-C23` | Skill bindings | `REUSE` | `REQ-04` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-02`; create no new owner. |
| `E17-C24` | Connector permissions | `ADAPT` | `REQ-05` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-03A` after its specific blockers and CTO gate. |
| `E17-C25` | Channel permissions | `NEW` | `REQ-05` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-03A`. |
| `E17-C26` | Memory policy | `NEW` | `REQ-06` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-03B`. |
| `E17-C27` | Displayed skills | `ADAPT` | `REQ-02` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-01` after its specific blockers and CTO gate. |
| `E17-C28` | Badges | `NEW` | `REQ-11` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-08`. |
| `E17-C29` | Historically reconstructable behavior | `EXTEND` | `REQ-03` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-02` after its specific blockers and CTO gate. |
| `E17-C30` | Working Memory | `NEW` | `REQ-06` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-03B`. |
| `E17-C31` | Agent Memory | `NEW` | `REQ-06` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-03B`. |
| `E17-C32` | Workforce Shared Memory | `NEW` | `REQ-06` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-03B`. |
| `E17-C33` | User/context Memory | `NEW` | `REQ-06` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-03B`. |
| `E17-C34` | Knowledge Memory | `ADAPT` | `REQ-06` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-03B` after its specific blockers and CTO gate. |
| `E17-C35` | Historical/episodic Memory as an alias for Evidence/history | `REJECT` | `REQ-06` | `REJECTED` | No IMP; preserve fail-closed prohibition. |
| `E17-C36` | Agent-to-Agent delegation | `NEW` | `REQ-07` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-04`. |
| `E17-C37` | Delegation permissions | `NEW` | `REQ-07` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-04`. |
| `E17-C38` | Depth/recursion policy | `NEW` | `REQ-07` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-04`. |
| `E17-C39` | Delegation history | `ADAPT` | `REQ-07` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-04` after its specific blockers and CTO gate. |
| `E17-C40` | Sub-Agent identity | `REJECT` | `REQ-07` | `REJECTED` | No IMP; preserve fail-closed prohibition. |
| `E17-C41` | Workforce | `REUSE` | `REQ-07` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-04`; create no new owner. |
| `E17-C42` | Workforce membership and Run admission | `REUSE` | `REQ-07` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-04`; create no new owner. |
| `E17-C43` | Automation domain | `NEW` | `REQ-08` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-05`. |
| `E17-C44` | Automation identity and revisions | `NEW` | `REQ-08` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-05`. |
| `E17-C45` | Automation lifecycle | `NEW` | `REQ-08` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-05`. |
| `E17-C46` | Scheduled Tasks | `NEW` | `REQ-09` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-06`. |
| `E17-C47` | Triggers | `NEW` | `REQ-09` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-06`. |
| `E17-C48` | Schedules | `NEW` | `REQ-09` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-06`. |
| `E17-C49` | Target resolution | `ADAPT` | `REQ-08` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-05` after its specific blockers and CTO gate. |
| `E17-C50` | Execution policies | `REUSE` | `REQ-03` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-02`; create no new owner. |
| `E17-C51` | Idempotent activation | `EXTEND` | `REQ-09` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-06` after its specific blockers and CTO gate. |
| `E17-C52` | Retry and concurrency | `ADAPT` | `REQ-09` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-06` after its specific blockers and CTO gate. |
| `E17-C53` | Automation history | `ADAPT` | `REQ-09` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-06` after its specific blockers and CTO gate. |
| `E17-C54` | Recovery/restart | `EXTEND` | `REQ-09` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-06` after its specific blockers and CTO gate. |
| `E17-C55` | Run linkage | `EXTEND` | `REQ-09` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-06` after its specific blockers and CTO gate. |
| `E17-C56` | Workflow target | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C57` | Run/Task/Assignment/Attempt | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C58` | Runtime resolution | `EXTEND` | `REQ-03` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-02` after its specific blockers and CTO gate. |
| `E17-C59` | OpenClaw execution | `ADAPT` | `REQ-09` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-06` after its specific blockers and CTO gate. |
| `E17-C60` | Codex/alternative runtime compatibility | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C61` | Evidence | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C62` | Provenance | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C63` | Usage and Cost | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C64` | Economics | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C65` | Events/outbox/idempotency | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C66` | PostgreSQL shared state | `REUSE` | `REQ-09` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-06`; create no new owner. |
| `E17-C67` | Product API | `EXTEND` | `REQ-10` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-07 / IMP-09` after its specific blockers and CTO gate. |
| `E17-C68` | Control Plane | `EXTEND` | `REQ-10` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-07 / IMP-09` after its specific blockers and CTO gate. |
| `E17-C69` | Tenant isolation | `REUSE` | `REQ-12` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-10`; create no new owner. |
| `E17-C70` | Security | `REUSE` | `REQ-12` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-10`; create no new owner. |
| `E17-C71` | Trait classification | `NEW` | `REQ-11` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-08`. |
| `E17-C72` | Lineage-ready identity | `REUSE` | `REQ-11` | `SATISFIED BY EXISTING SYSTEM` | Reverify existing owner/conformance in `IMP-08`; create no new owner. |
| `E17-C73` | Historical reconstruction | `EXTEND` | `REQ-11` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-08` after its specific blockers and CTO gate. |
| `E17-C74` | Evidence association | `ADAPT` | `REQ-11` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-08` after its specific blockers and CTO gate. |
| `E17-C75` | Future representation compatibility | `NEW` | `REQ-11` | `DEFERRED WITH EXPLICIT BLOCKER` | No implementation until the missing contract/owner is accepted in `IMP-08`. |
| `E17-C76` | Performance history | `ADAPT` | `REQ-11` | `SPECIFIED BY ACCEPTED REQ` | Candidate work in `IMP-08` after its specific blockers and CTO gate. |

## Reconciliation

```text
REUSE satisfied by existing owners: 23
ADAPT specified by accepted REQs: 15
EXTEND specified by accepted REQs: 14
NEW deferred with explicit blockers: 22
REJECT remains prohibited: 2
TOTAL: 76 / 76
Unmapped: 0
CEO escalation required: 0
Implementation authority: NONE
```

All rows are rechecked in `IMP-10`. A later IMP may narrow scope only by
keeping the omitted path explicitly unavailable or rejected.
