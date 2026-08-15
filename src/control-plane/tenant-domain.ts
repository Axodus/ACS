import { AcsError } from "../errors.js";
import type { AuditService } from "./audit-service.js";

export type TenantStatus = "provisioning" | "active" | "suspended" | "archived";

export type TenantLifecycleOperation =
  | "create"
  | "activate"
  | "suspend"
  | "reactivate"
  | "archive";

export interface TenantProvenance {
  readonly actor?: string;
  readonly reason?: string;
  readonly source?: string;
}

export interface TenantAdministrativeMetadata {
  readonly displayName?: string;
  readonly description?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly provenance?: TenantProvenance;
}

export interface TenantLifecycleTimestamps {
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly activatedAt?: number;
  readonly suspendedAt?: number;
  readonly archivedAt?: number;
}

export interface Tenant {
  readonly tenantId: string;
  readonly status: TenantStatus;
  readonly administrativeMetadata: TenantAdministrativeMetadata;
  readonly lifecycle: TenantLifecycleTimestamps;
  readonly revision: number;
}

export interface TenantLifecycleEvent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly operation: TenantLifecycleOperation;
  readonly previousStatus?: TenantStatus;
  readonly nextStatus: TenantStatus;
  readonly actor?: string;
  readonly reason?: string;
  readonly timestamp: number;
  readonly revision: number;
}

export interface TenantLifecycleReceipt {
  readonly tenant: Tenant;
  readonly event: TenantLifecycleEvent;
}

export interface TenantRepository {
  create(tenant: Tenant): Tenant;
  get(tenantId: string): Tenant;
  list(): readonly Tenant[];
  save(tenant: Tenant, expectedRevision: number): Tenant;
  history(tenantId: string): readonly Tenant[];
}

export class TenantIdentityError extends AcsError {
  constructor(message = "invalid tenant identity") {
    super(message, "ACS_TENANT_IDENTITY_INVALID");
  }
}

export class TenantAlreadyExistsError extends AcsError {
  constructor(tenantId: string) {
    super("tenant already registered: " + tenantId, "ACS_TENANT_ALREADY_EXISTS");
  }
}

export class TenantNotFoundError extends AcsError {
  constructor(tenantId: string) {
    super("tenant not found: " + tenantId, "ACS_TENANT_NOT_FOUND");
  }
}

export class TenantLifecycleTransitionError extends AcsError {
  constructor(
    message: string,
    readonly details: {
      readonly tenantId: string;
      readonly from: TenantStatus;
      readonly to: TenantStatus;
      readonly operation: TenantLifecycleOperation;
      readonly reasonCode: string;
    },
  ) {
    super(message, "ACS_TENANT_INVALID_TRANSITION");
  }
}

export class TenantArchivedError extends AcsError {
  constructor(tenantId: string, operation: TenantLifecycleOperation) {
    super("tenant " + tenantId + " is archived and cannot be " + operation, "ACS_TENANT_ARCHIVED");
  }
}

export class InMemoryTenantRepository implements TenantRepository {
  readonly #tenants = new Map<string, Tenant>();
  readonly #history = new Map<string, Tenant[]>();

  create(tenant: Tenant): Tenant {
    if (this.#tenants.has(tenant.tenantId)) {
      throw new TenantAlreadyExistsError(tenant.tenantId);
    }

    this.#tenants.set(tenant.tenantId, tenant);
    this.#appendHistory(tenant);
    return tenant;
  }

