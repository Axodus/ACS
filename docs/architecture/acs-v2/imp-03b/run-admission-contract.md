# Run admission contract

`admitWorkforceRun` creates a native `RunV2` with `kind: workforce` and an immutable Workforce revision reference. The Run stores the full revision reference, never only `workforce_id`.

The admission rejects missing, disabled, archived, or non-active Workforce/Agent state. Existing non-Workforce Run paths are not routed through this method.
