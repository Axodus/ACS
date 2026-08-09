# EPIC-10 S16 — Neurons Economic Contract

S16 introduces the ACS economic domain for NEURONS without implementing blockchain settlement.

## Implemented contracts

- NeuronsAmount
- EconomicAccount
- BillingPolicy
- UsageQuote
- UsageReservation
- UsageRecord
- Settlement
- EconomicReceipt
- SettlementProvider
- EconomicService

## Lifecycle

Quote
→ Reserve
→ Meter
→ Settle
→ Receipt

Release is also represented for unused reservations.

## Important boundaries

S16 does not implement:

- wallet custody
- private keys
- blockchain RPC
- token transfer
- final pricing
- fiat conversion
- exchange integration

## Responsibility modes

Current model distinguishes:

- axodus-managed
- byok
- byos

The mode is preserved on economic records so future execution and settlement layers can apply different responsibility logic without collapsing the domain.
