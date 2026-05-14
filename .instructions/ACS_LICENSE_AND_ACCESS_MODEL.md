# ACS License and Access Model

# Purpose

ACS access must follow the Axodus maturation pipeline before trading automation is available.

The license model gates user eligibility, strategy access, and continued operation.

---

# Required Checks

- wallet connected
- Academy course completed
- quizzes completed
- Proof of Knowledge validated
- required `$Neurons` earned
- NFT license acquired
- NFT license attached to Trading Dashboard
- risk acknowledgement completed
- operational state permits the requested action

---

# License Rules

License validation may include:

- license type
- expiration
- usage limits
- strategy access level
- wallet ownership
- transferability rules
- governance-defined restrictions

---

# Loss of Eligibility

If a user loses license eligibility:

- strategy activation must be blocked
- active automation must be paused or suspended according to policy
- telemetry must record the access change
- receipts must preserve the reason
- user-facing status must be explicit

---

# MVP Rule

Mock license validation is acceptable only when clearly marked as mock and replaceable by real Marketplace/license integration.

Current implementation:
- `src/license.ts` provides a mock validator for wallet, license type, expiration, revocation, and strategy access.
