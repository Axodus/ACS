# REQ-07 Contract Deltas, ADRs and Blockers

## Candidate contract deltas

1. `E17-R07-CD01`: stable immutable Delegation grant reference/record with
   canonical Agent endpoints and Tenant scope.
2. `E17-R07-CD02`: typed delegated authority set for actions, resources,
   purpose, scope and explicit exclusions.
3. `E17-R07-CD03`: deterministic attenuation resolver and effective-authority
   fingerprint.
4. `E17-R07-CD04`: parent-chain, depth, onward-delegation and cycle-rejection
   semantics.
5. `E17-R07-CD05`: issue, expiry, revocation, supersession and active-work
   enforcement references.
6. `E17-R07-CD06`: admission/authority decision and REQ-03 snapshot integration.
7. `E17-R07-CD07`: opaque Connection/Credential-purpose delegation and bounded
   Memory scope/operation delegation.
8. `E17-R07-CD08`: Delegation event, Decision, Approval and Evidence subject/
   correlation vocabulary.
9. `E17-R07-CD09`: legacy `canSpawnSubAgents/subAgentScope` compatibility and
   deprecation treatment.
10. `E17-R07-CD10`: Product API/Administration projections reserved for
    REQ-10.

These are candidate logical deltas. They authorize no entity, aggregate,
schema, table, service, endpoint, UI, migration or implementation.

## Candidate ADRs

- `ADR-17-025`: Delegation logical grant owner and physical representation.
- `ADR-17-026`: attenuation algorithm and explicit authority-basis selection.
- `ADR-17-027`: chain depth, onward delegation and cycle prevention.
- `ADR-17-028`: expiry/revocation interaction with admission, retry and active
  Runs.
- `ADR-17-029`: legacy sub-Agent metadata compatibility/deprecation.

## Blockers

| ID | Finding | Consequence |
| --- | --- | --- |
| `E17-R07-B01` | No canonical Delegation grant/reference or durable history exists | No delegated operation can be implemented as canonical |
| `E17-R07-B02` | No typed authority-set/intersection resolver exists | Attenuation, explicit authority basis and fail-closed errors are unproven |
| `E17-R07-B03` | No chain/depth/cycle contract exists | Onward delegation remains disabled for implementation planning |
| `E17-R07-B04` | Revocation/expiry enforcement for admitted and active work is not defined in current runtime contracts | A future IMP must reconcile cancellation/retry without mutating snapshots |
| `E17-R07-B05` | Events/Evidence lack a Delegation subject and chain correlation contract | Historical reconstruction cannot yet be claimed |
| `E17-R07-B06` | Legacy `canSpawnSubAgents/subAgentScope` metadata can be mistaken for authority | Compatibility must fail closed and never auto-migrate to an active grant |
| `E17-R07-B07` | No cross-Tenant Delegation authority contract exists | Cross-Tenant grants remain rejected unless architecture explicitly establishes one |

These blockers prevent implementation only. No Workforce incompatibility was
required or discovered, so no architecture escalation is active at this gate.
