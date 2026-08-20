function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_ACS_API_BASE_URL;
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  if (typeof explicit === "string" && explicit.trim()) {
    const value = explicit.trim().replace(/\/+$/, "");
    if (!isLocalHost && /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:|\/|$)/i.test(value)) {
      return "/api/v1";
    }
    return value;
  }
  return isLocalHost ? "http://127.0.0.1:8788/api/v1" : "/api/v1";
}
const API_BASE_URL = resolveApiBaseUrl();

declare global {
  interface Window {
    __ACS_AUTH__?: { readonly accessToken?: string };
  }
}

export type ProductApiHealth = {
  service: string;
  status: "ok";
  mode: string;
  automation: string;
};

export type GovernedAgentStatus = "draft" | "active" | "disabled" | "archived";
export type AgentEnvironment = "sandbox";

export type AgentCompositionSummary = {
  ready: boolean;
  errorCount: number;
  warningCount: number;
};

export type AgentReadinessSummary = {
  state: "ready" | "partial" | "blocked" | "unavailable";
  blockerCount: number;
  warningCount: number;
};

export type AgentDeploymentSummary = {
  state: "none" | "deployed" | "failed" | "rejected";
  count: number;
};

export type AgentRuntimeSummary = {
  state: "none" | "running" | "stopped" | "failed" | "other";
  count: number;
};

export type AgentModelReference = {
  providerId: string;
  modelId: string;
  credentialConnectionId?: string;
};

export type AgentModelStrategy = {
  primary: AgentModelReference;
  fallbacks: AgentModelReference[];
  runnerId?: string;
  requiredCapabilities?: string[];
};

export type AgentDefinition = {
  agentId: string;
  name: string;
  status: GovernedAgentStatus;
  roleId?: string;
  roleRevision?: number;
  profileId?: string;
  profileRevision?: number;
  capabilityIds: string[];
  skillIds: string[];
  toolIds: string[];
  modelStrategy?: AgentModelStrategy;
  credentialConnectionIds: string[];
  runnerPreferences: string[];
  executionPolicyId?: string;
  metadata?: Record<string, unknown>;
};

export type AgentRevision = {
  agentId: string;
  revision: number;
  fingerprint: string;
  definition: AgentDefinition;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
};

export type CompositionFinding = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type AgentComposition = {
  agentId: string;
  revision: number;
  fingerprint: string;
  requested: {
    roleId?: string;
    profileId?: string;
    capabilityIds: string[];
    skillIds: string[];
    toolIds: string[];
    runnerPreferences: string[];
    credentialConnectionIds: string[];
  };
  effective: {
    roleId?: string;
    roleRevision?: number;
    profileId?: string;
    profileRevision?: number;
    capabilityIds: string[];
    skillIds: string[];
    toolIds: string[];
    runnerPreferences: string[];
    credentialConnectionIds: string[];
    modelStrategy?: AgentModelStrategy;
  };
  findings: CompositionFinding[];
  ready: boolean;
  materialization?: {
    artifactType: "openclaw-compatible";
    artifactFingerprint: string;
  };
};

export type AgentAuditEvent = {
  eventId: string;
  eventType: string;
  timestamp: number;
  correlationId: string;
  tenantId?: string;
  workloadId?: string;
  agentId?: string;
  revision?: number;
  deploymentId?: string;
  runtimeInstanceId?: string;
  executionRunId?: string;
  actor?: string;
  decision?: "allowed" | "denied" | "passed" | "failed";
  result?: "success" | "failure" | "pending";
  metadata?: Record<string, unknown>;
};

export type AgentListItem = {
  agentId: string;
  name: string;
  status: GovernedAgentStatus;
  environment: AgentEnvironment;
  currentRevisionId: number;
  compositionSummary: AgentCompositionSummary;
  readinessSummary: AgentReadinessSummary;
  deploymentSummary: AgentDeploymentSummary;
  runtimeSummary: AgentRuntimeSummary;
  archived: boolean;
  updatedAt: number;
  checkedAt: number;
};

export type AgentAuditSummary = {
  total: number;
  success: number;
  failure: number;
  pending: number;
  recent: AgentAuditEvent[];
};

export type AgentEconomicSummary = {
  state: "unavailable";
  message: string;
};

export type AgentSurfaceGuardrails = {
  inspectionMode: true;
  sandboxOnly: true;
  readOnly: false;
  mutableOperations: true;
  mutationScope: "agent-lifecycle";
  productionReady: false;
  sourceOfTruth: "product-api";
};

export type AgentLifecycleActionName =
  | "update"
  | "createRevision"
  | "adoptRevision"
  | "restoreRevision"
  | "duplicate"
  | "archive"
  | "restore"
  | "delete";

export type AgentLifecycleActionView = {
  action: AgentLifecycleActionName;
  label: string;
  available: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
};

export type AgentLifecycleStateView = {
  agentId: string;
  currentRevision: number;
  status: GovernedAgentStatus;
  archived: boolean;
  protected: boolean;
  archivedAt?: number;
  restoredAt?: number;
};

export type AgentDetail = {
  agentId: string;
  agentDefinition: AgentDefinition;
  currentRevision: AgentRevision;
  composition?: AgentComposition;
  compositionUnavailableReason?: string;
  readinessSummary: AgentReadinessSummary;
  deploymentSummary: AgentDeploymentSummary;
  runtimeSummary: AgentRuntimeSummary;
  economicSummary: AgentEconomicSummary;
  auditSummary: AgentAuditSummary;
  lifecycleState: AgentLifecycleStateView;
  availableActions: AgentLifecycleActionView[];
  guardrails: AgentSurfaceGuardrails;
  checkedAt: number;
  stale: boolean;
};

export type AgentRevisionSummary = {
  revisionId: string;
  revisionNumber: number;
  status: "current" | "adopted" | "historical";
  createdAt: number;
  adoptedAt: number;
  restoredFrom?: number;
  compositionHash?: string;
  changeSummary?: string;
  availableActions: {
    action: "adopt" | "restore";
    available: boolean;
    reason?: string;
  }[];
};

export type AgentOperationResult = {
  ok: boolean;
  operation: string;
  entityType: "agent";
  entityId: string;
  status: string;
  message: string;
  warnings: string[];
  errors: string[];
  auditRef?: string;
  checkedAt: number;
};

export type AgentCreateInput = {
  definition: AgentDefinition;
  createdBy?: string;
};

export type UpdateAgentInput = {
  definition: AgentDefinition;
  expectedRevision: number;
  updatedBy?: string;
};

export type AgentCreateRevisionInput = {
  definition: AgentDefinition;
  expectedRevision: number;
  actor?: string;
};

export type AgentDuplicateInput = {
  newAgentId: string;
  name?: string;
  actor?: string;
};

export type DashboardFinding = {
  code: string;
  severity: "error" | "warning" | "info";
  category?: "active-profile" | "certified-capability" | "global-caveat" | "operational";
  domain: string;
  message: string;
  detail?: string;
};

export type ProductApiOperationalGuardrails = {
  inspectionMode: true;
  sandboxOnly: true;
  readOnly: true;
  mutableOperations: false;
};

export type ProductApiErrorSeverity = "info" | "warning" | "error" | "critical";

export type ProductApiError = {
  code: string;
  message: string;
  reason?: string;
  details?: unknown;
  entityRefs?: readonly string[];
  retryable?: boolean;
  severity?: ProductApiErrorSeverity;
  guardrails?: readonly string[];
  correlationId?: string;
  status: number;
};

export type SystemGuardrailsView = {
  inspectionMode: true;
  sandboxOnly: true;
  readOnly: true;
  mutableOperations: false;
  productionReady: false;
  sourceOfTruth: "product-api";
  futureScope: readonly string[];
  administration: { status: "available"; scope: "tenant_administration"; reason: string; route: string };
  tenants: { status: "available"; reason: string; route: string };
};

export type SystemConfigurationView = {
  mode: "inspection";
  automation: "disabled";
  readOnly: true;
  persistenceBackend: "memory" | "filesystem" | "database";
  secretBackend: "memory" | "filesystem" | "vault" | "kms";
  settlementBackend: "memory" | "production";
  refreshWindowMs: number;
  notices: readonly string[];
};

export type SystemPolicyVisibility = {
  id: string;
  label: string;
  availability: "read_only" | "governed_by_product_api" | "unavailable";
  note: string;
};

export type SystemAdministrationView = {
  status: "available";
  scope: "tenant_administration";
  reason: string;
  route: string;
  notes: readonly string[];
};

export type SystemTenantsView = {
  status: "available";
  reason: string;
  route: string;
  isolationVisibility: readonly {
    workerId: string;
    declaredIsolationModes: readonly string[];
    tenantIsolation: boolean;
    workloadIsolation: boolean;
  }[];
  notes: readonly string[];
};

export type RecognizedEnvironment =
  | "local"
  | "development"
  | "sandbox"
  | "test"
  | "staging"
  | "production"
  | "unknown";

export type EnvironmentReadiness = {
  id: RecognizedEnvironment;
  purpose: string;
  supportedOperations: readonly string[];
  prohibitedOperations: readonly string[];
  persistenceExpectation: string;
  secretsExpectation: string;
  externalTargetAccess: string;
  safetyConstraints: readonly string[];
  readinessImplications: string;
  claimLimitations: string;
};

export type PersistenceClassification =
  | "durable"
  | "ephemeral"
  | "computed"
  | "seeded"
  | "mocked"
  | "read_only_projection"
  | "external_observed"
  | "unknown";

export type PersistenceReadinessItem = {
  domain: string;
  classification: PersistenceClassification;
  survivesRestart: boolean;
  projectionOnly: boolean;
  dependsOnExternalRuntime: boolean;
  usableForProductionClaim: boolean;
  needsFuturePersistence: boolean;
  note: string;
};

export type SecretBoundaryStorage = "memory" | "filesystem" | "not_configured" | "unavailable";

export type SecretsBoundarySummary = {
  storage: SecretBoundaryStorage;
  referenceMode: "redacted_reference" | "unavailable" | "not_configured";
  environmentInjection: string;
  uiDisclosure: "redacted_only" | "blocked";
  apiDisclosure: "redacted_only" | "blocked";
  logsDisclosure: "redacted_only" | "blocked";
  evidenceDisclosure: "redacted_only" | "blocked";
  auditDisclosure: "redacted_only" | "blocked";
  redactionExpectations: readonly string[];
  noSecretLeakValidation: "required" | "blocked" | "not_run";
  unsupportedOperations: readonly string[];
  productionBlockers: readonly string[];
  rawSecretsExposed: false;
};

