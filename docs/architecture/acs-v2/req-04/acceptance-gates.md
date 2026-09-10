# REQ-04 — IMP-01B Acceptance Gates

These gates define the exact evidence required before IMP-01B can report
durable foundation completion. They are acceptance requirements, not work
performed by REQ-04.

Every test must record setup, command, exit status, relevant identifiers,
database state before/after, and whether the result is PASS, FAIL, or NOT
APPLICABLE. A passing focused test does not erase an unrelated
ACS-BLOCKER-014 failure.

## Required gates

| Gate | Required evidence | Pass condition |
| --- | --- | --- |
| Agent restart reconstruction | Create one Agent and at least three revisions, close/reinitialize the persistence/runtime boundary, load head and history | Same Agent identity, ordered revisions, predecessor references, fingerprints, and head are reconstructed |
| Revision immutability | Persist a canonical historical revision, attempt payload/fingerprint/predecessor mutation through repository and direct supported boundary | Mutation is rejected or impossible by schema/ownership; historical payload remains byte-equivalent |
| Concurrent revision safety | Submit two revisions against the same expected head concurrently | Exactly one head advance commits; the other returns deterministic conflict; history has no silent fork |
| Fingerprint integrity | Persist valid revision, recompute fingerprint, test altered content and duplicate lineage fingerprint | Recomputed value matches; altered content and duplicate identity are rejected according to contract |
| Event atomicity | Force failure before commit and during the command transaction; inspect state, event, outbox, and idempotency tables | No partial logical operation is visible; committed operation has all four durable records |
| Pending event recovery | Commit an operation while delivery remains pending, terminate/reinitialize dispatcher/runtime | Pending outbox record survives and is claimable after restart |
| Duplicate delivery | Deliver/process the same event more than once, including lost acknowledgement simulation | Transport may repeat, but consumer result and canonical state remain correct |
| Fencing | Use expired lease, wrong worker instance, wrong service principal, and stale fencing token for state and event-producing operations | All stale writes and corresponding event creation are rejected under existing fencing rules |
| Runtime recovery | Kill or simulate loss of an owner after lease acquisition and before terminal result | Assignment expires, retry/recovery is deterministic, fencing increments, prior attempt remains evidence |
| Idempotency | Repeat same command key with same request hash and then with different hash, including concurrent first requests | Same request returns original result; different request conflicts; no duplicate event/state mutation |
| Event reconstruction | Commit canonical events for Agent and runtime entities, restart, query by event identity and aggregate | Event payload, sequence, correlation, causation, aggregate reference, and schema version survive |
| Replay | Replay a bounded canonical event stream into an isolated ACS reconstruction target | Result is deterministic, duplicate-safe, and performs no prohibited external call |
| Usage/cost duplicate safety | Ingest duplicate usage and cost inputs linked to the same Run/Task/Attempt | Existing economic idempotency prevents duplicate logical records or emits an explicit correction |
| Migration safety | Apply additive migration on an empty database and a representative existing schema | Migration is repeatable, transactional, non-destructive, and leaves existing records readable |
| Security boundary | Attempt provider/executor identity substitution, cross-Agent event reference, secret payload, malformed fingerprint, and unauthorized direct mutation | Validation fails closed and no canonical record is corrupted or exposed |

## Projection gate

NOT APPLICABLE for IMP-01B. The selected v1 architecture does not require a
projection/read-model subsystem. Do not substitute an in-memory list or a
reporting query for projection rebuild evidence.

## Evidence package format

IMP-01B should provide:

1. focused test files and their exact command output;
2. schema migration names and checksums or equivalent migration identity;
3. a concise state/event/outbox/idempotency inspection record for failure tests;
4. restart logs showing durable identifiers before and after reinitialization;
5. a fencing and duplicate-delivery result matrix;
6. replay side-effect isolation evidence;
7. source-change and dependency audit;
8. separate ACS-BLOCKER-014 status with no reclassification by implication.

## Completion gate

IMP-01B may report durable foundation completion only when every applicable
gate above is PASS, the projection gate is recorded as NOT APPLICABLE, no
canonical ownership is delegated to an external executor/provider, and the
repository-wide blocker remains accurately reported.
