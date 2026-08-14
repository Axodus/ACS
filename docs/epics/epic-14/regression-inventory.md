# EPIC-14 Regression Inventory

## Status

```text
AEES: AEES-05
Status: COMPLETE / PASS
Open Blockers: 0
Open High Findings: 0
Fixed Findings: 4
```

## Findings

| ID | Severity | Surface | Status |
|---|---|---|---|
| AEES14-05-B01 | Blocker | Browser acceptance execution | RESOLVED / SUPERSEDED |
| AEES14-05-B02 | Blocker | CLI browser harness capture | RESOLVED |
| AEES14-05-B03 | Blocker | /agents horizontal overflow at 768x1024 | RESOLVED |
| AEES14-05-M01 | Medium | Browser evidence harness paths | FIXED |

### AEES14-05-B01 — Browser execution blocked by environment

- **Severity:** Blocker
- **Disposition:** RESOLVED / SUPERSEDED
- **Evidence:** Playwright Chromium launched successfully and produced the final PASS manifest at `/tmp/acs-epic14-browser-evidence/manifest.json`.

### AEES14-05-B02 — CLI harness unable to capture SPA routes

- **Severity:** Blocker
- **Disposition:** RESOLVED
- **Fix:** browser acceptance migrated to Playwright API-driven navigation, rendering, screenshot and accessibility capture.

### AEES14-05-B03 — /agents horizontal overflow at 768x1024

- **Severity:** Blocker
- **Disposition:** RESOLVED
- **Fix:** responsive `/agents` toolbar now stacks safely at tablet widths; browser acceptance confirms `horizontalOverflow: false` across the full matrix.

### AEES14-05-M01 — EPIC-12-scoped browser evidence paths

- **Severity:** Medium
- **Disposition:** FIXED
- **Fix:** defaults now use EPIC-14 scoped tmp paths; `ACS_BROWSER_EVIDENCE_ROOT` and `ACS_BROWSER_PROFILE_ROOT` are supported.

## Deferred / not EPIC-14 defects

- Full WCAG certification remains out of scope.
- Pixel-level visual polish remains deferred unless it becomes an operational usability defect.
