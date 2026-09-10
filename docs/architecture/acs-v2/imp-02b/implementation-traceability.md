# IMP-02B Implementation Traceability

| Requirement | Implementation | Contract / API | Tests / evidence |
| --- | --- | --- | --- |
| Progressive creation flow | One route with ordered disclosure sections for Identity, Functional configuration, Technical composition, Advanced, and Review | Existing frontend form state | `imp-02b-agent-configuration.test.mjs`; localhost pending |
| Identity before technical composition | Agent ID and name are the only fields in the initially open section | `AgentDefinition.agentId`, `AgentDefinition.name` | Focused source test |
| Functional configuration | Status and catalog-backed capability selection are separated from provider and credential choices | `status`, `capabilityIds`, `GET /capabilities` | Focused source test; localhost pending |
| Technical composition | Provider/model remain subordinate; credential connections use existing catalog-backed references | `modelStrategy`, `credentialConnectionIds`, `GET /providers`, `GET /models`, `GET /provider-connections` | Focused source test; localhost pending |
| Advanced placement | Role, profile, skills, tools, and runner preferences are behind an advanced disclosure | Existing composition references and catalog APIs | Focused source test |
| Purpose / description | Omitted because no durable ACS-owned `AgentDefinition` contract exists | No current verified field | Field mapping |
| Instructions / variables | Deferred; no prompt/instruction/variable contract is introduced | No current verified field | Field mapping; focused source test |
| Create semantics | Existing canonical `POST /agents` call and post-success Agent Overview navigation retained | `productApi.createAgent` | Focused source test; existing HTTP integration test |
| Revision-aware editing | Existing `PATCH /agents/:agentId` and `expectedRevision` retained; conflict presents safe reload | `productApi.updateAgent`, `UpdateAgentInput` | Focused source test; existing HTTP integration conflict test |
| Explicit revision creation | Existing revision command remains available on the edit route | `POST /agents/:agentId/revisions` | Focused source test; existing HTTP integration test |
| No new contract | No backend, API, persistence, dependency, or provider change | Existing Product API only | Diff review; complete validation pending |
