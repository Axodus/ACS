# REQ-11 Security, Product API and Control Plane

## Product API boundary

Future trait, assertion, asset-binding, badge and derived-view projections may
be added only under the existing Product API policy after their canonical
contracts are authorized. A parallel Genome API or client-owned Genome state is
rejected.

Projection metadata follows REQ-10 and includes exact subject/source identity,
definition/assertion version or digest, provenance, Evidence/verification
state, visibility, freshness, compatibility loss and reconstruction gaps.

Administrative actions route to one owner. Product API and Control Plane do not
verify claims, issue authority, mutate Evidence, write storage bytes directly
or infer traits from UI state.

## Tenant, visibility and disclosure

- Trait definitions, assertions, asset bindings and verification decisions
  declare Tenant/global scope and canonical owner.
- List, search, detail, history and reference lookup apply the same fail-closed
  Tenant visibility and non-disclosure rules.
- Public-looking Profile metadata or a decorative badge does not make an Agent,
  assertion, source asset or Evidence public.
- Derived visibility cannot exceed the most restrictive applicable subject,
  source, Evidence, consent, license, policy or asset classification.
- Restricted/redacted proof cannot support a public “verified” presentation
  unless an authorized policy defines a safe public attestation that reveals no
  protected material.
- Traits and assets contain no credentials, secret material, private Memory or
  hidden behavioral instructions.

## Control Plane

The Control Plane may display classification, source, verification and history
states through `Flow -> Module -> Screen`, with canonical drill-down to Agent,
Evidence and owning projections. It must distinguish decorative, asserted,
verified, stale, disputed, revoked, unavailable and redacted semantics.

The REQ-10 Administration IA divergence remains open. REQ-11 does not assign a
Genome route, move Administration, or authorize a navigation/module redesign.
REQ-12 must classify that inherited blocker before any UI IMP plan.

## Mutation and correction safety

Any future assertion, binding or verification command requires authenticated
actor, Tenant, explicit owner authority, policy, exact target/source,
CAS/idempotency where applicable, reason, correlation and Event/Evidence
linkage. The UI-projected ability to act is advisory and the owner revalidates
the command.

Correction, revocation, dispute, deletion and legal erasure are distinct. Their
future owner contracts must preserve history without exposing or resurrecting
removed content.
