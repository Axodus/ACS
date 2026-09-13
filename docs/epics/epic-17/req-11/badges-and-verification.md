# REQ-11 Badges and Verification

## Badge taxonomy

| Badge class | Meaning | Evidence requirement | Authority effect |
| --- | --- | --- | --- |
| Decorative badge | Visual label, theme or editorial grouping with no factual claim | None; must be identified as decorative | None |
| Assertion badge | Compact display of one exact trait assertion | Assertion source/provenance; may be explicitly unverified | None |
| Verified assertion badge | Compact display of an assertion accepted by an authorized verification policy at a stated time | Exact assertion, Evidence refs, verifier/policy decision, scope and validity/freshness | None |
| Canonical-state badge | Projection of lifecycle/readiness/status owned by another domain | Exact owning projection and freshness | Only the underlying owner has operational effect |

Generic UI badge components and styling are presentation mechanisms. They do
not assign one of these semantic classes by themselves.

## Verified assertion invariant

```text
verified badge
  = assertion reference
  + exact subject anchor
  + Evidence references
  + authorized verification policy/decision
  + scope and verification time
  + current validity/freshness state
```

Genome may associate these references and project the result. Evidence remains
the proof owner, and Governance remains the verifier/policy authority. The
visual badge cannot outlive or broaden the proof and policy on which it relies.

“Verified” never means authorized, capable, currently available, safe for all
uses, economically valuable or approved for execution.

## Verification lifecycle

A future projection must distinguish at least verified, unverified, stale,
disputed, revoked and unavailable proof semantics when applicable. Exact state
names remain a contract decision, but they cannot collapse into a boolean.

- Evidence correction or supersession triggers reevaluation; it does not
  rewrite the historical verification decision.
- Expiry or stale source data removes a current verified claim without deleting
  the historical decision.
- Revocation blocks current verified display and records actor, reason, time,
  policy and Evidence.
- Inaccessible Evidence produces unavailable/redacted proof state, not an
  unsupported verified claim.
- A decorative badge must never imitate verification language or iconography in
  a way that implies proof.

## Negative boundary

Badges cannot grant capabilities, permissions, credentials, Memory access,
Connections, Delegation, admission, Runtime selection, reputation, ranking,
ownership, transferability or economic rights. Composite “trust,” “quality,”
“fitness” and “value” badges are rejected unless a future separately authorized
domain defines their semantics; no such domain is authorized by EPIC-17.
