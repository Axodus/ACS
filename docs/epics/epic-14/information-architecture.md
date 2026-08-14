# EPIC-14 Target Information Architecture

## 1. Normative global hierarchy

```text
Overview
Agents
Operations
Capabilities
Evidence
Economics
Governance
System
```

These are operator domains. They do not require matching source folders or API
path prefixes.

## 2. Domain specifications

### Overview

- **Purpose:** cross-domain attention and orientation.
- **Questions:** What needs attention? What changed? Where should I go next?
- **Entities:** summaries/references only; no canonical ownership.
- **Actions:** refresh, filter, open canonical entity/domain.
- **Children:** Attention, Activity (initially one landing page is sufficient).
- **Required data:** dashboard, global readiness, recent operations/findings.
- **Related:** every domain through references.
- **Forbidden:** full catalogs, configuration editing, duplicated detail.
- **Governance:** blocked/unsupported actions remain links to governing context.

### Agents

- **Purpose:** governed agent identity, lifecycle and agent-centric context.
- **Questions:** Which agent is affected? What is its state/composition/history?
- **Entities:** AgentDefinition, revision, lifecycle and agent-scoped projections.
- **Actions:** supported lifecycle/revision actions with Product API authority.
- **Children:** Inventory, Create, Agent detail, Archived.
- **Required data:** agent list/detail, readiness, revisions, composition, related operations/evidence/economics.
- **Related:** Capabilities, Operations, Evidence, Economics, Governance.
- **Forbidden:** global execution registry or duplicate capability catalogs.
- **Governance:** lifecycle and revision actions are governed and audited.

### Operations

- **Purpose:** plan and observe execution from deployment to runtime evidence.
- **Questions:** What is running? What failed? On which target/worker? What next?
- **Entities:** deployment plan, deployment, runtime, execution run, worker,
  execution target, credential/provider connection references.
- **Actions:** only Product API-supported governed actions; unsupported explicit.
- **Children:** Summary, Deployments, Runtimes, Execution runs, Workers & targets,
  Access & connections.
- **Required data:** readiness/plans, deployment/runtime/run/worker projections.
- **Related:** Agents, Evidence, Economics, Governance, System.
- **Forbidden:** raw secret management, duplicated agent lifecycle, financial truth.
- **Governance:** target eligibility, sandbox and policy constraints remain visible.

### Capabilities

- **Purpose:** understand and inspect what agents can be composed from.
- **Questions:** What capability exists? Which skill/tool/role provides it? Can it be assigned?
- **Entities:** composition, roles, profiles, capabilities, skills, tools, plugins,
  engines, providers and models.
- **Actions:** read-only inspection until mutation contracts support more.
- **Children:** Overview, Roles & profiles, Skills, Tools & plugins, Engines & providers.
- **Required data:** current composition Product API catalogs/details.
- **Related:** Agents, Operations, Governance.
- **Forbidden:** separate global nav entries for every resource type.
- **Governance:** installation/assignment/configuration remains governed/unsupported.

### Evidence

- **Purpose:** canonical technical proof and investigation.
- **Questions:** Why is it affected? What failed? What evidence supports status?
- **Entities:** events, logs, audit entries, evidence records, diagnostics,
  observability correlations.
- **Actions:** query/filter/open related entity; no execution mutation.
- **Children:** Timeline, Logs, Audit, Diagnostics/Observability.
- **Required data:** Product API events, logs, audit, evidence, diagnostics,
  readiness evidence and entity-scoped variants.
- **Related:** all entity domains.
- **Forbidden:** owning execution state or financial compliance claims.
- **Governance:** redact secrets and retain actor/entity/time/correlation.

### Economics

- **Purpose:** canonical operational economics and financial-boundary evidence.
- **Questions:** What cost/reservation evidence exists? What financial claims are blocked?
- **Entities:** quotes, reservations, metering, settlements, operational receipts,
  billing/pricing/payment/tenant/financial-audit boundary reports.
