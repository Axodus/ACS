# EPIC-10 S07 — Model Provider Contract

S07 introduces the ACS control-plane contract for inference providers without coupling providers to credentials, runners, or engine execution.

## Core boundary

These concepts remain separate:

- AgentEngine
- ModelProvider
- CredentialProvider
- AgentRunner
- ExecutionTarget

A provider can advertise models and health. It does not execute agent tasks and it does not own raw credentials.

## Implemented S07 contracts

- ModelProvider
- ModelProviderRegistry
- ModelProviderService
- ModelDefinition
- ModelCapabilities
- ModelProviderHealth
- ModelProviderFinding
- ModelStrategy

Canonical model identity is provider-scoped:

- axodus/managed-default
- anthropic/claude-sonnet
- openai/gpt-5

## Capability model

Current model capabilities are represented as data, not hardcoded product enums:

- text
- reasoning
- tool-use
- structured-output
- vision
- coding
- streaming

The schema is designed so new capabilities can be added without redesigning the provider boundary.

## Notes

S07 is contract and registry work only.

Not implemented in S07:

- credentials
- BYOK
- OAuth
- subscriptions
- real OpenAI or Anthropic calls
- OpenCode
- billing or economic behavior

This story replaces the architectural role of a generic provider abstraction with an explicit inference-provider layer while leaving the older runtime/provider fixtures intact for existing ACS behavior.
