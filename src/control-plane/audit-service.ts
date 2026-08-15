export type AuditEventType =
  | "agent.plan_resolved"
  | "governance.evaluated"
  | "tenant.lifecycle"
  | "tenant.membership"
  | "tenant.ownership"
  | "tenant.governance"
  | "tenant.entitlement"
  | "tenant.limit"
  | "tenant.enforcement"
  | "economic.quoted"
  | "economic.reserved"
  | "economic.released"
  | "economic.settled"
  | "deployment.requested"
  | "deployment.completed"
  | "deployment.failed"
  | "runtime.started"
  | "runtime.stopped"
  | "runtime.failed"
  | "runtime.terminated"
  | "execution.run_created"
  | "usage.metered";

export interface AuditEvent {
  readonly eventId: string;
  readonly eventType: AuditEventType | string;
  readonly timestamp: number;
  readonly correlationId: string;
  readonly tenantId?: string;
  readonly workloadId?: string;
  readonly agentId?: string;
  readonly revision?: number;
  readonly deploymentId?: string;
  readonly runtimeInstanceId?: string;
  readonly executionRunId?: string;
  readonly actor?: string;
  readonly decision?: "allowed" | "denied" | "passed" | "failed";
  readonly result?: "success" | "failure" | "pending";
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AuditQueryFilter {
  readonly correlationId?: string;
  readonly tenantId?: string;
  readonly workloadId?: string;
  readonly agentId?: string;
  readonly deploymentId?: string;
  readonly runtimeInstanceId?: string;
  readonly executionRunId?: string;
  readonly eventType?: string;
  readonly actor?: string;
}

const SECRET_PATTERNS = [/api_?key/i, /secret/i, /bearer/i, /password/i, /token/i, /^sk-/i, /private_?key/i];

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("sk-") || value.startsWith("bearer ") || value.length > 40) {
      return "[REDACTED]";
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SECRET_PATTERNS.some((pattern) => pattern.test(k))) {
        redacted[k] = "[REDACTED]";
      } else {
        redacted[k] = redactValue(v);
      }
    }
    return redacted;
  }
  return value;
}

export class AuditService {
  readonly #events: AuditEvent[] = [];

  recordEvent(input: {
    eventType: AuditEventType | string;
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
  }): AuditEvent {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const metadata = input.metadata ? (redactValue(input.metadata) as Record<string, unknown>) : undefined;

    const event: AuditEvent = {
      eventId,
      eventType: input.eventType,
      timestamp: Date.now(),
      correlationId: input.correlationId,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.workloadId ? { workloadId: input.workloadId } : {}),
      ...(input.agentId ? { agentId: input.agentId } : {}),
      ...(input.revision !== undefined ? { revision: input.revision } : {}),
      ...(input.deploymentId ? { deploymentId: input.deploymentId } : {}),
      ...(input.runtimeInstanceId ? { runtimeInstanceId: input.runtimeInstanceId } : {}),
      ...(input.executionRunId ? { executionRunId: input.executionRunId } : {}),
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.decision ? { decision: input.decision } : {}),
      ...(input.result ? { result: input.result } : {}),
      ...(metadata ? { metadata } : {}),
    };

    this.#events.push(event);
    return event;
  }

  queryEvents(filter: AuditQueryFilter): readonly AuditEvent[] {
    return this.#events.filter((evt) => {
      if (filter.correlationId && evt.correlationId !== filter.correlationId) return false;
      if (filter.tenantId && evt.tenantId !== filter.tenantId) return false;
      if (filter.workloadId && evt.workloadId !== filter.workloadId) return false;
      if (filter.agentId && evt.agentId !== filter.agentId) return false;
      if (filter.deploymentId && evt.deploymentId !== filter.deploymentId) return false;
      if (filter.runtimeInstanceId && evt.runtimeInstanceId !== filter.runtimeInstanceId) return false;
      if (filter.executionRunId && evt.executionRunId !== filter.executionRunId) return false;
      if (filter.eventType && evt.eventType !== filter.eventType) return false;
      if (filter.actor && evt.actor !== filter.actor) return false;
      return true;
    });
  }

  listEvents(): readonly AuditEvent[] {
    return [...this.#events];
  }
}
