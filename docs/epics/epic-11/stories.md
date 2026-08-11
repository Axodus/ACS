# EPIC-11 Story Specifications

Each story is a request group for execution planning. The identifiers are conceptual and may be split or merged during refinement, but the dependency order is normative.

## Milestone A — Operational Awareness

### OA-01 System Shell & Navigation

- App shell operacional
- Navegação principal
- Seções do Control Plane
- Environment context
- Product API connectivity
- Layout base
- Empty/loading/error shell states

### OA-02 System Dashboard

- System overview
- ACS health
- Active Agents
- Active Deployments
- Active Runtimes
- Available Workers
- Recent Execution Runs
- Critical blockers
- Operational warnings

### OA-03 Readiness & Health Overview

- DEV readiness
- Distributed Runtime readiness
- Production readiness
- Readiness blockers
- Readiness evidence
- Component health
- Infrastructure health
- Product API health
- Runtime connectivity
- Readiness refresh

## Milestone B — Agent Lifecycle

### AL-01 Agent Inventory

- List Agents
- Search Agents
- Filter Agents
- Sort Agents
- Agent status
- Agent environment
- Agent runtime state
- Agent deployment state
- Archive state
- Empty / loading / error states

### AL-02 Agent Detail & Operational Summary

- AgentDefinition
- AgentRevision
- AgentComposition
- Identity
- Current revision
- Role
- Profile
- Capabilities
- Skills
- Tools
- Runtime
- Deployment
- Economic state
- Audit summary
- Readiness summary
- Lifecycle summary

### AL-03 Agent Create & Initial Composition

- Create Agent
- Identity definition
- Initial revision
- Initial composition
- Runtime target
- Engine selection
- Role selection
- Profile selection
- Initial capability validation
- Creation validation

### AL-04 Agent Edit & Draft Changes

- Edit AgentDefinition
- Edit Identity
- Edit metadata
- Edit composition
- Runtime configuration
- Target configuration
- Change validation
- Unsaved changes
- Draft state

### AL-05 Agent Revision & Lifecycle Actions

- Create revision
- Revision history
- Revision comparison
- Active revision
- Adopt revision
- Restore revision
- Duplicate Agent
- Archive Agent
- Restore Agent
- Delete Agent
- Dependency validation
- Protected Agent rules
- Lifecycle history
- Destructive confirmation

## Milestone C — Composition Surface

### CS-01 Role & Profile Composition

- Role catalog
- Role detail
- Create Role
- Edit Role
- Role revisions
- Role capabilities
- Capability inheritance
- Role adoption
- Role usage
- Profile catalog
- Profile detail
- Create Profile
- Edit Profile
- Profile revisions
- OpenClaw-compatible profile
- Legacy profile visibility
- Identity
- Soul
- User
- Memory
- Heartbeat
- Profile adoption

### CS-02 Capability Model

- Capability Registry
- Available capabilities
- Effective capabilities
- Capability source
- Capability inheritance
- Capability requirements
- Missing capabilities
- Capability conflicts
- Capability usage

### CS-03 Skills Management

- Skill catalog
- Installed Skills
- Skill detail
- Install Skill
- Remove Skill
- Assign Skill
- Unassign Skill
- Skill requirements
- Skill compatibility
- Skill usage

### CS-04 Tools & Plugins Management

- Tool catalog
- Tool assignment
- Tool capabilities
- Plugin packages
- Package sources
- Plugin installation
- Plugin removal
- Plugin dependencies
- Plugin compatibility
- Plugin status
- Plugin failures

### CS-05 Models, Engines & Providers

- Engine Registry
- Provider Registry
- Available engines
- Available models
- Provider capabilities
- Engine capabilities
- Model selection
- Provider selection
- Engine selection
- Compatibility visibility

## Milestone D — Operational Execution

### OE-01 Credentials & Provider Connections

- Credential catalog
- Credential status
- Credential provider
- Create Credential
- Update Credential
- Remove Credential
- Secret reference
- Credential metadata
- Credential usage
- Credential validation
- Provider connections
- Connection health
- Authentication state
- Provider availability
- Credential association
- Connection validation
- Connection errors
- Connection refresh
- Rotation state

### OE-02 Agent Readiness & Deployment Planning

- Composition readiness
- Policy eligibility
- Sandbox readiness
- Target readiness
- Credential readiness
- Capability readiness
- Skill readiness
- Tool readiness
- Economic readiness
- Blocking findings
- Warnings
- Evidence
- Recheck
- ExecutionPlan
- Target selection
- Worker requirements
- Engine requirements
- Credential requirements
- Economic quote
- Policy evaluation
- Eligibility
- Sandbox constraints
- Deployment preview

### OE-03 Deploy & Deployment Operations

