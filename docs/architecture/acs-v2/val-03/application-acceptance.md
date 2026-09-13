# Application acceptance

The integrated VAL-03 test starts the standalone Application on a temporary loopback origin, explicitly allowlists that origin in the temporary Product API host, and connects it to the canonical shared PostgreSQL Native Core.

It proved before the current selector change:

- empty Workforce inventory is rendered before creation;
- the actual Create Workforce form creates draft r1 through `POST /api/v1/workforces` and navigates to detail;
- draft operations expose only `active` and `archived` lifecycle targets;
- Overview, Members, Revisions, new revision, Runs, and Operations direct routes render and survive reload;
- Overview / List is not marked active when a Workforce-local route is selected;
- the Runs screen renders Run A admitted on r3 and Run B admitted on r4.

The current form uses `productApi.listAgents()` to populate its required Agent selector. `GET /api/v1/agents` is currently served from legacy `agentService`, while Workforce creation checks `nativeCore.getAgentLineage`. The browser fixture creates canonical Agents through Native Core, and the selector does not show them. Current creation acceptance is therefore blocked before submission.

Current standalone validation passes: typecheck, 13 tests, lint with 0 errors and 10 existing Fast Refresh warnings, build, and the static matrix (88 checks, 0 failures). Its Workforce caveats are expected because static preview has no Product API.

Static inspection confirms the Application uses `product-api.ts` and does not import Native Core, access PostgreSQL, resolve membership, infer lifecycle, or determine assignment authority.
