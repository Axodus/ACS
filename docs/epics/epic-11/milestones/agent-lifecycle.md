# EPIC-11 Milestone B — Agent Lifecycle

## Goal

The user can locate, inspect, create, edit, and administer an Agent as a governed operational entity.

## Scope

- inventory
- detail
- create
- edit
- revision management
- lifecycle actions

## Requests

- AL-01 Agent Inventory
- AL-02 Agent Detail & Operational Summary
- AL-03 Agent Create & Initial Composition
- AL-04 Agent Edit & Draft Changes
- AL-05 Agent Revision & Lifecycle Actions

## Dependencies

- Operational Awareness
- Agent CRUD and composition endpoints
- revision and lifecycle contracts from EPIC-10

## Success criteria

- agents can be discovered without CLI
- the detail surface explains current revision, composition, runtime, deployment, readiness, and audit state
- lifecycle mutations are guarded by explicit validation and protected rules
