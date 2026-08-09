# EPIC-10 S05 — OpenClaw Engine Adapter

```text
ACS Application
      |
EngineRegistry
      |
AgentEngine
      |
OpenClawEngineAdapter
      |
EngineProtocolClient
      |
acs-engine/1
      |
AgentsAI
```

S05 introduces the first ACS domain-level engine abstraction.

- `AgentEngine` is the stable contract used by ACS domain/application code.
- `OpenClawEngineAdapter` maps `acs-engine/1` protocol results into ACS-native types and errors.
- `EngineRegistry` holds concrete engines by logical id.
- `EngineService` is a small application facade over the registry.

The generic S04 protocol client and stdio transport remain reusable and separate from the domain adapter. The adapter validates engine identity (`openclaw`), preserves operator-only runtime metadata as classified metadata, and converts protocol/transport failures into engine-domain errors.

S05 remains inspection-only. It does not add scheduling, mutation operations, frontend integration, provider/runners, billing, or cloud-worker behavior.
