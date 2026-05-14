# ACS Operational States

# Purpose

Operational states are the control backbone of ACS.

Every ACS capability must be evaluated against the current user/system state before activation, automation, risk changes, license handling, API validation, or trading execution.

ACS must not add new user-facing trading features before these states are respected by policy and implementation.

---

# Canonical States

- `UNINITIALIZED`: user has not started the ACS path.
- `LEARNING`: user is inside the Academy or required education path.
- `CERTIFIED`: required lessons, quizzes, and Proof of Knowledge are complete.
- `LICENSED`: required NFT license is valid and attached.
- `API_PENDING`: user is configuring an exchange API.
- `API_VALIDATED`: API safety checks passed.
- `RISK_RESTRICTED`: risk or governance permits only restricted operation.
- `READY`: user is eligible, licensed, API validated, and inside risk limits.
- `ACTIVE`: trading automation is active under the approved preset and limits.
- `PAUSED`: automation is paused without revoking eligibility.
- `EMERGENCY_STOP`: emergency stop is active and strategy activation is blocked.
- `SUSPENDED`: access is suspended by ACS, risk, or governance policy.
- `REVOKED`: access/license is revoked and cannot be treated as active.

---

# Transition Principles

- Users advance through learning, certification, license, API validation, risk checks, readiness, and active operation.
- ACS validates state but must not silently advance users into trading execution.
- Risk engine and governance may restrict, pause, suspend, or revoke access.
- `EMERGENCY_STOP`, `SUSPENDED`, and `REVOKED` must block strategy activation.
- `READY` is the only state from which a user may activate a strategy.
- No state transition can imply custody, exchange withdrawals, guaranteed profit, or governance bypass.

---

# Required Audit Behavior

State changes that affect access, strategy activation, risk level, emergency stop, suspension, or revocation must generate:

- telemetry event
- execution receipt or equivalent audit record
- actor identity
- previous state
- next state
- reason
- policy source

Current implementation:
- `src/operational-state.ts` defines states and allowed transitions.
- `src/operational-state-machine.ts` applies transitions and records telemetry/receipts.

---

# MVP Constraint

For the Trading Ignition MVP, operational states must be implemented before exchange execution, strategy marketplace, advanced recommendations, public access, or DAO-controlled live parameter changes.
