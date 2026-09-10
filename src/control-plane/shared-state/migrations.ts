export const SHARED_STATE_SCHEMA_VERSION = 3;

export interface SharedStateMigration {
  readonly version: number;
  readonly name: string;
  readonly statements: readonly string[];
}

export const SHARED_STATE_MIGRATIONS: readonly SharedStateMigration[] = [
  {
    version: 1,
    name: "initial_shared_authoritative_state",
    statements: [
      `CREATE TABLE IF NOT EXISTS acs_schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE TABLE IF NOT EXISTS acs_tenants (
        tenant_id TEXT PRIMARY KEY,
        revision INTEGER NOT NULL CHECK (revision > 0),
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE TABLE IF NOT EXISTS acs_tenant_history (
        tenant_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        payload JSONB NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (tenant_id, revision)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_memberships (
        tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
        principal_id TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (tenant_id, principal_id)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_membership_history (
        tenant_id TEXT NOT NULL,
        principal_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        payload JSONB NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (tenant_id, principal_id, revision)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS acs_membership_active_owner_idx
        ON acs_memberships (tenant_id)
        WHERE role = 'tenant_owner' AND status = 'active'`,
      `CREATE TABLE IF NOT EXISTS acs_governance (
        tenant_id TEXT PRIMARY KEY REFERENCES acs_tenants(tenant_id),
        revision INTEGER NOT NULL CHECK (revision > 0),
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE TABLE IF NOT EXISTS acs_governance_history (
        tenant_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        payload JSONB NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (tenant_id, revision)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_audit_events (
        sequence BIGSERIAL PRIMARY KEY,
        event_id TEXT NOT NULL UNIQUE,
        tenant_id TEXT,
        correlation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor TEXT,
        occurred_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS acs_audit_tenant_sequence_idx ON acs_audit_events (tenant_id, sequence)`,
      `CREATE INDEX IF NOT EXISTS acs_audit_correlation_idx ON acs_audit_events (correlation_id, sequence)`,
      `CREATE TABLE IF NOT EXISTS acs_agents (
        agent_id TEXT PRIMARY KEY,
        revision INTEGER NOT NULL CHECK (revision > 0),
        tenant_id TEXT,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE TABLE IF NOT EXISTS acs_agent_history (
        agent_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        payload JSONB NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (agent_id, revision)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_deployments (
        deployment_id TEXT PRIMARY KEY,
        record_revision INTEGER NOT NULL CHECK (record_revision > 0),
        tenant_id TEXT,
        status TEXT NOT NULL,
        predecessor_deployment_id TEXT,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE TABLE IF NOT EXISTS acs_deployment_history (
        deployment_id TEXT NOT NULL,
        record_revision INTEGER NOT NULL,
        payload JSONB NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (deployment_id, record_revision)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_secret_metadata (
        secret_id TEXT PRIMARY KEY,
        tenant_id TEXT,
        version INTEGER NOT NULL CHECK (version > 0),
        status TEXT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE INDEX IF NOT EXISTS acs_secret_metadata_tenant_idx ON acs_secret_metadata (tenant_id, status, secret_id)`,
      `CREATE TABLE IF NOT EXISTS acs_economic_records (
        kind TEXT NOT NULL,
        record_id TEXT NOT NULL,
        tenant_id TEXT,
        idempotency_key TEXT,
        revision INTEGER NOT NULL CHECK (revision > 0),
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (kind, record_id)
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS acs_economic_idempotency_idx
        ON acs_economic_records (kind, COALESCE(tenant_id, ''), idempotency_key)
        WHERE idempotency_key IS NOT NULL`,
      `CREATE TABLE IF NOT EXISTS acs_runtime_jobs (
        job_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        status TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        attempt INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        correlation_id TEXT NOT NULL,
        idempotency_key TEXT,
        next_fencing_token BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS acs_runtime_job_idempotency_idx
        ON acs_runtime_jobs (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS acs_runtime_job_queue_idx ON acs_runtime_jobs (status, created_at, job_id)`,
      `CREATE TABLE IF NOT EXISTS acs_runtime_workers (
        worker_id TEXT PRIMARY KEY,
        instance_id TEXT NOT NULL,
        service_principal_id TEXT NOT NULL,
        status TEXT NOT NULL,
        expires_at TIMESTAMPTZ,
        revision INTEGER NOT NULL,
        active_runs INTEGER NOT NULL,
        payload JSONB NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS acs_runtime_worker_expiry_idx ON acs_runtime_workers (status, expires_at)`,
      `CREATE TABLE IF NOT EXISTS acs_runtime_assignments (
        assignment_id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES acs_runtime_jobs(job_id),
        worker_id TEXT NOT NULL REFERENCES acs_runtime_workers(worker_id),
        lease_id TEXT NOT NULL UNIQUE,
        fencing_token BIGINT NOT NULL,
        lease_expires_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL,
        revision INTEGER NOT NULL,
        payload JSONB NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS acs_runtime_active_assignment_idx
        ON acs_runtime_assignments (job_id) WHERE status = 'active'`,
      `CREATE INDEX IF NOT EXISTS acs_runtime_assignment_expiry_idx
        ON acs_runtime_assignments (status, lease_expires_at)`,
      `CREATE TABLE IF NOT EXISTS acs_runtime_events (
        sequence BIGSERIAL PRIMARY KEY,
        event_id TEXT NOT NULL UNIQUE,
        tenant_id TEXT,
        job_id TEXT,
        assignment_id TEXT,
        worker_id TEXT,
        occurred_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS acs_runtime_event_job_idx ON acs_runtime_events (job_id, sequence)`,
      `CREATE TABLE IF NOT EXISTS acs_http_rate_limit_buckets (
        policy_id TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        window_start BIGINT NOT NULL,
        window_ms BIGINT NOT NULL,
        consumed BIGINT NOT NULL,
        PRIMARY KEY (policy_id, key_hash, window_start)
      )`,
    ],
  },
  {
    version: 2,
    name: "account_identity_and_siwx_sessions",
    statements: [
      `CREATE TABLE IF NOT EXISTS acs_accounts (
        account_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE TABLE IF NOT EXISTS acs_external_identities (
        identity_id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES acs_accounts(account_id),
        provider TEXT NOT NULL,
        namespace TEXT NOT NULL,
        subject TEXT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        UNIQUE (provider, namespace, subject)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_external_identity_account_idx
        ON acs_external_identities (account_id, identity_id)`,
      `CREATE TABLE IF NOT EXISTS acs_auth_sessions (
        session_id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES acs_accounts(account_id),
        identity_id TEXT NOT NULL REFERENCES acs_external_identities(identity_id),
        provider_session_id TEXT NOT NULL,
        token_digest TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        last_seen_at TIMESTAMPTZ,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE INDEX IF NOT EXISTS acs_auth_session_provider_idx
        ON acs_auth_sessions (provider_session_id, revoked_at)`,
      `CREATE INDEX IF NOT EXISTS acs_auth_session_expiry_idx
        ON acs_auth_sessions (expires_at, revoked_at)`,
      `CREATE TABLE IF NOT EXISTS acs_siwx_nonces (
        nonce_digest TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ,
        payload JSONB NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS acs_siwx_nonce_expiry_idx
        ON acs_siwx_nonces (expires_at, consumed_at)`,
    ],
  },
  {
    version: 3,
    name: "native_core_durable_lineage_events_and_outbox",
    statements: [
      `ALTER TABLE acs_agents ADD COLUMN IF NOT EXISTS record_kind TEXT NOT NULL DEFAULT 'legacy'`,
      `ALTER TABLE acs_agents ADD COLUMN IF NOT EXISTS native_fingerprint TEXT`,
      `ALTER TABLE acs_agents ADD CONSTRAINT acs_agents_record_kind_check
        CHECK (record_kind IN ('legacy', 'native_v2'))`,
      `ALTER TABLE acs_agents ADD CONSTRAINT acs_agents_native_head_check
        CHECK (record_kind <> 'native_v2' OR native_fingerprint IS NOT NULL)`,
      `ALTER TABLE acs_agent_history ADD COLUMN IF NOT EXISTS record_kind TEXT NOT NULL DEFAULT 'legacy'`,
      `ALTER TABLE acs_agent_history ADD COLUMN IF NOT EXISTS native_fingerprint TEXT`,
      `ALTER TABLE acs_agent_history ADD COLUMN IF NOT EXISTS supersedes_revision INTEGER`,
      `ALTER TABLE acs_agent_history ADD COLUMN IF NOT EXISTS created_by TEXT`,
      `ALTER TABLE acs_agent_history ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ`,
      `ALTER TABLE acs_agent_history ADD COLUMN IF NOT EXISTS change_reason TEXT`,
      `ALTER TABLE acs_agent_history ADD COLUMN IF NOT EXISTS correlation_id TEXT`,
      `ALTER TABLE acs_agent_history ADD COLUMN IF NOT EXISTS event_id TEXT`,
      `ALTER TABLE acs_agent_history ADD CONSTRAINT acs_agent_history_record_kind_check
        CHECK (record_kind IN ('legacy', 'native_v2'))`,
      `ALTER TABLE acs_agent_history ADD CONSTRAINT acs_agent_history_native_lineage_check
        CHECK (record_kind <> 'native_v2' OR (
          native_fingerprint IS NOT NULL
          AND created_by IS NOT NULL
          AND committed_at IS NOT NULL
          AND change_reason IS NOT NULL
          AND correlation_id IS NOT NULL
          AND event_id IS NOT NULL
        ))`,
      `CREATE UNIQUE INDEX IF NOT EXISTS acs_native_agent_fingerprint_idx
        ON acs_agent_history (agent_id, native_fingerprint)
        WHERE record_kind = 'native_v2' AND native_fingerprint IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS acs_native_agent_history_idx
        ON acs_agent_history (agent_id, revision)
        WHERE record_kind = 'native_v2'`,
      `CREATE TABLE IF NOT EXISTS acs_native_events (
        event_id TEXT PRIMARY KEY,
        stream_scope TEXT NOT NULL,
        sequence BIGINT NOT NULL CHECK (sequence > 0),
        event_type TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL,
        organization_id TEXT NOT NULL,
        product_domain TEXT NOT NULL,
        tenant_id TEXT,
        agent_id TEXT,
        run_id TEXT,
        task_id TEXT,
        attempt INTEGER,
        correlation_id TEXT NOT NULL,
        causation_id TEXT,
        idempotency_key TEXT,
        actor JSONB NOT NULL,
        source TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        UNIQUE (stream_scope, sequence)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_native_event_correlation_idx ON acs_native_events (correlation_id, occurred_at)`,
      `CREATE INDEX IF NOT EXISTS acs_native_event_agent_idx ON acs_native_events (agent_id, sequence) WHERE agent_id IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS acs_native_event_run_idx ON acs_native_events (run_id, sequence) WHERE run_id IS NOT NULL`,
      `CREATE TABLE IF NOT EXISTS acs_native_outbox (
        outbox_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES acs_native_events(event_id),
        delivery_kind TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'leased', 'delivered', 'retryable', 'dead_lettered')),
        available_at TIMESTAMPTZ NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        lease_owner TEXT,
        lease_expires_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        last_failure TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        UNIQUE (event_id, delivery_kind)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_native_outbox_recovery_idx
        ON acs_native_outbox (status, available_at, outbox_id)`,
      `CREATE TABLE IF NOT EXISTS acs_native_idempotency (
        scope TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status = 'succeeded'),
        result JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (scope, idempotency_key)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_native_checkpoints (
        checkpoint_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        task_id TEXT,
        attempt INTEGER NOT NULL CHECK (attempt > 0),
        assignment_id TEXT NOT NULL REFERENCES acs_runtime_assignments(assignment_id),
        lease_id TEXT NOT NULL,
        fencing_token BIGINT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE INDEX IF NOT EXISTS acs_native_checkpoint_run_idx ON acs_native_checkpoints (run_id, attempt, checkpoint_id)`,
      `CREATE TABLE IF NOT EXISTS acs_native_evidence (
        evidence_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES acs_native_events(event_id),
        subject_kind TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        run_id TEXT,
        task_id TEXT,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE INDEX IF NOT EXISTS acs_native_evidence_event_idx ON acs_native_evidence (event_id, evidence_id)`,
      `CREATE INDEX IF NOT EXISTS acs_native_evidence_subject_idx ON acs_native_evidence (subject_kind, subject_id, evidence_id)`,
    ],
  },
];
