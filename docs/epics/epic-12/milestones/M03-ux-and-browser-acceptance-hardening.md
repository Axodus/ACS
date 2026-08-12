# M03 - UX And Browser Acceptance Hardening

Status: S04 BLOCKED_BY_ENVIRONMENT

## Mission

Define the browser, visual, responsive, accessibility, and UX hardening strategy
needed before EPIC-12 can make stronger acceptance claims.

## Problem

EPIC-11 passed acceptance with a formal visual/browser caveat. EPIC-12 must
decide how much browser evidence is required and how UX hardening is validated
without becoming a generic redesign.

## Candidate Capabilities

- browser smoke acceptance;
- visual acceptance evidence;
- cross-viewport responsive QA;
- accessibility baseline;
- navigation and information architecture polish;
- consistent loading, empty, error, pending, recovery, blocked, and unsupported
  states.

## Dependencies

- browser acceptance scope decision;
- existing app tooling and validation constraints;
- Product API-supported data states;
- candidate inventory UX, responsive, accessibility, and browser entries.

## Out Of Scope

- independent redesign;
- static landing changes;
- functional Product API implementation;
- full design-system replacement;
- browser readiness claim without evidence.

## Risks

- confusing screenshots with full visual acceptance;
- turning hardening into broad UI backlog;
- changing user-facing flows without preserving `Fluxo > Módulo > Tela`;
- masking unsupported states with optimistic UI copy.

## Expected Validation

- selected browser acceptance level;
- viewport matrix, if responsive QA is included;
- accessibility checks and acceptance threshold;
- evidence format for visual/browser results;
- documented unsupported and recovery-state handling.

## Preliminary Acceptance Criteria

- Browser Acceptance remains an explicit decision;
- UX hardening is tied to evidence and state handling;
- responsive and accessibility scopes are bounded;
- no visual/browser acceptance `PASS` is claimed without browser evidence.

## Open Questions

- Is smoke coverage sufficient for EPIC-12?
- Does EPIC-12 require visual baselines?
- Which viewports are mandatory?
- What accessibility threshold is expected?
- Which EPIC-11 screens are acceptance-critical?

## EPIC-11 Caveat Relationship

M03 directly consumes the EPIC-11 visual/browser verification caveat.

## EPIC-12 Decision Relationship

M03 is blocked on Browser Acceptance scope and may feed M07 final acceptance
criteria.

## S04 Evidence State

The S04 harness exists at
[`.design/app-standalone/tools/browser-acceptance.mjs`](../../../../.design/app-standalone/tools/browser-acceptance.mjs)
and is documented in
[`../browser-acceptance.md`](../browser-acceptance.md).

```text
Browser smoke: BLOCKED_BY_ENVIRONMENT
Core route click-through: BLOCKED_BY_ENVIRONMENT
Visual evidence: BLOCKED_BY_ENVIRONMENT
Responsive QA: BLOCKED_BY_ENVIRONMENT
Accessibility baseline: BLOCKED_BY_ENVIRONMENT
WCAG certification: not claimed
Production Ready: NO / not yet claimed
```

The harness and evidence manifest are ready to run, but no runnable headless
browser is available in this workspace. This milestone cannot receive a
browser/UX acceptance PASS until real browser evidence is captured.
