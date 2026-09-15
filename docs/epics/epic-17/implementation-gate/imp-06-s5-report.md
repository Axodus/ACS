# EPIC-17-IMP-06 S5 — External Adapter Boundary & Safe Product Projection

**Status:** `COMPLETE / CTO ACCEPTED / PUBLICATION AUTHORIZED`  
**Baseline:** `f651048563c2c94a0bdaa78b71edfa9de3cc67e2`  
**Schema:** `12 / CANONICAL`  
**Date:** September 15, 2026

## Scope delivered

S5 adds a provider-neutral external-observation composition boundary. It does
not add an observation aggregate, Schema 13, a Product API route, admission,
Run/Workflow creation, scheduler runtime or OpenClaw execution.

```
ExternalObservationAdapterV1
  -> NormalizedExternalObservationV1
  -> ExternalObservationActivationIngressV1
  -> nativeCore.createActivation(...)
  -> canonical Activation lineage
```

- `NormalizedExternalObservationV1` carries only Tenant, exact Automation
  revision, source class, normalized source causal material, adapter/provider
  references, external-reference digest, timestamps and safe Evidence refs.
- Adapter/provider identity and external delivery digest are provenance. They
  are not part of the source material from which `activation_id` derives.
- The ingress composes the existing durable Activation owner and writes the
  observed state, metadata-safe Event, governance Evidence and outbox through
  the existing transactional `createActivation` command.
- `projectActivationExternalObservationV1` provides a metadata-safe Product
  projection contract/mapper. No route or mutation endpoint is introduced.

## Required-property evidence

| Property | Evidence |
| --- | --- |
| Same external logical observation | Two adapter/provider forms normalize to the same causal source and one Activation. |
| Duplicate delivery / retry | Repeated ingress returns one logical Activation. |
| Provider ID is not ACS identity | `activation_id` derives from normalized source material; delivery IDs remain digested provenance. |
| Provider replacement | Provider A and B adapters exercise the same canonical ingress. |
| Cross-Tenant | Validation rejects mismatched Tenant before ingress. |
| Adapter unavailable | Normalization failure creates no Activation. |
| Raw payload / credentials | Neither appears in normalized contract, Event payload, Evidence payload or Product projection. |
| Canonical ownership | S5 calls `nativeCore.createActivation(...)`; it adds no alternate persistence owner. |
| No downstream runtime | No admission call, Run/Workflow creation, OpenClaw execution or scheduler loop. |

## Validation

| Check | Result |
| --- | --- |
| Build | PASS — `npm run build` |
| Focused S5 | PASS — 6 tests / 0 failures |
| PostgreSQL 17.6 / Schema 12 | PASS — 27 tests / 0 failures / 0 skips |
| PostgreSQL S5 proof | PASS — two provider representations create one Activation and one observed fact/Event/Evidence/outbox package; persisted Event excludes delivery IDs, credentials and secrets |
| Full regression | RUN — 148 passing tests / 10 failing tests |
| Causality | `A = 0`, `D = 0`, `C = 10` existing listener/process-environment denials |
| `git diff --check` | PASS |
| Schema 13 | NOT REQUIRED |

The ten regression failures are the existing listener/process-environment
class (`acs-v2-imp-03e`, `s48`, `s50`–`s52`, `s54`–`s57`, `s77`). Both S5 test
files pass in the same full run.

## Explicit exclusions

- No new HTTP/Product API route or mutation endpoint.
- No new persistence object or migration.
- No admission invocation or admitted authority decision.
- No Run/Workflow creation or execution.
- No autonomous scheduler or OpenClaw execution.
- No provider becomes Automation, Activation, admission or execution owner.

## CTO disposition

CTO accepted S5 and authorized its restricted commit and push to `origin/dev`.
The remaining IMP-06 work is final conformance/closure rather than a further
functional slice, unless the final reconciliation finds a mapping contradiction.
