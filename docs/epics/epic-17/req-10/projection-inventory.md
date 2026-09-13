# REQ-10 Projection Inventory

| Domain | Current surface | Required future projection semantics | Owner preserved |
| --- | --- | --- | --- |
| Agent identity/lifecycle/lineage | Native reads plus legacy-compatible Agent DTOs and lifecycle/revision routes | Stable `agent_id`, exact revision/fingerprint, scope, head/lifecycle source, projection version, loss markers and owner-routed actions | Native Agent owner from REQ-01 |
| Profile/Persona | Synthetic legacy Profile catalog and Agent details | Derived Profile with exact Agent source/projection provenance; Persona visible only through exact Agent revision behavior | Agent plus Product API projection from REQ-02 |
| Effective configuration | Generic runtime configuration/provenance and current Agent configuration views | Immutable snapshot ref/fingerprints, per-class sources/decisions, binding/Activation/Run correlation, redaction and reconstruction status | Admission/REQ-03 snapshot owners |
| Roles/Skills/Tools/Capabilities/MCP/Models | Existing composition/model catalogs with uneven history | Kind-specific exact refs, owner/history maturity, requirements/support/authority separation, availability Evidence and unsupported actions | Governed resource/provider/model owners from REQ-04 |
| Connector definition | No canonical Product API resource | Adapter/projection kind, backing provider/tool/MCP owner, reusable integration semantics and history availability | Existing backing owner or future proven Connector owner from REQ-05 |
| Connection/Credential | Existing credential and provider-connection routes | Tenant-scoped status/history, opaque secret/version refs, purpose/action metadata and write-only secret ingress where owner-authorized | Connection, SecretStore and credential owners from REQ-05 |
| Channel | No canonical route | Endpoint identity/configuration, Connection ref, source/auth policy, lifecycle, health observation and Activation link; no authority by reference | Channel companion boundary from REQ-05 |
| Memory Policy/Store | Generic UI placeholder only | Policy refs, allowed scopes/operations, retention/deletion state, store/provider status, provenance and minimized authorized record metadata | Governance policy plus Memory companion domain from REQ-06 |
| Delegation | No canonical route | Grant ref/version/digest, Agents, scope/actions/purpose, chain/depth, lifecycle/expiry/revocation, effective attenuation and Evidence; no raw credentials/Memory | Governance/Delegation boundary from REQ-07 |
| Automation | Only readiness strings such as disabled/manual | Stable identity, exact revision/fingerprint, lifecycle, target mode, trigger/schedule authored refs, authority-basis requirement and available actions | Automation owner from REQ-08 |
| Activation | No canonical route | Occurrence/cause key, exact Automation revision, state/decision, dedup/retry status, authority/snapshot refs and admission/Run correlation | Activation boundary from REQ-09 |
| Runtime/Run/Workforce | Existing Product API and Workforce projections | Add only Automation/Activation/effective-snapshot causal links; preserve execution lifecycle and membership owners | Existing Runtime/Workforce owners |
| Evidence/provenance | Existing Events, audit, Evidence and diagnostics | Filter/link by new exact subjects and correlations without copying canonical records into each detail DTO | Existing Evidence owners |
| Usage/Cost/Economics | Existing economic projections | Optional Automation revision/Activation correlation and owner-supplied attribution; no new ledger or Genome economics | Existing Accounting/Economics owners |
| Administration/settings | Tenant admin plus read-only System configuration/policy views | Class-owned settings index, source owner/scope/version, action availability and owner-routed commands | Tenant Governance and each configuration-class owner |

## Projection rule

A detail surface may embed bounded summaries for local comprehension. Canonical
detail, history and mutation remain with the owning domain. Cross-domain links
carry typed identity, Tenant and correlation references and resolve through the
Product API; copied summaries do not become independent truth.
