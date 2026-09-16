# EPIC-17-IMP-09 — Readiness, Dependency & Implementation Scope Gate

**Epic:** EPIC-17 — Agent Genome Foundations, Administration & Automation Platform
**Milestone:** EPIC-17-IMP-09 — Control Plane IA & Administrative Domain
**Mapped Requirement:** EPIC-17-REQ-10 — Product API, Administration & Control Plane Projection
**Status:** `ASSESSED / READY FOR CTO IMPLEMENTATION AUTHORIZATION`
**Date:** September 15, 2026
**Owner:** Axodus CTO
**Schema Baseline:** Schema 12 (`CANONICAL / UNCHANGED`); Schema 13 is `NOT REQUIRED / NOT AUTHORIZED`
**Implementation Performed:** `NONE` (Readiness and Scope Gate only)

---

## 1. Executive Summary & Readiness Determination

This readiness, dependency, and implementation scope gate evaluates **EPIC-17-IMP-09 (Control Plane IA & Administrative Domain)** following the CTO-accepted closure of **IMP-08 (Genome Traits, Assets & Verification)** at commit `42ba13e`.

### Readiness Determination
```text
IMP-09 READINESS: READY FOR IMPLEMENTATION AUTHORIZATION
DEPENDENCIES: ALL SATISFIED (IMP-01 through IMP-08 COMPLETE / ACCEPTED / CLOSED)
BLOCKER E17-R10-B14 / E17-R12-C12: RESOLVED / READY FOR IMPLEMENTATION (under ADR-17-051 candidate)
PERSISTENCE DELTA: NONE (Schema 12 canonical; Schema 13 not required / not authorized)
PRODUCT API DELTA: NONE (0 net-new endpoints; UI consumes existing /api/v1/... routes)
RUNTIME / ADMISSION IMPACT: NONE (strictly presentation and client-side navigation)
GENOME IMPACT: NONE (read-only descriptive consumption from IMP-08)
AGENTIC GENETICS RESEARCH: STRICTLY SEPARATED (0 requirements imported)
CEO DECISION REQUIRED: NONE
IMPLEMENTATION PERFORMED: NONE
RECOMMENDATION: CTO AUTHORIZE SLICE 1 IMPLEMENTATION
```

---

## 2. Source-of-Truth Review

The readiness assessment reconstructed canonical requirements and constraints from the accepted repository artifacts:

1. **EPIC-17 Status & Precedence Matrix** (`docs/epics/epic-17/precedence-matrix.md`, `docs/epics/epic-17/README.md`):
   - IMP-01 through IMP-08 are `COMPLETE / CTO ACCEPTED / CLOSED / PUBLISHED`.
   - IMP-08 closed descriptive genome projections under Product API without creating genome write paths or runtime authority.
   - IMP-09 is the penultimate milestone in EPIC-17, preceding cross-domain conformance (`IMP-10`).

2. **EPIC-17-REQ-10** (`docs/epics/epic-17/req-10/`):
   - Governs Product API, Administration, and Control Plane projections.
   - Establishes the normative navigation hierarchy: `Flow -> Module -> Screen -> Product API projection / governed action`.
   - Defines server-evaluated action metadata, class-owned settings navigation, non-disclosure, and 11 required interaction states.
   - Records the legacy Administration IA divergence as blocker `E17-R10-B14`.

3. **EPIC-17-REQ-12** (`docs/epics/epic-17/req-12/`):
   - Defines the candidate IMP dependency plan, canonical ownership matrix, and blocker consolidation.
   - Specifies exit evidence for IMP-09: Product API-only UI with explicit loading/empty/blocked/pending/stale/unavailable/redacted states, canonical drill-down, and explicit Administration IA compatibility remediation.

