# ACS-V2-REQ-02 — Dependency license inventory and provenance verifier

**Date:** 2026-09-10
**Scope:** local, read-only inspection of `/home/mzfshark/agenta`, `/home/mzfshark/.eigent`, and `/opt/Axodus/ACS`. Evidence collection performed no network access, dependency installation, server startup, inference, configuration change, secret inspection, or source/runtime change. The lead audit copied this human-readable report and its JSON companion into the ACS planning package; no external code or runtime artifact was imported.

## Decision status

| Candidate | Copy source | Depend/link | Reimplement concepts | Evidence status |
|---|---|---|---|---|
| Agenta OSS outside `ee/` | Conditional: retain MIT notice and complete exact-module dependency review | Conditional | Ready as a design reference | Root MIT evidence and commit verified; third-party license inventory incomplete |
| Agenta `ee/` | **Blocked** | **Blocked for ACS reuse absent enterprise agreement/legal approval** | Concepts only, clean-room discipline | Enterprise terms verified |
| Eigent source | Conditional: Apache-2.0 notices/change notices; resolve copyright wording ambiguity | Conditional | Ready as a design reference | Root Apache-2.0 and HEAD verified; graph incomplete |
| `camel-ai[eigent]==0.2.91a7` | Conditional: Apache-2.0 duties | Conditional for bounded PoC | Ready as a design reference | Version/hashes/metadata and installed integrity verified; exact upstream commit unknown |
| ACS `engines/agentsai` / OpenClaw | **Blocked** | **Blocked** | Architecture only | Gitlink/manifest conflict and no local license proof |
| Eigent bundled Anthropic example skills | **Excluded** | Do not package/link as a dependency without rights review | Do not derive from source | Proprietary no-copy/no-derivative license text present |

## License and notice evidence

### Agenta

- Root `/home/mzfshark/agenta/LICENSE`: MIT Expat for content outside **any** `ee/` directory; exact copyright notice: `Copyright (c) 2023–2025 Agentatech UG (haftungsbeschränkt), doing business as “Agenta”`.
- All verified `ee/` locations carry the Agenta Enterprise License: `/home/mzfshark/agenta/ee/LICENSE`, `api/ee/LICENSE`, `services/ee/LICENSE`, `web/ee/LICENSE`, and `hosting/docker-compose/ee/LICENSE`.
- Enterprise limits: production use requires Agenta enterprise terms/license. Copy/modify for development and testing is stated as allowed, but the license forbids copying, merging, publishing, distributing, sublicensing, or selling beyond the express grant. This is not an ACS redistribution or production right.
- A file-level exception was observed at `web/packages/agenta-ui/src/Editor/plugins/debug/DebugPlugin.tsx`: `Copyright (c) Meta Platforms, Inc. and affiliates.` and an MIT/Lexical attribution. Preserve it if that file or substantial expression is copied.

### Eigent

- Root `/home/mzfshark/.eigent/LICENSE`: Apache License 2.0, appendix notice `Copyright 2026 @ Eigent.AI`.
- Representative backend headers state exactly: `Copyright 2025-2026 @ Eigent.ai All Rights Reserved.` followed by Apache-2.0 text. The `Eigent.AI`/`Eigent.ai` and year difference is an attribution ambiguity, not evidence that the license is absent. Preserve both applicable notices and resolve ownership wording before extraction.
- Tracked local package exceptions include `package/@stackframe/react/LICENSE` and `package/@stackframe/stack-shared/LICENSE`, both MIT text with `Copyright 2024 Stackframe`.
- Bundled example-skill directories include proprietary Anthropic license text (`© 2025 Anthropic, PBC. All rights reserved.`) that prohibits extraction, copying, derivatives, distribution and transfer. They are excluded from reuse.

### CAMEL

- Selected backend declaration: `/home/mzfshark/.eigent/backend/pyproject.toml` requires `camel-ai[eigent]==0.2.91a7`.
- Installed `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages/camel_ai-0.2.91a7.dist-info/METADATA` verifies `Name: camel-ai`, `Version: 0.2.91a7`, `License-Expression: Apache-2.0`, project repository `https://github.com/camel-ai/camel`; its installed license file is Apache-2.0.
- Representative installed file header: `Copyright 2023-2026 @ CAMEL-AI.org. All Rights Reserved.` plus Apache-2.0 text.
- No CAMEL `NOTICE` file was observed under the selected dist-info directory.

### ACS

- No tracked root `LICENSE`, `NOTICE`, or `COPYING` was found in `/opt/Axodus/ACS`. `src/license.ts` and `src/license-loss.ts` are application source files, not project license notices.
- No license/notice/copyright file was found at inspected `engines/agentsai` submodule depth. This blocks source reuse and combined distribution planning.

## Provenance and resolved dependency evidence

### Repository identities

| Repository | Verified HEAD | Description / local condition |
|---|---|---|
| Agenta | `204703fc24ff52993be317c7a83e2bd755051d35` | `v0.115.2-93-g204703fc24-dirty`; dirty (5 paths) |
| Eigent | `6bb55842f73766f7b219aa5ef5bcf5965f3acdaa` | `v1.0.4-dirty`; dirty (38 paths) |
| ACS | `cd9544131ffb622d407faf266357b4d28598cd16` | `cd95441`; dirty (1 paths) |

The commit is attributable to the recorded `HEAD`; dirty paths are deliberately not assigned an invented upstream commit.

### Eigent runtime and CAMEL integrity

