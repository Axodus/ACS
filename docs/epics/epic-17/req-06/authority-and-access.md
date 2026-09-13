# REQ-06 Authority and Access Matrix

## Ownership

| Concern | Global/Tenant owner | Agent influence | Workforce influence | Operation influence | Rule |
| --- | --- | --- | --- | --- | --- |
| Policy definition | Existing Governance policy authority; concrete Memory policy contract is missing | Exact `memory_policy_ref` selects an eligible revision | Adds accepted authority/participation constraints only | May request narrower scopes/actions/retention | All effective permissions are intersection/attenuation |
| Memory records | Memory companion domain; concrete record/store contract is missing | May be a canonical scope subject | May be a canonical scope subject through companion refs | Produces/reads records under admitted policy | Subject identity never implies read/write authority |
| Working Memory | Memory owner under runtime correlation | Agent revision constrains use | Admitted membership constrains participating Agents | Run/Task purpose and deadline narrow | Runtime state/checkpoint remains authoritative for recovery |
| Agent Memory | Memory owner | Agent identity scopes records; revision/policy controls access | No implicit access | Purpose-bound read/write request | Another Agent requires separate authority, including future delegation |
| Workforce Shared Memory | Memory owner outside Workforce Core | Member access is derived from admitted membership and policy | Exact Workforce revision and membership snapshot constrain scope | Run may narrow participants and duration | Workforce owns no mutable Memory field |
| User/context Memory | Memory owner with Tenant privacy/governance | No ownership by Agent | No implicit access | Requires subject, purpose and consent/authority | Missing or withdrawn authority fails closed |
| Knowledge retrieval | Knowledge/source owner for facts; Memory owner for derived retrieval state | Agent Knowledge scope refs narrow | Workforce cannot widen Agent or source constraints | Query narrows scope and records provenance | Derived indexes/summaries never replace the source |

## Read and write decision

Every Memory operation requires:

```text
Tenant + authenticated actor + subject/scope + purpose + operation
+ exact effective policy + authority/consent decision
+ provenance and sensitivity handling
```

The decision must distinguish `read`, `search`, `append`, `correct`, `forget`,
`expire`, `export` and administrative policy actions. Possession of a Memory
reference, Agent membership, a Skill/Tool binding or provider reachability does
not authorize any operation.

Operation-level configuration may reduce scope, duration, result count,
sensitivity or allowed actions. It cannot extend the exact Agent policy,
Tenant/governance authority, Knowledge scope or Workforce participation
constraints.

## Provider independence

Embedding, vector search, summarization and storage providers are replaceable
adapters. ACS owns policy decisions, canonical Memory references, Tenant
isolation, provenance, lifecycle and Evidence. Provider object IDs and indexes
are observations or adapter handles; they cannot become Agent, Workforce,
Memory-policy or authority identity.
