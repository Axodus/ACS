# EPIC-12 Candidate Inventory

This inventory is a planning aid for the EPIC-12 Planner. It groups candidate
work by priority, dependency, evidence need, scope risk, probable milestone, and
relationship to EPIC-11 caveats. It is not a final sprint backlog.

## Must-have for EPIC-12

| Candidate | Description | Priority | Dependencies | Pending decision | Scope risk | Probable milestone | Technical evidence required | EPIC-11 caveat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Production readiness gates | Define the minimum blockers that EPIC-12 must close before any readiness claim. | Must-have | EPIC-11 closure report, contracts, architecture | Which blockers EPIC-12 actually closes | Inflated readiness claims | M01 | Yes | Yes |
| Authentication boundary | Establish the actor identity boundary for control-plane access. | Must-have | Product API authority, environment assumptions | Minimum auth baseline | Expanding into full identity platform | M01 | Yes | Yes |
| Authorization / RBAC baseline | Define read vs mutate authority, denied states, and audit correlation. | Must-have | Authentication boundary | Role model and permission granularity | Enterprise RBAC scope creep | M01/M02 | Yes | Yes |
| Secrets boundary | Define storage, injection, redaction, and disclosure rules for production secrets. | Must-have | Environment separation, Product API contracts | Productive secret boundary | Secret management implementation scope | M01 | Yes | Yes |
| Environment separation | Distinguish local, sandbox, staging, and production assumptions. | Must-have | Deployment target assumptions | Which environments are required for closure | Treating sandbox as production | M01 | Yes | Yes |
| Persistence readiness | Decide which state must be durable and which may remain mock/read-only. | Must-have | Control-plane state inventory | Durable state baseline | Database migration scope expansion | M01 | Yes | Yes |
| Browser acceptance scope | Decide smoke, visual, accessibility, and cross-viewport coverage. | Must-have | EPIC-11 visual caveat | Acceptance depth | Treating screenshots as full acceptance | M03 | Yes | Yes |
| Explicit production claim discipline | Preserve `Production Ready: NO / not yet claimed` until gates pass. | Must-have | All milestone gates | None | Premature status inflation | M07 | Yes | Yes |

## Strong candidate

| Candidate | Description | Priority | Dependencies | Pending decision | Scope risk | Probable milestone | Technical evidence required | EPIC-11 caveat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Responsive QA | Validate core control-plane surfaces across supported viewports. | Strong candidate | Browser acceptance scope | Supported viewport matrix | Turning QA into redesign | M03 | Yes | Yes |
| Accessibility baseline | Validate semantic structure, keyboard/focus behavior, contrast, and labels. | Strong candidate | Browser acceptance scope | Acceptance threshold | Full accessibility program scope | M03 | Yes | Yes |
| UX productization | Improve consistency, navigation clarity, and state language for sustained review. | Strong candidate | Responsive/accessibility findings | Productization depth | Generic UI backlog | M03 | Yes | Yes |
| Operational reliability | Harden long-running operations, retries, pending/recovery states, and failure clarity. | Strong candidate | Runtime state boundaries | Which operations qualify | Runtime reimplementation | M04 | Yes | Yes |
| Long-running operations visibility | Show durable progress, blocked states, and recovery affordances honestly. | Strong candidate | Persistence readiness, Product API support | Evidence source of truth | Worker orchestration creep | M04 | Yes | Yes |
| Governance boundary | Define allowed governance visibility and mutation constraints. | Strong candidate | Auth/RBAC model | Governance depth | Tenant governance console creep | M02 | Yes | Partial |
| Administration boundary | Decide operator-only, tenant-aware, or limited tenant-admin model. | Strong candidate | Auth/RBAC model, tenant boundary | Admin model | Enterprise admin suite creep | M02 | Yes | Yes |
| Evidence correlation | Correlate actor, request, entity, time, operation, and result across surfaces. | Strong candidate | Observability depth, persistence | Correlation identifiers | Observability backend scope creep | M05 | Yes | Partial |

## Requires technical validation first

| Candidate | Description | Priority | Dependencies | Pending decision | Scope risk | Probable milestone | Technical evidence required | EPIC-11 caveat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Worker/runtime maturity | Identify readiness gaps where runtime or worker behavior affects control-plane trust. | Requires validation | Runtime inventory, Product API projections | What EPIC-12 can harden without reimplementation | Advanced fleet management | M04 | Yes | Partial |
| Observability depth | Decide logs, diagnostics, traces, alerts, health, and retention depth. | Requires validation | Current observability sources | Required depth for EPIC-12 | Full incident platform | M05 | Yes | Yes |
| Browser/visual harness feasibility | Validate whether existing tooling supports smoke, visual, accessibility, and viewport checks. | Requires validation | App tooling, CI constraints | Harness type and evidence format | Large testing infrastructure | M03 | Yes | Yes |
| Secrets implementation readiness | Validate current secret sources, redaction gaps, and environment injection patterns. | Requires validation | Secrets boundary | Implementation sequencing | Secret manager migration scope | M01 | Yes | Yes |
| Persistence implementation readiness | Validate current durable vs seed/mock/sandbox storage assumptions. | Requires validation | Persistence readiness | Durable blockers | Reworking backend storage | M01 | Yes | Yes |
| Economics evidence support | Validate what quotes, reservations, metering, settlements, and receipts can show honestly. | Requires validation | Product API economics support | Economics boundary | Billing productization | M06 | Yes | Yes |