`electron/main/init.ts` selects direct backend-v-environment Python when packaged or when `backend/.venv` exists. The packaged candidate is `resources/prebuilt/venv`; development candidate is `backend/.venv`. No live process was inspected, so the actual runtime of a particular session remains unknown. The four observed CAMEL 0.2.91a7 copies have identical `METADATA`, `RECORD`, and license SHA-256 values.

| Item | Verified value |
|---|---|
| CAMEL sdist SHA-256 | `8e165728efdad85b9f477ef38d4801b6e2c85fdccb8976f960e8a989da1da591` |
| CAMEL wheel SHA-256 | `5ed5cd6155f1f88f81e46de6b87f417dd818450b54b48c0c0f45e045c874183c` |
| Active dist-info METADATA SHA-256 | `5185deda0431c8206e158cfe6c170eb347e3b87e539c87049281b1786cda2a3a` |
| Active dist-info RECORD SHA-256 | `30ee3aceb3c04c8b1fa70be9237c6779c653f78aa19322abad679207cbf86915` |
| RECORD check | 537 verified, 0 missing, 0 mismatched, 1 unhashed (`RECORD` itself) |

The backend lock records registry artifacts, version, and hashes but no exact upstream Git commit. Do not substitute a guessed commit. The separate Eigent `server` graph is conflicting: `server/pyproject.toml` declares `camel-ai==0.2.90a6`, while its lock resolves `0.2.90a4` at git revision `b5137bf80d4cf4c3fbcd016d4afeeeaae96d6729`; it is not the selected backend graph.

### Runtime, optional, development, and frontend separation

- **Selected backend runtime:** `backend/pyproject.toml` plus `backend/uv.lock`, with `camel-ai[eigent]` extra. The JSON inventory compares all 209 locked entries against `/home/mzfshark/.eigent/backend/.venv/lib/python3.11/site-packages` metadata: **191 verified**, **18 unknown**, **0 conflicting**. Unknown generally means absent/insufficient local METADATA license expression, not an affirmative conclusion of no license.
- **Optional:** CAMEL `eigent` extra is selected by the backend requirement. CAMEL publishes many other extras, but they are not inferred as selected from its broad metadata alone. Electron also has background `uv sync` code for optional dependencies; it was not executed.
- **Development:** backend dev group contains Babel, pre-commit, pytest, and pytest-asyncio. Agenta API/services/SDK dev groups and runner devDependencies are separately recorded in JSON.
- **Frontend:** Eigent root `package.json`/`package-lock.json` is a separate Electron/frontend graph; Agenta `web/`, docs and website are separate frontend/documentation graphs. They were not represented as the selected backend transitive environment.
- **Agenta runner:** runtime direct dependencies include sandbox-agent, ACP/Claude/Pi adapters, Daytona and OpenTelemetry. `runtimeAgentPins` says `@openai/codex` 0.145.0 / Codex ACP 1.1.7 are image/runtime-managed, documents Codex as Apache-2.0, and says Claude Code is proprietary/runtime-installed. These executors retain their own terms.

### ACS lock and engine provenance

ACS `pnpm-lock.yaml` resolves direct runtime dependencies to `pg` 8.23.0 and `viem` 2.55.19; local metadata samples show MIT for both and Apache-2.0 for dev TypeScript 5.9.3. This is a partial sample, not an SBOM.

`engines/agentsai.manifest.json` records revision `ce46bfff9f7d1b7dc6a7ced3f9790632cea79a3b`, says it is not fetchable from origin, and calls it local-only. The actual superproject gitlink and submodule HEAD are both `7a073ed87f877df7020ba8f348eb59afe3f64a48`. This provenance conflict and the absent license proof mean **do not copy or ship AgentsAI/OpenClaw code**.

## Obligations by action

| Action | Practical gate |
|---|---|
| Copy OSS Agenta source | Confirm exact paths are outside all `ee/` directories, preserve MIT notices and every embedded third-party/header notice, then produce a module-scoped dependency license inventory. |
| Copy Eigent/CAMEL source | Preserve Apache-2.0 license and applicable copyright/patent/trademark/attribution notices; mark modified files; include NOTICE content if selected inputs have it; do not imply trademark permission. |
| Add dependency/link | Retain each package’s own licensing obligations in the actual distribution. Lock version/hash and package metadata are necessary but do not replace a distribution-level notice review. |
| Reimplement concepts | Keep implementation independently authored. Record source concepts as references and avoid copying expression; seek legal review if the implementation may be substantially similar. |
| Copy Agenta EE, AgentsAI/OpenClaw, or proprietary example skills | **Do not proceed** until the respective enterprise/provenance/license gates are cleared. |

## Completeness and remaining gates

This is a **partial but actionable** provenance manifest. It is complete for the specified roots, Agenta EE boundary, selected Eigent backend CAMEL integrity, locked-versus-installed backend metadata comparison, and ACS root/submodule blockers. It is not a legal opinion or complete SBOM for every Agenta/Eigent frontend, server, cached, terminal, or packaged environment.

Before copying or redistributing any code, perform a final legal/module review on the exact selected files and shipped dependency closure. For a bounded dependency PoC, CAMEL dependency use is conditionally ready with pin/hash enforcement; source copying remains conditional on Apache notice handling. Agenta OSS source copying is conditionally ready only for an identified non-EE module after its transitive dependencies are reviewed. Agenta EE and ACS AgentsAI/OpenClaw are not ready. Clean-room conceptual reimplementation is ready subject to ordinary legal review and attribution discipline.

## Artifacts

- Human-readable manifest: this document.
- Machine-readable inventory: [license-provenance-inventory.json](license-provenance-inventory.json)