  get(tenantId: string): Tenant {
    const tenant = this.#tenants.get(tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(tenantId);
    }
    return tenant;
  }

  list(): readonly Tenant[] {
    return [...this.#tenants.values()].sort((left, right) => left.tenantId.localeCompare(right.tenantId));
  }

  save(tenant: Tenant, expectedRevision: number): Tenant {
    const current = this.get(tenant.tenantId);
    if (current.revision !== expectedRevision) {
      throw new AcsError(
        "tenant revision conflict: expected " + expectedRevision + " but found " + current.revision,
        "ACS_TENANT_REVISION_CONFLICT",
      );
    }

    this.#tenants.set(tenant.tenantId, tenant);
    this.#appendHistory(tenant);
    return tenant;
  }

  history(tenantId: string): readonly Tenant[] {
    return [...(this.#history.get(tenantId) ?? [])];
  }

  #appendHistory(tenant: Tenant): void {
    const existing = this.#history.get(tenant.tenantId) ?? [];
    this.#history.set(tenant.tenantId, [...existing, tenant]);
  }
}

export interface TenantLifecycleMutationInput {
  readonly at: number;
  readonly actor?: string;
  readonly reason?: string;
  readonly correlationId?: string;
  readonly provenance?: string;
}

export interface TenantCreateInput extends TenantLifecycleMutationInput {
  readonly tenantId: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly createdBy?: string;
}

function validateTenantId(tenantId: string): string {
  const normalized = tenantId.trim();
  if (!normalized) {
    throw new TenantIdentityError("tenant identity is required");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalized)) {
    throw new TenantIdentityError("invalid tenant identity: " + tenantId);
  }
  return normalized;
}

function nextRevision(tenant: Tenant, patch: Partial<Tenant>): Tenant {
  return {
    ...tenant,
    ...patch,
    revision: tenant.revision + 1,
  };
}

function transitionAllowed(from: TenantStatus, to: TenantStatus, operation: TenantLifecycleOperation): boolean {
  const matrix: Record<TenantStatus, Partial<Record<TenantLifecycleOperation, TenantStatus>>> = {
    provisioning: {
      activate: "active",
      archive: "archived",
    },
    active: {
      suspend: "suspended",
      archive: "archived",
    },
    suspended: {
      reactivate: "active",
      archive: "archived",
    },
    archived: {},
  };

  return matrix[from][operation] === to;
}

export class TenantLifecycleService {
  readonly #repository: TenantRepository;
  readonly #auditService: AuditService | undefined;
  #sequence = 0;

  constructor(options: { repository?: TenantRepository; auditService?: AuditService } = {}) {
    this.#repository = options.repository ?? new InMemoryTenantRepository();
    this.#auditService = options.auditService;
  }

