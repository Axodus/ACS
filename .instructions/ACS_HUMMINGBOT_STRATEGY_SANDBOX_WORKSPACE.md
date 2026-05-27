# ACS Hummingbot Strategy Sandbox Workspace

Sprint: 74 - Hummingbot Strategy Sandbox Workspace

Status: sandbox workspace defined as planning/audit structure. This is not a Hummingbot runtime, not mounted into live Hummingbot, not connected to Hummingbot API/MCP and not authorized for execution.

---

# Objective

Define a local ACS-controlled sandbox workspace for future Hummingbot strategy artifacts, separated from real Hummingbot runtime paths.

The sandbox exists to make future strategy files, proposals, proofs, rollback records and console snapshots hashable, provable and rollbackable before any controlled sandbox write sprint.

---

# Workspace

```text
.instructions/acs/trading/hummingbot-sandbox/
  manifest.yaml
  allowed-paths.yaml
  forbidden-paths.yaml
  proof-rules.yaml
  rollback-rules.yaml
  evidence-rules.yaml
  strategies/
  proposals/
  proofs/
  rollback/
  console/
```

Subdirectories are intentionally empty except for `.gitkeep` placeholders. Future strategy artifacts may only be created there after ACS approval/ticket rules are implemented.

---

# Rules

- Sandbox is not real runtime.
- Sandbox does not contain API keys.
- Sandbox does not contain real connector configs.
- Sandbox has no network authority.
- Sandbox cannot restart bots.
- Sandbox is not used by Hummingbot live.
- Sandbox cannot call Hummingbot API.
- Sandbox cannot call Hummingbot MCP.
- Sandbox cannot place orders.
- Sandbox cannot run backtests yet.
- Everything written later must be hashable, provable and rollbackable.

---

# Allowed Sandbox Classes

| Directory | Future purpose | Current status |
|---|---|---|
| `strategies/` | Future sandbox strategy source copies only | Defined, not used |
| `proposals/` | Diff proposal artifacts and sidecars | Defined, not runtime |
| `proofs/` | Hash/proof/audit reports | Defined, not runtime |
| `rollback/` | Rollback notes, snapshots and restore metadata | Defined, not runtime |
| `console/` | Console snapshots only | Defined, not runtime |

---

# Forbidden Paths

Anything outside `.instructions/acs/trading/hummingbot-sandbox/` is forbidden for sandbox writes.

Always forbidden:

```text
/mnt/d/Rede/Github/Axodus/tradingbot/**
/mnt/d/Rede/Github/Axodus/hummingbot-api/**
/mnt/d/Rede/Github/Axodus/mcp/hummingbot_mcp/**
/mnt/d/Rede/Github/Axodus/condor/mcp_servers/hummingbot_api/**
/mnt/d/Rede/Github/Axodus/quants-lab/conf/**
conf/connectors/**
hummingbot/connector/**
hummingbot/core/gateway/**
hummingbot/user/**
database/**
logs/**
runtime/**
state/**
wallet*/**
account*/**
credential*/**
secret*/**
key*/**
*.env
*.db
*.sqlite
docker-compose*.yml
Dockerfile
```

---

# Proof Rules

Every future sandbox artifact must include:

- artifact id;
- request id;
- tenant id when applicable;
- capability id;
- ACS decision id or decision metadata;
- source path reference;
- sandbox target path;
- SHA-256 hash of written content;
- timestamp;
- author/agent id;
- policy reason codes;
- statement that runtime/network/secrets/connectors were not accessed.

---

# Rollback Rules

Every future sandbox mutation must include:

- rollback note;
- previous artifact reference or explicit `new_file` marker;
- restore procedure;
- deletion/restore safety flag;
- human review flag for removals;
- proof hash before and after;
- no live path reference as rollback target.

Sandbox rollback never touches live Hummingbot paths.

---

# Evidence Rules

Every future sandbox operation must produce:

- sidecar JSON;
- proof report;
- console snapshot;
- policy decision summary;
- blocked actions summary;
- hash report;
- rollback record.

Evidence must not contain secrets, API keys, connector configs, account identifiers beyond approved requester/tenant references, private keys, tokens, wallet seed material or live runtime state.

---

# Acceptance Criteria

Delivered:

- sandbox workspace defined;
- local sandbox structure created under `.instructions`;
- no real runtime touched;
- forbidden paths explicit;
- future sandbox strategy files have a defined place;
- secrets, connector configs, network, live runtime and bot restart remain prohibited.
