# REQ-12 Test, Security and Conformance Gates

## First implementation baseline

Before the first authorized IMP changes code:

1. reconcile `ACS-BLOCKER-014` status between the canonical blocker register
   and remediation evidence;
2. record tool/runtime/PostgreSQL versions and the exact baseline commit;
3. run the accepted build/full-suite command in an environment that can execute
   required process, loopback and database cases;
4. preserve exact pass/fail/skip counts and reasons;
5. separate unrelated pre-existing failures from IMP regressions without
   labeling a failing baseline green.

REQ-12 does not run the suite because this diff is documentation-only and
changes no executable behavior. The next implementation gate must not rely on
that omission as runtime evidence.

## Tests required by every IMP

- contract validation, canonical serialization and stable fingerprint/digest;
- owner, lifecycle, CAS/concurrency and idempotent replay/conflict;
- Event/outbox correlation and restart/recovery where state is durable;
- exact historical reconstruction plus explicit missing/deleted/redacted gaps;
- Tenant isolation and cross-Tenant non-disclosure for list/detail/search/ref;
- authority attenuation and denial; references/availability never become grants;
- secret/credential/Memory redaction and log/error safety;
- provider/executor replacement or failure without ownership transfer;
- compatibility adapter behavior, cutover and rollback;
- Product API errors, pending operations and Control Plane state rendering;
- regression coverage for existing Agent, Workforce, Workflow, Run, Task,
  Assignment, Attempt, Runtime, Evidence and Economics owners.

## Domain critical cases

| Domain | Minimum critical evidence |
| --- | --- |
| Agent/Profile | Native-only canonical mutation, exact lineage/head history, no legacy dual truth or Profile capability grant |
| Configuration/resources | Class-specific attenuation, deterministic snapshot, exact revision/observation, fingerprint mismatch and unavailable source |
| Integration | Opaque credentials, lease purpose/scope, Channel ingress authenticity/idempotency and unavailable Connector/MCP handling |
| Memory | read/write authority, scope isolation, consent, retention/deletion, content-free tombstone and no checkpoint/Evidence alias |
| Delegation | authority intersection, explicit basis, expiry/revocation, no onward default, max depth, repeated-agent cycle and no raw transfer |
| Automation/Activation | revision claim, duplicate occurrence, payload conflict, downtime policy, retry-layer separation, authority revalidation and one Run correlation |
| Product API/Admin | one-owner action, CAS/idempotency, source metadata, Tenant-safe history/search and no client authority |
| Genome/assets | trait non-authority, exact assertion/proof, stale/revoked verification, asset digest/replacement/deletion and no reputation/economics |

## Security gate

Every IMP includes threat analysis for authority escalation, confused deputy,
cross-Tenant references, replay, stale policy, secret leakage, malicious media,
untrusted source/Evidence, deletion bypass, forged verification, supply-chain
input and provider callback authenticity as applicable.

Security-sensitive commands require authenticated actor, Tenant, explicit
authority basis, applicable policy/approval, purpose, exact target, freshness,
idempotency/CAS and auditable correlation. Client-projected action availability
never replaces server evaluation.

## Conformance gate

An IMP passes only when:

- all consumed capability, blocker, delta and ADR IDs have explicit status;
- no canonical owner changed by implication;
- unsupported/deferred paths fail closed and are visible as such;
- documentation matches actual test and migration evidence;
- `git diff --check`, documentation links and relevant code checks pass;
- the diff contains only the authorized IMP scope;
- rollback/recovery was tested at the level appropriate to the change.

## Production boundary

Passing local, isolated or disposable-PostgreSQL checks does not authorize
production, credentials, external providers, scheduling, mutation, migrations
or execution. Production readiness remains a separate governance/security and
operational gate.
