# EPIC-17-IMP-07 S3 Report

- **Slice:** S3 — Product API Integration, Tenant/Auth/Redaction & Compatibility
- **Baseline:** `07da78f657dbb212f436ca570d71f2dddb95c0b2` (published S2 on `origin/dev`)
- **Date:** September 15, 2026

## Routes implemented/adapted

| Route family | Classification | S2 service | Canonical owner |
| --- | --- | --- | --- |
| `GET /api/v1/automations` | QUERY | `AdministrativeQueryService.listAutomations` | Native Automation history |
| `GET /api/v1/automations/:automationId` | QUERY | `AdministrativeQueryService.getAutomation` | Native Automation history |
| `GET /api/v1/delegation/grants` | QUERY | `AdministrativeQueryService.listDelegations` | Native Delegation history |
| `GET /api/v1/delegation/grants/:grantId` | QUERY | `AdministrativeQueryService.getDelegation` | Native Delegation history |
| `GET /api/v1/activations/:activationId` | QUERY | `AdministrativeQueryService.getActivation` | Native Activation lineage |

Automation and Delegation detail routes accept `revision` and `fingerprint` only as a pair for `EXACT`. Activation detail accepts `observationDigest` for `OBSERVED`. No command, lifecycle or action route was added.

The existing HTTP authentication, Tenant-scope and membership boundary runs before route dispatch. Routes invoke only the S2 query coordinator. The Product API has no repository call, no direct domain persistence call, and no direct `GovernedAutomationService` call. Delegation retains the accepted legacy `grantId` compatibility field through a response mapper over the S2 safe projection.

## Validation

| Check | Result |
| --- | --- |
| Build | PASS |
| Focused S3 | PASS — `epic-17-imp-07-s3-product-api.test.mjs` |
| Route to S2 service | PASS |
| Route to repository | NONE |
| CURRENT / EXACT / OBSERVED | PASS |
| Tenant isolation | PASS / fail closed |
| Authorization | PASS — existing authenticated Tenant membership boundary exercised |
| Credential/secret wire redaction | PASS |
| Raw provider, Memory, authority internals exclusion | PASS |
| Typed errors | PASS — fingerprint mismatch preserves a typed 409; non-disclosing not-found preserved for foreign Delegation access |
| Compatibility | PASS — Delegation `grantId` response compatibility mapper |
| Automation command owner | N/A — no S3 Automation command route was added |
| Activation execution/admission | NONE |
| PostgreSQL 17.6 / Schema 12 | PASS — 28 / 0 / 0 |
| Schema 13 | NOT REQUIRED |
| Full regression | 152 PASS; 10 classified environmental failures |
| Causality | A = 0; D = 0 |
| `git diff --check` | PASS |
| Runtime / Run / Workflow / Scheduler / OpenClaw / Genome | NONE |
| Scope violation | NONE |
| Stop condition | NONE |

The ten regression failures remain the accepted listener/process environmental set: `acs-v2-imp-03e`, `s48`, `s50`, `s51`, `s52`, `s54`, `s55`, `s56`, `s57`, and `s77`.

## Recommendation

**READY FOR CTO ACCEPTANCE**

S3 remains local and uncommitted. No push was performed. S4 remains HOLD pending explicit CTO acceptance.
