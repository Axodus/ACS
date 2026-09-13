# REQ-08 Contract Deltas, ADRs and Blockers

## Candidate contract deltas

1. `E17-R08-CD01`: stable Tenant-scoped Automation identity/head reference.
2. `E17-R08-CD02`: immutable fingerprinted Automation revision and predecessor
   provenance.
3. `E17-R08-CD03`: lifecycle command/history semantics for draft, enabled,
   disabled and archived eligibility with CAS/idempotency.
4. `E17-R08-CD04`: canonical target selector supporting explicit pinned or
   resolve-at-Activation modes.
5. `E17-R08-CD05`: authored configuration requirements and exact governed
   policy/resource references without effective runtime state.
6. `E17-R08-CD06`: configuration-authority and execution-authority basis
   separation, including optional Delegation refs and revalidation requirements.
7. `E17-R08-CD07`: Automation Evidence subject, source, decision and lifecycle
   event/outbox vocabulary.
8. `E17-R08-CD08`: Automation revision -> Activation -> Run/Task/Attempt
   correlation seam reserved for REQ-09.
9. `E17-R08-CD09`: Usage/Cost attribution correlation under existing
   Accounting/Economics authority.
10. `E17-R08-CD10`: Product API and Administration projections reserved for
    REQ-10.

These are candidate logical deltas. They authorize no entity, aggregate,
repository, schema, table, endpoint, UI, scheduler, provider or implementation.

## Candidate ADRs

- `ADR-17-030`: Automation owner, stable identity and representation topology.
- `ADR-17-031`: immutable authored revision versus lifecycle/head history.
- `ADR-17-032`: target selector and Activation-time exact resolution.
- `ADR-17-033`: Automation authority basis and Delegation revalidation.
- `ADR-17-034`: Evidence and Usage/Cost correlation across Automation,
  Activation and Run.

## Blockers

| ID | Finding | Consequence |
| --- | --- | --- |
| `E17-R08-B01` | No canonical Automation identity/revision/lifecycle contract or durable history exists | No Automation implementation can be canonical |
| `E17-R08-B02` | Exact admission-capable target identity/revision semantics are not uniformly implemented, especially for Workflow | Unsupported target kinds must fail closed |
| `E17-R08-B03` | No Automation CAS, fingerprint, lifecycle event or transactional outbox contract exists | Historical and concurrent mutation guarantees are unproven |
| `E17-R08-B04` | Authored Automation configuration is not integrated with the typed REQ-03 effective snapshot | Runtime configuration cannot be reconstructed from Automation yet |
| `E17-R08-B05` | Direct/delegated authority revalidation at Activation has no contract | Automation cannot safely produce an execution request; REQ-09 must resolve the handoff |
| `E17-R08-B06` | No Activation identity/idempotency/history or Run correlation exists | Occurrence history and execution causality remain unimplemented pending REQ-09 |
| `E17-R08-B07` | Evidence lacks an Automation subject/reference vocabulary | Lifecycle and revision proof cannot yet be claimed |
| `E17-R08-B08` | Usage/Cost records lack explicit Automation/Activation correlation | Economics remains authoritative but Automation attribution is incomplete |

These blockers prevent implementation only. No incompatible Agent, Workforce,
Workflow, Runtime, Evidence or Economics change is required by the proposed
boundary, so no architecture escalation is active.