4. **Implementation-Gate Baselines**:
   - **IMP-07 Closure** (`imp-07-final-conformance.md`): Established single Product API boundary, `AdministrativeQueryService` read coordinator, allowlisted DTO projections (`CURRENT`, `EXACT`, `OBSERVED`), and owner-routed commands.
   - **IMP-08 Closure** (`imp-08-final-conformance.md`): Established `GET /api/v1/genomes/agents/:agentId` descriptive projection, trait assertions without authority, and descriptive asset references.

5. **Current Source Contracts**:
   - Standalone UI Application: `.design/app-standalone/src/App.tsx`, `shared.tsx`, `OperationalUx.tsx`, and domain views (`administration/`, `agents/`, `composition/`, `dashboard/`, `economics/`, `runtime/`, `workforces/`).
   - Product API Server & Routes: `src/http/routes/product-api-routes.ts`, `src/control-plane/administrative-services.ts`, `src/control-plane/administrative-contracts.ts`, `src/control-plane/product-api-client.ts`.

---

## 3. B14 Resolution (E17-R10-B14 / E17-R12-C12)

### Blocker Analysis
- **Identifier:** `E17-R10-B14` / `E17-R12-C12` / `ADR-17-051` Candidate.
- **Original Conflict:** The legacy standalone Control Plane UI exposed `Administration` as a primary top-level navigation item alongside Dashboard, Agents, Workforces, etc. In contrast, the normative EPIC-14 specification defines 8 canonical primary domains, placing administration capabilities under `System` and `Governance`.
- **Why Deferred:** REQ-10 recorded this divergence as a blocker to prevent ad-hoc UI redesign before the backend administration model (IMP-07) and descriptive genome model (IMP-08) were frozen.
- **Current Relevance:** Directly gates IMP-09 implementation.
- **Dependencies Satisfied:** IMP-07 and IMP-08 are closed.

### Disposition & IA Reconciliation Decision
```text
CLASSIFICATION: RESOLVED / READY FOR IMPLEMENTATION
DECISION: ADR-17-051 (IA Reconciliation)
```

1. **Decommission Top-Level Administration:** Monolithic `Administration` is removed from the primary global navigation.
2. **Implement Canonical 8-Domain Global Navigation:**
   - **1. Overview** (`/`): Customer Dashboard, high-level operational status, active summary metrics.
   - **2. Agents** (`/agents`): Agent inventory, creation, editing, detail, composition, configuration, validation, runs, revisions, evidence, usage/cost, and genome view. Includes Workforces (`/workforces`).
   - **3. Operations** (`/operations`): Executions (`/executions`), Workers (`/workers`), Operations status (`/operations/overview`), Automations, Activations, Operational execution (`/operational-execution`).
   - **4. Capabilities** (`/composition`): Composition overview, Roles (`/roles`), Profiles (`/profiles`), Capabilities (`/capabilities`), Skills (`/skills`), Tools & Plugins (`/plugins`), Engines (`/engines`), Providers (`/providers`), Memory (`/memory`).
   - **5. Evidence** (`/operational-evidence`): Operational evidence ledger, Logs (`/logs`), Audit log (`/audit`).
   - **6. Economics** (`/economics`): Economics overview, Billing boundary (`/system/billing-boundary`), Payment rails (`/system/payment-rails-boundary`), Pricing/Invoicing (`/system/pricing-invoice-boundary`), Tenant billing (`/system/tenant-billing-boundary`), Settlement/Reconciliation (`/system/settlement-reconciliation`), Financial audit (`/system/financial-audit`), Billing UX acceptance (`/system/billing-acceptance`).
   - **7. Governance** (`/governance`): Tenant administration, Tenant governance policies, Delegation grants/chains, Guardrails, Authority boundaries, Administrative audit.
   - **8. System** (`/system`): Production readiness gates (`/readiness`), Class-owned settings index (`/settings`), Environment topology, Operational reliability (`/system/operational-reliability`), System diagnostics.

---

## 4. Administration Model

Reconstructing the administration architecture established through IMP-07:

