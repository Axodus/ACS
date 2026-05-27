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

Full response examples live in `.instructions/ACS_API_EXAMPLES.md`.