export type ProductionReadinessGateStatus =
  | "pass"
  | "partial"
  | "blocked"
  | "not_started"
  | "deferred"
  | "not_applicable";

export type ProductionReadinessSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational";

export type ProductionReadinessFinding = {
  code: string;
  gateId: string;
  severity: ProductionReadinessSeverity;
  message: string;
  responsibleDomain: string;
  dependsOnFutureMilestone?: string;
  evidence?: string;
};

export type ProductionReadinessGate = {
  id: string;
  label: string;
  status: ProductionReadinessGateStatus;
  severity: ProductionReadinessSeverity;
  evidence: readonly string[];
  blockers: readonly ProductionReadinessFinding[];
  warnings: readonly ProductionReadinessFinding[];
  caveats: readonly ProductionReadinessFinding[];
  deferredItems: readonly ProductionReadinessFinding[];
  responsibleDomain: string;
  dependencyOnFutureMilestones: readonly string[];
  canPassInEpic12: boolean;
};

export type ProductionReadinessReport = {
  checkedAt: string;
  environment: {
    current: RecognizedEnvironment;
    recognized: readonly EnvironmentReadiness[];
  };
  productionReady: false;
  claim: "not_claimed";
  status: "blocked" | "partial" | "not_started" | "deferred";
  summary: {
    totalGates: number;
    passed: number;
    partial: number;
    blocked: number;
    deferred: number;
    notStarted: number;
  };
  gates: readonly ProductionReadinessGate[];
  blockers: readonly ProductionReadinessFinding[];
  warnings: readonly ProductionReadinessFinding[];
  caveats: readonly ProductionReadinessFinding[];
  deferredItems: readonly ProductionReadinessFinding[];
  persistenceInventory: readonly PersistenceReadinessItem[];
  secretsBoundary: SecretsBoundarySummary;
  claimDiscipline: {
    productionReadyClaimAllowed: false;
    billingReadyClaimAllowed: false;
    administrationReadyClaimAllowed: false;
    tenantGovernanceReadyClaimAllowed: false;
    reason: string;
  };
  nextMilestoneDependencies: readonly string[];
  sourceEvidence: readonly string[];
};

export type GovernanceActorState =
  | "authenticated"
  | "unauthenticated"
  | "system"
  | "local_operator"
  | "simulated"
  | "unknown";

export type AccessDecisionCategory =
  | "allowed"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "deferred"
  | "not_evaluated";

export type AccessEnforcementState = "enforced" | "projected" | "planned";

export type PermissionAuthorityState =
  | "allowed"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "deferred"
  | "requires_production_auth"
  | "requires_admin_boundary"
  | "requires_tenant_boundary";

export type PermissionBaselineCategory =
  | "read_control_plane"
  | "read_agents"
  | "mutate_agents"
  | "read_composition"
  | "read_execution"
  | "mutate_execution"
  | "read_evidence"
  | "read_economics"
  | "read_system"
  | "mutate_system"
  | "admin_boundary"
  | "tenant_boundary"
  | "secret_boundary";

export type AccessDecision = {
  id: string;
  actor: string;
  permission: string;
  action: string;
  entityReference: string;
  decision: AccessDecisionCategory;
  reason: string;
  timestamp: string;
  gateDependency: string;
  enforcement: AccessEnforcementState;
  correlationId?: string;
};

export type PermissionBaselineItem = {
  category: PermissionBaselineCategory;
  label: string;
  readAuthority: PermissionAuthorityState;
  mutationAuthority: PermissionAuthorityState;
  state: "allowed" | "blocked" | "unavailable" | "deferred" | "unsupported";
  reason: string;
  readinessGates: readonly string[];
};

export type AuthoritySurface = {
  surface: string;
  label: string;
  readAuthority: PermissionAuthorityState;
  mutationAuthority: PermissionAuthorityState;
  reason: string;
  notes: readonly string[];
};

export type GovernanceBoundaryReport = {
  checkedAt: string;
  claim: "not_claimed";
  actorBoundary: {
    state: GovernanceActorState;
    source: string;
    displayName: string;
    productionAuthClaimed: false;
    caveats: readonly string[];
  };
  permissionBaseline: readonly PermissionBaselineItem[];
  readMutateAuthority: readonly AuthoritySurface[];
  tenantBoundary: {
    state: "single_tenant" | "tenant_aware" | "multi_tenant_observed" | "tenant_admin_unavailable" | "unknown";
    tenantAdminReady: false;
    isolationIndicators: readonly string[];
    caveats: readonly string[];
  };
  administrationBoundary: {
    administrationReady: false;
    state: "read_only" | "inspection_only" | "unsupported" | "unavailable" | "deferred";
    allowedActions: readonly string[];
    deniedActions: readonly AccessDecision[];
    unsupportedActions: readonly AccessDecision[];
    deferredActions: readonly string[];
  };
  accessDecisions: readonly AccessDecision[];
  deniedStates: readonly AccessDecision[];
  unsupportedActions: readonly AccessDecision[];
  auditCorrelation: {
    state: "available" | "partial" | "planned" | "unavailable";
    note: string;
    evidence: readonly string[];
  };
  readinessGateDependencies: readonly string[];
  claimDiscipline: {
    productionReadyClaimAllowed: false;
    billingReadyClaimAllowed: false;
    administrationReadyClaimAllowed: false;
    tenantGovernanceReadyClaimAllowed: false;
    reason: string;
  };
  caveats: readonly string[];
  deferredItems: readonly string[];
  sourceEvidence: readonly string[];
};

export type OperationalReliabilityOperationState =
  | "queued"
  | "pending"
  | "running"
  | "waiting"
  | "recovering"
  | "retrying"
  | "succeeded"
  | "failed"
  | "blocked"
  | "cancelled"
  | "stale"
  | "unknown"
  | "unsupported"
  | "unavailable"
  | "deferred";

export type OperationalReliabilityOperationType =
  | "agent_lifecycle"
  | "composition_validation"
  | "readiness_check"
  | "deployment_plan"
  | "deploy"
  | "runtime_start"
  | "runtime_stop"
  | "execution_run"
  | "worker_assignment"
  | "worker_recovery"
  | "evidence_collection"
  | "economic_reservation";

export type OperationalReliabilitySeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational";

export type OperationalReliabilityTruthLayer =
  | "control_plane_assertion"
  | "runtime_observation"
  | "external_execution_target";

export type OperationalReliabilityFinding = {
  code: string;
  severity: OperationalReliabilitySeverity;
  message: string;
  responsibleDomain: string;
  dependsOnFutureMilestone?: string;
  evidence?: string;
};

export type OperationalStateModelItem = {
  type: OperationalReliabilityOperationType;
  label: string;
  state: "supported" | "unsupported" | "unavailable" | "deferred" | "not_applicable";
  reason: string;
  evidence: readonly string[];
};

export type LongRunningOperation = {
  id: string;
  type: OperationalReliabilityOperationType;
  targetEntity: string;
  state: OperationalReliabilityOperationState;
  createdAt: number;
  startedAt?: number;
  updatedAt: number;
  completedAt?: number;
  progress?: string;
  retryAvailability: "available" | "unavailable" | "unsupported" | "planned";
  cancellationAvailability: "available" | "unavailable" | "unsupported" | "planned";
  recoveryAvailability: "available" | "unavailable" | "unsupported" | "planned";
  evidence: readonly string[];
  runtimeDependency: string;
  workerDependency: string;
  stale: boolean;
  caveats: readonly string[];
  reason?: string;
};

export type OperationalResult = {
  id: string;
  operationId: string;
  outcome: "succeeded" | "failed" | "blocked" | "cancelled" | "pending" | "unknown";
  failureCategory?: string;
  failureReason?: string;
  retryable: boolean;
  recoveryStatus: "not_required" | "available" | "in_progress" | "succeeded" | "failed" | "blocked" | "unsupported" | "unavailable" | "planned" | "unknown";
  nextAction?: string;
  evidence: readonly string[];
  correlationId?: string;
};

export type RuntimeConfidenceState =
  | "ready"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "degraded"
  | "failed"
  | "recovering"
  | "stale"
  | "unknown"
  | "unsupported"
  | "unavailable";

export type WorkerConfidenceState =
  | "available"
  | "busy"
  | "assigned"
  | "idle"
  | "degraded"
  | "failed"
  | "recovering"
  | "stale"
  | "offline"
  | "unknown"
  | "unsupported"
  | "unavailable";

export type ReliabilityConfidenceLevel = "high" | "medium" | "low" | "none" | "unknown";

export type RuntimeConfidenceItem = {
  id: string;
  state: RuntimeConfidenceState;
  healthState: "healthy" | "degraded" | "unavailable" | "unknown";
  confidenceLevel: ReliabilityConfidenceLevel;
  lastObservedTime: string;
  sourceOfObservation: OperationalReliabilityTruthLayer;
  sourceEvidence: readonly string[];
  executionTargetDependency: string;
  stale: boolean;
  activeOperations: number;
  failedOperations: number;
  recoveringOperations: number;
  caveats: readonly string[];
  unsupportedControls: readonly string[];
};

export type WorkerConfidenceItem = {
  id: string;
  state: WorkerConfidenceState;
  workloadState: "idle" | "busy" | "unknown";
  assignmentStatus: string;
  targetDependency: string;
  healthState: "healthy" | "degraded" | "unavailable" | "unknown";
  confidenceLevel: ReliabilityConfidenceLevel;
  lastHeartbeatAt?: string;
  lastObservedTime: string;
  stale: boolean;
  activeWorkload: number;
  failedWorkload: number;
  recoverySupport: "available" | "unavailable" | "unsupported" | "planned";
  capacitySummary: string;
  caveats: readonly string[];
  unsupportedOperations: readonly string[];
};

export type DistributedScenarioResult = {
  id: string;
  label: string;
  status: "supported" | "partial" | "unsupported" | "unavailable" | "deferred";
  reason: string;
  evidence: readonly string[];
};

export type RecoverySemanticsItem = {
  id: string;
  label: string;
  state: "available" | "partial" | "unavailable" | "unsupported" | "planned" | "deferred";
  reason: string;
  evidence: readonly string[];
};

