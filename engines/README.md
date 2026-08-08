# ACS engine dependencies

`engines/` contains versioned source dependencies and source-only integration
metadata. It is not an OpenClaw runtime directory.

`engines/agentsai/` is a Git submodule for the AgentsAI/OpenClaw engine. The
superproject records its exact Gitlink revision; the operational DEV runtime
remains `~/.openclaw` and is never represented by this path.

Do not create `.env`, `openclaw.json`, `.acs/state`, runtime databases, logs,
credentials, agent memory, profiles, tools, or temporary workspaces here.
