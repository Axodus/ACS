# IMP-02B Field Mapping

The mapping below is based on the current `AgentDefinition` and existing
Product API catalog routes. It records the form organization only; it does not
change ACS ownership or persistence semantics.

| Current field / concept | Contract | Create location | Edit location | Required | Decision |
| --- | --- | --- | --- | ---: | --- |
| Agent ID | `AgentDefinition.agentId` | Identity | Identity, read-only | Yes | KEEP PRIMARY; ACS-owned stable identity |
| Name | `AgentDefinition.name` | Identity | Identity | Yes | KEEP PRIMARY |
| Status | `AgentDefinition.status` | Functional configuration | Functional configuration | No; defaults to `draft` | KEEP SECONDARY; Product API lifecycle/governance remains authoritative |
| Role | `roleId` reference | Advanced | Advanced | No | ADVANCED |
| Profile | `profileId` reference | Advanced | Advanced | No | ADVANCED |
| Capabilities | `capabilityIds` | Functional configuration | Functional configuration | No | KEEP PRIMARY CONCEPT; catalog-backed selection |
| Skills | `skillIds` | Advanced | Advanced | No | ADVANCED |
| Tools | `toolIds` | Advanced | Advanced | No | ADVANCED |
| Provider | `modelStrategy.primary.providerId` | Technical composition | Technical composition | No | MOVE; provider-neutral technical implementation choice |
| Model | `modelStrategy.primary.modelId` | Technical composition | Technical composition | No | MOVE; filtered by current provider catalog |
| Model credential reference | `modelStrategy.primary.credentialConnectionId` | Technical composition | Technical composition | No | MOVE; catalog-backed safe reference only |
| Credential connections | `credentialConnectionIds` | Technical composition | Technical composition | No | MOVE; provider-connection selector replaces raw CSV entry |
| Runtime | No direct mutable `AgentDefinition` field verified | Not exposed | Advanced links to Runtime | N/A | SYSTEM MANAGED / separate runtime boundary |
| Runner preferences | `runnerPreferences` | Advanced | Advanced | No | ADVANCED; existing identifiers remain raw because no runner catalog was verified |
| Execution policy | `executionPolicyId` exists on the definition but had no current create/edit control | Not exposed | Not exposed | N/A | DEFER; no verified UI/catalog path in this package |
| Revision / fingerprint / timestamps / lineage | Agent revision read model | Not exposed | Review/status only | N/A | SYSTEM MANAGED |
| Purpose | No suitable `AgentDefinition` field | Not exposed | Not exposed | N/A | CONTRACT GAP — purpose |
| Description | No suitable `AgentDefinition` field | Not exposed | Not exposed | N/A | CONTRACT GAP — description |
| Instructions / prompt | No verified Agent contract | Not exposed | Not exposed | N/A | DEFERRED — no verified contract |
| Variables / prompt parameters | No verified Agent contract | Not exposed | Not exposed | N/A | DEFERRED — no verified contract |
| Test / playground | No verified ACS-native command/query | Not exposed | Not exposed | N/A | DEFERRED — no verified contract |

No UI-only persistence workaround is used for unsupported fields.
