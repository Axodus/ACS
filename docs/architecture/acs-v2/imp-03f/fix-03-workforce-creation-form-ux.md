# ACS-V2-IMP-03F-FIX-03 — Workforce Creation Form UX & Visual Structure Refinement

## Decision status

`AUTHORIZED` on September 12, 2026.

`PARTIAL — UI REFINEMENT COMPLETE; LOOKUP GAPS REMAIN` on September 12, 2026.

## Before / problem

`/workforces/new` rendered the complete create request in one undifferentiated panel. Identity, member composition, policy references, and change metadata shared the same dense grid. Agent selection was a raw `agentId` text field, so users had to know an opaque canonical identifier before creating a Workforce.

## Resulting form hierarchy

The form now uses the established ACS `panel`, `panel-head`, `panel-body`, `form-grid`, and `form-actions` patterns with separate containers for:

- Basic Information;
- Composition;
- Governance & Authority;
- Runtime / Admission Configuration;
- final Cancel / Create action area.

The initial member is presented as a structured member card. Slot identity remains visible and is kept separate from Agent identity. The responsive grid collapses to one column at narrow widths.

## Raw ID audit

| Field | Before | After | Lookup source | Canonical value sent |
| --- | --- | --- | --- | --- |
| Agent | Free text `agentId` | Native Select with Agent name, ID, and current revision metadata | `GET /api/v1/agents` via `productApi.listAgents()` | Selected `agentId` |
| Workforce ID | Required free text | Preserved as canonical identifier input | No lookup; user supplies the contract field | `workforceId` |
| Slot | Required free text | Preserved as canonical slot input, with slot semantics helper text | No accepted slot catalog in the create contract | `slotId` |
| Ownership reference | Required free text | Preserved with authority lookup gap helper text | No accepted authority lookup for this form | `ownershipRef` |
| Membership policy | ID, revision, fingerprint inputs | Preserved as canonical policy reference fields | No accepted policy listing endpoint in the application client | `membershipPolicyRef` |
| Audit policy | ID, revision, fingerprint inputs | Preserved as canonical policy reference fields | No accepted policy listing endpoint in the application client | `auditPolicyRef` |

## Agent and revision UX

Agent selection is human-facing and retains the canonical ID internally. The selected Agent metadata shows the ID, current revision, and status. The accepted initial Workforce creation contract does not expose a member revision mode or pinned revision input; the form therefore states the existing `current head at Run admission` behavior without changing the request shape.

## Governance and role decisions

The accepted `WorkforceCreateInput` has no governed `roleRef` or authority selection field. The UI does not invent either field. There is a Product API role listing surface used by Agent configuration, but it is not part of this Workforce creation contract. Authority and policy fields remain explicit canonical fallbacks until a narrow Product API read capability is authorized.

## Validation

- IMP-03F standalone tests: 13 passed, 0 failed, 0 skipped.
- Typecheck: passed.
- Lint: passed.
- Build: passed; Vite emitted the existing large-chunk warning.
- `git diff --check`: passed.

Browser route validation was not executed in this change because the acceptance script requires a running standalone host and its external Product API fixture. The route remains covered by the existing browser harness and route matrix source assertions.

## Lookup capability gaps

| Field | Canonical entity | Existing backend primitive | Missing Product API capability | UX impact |
| --- | --- | --- | --- | --- |
| Ownership reference | Governance / authority reference | Create contract accepts `ownershipRef` | Read/list authority lookup for Workforce creation | Opaque reference remains a required fallback input |
| Membership policy | Policy revision reference | Create contract accepts policy ID, revision, fingerprint | Read/list policy revisions for selection | Opaque policy reference fields remain visible |
| Audit policy | Policy revision reference | Create contract accepts policy ID, revision, fingerprint | Read/list policy revisions for selection | Opaque policy reference fields remain visible |
| Governed role | Role revision reference | Role catalog exists for other surfaces; create input has no role field | Authorized Workforce create role field and lookup path | No role control is rendered |

## Boundary and regression statement

The form continues to call only `Application → Product API → Native Core`. No backend, persistence, lifecycle, revision, governance authority, idempotency, or request payload semantics changed. Creation still navigates to `/workforces/:id` after the canonical Product API response.

