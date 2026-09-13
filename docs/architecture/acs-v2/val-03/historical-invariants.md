# Historical invariants

| Entity / record | Original binding | After later heads / reassignment | Result |
| --- | --- | --- | --- |
| Run A | Workforce r3 | current Workforce r5 | PASS: remains r3 |
| Run A `research` | Agent A r1 pinned | Agent A advances to r3 | PASS: remains r1 |
| Run A `research-secondary` | separate Agent A r1 slot | same Agent identity | PASS: separate slot remains |
| Run A `review` | Agent B r1 resolved at admission | Agent B advances to r2 | PASS: remains r1 |
| Run B `review` | Agent B current head at later admission | Agent B r2 | PASS: resolves once to r2 |
| Attempt A | Assignment generation 1, Agent B r1, Workforce r3 | generation 2 supersedes it | PASS: historical binding preserved |
| Attempt B | Assignment generation 2, Agent A r1, Workforce r3 | current state evolves | PASS: historical binding preserved |

## Current versus historical truth

| Current | Historical |
| --- | --- |
| Workforce head r5 / archived | Run A r3; Run B r4 |
| Agent A head r3; Agent B head r2 | Run A Agent A r1 and Agent B r1; Run B Agent B r2 |
| Assignment generation 2 | generation 1 and Attempt A remain queryable |

Recovery validates Attempt A as `superseded_assignment` with its original intent and Attempt B as `resumable` with generation 2. It does not recalculate either record from current heads.
