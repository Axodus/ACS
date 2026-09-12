# ACS v2 IMP-03E

IMP-03E adds the Product API read boundary for Workforce operations. It reads canonical PostgreSQL state through `AsyncNativeCoreRepository`; it does not add projection tables or move authority into HTTP.

Implemented routes are additive: Workforce list/detail/revisions, Run Workforce and membership, Task coordination/assignments, and Task runtime. The local context exposes these routes only when a native core adapter is supplied; the shared PostgreSQL context already provides `state.nativeCore` for composition by an HTTP host.

Writes remain in the native core and no scheduler, provider routing, cache, broker, or Cost contract changes were introduced.
