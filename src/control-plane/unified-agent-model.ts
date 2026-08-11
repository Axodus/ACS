import { createHash } from "node:crypto";

export type GovernedAgentStatus = "draft" | "active" | "disabled" | "archived";
export type DeploymentMode = "sandbox" | "staged" | "live";
export type RuntimeStatus = "created" | "ready" | "running" | "stopped" | "degraded" | "failed" | "unknown";
export type ExecutionRunStatus = "planned" | "authorized" | "running" | "completed" | "failed" | "cancelled";

export interface AgentModelReference {
  readonly providerId: string;
  readonly modelId: string;
  readonly credentialConnectionId?: string;
}

export interface AgentModelStrategy {
  readonly primary: AgentModelReference;
  readonly fallbacks: readonly AgentModelReference[];
  readonly runnerId?: string;
  readonly requiredCapabilities?: readonly string[];
}

export interface AgentDefinition {
  readonly agentId: string;
  readonly name: string;
  readonly status: GovernedAgentStatus;
  readonly roleId?: string;
  readonly roleRevision?: number;
  readonly profileId?: string;
  readonly profileRevision?: number;
  readonly capabilityIds: readonly string[];
  readonly skillIds: readonly string[];
  readonly toolIds: readonly string[];
  readonly modelStrategy?: AgentModelStrategy;
  readonly credentialConnectionIds: readonly string[];
  readonly runnerPreferences: readonly string[];
  readonly executionPolicyId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AgentRevision {
  readonly agentId: string;
  readonly revision: number;
  readonly fingerprint: string;
  readonly definition: AgentDefinition;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly createdBy?: string;
}

export interface CompositionFinding {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

export interface AgentComposition {
  readonly agentId: string;
  readonly revision: number;
  readonly fingerprint: string;
  readonly requested: {
    readonly roleId?: string;
    readonly profileId?: string;
    readonly capabilityIds: readonly string[];
    readonly skillIds: readonly string[];
    readonly toolIds: readonly string[];
    readonly runnerPreferences: readonly string[];
    readonly credentialConnectionIds: readonly string[];
  };
  readonly effective: {
    readonly roleId?: string;
    readonly roleRevision?: number;
    readonly profileId?: string;
    readonly profileRevision?: number;
    readonly capabilityIds: readonly string[];
    readonly skillIds: readonly string[];
    readonly toolIds: readonly string[];
    readonly runnerPreferences: readonly string[];
    readonly credentialConnectionIds: readonly string[];
    readonly modelStrategy?: AgentModelStrategy;
  };
  readonly findings: readonly CompositionFinding[];
  readonly ready: boolean;
  readonly materialization?: {
    readonly artifactType: "openclaw-compatible";
    readonly artifactFingerprint: string;
  };
}

export interface ExecutionPlan {
  readonly planId: string;
  readonly agentId: string;
  readonly agentRevision: number;
  readonly compositionFingerprint: string;
  readonly tenantId?: string;
  readonly workloadId?: string;
  readonly engineId: string;
  readonly engineRevision?: string;
  readonly executionTargetId: string;
  readonly runnerId?: string;
  readonly providerId?: string;
  readonly modelId?: string;
  readonly credentialConnectionId?: string;
  readonly governancePolicyId?: string;
  readonly economicPolicyId?: string;
  readonly isolationMode?: string;
  readonly sourceRoot?: string;
  readonly runtimeRoot?: string;
  readonly stateRoot?: string;
  readonly configRoot?: string;
  readonly artifactsRoot?: string;
  readonly workspaceRoot?: string;
  readonly deploymentMode: DeploymentMode;
  readonly createdAt: number;
  readonly correlationId: string;
}

export interface AgentDeployment {
  readonly deploymentId: string;
  readonly agentId: string;
  readonly agentRevision: number;
  readonly compositionFingerprint: string;
  readonly tenantId?: string;
  readonly workloadId?: string;
  readonly executionTargetId: string;
  readonly deploymentMode: DeploymentMode;
  readonly createdAt: number;
}

export interface RuntimeInstance {
  readonly runtimeInstanceId: string;
  readonly deploymentId: string;
  readonly status: RuntimeStatus;
  readonly observedAt: number;
  readonly tenantId?: string;
  readonly workloadId?: string;
}

export interface ExecutionRun {
  readonly executionRunId: string;
  readonly planId: string;
  readonly runtimeInstanceId?: string;
  readonly status: ExecutionRunStatus;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly tenantId?: string;
  readonly workloadId?: string;
}

const FORBIDDEN_SECRET_KEYS = new Set([
  "apiKey",
  "api_key",
  "secret",
  "secretKey",
  "secret_key",
  "oauthToken",
  "oauth_token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "privateKey",
  "private_key",
  "token",
  "password",
]);

export function validateAgentDefinition(input: AgentDefinition): readonly CompositionFinding[] {
  const findings: CompositionFinding[] = [];
  scanForSecrets(input, findings, []);
  if (input.modelStrategy?.primary.credentialConnectionId && !input.credentialConnectionIds.includes(input.modelStrategy.primary.credentialConnectionId)) {
    findings.push({
      code: "AGENT_MODEL_STRATEGY_CREDENTIAL_UNDECLARED",
      severity: "error",
      message: "Primary model strategy credential connection must be declared on the agent definition",
    });
  }
  for (const fallback of input.modelStrategy?.fallbacks ?? []) {
    if (fallback.credentialConnectionId && !input.credentialConnectionIds.includes(fallback.credentialConnectionId)) {
      findings.push({
        code: "AGENT_MODEL_STRATEGY_FALLBACK_CREDENTIAL_UNDECLARED",
        severity: "error",
        message: "Fallback model strategy credential connection must be declared on the agent definition",
      });
    }
  }
  return findings;
}

export function createAgentRevision(input: {
  readonly definition: AgentDefinition;
  readonly revision: number;
  readonly createdAt: number;
  readonly updatedAt?: number;
  readonly createdBy?: string;
}): AgentRevision {
  const fingerprint = fingerprintAgentDefinition(input.definition);
  return {
    agentId: input.definition.agentId,
    revision: input.revision,
    fingerprint,
    definition: freezeAgentDefinition(input.definition),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
  };
}

export function createAgentComposition(input: {
  readonly revision: AgentRevision;
  readonly effective?: Partial<AgentComposition["effective"]>;
  readonly findings?: readonly CompositionFinding[];
}): AgentComposition {
  const requested: AgentComposition["requested"] = {
    ...(input.revision.definition.roleId ? { roleId: input.revision.definition.roleId } : {}),
    ...(input.revision.definition.profileId ? { profileId: input.revision.definition.profileId } : {}),
    capabilityIds: [...input.revision.definition.capabilityIds].sort(),
    skillIds: [...input.revision.definition.skillIds].sort(),
    toolIds: [...input.revision.definition.toolIds].sort(),
    runnerPreferences: [...input.revision.definition.runnerPreferences].sort(),
    credentialConnectionIds: [...input.revision.definition.credentialConnectionIds].sort(),
  };
  const effective: AgentComposition["effective"] = {
    ...(input.effective?.roleId ?? input.revision.definition.roleId ? { roleId: input.effective?.roleId ?? input.revision.definition.roleId! } : {}),
    ...(input.effective?.roleRevision ?? input.revision.definition.roleRevision ? { roleRevision: input.effective?.roleRevision ?? input.revision.definition.roleRevision! } : {}),
    ...(input.effective?.profileId ?? input.revision.definition.profileId ? { profileId: input.effective?.profileId ?? input.revision.definition.profileId! } : {}),
    ...(input.effective?.profileRevision ?? input.revision.definition.profileRevision ? { profileRevision: input.effective?.profileRevision ?? input.revision.definition.profileRevision! } : {}),
    capabilityIds: [...(input.effective?.capabilityIds ?? input.revision.definition.capabilityIds)].sort(),
    skillIds: [...(input.effective?.skillIds ?? input.revision.definition.skillIds)].sort(),
    toolIds: [...(input.effective?.toolIds ?? input.revision.definition.toolIds)].sort(),
    runnerPreferences: [...(input.effective?.runnerPreferences ?? input.revision.definition.runnerPreferences)].sort(),
    credentialConnectionIds: [...(input.effective?.credentialConnectionIds ?? input.revision.definition.credentialConnectionIds)].sort(),
    ...(input.effective?.modelStrategy ?? input.revision.definition.modelStrategy
      ? { modelStrategy: input.effective?.modelStrategy ?? input.revision.definition.modelStrategy }
      : {}),
  };
  const findings = [...(input.findings ?? [])];
  return {
    agentId: input.revision.agentId,
    revision: input.revision.revision,
    fingerprint: input.revision.fingerprint,
    requested,
    effective,
    findings,
    ready: findings.every((finding) => finding.severity !== "error"),
    materialization: {
      artifactType: "openclaw-compatible",
      artifactFingerprint: createHash("sha256").update(JSON.stringify({ fingerprint: input.revision.fingerprint, effective })).digest("hex"),
    },
  };
}

export function fingerprintAgentDefinition(definition: AgentDefinition): string {
  return createHash("sha256").update(stableStringify(freezeAgentDefinition(definition))).digest("hex");
}

function scanForSecrets(value: unknown, findings: CompositionFinding[], path: readonly string[]): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForSecrets(entry, findings, [...path, String(index)]));
    return;
  }
  const record = value as Record<string, unknown>;
  for (const [key, entry] of Object.entries(record)) {
    if (FORBIDDEN_SECRET_KEYS.has(key)) {
      findings.push({
        code: "AGENT_SECRET_FIELD_FORBIDDEN",
        severity: "error",
        message: "Forbidden secret-like field detected at " + [...path, key].join("."),
      });
    }
    scanForSecrets(entry, findings, [...path, key]);
  }
}

function freezeAgentDefinition(definition: AgentDefinition): AgentDefinition {
  return {
    ...definition,
    capabilityIds: [...definition.capabilityIds].sort(),
    skillIds: [...definition.skillIds].sort(),
    toolIds: [...definition.toolIds].sort(),
    credentialConnectionIds: [...definition.credentialConnectionIds].sort(),
    runnerPreferences: [...definition.runnerPreferences].sort(),
    ...(definition.modelStrategy
      ? {
          modelStrategy: {
            ...definition.modelStrategy,
            fallbacks: [...definition.modelStrategy.fallbacks].map((entry) => ({ ...entry })),
            ...(definition.modelStrategy.requiredCapabilities
              ? { requiredCapabilities: [...definition.modelStrategy.requiredCapabilities].sort() }
              : {}),
          },
        }
      : {}),
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map((entry) => stableStringify(entry)).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}
