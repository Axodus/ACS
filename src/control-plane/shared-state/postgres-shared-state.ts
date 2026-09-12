import { NativeGovernedRoleHistoryError } from "../governed-role-history.js";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Pool, type PoolClient, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";
import { AcsError, DuplicateRegistrationError, NotFoundError } from "../../errors.js";
import {
  AgentRevisionConflictError,
} from "../agent-service.js";
import type { AgentRevision } from "../unified-agent-model.js";
import type { AuditEvent } from "../audit-service.js";
import type { DeploymentRecord } from "../deployment-service.js";
import { DeploymentRevisionConflictError } from "../deployment-service.js";
import {
  TenantAlreadyExistsError,
  TenantNotFoundError,
  type Tenant,
} from "../tenant-domain.js";
import {
  TenantMembershipAlreadyExistsError,
  TenantMembershipNotFoundError,
  type TenantMembership,
  type TenantMembershipRepositoryUpdate,
} from "../tenant-membership.js";
import {
  TenantGovernanceStateNotFoundError,
  type TenantGovernanceState,
} from "../tenant-governance.js";
import type { SecretMetadata } from "../../intelligence/secret-store.js";
import {
  RuntimeStaleOwnerError,
  RuntimeStateConflictError,
  RuntimeWorkerIdentityError,
  isWorkerEligibleForRequirements,
  type DurableExecutionError,
  type DurableExecutionResult,
  type DurableJobAssignment,
  type DurableWorkerRegistration,
  type ExecutionJob,
  type ExecutionJobStatus,
  type ExecutionJobWorkload,
  type RuntimeClaim,
  type RuntimeOwnershipInput,
  type RuntimeRecoveryResult,
  type RuntimeStateEvent,
} from "../../workers/durable-runtime-state.js";
import type { WorkerCapability, WorkerEligibilityRequirements } from "../../workers/worker-types.js";
import type { TraceContext } from "../operational-telemetry.js";
import {
  AccountDisabledError,
  AccountNotFoundError,
  AccountSuspendedError,
  InvalidAcsSessionError,
  InvalidWalletIdentityError,
  type AccountIdentityStore,
  type AcsAccount,
  type AcsAuthSession,
  type ExternalIdentity,
  type SiwxNonceRecord,
  type VerifiedWalletIdentity,
} from "../account-identity.js";
import {
  RepositoryTimeoutError,
  RepositoryUnavailableError,
  RevisionConflictError,
  SharedStateSchemaMismatchError,
  TransactionFailedError,
  type AsyncAgentRepository,
  type AsyncAuditEventStore,
  type AsyncDeploymentRepository,
  type AsyncEconomicRepository,
  type AsyncRateLimitRepository,
  type AsyncRuntimeRepository,
  type AsyncSecretMetadataRepository,
  type AsyncTenantGovernanceRepository,
  type AsyncTenantMembershipRepository,
  type AsyncTenantRepository,
  type SharedAuthoritativeState,
  type SharedAuthoritativeStateSession,
  type SharedEconomicRecord,
  type SharedEconomicRecordKind,
  type SharedStateDescriptor,
  type SharedStateHealth,
} from "./contracts.js";
import {
  NativeFencingError,
  NativeIdempotencyConflictError,
  NativeWorkforceLineageIntegrityError,
  NativeWorkforceNotFoundError,
  NativeWorkforceReferenceError,
  PostgresNativeCoreRepository,
  type AsyncNativeCoreRepository,
} from "./native-core-durable.js";
import { NativeContractValidationError } from "../../native-core/primitives.js";
import {
  SHARED_STATE_MIGRATIONS,
  SHARED_STATE_SCHEMA_VERSION,
} from "./migrations.js";

type Queryable = Pick<Pool | PoolClient, "query">;

interface PayloadRow extends QueryResultRow { readonly payload: unknown; }
interface RevisionRow extends QueryResultRow { readonly revision: number; }
interface RecordRevisionRow extends QueryResultRow { readonly record_revision: number; }
interface VersionRow extends QueryResultRow { readonly version: number; }
interface CountRow extends QueryResultRow { readonly value: string | number; }
interface FencingRow extends QueryResultRow { readonly next_fencing_token: string | number; }

const CONNECTION_ERROR_CODES = new Set([
  "08000", "08001", "08003", "08004", "08006", "08007", "08P01",
  "57P01", "57P02", "57P03", "53300",
]);

function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => typeof nested === "bigint" ? nested.toString() : nested);
}

function decode<T>(payload: unknown): T {
  if (typeof payload === "string") return JSON.parse(payload) as T;
  return payload as T;
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { readonly code?: unknown }).code ?? "")
    : undefined;
}

function isTimeout(error: unknown): boolean {
  const code = errorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  return code === "57014" || code === "ETIMEDOUT" || /timeout|timed out/i.test(message);
}

function mapRepositoryError(operation: string, error: unknown): Error {
  if (error instanceof RepositoryUnavailableError
    || error instanceof RepositoryTimeoutError
    || error instanceof RevisionConflictError
    || error instanceof SharedStateSchemaMismatchError
    || error instanceof RuntimeStaleOwnerError
    || error instanceof RuntimeStateConflictError
    || error instanceof RuntimeWorkerIdentityError
    || error instanceof NativeIdempotencyConflictError
    || error instanceof NativeFencingError
    || error instanceof NativeWorkforceLineageIntegrityError
    || error instanceof NativeWorkforceNotFoundError
    || error instanceof NativeWorkforceReferenceError
    || error instanceof NativeGovernedRoleHistoryError
    || error instanceof NativeContractValidationError
    || error instanceof AcsError
    || error instanceof AgentRevisionConflictError
    || error instanceof DeploymentRevisionConflictError
    || error instanceof DuplicateRegistrationError
    || error instanceof NotFoundError) return error;
  if (isTimeout(error)) return new RepositoryTimeoutError(operation);
  if (CONNECTION_ERROR_CODES.has(errorCode(error) ?? "")) return new RepositoryUnavailableError(operation);
  return new TransactionFailedError(operation, { cause: error });
}

async function query<R extends QueryResultRow = QueryResultRow>(
  db: Queryable,
  operation: string,
  text: string,
  values: readonly unknown[] = [],
): Promise<QueryResult<R>> {
  try {
    return await db.query<R>(text, [...values]);
  } catch (error) {
    throw mapRepositoryError(operation, error);
  }
}

function changed(result: QueryResult): boolean {
  return (result.rowCount ?? 0) > 0;
}

async function currentRevision(
  db: Queryable,
  table: string,
  revisionColumn: "revision" | "record_revision",
  keyColumn: string,
  key: string,
): Promise<number | undefined> {
  const result = await query<RevisionRow & RecordRevisionRow>(
    db,
    "read current revision",
    `SELECT ${revisionColumn} FROM ${table} WHERE ${keyColumn} = $1`,
    [key],
  );
  const row = result.rows[0];
  return row ? Number(row[revisionColumn]) : undefined;
}

