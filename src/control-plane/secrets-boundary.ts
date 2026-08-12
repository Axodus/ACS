export type SecretBoundaryStorage = "memory" | "filesystem" | "not_configured" | "unavailable";

export interface SecretsBoundarySummary {
  readonly storage: SecretBoundaryStorage;
  readonly referenceMode: "redacted_reference" | "unavailable" | "not_configured";
  readonly environmentInjection: string;
  readonly uiDisclosure: "redacted_only" | "blocked";
  readonly apiDisclosure: "redacted_only" | "blocked";
  readonly logsDisclosure: "redacted_only" | "blocked";
  readonly evidenceDisclosure: "redacted_only" | "blocked";
  readonly auditDisclosure: "redacted_only" | "blocked";
  readonly redactionExpectations: readonly string[];
  readonly noSecretLeakValidation: "required" | "blocked" | "not_run";
  readonly unsupportedOperations: readonly string[];
  readonly productionBlockers: readonly string[];
  readonly rawSecretsExposed: false;
}

export function createSecretsBoundarySummary(
  backend: SecretBoundaryStorage = "memory",
): SecretsBoundarySummary {
  const memoryOnly = backend === "memory" || backend === "filesystem";
  const referenceMode: SecretsBoundarySummary["referenceMode"] = memoryOnly
    ? "redacted_reference"
    : "not_configured";

  return {
    storage: backend,
    referenceMode,
    environmentInjection: memoryOnly
      ? "Environment variables may carry references, not raw production secrets."
      : "Environment injection is not configured for a production secret boundary.",
    uiDisclosure: "redacted_only",
    apiDisclosure: "redacted_only",
    logsDisclosure: "redacted_only",
    evidenceDisclosure: "redacted_only",
    auditDisclosure: "redacted_only",
    redactionExpectations: [
      "Raw secrets must not appear in Product API JSON.",
      "Raw secrets must not appear in UI-rendered state.",
      "Raw secrets must not appear in logs, evidence, audit, or diagnostics.",
      "Secret references are redacted unless a governed boundary proves otherwise.",
    ],
    noSecretLeakValidation: "required",
    unsupportedOperations: [
      "Production secret provisioning",
      "Automatic secret rotation",
      "Provider credential lifecycle management",
      "Cloud IAM or managed vault integration",
    ],
    productionBlockers: memoryOnly
      ? [
        "Current secret storage is in-memory or filesystem-local and is not a production boundary.",
        "Managed secret storage and rotation are not implemented.",
      ]
      : [
        "No production secret storage is configured.",
      ],
    rawSecretsExposed: false,
  };
}

export const SECRETS_BOUNDARY_SUMMARY: SecretsBoundarySummary = createSecretsBoundarySummary();
