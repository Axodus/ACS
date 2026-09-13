# REQ-11 Lineage, Compatibility and Reconstruction

## No Genome lineage

Canonical identity and lineage remain:

```text
agent_id
  -> exact Agent revision
  -> fingerprint
```

Genome cannot create a Genome ID that competes with Agent identity, clone an
Agent revision stream or represent parent/offspring lineage. Trait definitions
and assertions have their own descriptive history requirements only.

## Compatibility semantics

Trait compatibility means that an assertion can be interpreted against an
exact trait-definition version or an explicit version crosswalk. It does not
mean that an Agent is operationally compatible with a Tool, model, Connection,
Workforce, Automation or Runtime.

- display-label equality is insufficient;
- a changed semantic meaning requires a new version/digest;
- deprecation does not rewrite retained assertions;
- crosswalks name exact source and target definitions, transformation/loss and
  provenance;
- no client silently resolves an old trait to latest;
- an incompatible or missing definition is shown as unresolved, not guessed.

Operational compatibility remains with governed-resource, configuration and
admission owners from REQ-03/04.

## Historical reconstruction manifest

A retained trait/presentation view needs, as applicable:

```text
exact canonical subject reference
exact Agent revision or head/presentation observation
exact trait-definition version/digest
assertion reference/digest and origin
source and Evidence references
verification policy/decision and validity state
presentation-asset reference/digest and binding
projection contract/version and rendered/observed time
visibility/redaction and reconstruction findings
```

Trait-definition changes, assertion correction/supersession, verification
changes and asset replacement append history or create immutable observations.
They never rewrite an earlier retained view.

## Known reconstruction limits

- REQ-01 `E17-R01-B02` leaves some Agent head/lifecycle history incomplete.
- REQ-02 has no implemented durable presentation-state history.
- REQ-04 proves durable fingerprinted lineage only for some resource classes.
- REQ-11 finds no implemented trait, assertion, asset-binding or verification
  history.

A future projection reports these gaps. Current heads, current assets or latest
trait definitions cannot substitute for missing historical inputs.

Valid deletion may remove content while preserving safe references, digests,
tombstones, policy decisions and Evidence. Reconstruction does not authorize
resurrection of erased media, restricted Evidence or personal data.
