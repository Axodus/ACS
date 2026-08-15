# EPIC-15 Boundary Review

## Already exists

- tenant-scoped identifiers on agents, deployments, runtimes, executions, receipts, economics and audit events;
- isolation helpers that enforce same-tenant and same-workload boundaries;
- system-level projections for administration and tenants that are explicitly future scope;
- governance and production-readiness reports that keep tenant-admin readiness false;
- UX patterns that show tenant context without granting tenant administration;
- canonical tenant lifecycle service and repository;
- canonical tenant membership and administrative authority service;
- canonical governance policy, entitlement, and limit evaluators;
- audit-ready receipts for tenant lifecycle, membership, and governance mutations and decisions.

## Reuse

- tenantId propagation across control-plane entities;
- isolation scope checks;
- audit correlation fields;
- read-only system tenants projection;
- governance-boundary claim discipline;
- EPIC-14 navigation and state language patterns;
- tenant membership repository and receipt shape;
- canonical principal identity validation;
- deterministic decision receipts for policy, entitlement, and limit evaluation.

## Extend

- tenant aggregate lifecycle;
- membership and ownership model;
- administrative role semantics;
- governance policy references;
- limits, entitlements and usage read models;
- administrative event schema;
- platform-scoped and tenant-scoped authority checks;
- tenant-scoped and platform-scoped API boundaries;
- governance decision evaluation.

## Create

- canonical tenant administration contracts;
- tenant list and detail read models;
- command and query surface for tenant administration;
- tenant audit and history surface;
- future UI flow spec for tenant administration;
- clear distinction between platform admin and tenant admin;
- explicit bootstrap semantics for the first owner;
- deterministic governance decision receipts consumed by future enforcement.

## Do not touch

- EPIC-10 domain truth;
- runtime or deployment internals;
- existing tenant and workload isolation primitives;
- billing implementation or money-movement semantics;
- production readiness claims;
- static assets under ./static;
- generic IAM or policy-engine rewrites;
- generic RBAC or ABAC frameworks.

## Deferred

- quota enforcement;
- audit storage implementation;
- billing enforcement;
- external identity-provider integration details;
- advanced observability beyond audit and history requirements;
- runtime reaction semantics for every tenant lifecycle transition;
- any membership/UI surface beyond the domain and service contracts;
- runtime enforcement of governance decisions.

## Adjacent domain review

### Agent domain

Tenant administration may reference agents, but it does not redefine agent identity, revisioning or lifecycle.

### Role and Profile

Administrative roles must not be conflated with agent roles or runtime profiles.

### Tools and Plugins

Tenant governance may constrain their use, but this EPIC does not redesign the composition model.

### Deployments and runtime

Tenant state can constrain deployment and execution starts. It does not replace deployment or runtime truth.

### Control Plane

Tenant administration belongs inside the control plane and must use explicit tenant scope.

### Economics

Tenant budget and spend limits may be represented here, but money movement and billing products remain deferred.

### Authentication and identity

Identity may be external, but tenant membership and authority are ACS-canonical. Principal identity is validated locally only as a governance identifier.

### Observability and audit

Auditability is required for administrative actions. Full audit storage is deferred, but the event contract must be explicit.

## Boundary conclusion

EPIC-15 is the correct place to formalize tenant administration as a governed domain. It is not the place to build a generic IAM platform, a billing system, or a runtime control plane.