export type OperationalReliabilityReport = {
  checkedAt: string;
  operationalReliabilityReady: false;
  productionReady: false;
  claim: "not_claimed";
  summary: {
    operationsTracked: number;
    running: number;
    succeeded: number;
    failed: number;
    blocked: number;
    stale: number;
    recovering: number;
    unsupported: number;
    unavailable: number;
  };
  operationStateModel: readonly OperationalStateModelItem[];
  longRunningOperations: readonly LongRunningOperation[];
  operationResults: readonly OperationalResult[];
  runtimeConfidence: readonly RuntimeConfidenceItem[];
  workerConfidence: readonly WorkerConfidenceItem[];
  distributedOperations: {
    status: "supported" | "partial" | "unsupported" | "unavailable" | "deferred";
    scenarios: readonly DistributedScenarioResult[];
    caveats: readonly string[];
  };
  recoverySemantics: readonly RecoverySemanticsItem[];
  blockers: readonly OperationalReliabilityFinding[];
  warnings: readonly OperationalReliabilityFinding[];
  caveats: readonly OperationalReliabilityFinding[];
  deferredItems: readonly OperationalReliabilityFinding[];
  readinessGateDependencies: readonly string[];
  sourceEvidence: readonly string[];
  claimDiscipline: {
    productionReadyClaimAllowed: false;
    operationalReliabilityReadyClaimAllowed: false;
    reason: string;
  };
};

export type BillingBoundaryReport = {
  checkedAt: string;
  billingReady: false;
  paymentReady: false;
  invoiceReady: false;
  tenantBillingReady: false;
  productionFinancialOperationsReady: false;
  claim: "not_claimed";
  financialTruth: {
    sourceId: string;
    sourceName: string;
    sourceType: string;
    authorityLevel: string;
    state: string;
    claimImpact: string;
    evidence: readonly string[];
    caveats: readonly string[];
    blockers: readonly string[];
    unsupportedStates: readonly string[];
    deferredStates: readonly string[];
  };
  billingBoundary: {
    billingBoundaryStatus: string;
    billingIntent: string;
    billableEventModel: string;
    financialTruthDependency: string;
    productApiSourceOfTruthDependency: string;
    readinessGates: readonly string[];
    blockers: readonly string[];
    warnings: readonly string[];
    caveats: readonly string[];
    deferredScope: readonly string[];
    noClaimPosture: string;
  };
  billableEventCandidates: readonly {
    eventId: string;
    eventType: string;
    eventSource: string;
    tenantAccountContext: string;
    actorContext: string;
    operationRunCorrelation: string;
    pricingDependency: string;
    invoiceDependency: string;
    paymentDependency: string;
    state: string;
    caveats: readonly string[];
    blockers: readonly string[];
  }[];
  readinessGates: readonly {
    id: string;
    label: string;
    status: "not_started" | "candidate" | "partial" | "blocked" | "deferred";
    evidence: readonly string[];
    blockers: readonly string[];
    caveats: readonly string[];
    claimImpact: string | readonly string[];
  }[];
  blockers: readonly string[];
  warnings: readonly string[];
  caveats: readonly string[];
  deferredScope: readonly string[];
  sourceEvidence: readonly string[];
  claimDiscipline: {
    billingReadyClaimAllowed: false;
    paymentReadyClaimAllowed: false;
    invoiceReadyClaimAllowed: false;
    tenantBillingReadyClaimAllowed: false;
    productionFinancialOperationsClaimAllowed: false;
    reason: string;
  };
};

export type PaymentRailsBoundaryReport = {
  checkedAt: string;
  paymentReady: false;
  billingReady: false;
  invoiceReady: false;
  tenantBillingReady: false;
  productionFinancialOperationsReady: false;
  refundReady: false;
  chargebackReady: false;
  claim: "not_claimed";
  paymentProviderBoundary: {
    providerId: string;
    providerName: string;
    providerType: string;
    providerState: "candidate" | "planned" | "unavailable" | "unsupported" | "deferred" | "blocked" | "not_started";
    integrationState: "not_integrated" | "candidate_only" | "boundary_modeled" | "unsupported" | "deferred";
    credentialBoundaryState: "not_configured" | "deferred" | "unsupported" | "blocked" | "planned";
    authorizationSupportState: "candidate" | "planned" | "unavailable" | "unsupported" | "deferred" | "blocked" | "not_started";
    captureSupportState: "candidate" | "planned" | "unavailable" | "unsupported" | "deferred" | "blocked" | "not_started";
    refundSupportState: "candidate" | "planned" | "unavailable" | "unsupported" | "deferred" | "blocked" | "not_started";
    chargebackSupportState: "candidate" | "planned" | "unavailable" | "unsupported" | "deferred" | "blocked" | "not_started";
    settlementDependency: string;
    evidence: readonly string[];
    blockers: readonly string[];
    caveats: readonly string[];
    deferredStates: readonly string[];
  };
  authorizationCaptureBoundary: {
    authorizationIntent: string;
    authorizationState: "not_started" | "candidate" | "unsupported" | "deferred" | "blocked" | "unavailable";
    captureState: "not_started" | "not_allowed" | "unsupported" | "deferred" | "blocked" | "unavailable";
    captureDependency: string;
    settlementDependency: string;
    failureStates: readonly string[];
    claimImpact: readonly string[];
  };
  noMoneyMovementGuardrail: {
    active: true;
    statements: readonly string[];
  };
  failureDeferredStates: readonly string[];
  refundChargebackBoundary: {
    refundBoundary: string;
    chargebackBoundary: string;
    disputeWorkflowDependency: string;
    providerDependency: string;
    accountingDependency: string;
    complianceCaveat: string;
    riskCaveats: readonly string[];
    claimImpact: readonly string[];
  };
  paymentSecretBoundary: {
    credentialState: "not_configured" | "deferred" | "unsupported" | "blocked" | "planned";
    requiredSecretsClass: readonly string[];
    storageRequirement: string;
    injectionBoundary: string;
    redactionRequirement: string;
    productionCredentialStatus: string;
    blockers: readonly string[];
    caveats: readonly string[];
  };
  readinessGates: readonly {
    id: string;
    label: string;
    status: "not_started" | "candidate" | "partial" | "blocked" | "deferred";
    evidence: readonly string[];
    blockers: readonly string[];
    caveats: readonly string[];
    claimImpact: readonly string[];
  }[];
  blockers: readonly string[];
  warnings: readonly string[];
  caveats: readonly string[];
  deferredScope: readonly string[];
  sourceEvidence: readonly string[];
  claimDiscipline: {
    paymentReadyClaimAllowed: false;
    refundReadyClaimAllowed: false;
    chargebackReadyClaimAllowed: false;
    billingReadyClaimAllowed: false;
    productionFinancialOperationsClaimAllowed: false;
    reason: string;
  };
};

export type PricingInvoiceBoundaryReport = {
  checkedAt: number;
  pricingReady: false;
  invoiceReady: false;
  billingReady: false;
  paymentReady: false;
  tenantBillingReady: false;
  productionFinancialOperationsReady: false;
  taxReady: false;
  complianceReady: false;
  claim: "not_claimed";
  pricingBoundary: {
    pricingBoundaryStatus: string;
    pricingSource: string;
    pricingAuthority: string;
    pricingState: string;
    financialTruthDependency: string;
    billableEventDependency: string;
    quoteDependency: string;
    caveats: readonly string[];
    blockers: readonly string[];
    unsupportedStates: readonly string[];
    deferredStates: readonly string[];
  };
  quoteCandidates: readonly {
    quoteCandidateId: string;
    relatedBillableEvent: string;
    pricingSourceDependency: string;
    amountState: string;
    currencyState: string;
    validityState: string;
    approvalState: string;
    caveats: readonly string[];
    blockers: readonly string[];
    deferredStates: readonly string[];
  }[];
  quoteToInvoiceFlow: {
    status: string;
    prerequisites: readonly string[];
    requiredApprovals: readonly string[];
    requiredFinancialTruth: string;
    requiredPricingSource: string;
    requiredInvoiceBoundary: string;
    requiredComplianceTaxDecision: string;
    blockers: readonly string[];
    caveats: readonly string[];
  };
  invoiceCandidates: readonly {
    invoiceCandidateId: string;
    relatedQuoteCandidate: string;
    relatedBillableEvent: string;
    artifactState: string;
    legalTaxState: string;
    approvalState: string;
    complianceState: string;
    paymentDependency: string;
    caveats: readonly string[];
    blockers: readonly string[];
    deferredStates: readonly string[];
  }[];
  invoiceArtifactBoundary: {
    invoiceCandidate: string;
    operationalInvoiceArtifact: string;
    legalTaxInvoice: string;
    taxCompliantInvoice: string;
    accountingInvoice: string;
    receipt: string;
    paymentRequest: string;
    legalTaxInvoiceReadiness: string;
    complianceReadiness: string;
    accountingIntegration: string;
    countrySpecificTaxAutomation: string;
    caveats: readonly string[];
    blockers: readonly string[];
  };
  readinessGates: readonly {
    id: string;
    label: string;
    status: "not_started" | "candidate" | "partial" | "blocked" | "deferred";
    evidence: readonly string[];
    blockers: readonly string[];
    caveats: readonly string[];
    claimImpact: readonly string[];
  }[];
  blockers: readonly string[];
  warnings: readonly string[];
  caveats: readonly string[];
  deferredScope: readonly string[];
  sourceEvidence: readonly string[];
  claimDiscipline: {
    pricingReadyClaimAllowed: false;
    invoiceReadyClaimAllowed: false;
    billingReadyClaimAllowed: false;
    paymentReadyClaimAllowed: false;
    tenantBillingReadyClaimAllowed: false;
    productionFinancialOperationsClaimAllowed: false;
    taxReadyClaimAllowed: false;
    complianceReadyClaimAllowed: false;
    reason: string;
  };
};

