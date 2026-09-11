# Workforce Revision Semantics

## What creates a revision

The following MUST create a new immutable Workforce revision:

- Changing display name or the enduring composition purpose.
- Adding, removing, or reordering a member slot.
- Changing a slot id, Agent selector, pinned Agent revision, role reference,
  responsibility, capability, authority constraint, or participation constraint.
- Changing composition-level membership or audit-policy references.
- Changing the Workforce lifecycle status when lifecycle is modeled in the
  canonical definition.

The following MUST NOT change a Workforce revision:

- Task assignment or reassignment during a Run.
- Task graph/dependency changes.
- Runtime Worker, executor, or provider resolution.
- Usage, cost, evidence, checkpoint, retry, or provider trace.
- Current-head Agent resolution for a specific Run.

Coordination policy change belongs to Workflow/Coordination. It MUST create a
Workflow/Coordination revision or immutable Run plan snapshot, not a Workforce
revision, unless it also changes a Workforce composition field.

## Head and concurrency

Revision 1 is the root. Every successor MUST record its immediate predecessor.
An authorized update is append revision plus advance head in one transaction. It
MUST accept an expected head revision and use existing shared-state CAS.
Concurrent writers from the same expected head result in one success and one
deterministic conflict; ACS MUST NOT merge roster changes implicitly.

The current head is selected only by committing revision 1 or an authorized
successor. ACS MUST NOT provide a direct operation that rewinds the head to an
already committed historical revision. An authorized operator MAY create a new
successor whose composition is copied from a historical revision, with a
change-reason and provenance reference. That successor receives a new revision
number and fingerprint.

Historical revisions MUST never be modified or physically deleted by the native
path. A material retention/deletion requirement requires separate review because
Run evidence references must remain valid.

## Historical reproducibility

At Run admission ACS freezes both workforce_revision_ref and the resolved Agent
revision for every slot. Reconstructing a historical Run therefore needs only
the Workforce revision, Run membership snapshot, Agent revision history,
Run/Task/Attempt records, and evidence references. It MUST NOT require a
provider API, executor session, Eigent SQLite, or CAMEL memory.
