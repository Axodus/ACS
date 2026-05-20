# ACS Performance Records

Performance records are schema contracts for future validation and UI visibility.

They are not marketing records and must not imply promised profit, APY, passive income or guaranteed returns.

Supported modes:
- `mock`
- `sandbox`
- `internal-validation`
- `restricted-real`

Current implementation:
- `src/performance-record.ts`
- mock Trading Ignition records only;
- no real trading ingestion;
- no real CEX integration;
- no autonomous execution.

Performance records may include risk and operational fields such as drawdown, trade count, fees, funding fees, liquidation risk events and emergency stops, but these are audit/validation fields, not promotional claims.
