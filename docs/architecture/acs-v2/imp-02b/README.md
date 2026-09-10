# ACS-V2-IMP-02B — Agent Creation & Configuration

**Status:** `PARTIAL` pending complete regression and localhost mutation validation.
**Date:** 2026-09-10
**Scope:** frontend-only redesign of the Agent create and configuration flows in
`.design/app-standalone`.

## Objective

Replace the dense mixed Agent form with an ACS-native progressive flow that
separates Agent identity from functional configuration, technical composition,
and low-frequency options. The flow continues to use the existing Product API
create, update, and revision commands.

## Current problem

The prior form placed Agent ID, name, lifecycle status, composition catalogs,
provider/model selection, credential references, and runner preferences in one
flat surface. It required an operator to interpret technical implementation
choices before they could establish a minimum valid Agent identity.

## Implemented flow

```text
Create Agent
  → Identity
  → Functional configuration
  → Technical composition
  → Advanced
  → Review and create
  → Agent Overview
```

The implementation uses one stable route rather than transient wizard routes.
Identity opens first; later sections use existing semantic disclosure controls.
The same grouping is reused for existing Agent configuration and revision
creation.

## Field hierarchy

- **Identity:** Agent ID and name.
- **Functional configuration:** lifecycle status and capabilities.
- **Technical composition:** provider, model, and catalog-backed credential
  references.
- **Advanced:** role, profile, skills, tools, and runner preferences.
- **System managed:** immutable Agent ID after creation, revision, fingerprint,
  timestamps, lineage, and server-side composition/readiness results.

Credential references are selected from existing Product API provider
connections. Secrets are never rendered or entered in this form.

## Unsupported and deferred fields

`AgentDefinition` has no durable ACS-owned contract for purpose, description,
instructions, variables, prompt parameters, or a playground input. They are
not rendered as UI-only fields and are not stored in metadata, provider config,
or another unrelated record.

`Validate` remains existing composition/readiness inspection after an Agent is
created; no pre-create execution, playground, or new validation command was
added.

## Revision safety

Existing Agent configuration continues to call `PATCH /agents/:agentId` with
the loaded `expectedRevision`. Explicit revision creation continues to call
`POST /agents/:agentId/revisions`. A `409` during edit/revision save reports a
stale configuration and offers a safe reload route; it does not retry or merge.

## Boundaries

- No new API, database schema, migration, persistence model, provider, or
  dependency was added.
- No governance, credential security, runtime, economic, or production
  behavior changed.
- Existing `/agents/new`, `/agents/:agentId/edit`, and
  `/agents/:agentId/composition` compatibility routes remain available.

## Validation state

Focused source tests and TypeScript validation pass at the implementation
checkpoint. Full frontend, relevant API, repository, and localhost results are
recorded in [localhost-validation.md](localhost-validation.md).

## Next milestone

The next candidate remains **ACS-V2-IMP-02C — Agent Detail & Lifecycle**. It
must not begin as part of this package.
