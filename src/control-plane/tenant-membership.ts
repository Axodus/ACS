import { AcsError } from "../errors.js";
import type { AuditService } from "./audit-service.js";
import { TenantIdentityError } from "./tenant-domain.js";
import type { TenantRepository, Tenant, TenantStatus } from "./tenant-domain.js";

export type PrincipalId = string;

export type AdministrativeRole = "tenant_owner" | "tenant_admin" | "operator" | "auditor";

export type TenantMembershipStatus = "active" | "suspended" | "removed";

export type TenantAdministrativeAction =
  | "tenant.read"
  | "membership.read"
  | "membership.add"
  | "membership.change_role"
  | "membership.suspend"
  | "membership.reactivate"
  | "membership.remove"
  | "ownership.transfer";

export type AdministrativeAuthority =
  | {
      readonly kind: "platform_admin";
      readonly principalId: PrincipalId;
    }
  | {
      readonly kind: "tenant_member";
      readonly principalId: PrincipalId;
      readonly tenantId: string;
    };

export interface TenantMembershipProvenance {
  readonly actor?: string;
  readonly reason?: string;
  readonly source?: string;
}

export interface TenantMembership {
  readonly tenantId: string;
  readonly principalId: PrincipalId;
  readonly role: AdministrativeRole;
  readonly status: TenantMembershipStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly provenance?: TenantMembershipProvenance;
}

export interface TenantMembershipLifecycleEvent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly principalId: PrincipalId;
  readonly operation: TenantMembershipOperation;
  readonly previousRole?: AdministrativeRole;
  readonly nextRole: AdministrativeRole;
  readonly previousStatus?: TenantMembershipStatus;
  readonly nextStatus: TenantMembershipStatus;
  readonly authorityKind: AdministrativeAuthority["kind"];
  readonly authorityPrincipalId: PrincipalId;
  readonly actor?: string;
  readonly reason?: string;
  readonly timestamp: number;
  readonly revision: number;
}

export interface TenantMembershipReceipt {
  readonly membership: TenantMembership;
  readonly event: TenantMembershipLifecycleEvent;
}

export type TenantMembershipOperation =
  | "bootstrap"
  | "add"
  | "change_role"
  | "suspend"
  | "reactivate"
  | "remove"
  | "transfer_ownership";

export interface TenantMembershipRepository {
  create(membership: TenantMembership): TenantMembership;
  get(tenantId: string, principalId: string): TenantMembership;
  list(): readonly TenantMembership[];
  listByTenant(tenantId: string): readonly TenantMembership[];
  save(membership: TenantMembership, expectedRevision: number): TenantMembership;
  saveMany(updates: readonly TenantMembershipRepositoryUpdate[]): readonly TenantMembership[];
  history(tenantId: string, principalId: string): readonly TenantMembership[];
}

export interface TenantMembershipRepositoryUpdate {
  readonly membership: TenantMembership;
  readonly expectedRevision: number;
}

export interface TenantAuthorityDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly authorityBasis: "platform_admin" | "tenant_owner" | "tenant_admin" | "operator" | "auditor" | "none";
}

export class PrincipalIdentityError extends AcsError {
  constructor(message = "invalid principal identity") {
    super(message, "ACS_PRINCIPAL_IDENTITY_INVALID");
  }
}

export class TenantMembershipAlreadyExistsError extends AcsError {
  constructor(tenantId: string, principalId: string) {
    super("membership already exists: " + tenantId + "/" + principalId, "ACS_TENANT_MEMBERSHIP_ALREADY_EXISTS");
  }
}

export class TenantMembershipNotFoundError extends AcsError {
  constructor(tenantId: string, principalId: string) {
    super("membership not found: " + tenantId + "/" + principalId, "ACS_TENANT_MEMBERSHIP_NOT_FOUND");
  }
}

export class TenantAdministrativeAuthorityDeniedError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_TENANT_ADMIN_AUTHORITY_DENIED");
  }
}

