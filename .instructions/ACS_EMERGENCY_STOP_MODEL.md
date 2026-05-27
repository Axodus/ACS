# ACS Emergency Stop Model

Emergency stop exists before any live automation or exchange execution.

Scopes:
- `user`
- `tenant`
- `capability`
- `governance`
- `system`

Sources:
- `user`
- `tenant-admin`
- `agent`
- `governance`
- `system`

Current behavior:
- creates emergency stop records;
- lists and evaluates active stops;
- blocks policy inspection decisions with `blockedReason: emergency_stop_active`;
- emits telemetry;
- generates an ACS receipt;
- does not trigger real trading, exchange calls, tenant mutation or autonomous execution.

Implementation:
- `src/emergency-stop.ts`

Rule:
Any future execution adapter must check emergency stop state before preparing or dispatching an action.
