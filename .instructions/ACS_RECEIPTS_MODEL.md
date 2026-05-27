# ACS Receipts Model

ACS receipts are governance-grade audit records for inspection, policy decisions, emergency stops, readiness/status checks and future workflow traceability.

Required fields:
- `receiptId`
- `correlationId`
- `consumptionLevel`
- `capabilityId`
- `actionType`
- `actor`
- `policyDecision`
- `telemetry`
- `createdAt`

Scope rules:
- service-level receipts must include `tenantId`;
- product/user-level receipts must include `wallet`;
- receipts must be JSON serializable;
- receipts must include policy metadata;
- receipts must never store raw secrets, tokens, passwords or API keys.

Current implementation:
- `src/acs-receipts.ts`
- in-memory store only;
- metadata sanitizer redacts sensitive fields;
- no workflow execution is enabled by this model.