- **Actions:** read-only; no money movement or simulated financial success.
- **Children:** Operational economics, Billing & pricing boundaries, Payment
  boundary, Tenant accountability, Settlement & receipts, Financial audit,
  Acceptance & claims.
- **Required data:** economics and EPIC-13 Product API projections.
- **Related:** Operations, Agents, Evidence, Governance, System.
- **Forbidden:** production billing, payment capture, invoice issuance,
  compliance certification.
- **Governance:** tenant/account boundaries and no-claim status are primary.

### Governance

- **Purpose:** show authority, policy, guardrails and governed-action boundaries.
- **Questions:** Is this governed? Why is it blocked? Who/what can authorize it?
- **Entities:** policies, guardrails, authority/permission findings, governance boundary.
- **Actions:** observational by default; mutations only with future explicit contracts.
- **Children:** Overview, Policies, Guardrails, Governed actions.
- **Required data:** system guardrails, policies, governance boundary and action metadata.
- **Related:** all actionable domains.
- **Forbidden:** generic settings, tenant admin or system reliability.
- **Governance:** this domain explains governance; it does not imply approval.

### System

- **Purpose:** system-wide readiness, configuration and administration boundary.
- **Questions:** Is the Control Plane ready at this scope? What environment,
  reliability, tenant and configuration limits apply?
- **Entities:** readiness, configuration, production-readiness gates,
  operational reliability, tenants, administration boundary, acceptance, workspace settings.
- **Actions:** mostly observational; administrative controls isolated and governed.
- **Children:** Readiness, Reliability, Configuration, Tenants, Administration,
  Acceptance, Settings.
- **Required data:** current system Product API projections.
- **Related:** Overview, Governance, Evidence, Operations.
- **Forbidden:** policies as generic config, financial reports, production-admin claims.
- **Governance:** Administration/Tenant Governance readiness remains not claimed.

## 3. Navigation model

### Global navigation

Always exposes the eight domains, current domain, authoritative tenant context
when available, global attention indicator and command/search entry. It does not
list child resources.

### Domain navigation

Appears within the current domain and contains its child workflows/collections.
It may be a secondary sidebar, tabs or local menu, but the responsibility is
consistent.

### Contextual navigation

Appears only for a selected entity and contains Summary plus applicable
Composition, Operations, Evidence, Economics, Revisions or Governance views.
Unavailable contexts are omitted or explicitly unavailable; they are not empty
global pages.

### Drill-down

```text
Overview attention
  -> canonical domain collection
  -> entity detail summary
  -> contextual evidence/action
  -> related canonical domain when deeper ownership changes
```

### Cross-domain references

Use a reference containing entity type, entity ID, optional tenant ID, target
domain and optional correlation ID. The target domain renders canonical detail.
The source surface keeps only enough summary for local comprehension.

## 4. Domain ownership matrix

| Concept | Canonical domain | Secondary exposure | Actionable? | Governance |
|---|---|---|---|---|
| Agent | Agents | Overview, Operations | governed lifecycle | agent policy/revision rules |
| Agent revision | Agents | Capabilities | governed | revision/adoption rules |
| Role/profile | Capabilities | Agent detail | read-only currently | composition rules |
| Capability/skill/tool/plugin | Capabilities | Agent detail | unsupported/governed | assignment/source rules |
| Engine/provider/model | Capabilities | Operations | read-only currently | source/credential rules |
| Credential/provider connection | Operations | System/Governance | read-only/redacted | secret and access boundary |
| Deployment plan/deployment | Operations | Agent detail, Overview | governed/partly supported | eligibility/sandbox/policy |
| Runtime | Operations | Agent detail, System | observed; mutations bounded | runtime rules |
| Execution run | Operations | Agent detail, Overview | contextual | execution policy |
| Worker/target | Operations | System | read-only | eligibility/capacity rules |
| Event/log/audit/diagnostic | Evidence | entity details | query only | redaction/correlation |
| Readiness | System | Overview and entity detail | recheck when supported | evidence gates |
| Policy/guardrail | Governance | action surfaces | observational currently | authoritative constraint |
| Tenant context | System | global shell/entity details | not admin-ready | tenant boundary |
| Quote/reservation/metering/cost | Economics | Operations/Agent detail | read-only | economic rules |
| Settlement/receipt | Economics | Evidence/Operation detail | read-only | financial boundary |
| Billing/payment/invoice boundary | Economics | System readiness summary | no | EPIC-13 no-claim |
| Configuration/settings | System | Governance references | limited/read-only | administration boundary |

