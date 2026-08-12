# EPIC-13 Architecture

## Boundary flow

```text
Frontend
  ↓
Product API
  ↓
ACS Control Plane
  ↓
Economic Evidence / Billing Boundary
  ↓
External Payment / Invoice / Accounting Systems
```

External payment, invoice and accounting systems are planning boundaries only
until explicitly implemented.

## Conceptual entities

- economic evidence
- billing intent
- invoice artifact
- payment authorization
- payment capture
- settlement
- receipt
- reconciliation
- tenant account responsibility
- financial audit record

## Architectural rule

EPIC-13 must define boundaries and contracts first. It must not implement real
financial execution while planning is still open.
