# ACS Tasks

# Active Tasks

## Planning Reset
- [x] define Operational States
- [x] define ACS Policy Matrix
- [x] define What ACS Is Not
- [x] document Trading Ignition Product boundary
- [x] document License and Access Model
- [x] document Risk Model
- [x] document Internal Validation Plan
- [x] document Security Requirements
- [x] add initial TypeScript OperationalState contract
- [x] add initial TypeScript ACS Policy Matrix contract
- [x] test activation-blocking states
- [x] test withdrawal is never allowed
- [x] add state-change telemetry event types
- [x] add state-change receipt model
- [x] implement operational state machine
- [x] implement readiness checklist contract
- [x] implement mock license validator
- [ ] implement mock API safety validator
- [ ] implement risk preset schema
- [ ] implement emergency stop workflow

---

## Orchestration
- [x] define initial orchestration runtime
- [x] define initial workflow execution model
- [x] define initial multi-agent coordination boundary
- [x] add local runtime bootstrap
- [x] define initial bounded autonomy rules
- [x] define initial execution lifecycle receipts
- [x] persist execution receipts outside memory
- [x] add receipt query filters
- [x] add smoke workflow commands
- [x] add replay/idempotency strategy
- [x] add local ACS CLI
- [x] add named workflow registry
- [x] add versioned workflows

---

## Agents
- [x] define initial agent identity structure
- [x] define initial permission boundaries
- [x] add local OpenClaw agent discovery adapter
- [ ] define execution scopes beyond workflow permissions
- [x] define initial agent telemetry requirement
- [ ] define agent lifecycle management

---

## MCP
- [x] define initial RedHat MCP safe adapter boundary
- [x] add RedHat skill listing contract
- [x] add RedHat skill description contract
- [x] add RedHat planning contract
- [x] add blocked RedHat guarded execution contract
- [x] add command/execution policy model
- [x] add action allowlist model
- [x] add approval state model
- [x] add sandbox boundary model
- define transport abstraction
- define interoperability interfaces
- define runtime coordination flows
- define execution routing model

---

## Memory
- define vector memory architecture
- define memory isolation model
- define retention policies
- define contextual persistence
- define memory telemetry

---

## Compute
- define compute federation model
- define provider participation rules
- define inference routing
- define compute telemetry
- define compute capability metadata

---

## Providers
- [x] define initial provider registry
- define provider scoring
- define provider telemetry
- [x] define initial provider capability schema
- define provider lifecycle

---

## Billing
- define token metering
- define provider compensation
- define usage accounting
- define treasury settlement
- define execution billing

---

## Enterprise
- define dedicated MCP deployment model
- define isolated orchestration
- define enterprise memory isolation
- define enterprise compute pools
- define enterprise workflow systems

---

## Telemetry
- [x] define initial execution telemetry events
- [x] persist telemetry events as JSONL
- define workflow telemetry
- define inference telemetry
- define cost visibility
- define operational dashboards

---

# Current Blockers

## Compute
- provider verification strategy pending
- execution pricing strategy pending

---

## Billing
- treasury settlement model pending
- token accounting strategy pending

---

## Memory
- canonical memory persistence strategy pending
- retention policy strategy pending

---

# Future Tasks

- model marketplace
- autonomous workload routing
- cognitive economy coordination
- distributed memory federation
- decentralized orchestration markets
- AI-assisted governance execution
