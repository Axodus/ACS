# Historical invariants

## Proven before the blocking checkpoint

| Entity / record | Original binding | After current-head change | Result |
| --- | --- | --- | --- |
| Workforce r1 | immutable initial draft | r2/r3 successors are created | PASS |
| Workforce r3 slots | `research` and `research-secondary` both reference Agent A r1 | slot identities remain separate | PASS |
| Run A membership | Workforce r3; Agent A r1 pinned; Agent B r1 resolved | no later mutation occurred before compiler block | PASS at admission |
| Workforce head | r3 at Run A admission | later r4/r5 not reached in the failed execution | not evaluated in VAL-03 |
| Attempt A / B | requires runtime compiler | compiler fails before creation | BLOCKED |

## Current versus historical truth

| Current record | Historical record | VAL-03 disposition |
| --- | --- | --- |
| Workforce head | Run-admitted Workforce revision | admission is exact; later-head proof blocked |
| Agent head | resolved Agent revision in Run membership | current-head resolution at Run A is exact; later-head proof blocked |
| current task assignment | assignment history / Attempt binding | Decision A established generation 1; runtime proof blocked |

The blocking defect prevents a valid conclusion about later Attempt history. No claim is made for invariants that were not reached.
