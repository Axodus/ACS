# EPIC-10 S12 — OpenCode Runner Integration

S12 adds OpenCode as the first concrete optional AgentRunner.

## Verified interface basis

This implementation follows the current OpenCode server documentation and treats the service as an HTTP endpoint, not a required embedded dependency.

Verified server details used for the adapter:

- headless server command: opencode serve
- default binding: 127.0.0.1
- default port: 4096
- health endpoint: /global/health
- provider discovery endpoint: /config/providers
- optional HTTP basic auth via OPENCODE_SERVER_PASSWORD and OPENCODE_SERVER_USERNAME
- OpenAPI docs at /doc

## Implemented S12 behavior

- OpenCodeRunner
- FetchOpenCodeTransport
- optional local-runner/basic-auth configuration via SecretStore + CredentialProvider
- health mapping
- provider discovery mapping
- explicit unsupported execution/cancel/inspect posture for S12

## Important boundaries

OpenCode remains optional.

If it is absent or unreachable:

- runner status becomes unavailable
- ACS engine integration remains healthy
- OpenClaw does not depend on OpenCode

The runner is treated as local-only in S12 and does not imply cloud portability.

## Current DEV result on this host

If the opencode binary or server is absent, S12 still passes as long as health is reported truthfully and the rest of ACS remains unaffected.
