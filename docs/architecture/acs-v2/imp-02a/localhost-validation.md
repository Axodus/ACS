# IMP-02A Localhost Validation

**Date recorded:** 2026-09-10
**Environment:** `/opt/Axodus/ACS`, standalone frontend under
`.design/app-standalone`, Product API at `http://127.0.0.1:8788/api/v1`.
**Validation state:** `PASS` for the authorized frontend and localhost scope.

## Commands and automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| Typecheck | PASS | `pnpm --dir .design/app-standalone typecheck` exited 0 |
| Lint | PASS | `pnpm --dir .design/app-standalone lint` exited 0 |
| Build | PASS | `pnpm --dir .design/app-standalone build` exited 0 |
| Full isolated frontend suite | PASS | `pnpm --dir .design/app-standalone test`: 7 passed, 0 failed, 0 skipped |
| `git diff --check` | PASS | exited 0 |

The build emitted the existing `stream` browser-externalization notice and
large-chunk warning. Neither stopped the build or produced a route failure.

## Local processes

- Product API was available on `0.0.0.0:8788`; the UI reported `Product API
  Connected` and used `http://127.0.0.1:8788/api/v1`.
- The frontend was available at `http://127.0.0.1:3000/` in the existing local
  Vite session. A second localhost-bound Vite start selected port `3001`
  because port `3000` was already occupied.
- No production data, credentials, or external provider configuration was
  changed.

## Routes visited

Using the disposable local Agent `dev-agent-sandbox` (`DEV Sandbox Agent`):

| Surface | Route | Result |
| --- | --- | --- |
| Dashboard | `/` | PASS — shell and global Dashboard rendered |
| Agents list | `/agents` | PASS — inventory rendered with Create agent entry |
| Agent Overview | `/agents/dev-agent-sandbox` | PASS — identity, status, revision, readiness, and context rendered |
| Configuration | `/agents/dev-agent-sandbox/configuration` | PASS — existing editor entry point remained reachable |
| Validate | `/agents/dev-agent-sandbox/validate` | PASS — composition/readiness validation rendered; no playground/execution UI |
| Runs | `/agents/dev-agent-sandbox/runs` | PASS — explicit `UNAVAILABLE` state linked to global Runs; no fabricated data |
| Revisions | `/agents/dev-agent-sandbox/revisions` | PASS — current immutable revision rendered |
| Evidence | `/agents/dev-agent-sandbox/evidence` | PASS — explicit `UNAVAILABLE` state linked to global Evidence; no fabricated data |
| Usage & Cost | `/agents/dev-agent-sandbox/usage-cost` | PASS — explicit `UNAVAILABLE` state linked to global Usage & Cost; no fabricated data |
| Advanced | `/agents/dev-agent-sandbox/advanced` | PASS — diagnostic links rendered in contextual surface |
| Existing edit route | `/agents/dev-agent-sandbox/edit` | PASS — governed editor rendered |
| Existing composition route | `/agents/dev-agent-sandbox/composition` | PASS — read-only composition rendered |

## Direct navigation, refresh, and context

- Direct navigation to `/agents`, `/agents/dev-agent-sandbox`, and every
  Agent-local route above succeeded without menu-first traversal.
- Direct navigation and browser refresh were verified on
  `/agents/dev-agent-sandbox/revisions` and
  `/agents/dev-agent-sandbox/validate`; both retained the route and rendered
  the Agent-local shell after refresh.
- Agent identity remained visible as `Agent / dev-agent-sandbox`, in the
  breadcrumb/context area, and in the Agent-local navigation on child routes.
- The shell exposed the canonical global order:
  `Dashboard → Agents → Runs → Evidence → Usage & Cost → Runtime → Administration`.
- The Agent-local navigation exposed:
  `Overview → Configuration → Validate → Runs → Revisions → Evidence → Usage & Cost → Advanced`.

## Errors and limitations observed

- No blocking frontend exception, route error, invalid navigation request, or
  implementation-caused runtime error was visible during the smoke pass.
- Agent-scoped Runs, Evidence, and Usage & Cost correctly remained unavailable
  because no verified unified scoped API exists in this frontend slice. The UI
  stated the limitation and linked to the canonical global surface.
- `Accounts` remained visibly disabled as `NOT_CONFIGURED`; this is existing
  environment state and unrelated to IMP-02A navigation.

## Scope conclusion

The IMP-02A shell and navigation acceptance checks pass for the implemented
frontend scope. No durable PostgreSQL revalidation was required because the
change did not touch persistence, lineage, events/outbox, idempotency,
fencing, Evidence persistence, or Usage/Cost persistence.

The next milestone remains **ACS-V2-IMP-02B — Agent Creation & Configuration**;
it was not started.

