# IMP-02A Navigation Map

## Global

```text
ACS
├── Dashboard                 /
├── Agents                    /agents
│   ├── All Agents            /agents
│   ├── Create Agent          /agents/new
│   └── Credential references /credentials
├── Runs                      /executions
│   └── Execution planning    /operational-execution
├── Evidence                  /operational-evidence
│   ├── Audit                 /audit
│   └── Logs                  /logs
├── Usage & Cost              /economics
│   ├── Reservations & settlement /system/settlement-reconciliation
│   ├── Financial audit       /system/financial-audit
│   └── Boundary reports     /system/billing-boundary
├── Runtime                   /runtime
│   ├── Operations status     /operations
│   ├── Deployments           /operational-execution
│   ├── Workers               /workers
│   └── Diagnostics           /logs
└── Administration            /administration
    ├── Readiness             /readiness
    ├── Organizations         external Product API administration URL
    ├── Identity & access     /credentials
    ├── Governance            /system
    ├── Providers & catalogs  /engines
    ├── Capabilities          /composition
    ├── System reliability    /system/operational-reliability
    └── Settings              /settings
```

## Agent-local

For an Agent ID such as `agent-123`:

```text
Agent / agent-123
├── Overview       /agents/agent-123
├── Configuration  /agents/agent-123/configuration
├── Validate       /agents/agent-123/validate
├── Runs           /agents/agent-123/runs
├── Revisions      /agents/agent-123/revisions
├── Evidence       /agents/agent-123/evidence
├── Usage & Cost   /agents/agent-123/usage-cost
└── Advanced       /agents/agent-123/advanced
```

Existing compatibility routes remain reachable:

```text
/agents/:agentId/edit          existing governed configuration editor
/agents/:agentId/composition   existing composition inspection surface
```

Agent-local Runs, Evidence, and Usage & Cost use an explicit unavailable state
until a verified scoped aggregation contract is exposed by the Product API
client. They link to `/executions`, `/operational-evidence`, and `/economics`
respectively.

