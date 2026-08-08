# EPIC-10 S03 — AgentsAI Engine Packaging / Submodule

## Decision

ACS uses a Git submodule as the initial AgentsAI/OpenClaw source dependency:

```text
ACS/engines/agentsai/
```

The portable repository URL is:

```text
https://github.com/Axodus/AgentsAI.git
```

The ACS superproject records the engine as a Gitlink. The pinned local revision is:

```text
c7c3599a9a72d23e3d4316c9bd2de2e2ccca91ec
EPIC-10 S02: add local WSL2 execution target
```

The source manifest is [engines/agentsai.manifest.json](../../engines/agentsai.manifest.json). It identifies the source repository, Git revision, planned `acs-engine/1` protocol, and the source-only/runtime-external policy. S04 protocol behavior is not implemented here.

## Source versus runtime

```text
ACS/engines/agentsai       = versioned source dependency / Gitlink
/home/mzfshark/.openclaw  = current DEV runtime and legacy AgentsAI checkout
```

The submodule is not a runtime root and must not become `runtime_root`, `state_root`, `config_root`, `artifacts_root`, or `workspace_root`. S01 `RuntimePaths` defaults remain independent. The submodule checkout used in this workspace is sparse and contains only source/reference implementations, tests, and package metadata.

Never place `.env`, `openclaw.json`, `.acs/state`, runtime databases, logs, credentials, agent memory, runtime profiles/tools, or temporary workspaces in `engines/agentsai`.

## Fresh checkout

```bash
git clone --recurse-submodules https://github.com/Axodus/ACS.git
cd ACS
git submodule update --init --recursive
node scripts/verify-engine-source.mjs
```

The verification script checks that the ACS path is a Gitlink, the checked-out revision matches the manifest, the submodule is clean, and prohibited top-level runtime content is absent.

## Reproducibility status

At S03 verification, `origin/dev` for AgentsAI remained:

```text
44e9f4d03facb9887b2fe1cab1827d221e4acaab
```

The pinned S01/S02 revision exists locally but is not fetchable from origin. Therefore a fresh external clone cannot initialize this exact pin today. The required follow-up is to push the AgentsAI commits through the normal review process, then re-run `git ls-remote` and update the manifest verification record. S03 does not push.

The current AgentsAI repository also contains pre-existing tracked `agents/` and `memory/` content. S03 does not rewrite that repository. The sparse source checkout avoids materializing those paths locally, while repository-level source hygiene remains a future follow-up before claiming a universally clean source distribution.

## Tradeoff record

Submodule is the initial mechanism because it provides exact revision pinning, a clear source boundary, independent history, and a small implementation surface.

Limitations:

- developer submodule workflow;
- CI `--recurse-submodules` initialization requirement;
- the current unpublished local commit problem;
- future wheel/container distribution concerns.

A published wheel/container may replace it after AgentsAI has an independent release pipeline. Submodule is the initial integration mechanism, not a permanent production packaging decision.

S03 does not implement `acs-engine/1`, stdio/HTTP/gRPC bridges, the TypeScript `OpenClawEngineAdapter`, frontend integration, providers/runners, billing, or cloud workers.
