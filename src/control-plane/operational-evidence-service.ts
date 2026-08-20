import type { AuditEvent, AuditQueryFilter } from "./audit-service.js";
import type { EconomicAuthorizationDecision, EconomicService, UsageQuote, UsageReservation, UsageRecord, EconomicReceipt, Settlement as EconomicSettlement } from "./neurons-economic-contract.js";

import type { DeploymentRecord } from "./deployment-service.js";
import type { RuntimeInstanceRecord, ExecutionRunRecord } from "./runtime-lifecycle-service.js";
import type { AgentRevision } from "./unified-agent-model.js";
import type { GovernedAgentStatus } from "./unified-agent-model.js";

/**
 * Operational evidence and economics surface.
 *
 * This service aggregates existing audit, runtime, deployment, and economic
 * domain state into the operational evidence / economics contracts exposed by
 * the Product API. It does NOT reimplement any EPIC-10 domain — it only
 * normalizes and correlates data already produced by those domains.
 */

// --- Entity reference types ---

export interface EntityReference {
  readonly type: "agent" | "deployment" | "runtime" | "execution-run" | "worker" | "credential" | "provider-connection";
  readonly id: string;
  readonly label?: string;
}

export interface CorrelationReference {
  readonly correlationId: string;
  readonly entityRefs?: readonly EntityReference[];
}

// --- Events & Logs ---

export type EventSeverity = "info" | "warning" | "error" | "debug";
export type EventSource = "system" | "agent" | "deployment" | "runtime" | "worker" | "execution-run" | "economic" | "audit";

export interface EventSummary {
  readonly eventId: string;
  readonly type: string;
  readonly source: EventSource;
  readonly severity: EventSeverity;
  readonly message: string;
  readonly entityRefs: readonly EntityReference[];
  readonly correlationId?: string;
  readonly createdAt: number;
  readonly guardrails: EvidenceGuardrails;
}

export interface LogSummary {
  readonly logId: string;
  readonly source: EventSource;
  readonly level: "info" | "warning" | "error" | "debug";
  readonly message: string;
  readonly entityRefs: readonly EntityReference[];
  readonly correlationId?: string;
  readonly createdAt: number;
  readonly guardrails: EvidenceGuardrails;
}

export interface LogAvailability {
  readonly available: false;
  readonly reason: string;
  readonly guardrails: EvidenceGuardrails;
}

// --- Audit ---

export type AuditActorType = "system" | "user" | "agent" | "worker";

export interface AuditEntry {
  readonly auditId: string;
  readonly actor: string;
  readonly actorType: AuditActorType;
  readonly operation: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly entityRefs: readonly EntityReference[];
  readonly status: "success" | "failure" | "pending";
  readonly message: string;
  readonly errorCode?: string;
  readonly correlationId?: string;
  readonly createdAt: number;
  readonly guardrails: EvidenceGuardrails;
}

// --- Diagnostics & Evidence ---

export type EvidenceKind = "readiness" | "deployment" | "runtime" | "worker" | "execution-run" | "policy" | "sandbox" | "isolation" | "credential" | "economic" | "diagnostic";
export type DiagnosticStatus = "ready" | "partial" | "blocked" | "error";

export interface EvidenceRecord {
  readonly evidenceId: string;
  readonly kind: EvidenceKind;
  readonly title: string;
  readonly summary: string;
  readonly entityRefs: readonly EntityReference[];
  readonly findings: readonly OperationalFinding[];
  readonly correlationId?: string;
  readonly source: string;
  readonly createdAt: number;
  readonly guardrails: EvidenceGuardrails;
}

export interface DiagnosticReport {
  readonly diagnosticId: string;
  readonly status: DiagnosticStatus;
  readonly summary: string;
  readonly entityRefs: readonly EntityReference[];
  readonly findings: readonly OperationalFinding[];
  readonly recommendedActions: readonly string[];
  readonly correlationId?: string;
  readonly createdAt: number;
  readonly guardrails: EvidenceGuardrails;
}

export interface OperationalFinding {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly domain: string;
  readonly component: string;
  readonly message: string;
  readonly recommendedRemediation?: string;
}

// --- Economics ---

export interface EconomicSummary {
  readonly checkedAt: number;
  readonly currency: string;
  readonly unit: string;
  readonly neuronsContext: "operational";
  readonly totalEstimated: string;
  readonly totalReserved: string;
  readonly totalMetered: string;
  readonly totalSettled: string;
  readonly agentConsumption: readonly AgentEconomicConsumption[];
  readonly deploymentConsumption: readonly DeploymentEconomicConsumption[];
  readonly runtimeConsumption: readonly RuntimeEconomicConsumption[];
  readonly executionRunConsumption: readonly ExecutionRunEconomicConsumption[];
  readonly warnings: readonly EconomicWarning[];
  readonly availableActions: readonly AvailableAction[];
  readonly guardrails: EvidenceGuardrails;
}

export interface AgentEconomicConsumption {
  readonly agentId: string;
  readonly estimated: string;
  readonly metered: string;
  readonly settled: string;
  readonly unit: string;
}

export interface DeploymentEconomicConsumption {
  readonly deploymentId: string;
  readonly agentId: string;
  readonly metered: string;
  readonly settled: string;
  readonly unit: string;
}

export interface RuntimeEconomicConsumption {
  readonly runtimeId: string;
  readonly deploymentId: string;
  readonly metered: string;
  readonly settled: string;
  readonly unit: string;
}

export interface ExecutionRunEconomicConsumption {
  readonly runId: string;
  readonly agentId: string;
  readonly metered: string;
  readonly settled: string;
  readonly unit: string;
}

export interface EconomicWarning {
  readonly code: string;
  readonly severity: "warning" | "error";
  readonly message: string;
}

// --- Quote & Reservation ---

export type QuoteStatus = "active" | "expired" | "consumed" | "cancelled";
export type ReservationStatus = "reserved" | "released" | "settled" | "expired";

export interface Quote {
  readonly quoteId: string;
  readonly agentId?: string;
  readonly revisionId?: number;
  readonly deploymentPlanId?: string;
  readonly amount: string;
  readonly unit: string;
  readonly status: QuoteStatus;
  readonly expiresAt: number;
  readonly policyLimits: readonly PolicyLimit[];
  readonly eligibility: EconomicEligibility;
  readonly warnings: readonly EconomicWarning[];
  readonly evidenceRefs: readonly string[];
  readonly availableActions: readonly AvailableAction[];
  readonly createdAt: number;
  readonly guardrails: EvidenceGuardrails;
}

