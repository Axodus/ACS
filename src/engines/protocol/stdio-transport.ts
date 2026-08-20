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
  readonly #options: StdioEngineTransportOptions;
  readonly #pending = new Map<string, Pending>();
  #child: ChildProcessWithoutNullStreams | undefined;
  #stdout: Interface | undefined;
  #closed = false;
  #startError: EngineTransportError | undefined;

  constructor(options: StdioEngineTransportOptions) {
    this.#options = options;
  }

  request(message: EngineRequest, timeoutMs = 5000): Promise<EngineResponse> {
    if (this.#closed) {
      return Promise.reject(this.#startError ?? new EngineTransportError("engine transport already closed"));
    }
    if (message.id === null) {
      return Promise.reject(new EngineTransportError("stdio transport requires a non-null request id"));
    }
    try {
      this.#ensureStarted();
    } catch (error) {
      return Promise.reject(error);
    }
    const child = this.#child;
    if (!child || this.#startError) {
      return Promise.reject(this.#startError ?? new EngineTransportError("engine process is not available"));
    }
    const requestId = message.id as string;
    return new Promise<EngineResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new EngineTimeoutError(`engine request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.#pending.set(requestId, { resolve, reject, timer });
      child.stdin.write(JSON.stringify(message) + "\n", "utf8", (error) => {
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
    this.#stdout?.close();
    this.#child?.stdin.end();
    if (this.#child && !this.#child.killed) {
      this.#child.kill();
    }
  }

  #ensureStarted(): void {
    if (this.#child || this.#startError) {
      if (this.#startError) throw this.#startError;
      return;
    }
    const child = spawn(this.#options.command, this.#options.args ?? [], {
      cwd: this.#options.cwd,
      env: this.#options.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.#child = child;
    child.on("error", (error) => {
      this.#failOpen(new EngineTransportError(`engine process failed to start: ${error.message}`));
    });
    if (!child.stdout) {
      this.#failOpen(new EngineTransportError("engine process has no stdout pipe"));
      return;
    }
    this.#stdout = createInterface({ input: child.stdout });
    this.#stdout.on("line", (line) => this.#onLine(line));
    child.on("exit", (code, signal) => {
      const error = new EngineTransportError(`engine process exited before response (code=${code} signal=${signal})`);
      this.#failOpen(error);
    });
  }

  #failOpen(error: EngineTransportError): void {
    this.#startError = error;
    this.#closed = true;
    for (const pending of this.#pending.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
  }

  #onLine(line: string): void {
    let payload: EngineResponse;
    try {
      payload = JSON.parse(line) as EngineResponse;
    } catch {
      const error = new EngineTransportError(`engine emitted malformed JSON: ${line}`);
      this.#failOpen(error);
      return;
    }
    const id = payload.id;
    if (id === null) {
      const error = new EngineTransportError("engine response did not include a correlation id");
      this.#failOpen(error);
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
