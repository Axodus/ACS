# Proof Report: acs-rsi-sandbox lifecycle

Artifact: `acs-rsi-sandbox-pilot`

Lifecycle modeled:

```text
proposed -> approved_for_sandbox -> created -> disabled -> removed -> rolled_back -> archived
```

## Disable Pilot

- `disable` is preferred before `remove`.
- Disable is sandbox-only.
- Strategy file was not physically deleted.
- Real Hummingbot runtime was not touched.

## Remove Pilot

- Remove is modeled as logical tombstone.
- Remove starts only from `disabled`.
- Remove is high risk.
- Remove has rollback plan.
- Remove preserves audit/evidence.
- Remove does not touch real runtime.
- Remove does not delete the sandbox evidence files.

## Rollback Verification

- Rollback target is sandbox-only.
- Rollback restores lifecycle status from `removed` to `rolled_back`.
- Rollback does not touch live Hummingbot paths.