async function withDatabaseTransaction<T>(db: Queryable, operation: string, fn: (transaction: Queryable) => Promise<T>): Promise<T> {
  if (!(db instanceof Pool)) return fn(db);
  const client = await db.connect();
  try {
    await query(client, operation + ":begin", "BEGIN");
    const result = await fn(client);
    await query(client, operation + ":commit", "COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

class PostgresAccountIdentityStore implements AccountIdentityStore {
  readonly descriptor = {
    adapter: "postgres-shared-account-identity",
    productionOriented: true,
    durability: "shared_durable",
    multiInstance: "shared_database",
  } as const;

  constructor(private readonly db: Queryable) {}

  async resolveOrCreateVerifiedIdentity(input: {
    readonly identity: VerifiedWalletIdentity;
    readonly accountId: string;
    readonly identityId: string;
  }): Promise<{ readonly account: AcsAccount; readonly identity: ExternalIdentity; readonly created: boolean }> {
    return this.#resolveOrCreateVerifiedIdentity(input, true);
  }

  async #resolveOrCreateVerifiedIdentity(input: {
    readonly identity: VerifiedWalletIdentity;
    readonly accountId: string;
    readonly identityId: string;
  }, retryOnConflict: boolean): Promise<{ readonly account: AcsAccount; readonly identity: ExternalIdentity; readonly created: boolean }> {
    try {
      return await withDatabaseTransaction(this.db, "resolve account identity", async (db) => {
        const existingResult = await query<PayloadRow>(db, "find external identity", `
          SELECT payload FROM acs_external_identities
          WHERE provider = $1 AND namespace = $2 AND subject = $3
          FOR UPDATE
        `, [input.identity.provider, input.identity.namespace, input.identity.providerSubject]);
        const existing = existingResult.rows[0] ? decode<ExternalIdentity>(existingResult.rows[0].payload) : undefined;
        if (existing) {
          const accountResult = await query<PayloadRow>(db, "get account for identity", "SELECT payload FROM acs_accounts WHERE account_id = $1 FOR UPDATE", [existing.accountId]);
          if (!accountResult.rows[0]) throw new AccountNotFoundError(existing.accountId);
          const account = decode<AcsAccount>(accountResult.rows[0].payload);
          if (account.status === "suspended") throw new AccountSuspendedError(account.accountId);
          if (account.status === "disabled") throw new AccountDisabledError(account.accountId);
          const nextIdentity: ExternalIdentity = {
            ...existing,
            caip10: input.identity.caip10,
            verifiedAt: input.identity.verifiedAt,
            lastAuthenticatedAt: input.identity.verifiedAt,
          };
          const nextAccount: AcsAccount = {
            ...account,
            updatedAt: input.identity.verifiedAt,
            lastAuthenticatedAt: input.identity.verifiedAt,
          };
          await query(db, "update external identity", `
            UPDATE acs_external_identities SET payload = $2::jsonb, updated_at = clock_timestamp()
            WHERE identity_id = $1
          `, [existing.identityId, serialize(nextIdentity)]);
          await query(db, "update authenticated account", `
            UPDATE acs_accounts SET status = $2, payload = $3::jsonb, updated_at = clock_timestamp()
            WHERE account_id = $1
          `, [nextAccount.accountId, nextAccount.status, serialize(nextAccount)]);
          return { account: nextAccount, identity: nextIdentity, created: false };
        }

        const account: AcsAccount = {
          accountId: input.accountId,
          status: "active",
          createdAt: input.identity.verifiedAt,
          updatedAt: input.identity.verifiedAt,
          lastAuthenticatedAt: input.identity.verifiedAt,
        };
        const identity: ExternalIdentity = {
          identityId: input.identityId,
          accountId: input.accountId,
          provider: input.identity.provider,
          identityType: "wallet",
          namespace: input.identity.namespace,
          subject: input.identity.providerSubject,
          normalizedAddress: input.identity.normalizedAddress,
          caip10: input.identity.caip10,
          verificationState: "verified",
          verifiedAt: input.identity.verifiedAt,
          lastAuthenticatedAt: input.identity.verifiedAt,
        };
        await query(db, "create account", `
          INSERT INTO acs_accounts (account_id, status, payload) VALUES ($1, $2, $3::jsonb)
        `, [account.accountId, account.status, serialize(account)]);
        await query(db, "create external identity", `
          INSERT INTO acs_external_identities (identity_id, account_id, provider, namespace, subject, payload)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        `, [identity.identityId, identity.accountId, identity.provider, identity.namespace, identity.subject, serialize(identity)]);
        return { account, identity, created: true };
      });
    } catch (error) {
      const nestedCode = errorCode((error as { readonly cause?: unknown }).cause ?? error);
      if (retryOnConflict && nestedCode === "23505") return this.#resolveOrCreateVerifiedIdentity(input, false);
      throw error;
    }
  }

  async getAccount(accountId: string): Promise<AcsAccount | undefined> {
    const result = await query<PayloadRow>(this.db, "get account", "SELECT payload FROM acs_accounts WHERE account_id = $1", [accountId]);
    return result.rows[0] ? decode<AcsAccount>(result.rows[0].payload) : undefined;
  }

  async saveAccount(account: AcsAccount): Promise<AcsAccount> {
    const result = await query(this.db, "save account", `
      UPDATE acs_accounts SET status = $2, payload = $3::jsonb, updated_at = clock_timestamp()
      WHERE account_id = $1
    `, [account.accountId, account.status, serialize(account)]);
    if (!changed(result)) throw new AccountNotFoundError(account.accountId);
    return account;
  }

  async getIdentity(identityId: string): Promise<ExternalIdentity | undefined> {
    const result = await query<PayloadRow>(this.db, "get external identity", "SELECT payload FROM acs_external_identities WHERE identity_id = $1", [identityId]);
    return result.rows[0] ? decode<ExternalIdentity>(result.rows[0].payload) : undefined;
  }

  async createSession(session: AcsAuthSession): Promise<AcsAuthSession> {
    try {
      await query(this.db, "create ACS auth session", `
        INSERT INTO acs_auth_sessions
          (session_id, account_id, identity_id, provider_session_id, token_digest, expires_at, payload)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `, [session.sessionId, session.accountId, session.identityId, session.providerSessionId, session.tokenDigest, new Date(session.expiresAt), serialize(session)]);
      return session;
    } catch (error) {
      if (errorCode((error as { readonly cause?: unknown }).cause ?? error) === "23505") {
        throw new InvalidAcsSessionError("session identity already exists");
      }
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<AcsAuthSession | undefined> {
    const result = await query<PayloadRow>(this.db, "get ACS auth session", "SELECT payload FROM acs_auth_sessions WHERE session_id = $1", [sessionId]);
    return result.rows[0] ? decode<AcsAuthSession>(result.rows[0].payload) : undefined;
  }

  async saveSession(session: AcsAuthSession): Promise<AcsAuthSession> {
    const result = await query(this.db, "save ACS auth session", `
      UPDATE acs_auth_sessions
      SET revoked_at = $2, last_seen_at = $3, payload = $4::jsonb, updated_at = clock_timestamp()
      WHERE session_id = $1
    `, [
      session.sessionId,
      session.revokedAt === undefined ? null : new Date(session.revokedAt),
      session.lastSeenAt === undefined ? null : new Date(session.lastSeenAt),
      serialize(session),
    ]);
    if (!changed(result)) throw new InvalidAcsSessionError("session not found");
    return session;
  }

  async revokeSessionsByProviderSessionId(providerSessionId: string, revokedAt: number): Promise<number> {
    const result = await query(this.db, "revoke provider ACS sessions", `
      UPDATE acs_auth_sessions
      SET revoked_at = $2,
          payload = jsonb_set(payload, '{revokedAt}', to_jsonb($3::bigint), true),
          updated_at = clock_timestamp()
      WHERE provider_session_id = $1 AND revoked_at IS NULL
    `, [providerSessionId, new Date(revokedAt), revokedAt]);
    return result.rowCount ?? 0;
  }

  async createNonce(record: SiwxNonceRecord): Promise<SiwxNonceRecord> {
    await query(this.db, "create SIWX nonce", `
      INSERT INTO acs_siwx_nonces (nonce_digest, expires_at, payload)
      VALUES ($1, $2, $3::jsonb)
    `, [record.nonceDigest, new Date(record.expiresAt), serialize(record)]);
    return record;
  }

  async consumeNonce(nonceDigest: string, consumedAt: number): Promise<boolean> {
    const result = await query(this.db, "consume SIWX nonce", `
      UPDATE acs_siwx_nonces
      SET consumed_at = $2, payload = jsonb_set(payload, '{consumedAt}', to_jsonb($3::bigint), true)
      WHERE nonce_digest = $1 AND consumed_at IS NULL AND expires_at > $2
    `, [nonceDigest, new Date(consumedAt), consumedAt]);
    return changed(result);
  }
}

class PostgresTenantRepository implements AsyncTenantRepository {
  constructor(private readonly db: Queryable) {}

  async create(tenant: Tenant): Promise<Tenant> {
    try {
      await query(this.db, "create tenant", `
        WITH inserted AS (
          INSERT INTO acs_tenants (tenant_id, revision, payload)
          VALUES ($1, $2, $3::jsonb)
          RETURNING tenant_id
        )
        INSERT INTO acs_tenant_history (tenant_id, revision, payload)
        SELECT $1, $2, $3::jsonb FROM inserted
      `, [tenant.tenantId, tenant.revision, serialize(tenant)]);
      return tenant;
    } catch (error) {
      if (errorCode((error as { cause?: unknown }).cause ?? error) === "23505") {
        throw new TenantAlreadyExistsError(tenant.tenantId);
      }
      throw error;
    }
  }

  async get(tenantId: string): Promise<Tenant> {
    const result = await query<PayloadRow>(this.db, "get tenant", "SELECT payload FROM acs_tenants WHERE tenant_id = $1", [tenantId]);
    if (!result.rows[0]) throw new TenantNotFoundError(tenantId);
    return decode<Tenant>(result.rows[0].payload);
  }

  async list(): Promise<readonly Tenant[]> {
    const result = await query<PayloadRow>(this.db, "list tenants", "SELECT payload FROM acs_tenants ORDER BY tenant_id");
    return result.rows.map((row) => decode<Tenant>(row.payload));
  }

  async save(tenant: Tenant, expectedRevision: number): Promise<Tenant> {
    const result = await query(this.db, "save tenant", `
      WITH updated AS (
        UPDATE acs_tenants
        SET revision = $2, payload = $3::jsonb, updated_at = clock_timestamp()
        WHERE tenant_id = $1 AND revision = $4
        RETURNING tenant_id
      )
      INSERT INTO acs_tenant_history (tenant_id, revision, payload)
      SELECT $1, $2, $3::jsonb FROM updated
    `, [tenant.tenantId, tenant.revision, serialize(tenant), expectedRevision]);
    if (!changed(result)) {
      throw new RevisionConflictError(
        `tenant:${tenant.tenantId}`,
        expectedRevision,
        await currentRevision(this.db, "acs_tenants", "revision", "tenant_id", tenant.tenantId),
      );
    }
    return tenant;
  }

  async history(tenantId: string): Promise<readonly Tenant[]> {
    const result = await query<PayloadRow>(this.db, "tenant history", "SELECT payload FROM acs_tenant_history WHERE tenant_id = $1 ORDER BY revision", [tenantId]);
    return result.rows.map((row) => decode<Tenant>(row.payload));
  }
}

class PostgresMembershipRepository implements AsyncTenantMembershipRepository {
  constructor(private readonly db: Queryable) {}

  async create(membership: TenantMembership): Promise<TenantMembership> {
    try {
      await query(this.db, "create membership", `
        WITH inserted AS (
          INSERT INTO acs_memberships (tenant_id, principal_id, revision, role, status, payload)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
          RETURNING tenant_id
        )
        INSERT INTO acs_membership_history (tenant_id, principal_id, revision, payload)
        SELECT $1, $2, $3, $6::jsonb FROM inserted
      `, [membership.tenantId, membership.principalId, membership.revision, membership.role, membership.status, serialize(membership)]);
      return membership;
    } catch (error) {
      if (errorCode((error as { cause?: unknown }).cause ?? error) === "23505") {
        throw new TenantMembershipAlreadyExistsError(membership.tenantId, membership.principalId);
      }
      throw error;
    }
  }

  async get(tenantId: string, principalId: string): Promise<TenantMembership> {
    const result = await query<PayloadRow>(this.db, "get membership", "SELECT payload FROM acs_memberships WHERE tenant_id = $1 AND principal_id = $2", [tenantId, principalId]);
    if (!result.rows[0]) throw new TenantMembershipNotFoundError(tenantId, principalId);
    return decode<TenantMembership>(result.rows[0].payload);
  }

  async list(): Promise<readonly TenantMembership[]> {
    const result = await query<PayloadRow>(this.db, "list memberships", "SELECT payload FROM acs_memberships ORDER BY tenant_id, principal_id");
    return result.rows.map((row) => decode<TenantMembership>(row.payload));
  }

  async listByTenant(tenantId: string): Promise<readonly TenantMembership[]> {
    const result = await query<PayloadRow>(this.db, "list tenant memberships", "SELECT payload FROM acs_memberships WHERE tenant_id = $1 ORDER BY principal_id", [tenantId]);
    return result.rows.map((row) => decode<TenantMembership>(row.payload));
  }

  async save(membership: TenantMembership, expectedRevision: number): Promise<TenantMembership> {
    return (await this.saveMany([{ membership, expectedRevision }]))[0]!;
  }

  async saveMany(updates: readonly TenantMembershipRepositoryUpdate[]): Promise<readonly TenantMembership[]> {
    const ordered = [...updates].sort((left, right) => {
      const leftPromotesOwner = left.membership.role === "tenant_owner" && left.membership.status === "active";
      const rightPromotesOwner = right.membership.role === "tenant_owner" && right.membership.status === "active";
      return Number(leftPromotesOwner) - Number(rightPromotesOwner);
    });
    for (const update of ordered) {
      const result = await query(this.db, "save membership", `
        WITH updated AS (
          UPDATE acs_memberships
          SET revision = $3, role = $4, status = $5, payload = $6::jsonb, updated_at = clock_timestamp()
          WHERE tenant_id = $1 AND principal_id = $2 AND revision = $7
          RETURNING tenant_id
        )
        INSERT INTO acs_membership_history (tenant_id, principal_id, revision, payload)
        SELECT $1, $2, $3, $6::jsonb FROM updated
      `, [
        update.membership.tenantId,
        update.membership.principalId,
        update.membership.revision,
        update.membership.role,
        update.membership.status,
        serialize(update.membership),
        update.expectedRevision,
      ]);
      if (!changed(result)) {
        const current = await query<RevisionRow>(this.db, "read membership revision", "SELECT revision FROM acs_memberships WHERE tenant_id = $1 AND principal_id = $2", [update.membership.tenantId, update.membership.principalId]);
        throw new RevisionConflictError(
          `membership:${update.membership.tenantId}/${update.membership.principalId}`,
          update.expectedRevision,
          current.rows[0]?.revision,
        );
      }
    }
    return updates.map((update) => update.membership);
  }

  async history(tenantId: string, principalId: string): Promise<readonly TenantMembership[]> {
    const result = await query<PayloadRow>(this.db, "membership history", "SELECT payload FROM acs_membership_history WHERE tenant_id = $1 AND principal_id = $2 ORDER BY revision", [tenantId, principalId]);
    return result.rows.map((row) => decode<TenantMembership>(row.payload));
  }
}

class PostgresGovernanceRepository implements AsyncTenantGovernanceRepository {
  constructor(private readonly db: Queryable) {}

  async get(tenantId: string): Promise<TenantGovernanceState> {
    const result = await query<PayloadRow>(this.db, "get governance", "SELECT payload FROM acs_governance WHERE tenant_id = $1", [tenantId]);
    if (!result.rows[0]) throw new TenantGovernanceStateNotFoundError(tenantId);
    return decode<TenantGovernanceState>(result.rows[0].payload);
  }

  async save(state: TenantGovernanceState, expectedRevision: number): Promise<TenantGovernanceState> {
    const result = await query(this.db, "save governance", `
      WITH changed AS (
        INSERT INTO acs_governance (tenant_id, revision, payload)
        SELECT $1, $2, $3::jsonb
        WHERE $4 = 1
        ON CONFLICT (tenant_id) DO UPDATE
          SET revision = EXCLUDED.revision, payload = EXCLUDED.payload, updated_at = clock_timestamp()
          WHERE acs_governance.revision = $4
        RETURNING tenant_id
      )
      INSERT INTO acs_governance_history (tenant_id, revision, payload)
      SELECT $1, $2, $3::jsonb FROM changed
    `, [state.tenantId, state.revision, serialize(state), expectedRevision]);
    if (!changed(result)) {
      throw new RevisionConflictError(
        `governance:${state.tenantId}`,
        expectedRevision,
        await currentRevision(this.db, "acs_governance", "revision", "tenant_id", state.tenantId),
      );
    }
    return state;
  }

  async list(): Promise<readonly TenantGovernanceState[]> {
    const result = await query<PayloadRow>(this.db, "list governance", "SELECT payload FROM acs_governance ORDER BY tenant_id");
    return result.rows.map((row) => decode<TenantGovernanceState>(row.payload));
  }

  async history(tenantId: string): Promise<readonly TenantGovernanceState[]> {
    const result = await query<PayloadRow>(this.db, "governance history", "SELECT payload FROM acs_governance_history WHERE tenant_id = $1 ORDER BY revision", [tenantId]);
    return result.rows.map((row) => decode<TenantGovernanceState>(row.payload));
  }
}

class PostgresAuditStore implements AsyncAuditEventStore {
  constructor(private readonly db: Queryable) {}

  async append(event: AuditEvent): Promise<AuditEvent> {
    await query(this.db, "append audit event", `
      INSERT INTO acs_audit_events (
        event_id, tenant_id, correlation_id, event_type, actor, occurred_at, payload
      ) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7::jsonb)
      ON CONFLICT (event_id) DO NOTHING
    `, [event.eventId, event.tenantId ?? null, event.correlationId, event.eventType, event.actor ?? null, event.timestamp, serialize(event)]);
    return event;
  }

  async list(filter: { readonly tenantId?: string; readonly correlationId?: string } = {}): Promise<readonly AuditEvent[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (filter.tenantId) { values.push(filter.tenantId); clauses.push(`tenant_id = $${values.length}`); }
    if (filter.correlationId) { values.push(filter.correlationId); clauses.push(`correlation_id = $${values.length}`); }
    const result = await query<PayloadRow>(this.db, "list audit events", `SELECT payload FROM acs_audit_events${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY sequence`, values);
    return result.rows.map((row) => decode<AuditEvent>(row.payload));
  }
}

class PostgresAgentRepository implements AsyncAgentRepository {
  constructor(private readonly db: Queryable) {}

  async create(revision: AgentRevision): Promise<AgentRevision> {
    try {
      await query(this.db, "create agent", `
        WITH inserted AS (
          INSERT INTO acs_agents (agent_id, revision, tenant_id, payload)
          VALUES ($1, $2, $3, $4::jsonb)
          RETURNING agent_id
        )
        INSERT INTO acs_agent_history (agent_id, revision, payload)
        SELECT $1, $2, $4::jsonb FROM inserted
      `, [revision.agentId, revision.revision, null, serialize(revision)]);
      return revision;
    } catch (error) {
      if (errorCode((error as { cause?: unknown }).cause ?? error) === "23505") {
        throw new AgentRevisionConflictError("agent already exists");
      }
      throw error;
    }
  }

  async get(agentId: string): Promise<AgentRevision> {
    const result = await query<PayloadRow>(this.db, "get agent", "SELECT payload FROM acs_agents WHERE agent_id = $1 AND record_kind = 'legacy'", [agentId]);
    if (!result.rows[0]) throw new NotFoundError("agent", agentId);
    return decode<AgentRevision>(result.rows[0].payload);
  }

  async list(): Promise<readonly AgentRevision[]> {
    const result = await query<PayloadRow>(this.db, "list agents", "SELECT payload FROM acs_agents WHERE record_kind = 'legacy' ORDER BY agent_id");
    return result.rows.map((row) => decode<AgentRevision>(row.payload));
  }

  async save(revision: AgentRevision, expectedRevision: number): Promise<AgentRevision> {
    const result = await query(this.db, "save agent", `
      WITH updated AS (
        UPDATE acs_agents SET revision = $2, payload = $3::jsonb, updated_at = clock_timestamp()
        WHERE agent_id = $1 AND record_kind = 'legacy' AND revision = $4 RETURNING agent_id
      )
      INSERT INTO acs_agent_history (agent_id, revision, payload)
      SELECT $1, $2, $3::jsonb FROM updated
    `, [revision.agentId, revision.revision, serialize(revision), expectedRevision]);
    if (!changed(result)) {
      throw new RevisionConflictError(
        `agent:${revision.agentId}`,
        expectedRevision,
        await currentRevision(this.db, "acs_agents", "revision", "agent_id", revision.agentId),
      );
    }
    return revision;
  }

  async history(agentId: string): Promise<readonly AgentRevision[]> {
    const result = await query<PayloadRow>(this.db, "agent history", "SELECT payload FROM acs_agent_history WHERE agent_id = $1 AND record_kind = 'legacy' ORDER BY revision", [agentId]);
    return result.rows.map((row) => decode<AgentRevision>(row.payload));
  }

  async remove(agentId: string, expectedRevision: number): Promise<AgentRevision> {
    const existing = await this.get(agentId);
    const result = await query(this.db, "remove agent", "DELETE FROM acs_agents WHERE agent_id = $1 AND record_kind = 'legacy' AND revision = $2", [agentId, expectedRevision]);
    if (!changed(result)) throw new RevisionConflictError(`agent:${agentId}`, expectedRevision);
    return existing;
  }
}

class PostgresDeploymentRepository implements AsyncDeploymentRepository {
  constructor(private readonly db: Queryable) {}

  async create(record: DeploymentRecord): Promise<DeploymentRecord> {
    try {
      await query(this.db, "create deployment", `
        WITH inserted AS (
          INSERT INTO acs_deployments (
            deployment_id, record_revision, tenant_id, status, predecessor_deployment_id, payload
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
          RETURNING deployment_id
        )
        INSERT INTO acs_deployment_history (deployment_id, record_revision, payload)
        SELECT $1, $2, $6::jsonb FROM inserted
      `, [record.deploymentId, record.recordRevision, record.scope?.tenantId ?? null, record.status, record.predecessorDeploymentId ?? null, serialize(record)]);
      return record;
    } catch (error) {
      if (errorCode((error as { cause?: unknown }).cause ?? error) === "23505") {
        throw new DeploymentRevisionConflictError("deployment already exists");
      }
      throw error;
    }
  }

  async get(deploymentId: string): Promise<DeploymentRecord | undefined> {
    const result = await query<PayloadRow>(this.db, "get deployment", "SELECT payload FROM acs_deployments WHERE deployment_id = $1", [deploymentId]);
    return result.rows[0] ? decode<DeploymentRecord>(result.rows[0].payload) : undefined;
  }

  async list(): Promise<readonly DeploymentRecord[]> {
    const result = await query<PayloadRow>(this.db, "list deployments", "SELECT payload FROM acs_deployments ORDER BY deployment_id");
    return result.rows.map((row) => decode<DeploymentRecord>(row.payload));
  }

  async save(record: DeploymentRecord, expectedRecordRevision: number): Promise<DeploymentRecord> {
    const result = await query(this.db, "save deployment", `
      WITH updated AS (
        UPDATE acs_deployments
        SET record_revision = $2, tenant_id = $3, status = $4,
            predecessor_deployment_id = $5, payload = $6::jsonb, updated_at = clock_timestamp()
        WHERE deployment_id = $1 AND record_revision = $7
        RETURNING deployment_id
      )
      INSERT INTO acs_deployment_history (deployment_id, record_revision, payload)
      SELECT $1, $2, $6::jsonb FROM updated
    `, [record.deploymentId, record.recordRevision, record.scope?.tenantId ?? null, record.status, record.predecessorDeploymentId ?? null, serialize(record), expectedRecordRevision]);
    if (!changed(result)) {
      throw new RevisionConflictError(
        `deployment:${record.deploymentId}`,
        expectedRecordRevision,
        await currentRevision(this.db, "acs_deployments", "record_revision", "deployment_id", record.deploymentId),
      );
    }
    return record;
  }
}

class PostgresSecretMetadataRepository implements AsyncSecretMetadataRepository {
  constructor(private readonly db: Queryable) {}

  async create(metadata: SecretMetadata): Promise<SecretMetadata> {
    try {
      await query(this.db, "create secret metadata", `
        INSERT INTO acs_secret_metadata (secret_id, tenant_id, version, status, payload)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `, [metadata.secretId, metadata.tenantId ?? null, metadata.version, metadata.status, serialize(metadata)]);
      return metadata;
    } catch (error) {
      if (errorCode((error as { cause?: unknown }).cause ?? error) === "23505") {
        throw new DuplicateRegistrationError("secret-metadata", metadata.secretId);
      }
      throw error;
    }
  }

  async get(secretId: string): Promise<SecretMetadata | undefined> {
    const result = await query<PayloadRow>(this.db, "get secret metadata", "SELECT payload FROM acs_secret_metadata WHERE secret_id = $1", [secretId]);
    return result.rows[0] ? decode<SecretMetadata>(result.rows[0].payload) : undefined;
  }

  async list(tenantId?: string): Promise<readonly SecretMetadata[]> {
    const result = await query<PayloadRow>(this.db, "list secret metadata", `SELECT payload FROM acs_secret_metadata${tenantId ? " WHERE tenant_id = $1" : ""} ORDER BY secret_id`, tenantId ? [tenantId] : []);
    return result.rows.map((row) => decode<SecretMetadata>(row.payload));
  }

  async save(metadata: SecretMetadata, expectedVersion: number): Promise<SecretMetadata> {
    const result = await query(this.db, "save secret metadata", `
      UPDATE acs_secret_metadata
      SET tenant_id = $2, version = $3, status = $4, payload = $5::jsonb, updated_at = clock_timestamp()
      WHERE secret_id = $1 AND version = $6
    `, [metadata.secretId, metadata.tenantId ?? null, metadata.version, metadata.status, serialize(metadata), expectedVersion]);
    if (!changed(result)) {
      const current = await query<VersionRow>(this.db, "read secret metadata version", "SELECT version FROM acs_secret_metadata WHERE secret_id = $1", [metadata.secretId]);
      throw new RevisionConflictError(
        `secret-metadata:${metadata.secretId}`,
        expectedVersion,
        current.rows[0]?.version,
      );
    }
    return metadata;
  }
}

class PostgresEconomicRepository implements AsyncEconomicRepository {
  constructor(private readonly db: Queryable) {}

  async get<T = unknown>(kind: SharedEconomicRecordKind, recordId: string): Promise<SharedEconomicRecord<T> | undefined> {
    const result = await query<PayloadRow>(this.db, "get economic record", "SELECT payload FROM acs_economic_records WHERE kind = $1 AND record_id = $2", [kind, recordId]);
    return result.rows[0] ? decode<SharedEconomicRecord<T>>(result.rows[0].payload) : undefined;
  }

  async list<T = unknown>(kind: SharedEconomicRecordKind, tenantId?: string): Promise<readonly SharedEconomicRecord<T>[]> {
    const result = await query<PayloadRow>(this.db, "list economic records", `SELECT payload FROM acs_economic_records WHERE kind = $1${tenantId ? " AND tenant_id = $2" : ""} ORDER BY record_id`, tenantId ? [kind, tenantId] : [kind]);
    return result.rows.map((row) => decode<SharedEconomicRecord<T>>(row.payload));
  }

  async save<T = unknown>(record: SharedEconomicRecord<T>, expectedRevision?: number): Promise<SharedEconomicRecord<T>> {
    if (expectedRevision === undefined) {
      const inserted = await query(this.db, "create economic record", `
        INSERT INTO acs_economic_records (kind, record_id, tenant_id, idempotency_key, revision, payload)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        ON CONFLICT DO NOTHING
        RETURNING record_id
      `, [record.kind, record.recordId, record.tenantId ?? null, record.idempotencyKey ?? null, record.revision, serialize(record)]);
      if (changed(inserted)) return record;
      const existing = record.idempotencyKey
        ? await this.findByIdempotency(record)
        : await this.get(record.kind, record.recordId);
      if (existing && isDeepStrictEqual(existing, record)) return record;
      throw new AcsError("economic idempotency conflict", "ACS_ECONOMIC_IDEMPOTENCY_CONFLICT");
    }
    const result = await query(this.db, "save economic record", `
      UPDATE acs_economic_records
      SET tenant_id = $3, idempotency_key = $4, revision = $5, payload = $6::jsonb, updated_at = clock_timestamp()
      WHERE kind = $1 AND record_id = $2 AND revision = $7
    `, [record.kind, record.recordId, record.tenantId ?? null, record.idempotencyKey ?? null, record.revision, serialize(record), expectedRevision]);
    if (!changed(result)) throw new RevisionConflictError(`economic:${record.kind}/${record.recordId}`, expectedRevision);
    return record;
  }

  async commitSettlement(input: {
    readonly settlement: SharedEconomicRecord;
    readonly reservation: SharedEconomicRecord;
    readonly receipt: SharedEconomicRecord;
  }): Promise<{ readonly settlement: SharedEconomicRecord; readonly reservation: SharedEconomicRecord; readonly receipt: SharedEconomicRecord }> {
    const existing = input.settlement.idempotencyKey ? await this.findByIdempotency(input.settlement) : undefined;
    if (existing) {
      if (existing.recordId !== input.settlement.recordId) {
        throw new AcsError("economic idempotency conflict", "ACS_ECONOMIC_IDEMPOTENCY_CONFLICT");
      }
      const receipt = await this.get("receipt", input.receipt.recordId);
      const reservation = await this.get("reservation", input.reservation.recordId);
      if (!receipt || !reservation) throw new TransactionFailedError("read committed settlement");
      return { settlement: existing, reservation, receipt };
    }
    await this.save(input.settlement);
    const concurrentlyCommittedReceipt = await this.get("receipt", input.receipt.recordId);
    const concurrentlyCommittedReservation = await this.get("reservation", input.reservation.recordId);
    if (concurrentlyCommittedReceipt
      && concurrentlyCommittedReservation
      && isDeepStrictEqual(concurrentlyCommittedReceipt, input.receipt)
      && isDeepStrictEqual(concurrentlyCommittedReservation, input.reservation)) {
      return {
        settlement: input.settlement,
        reservation: concurrentlyCommittedReservation,
        receipt: concurrentlyCommittedReceipt,
      };
    }
    await this.save(input.reservation, input.reservation.revision - 1);
    await this.save(input.receipt);
    return input;
  }

  private async findByIdempotency(record: SharedEconomicRecord): Promise<SharedEconomicRecord | undefined> {
    if (!record.idempotencyKey) return undefined;
    const result = await query<PayloadRow>(this.db, "find economic idempotency record", `
      SELECT payload FROM acs_economic_records
      WHERE kind = $1 AND COALESCE(tenant_id, '') = COALESCE($2, '') AND idempotency_key = $3
    `, [record.kind, record.tenantId ?? null, record.idempotencyKey]);
    return result.rows[0] ? decode<SharedEconomicRecord>(result.rows[0].payload) : undefined;
  }
}

function asMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(String(value)).getTime();
}

function terminal(status: ExecutionJobStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled";
}

class PostgresRuntimeRepository implements AsyncRuntimeRepository {
  constructor(private readonly db: Queryable) {}

  async createJob(input: {
    readonly jobId?: string;
    readonly tenantId: string;
    readonly runtimeInstanceId: string;
    readonly workload: ExecutionJobWorkload;
    readonly requirements: WorkerEligibilityRequirements;
    readonly correlationId: string;
    readonly idempotencyKey?: string;
    readonly maxAttempts?: number;
    readonly createdAt?: number;
    readonly traceContext?: TraceContext;
  }): Promise<ExecutionJob> {
    if (input.idempotencyKey) {
      const existingResult = await query<PayloadRow>(this.db, "find runtime job by idempotency", "SELECT payload FROM acs_runtime_jobs WHERE tenant_id = $1 AND idempotency_key = $2", [input.tenantId, input.idempotencyKey]);
      if (existingResult.rows[0]) {
        const existing = decode<ExecutionJob>(existingResult.rows[0].payload);
        if (existing.runtimeInstanceId !== input.runtimeInstanceId || serialize(existing.workload) !== serialize(input.workload)) {
          throw new RuntimeStateConflictError("runtime idempotency key was reused for a different job");
        }
        return existing;
      }
    }
    const createdAt = await this.databaseTime(input.createdAt);
    const job: ExecutionJob = {
      jobId: input.jobId ?? `job_${randomUUID()}`,
      tenantId: input.tenantId,
      runtimeInstanceId: input.runtimeInstanceId,
      deploymentId: input.workload.deploymentId,
      ...(input.workload.agentId ? { agentId: input.workload.agentId } : {}),
      workloadType: input.workload.type,
      workload: input.workload,
      requirements: input.requirements,
      status: "queued",
      createdAt,
      updatedAt: createdAt,
      revision: 1,
      attempt: 0,
      maxAttempts: input.maxAttempts ?? 3,
      correlationId: input.correlationId,
      ...(input.traceContext ? { traceContext: input.traceContext } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    };
    await query(this.db, "create runtime job", `
      INSERT INTO acs_runtime_jobs (
        job_id, tenant_id, status, revision, attempt, max_attempts, correlation_id,
        idempotency_key, created_at, updated_at, payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0), to_timestamp($10 / 1000.0), $11::jsonb)
    `, [job.jobId, job.tenantId, job.status, job.revision, job.attempt, job.maxAttempts, job.correlationId, job.idempotencyKey ?? null, job.createdAt, job.updatedAt, serialize(job)]);
    await this.appendEvent({
      eventId: `rte_${randomUUID()}`,
      tenantId: job.tenantId,
      jobId: job.jobId,
      category: "runtime.job.queued",
      outcome: "succeeded",
      correlationId: job.correlationId,
      timestamp: createdAt,
      revision: job.revision,
      metadata: { workloadType: job.workloadType },
    });
    return job;
  }

  async getJob(jobId: string): Promise<ExecutionJob | undefined> {
    const result = await query<PayloadRow>(this.db, "get runtime job", "SELECT payload FROM acs_runtime_jobs WHERE job_id = $1", [jobId]);
    return result.rows[0] ? decode<ExecutionJob>(result.rows[0].payload) : undefined;
  }

  async listJobs(filter: { readonly tenantId?: string; readonly status?: ExecutionJobStatus } = {}): Promise<readonly ExecutionJob[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (filter.tenantId) { values.push(filter.tenantId); clauses.push(`tenant_id = $${values.length}`); }
    if (filter.status) { values.push(filter.status); clauses.push(`status = $${values.length}`); }
    const result = await query<PayloadRow>(this.db, "list runtime jobs", `SELECT payload FROM acs_runtime_jobs${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at, job_id`, values);
    return result.rows.map((row) => decode<ExecutionJob>(row.payload));
  }

  async registerWorker(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly name: string;
    readonly version: string;
    readonly capabilities: WorkerCapability;
    readonly registeredAt?: number;
  }): Promise<DurableWorkerRegistration> {
    const existing = await this.getWorker(input.workerId);
    if (existing && existing.servicePrincipalId !== input.servicePrincipalId) {
      throw new RuntimeWorkerIdentityError(input.workerId, input.instanceId);
    }
    if (existing && existing.instanceId !== input.instanceId && existing.status !== "offline") {
      throw new RuntimeStateConflictError("worker already has a live instance");
    }
    const at = await this.databaseTime(input.registeredAt);
    const worker: DurableWorkerRegistration = {
      workerId: input.workerId,
      instanceId: input.instanceId,
      servicePrincipalId: input.servicePrincipalId,
      name: input.name,
      version: input.version,
      capabilities: input.capabilities,
      status: "registered",
      registeredAt: existing?.registeredAt ?? at,
      revision: (existing?.revision ?? 0) + 1,
      activeRuns: existing?.instanceId === input.instanceId ? existing.activeRuns : 0,
    };
    await query(this.db, "register runtime worker", `
      INSERT INTO acs_runtime_workers (
        worker_id, instance_id, service_principal_id, status, expires_at, revision, active_runs, payload
      ) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7::jsonb)
      ON CONFLICT (worker_id) DO UPDATE SET
        instance_id = EXCLUDED.instance_id,
        service_principal_id = EXCLUDED.service_principal_id,
        status = EXCLUDED.status,
        expires_at = EXCLUDED.expires_at,
        revision = EXCLUDED.revision,
        active_runs = EXCLUDED.active_runs,
        payload = EXCLUDED.payload
    `, [worker.workerId, worker.instanceId, worker.servicePrincipalId, worker.status, worker.revision, worker.activeRuns, serialize(worker)]);
    return worker;
  }

  async heartbeat(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly status?: "available" | "busy" | "draining";
    readonly capabilities?: WorkerCapability;
    readonly at?: number;
    readonly staleAfterMs: number;
  }): Promise<DurableWorkerRegistration> {
    const worker = await this.requireWorkerIdentity(input.workerId, input.instanceId, input.servicePrincipalId, true);
    const at = await this.databaseTime(input.at);
    const status = input.status ?? (worker.activeRuns >= worker.capabilities.maxConcurrentRuns ? "busy" : "available");
    const updated: DurableWorkerRegistration = {
      ...worker,
      status,
      capabilities: input.capabilities ?? worker.capabilities,
      lastHeartbeatAt: at,
      expiresAt: at + input.staleAfterMs,
      revision: worker.revision + 1,
    };
    const result = await query(this.db, "runtime worker heartbeat", `
      UPDATE acs_runtime_workers SET
        status = $2, expires_at = to_timestamp($3 / 1000.0), revision = $4, payload = $5::jsonb
      WHERE worker_id = $1 AND revision = $6 AND instance_id = $7 AND service_principal_id = $8
    `, [updated.workerId, updated.status, updated.expiresAt, updated.revision, serialize(updated), worker.revision, input.instanceId, input.servicePrincipalId]);
    if (!changed(result)) throw new RuntimeStateConflictError("worker heartbeat revision conflict");
    return updated;
  }

  async getWorker(workerId: string): Promise<DurableWorkerRegistration | undefined> {
    const result = await query<PayloadRow>(this.db, "get runtime worker", "SELECT payload FROM acs_runtime_workers WHERE worker_id = $1", [workerId]);
    return result.rows[0] ? decode<DurableWorkerRegistration>(result.rows[0].payload) : undefined;
  }

  async listWorkers(): Promise<readonly DurableWorkerRegistration[]> {
    const result = await query<PayloadRow>(this.db, "list runtime workers", "SELECT payload FROM acs_runtime_workers ORDER BY worker_id");
    return result.rows.map((row) => decode<DurableWorkerRegistration>(row.payload));
  }

  async claimNext(input: {
    readonly workerId: string;
    readonly instanceId: string;
    readonly servicePrincipalId: string;
    readonly at?: number;
    readonly leaseTtlMs: number;
  }): Promise<RuntimeClaim | undefined> {
    const worker = await this.requireWorkerIdentity(input.workerId, input.instanceId, input.servicePrincipalId, true);
    const at = await this.databaseTime(input.at);
    if ((worker.status !== "available" && worker.status !== "busy")
      || worker.expiresAt === undefined
      || worker.expiresAt < at
      || worker.activeRuns >= worker.capabilities.maxConcurrentRuns) return undefined;

    const candidateResult = await query<PayloadRow>(this.db, "select runtime job for claim", `
      SELECT payload FROM acs_runtime_jobs
      WHERE status = 'queued'
      ORDER BY created_at, job_id
      FOR UPDATE SKIP LOCKED
    `);
    const job = candidateResult.rows
      .map((row) => decode<ExecutionJob>(row.payload))
      .find((candidate) => isWorkerEligibleForRequirements(worker.capabilities, candidate.requirements));
    if (!job) return undefined;

    const fence = await query<FencingRow>(this.db, "allocate fencing token", `
      UPDATE acs_runtime_jobs
      SET next_fencing_token = next_fencing_token + 1
      WHERE job_id = $1 AND status = 'queued' AND revision = $2
      RETURNING next_fencing_token
    `, [job.jobId, job.revision]);
    if (!fence.rows[0]) return undefined;
    const fencingToken = Number(fence.rows[0].next_fencing_token);
    const assignment: DurableJobAssignment = {
      assignmentId: `assignment_${randomUUID()}`,
      jobId: job.jobId,
      workerId: worker.workerId,
      workerInstanceId: worker.instanceId,
      leaseId: `lease_${randomUUID()}`,
      fencingToken,
      assignedAt: at,
      leaseExpiresAt: at + input.leaseTtlMs,
      attempt: job.attempt + 1,
      status: "active",
      revision: 1,
    };
    const updatedJob: ExecutionJob = {
      ...job,
      status: "assigned",
      attempt: assignment.attempt,
      updatedAt: at,
      revision: job.revision + 1,
    };
    const updatedWorker: DurableWorkerRegistration = {
      ...worker,
      status: worker.activeRuns + 1 >= worker.capabilities.maxConcurrentRuns ? "busy" : "available",
      activeRuns: worker.activeRuns + 1,
      revision: worker.revision + 1,
    };
    await query(this.db, "persist runtime assignment", `
      INSERT INTO acs_runtime_assignments (
        assignment_id, job_id, worker_id, lease_id, fencing_token, lease_expires_at, status, revision, payload
      ) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7, $8, $9::jsonb)
    `, [assignment.assignmentId, assignment.jobId, assignment.workerId, assignment.leaseId, assignment.fencingToken, assignment.leaseExpiresAt, assignment.status, assignment.revision, serialize(assignment)]);
    await this.saveJob(updatedJob, job.revision);
    await this.saveWorker(updatedWorker, worker.revision);
    await this.appendEvent({
      eventId: `rte_${randomUUID()}`,
      tenantId: job.tenantId,
      jobId: job.jobId,
      assignmentId: assignment.assignmentId,
      workerId: worker.workerId,
      category: "runtime.job.assigned",
      outcome: "succeeded",
      correlationId: job.correlationId,
      timestamp: at,
      revision: updatedJob.revision,
      metadata: { fencingToken, leaseExpiresAt: assignment.leaseExpiresAt },
    });
    return { job: updatedJob, assignment };
  }

  async renewLease(input: RuntimeOwnershipInput & { readonly leaseTtlMs: number }): Promise<DurableJobAssignment> {
    const at = await this.databaseTime(input.at);
    const { assignment } = await this.requireOwnership({ ...input, at });
    if (assignment.leaseExpiresAt < at) throw new RuntimeStaleOwnerError(input.jobId, input.assignmentId, input.fencingToken);
    const updated: DurableJobAssignment = { ...assignment, leaseExpiresAt: at + input.leaseTtlMs, revision: assignment.revision + 1 };
    await this.saveAssignment(updated, assignment.revision);
    return updated;
  }

  async markRunning(input: RuntimeOwnershipInput): Promise<ExecutionJob> {
    const at = await this.databaseTime(input.at);
    const { job } = await this.requireOwnership({ ...input, at });
    if (job.status !== "assigned" && job.status !== "running") throw new RuntimeStateConflictError("job cannot transition to running");
    if (job.status === "running") return job;
    const updated: ExecutionJob = { ...job, status: "running", updatedAt: at, revision: job.revision + 1 };
    await this.saveJob(updated, job.revision);
    return updated;
  }

  async completeJob(input: RuntimeOwnershipInput & { readonly result: DurableExecutionResult }): Promise<ExecutionJob> {
    const idempotent = await this.idempotentTerminalResult(input, "succeeded");
    if (idempotent) return idempotent;
    const at = await this.databaseTime(input.at);
    const { job, assignment, worker } = await this.requireOwnership({ ...input, at });
    if (terminal(job.status)) throw new RuntimeStateConflictError("terminal job cannot be completed");
    const updatedJob: ExecutionJob = { ...job, status: "succeeded", result: input.result, updatedAt: input.result.completedAt, revision: job.revision + 1 };
    await this.saveJob(updatedJob, job.revision);
    await this.saveAssignment({ ...assignment, status: "completed", revision: assignment.revision + 1 }, assignment.revision);
    await this.saveWorker({ ...worker, activeRuns: Math.max(0, worker.activeRuns - 1), status: worker.status === "draining" ? "draining" : "available", revision: worker.revision + 1 }, worker.revision);
    return updatedJob;
  }

  async failJob(input: RuntimeOwnershipInput & { readonly error: DurableExecutionError }): Promise<ExecutionJob> {
    const idempotent = await this.idempotentTerminalResult(input, "failed");
    if (idempotent) return idempotent;
    const at = await this.databaseTime(input.at);
    const { job, assignment, worker } = await this.requireOwnership({ ...input, at });
    const retry = input.error.retryable && job.attempt < job.maxAttempts;
    const updatedJob: ExecutionJob = { ...job, status: retry ? "queued" : "failed", error: input.error, updatedAt: at, revision: job.revision + 1 };
    await this.saveJob(updatedJob, job.revision);
    await this.saveAssignment({ ...assignment, status: "failed", revision: assignment.revision + 1 }, assignment.revision);
    await this.saveWorker({ ...worker, activeRuns: Math.max(0, worker.activeRuns - 1), status: worker.status === "draining" ? "draining" : "available", revision: worker.revision + 1 }, worker.revision);
    return updatedJob;
  }

  async recoverExpired(input: { readonly at?: number; readonly workerStaleAfterMs?: number } = {}): Promise<RuntimeRecoveryResult> {
    const at = await this.databaseTime(input.at);
    const expiredWorkers = await query<PayloadRow>(this.db, "find expired runtime workers", `
      SELECT payload FROM acs_runtime_workers
      WHERE status <> 'offline' AND expires_at IS NOT NULL AND expires_at < to_timestamp($1 / 1000.0)
      FOR UPDATE SKIP LOCKED
    `, [at]);
    for (const row of expiredWorkers.rows) {
      const worker = decode<DurableWorkerRegistration>(row.payload);
      await this.saveWorker({ ...worker, status: "offline", revision: worker.revision + 1 }, worker.revision);
    }
    const expiredAssignments = await query<PayloadRow>(this.db, "find expired assignments", `
      SELECT payload FROM acs_runtime_assignments
      WHERE status = 'active' AND lease_expires_at < to_timestamp($1 / 1000.0)
      FOR UPDATE SKIP LOCKED
    `, [at]);
    let jobsRequeued = 0;
    let jobsCancelled = 0;
    let jobsFailed = 0;
    for (const row of expiredAssignments.rows) {
      const assignment = decode<DurableJobAssignment>(row.payload);
      const job = await this.getJob(assignment.jobId);
      if (!job || terminal(job.status)) continue;
      let status: ExecutionJobStatus;
      if (job.status === "cancel_requested") { status = "cancelled"; jobsCancelled += 1; }
      else if (job.attempt >= job.maxAttempts) { status = "failed"; jobsFailed += 1; }
      else { status = "queued"; jobsRequeued += 1; }
      await this.saveAssignment({ ...assignment, status: "expired", revision: assignment.revision + 1 }, assignment.revision);
      await this.saveJob({ ...job, status, updatedAt: at, revision: job.revision + 1 }, job.revision);
      const worker = await this.getWorker(assignment.workerId);
      if (worker) await this.saveWorker({ ...worker, activeRuns: Math.max(0, worker.activeRuns - 1), revision: worker.revision + 1 }, worker.revision);
    }
    return {
      scannedAt: at,
      workersMarkedOffline: expiredWorkers.rows.length,
      assignmentsExpired: expiredAssignments.rows.length,
      jobsRequeued,
      jobsCancelled,
      jobsFailed,
    };
  }

  async getAssignment(assignmentId: string): Promise<DurableJobAssignment | undefined> {
    const result = await query<PayloadRow>(this.db, "get runtime assignment", "SELECT payload FROM acs_runtime_assignments WHERE assignment_id = $1", [assignmentId]);
    return result.rows[0] ? decode<DurableJobAssignment>(result.rows[0].payload) : undefined;
  }

  async listAssignments(filter: { readonly jobId?: string; readonly workerId?: string } = {}): Promise<readonly DurableJobAssignment[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (filter.jobId) { values.push(filter.jobId); clauses.push(`job_id = $${values.length}`); }
    if (filter.workerId) { values.push(filter.workerId); clauses.push(`worker_id = $${values.length}`); }
    const result = await query<PayloadRow>(this.db, "list runtime assignments", `SELECT payload FROM acs_runtime_assignments${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY assignment_id`, values);
    return result.rows.map((row) => decode<DurableJobAssignment>(row.payload));
  }

  async listEvents(filter: { readonly tenantId?: string; readonly jobId?: string; readonly workerId?: string } = {}): Promise<readonly RuntimeStateEvent[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (filter.tenantId) { values.push(filter.tenantId); clauses.push(`tenant_id = $${values.length}`); }
    if (filter.jobId) { values.push(filter.jobId); clauses.push(`job_id = $${values.length}`); }
    if (filter.workerId) { values.push(filter.workerId); clauses.push(`worker_id = $${values.length}`); }
    const result = await query<PayloadRow>(this.db, "list runtime events", `SELECT payload FROM acs_runtime_events${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY sequence`, values);
    return result.rows.map((row) => decode<RuntimeStateEvent>(row.payload));
  }

  private async requireWorkerIdentity(workerId: string, instanceId: string, servicePrincipalId: string, lock = false): Promise<DurableWorkerRegistration> {
    const result = await query<PayloadRow>(this.db, "require runtime worker identity", `SELECT payload FROM acs_runtime_workers WHERE worker_id = $1${lock ? " FOR UPDATE" : ""}`, [workerId]);
    const worker = result.rows[0] ? decode<DurableWorkerRegistration>(result.rows[0].payload) : undefined;
    if (!worker || worker.instanceId !== instanceId || worker.servicePrincipalId !== servicePrincipalId) {
      throw new RuntimeWorkerIdentityError(workerId, instanceId);
    }
    return worker;
  }

  private async requireOwnership(input: RuntimeOwnershipInput, allowExpired = false): Promise<{ job: ExecutionJob; assignment: DurableJobAssignment; worker: DurableWorkerRegistration }> {
    const assignmentResult = await query<PayloadRow>(this.db, "validate runtime ownership", "SELECT payload FROM acs_runtime_assignments WHERE assignment_id = $1 FOR UPDATE", [input.assignmentId]);
    const assignment = assignmentResult.rows[0] ? decode<DurableJobAssignment>(assignmentResult.rows[0].payload) : undefined;
    if (!assignment
      || assignment.jobId !== input.jobId
      || assignment.workerId !== input.workerId
      || assignment.workerInstanceId !== input.instanceId
      || assignment.leaseId !== input.leaseId
      || assignment.fencingToken !== input.fencingToken
      || assignment.status !== "active"
      || (!allowExpired && assignment.leaseExpiresAt < (input.at ?? Date.now()))) {
      throw new RuntimeStaleOwnerError(input.jobId, input.assignmentId, input.fencingToken);
    }
    const worker = await this.requireWorkerIdentity(input.workerId, input.instanceId, input.servicePrincipalId, true);
    const job = await this.getJob(input.jobId);
    if (!job) throw new RuntimeStaleOwnerError(input.jobId, input.assignmentId, input.fencingToken);
    return { job, assignment, worker };
  }

  private async idempotentTerminalResult(
    input: RuntimeOwnershipInput,
    expectedStatus: "succeeded" | "failed",
  ): Promise<ExecutionJob | undefined> {
    const [job, assignment] = await Promise.all([
      this.getJob(input.jobId),
      this.getAssignment(input.assignmentId),
    ]);
    if (!job || job.status !== expectedStatus || !assignment) return undefined;
    if (assignment.jobId === input.jobId
      && assignment.workerId === input.workerId
      && assignment.workerInstanceId === input.instanceId
      && assignment.leaseId === input.leaseId
      && assignment.fencingToken === input.fencingToken
      && ((expectedStatus === "succeeded" && assignment.status === "completed")
        || (expectedStatus === "failed" && assignment.status === "failed"))) return job;
    return undefined;
  }

  private async saveJob(job: ExecutionJob, expectedRevision: number): Promise<void> {
    const result = await query(this.db, "save runtime job", `
      UPDATE acs_runtime_jobs SET status = $2, revision = $3, attempt = $4,
        updated_at = to_timestamp($5 / 1000.0), payload = $6::jsonb
      WHERE job_id = $1 AND revision = $7
    `, [job.jobId, job.status, job.revision, job.attempt, job.updatedAt, serialize(job), expectedRevision]);
    if (!changed(result)) throw new RuntimeStateConflictError("runtime job revision conflict");
  }

  private async saveWorker(worker: DurableWorkerRegistration, expectedRevision: number): Promise<void> {
    const result = await query(this.db, "save runtime worker", `
      UPDATE acs_runtime_workers SET instance_id = $2, service_principal_id = $3,
        status = $4, expires_at = $5, revision = $6, active_runs = $7, payload = $8::jsonb
      WHERE worker_id = $1 AND revision = $9
    `, [worker.workerId, worker.instanceId, worker.servicePrincipalId, worker.status, worker.expiresAt ? new Date(worker.expiresAt) : null, worker.revision, worker.activeRuns, serialize(worker), expectedRevision]);
    if (!changed(result)) throw new RuntimeStateConflictError("runtime worker revision conflict");
  }

  private async saveAssignment(assignment: DurableJobAssignment, expectedRevision: number): Promise<void> {
    const result = await query(this.db, "save runtime assignment", `
      UPDATE acs_runtime_assignments SET lease_expires_at = to_timestamp($2 / 1000.0), status = $3,
        revision = $4, payload = $5::jsonb
      WHERE assignment_id = $1 AND revision = $6 AND fencing_token = $7
    `, [assignment.assignmentId, assignment.leaseExpiresAt, assignment.status, assignment.revision, serialize(assignment), expectedRevision, assignment.fencingToken]);
    if (!changed(result)) throw new RuntimeStaleOwnerError(assignment.jobId, assignment.assignmentId, assignment.fencingToken);
  }

  private async appendEvent(event: RuntimeStateEvent): Promise<void> {
    await query(this.db, "append runtime event", `
      INSERT INTO acs_runtime_events (
        event_id, tenant_id, job_id, assignment_id, worker_id, occurred_at, payload
      ) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7::jsonb)
      ON CONFLICT (event_id) DO NOTHING
    `, [event.eventId, event.tenantId ?? null, event.jobId ?? null, event.assignmentId ?? null, event.workerId ?? null, event.timestamp, serialize(event)]);
  }

  private async databaseTime(explicit?: number): Promise<number> {
    if (explicit !== undefined) return explicit;
    const result = await query<CountRow>(this.db, "read authoritative database time", `
      SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS value
    `);
    return Number(result.rows[0]?.value ?? Date.now());
  }
}

class PostgresRateLimitRepository implements AsyncRateLimitRepository {
  constructor(private readonly db: Queryable) {}
  async consume(input: { readonly policyId: string; readonly keyHash: string; readonly windowStart: number; readonly windowMs: number; readonly cost: number }): Promise<{ readonly consumed: number }> {
    const result = await query<CountRow>(this.db, "consume shared rate limit", `
      INSERT INTO acs_http_rate_limit_buckets (policy_id, key_hash, window_start, window_ms, consumed)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (policy_id, key_hash, window_start)
      DO UPDATE SET consumed = acs_http_rate_limit_buckets.consumed + EXCLUDED.consumed
      RETURNING consumed AS value
    `, [input.policyId, input.keyHash, input.windowStart, input.windowMs, input.cost]);
    return { consumed: Number(result.rows[0]?.value ?? 0) };
  }
}

class PostgresSharedStateSession implements SharedAuthoritativeStateSession {
  readonly accountIdentity: AccountIdentityStore;
  readonly tenants: AsyncTenantRepository;
  readonly memberships: AsyncTenantMembershipRepository;
  readonly governance: AsyncTenantGovernanceRepository;
  readonly audit: AsyncAuditEventStore;
  readonly agents: AsyncAgentRepository;
  readonly deployments: AsyncDeploymentRepository;
  readonly secretMetadata: AsyncSecretMetadataRepository;
  readonly economics: AsyncEconomicRepository;
  readonly runtime: AsyncRuntimeRepository;
  readonly rateLimits: AsyncRateLimitRepository;
  readonly nativeCore: AsyncNativeCoreRepository;

  constructor(db: Queryable) {
    this.accountIdentity = new PostgresAccountIdentityStore(db);
    this.tenants = new PostgresTenantRepository(db);
    this.memberships = new PostgresMembershipRepository(db);
    this.governance = new PostgresGovernanceRepository(db);
    this.audit = new PostgresAuditStore(db);
    this.agents = new PostgresAgentRepository(db);
    this.deployments = new PostgresDeploymentRepository(db);
    this.secretMetadata = new PostgresSecretMetadataRepository(db);
    this.economics = new PostgresEconomicRepository(db);
    this.runtime = new PostgresRuntimeRepository(db);
    this.rateLimits = new PostgresRateLimitRepository(db);
    this.nativeCore = new PostgresNativeCoreRepository(db);
  }
}

export interface PostgresSharedAuthoritativeStateOptions {
  readonly connectionString: string;
  readonly poolSize?: number;
  readonly connectionTimeoutMs?: number;
  readonly statementTimeoutMs?: number;
  readonly tls?: boolean;
}

export class PostgresSharedAuthoritativeState implements SharedAuthoritativeState {
  readonly descriptor: SharedStateDescriptor = {
    adapter: "postgres-shared-authoritative-state",
    productionOriented: true,
    networkIoCapable: true,
    transactional: true,
    durability: "shared_durable",
    multiInstance: "shared_database",
    topology: "shared_network_database",
  };
  readonly accountIdentity: AccountIdentityStore;
  readonly tenants: AsyncTenantRepository;
  readonly memberships: AsyncTenantMembershipRepository;
  readonly governance: AsyncTenantGovernanceRepository;
  readonly audit: AsyncAuditEventStore;
  readonly agents: AsyncAgentRepository;
  readonly deployments: AsyncDeploymentRepository;
  readonly secretMetadata: AsyncSecretMetadataRepository;
  readonly economics: AsyncEconomicRepository;
  readonly runtime: AsyncRuntimeRepository;
  readonly rateLimits: AsyncRateLimitRepository;
  readonly nativeCore: AsyncNativeCoreRepository;
  readonly #pool: Pool;
  #lastPoolErrorAt: number | undefined;

  constructor(options: PostgresSharedAuthoritativeStateOptions) {
    if (!options.connectionString.trim()) throw new Error("shared state connection string is required");
    const config: PoolConfig = {
      connectionString: options.connectionString,
      max: options.poolSize ?? 10,
      connectionTimeoutMillis: options.connectionTimeoutMs ?? 5_000,
      statement_timeout: options.statementTimeoutMs ?? 10_000,
      query_timeout: options.statementTimeoutMs ?? 10_000,
      application_name: "acs-shared-state",
      ...(options.tls ? { ssl: { rejectUnauthorized: true } } : {}),
    };
    this.#pool = new Pool(config);
    // pg emits idle-client failures on the Pool itself. Without a listener,
    // Node treats a dependency outage as an uncaught error and terminates the
    // Control Plane. Authority remains fail-closed at query boundaries while
    // the process stays alive so readiness and reconnect can operate.
    this.#pool.on("error", () => {
      this.#lastPoolErrorAt = Date.now();
    });
    const session = new PostgresSharedStateSession(this.#pool);
    this.accountIdentity = session.accountIdentity;
    this.tenants = session.tenants;
    this.memberships = {
      create: (membership) => this.withTransaction("create membership", (tx) => tx.memberships.create(membership)),
      get: (tenantId, principalId) => session.memberships.get(tenantId, principalId),
      list: () => session.memberships.list(),
      listByTenant: (tenantId) => session.memberships.listByTenant(tenantId),
      save: (membership, expectedRevision) => this.withTransaction(
        "save membership",
        (tx) => tx.memberships.save(membership, expectedRevision),
      ),
      saveMany: (updates) => this.withTransaction("save memberships", (tx) => tx.memberships.saveMany(updates)),
      history: (tenantId, principalId) => session.memberships.history(tenantId, principalId),
    };
    this.governance = session.governance;
    this.audit = session.audit;
    this.agents = session.agents;
    this.deployments = session.deployments;
    this.secretMetadata = session.secretMetadata;
    this.economics = {
      get: (kind, recordId) => session.economics.get(kind, recordId),
      list: (kind, tenantId) => session.economics.list(kind, tenantId),
      save: (record, expectedRevision) => expectedRevision === undefined
        ? session.economics.save(record)
        : session.economics.save(record, expectedRevision),
      commitSettlement: (input) => this.withTransaction(
        "commit economic settlement",
        (tx) => tx.economics.commitSettlement(input),
      ),
    };
    this.runtime = {
      createJob: (input) => this.withTransaction("create runtime job", (tx) => tx.runtime.createJob(input)),
      getJob: (jobId) => session.runtime.getJob(jobId),
      listJobs: (filter) => session.runtime.listJobs(filter),
      registerWorker: (input) => this.withTransaction("register runtime worker", (tx) => tx.runtime.registerWorker(input)),
      heartbeat: (input) => this.withTransaction("runtime worker heartbeat", (tx) => tx.runtime.heartbeat(input)),
      getWorker: (workerId) => session.runtime.getWorker(workerId),
      listWorkers: () => session.runtime.listWorkers(),
      claimNext: (input) => this.withTransaction("claim runtime job", (tx) => tx.runtime.claimNext(input)),
      renewLease: (input) => this.withTransaction("renew runtime lease", (tx) => tx.runtime.renewLease(input)),
      markRunning: (input) => this.withTransaction("mark runtime job running", (tx) => tx.runtime.markRunning(input)),
      completeJob: (input) => this.withTransaction("complete runtime job", (tx) => tx.runtime.completeJob(input)),
      failJob: (input) => this.withTransaction("fail runtime job", (tx) => tx.runtime.failJob(input)),
      recoverExpired: (input) => this.withTransaction("recover expired runtime ownership", (tx) => tx.runtime.recoverExpired(input)),
      getAssignment: (assignmentId) => session.runtime.getAssignment(assignmentId),
      listAssignments: (filter) => session.runtime.listAssignments(filter),
      listEvents: (filter) => session.runtime.listEvents(filter),
    };
    this.rateLimits = session.rateLimits;
    this.nativeCore = {
      advanceAgentLineage: (input) => this.withTransaction(
        "advance native agent lineage",
        (tx) => tx.nativeCore.advanceAgentLineage(input),
      ),
      getAgentLineage: (agentId) => session.nativeCore.getAgentLineage(agentId),
      advanceWorkforceLineage: (input) => this.withTransaction(
        "advance native workforce lineage",
        (tx) => tx.nativeCore.advanceWorkforceLineage(input),
      ),
      getWorkforceLineage: (workforceId) => this.withTransaction(
        "read native workforce lineage",
        (tx) => tx.nativeCore.getWorkforceLineage(workforceId),
      ),
      getWorkforceRevision: (workforceId, revision) => session.nativeCore.getWorkforceRevision(workforceId, revision),
      listWorkforceRevisions: (workforceId) => session.nativeCore.listWorkforceRevisions(workforceId),
      recordGovernedRoleRevision: (role, expectedHead) => this.withTransaction(
        "record governed role revision",
        (tx) => tx.nativeCore.recordGovernedRoleRevision(role, expectedHead),
      ),
      getGovernedRoleRevision: (roleRef) => session.nativeCore.getGovernedRoleRevision(roleRef),
      getEvent: (eventId) => session.nativeCore.getEvent(eventId),
      replayEvents: (input) => session.nativeCore.replayEvents(input),
      listOutbox: (input) => session.nativeCore.listOutbox(input),
      claimNextOutbox: (input) => this.withTransaction("claim native outbox", (tx) => tx.nativeCore.claimNextOutbox(input)),
      acknowledgeOutbox: (input) => this.withTransaction("acknowledge native outbox", (tx) => tx.nativeCore.acknowledgeOutbox(input)),
      retryOutbox: (input) => this.withTransaction("retry native outbox", (tx) => tx.nativeCore.retryOutbox(input)),
      recordFencedCheckpoint: (input) => this.withTransaction(
        "record native fenced checkpoint",
        (tx) => tx.nativeCore.recordFencedCheckpoint(input),
      ),
      getCheckpoint: (checkpointId) => session.nativeCore.getCheckpoint(checkpointId),
      recordEvidence: (record) => this.withTransaction("record native evidence", (tx) => tx.nativeCore.recordEvidence(record)),
      listEvidence: (input) => session.nativeCore.listEvidence(input),
      recordAccounting: (input) => this.withTransaction("record native accounting", (tx) => tx.nativeCore.recordAccounting(input)),
      listUsage: (runId) => session.nativeCore.listUsage(runId),
      listCosts: (usageId) => session.nativeCore.listCosts(usageId),
      admitWorkforceRun: (input) => this.withTransaction(
        "admit Workforce Run",
        (tx) => tx.nativeCore.admitWorkforceRun(input),
      ),
      getRun: (runId) => session.nativeCore.getRun(runId),
      getRunMembership: (runId) => session.nativeCore.getRunMembership(runId),
    };
  }

  async migrate(): Promise<number> {
    return this.withTransaction("migrate shared state", async (session) => {
      void session;
      const client = this.transactionClient(session);
      await query(client, "create schema migration table", `
        CREATE TABLE IF NOT EXISTS acs_schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        )
      `);
      await query(client, "lock schema migration", "SELECT pg_advisory_xact_lock(1515001)");
      const current = await this.schemaVersionFrom(client);
      if (current > SHARED_STATE_SCHEMA_VERSION) {
        throw new SharedStateSchemaMismatchError(SHARED_STATE_SCHEMA_VERSION, current);
      }
      for (const migration of SHARED_STATE_MIGRATIONS.filter((entry) => entry.version > current)) {
        for (const statement of migration.statements) await query(client, `migration ${migration.version}`, statement);
        await query(client, `record migration ${migration.version}`, `
          INSERT INTO acs_schema_migrations (version, name) VALUES ($1, $2)
          ON CONFLICT (version) DO NOTHING
        `, [migration.version, migration.name]);
      }
      return this.schemaVersionFrom(client);
    });
  }

  async schemaVersion(): Promise<number> {
    try {
      return await this.schemaVersionFrom(this.#pool);
    } catch (error) {
      if (error instanceof TransactionFailedError && errorCode(error.cause) === "42P01") return 0;
      throw error;
    }
  }

  async health(): Promise<SharedStateHealth> {
    const started = Date.now();
    try {
      const version = await this.schemaVersion();
      const writable = await query<CountRow>(this.#pool, "shared state write health", `
        SELECT CASE WHEN pg_is_in_recovery() THEN 0 ELSE 1 END AS value
      `);
      const isWritable = Number(writable.rows[0]?.value ?? 0) === 1;
      const schemaCurrent = version === SHARED_STATE_SCHEMA_VERSION;
      return {
        configured: true,
        reachable: true,
        writable: isWritable,
        schemaCurrent,
        adapter: this.descriptor.adapter,
        schemaVersion: version,
        latencyMs: Date.now() - started,
        ...(this.#lastPoolErrorAt ? { lastErrorAt: this.#lastPoolErrorAt } : {}),
        ...(!schemaCurrent ? { reasonCode: "SHARED_STATE_SCHEMA_MISMATCH" as const }
          : !isWritable ? { reasonCode: "SHARED_STATE_READ_ONLY" as const }
          : {}),
      };
    } catch {
      return {
        configured: true,
        reachable: false,
        writable: false,
        schemaCurrent: false,
        adapter: this.descriptor.adapter,
        reasonCode: "SHARED_STATE_UNAVAILABLE",
        latencyMs: Date.now() - started,
        ...(this.#lastPoolErrorAt ? { lastErrorAt: this.#lastPoolErrorAt } : {}),
      };
    }
  }

  async withTransaction<T>(operation: string, fn: (session: SharedAuthoritativeStateSession) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect().catch((error: unknown) => { throw mapRepositoryError(operation, error); });
    try {
      await query(client, operation, "BEGIN");
      const session = new PostgresSharedStateSession(client);
      Object.defineProperty(session, "__client", { value: client, enumerable: false });
      const result = await fn(session);
      await query(client, operation, "COMMIT");
      return result;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* original failure wins */ }
      throw mapRepositoryError(operation, error);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }

  private transactionClient(session: SharedAuthoritativeStateSession): PoolClient {
    const client = (session as unknown as { readonly __client?: PoolClient }).__client;
    if (!client) throw new TransactionFailedError("resolve transaction client");
    return client;
  }

  private async schemaVersionFrom(db: Queryable): Promise<number> {
    const result = await query<VersionRow>(db, "read shared state schema version", "SELECT COALESCE(MAX(version), 0)::int AS version FROM acs_schema_migrations");
    return Number(result.rows[0]?.version ?? 0);
  }
}

export function sharedStateOptionsFromEnvironment(environment: NodeJS.ProcessEnv = process.env): PostgresSharedAuthoritativeStateOptions {
  const backend = environment.ACS_STATE_BACKEND;
  if (backend !== "shared") {
    throw new Error("ACS_STATE_BACKEND=shared is required for the shared production profile");
  }
  const connectionString = environment.ACS_SHARED_DATABASE_URL ?? "";
  if (!connectionString) throw new Error("ACS_SHARED_DATABASE_URL is required for the shared production profile");
  const integer = (name: string, fallback: number): number => {
    const value = environment[name];
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
    return parsed;
  };
  return {
    connectionString,
    poolSize: integer("ACS_SHARED_DATABASE_POOL_SIZE", 10),
    connectionTimeoutMs: integer("ACS_SHARED_DATABASE_CONNECTION_TIMEOUT_MS", 5_000),
    statementTimeoutMs: integer("ACS_SHARED_DATABASE_STATEMENT_TIMEOUT_MS", 10_000),
    tls: environment.ACS_SHARED_DATABASE_TLS === "true",
  };
}
