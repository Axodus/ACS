# Product API Requirements

No endpoint is implemented by REQ-06.

| Operation | Classification | Notes |
| --- | --- | --- |
| Create Workforce | REQUIRED FOR CORE | Scope, identity metadata, first composition, authority, idempotency. |
| Get/list Workforce and revisions | REQUIRED FOR CORE | Bounded scope, current head, immutable history. |
| Resolve referenced governed role revision | REQUIRED FOR CORE | Uses the existing resource domain; exact historical revision must be readable before Workforce revision or Run admission succeeds. |
| Create Workforce revision | REQUIRED FOR CORE | Expected head, reason, authority, idempotency. |
| Recreate prior composition as a successor revision | REQUIRED FOR CORE | Creates a new revision with provenance; it is not a current-head rewind. |
| Activate/disable/archive Workforce | REQUIRED FOR CORE | Lifecycle command creates a canonical revision/head transition. |
| Inspect Run membership snapshot | REQUIRED FOR CORE | Historical reproducibility/evidence read. |
| Bind Workforce to Run | REQUIRED FOR CORE | Part of execution admission, not a UI-only endpoint. |
| Historical Workforce replay/reconstruction bind | REQUIRED LATER | Distinct, authority-gated operation; it cannot masquerade as new operational admission. |
| List Workforce-scoped runs/evidence/usage | REQUIRED LATER | Needs bounded indexed projections. |
| Task assignment/reassignment command | REQUIRED LATER | Depends on Coordination and assignment persistence. |
| Dynamic graph amendment | REQUIRED LATER | Depends on Workflow graph contract and policy gates. |
| Workforce editor partial mutation | REJECT | Change must create a complete immutable revision. |
| Select a committed historical revision as current head | REJECT | Direct head rewind would break monotonic revision semantics; create an authorized successor instead. |
| Delete Workforce or historical revision | REJECT | Archive retains canonical history, Run reconstruction, evidence, and cost linkage. |
| Provider/CAMEL-specific Workforce API | REJECT | Violates removable-adapter boundary. |
| Dashboard aggregation | OPTIONAL | Read model after canonical records exist. |

## Authority boundary

| Operation | Authority supplied by existing ACS layers | Freeze rule |
| --- | --- | --- |
| Create Workforce | Composition/create authority for the requested Scope. | Creates revision 1 only after validation. |
| Change membership or role | Composition-revision authority and current-head CAS. | Creates one complete successor revision; role label grants no authority. |
| Select current revision | Same authority as revision creation. | There is no direct selection; a committed successor advances head. |
| Lifecycle transition | Lifecycle authority for the Workforce Scope. | Appends a revision and updates the current-status projection atomically. |
| Bind Workforce to Run | Run admission authority plus Workforce membership/scope checks. | Binds the active current head for a new operational Run. |
| Assign or reassign Task | Workflow/Coordination decision authority plus Task/Run policy checks. | Records an additive assignment decision; it cannot alter Workforce membership. |
| Archive | Lifecycle/archive authority. | Archive is append-only and does not delete history. |
| Delete | None. | Rejected by the native Workforce path. |

Product API MUST pass actor, scope, correlation, causation, idempotency, and
authority references. It MUST NOT infer privilege from a Workforce role or
executor identity.

No CEO-level economic, governance, or security redesign is proposed. Future
policy that grants Workforce self-modification, broadens cross-scope Agent
sharing, changes economic responsibility, or lets adapters bypass governance
requires CEO review before implementation.
