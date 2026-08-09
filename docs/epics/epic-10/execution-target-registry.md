# EPIC-10 S06 — Execution Target Registry

S06 promotes execution targets into ACS control-plane entities independent from any single engine call. ACS now keeps a canonical registry identity of engineId/targetId, preserves engine ownership, refreshes targets from every registered engine, and evaluates target eligibility separately from target health.

## Identity and ownership

- Canonical registry identity: engineId/targetId
- Current DEV target: openclaw/local-wsl
- Engine ownership is preserved on every record through engineId
- The registry can safely support future multi-target engines and future multi-engine environments

## Refresh semantics

EngineRegistry
   |
   +--> OpenClawEngineAdapter
   |        |
   |        +--> local-wsl
   |
   +--> Future Engine
            |
            +--> future targets

             |
             v

ExecutionTargetRegistry
             |
      eligibility filter

Refresh is read-only and asks each engine for listExecutionTargets().

- new targets are discovered and registered
- existing targets are updated in place
- targets missing from a healthy refresh are marked stale, not deleted
- one engine failure does not remove targets from another engine
- refresh returns a structured report with engine failures

## Health vs eligibility

Health and eligibility are intentionally separate.

Example:

- openclaw/local-wsl may be ready
- but it is only eligible for sandbox
- it is not eligible for live

Eligibility currently evaluates:

- engine match
- deployment mode
- required capabilities
- target type
- environment
- target status
- scheduling eligibility flag
- staleness

## Current DEV behavior

With ACS using the pinned AgentsAI engine source and the real DEV runtime:

- canonical target identity: openclaw/local-wsl
- engine: openclaw
- environment: dev-local
- type: local
- deployment modes: sandbox
- source/runtime overlap: false when launched from ACS/engines/agentsai against ~/.openclaw

This completes Milestone A without introducing scheduling, load balancing, remote workers, provider routing, or billing behavior.