export interface Reservation {
  readonly reservationId: string;
  readonly quoteId: string;
  readonly agentId?: string;
  readonly executionRunId?: string;
  readonly amount: string;
  readonly unit: string;
  readonly status: ReservationStatus;
  readonly expiresAt: number;
  readonly failureReason?: string;
  readonly evidenceRefs: readonly string[];
  readonly availableActions: readonly AvailableAction[];
  readonly createdAt: number;
  readonly guardrails: EvidenceGuardrails;
}

export type AuthorizationDecisionStatus = "allowed" | "denied";

export interface AuthorizationDecision {
  readonly decisionId: string;
  readonly economicOperationId: string;
  readonly tenantId?: string;
  readonly actor?: string;
  readonly authorizationEffect: AuthorizationDecisionStatus;
  readonly decisionCode: string;
  readonly reasons: readonly string[];
  readonly governanceReferences: readonly string[];
  readonly entitlementReferences: readonly string[];
  readonly limitReferences: readonly string[];
  readonly requestedAmount?: string;
  readonly effectiveAmount?: string;
  readonly unit?: string;
  readonly quoteId?: string;
  readonly reservationId?: string;
  readonly executionRunId?: string;
  readonly workloadId?: string;
  readonly idempotencyKey: string;
  readonly auditCorrelation: string;
  readonly status: string;
  readonly createdAt: number;
  readonly evaluatedAt: number;
  readonly availableActions: readonly AvailableAction[];
  readonly guardrails: EvidenceGuardrails;
}

export interface PolicyLimit {
  readonly dimension: string;
  readonly limit: string;
  readonly unit: string;
}

export interface EconomicEligibility {
  readonly eligible: boolean;
  readonly reason: string;
  readonly ready: boolean;
  readonly blockerCount: number;
  readonly warningCount: number;
}

// --- Metering & Settlement ---

export type MeteringStatus = "recorded" | "settled" | "failed";
export type SettlementStatus = "pending" | "settled" | "partially_settled" | "failed" | "released";

export interface MeteringRecord {
  readonly meterId: string;
  readonly executionRunId: string;
  readonly runtimeId?: string;
  readonly agentId?: string;
  readonly providerId?: string;
  readonly target: string;
  readonly amount: string;
  readonly unit: string;
  readonly usage: readonly UsageDimensionRecord[];
  readonly status: MeteringStatus;
  readonly createdAt: number;
  readonly evidenceRefs: readonly string[];
  readonly guardrails: EvidenceGuardrails;
}

export type UsageObservationState = "observed" | "recorded" | "unknown" | "unavailable";
export type UsageSettlementState = "pending_settlement" | "settled" | "rejected" | "duplicate" | "unknown" | "unavailable" | "not_applicable";
export type UsageReadModelStatus = "recorded" | "pending_settlement" | "settled" | "rejected" | "duplicate" | "unknown" | "unavailable";

export interface UsageInspectionRecord {
  readonly usageId: string;
  readonly executionRunId: string;
  readonly runtimeId?: string;
  readonly agentId?: string;
  readonly deploymentId?: string;
  readonly tenantId?: string;
  readonly workloadId?: string;
  readonly authorizationDecisionId?: string;
  readonly reservationId?: string;
  readonly settlementId?: string;
  readonly quoteId?: string;
  readonly measurementSource: string;
  readonly dimension: string;
  readonly quantity: string;
  readonly unit: string;
  readonly observedAt: number;
  readonly recordedAt: number;
  readonly measurementState: UsageObservationState;
  readonly settlementState: UsageSettlementState;
  readonly status: UsageReadModelStatus;
  readonly pricingState: "available" | "unavailable" | "not_applicable";
  readonly pricingProvenance?: string;
  readonly evidenceRefs: readonly string[];
  readonly availableActions: readonly AvailableAction[];
  readonly guardrails: EvidenceGuardrails;
}

export interface UsageDimensionRecord {
  readonly dimension: string;
  readonly quantity: string;
  readonly unit: string;
}

export interface Settlement {
  readonly settlementId: string;
  readonly meterId: string;
  readonly executionRunId?: string;
  readonly amount: string;
  readonly unit: string;
  readonly status: SettlementStatus;
  readonly failureReason?: string;
  readonly receiptId?: string;
  readonly createdAt: number;
  readonly completedAt?: number;
  readonly evidenceRefs: readonly string[];
  readonly availableActions: readonly AvailableAction[];
  readonly guardrails: EvidenceGuardrails;
}

export interface Receipt {
  readonly receiptId: string;
  readonly settlementId?: string;
  readonly executionRunId?: string;
  readonly amount: string;
  readonly unit: string;
  readonly status: "issued" | "pending" | "failed";
  readonly issuedAt: number;
  readonly summary: string;
  readonly evidenceRefs: readonly string[];
  readonly guardrails: EvidenceGuardrails;
}

// --- Available actions & operation results ---

export type AvailableActionName =
  | "create_quote"
  | "reserve_quote"
  | "cancel_reservation"
  | "settle_metering"
  | "refresh"
  | "recheck";

export interface AvailableAction {
  readonly action: AvailableActionName;
  readonly label: string;
  readonly available: boolean;
  readonly reason?: string;
  readonly requiresConfirmation?: boolean;
  readonly destructive?: boolean;
}

export interface OperationResult {
  readonly ok: boolean;
  readonly operation: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly status: string;
  readonly message: string;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly auditRef?: string;
  readonly evidenceRef?: string;
  readonly correlationId?: string;
  readonly checkedAt: number;
  readonly completedAt?: number;
}

export interface EvidenceGuardrails {
  readonly inspectionMode: true;
  readonly sandboxOnly: true;
  readonly readOnly: boolean;
  readonly productionReady: false;
  readonly sourceOfTruth: "product-api";
  readonly noSecretLeakage: true;
  readonly notBilling: true;
}

// --- Query types ---

export interface EventsQuery {
  readonly agentId?: string;
  readonly deploymentId?: string;
  readonly runtimeId?: string;
  readonly workerId?: string;
  readonly executionRunId?: string;
  readonly correlationId?: string;
  readonly severity?: EventSeverity;
  readonly limit?: number;
}

export interface AuditQuery {
  readonly agentId?: string;
  readonly deploymentId?: string;
  readonly runtimeId?: string;
  readonly workerId?: string;
  readonly executionRunId?: string;
  readonly correlationId?: string;
  readonly limit?: number;
}

