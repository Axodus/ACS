# REQ-03 Snapshot, Fingerprint and Reconstruction

## 1. Logical snapshot contract

REQ-03 proposes one logical `EffectiveConfigurationSnapshot` concept for each
admitted binding generation. This name does not authorize an entity, table or
API. A future contract must capture:

```text
snapshot identity and schema/resolver version
Run / Task / assignment / generation / intent correlation
exact Agent / Workforce / Workflow revision references
head and lifecycle admission observation/decision references
per-class source references and normalized inputs
per-class rule/version and resolution decisions
resolved selections, limits, requirements and allowed resources
policy/economic/capability/approval Evidence references
opaque credential/lease references without values
input fingerprint and effective fingerprint
resolved_at, resolver identity and provenance
predecessor/supersession reason when re-admitted
```

The representation may be embedded in or referenced by existing binding/intent
contracts. REQ-03 does not choose persistence topology.

## 2. Fingerprints

- Canonical serialization must be stable, key-ordered and schema-versioned.
- `input_fingerprint` covers exact source refs, captured mutable admission facts,
  operation inputs, resolver version and class-rule versions.
- `effective_fingerprint` covers all resolved non-secret values, exact refs,
  decisions and applicability markers.
- The existing `ExecutionBindingV2.plan_fingerprint` may reference or be
  defined over the accepted effective fingerprint in a later contract; current
  code does not prove that equivalence.
- Runtime intent, Attempt, checkpoint and Evidence must be able to identify the
  same admitted snapshot/binding generation.
- Secret values, volatile tokens and raw Memory content are excluded.

## 3. Reconstruction rule

Historical reconstruction reads the immutable snapshot and its exact source
references. It never re-runs resolution against current heads, catalogs,
policies, prices, provider availability or secrets.

Reconstruction must:

1. load the stored snapshot or immutable referenced representation;
2. validate schema/resolver version and both fingerprints;
3. verify exact immutable source fingerprints where sources remain available;
4. verify binding/intent/assignment/Run correlation;
5. identify late-bound secret lease and runtime observations by opaque Evidence
   refs, without obtaining secret values;
6. report unavailable historical head/lifecycle sources explicitly;
7. reproduce the effective non-secret configuration or fail with typed
   integrity/unavailability status.

## 4. REQ-01 B02 treatment

The snapshot does not solve missing Agent head/lifecycle history by copying all
head fields into `AgentRevisionV2`. At admission it must record the exact source
or immutable observed value plus event/decision provenance needed by the class.
If accepted history cannot support that claim, the snapshot records a typed
historical-source gap and cannot assert full reconstruction for that field.

Lifecycle eligibility is an admission fact and decision. Behavioral semantics
remain revision state. This preserves ownership while a later Agent contract
resolves `E17-R01-B02`.

## 5. Mutation and recovery

An admitted snapshot is immutable. Configuration changes create a new authored
revision, head/lifecycle decision or policy/resource version, followed by a new
admission/snapshot when applicable. Runtime recovery uses the existing intent,
assignment generation, Attempt, checkpoint, lease and fencing boundaries. It
must not refresh configuration silently.

Superseded snapshots remain reconstructable and cannot be reused for a
different assignment generation without an explicit idempotent equivalence
decision.