```text
Operator UI Request (Control Plane)
  -> Product API (/api/v1/...) [Authenticated, Tenant-Scoped]
       -> AdministrativeQueryService (Read Coordinator: CURRENT / EXACT / OBSERVED Allowlisted DTOs)
       -> Governed Domain Service (Commands: Actor, Tenant, CAS, Idempotency, Authority Basis)
            -> Canonical Repositories (behind domain boundary)
            -> Domain Events / Evidence Ledger
```

- **Product API Boundary:** Single external HTTP boundary (`src/http/routes/product-api-routes.ts`). No parallel Administration API.
- **AdministrativeQueryService:** Pure read coordinator. Never mutates domain state; returns sanitized, allowlisted projections.
- **Control Plane:** Presentation layer only. Dispatches commands and renders projections; never infers or stores canonical truth.
- **Tenant Isolation:** Enforced before query routing; cross-tenant access returns 404 / empty non-disclosing responses.
- **Mutations & Commands:** Route exclusively to canonical domain owners (`GovernedAutomationService`, `AgentService`, etc.) carrying explicit actor context, CAS revision check, and idempotency key.

---

## 5. Flow -> Module -> Screen Semantic Hierarchy

The Control Plane preserves the 3-tier presentation hierarchy:

```text
Flow (Operator Objective)
  -> Module (Domain & Capability Grouping)
       -> Screen (Source-Faithful Projection & Governed Action Form)
            -> Product API Endpoint (/api/v1/...)
```

- **Flow:** Expresses an operator journey (e.g., "Review Agent Genome and Verification Evidence", "Configure System Readiness and Diagnose Environment", "Audit Tenant Delegation Chains").
- **Module:** Groups domain views under one of the 8 canonical domains (e.g., `System.tsx`, `Governance.tsx`, `Agents.tsx`).
- **Screen:** Renders source-faithful DTO projections. Screen state is strictly local/transient React state and never becomes domain state.
- **Addressing & Identity:** Screens address entities using canonical typed references (`kind`, `id`, `tenantId`, `revision`, `observationDigest`).
- **Cross-Domain Navigation:** Links preserve entity identity and navigate to the canonical owning projection.
- **11 Required Interaction States:** Every screen component must explicitly handle:
  `loading`, `empty`, `ready`, `warning`, `blocked`, `error`, `pending`, `recovering`, `stale`, `unavailable`, `redacted`.
- **Persistence:** None. Flow, Module, and Screen are purely client-side presentation concepts.

---

## 6. IMP-09 Scope Reconstruction

| Item | Classification | Rationale |
| --- | --- | --- |
| **8-Domain Global Navigation** | `EXTEND` | Updates `shared.tsx` and `App.tsx` to implement the 8 EPIC-14 primary domains. |
| **Decommission Monolithic Administration** | `EXTEND` | Decomposes legacy `Administration.tsx` into `System.tsx` and `Governance.tsx`. |
| **System Domain Views** | `EXTEND` | Host Readiness, Class-owned Settings index (`SystemConfigurationView`), Environment topology, Reliability, and Diagnostics under `/system`. |
| **Governance Domain Views** | `EXTEND` | Host Tenant administration, Policy enforcers, Delegation inspection, and Guardrails under `/governance`. |
| **Genome View Integration** | `EXTEND` | Integrates `GET /api/v1/genomes/agents/:agentId` into Agent Detail tabs as descriptive projection. |
| **11 Interaction States Standard** | `EXTEND` | Implements uniform state banners/placeholders across all views in `shared.tsx`. |
| **Product API Client** | `REUSE` | Consumes existing endpoints in `src/api/product-api.ts` without backend changes. |
| **Authentication & Session** | `REUSE` | Reuses `reown-appkit`, `AccountControl`, and SIWX session authentication. |
| **Domain View Components** | `REUSE` | Reuses existing Agent, Workforce, Composition, Execution, Worker, Evidence, and Economics components. |
| **Backend Database Schema** | `REUSE` | Schema 12 remains canonical and unchanged; 0 schema changes. |
| **Multi-Tenant Self-Service Portal** | `DEFER` | Out of scope for baseline Control Plane IA; operator tenancy views suffice. |
| **Schema 13 / DB Migrations** | `NOT REQUIRED` | Prohibited; presentation changes require zero durable storage. |
| **Net-New Backend Routes** | `NOT REQUIRED` | Existing `/api/v1/...` Product API routes are complete. |
| **Parallel Admin/Genome API** | `CONTRADICTED` | Violates one-Product-API rule (`ADR-17-043`). |
| **Transversal Global Settings Table** | `CONTRADICTED` | Violates class-owned settings index architecture (`ADR-17-046`). |
| **Genome Trait Mutations** | `CONTRADICTED` | Violates descriptive-only Genome boundary (`ADR-17-052`). |

