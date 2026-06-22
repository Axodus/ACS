# ACS HTTP API Contracts

ACS HTTP remains read-only/inspection-first in the current phase.

Response envelope:

```ts
type AcsApiResponse<T> = {
  success: boolean
  version: string
  correlationId: string
  timestamp: string
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  warnings?: string[]
}
```

Current hardening foundation:
- API version appears in every response;
- every response has a correlation id;
- errors use structured envelopes;
- invalid filters fail closed;
- response envelope is consistent across ACS endpoints;
- auth and rate-limit contexts are explicit placeholders;
- query/path schema validation is enabled;
- observability hooks are explicit contract-only status surfaces.

Endpoints covered:
- `/acs/health`
- `/acs/version`
- `/acs/capabilities`
- `/acs/tenant-services`
- `/acs/product-access`
- `/acs/policy-matrix`
- `/acs/policy-check`
- `/acs/status`
- `/acs/readiness`
- `/acs/operational-state`
- `/acs/user-status`
- `/acs/emergency-stops`
- `/acs/secret-storage/status`
- `/acs/observability/status`

Security rule:
The HTTP layer must not expose secrets, mutate tenant state, call real exchanges or start autonomous workflows.

REQ-07 consumer contract note:
- `ACS-REQ-07` adds a generic read-only consumer contract at the local registry/inspection layer only.
- No AxodusAPP-specific adapter is introduced in `ACS-REQ-07`.
- No Business/Marketplace-specific alignment contract is introduced in `ACS-REQ-07`.
- No new mutating HTTP endpoints are added in `ACS-REQ-07`.

REQ-08 AxodusAPP preview note:
- `ACS-REQ-08` adds an AxodusAPP preview adapter at the local registry/inspection layer only.
- The preview adapter is read-only, local/config-first, and dashboard-safe.
- The preview adapter does not call AxodusAPP and does not require AxodusAPP runtime.
- No new mutating HTTP endpoints are added in `ACS-REQ-08`.

REQ-09 Business/Marketplace alignment note:
- `ACS-REQ-09` adds Business and Marketplace alignment projections at the local registry/inspection layer only.
- The alignment contract is read-only, local/config-first, and non-executive.
- The alignment contract does not call Business runtime or Marketplace runtime.
- No new mutating HTTP endpoints are added in `ACS-REQ-09`.

Full response examples live in `.instructions/ACS_API_EXAMPLES.md`.
