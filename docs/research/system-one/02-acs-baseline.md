# 02 — ACS current baseline

## ACS repository facts

The current ACS documentation describes an established, local-first,
config-first, inspection-oriented, execution-gated control plane. It retains
no mutation authority and does not adopt external providers merely because they
are documented or available.

The post-EPIC-17 / ACS v2 discovery baseline assigns the following ownership:

| Concern | ACS baseline owner | Relevance to System One |
| --- | --- | --- |
| Agent identity and revision | ACS | System One may evaluate a referenced revision; it cannot define identity. |
| Workforce/workflow definitions | ACS | System One may propose classification or routing input; ACS owns the definition and run. |
| Authority and governance | Governance plus authorized ACS policy references | A judgment can inform policy; it cannot authorize itself. |
| Runtime and execution plan | ACS boundary plus selected executor/runner | System One cannot bypass an authorized plan. |
| Evidence and provenance | ACS, with provider observations linked or ingested | A provider result is a judgment about evidence, not canonical Evidence truth. |
| Product/API surface | ACS | This research does not modify the API. |
| Domain/institutional knowledge | Owning Axodus nucleus and governed references | Context must remain scoped and provenance-bearing. |

## Relevant existing capabilities

ACS already has deterministic orchestration, policy and capability checks,
read-only inspection, operational state, blocked-action behavior, telemetry and
receipt concepts, provider/executor boundaries, and explicit security gates.
The repository also contains an Agentic Genetics research path that rejects
collapsing observed performance into universal fitness, reputation, authority,
or economic value.

## Baseline constraints

The ACS status and security records preserve these constraints:

- no production credentials or provider calls;
- no production APIs or databases;
- no wallet, treasury, trading, settlement, payout, or billing execution;
- no hidden execution or governance bypass;
- no production mutation authority;
- missing telemetry must be represented as unavailable, not fabricated.

## Baseline implication

System One must be compared with the existing control plane, not used as a
reason to redesign it. Any future adapter would sit below ACS-owned policy and
above a provider boundary, with canonical IDs, revisions, authority references,
and evidence lineage remaining portable in ACS.