---

## 7. Ownership Matrix

| Concept | Canonical Owner | Read Owner | Write Owner | IMP-09 Impact |
| --- | --- | --- | --- | --- |
| **Agent** | Agent Core / AgentService | Product API Agent Projection | AgentService (CAS/Revision) | `REUSE` existing views |
| **Control Plane** | Control Plane Presentation | Product API Client | None (Dispatches Commands) | `EXTEND` with 8-domain IA |
| **Product API** | HTTP Routes & Context | AdministrativeQueryService / Domains | Canonical Domain Services | `REUSE` (0 new routes) |
| **Administration** | Split: System & Governance | AdministrativeQueryService | Respective Domain Services | `DECOMPOSE` into System & Governance |
| **Flow** | Operator Journey / UI Router | React Router State | None | `EXTEND` with canonical flow structure |
| **Module** | Domain Module Views | React Component Props | None | `EXTEND` (`System.tsx`, `Governance.tsx`) |
| **Screen** | Screen Component | Product API hooks/queries | Product API command dispatch | `EXTEND` with 11 interaction states |
| **Runtime** | Runtime Lifecycle / Engine | Runtime Projection | Runtime Services | `REUSE` under Operations |
| **Admission** | Delegated Workforce Admission | Admission Projection | Admission Controller | `REUSE` read-only display |
| **Evidence** | Operational Evidence Ledger | Evidence Projection | Evidence Ingestion | `REUSE` under Evidence domain |
| **Genome** | Agent Reference / Trait Vocabulary | `GET /api/v1/genomes/agents/:agentId` | None (Descriptive Only) | `REUSE` in Agent Detail tabs |
| **Workforce** | Workforce Domain | Workforce Projection | Workforce Service | `REUSE` under Agents |
| **Automation** | GovernedAutomationService | Automation Projection | GovernedAutomationService | `REUSE` under Operations |

---

## 8. Persistence & Schema Review

- **Schema 12:** `CANONICAL / UNCHANGED`.
- **Schema 13:** `NOT REQUIRED / NOT AUTHORIZED`.
- **Net-New Tables:** `0`.
- **Net-New Columns:** `0`.
- **Net-New Migrations:** `0`.
- **Analysis:** All IMP-09 scope is client-side presentation and routing. Transient UI navigation and interaction states are held in memory/React state; no database additions are required.

---

## 9. Product API Review

- **Boundary Invariant:** One single Product API (`src/http/routes/product-api-routes.ts`). No parallel Administration API.
- **Route Inventory:** The UI consumes existing endpoints:
  - `GET /api/v1/health`, `GET /api/v1/ready`, `GET /api/v1/readiness`
  - `GET /api/v1/dashboard`, `GET /api/v1/accounts/me`
  - `GET /api/v1/agents`, `GET /api/v1/agents/:id`, `POST /api/v1/agents`, `PATCH /api/v1/agents/:id`
  - `GET /api/v1/workforces`, `POST /api/v1/workforces`
  - `GET /api/v1/composition`, `GET /api/v1/roles`, `GET /api/v1/profiles`, `GET /api/v1/capabilities`, `GET /api/v1/skills`, `GET /api/v1/tools`, `GET /api/v1/plugins`, `GET /api/v1/engines`, `GET /api/v1/providers`
  - `GET /api/v1/delegations`, `GET /api/v1/automations`, `GET /api/v1/activations`
  - `GET /api/v1/administration/automations`, `GET /api/v1/administration/delegations`, `GET /api/v1/administration/activations`
  - `GET /api/v1/genomes/agents/:agentId`
  - `GET /api/v1/system/*` (Billing, Pricing, Rails, Settlement, Audit)
