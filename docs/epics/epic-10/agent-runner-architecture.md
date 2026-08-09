# EPIC-10 S11 — Agent Runner Architecture

S11 introduces AgentRunner as a control-plane abstraction independent from ModelProvider and AgentEngine.

## Boundary

These remain distinct:

- AgentEngine
- ModelProvider
- CredentialProvider
- AgentRunner
- ExecutionTarget

A subscription-backed runner is not an API-key model provider.

## Implemented S11 contracts

- AgentRunner
- AgentRunnerRegistry
- AgentRunnerService
- RunnerHealth
- RunnerCapabilities
- RunnerExecutionRequest
- RunnerExecutionResult
- RunnerExecutionStatus

## Security rules preserved

S11 explicitly does not implement:

- browser cookie scraping
- session copying from ~/.config
- cloud migration of local authenticated sessions
- unofficial account automation

Current runner capability metadata includes an environment scope to make local-only authentication explicit.

## Current behavior

The architecture supports runners such as:

- Codex
- Claude Code
- Gemini CLI
- OpenCode

S11 itself remains architecture-first. Unsupported execution must fail explicitly rather than pretending a runner can execute.
