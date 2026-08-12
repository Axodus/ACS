export type RecognizedEnvironment =
  | "local"
  | "development"
  | "sandbox"
  | "test"
  | "staging"
  | "production"
  | "unknown";

export const RECOGNIZED_ENVIRONMENTS: readonly RecognizedEnvironment[] = [
  "local",
  "development",
  "sandbox",
  "test",
  "staging",
  "production",
  "unknown",
];

export interface EnvironmentReadiness {
  readonly id: RecognizedEnvironment;
  readonly purpose: string;
  readonly supportedOperations: readonly string[];
  readonly prohibitedOperations: readonly string[];
  readonly persistenceExpectation: string;
  readonly secretsExpectation: string;
  readonly externalTargetAccess: string;
  readonly safetyConstraints: readonly string[];
  readonly readinessImplications: string;
  readonly claimLimitations: string;
}

export function isRecognizedEnvironment(value: string): value is RecognizedEnvironment {
  return (RECOGNIZED_ENVIRONMENTS as readonly string[]).includes(value);
}

export function resolveCurrentEnvironment(value?: string): RecognizedEnvironment {
  const candidate = value ?? process.env.ACS_ENVIRONMENT;
  if (candidate && isRecognizedEnvironment(candidate)) {
    return candidate;
  }
  return "unknown";
}

export const ENVIRONMENT_READINESS_INVENTORY: readonly EnvironmentReadiness[] = [
  {
    id: "local",
    purpose: "Single-machine development and inspection of the ACS Control Plane.",
    supportedOperations: [
      "read-only Product API inspection",
      "sandbox agent lifecycle",
      "local worker and runtime observation",
    ],
    prohibitedOperations: [
      "production deployment",
      "production secret access",
      "production billing or settlement",
    ],
    persistenceExpectation: "In-process memory unless a local state root is explicitly provided.",
    secretsExpectation: "In-memory or redacted references only; raw secrets are not production-bound.",
    externalTargetAccess: "None by default; local targets require explicit sandbox configuration.",
    safetyConstraints: [
      "No production mutation",
      "No production-ready claim",
      "Unsupported operations must be reported honestly",
    ],
    readinessImplications: "Useful for development evidence only.",
    claimLimitations: "Does not prove production readiness, durability, auth, or browser acceptance.",
  },
  {
    id: "development",
    purpose: "Shared development validation before sandbox acceptance.",
    supportedOperations: [
      "developer validation",
      "contract and unit tests",
      "read-only operational inspection",
    ],
    prohibitedOperations: [
      "production deployment",
      "tenant administration",
      "billing operations",
    ],
    persistenceExpectation: "Durable development storage may be used, but it is not production state.",
    secretsExpectation: "Development secrets are references or mocked values, not production credentials.",
    externalTargetAccess: "External targets are only allowed when explicitly configured as sandbox targets.",
    safetyConstraints: [
      "Development evidence must not be labeled production evidence",
      "No raw secret disclosure",
    ],
    readinessImplications: "Establishes baseline validation only.",
    claimLimitations: "Cannot support production or billing claims.",
  },
  {
    id: "sandbox",
    purpose: "Governed execution and controlled experimentation without production impact.",
    supportedOperations: [
      "sandbox agent lifecycle",
      "sandbox deployment previews",
      "read-only economics as operational evidence",
    ],
    prohibitedOperations: [
      "live deployment",
      "production settlement",
      "enterprise tenant administration",
    ],
    persistenceExpectation: "Sandbox state is expected to be explicitly seeded, ephemeral, or read-only.",
    secretsExpectation: "Sandbox credentials use redacted references and no raw secret exposure.",
    externalTargetAccess: "Sandbox execution targets only.",
    safetyConstraints: [
      "Sandbox behavior is not production evidence",
      "Blockers remain visible",
    ],
    readinessImplications: "Confirms governed execution boundaries without proving production.",
    claimLimitations: "Cannot claim production readiness from sandbox execution alone.",
  },
  {
    id: "test",
    purpose: "Automated and manual acceptance validation before staging review.",
    supportedOperations: [
      "automated contract tests",
      "HTTP integration tests",
      "backend and app regression validation",
    ],
    prohibitedOperations: [
      "production mutations",
      "live external execution",
      "production secret usage",
    ],
    persistenceExpectation: "Isolated test storage with deterministic reset semantics.",
    secretsExpectation: "Test secrets are fixtures or redacted references only.",
    externalTargetAccess: "None unless a mock target is explicitly registered.",
    safetyConstraints: [
      "Test evidence must identify the environment",
      "Tests must not mutate production state",
    ],
    readinessImplications: "Provides reproducible validation but not operational readiness.",
    claimLimitations: "Passing tests do not prove runtime durability, security, or production behavior.",
  },
  {
    id: "staging",
    purpose: "Pre-production validation with realistic configuration and deployment controls.",
    supportedOperations: [
      "pre-production deployment review",
      "acceptance validation",
      "readiness gate review",
    ],
    prohibitedOperations: [
      "production claim",
      "billing product activation",
      "tenant-admin capability unless explicitly approved",
    ],
    persistenceExpectation: "Durable staging storage may be used for pre-production validation.",
    secretsExpectation: "Staging secrets must use a governed secret boundary and reference-only disclosure.",
    externalTargetAccess: "Explicitly approved staging targets only.",
    safetyConstraints: [
      "Staging is not production",
      "Caveats must remain explicit",
    ],
    readinessImplications: "Can validate deployment controls, but production readiness remains separate.",
    claimLimitations: "Staging success does not prove production readiness.",
  },
  {
    id: "production",
    purpose: "Live operational environment for authorized control-plane operation.",
    supportedOperations: [
      "production deployment only after explicit gates",
      "authorized mutation only after auth/RBAC gates",
      "production evidence correlation",
    ],
    prohibitedOperations: [
      "unauthenticated mutation",
      "raw secret disclosure",
      "billing or tenant-admin activation without an approved contract",
    ],
    persistenceExpectation: "Durable production storage with recovery and retention policy.",
    secretsExpectation: "Managed secret references with redaction and no raw secret leakage.",
    externalTargetAccess: "Authorized production execution targets only.",
    safetyConstraints: [
      "No production claim until readiness gates prove it",
      "No overclaim of billing or administration readiness",
    ],
    readinessImplications: "This environment may only be claimed ready after evidence-backed gates.",
    claimLimitations: "Production readiness is NO / not yet claimed in the current EPIC-12 baseline.",
  },
  {
    id: "unknown",
    purpose: "Fallback when the runtime environment cannot be determined.",
    supportedOperations: [
      "read-only projection",
      "honest unsupported-state reporting",
    ],
    prohibitedOperations: [
      "production mutation",
      "readiness claim",
      "secret disclosure",
    ],
    persistenceExpectation: "Unknown persistence; treat state as unproven.",
    secretsExpectation: "Treat secrets as unavailable, redacted, or not configured.",
    externalTargetAccess: "Unknown; external targets must not be assumed safe.",
    safetyConstraints: [
      "Record unknown as a caveat",
      "Never infer readiness from absence of data",
    ],
    readinessImplications: "Prevents false claims when environment truth is missing.",
    claimLimitations: "No environment-based readiness claim can be made.",
  },
];
