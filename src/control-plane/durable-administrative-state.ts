import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { AcsError } from "../errors.js";
import type { AuditEvent, AuditEventStore } from "./audit-service.js";
import {
  TenantAlreadyExistsError,
  TenantNotFoundError,
  type Tenant,
  type TenantRepository,
} from "./tenant-domain.js";
import {
  TenantMembershipAlreadyExistsError,
  TenantMembershipNotFoundError,
  type TenantMembership,
  type TenantMembershipRepository,
  type TenantMembershipRepositoryUpdate,
} from "./tenant-membership.js";
import {
  TenantGovernanceStateNotFoundError,
  type TenantGovernanceRepository,
  type TenantGovernanceState,
} from "./tenant-governance.js";

const SCHEMA_VERSION = 1;

interface AdministrativeStateSnapshot {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly tenants: readonly Tenant[];
  readonly tenantHistory: Readonly<Record<string, readonly Tenant[]>>;
  readonly memberships: readonly TenantMembership[];
  readonly membershipHistory: Readonly<Record<string, readonly TenantMembership[]>>;
  readonly governanceStates: readonly TenantGovernanceState[];
  readonly governanceHistory: Readonly<Record<string, readonly TenantGovernanceState[]>>;
  readonly auditEvents: readonly AuditEvent[];
}

export class AdministrativeStatePersistenceError extends AcsError {
  constructor(message: string) {
    super(message, "ACS_ADMINISTRATIVE_STATE_PERSISTENCE_FAILED");
  }
}

function emptySnapshot(): AdministrativeStateSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION,
    tenants: [],
    tenantHistory: {},
    memberships: [],
    membershipHistory: {},
    governanceStates: [],
    governanceHistory: {},
    auditEvents: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function assertTenant(value: unknown): asserts value is Tenant {
  if (!isRecord(value)
    || typeof value.tenantId !== "string"
    || !["provisioning", "active", "suspended", "archived"].includes(String(value.status))
    || !isRecord(value.administrativeMetadata)
    || !isRecord(value.lifecycle)
    || !isFiniteNumber(value.lifecycle.createdAt)
    || !isFiniteNumber(value.lifecycle.updatedAt)
    || !isFiniteNumber(value.revision)) {
    throw new AdministrativeStatePersistenceError("invalid tenant entry in durable administrative state");
  }
}

function assertMembership(value: unknown): asserts value is TenantMembership {
  if (!isRecord(value)
    || typeof value.tenantId !== "string"
    || typeof value.principalId !== "string"
    || !["tenant_owner", "tenant_admin", "operator", "auditor"].includes(String(value.role))
    || !["active", "suspended", "removed"].includes(String(value.status))
    || !isFiniteNumber(value.createdAt)
    || !isFiniteNumber(value.updatedAt)
    || !isFiniteNumber(value.revision)) {
    throw new AdministrativeStatePersistenceError("invalid membership entry in durable administrative state");
  }
}

function assertGovernanceState(value: unknown): asserts value is TenantGovernanceState {
  if (!isRecord(value)
    || typeof value.tenantId !== "string"
    || !Array.isArray(value.entitlements)
    || !Array.isArray(value.limits)
    || !isFiniteNumber(value.createdAt)
    || !isFiniteNumber(value.updatedAt)
    || !isFiniteNumber(value.revision)) {
    throw new AdministrativeStatePersistenceError("invalid governance entry in durable administrative state");
  }
  for (const entitlement of value.entitlements) {
    if (!isRecord(entitlement)
      || typeof entitlement.entitlementKey !== "string"
      || typeof entitlement.tenantId !== "string"
      || typeof entitlement.enabled !== "boolean"
      || !isFiniteNumber(entitlement.revision)) {
      throw new AdministrativeStatePersistenceError("invalid entitlement entry in durable administrative state");
    }
  }
  for (const limit of value.limits) {
    if (!isRecord(limit)
      || typeof limit.limitKey !== "string"
      || typeof limit.tenantId !== "string"
      || !isFiniteNumber(limit.value)
      || !isFiniteNumber(limit.revision)) {
      throw new AdministrativeStatePersistenceError("invalid limit entry in durable administrative state");
    }
  }
}

