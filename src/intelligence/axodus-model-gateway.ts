import type {
  ModelCapabilities,
  ModelProviderFinding,
  ModelProviderStatus,
} from "./model-provider.js";

export interface AxodusGatewayModelRecord {
  readonly modelId: string;
  readonly displayName: string;
  readonly availability: "available" | "preview" | "deprecated" | "unavailable";
  readonly capabilities: ModelCapabilities;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AxodusGatewayHealth {
  readonly status: ModelProviderStatus;
  readonly observedAt: number;
  readonly findings: readonly ModelProviderFinding[];
}

export interface AxodusModelGateway {
  health(): Promise<AxodusGatewayHealth>;
  listManagedModels(): Promise<readonly AxodusGatewayModelRecord[]>;
  getManagedModel(modelId: string): Promise<AxodusGatewayModelRecord>;
}

export class StaticAxodusModelGateway implements AxodusModelGateway {
  readonly #health: AxodusGatewayHealth;
  readonly #models: readonly AxodusGatewayModelRecord[];

  constructor(input: {
    readonly health?: AxodusGatewayHealth;
    readonly models: readonly AxodusGatewayModelRecord[];
  }) {
    this.#health = input.health ?? {
      status: "ready",
      observedAt: Date.now(),
      findings: [],
    };
    this.#models = [...input.models];
  }

  async health(): Promise<AxodusGatewayHealth> {
    return this.#health;
  }

  async listManagedModels(): Promise<readonly AxodusGatewayModelRecord[]> {
    return [...this.#models].sort((left, right) => left.modelId.localeCompare(right.modelId));
  }

  async getManagedModel(modelId: string): Promise<AxodusGatewayModelRecord> {
    const model = this.#models.find((entry) => entry.modelId === modelId);
    if (!model) {
      throw new Error("managed model not found");
    }
    return model;
  }
}
