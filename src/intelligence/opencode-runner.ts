import { Buffer } from "node:buffer";
import type { CredentialProvider } from "./credential-connection.js";
import type {
  AgentRunner,
  RunnerCapabilities,
  RunnerExecutionRequest,
  RunnerExecutionResult,
  RunnerExecutionStatus,
  RunnerHealth,
  RunnerFinding,
} from "./agent-runner.js";
import { AgentRunnerUnsupportedOperationError } from "./agent-runner.js";
import type { SecretStore } from "./secret-store.js";
import type { OpenCodeTransport } from "./opencode-transport.js";

export class OpenCodeRunner implements AgentRunner {
  readonly id = "opencode";
  readonly displayName = "OpenCode";

  readonly #transport: OpenCodeTransport;
  readonly #endpoint: string;
  readonly #connectionId: string | undefined;
  readonly #credentialProvider: CredentialProvider | undefined;
  readonly #secretStore: SecretStore | undefined;
  readonly #username: string;

  constructor(input: {
    endpoint?: string;
    transport: OpenCodeTransport;
    connectionId?: string;
    credentialProvider?: CredentialProvider;
    secretStore?: SecretStore;
    username?: string;
  }) {
    this.#endpoint = input.endpoint ?? "http://127.0.0.1:4096";
    this.#transport = input.transport;
    this.#connectionId = input.connectionId;
    this.#credentialProvider = input.credentialProvider;
    this.#secretStore = input.secretStore;
    this.#username = input.username ?? "opencode";
  }

  async health(): Promise<RunnerHealth> {
    try {
      const headers = await this.#buildHeaders();
      const response = await this.#transport.get(
        "/global/health",
        headers ? { headers, timeoutMs: 5000 } : { timeoutMs: 5000 },
      );
      if (response.status === 401 || response.status === 403) {
        return {
          runnerId: this.id,
          status: "not-authenticated",
          observedAt: Date.now(),
          findings: [{ code: "OPENCODE_AUTH_REQUIRED", severity: "warning", message: "OpenCode server requires authentication" }],
        };
      }
      if (response.status >= 400) {
        return {
          runnerId: this.id,
          status: "degraded",
          observedAt: Date.now(),
          findings: [{ code: "OPENCODE_HTTP_ERROR", severity: "warning", message: "OpenCode server returned HTTP status " + response.status }],
        };
      }
      const findings: RunnerFinding[] = [];
      if (!this.#isPrivateEndpoint()) {
        findings.push({ code: "OPENCODE_NON_PRIVATE_BINDING", severity: "warning", message: "OpenCode endpoint is not a localhost/private endpoint" });
      }
      return {
        runnerId: this.id,
        status: "authenticated",
        observedAt: Date.now(),
        findings,
      };
    } catch {
      return {
        runnerId: this.id,
        status: "unavailable",
        observedAt: Date.now(),
        findings: [{ code: "OPENCODE_UNAVAILABLE", severity: "warning", message: "OpenCode service is unavailable at the configured endpoint" }],
      };
    }
  }

  async capabilities(): Promise<RunnerCapabilities> {
    const headers = await this.#buildHeaders();
    const response = await this.#transport.get(
      "/config/providers",
      headers ? { headers, timeoutMs: 5000 } : { timeoutMs: 5000 },
    );
    if (response.status === 401 || response.status === 403) {
      return {
        runnerId: this.id,
        supportedConnectionTypes: ["local-runner", "subscription", "oauth"],
        supportedProviders: [],
        supportsExecution: false,
        supportsInspection: false,
        supportsCancellation: false,
        environmentScope: "local-only",
      };
    }
    if (response.status >= 400) {
      throw new Error("OpenCode capability discovery failed");
    }
    const jsonRecord = response.json && typeof response.json === "object"
      ? response.json as Record<string, unknown>
      : {};
    const providers = Array.isArray(jsonRecord.providers) ? jsonRecord.providers : [];
    return {
      runnerId: this.id,
      supportedConnectionTypes: ["local-runner", "subscription", "oauth"],
      supportedProviders: providers.map((entry: unknown) => {
        const record = entry && typeof entry === "object" ? entry as Record<string, unknown> : null;
        if (record && typeof record.id === "string") return record.id;
        if (record && typeof record.name === "string") return record.name;
        return "unknown";
      }),
      supportsExecution: false,
      supportsInspection: false,
      supportsCancellation: false,
      environmentScope: "local-only",
    };
  }

  async execute(_request: RunnerExecutionRequest): Promise<RunnerExecutionResult> {
    throw new AgentRunnerUnsupportedOperationError("OpenCode execution is not enabled in S12");
  }

  async inspect(executionId: string): Promise<RunnerExecutionStatus> {
    return {
      executionId,
      status: "unsupported",
      message: "OpenCode execution inspection is not enabled in S12",
    };
  }

  async cancel(_executionId: string): Promise<void> {
    throw new AgentRunnerUnsupportedOperationError("OpenCode cancellation is not enabled in S12");
  }

  async #buildHeaders(): Promise<Readonly<Record<string, string>> | undefined> {
    if (!this.#connectionId || !this.#credentialProvider || !this.#secretStore) {
      return undefined;
    }
    const lease = await this.#credentialProvider.resolve(this.#connectionId, "opencode:http-auth");
    if (!lease.secretRef) {
      return undefined;
    }
    const password = await this.#secretStore.get(lease.secretRef);
    const token = Buffer.from(this.#username + ":" + password).toString("base64");
    return { Authorization: "Basic " + token };
  }

  #isPrivateEndpoint(): boolean {
    try {
      const url = new URL(this.#endpoint);
      return url.hostname === "127.0.0.1" || url.hostname === "localhost";
    } catch {
      return false;
    }
  }
}