export class CrossTenantAdministrativeOperationError extends AcsError {
  constructor(authorityTenantId: string, targetTenantId: string) {
    super(
      "cross-tenant administrative operation forbidden: " + authorityTenantId + " cannot administer " + targetTenantId,
      "ACS_TENANT_CROSS_TENANT_FORBIDDEN",
    );
  }
}

export class InvalidMembershipRoleTransitionError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_TENANT_MEMBERSHIP_ROLE_TRANSITION_INVALID");
  }
}

export class CannotRemoveLastOwnerError extends AcsError {
  constructor(tenantId: string) {
    super("cannot remove the last owner of tenant " + tenantId, "ACS_TENANT_LAST_OWNER_PROTECTED");
  }
}

export class InvalidOwnershipTransferError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_TENANT_OWNERSHIP_TRANSFER_INVALID");
  }
}

export class TenantStateBlocksMembershipMutationError extends AcsError {
  constructor(tenantId: string, state: TenantStatus, operation: TenantMembershipOperation) {
    super(
      "tenant " + tenantId + " in state " + state + " blocks membership operation " + operation,
      "ACS_TENANT_STATE_BLOCKS_MEMBERSHIP_MUTATION",
    );
  }
}

export class TenantMembershipInactiveError extends AcsError {
  constructor(tenantId: string, principalId: string) {
    super("membership is inactive or removed: " + tenantId + "/" + principalId, "ACS_TENANT_MEMBERSHIP_INACTIVE");
  }
}

export class InMemoryTenantMembershipRepository implements TenantMembershipRepository {
  readonly #memberships = new Map<string, TenantMembership>();
  readonly #history = new Map<string, TenantMembership[]>();

  create(membership: TenantMembership): TenantMembership {
    const key = membershipKey(membership.tenantId, membership.principalId);
    if (this.#memberships.has(key)) {
      throw new TenantMembershipAlreadyExistsError(membership.tenantId, membership.principalId);
    }

    this.#memberships.set(key, membership);
    this.#appendHistory(membership);
    return membership;
  }

  get(tenantId: string, principalId: string): TenantMembership {
    const membership = this.#memberships.get(membershipKey(tenantId, principalId));
    if (!membership) {
      throw new TenantMembershipNotFoundError(tenantId, principalId);
    }
    return membership;
  }

  list(): readonly TenantMembership[] {
    return [...this.#memberships.values()].sort((left, right) =>
      left.tenantId === right.tenantId
        ? left.principalId.localeCompare(right.principalId)
        : left.tenantId.localeCompare(right.tenantId),
    );
  }

  listByTenant(tenantId: string): readonly TenantMembership[] {
    return this.list().filter((membership) => membership.tenantId === tenantId);
  }

  save(membership: TenantMembership, expectedRevision: number): TenantMembership {
    return this.saveMany([{ membership, expectedRevision }])[0]!;
  }

  saveMany(updates: readonly TenantMembershipRepositoryUpdate[]): readonly TenantMembership[] {
    for (const update of updates) {
      const current = this.get(update.membership.tenantId, update.membership.principalId);
      if (current.revision !== update.expectedRevision) {
        throw new AcsError(
          "membership revision conflict: expected " + update.expectedRevision + " but found " + current.revision,
          "ACS_TENANT_MEMBERSHIP_REVISION_CONFLICT",
        );
      }
    }

    for (const update of updates) {
      this.#memberships.set(
        membershipKey(update.membership.tenantId, update.membership.principalId),
        update.membership,
      );
      this.#appendHistory(update.membership);
    }
    return updates.map((update) => update.membership);
  }

  history(tenantId: string, principalId: string): readonly TenantMembership[] {
    return [...(this.#history.get(membershipKey(tenantId, principalId)) ?? [])];
  }

  #appendHistory(membership: TenantMembership): void {
    const key = membershipKey(membership.tenantId, membership.principalId);
    const entries = this.#history.get(key) ?? [];
    this.#history.set(key, [...entries, membership]);
  }
}

export function isAdministrativeRole(value: string): value is AdministrativeRole {
  return value === "tenant_owner" || value === "tenant_admin" || value === "operator" || value === "auditor";
}

export function isTenantMembershipStatus(value: string): value is TenantMembershipStatus {
  return value === "active" || value === "suspended" || value === "removed";
}

