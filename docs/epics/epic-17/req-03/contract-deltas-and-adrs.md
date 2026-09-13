# REQ-03 Proposed Contract Deltas and ADRs

**Authority:** candidates for later acceptance and implementation planning only

## Proposed deltas

| ID | Gap | Candidate direction |
| --- | --- | --- |
| `E17-R03-CD01` | `runtime_configuration` is an untyped object | Add a versioned effective-configuration snapshot/reference contract covering the class matrix. |
| `E17-R03-CD02` | No canonical resolver identity/fingerprint | Add resolver/schema/class-rule versions plus input/effective fingerprints. |
| `E17-R03-CD03` | Binding and intent do not explicitly share snapshot identity | Bind the accepted snapshot to existing `ExecutionBindingV2`, intent, assignment generation and event chain. |
| `E17-R03-CD04` | Head/lifecycle source history is incomplete | Capture admission observation/decision source explicitly and preserve typed incomplete-history status until Agent history is accepted. |
| `E17-R03-CD05` | Generic provenance does not explain class decisions | Add per-class source, decision, attenuation and rejection provenance with stable error codes. |
| `E17-R03-CD06` | Retry/recovery refresh behavior is unstated | Reuse immutable snapshot for the same admitted generation; require explicit re-admission and linked snapshot for change. |
| `E17-R03-CD07` | Late-bound credentials/availability could break reproducibility | Freeze opaque version/decision/evidence refs, never secret values; record later runtime observations separately. |
| `E17-R03-CD08` | Legacy composition may inject Profile capabilities | Exclude presentation Profile and unresolved legacy Profile preset from canonical grants; route resource semantics to REQ-04. |

## Candidate ADRs

### ADR-17-007 — Class-specific effective configuration resolution

Accept admission as resolver owner, with distinct merge/selection rules per
configuration class and no universal override chain.

### ADR-17-008 — Immutable snapshot per admitted binding generation

Accept one immutable, fingerprinted logical snapshot per admitted binding
generation, referenced through existing Run/runtime evidence rather than a new
execution model.

### ADR-17-009 — Revision, head and lifecycle source separation

Preserve authored revision, current head, lifecycle history and admission
decision as distinct source categories. Reject copying all mutable head state
into Agent revision as a generic history fix.

### ADR-17-010 — Reconstruction from accepted snapshot, not current state

Historical reconstruction verifies the immutable snapshot and exact refs; it
does not query current/latest state to recreate past execution.

## Implementation blockers

| ID | Blocker | Resolution gate |
| --- | --- | --- |
| `E17-R03-B01` | Current runtime intent configuration/provenance are generic and partial. | Accept typed snapshot and binding deltas; prove canonical serialization, fingerprint and restart reconstruction. |
| `E17-R03-B02` | `E17-R01-B02` leaves Agent head/lifecycle history incomplete. | Accept one Agent-owned historical mechanism later; until then preserve explicit incomplete-source status. |
| `E17-R03-B03` | Several policy/resource catalogs lack proven immutable durable history. | REQ-04/05/06 must freeze owners and exact historical references before full configuration IMP. |
| `E17-R03-B04` | Legacy consumers and Profile-derived capabilities can create competing effective configuration. | Adapt callers after REQ-04 and the Agent seam IMP are approved; no dual resolver. |
| `E17-R03-B05` | Existing `plan_fingerprint` is not proven equivalent to a full effective-configuration fingerprint. | Define and test fingerprint relationship before implementation. |

No blocker prevents REQ-03 acceptance. All block future implementation.

## Escalation result

No CEO escalation is required. No new economic authority, Agent model,
Workforce field, runtime scheduler or persistence service is proposed.
