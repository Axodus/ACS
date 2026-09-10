# Agenta Workflow Reference

Agenta is used here as `UX / WORKFLOW REFERENCE — ADAPT`. It is not an ACS authority, dependency, runtime, identity store, persistence store, provider authority, or control plane.

## Evidence classification

### OBSERVED from local Agenta documentation/source

1. The local first-agent guide describes a prompt-like starting point: an operator states what they want to build, clicks `Create agent`, and is taken to a playground (`/home/mzfshark/agenta/docs/docs/learn/_01-build-your-first-agent.mdx:30-50`).
2. The playground is described as a `Build` mode with a `Configuration` column and a conversation area (`.../_01-build-your-first-agent.mdx:48-52`).
3. The documented configuration groups include model and harness, instructions, tools, skills, advanced, triggers, and files (`.../_01-build-your-first-agent.mdx:70-85`).
4. The guide describes tools and skills as separate concepts, with tools connected from an add-tool flow and skills carrying task-specific procedure (`.../_01-build-your-first-agent.mdx:131-175`).
5. The workflow has a draft state and explicit commit/version action. The commit dialog lists changes, accepts a commit message, and stores a new version; the guide then points to Registry for version history (`.../_01-build-your-first-agent.mdx:245-266`).
6. The local application overview source groups an application surface around overview, variants, deployments, observability, and evaluations, while agent workflows use an AgentOverview branch (`/home/mzfshark/agenta/web/oss/src/pages/w/[workspace_id]/p/[project_id]/apps/[app_id]/overview/index.tsx:90-176`).
7. The route implementation redirects an app overview to a playground as the default surface for a workflow (`/home/mzfshark/agenta/web/oss/src/pages/w/[workspace_id]/p/[project_id]/apps/[app_id]/index.tsx:21-33`, `72-95`).

### INFERRED design lessons

- A user can begin with intent and then inspect structured configuration. This suggests separating purpose/identity from technical composition in ACS.
- A contextual build surface can keep configuration and immediate feedback together. ACS could adapt this as a future validation/test surface, but only after an ACS-native command and evidence model exists.
- Draft/commit/version language gives operators a clear distinction between editing and an adopted version. ACS already has immutable revisions, so the pattern should map to `new revision` and `current head`, not mutable drafts in place.
- Configuration grouping is more understandable than a flat list of IDs. ACS should group identity, behavior/composition, runtime binding, access references, and advanced diagnostics.

### NOT VERIFIED

- Live Agenta UI behavior was not run during this audit.
- The local evidence does not establish that every documented feature is available in the current OSS build or in the exact deployment represented by the repository.
- No conclusion is made here about Agenta production suitability, security, persistence, or runtime semantics.

## Adaptation boundary

Use the workflow ideas of intent-first entry, contextual configuration, visible draft/commit semantics, grouped configuration, and a nearby observation surface. Do not copy Agenta terminology or assume that prompts, files, harnesses, playground build kits, variants, evaluations, or deployments map one-to-one to ACS contracts.