export type TenantBillingBoundaryReport = {
  checkedAt: string;
  tenantBillingReady: false;
  billingReady: false;
  paymentReady: false;
  invoiceReady: false;
  productionFinancialOperationsReady: false;
  tenantAdministrationReady: false;
  claim: "not_claimed";
  tenantAccountResponsibility: {
    tenantId: string;
    tenantAccountId: string;
    accountOwnerState: string;
    billingResponsibilityState: string;
    payerDependency: string;
    operatorDependency: string;
    financialTruthDependency: string;
    invoiceDependency: string;
    paymentDependency: string;
    evidence: readonly string[];
    blockers: readonly string[];
    caveats: readonly string[];
    deferredStates: readonly string[];
  };
  payerIdentityBoundary: {
    payerId: string;
    payerType: string;
    payerVerificationState: string;
    payerAuthorityState: string;
    billingAccountabilityState: string;
    paymentDependency: string;
    complianceDependency: string;
    caveats: readonly string[];
    blockers: readonly string[];
  };
  operatorIdentityBoundary: {
    operatorId: string;
    operatorRole: string;
    operationAuthorityState: string;
    billingActionAuthorityState: string;
    auditResponsibility: string;
    actorCorrelation: string;
    caveats: readonly string[];
    blockers: readonly string[];
  };
  actorMatrix: readonly {
    actor: string;
    responsibility: string;
    authority: string;
    supportState: string;
    claimImpact: string;
    missingGates: readonly string[];
  }[];
  accountOwnershipBoundary: {
    accountOwnershipSource: string;
    billingAccountabilitySource: string;
    ownerVerificationState: string;
    payerRelation: string;
    tenantRelation: string;
    invoiceRelation: string;
    paymentRelation: string;
    auditRelation: string;
    blockers: readonly string[];
    caveats: readonly string[];
  };
  billingAccountabilityBoundary: {
    accountabilitySource: string;
    accountabilityState: string;
    authorityState: string;
    invoiceDependency: string;
    paymentDependency: string;
    auditDependency: string;
    caveats: readonly string[];
    blockers: readonly string[];
  };
  readinessGates: readonly {
    id: string;
    label: string;
    status: "not_started" | "candidate" | "partial" | "blocked" | "deferred";
    evidence: readonly string[];
    blockers: readonly string[];
    caveats: readonly string[];
    claimImpact: string;
  }[];
  blockers: readonly string[];
  warnings: readonly string[];
  caveats: readonly string[];
  deferredScope: readonly string[];
  sourceEvidence: readonly string[];
  claimDiscipline: {
    tenantBillingReadyClaimAllowed: false;
    tenantAdministrationReadyClaimAllowed: false;
    billingReadyClaimAllowed: false;
    paymentReadyClaimAllowed: false;
    invoiceReadyClaimAllowed: false;
    productionFinancialOperationsClaimAllowed: false;
    reason: string;
  };
};

export type SettlementReconciliationBoundaryReport = {
  checkedAt: number;
  receiptReady: false;
  legalTaxReceiptReady: false;
  settlementReady: false;
  reconciliationReady: false;
  accountingIntegrationReady: false;
  billingReady: false;
  paymentReady: false;
  invoiceReady: false;
  tenantBillingReady: false;
  productionFinancialOperationsReady: false;
  taxReady: false;
  complianceReady: false;
  claim: "not_claimed";
  operationalReceiptBoundary: {
    receiptCandidateId: string;
    receiptType: string;
    relatedInvoiceCandidate: string;
    relatedQuoteCandidate: string;
    relatedBillableEvent: string;
    relatedTenantAccountContext: string;
    relatedPayerOperatorContext: string;
    artifactState: string;
    legalTaxClassificationState: string;
    sourceEvidence: readonly string[];
    caveats: readonly string[];
    blockers: readonly string[];
    deferredStates: readonly string[];
  };
  legalTaxReceiptBoundary: {
    operationalReceipt: string;
    paymentAcknowledgement: string;
    invoiceArtifact: string;
    taxLegalReceipt: string;
    accountingReceipt: string;
    settlementReceipt: string;
    legalTaxReceiptReadiness: string;
    complianceReadiness: string;
    accountingIntegration: string;
    jurisdictionDecision: string;
    fiscalDocumentGeneration: string;
    caveats: readonly string[];
    blockers: readonly string[];
  };
  settlementVisibility: {
    settlementCandidateId: string;
    relatedPaymentBoundary: string;
    providerDependency: string;
    paymentStateDependency: string;
    settlementState: string;
    settlementEvidence: readonly string[];
    settlementSource: string;
    amountAvailabilityState: string;
    currencyAvailabilityState: string;
    settledAtAvailabilityState: string;
    blockers: readonly string[];
    caveats: readonly string[];
    deferredStates: readonly string[];
  };
  reconciliationEvidence: {
    reconciliationCandidateId: string;
    relatedReceiptCandidate: string;
    relatedSettlementCandidate: string;
    relatedInvoiceCandidate: string;
    relatedTenantAccount: string;
    evidenceSources: readonly string[];
    matchingState: string;
    discrepancyState: string;
    accountingDependency: string;
    providerDependency: string;
    blockers: readonly string[];
    caveats: readonly string[];
    deferredStates: readonly string[];
  };
  providerAccountingDependencies: {
    paymentProviderDependency: string;
    accountingSystemDependency: string;
    ledgerDependency: string;
    bankSettlementDependency: string;
    jurisdictionTaxDependency: string;
    dataAvailability: string;
    state: string;
    caveats: readonly string[];
    blockers: readonly string[];
  };
  readinessGates: readonly {
    id: string;
    label: string;
    status: "not_started" | "candidate" | "partial" | "blocked" | "deferred";
    evidence: readonly string[];
    blockers: readonly string[];
    caveats: readonly string[];
    claimImpact: string;
  }[];
  blockers: readonly string[];
  warnings: readonly string[];
  caveats: readonly string[];
  deferredScope: readonly string[];
  sourceEvidence: readonly string[];
  claimDiscipline: {
    receiptReadyClaimAllowed: false;
    legalTaxReceiptReadyClaimAllowed: false;
    settlementReadyClaimAllowed: false;
    reconciliationReadyClaimAllowed: false;
    accountingIntegrationReadyClaimAllowed: false;
    billingReadyClaimAllowed: false;
    paymentReadyClaimAllowed: false;
    productionFinancialOperationsClaimAllowed: false;
    reason: string;
  };
};

export type FinancialAuditBoundaryReport = {
  checkedAt: number;
  financialAuditReady: false;
  complianceReady: false;
  taxReady: false;
  billingReady: false;
  paymentReady: false;
  invoiceReady: false;
  tenantBillingReady: false;
  receiptReady: false;
  settlementReady: false;
  reconciliationReady: false;
  productionFinancialOperationsReady: false;
  claim: "not_claimed";
  financialAuditTrailBoundary: {
    auditTrailId: string;
    auditTrailScope: string;
    relatedFinancialTruthSource: string;
    relatedBillableEvent: string;
    relatedQuoteInvoiceCandidate: string;
    relatedPaymentBoundary: string;
    relatedTenantAccountResponsibility: string;
    relatedReceiptSettlementReconciliationEvidence: string;
    correlationState: string;
    auditGradeState: string;
    evidenceCompleteness: string;
    blockers: readonly string[];
    caveats: readonly string[];
    deferredStates: readonly string[];
  };
  evidenceCorrelationMatrix: readonly {
    source: string;
    correlationState: string;
    evidenceState: string;
    missingDependency: string;
    claimImpact: string;
  }[];
  complianceBoundary: {
    domains: readonly {
      complianceDomain: string;
      readinessState: string;
      jurisdictionDependency: string;
      approvalRequirement: string;
    }[];
  };
  taxLegalReadinessBoundary: {
    legalInvoiceReadiness: string;
    taxInvoiceReadiness: string;
    legalReceiptReadiness: string;
    taxReceiptReadiness: string;
    jurisdictionDecision: string;
    fiscalDocumentGeneration: string;
    taxAutomation: string;
    legalReview: string;
    blockers: readonly string[];
    deferredStates: readonly string[];
  };
  financialRiskRegister: readonly {
    riskId: string;
    riskCategory: string;
    riskDescription: string;
    severity: string;
    likelihood: string;
    mitigationState: string;
    ownerBoundary: string;
  }[];
  noClaimDiscipline: {
    claims: readonly {
      claimName: string;
      currentValue: false;
      claimStatus: "not_claimed";
    }[];
  };
  readinessGates: readonly {
    id: string;
    label: string;
    status: "not_started" | "candidate" | "partial" | "blocked" | "deferred";
    evidence: readonly string[];
    blockers: readonly string[];
    caveats: readonly string[];
    claimImpact: string;
  }[];
  blockers: readonly string[];
  warnings: readonly string[];
  caveats: readonly string[];
  deferredScope: readonly string[];
  sourceEvidence: readonly string[];
};

export type Epic11AcceptanceCheck = {
  id: string;
  label: string;
  status: "pass" | "caveat" | "not_run";
  evidence: string;
};

export type Epic11MilestoneStatus = {
  id: string;
  label: string;
  status: "PASS" | "PASS_WITH_CAVEAT";
  evidence: string;
};

export type Epic11AcceptanceReport = {
  epic: "epic-11";
  milestone: "F";
  title: string;
  milestoneStatuses: readonly Epic11MilestoneStatus[];
  supportedSurfaces: readonly string[];
  knownCaveats: readonly string[];
  productionReadiness: {
    ready: false;
    status: "not_claimed";
    note: string;
  };
  deferredItems: readonly string[];
  validationSummary: readonly Epic11AcceptanceCheck[];
  guardrails: ProductApiOperationalGuardrails & { productionReady: false; sourceOfTruth: "product-api" };
  checkedAt: string;
};

export type EntityReference = {
  entityType: string;
  entityId: string;
  label?: string;
  correlationId?: string;
};

export type CorrelationReference = {
  correlationId: string;
  entityType?: string;
  entityId?: string;
};

export type AvailableAction = {
  action: string;
  label: string;
  available: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
};

export type EventRecord = {
  eventId: string;
  type: string;
  source: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  entityRefs?: EntityReference[];
  correlationId?: string;
  createdAt: number;
  availableActions?: AvailableAction[];
  guardrails?: ProductApiOperationalGuardrails;
};

export type LogSummary = {
  logId: string;
  source: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  entityRefs?: EntityReference[];
  correlationId?: string;
  createdAt: number;
  availableActions?: AvailableAction[];
  guardrails?: ProductApiOperationalGuardrails;
};

export type LogAvailability = {
  available: boolean;
  count: number;
  total: number;
  availability: "full" | "partial" | "limited" | "unavailable";
};

