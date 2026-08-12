# EPIC-12 Architecture

## 1. System boundary

EPIC-12 remains a Control Plane epic. It continues to consume Product API
truth and operationally observed runtime state, but it is no longer just about
first-surface visibility. It is about hardening the conditions under which the
surface can be trusted.

```text
Frontend
  ↓
Product API
  ↓
ACS Control Plane
  ↓
Runtime / Workers / External Execution Targets
```

## 2. Organizing rule

```text
Fluxo > Modulo > Tela
```

The epic should be decomposed by readiness and governance flows, not by
vertical technical subsystems alone.

## 3. Operational layers

### Production Readiness Foundation

Authentication, authorization, secrets handling, environment assumptions, and
baseline production safety.

### Governance and Administration

Tenant boundaries, user/admin authority, configuration mutation constraints, and
policy enforcement visibility.

### UX and Acceptance Hardening

Browser verification, responsive behavior, accessibility, navigation, and
consistent empty/loading/error/recovery states.

### Operational Visibility Expansion

Logs, diagnostics, traces, alerts, and incident-oriented evidence.

### Economics Closure

Operational economics visibility, if retained as control-plane evidence, or a
dedicated economics flow if the plan explicitly decides that is the right
boundary.

## 4. Boundary constraints

1. EPIC-12 MUST preserve EPIC-11 as closed and stable.
2. EPIC-12 MUST NOT reimplement EPIC-10 domain truth in the surface layer.
3. EPIC-12 MUST keep runtime state and external execution targets distinct from
   control-plane state.
4. EPIC-12 MUST treat `./static` as out of scope unless the plan explicitly
   chooses otherwise.
5. EPIC-12 MUST treat production, billing, and administration claims as
   disallowed until evidence supports them.
6. EPIC-12 SHOULD prefer explicit fallback and unsupported-state handling over
   simulated success when data is absent.

## 5. Dependency shape

```text
Production Readiness Foundation
        │
        ▼
Governance and Administration
        │
        ▼
UX and Acceptance Hardening
        │
        ▼
Operational Visibility Expansion
        │
        ▼
Economics Closure
```

## 6. Implementation guidance

- Keep evidence honest and correlation-friendly.
- Separate control-plane assertions from runtime observations.
- Keep browser and accessibility acceptance as first-class gates if the epic
  chooses to claim readiness beyond internal inspection.
- Do not collapse tenant, admin, and operator roles into one undifferentiated
  authority model.