- **Net-New Endpoints:** `0`.

---

## 10. Runtime & Admission Boundary

- **Runtime Logic:** Unchanged.
- **Admission Controller:** Unchanged.
- **Execution Target Server:** Unchanged.
- **Assertion:** Administrative UI configurations dispatch governed commands with CAS and actor metadata; they never bypass admission or create unverified runtime authority.

---

## 11. IMP-08 & Genome Boundary

- **Genome Semantics:** Remain bounded and descriptive-only as frozen in IMP-08.
- **Integration:** The Control Plane renders trait assertions, presentation asset references, and verification proof links as read-only cards in the Agent Detail view.
- **Exclusions:** No genome mutation, trait issuance, breeding, lineage authority, NFT minting, or marketplace mechanics are permitted.

---

## 12. Agentic Genetics Separation

- **Research Directory:** `docs/research/agentic-genetics/` is strictly non-normative research.
- **Normative Status:** 0 requirements imported into IMP-09.

---

## 13. Security Review

| Boundary / Risk | Required Control | Classification |
| --- | --- | --- |
| **Tenant Isolation** | Evaluated at HTTP layer before routing; cross-tenant requests return 404 / empty. | `EXISTING / REUSE` |
| **Authentication** | SIWX session authentication verified on every Product API call. | `EXISTING / REUSE` |
| **Mutation Authority** | CAS revision checks, actor attribution, and idempotency keys on command dispatch. | `EXISTING / REUSE` |
| **Secret Disclosure** | Write-only credential ingress; secrets redacted in all returned projections. | `EXISTING / REUSE` |
| **Evidence Redaction** | Projection returns allowlisted metadata only; raw storage payloads redacted. | `EXISTING / REUSE` |
| **Confused Deputy** | UI actions bound to authenticated session identity and active tenant context. | `EXISTING / REUSE` |

---

## 14. Proposed Implementation Slices

### Slice 1 (Recommended First): Information Architecture & Global Navigation Framework
- **Purpose:** Update the standalone app global navigation to reflect the 8 canonical EPIC-14 domains, establish the `Flow -> Module -> Screen` routing shell, and decommission top-level `Administration`.
- **Contracts/Files:** `.design/app-standalone/src/shared.tsx`, `.design/app-standalone/src/App.tsx`.
- **Persistence Impact:** None (Schema 12 canonical).
- **Product API Impact:** None (Reuses existing routes).
- **Runtime Impact:** None.
- **Security Impact:** None (Preserves existing auth and tenant context).
- **Test Plan:** `npm run build`, UI navigation rendering verification.
- **Dependencies:** IMP-08 closed.
- **Stop Conditions:** Any requirement for schema migrations or net-new backend endpoints.

### Slice 2: System & Governance Domain Modules
- **Purpose:** Implement `System.tsx` and `Governance.tsx` views to house decomposed views from legacy `Administration.tsx`.
- **Contracts/Files:** `.design/app-standalone/src/domains/system/System.tsx`, `.design/app-standalone/src/domains/governance/Governance.tsx`, `.design/app-standalone/src/App.tsx`.
- **Persistence Impact:** None.
- **Product API Impact:** None.
- **Runtime Impact:** None.
- **Security Impact:** Tenant-safe admin projections only.
- **Test Plan:** `npm run build`, System and Governance view rendering.
- **Dependencies:** Slice 1 complete.
- **Stop Conditions:** Creation of a generic transversal settings aggregate.

