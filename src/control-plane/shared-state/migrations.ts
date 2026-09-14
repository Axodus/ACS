export const SHARED_STATE_SCHEMA_VERSION = 9;

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
  {
    version: 4,
    name: "workforce_durable_lineage_and_governed_role_history",
    statements: [
      `CREATE TABLE IF NOT EXISTS acs_governed_role_revisions (
        role_id TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        native_fingerprint TEXT NOT NULL,
        supersedes_revision INTEGER,
        status TEXT NOT NULL CHECK (status IN ('active', 'deprecated', 'experimental')),
        payload JSONB NOT NULL,
        created_by TEXT NOT NULL,
        committed_at TIMESTAMPTZ NOT NULL,
        change_reason TEXT NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (role_id, revision),
        UNIQUE (role_id, native_fingerprint),
        FOREIGN KEY (role_id, supersedes_revision) REFERENCES acs_governed_role_revisions(role_id, revision),
        CHECK (supersedes_revision IS NULL OR supersedes_revision = revision - 1)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_governed_role_history_lookup_idx
        ON acs_governed_role_revisions (role_id, revision, native_fingerprint)`,
      `CREATE TABLE IF NOT EXISTS acs_workforces (
        workforce_id TEXT PRIMARY KEY,
        current_revision INTEGER NOT NULL CHECK (current_revision > 0),
        current_status TEXT NOT NULL CHECK (current_status IN ('draft', 'active', 'disabled', 'archived')),
        tenant_id TEXT,
        payload JSONB NOT NULL,
        native_fingerprint TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
      )`,
      `CREATE INDEX IF NOT EXISTS acs_workforces_tenant_status_idx
        ON acs_workforces (tenant_id, current_status, workforce_id)`,
      `CREATE TABLE IF NOT EXISTS acs_workforce_revisions (
        workforce_id TEXT NOT NULL REFERENCES acs_workforces(workforce_id),
        revision INTEGER NOT NULL CHECK (revision > 0),
        native_fingerprint TEXT NOT NULL,
        supersedes_revision INTEGER,
        lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('draft', 'active', 'disabled', 'archived')),
        payload JSONB NOT NULL,
        created_by TEXT NOT NULL,
        committed_at TIMESTAMPTZ NOT NULL,
        change_reason TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (workforce_id, revision),
        UNIQUE (workforce_id, native_fingerprint),
        UNIQUE (workforce_id, revision, native_fingerprint, lifecycle_status),
        FOREIGN KEY (workforce_id, supersedes_revision) REFERENCES acs_workforce_revisions(workforce_id, revision),
        CHECK ((revision = 1 AND supersedes_revision IS NULL) OR (revision > 1 AND supersedes_revision = revision - 1))
      )`,
      `ALTER TABLE acs_workforces ADD CONSTRAINT acs_workforce_head_revision_fk
        FOREIGN KEY (workforce_id, current_revision, native_fingerprint, current_status)
        REFERENCES acs_workforce_revisions(workforce_id, revision, native_fingerprint, lifecycle_status)
        DEFERRABLE INITIALLY DEFERRED`,
      `CREATE INDEX IF NOT EXISTS acs_workforce_history_lookup_idx
        ON acs_workforce_revisions (workforce_id, revision)`,
      `ALTER TABLE acs_native_events ADD COLUMN IF NOT EXISTS workforce_id TEXT REFERENCES acs_workforces(workforce_id)`,
      `CREATE INDEX IF NOT EXISTS acs_native_event_workforce_idx
        ON acs_native_events (workforce_id, sequence) WHERE workforce_id IS NOT NULL`,
    ],
  },
  {
    version: 5,
    name: "workforce_run_admission_and_immutable_membership_snapshots",
    statements: [
      `CREATE TABLE IF NOT EXISTS acs_native_runs (
        run_id TEXT PRIMARY KEY,
        workforce_id TEXT NOT NULL REFERENCES acs_workforces(workforce_id),
        workforce_revision INTEGER NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (workforce_id, workforce_revision) REFERENCES acs_workforce_revisions(workforce_id, revision)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_native_runs_workforce_idx
        ON acs_native_runs (workforce_id, workforce_revision, run_id)`,
      `CREATE TABLE IF NOT EXISTS acs_workforce_run_membership_snapshots (
        snapshot_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL UNIQUE REFERENCES acs_native_runs(run_id),
        workforce_id TEXT NOT NULL,
        workforce_revision INTEGER NOT NULL,
        admitted_at TIMESTAMPTZ NOT NULL,
        member_count INTEGER NOT NULL CHECK (member_count > 0),
        FOREIGN KEY (workforce_id, workforce_revision) REFERENCES acs_workforce_revisions(workforce_id, revision)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_workforce_run_membership_members (
        snapshot_id TEXT NOT NULL REFERENCES acs_workforce_run_membership_snapshots(snapshot_id),
        slot_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        PRIMARY KEY (snapshot_id, slot_id)
      )`,
    ],
  },
  {
    version: 6,
    name: "coordination_proposals_decisions_and_assignments",
    statements: [
      `CREATE TABLE IF NOT EXISTS acs_coordination_proposals (
        proposal_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES acs_native_runs(run_id),
        task_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (run_id, proposal_id)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_coordination_proposals_task_idx ON acs_coordination_proposals (run_id, task_id, created_at)`,
      `CREATE TABLE IF NOT EXISTS acs_coordination_decisions (
        decision_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES acs_native_runs(run_id),
        task_id TEXT NOT NULL,
        proposal_id TEXT REFERENCES acs_coordination_proposals(proposal_id),
        status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected', 'approval_required')),
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (run_id, decision_id)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_coordination_decisions_task_idx ON acs_coordination_decisions (run_id, task_id, created_at)`,
      `CREATE TABLE IF NOT EXISTS acs_task_assignments (
        assignment_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES acs_native_runs(run_id),
        task_id TEXT NOT NULL,
        member_slot_id TEXT NOT NULL,
        decision_id TEXT NOT NULL REFERENCES acs_coordination_decisions(decision_id),
        generation INTEGER NOT NULL CHECK (generation > 0),
        supersedes_assignment_id TEXT REFERENCES acs_task_assignments(assignment_id),
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (run_id, task_id, generation),
        UNIQUE (run_id, task_id, decision_id)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_task_assignments_current_idx ON acs_task_assignments (run_id, task_id, generation DESC)`,
    ],
  },
  {
    version: 7,
    name: "runtime_execution_intents_and_assignment_bound_attempts",
    statements: [
      `CREATE TABLE IF NOT EXISTS acs_runtime_execution_intents (
        intent_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES acs_native_runs(run_id),
        task_id TEXT NOT NULL,
        assignment_id TEXT NOT NULL REFERENCES acs_task_assignments(assignment_id),
        assignment_generation INTEGER NOT NULL CHECK (assignment_generation > 0),
        member_slot_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        agent_revision INTEGER NOT NULL CHECK (agent_revision > 0),
        workforce_revision INTEGER NOT NULL CHECK (workforce_revision > 0),
        status TEXT NOT NULL CHECK (status IN ('compiled', 'started', 'completed', 'rejected')),
        payload JSONB NOT NULL,
        compiled_at TIMESTAMPTZ NOT NULL,
        UNIQUE (run_id, task_id, assignment_id),
        UNIQUE (run_id, task_id, assignment_id, assignment_generation)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_runtime_execution_intents_task_idx ON acs_runtime_execution_intents (run_id, task_id, assignment_generation)`,
      `CREATE TABLE IF NOT EXISTS acs_runtime_attempts (
        attempt_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES acs_native_runs(run_id),
        task_id TEXT NOT NULL,
        intent_id TEXT NOT NULL REFERENCES acs_runtime_execution_intents(intent_id),
        assignment_id TEXT NOT NULL REFERENCES acs_task_assignments(assignment_id),
        assignment_generation INTEGER NOT NULL CHECK (assignment_generation > 0),
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (intent_id)
      )`,
      `CREATE INDEX IF NOT EXISTS acs_runtime_attempts_task_idx ON acs_runtime_attempts (run_id, task_id, created_at, attempt_id)`,
    ],
  },
  {
    version: 8,
    name: "integration_connection_and_channel_immutable_history",
    statements: [
      `CREATE TABLE IF NOT EXISTS acs_integration_connections (
        connection_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
        current_revision INTEGER NOT NULL CHECK (current_revision > 0),
        current_lifecycle TEXT NOT NULL CHECK (current_lifecycle IN ('draft', 'active', 'disabled', 'revoked', 'archived')),
        current_fingerprint TEXT NOT NULL,
        connector_definition_ref TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS acs_integration_connections_identity_idx
        ON acs_integration_connections (connection_id, tenant_id)`,
      `CREATE TABLE IF NOT EXISTS acs_integration_connection_revisions (
        connection_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        fingerprint TEXT NOT NULL,
        supersedes_revision INTEGER,
        lifecycle TEXT NOT NULL CHECK (lifecycle IN ('draft', 'active', 'disabled', 'revoked', 'archived')),
        connector_definition_ref TEXT NOT NULL,
        credential_ref TEXT,
        credential_version TEXT,
        secret_store_ref TEXT,
        payload JSONB NOT NULL,
        created_by TEXT NOT NULL,
        committed_at TIMESTAMPTZ NOT NULL,
        change_reason TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (connection_id, revision),
        UNIQUE (connection_id, tenant_id, revision, fingerprint),
        UNIQUE (connection_id, fingerprint),
        FOREIGN KEY (connection_id, tenant_id) REFERENCES acs_integration_connections(connection_id, tenant_id),
        FOREIGN KEY (connection_id, supersedes_revision) REFERENCES acs_integration_connection_revisions(connection_id, revision),
        CHECK ((revision = 1 AND supersedes_revision IS NULL) OR (revision > 1 AND supersedes_revision = revision - 1)),
        CHECK ((credential_ref IS NULL AND credential_version IS NULL AND secret_store_ref IS NULL) OR (credential_ref IS NOT NULL AND secret_store_ref IS NOT NULL))
      )`,
      `ALTER TABLE acs_integration_connections ADD CONSTRAINT acs_integration_connection_head_fk
        FOREIGN KEY (connection_id, tenant_id, current_revision, current_fingerprint)
        REFERENCES acs_integration_connection_revisions(connection_id, tenant_id, revision, fingerprint)
        DEFERRABLE INITIALLY DEFERRED`,
      `CREATE INDEX IF NOT EXISTS acs_integration_connections_tenant_lifecycle_idx
        ON acs_integration_connections (tenant_id, current_lifecycle, connection_id)`,
      `CREATE TABLE IF NOT EXISTS acs_integration_channels (
        channel_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
        current_revision INTEGER NOT NULL CHECK (current_revision > 0),
        current_lifecycle TEXT NOT NULL CHECK (current_lifecycle IN ('draft', 'active', 'disabled', 'revoked', 'archived')),
        current_fingerprint TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS acs_integration_channels_identity_idx
        ON acs_integration_channels (channel_id, tenant_id)`,
      `CREATE TABLE IF NOT EXISTS acs_integration_channel_revisions (
        channel_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        fingerprint TEXT NOT NULL,
        supersedes_revision INTEGER,
        lifecycle TEXT NOT NULL CHECK (lifecycle IN ('draft', 'active', 'disabled', 'revoked', 'archived')),
        connection_id TEXT NOT NULL,
        connection_revision INTEGER NOT NULL CHECK (connection_revision > 0),
        connection_fingerprint TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('ingress', 'egress', 'bidirectional')),
        endpoint_kind TEXT NOT NULL,
        endpoint_uri TEXT NOT NULL,
        admission_policy_ref TEXT,
        payload JSONB NOT NULL,
        created_by TEXT NOT NULL,
        committed_at TIMESTAMPTZ NOT NULL,
        change_reason TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (channel_id, revision),
        UNIQUE (channel_id, tenant_id, revision, fingerprint),
        UNIQUE (channel_id, fingerprint),
        FOREIGN KEY (channel_id, tenant_id) REFERENCES acs_integration_channels(channel_id, tenant_id),
        FOREIGN KEY (channel_id, supersedes_revision) REFERENCES acs_integration_channel_revisions(channel_id, revision),
        FOREIGN KEY (connection_id, tenant_id, connection_revision, connection_fingerprint)
          REFERENCES acs_integration_connection_revisions(connection_id, tenant_id, revision, fingerprint),
        CHECK ((revision = 1 AND supersedes_revision IS NULL) OR (revision > 1 AND supersedes_revision = revision - 1))
      )`,
      `ALTER TABLE acs_integration_channels ADD CONSTRAINT acs_integration_channel_head_fk
        FOREIGN KEY (channel_id, tenant_id, current_revision, current_fingerprint)
        REFERENCES acs_integration_channel_revisions(channel_id, tenant_id, revision, fingerprint)
        DEFERRABLE INITIALLY DEFERRED`,
      `CREATE INDEX IF NOT EXISTS acs_integration_channels_tenant_lifecycle_idx
        ON acs_integration_channels (tenant_id, current_lifecycle, channel_id)`,
      `CREATE INDEX IF NOT EXISTS acs_integration_channel_connection_idx
        ON acs_integration_channel_revisions (connection_id, tenant_id, connection_revision, channel_id)`,
    ],
  },
  {
    version: 9,
    name: "memory_policy_store_encrypted_content_and_tombstones",
    statements: [
      `CREATE TABLE IF NOT EXISTS acs_memory_policies (
        memory_policy_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
        current_revision INTEGER NOT NULL CHECK (current_revision > 0),
        current_fingerprint TEXT NOT NULL,
        current_lifecycle TEXT NOT NULL CHECK (current_lifecycle IN ('draft', 'active', 'disabled', 'archived')),
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        UNIQUE (memory_policy_id, tenant_id),
        UNIQUE (memory_policy_id, tenant_id, current_revision, current_fingerprint)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_memory_policy_revisions (
        memory_policy_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        fingerprint TEXT NOT NULL,
        supersedes_revision INTEGER,
        lifecycle TEXT NOT NULL CHECK (lifecycle IN ('draft', 'active', 'disabled', 'archived')),
        policy_contract JSONB NOT NULL CHECK (jsonb_typeof(policy_contract) = 'object'),
        payload JSONB NOT NULL,
        created_by TEXT NOT NULL,
        committed_at TIMESTAMPTZ NOT NULL,
        change_reason TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        PRIMARY KEY (memory_policy_id, revision),
        UNIQUE (memory_policy_id, tenant_id, revision, fingerprint),
        UNIQUE (memory_policy_id, fingerprint),
        FOREIGN KEY (memory_policy_id, tenant_id) REFERENCES acs_memory_policies(memory_policy_id, tenant_id),
        FOREIGN KEY (memory_policy_id, supersedes_revision) REFERENCES acs_memory_policy_revisions(memory_policy_id, revision),
        CHECK ((revision = 1 AND supersedes_revision IS NULL) OR (revision > 1 AND supersedes_revision = revision - 1))
      )`,
      `ALTER TABLE acs_memory_policies ADD CONSTRAINT acs_memory_policy_head_fk
        FOREIGN KEY (memory_policy_id, tenant_id, current_revision, current_fingerprint)
        REFERENCES acs_memory_policy_revisions(memory_policy_id, tenant_id, revision, fingerprint)
        DEFERRABLE INITIALLY DEFERRED`,
      `CREATE INDEX IF NOT EXISTS acs_memory_policy_head_tenant_idx
        ON acs_memory_policies (tenant_id, current_lifecycle, memory_policy_id)`,
      `CREATE TABLE IF NOT EXISTS acs_memory_records (
        memory_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES acs_tenants(tenant_id),
        fingerprint TEXT NOT NULL,
        memory_type TEXT NOT NULL CHECK (memory_type IN ('working', 'agent', 'workforce_shared', 'knowledge_backed')),
        scope_kind TEXT NOT NULL CHECK (scope_kind IN ('working', 'agent', 'workforce_shared', 'knowledge_backed')),
        scope_owner_id TEXT NOT NULL,
        scope_owner_revision INTEGER,
        scope_owner_fingerprint TEXT,
        scope_run_id TEXT,
        policy_id TEXT NOT NULL,
        policy_revision INTEGER NOT NULL CHECK (policy_revision > 0),
        policy_fingerprint TEXT NOT NULL,
        predecessor_memory_id TEXT,
        predecessor_tenant_id TEXT,
        predecessor_fingerprint TEXT,
        payload JSONB NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (memory_id, tenant_id),
        UNIQUE (memory_id, tenant_id, fingerprint),
        FOREIGN KEY (policy_id, tenant_id, policy_revision, policy_fingerprint)
          REFERENCES acs_memory_policy_revisions(memory_policy_id, tenant_id, revision, fingerprint),
        FOREIGN KEY (predecessor_memory_id, predecessor_tenant_id, predecessor_fingerprint)
          REFERENCES acs_memory_records(memory_id, tenant_id, fingerprint)
          DEFERRABLE INITIALLY DEFERRED,
        CHECK ((predecessor_memory_id IS NULL AND predecessor_tenant_id IS NULL AND predecessor_fingerprint IS NULL)
          OR (predecessor_memory_id IS NOT NULL AND predecessor_tenant_id = tenant_id
            AND predecessor_fingerprint IS NOT NULL AND predecessor_memory_id <> memory_id)),
        CHECK (
          (scope_kind = 'working' AND scope_run_id IS NOT NULL AND scope_owner_id = scope_run_id AND scope_owner_revision IS NULL AND scope_owner_fingerprint IS NULL)
          OR (scope_kind = 'agent' AND scope_run_id IS NULL AND scope_owner_revision IS NULL AND scope_owner_fingerprint IS NULL)
          OR (scope_kind IN ('workforce_shared', 'knowledge_backed') AND scope_owner_revision IS NOT NULL AND scope_owner_revision > 0 AND scope_owner_fingerprint IS NOT NULL AND scope_run_id IS NULL)
        )
      )`,
      `CREATE INDEX IF NOT EXISTS acs_memory_record_scope_idx
        ON acs_memory_records (tenant_id, memory_type, scope_kind, created_at, memory_id)`,
      `CREATE TABLE IF NOT EXISTS acs_memory_contents (
        content_id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        content_ciphertext BYTEA NOT NULL CHECK (octet_length(content_ciphertext) > 0),
        media_type TEXT NOT NULL CHECK (char_length(media_type) > 0),
        content_digest TEXT NOT NULL CHECK (char_length(content_digest) = 64),
        encryption_backend TEXT NOT NULL CHECK (char_length(encryption_backend) > 0),
        encryption_key_ref TEXT NOT NULL CHECK (char_length(encryption_key_ref) > 0),
        encryption_key_version TEXT NOT NULL CHECK (char_length(encryption_key_version) > 0),
        cipher_suite TEXT NOT NULL CHECK (char_length(cipher_suite) > 0),
        encryption_context_digest TEXT NOT NULL CHECK (char_length(encryption_context_digest) = 64),
        created_at TIMESTAMPTZ NOT NULL,
        UNIQUE (memory_id),
        UNIQUE (memory_id, tenant_id),
        FOREIGN KEY (memory_id, tenant_id) REFERENCES acs_memory_records(memory_id, tenant_id)
      )`,
      `CREATE TABLE IF NOT EXISTS acs_memory_tombstones (
        memory_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        deleted_at TIMESTAMPTZ NOT NULL,
        deletion_reason TEXT NOT NULL CHECK (deletion_reason IN ('retention_expired', 'policy_forget', 'administrative_deletion')),
        policy_id TEXT NOT NULL,
        policy_revision INTEGER NOT NULL CHECK (policy_revision > 0),
        policy_fingerprint TEXT NOT NULL,
        digest_retention TEXT NOT NULL CHECK (digest_retention IN ('not_retained', 'policy_permitted')),
        retained_content_digest TEXT,
        payload JSONB NOT NULL,
        event_id TEXT NOT NULL UNIQUE REFERENCES acs_native_events(event_id) DEFERRABLE INITIALLY DEFERRED,
        CHECK ((digest_retention = 'not_retained' AND retained_content_digest IS NULL)
          OR (digest_retention = 'policy_permitted' AND retained_content_digest IS NOT NULL)),
        FOREIGN KEY (memory_id, tenant_id) REFERENCES acs_memory_records(memory_id, tenant_id),
        FOREIGN KEY (policy_id, tenant_id, policy_revision, policy_fingerprint)
          REFERENCES acs_memory_policy_revisions(memory_policy_id, tenant_id, revision, fingerprint)
      )`,
      `ALTER TABLE acs_native_events ADD COLUMN IF NOT EXISTS subject_type TEXT`,
      `ALTER TABLE acs_native_events ADD COLUMN IF NOT EXISTS subject_id TEXT`,
      `ALTER TABLE acs_native_events ADD CONSTRAINT acs_native_event_subject_pair_check
        CHECK ((subject_type IS NULL) = (subject_id IS NULL))`,
      `ALTER TABLE acs_native_events ADD CONSTRAINT acs_native_event_subject_type_check
        CHECK (subject_type IS NULL OR subject_type IN ('agent', 'workforce', 'run', 'task', 'integration_connection', 'integration_channel', 'memory_policy', 'memory_record'))`,
      `CREATE INDEX IF NOT EXISTS acs_native_event_subject_idx
        ON acs_native_events (tenant_id, subject_type, subject_id, sequence) WHERE subject_type IS NOT NULL`,
      `CREATE FUNCTION acs_reject_memory_immutable_row_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'immutable Memory row cannot be updated or deleted'; END;
      $$`,
      `CREATE TRIGGER acs_memory_policy_revision_immutable BEFORE UPDATE OR DELETE ON acs_memory_policy_revisions
        FOR EACH ROW EXECUTE FUNCTION acs_reject_memory_immutable_row_mutation()`,
      `CREATE TRIGGER acs_memory_record_immutable BEFORE UPDATE OR DELETE ON acs_memory_records
        FOR EACH ROW EXECUTE FUNCTION acs_reject_memory_immutable_row_mutation()`,
      `CREATE TRIGGER acs_memory_tombstone_immutable BEFORE UPDATE OR DELETE ON acs_memory_tombstones
        FOR EACH ROW EXECUTE FUNCTION acs_reject_memory_immutable_row_mutation()`,
      `CREATE FUNCTION acs_guard_memory_content_rewrap() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.content_id IS DISTINCT FROM OLD.content_id OR NEW.memory_id IS DISTINCT FROM OLD.memory_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
            OR NEW.content_digest IS DISTINCT FROM OLD.content_digest OR NEW.media_type IS DISTINCT FROM OLD.media_type
            OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Memory content rewrap cannot change semantic content fields';
          END IF;
          RETURN NEW;
        END;
      $$`,
      `CREATE TRIGGER acs_memory_content_rewrap_guard BEFORE UPDATE ON acs_memory_contents
        FOR EACH ROW EXECUTE FUNCTION acs_guard_memory_content_rewrap()`,
      `CREATE FUNCTION acs_assert_memory_content_tombstone_exclusive() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM acs_memory_contents content
            JOIN acs_memory_tombstones tombstone ON tombstone.memory_id = content.memory_id AND tombstone.tenant_id = content.tenant_id
            WHERE content.memory_id = NEW.memory_id AND content.tenant_id = NEW.tenant_id
          ) THEN RAISE EXCEPTION 'active Memory content and tombstone cannot coexist'; END IF;
          RETURN NULL;
        END;
      $$`,
      `CREATE CONSTRAINT TRIGGER acs_memory_content_tombstone_exclusive_from_content
        AFTER INSERT OR UPDATE ON acs_memory_contents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
        EXECUTE FUNCTION acs_assert_memory_content_tombstone_exclusive()`,
      `CREATE CONSTRAINT TRIGGER acs_memory_content_tombstone_exclusive_from_tombstone
        AFTER INSERT OR UPDATE ON acs_memory_tombstones DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
        EXECUTE FUNCTION acs_assert_memory_content_tombstone_exclusive()`,
    ],
  },
];
