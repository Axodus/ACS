# Implementation map

| Boundary | Implementation |
| --- | --- |
| Canonical reads | `PostgresNativeCoreRepository` |
| Read adapter | `src/control-plane/product-api-workforce.ts` |
| HTTP routes | `src/http/routes/product-api-routes.ts` |
| Context wiring | optional `ControlPlaneContext.nativeCore` |
| Persistence | existing migration 5, 6 and 7 tables |

The adapter validates native payloads, preserves admitted revision references, and orders histories by canonical timestamp plus stable ID.