### Slice 3: Agent, Workforce, Automation, Delegation & Genome Projection Views
- **Purpose:** Integrate the IMP-08 descriptive genome projection (`GET /api/v1/genomes/agents/:agentId`) into Agent detail tabs and align Automation/Delegation views with the 8-domain navigation.
- **Contracts/Files:** `.design/app-standalone/src/domains/agents/Agents.tsx`, `.design/app-standalone/src/api/product-api.ts`.
- **Persistence Impact:** None.
- **Product API Impact:** None.
- **Runtime Impact:** None.
- **Security Impact:** Descriptive-only genome display.
- **Test Plan:** `npm run build`, Agent detail tabs verification.
- **Dependencies:** Slice 2 complete.
- **Stop Conditions:** Introduction of genome write forms or trait mutations.

### Slice 4: Interaction States, Canonical Drill-Down & UI Hardening
- **Purpose:** Standardize the 11 explicit interaction states across all screens and ensure consistent error boundaries and loading states.
- **Contracts/Files:** `.design/app-standalone/src/shared.tsx`, domain components.
- **Persistence Impact:** None.
- **Product API Impact:** None.
- **Runtime Impact:** None.
- **Security Impact:** Redacted and unavailable state handling.
- **Test Plan:** `npm run build`, state rendering verification.
- **Dependencies:** Slice 3 complete.
- **Stop Conditions:** Client-side assumption of domain truth.

### Slice 5: Final Conformance & Gate Closure
- **Purpose:** Execute full test and build validation, produce `imp-09-final-conformance.md`, and formally close blocker `E17-R10-B14`.
- **Contracts/Files:** `docs/epics/epic-17/implementation-gate/imp-09-final-conformance.md`.
- **Persistence Impact:** None.
- **Product API Impact:** None.
- **Runtime Impact:** None.
- **Security Impact:** Full security regression.
- **Test Plan:** `npm run build`, `npm test`, `git diff --check`.
- **Dependencies:** Slices 1–4 complete.
- **Stop Conditions:** Any unresolved functional or architectural regression.

---

## 15. CEO Gate Analysis

An assessment of the 8 mandatory CEO gate criteria reveals:
1. Product direction changes: **None**.
2. Ecosystem architecture changes: **None**.
3. Governance / authority changes: **None**.
4. Economic model changes: **None**.
5. Security posture changes: **None**.
6. Major provider dependency changes: **None**.
7. Protocol behavior changes: **None**.
8. Treasury / financial authority changes: **None**.

```text
CEO DECISION REQUIRED: NONE
```

---

## 16. Stop Conditions Review

| Condition | Status |
| --- | --- |
| Contradictory accepted REQs | None detected |
| B14 requires unresolved product authority | Resolved under ADR-17-051 candidate |
| Parallel administrative ownership | Rejected (single Product API preserved) |
| Second Product API needed | Rejected |
| Schema 13 required | Rejected (Schema 12 is canonical) |
| Runtime authority changes | None |
| Tenant isolation compromised | Preserved fail-closed |
| IMP-08 reopened | No (consumed as read-only) |
| Agentic Genetics research imported | Zero requirements imported |
| Economic/governance authority introduced | None |

---

## 17. Final Validation & Authorization

- **Repository Evidence:** Fully aligned with REQ-10, REQ-12, IMP-07, and IMP-08.
- **Dependency Graph:** Consistent; all prerequisites satisfied.
- **Implementation Status:** `IMPLEMENTATION PERFORMED: NONE`.
- **Build & Diff:** Documentation-only; ready for CTO review.

```text
STATUS: READY FOR CTO IMPLEMENTATION AUTHORIZATION
RECOMMENDED NEXT STEP: AUTHORIZE SLICE 1 IMPLEMENTATION
```

