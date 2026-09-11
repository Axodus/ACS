# Agent–Workforce Membership

## Frozen decision

Workforce membership supports two explicit selector modes:

| Mode | Stored in Workforce revision | Resolved when | Reproducibility |
| --- | --- | --- | --- |
| pinned | Exact AgentRevisionRef | Revision creation and Run admission validation | Exact Agent revision is known before a Run. |
| current_head_at_admission | Stable agent_id | Run admission | Run records resolved exact Agent revision. |

There is no implicit latest Agent behavior during task dispatch. An admitted Run
MUST use the WorkforceRunMembershipV2 snapshot recorded at admission.

## Run membership snapshot

WorkforceRunMembershipV2 contains:

- run_id;
- workforce_revision_ref;
- slot_id;
- resolved_agent_revision_ref;
- optional role_ref;
- resolution_mode;
- resolved_at;
- authority_decision_ref.

One Run has one immutable membership snapshot for each member slot in its bound
Workforce revision. A snapshot MAY resolve the same Agent revision into more
than one slot. It MUST be written atomically with successful Run admission or
not written at all.

`role_ref`, when present, MUST be the exact governed-role id/revision recorded
by the bound Workforce revision. Run admission MUST NOT silently replace it
with the current role resource revision.

## Agent eligibility

- Archived Agents MUST NOT receive new Workforce membership revisions or new
  Run admissions.
- Disabled Agents MUST NOT be newly admitted through either selector mode
  unless an existing governance policy explicitly supplies an approved
  exception.
- A historical Run MUST retain a reference to a formerly active, disabled, or
  archived Agent revision; historical retention does not imply new eligibility.
- Any Agent lifecycle transition does not rewrite a Workforce revision or an
  admitted Run membership snapshot.

## Authority

Agent sharing scope, lifecycle eligibility, and policy references are supplied
by existing ACS governance/security layers. Workforce Core evaluates supplied
references. It MUST NOT manufacture a sharing exception or infer authority from
a role label.
