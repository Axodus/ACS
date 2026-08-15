# EPIC-15 Milestone B01 — Membership & Administrative Authority

Status: complete

## Scope implemented

- canonical `TenantMembership` domain model;
- principal identity validation;
- tenant-scoped administrative roles;
- explicit platform-scoped authority basis;
- governed membership mutations;
- ownership invariants;
- bootstrap owner path;
- audit-ready receipts and events;
- deterministic error semantics;
- compatibility with the tenant lifecycle domain from A01.

## Files and modules

- src/control-plane/tenant-membership.ts
- src/index.ts
- tests/tenant-membership-authority.test.mjs

## Principal identity

- `PrincipalId` is represented as a canonical string identifier.
- The implementation validates principal identity locally and does not introduce a new identity-provider subsystem.
- ACS keeps membership state needed for governance; authentication remains external.

## Membership lifecycle

- active
- suspended
- removed

Removed membership is terminal for administrative use; historical records remain in repository history and receipts.

## Administrative roles

- tenant_owner
- tenant_admin
- operator
- auditor

`platform_admin` is not a membership role. It is an explicit authority basis for platform-scoped actions.

## Authority matrix

- `tenant_owner`: create members, change roles, suspend/reactivate/remove members, transfer ownership.
- `tenant_admin`: manage non-owner tenant membership, but cannot administer owner authority or transfer ownership.
- `operator`: read-only for membership administration.
- `auditor`: read-only for membership administration.
- `platform_admin`: explicit platform-scoped authority; may bootstrap the first owner and administer across tenants when allowed by tenant state.

## Ownership semantics

- a tenant has a single active owner at a time;
- ownership is stronger than an ordinary administrative role;
- ownership transfer is explicit and atomic;
- the last active owner cannot be removed;
- self-promotion to owner is blocked.

## Bootstrap semantics

- the first owner is bootstrapped through explicit `platform_admin` authority;
- bootstrap is only valid while the tenant is provisioning;
- bootstrap is one-time for the initial owner path;
- this avoids a permanent force-add bypass.

## Tenant lifecycle integration

- tenant provisioning accepts bootstrap owner creation;
- active tenants accept governed membership mutations;
- suspended tenants retain read visibility but tenant-scoped mutations are blocked;
- archived tenants block all membership mutations.

## Privilege escalation protections

- cross-tenant mutations are rejected;
- tenant-scoped authority does not transfer across tenants;
- role escalation is bounded by role rank;
- tenant admin cannot create platform authority;
- operator and auditor remain read-only;
- last-owner removal is blocked;
- ownership transfer requires a distinct target principal.

## Audit contract

Each successful mutation returns a receipt with:

- tenantId;
- principalId;
- previous and next role;
- previous and next status;
- operation;
- authority basis;
- actor;
- reason;
- timestamp;
- revision.

Optional audit-service integration records the same metadata as an event.

## Error semantics

- invalid principal identity;
- membership already exists;
- membership not found;
- unauthorized administrative action;
- cross-tenant administrative operation;
- invalid role transition;
- cannot remove last owner;
- invalid ownership transfer;
- tenant state blocks membership mutation;
- membership inactive.

## Deferred scope

- invitations and acceptance flow;
- external identity provider synchronization;
- authentication and session management;
- generic IAM / generic RBAC;
- policy engine;
- quotas and entitlements enforcement;
- billing;
- runtime enforcement of membership changes;
- UI and HTTP admin surface.

## Tests

- bootstrap initial owner;
- membership creation and duplicate rejection;
- invalid principal rejection;
- authority evaluation for roles and platform basis;
- cross-tenant denial;
- self-promotion denial;
- single-owner protection;
- ownership transfer;
- suspend/reactivate/remove lifecycle;
- suspended and archived tenant mutation blocking;
- audit-ready event metadata.

## Acceptance result

Milestone B01 is complete. The repository now has a canonical, governed, testable tenant membership and administrative authority layer that is separate from Agent roles and compatible with the A01 tenant lifecycle.