export function evaluateTenantAdministrativeAuthority(input: {
  readonly action: TenantAdministrativeAction;
  readonly authority: AdministrativeAuthority;
  readonly tenant: Tenant;
  readonly actorMembership?: TenantMembership;
  readonly targetMembership?: TenantMembership;
  readonly ownerCount: number;
  readonly targetRole?: AdministrativeRole;
  readonly isBootstrap?: boolean;
}): TenantAuthorityDecision {
  if (input.authority.kind === "platform_admin") {
    if (input.tenant.status === "archived") {
      return {
        allowed: false,
        reason: "archived tenant blocks administrative mutations",
        authorityBasis: "platform_admin",
      };
    }
    if (input.action !== "membership.read" && input.action !== "tenant.read" && input.tenant.status === "provisioning" && !input.isBootstrap) {
      return {
        allowed: false,
        reason: "provisioning tenant only accepts bootstrap owner mutation",
        authorityBasis: "platform_admin",
      };
    }
    return {
      allowed: true,
      reason: "platform administrative authority granted",
      authorityBasis: "platform_admin",
    };
  }

  if (input.authority.tenantId !== input.tenant.tenantId) {
    return {
      allowed: false,
      reason: "cross-tenant authority denied",
      authorityBasis: "none",
    };
  }

  const actorMembership = input.actorMembership;
  if (!actorMembership || actorMembership.status !== "active") {
    return {
      allowed: false,
      reason: "active tenant membership required for tenant-scoped authority",
      authorityBasis: "none",
    };
  }

  if (input.tenant.status === "archived") {
    return {
      allowed: false,
      reason: "archived tenant blocks membership mutations",
      authorityBasis: actorMembership.role,
    };
  }

  if (input.action === "tenant.read" || input.action === "membership.read") {
    return {
      allowed: true,
      reason: "tenant-scoped read allowed",
      authorityBasis: actorMembership.role,
    };
  }

  if (input.tenant.status === "suspended" && input.authority.kind === "tenant_member") {
    return {
      allowed: false,
      reason: "suspended tenant blocks tenant-scoped membership mutations",
      authorityBasis: actorMembership.role,
    };
  }

  if (input.tenant.status === "provisioning") {
    return {
      allowed: false,
      reason: "tenant-scoped mutations are blocked during provisioning until bootstrap completes",
      authorityBasis: actorMembership.role,
    };
  }

  switch (actorMembership.role) {
    case "auditor":
    case "operator":
      return {
        allowed: false,
        reason: "operator and auditor roles are read-only",
        authorityBasis: actorMembership.role,
      };
    case "tenant_admin":
      if (
        input.action === "membership.add" ||
        input.action === "membership.change_role" ||
        input.action === "membership.suspend" ||
        input.action === "membership.reactivate" ||
        input.action === "membership.remove"
      ) {
        if (input.targetMembership?.role === "tenant_owner" || input.targetRole === "tenant_owner") {
          return {
            allowed: false,
            reason: "tenant admin cannot administer owner authority",
            authorityBasis: "tenant_admin",
          };
        }
        return {
          allowed: true,
          reason: "tenant admin authority granted",
          authorityBasis: "tenant_admin",
        };
      }
      return {
        allowed: false,
        reason: "tenant admin cannot transfer ownership",
        authorityBasis: "tenant_admin",
      };
    case "tenant_owner":
      if (input.action === "ownership.transfer") {
        return {
          allowed: true,
          reason: "tenant owner may transfer ownership",
          authorityBasis: "tenant_owner",
        };
      }
      if (
        input.action === "membership.add" ||
        input.action === "membership.change_role" ||
        input.action === "membership.suspend" ||
        input.action === "membership.reactivate" ||
        input.action === "membership.remove"
      ) {
        return {
          allowed: true,
          reason: "tenant owner authority granted",
          authorityBasis: "tenant_owner",
        };
      }
      return {
        allowed: false,
        reason: "unsupported tenant owner action",
        authorityBasis: "tenant_owner",
      };
  }
}

