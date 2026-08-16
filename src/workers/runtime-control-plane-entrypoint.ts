import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createAcsHttpServer } from "../http/server.js";

export async function runRuntimeControlPlaneFromEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const host = environment.ACS_HTTP_HOST ?? "127.0.0.1";
  const port = optionalPort(environment.ACS_HTTP_PORT);
  const runtime = await createAcsHttpServer();
  await new Promise<void>((resolveListen, reject) => {
    runtime.server.once("error", reject);
    runtime.server.listen(port, host, resolveListen);
  });
  const address = runtime.server.address();
  if (!address || typeof address === "string") throw new Error("runtime control plane did not bind a TCP address");
  return {
    ...runtime,
    host,
    port: address.port,
    close: async () => {
      await new Promise<void>((resolveClose, reject) => {
        runtime.server.close((error) => error ? reject(error) : resolveClose());
      });
      await runtime.context.close();
    },
  };
}

async function main(): Promise<void> {
  const runtime = await runRuntimeControlPlaneFromEnvironment();
  process.stdout.write(JSON.stringify({
    success: true,
    service: "acs-runtime-control-plane",
    host: runtime.host,
    port: runtime.port,
    processId: process.pid,
    runtimeMode: runtime.context.runtimeMode,
    runtimeAdapter: runtime.context.productionAdapters.runtime.adapter,
  }) + "\n");
}

function optionalPort(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 65_535) throw new Error("ACS_HTTP_PORT is invalid");
  return parsed;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  void main().catch((error) => {
    process.stderr.write(JSON.stringify({
      success: false,
      service: "acs-runtime-control-plane",
      error: error instanceof Error ? error.message : String(error),
    }) + "\n");
    process.exitCode = 1;
  });
}
