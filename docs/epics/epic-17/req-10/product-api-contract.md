# REQ-10 Product API Contract

## Single application boundary

Future EPIC-17 resources extend the existing authenticated, Tenant-aware
Product API under its accepted versioning policy. Exact paths and payloads are
future contract/IMP decisions. A parallel Genome, Automation, Administration or
frontend-specific API is rejected.

The Product API has two bounded roles:

1. project canonical owner state into application-safe read models;
2. adapt an authorized command to exactly one canonical owner.

It does not become the persistence, policy, lifecycle or runtime owner.

## Projection metadata

Each future projection must expose enough information to prevent ambiguity:

- projection contract/version and generated/observed time;
- canonical kind, stable identity and Tenant/scope;
- exact source revision/fingerprint or immutable observation/digest;
- current lifecycle/status with source and freshness semantics;
- source owner and authority class;
- explicit compatibility/loss markers for legacy projections;
- available actions with server-evaluated availability, reason and confirmation
  requirement;
- typed cross-domain references and correlation IDs;
- warnings, blockers, Evidence gaps and historical reconstruction status;
- redaction/minimization markers where sensitive data is omitted.

An unavailable source is not an empty collection, default value, false grant or
healthy state. The API returns explicit unavailable/unsupported/partial
semantics with stable errors or findings.

## Command adapter

A future administrative command must route to one owner and preserve:

- authenticated actor and explicit Tenant/scope;
- action-specific authority and policy decision;
- expected revision/CAS or other owner-defined concurrency precondition;
- idempotency key and semantic request digest;
- reason/purpose and exact target/source references;
- correlation/causation IDs;
- owner result/receipt and Event/Evidence/outbox linkage;
- asynchronous acceptance semantics where the existing owner requires them;
- secret-safe response and audit projection.

Product API action metadata never grants authority. It reports what the server
currently allows or why an action is unavailable; the command revalidates at
execution time.

## Compatibility and versioning

- additive EPIC-17 projections stay under the existing Product API major
  version until a real breaking contract requires the accepted versioning
  process;
- legacy fields are labeled as compatibility and cannot be used to reconstruct
  omitted canonical state;
- a read projection is not automatically a write DTO;
- breaking owner semantics cannot be hidden behind a frontend mapper;
- unsupported mutation fails explicitly and never falls back to a legacy owner;
- lists/details/history preserve pagination/filter/ordering and Tenant
  isolation contracts defined by the future endpoint design.

## Client boundary

The Control Plane communicates only through the Product API. Direct browser
access to repositories, databases, environment files, OpenClaw state, provider
APIs, SecretStore, Memory Store or engine internals remains prohibited.
