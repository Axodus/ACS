# ACS-BLOCKER-020

## STATUS

PARTIAL / VALIDATION IN PROGRESS

## TITLE

Canonical Agent Inventory Alignment for Workforce Creation

## AFFECTED MILESTONE

ACS-V2-VAL-03 — Workforce End-to-End Acceptance & Contract Closure

## AUTHORIZATION

CTO remediation decision dated 2026-09-12 authorized correction of `VAL-03-DEFECT-003`.

The defect was an Application/Product API authority mismatch: `GET /api/v1/agents` read the legacy Agent service while `POST /api/v1/workforces` validated membership through Native Core lineage.

The authorized boundary preserves the Agent Select UX and keeps Workforce validation canonical. It does not authorize opaque Agent ID fallback, frontend reconciliation, synthetic Agents, weakened Workforce validation, or Agent identity changes.

## IMPLEMENTATION

The Native Core repository now exposes a tenant-filtered canonical Agent definition inventory. When Product API is connected to Native Core, `GET /api/v1/agents` projects that inventory into the existing `AgentListItem` response shape. The Application remains Product API-backed and sends the selected canonical Agent ID unchanged to `POST /api/v1/workforces`.

Clients that construct `ProductApiClient` without Native Core retain the existing legacy service behavior for compatibility with the pre-Native-Core Agent surface.

No migration was added. Workforce creation validation remains `nativeCore.getAgentLineage`, and tenant filtering is applied to canonical Agent discovery.

## VALIDATION EVIDENCE

- TypeScript build: PASS.
- `tests/s20-http-integration.test.mjs`: PASS, 1 passed, 0 failed, 0 skipped.
- `tests/acs-v2-val-03-postgres.test.mjs`: PASS, 1 passed, 0 failed, 0 skipped.
- `git diff --check`: PASS.
- Full `npm test`: NOT GREEN, 119 passed, 10 failed, 0 skipped across 129 files. The focused VAL-03 and S20 integration tests remain passing; the repository gate therefore remains open.
- No lint script is defined in `package.json`; `npm run build` is the repository typecheck/build gate.

## ACCEPTANCE STATE

The focused VAL-03 transversal scenario passes after the remediation. Full repository validation and the remaining regression gates are still required before this blocker can close and before VAL-03 may advance beyond `PARTIAL`.