function assertAuditEvent(value: unknown): asserts value is AuditEvent {
  if (!isRecord(value)
    || typeof value.eventId !== "string"
    || typeof value.eventType !== "string"
    || typeof value.correlationId !== "string"
    || !isFiniteNumber(value.timestamp)) {
    throw new AdministrativeStatePersistenceError("invalid audit event in durable administrative state");
  }
}

function assertHistory<T>(
  value: unknown,
  validate: (entry: unknown) => asserts entry is T,
  label: string,
): asserts value is Record<string, readonly T[]> {
  if (!isRecord(value)) {
    throw new AdministrativeStatePersistenceError("invalid " + label + " history in durable administrative state");
  }
  for (const entries of Object.values(value)) {
    if (!Array.isArray(entries)) {
      throw new AdministrativeStatePersistenceError("invalid " + label + " history in durable administrative state");
    }
    entries.forEach(validate);
  }
}

function parseSnapshot(serialized: string): AdministrativeStateSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new AdministrativeStatePersistenceError("durable administrative state is not valid JSON");
  }
  if (!isRecord(parsed)
    || parsed.schemaVersion !== SCHEMA_VERSION
    || !Array.isArray(parsed.tenants)
    || !Array.isArray(parsed.memberships)
    || !Array.isArray(parsed.governanceStates)
    || !Array.isArray(parsed.auditEvents)) {
    throw new AdministrativeStatePersistenceError("unsupported or invalid durable administrative state schema");
  }
  parsed.tenants.forEach(assertTenant);
  parsed.memberships.forEach(assertMembership);
  parsed.governanceStates.forEach(assertGovernanceState);
  parsed.auditEvents.forEach(assertAuditEvent);
  assertHistory(parsed.tenantHistory, assertTenant, "tenant");
  assertHistory(parsed.membershipHistory, assertMembership, "membership");
  assertHistory(parsed.governanceHistory, assertGovernanceState, "governance");
  return parsed as unknown as AdministrativeStateSnapshot;
}

class AdministrativeStateFile {
  readonly #filePath: string;
  #snapshot: AdministrativeStateSnapshot;

