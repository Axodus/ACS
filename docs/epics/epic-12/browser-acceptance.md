# EPIC-12 Browser Acceptance Baseline

## Status

```text
Status: BLOCKED_BY_ENVIRONMENT (S04 execution)
Production Ready: NO / not yet claimed
WCAG certification: not claimed
```

This document records the S04 browser acceptance harness and the evidence
state. It does not claim browser, visual, responsive, or accessibility PASS.

## Purpose

EPIC-11 closed with a formal visual/browser verification caveat. S04 must turn
that caveat into a repeatable baseline: browser smoke, visual evidence,
responsive QA, and accessibility checks for the ACS Control Plane standalone
app.

## Harness

The harness is dependency-light and uses the built Vite SPA plus a headless
browser CLI when one is available:

```text
.design/app-standalone/tools/browser-acceptance.mjs
```

Run after the app build:

```bash
cd .design/app-standalone
pnpm build
pnpm test:browser
```

The harness:

- serves `dist/` locally without relying on a network or package server;
- probes for a runnable Chromium-compatible Chrome binary via
  `ACS_BROWSER_PATH` or common local paths;
- captures rendered DOM for the core routes;
- captures screenshots at the supported viewport matrix;
- runs a static DOM accessibility checklist;
- writes `tmp/epic-12/browser-evidence/manifest.json` and local artifacts;
- exits with a non-zero code when the browser cannot start or a route fails.

If no browser can start, the harness writes a `BLOCKED_BY_ENVIRONMENT` manifest
instead of inventing evidence.

## Route Mapping

The standalone app uses these S04-equivalent routes:

```text
/
/readiness
/system
/agents
/composition
/operational-execution
/operational-evidence
/economics
/runtime
/logs
/audit
/settings
```

`/system/production-readiness` and `/system/governance` are not independent
routes in the current app. They are covered by `/system`, which renders the
production readiness and governance surfaces.

## Viewport Matrix

```text
desktop: 1440x900
laptop: 1280x800
tablet: 768x1024
mobile: 390x844
```

Desktop screenshots are captured for all routes. Responsive screenshots are
captured for `/`, `/readiness`, `/system`, and `/agents`.

## Accessibility Baseline

The harness runs a static DOM checklist for:

- document language;
- main landmark;
- `h1` heading;
- navigation landmark;
- accessible names on links and buttons.

This is a baseline, not WCAG certification:

```text
Accessibility baseline: BLOCKED_BY_ENVIRONMENT until browser evidence runs
WCAG certification: not claimed
```

Keyboard, focus, contrast, axe-core, and complete WCAG checks are not claimed
by this harness.

## Current Environment Blocker

As of the S04 execution attempt in this workspace, no runnable headless browser
was available:

- cached Chromium binaries report version successfully but crash during page
  startup with a sandbox/headless user-data error;
- system Firefox is a snap wrapper that fails because `snap-confine` lacks the
  required capability;
- Windows Chrome/Edge cannot be used reliably from this WSL environment.

Because browser execution is a prerequisite for S04 evidence, the harness and
documentation are delivered but the milestone is reported as
`BLOCKED_BY_ENVIRONMENT`. Static checks are not treated as browser acceptance.

## Next Steps

1. Rerun `pnpm test:browser` in an environment with a runnable headless
   browser.
2. Review `tmp/epic-12/browser-evidence/manifest.json`.
3. Fix only critical route, render, layout, or accessibility issues revealed by
   the harness.
4. Update this document and M03 only after real browser evidence is produced.
5. Keep `Production Ready: NO / not yet claimed` and
   `WCAG certification: not claimed`.
