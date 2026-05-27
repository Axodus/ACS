# ACS Auth And Rate-Limit Placeholders

Current phase: contract-only / mock-capable.

ACS HTTP can attach `meta.auth` and `meta.rateLimit` to every response envelope. This prepares production authentication and rate limiting without enforcing real tokens yet.

## Auth Context

```json
{
  "mode": "mock",
  "actorType": "tenant-admin",
  "actorId": "admin-1",
  "tenantId": "dao-alpha",
  "wallet": "0xlicensed",
  "scopes": ["acs:inspect"],
  "authenticated": true,
  "warnings": ["ACS HTTP auth context is mock-only; no token validation was performed."]
}
```

Rules:
- no raw token, secret or credential may be exposed;
- current default mode is `disabled`;
- mock headers are allowed for local inspection tests only;
- future policy decisions may consume this context.

## Rate-Limit Context

```json
{
  "enabled": true,
  "key": "tenant:dao-alpha",
  "limit": 60,
  "remaining": 59,
  "resetAt": "2026-01-01T00:01:00.000Z",
  "exceeded": false,
  "warnings": ["ACS HTTP rate limiting is mock-only in this phase."]
}
```

Mock exceeded response uses:

```json
{
  "success": false,
  "version": "0.1.0",
  "correlationId": "corr-rate",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "error": {
    "code": "rate_limit_exceeded",
    "message": "rate limit exceeded",
    "details": {
      "resetAt": "2026-01-01T00:01:00.000Z"
    }
  }
}
```

Rules:
- production infrastructure enforcement is not implemented yet;
- mock exceeded mode can return `429`;
- correlation id must be preserved on rate-limit errors.
