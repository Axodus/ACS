# REQ-07 Representation Analysis

| Representation candidate | Disposition | Reason |
| --- | --- | --- |
| Field in `AgentRevisionV2` | `REJECT` | A bilateral, revocable and time-bounded relationship has independent lifecycle and cannot rewrite Agent lineage |
| `SubAgent` identity or nested Agent | `REJECT` | Duplicates canonical Agent identity and forks authority/lineage |
| Workforce membership or slot | `REJECT` | Membership is composition/admission truth, not transferable authority |
| Task Assignment | `REJECT` | Assignment selects execution responsibility after admission and cannot authorize it |
| Credential lease | `REJECT` | Lease scopes secret access and cannot represent general authority or a chain |
| Memory record/reference | `REJECT` | Memory is data/context, never authorization |
| `ApprovalRecordV2` alone | `ADAPT`, insufficient alone | Supplies approval lifecycle Evidence but lacks delegator/delegate, attenuation and chain semantics |
| Governance policy record | `ADAPT` candidate | Can define rules but a policy alone does not prove a concrete issued relationship |
| Governed relation record | `NEW` candidate | Fits bilateral lifecycle and chain semantics without creating Agent identity |
| Separate aggregate | `UNPROVEN` | May be considered only if lifecycle, CAS/history and query needs cannot be met by a governed relation/policy artifact |

REQ-07 freezes the logical grant semantics and rejects invalid owners. It does
not choose between the remaining governed relation/policy-record forms or
authorize persistence. That choice requires accepted contract evidence in
REQ-12/future IMP planning.

Legacy `canSpawnSubAgents`, `subAgentScope` and `subagents.spawn.*` metadata may
be mapped only to a compatibility warning or migration candidate. They cannot
be translated into active grants without explicit Governance evaluation,
canonical Agent targets and the complete chain contract.
