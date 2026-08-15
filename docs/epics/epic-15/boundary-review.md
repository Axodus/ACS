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
- tenant administration Product API routes for canonical tenant, membership, governance, entitlement, and limit operations.
- Control Plane UX under ./static for tenant list/detail and the tenant administration tabs.
- tenant-scoped administrative audit history routes and isolation hardening for forged context, cross-tenant reads, and platform authority boundaries.
- canonical administrative audit event projection with tenant-scoped read-only history and correlation metadata.

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
- canonical administrative audit entries and read projections for tenant history.
- audit history filtering and detail views that remain tenant-scoped and consult real events only.

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
- enforcement adapters at selected control-plane mutation boundaries;
- failure mapping for governance, entitlement, limit, and state denials.
- browser-accepted administrative pages and route state for D02.
- audit/history UI, when present, consumes only real tenant-scoped audit data.
- canonical audit read routes and UI surfaces for tenant-scoped history inspection.

## Create

- canonical tenant administration contracts;
- tenant list and detail read models;
- command and query surface for tenant administration;
- tenant audit and history surface;
- UI flow implementation for tenant administration;
- clear distinction between platform admin and tenant admin;
- explicit bootstrap semantics for the first owner;
- deterministic governance decision receipts consumed by future enforcement.
- shared enforcement contract that consumes canonical governance receipts before side effects.
- administrative Product API adapters that remain thin and domain-driven.
- tenant-scoped audit history projections and read APIs.
- administrative audit event correlation and history detail contracts.

## Do not touch

- EPIC-10 domain truth;
- runtime or deployment internals;
- existing tenant and workload isolation primitives;
- billing implementation or money-movement semantics;
- production readiness claims;
- generic IAM or policy-engine rewrites;
- generic RBAC or ABAC frameworks.

## In scope for D02

- static Control Plane routes and components under ./static that render tenant administration UX;
- browser acceptance harness and evidence for the implemented routes.

## Deferred

- quota enforcement;
- audit storage implementation;
- billing enforcement;
- external identity-provider integration details;
- advanced observability beyond audit and history requirements;
- runtime reaction semantics for every tenant lifecycle transition;
- any membership/UI surface beyond the domain and service contracts;
- runtime enforcement of governance decisions beyond the selected control-plane boundaries;
- broad queue, worker, and metering redesign.
- audit storage remains minimal and tenant-scoped; no generic observability layer is introduced.
- no synthetic audit history is introduced for display purposes.

## Adjacent domain review

### Agent domain

Tenant administration may reference agents, but it does not redefine agent identity, revisioning or lifecycle.

### Role and Profile

Administrative roles must not be conflated with agent roles or runtime profiles.

### Tools and Plugins

Tenant governance may constrain their use, but this EPIC does not redesign the composition model.

### Deployments and runtime

Tenant state can constrain deployment and execution starts. Milestone C02 only consumes this at selected control-plane boundaries; it does not replace deployment or runtime truth.

### Control Plane

Tenant administration belongs inside the control plane and must use explicit tenant scope. The implemented UX consumes the administrative Product API only and does not import control-plane domain internals.

### Economics

Tenant budget and spend limits may be represented here, but money movement and billing products remain deferred.

### Authentication and identity

Identity may be external, but tenant membership and authority are ACS-canonical. Principal identity is validated locally only as a governance identifier.

### Observability and audit

Auditability is required for administrative actions. Full audit storage is deferred, but the event contract must be explicit.

### Enforcement boundaries

Tenant governance decisions are consumed at a small number of explicit application boundaries. They are not duplicated as controller-local policy logic and they do not become a general middleware system.

## Boundary conclusion

EPIC-15 is the correct place to formalize tenant administration as a governed domain. It is not the place to build a generic IAM platform, a billing system, or a runtime control plane.
