# VAL-02B Reload / Re-Fetch Acceptance

## Environment

- Product API: `http://127.0.0.1:8788/api/v1`
- Standalone frontend: `http://127.0.0.1:3000`
- Disposable Agent: `imp02b-local-20260910`
- Direct Configuration URL:
  `http://127.0.0.1:3000/agents/imp02b-local-20260910/configuration`

## Revision flow

| Step | Evidence |
| --- | --- |
| Starting state | Product API returned revision `r3` and name `IMP-02B Local Validation Agent Current`. |
| Mutation | In the existing Configuration editor, changed `name` to `IMP-02B Reload Validation r4` and used `Save changes`. |
| Mutation result | Agent Overview rendered `r4`, the new name, and distinct current fingerprint `814b867b…`. Revision history retained `r3`, `r2`, and `r1`. |
| Independent backend read | `GET /api/v1/agents/imp02b-local-20260910` returned `currentRevision.revision = 4`, the new name, and composition `ready`. |
| Restart durability | After Product API restart, the same canonical GET still returned the new name and `r4`. |
| Browser reload | The direct Configuration URL was opened and explicitly reloaded. It first rendered `Loading current configuration...`, then rendered the Product API-backed name and `r4`. |
| Context preservation | The reloaded page retained Agent ID `imp02b-local-20260910`, local workspace context, and the Configuration route. |
| Validate smoke check | `/agents/imp02b-local-20260910/validate` loaded after reload with Composition `READY`, Readiness `READY`, 0 blockers, and 0 warnings. |

The visible loading state before the final Configuration values and the matching
post-restart Product API response establish a backend re-fetch rather than
retained React memory. Historical revision `r3` remains listed while `r4` is
current; no historical revision was mutated.
