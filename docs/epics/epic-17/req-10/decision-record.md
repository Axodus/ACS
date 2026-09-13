# EPIC-17-REQ-10 Decision Record

**Decision state:** `PROPOSED`
**Implementation authority:** none
**Migration authority:** none

| ID | Decision | State |
| --- | --- | --- |
| `E17-R10-D01` | The existing Product API remains the single supported application boundary. | `PROPOSED` |
| `E17-R10-D02` | Product API projects canonical state and routes governed commands; it owns no underlying domain state or policy. | `PROPOSED` |
| `E17-R10-D03` | Future EPIC-17 resources are additive under the accepted Product API versioning process; parallel Genome, Automation or Administration APIs are rejected. | `PROPOSED` |
| `E17-R10-D04` | Every projection exposes exact source identity, Tenant, owner, revision or immutable observation, freshness and reconstruction semantics as applicable. | `PROPOSED` |
| `E17-R10-D05` | Legacy and compatibility projections are explicitly loss-aware and cannot serve as bidirectional canonical DTOs. | `PROPOSED` |
| `E17-R10-D06` | Every administrative mutation routes to one canonical owner with actor, Tenant, authority, policy, concurrency, idempotency, purpose, correlation and Evidence context. | `PROPOSED` |
| `E17-R10-D07` | Server-projected action availability and retryability are advisory; the owner revalidates every command. | `PROPOSED` |
| `E17-R10-D08` | Administration owns workflow, navigation and action composition, not Agent, resource, integration, Memory, Delegation, Automation, Runtime, Evidence or Economics truth. | `PROPOSED` |
| `E17-R10-D09` | Existing EPIC-15 Tenant administration remains the authority for Tenant lifecycle, membership, governance, entitlements, limits and audit. | `PROPOSED` |
| `E17-R10-D10` | Global Settings is a class-owned index/projection, not an entity, aggregate, repository, table, store, policy engine or universal override layer. | `PROPOSED` |
| `E17-R10-D11` | Every settings entry declares canonical owner, scope, source version, applicability, precedence/attenuation, actions and historical source. | `PROPOSED` |
| `E17-R10-D12` | A setting with no demonstrated owner is unavailable and blocked; Administration cannot become its owner by convenience. | `PROPOSED` |
| `E17-R10-D13` | Settings and UI never replace the class-specific authority/attenuation rules accepted in REQ-03. | `PROPOSED` |
| `E17-R10-D14` | The current `SystemConfigurationView` remains a bounded operational projection and is not promoted to Global Settings authority. | `PROPOSED` |
| `E17-R10-D15` | Agent/Profile/Persona projections preserve REQ-01/02 identity and behavioral/presentation separation. | `PROPOSED` |
| `E17-R10-D16` | Governed resource and model projections remain kind-specific and expose only guarantees their current owners can prove. | `PROPOSED` |
| `E17-R10-D17` | Connector, Connection, credential reference and Channel projections preserve REQ-05 definition/instance/secret/interaction separation. | `PROPOSED` |
| `E17-R10-D18` | Memory projections preserve REQ-06 Policy/Store/Reference separation and never infer content authority from administration or a reference. | `PROPOSED` |
| `E17-R10-D19` | Delegation projections preserve attenuation, explicit authority basis, chain provenance, expiry and revocation; no SubAgent identity is introduced. | `PROPOSED` |
| `E17-R10-D20` | Automation and Activation projections preserve configured intent, causal occurrence, admission and runtime as distinct owners/stages. | `PROPOSED` |
| `E17-R10-D21` | Effective-configuration views use the immutable REQ-03 execution snapshot and show resolution findings; current heads do not rewrite history. | `PROPOSED` |
| `E17-R10-D22` | Evidence and Usage/Cost remain under their accepted owners; administration exposes correlations and projections only. | `PROPOSED` |
| `E17-R10-D23` | The Control Plane uses Product API only and organizes user journeys as `Flow -> Module -> Screen`. | `PROPOSED` |
| `E17-R10-D24` | Screens distinguish loading, empty, blocked, pending, recovering, stale, unavailable, redacted and error states where applicable. | `PROPOSED` |
| `E17-R10-D25` | Cross-domain UI composition uses typed canonical links with exact revision/observation and correlation rather than duplicated editable state. | `PROPOSED` |
| `E17-R10-D26` | Read projections never expose raw secrets; any write-only credential ingress remains bounded to an authorized owner-specific command. | `PROPOSED` |
| `E17-R10-D27` | Tenant visibility and non-disclosure rules apply consistently across list, detail, search, references, history, settings and actions. | `PROPOSED` |
| `E17-R10-D28` | The Administration IA divergence requires an explicit later decision before routes or modules are implemented. | `PROPOSED` |

Rejected: frontend-owned canonical state, direct browser access to domain stores or
providers, parallel Product API, universal settings override chain, generic
settings persistence, Administration-owned policy truth, action availability as
authority, current-head historical substitution, raw secret reads, Memory access
by reference, duplicate Evidence/Cost history, SubAgent UI identity and silent IA
redesign.

CTO acceptance may authorize REQ-11 documentation only. It authorizes no IMP,
endpoint, DTO, UI, schema, migration, database, production or rollout change.