export type AuditEntry = {
  auditId: string;
  actor: string;
  actorType: string;
  operation: string;
  entityType: string;
  entityId: string;
  entityRefs?: EntityReference[];
  status: "success" | "failure" | "pending";
  message: string;
  errorCode?: string;
  correlationId?: string;
  createdAt: number;
  guardrails?: ProductApiOperationalGuardrails;
};

export type EvidenceRecord = {
  evidenceId: string;
  kind: string;
  title: string;
  summary: string;
  entityRefs?: EntityReference[];
  findings?: Array<{ severity: "info" | "warning" | "error"; title: string; description: string }>;
  correlationId?: string;
  source: string;
  createdAt: number;
  guardrails?: ProductApiOperationalGuardrails;
};

export type DiagnosticReport = {
  diagnosticId: string;
  status: "pass" | "fail" | "error" | "warning" | "unknown";
  summary: string;
  entityRefs?: EntityReference[];
  findings?: Array<{ severity: "info" | "warning" | "error"; title: string; description: string }>;
  recommendedActions?: string[];
  correlationId?: string;
  createdAt: number;
  guardrails?: ProductApiOperationalGuardrails;
};

export type EconomicSummary = {
  checkedAt: number;
  currency: string;
  unit: string;
  neuronsContext: string;
  totalEstimated: number;
  totalReserved: number;
  totalMetered: number;
  totalSettled: number;
  agentConsumption: Array<{ entityId: string; amount: number; unit: string; status: "available" | "limited" | "unavailable" }>;
  deploymentConsumption: Array<{ entityId: string; amount: number; unit: string; status: "available" | "limited" | "unavailable" }>;
  runtimeConsumption: Array<{ entityId: string; amount: number; unit: string; status: "available" | "limited" | "unavailable" }>;
  executionRunConsumption: Array<{ entityId: string; amount: number; unit: string; status: "available" | "limited" | "unavailable" }>;
  warnings: Array<{ severity: "info" | "warning" | "error"; message: string }>;
  availableActions: AvailableAction[];
  guardrails?: ProductApiOperationalGuardrails;
};

export type Quote = {
  quoteId: string;
  agentId: string;
  amount: number;
  unit: string;
  status: "draft" | "pending" | "confirmed" | "rejected" | "expired" | "completed";
  expiresAt: number;
  policyLimits: string[];
  eligibility: { eligible: boolean; reasons: string[] };
  warnings: string[];
  evidenceRefs?: EntityReference[];
  availableActions: AvailableAction[];
  createdAt: number;
  guardrails?: ProductApiOperationalGuardrails;
};

export type Reservation = {
  reservationId: string;
  quoteId: string;
  agentId: string;
  executionRunId?: string;
  amount: number;
  unit: string;
  status: "pending" | "reserved" | "cancelled" | "failed" | "confirmed";
  expiresAt: number;
  failureReason?: string;
  evidenceRefs?: EntityReference[];
  availableActions: AvailableAction[];
  createdAt: number;
  guardrails?: ProductApiOperationalGuardrails;
};

export type MeteringRecord = {
  meterId: string;
  executionRunId: string;
  runtimeId: string;
  agentId: string;
  providerId?: string;
  target: string;
  amount: number;
  unit: string;
  usage: Array<{ dimension: string; value: number; unit: string }>;
  status: "active" | "inactive" | "pending" | "settled" | "failed";
  createdAt: number;
  evidenceRefs?: EntityReference[];
  guardrails?: ProductApiOperationalGuardrails;
};

export type Settlement = {
  settlementId: string;
  meterId: string;
  executionRunId: string;
  amount: number;
  unit: string;
  status: "pending" | "settled" | "failed" | "partial";
  failureReason?: string;
  receiptId?: string;
  createdAt: number;
  completedAt?: number;
  evidenceRefs?: EntityReference[];
  availableActions: AvailableAction[];
  guardrails?: ProductApiOperationalGuardrails;
};

export type Receipt = {
  receiptId: string;
  settlementId: string;
  executionRunId: string;
  amount: number;
  unit: string;
  status: "issued" | "settled" | "failed";
  issuedAt: number;
  summary: string;
  evidenceRefs?: EntityReference[];
  guardrails?: ProductApiOperationalGuardrails;
};

export type UsageInspectionRecord = {
  usageId: string;
  executionRunId: string;
  runtimeId?: string;
  agentId?: string;
  deploymentId?: string;
  tenantId?: string;
  authorizationDecisionId?: string;
  reservationId?: string;
  settlementId?: string;
  quoteId?: string;
  measurementSource: string;
  dimension: string;
  quantity: string;
  unit: string;
  observedAt: number;
  recordedAt: number;
  measurementState: string;
  settlementState: string;
  status: string;
  pricingState: string;
  pricingProvenance?: string;
  evidenceRefs?: string[];
};

export type ReconciliationBacklogItem = {
  reconciliationId: string;
  tenantId?: string;
  settlementId?: string;
  usageId?: string;
  receiptId?: string;
  executionRunId?: string;
  reservationId?: string;
  quoteId?: string;
  providerReference?: string;
  state: string;
  mismatchClass?: string;
  mismatch?: boolean;
  operatorActionRequired: boolean;
  exceptionOpen: boolean;
  observedStatus?: string;
  expectedStatus?: string;
  evaluatedAt: number;
  lastEvaluatedAt: number;
  evidenceRefs?: string[];
};

export type ReconciliationMismatch = {
  mismatchId: string;
  reconciliationId: string;
  tenantId?: string;
  classification: string;
  severity: "warning" | "error";
  settlementId?: string;
  usageId?: string;
  receiptId?: string;
  executionRunId?: string;
  observedStatus?: string;
  expectedStatus?: string;
  detectedAt: number;
  lastEvaluatedAt: number;
  retryable: boolean;
  evidenceRefs?: string[];
};

export type FinancialException = {
  exceptionId: string;
  tenantId?: string;
  mismatchId: string;
  reconciliationId: string;
  category: string;
  severity: "warning" | "error";
  status: string;
  settlementId?: string;
  usageId?: string;
  receiptId?: string;
  executionRunId?: string;
  openedAt: number;
  updatedAt: number;
  acknowledgedAt?: number;
  closedAt?: number;
  actor?: string;
  justification?: string;
  evidenceRefs?: string[];
};

export type FinancialRemediation = {
  remediationId: string;
  tenantId?: string;
  exceptionId: string;
  mismatchId: string;
  reconciliationId: string;
  requestedAction: string;
  actor?: string;
  reason?: string;
  authorizationOutcome: string;
  idempotencyKey: string;
  status: string;
  requestedAt: number;
  startedAt?: number;
  completedAt?: number;
  outcome?: string;
  failureClassification?: string;
  resultingExceptionStatus?: string;
  evidenceRefs?: string[];
};

export type CompositionActionName =
  | "assignRole"
  | "adoptRole"
  | "assignProfile"
  | "adoptProfile"
  | "assignSkill"
  | "unassignSkill"
  | "installSkill"
  | "removeSkill"
  | "assignTool"
  | "unassignTool"
  | "installPlugin"
  | "removePlugin"
  | "selectEngine"
  | "selectProvider"
  | "selectModel";

export type CompositionActionView = {
  action: CompositionActionName;
  label: string;
  available: false;
  reason: string;
  requiresConfirmation?: boolean;
};

export type CompositionSummary = {
  checkedAt: number;
  stale: false;
  guardrails: ProductApiOperationalGuardrails;
  roleCount: number;
  profileCount: number;
  capabilityCount: number;
  skillCount: number;
  toolCount: number;
  pluginCount: number;
  engineCount: number;
  providerCount: number;
  modelCount?: number;
  warningCount: number;
  missingRequirementCount: number;
  conflictCount: number;
};

export type RoleSummary = {
  roleId: string;
  name: string;
  description: string;
  capabilities: string[];
  revision: number;
  usageCount: number;
  status: string;
  availableActions: CompositionActionView[];
};

export type ProfileSummary = {
  profileId: string;
  name: string;
  description: string;
  openClawCompatible: boolean;
  legacyProfileVisible: boolean;
  sections: string[];
  revision: number;
  usageCount: number;
  status: string;
  availableActions: CompositionActionView[];
};

export type CapabilitySummary = {
  capabilityId: string;
  name: string;
  source: string;
  type: string;
  level?: string;
  requirements: string[];
  conflicts: string[];
  usageCount: number;
  status: string;
};

export type SkillSummary = {
  skillId: string;
  name: string;
  description: string;
  installed: boolean;
  assigned: boolean;
  capabilities: string[];
  requirements: string[];
  compatibility: "compatible" | "unverified" | "unavailable";
  usageCount: number;
  availableActions: CompositionActionView[];
};

export type ToolSummary = {
  toolId: string;
  name: string;
  description: string;
  assigned: boolean;
  capabilities: string[];
  requirements: string[];
  availability: "available" | "unavailable";
  usageCount: number;
  availableActions: CompositionActionView[];
};

export type PluginSummary = {
  pluginId: string;
  packageId: string;
  name: string;
  source: string;
  installed: boolean;
  dependencies: string[];
  compatibility: "compatible" | "unverified" | "unavailable";
  failureState: "none" | "unavailable";
  availableActions: CompositionActionView[];
};

export type PluginPackage = {
  packageId: string;
  name: string;
  source: string;
  version?: string;
  status: "available" | "unavailable";
};

export type PackageSource = {
  sourceId: string;
  name: string;
  type: string;
  status: "available" | "unavailable";
};

export type EngineSummary = {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  deploymentModes: string[];
  availability: "ready" | "degraded" | "unavailable" | "misconfigured" | "unverified";
  credentialRequired: false;
  compatibility: "compatible" | "unverified";
  usageCount: number;
  availableActions: CompositionActionView[];
};

export type ProviderSummary = {
  id: string;
  name: string;
  type: string[];
  capabilities: string[];
  availability: "available" | "pending" | "unavailable";
  credentialRequired: boolean;
  compatibility: "compatible" | "pending" | "not-configured";
  usageCount: number;
  availableActions: CompositionActionView[];
};

export type ModelSummary = {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  availability: "available" | "preview" | "deprecated" | "unavailable";
  credentialRequired: boolean;
  compatibility: "compatible" | "pending" | "not-configured";
  usageCount: number;
  availableActions: CompositionActionView[];
};

export type CapabilitySourceEntry = {
  capabilityId: string;
  name: string;
  sources: string[];
  status: string;
};

