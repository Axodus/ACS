# EPIC-10 S04 — `acs-engine/1`

`acs-engine/1` is the first language-independent, transport-independent contract between ACS and the AgentsAI/OpenClaw engine.

The logical protocol is versioned as:

```text
acs-engine/1
```

The initial DEV transport is JSON Lines over stdio:

- one JSON request per line on stdin;
- one JSON response per line on stdout;
- diagnostics only on stderr.

## Operations implemented in S04

- `engine.health`
- `engine.version`
- `engine.capabilities`
- `target.list`
- `target.inspect`

No agent mutation endpoints are exposed in S04. The dispatcher is allowlisted and never dispatches arbitrary Python attributes or commands.

## Envelope

Request:

```json
{
  "protocol": "acs-engine/1",
  "id": "req_01",
  "operation": "engine.health",
  "params": {}
}
```

Success response:

```json
{
  "protocol": "acs-engine/1",
  "id": "req_01",
  "success": true,
  "result": {}
}
```

Error response:

```json
{
  "protocol": "acs-engine/1",
  "id": "req_01",
  "success": false,
  "error": {
    "code": "ACS_ENGINE_...",
    "message": "...",
    "retryable": false
  }
}
```

Normative JSON Schema and fixtures live under `contracts/acs-engine/v1/` in ACS. The generic ACS client uses a transport abstraction and a stdio implementation; S05 will wrap that in a domain-specific engine adapter.

## DEV source/runtime split

The ACS subprocess configuration is explicit. In the S04 DEV smoke:

```text
ACS_SOURCE_ROOT=/opt/Axodus/ACS/engines/agentsai
ACS_RUNTIME_ROOT=/home/mzfshark/.openclaw
```

This proves that engine source and runtime root are distinct values at subprocess start, even while the legacy DEV runtime itself still reports overlap internally.