export interface EvidenceQuery {
  readonly agentId?: string;
  readonly deploymentId?: string;
  readonly runtimeId?: string;
  readonly executionRunId?: string;
  readonly kind?: EvidenceKind;
  readonly correlationId?: string;
  readonly limit?: number;
}

export interface EconomicQuery {
  readonly agentId?: string;
  readonly deploymentId?: string;
  readonly runtimeId?: string;
  readonly executionRunId?: string;
  readonly limit?: number;
}

export interface UsageQuery {
  readonly usageId?: string;
  readonly agentId?: string;
  readonly deploymentId?: string;
  readonly runtimeId?: string;
  readonly executionRunId?: string;
  readonly limit?: number;
}

export interface QuoteQuery {
  readonly agentId?: string;
  readonly executionRunId?: string;
}

export interface ReservationQuery {
  readonly agentId?: string;
  readonly executionRunId?: string;
}

export interface MeteringQuery {
  readonly agentId?: string;
  readonly deploymentId?: string;
  readonly runtimeId?: string;
  readonly executionRunId?: string;
  readonly limit?: number;
}

export interface SettlementQuery {
  readonly settlementId?: string;
  readonly meterId?: string;
  readonly executionRunId?: string;
}

export interface ReceiptQuery {
  readonly settlementId?: string;
  readonly executionRunId?: string;
}

// --- Service implementation ---

const OPERATIONAL_GUARDRAILS: EvidenceGuardrails = {
  inspectionMode: true,
  sandboxOnly: true,
  readOnly: true,
  productionReady: false,
  sourceOfTruth: "product-api",
  noSecretLeakage: true,
  notBilling: true,
};

const NO_SECRET_GUARDRAILS: EvidenceGuardrails = {
  ...OPERATIONAL_GUARDRAILS,
  readOnly: true,
};

const MUTATING_GUARDRAILS: EvidenceGuardrails = {
  ...OPERATIONAL_GUARDRAILS,
  readOnly: false,
};

const UNSUPPORTED_ACTION_NOTE =
  "Governed by Product API — this action is not supported in this milestone.";

const UNSUPPORTED_ACTIONS: AvailableAction[] = [
  { action: "settle_metering", label: "Settle metering", available: false, reason: UNSUPPORTED_ACTION_NOTE },
  { action: "refresh", label: "Refresh evidence", available: true },
  { action: "recheck", label: "Recheck readiness", available: true },
];

const UNSUPPORTED_MUTATIONS: AvailableAction[] = [
  { action: "create_quote", label: "Create quote", available: false, reason: UNSUPPORTED_ACTION_NOTE },
  { action: "reserve_quote", label: "Reserve quote", available: false, reason: UNSUPPORTED_ACTION_NOTE },
  { action: "cancel_reservation", label: "Cancel reservation", available: false, reason: UNSUPPORTED_ACTION_NOTE },
  { action: "settle_metering", label: "Settle metering", available: false, reason: UNSUPPORTED_ACTION_NOTE },
];

export interface OperationalEvidenceServiceOptions {
  readonly auditService?: {
    queryEvents(filter: AuditQueryFilter): readonly AuditEvent[];
    listEvents(): readonly AuditEvent[];
  };
  readonly economicService?: EconomicService;
  readonly deploymentService?: {
    listDeployments(): readonly DeploymentRecord[];
  };
  readonly runtimeService?: {
    listRuntimes(): readonly RuntimeInstanceRecord[];
    listExecutionRuns(): readonly ExecutionRunRecord[];
  };
  readonly agentService?: {
    list(): readonly AgentRevision[];
  };
}

export class OperationalEvidenceService {
  readonly #auditService: OperationalEvidenceServiceOptions["auditService"];
  readonly #economicService: EconomicService | undefined;
  readonly #deploymentService: OperationalEvidenceServiceOptions["deploymentService"];
  readonly #runtimeService: OperationalEvidenceServiceOptions["runtimeService"];
  readonly #agentService: OperationalEvidenceServiceOptions["agentService"];

  constructor(options: OperationalEvidenceServiceOptions = {}) {
    this.#auditService = options.auditService;
    this.#economicService = options.economicService;
    this.#deploymentService = options.deploymentService;
    this.#runtimeService = options.runtimeService;
    this.#agentService = options.agentService;
  }

  // --- Events & Logs ---