export interface TenantMembershipMutationContext {
  readonly authority: AdministrativeAuthority;
  readonly at: number;
  readonly actor?: string;
  readonly reason?: string;
  readonly correlationId?: string;
  readonly provenance?: string;
}

export interface TenantMembershipBootstrapInput extends TenantMembershipMutationContext {
  readonly tenantId: string;
  readonly principalId: PrincipalId;
  readonly displayName?: string;
  readonly role?: "tenant_owner";
}

export interface TenantMembershipCreateInput extends TenantMembershipMutationContext {
  readonly tenantId: string;
  readonly principalId: PrincipalId;
  readonly role: Exclude<AdministrativeRole, "tenant_owner">;
}

export interface TenantMembershipRoleChangeInput extends TenantMembershipMutationContext {
  readonly tenantId: string;
  readonly principalId: PrincipalId;
  readonly role: Exclude<AdministrativeRole, "tenant_owner">;
}

export interface TenantMembershipLifecycleInput extends TenantMembershipMutationContext {
  readonly tenantId: string;
  readonly principalId: PrincipalId;
}

export interface TenantOwnershipTransferInput extends TenantMembershipMutationContext {
  readonly tenantId: string;
  readonly fromPrincipalId: PrincipalId;
  readonly toPrincipalId: PrincipalId;
}

function validatePrincipalId(principalId: string): string {
  const normalized = principalId.trim();
  if (!normalized) {
    throw new PrincipalIdentityError("principal identity is required");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalized)) {
    throw new PrincipalIdentityError("invalid principal identity: " + principalId);
  }
  return normalized;
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

function membershipKey(tenantId: string, principalId: string): string {
  return tenantId + "::" + principalId;
}

function nextRevision(membership: TenantMembership, patch: Partial<TenantMembership>): TenantMembership {
  return {
    ...membership,
    ...patch,
    revision: membership.revision + 1,
  };
}

function appendProvenance(
  current: TenantMembershipProvenance | undefined,
  input: { readonly actor?: string; readonly reason?: string; readonly provenance?: string },
): TenantMembershipProvenance | undefined {
  if (!input.actor && !input.reason && !input.provenance && !current) {
    return undefined;
  }

  return {
    ...(current ? current : {}),
    ...(input.actor ? { actor: input.actor } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.provenance ? { source: input.provenance } : {}),
  };
}

export class TenantMembershipService {
  readonly #tenantRepository: TenantRepository;
  readonly #repository: TenantMembershipRepository;
  readonly #auditService: AuditService | undefined;
  #sequence = 0;

  constructor(options: {
    readonly tenantRepository: TenantRepository;
    readonly repository?: TenantMembershipRepository;
    readonly auditService?: AuditService;
  }) {
    this.#tenantRepository = options.tenantRepository;
    this.#repository = options.repository ?? new InMemoryTenantMembershipRepository();
    this.#auditService = options.auditService;
  }

