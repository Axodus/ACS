# Product API boundary

HTTP routes call the read adapter. The adapter calls `AsyncNativeCoreRepository`. Canonical writes remain native commands. No route updates canonical or read tables directly.

When native core is unavailable in a local context, these Workforce routes are not synthesized from legacy services.