## 5. Operator-question tests

| Question | First destination | Follow-up |
|---|---|---|
| What needs attention? | Overview | affected canonical entity |
| Which agent is affected? | Agents | Agent > Summary/Evidence |
| What is running or failed? | Operations | Run/Runtime detail |
| Why did it fail? | Evidence | correlated logs/audit/diagnostics |
| What capability does it have? | Agent > Composition | Capabilities canonical detail |
| Is this configuration governed? | contextual governance reference | Governance |
| What can I safely change? | entity/action area | Product API authority and reason |
| What belongs to this tenant? | persistent tenant context | System > Tenants when available |
| What financial impact exists? | contextual economics summary | Economics |
| What proves this status? | contextual evidence | Evidence canonical record |

## 6. Financial boundary

- Operational surfaces may show contextual quote, reservation, metering or cost
  summaries when backed by Product API data.
- Economics owns canonical detail and all EPIC-13 boundary reports.
- Tenant/account identity must accompany financial evidence when authoritative.
- All current financial boundary surfaces remain read-only.
- Billing, payment, invoice, settlement, reconciliation, compliance and
  production financial readiness remain not claimed.
- Missing or unavailable economic data is not zero. Estimates, reservations,
  metering and operational settlement values remain explicitly labeled.
- `$Neurons` is represented only as the implemented ACS operational asset/unit;
  no wallet, balance, exchange or transactional ecosystem claim is implied.

## 7. Terminology register

| Term | Normative meaning |
|---|---|
| Agent | governed agent definition and revisions |
| Composition | effective relationship of role/profile/capability/skill/tool/engine/provider/model |
| Capability | outcome/permission the composition can expose |
| Skill | governed reusable behavior resource |
| Tool | callable resource; plugin may package tools/skills |
| Deployment | control-plane record of placement/deploy attempt |
| Runtime | observed instance state |
| Execution run | governed unit of execution and result evidence |
| Ready | named evidence gate satisfied for a specific scope |
| Active | lifecycle state only |
| Connected | connectivity state only |
| Governed | subject to policy/authority; not automatically approved |
| Blocked | policy/readiness prevents the action/state |
| Unsupported | no current contract/capability exists |
| Unavailable | capability exists but cannot currently be reached/observed |
| Operational receipt | evidence artifact, not necessarily legal/financial receipt |

## 8. Implementation handoff

AEES-02 may implement the hierarchy without reopening top-level taxonomy,
canonical ownership, Governance/System split, Economics placement, readiness
placement, tenant-context role or entity-detail pattern. Non-blocking URL and
layout refinements remain within the contracts above.

## 9. AEES-02 route ownership record

| Route group | Canonical domain | AEES-02 status |
|---|---|---|
| `/` | Overview | canonical |
| `/agents/**` | Agents | canonical collection/context routes |
| `/operational-execution` | Operations | canonical |
| `/runtime` | Operations | compatibility route |
| `/composition`, `/roles/**`, `/profiles/**`, `/capabilities/**`, `/skills/**`, `/plugins/**`, `/tools/**`, `/engines/**`, `/providers/**` | Capabilities | canonical/context routes |
| `/operational-evidence`, `/logs`, `/audit` | Evidence | canonical |
| `/economics` | Economics | canonical |
| EPIC-13 `/system/billing-*`, `/system/payment-*`, `/system/pricing-*`, `/system/tenant-billing-*`, `/system/settlement-*`, `/system/financial-audit` | Economics | compatibility routes |
| `/system` | Governance | canonical |
| `/readiness`, `/system/operational-reliability`, `/settings` | System | canonical/child routes |
| `/memory` | Capabilities | legacy; no global destination |
