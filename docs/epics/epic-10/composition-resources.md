# EPIC-10 S14 — Composition Resources

S14 exposes governed composition resources through ACS-side control-plane services without pretending to own runtime truth that still belongs to the engine or later API layers.

## Implemented resources

- roles
- profiles
- skills
- tools
- capabilities

## Current truth model

Current ACS-side role/profile/skill/tool data is static/control-plane seeded. Capability metadata is sourced from the existing ACS capability registry.

This story does not claim that ACS already has full engine-backed resource mutation or live runtime synchronization. It provides the stable contracts and validation surface that later Product API and engine integration can consume.

## Current services

- CompositionResourceRegistry
- CompositionResourceService

Supported operations:

- list
- get
- validate references

## Notes

S14 keeps revision awareness for role/profile references and explicit validation for unknown capabilities. It does not install runtime plugins, execute packages, or mutate live agent state.
