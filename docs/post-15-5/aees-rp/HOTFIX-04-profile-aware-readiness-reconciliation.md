# HOTFIX-04 — Profile-aware Readiness Reconciliation

**Result:** PASS

The real Dashboard runtime at `http://127.0.0.1:3000/` consumes `GET http://127.0.0.1:8788/api/v1/dashboard`. The backend now separates:

- active environment/profile;
- active composition;
- profile-relative critical blockers;
- certified platform capabilities;
- global certification caveats.

For the localhost development profile, development identity, memory secrets, disabled external telemetry, local worker transport and sandbox deployment remain truthful composition facts but are not production-critical errors. The same descriptors remain critical when a production-like profile is selected. `GLOBAL_MULTI_HOST_NOT_CERTIFIED` remains a warning.

Focused regression: `tests/aees-rp-dashboard-readiness.test.mjs`.

This semantic model is preserved by HOTFIX-05 under `Administration > Overview`.