  constructor(filePath: string) {
    this.#filePath = filePath;
    try {
      this.#snapshot = existsSync(filePath)
        ? parseSnapshot(readFileSync(filePath, "utf8"))
        : emptySnapshot();
    } catch (error) {
      if (error instanceof AdministrativeStatePersistenceError) throw error;
      throw new AdministrativeStatePersistenceError(
        "failed to load durable administrative state: " + (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  read(): AdministrativeStateSnapshot {
    return this.#snapshot;
  }

  health(): { readonly reachable: boolean; readonly adapter: string } {
    try {
      if (existsSync(this.#filePath)) parseSnapshot(readFileSync(this.#filePath, "utf8"));
      return { reachable: true, adapter: "filesystem-administrative-state" };
    } catch {
      return { reachable: false, adapter: "filesystem-administrative-state" };
    }
  }

  commit(next: AdministrativeStateSnapshot): void {
    const directory = dirname(this.#filePath);
    const temporaryPath = this.#filePath + "." + process.pid + "." + Math.random().toString(36).slice(2) + ".tmp";
    try {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      writeFileSync(temporaryPath, JSON.stringify(next, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
      renameSync(temporaryPath, this.#filePath);
      this.#snapshot = next;
    } catch (error) {
      try {
        rmSync(temporaryPath, { force: true });
      } catch {
        // Best-effort cleanup must not hide the authoritative write failure.
      }
      throw new AdministrativeStatePersistenceError(
        "failed to persist durable administrative state: " + (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}

function membershipKey(tenantId: string, principalId: string): string {
  return tenantId + "::" + principalId;
}

class FileTenantRepository implements TenantRepository {
  constructor(private readonly state: AdministrativeStateFile) {}

  create(tenant: Tenant): Tenant {
    const snapshot = this.state.read();
    if (snapshot.tenants.some((entry) => entry.tenantId === tenant.tenantId)) {
      throw new TenantAlreadyExistsError(tenant.tenantId);
    }
    this.state.commit({
      ...snapshot,
      tenants: [...snapshot.tenants, tenant],
      tenantHistory: {
        ...snapshot.tenantHistory,
        [tenant.tenantId]: [...(snapshot.tenantHistory[tenant.tenantId] ?? []), tenant],
      },
    });
    return tenant;
  }

  get(tenantId: string): Tenant {
    const tenant = this.state.read().tenants.find((entry) => entry.tenantId === tenantId);
    if (!tenant) throw new TenantNotFoundError(tenantId);
    return tenant;
  }

  list(): readonly Tenant[] {
    return [...this.state.read().tenants].sort((left, right) => left.tenantId.localeCompare(right.tenantId));
  }

  save(tenant: Tenant, expectedRevision: number): Tenant {
    const snapshot = this.state.read();
    const current = this.get(tenant.tenantId);
    if (current.revision !== expectedRevision) {
      throw new AcsError(
        "tenant revision conflict: expected " + expectedRevision + " but found " + current.revision,
        "ACS_TENANT_REVISION_CONFLICT",
      );
    }
    this.state.commit({
      ...snapshot,
      tenants: snapshot.tenants.map((entry) => entry.tenantId === tenant.tenantId ? tenant : entry),
      tenantHistory: {
        ...snapshot.tenantHistory,
        [tenant.tenantId]: [...(snapshot.tenantHistory[tenant.tenantId] ?? []), tenant],
      },
    });
    return tenant;
  }

  history(tenantId: string): readonly Tenant[] {
    return [...(this.state.read().tenantHistory[tenantId] ?? [])];
  }
}

class FileTenantMembershipRepository implements TenantMembershipRepository {
  constructor(private readonly state: AdministrativeStateFile) {}

  create(membership: TenantMembership): TenantMembership {
    const snapshot = this.state.read();
    const key = membershipKey(membership.tenantId, membership.principalId);
    if (snapshot.memberships.some((entry) => membershipKey(entry.tenantId, entry.principalId) === key)) {
      throw new TenantMembershipAlreadyExistsError(membership.tenantId, membership.principalId);
    }
    this.state.commit({
      ...snapshot,
      memberships: [...snapshot.memberships, membership],
      membershipHistory: {
        ...snapshot.membershipHistory,
        [key]: [...(snapshot.membershipHistory[key] ?? []), membership],
      },
    });
    return membership;
  }

  get(tenantId: string, principalId: string): TenantMembership {
    const membership = this.state.read().memberships.find(
      (entry) => entry.tenantId === tenantId && entry.principalId === principalId,
    );
    if (!membership) throw new TenantMembershipNotFoundError(tenantId, principalId);
    return membership;
  }

  list(): readonly TenantMembership[] {
    return [...this.state.read().memberships].sort((left, right) =>
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
    const snapshot = this.state.read();
    for (const update of updates) {
      const current = this.get(update.membership.tenantId, update.membership.principalId);
      if (current.revision !== update.expectedRevision) {
        throw new AcsError(
          "membership revision conflict: expected " + update.expectedRevision + " but found " + current.revision,
          "ACS_TENANT_MEMBERSHIP_REVISION_CONFLICT",
        );
      }
    }

    const byKey = new Map(updates.map((update) => [
      membershipKey(update.membership.tenantId, update.membership.principalId),
      update.membership,
    ]));
    const history = { ...snapshot.membershipHistory };
    for (const update of updates) {
      const key = membershipKey(update.membership.tenantId, update.membership.principalId);
      history[key] = [...(history[key] ?? []), update.membership];
    }
    this.state.commit({
      ...snapshot,
      memberships: snapshot.memberships.map((entry) => byKey.get(membershipKey(entry.tenantId, entry.principalId)) ?? entry),
      membershipHistory: history,
    });
    return updates.map((update) => update.membership);
  }

  history(tenantId: string, principalId: string): readonly TenantMembership[] {
    return [...(this.state.read().membershipHistory[membershipKey(tenantId, principalId)] ?? [])];
  }
}

class FileTenantGovernanceRepository implements TenantGovernanceRepository {
  constructor(private readonly state: AdministrativeStateFile) {}

  get(tenantId: string): TenantGovernanceState {
    const governance = this.state.read().governanceStates.find((entry) => entry.tenantId === tenantId);
    if (!governance) throw new TenantGovernanceStateNotFoundError(tenantId);
    return governance;
  }

  save(governance: TenantGovernanceState, expectedRevision: number): TenantGovernanceState {
    const snapshot = this.state.read();
    const current = snapshot.governanceStates.find((entry) => entry.tenantId === governance.tenantId);
    if (current && current.revision !== expectedRevision) {
      throw new AcsError(
        "tenant governance revision conflict: expected " + expectedRevision + " but found " + current.revision,
        "ACS_TENANT_GOVERNANCE_REVISION_CONFLICT",
      );
    }
    if (!current && expectedRevision !== 1) {
      throw new AcsError(
        "tenant governance revision conflict: expected initial revision 1 but received " + expectedRevision,
        "ACS_TENANT_GOVERNANCE_REVISION_CONFLICT",
      );
    }
    this.state.commit({
      ...snapshot,
      governanceStates: current
        ? snapshot.governanceStates.map((entry) => entry.tenantId === governance.tenantId ? governance : entry)
        : [...snapshot.governanceStates, governance],
      governanceHistory: {
        ...snapshot.governanceHistory,
        [governance.tenantId]: [...(snapshot.governanceHistory[governance.tenantId] ?? []), governance],
      },
    });
    return governance;
  }

  list(): readonly TenantGovernanceState[] {
    return [...this.state.read().governanceStates].sort((left, right) => left.tenantId.localeCompare(right.tenantId));
  }

  history(tenantId: string): readonly TenantGovernanceState[] {
    return [...(this.state.read().governanceHistory[tenantId] ?? [])];
  }
}

class FileAdministrativeAuditStore implements AuditEventStore {
  constructor(private readonly state: AdministrativeStateFile) {}

  append(event: AuditEvent): AuditEvent {
    const snapshot = this.state.read();
    this.state.commit({ ...snapshot, auditEvents: [...snapshot.auditEvents, event] });
    return event;
  }

  list(): readonly AuditEvent[] {
    return [...this.state.read().auditEvents];
  }
}

export class DurableAdministrativeState {
  readonly tenantRepository: TenantRepository;
  readonly membershipRepository: TenantMembershipRepository;
  readonly governanceRepository: TenantGovernanceRepository;
  readonly auditStore: AuditEventStore;
  readonly #file: AdministrativeStateFile;

  constructor(options: { readonly filePath: string }) {
    const file = new AdministrativeStateFile(options.filePath);
    this.#file = file;
    this.tenantRepository = new FileTenantRepository(file);
    this.membershipRepository = new FileTenantMembershipRepository(file);
    this.governanceRepository = new FileTenantGovernanceRepository(file);
    this.auditStore = new FileAdministrativeAuditStore(file);
  }

  health(): { readonly configured: true; readonly reachable: boolean; readonly productionGrade: false; readonly adapter: string } {
    const health = this.#file.health();
    return { configured: true, reachable: health.reachable, productionGrade: false, adapter: health.adapter };
  }
}
