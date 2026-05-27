# ACS Trinity Hummingbot Diff-Only Flow

Sprint: 73 - Trinity Hummingbot Diff-Only Proposal Flow

Status: implemented as artifact-only contract. Trinity may generate a diff proposal artifact after ACS returns `allow_diff_only`, but no patch is applied and no real Hummingbot file is edited.

---

# Objective

Allow Trinity to produce auditable Hummingbot strategy change proposals as diff artifacts before any sandbox write or real file mutation exists.

This sprint teaches Trinity to propose, explain and preserve evidence. It does not authorize execution.

---

# Implemented Files

```text
src/trinity-hummingbot-diff-only-flow.ts
src/fixtures/hummingbot-diff-proposal-fixtures.ts
src/schemas/hummingbot-diff-proposal.schema.yaml
tests/trinity-hummingbot-diff-only-flow.test.mjs
```

---

# Output Allowlist

Default ACS output allowlist:

```text
.acs-output/hummingbot-diff-proposals
```

Only artifact files may be written there:

```text
proposal.diff.md
sidecar.json
proof-report.md
console-snapshot.txt
```

Tests may pass a temporary allowlist such as `/tmp/...` to avoid dirtying the repository.

---

# Artifact Contract

A valid diff-only proposal contains:

- textual diff;
- rationale;
- risk assessment;
- rollback notes;
- sidecar JSON;
- proof report;
- console snapshot;
- audit/evidence records.

The sidecar must state:

- `realFileMutationAllowed: false`;
- `applyPatchAllowed: false`;
- `secretsAccessAllowed: false`;
- `connectorAccessAllowed: false`;
- `hummingbotRuntimeAllowed: false`;
- `backtestAllowed: false`;
- `networkAllowed: false`;
- `mcpAllowed: false`;
- `auditRequired: true`;
- `evidenceRequired: true`.

---

# Allowed

- generate diff text;
- generate rationale;
- generate risk assessment;
- generate rollback notes;
- save proposal into ACS output allowlist;
- save sidecar JSON;
- save proof report;
- save console snapshot;
- emit audit/evidence metadata.

---

# Forbidden

- apply patch;
- edit real Hummingbot file;
- remove strategy;
- run Hummingbot;
- run backtest;
- access connector;
- access API keys;
- call shell;
- access network;
- call MCP;
- paper trade;
- live trade.

---

# Sensitive Path Denial

Diff-only proposals must reject source/target paths that include sensitive markers:

```text
conf/connectors
hummingbot/connector
hummingbot/core/gateway
hummingbot/user
database
logs
runtime
state
wallet
account
secret
credential
key
.env
.db
.sqlite
```

---

# Apply Patch Denial

`apply_patch` is explicitly denied in this flow.

Reason codes:

```text
diff_only_mode
apply_patch_no_go
```

Any future patch application must be a separate sandbox-write sprint with:

- approved sandbox root;
- path allowlist;
- no secret scan result;
- approval;
- execution ticket;
- rollback/snapshot;
- isolated tests.

---

# Acceptance Criteria

Delivered:

- Trinity can generate a Hummingbot diff proposal artifact;
- no real Hummingbot file is altered;
- sidecar/proof/audit/evidence artifacts exist;
- apply patch attempts are denied;
- secret/API key/connector attempts are denied;
- no Hummingbot runtime, backtest, shell, network, MCP, paper trade or live trade is enabled.
