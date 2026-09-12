# ACS-V2-AR-03A — Attempt Attribution Compatibility Review

**Classification: ADDITIVE COMPATIBLE**

The existing native Usage records preserve Run and Task linkage but do not
store `attempt_id`. A Task can have multiple Attempts, so Attempt cannot be
derived deterministically from the existing linkage. Adding a nullable,
immutable Attempt reference, or an ACS-owned immutable bridge from Usage to an
Attempt, can add traceability without changing existing Run/Task aggregation.

Existing historical Cost records remain valid because the reference is
optional and additive. A database migration and a later Product API contract
update would be required only when that future traceability capability is
authorized. This review does not change Usage, Cost, their migrations, or
FROZEN-v1 semantics. The recommendation is to keep the bridge optional and
immutable, and defer implementation until the runtime/Attempt contract is
frozen.