export type EffectiveCapabilities = {
  agentId: string;
  capabilityIds: string[];
  sources: CapabilitySourceEntry[];
  checkedAt: number;
};

export type CompatibilityReport = {
  agentId: string;
  missingRequirements: CompositionFinding[];
  conflicts: CompositionFinding[];
  warnings: CompositionFinding[];
  ready: boolean;
  checkedAt: number;
};

export type AgentCompositionDetail = {
  agentId: string;
  agentName: string;
  currentRevisionId: number;
  roleSummary?: RoleSummary;
  profileSummary?: ProfileSummary;
  effectiveCapabilities: CapabilitySourceEntry[];
  skills: SkillSummary[];
  tools: ToolSummary[];
  plugins: PluginSummary[];
  engine?: EngineSummary;
  provider?: ProviderSummary;
  model?: ModelSummary;
  compatibilitySummary: CompatibilityReport;
  missingRequirements: CompositionFinding[];
  conflicts: CompositionFinding[];
  readinessSummary: AgentReadinessSummary;
  availableActions: CompositionActionView[];
  guardrails: ProductApiOperationalGuardrails;
  checkedAt: number;
  stale: false;
};

export type CompositionOperationResult = {
  ok: boolean;
  operation: string;
  entityType: string;
  entityId: string;
  status: string;
  message: string;
  warnings: string[];
  errors: string[];
  auditRef?: string;
  completedAt: number;
};

export type ProductApiReadinessLink = {
  state: "ready" | "partial" | "blocked" | "unverified";
  blockerCount: number;
  warningCount: number;
  evidenceCount: number;
  checkedAt: number;
};

export type DashboardSummary = {
  system: {
    service: string;
    status: "ok";
    mode: string;
    automation: string;
    readOnly: true;
    generatedAt: number;
    checkedAt: number;
    stale: boolean;
    refreshWindowMs: number;
    stateAgeMs: number;
    guardrails: ProductApiOperationalGuardrails;
  };
  agents: {
    total: number;
    draft: number;
    active: number;
    disabled: number;
    archived: number;
  };
  deployments: {
    total: number;
    deployed: number;
    failed: number;
    rejected: number;
  };
  runtimes: {
    total: number;
    pending: number;
    starting: number;
    running: number;
    stopping: number;
    stopped: number;
    failed: number;
    terminated: number;
  };
  workers: {
    total: number;
    registered: number;
    available: number;
    degraded: number;
    unavailable: number;
    stale: number;
    activeAssignments: number;
    availableSlots: number;
  };
  executionRuns: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    recent: {
      runId: string;
      runtimeInstanceId: string;
      agentId: string;
      executionPlanId: string;
      status: "pending" | "running" | "completed" | "failed" | "cancelled";
      startedAt: number;
      completedAt?: number;
    }[];
  };
  blockers: DashboardFinding[];
  warnings: DashboardFinding[];
  readiness: ProductApiReadinessLink;
  runtime: {
    connectivity: ProductApiRuntimeConnectivity;
    checkedAt: number;
  };
  activeProfile: {
    activeProfile: "development" | "integration" | "production_like_single_host" | "distributed_production";
    expectedReadiness: "development" | "production";
    status: "development_profile" | "ready" | "blocked";
    message: string;
  };
  activeComposition: {
    identity: string;
    secrets: string;
    persistence: string;
    telemetry: string;
    workers: string;
    deployment: string;
  };
  certifiedCapabilities: {
    id: string;
    label: string;
    status: "available" | "active" | "blocked";
    topology: string;
    detail: string;
  }[];
  globalCaveats: DashboardFinding[];
};

export type ProductApiRuntimeConnectivity = "connected" | "degraded" | "unavailable" | "unverified";

export type ProductApiHealthStatus = "ok" | "degraded" | "unavailable" | "unverified";

export type ProductApiReadinessFlagStatus = "ready" | "partial" | "blocked" | "unverified";

export type ReadinessFinding = {
  domain: string;
  component: string;
  severity: "info" | "warning" | "error";
  currentState: string;
  requiredState: string;
  reason: string;
  recommendedRemediation: string;
  blocksProduction: boolean;
};

export type ReadinessDomainReport = {
  domain: string;
  status: "ready" | "partial" | "blocked";
  currentState: string;
  requiredState: string;
  evidence: string[];
  findings: ReadinessFinding[];
};

export type GlobalReadinessSummary = {
  generatedAt: number;
  mode: "inspection";
  readOnly: true;
  stale: boolean;
  refreshWindowMs: number;
  stateAgeMs: number;
  guardrails: ProductApiOperationalGuardrails;
  productApi: {
    service: string;
    status: "ok";
    mode: string;
    automation: string;
    checkedAt: number;
    checkMode: "inspection-read-only";
  };
  runtime: {
    connectivity: ProductApiRuntimeConnectivity;
    checkedAt: number;
    engines: {
      id: string;
      provider: string;
      status: string;
    }[];
  };
  healthIndicators: {
    id: string;
    label: string;
    status: ProductApiHealthStatus;
    detail: string;
  }[];
  readinessFlags: {
    id: string;
    label: string;
    status: ProductApiReadinessFlagStatus;
    detail: string;
  }[];
  readiness: {
    devReady: boolean;
    distributedRuntimeReady: boolean;
    productionReady: boolean;
    status: "ready" | "partial" | "blocked";
    blockerCount: number;
    warningCount: number;
    evidenceCount: number;
    refreshedAt: number;
  };
  components: {
    domain: string;
    status: "ready" | "partial" | "blocked";
    currentState: string;
    requiredState: string;
  }[];
  blockers: ReadinessFinding[];
  warnings: ReadinessFinding[];
  evidence: ReadinessDomainReport[];
};

export type OperationalFinding = {
  code: string;
  severity: "error" | "warning" | "info";
  domain: string;
  component: string;
  message: string;
  recommendedRemediation?: string;
};

export type OperationalEvidence = {
  domain: string;
  component: string;
  status: "ready" | "partial" | "blocked";
  currentState: string;
  requiredState: string;
  evidenceRefs: string[];
};

export type OperationActionView = {
  action: string;
  label: string;
  available: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  destructive?: boolean;
};

export type CredentialSummary = {
  credentialId: string;
  providerId: string;
  providerName: string;
  status: string;
  usageCount: number;
  secretRefRedacted: string;
  validated: boolean;
  lastValidatedAt?: number;
  availableActions: OperationActionView[];
  guardrails: ProductApiOperationalGuardrails;
};

export type CredentialSecretMutation = {
  credentialId: string;
  providerId: string;
  type: string;
  status: string;
  scopes: string[];
  secret?: { secretId: string; backend: string; version?: string; status: "active" | "revoked" };
  updatedAt: number;
};

export type ProviderConnectionSummary = {
  connectionId: string;
  providerId: string;
  providerName: string;
  credentialId: string;
  health: "healthy" | "degraded" | "unavailable" | "unverified";
  authState: string;
  availability: "available" | "pending" | "unavailable";
  lastCheckedAt: number;
  errors: string[];
  availableActions: OperationActionView[];
  guardrails: ProductApiOperationalGuardrails;
};

export type ReadinessCategory = {
  id: string;
  label: string;
  status: "ready" | "partial" | "blocked" | "unavailable";
  blockerCount: number;
  warningCount: number;
  findings: OperationalFinding[];
};

export type AgentReadinessDetail = {
  agentId: string;
  agentName: string;
  currentRevisionId: number;
  ready: boolean;
  status: "ready" | "partial" | "blocked" | "unavailable";
  categories: ReadinessCategory[];
  blockers: OperationalFinding[];
  warnings: OperationalFinding[];
  evidence: OperationalEvidence[];
  economicReadinessSummary: AgentEconomicSummary;
  availableActions: OperationActionView[];
  guardrails: ProductApiOperationalGuardrails;
  checkedAt: number;
  stale: boolean;
};

export type DeploymentPlan = {
  planId: string;
  agentId: string;
  revisionId: number;
  target: string;
  engine: string;
  provider: string;
  workerRequirements: string[];
  credentialRequirements: string[];
  policyEvaluation: string[];
  sandboxConstraints: string[];
  economicReadinessSummary: AgentEconomicSummary;
  eligible: boolean;
  blockers: OperationalFinding[];
  warnings: OperationalFinding[];
  evidence: OperationalEvidence[];
  availableActions: OperationActionView[];
  createdAt: number;
  expiresAt?: number;
};

export type ExecutionPlan = DeploymentPlan;

export type DeploymentSummary = {
  deploymentId: string;
  agentId: string;
  revisionId: number;
  status: "pending" | "validating" | "deploying" | "deployed" | "active" | "degraded" | "failed" | "rejected" | "rolling_back" | "rolled_back" | "rollback_failed" | "stopped";
  target: string;
  engine: string;
  workerId?: string;
  runtimeId?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  lastOperation?: string;
  errors: string[];
  availableActions: OperationActionView[];
  guardrails: ProductApiOperationalGuardrails;
  deploymentMode?: "sandbox" | "staged" | "live";
  health?: "unknown" | "ready" | "degraded" | "unhealthy";
  recordRevision?: number;
  predecessorDeploymentId?: string;
  productionReadinessDecisionId?: string;
  reasonCode?: string;
};

export type ProductionReadinessCheck = {
  code: string;
  category: string;
  requirement: "HARD_BLOCKER" | "REQUIRED" | "DEGRADED_ALLOWED" | "INFORMATIONAL";
  status: "PASS" | "BLOCKED" | "DEGRADED" | "INFORMATIONAL";
  reason: string;
  requiredAction?: string;
};

export type ProductionReadinessDecision = {
  decisionId: string;
  allowed: boolean;
  level: "BLOCKED" | "PRODUCTION_LIKE_SINGLE_HOST";
  topology: "PRODUCTION_LIKE_SINGLE_HOST";
  targetId: string;
  checkedAt: number;
  expiresAt: number;
  checks: ProductionReadinessCheck[];
  blockers: ProductionReadinessCheck[];
  degradations: ProductionReadinessCheck[];
};

