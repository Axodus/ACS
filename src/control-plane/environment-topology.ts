export type AcsEnvironment = "local" | "development" | "production";
export type DispatchMode = "local" | "remote";
export type OpenClawWorkerMode = "local" | "cloud" | "remote" | "disabled";
export type OpenClawTransport = "stdio" | "https";

export interface EnvironmentTopology {
  readonly environment: AcsEnvironment;
  readonly adapterProfile: "development" | "production";
  readonly dispatchMode: DispatchMode;
  readonly workerMode: OpenClawWorkerMode;
  readonly workerTransport: OpenClawTransport;
  readonly httpHost: string;
  readonly httpPort: number;
}

function normalizeEnvironment(raw: string | undefined): AcsEnvironment {
  const value = raw?.trim();
  switch (value) {
    case "local":
    case "development":
    case "production":
      return value;
    case undefined:
    case "":
      return "development";
    default:
      throw new Error("ACS_ENVIRONMENT must be local, development, or production");
  }
}

function normalizeDispatchMode(raw: string | undefined, environment: AcsEnvironment): DispatchMode {
  const value = raw?.trim();
  switch (value) {
    case undefined:
    case "":
      return environment === "local" ? "local" : "remote";
    case "local":
    case "remote":
      return value;
    default:
      throw new Error("ACS_DISPATCH_MODE must be local or remote");
  }
}

function normalizeWorkerMode(raw: string | undefined, environment: AcsEnvironment): OpenClawWorkerMode {
  const value = raw?.trim();
  switch (value) {
    case undefined:
    case "":
      return environment === "local" ? "local" : environment === "development" ? "cloud" : "remote";
    case "local":
    case "cloud":
    case "remote":
    case "disabled":
      return value;
    default:
      throw new Error("ACS_OPENCLAW_WORKER_MODE must be local, cloud, remote, or disabled");
  }
}

function normalizeTransport(raw: string | undefined, workerMode: OpenClawWorkerMode): OpenClawTransport {
  const value = raw?.trim();
  switch (value) {
    case undefined:
    case "":
      return workerMode === "local" ? "stdio" : "https";
    case "stdio":
    case "https":
      return value;
    default:
      throw new Error("ACS_OPENCLAW_TRANSPORT must be stdio or https");
  }
}

function parsePort(raw: string | undefined, fallback: number): number {
  const value = Number(raw ?? String(fallback));
  if (!Number.isSafeInteger(value) || value <= 0 || value > 65535) {
    throw new Error("ACS_HTTP_PORT must be a valid TCP port");
  }
  return value;
}

export function resolveEnvironmentTopology(environment: NodeJS.ProcessEnv = process.env): EnvironmentTopology {
  const normalizedEnvironment = normalizeEnvironment(environment.ACS_ENVIRONMENT);
  const workerMode = normalizeWorkerMode(environment.ACS_OPENCLAW_WORKER_MODE, normalizedEnvironment);
  return {
    environment: normalizedEnvironment,
    adapterProfile: normalizedEnvironment === "production" ? "production" : "development",
    dispatchMode: normalizeDispatchMode(environment.ACS_DISPATCH_MODE, normalizedEnvironment),
    workerMode,
    workerTransport: normalizeTransport(environment.ACS_OPENCLAW_TRANSPORT, workerMode),
    httpHost: environment.ACS_HTTP_HOST?.trim() || (normalizedEnvironment === "local" ? "127.0.0.1" : "0.0.0.0"),
    httpPort: parsePort(environment.ACS_HTTP_PORT, normalizedEnvironment === "production" ? 8080 : 8788),
  };
}

export function formatEnvironmentTopology(topology: EnvironmentTopology): string {
  return [
    "environment=" + topology.environment,
    "adapterProfile=" + topology.adapterProfile,
    "dispatchMode=" + topology.dispatchMode,
    "workerMode=" + topology.workerMode,
    "workerTransport=" + topology.workerTransport,
    "httpHost=" + topology.httpHost,
    "httpPort=" + topology.httpPort,
  ].join(";");
}
