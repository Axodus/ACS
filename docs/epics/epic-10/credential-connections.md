# EPIC-10 S08 — Credential & Account Connection Model

S08 introduces first-class credential connections and secret references without placing raw secrets inside agents, models, providers, targets, or plans.

## Core rule

Raw secret material is not stored in:

- AgentDefinition
- ModelDefinition
- ModelProvider
- ExecutionTarget
- ExecutionPlan

Those objects reference credential connections by logical ID.

## Implemented S08 contracts

- CredentialConnection
- CredentialConnectionRegistry
- CredentialProvider
- CredentialStatus
- CredentialLease
- SecretReference
- SecretStore
- InMemorySecretStore
- FileSystemSecretStore

## Connection types

Current connection model supports:

- managed
- api-key
- oauth
- subscription
- service-account
- local-runner

The presence of a type does not imply that a provider integration already exists.

## Secret handling

Secret references are opaque metadata only.

They can carry:

- reference id
- backend
- optional key version
- purpose
- createdAt

They never carry raw values.

S08 includes a filesystem-backed DEV secret store contract that can keep secret material outside the repository and a memory-backed test implementation. Normal domain serialization remains secret-free.

## Not implemented in S08

- provider-specific OAuth login
- BYOK provider API usage
- subscription account execution
- browser/session scraping
- cloud secret manager binding