export type RuntimeSummary = {
  runtimeId: string;
  deploymentId: string;
  agentId: string;
  workerId: string;
  target: string;
  engine: string;
  status: "pending" | "starting" | "running" | "stopping" | "stopped" | "failed" | "terminated";
  health: "healthy" | "degraded" | "unhealthy" | "unknown";
  ageMs: number;
  lastActivityAt?: number;
  isolationState: "isolated" | "shared" | "unknown";
  driftState: "none" | "drifted" | "unknown";
  reconciliationState: "none" | "pending" | "reconciling" | "reconciled" | "failed";
  failureState: "none" | "failed" | "recovering";
  availableActions: OperationActionView[];
  guardrails: ProductApiOperationalGuardrails;
};

export type ExecutionRunSummary = {
  runId: string;
  runtimeId: string;
  deploymentId: string;
  agentId: string;
  revisionId: number;
  workerId: string;
  target: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  resultSummary?: string;
  failureReason?: string;
  availableActions: OperationActionView[];
  guardrails: ProductApiOperationalGuardrails;
};

export type WorkerSummary = {
  workerId: string;
  status: "registered" | "available" | "unavailable" | "degraded" | "stale";
  health: "healthy" | "degraded" | "unhealthy" | "unknown";
  environment: string;
  capabilities: string[];
  capacity: number;
  availableCapacity: number;
  workloadCount: number;
  targetSupport: string[];
  tenantIsolation: boolean;
  workloadIsolation: boolean;
  failureState: "none" | "failed" | "recovering";
  reconciliationState: "none" | "pending" | "reconciling" | "reconciled" | "failed";
  availableActions: OperationActionView[];
  guardrails: ProductApiOperationalGuardrails;
};

export type RuntimeJobStatus = "queued" | "assigned" | "running" | "succeeded" | "failed" | "cancel_requested" | "cancelled";

export type RuntimeStateEvent = {
  eventId: string;
  tenantId?: string;
  jobId?: string;
  assignmentId?: string;
  workerId?: string;
  category: string;
  outcome: "allowed" | "succeeded" | "denied" | "failed";
  reason?: string;
  correlationId?: string;
  timestamp: number;
  revision?: number;
  metadata: Record<string, unknown>;
};

export type RuntimeJobSummary = {
  jobId: string;
  tenantId: string;
  runtimeInstanceId: string;
  deploymentId: string;
  agentId?: string;
  workloadType: string;
  status: RuntimeJobStatus;
  attempt: number;
  maxAttempts: number;
  revision: number;
  correlationId: string;
  createdAt: number;
  updatedAt: number;
  cancellationRequestedAt?: number;
  result?: {
    status: "success";
    output?: Record<string, unknown>;
    evidenceRefs: string[];
    usageRecords: unknown[];
    completedAt: number;
  };
  error?: { code: string; message: string; retryable: boolean };
};

export type JobDiagnostic = {
  jobId: string;
  tenantId: string;
  status: RuntimeJobStatus;
  workloadType: string;
  attempt: number;
  maxAttempts: number;
  correlationId: string;
  createdAt: number;
  updatedAt: number;
  workerId?: string;
  assignmentId?: string;
  leaseId?: string;
  leaseExpiresAt?: number;
  fencingToken?: number;
  failureCode?: string;
  failureSummary?: string;
  recoveryCount: number;
  lastRecoveryReason?: string;
  reasonCode?: string;
  recommendedAction?: string;
  history: RuntimeStateEvent[];
};

export type WorkerDiagnostic = {
  workerId: string;
  instanceId: string;
  status: "registered" | "available" | "busy" | "draining" | "offline";
  name: string;
  version: string;
  lastHeartbeatAt?: number;
  heartbeatAgeMs?: number;
  expiresAt?: number;
  capabilities: Record<string, unknown>;
  activeRuns: number;
  currentAssignments: Array<{ assignmentId: string; jobId: string; leaseExpiresAt: number; fencingToken: number; attempt: number }>;
};

export type OperationalDependency = {
  name: string;
  category: "identity" | "secrets" | "edge" | "persistence" | "economics" | "runtime" | "telemetry";
  required: boolean;
  configured: boolean;
  reachable: boolean;
  status: "READY" | "DEGRADED" | "BLOCKED" | "UNKNOWN";
  lastCheckedAt: number;
  latencyMs: number;
  reasonCode?: string;
  summary: string;
  recommendedAction?: string;
};

export type OperationalStatus = {
  overall: "READY" | "DEGRADED" | "BLOCKED" | "UNKNOWN";
  liveness: { status: "LIVE"; checkedAt: number };
  readiness: { status: "READY" | "DEGRADED" | "BLOCKED" | "UNKNOWN"; reasonCodes: string[]; checkedAt: number };
  dependencies: OperationalDependency[];
  workers: { total: number; active: number; busy: number; draining: number; offline: number; entries: WorkerDiagnostic[] };
  jobs: { total: number; queued: number; running: number; failed: number; entries: JobDiagnostic[] };
  recovery: { healthy: boolean; lastScanAt?: number; lastErrorAt?: number };
  telemetry: { configured: boolean; external: boolean; reachable: boolean; state: string; exporter: string; lastSuccessAt?: number; lastFailureAt?: number; queueDepth: number; droppedRecords: number };
  updatedAt: number;
};

export const productApiConfig = {
  baseUrl: API_BASE_URL,
  environment: import.meta.env.VITE_ACS_ENVIRONMENT ?? "local",
  tenantId: import.meta.env.VITE_ACS_TENANT_ID ?? "tenant-dev",
  tenantAdministrationUrl: import.meta.env.VITE_ACS_TENANT_ADMIN_URL ?? "/admin/tenants",
};

