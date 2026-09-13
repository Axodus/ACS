# EPIC-17-REQ-05 — Connector, Connection, Credential & Channel Boundary

**Status:** `COMPLETE / READY FOR CTO ACCEPTANCE`
**Decision state:** `PROPOSED`
**Baseline:** `a86dce7312e8f8b3e125e254707fcc88656e26d0`
**Dependencies:** `REQ-03 COMPLETE / ACCEPTED`; `REQ-04 COMPLETE / ACCEPTED`
**Scope:** documentation only
**Implementation authority:** none

## Boundary

```text
Connector definition
  = governed integration metadata/capabilities/config schema; no secrets

Connection
  = Tenant-scoped configured instance referencing a Connector/provider/tool/MCP

Credential
  = SecretStore-owned material exposed only through opaque refs/scoped leases

Channel
  = Tenant-scoped interaction endpoint bound to Connection + admission policy
```

Channel can receive or deliver interaction, but cannot become an executor or
bypass Automation/Activation/admission. A Connector, reachable endpoint,
Connection or credential never grants authority by existence.

## Capability dispositions

| Capability | Class | Disposition |
| --- | --- | --- |
| `E17-C07` Connector definition | `ADAPT` | Use provider/Tool/MCP governed definitions where sufficient; add a distinct integration definition only for proven cross-cutting schema/capability needs. |
| `E17-C08` Connection | `REUSE` | Preserve `CredentialConnection` ownership/status/Tenant scope through a semantic Connection projection; no duplicate configured-instance store. |
| `E17-C09` Credentials and secrets | `REUSE` | Preserve SecretStore, opaque `SecretReference`, scoped lease and production fail-closed boundaries. |
| `E17-C10` Channels | `NEW` | Establish Tenant-scoped interaction endpoint ownership; representation/persistence remain candidates. |
| `E17-C24` Connector permissions | `ADAPT` | Governance policies authorize operations against Connector/Connection refs. |
| `E17-C25` Channel permissions | `NEW` | Require principal/Tenant/source/action policy and admission; Channel metadata grants nothing. |

## Documents

- [Evidence and ownership matrix](ownership-matrix.md)
- [Authorization, lifecycle and snapshot rules](authorization-and-history.md)
- [Contract deltas, ADRs and blockers](contract-deltas-and-adrs.md)
- [Decision record](decision-record.md)
- [Acceptance gates](acceptance-gates.md)

```text
REQ-05: COMPLETE / READY FOR CTO ACCEPTANCE
REQ-06: READY / GO (independent branch)
REQ-07: BLOCKED_BY_REQ-05_AND_REQ-06_ACCEPTANCE
Implementation authority: NONE
```
