# Localhost validation

Validation record for ACS-V2-IMP-02E on September 11, 2026.

The standalone app validation completed successfully. The browser check used `http://127.0.0.1:3000/agents/new` with the local Vite mode.

Expected checks:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm test`
- `pnpm run build`
- `git diff --check`

Results:

- standalone typecheck: passed;
- standalone lint: passed;
- standalone focused tests: 3 passed;
- standalone full tests: 11 passed;
- standalone build: passed;
- `git diff --check`: passed;
- browser: passed — desktop two-column layout visible, collapse control changed to `Expand sidebar`, collapsed navigation exposed icon titles, and editing the Name field updated Review immediately;
- canonical ACS core suite: 108 passed, 8 failed, 0 skipped. The failures are isolated to EPIC-15.5 tests (`s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57`) and are unrelated to this frontend-only diff.

The first sandboxed server start was blocked by `listen EPERM`; the same local command succeeded with the approved host execution path on port 3000.
