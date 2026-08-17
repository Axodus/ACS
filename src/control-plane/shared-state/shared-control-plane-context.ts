import {
  PostgresSharedAuthoritativeState,
  sharedStateOptionsFromEnvironment,
  type PostgresSharedAuthoritativeStateOptions,
} from "./postgres-shared-state.js";
import { SharedAuthorityService, SharedRuntimeCoordinator } from "./shared-authority-service.js";
import type { SharedAuthoritativeState, SharedStateHealth } from "./contracts.js";

export interface SharedControlPlaneContext {
  readonly instanceId: string;
  readonly state: SharedAuthoritativeState;
  readonly authority: SharedAuthorityService;
  readonly runtime: SharedRuntimeCoordinator;
  readonly productionComposition: {
    readonly profile: "shared";
    readonly localAuthorityFallback: false;
    readonly networkIoCapable: true;
    readonly schemaVersion: number;
    readonly topology: "shared_network_database";
  };
  readiness(): Promise<SharedStateHealth & { readonly status: "READY" | "BLOCKED" }>;
  close(): Promise<void>;
}

export interface SharedControlPlaneContextOptions extends PostgresSharedAuthoritativeStateOptions {
  readonly instanceId: string;
  readonly migrate?: boolean;
  readonly leaseTtlMs?: number;
  readonly workerStaleAfterMs?: number;
}

export async function createSharedControlPlaneContext(options: SharedControlPlaneContextOptions): Promise<SharedControlPlaneContext> {
  if (!options.instanceId.trim()) throw new Error("shared Control Plane instanceId is required");
  const state = new PostgresSharedAuthoritativeState(options);
  try {
    const schemaVersion = options.migrate === false ? await state.schemaVersion() : await state.migrate();
    const health = await state.health();
    if (!health.reachable || !health.writable || !health.schemaCurrent) {
      throw new Error(`shared authoritative state is not ready: ${health.reasonCode ?? "UNKNOWN"}`);
    }
    return {
      instanceId: options.instanceId,
      state,
      authority: new SharedAuthorityService(state),
      runtime: new SharedRuntimeCoordinator(state, {
        leaseTtlMs: options.leaseTtlMs,
        workerStaleAfterMs: options.workerStaleAfterMs,
      }),
      productionComposition: {
        profile: "shared",
        localAuthorityFallback: false,
        networkIoCapable: true,
        schemaVersion,
        topology: "shared_network_database",
      },
      async readiness() {
        const current = await state.health();
        return {
          ...current,
          status: current.reachable && current.writable && current.schemaCurrent ? "READY" : "BLOCKED",
        };
      },
      close: () => state.close(),
    };
  } catch (error) {
    await state.close().catch(() => undefined);
    throw error;
  }
}

export async function createSharedControlPlaneContextFromEnvironment(input: {
  readonly instanceId: string;
  readonly environment?: NodeJS.ProcessEnv;
}): Promise<SharedControlPlaneContext> {
  return createSharedControlPlaneContext({
    ...sharedStateOptionsFromEnvironment(input.environment),
    instanceId: input.instanceId,
  });
}
