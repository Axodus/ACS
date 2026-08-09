export type ModelProviderStatus = "ready" | "degraded" | "unavailable" | "not-configured";
export type ModelCapability =
  | "text"
  | "reasoning"
  | "tool-use"
  | "structured-output"
  | "vision"
  | "coding"
  | "streaming";

export interface ModelProviderFinding {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

export interface ModelCapabilities {
  readonly supports: readonly ModelCapability[];
  readonly inputModalities: readonly string[];
  readonly outputModalities: readonly string[];
  readonly contextWindow?: number;
  readonly toolUse: boolean;
  readonly reasoning: boolean;
  readonly coding: boolean;
  readonly streaming: boolean;
  readonly structuredOutput: boolean;
  readonly vision: boolean;
}

export interface ModelDefinition {
  readonly providerId: string;
  readonly modelId: string;
  readonly canonicalId: string;
  readonly displayName: string;
  readonly availability: "available" | "preview" | "deprecated" | "unavailable";
  readonly capabilities: ModelCapabilities;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ModelProviderHealth {
  readonly providerId: string;
  readonly status: ModelProviderStatus;
  readonly observedAt: number;
  readonly findings: readonly ModelProviderFinding[];
}

export interface ModelProviderCapabilities {
  readonly providerId: string;
  readonly providerTypes: readonly ("managed" | "byok" | "local" | "private")[];
  readonly supportedConnectionTypes: readonly string[];
  readonly supportedModelCapabilities: readonly ModelCapability[];
}

export interface ModelStrategyRoute {
  readonly providerId: string;
  readonly modelCanonicalId: string;
  readonly credentialConnectionId?: string;
}

export interface ModelStrategy {
  readonly primary: ModelStrategyRoute;
  readonly fallbacks: readonly ModelStrategyRoute[];
  readonly requiredCapabilities?: readonly ModelCapability[];
}

export interface ModelProvider {
  readonly id: string;
  readonly displayName: string;

  health(): Promise<ModelProviderHealth>;
  listModels(): Promise<readonly ModelDefinition[]>;
  getModel(modelId: string): Promise<ModelDefinition>;
  capabilities(): Promise<ModelProviderCapabilities>;
}

export function createCanonicalModelId(providerId: string, modelId: string): string {
  return providerId + "/" + modelId;
}
