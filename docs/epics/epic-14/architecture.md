# EPIC-14 Architecture

## 1. System boundary

```text
Operator
  -> Control Plane UX and navigation
  -> Product API projections and governed commands
  -> ACS Control Plane domain truth
  -> Runtime / workers / external execution targets
```

EPIC-14 owns the first layer only. It may reorganize how the next layers are
found and understood; it may not reproduce or reinterpret their truth.

## 2. Architecture rules

1. Global navigation represents operator domains.
2. Domain navigation represents workflows and child collections.
3. Contextual navigation represents one selected entity.
4. Cross-domain links reference the canonical destination.
5. Product API state supplies status and action authority.
6. Route names are implementation concerns, not the taxonomy source.

## 3. Target domain layers

### Awareness layer

**Overview** answers what needs attention and where to go next. It summarizes
readiness, active/failed operations, affected agents and critical evidence. It
does not become the canonical home for those entities.

### Operational layer

**Agents** owns agent definition, revision, lifecycle, readiness and
agent-scoped composition/executions/evidence.

**Operations** owns deployment planning/records, runtime instances, execution
runs, workers and execution targets. Runtime is an Operations child, not a
global sibling.

### Definition layer

**Capabilities** owns composition overview plus roles, profiles, capabilities,
skills, tools/plugins, engines, providers and models. The top-level label is an
operator domain; backend resource collections remain child surfaces.

### Proof layer

**Evidence** owns events, logs, audit, diagnostics, correlated evidence and
observability. Entity pages expose filtered views and links, not duplicate
evidence repositories.

### Financial layer

**Economics** owns operational economics and EPIC-13 financial boundary
reports. Operational summaries may show cost/reservation context but link to
Economics for canonical detail.

### Control layer

**Governance** owns policies, guardrails, governed-action constraints,
authority and governance-boundary visibility. It is not generic settings.

**System** owns global readiness, configuration, environment, reliability,
tenant visibility, administration boundary, acceptance and workspace settings.
Administrative functions remain isolated within System and governed.

## 4. Route-to-concept separation

Current routes may remain stable during migration, but navigation labels and
parentage follow the target domains. For example, `/roles` may remain the deep
route while appearing under Capabilities; `/runtime` appears under Operations;
and `/system/billing-boundary` appears under Economics.

## 5. Entity context pattern

Canonical detail pattern:

```text
Domain > Collection > Entity > Context tab
```

Agent example:

```text
Agents > Agent > Summary | Composition | Operations | Evidence | Economics | Revisions
```

Execution example:

```text
Operations > Execution runs > Run > Summary | Timeline | Evidence | Economics
```

Tabs must retain entity identity, tenant context and the originating domain.

## 6. Information tiers

- **Primary**: identity, authoritative state, attention, allowed next action.
- **Secondary**: related entities, configuration summary, recent history.
- **Diagnostic**: findings, logs, traces, raw evidence and correlations.
- **Administrative**: governed configuration, policy, tenant or system control.
- **Expert/raw**: backend identifiers, payloads, paths and low-level metadata.

AEES-02 implements disclosure mechanics; AEES-01 defines their ownership.

## 7. State and claim architecture

Presentation must distinguish:

- lifecycle state from readiness;
- control-plane assertion from runtime observation;
- connected from healthy or ready;
- governed from approved or authorized;
- deployed from running;
- operational receipt from legal/financial receipt;
- evidence availability from production readiness.

No visual transformation may promote an inferred state into an authoritative
claim.
