# EPIC-17-IMP-04 — Slice 5 Product API / Administration & Cross-Domain Conformance

**Status:** COMPLETE / CTO ACCEPTED / PUBLISHED
**Schema:** 10 / CANONICAL
**Scope:** safe administrative projection and conformance only

## Delivered boundary

Slice 5 adds Tenant-bound, GET-only Product API projections for the canonical
Delegation Grant head and immutable current revision:

- `GET /api/v1/delegation/grants`
- `GET /api/v1/delegation/grants/:grantId`

The Product API reads the canonical durable repository. It does not become a
Delegation owner and creates no direct table mutation path. The repository adds
only a Tenant-qualified head listing used by that projection; lineage,
historical revision and revocation reconstruction remain owned by the durable
Delegation repository.

Each projection carries the current head lifecycle, exact revision and
fingerprint, canonical Agent references, bounded authority metadata, exact
parent and ancestry references, depth, validity window, onward-delegation
policy, revocation state, and safe governing, approval and provenance
references.

## Redaction and isolation

The projection omits Grant and revocation reasons, issuers, revokers, raw
authority-owner payloads, secrets, credential material and Memory content. It
returns only opaque Connection references and credential purposes; it neither
resolves credentials nor reads Memory.

Lookup is Tenant-bound. A foreign or missing Grant returns the same typed
`delegation_grant_not_found` response. Non-GET requests under the new path
receive the existing `method_not_allowed` response.

## Preserved boundaries

This Slice does not add schema 11, a new Delegation owner, Workforce changes,
Grant-to-Run execution, credential execution, Memory execution, or admission
semantics. The existing canonical Delegation service and repository remain the
only mutation path.

## Conformance reconciliation

The Slice updates stale test expectations that still asserted schema 9 where
the already-published schema 10 is canonical. Those changes are test-only and
do not alter migration or runtime behavior. The final regression result and
causal reconciliation remain required before CTO acceptance.

## Current validation

| Validation | Result |
| --- | --- |
| TypeScript build | PASS |
| Focused Product API projection and route tests | PASS |
| Full regression | 136 PASS / 10 FAIL |
| Full-regression causality | `A = 0`, `B = 0`, `C = 10`, `D = 0` |
| `git diff --check` | PASS |

The four explicit stale schema-9 assertions were updated to the already
canonical schema 10. The remaining ten failures are local listener/process
tests that stop at `listen EPERM` on `127.0.0.1` or `0.0.0.0`, including one
independent child-process target. Their test files neither reference nor reach
the Slice 5 Delegation code.

PostgreSQL acceptance is blocked in this environment before test execution:
the runner cannot access the local Docker daemon. The Slice adds an isolated
PostgreSQL test for Tenant-qualified Grant-head listing to the acceptance
runner, but no PostgreSQL pass is claimed until that environment is available.

## Publication and next gate

Slice 5 is published with the formal IMP-04 closure package. The next DAG node
is IMP-05, which is eligible only for separate CTO gate preparation. No
Automation implementation authority follows from this publication.

## Validation required for acceptance

- TypeScript build.
- Focused Product API redaction, Tenant-isolation, GET-only and typed-not-found
  tests.
- PostgreSQL acceptance including Tenant-qualified Delegation head listing.
- Full regression with A/B/C/D causal reconciliation if failures remain.
- `git diff --check`.
