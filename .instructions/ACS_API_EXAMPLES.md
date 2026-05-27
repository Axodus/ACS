# ACS API Examples

All examples are inspection/read-only shapes. They do not imply execution.

## Response Envelope

```json
{
  "success": true,
  "version": "0.1.0",
  "correlationId": "corr_example",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "data": {},
  "meta": {
    "auth": {
      "mode": "disabled",
      "scopes": [],
      "authenticated": true,
      "warnings": ["ACS HTTP auth enforcement is disabled in the current inspection MVP."]
    },
    "rateLimit": {
      "enabled": false,
      "exceeded": false,
      "warnings": ["ACS HTTP rate limiting is disabled in the current inspection MVP."]
    }
  }
}
```

## Capabilities

```json
{
  "capabilities": [
    {
      "id": "product.trading-ignition",
      "name": "Trading Ignition",
      "category": "trading",
      "consumptionLevel": "product",
      "automationLevel": "manual_approval",
      "requiresGovernanceApproval": true,
      "requiresTenantApproval": false,
      "requiresUserLicense": true,
      "telemetryRequired": true,
      "receiptsRequired": true
    }
  ]
}
```

## Tenant Services

```json
{
  "tenants": [
    {
      "tenantId": "dao-alpha",
      "governanceStatus": "active",
      "federationTier": "standard",
      "restrictions": [],
      "services": [
        {
          "serviceId": "service.risk-analysis",
          "allowed": true,
          "automationLevel": "manual_approval"
        }
      ]
    }
  ]
}
```

## Product Access

```json
{
  "walletAddress": "0xunlicensed",
  "products": [
    {
      "productId": "product.trading-ignition",
      "allowed": false,
      "blockedReason": "product.trading-ignition requires a valid NFT license or marketplace purchase"
    }
  ]
}
```

## Policy Check Allowed

```json
{
  "policyContext": {
    "capabilityId": "product.trading-ignition",
    "tenantId": "dao-alpha",
    "source": "capability-registry",
    "decisionSurface": "inspection",
    "executionTriggered": false
  },
  "allowed": true,
  "automationLevel": "manual_approval",
  "requiresGovernanceApproval": true,
  "requiresUserLicense": true
}
```

## Policy Check Blocked

```json
{
  "policyContext": {
    "capabilityId": "product.trading-ignition",
    "wallet": "0xstopped",
    "source": "emergency-stop",
    "decisionSurface": "inspection",
    "executionTriggered": false
  },
  "allowed": false,
  "blockedReason": "emergency_stop_active",
  "automationLevel": "blocked"
}
```

## Emergency Stop Active

```json
{
  "mode": "mock",
  "executionImpact": "policy_inspection_block_only",
  "stops": [
    {
      "stopId": "stop_mock_user_001",
      "scope": "user",
      "source": "user",
      "wallet": "0xstopped",
      "capabilityId": "product.trading-ignition",
      "reason": "mock user emergency stop for inspection",
      "severity": "critical",
      "active": true
    }
  ]
}
```

## User Status Summary

```json
{
  "wallet": "0xexpired",
  "tenantId": "dao-alpha",
  "productId": "product.trading-ignition",
  "operationalState": "RISK_RESTRICTED",
  "license": {
    "valid": false,
    "blockedReason": "license_expired"
  },
  "policy": {
    "allowed": false,
    "blockedReason": "license_expired",
    "automationLevel": "blocked"
  }
}
```

## Receipt

```json
{
  "receiptId": "receipt_mock_policy_check_001",
  "correlationId": "corr_mock_policy_check_001",
  "tenantId": "dao-alpha",
  "wallet": "0xlicensed",
  "consumptionLevel": "product",
  "capabilityId": "product.trading-ignition",
  "actionType": "policy_check",
  "policyDecision": {
    "allowed": true,
    "automationLevel": "manual_approval"
  }
}
```

## Performance Record

```json
{
  "recordId": "perf_mock_trading_ignition_001",
  "tenantId": "dao-alpha",
  "wallet": "0xlicensed",
  "capabilityId": "product.trading-ignition",
  "mode": "internal-validation",
  "tradeCount": 0,
  "drawdown": 0,
  "warnings": ["mock record for UI validation only"]
}
```

## License Loss

```json
{
  "allowed": false,
  "blockedReason": "license_expired",
  "operationalState": "RISK_RESTRICTED",
  "emergencyStopRecommended": false
}
```

## Rate-Limit Error

```json
{
  "success": false,
  "version": "0.1.0",
  "correlationId": "corr-rate",
  "error": {
    "code": "rate_limit_exceeded",
    "message": "rate limit exceeded"
  }
}
```
