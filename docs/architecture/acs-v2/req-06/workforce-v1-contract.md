# Workforce v1 Contract

## Normative status

This is a FROZEN-v1 ACS-native architecture contract. Names are conceptual
until separately implemented. The contract MUST be implementable after deleting
~/.eigent and without CAMEL installed.

## Workforce identity

WorkforceDefinitionV2 has:

- schema_version: existing ACS native schema version.
- workforce_id: opaque ACS-generated immutable stable identifier.
- scope: existing ACS Scope.
- current_status: denormalized lifecycle status of the current revision.
- current_revision: positive monotonic integer.
- ownership_ref: ACS governance/product ownership reference.
- created_at and updated_at.

workforce_id MUST be owned and assigned by ACS. It MUST NOT be an executor,
provider, CAMEL node, Eigent task, worker-host, process, UI, or external
framework identifier. A Workforce MAY exist without any Run.

## Revision

WorkforceRevisionRef equals workforce_id, revision, and fingerprint.

WorkforceRevisionV2 has:

- schema_version: existing ACS native schema version;
- ref and optional supersedes_revision;
- display_name: non-empty revision-bearing display metadata;
- purpose: non-empty statement of the enduring composition purpose;
- lifecycle_status: draft, active, disabled, or archived;
- ordered non-empty members;
- immutable composition constraints;
- governance authority and membership-policy references;
- evidence audit-policy reference;
- commit actor, timestamp, and reason.

`current_status` is an indexable projection of the current revision's
`lifecycle_status`; it MUST be transactionally advanced with the head and MUST
NOT be independently mutable. `purpose` states why the composition exists. It
MUST NOT contain a task input, task graph, invocation-specific objective,
output schema, provider instruction,
or runtime plan; those belong to Workflow/Coordination or Run/Task. The
revision fingerprint MUST cover every semantic field, including display name,
purpose, lifecycle status, member order, slot id, member selector, role
reference, constraints, and policy references. It MUST exclude timestamps and
non-semantic transport metadata. A committed revision is append-only. Repeating an identical command
for the same revision is idempotent; a different payload is a conflict.

## Member slot

WorkforceMemberV2 has:

- slot_id: stable unique identifier within a Workforce lineage.
- agent_selector:
  - mode: pinned or current_head_at_admission;
  - agent_id: ACS Agent identity;
  - pinned_revision_ref when mode is pinned.
- optional role_ref to governed role revision.
- normalized responsibilities.
- required capability, authority-constraint, and participation-constraint refs.

slot_id is composition identity, not Agent identity. The same Agent MAY appear
in more than one slot when every slot has a distinct slot_id and its
responsibilities/constraints are distinguishable. This preserves one Agent in
multiple roles without implying concurrent execution rights.

Pinned requires an exact AgentRevisionRef in the Workforce revision.
Current_head_at_admission records only stable agent_id in the Workforce
revision; Run admission resolves and freezes the eligible current Agent revision
in WorkforceRunMembershipV2. It MUST NOT mutate the Workforce revision to do
so.

A role reference, when present, MUST include the exact governed role resource
revision. A role revision MAY describe capability expectations, but it MUST NOT
grant authority by its label alone; the member slot's authority constraints and
the supplied ACS governance decision remain controlling. A role that is
deprecated, unknown, or not eligible under the membership policy MUST be
rejected for a new Workforce revision or new Run admission. Its historical
reference remains readable for evidence reconstruction. Workforce Core MUST
rely on governed-resource history to resolve the exact referenced role revision;
it MUST NOT create a parallel WorkforceRole aggregate or substitute the
registry's current role revision during reconstruction.

## Validation invariants

1. A Workforce revision MUST have at least one member slot.
2. slot_id MUST be unique within the lineage and MUST NOT be reused for a
   materially different responsibility without a new revision.
3. A referenced Agent MUST be in an allowed scope or have an explicit
   authorized sharing path.
4. A pinned Agent revision MUST exist, match its fingerprint, and be eligible
   under the membership policy at revision creation.
5. An archived Agent MUST NOT be newly admitted through either selector mode.
   A disabled Agent MUST NOT be newly admitted through either selector mode
   unless an existing governance policy explicitly supplies an approved
   exception. Historical pinned references remain valid for evidence
   reconstruction but do not override Run admission policy.
6. Workforce Core MUST NOT contain provider, model, executor, runtime Worker,
   credential value, task graph, queue, or mutable coordination state.
