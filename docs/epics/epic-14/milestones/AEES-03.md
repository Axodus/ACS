# AEES-03 — Financial Boundaries

## Objective

Establish truthful and governed economic representation inside the ACS Control
Plane while preserving the boundary:

```text
Operational Truth ≠ Economic Truth ≠ Billing Truth
```

## Status

```text
Status: PASS WITH FORMAL CAVEATS
Scope: standalone Economics domain and EPIC-14 normative package
Backend/Product API changes: none
Browser acceptance: NOT EXECUTED — deferred to AEES-05
Billing readiness: NO / not claimed
```

## Inputs

- `../README.md`
- `../architecture.md`
- `../contracts.md`
- `../boundary-review.md`
- `../information-architecture.md`
- `../ux-audit.md`
- `../stories.md`
- `../financial-boundaries.md`
- `AEES-01.md`
- `AEES-02.md`
- `.design/app-standalone/src/App.tsx`
- `.design/app-standalone/src/api/product-api.ts`
- `src/control-plane/operational-evidence-service.ts`
- `src/control-plane/neurons-economic-contract.ts`
- EPIC-13 financial boundary reports and closure contracts

## Workstreams

### W1 — Economic data inventory

Completed in `../financial-boundaries.md`.

Inventoried current Product API projections for summary, quotes, reservations,
metering, settlements, receipts, agent economic unavailability and EPIC-13
financial boundary reports.

### W2 — Semantic classification

Completed in `../financial-boundaries.md`.

Classifications:

- Authoritative: Product API projections and explicit unavailable states.
- Estimated: quotes and `totalEstimated`.
- Projected: EPIC-13 future/no-claim readiness projections.
- Informational: review flow, cross-links and explanatory boundary copy.
- Unsupported: billing, payment, invoices, balances, exchange, wallets, fiat
  settlement, budgets and revenue claims.

### W3 — Canonical financial surface

Implemented in `/economics`.

The Economics landing now prioritizes:

1. scope and claim discipline;
2. Product API operational economic totals;
3. contextual attribution;
4. quote/reservation details;
5. diagnostic metering/settlement/receipt evidence;
6. EPIC-13 boundary evidence links.

### W4 — Cross-domain integration

- Agent detail now shows economic context as contextual/unavailable and links to
  canonical Economics.
- Financial boundary routes now link back to Economics instead of framing System
  as the financial home.
- Existing `/system/*` financial routes remain compatibility deep links.

### W5 — Tenant and governance validation

Findings:

- The backend economic contract supports optional tenant/workload identifiers.
- The current standalone shell does not receive an authoritative tenant selector
  or tenant-scoped economic aggregate.
- The UI therefore states tenant scope as unavailable where not projected and
  does not infer cross-tenant visibility.
- No client-side financial authorization or mutation was introduced.

### W6 — Regression and documentation

Documentation updated:

- `../financial-boundaries.md`
- `../README.md`
- `../architecture.md`
- `../contracts.md`
- `../boundary-review.md`
- `../information-architecture.md`
- `../stories.md`
- `README.md`
- this milestone

Validation completed on August 14, 2026:

- Standalone typecheck: PASS
- Standalone lint: PASS
- Standalone production build: PASS (Vite emitted an existing chunk-size warning)
- Standalone smoke tests: PASS (3/3)
- `git diff --check`: PASS

Browser acceptance was not run and remains AEES-05 work.

## Authority decisions

| Decision | Result |
|---|---|
| Canonical financial home | Economics |
| Billing boundary reports | Economics children; `/system/*` compatibility routes retained |
| Agent economics | contextual unavailable state only until Product API exposes detail |
| Operational receipts | evidence only, not invoice/payment receipt |
| `$Neurons` | operational asset/unit only |
| Missing values | unavailable, never zero |
| Tenant scope | only shown when Product API projects it |
| Billing readiness | not claimed |

## Acceptance criteria

- [x] current economic data sources inventoried
- [x] exposed values documented by semantic class
- [x] usage and billing not conflated
- [x] actual/estimated/recorded/settled wording distinguished
- [x] tenant scope preserved as unavailable when not authoritative
- [x] contextual references point to Economics
- [x] missing values not silently treated as zero
- [x] unsupported billing/economic claims absent or marked not claimed
- [x] `$Neurons` representation limited to implemented contract
- [x] Economics follows AEES-02 progressive disclosure patterns
- [x] existing operational workflows left intact
- [x] validation suite complete

## Deferred work

- Full browser/manual visual acceptance: AEES-05.
- Broader status/badge language normalization: AEES-04.
- User-selectable tenant/economic scope: future Product API contract.
- Billing, payment, invoice, balance, wallet, exchange and marketplace
  economics: unsupported until future explicit contracts.
- Dedicated execution/run economic detail pages: future work if Product API
  exposes canonical detail projections.

## Validation commands

To close AEES-03:

```bash
cd .design/app-standalone
npm run typecheck
npm run lint
npm run build
npm test
cd ../..
git diff --check
```

## Exit criteria

AEES-03 has passed static validation. Browser acceptance remains explicitly
deferred to AEES-05. A dedicated commit is required for closure.
