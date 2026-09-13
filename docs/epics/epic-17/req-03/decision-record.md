# EPIC-17-REQ-03 Decision Record

**Decision state:** `CTO ACCEPTED`
**Accepted commit:** `c6d888641c882088a30add5a0de888ba08425632`
**Implementation authority:** none

| ID | Proposed decision | State |
| --- | --- | --- |
| `E17-R03-D01` | ACS admission owns deterministic effective-configuration resolution; domain owners supply authoritative inputs. | `CTO ACCEPTED` |
| `E17-R03-D02` | Precedence and merge behavior are defined per configuration class; a universal override chain is rejected. | `CTO ACCEPTED` |
| `E17-R03-D03` | Lower layers may select or attenuate only within granted authority and eligible options. | `CTO ACCEPTED` |
| `E17-R03-D04` | Revision state, head state, lifecycle history, effective configuration and execution snapshot remain distinct. | `CTO ACCEPTED` |
| `E17-R03-D05` | Each admitted binding generation has one immutable, fingerprinted effective-configuration snapshot. | `CTO ACCEPTED` |
| `E17-R03-D06` | Runtime consumes the admitted snapshot and cannot silently re-resolve configuration after dispatch or recovery. | `CTO ACCEPTED` |
| `E17-R03-D07` | Historical reconstruction uses the snapshot and exact historical refs, never current/latest state. | `CTO ACCEPTED` |
| `E17-R03-D08` | Required missing, ambiguous, stale, scope-denied, fingerprint-mismatched or authority-expanding inputs fail closed. | `CTO ACCEPTED` |
| `E17-R03-D09` | Secret values, volatile leases and runtime observations are excluded from snapshot values and represented by opaque refs/Evidence. | `CTO ACCEPTED` |
| `E17-R03-D10` | Same-generation retries reuse the snapshot; re-admission creates a linked immutable successor. | `CTO ACCEPTED` |
| `E17-R03-D11` | Workforce contributes only accepted capability/authority/participation constraints and gains no provider/runtime/credential/economic fields. | `CTO ACCEPTED` |
| `E17-R03-D12` | Presentation Profile and displayed resources cannot contribute operational grants. | `CTO ACCEPTED` |
| `E17-R03-D13` | `E17-R01-B02` remains explicit; snapshot evidence does not collapse mutable head/lifecycle state into Agent revision. | `CTO ACCEPTED` |

## Rejected approaches

- universal `global -> Agent -> Workforce -> operation` last-writer-wins;
- one mutable Run configuration blob;
- runtime or provider re-resolution after dispatch;
- copying credentials, secret values or raw Memory into snapshots;
- reconstructing past execution from current heads/catalogs/policies;
- treating requirements, preferences, labels or refs as grants;
- adding provider/runtime/credential/economic configuration to Workforce Core;
- using legacy Profile capability contribution as canonical authority;
- claiming full history where `E17-R01-B02` remains unresolved.

CTO acceptance makes `EPIC-17-REQ-04` ready for documentation execution. It
does not authorize implementation, schema, persistence, API, runtime, UI,
migration or production changes.
