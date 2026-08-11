# EPIC-11 Milestone A — Operational Awareness

## Goal

The user can understand the current ACS state before taking any mutating action.

## Scope

- system shell
- navigation
- dashboard
- global health
- readiness
- blockers
- warnings
- evidence summary

## Requests

- OA-01 System Shell & Navigation
- OA-02 System Dashboard
- OA-03 Readiness & Health Overview

## Dependencies

- Product API health/readiness exposure
- summary endpoints for agents, deployments, runtimes, workers, execution runs, and economics where available

## Success criteria

- the ACS entry surface opens reliably
- the user can answer whether the system is healthy and ready
- critical blockers are visible with enough context to route the next action
