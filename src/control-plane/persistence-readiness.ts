export type PersistenceClassification =
  | "durable"
  | "ephemeral"
  | "computed"
  | "seeded"
  | "mocked"
  | "read_only_projection"
  | "external_observed"
  | "unknown";

export interface PersistenceReadinessItem {
  readonly domain: string;
  readonly classification: PersistenceClassification;
  readonly survivesRestart: boolean;
  readonly projectionOnly: boolean;
  readonly dependsOnExternalRuntime: boolean;
  readonly usableForProductionClaim: boolean;
  readonly needsFuturePersistence: boolean;
  readonly note: string;
}

export const PERSISTENCE_READINESS_INVENTORY: readonly PersistenceReadinessItem[] = [
  {
    domain: "AgentDefinition",
    classification: "seeded",
    survivesRestart: false,
    projectionOnly: false,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Agent definitions are seeded in the current in-process control plane and require durable storage before production claim.",
  },
  {
    domain: "AgentRevision",
    classification: "seeded",
    survivesRestart: false,
    projectionOnly: false,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Revision history is held in process memory; it does not survive a restart.",
  },
  {
    domain: "AgentComposition",
    classification: "computed",
    survivesRestart: false,
    projectionOnly: true,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Composition is recomputed from revision and catalog state and is a projection.",
  },
  {
    domain: "Deployment",
    classification: "ephemeral",
    survivesRestart: false,
    projectionOnly: false,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Sandbox deployment records are process-local and cannot prove production durability.",
  },
  {
    domain: "Runtime",
    classification: "ephemeral",
    survivesRestart: false,
    projectionOnly: false,
    dependsOnExternalRuntime: true,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Runtime instances depend on external runtime state and do not survive control-plane restart.",
  },
  {
    domain: "ExecutionRun",
    classification: "ephemeral",
    survivesRestart: false,
    projectionOnly: false,
    dependsOnExternalRuntime: true,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Execution runs are observed in process and require durable correlation for production evidence.",
  },
  {
    domain: "Worker",
    classification: "external_observed",
    survivesRestart: false,
    projectionOnly: true,
    dependsOnExternalRuntime: true,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Worker state is observed from the registry and external runtime; it is not durable control-plane state.",
  },
  {
    domain: "Credential reference",
    classification: "seeded",
    survivesRestart: false,
    projectionOnly: false,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Credential references are redacted and in-memory; raw secrets must never be exposed.",
  },
  {
    domain: "Provider connection",
    classification: "external_observed",
    survivesRestart: false,
    projectionOnly: true,
    dependsOnExternalRuntime: true,
    usableForProductionClaim: false,
    needsFuturePersistence: false,
    note: "Provider connection health is observed from external provider state.",
  },
  {
    domain: "Audit",
    classification: "ephemeral",
    survivesRestart: false,
    projectionOnly: false,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Audit records are currently process-local and require durable retention before production claim.",
  },
  {
    domain: "Evidence",
    classification: "computed",
    survivesRestart: false,
    projectionOnly: true,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Evidence is a computed projection from domain services and is not yet durable.",
  },
  {
    domain: "Economic evidence",
    classification: "ephemeral",
    survivesRestart: false,
    projectionOnly: false,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Economics remains operational evidence, not billing; settlement state is not durable.",
  },
  {
    domain: "Readiness report",
    classification: "computed",
    survivesRestart: false,
    projectionOnly: true,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: false,
    note: "Readiness reports are recomputed from current signals and must not be treated as durable evidence.",
  },
  {
    domain: "System configuration",
    classification: "seeded",
    survivesRestart: false,
    projectionOnly: true,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "System configuration is seeded from defaults and environment variables.",
  },
  {
    domain: "Policy/configuration",
    classification: "read_only_projection",
    survivesRestart: false,
    projectionOnly: true,
    dependsOnExternalRuntime: false,
    usableForProductionClaim: false,
    needsFuturePersistence: true,
    note: "Policy visibility is read-only; mutation and durable policy storage are deferred.",
  },
  {
    domain: "Tenant/isolation visibility",
    classification: "external_observed",
    survivesRestart: false,
    projectionOnly: true,
    dependsOnExternalRuntime: true,
    usableForProductionClaim: false,
    needsFuturePersistence: false,
    note: "Tenant-aware visibility is projected from worker declarations; tenant-admin capability is out of scope.",
  },
];
