# EPIC-10 S15 — Agent CRUD & Composition

S15 adds the ACS control-plane repository and application services required to manage governed agent definitions and obtain effective composition.

## Implemented pieces

- AgentRepository
- InMemoryAgentRepository
- AgentService

## Supported operations

- create
- get
- list
- update with expected revision
- validate definition references
- compose effective agent state

## Current behavior

Composition resolves current ACS control-plane resources and registry-backed references:

- roles
- profiles
- capabilities
- skills
- tools
- model provider references
- credential connection IDs
- runner preferences

Updates are revision-aware. No-op updates do not bump revision. Stale updates fail explicitly.

## Not implemented here

- deployment
- runtime lifecycle
- OpenClaw mutation protocol
- frontend CRUD
- billing settlement