- Deploy
- Deployment state
- Deployment progress
- Deployment result
- Deployment errors
- Active revision
- Execution target
- Assigned Worker
- Runtime creation
- Deployment audit
- Activate
- Deactivate
- Stop
- Restart
- Redeploy
- Rollback
- Undeploy
- Deployment history
- Deployment comparison
- Operation eligibility

### OE-04 Runtime & Execution Runs

- Runtime instances
- Runtime status
- Runtime Agent
- Runtime Worker
- Runtime Target
- Runtime Engine
- Runtime health
- Runtime age
- Runtime activity
- Runtime isolation
- Start Runtime
- Stop Runtime
- Restart Runtime
- Runtime command progress
- Runtime command result
- Unsupported operation
- Runtime failure state
- Runtime reconciliation
- Runtime drift
- ExecutionRun inventory
- ExecutionRun detail
- Run status
- Start time
- End time
- Runtime
- Agent revision
- Worker
- Target
- Execution result
- Failure reason
- Execution history

### OE-05 Worker Operations

- Worker Registry
- Worker status
- Worker health
- Worker capabilities
- Worker capacity
- Worker availability
- Worker environment
- Worker workloads
- Worker target support
- Worker isolation state
- Register Worker
- Enable Worker
- Disable Worker
- Drain Worker
- Worker readiness
- Worker workload limits
- Worker tenant isolation
- Worker workload isolation
- Worker failure state
- Worker reconciliation

## Milestone E — Operational Evidence & Economics

### EV-01 Logs & Events

- Agent logs
- Runtime logs
- Worker logs
- Deployment logs
- Execution logs
- System events
- Filtering
- Search
- Error context
- Log correlation

### EV-02 Audit Trail

- Audit trail
- Agent changes
- Revision changes
- Deployment operations
- Runtime operations
- Credential operations
- Worker operations
- Economic operations
- Actor
- Timestamp
- Audit filtering

### EV-03 Diagnostics & Evidence

- Diagnostic reports
- Readiness evidence
- Failure diagnostics
- Runtime evidence
- Worker evidence
- Deployment evidence
- Policy findings
- Isolation findings
- Economic findings
- Operational troubleshooting

### EV-04 Economic Overview

- Economic state
- $Neurons balance context
- Agent consumption
- Runtime consumption
- Execution consumption
- Cost history
- Provider costs
- Target costs
- Economic warnings
- Spending visibility

### EV-05 Quote & Reservation

- Quote
- Reservation
- Reservation status
- Economic eligibility
- Estimated execution cost
- Reserved amount
- Expiration
- Reservation failures
- Policy limits
- Economic readiness

### EV-06 Metering & Settlement

- Metering
- Usage records
- Settlement
- Receipts
- Execution costs
- Provider costs
- Settlement status
- Settlement failures
- Economic audit
- Historical consumption

## Milestone F — Control Plane Hardening

### CP-01 Policies & Governance

- Policy catalog
- Policy detail
- Policy status
- Policy scope
- Eligibility rules
- Sandbox policies
- Runtime policies
- Economic policies
- Policy findings
- Policy usage

### CP-02 Tenants & Isolation

- Tenant inventory
- Tenant detail
- Tenant Agents
- Tenant Workers
- Tenant Deployments
- Tenant Runtimes
- Tenant credentials
- Isolation state
- Workload boundaries
- Tenant diagnostics

### CP-03 ACS Configuration

- Environment configuration
- Runtime settings
- Engine settings
- Worker settings
- Deployment defaults
- Economic defaults
- Governance defaults
- Feature availability
- System metadata
- Configuration diagnostics

### CP-04 Operational Error Handling

- Product API errors
- Validation errors
- Governance failures
- Runtime failures
- Worker failures
- Credential failures
- Economic failures
- Partial failures
- Retry
- Recovery
- Stale state
- State reconciliation

### CP-05 UX State & Operational Consistency

- Loading states
- Empty states
- Error states
- Pending operations
- Long-running operations
- Polling / refresh
- State consistency
- Optimistic state boundaries
- Navigation consistency
- Action availability

### CP-06 Full Agent Lifecycle E2E

- Create
- Compose
- Configure
- Credential
- Readiness
- Quote
- Reserve
- Deploy
- Activate
- Execute
- Observe
- Modify
- Revision
- Redeploy
- Stop
- Undeploy
- Archive / Delete
- Audit
- Settlement

### CP-07 Distributed Operations E2E

- Multiple Workers
- Multiple Agents
- Multiple Runtimes
- Target allocation
- Workload isolation
- Tenant isolation
- Worker failure
- Runtime recovery
- Deployment reconciliation
- Concurrent executions

### CP-08 EPIC-11 Acceptance

- Product API regression
- Control Plane regression
- Worker regression
- Runtime regression
- Governance regression
- Economic regression
- OpenClaw integration regression
- UI lifecycle regression
- CLI-independent workflow
- DEV readiness validation
- Distributed runtime validation
- EPIC acceptance gate
