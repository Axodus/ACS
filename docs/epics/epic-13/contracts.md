# EPIC-13 Contracts

## Financial truth contract

- financial data must have source
- no invented monetary values
- no simulated billing success
- no payment capture without explicit contract
- no invoice claim without artifact and compliance decision

## Billing boundary contract

- billing intent
- billable event
- invoice candidate
- payment state
- settlement state
- receipt state
- reconciliation state

## Tenant billing contract

- tenant scope
- accountable account
- payer identity
- operator identity
- audit correlation
- no tenant billing claim without tenant boundary

## Payment rails contract

- payment provider boundary
- authorization vs capture
- failure states
- retry / refund / chargeback status
- unsupported and deferred states

## Compliance / tax contract

- invoice is not tax/legal invoice unless explicitly validated
- receipts are operational receipts unless compliance-ready
- audit logs are not a compliance program by default
