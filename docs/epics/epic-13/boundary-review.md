# EPIC-13 Boundary Review

## Resolved planning boundaries

- billing boundary
- financial truth
- billable event model
- pricing boundary
- invoice candidate model
- payment rails boundary
- tenant billing responsibility
- settlement and reconciliation visibility
- receipts
- financial audit and evidence
- billing UX and operator surface
- billing readiness gates

## Open executive decisions

## Requires explicit decision

| Decision | Options | Pending? |
|---|---|---|
| Real payment processor integration | Yes / No | Yes |
| Tax / legal invoice compliance | Yes / No | Yes |
| Refunds / chargebacks | Yes / No | Yes |
| Multi-currency handling | Yes / No | Yes |
| Subscription / plan management | Yes / No | Yes |
| Enterprise tenant billing suite | Yes / No | Yes |

## Must not implement before decision

- real payment processor integration
- legal/tax invoice compliance
- refunds
- chargebacks
- multi-currency
- subscription/plan management
- pricing configuration
- tenant billing readiness
- external accounting integrations
- real payment capture
- production financial operation claim

## Candidate for EPIC-14+

- production payment capture
- accounting integrations
- tax compliance automation
- collections
- revenue recognition
- marketplace payouts
- financial forecasting
- enterprise billing suite

## Claim discipline risks

- no real money movement
- no payment capture
- no simulated billing success
- no legal/tax invoice claim
- no tenant billing ready claim
- no billing ready claim
