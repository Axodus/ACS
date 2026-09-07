import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";
import { EngineTimeoutError, EngineTransportError } from "./errors.js";
import type { EngineRequest, EngineResponse, EngineTransport } from "./types.js";

export type StdioEngineTransportOptions = {
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  command: string;
};

type Pending = {
  reject: (error: unknown) => void;
  resolve: (response: EngineResponse) => void;
  timer?: NodeJS.Timeout;
};

export class StdioEngineTransport implements EngineTransport {
  readonly #child: ChildProcessWithoutNullStreams;
  readonly #stdout: Interface;
  readonly #pending = new Map<string, Pending>();
  #closed = false;

  constructor(options: StdioEngineTransportOptions) {
    this.#child = spawn(options.command, options.args ?? [], {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.#stdout = createInterface({ input: this.#child.stdout });
    this.#stdout.on("line", (line) => this.#onLine(line));
    this.#child.on("exit", (code, signal) => {
      const error = new EngineTransportError(`engine process exited before response (code=${code} signal=${signal})`);
      for (const pending of this.#pending.values()) {
        if (pending.timer) clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.#pending.clear();
      this.#closed = true;
    });
  }

  request(message: EngineRequest, timeoutMs = 5000): Promise<EngineResponse> {
    if (this.#closed) {
      return Promise.reject(new EngineTransportError("engine transport already closed"));
    }
    if (message.id === null) {
      return Promise.reject(new EngineTransportError("stdio transport requires a non-null request id"));
    }
    const requestId = message.id as string;
    return new Promise<EngineResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new EngineTimeoutError(`engine request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.#pending.set(requestId, { resolve, reject, timer });
      this.#child.stdin.write(JSON.stringify(message) + "\n", "utf8", (error) => {
        if (error) {
          clearTimeout(timer);
          this.#pending.delete(requestId);
          reject(new EngineTransportError(`failed to write engine request: ${error.message}`));
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#stdout.close();
    this.#child.stdin.end();
    if (!this.#child.killed) {
      this.#child.kill();
    }
  }

  #onLine(line: string): void {
    let payload: EngineResponse;
    try {
      payload = JSON.parse(line) as EngineResponse;
    } catch {
      const error = new EngineTransportError(`engine emitted malformed JSON: ${line}`);
      for (const pending of this.#pending.values()) {
        if (pending.timer) clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.#pending.clear();
      return;
    }
    const id = payload.id;
    if (id === null) {
      const error = new EngineTransportError("engine response did not include a correlation id");
      for (const pending of this.#pending.values()) {
        if (pending.timer) clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.#pending.clear();
      return;
    }
    const pending = this.#pending.get(id as string);
    if (!pending) {
      return;
    }
    if (pending.timer) clearTimeout(pending.timer);
    this.#pending.delete(id as string);
    pending.resolve(payload);
  }
}
