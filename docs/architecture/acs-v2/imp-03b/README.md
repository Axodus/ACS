# ACS-V2-IMP-03B — Run Admission & Immutable Workforce Membership Snapshot

Status: PARTIAL. The ACS-native PostgreSQL admission path is implemented in the shared native repository. Final durable acceptance is pending an `ACS_SH_DATABASE_URL` PostgreSQL environment.

The operational path admits the active current Workforce revision, resolves every member to an exact Agent revision, persists `WorkforceRunMembershipV2`, and writes the admission event/outbox in the same transaction. Non-Workforce legacy Run creation remains unchanged.

## Boundaries

This package does not implement task assignment, coordination, scheduling, runtime compilation, provider selection, UI, or Cost changes. An admitted Run never follows later Workforce or Agent heads.
