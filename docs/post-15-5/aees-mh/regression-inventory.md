# AEES-MH Regression and Evidence Inventory

## Added verification

| Check | Purpose |
| --- | --- |
| `tests/s58-post-15-5-aees-mh-preflight.test.mjs` | imports H closure, inventories host-local stores, enforces gate ordering and checks evidence redaction |
| `scripts/certify-aees-mh-preflight.mjs` | produces the structured certification-attempt manifest |

## Execution result

Because MH01 failed before production adapter implementation, B–H product contracts were not changed. Validation covered:

- new preflight: `PASS`;
- no-emit TypeScript: `PASS`;
- official build: `TS5033/EROFS` environment limitation;
- equivalent writable `/tmp` build: `PASS`;
- B01→H core files `s45`–`s58`: `14/14 PASS`;
- nine affected loopback/process files: `26/26 PASS` outside the sandbox;
- `git diff --check`: `PASS`;
- source/environment probes: `PASS` with MH01 blockers found.

The first aggregate run after the failed repository emit used an incomplete `dist/` and was invalid. The clean `/tmp` build removed module failures. Sandbox network tests then failed with `listen EPERM`; the same files passed outside the sandbox. Classification: `ENVIRONMENT_LIMITATION`, not `PRODUCT_DEFECT`.

MH02/MH03 provider, cross-host, failover, browser and full regression suites are intentionally not reported as executed. They become mandatory only after a future MH01 implementation passes.

## Evidence path

```text
/tmp/acs-post15-5-aees-mh-evidence/manifest.json
```

Sensitive evidence matches must remain zero.
