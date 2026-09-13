# REQ-01 Compatibility and Deprecation Rules

## 1. Compatibility rules

1. Native Agent state is the source for canonical reads and all future
   canonical writes.
2. Product API may project Native state into an older response shape only when
   loss and unsupported actions are explicit.
3. A compatibility projection never grants mutation authority and cannot be
   round-tripped into `AgentRevisionV2` without an explicit mapper and
   validation.
4. Legacy rows remain readable during a bounded migration period. They are not
   Native rows and do not become canonical through `record_kind` relabeling.
5. A single `agent_id` has one authoritative lineage. Dual write and split
   heads are rejected.
6. Historical references are never silently remapped to another revision or
   fingerprint.
7. Provider/executor artifacts contain replaceable compiled configuration and
   never become Agent records.
8. Typed lineage/integrity errors must not be collapsed into ordinary not-found
   results at a canonical boundary.

## 2. Legacy destination map

| Legacy capability | Required destination | Deprecation condition |
| --- | --- | --- |
| `AgentDefinition`/`AgentRevision` read shape | Versioned Product API compatibility DTO or explicit Native projection | All supported consumers read a documented projection with loss semantics. |
| `AgentService.create/update/createRevision` | Native lineage command adapter | Governance, idempotency, event/outbox and expected-head behavior have accepted tests. |
| Legacy archive/restore | Native lifecycle command under the same Agent aggregate | Head/lifecycle history is reconstructable without a second stream. |
| Legacy adopt/restore revision | Append a new Native revision based on selected historical content | Prior revision remains immutable and new provenance identifies the source revision. |
| Legacy delete/remove | Archive/disable for Native Agents; legal erasure requires separate policy | No ordinary canonical operation physically deletes Native history. |
| Legacy composition | Future accepted configuration/resource resolver | REQ-02 through REQ-04 freeze Profile and governed resource semantics. |
| Legacy deployment/readiness inputs | Exact Native Agent revision reference plus accepted compatibility adapter | Operational paths no longer require legacy Agent truth. |
| `record_kind='legacy'` persistence | Explicit read/migration adapter | Every migrated record has source identity, mapping version, loss report and evidence. |

## 3. Migration candidates

No migration is authorized. A future migration plan may consider:

- inventorying legacy rows and callers by Tenant and operational references;
- rejecting ID collisions between legacy and Native records;
- producing a deterministic legacy-to-Native candidate with a mapper version,
  field-loss report and provenance;
- validating all required policy/resource references before creating Native
  revision 1;
- atomically creating the Native lineage through the canonical command;
- retaining the original legacy record read-only until every external
  reference is reconciled;
- switching reads before writes only when mutation routing is fail-closed;
- removing legacy write paths only after rollback and historical-read gates.

A big-bang conversion, destructive rewrite, background silent dual write or
new Agent database is rejected.

## 4. Deprecation candidates

The following are candidates, not actions authorized by REQ-01:

- canonical use of `InMemoryAgentRepository`;
- legacy `AgentRepository.remove` for Native identities;
- direct Product API mutation calls to `AgentService` when Native Core is the
  configured read owner;
- treating `AgentDefinition` or `AgentRevision` as canonical domain names;
- unversioned/loss-implicit Native-to-legacy mapping;
- swallowing Native lineage integrity errors as not-found;
- deployment/readiness code that resolves canonical Agents through legacy
  `AgentService`.

## 5. Downstream rule

REQ-02 and every later REQ use the Native identity/reference vocabulary. They
may consume the current Product API projection for evidence, but cannot add
fields to the legacy model and call that a new canonical Agent contract.