  bootstrapTenantOwner(input: TenantMembershipBootstrapInput): TenantMembershipReceipt {
    const tenant = this.#tenant(input.tenantId);
    const principalId = validatePrincipalId(input.principalId);
    this.#assertBootstrapEligible(tenant, input.authority, true);
    if (input.role && input.role !== "tenant_owner") {
      throw new InvalidMembershipRoleTransitionError("bootstrap owner must use tenant_owner role");
    }

    const membership: TenantMembership = {
      tenantId: tenant.tenantId,
      principalId,
      role: "tenant_owner",
      status: "active",
      createdAt: input.at,
      updatedAt: input.at,
      revision: 1,
      ...(input.actor ? { createdBy: input.actor, updatedBy: input.actor } : {}),
      ...(input.provenance || input.actor || input.reason
        ? {
            provenance: appendProvenance(undefined, {
              actor: input.actor,
              reason: input.reason,
              provenance: input.provenance,
            }),
          }
        : {}),
    };

    const created = this.#repository.create(membership);
    return this.#record({
      membership: created,
      operation: "bootstrap",
      previousRole: undefined,
      previousStatus: undefined,
      nextRole: "tenant_owner",
      nextStatus: "active",
      authority: input.authority,
      at: input.at,
      actor: input.actor,
      reason: input.reason,
      correlationId: input.correlationId,
    });
  }

  addMembership(input: TenantMembershipCreateInput): TenantMembershipReceipt {
    const tenant = this.#tenant(input.tenantId);
    const principalId = validatePrincipalId(input.principalId);
    this.#assertBootstrapEligible(tenant, input.authority, false);

    this.#assertAuthorizedForMutation({
      action: "membership.add",
      authority: input.authority,
      tenant,
      targetRole: input.role,
      isBootstrap: false,
    });

    const membership: TenantMembership = {
      tenantId: tenant.tenantId,
      principalId,
      role: input.role,
      status: "active",
      createdAt: input.at,
      updatedAt: input.at,
      revision: 1,
      ...(input.actor ? { createdBy: input.actor, updatedBy: input.actor } : {}),
      ...(input.provenance || input.actor || input.reason
        ? {
            provenance: appendProvenance(undefined, {
              actor: input.actor,
              reason: input.reason,
              provenance: input.provenance,
            }),
          }
        : {}),
    };

    const created = this.#repository.create(membership);
    return this.#record({
      membership: created,
      operation: "add",
      nextRole: created.role,
      nextStatus: created.status,
      authority: input.authority,
      at: input.at,
      actor: input.actor,
      reason: input.reason,
      correlationId: input.correlationId,
    });
  }

  changeRole(input: TenantMembershipRoleChangeInput): TenantMembershipReceipt {
    const tenant = this.#tenant(input.tenantId);
    const principalId = validatePrincipalId(input.principalId);

    const current = this.#membership(tenant.tenantId, principalId);
    this.#assertMembershipMutationAllowed(tenant, input.authority, current, "membership.change_role");
    if (current.status === "removed") {
      throw new TenantMembershipInactiveError(tenant.tenantId, principalId);
    }
    if (current.role === input.role) {
      throw new InvalidMembershipRoleTransitionError("role transition is a no-op for " + tenant.tenantId + "/" + principalId);
    }
    if (input.authority.kind === "tenant_member" && input.authority.principalId === principalId && this.#roleRank(input.role) > this.#roleRank(current.role)) {
      throw new TenantAdministrativeAuthorityDeniedError("self-promotion is forbidden");
    }
    if (current.role === "tenant_owner") {
      throw new InvalidMembershipRoleTransitionError("use ownership transfer to change the owner role");
    }
    if (current.status !== "active" && current.status !== "suspended") {
      throw new TenantMembershipInactiveError(tenant.tenantId, principalId);
    }

    const updated = nextRevision(current, {
      role: input.role,
      updatedAt: input.at,
      ...(input.actor ? { updatedBy: input.actor } : {}),
      provenance: appendProvenance(current.provenance, input),
    });
    const saved = this.#repository.save(updated, current.revision);
    return this.#record({
      membership: saved,
      operation: "change_role",
      previousRole: current.role,
      nextRole: saved.role,
      previousStatus: current.status,
      nextStatus: saved.status,
      authority: input.authority,
      at: input.at,
      actor: input.actor,
      reason: input.reason,
      correlationId: input.correlationId,
    });
  }

  suspendMembership(input: TenantMembershipLifecycleInput): TenantMembershipReceipt {
    return this.#setMembershipStatus(input, "membership.suspend", "suspended");
  }

  reactivateMembership(input: TenantMembershipLifecycleInput): TenantMembershipReceipt {
    return this.#setMembershipStatus(input, "membership.reactivate", "active");
  }

  removeMembership(input: TenantMembershipLifecycleInput): TenantMembershipReceipt {
    const tenant = this.#tenant(input.tenantId);
    const principalId = validatePrincipalId(input.principalId);
    const current = this.#membership(tenant.tenantId, principalId);
    this.#assertMembershipMutationAllowed(tenant, input.authority, current, "membership.remove");
    if (current.status === "removed") {
      throw new TenantMembershipInactiveError(tenant.tenantId, principalId);
    }
    if (current.role === "tenant_owner" && this.#ownerCount(tenant.tenantId) <= 1) {
      throw new CannotRemoveLastOwnerError(tenant.tenantId);
    }

    const updated = nextRevision(current, {
      status: "removed",
      updatedAt: input.at,
      ...(input.actor ? { updatedBy: input.actor } : {}),
      provenance: appendProvenance(current.provenance, input),
    });
    const saved = this.#repository.save(updated, current.revision);
    return this.#record({
      membership: saved,
      operation: "remove",
      previousRole: current.role,
      nextRole: saved.role,
      previousStatus: current.status,
      nextStatus: saved.status,
      authority: input.authority,
      at: input.at,
      actor: input.actor,
      reason: input.reason,
      correlationId: input.correlationId,
    });
  }

  transferOwnership(input: TenantOwnershipTransferInput): TenantMembershipReceipt {
    const tenant = this.#tenant(input.tenantId);
    const fromPrincipalId = validatePrincipalId(input.fromPrincipalId);
    const toPrincipalId = validatePrincipalId(input.toPrincipalId);
    const currentOwner = this.#membership(tenant.tenantId, fromPrincipalId);
    const nextOwner = this.#membership(tenant.tenantId, toPrincipalId);
    this.#assertMembershipMutationAllowed(tenant, input.authority, currentOwner, "ownership.transfer");
    this.#assertMembershipMutationAllowed(tenant, input.authority, nextOwner, "ownership.transfer");

    if (currentOwner.role !== "tenant_owner") {
      throw new InvalidOwnershipTransferError("ownership can only transfer from the current owner");
    }
    if (fromPrincipalId === toPrincipalId) {
      throw new InvalidOwnershipTransferError("ownership transfer requires a different target principal");
    }
    if (nextOwner.status !== "active") {
      throw new InvalidOwnershipTransferError("ownership transfer requires an active target member");
    }
    if (nextOwner.role === "tenant_owner") {
      throw new InvalidOwnershipTransferError("target is already the owner");
    }
    if (input.authority.kind === "tenant_member" && input.authority.principalId === toPrincipalId) {
      throw new TenantAdministrativeAuthorityDeniedError("self-promotion to owner is forbidden");
    }

    if (this.#ownerCount(tenant.tenantId) <= 0) {
      throw new InvalidOwnershipTransferError("tenant has no active owner to transfer");
    }

    const updatedOwner = nextRevision(currentOwner, {
      role: "tenant_admin",
      updatedAt: input.at,
      ...(input.actor ? { updatedBy: input.actor } : {}),
      provenance: appendProvenance(currentOwner.provenance, input),
    });
    const updatedNext = nextRevision(nextOwner, {
      role: "tenant_owner",
      updatedAt: input.at,
      ...(input.actor ? { updatedBy: input.actor } : {}),
      provenance: appendProvenance(nextOwner.provenance, input),
    });

    const [, saved] = this.#repository.saveMany([
      { membership: updatedOwner, expectedRevision: currentOwner.revision },
      { membership: updatedNext, expectedRevision: nextOwner.revision },
    ]);
    if (!saved) {
      throw new InvalidOwnershipTransferError("ownership transfer did not persist the target owner");
    }
    return this.#record({
      membership: saved,
      operation: "transfer_ownership",
      previousRole: nextOwner.role,
      nextRole: saved.role,
      previousStatus: nextOwner.status,
      nextStatus: saved.status,
      authority: input.authority,
      at: input.at,
      actor: input.actor,
      reason: input.reason,
      correlationId: input.correlationId,
    });
  }

  getMembership(tenantId: string, principalId: string): TenantMembership {
    return this.#repository.get(validateTenantId(tenantId), validatePrincipalId(principalId));
  }

  listMemberships(tenantId: string): readonly TenantMembership[] {
    return this.#repository.listByTenant(validateTenantId(tenantId));
  }

  history(tenantId: string, principalId: string): readonly TenantMembership[] {
    return this.#repository.history(validateTenantId(tenantId), validatePrincipalId(principalId));
  }

  #setMembershipStatus(
    input: TenantMembershipLifecycleInput,
    operation: "membership.suspend" | "membership.reactivate",
    nextStatus: TenantMembershipStatus,
  ): TenantMembershipReceipt {
    const tenant = this.#tenant(input.tenantId);
    const principalId = validatePrincipalId(input.principalId);
    const current = this.#membership(tenant.tenantId, principalId);
    this.#assertMembershipMutationAllowed(tenant, input.authority, current, operation);
    if (current.status === "removed") {
      throw new TenantMembershipInactiveError(tenant.tenantId, principalId);
    }
    if (current.status === nextStatus) {
      throw new InvalidMembershipRoleTransitionError("membership already in state " + nextStatus);
    }

    const updated = nextRevision(current, {
      status: nextStatus,
      updatedAt: input.at,
      ...(input.actor ? { updatedBy: input.actor } : {}),
      provenance: appendProvenance(current.provenance, input),
    });
    const saved = this.#repository.save(updated, current.revision);
    return this.#record({
      membership: saved,
      operation: actionToOperation(operation),
      previousRole: current.role,
      nextRole: saved.role,
      previousStatus: current.status,
      nextStatus: saved.status,
      authority: input.authority,
      at: input.at,
      actor: input.actor,
      reason: input.reason,
      correlationId: input.correlationId,
    });
  }

  #tenant(tenantId: string): Tenant {
    return this.#tenantRepository.get(validateTenantId(tenantId));
  }

  #membership(tenantId: string, principalId: string): TenantMembership {
    return this.#repository.get(tenantId, principalId);
  }

  #authoritativeMembership(tenant: Tenant, authority: AdministrativeAuthority): TenantMembership | undefined {
    if (authority.kind === "platform_admin") {
      return undefined;
    }
    if (authority.tenantId !== tenant.tenantId) {
      throw new CrossTenantAdministrativeOperationError(authority.tenantId, tenant.tenantId);
    }
    return this.#repository.get(tenant.tenantId, validatePrincipalId(authority.principalId));
  }

  #assertBootstrapEligible(tenant: Tenant, authority: AdministrativeAuthority, isBootstrap: boolean): void {
    if (tenant.status === "archived") {
      throw new TenantStateBlocksMembershipMutationError(tenant.tenantId, tenant.status, "bootstrap");
    }
    if (tenant.status !== "provisioning" && isBootstrap) {
      throw new TenantStateBlocksMembershipMutationError(tenant.tenantId, tenant.status, "bootstrap");
    }
    if (!isBootstrap && tenant.status === "provisioning") {
      throw new TenantStateBlocksMembershipMutationError(tenant.tenantId, tenant.status, "add");
    }
    if (authority.kind !== "platform_admin" && authority.tenantId !== tenant.tenantId) {
      throw new CrossTenantAdministrativeOperationError(authority.tenantId, tenant.tenantId);
    }
  }

  #assertMembershipMutationAllowed(
    tenant: Tenant,
    authority: AdministrativeAuthority,
    targetMembership: TenantMembership,
    action: TenantAdministrativeAction,
  ): void {
    if (tenant.status === "archived") {
      throw new TenantStateBlocksMembershipMutationError(tenant.tenantId, tenant.status, actionToOperation(action));
    }

    const actorMembership = authority.kind === "tenant_member" && authority.tenantId === tenant.tenantId
      ? this.#repository.get(tenant.tenantId, validatePrincipalId(authority.principalId))
      : undefined;

    const decision = evaluateTenantAdministrativeAuthority({
      action,
      authority,
      tenant,
      actorMembership,
      targetMembership,
      ownerCount: this.#ownerCount(tenant.tenantId),
      targetRole: targetMembership.role,
      isBootstrap: false,
    });
    if (!decision.allowed) {
      if (authority.kind === "tenant_member" && authority.tenantId !== tenant.tenantId) {
        throw new CrossTenantAdministrativeOperationError(authority.tenantId, tenant.tenantId);
      }
      if (tenant.status === "provisioning") {
        throw new TenantStateBlocksMembershipMutationError(tenant.tenantId, tenant.status, actionToOperation(action));
      }
      throw new TenantAdministrativeAuthorityDeniedError(decision.reason);
    }
  }

  #assertAuthorizedForMutation(input: {
    readonly action: TenantAdministrativeAction;
    readonly authority: AdministrativeAuthority;
    readonly tenant: Tenant;
    readonly targetRole?: AdministrativeRole;
    readonly isBootstrap: boolean;
  }): void {
    if (input.authority.kind === "platform_admin") {
      return;
    }
    if (input.authority.tenantId !== input.tenant.tenantId) {
      throw new CrossTenantAdministrativeOperationError(input.authority.tenantId, input.tenant.tenantId);
    }

    const actorMembership = this.#repository.get(
      input.tenant.tenantId,
      validatePrincipalId(input.authority.principalId),
    );

    const decision = evaluateTenantAdministrativeAuthority({
      action: input.action,
      authority: input.authority,
      tenant: input.tenant,
      actorMembership,
      ownerCount: this.#ownerCount(input.tenant.tenantId),
      targetRole: input.targetRole,
      isBootstrap: input.isBootstrap,
    });
    if (!decision.allowed) {
      throw new TenantAdministrativeAuthorityDeniedError(decision.reason);
    }
  }

  #ownerCount(tenantId: string): number {
    return this.#repository.listByTenant(tenantId).filter((membership) => membership.role === "tenant_owner" && membership.status === "active").length;
  }

  #roleRank(role: AdministrativeRole): number {
    switch (role) {
      case "auditor":
        return 0;
      case "operator":
        return 1;
      case "tenant_admin":
        return 2;
      case "tenant_owner":
        return 3;
    }
  }

  #record(input: {
    readonly membership: TenantMembership;
    readonly operation: TenantMembershipOperation;
    readonly previousRole?: AdministrativeRole;
    readonly nextRole: AdministrativeRole;
    readonly previousStatus?: TenantMembershipStatus;
    readonly nextStatus: TenantMembershipStatus;
    readonly authority: AdministrativeAuthority;
    readonly at: number;
    readonly actor?: string;
    readonly reason?: string;
    readonly correlationId?: string;
  }): TenantMembershipReceipt {
    const event: TenantMembershipLifecycleEvent = {
      eventId: "membership_evt_" + String(++this.#sequence),
      correlationId:
        input.correlationId ??
        ("tenant:" + input.membership.tenantId + ":" + input.operation + ":" + input.membership.principalId + ":" + String(input.membership.revision)),
      tenantId: input.membership.tenantId,
      principalId: input.membership.principalId,
      operation: input.operation,
      ...(input.previousRole ? { previousRole: input.previousRole } : {}),
      nextRole: input.nextRole,
      ...(input.previousStatus ? { previousStatus: input.previousStatus } : {}),
      nextStatus: input.nextStatus,
      authorityKind: input.authority.kind,
      authorityPrincipalId: input.authority.principalId,
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      timestamp: input.at,
      revision: input.membership.revision,
    };

    this.#auditService?.recordEvent({
      eventType: "tenant.membership." + input.operation,
      correlationId: event.correlationId,
      tenantId: event.tenantId,
      actor: event.actor ?? event.authorityPrincipalId,
      decision: "allowed",
      result: "success",
      revision: event.revision,
      metadata: {
        tenantId: event.tenantId,
        principalId: event.principalId,
        operation: event.operation,
        previousRole: event.previousRole,
        nextRole: event.nextRole,
        previousStatus: event.previousStatus,
        nextStatus: event.nextStatus,
        authorityKind: event.authorityKind,
        authorityPrincipalId: event.authorityPrincipalId,
        reason: event.reason,
        timestamp: event.timestamp,
        revision: event.revision,
      },
    });

    return {
      membership: input.membership,
      event,
    };
  }
}

function actionToOperation(action: TenantAdministrativeAction): TenantMembershipOperation {
  switch (action) {
    case "tenant.read":
    case "membership.read":
      return "add";
    case "membership.add":
      return "add";
    case "membership.change_role":
      return "change_role";
    case "membership.suspend":
      return "suspend";
    case "membership.reactivate":
      return "reactivate";
    case "membership.remove":
      return "remove";
    case "ownership.transfer":
      return "transfer_ownership";
  }
}