  createTenant(input: TenantCreateInput): TenantLifecycleReceipt {
    const tenantId = validateTenantId(input.tenantId);
    const tenant: Tenant = {
      tenantId,
      status: "provisioning",
      administrativeMetadata: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.createdBy ? { createdBy: input.createdBy } : {}),
        ...(input.createdBy ? { updatedBy: input.createdBy } : {}),
        ...(input.provenance || input.actor || input.reason
          ? {
              provenance: {
                ...(input.actor ? { actor: input.actor } : {}),
                ...(input.reason ? { reason: input.reason } : {}),
                ...(input.provenance ? { source: input.provenance } : {}),
              },
            }
          : {}),
      },
      lifecycle: {
        createdAt: input.at,
        updatedAt: input.at,
      },
      revision: 1,
    };

    const created = this.#repository.create(tenant);
    return this.#record({
      tenant: created,
      nextStatus: "provisioning",
      operation: "create",
      ...input,
    });
  }

  activateTenant(tenantId: string, input: TenantLifecycleMutationInput): TenantLifecycleReceipt {
    return this.#transition(tenantId, "activate", input, ["provisioning"]);
  }

  suspendTenant(tenantId: string, input: TenantLifecycleMutationInput): TenantLifecycleReceipt {
    return this.#transition(tenantId, "suspend", input, ["active"]);
  }

  reactivateTenant(tenantId: string, input: TenantLifecycleMutationInput): TenantLifecycleReceipt {
    return this.#transition(tenantId, "reactivate", input, ["suspended"]);
  }

  archiveTenant(tenantId: string, input: TenantLifecycleMutationInput): TenantLifecycleReceipt {
    return this.#transition(tenantId, "archive", input, ["provisioning", "active", "suspended"]);
  }

  getTenant(tenantId: string): Tenant {
    return this.#repository.get(validateTenantId(tenantId));
  }

  listTenants(): readonly Tenant[] {
    return this.#repository.list();
  }

  history(tenantId: string): readonly Tenant[] {
    return this.#repository.history(validateTenantId(tenantId));
  }

  #transition(
    tenantId: string,
    operation: Exclude<TenantLifecycleOperation, "create">,
    input: TenantLifecycleMutationInput,
    allowedFrom: readonly TenantStatus[],
  ): TenantLifecycleReceipt {
    const normalizedTenantId = validateTenantId(tenantId);
    const current = this.#repository.get(normalizedTenantId);

    if (current.status === "archived") {
      throw new TenantArchivedError(normalizedTenantId, operation);
    }

    if (!allowedFrom.includes(current.status)) {
      throw new TenantLifecycleTransitionError(
        "tenant " + normalizedTenantId + " cannot " + operation + " from " + current.status,
        {
          tenantId: normalizedTenantId,
          from: current.status,
          to: this.#nextStatus(operation),
          operation,
          reasonCode: "invalid_state_transition",
        },
      );
    }

    const nextStatus = this.#nextStatus(operation);
    if (!transitionAllowed(current.status, nextStatus, operation)) {
      throw new TenantLifecycleTransitionError(
        "tenant " + normalizedTenantId + " cannot " + operation + " from " + current.status,
        {
          tenantId: normalizedTenantId,
          from: current.status,
          to: nextStatus,
          operation,
          reasonCode: "transition_matrix_rejected",
        },
      );
    }

    const lifecycle: TenantLifecycleTimestamps = {
      ...current.lifecycle,
      updatedAt: input.at,
      ...(operation === "activate" || operation === "reactivate" ? { activatedAt: input.at } : {}),
      ...(operation === "suspend" ? { suspendedAt: input.at } : {}),
      ...(operation === "archive" ? { archivedAt: input.at } : {}),
    };

    const updated = nextRevision(current, {
      status: nextStatus,
      administrativeMetadata: {
        ...current.administrativeMetadata,
        ...(input.actor ? { updatedBy: input.actor } : {}),
        ...(input.provenance || input.actor || input.reason
          ? {
              provenance: {
                ...(input.actor ? { actor: input.actor } : {}),
                ...(input.reason ? { reason: input.reason } : {}),
                ...(input.provenance ? { source: input.provenance } : {}),
              },
            }
          : {}),
      },
      lifecycle,
    });

    const saved = this.#repository.save(updated, current.revision);
    return this.#record({
      tenant: saved,
      previousStatus: current.status,
      nextStatus,
      operation,
      ...input,
    });
  }

  #nextStatus(operation: Exclude<TenantLifecycleOperation, "create">): TenantStatus {
    switch (operation) {
      case "activate":
      case "reactivate":
        return "active";
      case "suspend":
        return "suspended";
      case "archive":
        return "archived";
    }
  }

  #record(input: {
    tenant: Tenant;
    previousStatus?: TenantStatus;
    nextStatus: TenantStatus;
    operation: TenantLifecycleOperation;
    at: number;
    actor?: string;
    reason?: string;
    correlationId?: string;
  }): TenantLifecycleReceipt {
    const event: TenantLifecycleEvent = {
      eventId: "tenant_evt_" + String(++this.#sequence),
      correlationId: input.correlationId ?? ("tenant:" + input.tenant.tenantId + ":" + input.operation + ":" + String(input.tenant.revision)),
      tenantId: input.tenant.tenantId,
      operation: input.operation,
      ...(input.previousStatus ? { previousStatus: input.previousStatus } : {}),
      nextStatus: input.nextStatus,
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      timestamp: input.at,
      revision: input.tenant.revision,
    };

    this.#auditService?.recordEvent({
      eventType: "tenant." + input.operation,
      correlationId: event.correlationId,
      tenantId: event.tenantId,
      decision: "allowed",
      result: "success",
      ...(event.actor ? { actor: event.actor } : {}),
      metadata: {
        tenantId: event.tenantId,
        operation: event.operation,
        previousStatus: event.previousStatus,
        nextStatus: event.nextStatus,
        reason: event.reason,
        timestamp: event.timestamp,
        revision: event.revision,
      },
    });

    return {
      tenant: input.tenant,
      event,
    };
  }
}

export function isTenantStatus(value: string): value is TenantStatus {
  return value === "provisioning" || value === "active" || value === "suspended" || value === "archived";
}