  async listEvents(query: EventsQuery): Promise<readonly EventSummary[]> {
    if (!this.#auditService) {
      return [];
    }
    const filter: AuditQueryFilter = {
      ...(query.agentId ? { agentId: query.agentId } : {}),
      ...(query.deploymentId ? { deploymentId: query.deploymentId } : {}),
      ...(query.runtimeId ? { runtimeInstanceId: query.runtimeId } : {}),
      ...(query.executionRunId ? { executionRunId: query.executionRunId } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
    };

    let events = this.#auditService.queryEvents(filter);

    if (query.severity) {
      events = events.filter((event) => this.#mapAuditSeverity(event) === query.severity);
    }

    const sorted = [...events].sort((left, right) => right.timestamp - left.timestamp);
    const limited = query.limit ? sorted.slice(0, query.limit) : sorted;

    return limited.map((event) => this.#auditEventToSummary(event));
  }

  async getEventDetail(eventId: string): Promise<EventSummary | undefined> {
    if (!this.#auditService) {
      return undefined;
    }
    const events = this.#auditService.listEvents();
    const event = events.find((evt) => evt.eventId === eventId);
    return event ? this.#auditEventToSummary(event) : undefined;
  }

  async listLogs(query: EventsQuery): Promise<readonly LogSummary[]> {
    // Raw logs are not exposed directly. The Product API surface does not
    // provide raw log access in this milestone; only audit events are
    // available as log summaries.
    return [];
  }

  async getLogAvailability(): Promise<LogAvailability> {
    return {
      available: false,
      reason: "Raw log access is not exposed through the Product API in this milestone. Audit events and evidence summaries are available instead.",
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  // --- Audit ---

  async listAuditEntries(query: AuditQuery): Promise<readonly AuditEntry[]> {
    if (!this.#auditService) {
      return [];
    }
    const filter: AuditQueryFilter = {
      ...(query.agentId ? { agentId: query.agentId } : {}),
      ...(query.deploymentId ? { deploymentId: query.deploymentId } : {}),
      ...(query.runtimeId ? { runtimeInstanceId: query.runtimeId } : {}),
      ...(query.executionRunId ? { executionRunId: query.executionRunId } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
    };

    let entries = this.#auditService.queryEvents(filter);

    const sorted = [...entries].sort((left, right) => right.timestamp - left.timestamp);
    const limited = query.limit ? sorted.slice(0, query.limit) : sorted;

    return limited.map((event) => this.#auditEventToEntry(event));
  }

  async getAuditEntry(auditId: string): Promise<AuditEntry | undefined> {
    if (!this.#auditService) {
      return undefined;
    }
    const events = this.#auditService.listEvents();
    const event = events.find((evt) => evt.eventId === auditId);
    return event ? this.#auditEventToEntry(event) : undefined;
  }

  // --- Diagnostics & Evidence ---

  async listEvidence(query: EvidenceQuery): Promise<readonly EvidenceRecord[]> {
    if (!this.#auditService) {
      return [];
    }
    const filter: AuditQueryFilter = {
      ...(query.agentId ? { agentId: query.agentId } : {}),
      ...(query.deploymentId ? { deploymentId: query.deploymentId } : {}),
      ...(query.runtimeId ? { runtimeInstanceId: query.runtimeId } : {}),
      ...(query.executionRunId ? { executionRunId: query.executionRunId } : {}),
      ...(query.correlationId ? { correlationId: query.correlationId } : {}),
    };

    const events = this.#auditService.queryEvents(filter);
    const evidence: EvidenceRecord[] = [];

    for (const event of events) {
      if (event.metadata && typeof event.metadata === "object") {
        const meta = event.metadata as Record<string, unknown>;
        if (meta.findings && Array.isArray(meta.findings)) {
          evidence.push(this.#createEvidenceFromEvent(event, meta.findings as OperationalFinding[]));
        }
      }
    }

    // Add readiness evidence from audit events
    const readinessEvents = events.filter((event) =>
      event.eventType === "governance.evaluated" || event.eventType === "deployment.completed" || event.eventType === "runtime.started"
    );
    for (const event of readinessEvents) {
      evidence.push(this.#createReadinessEvidenceFromEvent(event));
    }

    // Add deployment evidence
    const deploymentEvents = events.filter((event) => event.eventType.startsWith("deployment."));
    for (const event of deploymentEvents) {
      evidence.push(this.#createDeploymentEvidenceFromEvent(event));
    }

    // Add runtime evidence
    const runtimeEvents = events.filter((event) => event.eventType.startsWith("runtime."));
    for (const event of runtimeEvents) {
      evidence.push(this.#createRuntimeEvidenceFromEvent(event));
    }

    // Add execution run evidence
    const executionEvents = events.filter((event) => event.eventType.startsWith("execution."));
    for (const event of executionEvents) {
      evidence.push(this.#createExecutionRunEvidenceFromEvent(event));
    }

    // Add economic evidence
    const economicEvents = events.filter((event) => event.eventType.startsWith("economic."));
    for (const event of economicEvents) {
      evidence.push(this.#createEconomicEvidenceFromEvent(event));
    }

    const sorted = [...evidence].sort((left, right) => right.createdAt - left.createdAt);
    const limited = query.limit ? sorted.slice(0, query.limit) : sorted;
    return limited;
  }

  async getEvidenceDetail(evidenceId: string): Promise<EvidenceRecord | undefined> {
    const evidence = await this.listEvidence({ limit: 1000 });
    return evidence.find((item) => item.evidenceId === evidenceId);
  }

  async listDiagnostics(query?: EvidenceQuery): Promise<readonly DiagnosticReport[]> {
    if (!this.#auditService) {
      return [];
    }
    const filter: AuditQueryFilter = {
      ...(query?.agentId ? { agentId: query.agentId } : {}),
      ...(query?.deploymentId ? { deploymentId: query.deploymentId } : {}),
      ...(query?.runtimeId ? { runtimeInstanceId: query.runtimeId } : {}),
      ...(query?.executionRunId ? { executionRunId: query.executionRunId } : {}),
      ...(query?.correlationId ? { correlationId: query.correlationId } : {}),
    };

    const events = this.#auditService.queryEvents(filter);
    const diagnostics: DiagnosticReport[] = [];

    for (const event of events) {
      if (event.metadata && typeof event.metadata === "object") {
        const meta = event.metadata as Record<string, unknown>;
        if (meta.findings && Array.isArray(meta.findings) && meta.diagnostics) {
          diagnostics.push(this.#createDiagnosticFromEvent(event, meta.findings as OperationalFinding[], meta.diagnostics));
        }
      }
    }

    return diagnostics.sort((left, right) => right.createdAt - left.createdAt);
  }

  async getDiagnosticDetail(diagnosticId: string): Promise<DiagnosticReport | undefined> {
    const diagnostics = await this.listDiagnostics({ limit: 1000 });
    return diagnostics.find((item) => item.diagnosticId === diagnosticId);
  }

  // --- Economics ---

  async getEconomicSummary(query?: EconomicQuery): Promise<EconomicSummary> {
    const checkedAt = Date.now();
    const unit = "neurons";

    const agentConsumption: AgentEconomicConsumption[] = [];
    const deploymentConsumption: DeploymentEconomicConsumption[] = [];
    const runtimeConsumption: RuntimeEconomicConsumption[] = [];
    const executionRunConsumption: ExecutionRunEconomicConsumption[] = [];

    if (this.#agentService) {
      for (const revision of this.#agentService.list()) {
        agentConsumption.push({
          agentId: revision.agentId,
          estimated: "0",
          metered: "0",
          settled: "0",
          unit,
        });
      }
    }

    if (this.#deploymentService) {
      for (const deployment of this.#deploymentService.listDeployments()) {
        deploymentConsumption.push({
          deploymentId: deployment.deploymentId,
          agentId: deployment.agentId,
          metered: "0",
          settled: "0",
          unit,
        });
      }
    }

    if (this.#runtimeService) {
      for (const runtime of this.#runtimeService.listRuntimes()) {
        runtimeConsumption.push({
          runtimeId: runtime.runtimeInstanceId,
          deploymentId: runtime.deploymentId,
          metered: "0",
          settled: "0",
          unit,
        });
      }
      for (const run of this.#runtimeService.listExecutionRuns()) {
        executionRunConsumption.push({
          runId: run.runId,
          agentId: run.agentId,
          metered: "0",
          settled: "0",
          unit,
        });
      }
    }

    const warnings: EconomicWarning[] = [
      {
        code: "ECONOMIC_DATA_LIMITED",
        severity: "warning",
        message: "Economic data is operational-only — not a billing product. Detailed metering and settlement may be unavailable depending on domain coverage.",
      },
    ];

    return {
      checkedAt,
      currency: "NEURONS",
      unit,
      neuronsContext: "operational",
      totalEstimated: "0",
      totalReserved: "0",
      totalMetered: "0",
      totalSettled: "0",
      agentConsumption,
      deploymentConsumption,
      runtimeConsumption,
      executionRunConsumption,
      warnings,
      availableActions: [
        { action: "refresh", label: "Refresh economic state", available: true },
      ],
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  async getAgentEconomics(agentId: string): Promise<EconomicSummary> {
    return this.getEconomicSummary({ agentId });
  }

  async getDeploymentEconomics(deploymentId: string): Promise<EconomicSummary> {
    return this.getEconomicSummary({ deploymentId });
  }

  async getRuntimeEconomics(runtimeId: string): Promise<EconomicSummary> {
    return this.getEconomicSummary({ runtimeId });
  }

  async getExecutionRunEconomics(runId: string): Promise<EconomicSummary> {
    return this.getEconomicSummary({ executionRunId: runId });
  }

  // --- Authorization ---

  async listAuthorizations(): Promise<readonly AuthorizationDecision[]> {
    if (!this.#economicService) {
      return [];
    }
    return this.#economicService.listAuthorizations().map((decision) => this.#toAuthorizationDecision(decision));
  }

  async getAuthorizationDetail(decisionId: string): Promise<AuthorizationDecision | undefined> {
    const decision = this.#economicService?.getAuthorization(decisionId);
    return decision ? this.#toAuthorizationDecision(decision) : undefined;
  }

  // --- Quote & Reservation ---

  async listQuotes(query?: QuoteQuery): Promise<readonly Quote[]> {
    if (!this.#economicService) {
      return [];
    }
    const quotes = this.#economicService.listQuotes().map((quote) => this.#toQuote(quote));
    return this.#filterQuotes(quotes, query);
  }

  async getQuoteDetail(quoteId: string): Promise<Quote | undefined> {
    const quote = this.#economicService?.listQuotes().find((item) => item.quoteId === quoteId);
    return quote ? this.#toQuote(quote) : undefined;
  }

  async listReservations(query?: ReservationQuery): Promise<readonly Reservation[]> {
    if (!this.#economicService) {
      return [];
    }
    const reservations = this.#economicService.listReservations().map((reservation) => this.#toReservation(reservation));
    return this.#filterReservations(reservations, query);
  }

  async getReservationDetail(reservationId: string): Promise<Reservation | undefined> {
    const reservation = this.#economicService?.listReservations().find((item) => item.reservationId === reservationId);
    return reservation ? this.#toReservation(reservation) : undefined;
  }

  async listAgentQuotes(agentId: string): Promise<readonly Quote[]> {
    return (await this.listQuotes({ agentId })).filter((quote) => quote.agentId === agentId);
  }

  async getExecutionRunReservation(runId: string): Promise<Reservation | undefined> {
    const reservation = this.#economicService?.getExecutionRunReservation(runId);
    return reservation ? this.#toReservation(reservation) : undefined;
  }

  async listUsageRecords(query?: UsageQuery): Promise<readonly UsageInspectionRecord[]> {
    if (!this.#economicService) {
      return [];
    }
    const records = this.#economicService.listUsage().map((record) => this.#toUsageInspectionRecord(record));
    return this.#filterUsage(records, query);
  }

  async getUsageRecord(usageId: string): Promise<UsageInspectionRecord | undefined> {
    const records = await this.listUsageRecords({ usageId, limit: 1 });
    return records.find((record) => record.usageId === usageId);
  }

  async getExecutionRunUsage(runId: string): Promise<readonly UsageInspectionRecord[]> {
    return this.listUsageRecords({ executionRunId: runId });
  }

  async createAgentQuote(agentId: string, input: unknown): Promise<OperationResult> {
    return this.#unsupportedEconomicMutation("create_quote", agentId, "quote", UNSUPPORTED_ACTION_NOTE);
  }

  async reserveQuote(quoteId: string): Promise<OperationResult> {
    return this.#unsupportedEconomicMutation("reserve_quote", quoteId, "quote", UNSUPPORTED_ACTION_NOTE);
  }

  async cancelReservation(reservationId: string): Promise<OperationResult> {
    return this.#unsupportedEconomicMutation("cancel_reservation", reservationId, "reservation", UNSUPPORTED_ACTION_NOTE);
  }

  // --- Metering & Settlement ---

  async listMeteringRecords(query?: MeteringQuery): Promise<readonly MeteringRecord[]> {
    if (!this.#economicService) {
      return [];
    }
    if (!this.#runtimeService) {
      return [];
    }
    const records: MeteringRecord[] = [];
    for (const run of this.#runtimeService.listExecutionRuns()) {
      const usage = this.#economicService.listUsage(run.runId);
      if (usage.length === 0) continue;
      const totalAmount = usage.reduce((sum, record) => sum + record.quantity, 0n).toString();
      records.push({
        meterId: `meter_${run.runId}`,
        executionRunId: run.runId,
        runtimeId: run.runtimeInstanceId,
        agentId: run.agentId,
        target: "sandbox",
        amount: totalAmount,
        unit: "neurons",
        usage: usage.map((record) => ({
          dimension: record.dimension,
          quantity: record.quantity.toString(),
          unit: record.unit,
        })),
        status: "recorded",
        createdAt: run.startedAt,
        evidenceRefs: [],
        guardrails: NO_SECRET_GUARDRAILS,
      });
    }
    return records.sort((left, right) => right.createdAt - left.createdAt);
  }

  async getMeteringRecord(meterId: string): Promise<MeteringRecord | undefined> {
    const records = await this.listMeteringRecords({ limit: 1000 });
    return records.find((item) => item.meterId === meterId);
  }

  async listSettlements(query?: SettlementQuery): Promise<readonly Settlement[]> {
    if (!this.#economicService) {
      return [];
    }
    const settlements = this.#economicService.listSettlements().map((settlement) => this.#toSettlement(settlement));
    return this.#filterSettlements(settlements, query);
  }

  async getSettlementDetail(settlementId: string): Promise<Settlement | undefined> {
    const settlement = this.#economicService?.listSettlements().find((item) => item.settlementId === settlementId);
    return settlement ? this.#toSettlement(settlement) : undefined;
  }

  async listReceipts(query?: ReceiptQuery): Promise<readonly Receipt[]> {
    if (!this.#economicService) {
      return [];
    }
    const receipts = this.#economicService.listReceipts().map((receipt) => this.#toReceipt(receipt));
    return this.#filterReceipts(receipts, query);
  }

  async getReceiptDetail(receiptId: string): Promise<Receipt | undefined> {
    const receipt = this.#economicService?.listReceipts().find((item) => item.receiptId === receiptId);
    return receipt ? this.#toReceipt(receipt) : undefined;
  }

  async getExecutionRunMetering(runId: string): Promise<readonly MeteringRecord[]> {
    return this.listMeteringRecords({ executionRunId: runId });
  }

  async getExecutionRunSettlement(runId: string): Promise<Settlement | undefined> {
    const settlement = this.#economicService?.getExecutionRunSettlement(runId);
    return settlement ? this.#toSettlement(settlement) : undefined;
  }

  // --- Economic audit ---

  async listEconomicAudit(): Promise<readonly AuditEntry[]> {
    if (!this.#auditService) {
      return [];
    }
    const events = this.#auditService.listEvents().filter((event) => event.eventType.startsWith("economic."));
    return events
      .slice()
      .sort((left, right) => right.timestamp - left.timestamp)
      .map((event) => this.#auditEventToEntry(event));
  }

  async settleMeteringRecord(meterId: string): Promise<OperationResult> {
    return this.#unsupportedEconomicMutation("settle_metering", meterId, "metering", UNSUPPORTED_ACTION_NOTE);
  }

  // --- Private helpers ---

  #unsupportedEconomicMutation(operation: string, entityId: string, entityType: string, message: string): OperationResult {
    return {
      ok: false,
      operation,
      entityType,
      entityId,
      status: "unsupported",
      message,
      warnings: ["Governed by Product API"],
      errors: [message],
      checkedAt: Date.now(),
    };
  }

  #mapAuditSeverity(event: AuditEvent): EventSeverity {
    const meta = event.metadata as Record<string, unknown> | undefined;
    const decision = event.decision;
    if (decision === "denied" || event.result === "failure") return "error";
    if (decision === "passed" || event.result === "success") return "info";
    if (event.result === "pending") return "warning";
    return "info";
  }

  #auditEventToSummary(event: AuditEvent): EventSummary {
    return {
      eventId: event.eventId,
      type: event.eventType,
      source: this.#eventSourceFromType(event.eventType),
      severity: this.#mapAuditSeverity(event),
      message: event.metadata?.message as string ?? event.eventType,
      entityRefs: this.#entityRefsFromEvent(event),
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #auditEventToEntry(event: AuditEvent): AuditEntry {
    return {
      auditId: event.eventId,
      actor: event.actor ?? "system",
      actorType: event.actor && event.actor !== "system" ? "user" : "system",
      operation: event.eventType,
      entityType: this.#entityTypeFromEvent(event),
      entityId: this.#entityIdFromEvent(event) ?? "unknown",
      entityRefs: this.#entityRefsFromEvent(event),
      status: event.result ?? "pending",
      message: event.metadata?.message as string ?? event.eventType,
      ...(event.decision === "denied" ? { errorCode: "access_denied" } : {}),
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #createEvidenceFromEvent(event: AuditEvent, findings: readonly OperationalFinding[]): EvidenceRecord {
    return {
      evidenceId: `ev_${event.eventId}`,
      kind: this.#evidenceKindFromType(event.eventType),
      title: this.#evidenceTitleFromEvent(event),
      summary: event.metadata?.message as string ?? event.eventType,
      entityRefs: this.#entityRefsFromEvent(event),
      findings,
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      source: "audit",
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #createReadinessEvidenceFromEvent(event: AuditEvent): EvidenceRecord {
    return {
      evidenceId: `ev_readiness_${event.eventId}`,
      kind: "readiness",
      title: "Readiness evidence",
      summary: `Operational readiness evaluation: ${event.eventType}`,
      entityRefs: this.#entityRefsFromEvent(event),
      findings: [],
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      source: "readiness",
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #createDeploymentEvidenceFromEvent(event: AuditEvent): EvidenceRecord {
    return {
      evidenceId: `ev_deployment_${event.eventId}`,
      kind: "deployment",
      title: "Deployment evidence",
      summary: `Deployment lifecycle event: ${event.eventType}`,
      entityRefs: this.#entityRefsFromEvent(event),
      findings: [],
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      source: "deployment",
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #createRuntimeEvidenceFromEvent(event: AuditEvent): EvidenceRecord {
    return {
      evidenceId: `ev_runtime_${event.eventId}`,
      kind: "runtime",
      title: "Runtime evidence",
      summary: `Runtime lifecycle event: ${event.eventType}`,
      entityRefs: this.#entityRefsFromEvent(event),
      findings: [],
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      source: "runtime",
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #createExecutionRunEvidenceFromEvent(event: AuditEvent): EvidenceRecord {
    return {
      evidenceId: `ev_executions_${event.eventId}`,
      kind: "execution-run",
      title: "Execution evidence",
      summary: `Execution run event: ${event.eventType}`,
      entityRefs: this.#entityRefsFromEvent(event),
      findings: [],
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      source: "execution-run",
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #createEconomicEvidenceFromEvent(event: AuditEvent): EvidenceRecord {
    return {
      evidenceId: `ev_economic_${event.eventId}`,
      kind: "economic",
      title: "Economic evidence",
      summary: `Economic lifecycle event: ${event.eventType}`,
      entityRefs: this.#entityRefsFromEvent(event),
      findings: [],
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      source: "economic",
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #createDiagnosticFromEvent(
    event: AuditEvent,
    findings: readonly OperationalFinding[],
    diagnostics: unknown,
  ): DiagnosticReport {
    const diag = diagnostics as Record<string, unknown> | undefined;
    return {
      diagnosticId: `diag_${event.eventId}`,
      status: findings.some((f) => f.severity === "error") ? "error" : "blocked",
      summary: event.metadata?.message as string ?? event.eventType,
      entityRefs: this.#entityRefsFromEvent(event),
      findings,
      recommendedActions: typeof diag?.recommendedActions === "string"
        ? [diag.recommendedActions as string]
        : Array.isArray(diag?.recommendedActions) ? diag.recommendedActions as string[] : [],
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      createdAt: event.timestamp,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #entityRefsFromEvent(event: AuditEvent): readonly EntityReference[] {
    const refs: EntityReference[] = [];
    if (event.agentId) refs.push({ type: "agent", id: event.agentId });
    if (event.deploymentId) refs.push({ type: "deployment", id: event.deploymentId });
    if (event.runtimeInstanceId) refs.push({ type: "runtime", id: event.runtimeInstanceId });
    if (event.executionRunId) refs.push({ type: "execution-run", id: event.executionRunId });
    return refs;
  }

  #entityTypeFromEvent(event: AuditEvent): string {
    if (event.agentId) return "agent";
    if (event.deploymentId) return "deployment";
    if (event.runtimeInstanceId) return "runtime";
    if (event.executionRunId) return "execution-run";
    return "system";
  }

  #entityIdFromEvent(event: AuditEvent): string | undefined {
    return event.agentId ?? event.deploymentId ?? event.runtimeInstanceId ?? event.executionRunId;
  }

  #eventSourceFromType(eventType: string): EventSource {
    if (eventType.startsWith("agent.")) return "agent";
    if (eventType.startsWith("deployment.")) return "deployment";
    if (eventType.startsWith("runtime.")) return "runtime";
    if (eventType.startsWith("worker.")) return "worker";
    if (eventType.startsWith("execution.")) return "execution-run";
    if (eventType.startsWith("economic.")) return "economic";
    if (eventType.startsWith("governance.")) return "system";
    return "system";
  }

  #evidenceKindFromType(eventType: string): EvidenceKind {
    if (eventType.startsWith("deployment.")) return "deployment";
    if (eventType.startsWith("runtime.")) return "runtime";
    if (eventType.startsWith("execution.")) return "execution-run";
    if (eventType.startsWith("economic.")) return "economic";
    if (eventType === "governance.evaluated") return "policy";
    return "diagnostic";
  }

  #evidenceTitleFromEvent(event: AuditEvent): string {
    if (event.metadata?.message) return event.metadata.message as string;
    return event.eventType;
  }

  #toAuthorizationDecision(decision: EconomicAuthorizationDecision): AuthorizationDecision {
    return {
      decisionId: decision.decisionId,
      economicOperationId: decision.economicOperationId,
      ...(decision.tenantId ? { tenantId: decision.tenantId } : {}),
      ...(decision.actor ? { actor: decision.actor } : {}),
      authorizationEffect: decision.authorizationEffect,
      decisionCode: decision.decisionCode,
      reasons: [...decision.reasons],
      governanceReferences: [...decision.governanceReferences],
      entitlementReferences: [...decision.entitlementReferences],
      limitReferences: [...decision.limitReferences],
      ...(decision.requestedAmount ? { requestedAmount: decision.requestedAmount } : {}),
      ...(decision.effectiveAmount ? { effectiveAmount: decision.effectiveAmount } : {}),
      ...(decision.unit ? { unit: decision.unit } : {}),
      ...(decision.quoteId ? { quoteId: decision.quoteId } : {}),
      ...(decision.reservationId ? { reservationId: decision.reservationId } : {}),
      ...(decision.executionRunId ? { executionRunId: decision.executionRunId } : {}),
      ...(decision.workloadId ? { workloadId: decision.workloadId } : {}),
      idempotencyKey: decision.idempotencyKey,
      auditCorrelation: decision.auditCorrelation,
      status: decision.status,
      createdAt: decision.createdAt,
      evaluatedAt: decision.evaluatedAt,
      availableActions: decision.authorizationEffect === "allowed"
        ? [
          { action: "reserve_quote", label: "Reserve economic capacity", available: true },
          { action: "refresh", label: "Refresh evidence", available: true },
        ]
        : [{ action: "refresh", label: "Refresh evidence", available: true }],
      guardrails: MUTATING_GUARDRAILS,
    };
  }

  #toQuote(quote: UsageQuote): Quote {
    const total = quote.total.toJSON();
    return {
      quoteId: quote.quoteId,
      ...(quote.accountId ? { agentId: quote.accountId } : {}),
      deploymentPlanId: quote.planId,
      amount: total,
      unit: "neurons",
      status: "active",
      expiresAt: quote.expiresAt,
      policyLimits: Object.entries(quote.estimatedByDimension).map(([dimension, limit]) => ({ dimension, limit, unit: "neurons" })),
      eligibility: {
        eligible: true,
        reason: "authoritative economic quote is available",
        ready: true,
        blockerCount: 0,
        warningCount: 0,
      },
      warnings: [],
      evidenceRefs: [quote.quoteId, quote.policyId],
      availableActions: [
        { action: "reserve_quote", label: "Reserve economic capacity", available: true },
        { action: "refresh", label: "Refresh evidence", available: true },
      ],
      createdAt: quote.expiresAt,
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #toReservation(reservation: UsageReservation): Reservation {
    return {
      reservationId: reservation.reservationId,
      quoteId: reservation.quoteId,
      ...(reservation.accountId ? { agentId: reservation.accountId } : {}),
      ...(reservation.executionRunId ? { executionRunId: reservation.executionRunId } : {}),
      amount: reservation.reserved.toJSON(),
      unit: "neurons",
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      ...(reservation.decisionReason ? { failureReason: reservation.decisionReason } : {}),
      evidenceRefs: [
        reservation.reservationId,
        ...(reservation.authorizationDecisionId ? [reservation.authorizationDecisionId] : []),
      ],
      availableActions: reservation.status === "reserved"
        ? [
          { action: "cancel_reservation", label: "Release reservation", available: true },
          { action: "refresh", label: "Refresh evidence", available: true },
        ]
        : [{ action: "refresh", label: "Refresh evidence", available: true }],
      createdAt: reservation.updatedAt ?? reservation.releasedAt ?? reservation.expiresAt,
      guardrails: MUTATING_GUARDRAILS,
    };
  }

  #toSettlement(settlement: EconomicSettlement & { readonly createdAt?: number; readonly completedAt?: number }): Settlement {
    const createdAt = settlement.createdAt ?? settlement.completedAt ?? Date.now();
    return {
      settlementId: settlement.settlementId,
      meterId: settlement.reservationId,
      ...(settlement.runId ? { executionRunId: settlement.runId } : {}),
      amount: settlement.totalCharged.toJSON(),
      unit: "neurons",
      status: settlement.status,
      ...(settlement.status === "failed" ? { failureReason: "settlement unavailable" } : {}),
      ...(settlement.status === "settled" ? { receiptId: "receipt_" + settlement.settlementId } : {}),
      createdAt,
      ...(settlement.completedAt ? { completedAt: settlement.completedAt } : {}),
      evidenceRefs: [settlement.settlementId, settlement.reservationId],
      availableActions: [{ action: "refresh", label: "Refresh evidence", available: true }],
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #toReceipt(receipt: EconomicReceipt): Receipt {
    return {
      receiptId: receipt.receiptId,
      ...(receipt.settlementId ? { settlementId: receipt.settlementId } : {}),
      ...(receipt.runId ? { executionRunId: receipt.runId } : {}),
      amount: receipt.totalCharged.toJSON(),
      unit: "neurons",
      status: receipt.status === "settled" ? "issued" : receipt.status === "failed" ? "failed" : "pending",
      issuedAt: Date.now(),
      summary: "Receipt for " + receipt.quoteId,
      evidenceRefs: [receipt.receiptId, receipt.quoteId, receipt.reservationId],
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #toUsageInspectionRecord(record: UsageRecord): UsageInspectionRecord {
    const reservation = this.#economicService?.listReservations().find((item) => item.executionRunId === record.runId);
    const authorization = this.#economicService?.listAuthorizations().find((item) => item.executionRunId === record.runId);
    const settlement = this.#economicService?.listSettlements().find((item) => item.runId === record.runId);
    const quote = reservation
      ? this.#economicService?.listQuotes().find((item) => item.quoteId === reservation.quoteId)
      : authorization?.quoteId
        ? this.#economicService?.listQuotes().find((item) => item.quoteId === authorization.quoteId)
        : undefined;
    const recordedAt = typeof record.metadata?.recordedAt === "number"
      ? record.metadata.recordedAt
      : record.observedAt;
    const measurementState: UsageObservationState = typeof record.metadata?.recordedAt === "number"
      ? "recorded"
      : "observed";
    const settlementState: UsageSettlementState = settlement
      ? settlement.status === "settled"
        ? "settled"
        : settlement.status === "failed"
          ? "rejected"
          : settlement.status === "released"
            ? "rejected"
            : "pending_settlement"
      : reservation
        ? "pending_settlement"
        : authorization
          ? "pending_settlement"
          : "unknown";
    const status: UsageReadModelStatus =
      typeof record.metadata?.duplicateOf === "string" || record.metadata?.idempotencyReplay === true
        ? "duplicate"
        : settlementState === "settled"
          ? "settled"
          : settlementState === "rejected"
            ? "rejected"
            : settlementState === "pending_settlement"
              ? "pending_settlement"
              : measurementState === "recorded"
                ? "recorded"
                : "unknown";
    const pricingProvenance = quote
      ? `${quote.quoteId} • ${quote.policyId}#${quote.policyRevision}`
      : authorization?.quoteId
        ? `quote:${authorization.quoteId}`
        : undefined;
    const executionRun = this.#runtimeService?.listExecutionRuns().find((run) => run.runId === record.runId);
    return {
      usageId: record.recordId,
      executionRunId: record.runId,
      ...(executionRun?.runtimeInstanceId ? { runtimeId: executionRun.runtimeInstanceId } : {}),
      ...(executionRun?.agentId ? { agentId: executionRun.agentId } : {}),
      ...(executionRun?.deploymentId ? { deploymentId: executionRun.deploymentId } : {}),
      ...(record.workloadId ? { workloadId: record.workloadId } : {}),
      ...(reservation ? { reservationId: reservation.reservationId } : {}),
      ...(authorization ? { authorizationDecisionId: authorization.decisionId } : {}),
      ...(settlement ? { settlementId: settlement.settlementId } : {}),
      ...(quote ? { quoteId: quote.quoteId } : {}),
      ...(record.tenantId ? { tenantId: record.tenantId } : {}),
      measurementSource: record.source,
      dimension: record.dimension,
      quantity: record.quantity.toString(),
      unit: record.unit,
      observedAt: record.observedAt,
      recordedAt,
      measurementState,
      settlementState,
      status,
      pricingState: quote || authorization ? "available" : "unavailable",
      ...(pricingProvenance ? { pricingProvenance } : {}),
      evidenceRefs: [
        record.recordId,
        record.runId,
        ...(authorization ? [authorization.decisionId] : []),
        ...(reservation ? [reservation.reservationId] : []),
        ...(settlement ? [settlement.settlementId] : []),
      ],
      availableActions: settlementState === "settled"
        ? [{ action: "refresh", label: "Refresh evidence", available: true }]
        : [
          { action: "recheck", label: "Recheck readiness", available: true },
          { action: "refresh", label: "Refresh evidence", available: true },
        ],
      guardrails: NO_SECRET_GUARDRAILS,
    };
  }

  #filterQuotes(quotes: readonly Quote[], query?: QuoteQuery): readonly Quote[] {
    return quotes.filter((quote) => {
      if (query?.agentId && quote.agentId !== query.agentId) return false;
      if (query?.executionRunId && !quote.evidenceRefs.includes(query.executionRunId)) return false;
      return true;
    });
  }

  #filterReservations(reservations: readonly Reservation[], query?: ReservationQuery): readonly Reservation[] {
    return reservations.filter((reservation) => {
      if (query?.agentId && reservation.agentId !== query.agentId) return false;
      if (query?.executionRunId && reservation.executionRunId !== query.executionRunId) return false;
      return true;
    });
  }

  #filterSettlements(settlements: readonly Settlement[], query?: SettlementQuery): readonly Settlement[] {
    return settlements.filter((settlement) => {
      if (query?.settlementId && settlement.settlementId !== query.settlementId) return false;
      if (query?.meterId && settlement.meterId !== query.meterId) return false;
      if (query?.executionRunId && settlement.executionRunId !== query.executionRunId) return false;
      return true;
    });
  }

  #filterReceipts(receipts: readonly Receipt[], query?: ReceiptQuery): readonly Receipt[] {
    return receipts.filter((receipt) => {
      if (query?.settlementId && receipt.settlementId !== query.settlementId) return false;
      if (query?.executionRunId && receipt.executionRunId !== query.executionRunId) return false;
      return true;
    });
  }

  #filterUsage(records: readonly UsageInspectionRecord[], query?: UsageQuery): readonly UsageInspectionRecord[] {
    return records.filter((record) => {
      if (query?.usageId && record.usageId !== query.usageId) return false;
      if (query?.agentId && record.agentId !== query.agentId) return false;
      if (query?.deploymentId && record.deploymentId !== query.deploymentId) return false;
      if (query?.runtimeId && record.runtimeId !== query.runtimeId) return false;
      if (query?.executionRunId && record.executionRunId !== query.executionRunId) return false;
      return true;
    }).slice(0, query?.limit ?? Number.POSITIVE_INFINITY);
  }
}

// Re-export for convenience
export { OPERATIONAL_GUARDRAILS, NO_SECRET_GUARDRAILS, MUTATING_GUARDRAILS };
