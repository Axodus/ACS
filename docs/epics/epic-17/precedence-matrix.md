# EPIC-17 Configuration Precedence Matrix

**Status:** `BOUNDARY REVIEW COMPLETE`
**Authority:** analysis only; no implementation or universal override chain

## 1. Resolution invariant

Every execution must have deterministic, historically reproducible effective
configuration. A lower layer cannot exceed authority granted by an upper
layer.

“Global” below means the current owning catalog, governance, Tenant,
Administration or runtime service. It does not imply a new Global Settings
aggregate.

## 2. Matrix

| Configuration class | Global authority | Agent authority | Workforce authority | Operation authority | Override rule | Attenuation only | Required execution capture | Reconstruction source | REQ disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Presentation | Governed profile catalog currently supplies profile metadata | Agent references profile ID/revision in the legacy composition model | May present member/slot context; no authority to rewrite Agent profile | May select a view but not mutate identity | No operational override; display composition remains to be defined | N/A for authority | Capture only when presentation influenced an externally retained artifact | Agent revision plus exact profile revision; durable profile history is a gap | Decide Profile ownership and revision stream. |
| Model preference | Model/provider catalogs define available resources and capabilities | Native Agent carries model requirements/provider routes; legacy Agent carries strategy/fallbacks | Workforce Core forbids provider/runtime fields | Admission/runtime may select an eligible model within requirements and policy | Selection may narrow or choose an eligible route; cannot invent availability or authority | Yes | Exact provider/model/credential reference and policy snapshots | Agent revision, execution binding/plan, runtime intent and provider evidence | Reconcile Native and legacy model representations. |
| Capability requirements | Governed capability catalog defines known capabilities | Agent declares requirements; legacy composition also computes effective capabilities | Member slots may add capability requirements and constraints | Operation may require additional capability evidence | Lower layers may add requirements, never grant missing capability | Yes | Requirement refs, capability evidence and selected executor/target capability | Agent/Workforce revisions, execution binding and Evidence | Separate grants, requirements and presentation semantics. |
| Skill/tool binding | Governed Skill/Tool catalogs define reusable resources | Native Agent binds exact revision refs | Workforce has capability requirements, not Skill/Tool ownership | Runtime/tool invocation may select only from admitted bindings and policy | No lower-layer expansion beyond Agent bindings and governance | Yes | Exact Skill/Tool revisions and relevant invocation evidence | Agent revision, catalog history and tool Evidence; catalog durability is a gap | Freeze catalog history and binding semantics. |
| Credential binding | Tenant/Admin connection and secret services own credentials | Agent may reference authorized connections; raw secret material is forbidden | Workforce Core explicitly forbids credential fields | Operation/runtime may resolve a scoped lease for an admitted purpose | Selection and lease scope can narrow; no layer may reveal or broaden the credential | Yes | Opaque connection/secret version reference and lease purpose, never value | Agent revision/plan, connection metadata, provider audit and Evidence | Define resolution/audit without changing secret ownership. |
| Security constraints | Governance, Tenant and platform security boundaries define maximum authority | Agent constraints and permission/approval policy refs can narrow behavior | Workforce adds authority and participation constraints | Operation may add stricter constraints and require approval | Only intersection/attenuation is valid | Yes | Exact policy snapshots, approvals and authority decisions | Agent/Workforce revisions, runtime policy and approval/evidence records | Define deterministic intersection and rejection reasons. |
| Governance policies | Governance owns policy truth and decisions | Agent references permission and approval policy revisions | Workforce references membership/governance/audit policies | Operation supplies evaluated decisions and approvals | References do not grant authority; evaluated authority controls | Yes | Policy revision/snapshot, decision, approval and actor | Governance records, Agent/Workforce revisions and Evidence | Preserve governance owner; specify resolution order by policy kind. |
| Runtime constraints | Engine, target, runtime policy and production gates own eligibility | Agent expresses provider/model/harness/executor preferences | Workforce Core forbids runtime/provider fields | Admission selects eligible target/runner/provider within all constraints | Operation may choose among eligible options but cannot bypass target/governance gates | Yes | Exact engine, target, runner, provider, model, revisions and runtime configuration | Execution binding/plan, intent, Attempt and target observations | Type the effective snapshot without replacing runtime compilation. |
| Memory policy | No canonical global owner; candidate Administration policy owner | Native Agent already references an exact memory policy revision | Workforce Core has no Memory field; shared Memory must remain companion state | No accepted operation-level override contract | Undecided; no layer may exceed read/write/retention authority | Expected yes | Exact policy ref, scope and retrieval provenance if Memory affects execution | Agent revision plus future policy/store records and execution Evidence | Define owner, taxonomy, authority, deletion and snapshot semantics. |
| Evidence policy | Evidence ledger and governance own proof/audit rules | Agent references audit policy | Workforce references audit policy | Runtime execution policy includes evidence policy and emits records | Lower layers may increase evidence requirements but cannot suppress mandatory evidence | Yes | Exact policy refs plus emitted Evidence and correlations | Agent/Workforce revisions, execution policy, events and Evidence ledger | Define merge/intersection semantics by evidence class. |
| Cost and budget policy | Economics/governance own pricing, limits and settlement authority | Agent references cost and budget policies | Workforce Core has no economic override fields | Operation/Run carries economic policy/snapshot refs and actual Usage/Cost | No lower layer may exceed budget or reinterpret settlement authority | Yes | Policy snapshots, reservation/authorization refs, Usage, Cost and settlement evidence | Agent revision, runtime binding, economic store and Evidence | Add Automation correlation only if later REQ proves a gap. |

## 3. Consequences

- There is no universal `global -> Agent -> Workforce -> operation` winner.
- Workforce contributes membership, capability and authority constraints but
  does not own provider, credential, runtime or economic configuration.
- Operation and runtime resolution choose among already authorized options and
  record the result; they do not grant capabilities or authority.
- Credentials are resolved as scoped leases and never copied into snapshots.
- Presentation state does not become operational capability truth.
- Any future Memory, Channel, Delegation or Automation configuration must adopt
  these class-specific authority rules before implementation.