export function normalizeApiError(payload: unknown, status: number): ProductApiError {
  const error =
    payload && typeof payload === "object"
      ? (payload as { error?: { code?: unknown; message?: unknown; reason?: unknown; details?: unknown; entityRefs?: unknown; retryable?: unknown; severity?: unknown; guardrails?: unknown; correlationId?: unknown } })
      : null;
  const raw = error?.error;
  return {
    code: typeof raw?.code === "string" && raw.code ? raw.code : status === 404 ? "not_found" : "api_error",
    message: typeof raw?.message === "string" && raw.message ? raw.message : "An unexpected API error occurred",
    reason: typeof raw?.reason === "string" ? raw.reason : undefined,
    details: raw?.details,
    entityRefs: Array.isArray(raw?.entityRefs) ? raw.entityRefs.filter((ref): ref is string => typeof ref === "string") : undefined,
    retryable: typeof raw?.retryable === "boolean" ? raw.retryable : undefined,
    severity: typeof raw?.severity === "string" ? (raw.severity as ProductApiErrorSeverity) : undefined,
    guardrails: Array.isArray(raw?.guardrails) ? raw.guardrails.filter((ref): ref is string => typeof ref === "string") : undefined,
    correlationId: typeof raw?.correlationId === "string" ? raw.correlationId : undefined,
    status,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const accessToken = typeof window !== "undefined" ? window.__ACS_AUTH__?.accessToken : undefined;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  const json = (await response.json().catch(() => null)) as { data?: T; error?: unknown } | null;

  if (!response.ok) {
    throw normalizeApiError(json, response.status);
  }

  return json?.data as T;
}

export const productApi = {
  async health() {
    return request<ProductApiHealth>("/health");
  },

  async getDashboardSummary() {
    return request<DashboardSummary>("/dashboard");
  },

  async getGlobalReadinessSummary() {
    return request<GlobalReadinessSummary>("/readiness");
  },

  async listCredentials() {
    return request<CredentialSummary[]>("/credentials");
  },
  async getCredentialDetail(id: string) {
    return request<CredentialSummary>(`/credentials/${id}`);
  },
  async createCredential(input: { credentialId?: string; providerId: string; type: string; purpose: string; secretValue: string; scopes: string[] }) {
    return request<CredentialSecretMutation>("/credentials", { method: "POST", body: JSON.stringify(input) });
  },
  async rotateCredential(id: string, secretValue: string) {
    return request<CredentialSecretMutation>(`/credentials/${encodeURIComponent(id)}/rotate`, { method: "PUT", body: JSON.stringify({ secretValue }) });
  },
  async revokeCredential(id: string) {
    return request<CredentialSecretMutation>(`/credentials/${encodeURIComponent(id)}/revoke`, { method: "POST" });
  },
  async listProviderConnections() {
    return request<ProviderConnectionSummary[]>("/provider-connections");
  },
  async getProviderConnectionDetail(id: string) {
    return request<ProviderConnectionSummary>(`/provider-connections/${id}`);
  },
  async getAgentReadiness(agentId: string) {
    return request<AgentReadinessDetail>(`/agents/${agentId}/readiness`);
  },
  async getAgentDeploymentPlan(agentId: string) {
    return request<DeploymentPlan>(`/agents/${agentId}/deployment-plan`);
  },
  async getProductionDeploymentReadiness(agentId: string, targetId: string) {
    return request<ProductionReadinessDecision>(`/agents/${agentId}/production-readiness?targetId=${encodeURIComponent(targetId)}`);
  },
  async getAgentExecutionPlan(agentId: string) {
    return request<ExecutionPlan>(`/agents/${agentId}/execution-plan`);
  },
  async listDeployments() {
    return request<DeploymentSummary[]>("/deployments");
  },
  async getDeploymentDetail(id: string) {
    return request<DeploymentSummary>(`/deployments/${id}`);
  },
  async listRuntimes() {
    return request<RuntimeSummary[]>("/runtimes");
  },
  async getRuntimeDetail(id: string) {
    return request<RuntimeSummary>(`/runtimes/${id}`);
  },
  async listExecutionRuns() {
    return request<ExecutionRunSummary[]>("/execution-runs");
  },
  async getExecutionRunDetail(id: string) {
    return request<ExecutionRunSummary>(`/execution-runs/${id}`);
  },
  async listEvents() {
    return request<EventRecord[]>("/events");
  },
  async getEventDetail(eventId: string) {
    return request<EventRecord>(`/events/${eventId}`);
  },
  async listLogs() {
    return request<LogSummary[]>("/logs");
  },
  async getLogAvailability(logId: string) {
    return request<LogAvailability>(`/logs/${logId}`);
  },
  async listAuditEntries() {
    return request<AuditEntry[]>("/audit");
  },
  async getAuditEntry(auditId: string) {
    return request<AuditEntry>(`/audit/${auditId}`);
  },
  async listEvidence() {
    return request<EvidenceRecord[]>("/evidence");
  },
  async getEvidenceDetail(evidenceId: string) {
    return request<EvidenceRecord>(`/evidence/${evidenceId}`);
  },
  async listDiagnostics() {
    return request<DiagnosticReport[]>("/diagnostics");
  },
  async getDiagnosticDetail(diagnosticId: string) {
    return request<DiagnosticReport>(`/diagnostics/${diagnosticId}`);
  },
  async getEconomicSummary() {
    return request<EconomicSummary>("/economics");
  },
  async listQuotes() {
    return request<Quote[]>("/economics/quotes");
  },
  async listReservations() {
    return request<Reservation[]>("/economics/reservations");
  },
  async listMeteringRecords() {
    return request<MeteringRecord[]>("/economics/metering");
  },
  async listSettlements() {
    return request<Settlement[]>("/economics/settlements");
  },
  async listReceipts() {
    return request<Receipt[]>("/economics/receipts");
  },
  async listUsageRecords() {
    return request<UsageInspectionRecord[]>("/economics/usage?limit=8");
  },
  async listReconciliationBacklog() {
    return request<ReconciliationBacklogItem[]>("/economics/reconciliation?limit=8");
  },
  async listReconciliationMismatches() {
    return request<ReconciliationMismatch[]>("/economics/mismatches?limit=8");
  },
  async listFinancialExceptions() {
    return request<FinancialException[]>("/economics/exceptions?limit=8");
  },
  async openFinancialException(mismatchId: string) {
    return request<FinancialException>("/economics/exceptions", {
      method: "POST",
      body: JSON.stringify({ mismatchId }),
    });
  },
  async transitionFinancialException(exceptionId: string, action: "acknowledge" | "review" | "remediate" | "resolve" | "reject" | "close", justification?: string) {
    return request<FinancialException>(`/economics/exceptions/${encodeURIComponent(exceptionId)}/${action}`, {
      method: "POST",
      body: JSON.stringify(justification ? { justification } : {}),
    });
  },
  async listFinancialRemediations() {
    return request<FinancialRemediation[]>("/economics/remediations?limit=8");
  },
  async requestFinancialRemediation(exceptionId: string, action: string, idempotencyKey: string, reason?: string) {
    return request<FinancialRemediation>(`/economics/exceptions/${encodeURIComponent(exceptionId)}/remediations`, {
      method: "POST",
      body: JSON.stringify({ action, idempotencyKey, ...(reason ? { reason } : {}) }),
    });
  },
  async listWorkers() {
    return request<WorkerSummary[]>("/workers");
  },
  async getWorkerDetail(id: string) {
    return request<WorkerSummary>(`/workers/${id}`);
  },
  async listWorkerWorkloads(id: string) {
    return request<unknown[]>(`/workers/${id}/workloads`);
  },

  async listRuntimeJobs(status?: RuntimeJobStatus) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<RuntimeJobSummary[]>(`/runtime/jobs${query}`);
  },
  async getRuntimeJob(jobId: string) {
    return request<RuntimeJobSummary>(`/runtime/jobs/${encodeURIComponent(jobId)}`);
  },
  async getRuntimeJobEvents(jobId: string) {
    return request<RuntimeStateEvent[]>(`/runtime/jobs/${encodeURIComponent(jobId)}/events`);
  },
  async getRuntimeJobDiagnostics(jobId: string) {
    return request<JobDiagnostic>(`/runtime/jobs/${encodeURIComponent(jobId)}/diagnostics`);
  },
  async cancelRuntimeJob(jobId: string) {
    return request<RuntimeJobSummary>(`/runtime/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
  },
  async getOperationalStatus(force = false) {
    return request<OperationalStatus>(`/system/operational-status${force ? "?force=true" : ""}`);
  },

  async listAgents() {
    return request<AgentListItem[]>("/agents");
  },

  async getAgent(id: string) {
    return request<AgentDetail>(`/agents/${id}`);
  },

  async getAgentRevisions(id: string) {
    return request<AgentRevisionSummary[]>(`/agents/${id}/revisions`);
  },

  async getAgentLifecycle(id: string) {
    return request<AgentLifecycleStateView>(`/agents/${id}/lifecycle`);
  },

  async createAgent(input: AgentCreateInput) {
    return request<AgentOperationResult>("/agents", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateAgent(agentId: string, input: UpdateAgentInput) {
    return request<AgentOperationResult>(`/agents/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async createAgentRevision(agentId: string, input: AgentCreateRevisionInput) {
    return request<AgentOperationResult>(`/agents/${agentId}/revisions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async adoptAgentRevision(agentId: string, revisionId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}/revisions/${revisionId}/adopt`, {
      method: "POST",
    });
  },

  async restoreAgentRevision(agentId: string, revisionId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}/revisions/${revisionId}/restore`, {
      method: "POST",
    });
  },

  async duplicateAgent(agentId: string, input: AgentDuplicateInput) {
    return request<AgentOperationResult>(`/agents/${agentId}/duplicate`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async archiveAgent(agentId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}/archive`, {
      method: "POST",
    });
  },

  async restoreAgent(agentId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}/restore`, {
      method: "POST",
    });
  },

  async deleteAgent(agentId: string) {
    return request<AgentOperationResult>(`/agents/${agentId}`, {
      method: "DELETE",
    });
  },

  async listTargets() {
    return request<unknown[]>("/targets");
  },

  async listProviders() {
    return request<ProviderSummary[]>("/providers");
  },

  async listRunners() {
    return request<unknown[]>("/runners");
  },

  async getCompositionSummary() {
    return request<CompositionSummary>("/composition/summary");
  },

  async getAgentComposition(agentId: string) {
    return request<AgentCompositionDetail>(`/agents/${agentId}/composition`);
  },

  async getAgentEffectiveCapabilities(agentId: string) {
    return request<EffectiveCapabilities>(`/agents/${agentId}/composition/capabilities`);
  },

  async getAgentCompositionCompatibility(agentId: string) {
    return request<CompatibilityReport>(`/agents/${agentId}/composition/compatibility`);
  },

  async listRoles() {
    return request<RoleSummary[]>("/roles");
  },

  async getRoleDetail(roleId: string) {
    return request<RoleSummary>(`/roles/${roleId}`);
  },

  async listProfiles() {
    return request<ProfileSummary[]>("/profiles");
  },

  async getProfileDetail(profileId: string) {
    return request<ProfileSummary>(`/profiles/${profileId}`);
  },

  async listCapabilities() {
    return request<CapabilitySummary[]>("/capabilities");
  },

  async getCapabilityDetail(capabilityId: string) {
    return request<CapabilitySummary>(`/capabilities/${capabilityId}`);
  },

  async listSkills() {
    return request<SkillSummary[]>("/skills");
  },

  async getSkillDetail(skillId: string) {
    return request<SkillSummary>(`/skills/${skillId}`);
  },

  async listTools() {
    return request<ToolSummary[]>("/tools");
  },

  async getToolDetail(toolId: string) {
    return request<ToolSummary>(`/tools/${toolId}`);
  },

  async listPlugins() {
    return request<PluginSummary[]>("/plugins");
  },

  async getPluginDetail(pluginId: string) {
    return request<PluginSummary>(`/plugins/${pluginId}`);
  },

  async listPluginPackages() {
    return request<PluginPackage[]>("/plugin-packages");
  },

  async listPackageSources() {
    return request<PackageSource[]>("/package-sources");
  },

  async listEngines() {
    return request<EngineSummary[]>("/engines");
  },

  async getEngineDetail(engineId: string) {
    return request<EngineSummary>(`/engines/${engineId}`);
  },

  async getProviderDetail(providerId: string) {
    return request<ProviderSummary>(`/providers/${providerId}`);
  },

  async listModels() {
    return request<ModelSummary[]>("/models");
  },

  async deployAgent(agentId: string, data: { revision: number; composition: Record<string, unknown>; targetId: string; mode?: "sandbox" | "live" }) {
    return request<unknown>(`/agents/${agentId}/deploy`, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        mode: data.mode ?? "sandbox",
      }),
    });
  },

  async rollbackDeployment(deploymentId: string, expectedRecordRevision?: number) {
    return request<DeploymentSummary>(`/deployments/${deploymentId}/rollback`, {
      method: "POST",
      body: JSON.stringify({ expectedRecordRevision }),
    });
  },

  async startRuntime(runtimeInstanceId: string, input: { deploymentId: string; agentId?: string; targetId?: string; maxAttempts?: number }) {
    return request<unknown>(`/runtimes/${runtimeInstanceId}/start`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async stopRuntime(runtimeInstanceId: string) {
    return request<unknown>(`/runtimes/${runtimeInstanceId}/stop`, {
      method: "POST",
    });
  },

  async queryAudit() {
    return request<unknown[]>("/audit");
  },

  async getSystemGuardrails() {
    return request<SystemGuardrailsView>("/system/guardrails");
  },

  async getSystemConfiguration() {
    return request<SystemConfigurationView>("/system/configuration");
  },

  async listSystemPolicies() {
    return request<SystemPolicyVisibility[]>("/system/policies");
  },

  async getSystemAdministration() {
    return request<SystemAdministrationView>("/system/administration");
  },

  async getSystemTenants() {
    return request<SystemTenantsView>("/system/tenants");
  },

  async getEpic11AcceptanceReport() {
    return request<Epic11AcceptanceReport>("/system/acceptance");
  },

  async getProductionReadinessReport() {
    return request<ProductionReadinessReport>("/system/production-readiness");
  },

  async getGovernanceBoundaryReport() {
    return request<GovernanceBoundaryReport>("/system/governance-boundary");
  },

  async getOperationalReliabilityReport() {
    return request<OperationalReliabilityReport>("/system/operational-reliability");
  },

  async getBillingBoundaryReport() {
    return request<BillingBoundaryReport>("/system/billing-boundary");
  },

  async getPaymentRailsBoundaryReport() {
    return request<PaymentRailsBoundaryReport>("/system/payment-rails-boundary");
  },

  async getPricingInvoiceBoundaryReport() {
    return request<PricingInvoiceBoundaryReport>("/system/pricing-invoice-boundary");
  },

  async getTenantBillingBoundaryReport() {
    return request<TenantBillingBoundaryReport>("/system/tenant-billing-boundary");
  },

  async getSettlementReconciliationBoundaryReport() {
    return request<SettlementReconciliationBoundaryReport>("/system/settlement-reconciliation");
  },

  async getFinancialAuditBoundaryReport() {
    return request<FinancialAuditBoundaryReport>("/system/financial-audit");
  },
};
