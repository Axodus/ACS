# ACS-V2-IMP-03F-FIX-03 — Workforce Creation Form UX & Visual Structure Refinement

## Decision status

`AUTHORIZED` on September 12, 2026.

`ACCEPTED` on September 12, 2026, after `ACS-BLOCKER-020` was accepted and the canonical tenant-scoped Agent discovery surface became available to the Workforce form.

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

The accepted `WorkforceCreateInput` has no governed `roleRef` or authority selection field. The UI does not invent either field. There is a Product API role listing surface used by Agent configuration, but it is not part of this Workforce creation contract. Ownership and policy references remain explicit canonical fallbacks because the accepted Workforce create flow exposes no corresponding listing/read capability. These are bounded contract limitations, not a blocker to the FIX-03 UI correction.

## Validation

- IMP-03F standalone tests: 13 passed, 0 failed, 0 skipped.
- Typecheck: passed.
- Lint: passed.
- Build: passed; Vite emitted the existing large-chunk warning.
- Browser acceptance: 88 route/viewport checks completed; `/workforces/new` passed at 1440x900, 1280x800, 768x1024, and 390x844. The overall harness retained its existing fixture caveat on unrelated Workforce routes.
- `git diff --check`: passed.
- Current local root rerun: `npm test` completed with 718 passed, 0 failed, and 14 PostgreSQL-gated skips because `ACS_SH_DATABASE_URL` was not configured in this shell.
- Integrated repository validation supplied with `ACS-BLOCKER-020`: `npm test` 732 passed, 0 failed, 0 skipped; Product API build passed; VAL-03 passed 1/1.

## Lookup capability gaps

| Field | Canonical entity | Existing backend primitive | Missing Product API capability | UX impact |
| --- | --- | --- | --- | --- |
| Ownership reference | Governance / authority reference | Create contract accepts `ownershipRef` | No accepted authority read/list surface for Workforce creation | Opaque reference remains a required canonical fallback input |
| Membership policy | Policy revision reference | Create contract accepts policy ID, revision, fingerprint | No accepted policy read/list surface for Workforce creation | Opaque policy reference fields remain visible and canonical |
| Audit policy | Policy revision reference | Create contract accepts policy ID, revision, fingerprint | No accepted policy read/list surface for Workforce creation | Opaque policy reference fields remain visible and canonical |
| Governed role | Role revision reference | Role catalog exists for other surfaces; create input has no role field | Authorized Workforce create role field and lookup path | No role control is rendered |

## Boundary and regression statement

The form continues to call only `Application → Product API → Native Core`. No backend, persistence, lifecycle, revision, governance authority, idempotency, or request payload semantics changed. Creation still navigates to `/workforces/:id` after the canonical Product API response.

## Recommendation

`ACS-V2-IMP-03F-FIX-03 CAN BE ACCEPTED`