## Continuous hardening

| Candidate | Description | Priority | Dependencies | Pending decision | Scope risk | Probable milestone | Technical evidence required | EPIC-11 caveat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Honest unsupported states | Keep unsupported actions explicit and never simulate success. | Continuous | All flows | None | Hidden false-positive readiness | All | Yes | Yes |
| Loading/empty/error/pending/recovery | Preserve complete state handling across user-facing surfaces. | Continuous | UX acceptance scope | None | UI-only cleanup without evidence | M03/M07 | Yes | Yes |
| No secret leakage | Keep secrets out of UI, logs, evidence, and examples. | Continuous | Secrets boundary | None | Accidental disclosure | All | Yes | Yes |
| Correlation IDs | Preserve traceability across requests and evidence. | Continuous | Observability depth | Identifier standard | Overbuilt tracing platform | M05/M07 | Yes | Partial |
| Regression validation | Keep smallest useful validation attached to every implementation block. | Continuous | Milestone plan | Validation matrix | Treating validation as optional | All | Yes | Yes |
| Explicit data absence handling | Distinguish absent, partial, unsupported, pending, blocked, and failed data. | Continuous | Product API contracts | None | Misleading status | All | Yes | Yes |

## Defer to EPIC-13+

| Candidate | Description | Priority | Dependencies | Pending decision | Scope risk | Probable milestone | Technical evidence required | EPIC-11 caveat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Complete billing | Full billing workflows beyond operational economics evidence. | Defer | Economics boundary | Dedicated billing epic | High | EPIC-13+ | Yes | No |
| Invoices | Invoice generation, lifecycle, settlement, and disputes. | Defer | Billing product | Billing ownership | High | EPIC-13+ | Yes | No |
| Payment rails | Payment processing, provider integrations, and settlement execution. | Defer | Billing product, compliance | Payment provider strategy | High | EPIC-13+ | Yes | No |
| Enterprise tenant administration suite | Full tenant lifecycle, policy, delegation, and governance console. | Defer | Admin/tenant boundary | Tenant governance mission | High | EPIC-13+ | Yes | No |
| Advanced worker fleet management | Fleet scaling, scheduling, autoscaling, and deep runtime controls. | Defer | Runtime strategy | Fleet ownership | High | EPIC-13+ | Yes | No |
| Full incident management platform | Incident lifecycle, ownership, remediation workflows, and postmortems. | Defer | Observability platform | Incident program scope | High | EPIC-13+ | Yes | No |
| Compliance program tooling | Compliance evidence management, controls, attestations, and audits. | Defer | Governance/compliance charter | Compliance program scope | High | EPIC-13+ | Yes | No |
| Productized financial forecasting | Forecasting UX, financial planning, and decision support. | Defer | Economics/billing decisions | Forecasting ownership | High | EPIC-13+ | Yes | No |

## Explicit non-goal

| Candidate | Description | Priority | Dependencies | Pending decision | Scope risk | Probable milestone | Technical evidence required | EPIC-11 caveat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reopen EPIC-11 | Rewriting or extending EPIC-11 as if it were unfinished scope. | Non-goal | None | None | Invalidates closure | None | No | No |
| Reimplement EPIC-10 | Recreating Product API truth, domains, runtime, workers, or economic contracts. | Non-goal | None | None | Architectural violation | None | No | No |
| Functional implementation in S00 | Any code, runtime, frontend, test harness, auth, RBAC, secrets, observability, economics, or admin implementation. | Non-goal | None | None | Violates S00 scope | None | No | No |
| Static surface changes | Changes under `./static`. | Non-goal | None | None | Scope leakage | None | No | No |
| Production readiness claim | Declaring production readiness before gates are defined and proven. | Non-goal | None | None | False readiness | None | No | Yes |
| Billing readiness claim | Declaring billing readiness from operational economics evidence. | Non-goal | None | Economics boundary | Billing scope creep | None | No | Yes |
| Administration readiness claim | Declaring administration readiness before the admin/tenant boundary is decided. | Non-goal | None | Administration boundary | Tenant console creep | None | No | Yes |
| Tenant governance readiness claim | Declaring tenant governance readiness without a dedicated governance scope and evidence. | Non-goal | None | Tenant boundary | Enterprise governance creep | None | No | Partial |
