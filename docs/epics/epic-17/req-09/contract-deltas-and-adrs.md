# REQ-09 Contract Deltas, ADRs and Blockers

## Candidate contract deltas

1. `E17-R09-CD01`: stable Tenant-scoped logical Activation reference and
   immutable causal/decision history.
2. `E17-R09-CD02`: normalized Trigger/Channel/Schedule/Manual cause observation
   with source identity, logical key, digest, timestamps and Evidence refs.
3. `E17-R09-CD03`: trigger/schedule specification keys and immutable normalized
   semantics under an exact Automation revision.
4. `E17-R09-CD04`: canonical logical occurrence key and payload-digest conflict
   rules across replay and concurrency.
5. `E17-R09-CD05`: durable occurrence claim plus shared idempotency, Event and
   outbox transaction/recovery semantics.
6. `E17-R09-CD06`: Activation lifecycle outcomes and stable rejection,
   cancellation, expiry, skip and coalescing reasons.
7. `E17-R09-CD07`: current direct/delegated authority, lifecycle and policy
   revalidation before admission.
8. `E17-R09-CD08`: exact target and REQ-03 effective-snapshot resolution bound
   to the Activation and admission decision.
9. `E17-R09-CD09`: idempotent Activation-to-admission-to-Run handoff and causal
   correlation without changing existing admission contracts implicitly.
10. `E17-R09-CD10`: durable schedule watermark/range proof, occurrence claim and
    bounded missed-work reconciliation semantics.
11. `E17-R09-CD11`: explicit separation of source, Activation, admission and
    execution retries and cancellations.
12. `E17-R09-CD12`: provider-neutral observation/evaluator adapter contract,
    including OpenClaw non-ownership constraints.
13. `E17-R09-CD13`: Activation Event/Evidence subject and full provenance chain.
14. `E17-R09-CD14`: existing Usage/Cost correlation to Automation revision and
    Activation, without new economic authority.

These are candidate logical deltas. They authorize no entity, aggregate,
repository, schema, table, endpoint, UI, scheduler, worker, provider or
implementation.

## Candidate ADRs

- `ADR-17-035`: Activation logical identity, causal history and representation
  topology.
- `ADR-17-036`: Trigger/Schedule authored specifications versus external
  observations and scheduler adapters.
- `ADR-17-037`: logical occurrence idempotency, conflict and concurrency rules.
- `ADR-17-038`: Activation-to-admission handoff and post-admission
  `RuntimeExecutionIntentV2` ordering.
- `ADR-17-039`: schedule watermark, missed-occurrence policy and restart
  reconciliation.
- `ADR-17-040`: Activation cancellation/retry versus Runtime
  cancellation/recovery.
- `ADR-17-041`: OpenClaw/provider-neutral observation and execution adapter
  boundary.
- `ADR-17-042`: Activation Evidence and Usage/Cost correlation.

## Blockers

| ID | Finding | Consequence |
| --- | --- | --- |
| `E17-R09-B01` | No canonical Activation identity, lifecycle or durable causal history exists | No implementation can prove one occurrence or reconstruct its decision path |
| `E17-R09-B02` | No normalized Trigger/Schedule/Channel/Manual observation contract or trusted source key exists | External replay and source authenticity cannot be handled canonically |
| `E17-R09-B03` | No Activation occurrence key, payload-digest conflict rule or durable claim exists | Concurrent/repeated observations can create ambiguous or duplicate admission |
| `E17-R09-B04` | No schedule rule owner implementation, durable watermark or missed-occurrence reconciliation contract exists | Restart-safe due-work evaluation is unproven |
| `E17-R09-B05` | Current `RuntimeExecutionIntentV2` is post-admission/post-assignment while the architecture shorthand says execution intent before admission | A future contract must name/map the pre-admission logical request without creating a second runtime intent |
| `E17-R09-B06` | Direct/delegated authority, lifecycle and policy revalidation is not connected to an Activation contract | Automation cannot safely reach admission |
| `E17-R09-B07` | REQ-03 effective snapshot and REQ-08 exact target resolution are not connected to Activation/admission | Dynamic resolution and historical reconstruction are incomplete |
| `E17-R09-B08` | No recoverably idempotent Activation-to-admission-to-Run correlation exists | Uncertain handoff may duplicate work or lose causation |
| `E17-R09-B09` | Activation retry/cancellation/recovery and execution retry/cancellation/recovery are not contractually separated | Recovery may silently create new work or bypass runtime owners |
| `E17-R09-B10` | Exact Workflow target revision/admission support remains incomplete | Unsupported Workflow targets must fail closed |
| `E17-R09-B11` | Events/Evidence lack Activation subject and occurrence vocabulary | Rejection, admission and execution cannot yet form one verifiable chain |
| `E17-R09-B12` | Usage/Cost lacks explicit Automation revision and Activation correlation | Existing Economics remains authoritative but attribution is incomplete |
| `E17-R09-B13` | No provider-neutral Trigger/Schedule observation adapter exists; OpenClaw exposes execution/target operations only | Provider observations cannot become canonical Activation inputs yet |

These blockers prevent implementation only. No incompatible Workforce,
Workflow, Runtime, Evidence, Economics or persistence change is required, so no
architecture escalation is active.
