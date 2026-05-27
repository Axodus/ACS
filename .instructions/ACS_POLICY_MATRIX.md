# ACS Policy Matrix

# Purpose

The ACS Policy Matrix is the authority table for operational capabilities.

Every capability must define:

- who can initiate it
- who can approve it
- who can block it
- which operational states allow it
- whether telemetry is required
- whether receipts are required

---

# Authority Values

- `Yes`: authority can perform or approve the capability.
- `Partial`: authority can request, suggest, or contribute evidence, but cannot complete the capability alone.
- `No`: authority cannot perform the capability.
- `Never`: capability is forbidden for that authority in every state.

---

# Initial Matrix

| Capability | User | ACS | Governance | Risk Engine | Rule |
| --- | --- | --- | --- | --- | --- |
| Change leverage | Partial | No | Yes | Yes | User may request only inside approved limits. |
| Activate strategy | Yes | No | Yes | Yes | User activation requires `READY` and active risk/governance allowance. |
| Pause bot | Yes | Yes | Yes | Yes | Protective pause may be initiated by any authority. |
| Emergency stop | Yes | Yes | Yes | Yes | Must be available, fast, and auditable. |
| Validate license | Partial | Yes | Yes | No | ACS validates; governance defines rules. |
| Validate API | Partial | Yes | Yes | Yes | API must reject withdrawal permissions and unsafe scopes. |
| Change preset | Yes | No | Yes | Yes | Public default is conservative unless policy allows otherwise. |
| Suspend user | No | Partial | Yes | Yes | Requires documented policy, risk, or governance basis. |
| Revoke access | No | No | Yes | Partial | Governance/license authority owns revocation. |
| Withdraw funds | Never | Never | Never | Never | ACS must never withdraw user funds. |

---

# Non-Negotiable Rules

- `Withdraw funds` is always forbidden.
- ACS must never request, store, or use withdrawal-enabled exchange API keys.
- ACS cannot activate a strategy by itself.
- ACS cannot increase leverage by itself.
- Governance and risk rules constrain strategy activation, leverage, preset selection, suspension, and revocation.
- All material capability decisions require telemetry and receipts.

---

# MVP Constraint

The policy matrix is mandatory before Trading Ignition automation.

Any future capability must be added to this matrix before implementation.

