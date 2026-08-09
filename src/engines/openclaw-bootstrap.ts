import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EngineProtocolClient } from "./protocol/client.js";
import { StdioEngineTransport } from "./protocol/stdio-transport.js";
import { createOpenClawEngineAdapter } from "./openclaw-engine-adapter.js";
import type { AgentEngine } from "./agent-engine.js";

export interface OpenClawBootstrapOptions {
  readonly acsRoot: string;
  readonly pythonCommand?: string;
  readonly timeoutMs?: number;
  readonly runtimeRoot: string;
  readonly stateRoot: string;
  readonly configRoot: string;
  readonly artifactsRoot: string;
  readonly workspaceRoot: string;
}

type EngineManifest = {
  source: {
    path: string;
  };
};

export function createOpenClawEngineFromManifest(options: OpenClawBootstrapOptions): AgentEngine {
  const manifestPath = resolve(options.acsRoot, "engines", "agentsai.manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as EngineManifest;
  const sourceRoot = resolve(options.acsRoot, manifest.source.path);
  const transport = new StdioEngineTransport({
    command: options.pythonCommand ?? "python3",
    args: ["-m", "acs.protocol.stdio"],
    cwd: sourceRoot,
    env: {
      ...process.env,
      PYTHONPATH: resolve(sourceRoot, "src"),
      ACS_SOURCE_ROOT: sourceRoot,
      ACS_RUNTIME_ROOT: options.runtimeRoot,
      ACS_STATE_ROOT: options.stateRoot,
      ACS_CONFIG_ROOT: options.configRoot,
      ACS_ARTIFACTS_ROOT: options.artifactsRoot,
      ACS_WORKSPACE_ROOT: options.workspaceRoot,
    },
  });
  const client = new EngineProtocolClient(transport, { timeoutMs: options.timeoutMs ?? 5000 });
  return createOpenClawEngineAdapter(client);
}
