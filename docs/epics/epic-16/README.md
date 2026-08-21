# EPIC-16 — Production Financial Operations

**Status:** PLANNED / IMPLEMENTATION NOT YET STARTED  
**Normative baseline:** `9005e3a2167d7984f8f129eea4987c3a73f59e1f`  
**Mission decision:** `docs/epics/BR-02_EPIC-16_Mission_Decision.md` — APPROVE  
**Planning boundary:** `docs/epics/EPIC-16-17_Post-15.5_Boundary_Review.md`

## Mission

EPIC-16 makes ACS execution economics operationally governable in production by connecting pricing visibility, economic authorization, reservation lifecycle, usage correlation, settlement operations, reconciliation, financial exceptions and durable evidence into one supported operator lifecycle.

The EPIC does not redefine ACS as a billing, accounting, tax, banking or payment-processing system.

## Runtime topology

EPIC-16 recognizes exactly three supported environments:

| Concern | LOCAL | DEVELOPMENT | PRODUCTION |
|---|---|---|---|
| UI | `.design/app-standalone` on Vite localhost | Vercel `acs-app` | production web service |
| Product API | `http://127.0.0.1:8788` | Railway public HTTPS origin | production API origin |
| browser API origin | localhost only | public Railway HTTPS only | production HTTPS only |
| dispatch | `local` | `remote` | `remote` |
| OpenClaw Worker | Local | Cloud | Remote VM |
| worker transport | `stdio` | `https` | `https` |
| Python worker during HTTP boot | no | no | no |
| `*.railway.internal` in browser-facing values | no | no | no |
| `VITE_*` localhost values | allowed | forbidden | forbidden |

Canonical terminology:

- OpenClaw Worker — Local
- OpenClaw Worker — Cloud
- OpenClaw Worker — Remote VM

`ACS_ENVIRONMENT` and `VITE_ACS_ENVIRONMENT` must be explicit and must not be inferred from `NODE_ENV`.

## Why now

ACS already has durable/shared economic primitives: quote, reserve, authorize, record usage, settle, release, receipt and reconcile. The remaining gap is operational: an authorized operator cannot yet understand, control, diagnose and remediate the financial effects of execution through a coherent supported surface.

EPIC-16 converts the existing foundation into an explicit operator product without rebuilding Tenant, governance, audit, persistence, runtime, deployment, observability or settlement authority.

## Frozen inherited baseline

EPIC-16 inherits and must preserve:

- EPIC-13 financial boundary and no-claim discipline;
- EPIC-14 Control Plane information architecture;
- EPIC-15 Tenant authority and governance;
- EPIC-15.5 operational platform and shared-state foundations;
- AEES-SH shared PostgreSQL authority;
- MH02 external-provider composition within its certified topology;
- Dashboard/UX baseline `9005e3a`, including truthful empty states and no fabricated metrics.

Physical multi-host certification, provider HA and MH03 remain a lateral POST-15.5 concern and are not EPIC-16 acceptance requirements.

## Explicit deferred inputs promoted into EPIC-16 planning

The following historical financial areas are explicit scope inputs and MUST be dispositioned by EPIC-16 rather than silently ignored:

| Deferred input | EPIC-16 disposition |
| --- | --- |
| pricing / quote provenance | IN SCOPE — operational visibility and effective-price provenance |
| tenant billing boundary | IN SCOPE AS ECONOMIC ACCOUNTABILITY — no automatic invoice/payment claim |
| reservation operations | IN SCOPE — governed lifecycle, diagnostics and release/remediation |
| usage evidence | IN SCOPE — correlation, inspection and supported correction policy |
| settlement operations | IN SCOPE — lifecycle, failure handling, idempotency and evidence |
| reconciliation | IN SCOPE — backlog, mismatch diagnostics and governed remediation |
| financial exceptions | IN SCOPE — explicit exception lifecycle and authority |
| invoices | DECISION-GATED — not authorized by mission alone |
| payments / money movement | DECISION-GATED — not authorized by mission alone |
| tax / accounting / compliance certification | OUT OF SCOPE unless separately approved by executive decision |
| commercial financial provider | DECISION-GATED adapter/certification scope |

## Organizing principle

**Truth → Authorization → Execution Economics → Reconciliation → Remediation → Evidence**

Every financial operator workflow must expose authoritative state, enforce Tenant and governance boundaries, preserve idempotency, emit audit evidence, and fail closed when authoritative dependencies are unavailable.

## Milestones

| Milestone | Outcome |
| --- | --- |
| E16-M1 — Financial Truth & Pricing Provenance | authoritative economic read models, pricing provenance and dashboard integration |
| E16-M2 — Economic Authorization & Reservations | governed spend authorization and reservation lifecycle |
| E16-M3 — Usage & Settlement Operations | operator-safe usage inspection, settlement lifecycle and failure semantics |
| E16-M4 — Reconciliation & Financial Exceptions | mismatch backlog, exception model and governed remediation |
| E16-M5 — Provider Boundary & Production Hardening | provider diagnostics/certification boundary, topology honesty, telemetry and resilience |
| E16-M6 — Operator UX & Acceptance | end-to-end Control Plane journeys, browser acceptance, regression evidence and closure readiness |

## Required reading order

1. `README.md`
2. `boundary-review.md`
3. `EPIC-16_Strategic_Operational_Plan.md`
4. `architecture.md`
5. `contracts.md`
6. `stories.md`
7. `milestones/README.md`
8. `browser-acceptance.md`
9. `regression-inventory.md`
10. `planner-handoff.md`

## Exit criteria

EPIC-16 can close only when an authorized operator can, through supported ACS surfaces and without direct database inspection:

1. identify the pricing/economic basis of supported execution;
2. understand effective authorization and reservation state;
3. correlate usage and settlement to Tenant, workload/run and audit evidence;
4. detect settlement/reconciliation mismatches and financial exceptions;
5. perform only explicitly authorized remediation actions with idempotent, audited outcomes;
6. inspect provider/dependency health without ACS overstating unsupported billing or payment capabilities;
7. use the flows in light/dark and supported responsive viewports without regressing the `9005e3a` Dashboard hierarchy.

## Non-goals

- general ledger or accounting platform;
- tax calculation or legal invoice compliance;
- payment collection, card capture, banking rails or treasury;
- payroll, exchange, trading or tokenomics redesign;
- marketplace redesign;
- enterprise identity/SCIM;
- worker autoscaling/fleet orchestration;
- physical multi-host certification or infrastructure HA.

## Implementation gate

This package authorizes detailed implementation planning. The first code sprint must preserve the contracts in this directory and must not broaden decision-gated financial scope without an explicit normative amendment.
