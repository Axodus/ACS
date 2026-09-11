# Implementation traceability

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Expand/collapse global sidebar | `src/App.tsx` state and toggle; `src/index.css` desktop reflow | `tests/imp-02e-sidebar-and-agent-layout.test.mjs` |
| Icons-only collapsed navigation | Phosphor icons in `domainDefs`; labels and children hidden in collapsed mode | focused IMP-02E test |
| Accessible toggle and labels | `aria-label`, `aria-expanded`, keyboard focus styling, `title` on collapsed links | focused IMP-02E test |
| Lightweight preference | `localStorage` key `acs.sidebar.collapsed`; expanded default | focused IMP-02E test |
| Two-column `/agents/new` | `.agent-form-layout`, `.agent-form-review`, `.agent-form-configuration` | focused IMP-02E test |
| Live review | Review reads the canonical `AgentForm` state values and calls the existing `handleSubmit` | focused IMP-02E test and typecheck |
| Responsive behavior | Desktop reflow, tablet narrowing, mobile configuration-first stack, preserved drawer | focused IMP-02E test |
| Scope boundary | No Product API, backend, database, migration, or dependency changes | git diff review |
